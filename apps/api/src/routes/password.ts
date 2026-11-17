// Email and password sign-in (DECISIONS.md D-132). The magic link (routes/auth.ts) stays, as the
// second way in.
//
//   POST /api/auth/login              { email, password, remember? }  → 200 { ok } + cookie
//                                                                     → 400 the same words for every mismatch
//                                                                     → 429 while the address is locked
//   POST /api/auth/password/forgot    { email }    → 200 always, before anything is looked up
//   POST /api/auth/password/token     { token }    → 200 { ok, purpose } or 400 { error }; spends nothing
//   POST /api/auth/password/set       { token, password }     → 200 { ok } + cookie
//   POST /api/auth/password/checkout  { checkout, password }  → 200 { ok } + cookie (the welcome page's button)
//   GET  /api/auth/password           (signed in) → { hasPassword }
//   POST /api/auth/password/change    (signed in) { current?, password } → 200 { ok }
//
// NO ACCOUNT ENUMERATION ANYWHERE. `forgot` answers 200 before it reads a row, and the email goes
// out in the background (the same pattern as /api/auth/request). `login` gives one answer for an
// unknown address, an address with no password and a wrong password, after the same argon2 work,
// and locks an unknown address exactly like a known one (`passwords.ts`).
//
// A NEW PASSWORD SIGNS OUT EVERY OTHER SESSION. Setting it from a link signs the person in on this
// browser and ends their sessions everywhere else; changing it from the account page keeps the
// session doing the change. Outstanding set and reset links for the address are spent too, so an
// old email cannot undo a reset.
//
// THE WELCOME PAGE'S BUTTON (`checkout`). A buyer just back from Stripe has the Checkout Session
// id in their address bar and nothing else. It sets a password only for an account that order
// made and nobody has used: the order's own account owner, still `invited`, with no password and
// no session ever, the order paid within the set-password link's 72 hours, and the invite hold
// over (until `INVITES_FROM` the welcome page says the login comes by email on that day, and the
// button would contradict it). Stripe does not verify the email typed at checkout, so an existing
// account never qualifies: its owner uses "Forgot password?", which goes to their own inbox.
//
// 400, NOT 401, FOR A WRONG PASSWORD. In this API a 401 means "no session" (Gate 7's route table
// pins it, and the web client sends a 401 to /sign-in), so a mismatch is a 400 with words.
//
// NEVER LOGGED: a password, a hash, a token. The failure logs name the route and nothing typed.

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  burnVerify,
  clearFailures,
  createSession,
  deleteOtherSessions,
  expiryFor,
  hashPassword,
  hashToken,
  lockedUntil,
  markActive,
  mintToken,
  normalizeEmail,
  passwordHashOf,
  passwordProblem,
  queueEmail,
  queueMailTask,
  recordFailure,
  requireJsonSameOrigin,
  requireSameOrigin,
  requireSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  SET_PASSWORD_TTL_MS,
  storePassword,
  userByEmail,
  verifyPassword,
  viewerOrThrow,
} from '../auth';
import type { UserRow } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { accounts, authSessions, authTokens, orders, userPasswords, users } from '../db/schema';
import { clock } from '../lib/clock';
import { landingFor } from '../lib/landing';
import { AUTH_REQUEST_IP_MAX, AUTH_REQUEST_MAX, AUTH_REQUEST_WINDOW, accountForSelfServe, claimToken } from './auth';
import { domainGroupsOf } from '../billing/access-groups';
import { selfServeAddress } from '../billing/self-serve';
import { recordUsage } from '../lib/usage';

// --- words -----------------------------------------------------------------------------------------

/** One answer for every mismatch: unknown address, no password yet, wrong password. */
export const WRONG_PASSWORD = 'That email and password don’t match.';
/**
 * The one exception (Nov 12, 2026): an address in an access group's domain (D-148) with no password
 * yet, whether or not it has an account. A Utah Life agent's first visit has neither, and "don't
 * match" sent them nowhere. Says nothing an address with no password could not already learn.
 */
export const NO_PASSWORD_YET = 'There’s no password for that email yet. Choose Forgot Password? to set one.';
export const LOCKED_OUT = 'Too many tries. Wait 15 minutes, or reset your password.';
export const WRONG_CURRENT = 'That’s not your current password.';
export const NEED_CURRENT = 'Enter your current password.';

