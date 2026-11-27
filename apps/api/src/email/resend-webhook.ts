// `POST /api/webhooks/resend`: Resend's delivery events on the email log (D-263).
//
// SIGNATURE FIRST. Resend signs every delivery through Svix: three headers (`svix-id`,
// `svix-timestamp`, `svix-signature`; the Standard Webhooks names `webhook-*` are read too) and an
// HMAC-SHA256 over `${id}.${timestamp}.${raw body}`, keyed by the base64 secret after `whsec_` in
// `RESEND_WEBHOOK_SECRET`. The raw bytes are checked before anything is parsed; a stale timestamp (more
// than five minutes either way) is refused, so a captured delivery can't be replayed later. With no
// secret set the route answers 503 and Resend retries, as the Stripe webhook does.
//
// ONCE PER EVENT. The event is inserted into `resend_events` by its webhook message id, which is the
// same on every retry; a repeat inserts nothing, changes nothing and is answered 200. A new event's
// email is then refolded whole: every event Resend has sent for it, through `foldResendEvents`
// (`@ai/core`), written onto its `email_log` row by `provider_id`. Order and repeats can't change the
// answer, and an event that beats its row (the send's log write is fire-and-forget) is folded in when
// the row is written (`refoldLogged`, from `email/log.ts`).
//
// ONE EMAIL AT A TIME. The insert and the refold share a transaction holding an advisory lock on the
// email (`pg_advisory_xact_lock(263, hashtext(email_id))`, the two-int form, whose keys never meet the
// one-bigint locks of the scheduler and `/api/mutate`). Two events for the same email (an open and a
// click a moment apart), or an event and the row's own write, are folded one after the other, so
// neither reads before the other has committed. A failure rolls both back, answers 500 and Resend
// retries.
//
// NEVER LOGGED OR KEPT: the recipient, subject, sender, IP address or user agent. Logs carry the event
// type and ids only.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { foldResendEvents, parseResendEvent } from '@ai/core';
import type { EmailDelivery, ResendEvent } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { emailLog, resendEvents } from '../db/schema';
import { clock } from '../lib/clock';

export const RESEND_WEBHOOK_PATH = '/api/webhooks/resend';
/** Resend's events are a few hundred bytes; a bounce with a long message is still well under this. */
export const RESEND_WEBHOOK_BODY_LIMIT = 64 * 1024;
/** Svix's own tolerance: a delivery signed more than five minutes from now is refused. */
export const SIGNATURE_TOLERANCE_S = 5 * 60;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

// --- the signature ---------------------------------------------------------------------------------

export type SignatureCheck = { ok: true } | { ok: false; reason: 'headers' | 'secret' | 'timestamp' | 'signature' };

/** The secret's key: the base64 after `whsec_` (Svix's form), or the whole value when it has no prefix. */
function secretKey(secret: string): Buffer | null {
  const b64 = secret.trim().replace(/^whsec_/, '');
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const key = Buffer.from(b64, 'base64');
  return key.length ? key : null;
}

/** Svix's signature for one delivery, as the header carries it after `v1,`. */
export function signDelivery(secret: string, id: string, timestamp: string, body: Buffer | string): string {
  const key = secretKey(secret);
  if (!key) throw new Error('RESEND_WEBHOOK_SECRET is not a Svix secret');
  return createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest('base64');
}

/**
 * Whether a delivery is Resend's: its timestamp within five minutes of `nowMs`, and one of the header's
 * space-separated `v1,<base64>` signatures equal (in constant time) to ours over the raw body.
 */
