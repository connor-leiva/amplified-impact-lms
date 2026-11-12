// Phase 07 § 7.5 — magic-link authentication, end to end through `app.inject`.
//
// Four of the assertions here are the ones worth naming up front, because each guards a failure
// that would ship silently:
//
//   1. "a known address and an unknown one are indistinguishable". § 7.5's `/api/auth/request`
//      "always returns 200 {ok:true}, so it does not reveal whether an account exists", and
//      `apps/web/src/routes/auth/SignIn.test.tsx` asserts the UI cannot tell them apart either.
//      The test below compares the whole response — status, body and the headers that are not
//      per-request — rather than only the status, because a leak would most naturally arrive as an
//      extra body field (`{ ok: true, sent: true }`) added by somebody being helpful.
//   2. "the database never holds the token". A `select *` over `auth_tokens` must not contain the
//      string that was emailed. Storing the raw token would pass every other test in this file.
//   3. "a second verify fails". § 7.5: single use. The guard is `used_at`, and a read-then-write
//      would let two requests through; the test spends one token twice.
//   4. "an unsigned cookie is not a session". The whole integrity of `ai_sid` is the signature, so
//      the test puts a REAL, LIVE session id in the cookie jar without one and expects 401.
//
// The clock is pinned with `FIXED_NOW` throughout, as Gate 7's suites do: `clock.now()` reads the
// variable on every call (never at import), so this makes every expiry in the file arithmetic
// rather than a race with the wall clock.

import { describe, it, expect, afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
// `../src/app` before `./helpers`, exactly as Gate 7's snippet imports them. It works because
// `getDb()` resolves `DATABASE_URL` on the first QUERY, so the harness can still redirect the
// process after every import has been evaluated. See `db/client.ts`'s header.
import { build } from '../src/app';
import type { App } from '../src/app';
import {
  INVITE_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SIGN_IN_TTL_MS,
  SessionSecretError,
  hashToken,
  mintToken,
  readSessionSecret,
  resetEphemeralSecret,
  sameHash,
} from '../src/auth';
import { AUTH_REQUEST_IP_MAX } from '../src/routes/auth';
import { authSessions, authTokens, users } from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const JAMIE = 'jamie@ortizhomes.com';
const ALEX = 'alex@northlinerealty.com';
const CASEY = 'casey@amplifiedimpact.com';
const NOBODY = 'nobody@example.com';

let app: App;
let savedAppUrl: string | undefined;

/** Every email the transport collected for one template, in order. */
const sent = (template: string) => outbox().filter((m) => m.template === template);

/** The token out of the one `sign-in` email, which is where the only copy of it exists. */
function emailedToken(): string {
  const messages = sent('sign-in');
  expect(messages).toHaveLength(1);
  const token = messages[0]!.data.token;
  expect(typeof token).toBe('string');
  return token as string;
}

const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url, payload: payload as object, headers });