// --- limits ----------------------------------------------------------------------------------------

/** Password attempts from one address on the network, whatever addresses they type. */
export const LOGIN_IP_MAX = 30;
export const LOGIN_IP_WINDOW = '15 minutes';

// --- bodies ----------------------------------------------------------------------------------------

const loginBody = z.strictObject({ email: z.string().max(320), password: z.string().max(1000), remember: z.boolean().optional() });
const emailBody = z.strictObject({ email: z.string().max(320) });
const tokenBody = z.strictObject({ token: z.string().max(200) });
const setBody = z.strictObject({ token: z.string().max(200), password: z.string().max(1000) });
const checkoutBody = z.strictObject({ checkout: z.string().max(260), password: z.string().max(1000) });
const changeBody = z.strictObject({ current: z.string().max(1000).optional(), password: z.string().max(1000) });

/** Stripe's Checkout Session id, the same shape `routes/offer.ts` accepts. */
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

// --- the emails ------------------------------------------------------------------------------------

/**
 * "Forgot password?": a set-password link (72 hours) for an account with no password yet, a reset
 * link (1 hour) for one that has one, and nothing at all for an address with no account. Runs in
 * the background, after the 200.
 */
export async function issuePasswordLink(email: string): Promise<void> {
  const db = getDb();
  const now = clock.now();
  const user = await userByEmail(db, email);
  // D-148: an access group's address with no account yet gets a set-password link, which they asked
  // for; the account is made when it is spent (`/api/auth/password/set`), which proves the address.
  const to = user?.email ?? ((await selfServeAddress(db, email, now)) ? email : null);
  if (!to) return;
  const has = user ? (await passwordHashOf(db, user.id)) !== null : false;
  const purpose = has ? 'reset_password' : 'set_password';
  const token = mintToken();
  await db.insert(authTokens).values({ tokenHash: hashToken(token), email: to, purpose, expiresAt: expiryFor(purpose, now) });
  queueEmail({ template: has ? 'reset-password' : 'set-password', to, data: { token } });
}

// --- the shared end of every "set a password" path -------------------------------------------------

/**
 * Store the password and finish what a first sign-in finishes: an `invited` learner becomes
 * `active` (as an accepted invite does), every other session of theirs ends, every unspent set or
 * reset link for the address is spent, and the address's failures are cleared. Returns whether a
 * `users` row changed, so the caller can tell open clients to refetch.
 */
async function finishPasswordSet(db: Database, user: UserRow, password: string | null, now: number, keepSession: string | null): Promise<boolean> {
  // `null`: the caller has already stored it (the welcome page's first-write-wins insert).
  if (password !== null) await storePassword(db, user.id, password, now);
  let activated = false;
  if (user.kind === 'learner' && user.status === 'invited') {
    await db.update(users).set({ status: 'active', joined: user.joined ?? now }).where(eq(users.id, user.id));
    activated = true;
  }
  await db
    .update(authTokens)
    .set({ usedAt: new Date(now) })
    .where(and(eq(authTokens.email, user.email), inArray(authTokens.purpose, ['set_password', 'reset_password']), isNull(authTokens.usedAt)));
  await deleteOtherSessions(db, user.id, keepSession);
  await clearFailures(db, user.email);
  return activated;
}

async function signIn(db: Database, reply: FastifyReply, userId: string, now: number, remember: boolean): Promise<void> {
  const sessionId = await createSession(db, userId, now, { remember });
  await markActive(db, userId, now);
  reply.setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions(process.env, { remember }));
  recordUsage(reply.request, userId, 'sign_in'); // D-166: a usage count, after the sign-in; it changes nothing here.
}

// --- the welcome page's button ---------------------------------------------------------------------

/**
 * The account a Checkout Session may set a password for from the welcome page, or null. See the
 * header for each rule and why. Read-only; `routes/offer.ts` calls it to decide whether to show the
 * button, and the route below calls it again before writing.
 */