export function verifyDelivery(args: {
  secret: string;
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  body: Buffer;
  nowMs: number;
}): SignatureCheck {
  const { id, timestamp, signature } = args;
  if (!id || !timestamp || !signature) return { ok: false, reason: 'headers' };
  const key = secretKey(args.secret);
  if (!key) return { ok: false, reason: 'secret' };
  if (!/^\d{1,12}$/.test(timestamp) || Math.abs(Math.floor(args.nowMs / 1000) - Number(timestamp)) > SIGNATURE_TOLERANCE_S) return { ok: false, reason: 'timestamp' };
  // Compared as the canonical base64 text, as Svix's own libraries do: decoding first would accept a
  // second spelling of the same bytes (base64's spare padding bits), which is no forgery but no signature
  // Svix wrote either.
  const want = Buffer.from(createHmac('sha256', key).update(`${id}.${timestamp}.`).update(args.body).digest('base64'));
  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',', 2);
    if (version !== 'v1' || !value) continue;
    const got = Buffer.from(value);
    if (got.length === want.length && timingSafeEqual(got, want)) return { ok: true };
  }
  return { ok: false, reason: 'signature' };
}

// --- the fold --------------------------------------------------------------------------------------

/**
 * Holds the email's lock until the transaction ends. 263 is this decision's number, written as a literal
 * so Postgres resolves the (int, int) overload with nothing to guess.
 */
const lockEmail = (tx: Tx, emailId: string) => tx.execute(sql`select pg_advisory_xact_lock(263, hashtext(${emailId}::text))`);

/** The row's delivery columns from a fold. A count of 0 is stored as 0 once there is any event. */
const columnsOf = (d: EmailDelivery) => ({
  deliveryStatus: d.delivery,
  deliveredAt: d.deliveredAt,
  delayedAt: d.delayedAt,
  bouncedAt: d.bouncedAt,
  bounceType: d.bounceType,
  bounceSubType: d.bounceSubType,
  bounceMessage: d.bounceMessage,
  complainedAt: d.complainedAt,
  openCount: d.delivery === null ? null : d.openCount,
  openedFirstAt: d.openedFirstAt,
  openedLastAt: d.openedLastAt,
  clickCount: d.delivery === null ? null : d.clickCount,
  clickedFirstAt: d.clickedFirstAt,
  clickedLastAt: d.clickedLastAt,
  clickedLink: d.clickedLink,
});

/** Writes one email's row from all of its events, under the lock already held. How many rows it wrote. */
async function refold(tx: Tx, emailId: string): Promise<number> {
  const rows = await tx.select().from(resendEvents).where(eq(resendEvents.emailId, emailId));
  const events: ResendEvent[] = rows.map((r) => ({
    id: r.id,
    type: r.type as ResendEvent['type'],
    emailId: r.emailId,
    occurredAt: Number(r.occurredAt),
    bounceType: r.bounceType,
    bounceSubType: r.bounceSubType,
    bounceMessage: r.bounceMessage,
    link: r.link,
  }));
  if (!events.length) return 0;
  const written = await tx.update(emailLog).set(columnsOf(foldResendEvents(events))).where(eq(emailLog.providerId, emailId)).returning({ id: emailLog.id });
  return written.length;
}

export type RecordResult = { kind: 'duplicate' } | { kind: 'recorded'; matched: number };

/** One event, once: kept by its message id, then its email refolded. A repeat changes nothing. */
export async function recordResendEvent(db: Database, event: ResendEvent, receivedAt: number): Promise<RecordResult> {
  return db.transaction(async (tx) => {
    await lockEmail(tx, event.emailId);
    const inserted = await tx
      .insert(resendEvents)
      .values({
        id: event.id,
        type: event.type,
        emailId: event.emailId,
        occurredAt: event.occurredAt,
        receivedAt,
        bounceType: event.bounceType,
        bounceSubType: event.bounceSubType,
        bounceMessage: event.bounceMessage,
        link: event.link,
      })
      .onConflictDoNothing({ target: resendEvents.id })
      .returning({ id: resendEvents.id });
    if (!inserted.length) return { kind: 'duplicate' };
    return { kind: 'recorded', matched: await refold(tx, event.emailId) };
  });
}

