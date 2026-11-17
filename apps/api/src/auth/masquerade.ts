// Masquerade, the session side (D-162, spec § 6): what `requireSession` does with an impersonation
// session, the global write block, and Sign Out during a session. The endpoints and the sweep are
// `console/masquerade.ts`.
//
// A MASQUERADE IS TWO SESSIONS AND A ROW. Start mints an `auth_sessions` row for the learner, marked
// `impersonating` with the staff member's id, puts it on `ai_sid`, and keeps the staff member's own
// session id in `masquerade_sessions.staff_auth_session_id` (never sent anywhere). A second cookie,
// `ai_msq`, signed like `ai_sid` with the app's one secret, names the row: it lets the `onRequest`
// hook below refuse a write before any route runs, public routes included. It grants nothing on its
// own: a forged or unsigned one names no row, and every allowance still comes from `ai_sid`.
//
// LOOK-ONLY (D1, D2). `masqueradeVerdict` (@ai/core) is the one rule: the hook applies it to any
// request carrying a live `ai_msq`, and `requireSession` applies it again to the session itself,
// authoritatively, so a request that dropped `ai_msq` is refused all the same. A refusal is 403
// `masquerade_blocked` and one `masquerade.blocked_action` audit row with the STAFF member as actor.
//
// ENDING. Exit, Sign Out, the sweep, and `requireSession` noticing a session that is over all end the
// row the same way: one conditional UPDATE (so two of them end it once), the impersonation session
// deleted, one audit row, in one transaction. `requireSession` then puts the staff session back on
// `ai_sid` (or clears it when that session is gone) and answers 409 `masquerade_ended` with where to
// go, never a 401: the browser is staff's, and staff are still signed in.

import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { CONSOLE_ERRORS, MASQUERADE_DEFAULT_RETURN, masqueradeLive, masqueradeVerdict } from '@ai/core';
import type { AuditAction, MasqueradeEndReason } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { authSessions, masqueradeSessions, users } from '../db/schema';
import { clock } from '../lib/clock';
import { audit } from '../console/audit';
import type { AuditActor } from '../console/audit';
import { clearCookieOptions, deleteSession, readSession, SESSION_COOKIE, sessionCookieOptions } from './sessions';
import type { SessionRow } from './sessions';

/** The masquerade cookie: the row's id, signed. httpOnly, so the web never reads it. */
export const MASQUERADE_COOKIE = 'ai_msq';

/** Where a browser with no staff session left goes. */
export const SIGN_IN_PATH = '/sign-in';

export type MasqueradeRow = typeof masqueradeSessions.$inferSelect;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** `ai_msq`'s attributes: `ai_sid`'s, expiring with the session's hard stop. */
export function masqueradeCookieOptions(hardExpiresAt: number, env: NodeJS.ProcessEnv = process.env): CookieSerializeOptions {
  return { ...clearCookieOptions(env), signed: true, expires: new Date(hardExpiresAt) };
}

/** The masquerade id `ai_msq` carries when its signature verifies; null for none, a forged one or an unsigned one. */
export function masqueradeCookieId(req: FastifyRequest): string | null {
  const raw = req.cookies?.[MASQUERADE_COOKIE];
  if (raw === undefined || raw === '' || typeof req.unsignCookie !== 'function') return null;
  const unsigned = req.unsignCookie(raw);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}

/** The route a request matched, as registered (`/api/sessions/:id/join`), or its path when none did. */
export const routeOf = (req: FastifyRequest): string => req.routeOptions?.url ?? (req.url.split('?')[0] ?? req.url);

const rowByAuthSession = async (db: Database, sessionId: string): Promise<MasqueradeRow | null> =>
  (await db.select().from(masqueradeSessions).where(eq(masqueradeSessions.authSessionId, sessionId)).limit(1))[0] ?? null;

/** The staff member as an audit actor, with their role now. */
export async function staffActorOf(db: Pick<Database, 'select'>, userId: string): Promise<Extract<AuditActor, { source: 'staff' }>> {
  const [u] = await db.select({ role: users.staffRole }).from(users).where(eq(users.id, userId)).limit(1);
  return { source: 'staff', userId, role: u?.role ?? null };
}

/** The learner a row's audit rows name. */
export async function masqueradeTarget(db: Pick<Database, 'select'>, row: Pick<MasqueradeRow, 'targetUserId'>): Promise<{ type: string; id: string; label: string | null }> {
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.targetUserId)).limit(1);
  return { type: 'user', id: row.targetUserId, label: u?.name ?? null };
}

