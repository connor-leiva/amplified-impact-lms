// Phase 07 § 7.5's five endpoints.
//
//   POST   /api/auth/request    {email}  → always 200 {ok:true}
//   POST   /api/auth/verify     {token}  → 200 {ok:true, team} + the ai_sid cookie, or 400
//   POST   /api/auth/sign-out            → 200 {ok:true}, idempotent
//   GET    /api/me                       → { viewer: { actor, role }, prefs }
//   PATCH  /api/me/prefs        {tz?, theme?}
//
// The policy is in `../auth/` — tokens, sessions, the cookie's attributes, the role. This file is
// the HTTP surface over it: status codes, bodies, rate limits, and what the web app's two sign-in
// screens already expect.
//
// ------------------------------------------------------------------------------------------------
// THE TWO ERROR STRINGS `/api/auth/verify` MAY SEND, AND WHY THEY LOOK LIKE CODES
// ------------------------------------------------------------------------------------------------
// `apps/web/src/routes/auth/SignIn.tsx` is already written against this endpoint:
//
//   const body = (await res.json().catch(() => null)) as { error?: string } | null;
//   return body?.error === 'used' ? 'used' : 'expired';
//
// and `AcceptInvite.tsx` does the same. So the body carries a MACHINE CODE — `'used'` or
// `'expired'` — and the copy § 7.5 specifies ("That link was already used. Request a new one.")
// lives in the screen. Sending the sentence instead would move user-facing copy into the API,
// where CLAUDE.md's "copy is exact" rule has no test to enforce it, and would break both screens'
// comparison on the first rewording.
//
// Every refusal is 400 and one of those two codes. There is deliberately no third: a forged token,
// a token for a deleted account, a malformed body and a token that never existed all read as
// `'expired'`, because "Request a new one." is the correct recovery for all of them and because
// telling a caller which of those it hit is telling them which token hashes exist.
//
// ------------------------------------------------------------------------------------------------
// WHY `/api/auth/request` ANSWERS BEFORE IT DOES ANYTHING
// ------------------------------------------------------------------------------------------------
// § 7.5's "always returns 200 {ok:true}, so it does not reveal whether an account exists" is not
// only about the status and the body. The handler rate-limits, replies, and *then* hands the
// lookup, the mint, the insert and the send to `queueMailTask`, so the response time is not a
// function of anything that distinguishes the two cases. `auth/mailer.ts` carries the full
// argument, including why a decoy token row for unknown addresses was the wrong answer.