/**
 * After the log writes a sent row: folds in any event that arrived before it. A no-op (one indexed read)
 * when there is none, which is every send but a race.
 */
export async function refoldLogged(db: Database, providerId: string): Promise<number> {
  return db.transaction(async (tx) => {
    await lockEmail(tx, providerId);
    return refold(tx, providerId);
  });
}

// --- the route -------------------------------------------------------------------------------------

export interface ResendWebhookOptions {
  /** The signing secret, read on each delivery so a rotated secret needs no restart. */
  secret?: () => string | undefined;
  db?: () => Database;
  now?: () => number;
}

const header = (req: FastifyRequest, ...names: string[]): string | undefined => {
  for (const n of names) {
    const v = req.headers[n];
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
};

export async function registerResendWebhook(app: FastifyInstance, options: ResendWebhookOptions = {}): Promise<void> {
  const secretOf = options.secret ?? (() => process.env.RESEND_WEBHOOK_SECRET);
  const dbOf = options.db ?? getDb;
  const now = options.now ?? (() => clock.now());

  await app.register(async (scope) => {
    // The signature is over the exact bytes Resend sent, so this route keeps them: no JSON parse first.
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: RESEND_WEBHOOK_BODY_LIMIT }, (_req, body, done) => done(null, body));

    scope.post(RESEND_WEBHOOK_PATH, { bodyLimit: RESEND_WEBHOOK_BODY_LIMIT, config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      const secret = secretOf()?.trim();
      if (!secret) {
        req.log.error({}, 'resend webhook: RESEND_WEBHOOK_SECRET is not set; answering 503 so Resend retries');
        return reply.code(503).send({ error: 'Not configured.' });
      }
      if (!Buffer.isBuffer(req.body)) return reply.code(400).send({ error: 'Missing body.' });
      const id = header(req, 'svix-id', 'webhook-id');
      const t = now();
      const check = verifyDelivery({
        secret,
        id,
        timestamp: header(req, 'svix-timestamp', 'webhook-timestamp'),
        signature: header(req, 'svix-signature', 'webhook-signature'),
        body: req.body,
        nowMs: t,
      });
      if (!check.ok) {
        if (check.reason === 'secret') {
          req.log.error({}, 'resend webhook: RESEND_WEBHOOK_SECRET is not a whsec_ secret; answering 503 so Resend retries');
          return reply.code(503).send({ error: 'Not configured.' });
        }
        req.log.warn({ reason: check.reason }, 'resend webhook: refused');
        return check.reason === 'headers' ? reply.code(400).send({ error: 'Missing signature.' }) : reply.code(401).send({ error: 'Bad signature.' });
      }

      let json: unknown;
      try {
        json = JSON.parse(req.body.toString('utf8'));
      } catch {
        return reply.code(400).send({ error: 'Not JSON.' });
      }
      const parsed = parseResendEvent(id!, json, t);
      if (parsed.kind === 'invalid') {
        req.log.warn({ webhookId: id }, 'resend webhook: no email id; not recorded');
        return reply.code(400).send({ error: 'Not an email event.' });
      }
      // Signed, but not an event the log records (`email.failed`, `contact.*`, …): accepted, so Resend stops sending it.
      if (parsed.kind === 'ignored') return reply.code(200).send({ received: true, ignored: true });

      const { event } = parsed;
      try {
        const result = await recordResendEvent(dbOf(), event, t);
        if (result.kind === 'duplicate') return reply.code(200).send({ received: true, duplicate: true });
        req.log.info({ webhookId: event.id, type: event.type, emailId: event.emailId, matched: result.matched }, 'resend webhook: recorded');
        return reply.code(200).send({ received: true });
      } catch (err) {
        req.log.error({ webhookId: event.id, type: event.type, reason: (err as { code?: string }).code ?? 'error' }, 'resend webhook: failed; Resend will retry');
        return reply.code(500).send({ error: 'Failed; retry.' });
      }
    });
  });
}