/**
 * End a row inside `tx`: set `ended_at` and `end_reason` where it is still live, delete its
 * impersonation session and write one audit row. Returns the row when THIS call ended it, null when
 * something else already had (the audit row is written only once, by whoever ended it).
 */
export async function endInTx(
  tx: Tx,
  req: FastifyRequest | null,
  id: string,
  how: { reason: MasqueradeEndReason; action: AuditAction; actor: AuditActor; now: number; after?: Record<string, unknown> },
): Promise<MasqueradeRow | null> {
  const [row] = await tx
    .update(masqueradeSessions)
    .set({ endedAt: how.now, endReason: how.reason })
    .where(and(eq(masqueradeSessions.id, id), isNull(masqueradeSessions.endedAt)))
    .returning();
  if (!row) return null;
  await tx.delete(authSessions).where(eq(authSessions.id, row.authSessionId));
  await audit(
    req,
    {
      action: how.action,
      outcome: 'ok',
      actor: how.actor,
      masqueradeSessionId: row.id,
      target: await masqueradeTarget(tx, row),
      after: { endReason: how.reason, staffUserId: row.staffUserId, minutes: Math.round((how.now - row.startedAt) / 60_000), ...how.after },
    },
    tx,
  );
  return row;
}

/** `endInTx` in its own transaction. */
export const endMasquerade = (db: Database, req: FastifyRequest | null, id: string, how: Parameters<typeof endInTx>[3]): Promise<MasqueradeRow | null> =>
  db.transaction((tx) => endInTx(tx, req, id, how));

/**
 * Put the staff member's own session back on `ai_sid` when `readSession` still finds it live, and
 * clear `ai_sid` otherwise; clear `ai_msq` either way. Returns where the browser goes next: the page
 * the session started from, or sign-in when there is no staff session to go back to. `proven` false
 * restores nothing (see `masqueradeSessionGone`).
 */
export async function restoreStaff(reply: FastifyReply, db: Database, row: MasqueradeRow, now: number, proven = true): Promise<string> {
  reply.clearCookie(MASQUERADE_COOKIE, clearCookieOptions());
  const staff = proven ? await readSession(db, row.staffAuthSessionId, now) : null;
  if (staff && staff.userId === row.staffUserId && staff.impersonating === null) {
    reply.setCookie(SESSION_COOKIE, staff.id, sessionCookieOptions(process.env, { remember: staff.remember }));
    return row.startedFrom ?? MASQUERADE_DEFAULT_RETURN;
  }
  reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
  return SIGN_IN_PATH;
}

/** 409 `masquerade_ended` with where to go (spec § 6; the web follows `redirect`). */
export const masqueradeEnded = (reply: FastifyReply, redirect: string): FastifyReply =>
  reply
    .code(409)
    .header('cache-control', 'private, no-store')
    .send({ error: CONSOLE_ERRORS.masquerade_ended.message, code: 'masquerade_ended', redirect });

/**
 * A masquerade that is over, noticed by a request: ended here if nothing ended it yet (expired, or
 * `revoked` when its session or learner went before its time), the staff session put back, 409.
 */
async function over(req: FastifyRequest, reply: FastifyReply, db: Database, row: MasqueradeRow, now: number, opts: { reason?: MasqueradeEndReason; proven?: boolean } = {}): Promise<FastifyReply> {
  if (row.endedAt === null) {
    const why = opts.reason ?? (now >= row.expiresAt ? 'expired' : 'revoked');
    await endMasquerade(db, req, row.id, { reason: why, action: 'masquerade.expire', actor: { source: 'system' }, now, after: { by: 'request' } });
  }
  // Exit and the sweep delete it; whatever ended the row, its session goes.
  await deleteSession(db, row.authSessionId);
  return masqueradeEnded(reply, await restoreStaff(reply, db, row, now, opts.proven ?? true));
}

/**
 * `requireSession`, for a signed session id that names no live session. When it was a masquerade's
 * (swept, past its hard stop, or deleted under it), answer 409 and true; otherwise false, and the
 * caller answers its ordinary 401.
 *
 * The staff session is put back only for the browser that held the masquerade: its `ai_msq` names
 * the same row, and the hard stop has not passed (both cookies expire then). A dead impersonation
 * cookie on its own, replayed later, never turns into the staff member's session.
 */
export async function masqueradeSessionGone(req: FastifyRequest, reply: FastifyReply, db: Database, sessionId: string, now: number): Promise<boolean> {
  const row = await rowByAuthSession(db, sessionId);
  if (!row) return false;
  await over(req, reply, db, row, now, { proven: masqueradeCookieId(req) === row.id && now < row.hardExpiresAt });
  return true;
}

