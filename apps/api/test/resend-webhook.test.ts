// D-263: `POST /api/webhooks/resend` against a real Postgres. Svix signatures (a known vector, stale and
// tampered deliveries refused, rotation, a missing secret), once per event (a redelivery and a burst
// of the same delivery change nothing), each event tied to its `email_log` row by Resend's id (in any
// order, and before the row exists), and the Email Log's rollup counted from what was folded.
import { createHmac } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { rollupOf, seedForDatabase } from '@ai/core';
import type { EmailLogPage } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { emailLog, resendEvents } from '../src/db/schema';
import { logSend } from '../src/email/log';
import { RESEND_WEBHOOK_PATH, SIGNATURE_TOLERANCE_S, signDelivery, verifyDelivery } from '../src/email/resend-webhook';
import { pruneEmailAndUsage } from '../src/jobs/prune-logs';
import { settleObserved } from '../src/lib/observe';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const NOW_S = Math.floor(NOW / 1000);
const SECRET = `whsec_${Buffer.from('resend-webhook-test-secret-0123456789').toString('base64')}`;
const OTHER_SECRET = `whsec_${Buffer.from('a-different-secret-entirely-9876543210').toString('base64')}`;

let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  await resetDatabase(seedForDatabase('live'));
  app = await build({ logger: false });
});
afterEach(async () => {
  await settleEmails();
  await settleObserved();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.RESEND_WEBHOOK_SECRET;
});

const db = () => testDatabase();

/** Svix's signature, computed here independently of the route's own code. */
const svix = (secret: string, id: string, ts: string, body: string): string =>
  createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

let seq = 0;
/** A Resend event body, as its webhook sends one. */
const eventBody = (type: string, emailId: string, at: string, data: Record<string, unknown> = {}) =>
  JSON.stringify({
    type,
    created_at: at,
    data: { created_at: at, email_id: emailId, from: 'Amplified Impact <hello@example.com>', to: ['jamie@ortizhomes.com'], subject: 'Your sign-in link', ...data },
  });

interface Delivery {
  id?: string;
  body: string;
  secret?: string;
  ts?: number;
  signature?: string;
  headers?: Record<string, string>;
}

