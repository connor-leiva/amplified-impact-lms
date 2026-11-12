// Email and password sign-in (D-132), against Postgres and the real routes: sign in, the lockout,
// "Forgot password?", the set and reset links, a checkout's new account (the webhook's own
// `provisionOrder`), the welcome page's "Set Your Password" button, and the account page's change.
//
// Every assertion that a password is not stored or shown reads the database directly.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, settleEmails } from '../src/auth';
import { readOfferConfig } from '../src/billing/config';
import { provisionOrder, sendHeldInvites } from '../src/billing/provision';
import { accounts, authSessions, authTokens, loginFailures, orders, userPasswords, users } from '../src/db/schema';
import { outboxFor, resetOutbox } from '../src/email/transport';
import type { OutboxEntry } from '../src/email/transport';
import { LOCKED_OUT, NEED_CURRENT, WRONG_CURRENT, WRONG_PASSWORD } from '../src/routes/password';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const HOUR = 3_600_000;
const APP_URL = 'https://learn.example.com';
const JAMIE = 'jamie@ortizhomes.com'; // `u_jamie`, a learner in seed('live')
const CASEY = 'casey@amplifiedimpact.com'; // `st1`, the seed's Owner (staff)
const PASSWORD = 'correct horse battery staple';
const INVITES_FROM = Date.parse('2026-11-16T08:00:00-06:00');

let app: App;
let db: Database;
let savedAppUrl: string | undefined;

const at = (ms: number) => {
  process.env.FIXED_NOW = new Date(ms).toISOString();
};

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  db = await testDatabase();
});
afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

async function boot(snapshot: Db = seedForDatabase('live'), welcome?: string): Promise<void> {
  at(NOW);
  resetOutbox();
  await resetDatabase(snapshot);
  app = await build({
    logger: false,
    offer: {
      pages: welcome ? { welcome } : {},
      config: { ...readOfferConfig({}), invitesFrom: INVITES_FROM },
      stripe: null,
      verify: null,
    },
  });
}

beforeEach(async () => {
  await boot();
});
afterEach(async () => {
  await app?.close();
});

// --- helpers --------------------------------------------------------------------------------------

const post = (url: string, payload: unknown, cookie?: string) =>
  app.inject({ method: 'POST', url, payload: payload as Record<string, unknown>, headers: cookie ? { cookie } : {} });
const login = (email: string, password: string, remember?: boolean) =>
  post('/api/auth/login', remember === undefined ? { email, password } : { email, password, remember });

function cookieFrom(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '');
  const line = raw.split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`));
  expect(line, 'the response set no ai_sid cookie').toBeTruthy();
  return line!.split(';')[0]!;
}
const cookieLine = (setCookie: string | string[] | undefined): string =>
  (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`)) ?? '';

/** The one token in the last email of this template to this address, from its link. */
async function tokenFrom(to: string, template: 'set-password' | 'reset-password'): Promise<string> {
  await settleEmails();
  const mails = outboxFor({ to, template }) as OutboxEntry[];
  expect(mails.length, `${template} to ${to}`).toBeGreaterThan(0);
  const html = mails.at(-1)!.html;
  const m = /\/set-password\?token=([A-Za-z0-9_-]+)/.exec(html ?? '');
  expect(m, 'a /set-password?token= link').toBeTruthy();
  return m![1]!;
}

async function userId(email: string): Promise<string> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return row!.id;
}

/** A password for an existing user, the way the account page sets one. */
async function givePassword(email: string, password = PASSWORD): Promise<void> {
  const cookie = await app.signInAs(await userId(email));
  const res = await post('/api/auth/password/change', { password }, cookie);
  expect(res.statusCode, res.body).toBe(200);
}