export async function checkoutPasswordUser(db: Database, sessionId: string, now: number, invitesFrom: number): Promise<UserRow | null> {
  if (!SESSION_ID.test(sessionId)) return null;
  if (now < invitesFrom) return null;
  const [order] = await db
    .select({ status: orders.status, accountId: orders.accountId, paidAt: orders.paidAt, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.stripeSessionId, sessionId))
    .limit(1);
  if (!order || (order.status !== 'paid' && order.status !== 'trialing') || !order.accountId) return null;
  const paidAt = order.paidAt ?? order.createdAt;
  if (now - paidAt > SET_PASSWORD_TTL_MS) return null;
  const [acct] = await db.select({ ownerUserId: accounts.ownerUserId }).from(accounts).where(eq(accounts.id, order.accountId)).limit(1);
  if (!acct) return null;
  const [user] = await db.select().from(users).where(eq(users.id, acct.ownerUserId)).limit(1);
  if (!user || user.kind !== 'learner' || user.status !== 'invited') return null;
  const [hash] = await db.select({ userId: userPasswords.userId }).from(userPasswords).where(eq(userPasswords.userId, user.id)).limit(1);
  if (hash) return null;
  const [session] = await db.select({ id: authSessions.id }).from(authSessions).where(eq(authSessions.userId, user.id)).limit(1);
  if (session) return null;
  return user;
}

// --- routes ----------------------------------------------------------------------------------------

export interface PasswordRouteOptions {
  broadcast: () => void;
  /** `INVITES_FROM`: until then the welcome page's button is not offered (see the header). */
  invitesFrom: number;
}