/** The `name=value` pair out of a `set-cookie` response header, ready to send back. */
function cookieFrom(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '');
  const line = raw.split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`));
  expect(line, 'the response set no ai_sid cookie').toBeTruthy();
  return line!.split(';')[0]!;
}

beforeAll(async () => {
  // `templates/links.ts` refuses to render a link against a missing APP_URL — by design, so a
  // misconfigured deploy logs a named error instead of mailing a dead button. Every sign-in email
  // in this file therefore needs one.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await testDatabase();
});

afterAll(async () => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

/**
 * A FRESH app per test, which is also how Gate 7's oracle snippet does it (`const app = await
 * build()` inside each `it`).
 *
 * Not an optimisation to share one: `@fastify/rate-limit`'s default store is an in-memory LRU
 * owned by the plugin instance, so one app across the file would carry § 7.5's "5 per hour" budget
 * from test to test — the first six requests in the file would spend it and every later test would
 * read 429. Building is cheap, because `build()` opens no database connection (`db/client.ts`).
 */
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
});

// ------------------------------------------------------------------------------------------------
// The primitives
// ------------------------------------------------------------------------------------------------

describe('§ 7.5 · token primitives @g7', () => {
  it('mints a url-safe token with no padding to be mangled', () => {
    const token = mintToken();
    // 32 bytes of base64url. No `+`, `/` or `=`: it travels as `?token=…` and as `/invite/:token`,
    // and a mail client that re-wraps a link or a proxy that re-encodes a query string must not be
    // able to change it.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mintToken()).not.toBe(token);
  });

  it('hashes with sha256 and compares in constant time', () => {
    const token = 'abc';
    // The published sha256 of "abc" — a fixed vector rather than a round trip, so the test fails if
    // the algorithm or the encoding changes rather than agreeing with itself.
    expect(hashToken(token)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sameHash(hashToken(token), hashToken('abc'))).toBe(true);
    expect(sameHash(hashToken(token), hashToken('abd'))).toBe(false);
    // Different lengths must answer false rather than throwing: `timingSafeEqual` does throw, and a
    // 500 on `/api/auth/verify` for a truncated token would be a denial of service with a stack
    // trace in the log.
    expect(sameHash('short', hashToken(token))).toBe(false);
  });

  it('uses § 7.5s two lifetimes: 15 minutes to sign in, 7 days to accept an invite', () => {
    expect(SIGN_IN_TTL_MS).toBe(15 * 60 * 1000);
    expect(INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('§ 7.5 · SESSION_SECRET has no safe default @g7', () => {
  it('refuses to resolve one in production', () => {
    // The failure this guards: a fallback like `process.env.SESSION_SECRET ?? 'dev-secret'` boots
    // healthy and makes every session cookie in production forgeable by anyone who has read the
    // repository.
    expect(() => readSessionSecret({ NODE_ENV: 'production' })).toThrow(SessionSecretError);
    expect(() => readSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: '   ' })).toThrow(/not set/);
    expect(readSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40) })).toBe('x'.repeat(40));
  });

  it('generates a stable per-process key outside production', () => {
    resetEphemeralSecret();
    const first = readSessionSecret({ NODE_ENV: 'test' });
    expect(first).toHaveLength(64);
    // Stable within the process, or a cookie signed by one request would fail on the next.
    expect(readSessionSecret({ NODE_ENV: 'development' })).toBe(first);
    resetEphemeralSecret();
    expect(readSessionSecret({ NODE_ENV: 'test' })).not.toBe(first);
  });
});

// ------------------------------------------------------------------------------------------------
// POST /api/auth/request
// ------------------------------------------------------------------------------------------------

describe('POST /api/auth/request @g7', () => {
  it('emails one sign-in link to an account that exists', async () => {
    const res = await post('/api/auth/request', { email: JAMIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // The handler answers before it does any work, so the outbox is read through the route that
    // settles the queue first. See `auth/mailer.ts`.
    const box = await app.inject({ method: 'GET', url: '/api/test/outbox' });
    expect(box.statusCode).toBe(200);
    const messages = (box.json() as { messages: { template: string; to: string }[] }).messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ template: 'sign-in', to: JAMIE });
  });

  it('answers identically for an address with no account, and sends nothing', async () => {
    const known = await post('/api/auth/request', { email: JAMIE });
    const unknown = await post('/api/auth/request', { email: NOBODY });

    // Status and body first, which is what § 7.5 states.
    expect(unknown.statusCode).toBe(known.statusCode);
    expect(unknown.json()).toEqual(known.json());
    expect(unknown.json()).toEqual({ ok: true });

    // Then everything else a client can see. `date` moves on its own and the rate-limit headers
    // count down, so they are dropped; a leak would arrive as an extra body field or a header
    // somebody added, and both of those survive this filter.
    const visible = (headers: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(headers).filter(([k]) => !['date', 'x-ratelimit-remaining', 'x-ratelimit-reset'].includes(k)),
      );
    expect(visible(unknown.headers)).toEqual(visible(known.headers));

    await app.inject({ method: 'GET', url: '/api/test/outbox' });
    expect(sent('sign-in').map((m) => m.to)).toEqual([JAMIE]);
  });

  it('stores sha256(token) and never the token', async () => {
    await post('/api/auth/request', { email: JAMIE });
    await app.inject({ method: 'GET', url: '/api/test/outbox' });
    const token = emailedToken();

    const db = await testDatabase();
    const rows = await db.select().from(authTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(hashToken(token));
    expect(rows[0]).toMatchObject({ email: JAMIE, purpose: 'sign_in', usedAt: null });
    // The row, serialised whole, must not contain the credential anywhere — not in a column
    // somebody added "for debugging", not in the hash.
    expect(JSON.stringify(rows[0])).not.toContain(token);
    // § 7.5: valid for 15 minutes, from the pinned instant.
    expect(rows[0]!.expiresAt.getTime()).toBe(NOW + SIGN_IN_TTL_MS);
  });

  it('writes no token row for an address with no account', async () => {
    await post('/api/auth/request', { email: NOBODY });
    await app.inject({ method: 'GET', url: '/api/test/outbox' });
    const db = await testDatabase();
    expect(await db.select().from(authTokens)).toHaveLength(0);
  });

  it('refuses a body that is not { email }', async () => {
    // A malformed body is a client bug rather than an account probe, so it is allowed to look
    // different: nothing about which accounts exist is observable from it.
    expect((await post('/api/auth/request', {})).statusCode).toBe(400);
    expect((await post('/api/auth/request', { email: 42 })).statusCode).toBe(400);
    expect((await post('/api/auth/request', { email: JAMIE, admin: true })).statusCode).toBe(400);
  });

  it('rate-limits 5 per hour per email, across different addresses from one host', async () => {
    // § 7.5: "Rate limit: 5 per hour per email and IP." This is the EMAIL axis, so the IP moves on
    // every call — otherwise the per-IP limiter would be the thing that answered 429 and the test
    // would pass with the email limiter deleted.
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/request',
        payload: { email: JAMIE },
        remoteAddress: `10.0.0.${i + 1}`,
      });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);

    // A different mailbox from the same hosts is still fine: the budget is per address.
    const other = await app.inject({
      method: 'POST',
      url: '/api/auth/request',
      payload: { email: ALEX },
      remoteAddress: '10.0.0.1',
    });
    expect(other.statusCode).toBe(200);
  });

  it('rate-limits 30 per hour per IP, across different addresses', async () => {
    // The IP axis: one host working through a domain's mailboxes. Without it a single machine
    // could enumerate every address at a brokerage. 30, not 5, since Nov 12, 2026: a training room
    // on one office address asks for a link or two each (`AUTH_REQUEST_IP_MAX`).
    expect(AUTH_REQUEST_IP_MAX).toBe(30);
    const codes: number[] = [];
    for (let i = 0; i < AUTH_REQUEST_IP_MAX + 1; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/request',
        payload: { email: `someone${i}@northlinerealty.com` },
        remoteAddress: '203.0.113.7',
      });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, AUTH_REQUEST_IP_MAX).every((c) => c === 200)).toBe(true);
    expect(codes[AUTH_REQUEST_IP_MAX]).toBe(429);
  });
});

// ------------------------------------------------------------------------------------------------
// POST /api/auth/verify
// ------------------------------------------------------------------------------------------------

/** Request a link for `email` and hand back the token that was emailed. */
async function requestLink(email: string): Promise<string> {
  await post('/api/auth/request', { email });
  await app.inject({ method: 'GET', url: '/api/test/outbox' });
  return emailedToken();
}

describe('POST /api/auth/verify @g7', () => {
  it('signs the viewer in and sets § 7.5s four cookie attributes', async () => {
    const token = await requestLink(JAMIE);
    const res = await post('/api/auth/verify', { token });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, team: null, landing: '/' });

    const setCookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'].join('\n')
      : String(res.headers['set-cookie']);
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    // `Secure` is `'auto'` outside production, and inject speaks http — so it is absent here by
    // design. `test/routes.test.ts` pins the production side.
    expect(setCookie).not.toContain('Secure');

    // The cookie works, which is the only thing that proves the signature round-trips.
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieFrom(res.headers['set-cookie']) } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' } });
  });

  it('creates a 30-day session row', async () => {
    const token = await requestLink(JAMIE);
    await post('/api/auth/verify', { token });

    const db = await testDatabase();
    const rows = await db.select().from(authSessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'u_jamie', impersonating: null });
    expect(rows[0]!.expiresAt.getTime()).toBe(NOW + SESSION_TTL_MS);
  });

  it('marks the token used, and a second verify fails', async () => {
    const token = await requestLink(JAMIE);

    expect((await post('/api/auth/verify', { token })).statusCode).toBe(200);

    const db = await testDatabase();
    const [row] = await db.select().from(authTokens);
    expect(row!.usedAt).not.toBeNull();

    const again = await post('/api/auth/verify', { token });
    expect(again.statusCode).toBe(400);
    // `'used'` is a machine code: `SignIn.tsx` compares `body.error === 'used'` and renders § 7.5's
    // "That link was already used. Request a new one." itself.
    expect(again.json()).toEqual({ error: 'used' });
    expect(again.headers['set-cookie']).toBeUndefined();
  });

  it('two requests racing the same token: exactly one wins', async () => {
    // The guard is `UPDATE … WHERE used_at IS NULL … RETURNING`. A read-then-write would let both
    // through, which is what a magic link forwarded into a shared team inbox produces on its own.
    const token = await requestLink(JAMIE);
    const [a, b] = await Promise.all([post('/api/auth/verify', { token }), post('/api/auth/verify', { token })]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 400]);
  });

  it('refuses an expired token', async () => {
    const token = await requestLink(JAMIE);
    // Sixteen minutes later: one minute past § 7.5's fifteen.
    process.env.FIXED_NOW = new Date(NOW + SIGN_IN_TTL_MS + 60_000).toISOString();

    const res = await post('/api/auth/verify', { token });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'expired' });
  });

  it('refuses a token that was never issued, and says nothing more', async () => {
    for (const body of [{ token: mintToken() }, { token: '' }, { token: 'x' }]) {
      const res = await post('/api/auth/verify', body);
      expect(res.statusCode).toBe(400);
      // Deliberately the same answer as an expired one: distinguishing them tells a caller which
      // token hashes exist.
      expect(res.json()).toEqual({ error: 'expired' });
    }
    expect((await post('/api/auth/verify', {})).json()).toEqual({ error: 'expired' });
  });

  it('refuses a valid token whose account has since been removed', async () => {
    const token = await requestLink(JAMIE);
    const db = await testDatabase();
    await db.delete(users).where(eq(users.id, 'u_jamie'));

    const res = await post('/api/auth/verify', { token });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'expired' });
  });

  it('an invite token activates the seat and names the team', async () => {
    // § 7.5: "`/invite/:token` verifies the token, sets `status: 'active'` and `joined`, and signs
    // the user in." The invite row itself comes from `inviteMember`, which `routes.test.ts`
    // exercises; here the token is planted so the verify half can be tested on its own.
    const db = await testDatabase();
    await db.insert(users).values({
      id: 'u_new',
      email: 'new@northlinerealty.com',
      name: 'New Seat',
      kind: 'learner',
      tier: 'team',
      role: 'Sales Agent',
      teamId: 'northline',
      cohortId: 'dec26',
      joined: null,
      last: null,
      status: 'invited',
    });
    const token = mintToken();
    await db.insert(authTokens).values({
      tokenHash: hashToken(token),
      email: 'new@northlinerealty.com',
      purpose: 'invite',
      expiresAt: new Date(NOW + INVITE_TTL_MS),
    });

    const res = await post('/api/auth/verify', { token });
    expect(res.statusCode).toBe(200);
    // `AcceptInvite.tsx` reads `body.team` for "Joining {Team or Amplified Impact}…".
    expect(res.json()).toEqual({ ok: true, team: 'Northline Realty Team', landing: '/' });

    const after = await loadDb();
    const seat = after.users.find((u) => u.id === 'u_new');
    expect(seat).toMatchObject({ status: 'active', joined: NOW });
  });

  it('a staff invite signs in with no team', async () => {
    const db = await testDatabase();
    const token = mintToken();
    await db.insert(authTokens).values({
      tokenHash: hashToken(token),
      email: CASEY,
      purpose: 'invite',
      expiresAt: new Date(NOW + INVITE_TTL_MS),
    });

    const res = await post('/api/auth/verify', { token });
    expect(res.statusCode).toBe(200);
    // `null`, which `AcceptInvite.tsx` renders as the `Amplified Impact` fallback.
    expect(res.json()).toEqual({ ok: true, team: null, landing: '/' });

    const me = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieFrom(res.headers['set-cookie']) },
    });
    expect(me.json()).toMatchObject({ viewer: { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' } });
  });
});

// ------------------------------------------------------------------------------------------------
// The cookie itself
// ------------------------------------------------------------------------------------------------

describe('the ai_sid cookie @g7', () => {
  it('is useless without its signature', async () => {
    const token = await requestLink(JAMIE);
    const verified = await post('/api/auth/verify', { token });
    const db = await testDatabase();
    const [session] = await db.select().from(authSessions);

    // A LIVE session id, in the right cookie, with no signature. If the cookie were not signed
    // this would be a complete authentication bypass: `auth_sessions.id` is the only secret in it.
    const forged = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${SESSION_COOKIE}=${session!.id}` },
    });
    expect(forged.statusCode).toBe(401);
    expect(forged.json()).toEqual({ error: 'Not signed in' });

    // The signed one, for contrast: same id, same route.
    const real = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieFrom(verified.headers['set-cookie']) },
    });
    expect(real.statusCode).toBe(200);
  });

  it('a session row that has expired is not a session', async () => {
    const cookie = await app.signInAs('u_jamie');
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(200);

    process.env.FIXED_NOW = new Date(NOW + SESSION_TTL_MS + 1000).toISOString();
    const res = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(res.statusCode).toBe(401);
    // The dead cookie is cleared, so the browser stops re-sending it for the next 30 days.
    expect(String(res.headers['set-cookie'])).toContain(`${SESSION_COOKIE}=`);
  });

  it('rolls a session that has used up a day of its window, and leaves a fresh one alone', async () => {
    const cookie = await app.signInAs('u_jamie');
    const db = await testDatabase();
    const expiryNow = async () => (await db.select().from(authSessions))[0]!.expiresAt.getTime();

    expect(await expiryNow()).toBe(NOW + SESSION_TTL_MS);

    // An hour later: inside `ROLL_AFTER_MS`, so nothing is rewritten. One UPDATE per request on
    // the hottest row in the database is what this throttle exists to avoid.
    process.env.FIXED_NOW = new Date(NOW + 60 * 60 * 1000).toISOString();
    await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(await expiryNow()).toBe(NOW + SESSION_TTL_MS);

    // Two days later: rolled, so a viewer in daily use is never signed out.
    const later = NOW + 2 * 24 * 60 * 60 * 1000;
    process.env.FIXED_NOW = new Date(later).toISOString();
    await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(await expiryNow()).toBe(later + SESSION_TTL_MS);
  });
});