// --- sign in --------------------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('signs in with the right password, a learner and the Owner alike', async () => {
    await givePassword(JAMIE);
    await givePassword(CASEY);
    for (const email of [JAMIE, CASEY.toUpperCase()]) {
      const res = await login(email, PASSWORD);
      expect(res.statusCode, email).toBe(200);
      const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieFrom(res.headers['set-cookie']) } });
      expect(me.statusCode, email).toBe(200);
    }
  });

  it('stamps the user\'s Last Active (D-145)', async () => {
    await givePassword(JAMIE);
    const id = await userId(JAMIE);
    await db.update(users).set({ last: NOW - 3 * 86_400_000 }).where(eq(users.id, id));
    expect((await login(JAMIE, PASSWORD)).statusCode).toBe(200);
    expect((await db.select({ last: users.last }).from(users).where(eq(users.id, id)))[0]!.last).toBe(NOW);
  });

  it('gives one answer for a wrong password, an unknown address and an account with no password', async () => {
    await givePassword(JAMIE);
    const wrong = await login(JAMIE, 'not the password');
    const unknown = await login('nobody@example.com', 'not the password');
    const noPassword = await login(CASEY, 'not the password');
    for (const res of [wrong, unknown, noPassword]) {
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: WRONG_PASSWORD });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('keeps a "Keep me signed in" session 30 days, and makes any other a browser-session cookie and 12 hours', async () => {
    await givePassword(JAMIE);
    const kept = await login(JAMIE, PASSWORD, true);
    expect(cookieLine(kept.headers['set-cookie'])).toMatch(/Max-Age=2592000/);
    expect(cookieLine(kept.headers['set-cookie'])).toMatch(/HttpOnly/);
    const short = await login(JAMIE, PASSWORD, false);
    expect(cookieLine(short.headers['set-cookie'])).not.toMatch(/Max-Age|Expires/);
    expect(cookieLine(short.headers['set-cookie'])).toMatch(/HttpOnly/);
    const rows = await db.select().from(authSessions).where(eq(authSessions.userId, 'u_jamie'));
    const byRemember = Object.fromEntries(rows.filter((r) => r.expiresAt.getTime() > NOW).map((r) => [String(r.remember), r.expiresAt.getTime() - NOW]));
    expect(byRemember.true).toBe(30 * 24 * HOUR);
    expect(byRemember.false).toBe(12 * HOUR);
    // The short one ends at 12 hours.
    at(NOW + 13 * HOUR);
    const later = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieFrom(short.headers['set-cookie']) } });
    expect(later.statusCode).toBe(401);
  });

  it('stores an argon2id hash and never the password', async () => {
    await givePassword(JAMIE);
    const [row] = await db.select().from(userPasswords).where(eq(userPasswords.userId, 'u_jamie'));
    expect(row!.hash).toMatch(/^\$argon2id\$/);
    expect(row!.hash).not.toContain(PASSWORD);
    const [user] = await db.select().from(users).where(eq(users.id, 'u_jamie'));
    expect(JSON.stringify(user)).not.toMatch(/argon2|correct horse/);
  });
});

describe('the lockout', () => {
  it('locks an address after 5 failures for 15 minutes, the right password included, then lets it in', async () => {
    await givePassword(JAMIE);
    for (let i = 0; i < 5; i++) expect((await login(JAMIE, `wrong ${i}`)).statusCode).toBe(400);
    const locked = await login(JAMIE, PASSWORD);
    expect(locked.statusCode).toBe(429);
    expect(locked.json()).toEqual({ error: LOCKED_OUT });
    expect(Number(locked.headers['retry-after'])).toBe(15 * 60);
    at(NOW + 16 * 60_000);
    expect((await login(JAMIE, PASSWORD)).statusCode).toBe(200);
    // A success clears the count.
    expect(await db.select().from(loginFailures)).toEqual([]);
  });

  it('locks an unknown address exactly like a known one, and stores no address', async () => {
    for (let i = 0; i < 5; i++) await login('nobody@example.com', `wrong ${i}`);
    const res = await login('nobody@example.com', 'anything');
    expect([res.statusCode, res.json()]).toEqual([429, { error: LOCKED_OUT }]);
    const rows = await db.select().from(loginFailures);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain('nobody');
  });

  it('starts the count again once the 15-minute window has passed', async () => {
    await givePassword(JAMIE);
    for (let i = 0; i < 4; i++) await login(JAMIE, `wrong ${i}`);
    at(NOW + 16 * 60_000);
    for (let i = 0; i < 4; i++) await login(JAMIE, `wrong again ${i}`);
    expect((await login(JAMIE, PASSWORD)).statusCode).toBe(200);
  });
});