export function registerPasswordRoutes(app: FastifyInstance, { broadcast, invitesFrom }: PasswordRouteOptions): void {
  const perEmail = app.createRateLimit({
    max: AUTH_REQUEST_MAX,
    timeWindow: AUTH_REQUEST_WINDOW,
    keyGenerator: (req) => {
      const body = req.body as { email?: unknown } | undefined;
      return `password-forgot:${typeof body?.email === 'string' ? normalizeEmail(body.email) : ''}`;
    },
  });

  app.post(
    '/api/auth/login',
    { preHandler: requireSameOrigin, config: { rateLimit: { max: LOGIN_IP_MAX, timeWindow: LOGIN_IP_WINDOW } } },
    async (req, reply) => {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Expected a JSON body of { email, password, remember? }.' });
      const email = normalizeEmail(parsed.data.email);
      const { password } = parsed.data;
      const remember = parsed.data.remember === true;
      const db = getDb();
      const now = clock.now();

      const until = await lockedUntil(db, email, now);
      if (until !== null) {
        reply.header('retry-after', String(Math.ceil((until - now) / 1000)));
        return reply.code(429).send({ error: LOCKED_OUT });
      }

      const user = email ? await userByEmail(db, email) : null;
      const stored = user ? await passwordHashOf(db, user.id) : null;
      const ok = stored ? await verifyPassword(stored, password) : await burnVerify(password);
      if (!ok || !user) {
        await recordFailure(db, email, now);
        const groupNoPassword = !stored && email !== '' && (await domainGroupsOf(db, email, now)).length > 0;
        return reply.code(400).send({ error: groupNoPassword ? NO_PASSWORD_YET : WRONG_PASSWORD });
      }

      await clearFailures(db, email);
      await signIn(db, reply, user.id, now, remember);
      // D-150: where to go next, so a learner with no cohort portal lands on the Skill Library.
      return reply.code(200).send({ ok: true, landing: await landingFor(db, user, now) });
    },
  );

  app.post(
    '/api/auth/password/forgot',
    { config: { rateLimit: { max: AUTH_REQUEST_IP_MAX, timeWindow: AUTH_REQUEST_WINDOW } } },
    async (req, reply) => {
      const parsed = emailBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Expected a JSON body of { email }.' });
      const verdict = await perEmail(req);
      if (!verdict.isAllowed && verdict.isExceeded) {
        reply.header('retry-after', String(verdict.ttlInSeconds));
        return reply.code(429).send({ error: 'Too many requests. Try again later.' });
      }
      // Answer first: nothing below can change what this response says.
      reply.code(200).send({ ok: true });
      const email = normalizeEmail(parsed.data.email);
      queueMailTask('password link', () => issuePasswordLink(email));
      return reply;
    },
  );

  app.post('/api/auth/password/token', async (req, reply) => {
    const parsed = tokenBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'expired' });
    const db = getDb();
    const hash = hashToken(parsed.data.token);
    const [row] = await db.select().from(authTokens).where(eq(authTokens.tokenHash, hash)).limit(1);
    if (!row || (row.purpose !== 'set_password' && row.purpose !== 'reset_password')) return reply.code(400).send({ error: 'expired' });
    if (row.usedAt !== null) return reply.code(400).send({ error: 'used' });
    if (row.expiresAt.getTime() <= clock.now()) return reply.code(400).send({ error: 'expired' });
    return reply.code(200).send({ ok: true, purpose: row.purpose === 'set_password' ? 'set' : 'reset' });
  });

  app.post('/api/auth/password/set', { preHandler: requireSameOrigin }, async (req, reply) => {
    const parsed = setBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'expired' });
    // Checked before the link is spent, so a too-short password costs the person nothing.
    const problem = passwordProblem(parsed.data.password);
    if (problem) return reply.code(422).send({ error: problem });
    const db = getDb();
    const now = clock.now();
    const claim = await claimToken(db, parsed.data.token, now, ['set_password', 'reset_password']);
    if (!claim.ok) return reply.code(400).send({ error: claim.code });
    // D-148, D-151: a self-serve address with no account: the spent link proves it, so make it now.
    await accountForSelfServe(db, claim.email, now);
    const user = await userByEmail(db, claim.email);
    if (!user) return reply.code(400).send({ error: 'expired' });
    const changed = await finishPasswordSet(db, user, parsed.data.password, now, null);
    await signIn(db, reply, user.id, now, true);
    if (changed) broadcast();
    return reply.code(200).send({ ok: true, landing: await landingFor(db, user, now) });
  });

  app.post(
    '/api/auth/password/checkout',
    { preHandler: requireSameOrigin, config: { rateLimit: { max: AUTH_REQUEST_MAX, timeWindow: AUTH_REQUEST_WINDOW } } },
    async (req, reply) => {
      const parsed = checkoutBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'expired' });
      const problem = passwordProblem(parsed.data.password);
      if (problem) return reply.code(422).send({ error: problem });
      const db = getDb();
      const now = clock.now();
      const user = await checkoutPasswordUser(db, parsed.data.checkout, now, invitesFrom);
      if (!user) return reply.code(400).send({ error: 'expired' });
      // First one wins: a second submit (a double click, a second tab) finds the password set.
      const hash = await hashPassword(parsed.data.password);
      const inserted = await db
        .insert(userPasswords)
        .values({ userId: user.id, hash, updatedAt: new Date(now) })
        .onConflictDoNothing()
        .returning({ userId: userPasswords.userId });
      if (!inserted.length) return reply.code(400).send({ error: 'used' });
      const changed = await finishPasswordSet(db, user, null, now, null);
      await signIn(db, reply, user.id, now, true);
      if (changed) broadcast();
      return reply.code(200).send({ ok: true, landing: await landingFor(db, user, now) });
    },
  );

  app.get('/api/auth/password', { preHandler: requireSession }, async (req) => {
    const viewer = viewerOrThrow(req);
    return { hasPassword: (await passwordHashOf(getDb(), viewer.user.id)) !== null };
  });

  app.post(
    '/api/auth/password/change',
    { preHandler: [requireSession, requireJsonSameOrigin], config: { rateLimit: { max: LOGIN_IP_MAX, timeWindow: LOGIN_IP_WINDOW } } },
    async (req, reply) => {
      const viewer = viewerOrThrow(req);
      const parsed = changeBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Expected a JSON body of { current?, password }.' });
      const problem = passwordProblem(parsed.data.password);
      if (problem) return reply.code(422).send({ error: problem });
      const db = getDb();
      const now = clock.now();
      const stored = await passwordHashOf(db, viewer.user.id);
      if (stored !== null) {
        // Changing a password needs the current one, under the same lockout as signing in.
        const until = await lockedUntil(db, viewer.user.email, now);
        if (until !== null) {
          reply.header('retry-after', String(Math.ceil((until - now) / 1000)));
          return reply.code(429).send({ error: LOCKED_OUT });
        }
        if (!parsed.data.current) return reply.code(400).send({ error: NEED_CURRENT });
        if (!(await verifyPassword(stored, parsed.data.current))) {
          await recordFailure(db, viewer.user.email, now);
          return reply.code(400).send({ error: WRONG_CURRENT });
        }
      }
      const changed = await finishPasswordSet(db, viewer.user, parsed.data.password, now, viewer.sessionId);
      if (changed) broadcast();
      return reply.code(200).send({ ok: true });
    },
  );
}