const deliver = (d: Delivery) => {
  const id = d.id ?? `msg_${++seq}`;
  const ts = String(d.ts ?? NOW_S);
  const signature = d.signature ?? `v1,${svix(d.secret ?? SECRET, id, ts, d.body)}`;
  return app.inject({
    method: 'POST',
    url: RESEND_WEBHOOK_PATH,
    payload: d.body,
    headers: d.headers ?? { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': signature },
  });
};

/** One event for one email, signed and delivered; `id` fixes the webhook message id (a retry repeats it). */
const send = (type: string, emailId: string, minute: number, data: Record<string, unknown> = {}, id?: string) =>
  deliver({ id, body: eventBody(type, emailId, new Date(NOW + minute * 60_000).toISOString(), data) });

/** Sent rows as the writer leaves them, one per Resend id. */
async function logged(rows: { providerId: string | null; template?: string; status?: string; to?: string }[]): Promise<void> {
  await (await db()).insert(emailLog).values(
    rows.map((r, i) => ({
      at: NOW - (rows.length - i) * 3600_000,
      to: r.to ?? 'jamie@ortizhomes.com',
      userId: 'u_jamie',
      template: r.template ?? 'sign-in',
      subject: 'Your sign-in link',
      provider: r.status === 'skipped' ? 'outbox' : 'resend',
      providerId: r.providerId,
      status: r.status ?? 'sent',
      errorKind: r.status === 'failed' ? 'provider' : null,
    })),
  );
}

const row = async (providerId: string) => (await (await db()).select().from(emailLog).where(eq(emailLog.providerId, providerId)))[0]!;
const events = async () => (await db()).select().from(resendEvents).orderBy(asc(resendEvents.receivedAt), asc(resendEvents.id));
const consolePage = async (q = '') => (await app.inject({ method: 'GET', url: `/api/console/email${q}`, headers: { cookie: await app.signInAs('st1') } })).json() as EmailLogPage;

// ================================================================================================
// The signature
// ================================================================================================

describe('Svix signature verification (D-263)', () => {
  it('matches Svix’s published example', () => {
    // docs.svix.com, "Verifying payloads manually": this secret, id, timestamp and body sign to this.
    const secret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
    expect(signDelivery(secret, 'msg_p5jXN8AQM9LWM0D4loKWxJek', '1614265330', '{"test": 2432232314}')).toBe('g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=');
    const check = (signature: string, nowS = 1614265330) =>
      verifyDelivery({ secret, id: 'msg_p5jXN8AQM9LWM0D4loKWxJek', timestamp: '1614265330', signature, body: Buffer.from('{"test": 2432232314}'), nowMs: nowS * 1000 });
    expect(check('v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=')).toEqual({ ok: true });
    expect(check('v1,h0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=')).toEqual({ ok: false, reason: 'signature' });
    // The same bytes spelled another way (base64's spare bits) are not the signature Svix wrote.
    expect(check('v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OF=')).toEqual({ ok: false, reason: 'signature' });
    expect(check('v1a,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=')).toEqual({ ok: false, reason: 'signature' });
    expect(check('v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=', 1614265330 + 3600)).toEqual({ ok: false, reason: 'timestamp' });
  });

  it('accepts a signed delivery and records it', async () => {
    await logged([{ providerId: 're_1' }]);
    const res = await send('email.delivered', 're_1', 1);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
    expect(await events()).toHaveLength(1);
  });

  it('answers 503 with no secret set, and records nothing, so Resend retries once it is set', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await send('email.delivered', 're_1', 1);
    expect(res.statusCode).toBe(503);
    process.env.RESEND_WEBHOOK_SECRET = 'not-a-svix-secret!';
    expect((await send('email.delivered', 're_1', 1)).statusCode).toBe(503);
    expect(await events()).toEqual([]);
  });

  it('refuses a delivery with a missing header (400) and one signed with another secret (401)', async () => {
    const body = eventBody('email.delivered', 're_1', new Date(NOW).toISOString());
    for (const drop of ['svix-id', 'svix-timestamp', 'svix-signature']) {
      const headers: Record<string, string> = { 'content-type': 'application/json', 'svix-id': 'msg_x', 'svix-timestamp': String(NOW_S), 'svix-signature': `v1,${svix(SECRET, 'msg_x', String(NOW_S), body)}` };
      delete headers[drop];
      const res = await deliver({ body, headers });
      expect(res.statusCode, drop).toBe(400);
      expect(res.json()).toEqual({ error: 'Missing signature.' });
    }
    const wrong = await deliver({ body, secret: OTHER_SECRET });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: 'Bad signature.' });
    expect(await events()).toEqual([]);
  });

  it('refuses a tampered body, id or timestamp', async () => {
    const body = eventBody('email.opened', 're_1', new Date(NOW).toISOString());
    const sig = `v1,${svix(SECRET, 'msg_t', String(NOW_S), body)}`;
    const base = { 'content-type': 'application/json', 'svix-id': 'msg_t', 'svix-timestamp': String(NOW_S), 'svix-signature': sig };
    expect((await deliver({ body: body.replace('email.opened', 'email.clicked'), headers: base })).statusCode).toBe(401);
    expect((await deliver({ body, headers: { ...base, 'svix-id': 'msg_u' } })).statusCode).toBe(401);
    expect((await deliver({ body, headers: { ...base, 'svix-timestamp': String(NOW_S + 1) } })).statusCode).toBe(401);
    expect((await deliver({ body, headers: { ...base, 'svix-signature': 'v1,' } })).statusCode).toBe(401);
    expect((await deliver({ body, headers: { ...base, 'svix-signature': sig.replace('v1,', 'v2,') } })).statusCode).toBe(401);
    expect(await events()).toEqual([]);
  });

  it('refuses a delivery signed more than five minutes from now, either way', async () => {
    await logged([{ providerId: 're_1' }]);
    expect((await deliver({ body: eventBody('email.opened', 're_1', new Date(NOW).toISOString()), ts: NOW_S - SIGNATURE_TOLERANCE_S - 1 })).statusCode).toBe(401);
    expect((await deliver({ body: eventBody('email.opened', 're_1', new Date(NOW).toISOString()), ts: NOW_S + SIGNATURE_TOLERANCE_S + 1 })).statusCode).toBe(401);
    expect((await deliver({ body: eventBody('email.opened', 're_1', new Date(NOW).toISOString()), ts: NOW_S - SIGNATURE_TOLERANCE_S })).statusCode).toBe(200);
    expect((await row('re_1')).openCount).toBe(1);
  });

  it('accepts any one of several signatures (a secret mid-rotation), and the webhook-* header names', async () => {
    await logged([{ providerId: 're_1' }]);
    const body = eventBody('email.opened', 're_1', new Date(NOW).toISOString());
    const signature = `v1,${svix(OTHER_SECRET, 'msg_r', String(NOW_S), body)} v1,${svix(SECRET, 'msg_r', String(NOW_S), body)}`;
    expect((await deliver({ id: 'msg_r', body, signature })).statusCode).toBe(200);
    const sw = await deliver({
      body: eventBody('email.clicked', 're_1', new Date(NOW).toISOString()),
      headers: {
        'content-type': 'application/json',
        'webhook-id': 'msg_w',
        'webhook-timestamp': String(NOW_S),
        'webhook-signature': `v1,${svix(SECRET, 'msg_w', String(NOW_S), eventBody('email.clicked', 're_1', new Date(NOW).toISOString()))}`,
      },
    });
    expect(sw.statusCode).toBe(200);
    expect(await row('re_1')).toMatchObject({ openCount: 1, clickCount: 1 });
  });

  it('answers a signed event the log does not record 200, and keeps nothing', async () => {
    const res = await send('email.failed', 're_1', 1);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true, ignored: true });
    expect(await events()).toEqual([]);
  });

  it('answers 400 to a signed body that isn’t JSON or names no email', async () => {
    expect((await deliver({ body: 'not json' })).statusCode).toBe(400);
    expect((await deliver({ body: JSON.stringify({ type: 'email.delivered', data: {} }) })).statusCode).toBe(400);
    expect(await events()).toEqual([]);
  });
});