// --- forgot, set and reset ------------------------------------------------------------------------

describe('Forgot password', () => {
  it('answers the same for every address, and emails only one that has an account', async () => {
    await givePassword(JAMIE);
    const known = await post('/api/auth/password/forgot', { email: JAMIE });
    const unknown = await post('/api/auth/password/forgot', { email: 'nobody@example.com' });
    expect([known.statusCode, known.json()]).toEqual([200, { ok: true }]);
    expect([unknown.statusCode, unknown.json()]).toEqual([200, { ok: true }]);
    await settleEmails();
    expect(outboxFor({ to: 'nobody@example.com' })).toEqual([]);
    expect(outboxFor({ to: JAMIE, template: 'reset-password' })).toHaveLength(1);
  });

  it('sends a set-password link (72 hours) to an account with no password, and a reset link (1 hour) to one with', async () => {
    await post('/api/auth/password/forgot', { email: CASEY });
    await givePassword(JAMIE);
    await post('/api/auth/password/forgot', { email: JAMIE });
    await settleEmails();
    const rows = await db.select().from(authTokens);
    const byEmail = Object.fromEntries(rows.map((r) => [r.email, [r.purpose, r.expiresAt.getTime() - NOW]]));
    expect(byEmail[CASEY]).toEqual(['set_password', 72 * HOUR]);
    expect(byEmail[JAMIE]).toEqual(['reset_password', HOUR]);
    expect(outboxFor({ to: CASEY, template: 'set-password' })[0]!.subject).toBe('Set your Amplified Impact password');
    expect(outboxFor({ to: JAMIE, template: 'reset-password' })[0]!.subject).toBe('Reset your Amplified Impact password');
  });

  it('resets: the link signs in with the new password, ends every other session, and works once', async () => {
    await givePassword(JAMIE);
    const elsewhere = cookieFrom((await login(JAMIE, PASSWORD, true)).headers['set-cookie']);
    await post('/api/auth/password/forgot', { email: JAMIE });
    const token = await tokenFrom(JAMIE, 'reset-password');

    const peek = await post('/api/auth/password/token', { token });
    expect(peek.json()).toEqual({ ok: true, purpose: 'reset' });

    const res = await post('/api/auth/password/set', { token, password: 'a brand new password' });
    expect(res.statusCode, res.body).toBe(200);
    const fresh = cookieFrom(res.headers['set-cookie']);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: fresh } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: elsewhere } })).statusCode).toBe(401);

    expect((await login(JAMIE, PASSWORD)).statusCode).toBe(400);
    expect((await login(JAMIE, 'a brand new password')).statusCode).toBe(200);
    const again = await post('/api/auth/password/set', { token, password: 'a third password here' });
    expect([again.statusCode, again.json()]).toEqual([400, { error: 'used' }]);
  });

  it('expires a reset link after 1 hour and a set-password link after 72', async () => {
    await givePassword(JAMIE);
    await post('/api/auth/password/forgot', { email: JAMIE });
    const reset = await tokenFrom(JAMIE, 'reset-password');
    await post('/api/auth/password/forgot', { email: CASEY });
    const set = await tokenFrom(CASEY, 'set-password');
    at(NOW + HOUR + 1000);
    expect((await post('/api/auth/password/set', { token: reset, password: 'a brand new password' })).json()).toEqual({ error: 'expired' });
    at(NOW + 71 * HOUR);
    expect((await post('/api/auth/password/token', { token: set })).json()).toEqual({ ok: true, purpose: 'set' });
    at(NOW + 73 * HOUR);
    expect((await post('/api/auth/password/set', { token: set, password: 'a brand new password' })).json()).toEqual({ error: 'expired' });
  });

  it('refuses a short password before spending the link', async () => {
    await post('/api/auth/password/forgot', { email: CASEY });
    const token = await tokenFrom(CASEY, 'set-password');
    const short = await post('/api/auth/password/set', { token, password: 'short' });
    expect([short.statusCode, short.json()]).toEqual([422, { error: 'Use at least 10 characters.' }]);
    expect((await post('/api/auth/password/set', { token, password: 'long enough now' })).statusCode).toBe(200);
  });

  it('keeps the link kinds apart: a password link does not sign in at /verify, nor a sign-in link set a password', async () => {
    await post('/api/auth/password/forgot', { email: CASEY });
    const set = await tokenFrom(CASEY, 'set-password');
    const verify = await post('/api/auth/verify', { token: set });
    expect([verify.statusCode, verify.json()]).toEqual([400, { error: 'expired' }]);
    // Not spent by the wrong route.
    expect((await post('/api/auth/password/set', { token: set, password: 'long enough now' })).statusCode).toBe(200);

    await post('/api/auth/request', { email: JAMIE });
    await settleEmails();
    const signIn = /\/sign-in\?token=([A-Za-z0-9_-]+)/.exec(outboxFor({ to: JAMIE, template: 'sign-in' }).at(-1)!.html ?? '')![1]!;
    expect((await post('/api/auth/password/set', { token: signIn, password: 'long enough now' })).json()).toEqual({ error: 'expired' });
    expect((await post('/api/auth/verify', { token: signIn })).statusCode).toBe(200);
  });
});

