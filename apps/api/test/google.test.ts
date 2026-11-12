// "Continue With Google" (D-139), end to end through the routes against a real database and a fake
// Google: a token endpoint and a key set served from this file, signed with a key made here. No
// network: `GoogleConfig.fetch` is the fake, and it fails any URL it doesn't know.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, settleEmails } from '../src/auth';
import { GOOGLE_JWKS_URL, GOOGLE_TOKEN_URL, readGoogleConfig } from '../src/auth/google';
import type { GoogleConfig } from '../src/auth/google';
import { groupAccessOf, provisionGroupMember } from '../src/billing/access-groups';
import { readOfferConfig } from '../src/billing/config';
import { provisionOrder, sendHeldInvites } from '../src/billing/provision';
import { accessGroups, accounts, authSessions, emailVerifications, googleIdentities, modules, orders, plans, userPasswords, users } from '../src/db/schema';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { GOOGLE_FLOW_COOKIE } from '../src/routes/google';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const APP_URL = 'https://learn.example.com';
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const CLIENT_SECRET = 'test-secret';
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;
const JAMIE = 'jamie@ortizhomes.com'; // `u_jamie`, a learner in seed('live')
const CASEY = 'casey@amplifiedimpact.com'; // `st1`, the seed's Owner (staff)
const INVITES_FROM = Date.parse('2026-11-16T08:00:00-06:00');

// --- a fake Google ----------------------------------------------------------------------------------

const KID = 'test-key-1';
const googleKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const strangerKey = generateKeyPairSync('rsa', { modulusLength: 2048 });

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
function idToken(claims: Record<string, unknown>, key: KeyObject = googleKey.privateKey, kid = KID): string {
  const head = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const body = b64(claims);
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
}

interface TokenCall {
  params: URLSearchParams;
}
let tokenCalls: TokenCall[] = [];
/** What the token endpoint answers with next; built from the nonce the start route sent Google. */
let nextIdToken: (nonce: string) => string = () => 'unset';
let lastNonce = '';