// ================================================================================================
// Once per event
// ================================================================================================

describe('once per event (D-263)', () => {
  it('records a redelivery once: the same message id changes nothing', async () => {
    await logged([{ providerId: 're_1' }]);
    expect((await send('email.opened', 're_1', 5, {}, 'msg_open_1')).json()).toEqual({ received: true });
    const before = await row('re_1');
    for (let i = 0; i < 3; i += 1) expect((await send('email.opened', 're_1', 5, {}, 'msg_open_1')).json()).toEqual({ received: true, duplicate: true });
    expect(await row('re_1')).toEqual(before);
    expect(before).toMatchObject({ openCount: 1, deliveryStatus: 'delivered' });
    expect(await events()).toHaveLength(1);
  });

  it('records a burst of the same delivery once', async () => {
    await logged([{ providerId: 're_1' }]);
    const answers = await Promise.all(Array.from({ length: 6 }, () => send('email.clicked', 're_1', 5, { click: { link: 'https://learn.example.com/x' } }, 'msg_click_1')));
    expect(answers.map((a) => a.statusCode)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(answers.filter((a) => a.json().duplicate === true)).toHaveLength(5);
    expect(await row('re_1')).toMatchObject({ clickCount: 1, clickedLink: 'https://learn.example.com/x' });
    expect(await events()).toHaveLength(1);
  });

  it('counts distinct events that arrive together, every one (the email’s lock)', async () => {
    await logged([{ providerId: 're_1' }]);
    await Promise.all(Array.from({ length: 10 }, (_, i) => send('email.opened', 're_1', i + 1)));
    expect(await row('re_1')).toMatchObject({ openCount: 10, openedFirstAt: NOW + 60_000, openedLastAt: NOW + 600_000 });
  });
});

// ================================================================================================
// Tied to its row
// ================================================================================================

describe('each event tied to its email_log row by Resend’s id (D-263)', () => {
  it('writes the row Resend’s id names, and no other', async () => {
    await logged([{ providerId: 're_1' }, { providerId: 're_2' }, { providerId: null, status: 'skipped' }]);
    await send('email.sent', 're_1', 0);
    await send('email.delivered', 're_1', 1);
    await send('email.opened', 're_1', 7);
    await send('email.clicked', 're_1', 8, { click: { link: 'https://learn.example.com/course', ipAddress: '203.0.113.9', userAgent: 'Mail' } });
    expect(await row('re_1')).toMatchObject({
      deliveryStatus: 'delivered',
      deliveredAt: NOW + 60_000,
      openCount: 1,
      openedFirstAt: NOW + 7 * 60_000,
      clickCount: 1,
      clickedFirstAt: NOW + 8 * 60_000,
      clickedLink: 'https://learn.example.com/course',
    });
    expect(await row('re_2')).toMatchObject({ deliveryStatus: null, openCount: null, clickCount: null });
    // Nothing of the recipient, subject, sender, IP address or user agent is kept with the events.
    const kept = JSON.stringify(await events());
    for (const secret of ['jamie@ortizhomes.com', 'Your sign-in link', 'hello@example.com', '203.0.113.9', 'Mail"']) expect(kept).not.toContain(secret);
  });

  it('keeps the strongest state whatever order the events arrive in', async () => {
    await logged([{ providerId: 're_1' }, { providerId: 're_2' }]);
    // An open before its delivery, and a delay after it.
    await send('email.opened', 're_1', 9);
    expect((await row('re_1')).deliveryStatus).toBe('delivered');
    await send('email.delivered', 're_1', 2);
    await send('email.delivery_delayed', 're_1', 1);
    expect(await row('re_1')).toMatchObject({ deliveryStatus: 'delivered', deliveredAt: NOW + 120_000, delayedAt: NOW + 60_000, openCount: 1 });
    // A complaint outranks the delivery it follows.
    await send('email.complained', 're_1', 30);
    expect((await row('re_1')).deliveryStatus).toBe('complained');
    // Delayed, then bounced, with its reason.
    await send('email.delivery_delayed', 're_2', 1);
    expect((await row('re_2')).deliveryStatus).toBe('delayed');
    await send('email.bounced', 're_2', 60, { bounce: { type: 'Permanent', subType: 'General', message: '550 5.1.1 The mailbox does not exist.' } });
    expect(await row('re_2')).toMatchObject({
      deliveryStatus: 'bounced',
      bouncedAt: NOW + 3_600_000,
      bounceType: 'Permanent',
      bounceSubType: 'General',
      bounceMessage: '550 5.1.1 The mailbox does not exist.',
    });
  });

  it('keeps an event that beats its row, and folds it in when the row is written', async () => {
    const early = await send('email.delivered', 're_late', 1);
    await send('email.opened', 're_late', 2);
    expect(early.json()).toEqual({ received: true });
    expect(await events()).toHaveLength(2);
    // The send's own log write, as `transport.send()` hands it over in production.
    logSend({ result: { ok: true, mode: 'production', template: 'sign-in', to: 'jamie@ortizhomes.com', subject: 'Your sign-in link' }, providerId: 're_late' });
    await settleObserved();
    expect(await row('re_late')).toMatchObject({ status: 'sent', deliveryStatus: 'delivered', deliveredAt: NOW + 60_000, openCount: 1 });
  });

  it('records an event for an email the log doesn’t know, and changes no row', async () => {
    await logged([{ providerId: 're_1' }]);
    const res = await send('email.delivered', 're_from_elsewhere', 1);
    expect(res.statusCode).toBe(200);
    expect(await events()).toHaveLength(1);
    expect((await row('re_1')).deliveryStatus).toBeNull();
  });

  it('prunes events with the email log, after 180 days', async () => {
    await logged([{ providerId: 're_1' }]);
    await send('email.delivered', 're_1', 1);
    const d = await db();
    expect(await pruneEmailAndUsage(d, NOW + 179 * 86_400_000)).toMatchObject({ events: 0 });
    expect(await pruneEmailAndUsage(d, NOW + 181 * 86_400_000)).toMatchObject({ emails: 1, events: 1 });
    expect(await events()).toEqual([]);
  });
});

// ================================================================================================
// The rollup the Email Log shows
// ================================================================================================

describe('the Email Log’s rollup, from what was folded (D-263)', () => {
  async function scenario(): Promise<void> {
    await logged([
      { providerId: 're_a', template: 'session-24h' },
      { providerId: 're_b', template: 'session-24h' },
      { providerId: 're_c', template: 'session-24h' },
      { providerId: 're_d', template: 'replay-ready' },
      { providerId: 're_e', template: 'replay-ready' },
      { providerId: 're_f', template: 'replay-ready' },
      { providerId: 're_g', template: 'replay-ready' },
      // Never sent through Resend: in no count.
      { providerId: null, template: 'replay-ready', status: 'failed' },
      { providerId: null, template: 'session-24h', status: 'skipped' },
    ]);
    for (const id of ['re_a', 're_b', 're_c', 're_d']) await send('email.delivered', id, 1);
    await send('email.opened', 're_a', 2);
    await send('email.opened', 're_a', 3);
    await send('email.clicked', 're_a', 4);
    await send('email.opened', 're_b', 2);
    // re_e: an open with its delivery event lost still counts as delivered and opened.
    await send('email.opened', 're_e', 5);
    await send('email.bounced', 're_f', 1, { bounce: { type: 'Permanent' } });
    await send('email.delivery_delayed', 're_g', 1);
    // A complaint on a delivered email: still delivered, for the rates.
    await send('email.complained', 're_d', 9);
  }

  it('counts sends, deliveries, bounces and unique opens and clicks, with their rates', async () => {
    await scenario();
    const page = await consolePage();
    expect(page.rollup).toEqual({
      sent: 7,
      delivered: 5,
      delayed: 1,
      bounced: 1,
      complained: 1,
      opened: 3,
      clicked: 1,
      deliveredPct: 71,
      bouncedPct: 14,
      openedPct: 60,
      clickedPct: 20,
      alert: true,
    });
    // The SQL counts what core's `rollupOf` counts from the same rows.
    const { rollup, ...counts } = { rollup: page.rollup!, ...rollupOf(page.rows) };
    expect(counts).toEqual({ sent: rollup.sent, delivered: rollup.delivered, delayed: rollup.delayed, bounced: rollup.bounced, complained: rollup.complained, opened: rollup.opened, clicked: rollup.clicked });
  });

  it('follows the filters: a template, a status, and a page after the first carries none', async () => {
    await scenario();
    expect((await consolePage('?template=session-24h')).rollup).toMatchObject({ sent: 3, delivered: 3, opened: 2, clicked: 1, deliveredPct: 100, openedPct: 67, clickedPct: 33, alert: false });
    expect((await consolePage('?template=replay-ready')).rollup).toMatchObject({ sent: 4, delivered: 2, bounced: 1, complained: 1, deliveredPct: 50, bouncedPct: 25 });
    const bounced = await consolePage('?status=bounced');
    expect(bounced.rows.map((r) => r.providerId)).toEqual(['re_f']);
    expect(bounced.rows[0]).toMatchObject({ delivery: 'bounced', bounceType: 'Permanent' });
    expect((await consolePage('?status=delivered')).rows.map((r) => r.providerId)).toEqual(['re_e', 're_c', 're_b', 're_a']);
    // A row with no event yet still filters as its send's outcome.
    expect((await consolePage('?status=failed')).rows).toHaveLength(1);
    const first = await consolePage('?limit=2');
    expect(first.rollup).not.toBeNull();
    const second = (await app.inject({ method: 'GET', url: `/api/console/email?limit=2&cursor=${first.nextCursor}`, headers: { cookie: await app.signInAs('st1') } })).json() as EmailLogPage;
    expect(second.rollup).toBeNull();
  });

  it('has no rate with nothing sent', async () => {
    expect((await consolePage()).rollup).toEqual({
      sent: 0,
      delivered: 0,
      delayed: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
      deliveredPct: null,
      bouncedPct: null,
      openedPct: null,
      clickedPct: null,
      alert: false,
    });
  });

  it('writes no audit row: the webhook is the system, not staff', async () => {
    await scenario();
    expect(Number(((await (await db()).execute(sql`select count(*)::int as n from audit_log`)) as unknown as { n: number }[])[0]!.n)).toBe(0);
  });
});