// ------------------------------------------------------------------------------------------------
// Last Active (D-145)
// ------------------------------------------------------------------------------------------------

describe('Last Active (D-145)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const lastOf = async (id: string): Promise<number | null> =>
    (await (await testDatabase()).select({ last: users.last }).from(users).where(eq(users.id, id)))[0]!.last;
  const setLast = async (id: string, last: number | null): Promise<void> => {
    await (await testDatabase()).update(users).set({ last }).where(eq(users.id, id));
  };

  it('stamps a sign-in from an emailed link', async () => {
    await setLast('u_jamie', NOW - 3 * DAY);
    const token = await requestLink(JAMIE);
    expect((await post('/api/auth/verify', { token })).statusCode).toBe(200);
    expect(await lastOf('u_jamie')).toBe(NOW);
  });

  it('stamps a session in daily use when it rolls, once a day, and not on the requests between', async () => {
    await setLast('u_jamie', NOW - 3 * DAY);
    // `signInAs` mints a session the way the test-only route does for the http parity run: it is
    // not a sign-in by the person, so it stamps nothing, and the run's seeded values stay put.
    const cookie = await app.signInAs('u_jamie');
    expect(await lastOf('u_jamie')).toBe(NOW - 3 * DAY);

    // An hour later: the session doesn't roll, so nothing is written.
    process.env.FIXED_NOW = new Date(NOW + 60 * 60 * 1000).toISOString();
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(200);
    expect(await lastOf('u_jamie')).toBe(NOW - 3 * DAY);

    // Two days later: it rolls, and the day counts.
    const later = NOW + 2 * DAY;
    process.env.FIXED_NOW = new Date(later).toISOString();
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(200);
    expect(await lastOf('u_jamie')).toBe(later);
  });

  it('stamps a learner who was never active, and never moves the stamp backwards', async () => {
    await setLast('u_jamie', null);
    expect((await post('/api/auth/verify', { token: await requestLink(JAMIE) })).statusCode).toBe(200);
    expect(await lastOf('u_jamie')).toBe(NOW);

    await setLast('u_jamie', NOW + DAY);
    resetOutbox();
    app = await build({ logger: false });
    expect((await post('/api/auth/verify', { token: await requestLink(JAMIE) })).statusCode).toBe(200);
    expect(await lastOf('u_jamie')).toBe(NOW + DAY);
  });

  it('writes only the signed-in user\'s row', async () => {
    const db = await testDatabase();
    const before = await db.select({ id: users.id, last: users.last }).from(users);
    expect((await post('/api/auth/verify', { token: await requestLink(JAMIE) })).statusCode).toBe(200);
    const after = await db.select({ id: users.id, last: users.last }).from(users);
    const changed = after.filter((u) => before.find((b) => b.id === u.id)!.last !== u.last).map((u) => u.id);
    expect(changed).toEqual(before.find((b) => b.id === 'u_jamie')!.last === NOW ? [] : ['u_jamie']);
  });

  it('shows in the Team Owner\'s snapshot, which the Team Hub\'s Last Active column reads', async () => {
    // Lena, a Sales Agent on Alex's Northline team, signs in from her emailed link.
    await setLast('u_lena', NOW - 8 * DAY);
    expect((await post('/api/auth/verify', { token: await requestLink('lena@northlinerealty.com') })).statusCode).toBe(200);
    const snap = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: await app.signInAs('u_alex') } });
    expect(snap.statusCode).toBe(200);
    const row = (snap.json() as { users: { id: string; last: number | null }[] }).users.find((u) => u.id === 'u_lena');
    expect(row?.last).toBe(NOW);
  });
});