import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import {
  clearCookieOptions,
  createSession,
  deleteSession,
  expiryFor,
  hashToken,
  markActive,
  mintToken,
  normalizeEmail,
  normalizePrefs,
  queueEmail,
  queueMailTask,
  readSession,
  requireJsonSameOrigin,
  requireSameOrigin,
  requireSession,
  sameHash,
  SESSION_COOKIE,
  sessionCookieOptions,
  userByEmail,
  userById,
  viewerOrThrow,
} from '../auth';
import type { TokenPurpose, ViewerPrefs } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { authTokens, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { landingFor } from '../lib/landing';
import { groupsOf, provisionGroupMember, recordVerified } from '../billing/access-groups';
import { selfServeAddress } from '../billing/self-serve';
import { safeNext } from '@ai/core/landing';

/** § 7.5's "Rate limit: 5 per hour per email and IP", and § 9.4's repeat of it: the per-email half. */
export const AUTH_REQUEST_MAX = 5;
export const AUTH_REQUEST_WINDOW = '1 hour';
/**
 * The per-IP half for a sign-in link and Forgot Password: 30 an hour from one visitor's address
 * (Nov 12, 2026). A training room's agents can share one office address, and each asks for a link
 * or a reset once or twice; five an hour shut the room out. Each address keeps its own 5 an hour.
 */
export const AUTH_REQUEST_IP_MAX = 30;

// `next` (D-151): a guided setup in learn to land on once signed in, `/skill-library/<page>`, carried
// in the emailed link. Anything else is dropped (`safeNext`), never an error.
const requestBody = z.strictObject({ email: z.string(), next: z.string().max(200).optional() });
const verifyBody = z.strictObject({ token: z.string() });
/**
 * § 7.5's `PATCH /api/me/prefs {tz?, theme?}`.
 *
 * `tz` is nullable so the viewer can go back to "use the program zone"; `theme` is not, because
 * there is no third state — the pre-paint script in `index.html` reads `'dark'` or falls back to
 * `'light'`. Strict, like every schema in `schemas.ts`: an unexpected key means the client and the
 * server have drifted and the loud answer is the useful one.
 */
const prefsBody = z.strictObject({
  tz: z.string().nullable().optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

/**
 * Whether a string is a time zone this runtime can actually format in.
 *
 * `prefs.tz` is what `fmt.*` resolves every instant against, so a value `Intl` rejects does not
 * produce a wrong time — it throws a `RangeError` inside a view-model and takes the screen down.
 * Validating at the write is the only place that failure is cheap: the viewer sees a 422 on the
 * field they just changed instead of a blank portal on their next visit.
 */
export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * § 7.5: mint a sign-in token, store `sha256(token)`, email the link.
 *
 * Runs in the background (see the header). A missing account returns quietly: login is invite-only
 * and "there is no public sign-up, because the business sells seats through sales calls", so the
 * absence of a row is the ordinary case for a typo, not an error to report.
 */
export async function issueSignInLink(email: string, next: string | null = null): Promise<void> {
  const db = getDb();
  const now = clock.now();
  const user = await userByEmail(db, email);
  // D-148, D-151: an access group's address (an @liveutah.com one), or one that signed up on a free
  // skill's page, may ask for its first link before it has an account; the account is made when the
  // link is spent, which is what proves the address. The person asked for this email: nothing is ever
  // sent to anyone unasked.
  const to = user?.email ?? ((await selfServeAddress(db, email, now)) ? email : null);
  if (!to) return;

  const token = mintToken();
  await db.insert(authTokens).values({
    tokenHash: hashToken(token),
    // The account's own address, not the one that was typed: the token belongs to the row.
    email: to,
    purpose: 'sign_in',
    expiresAt: expiryFor('sign_in', now),
  });
  // `templates/links.ts` builds `${APP_URL}/sign-in?token=…` from this and refuses to render
  // against a missing APP_URL, so a misconfigured deploy logs a named error rather than mailing a
  // dead button.
  // `next` (D-151), checked again here: the link lands on that guided setup once signed in.
  const landing = safeNext(next);
  queueEmail({ template: 'sign-in', to, data: landing ? { token, next: landing } : { token } });
}

/**
 * D-148: make the account for an access group's address that has none, once a link emailed to it has
 * been spent. True when it made one; false when the address has an account already, is in no group,
 * or core refused (a staff address).
 */
export async function accountForGroupAddress(db: Database, email: string, now: number): Promise<boolean> {
  if (await userByEmail(db, email)) return false;
  if ((await groupsOf(db, email, now)).length === 0) return false;
  return (await provisionGroupMember(db, email, now)) !== null;
}

/**
 * D-148 and D-151: the account for a self-serve address that has none (an access group's, or a free
 * skill sign-up's, `selfServeAddress`), once a link emailed to it has been spent. Made the same way
 * for both (the owner of a team of one, Agent tier, no account, order or plan row, no email). A free
 * sign-up's account opens the free skills, as any learner's does, and nothing more. True when it made one.
 */
export async function accountForSelfServe(db: Database, email: string, now: number): Promise<boolean> {
  if (await userByEmail(db, email)) return false;
  if (!(await selfServeAddress(db, email, now))) return false;
  return (await provisionGroupMember(db, email, now)) !== null;
}

/** What `/api/auth/verify` decided about a token. */
export type Claim =
  | { ok: true; email: string; purpose: TokenPurpose }
  | { ok: false; code: 'used' | 'expired' };

/**
 * Look the token up, refuse it, or spend it — atomically.
 *
 * § 7.5: "Single use: mark `used_at`, and a second verify fails." The `UPDATE … WHERE used_at IS
 * NULL … RETURNING` is what makes that true under concurrency: two requests carrying the same
 * token race on one row and Postgres hands the row to exactly one of them. A read-then-write would
 * let both pass, which is the failure a shared magic link in a team inbox produces on its own.
 */
export async function claimToken(
  db: Database,
  token: string,
  now: number,
  purposes: readonly TokenPurpose[] = ['sign_in', 'invite'],
): Promise<Claim> {
  const hash = hashToken(token);
  const [row] = await db.select().from(authTokens).where(eq(authTokens.tokenHash, hash)).limit(1);

  // Nothing stored under this hash. Indistinguishable from a forged token, on purpose.
  if (!row) return { ok: false, code: 'expired' };
  // Belt and braces over the SQL equality, and the line that keeps the comparison honest if anyone
  // ever "simplifies" the lookup to fetch by email and compare the token itself. See tokens.ts.
  if (!sameHash(row.tokenHash, hash)) return { ok: false, code: 'expired' };
  // D-132: each route claims only its own kind of link, and a link of another kind is neither
  // honoured nor spent here. A password link posted to /api/auth/verify does not sign anyone in.
  if (!purposes.includes(row.purpose)) return { ok: false, code: 'expired' };
  // Checked before the expiry so a link that was used and has since expired still reads as used:
  // "That link was already used" is the more actionable of the two messages.
  if (row.usedAt !== null) return { ok: false, code: 'used' };
  if (row.expiresAt.getTime() <= now) return { ok: false, code: 'expired' };

  const spent = await db
    .update(authTokens)
    .set({ usedAt: new Date(now) })
    .where(and(eq(authTokens.tokenHash, hash), isNull(authTokens.usedAt)))
    .returning({ tokenHash: authTokens.tokenHash });
  // Lost the race: another request spent it between the select and the update.
  if (spent.length === 0) return { ok: false, code: 'used' };

  // Every token is delivered by email, so spending one proves the person reads that address: what an
  // access group needs before it grants anything (D-148).
  await recordVerified(db, row.email, now);

  return { ok: true, email: row.email, purpose: row.purpose };
}

/** The viewer's team name, for `AcceptInvite`'s "Joining {Team or Amplified Impact}…". */
async function teamNameOf(db: Database, teamId: string | null): Promise<string | null> {
  if (teamId === null || teamId === '') return null;
  const [row] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return row?.name ?? null;
}

/** Merge a patch into `users.prefs` and hand back what is now stored. */
async function writePrefs(db: Database, userId: string, current: ViewerPrefs, patch: ViewerPrefs): Promise<ViewerPrefs> {
  const next = normalizePrefs({ ...current, ...patch });
  // `tz: null` means "go back to the program zone", which `normalizePrefs` drops rather than
  // storing — the absence of the key is what the web app reads as "no viewer zone".
  await db.update(users).set({ prefs: next }).where(eq(users.id, userId));
  return next;
}

export interface AuthRouteOptions {
  /** Called after a verify that changed a `users` row, so open SSE clients refetch. */
  broadcast: () => void;
}

export function registerAuthRoutes(app: FastifyInstance, { broadcast }: AuthRouteOptions): void {
  /**
   * The per-EMAIL half of § 7.5's rate limit. The per-IP half is the route's own `config.rateLimit`
   * below (`AUTH_REQUEST_IP_MAX`), which the plugin keys on the visitor's own address
   * (`rateLimitKey`, `req.clientIp`).
   *
   * Two limiters rather than one because the plugin takes a single `keyGenerator` per route, and
   * § 7.5 asks for both axes: per-IP alone lets a botnet hammer one mailbox, and per-email alone
   * lets one host enumerate a whole domain.
   */
  const perEmail = app.createRateLimit({
    max: AUTH_REQUEST_MAX,
    timeWindow: AUTH_REQUEST_WINDOW,
    keyGenerator: (req) => {
      const body = req.body as { email?: unknown } | undefined;
      return `auth-request:${typeof body?.email === 'string' ? normalizeEmail(body.email) : ''}`;
    },
  });

  app.post(
    '/api/auth/request',
    { config: { rateLimit: { max: AUTH_REQUEST_IP_MAX, timeWindow: AUTH_REQUEST_WINDOW } } },
    async (req, reply) => {
      const parsed = requestBody.safeParse(req.body);
      // A body that is not `{ email }` is a client bug, not an account probe, so it is allowed to
      // look different. Nothing about which accounts exist is observable from it.
      if (!parsed.success) return reply.code(400).send({ error: 'Expected a JSON body of { email }.' });

      // `isExceeded`, NOT `isAllowed`. `applyRateLimit` returns `isAllowed: false` on every call
      // that is not on an allow list — the counter it just incremented is reported separately —
      // so branching on `isAllowed` rate-limits the FIRST request of every hour. Measured against
      // this exact version; `isExceeded` is `current > max`, which is the question § 7.5 asks.
      const verdict = await perEmail(req);
      if (!verdict.isAllowed && verdict.isExceeded) {
        reply.header('retry-after', String(verdict.ttlInSeconds));
        return reply.code(429).send({ error: 'Too many sign-in requests. Try again later.' });
      }

      // ANSWER FIRST. Everything below this line is off the request path; see the header.
      reply.code(200).send({ ok: true });
      const email = normalizeEmail(parsed.data.email);
      const next = safeNext(parsed.data.next);
      queueMailTask(`sign-in link for ${email}`, () => issueSignInLink(email, next));
      return reply;
    },
  );

  app.post('/api/auth/verify', { preHandler: requireSameOrigin }, async (req, reply) => {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'expired' });

    const db = getDb();
    const now = clock.now();
    const claim = await claimToken(db, parsed.data.token, now);
    if (!claim.ok) return reply.code(400).send({ error: claim.code });

    // D-148, D-151: an access group's address, or a free skill sign-up's, with no account yet. The
    // link it just spent proves the address is theirs, so the account is made now.
    const made = await accountForSelfServe(db, claim.email, now);
    const user = await userByEmail(db, claim.email);
    // The token was valid and is now spent, but the account is gone (`removeMember`,
    // `removeStaff`). Nothing to sign in to, and nothing to say about it beyond "ask for another".
    if (!user) return reply.code(400).send({ error: 'expired' });

    // § 7.5: "`/invite/:token` verifies the token, sets `status: 'active'` and `joined`, and signs
    // the user in." Learners only — `status` and `joined` are § 7.2's learner columns and a staff
    // row carries neither. An account made from an access group's link joins the same way.
    let joined = false;
    if ((claim.purpose === 'invite' || made) && user.kind === 'learner') {
      await db
        .update(users)
        // `joined` is kept if it is already set: the invite is single use, but a row seeded as
        // active already has a join date and overwriting it would move a learner's start.
        .set({ status: 'active', joined: user.joined ?? now })
        .where(eq(users.id, user.id));
      joined = true;
    }

    const team = await teamNameOf(db, user.teamId);
    const sessionId = await createSession(db, user.id, now);
    await markActive(db, user.id, now);
    reply.setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions());

    // An accepted invite changes a `users` row, which is in every teammate's snapshot — the Team
    // Hub's seat list goes from Invited to Active without a refresh.
    if (joined) broadcast();

    // D-150: where to go next, so a learner with no cohort portal lands on the Skill Library.
    return reply.code(200).send({ ok: true, team, landing: await landingFor(db, user, now) });
  });

  /**
   * § 7.5's sign-out. No `requireSession`: a viewer whose cookie has already expired still clicked
   * Sign Out, and answering 401 would leave the dead cookie in their browser. Idempotent, 200
   * either way, and the cookie is always cleared.
   */
  app.post('/api/auth/sign-out', { preHandler: requireSameOrigin }, async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (raw !== undefined && raw !== '') {
      const unsigned = req.unsignCookie(raw);
      if (unsigned.valid && unsigned.value !== null) {
        const db = getDb();
        // Resolved before deleting so a forged or stale id cannot delete somebody else's row —
        // `readSession` is the only thing that says this id is a live session.
        const session = await readSession(db, unsigned.value, clock.now());
        if (session) await deleteSession(db, session.id);
      }
    }
    reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return reply.code(200).send({ ok: true });
  });

  /**
   * § 7.5's `GET /api/me`.
   *
   * `http.test.ts` pins the shape: `viewer()` reads `body.viewer` and returns it unchanged, so
   * `{ actor, role }` here is what every screen's routing sees. `prefs` rides alongside rather
   * than inside `viewer`, which is what the same test's fixture body shows
   * (`{ viewer, prefs: { tz: 'America/Chicago' } }`).
   */
  app.get('/api/me', { preHandler: requireSession }, async (req) => {
    const { actor, role, prefs } = viewerOrThrow(req);
    return { viewer: { actor, role }, prefs };
  });

  // `PATCH` carries a body, so it gets § 9.4's full rule — the same pair a mutation gets, in the
  // same order (session first, so an unauthenticated call is 401 rather than 415).
  app.patch('/api/me/prefs', { preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply) => {
    const viewer = viewerOrThrow(req);
    const parsed = prefsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Expected a JSON body of { tz?, theme? }.' });
    }
    const { tz, theme } = parsed.data;
    if (typeof tz === 'string' && !isTimeZone(tz)) {
      return reply.code(422).send({ error: `${tz} is not a time zone this server recognizes.` });
    }

    const db = getDb();
    const patch: ViewerPrefs = {};
    if (tz !== undefined) patch.tz = tz;
    if (theme !== undefined) patch.theme = theme;
    // Re-read rather than trusting the copy `requireSession` loaded: two tabs can patch different
    // keys within a request of each other, and merging onto a stale row loses one of them.
    const fresh = await userById(db, viewer.user.id);
    const current = normalizePrefs(fresh?.prefs ?? viewer.prefs);
    return { prefs: await writePrefs(db, viewer.user.id, current, patch) };
  });
}