// --- a checkout's new account ---------------------------------------------------------------------

const SESSION = 'cs_test_a1B2c3D4e5F6g7H8i9J0';

/** A paid Amplified Insiders order, as the webhook leaves it, then the webhook's own provisioning. */
async function paidOrder(email: string, paidAt: number, session = SESSION): Promise<void> {
  await db.insert(orders).values({
    id: `o_${session.slice(-6)}`,
    plan: 'membership',
    option: 'year_upfront',
    origin: 'payment_link',
    status: 'paid',
    name: 'Pat Buyer',
    email,
    stripeSessionId: session,
    paidAt,
    createdAt: paidAt,
  });
  const log = { info: () => {}, warn: () => {}, error: () => {} };
  const out = await provisionOrder(`o_${session.slice(-6)}`, { log, now: paidAt, invitesFrom: INVITES_FROM });
  expect(out.ok, JSON.stringify(out)).toBe(true);
}

describe('a checkout’s new account', () => {
  it('gets "Set your password" in place of the invite, held until INVITES_FROM, and the link makes it active', async () => {
    const before = INVITES_FROM - 2 * 24 * HOUR;
    at(before);
    await paidOrder('pat@example.com', before);
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
    expect(await sendHeldInvites({ log: { info: () => {}, warn: () => {}, error: () => {} }, now: INVITES_FROM, invitesFrom: INVITES_FROM })).toBe(1);
    expect(outboxFor({ to: 'pat@example.com', template: 'team-invite' })).toEqual([]);
    const token = await tokenFrom('pat@example.com', 'set-password');
    const [row] = await db.select().from(authTokens).where(eq(authTokens.email, 'pat@example.com'));
    expect([row!.purpose, row!.expiresAt.getTime() - INVITES_FROM]).toEqual(['set_password', 72 * HOUR]);

    at(INVITES_FROM + HOUR);
    const res = await post('/api/auth/password/set', { token, password: 'pats own password' });
    expect(res.statusCode, res.body).toBe(200);
    const [pat] = await db.select().from(users).where(eq(users.email, 'pat@example.com'));
    expect(pat!.status).toBe('active');
    expect((await login('pat@example.com', 'pats own password')).statusCode).toBe(200);
  });

  it('can ask for a new set-password link with Forgot password', async () => {
    at(INVITES_FROM + HOUR);
    await paidOrder('pat@example.com', INVITES_FROM + HOUR);
    await post('/api/auth/password/forgot', { email: 'pat@example.com' });
    await settleEmails();
    expect(outboxFor({ to: 'pat@example.com', template: 'set-password' })).toHaveLength(2);
  });
});