/**
 * `requireSession`, for a live session marked `impersonating`: its masquerade while that runs. When
 * the row is missing, ended or expired, the masquerade is ended here (audited `masquerade.expire`),
 * the staff cookie restored, 409 sent, and the answer is null.
 */
export async function masqueradeOfSession(req: FastifyRequest, reply: FastifyReply, db: Database, session: SessionRow, now: number): Promise<MasqueradeRow | null> {
  const row = await rowByAuthSession(db, session.id);
  if (row && masqueradeLive(row, now) && row.staffUserId === session.impersonating && row.targetUserId === session.userId) return row;
  if (row) {
    await over(req, reply, db, row, now);
    return null;
  }
  // An impersonation session with no row: there is nothing to go back to. It goes, and so does the cookie.
  await db.transaction(async (tx) => {
    await tx.delete(authSessions).where(eq(authSessions.id, session.id));
    await audit(req, { action: 'masquerade.expire', outcome: 'ok', actor: { source: 'system' }, target: { type: 'user', id: session.userId }, after: { endReason: 'revoked', staffUserId: session.impersonating, missing: true } }, tx);
  });
  reply.clearCookie(MASQUERADE_COOKIE, clearCookieOptions());
  reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
  masqueradeEnded(reply, SIGN_IN_PATH);
  return null;
}

/** `requireSession`, when a running masquerade's learner row is gone: the session is `revoked`. */
export const masqueradeTargetGone = (req: FastifyRequest, reply: FastifyReply, db: Database, row: MasqueradeRow, now: number): Promise<FastifyReply> =>
  over(req, reply, db, row, now, { reason: 'revoked' });

/** Refuse a masquerading request: one `masquerade.blocked_action` row (the staff member acting) and 403. */
export async function refuseForMasquerade(req: FastifyRequest, reply: FastifyReply, db: Database, row: MasqueradeRow): Promise<FastifyReply> {
  await audit(
    req,
    {
      action: 'masquerade.blocked_action',
      outcome: 'blocked',
      actor: await staffActorOf(db, row.staffUserId),
      masqueradeSessionId: row.id,
      target: await masqueradeTarget(db, row),
      after: { tried: `${req.method} ${routeOf(req)}`, path: req.url.split('?')[0] ?? null },
    },
    db,
  );
  return reply
    .code(403)
    .header('cache-control', 'private, no-store')
    .send({ error: CONSOLE_ERRORS.masquerade_blocked.message, code: 'masquerade_blocked' });
}

/**
 * The global write block (spec § 6), an `onRequest` hook registered before every route. A request
 * whose `ai_msq` names a running masquerade, and which `masqueradeVerdict` refuses, is answered 403
 * here, whatever route it was for: checkout and every public form included. Anything else passes
 * untouched, with no database read: no cookie (every server-to-server webhook), a forged one, or an
 * allowed method and route.
 */
export async function masqueradeWriteBlock(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined> {
  if (!req.cookies?.[MASQUERADE_COOKIE]) return undefined;
  if (masqueradeVerdict(req.method, routeOf(req)) === 'allow') return undefined;
  const id = masqueradeCookieId(req);
  if (id === null) return undefined;
  const db = getDb();
  const [row] = await db.select().from(masqueradeSessions).where(eq(masqueradeSessions.id, id)).limit(1);
  // Over already: a route behind `requireSession` ends it there and says so; a public one runs as for anyone.
  if (!row || !masqueradeLive(row, clock.now())) return undefined;
  return refuseForMasquerade(req, reply, db, row);
}

/**
 * Sign Out with a masquerade's session (spec § 6): Exit, recorded as `signed_out`, then a full
 * sign-out, so the staff member's own session goes too. `sessionId` is what the signed cookie named,
 * live or not. `ai_msq` is cleared whenever the request carries one.
 */
export async function masqueradeSignOut(req: FastifyRequest, reply: FastifyReply, db: Database, sessionId: string | null, now: number): Promise<void> {
  const row = sessionId === null ? null : await rowByAuthSession(db, sessionId);
  if (row || req.cookies?.[MASQUERADE_COOKIE]) reply.clearCookie(MASQUERADE_COOKIE, clearCookieOptions());
  if (!row) return;
  if (row.endedAt === null) {
    await endMasquerade(db, req, row.id, { reason: 'signed_out', action: 'masquerade.signed_out', actor: await staffActorOf(db, row.staffUserId), now });
  }
  await deleteSession(db, row.authSessionId);
  await deleteSession(db, row.staffAuthSessionId);
}
