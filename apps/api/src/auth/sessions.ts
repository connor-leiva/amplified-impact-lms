// The `auth_sessions` row and the `ai_sid` cookie — phase 07 § 7.5.
//
//   "`POST /api/auth/verify {token}`. Marks the token used, creates `auth_sessions` (30 days,
//    rolling), and sets cookie `ai_sid` (httpOnly, Secure, SameSite=Lax, signed)."
//
// The cookie carries ONE thing: the `auth_sessions.id`. No user id, no role, no expiry, no JSON.
// That matters more than it looks:
//
//   - Sign-out is real. § 7.5 says "`POST /api/auth/sign-out`. Deletes the session", and with the
//     row as the source of truth, deleting it ends the session everywhere immediately. A
//     self-contained token (a JWT) cannot be revoked without inventing a deny-list, which is a
//     session table with extra steps.
//   - A role change takes effect on the next request. `roleOf` reads the live `users` row, so an
//     admin who demotes a Team Owner does not have to wait 30 days for a cookie to expire.
//   - Nothing about the viewer is attacker-visible. The value is opaque, so even a cookie read off
//     a shared machine tells the reader nothing about who it belongs to.
//
// -----------------------------------------------------------------------------------------------
// "30 DAYS, ROLLING" — AND WHY THE ROLL IS THROTTLED
// -----------------------------------------------------------------------------------------------
// Rolling means an active viewer is never signed out: each request pushes `expires_at` back out to
// 30 days. Written literally that is one `UPDATE` per request, on the hottest row in the database,
// behind every snapshot read — and the snapshot is already fourteen queries, so this is the kind of
// write that only shows up as a problem under the load you get after launch.
//
// So the row is only rewritten once `ROLL_AFTER_MS` of the window has actually been consumed. The
// viewer-visible behaviour is identical (a session in daily use never expires) and the write rate
// drops from per-request to at most once a day per session. The cookie's own `maxAge` is re-sent on
// every response regardless, because that costs a header and nothing else.
//
// -----------------------------------------------------------------------------------------------
// `Secure` IS CONDITIONAL, AND NOT ON A WHIM
// -----------------------------------------------------------------------------------------------
// § 9.4 requires `Secure`. A `Secure` cookie is dropped by the browser over plain http, so a
// literal `secure: true` would make sign-in impossible on `http://localhost:3000` — the way the
// API is actually run during development. `'auto'` is `@fastify/cookie`'s own answer (it reads
// `request.protocol`, which with `trustProxy` set is Railway's `x-forwarded-proto`), and production
// is pinned to a hard `true` so that a misread proxy header can never downgrade a real session
// cookie. The asymmetry is the point: being wrong in development is an inconvenience, being wrong
// in production is a session cookie on the wire.
//
// Expired rows are not swept. There is no cleanup job in this phase and an expired row is already
// inert — `readSession` refuses it — so the only cost is table size, which is one row per sign-in.
// § 8.5's scheduler is where a prune would belong if it is ever worth writing.

import { randomBytes } from 'node:crypto';
import { and, eq, isNull, lt, ne, or } from 'drizzle-orm';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { Database } from '../db/client';
import { authSessions, users } from '../db/schema';

/** § 7.5's cookie name, verbatim. The web app never reads it (it is `httpOnly`). */
export const SESSION_COOKIE = 'ai_sid';

/** § 7.5: "30 days, rolling". */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How much of the window must be used up before `expires_at` is rewritten. See the header. */
export const ROLL_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * D-132: a password sign-in without "Keep me signed in" — a browser-session cookie (no `maxAge`)
 * and a row that lasts 12 hours and never rolls. Every other sign-in (a link, a new password,
 * "Keep me signed in") is the 30-day rolling session above.
 */
export const SHORT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** One `auth_sessions` row. */
export type SessionRow = typeof authSessions.$inferSelect;

/**
 * § 7.5's four cookie attributes.
 *
 * `path: '/'` because the SPA is served from the root and the cookie has to reach `/api/*` from any
 * route. `maxAge` in seconds, as the header wants it.
 */
