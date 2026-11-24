// Gate 7's "Sign-in e2e", as the API half of it — phase 07 § 7.5 and the checklist's four bullets:
//
//   - "Request a link for an unknown email: the response is still 200."
//   - "Request a link for `jamie@ortizhomes.com`: the test mailbox (`/api/test/outbox`) receives
//      one message, verifying it lands on `/`, and reusing the token shows `That link was already
//      used. Request a new one.`"
//   - "The axe check on `/sign-in` passes."
//
// The browser half — the screen, the copy, and the axe check — is
// `compliance/tests/e2e/signin.spec.ts`, which drives a real Chromium against the http-mode build.
// This file is the half that suite cannot see, and it is deliberately NOT a second copy of
// `test/auth.test.ts`:
//
//   `auth.test.ts`  the endpoints and the policy underneath them: token lifetimes, the hash in the
//                   database, the cookie's four attributes, both rate-limit axes, the race on
//                   `used_at`. Unit-ish, through `app.inject`, reading `outbox()` in-process.
//   this file       the ROUND TRIP a learner makes, through exactly the surface the browser uses:
//                   `POST /api/auth/request` → `GET /api/test/outbox` → the link in the rendered
//                   email → `POST /api/auth/verify` → the cookie → `/api/me` and `/api/snapshot`.
//
// That distinction is the reason it exists. Three things can only break here:
//
//   1. THE LINK ITSELF. `/api/test/outbox` is what the e2e suite reads, and the token reaches the
//      browser only inside the rendered `html`. A template that stopped including the absolute
//      `${APP_URL}/sign-in?token=…` — a relative href, a plain-text-only body, a tracking
//      redirector — passes every assertion in `auth.test.ts` (whose `emailedToken()` reads
//      `data.token`, not the body) and leaves the learner with a dead button. The test below
//      extracts the token FROM THE HTML and signs in with that.
//   2. THE OUTBOX RACE. § 7.5's `/api/auth/request` replies before it mints anything, so "receives
//      one message" is a question about a promise nobody awaited. `routes/test.ts` awaits
//      `settleEmails()` inside the route for this reason; the test reads the outbox through HTTP,
//      with no settle of its own, which is what proves the route's own join is doing the work.
//   3. WHAT THE SESSION CAN THEN DO. "it lands on `/`" is only true if the cookie the verify sets
//      resolves on the two routes `/` renders from. A verify that answered 200 and set a cookie
//      the guard rejects would satisfy a status-code test and show the learner a sign-in screen
//      again, because `data/http.ts` turns a 401 into `location.assign('/sign-in')`.
//
// THE CLOCK. `FIXED_NOW` is set in `beforeEach`, not once: `clock.now()` reads the variable on
// every call, so this makes the 15-minute expiry arithmetic rather than a race with the wall clock.
// THE APP. Rebuilt per test — `@fastify/rate-limit`'s store belongs to the plugin instance, and
// § 7.5's budget is five per hour, which one shared app would spend inside this file.
// `app.close()` and never `shutdown()`: `shutdown` ends the pool `test/helpers.ts` owns, and every
// later `resetDatabase` would fail with CONNECTION_ENDED.

import { describe, it, expect, afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, hashToken } from '../src/auth';
import { authTokens, users } from '../src/db/schema';
import { resetOutbox } from '../src/email/transport';
import type { OutboxEntry } from '../src/email/transport';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');

/** The checklist's two addresses, verbatim. `jamie@ortizhomes.com` is `u_jamie` in `seed('live')`. */
const JAMIE = 'jamie@ortizhomes.com';
const UNKNOWN = 'nobody@example.com';

/**
 * The origin the emailed link must be built on.
 *
 * `email/templates/links.ts` THROWS when `APP_URL` is unset — by design, so a misconfigured deploy
 * logs a named error rather than mailing a dead button — and `transport.send` catches that throw
 * and sends nothing. So without this the outbox stays EMPTY and every assertion below fails with
 * "expected 1, got 0", pointing at sign-in rather than at configuration.
 */
const APP_URL = 'https://learn.example.com';

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  // Create and migrate this slot's database before the first `beforeEach`, where it would
  // otherwise land inside the 30s test timeout instead of the 60s hook one.
  await testDatabase();
});

afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

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
// The surface the browser uses
// ------------------------------------------------------------------------------------------------

/** `POST /api/auth/request { email }`, exactly as `SignIn.tsx`'s `requestSignInLink` sends it. */
const requestLink = (email: string) => app.inject({ method: 'POST', url: '/api/auth/request', payload: { email } });