// ------------------------------------------------------------------------------------------------
// POST /api/auth/sign-out
// ------------------------------------------------------------------------------------------------

describe('POST /api/auth/sign-out @g7', () => {
  it('deletes the session, so the cookie stops working everywhere', async () => {
    const cookie = await app.signInAs('u_jamie');
    const db = await testDatabase();
    expect(await db.select().from(authSessions)).toHaveLength(1);

    const res = await post('/api/auth/sign-out', undefined, { cookie });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(await db.select().from(authSessions)).toHaveLength(0);

    // The row is the source of truth, which is the whole reason the cookie carries only an id.
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })).statusCode).toBe(401);
  });

  it('is idempotent and never 401s', async () => {
    // A viewer whose cookie has already expired still clicked Sign Out; answering 401 would leave
    // the dead cookie in their browser.
    expect((await post('/api/auth/sign-out', undefined)).statusCode).toBe(200);
    const cookie = await app.signInAs('u_jamie');
    expect((await post('/api/auth/sign-out', undefined, { cookie })).statusCode).toBe(200);
    expect((await post('/api/auth/sign-out', undefined, { cookie })).statusCode).toBe(200);
  });

  it('cannot be ridden from another origin', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await post('/api/auth/sign-out', undefined, { cookie, origin: 'https://evil.example' });
    expect(res.statusCode).toBe(403);
    const db = await testDatabase();
    expect(await db.select().from(authSessions)).toHaveLength(1);
  });
});