describe('the welcome page’s Set Your Password button', () => {
  const WELCOME = '<!doctype html><body data-state="%%welcome-state%%"><a class="button primary" href="%%set-password%%">Set Your Password</a></body>';
  const welcome = (session = SESSION) => app.inject({ method: 'GET', url: `/offer/welcome?session_id=${session}` });
  const hrefOf = (html: string) => /href="([^"]*)"/.exec(html)![1];

  beforeEach(async () => {
    await app.close();
    await boot(seedForDatabase('live'), WELCOME);
  });

  it('links a brand-new account to /set-password for its own session, and sets the password once', async () => {
    const paid = INVITES_FROM + HOUR;
    at(paid);
    await paidOrder('pat@example.com', paid);
    expect(hrefOf((await welcome()).body)).toBe(`${APP_URL}/set-password?checkout=${SESSION}`);

    const res = await post('/api/auth/password/checkout', { checkout: SESSION, password: 'pats own password' });
    expect(res.statusCode, res.body).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieFrom(res.headers['set-cookie']) } })).statusCode).toBe(200);
    expect((await post('/api/auth/password/checkout', { checkout: SESSION, password: 'someone elses try' })).statusCode).toBe(400);
    expect(hrefOf((await welcome()).body)).toBe('');
    expect((await login('pat@example.com', 'pats own password')).statusCode).toBe(200);
  });

  it('offers nothing during the invite hold, after 72 hours, for an unknown session, or for an account already in use', async () => {
    // The hold.
    const early = INVITES_FROM - HOUR;
    at(early);
    await paidOrder('early@example.com', early, 'cs_test_holdholdhold01');
    expect(hrefOf((await welcome('cs_test_holdholdhold01')).body)).toBe('');
    expect((await post('/api/auth/password/checkout', { checkout: 'cs_test_holdholdhold01', password: 'long enough now' })).statusCode).toBe(400);

    // 72 hours on.
    const paid = INVITES_FROM + HOUR;
    at(paid);
    await paidOrder('late@example.com', paid, 'cs_test_latelatelate01');
    at(paid + 73 * HOUR);
    expect(hrefOf((await welcome('cs_test_latelatelate01')).body)).toBe('');

    // A session with no order.
    at(paid);
    expect(hrefOf((await welcome('cs_test_nosuchsession1')).body)).toBe('');

    // An existing learner's address bought with: never from the welcome page.
    await paidOrder(JAMIE, paid, 'cs_test_existingjamie1');
    expect(hrefOf((await welcome('cs_test_existingjamie1')).body)).toBe('');
    expect((await post('/api/auth/password/checkout', { checkout: 'cs_test_existingjamie1', password: 'an attackers try' })).statusCode).toBe(400);
    expect(await db.select().from(userPasswords)).toEqual([]);
  });

  it('offers nothing once the new account has signed in another way', async () => {
    const paid = INVITES_FROM + HOUR;
    at(paid);
    await paidOrder('pat@example.com', paid);
    const [acct] = await db.select().from(accounts);
    await app.signInAs(acct!.ownerUserId);
    expect(hrefOf((await welcome()).body)).toBe('');
  });
});

// --- the account page -----------------------------------------------------------------------------

describe('the account page', () => {
  it('lets a signed-in user with no password set one, then needs the current one to change it', async () => {
    const cookie = await app.signInAs('u_jamie');
    const other = await app.signInAs('u_jamie');
    expect((await app.inject({ method: 'GET', url: '/api/auth/password', headers: { cookie } })).json()).toEqual({ hasPassword: false });

    expect((await post('/api/auth/password/change', { password: PASSWORD }, cookie)).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/auth/password', headers: { cookie } })).json()).toEqual({ hasPassword: true });
    // The session that changed it stays; the other one ends.
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: other } })).statusCode).toBe(401);

    expect((await post('/api/auth/password/change', { password: 'another password' }, cookie)).json()).toEqual({ error: NEED_CURRENT });
    expect((await post('/api/auth/password/change', { current: 'not it at all', password: 'another password' }, cookie)).json()).toEqual({ error: WRONG_CURRENT });
    expect((await post('/api/auth/password/change', { current: PASSWORD, password: 'another password' }, cookie)).statusCode).toBe(200);
    expect((await login(JAMIE, 'another password')).statusCode).toBe(200);
  });

  it('is behind the session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auth/password' })).statusCode).toBe(401);
    expect((await post('/api/auth/password/change', { password: PASSWORD })).statusCode).toBe(401);
  });
});