/** `POST /api/auth/verify { token }`, exactly as `SignIn.tsx`'s `verifySignInToken` sends it. */
const verify = (token: string) => app.inject({ method: 'POST', url: '/api/auth/verify', payload: { token } });

/**
 * `GET /api/test/outbox`, which is the mailbox the checklist names and the one the e2e suite polls.
 *
 * Read through HTTP with no settle of its own: the route awaits `settleEmails()` itself, and that
 * is the behaviour under test (see the header, point 2).
 */
async function outboxOverHttp(): Promise<OutboxEntry[]> {
  const res = await app.inject({ method: 'GET', url: '/api/test/outbox' });
  expect(res.statusCode, 'GET /api/test/outbox').toBe(200);
  return (res.json() as { messages: OutboxEntry[] }).messages;
}

/** The `name=value` pair out of a `set-cookie` header, ready to send back as `Cookie`. */
function cookieFrom(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '');
  const line = raw.split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`));
  expect(line, 'the response set no ai_sid cookie').toBeTruthy();
  return line!.split(';')[0]!;
}

/**
 * The token out of the rendered email BODY, which is the only copy a learner ever has.
 *
 * `§ 7.5`: "it emails a sign-in link `${APP_URL}/sign-in?token=…`". The href is matched whole
 * rather than scanning for a token-shaped string, so a body that linked somewhere else — a
 * relative path, another origin, a redirector — fails here instead of silently handing the test a
 * token that the browser could never have found.
 *
 * `decodeURIComponent` because `signInPath` encodes it; the token alphabet is base64url, which
 * survives encoding unchanged, so this is a correctness belt rather than a working brace.
 */
function tokenFromEmailBody(message: OutboxEntry): string {
  const html = message.html;
  expect(html, 'the sign-in email rendered no html, so the link never reached the learner').toBeTruthy();
  const match = new RegExp(`${APP_URL}/sign-in\\?token=([A-Za-z0-9\\-._~%]+)`).exec(html!);
  expect(
    match,
    `the sign-in email body contains no ${APP_URL}/sign-in?token=… link. Body began: ${html!.slice(0, 300)}`,
  ).toBeTruthy();
  return decodeURIComponent(match![1]!);
}

// ------------------------------------------------------------------------------------------------
// Checklist bullet 1: an unknown address answers 200
// ------------------------------------------------------------------------------------------------

describe('Gate 7 · requesting a sign-in link @g7', () => {
  it('answers 200 for an address with no account, and mails nothing', async () => {
    const res = await requestLink(UNKNOWN);

    // The checklist's line is about the STATUS, and § 7.5's reason is that the response must not
    // reveal whether an account exists. The body is asserted too: a leak would most naturally
    // arrive as an extra field somebody added to be helpful (`{ ok: true, found: false }`).
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // And nothing was sent. `SignIn.tsx` shows "Check Your Email" either way — it swallows every
    // transport outcome on purpose — so the UI cannot tell these apart, which is only safe if the
    // server really does send nothing.
    expect(await outboxOverHttp()).toEqual([]);
  });

  it('puts exactly one message in the outbox for jamie@ortizhomes.com', async () => {
    const res = await requestLink(JAMIE);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const messages = await outboxOverHttp();
    // EXACTLY one, which is the checklist's word. Two would mean the request path sent and then a
    // retry sent again — a learner with two valid links, the second of which reports `used` after
    // they click the first.
    expect(messages).toHaveLength(1);
    expect(messages[0]!.template).toBe('sign-in');
    expect(messages[0]!.to).toBe(JAMIE);

    // One token row, and it holds the HASH. The raw token exists only in the email.
    const token = tokenFromEmailBody(messages[0]!);
    const rows = await (await testDatabase()).select().from(authTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(hashToken(token));
    expect(rows[0]!.tokenHash).not.toBe(token);
    expect(rows[0]!.purpose).toBe('sign_in');
    expect(rows[0]!.usedAt).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------
// Checklist bullet 2: the link lands on `/`, and reusing it does not
// ------------------------------------------------------------------------------------------------

describe('Gate 7 · following the emailed link @g7', () => {
  it('signs the learner in, so the session can load everything `/` renders from', async () => {
    await requestLink(JAMIE);
    const token = tokenFromEmailBody((await outboxOverHttp())[0]!);

    const res = await verify(token);
    expect(res.statusCode).toBe(200);
    // `team: null` because Jamie is Agent tier with no team. `AcceptInvite.tsx` reads this field to
    // write "Joining {Team or Amplified Impact}…". `landing` is where `SignIn.tsx` navigates (D-150):
    // `/` for Jamie, who has a portal.
    expect(res.json()).toEqual({ ok: true, team: null, landing: '/' });

    const cookie = cookieFrom(res.headers['set-cookie']);

    // "it lands on `/`" is the claim, and `/` is `AppShell` + `Dashboard`, which suspend on
    // `/api/me` and `/api/snapshot`. Both must answer 200 to this cookie or the dashboard bounces
    // straight back to /sign-in (`data/http.ts` turns a 401 into `location.assign('/sign-in')`),
    // which is the one failure a 200 from verify cannot rule out on its own.
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' },
      prefs: {},
    });

    const snapshot = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
    expect(snapshot.statusCode).toBe(200);
    // Jamie's own row is in it, which is what the shell reads to render the profile and the nav.
    const body = snapshot.json() as { users: { id: string }[] };
    expect(body.users.map((u) => u.id)).toEqual(['u_jamie']);
  });

  it('refuses the same link a second time with the code the screen turns into "That link was already used."', async () => {
    await requestLink(JAMIE);
    const token = tokenFromEmailBody((await outboxOverHttp())[0]!);

    expect((await verify(token)).statusCode).toBe(200);

    const again = await verify(token);
    expect(again.statusCode).toBe(400);
    // The body is a MACHINE CODE, not the sentence. `SignIn.tsx` and `AcceptInvite.tsx` both do
    // `body?.error === 'used' ? 'used' : 'expired'` and own the copy ("That link was already used.
    // Request a new one."), so that CLAUDE.md's "copy is exact" rule has a test on the side of the
    // fence where the string actually lives — `SignIn.test.tsx` asserts the rendered sentence, and
    // `compliance/tests/e2e/signin.spec.ts` asserts it in a browser.
    expect(again.json()).toEqual({ error: 'used' });
    // No second cookie: a spent link must not hand out a session.
    expect(again.headers['set-cookie']).toBeUndefined();

    // And the row says so, which is what makes the refusal durable across processes rather than a
    // fact about one instance's memory.
    const [row] = await (
      await testDatabase()
    )
      .select()
      .from(authTokens)
      .where(eq(authTokens.tokenHash, hashToken(token)));
    expect(row!.usedAt).toEqual(new Date(NOW));
  });

  it('reads `expired`, never `used`, for a link that was never issued', async () => {
    // The other half of the pair the two screens branch on. `claimToken` collapses an unknown
    // token, a forged one, an expired one and a deleted account into `expired` on purpose: telling
    // a caller which one it hit is telling them which token hashes exist.
    const res = await verify('a-token-nobody-ever-minted');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'expired' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

// ------------------------------------------------------------------------------------------------
// H-4 (Week 0 launch audit): any spent sign-in link activates an invited learner
// ------------------------------------------------------------------------------------------------

describe('H-4 · a sign-in link activates an invited learner', () => {
  it('sets an invited learner active and joined when they spend an emailed sign-in link, as an invite does', async () => {
    const db = await testDatabase();
    // A buyer is provisioned `invited`; their set-password link lapsed, so they ask for a sign-in link.
    await db.update(users).set({ status: 'invited', joined: null }).where(eq(users.id, 'u_jamie'));
    await requestLink(JAMIE);
    const res = await verify(tokenFromEmailBody((await outboxOverHttp())[0]!));
    expect(res.statusCode).toBe(200);
    const [jamie] = await db.select({ status: users.status, joined: users.joined }).from(users).where(eq(users.id, 'u_jamie'));
    expect(jamie).toEqual({ status: 'active', joined: NOW });
  });

  it('keeps an invited learner\'s existing join date, and leaves an active learner as they are', async () => {
    const db = await testDatabase();
    const [before] = await db.select({ joined: users.joined }).from(users).where(eq(users.id, 'u_jamie'));
    expect(before!.joined).not.toBeNull();
    await db.update(users).set({ status: 'invited' }).where(eq(users.id, 'u_jamie'));
    await requestLink(JAMIE);
    await verify(tokenFromEmailBody((await outboxOverHttp())[0]!));
    const [after] = await db.select({ status: users.status, joined: users.joined }).from(users).where(eq(users.id, 'u_jamie'));
    expect(after).toEqual({ status: 'active', joined: before!.joined });

    // Already active: a second sign-in changes nothing.
    resetOutbox();
    await requestLink(JAMIE);
    await verify(tokenFromEmailBody((await outboxOverHttp())[0]!));
    const [again] = await db.select({ status: users.status, joined: users.joined }).from(users).where(eq(users.id, 'u_jamie'));
    expect(again).toEqual(after);
  });
});