// ------------------------------------------------------------------------------------------------
// GET /api/me and PATCH /api/me/prefs
// ------------------------------------------------------------------------------------------------

describe('GET /api/me @g7', () => {
  it('answers 401 without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Not signed in' });
  });

  it('routes each persona to § 7.5s role', async () => {
    const roleOf = async (id: string) => {
      const cookie = await app.signInAs(id);
      const res = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
      return (res.json() as { viewer: { role: string } }).viewer.role;
    };

    // `apps/web/src/data/repository.ts`'s `ViewerRole`, persona by persona. § 7.5: "Team members
    // who are not the owner get `role: 'learner'` and see Team Hub read-only."
    expect(await roleOf('u_jamie')).toBe('agent');
    expect(await roleOf('u_alex')).toBe('owner');
    expect(await roleOf('u_sarah')).toBe('learner');
    expect(await roleOf('st1')).toBe('admin');
  });

  it('returns prefs beside the viewer, not inside it', async () => {
    // `http.test.ts`'s fixture body is `{ viewer, prefs: { tz: 'America/Chicago' } }` and its
    // `viewer()` returns `body.viewer` unchanged, so the two must not be nested.
    const cookie = await app.signInAs('u_jamie');
    const res = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(res.json()).toEqual({
      viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' },
      prefs: {},
    });
  });
});