const fakeFetch: GoogleConfig['fetch'] = async (url, init) => {
  if (url === GOOGLE_JWKS_URL) {
    const jwk = googleKey.publicKey.export({ format: 'jwk' });
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] }), { status: 200 });
  }
  if (url === GOOGLE_TOKEN_URL && init?.method === 'POST') {
    const params = new URLSearchParams(String(init.body));
    tokenCalls.push({ params });
    if (params.get('code') !== 'good-code') return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
    return new Response(JSON.stringify({ id_token: nextIdToken(lastNonce), access_token: 'x', token_type: 'Bearer' }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
};

const CONFIG: GoogleConfig = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, redirectUri: REDIRECT_URI, fetch: fakeFetch };

const claimsFor = (email: string, over: Record<string, unknown> = {}) => (nonce: string) =>
  idToken({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    sub: `google-${email.toLowerCase()}`,
    email,
    email_verified: true,
    nonce,
    iat: Math.floor(NOW / 1000) - 5,
    exp: Math.floor(NOW / 1000) + 3600,
    ...over,
  });

// --- the app ----------------------------------------------------------------------------------------

let app: App;
let db: Database;
let savedAppUrl: string | undefined;

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

/** `'env'`: leave `google` out of `build()`, so it reads the environment as production does. */
async function boot(google: GoogleConfig | null | 'env' = CONFIG): Promise<void> {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  tokenCalls = [];
  await resetDatabase(seedForDatabase('live'));
  app = await build({
    logger: false,
    ...(google === 'env' ? {} : { google }),
    offer: { pages: {}, config: { ...readOfferConfig({}), invitesFrom: INVITES_FROM }, stripe: null, verify: null },
  });
}
beforeEach(async () => {
  await boot();
});
afterEach(async () => {
  await app?.close();
});

const cookieOf = (res: { cookies: { name: string; value: string }[] }, name: string) => res.cookies.find((c) => c.name === name);

/** Press the button: the start route's redirect, the flow cookie, and what Google was sent. */
async function start() {
  const res = await app.inject({ method: 'GET', url: '/api/auth/google' });
  expect(res.statusCode).toBe(302);
  const to = new URL(String(res.headers.location));
  const flow = cookieOf(res, GOOGLE_FLOW_COOKIE)!;
  lastNonce = to.searchParams.get('nonce') ?? '';
  return { to, flow, state: to.searchParams.get('state') ?? '', cookie: `${GOOGLE_FLOW_COOKIE}=${flow.value}` };
}

/** Google's redirect back: `?code&state`, with the browser's flow cookie unless told otherwise. */
const callback = (query: string, cookie?: string) =>
  app.inject({ method: 'GET', url: `/api/auth/google/callback?${query}`, headers: cookie ? { cookie } : {} });

/** The whole round trip for `email`, as Google would complete it. */
async function signInWithGoogle(email: string, over: Record<string, unknown> = {}) {
  const s = await start();
  nextIdToken = claimsFor(email, over);
  return callback(`code=good-code&state=${encodeURIComponent(s.state)}`, s.cookie);
}

const me = (res: { cookies: { name: string; value: string }[] }) => {
  const sid = cookieOf(res, SESSION_COOKIE);
  return sid ? app.inject({ method: 'GET', url: '/api/me', headers: { cookie: `${SESSION_COOKIE}=${sid.value}` } }) : null;
};
const sessionCount = async () => (await db.select().from(authSessions)).length;

// --- off until configured -------------------------------------------------------------------------

describe('without the keys', () => {
  it('reads as off from the environment unless GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and APP_URL are all set', () => {
    expect(readGoogleConfig({ APP_URL })).toBeNull();
    expect(readGoogleConfig({ APP_URL, GOOGLE_CLIENT_ID: CLIENT_ID })).toBeNull();
    expect(readGoogleConfig({ APP_URL, GOOGLE_CLIENT_SECRET: CLIENT_SECRET })).toBeNull();
    expect(readGoogleConfig({ GOOGLE_CLIENT_ID: CLIENT_ID, GOOGLE_CLIENT_SECRET: CLIENT_SECRET })).toBeNull();
    expect(readGoogleConfig({ APP_URL: 'https://learn.amplifiedimpact.io', GOOGLE_CLIENT_ID: ' id ', GOOGLE_CLIENT_SECRET: 's' })).toEqual({
      clientId: 'id',
      clientSecret: 's',
      redirectUri: 'https://learn.amplifiedimpact.io/api/auth/google/callback',
    });
  });

  it('hides the button and answers 404 on both routes', async () => {
    for (const google of [null, 'env'] as const) {
      await app.close();
      const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      try {
        await boot(google);
        const providers = await app.inject({ method: 'GET', url: '/api/auth/providers' });
        expect([providers.statusCode, providers.json()]).toEqual([200, { google: false }]);
        expect((await app.inject({ method: 'GET', url: '/api/auth/google' })).statusCode).toBe(404);
        expect((await callback('code=good-code&state=x')).statusCode).toBe(404);
      } finally {
        if (saved.id !== undefined) process.env.GOOGLE_CLIENT_ID = saved.id;
        if (saved.secret !== undefined) process.env.GOOGLE_CLIENT_SECRET = saved.secret;
      }
    }
  });
});

// --- the start route ----------------------------------------------------------------------------------

describe('the start route', () => {
  it('says the button is on, and sends the browser to Google with PKCE S256, state, nonce and the account chooser', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auth/providers' })).json()).toEqual({ google: true });
    const { to, flow, state } = await start();
    expect(`${to.origin}${to.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const q = Object.fromEntries(to.searchParams);
    expect(q).toMatchObject({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      code_challenge_method: 'S256',
    });
    expect(state.length).toBeGreaterThanOrEqual(40);
    expect(q.nonce!.length).toBeGreaterThanOrEqual(20);
    expect(q.code_challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The secret never goes to the browser.
    expect(to.toString()).not.toContain(CLIENT_SECRET);
    // The flow cookie: signed, httpOnly, Lax (Google's redirect back is a top-level GET), ten minutes,
    // and only sent to the two Google routes.
    expect(flow).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/api/auth/google', maxAge: 600 });
    expect(flow.value).toContain('.'); // @fastify/cookie's signature
    expect(flow.value).not.toContain(CLIENT_SECRET);
  });

  it('exchanges the code with the verifier whose S256 is the challenge Google was sent', async () => {
    const s = await start();
    nextIdToken = claimsFor(JAMIE);
    const res = await callback(`code=good-code&state=${encodeURIComponent(s.state)}`, s.cookie);
    expect(res.statusCode).toBe(302);
    expect(tokenCalls).toHaveLength(1);
    const p = tokenCalls[0]!.params;
    expect(Object.fromEntries(p)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'good-code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    });
    const challenge = createHash('sha256').update(p.get('code_verifier')!).digest('base64url');
    expect(challenge).toBe(s.to.searchParams.get('code_challenge'));
  });
});

// --- state and PKCE: refused before Google is asked anything ---------------------------------------

describe('state and the flow cookie', () => {
  it('refuses a state that is not this browser’s, without exchanging the code', async () => {
    const s = await start();
    nextIdToken = claimsFor(JAMIE);
    const res = await callback('code=good-code&state=someone-elses', s.cookie);
    expect([res.statusCode, res.headers.location]).toEqual([302, '/login?google=failed']);
    expect(tokenCalls).toHaveLength(0);
    expect(cookieOf(res, SESSION_COOKIE)).toBeUndefined();
  });

  it('refuses a callback with no flow cookie, or a forged one', async () => {
    const s = await start();
    nextIdToken = claimsFor(JAMIE);
    const q = `code=good-code&state=${encodeURIComponent(s.state)}`;
    for (const cookie of [undefined, `${GOOGLE_FLOW_COOKIE}=${encodeURIComponent(JSON.stringify({ state: s.state, verifier: 'v', nonce: 'n' }))}`]) {
      const res = await callback(q, cookie);
      expect(res.headers.location).toBe('/login?google=failed');
    }
    expect(tokenCalls).toHaveLength(0);
    expect(await sessionCount()).toBe(0);
  });

  it('spends the flow cookie on the first callback', async () => {
    const s = await start();
    nextIdToken = claimsFor(JAMIE);
    const res = await callback(`code=good-code&state=${encodeURIComponent(s.state)}`, s.cookie);
    expect(cookieOf(res, GOOGLE_FLOW_COOKIE)).toMatchObject({ value: '' });
  });

  it('goes back to the sign-in screen quietly when the person cancels at Google', async () => {
    await start();
    const res = await callback('error=access_denied&state=x');
    expect([res.statusCode, res.headers.location]).toEqual([302, '/login']);
    expect(tokenCalls).toHaveLength(0);
  });

  it('refuses a code Google won’t exchange', async () => {
    const s = await start();
    const res = await callback(`code=stale-code&state=${encodeURIComponent(s.state)}`, s.cookie);
    expect(res.headers.location).toBe('/login?google=failed');
    expect(await sessionCount()).toBe(0);
  });
});

// --- the ID token ------------------------------------------------------------------------------------

describe('the ID token', () => {
  it('refuses an email Google has not verified, signing nobody in', async () => {
    for (const over of [{ email_verified: false }, { email_verified: 'true' }, { email_verified: undefined }]) {
      const res = await signInWithGoogle(JAMIE, over);
      expect([res.statusCode, res.headers.location], JSON.stringify(over)).toEqual([302, '/login?google=unverified']);
      expect(cookieOf(res, SESSION_COOKIE)).toBeUndefined();
    }
    expect(await sessionCount()).toBe(0);
    expect(await db.select().from(googleIdentities)).toEqual([]);
  });

  it('refuses the wrong issuer, audience, nonce, an expired token, and a signature from another key', async () => {
    const bad: [string, Record<string, unknown> | 'stranger'][] = [
      ['issuer', { iss: 'https://evil.example.com' }],
      ['audience', { aud: 'someone-else.apps.googleusercontent.com' }],
      ['audience list without azp', { aud: [CLIENT_ID, 'other'], azp: 'other' }],
      ['expired', { exp: Math.floor(NOW / 1000) - 120 }],
      ['nonce', { nonce: 'replayed-nonce' }],
      ['signature', 'stranger'],
    ];
    for (const [why, over] of bad) {
      const s = await start();
      nextIdToken =
        over === 'stranger'
          ? (nonce) => idToken({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 's', email: JAMIE, email_verified: true, nonce, exp: Math.floor(NOW / 1000) + 3600 }, strangerKey.privateKey)
          : (nonce) => claimsFor(JAMIE, over)(nonce);
      const res = await callback(`code=good-code&state=${encodeURIComponent(s.state)}`, s.cookie);
      expect(res.headers.location, why).toBe('/login?google=failed');
    }
    expect(await sessionCount()).toBe(0);
  });

  it('accepts the short issuer form and an audience list that names this client as azp', async () => {
    const res = await signInWithGoogle(JAMIE, { iss: 'accounts.google.com', aud: [CLIENT_ID, 'other'], azp: CLIENT_ID });
    expect([res.statusCode, res.headers.location]).toEqual([302, '/']);
  });
});

// --- which account -----------------------------------------------------------------------------------

describe('which account it opens', () => {
  it('signs an existing learner in by their verified email, any case, and links the Google account', async () => {
    await db.update(users).set({ last: NOW - 3 * 86_400_000 }).where(eq(users.id, 'u_jamie'));
    const res = await signInWithGoogle('Jamie@OrtizHomes.com');
    expect([res.statusCode, res.headers.location]).toEqual([302, '/']);
    const sid = cookieOf(res, SESSION_COOKIE)!;
    // Password sign-in's session with "Keep me signed in": signed, httpOnly, Lax, 30 days.
    expect(sid).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 60 * 60 });
    const who = await me(res);
    expect(who!.json().viewer.actor).toEqual({ kind: 'learner', userId: 'u_jamie' });
    expect(await db.select({ userId: googleIdentities.userId }).from(googleIdentities)).toEqual([{ userId: 'u_jamie' }]);
    // A Google sign-in is a sign-in: it stamps Last Active (D-145).
    expect((await db.select({ last: users.last }).from(users).where(eq(users.id, 'u_jamie')))[0]!.last).toBe(NOW);
  });

  it('links the account a checkout made, whose owner never set a password, and makes it active', async () => {
    // A paid Amplified Insiders order, provisioned as the webhook does: the owner is `invited`, no password.
    await db.insert(orders).values({
      id: 'o_google', plan: 'membership', option: 'year_upfront', origin: 'payment_link', status: 'paid',
      name: 'Pat Buyer', email: 'pat@example.com', stripeSessionId: 'cs_test_googleGoogle1234', paidAt: NOW, createdAt: NOW,
    });
    const out = await provisionOrder('o_google', { log: { info: () => {}, warn: () => {}, error: () => {} }, now: NOW, invitesFrom: INVITES_FROM });
    expect(out.ok, JSON.stringify(out)).toBe(true);
    const [pat] = await db.select().from(users).where(eq(users.email, 'pat@example.com'));
    expect(pat).toMatchObject({ kind: 'learner', status: 'invited' });
    expect(await db.select().from(userPasswords).where(eq(userPasswords.userId, pat!.id))).toEqual([]);

    const res = await signInWithGoogle('pat@example.com');
    expect(res.headers.location).toBe('/');
    expect((await me(res))!.json().viewer.actor).toEqual({ kind: 'learner', userId: pat!.id });
    const [after] = await db.select().from(users).where(eq(users.id, pat!.id));
    expect(after!.status).toBe('active');
    expect(await db.select({ userId: googleIdentities.userId }).from(googleIdentities)).toEqual([{ userId: pat!.id }]);
    // Still no password, and Google created nothing else.
    expect(await db.select().from(userPasswords).where(eq(userPasswords.userId, pat!.id))).toEqual([]);
  });

  it('matches on the linked Google account afterwards, even when the Google address changes', async () => {
    await signInWithGoogle(JAMIE);
    const res = await signInWithGoogle('jamie.new@gmail.com', { sub: `google-${JAMIE}` });
    expect(res.headers.location).toBe('/');
    expect((await me(res))!.json().viewer.actor).toEqual({ kind: 'learner', userId: 'u_jamie' });
  });

  it('creates nothing for an address with no account, and says so', async () => {
    const before = (await db.select().from(users)).length;
    const res = await signInWithGoogle('stranger@gmail.com');
    expect([res.statusCode, res.headers.location]).toEqual([302, '/login?google=no-account']);
    expect(cookieOf(res, SESSION_COOKIE)).toBeUndefined();
    expect((await db.select().from(users)).length).toBe(before);
    expect(await db.select().from(googleIdentities)).toEqual([]);
    expect(await sessionCount()).toBe(0);
  });

  it('lets staff in only when Google’s email is exactly the account’s', async () => {
    const wrongCase = await signInWithGoogle('Casey@AmplifiedImpact.com', { sub: 'google-casey' });
    expect(wrongCase.headers.location).toBe('/login?google=no-account');
    expect(await db.select().from(googleIdentities)).toEqual([]);

    const exact = await signInWithGoogle(CASEY, { sub: 'google-casey' });
    expect(exact.headers.location).toBe('/');
    expect((await me(exact))!.json().viewer.actor).toEqual({ kind: 'staff', staffId: 'st1' });

    // Once linked, still only with that exact address.
    const later = await signInWithGoogle('casey+other@amplifiedimpact.com', { sub: 'google-casey' });
    expect(later.headers.location).toBe('/login?google=no-account');
  });

  it('refuses a second Google account for a user who already linked one', async () => {
    await signInWithGoogle(JAMIE, { sub: 'google-first' });
    const res = await signInWithGoogle(JAMIE, { sub: 'google-second' });
    expect(res.headers.location).toBe('/login?google=linked-elsewhere');
    expect(cookieOf(res, SESSION_COOKIE)).toBeUndefined();
  });

  it('skips the held "Set your password" email for an owner Google already signed in, as for one who set a password', async () => {
    await db.insert(orders).values({
      id: 'o_held', plan: 'membership', option: 'year_upfront', origin: 'payment_link', status: 'paid',
      name: 'Lee Early', email: 'lee@example.com', stripeSessionId: 'cs_test_heldHeldHeld1234', paidAt: NOW, createdAt: NOW,
    });
    const before = INVITES_FROM - 24 * 3_600_000;
    process.env.FIXED_NOW = new Date(before).toISOString();
    await provisionOrder('o_held', { log: { info: () => {}, warn: () => {}, error: () => {} }, now: before, invitesFrom: INVITES_FROM });
    const res = await signInWithGoogle('lee@example.com', { iat: Math.floor(before / 1000), exp: Math.floor(before / 1000) + 3600 });
    expect(res.headers.location).toBe('/');
    // INVITES_FROM: the held email goes only to owners still `invited`, so not to this one.
    await sendHeldInvites({ log: { info: () => {}, warn: () => {}, error: () => {} }, now: INVITES_FROM, invitesFrom: INVITES_FROM });
    expect(outboxFor({ to: 'lee@example.com' })).toEqual([]);
  });
});

// --- an access group's address (D-149) ----------------------------------------------------------------

describe('an access group’s address, verified by Google (D-149)', () => {
  const UTAH_LIFE = { id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null as number | null, createdAt: NOW - 86_400_000 };
  const AGENT_PLAN = { plans: [{ kind: 'agent_plan', status: 'active', paidThrough: Number.MAX_SAFE_INTEGER, liveUntil: null }], groups: [{ id: 'utah-life', name: 'Utah Life' }] };
  const NONE = { plans: [], groups: [] };
  const verified = async () => (await db.select({ email: emailVerifications.email }).from(emailVerifications)).map((r) => r.email);

  beforeEach(async () => {
    // The migration seeds the group; the suite's reset empties every table, so it is put back here.
    await db.insert(accessGroups).values(UTAH_LIFE);
  });
  afterEach(async () => {
    // Not a customer: no account, order or plan row, and no email to anyone.
    expect(await db.select().from(accounts)).toEqual([]);
    expect(await db.select().from(orders)).toEqual([]);
    expect(await db.select().from(plans)).toEqual([]);
    await settleEmails();
    expect(outboxFor({})).toEqual([]);
  });

  it('signs a first-time member up and in, verified, holding the Agent Plan’s skills', async () => {
    const res = await signInWithGoogle('New.Agent@LiveUtah.com', { hd: 'liveutah.com' });
    expect([res.statusCode, res.headers.location]).toEqual([302, '/']);
    const [u] = await db.select().from(users).where(eq(users.email, 'new.agent@liveutah.com'));
    expect(u).toMatchObject({ kind: 'learner', status: 'active', tier: 'agent' });
    expect((await me(res))!.json().viewer.actor).toEqual({ kind: 'learner', userId: u!.id });
    expect(await verified()).toEqual(['new.agent@liveutah.com']);
    expect(await groupAccessOf(db, 'new.agent@liveutah.com', NOW)).toEqual(AGENT_PLAN);
    expect(await db.select({ userId: googleIdentities.userId }).from(googleIdentities)).toEqual([{ userId: u!.id }]);

    // The next visit is an ordinary Google sign-in: the same account, nothing new made.
    const again = await signInWithGoogle('new.agent@liveutah.com');
    expect((await me(again))!.json().viewer.actor).toEqual({ kind: 'learner', userId: u!.id });
    expect(await db.select().from(users).where(eq(users.email, 'new.agent@liveutah.com'))).toHaveLength(1);
  });

  it('lands a member with no cohort portal straight on the Skill Library (D-150)', async () => {
    // Production's portal is the AI Accelerator's, which the grant never opens: here, drafts.
    await db.update(modules).set({ status: 'draft' });
    const res = await signInWithGoogle('landing.agent@liveutah.com');
    expect([res.statusCode, res.headers.location]).toEqual([302, '/skill-library']);
    expect(cookieOf(res, SESSION_COOKIE)).toBeDefined();
    // Someone with a portal still lands on `/` (the seed's learner, with the AI Employees published).
    await db.update(modules).set({ status: 'published' });
    expect((await signInWithGoogle(JAMIE)).headers.location).toBe('/');
  });

  it('does not need Google’s Workspace domain (`hd`): it is logged, not required', async () => {
    const res = await signInWithGoogle('agent@liveutah.com');
    expect(res.headers.location).toBe('/');
    expect(await groupAccessOf(db, 'agent@liveutah.com', NOW)).toEqual(AGENT_PLAN);
  });

  it('opens the group’s access for a member’s existing account, as a spent link does', async () => {
    const id = await provisionGroupMember(db, 'old.agent@liveutah.com', NOW);
    expect(await groupAccessOf(db, 'old.agent@liveutah.com', NOW)).toEqual(NONE);
    const res = await signInWithGoogle('Old.Agent@liveutah.com');
    expect(res.headers.location).toBe('/');
    expect((await me(res))!.json().viewer.actor).toEqual({ kind: 'learner', userId: id });
    expect(await groupAccessOf(db, 'old.agent@liveutah.com', NOW)).toEqual(AGENT_PLAN);
  });

  it('still refuses look-alike domains: no account, nothing recorded', async () => {
    const before = (await db.select().from(users)).length;
    for (const email of ['agent@liveutah.com.evil.com', 'agent@notliveutah.com', 'agent@mail.liveutah.com', 'agent@liveutah.co']) {
      const res = await signInWithGoogle(email);
      expect(res.headers.location, email).toBe('/login?google=no-account');
      expect(cookieOf(res, SESSION_COOKIE), email).toBeUndefined();
    }
    expect((await db.select().from(users)).length).toBe(before);
    expect(await verified()).toEqual([]);
    expect(await db.select().from(googleIdentities)).toEqual([]);
  });

  it('refuses an address Google has not verified, even in the domain', async () => {
    const res = await signInWithGoogle('agent@liveutah.com', { email_verified: false });
    expect(res.headers.location).toBe('/login?google=unverified');
    expect(await db.select().from(users).where(eq(users.email, 'agent@liveutah.com'))).toEqual([]);
    expect(await verified()).toEqual([]);
  });

  it('opens nothing once the group has expired', async () => {
    await db.update(accessGroups).set({ expiresAt: NOW - 1 }).where(eq(accessGroups.id, 'utah-life'));
    const res = await signInWithGoogle('agent@liveutah.com');
    expect(res.headers.location).toBe('/login?google=no-account');
    expect(await verified()).toEqual([]);
  });
});