export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env, { remember = true }: { remember?: boolean } = {}): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production' ? true : 'auto',
    signed: true,
    // Without "Keep me signed in" the cookie has no `maxAge`: the browser drops it when it closes.
    ...(remember ? { maxAge: Math.floor(SESSION_TTL_MS / 1000) } : {}),
  };
}

/** The attributes that clear it. `maxAge`/`expires` are supplied by `reply.clearCookie`. */
export function clearCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production' ? true : 'auto',
  };
}

/**
 * A new session id: 32 bytes of `base64url`, prefixed so it is recognisable in a database row.
 *
 * High entropy even though the cookie is signed. The signature is what stops a visitor from
 * choosing an id, and the entropy is what stops them from guessing one if the signing key is ever
 * rotated badly or a future reader of this table gets handed an unsigned value by mistake.
 */
export const mintSessionId = (): string => `s_${randomBytes(32).toString('base64url')}`;

/** § 7.5: create the row. Returns the id that goes in the cookie. `remember: false` is D-132's short session. */
export async function createSession(db: Database, userId: string, now: number, { remember = true }: { remember?: boolean } = {}): Promise<string> {
  const id = mintSessionId();
  await db.insert(authSessions).values({ id, userId, remember, expiresAt: new Date(now + (remember ? SESSION_TTL_MS : SHORT_SESSION_TTL_MS)) });
  const { claimSkillPurchases } = await import('../billing/skill-claim');
  await claimSkillPurchases(db, userId);
  return id;
}

/** The row, or `null` when there is none or it has expired. Never extends anything. */
export async function readSession(db: Database, id: string, now: number): Promise<SessionRow | null> {
  const [row] = await db.select().from(authSessions).where(eq(authSessions.id, id)).limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() <= now) return null;
  return row;
}

/** Whether this row has consumed enough of its window to be worth rewriting. See the header. */
export const needsRoll = (row: SessionRow, now: number): boolean =>
  row.remember !== false && row.expiresAt.getTime() - now < SESSION_TTL_MS - ROLL_AFTER_MS;

/** Push `expires_at` back out to 30 days from `now`. Only called when `needsRoll` says so. */
export async function rollSession(db: Database, id: string, now: number): Promise<void> {
  await db
    .update(authSessions)
    .set({ expiresAt: new Date(now + SESSION_TTL_MS) })
    .where(eq(authSessions.id, id));
}

/**
 * "Last Active" (D-145): stamp `users.last` with `now`. The Team Hub's Last Active column, the
 * console's Learners and Staff screens and the Overview's at-risk list all read it, and before this
 * only an AI Employee step ever wrote it, so a Team Plan agent, an Insiders member or a staff
 * member who only signed in and used the Skill Library showed as never active.
 *
 * Called on a REAL sign-in (password, set or reset password, emailed link, Google) and when a
 * session rolls (`requireSession`), which `needsRoll` throttles to at most once a day per session.
 * Not called by `createSession` itself, so the test-only session route and `signInAs` stamp
 * nothing: the http parity run's seeded "Last Active" values stay the reference's.
 *
 * Never moves `last` backwards, and writes no other column. Nothing is broadcast: the next
 * snapshot an owner loads shows it.
 */
export async function markActive(db: Database, userId: string, now: number): Promise<void> {
  await db
    .update(users)
    .set({ last: now })
    .where(and(eq(users.id, userId), or(isNull(users.last), lt(users.last, now))));
}

/** § 7.5's sign-out. Idempotent: deleting a session that is already gone is success. */
export async function deleteSession(db: Database, id: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.id, id));
}

/**
 * D-132: a new password signs out every other session of that user (a reset is often because
 * someone else got in). `keep` is the session to leave alone: the one changing it.
 */
export async function deleteOtherSessions(db: Database, userId: string, keep: string | null): Promise<void> {
  await db
    .delete(authSessions)
    .where(keep === null ? eq(authSessions.userId, userId) : and(eq(authSessions.userId, userId), ne(authSessions.id, keep)));
}