describe('PATCH /api/me/prefs @g7', () => {
  const patch = (body: unknown, headers: Record<string, string>) =>
    app.inject({ method: 'PATCH', url: '/api/me/prefs', payload: body as object, headers });

  it('stores a zone and a theme, and reads them back', async () => {
    const cookie = await app.signInAs('u_jamie');

    const res = await patch({ tz: 'America/New_York', theme: 'dark' }, { cookie });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ prefs: { tz: 'America/New_York', theme: 'dark' } });

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect((me.json() as { prefs: unknown }).prefs).toEqual({ tz: 'America/New_York', theme: 'dark' });
  });

  it('merges rather than replaces, and `tz: null` goes back to the program zone', async () => {
    const cookie = await app.signInAs('u_jamie');
    await patch({ tz: 'Europe/Lisbon' }, { cookie });

    // Only `theme` is sent; the zone must survive.
    expect((await patch({ theme: 'dark' }, { cookie })).json()).toEqual({
      prefs: { tz: 'Europe/Lisbon', theme: 'dark' },
    });
    // `null` clears it: the absence of the key is what the web app reads as "no viewer zone".
    expect((await patch({ tz: null }, { cookie })).json()).toEqual({ prefs: { theme: 'dark' } });
  });

  it('refuses a zone this runtime cannot format in', async () => {
    // `prefs.tz` is what `fmt.*` resolves every instant against, so a value `Intl` rejects does not
    // produce a wrong time — it throws a RangeError inside a view-model and takes the screen down.
    const cookie = await app.signInAs('u_jamie');
    const res = await patch({ tz: 'Mars/Olympus_Mons' }, { cookie });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: string }).error).toContain('Mars/Olympus_Mons');

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect((me.json() as { prefs: unknown }).prefs).toEqual({});
  });

  it('refuses an unknown key and an unknown theme', async () => {
    const cookie = await app.signInAs('u_jamie');
    expect((await patch({ accent: 'pine' }, { cookie })).statusCode).toBe(400);
    expect((await patch({ theme: 'midnight' }, { cookie })).statusCode).toBe(400);
  });

  it('writes nobody else’s preferences', async () => {
    const jamie = await app.signInAs('u_jamie');
    const alex = await app.signInAs('u_alex');
    await patch({ theme: 'dark' }, { cookie: jamie });

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: alex } });
    expect((me.json() as { prefs: unknown }).prefs).toEqual({});
  });

  it('answers 401 without a session, before it looks at the body', async () => {
    expect((await patch({ theme: 'dark' }, {})).statusCode).toBe(401);
  });

  it('does not reset a snapshot-owned column on the user row', async () => {
    // `codec.ts`'s header: `users.prefs` is one of three columns a snapshot deliberately does not
    // own. The reverse has to hold too — writing prefs must not disturb the columns the snapshot
    // DOES own, or a theme change would quietly move a learner's `last` or `joined`.
    const cookie = await app.signInAs('u_jamie');
    const before = (await loadDb()).users.find((u) => u.id === 'u_jamie');
    await patch({ tz: 'America/Denver', theme: 'dark' }, { cookie });
    expect((await loadDb()).users.find((u) => u.id === 'u_jamie')).toEqual(before);
  });
});
