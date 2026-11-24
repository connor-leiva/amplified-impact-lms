// Phase 07 § 7.3, § 7.4, § 7.6, § 7.7 and § 9.4 — the routes, through `app.inject`.
//
// The five assertions here that are load-bearing rather than descriptive:
//
//   1. "the snapshot is `scopeSnapshot` and nothing else" (§ 7.4). The route's body is compared to
//      `scopeSnapshot(await loadDb(), actor)` — the whole object, not a spot check. A route that
//      re-filtered, added a field, or returned the unscoped db fails it, and so does one that
//      forgets to scope at all.
//   2. "an inherited name is not a mutation" (§ 7.3). `'toString' in M` is TRUE, so the obvious
//      gate lets `Object.prototype.toString` be called with a `Db` as its `this`. `schemaFor` uses
//      `hasOwnProperty`; the test calls `/api/mutate/toString` and expects 404.
//   3. "a commit broadcasts `changed`" (§ 7.6) and "SIGTERM drains the stream" (§ 9.4). Done over
//      a real socket, because an SSE response never ends and `inject` buffers until it does.
//   4. "the test routes do not exist outside NODE_ENV=test" (§ 7.7). A route that mints a session
//      for any user id, reachable in production, is a total compromise of every account — so the
//      test builds an app under `'production'`, `'TEST'`, `'testing'`, `'test '` and unset, and
//      expects 404 from each.
//   5. "a mutation requires JSON and a matching Origin" (§ 9.4), all three arms.
//
// The app is rebuilt per test. `@fastify/rate-limit`'s store belongs to the plugin instance, so a
// shared app would carry § 9.4's 100/minute budget across the file; `build()` opens no database
// connection, so this costs nothing but the registration.

import { describe, it, expect, afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { get as httpGet } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { scopeSnapshot, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build, cspDirectives, cspScriptHashes, inlineScriptHashes, scrubUrl, shutdown } from '../src/app';
import type { App } from '../src/app';
import { INVITE_TTL_MS, hashToken, sessionCookieOptions } from '../src/auth';
import { authTokens, users } from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { isTestEnv } from '../src/routes/test';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
/**
 * The Origin a same-origin `fetch` sets: `${protocol}://${host}`. `light-my-request`'s default
 * `Host` is `localhost`, so this is what a browser doing the same request as each inject below
 * would send, and it is what § 9.4's Origin check has to accept.
 */
const ORIGIN = 'http://localhost';

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  process.env.FIXED_NOW = new Date(NOW).toISOString();
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
  app = await build({ logger: false });
});

afterEach(async () => {
  // `close()` drains the SSE streams itself, through the `preClose` hook `routes/events.ts`
  // registers — which is the behaviour the `/api/events` suite tests and the reason nothing here
  // has to remember to drain first. On `onClose` this line hangs for 60 seconds instead.
  await app?.close();
});

/** The seed, loaded fresh. Only the describes that read or write rows pay for it. */
const seeded = () => resetDatabase(seedForDatabase('live'));

/** § 9.4's two headers on every mutation, as a browser would send them. */
const mutate = async (name: string, payload: unknown, cookie: string, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: `/api/mutate/${name}`,
    payload: payload as object,
    headers: { cookie, origin: ORIGIN, 'content-type': 'application/json', ...headers },
  });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll until `check` is true, or fail with `what`. Used only for the one real-socket test. */
async function waitFor(what: string, check: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await sleep(20);
  }
}

// ------------------------------------------------------------------------------------------------
// § 7.1 · the process's two shapes
// ------------------------------------------------------------------------------------------------

describe('/api/health @g7', () => {
  it('answers without touching anything', async () => {
    // Railway's healthcheck (`.railway/railway.ts`). It deliberately queries no database: a health
    // check that did would fail a deploy over a transient connection and roll it back.
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, version: 'dev' });
  });
});

describe('the fixture guard @g7', () => {
  it('registers the hardening, /api/health and the public /ai101 page, and no data routes at all', async () => {
    // The demo environment runs on this (`VITE_DATA_SOURCE: 'fixture'`, no DATABASE_URL). If the
    // routes were registered and merely unused, the first crawler to hit `/api/snapshot` would get
    // a `DatabaseConfigError`; CLAUDE.md's rule is that real data must be unreachable there.
    //
    // The /ai101 page and its redirects (D-028) are the one addition, and they need neither a
    // database nor a session: a string in memory and three 301s. The waitlist beside them needs a
    // database, so with `waitlist` left to its default (`!fixtureOnly`) it must not exist here —
    // a 404, not a route that throws on the first sign-up. `test/ai101.test.ts` covers the other
    // half: fixture mode WITH a database, which is what production runs.
    const demo = await build({ logger: false, fixtureOnly: true, ai101Page: '<!doctype html><title>AI 101</title>' });
    try {
      expect((await demo.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
      // § 9.4's headers survive the guard: the demo site serves the SPA and still wants a CSP.
      expect((await demo.inject({ method: 'GET', url: '/api/health' })).headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect((await demo.inject({ method: 'GET', url: '/ai101' })).statusCode).toBe(200);
      expect((await demo.inject({ method: 'GET', url: '/AI101' })).statusCode).toBe(301);

      for (const url of ['/api/snapshot', '/api/me', '/api/events', '/api/test/outbox']) {
        expect((await demo.inject({ method: 'GET', url })).statusCode, url).toBe(404);
      }
      for (const url of [
        '/api/auth/request',
        '/api/auth/verify',
        '/api/mutate/toggleStep',
        '/api/test/session',
        '/api/ai101/waitlist',
      ]) {
        expect((await demo.inject({ method: 'POST', url, payload: {} })).statusCode, url).toBe(404);
      }
      expect(demo.events).toBeNull();
    } finally {
      await demo.close();
    }
  });
});

// ------------------------------------------------------------------------------------------------
// Gate 7 · "An unauthenticated call to any /api/* route except /api/health, /api/auth/* and
// /api/events returns 401."
// ------------------------------------------------------------------------------------------------

describe('the 401 surface @g7', () => {
  it('refuses every data route without a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/snapshot' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PATCH', url: '/api/me/prefs', payload: {} })).statusCode).toBe(401);
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: { moduleId: 'sales', stepId: 'c4' },
      headers: { origin: ORIGIN },
    });
    expect(res.statusCode).toBe(401);
    // `apps/web/src/data/http.ts` turns any 401 into `location.assign('/sign-in')`.
    expect(res.json()).toEqual({ error: 'Not signed in' });
  });

  it('leaves the three exempt routes open', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
    // `EventSource` reconnects on error and cannot be told not to, so a 401 here would mean every
    // signed-out tab hammering the endpoint forever. The stream carries no data; see events.ts.
    const stream = app.inject({ method: 'GET', url: '/api/events' });
    await waitFor('the stream to open', () => (app.events?.clients() ?? 0) === 1);
    expect(app.events!.clients()).toBe(1);
    app.events!.close();
    expect((await stream).statusCode).toBe(200);

    expect((await app.inject({ method: 'POST', url: '/api/auth/request', payload: { email: 'x@y.co' } })).statusCode).toBe(
      200,
    );
  });
});

// ------------------------------------------------------------------------------------------------
// § 7.4 · GET /api/snapshot
// ------------------------------------------------------------------------------------------------

describe('GET /api/snapshot @g7', () => {
  beforeEach(seeded);

  it('is scopeSnapshot(loadDb(), actor) and nothing else', async () => {
    // The whole object, both viewers. A route that re-filtered — or that forgot to scope — fails
    // this; so does one that adds a field the web app would then depend on. D-243: the route also
    // counts the cohort without the learners outside the course (`withOutside`). The demo database
    // has nobody outside it, so this is `loadDb`'s own; course-members.test.ts holds the rest.
    for (const [id, actor] of [
      ['u_jamie', { kind: 'learner', userId: 'u_jamie' }],
      ['st1', { kind: 'staff', staffId: 'st1' }],
    ] as const) {
      const cookie = await app.signInAs(id);
      const res = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(scopeSnapshot(await loadDb(), actor));
    }
  });

  it('withholds from a learner exactly what Gate 7 lists', async () => {
    const cookie = await app.signInAs('u_jamie');
    const db = (await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } })).json() as Db;

    // "Jamie's snapshot has no `prompt` for `meetings`, `finance` or `operations`; no `staff`; no
    // other teams' users; and no `zoom` URLs."
    for (const id of ['meetings', 'finance', 'operations']) {
      expect(db.modules.find((m) => m.id === id)?.prompt, id).toBe('');
    }
    expect(db.staff).toEqual([]);
    expect(db.users.map((u) => u.id)).toEqual(['u_jamie']);
    expect(db.sessions.every((s) => s.zoom === '')).toBe(true);
    // § 7.4: the object-store key is a backend column and never part of a snapshot.
    expect(JSON.stringify(db)).not.toContain('storageKey');
  });

  it('shows a team owner the roster’s emails and a team member none of them', async () => {
    // Gate 7: "Alex's snapshot includes the Northline members' emails. Sarah's (Sales Agent)
    // snapshot does not."
    const emailsFor = async (id: string) => {
      const cookie = await app.signInAs(id);
      const db = (await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } })).json() as Db;
      return db.users.filter((u) => u.id !== id).map((u) => u.email);
    };
    expect(await emailsFor('u_alex')).toContain('sarah@northlinerealty.com');
    // Sarah sees the same roster — Team Hub is her screen too — with every address blanked.
    const sarahSees = await emailsFor('u_sarah');
    expect(sarahSees.length).toBeGreaterThan(0);
    expect(sarahSees.every((e) => e === '')).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------
// § 7.3 · POST /api/mutate/:name
// ------------------------------------------------------------------------------------------------

describe('POST /api/mutate/:name @g7', () => {
  beforeEach(seeded);

  it('runs the core mutation and persists the diff', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await mutate('toggleStep', { moduleId: 'sales', stepId: 'c4' }, cookie);

    expect(res.statusCode).toBe(200);
    // Four of six verified, so nothing was built: no toast, no confetti.
    expect(res.json()).toEqual({ effects: [] });

    const after = await loadDb();
    expect(after.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2', 'c3', 'c4']);
    // `ctx.now` is the pinned instant, not the wall clock.
    expect(after.users.find((u) => u.id === 'u_jamie')!.last).toBe(NOW);
  });

  it('returns the toast and the confetti when a build completes', async () => {
    const cookie = await app.signInAs('u_jamie');
    await mutate('toggleStep', { moduleId: 'sales', stepId: 'c4' }, cookie);
    await mutate('toggleStep', { moduleId: 'sales', stepId: 'c5' }, cookie);
    const res = await mutate('toggleStep', { moduleId: 'sales', stepId: 'c6' }, cookie);

    expect(res.statusCode).toBe(200);
    // Core's exact copy, curly apostrophes and all, straight through: the route neither writes nor
    // rewords a toast, so CLAUDE.md's "copy is exact" rule has one implementation, in `@ai/core`.
    expect(res.json()).toEqual({
      toast: { msg: 'Sales AI Employee is built. Deploy it from the Your Deployment card.', tone: 'success' },
      effects: [{ type: 'confetti' }],
    });
  });

  it('404s a name that is not a mutation, including an inherited one', async () => {
    const cookie = await app.signInAs('u_jamie');
    expect((await mutate('nope', {}, cookie)).statusCode).toBe(404);
    // `'toString' in M` is TRUE. § 7.3's literal `if (!(name in M))` would call
    // `Object.prototype.toString(db, actor, …)`; `schemaFor` uses `hasOwnProperty` and answers 404.
    for (const inherited of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']) {
      const res = await mutate(inherited, {}, cookie);
      expect(res.statusCode, inherited).toBe(404);
      expect(res.json()).toEqual({ error: 'Unknown mutation' });
    }
  });

  it('400s a body that is not that mutation’s arguments', async () => {
    const cookie = await app.signInAs('u_jamie');
    expect((await mutate('toggleStep', { moduleId: 'sales' }, cookie)).statusCode).toBe(400);
    expect((await mutate('toggleStep', { moduleId: 'sales', stepId: 4 }, cookie)).statusCode).toBe(400);
    // Every schema in `schemas.ts` is strict: an unexpected key means the client and the server
    // have drifted, and the loud answer is the useful one.
    const res = await mutate('toggleStep', { moduleId: 'sales', stepId: 'c4', force: true }, cookie);
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('Invalid request body');
  });

  it('422s validation the UI renders inline, and writes nothing', async () => {
    // `http.test.ts`: "a 422 is a form error, not a failure" — the repository RESOLVES it, so the
    // invite form shows this sentence under the field instead of a crash banner.
    const cookie = await app.signInAs('u_alex');
    const before = await loadDb();
    const res = await mutate('inviteMember', { email: 'not-an-email', role: 'Sales Agent' }, cookie);

    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'Enter a valid email address.' });
    expect(await loadDb()).toEqual(before);
  });

  it('403s a mutation this actor may not run', async () => {
    // Jamie is Agent tier, so `canAccess` is false for a team-tier AI Employee and `toggleStep`
    // throws `forbidden` before it writes anything.
    const cookie = await app.signInAs('u_jamie');
    const res = await mutate('toggleStep', { moduleId: 'meetings', stepId: 'c1' }, cookie);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Team tier required' });
  });

  it('403s a staff mutation called by a learner', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await mutate('publishModule', { id: 'operations' }, cookie);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'You don’t have permission to do that.' });
  });

  it('404s a MutationError that says the thing is gone', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await mutate('toggleStep', { moduleId: 'no-such-employee', stepId: 'c1' }, cookie);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'No AI Employee no-such-employee' });
  });

  it('rolls the write back when the mutation throws', async () => {
    const cookie = await app.signInAs('u_jamie');
    const before = await loadDb();
    await mutate('toggleStep', { moduleId: 'meetings', stepId: 'c1' }, cookie);
    expect(await loadDb()).toEqual(before);
  });

  it('sends the invite email and mints its 7-day token, and returns neither', async () => {
    const cookie = await app.signInAs('u_alex');
    const res = await mutate('inviteMember', { email: 'new@northlinerealty.com', role: 'Sales Agent' }, cookie);

    expect(res.statusCode).toBe(200);
    // § 7.3 filters `effects` to confetti on the way out, so the email effect — which carries
    // `to: [email]` and, after this route has been through it, a live invite TOKEN — never reaches
    // the browser. The toast does echo the address, because the inviter just typed it.
    const body = res.json() as { toast: { msg: string }; effects: unknown[] };
    expect(body.effects).toEqual([]);
    expect(body.toast.msg).toBe('Invite sent to new@northlinerealty.com');
    expect(JSON.stringify(body)).not.toContain('token');
    expect(JSON.stringify(body)).not.toContain('"type":"email"');

    const invites = outbox().filter((m) => m.template === 'team-invite');
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({ to: 'new@northlinerealty.com' });
    // Core cannot mint a token (it is pure, and knows nothing of `auth_tokens`), so the route does
    // — inside the mutation's transaction, so a rolled-back invite leaves no usable token behind.
    const token = invites[0]!.data.token as string;
    expect(typeof token).toBe('string');

    const db = await testDatabase();
    const rows = await db.select().from(authTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tokenHash: hashToken(token), email: 'new@northlinerealty.com', purpose: 'invite' });
    // § 7.5: "`purpose:'invite'` tokens valid for 7 days".
    expect(rows[0]!.expiresAt.getTime()).toBe(NOW + INVITE_TTL_MS);
  });
});

// ------------------------------------------------------------------------------------------------
// § 9.4 · CSRF
// ------------------------------------------------------------------------------------------------

describe('§ 9.4 · a mutation requires JSON and a matching Origin @g7', () => {
  beforeEach(seeded);

  const step = { moduleId: 'sales', stepId: 'c4' };

  it('403s a mutation posted from another origin', async () => {
    const cookie = await app.signInAs('u_jamie');
    const before = await loadDb();
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: step,
      headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'That request came from another origin.' });
    expect(await loadDb()).toEqual(before);
  });

  it('415s a mutation that is not application/json', async () => {
    // The half that actually closes the hole: the only cross-origin POST a browser sends without
    // a preflight is an HTML form, and a form can only send urlencoded, multipart or text/plain.
    const cookie = await app.signInAs('u_jamie');
    const res = await app.inject({ method: 'POST', url: '/api/mutate/toggleStep', headers: { cookie, origin: ORIGIN } });
    expect(res.statusCode).toBe(415);
    expect(res.json()).toEqual({ error: 'A mutation requires content-type: application/json.' });
  });

  it('accepts the request the browser actually sends, parameters and all', async () => {
    const cookie = await app.signInAs('u_jamie');
    // `charset` on the content-type is legal — `fetch` does not add one, but a proxy may — so
    // comparing the WHOLE header value to `application/json` would reject a valid request.
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: step,
      headers: { cookie, origin: ORIGIN, 'content-type': 'application/json; charset=utf-8' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts APP_URL as an origin, for a proxy that rewrites Host', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: step,
      headers: { cookie, origin: 'https://learn.example.com', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('allows an ABSENT Origin, which is how every non-browser client calls it', async () => {
    // The documented departure from § 9.4's wording (see `auth/guard.ts`). A browser always sends
    // Origin on a POST, so "absent" means curl, a smoke test, or `app.inject` — which is how Gate
    // 7's own oracle snippet calls every mutation, with no `origin` header at all.
    const cookie = await app.signInAs('u_jamie');
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: step,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('403s the literal string `null`, which a sandboxed iframe sends', async () => {
    // `new URL('null')` throws, and treating that as "no origin" would reopen the hole for exactly
    // the case a sandboxed frame produces.
    const cookie = await app.signInAs('u_jamie');
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleStep',
      payload: step,
      headers: { cookie, origin: 'null', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('answers 401 before 415, so the authorization matrix sees a 401', async () => {
    // Gate 7's line is "An unauthenticated call … returns 401", and a test that sends no body has
    // no content-type either. `requireSession` runs first for exactly this reason.
    const res = await app.inject({ method: 'POST', url: '/api/mutate/toggleStep' });
    expect(res.statusCode).toBe(401);
  });
});

// ------------------------------------------------------------------------------------------------
// § 7.6 · GET /api/events
// ------------------------------------------------------------------------------------------------

describe('GET /api/events @g7', () => {
  beforeEach(seeded);

  it('broadcasts `changed` after each commit, and drains on shutdown', async () => {
    // Over a real socket. An SSE response never ends, and `inject` buffers until it does, so the
    // only way to observe a frame mid-stream is to read one.
    const address = await app.listen({ host: '127.0.0.1', port: 0 });

    const res = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = httpGet(`${address}/api/events`, resolve);
      req.on('error', reject);
    });

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/event-stream');
    // Railway's proxy buffers a response by default, which for SSE means the client receives
    // nothing until the buffer fills — i.e. never.
    expect(res.headers['x-accel-buffering']).toBe('no');

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk: string) => {
      body += chunk;
    });
    const ended = new Promise<void>((resolve) => res.on('end', resolve));

    await waitFor('the retry hint', () => body.includes('retry: 3000'));
    await waitFor('the hub to see the client', () => app.events!.clients() === 1);

    const cookie = await app.signInAs('u_jamie');
    const mutated = await mutate('toggleStep', { moduleId: 'sales', stepId: 'c4' }, cookie);
    expect(mutated.statusCode).toBe(200);

    await waitFor('the changed event', () => body.includes('event: changed'));
    // `http.test.ts` listens for exactly `changed`. The `data:` line is what makes the browser
    // dispatch it at all: `EventSource` discards an event whose data buffer is empty.
    expect(body).toContain('event: changed\ndata:\n\n');

    // § 9.4: "close Fastify, drain SSE". The drain is a `preClose` hook, so a plain `close()` is
    // enough — and must be, because on `onClose` this line hangs forever: Fastify waits for the
    // active connection before running the hook that was supposed to end it.
    await app.close();
    await ended;
    expect(app.events!.clients()).toBe(0);
  });

  it('does not broadcast when the mutation was refused', async () => {
    const cookie = await app.signInAs('u_jamie');
    let broadcasts = 0;
    const real = app.events!.broadcast;
    Object.defineProperty(app.events!, 'broadcast', {
      value: () => {
        broadcasts++;
        real.call(app.events!);
      },
    });

    await mutate('inviteMember', { email: 'nope', role: 'Sales Agent' }, await app.signInAs('u_alex'));
    expect(broadcasts).toBe(0);

    await mutate('toggleStep', { moduleId: 'sales', stepId: 'c4' }, cookie);
    expect(broadcasts).toBe(1);
  });
});

// ------------------------------------------------------------------------------------------------
// § 7.7 · the test-only routes
// ------------------------------------------------------------------------------------------------

describe('§ 7.7 · the test-only routes @g7', () => {
  beforeEach(seeded);

  it('signs a test in as a persona under NODE_ENV=test', async () => {
    const lastOfAlex = async () =>
      (await (await testDatabase()).select({ last: users.last }).from(users).where(eq(users.id, 'u_alex')))[0]!.last;
    const seededLast = await lastOfAlex();
    const res = await app.inject({ method: 'POST', url: '/api/test/session', payload: { userId: 'u_alex' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, userId: 'u_alex' });

    const cookie = String(res.headers['set-cookie']).split(';')[0]!;
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.json()).toMatchObject({ viewer: { actor: { kind: 'learner', userId: 'u_alex' }, role: 'owner' } });
    // Not a sign-in by the person, so no Last Active stamp (D-145): the http parity run signs in
    // this way, and its Team Hub and Learners screenshots show the seed's values.
    expect(await lastOfAlex()).toBe(seededLast);
  });

  it('refuses an id that is not a user', async () => {
    // A 200 here would hand a test a cookie that 401s on the next request, and the failure would
    // point at `requireSession`.
    expect((await app.inject({ method: 'POST', url: '/api/test/session', payload: { userId: 'nobody' } })).statusCode).toBe(
      404,
    );
    expect((await app.inject({ method: 'POST', url: '/api/test/session', payload: {} })).statusCode).toBe(400);
  });

  it('serves the outbox', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/test/outbox' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ messages: [] });
  });

  it('matches only the exact string `test`', () => {
    expect(isTestEnv({ NODE_ENV: 'test' })).toBe(true);
    for (const value of ['production', 'development', 'testing', 'TEST', 'Test', 'test ', ' test', '', undefined]) {
      expect(isTestEnv({ NODE_ENV: value }), JSON.stringify(value)).toBe(false);
    }
  });

  it('DOES NOT EXIST in any other environment', async () => {
    // The worst bug this phase could ship: `POST /api/test/session { userId: 'st1' }` is an
    // unauthenticated route that hands back an Operations Lead's session cookie.
    const savedNodeEnv = process.env.NODE_ENV;
    const savedSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'a'.repeat(48);
    try {
      for (const value of ['production', 'development', 'testing', 'TEST', 'test ', undefined]) {
        if (value === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = value;

        const other = await build({ logger: false });
        try {
          const label = JSON.stringify(value);
          const session = await other.inject({ method: 'POST', url: '/api/test/session', payload: { userId: 'st1' } });
          expect(session.statusCode, label).toBe(404);
          expect((await other.inject({ method: 'GET', url: '/api/test/outbox' })).statusCode, label).toBe(404);
          // And `signInAs` refuses too, so a script that imported `build` cannot mint one either.
          await expect(other.signInAs('st1')).rejects.toThrow(/NODE_ENV/);
          // The real routes are still there: this is a guard on two routes, not a kill switch.
          expect((await other.inject({ method: 'GET', url: '/api/snapshot' })).statusCode, label).toBe(401);
        } finally {
          await other.close();
        }
      }
    } finally {
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;
      if (savedSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = savedSecret;
    }
  });
});

// ------------------------------------------------------------------------------------------------
// § 9.4 · hardening
// ------------------------------------------------------------------------------------------------

describe('§ 9.4 · the Content-Security-Policy @g7', () => {
  it('sets the five directives the phase file lists, and no Google domain', async () => {
    const csp = String((await app.inject({ method: 'GET', url: '/api/health' })).headers['content-security-policy']);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("media-src 'self' blob:");
    expect(csp).toContain("connect-src 'self'");
    // `data:` too (D-137): a stylesheet's inlined font is a `data:` URL, and without it the console
    // logged a blocked font on every load. Still no network origin but our own.
    expect(csp).toContain("font-src 'self' data:");
    // "Self-hosted fonts mean no Google domains." helmet's own default `font-src` is
    // `'self' https: data:`, and the `https:` is what would have let one back in.
    expect(csp).not.toMatch(/font-src[^;]*https:/);
    expect(csp).not.toContain('googleapis');
    expect(csp).not.toContain('gstatic');
    // `script-src` must not be loosened to unblock the pre-paint theme script; a hash is.
    expect(csp).toMatch(/script-src[^;]*'self'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('allows an inline script by hash, not by `unsafe-inline`', async () => {
    const html = '<script>document.documentElement.dataset.theme = "dark";</script>';
    const hashes = inlineScriptHashes(html);
    const expected = `'sha256-${createHash('sha256').update('document.documentElement.dataset.theme = "dark";').digest('base64')}'`;
    expect(hashes).toEqual([expected]);

    const hashed = await build({ logger: false, inlineScriptHashes: hashes });
    try {
      const csp = String((await hashed.inject({ method: 'GET', url: '/api/health' })).headers['content-security-policy']);
      expect(csp).toContain(expected);
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    } finally {
      await hashed.close();
    }
  });

  it('hashes only inline scripts', () => {
    // A `<script src>` is not inline and contributes nothing; an empty one has no body to hash.
    expect(inlineScriptHashes('<script src="/assets/main.js" type="module"></script>')).toEqual([]);
    expect(inlineScriptHashes('<script></script>')).toEqual([]);
    expect(inlineScriptHashes('<p>no scripts here</p>')).toEqual([]);
    expect(inlineScriptHashes('<script>a</script><script>b</script>')).toHaveLength(2);
  });

  it('hashes an inline MODULE script, which is how the /ai101 page ships its code', () => {
    // D-028: the page's build inlines its one `<script type="module">` so a visitor on venue Wi-Fi
    // makes one request. CSP hashes apply to module scripts exactly as to classic ones, so the
    // attribute must not be mistaken for a `src` — only a `src` makes a script not inline.
    const body = 'import.meta;document.body.dataset.ready="1";';
    const expected = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    expect(inlineScriptHashes(`<script type="module">${body}</script>`)).toEqual([expected]);
    expect(inlineScriptHashes(`<script type="module" crossorigin>${body}</script>`)).toEqual([expected]);
  });

  it('allows BOTH pages’ inline scripts under the one policy every response carries', async () => {
    // `server.ts` passes `cspScriptHashes([index.html, ai101.html])`. The CSP is one header for the
    // whole app, so the SPA's theme script and the /ai101 page's module script must both be in
    // it, from whichever page — and a page that has not been built contributes nothing.
    const spa = '<html><head><script>document.documentElement.dataset.theme = "dark";</script></head></html>';
    const ai101 = '<html><body><main></main><script type="module">console.log("ai101")</script></body></html>';
    const both = cspScriptHashes([spa, ai101]);
    expect(both).toEqual([...inlineScriptHashes(spa), ...inlineScriptHashes(ai101)]);
    expect(both).toHaveLength(2);
    // De-duplicated, and tolerant of a page that is not there.
    expect(cspScriptHashes([spa, spa, null, undefined])).toEqual(inlineScriptHashes(spa));
    expect(cspScriptHashes([null, null])).toEqual([]);

    const served = await build({ logger: false, inlineScriptHashes: both, ai101Page: ai101 });
    try {
      for (const url of ['/api/health', '/ai101']) {
        const csp = String((await served.inject({ method: 'GET', url })).headers['content-security-policy']);
        for (const hash of both) expect(csp, url).toContain(hash);
        expect(csp, url).not.toMatch(/script-src[^;]*'unsafe-inline'/);
      }
    } finally {
      await served.close();
    }
  });

  it('keeps the video host out of the policy until one is configured', () => {
    // § 9.4 writes `https://*.YOUR_VIDEO_HOST`, a placeholder the phase files never resolve.
    expect(cspDirectives([], {} as NodeJS.ProcessEnv)['img-src']).toEqual(["'self'", 'data:']);
    const withHost = cspDirectives([], { VIDEO_HOST: 'videodelivery.net' } as NodeJS.ProcessEnv);
    expect(withHost['img-src']).toEqual(["'self'", 'data:', 'https://*.videodelivery.net']);
    expect(withHost['media-src']).toEqual(["'self'", 'blob:', 'https://*.videodelivery.net']);
  });

  // D-188: the Vault and the Week Builder PUT a file straight to the bucket from the browser.
  it('allows the bucket’s origin in connect-src, from the storage config, and nothing without one', async () => {
    const S3 = { S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000', S3_SECRET_ACCESS_KEY: 'x', S3_BUCKET: 'ailms-production', S3_ENDPOINT: 'https://storage.railway.app' };
    expect(cspDirectives([], {} as NodeJS.ProcessEnv)['connect-src']).toEqual(["'self'"]);
    expect(cspDirectives([], S3 as NodeJS.ProcessEnv)['connect-src']).toEqual(["'self'", 'https://storage.railway.app']);
    expect(cspDirectives([], { ...S3, S3_URL_STYLE: 'virtual' } as NodeJS.ProcessEnv)['connect-src']).toEqual(["'self'", 'https://ailms-production.storage.railway.app']);
    // A half-set config (no bucket) adds nothing rather than a guess.
    expect(cspDirectives([], { S3_ENDPOINT: 'https://storage.railway.app' } as NodeJS.ProcessEnv)['connect-src']).toEqual(["'self'"]);
    // media-src is unchanged: videos are streamed same-origin (`/api/files/...`), never from the bucket.
    expect(cspDirectives([], S3 as NodeJS.ProcessEnv)['media-src']).toEqual(["'self'", 'blob:']);

    // And on a response, from the API's own environment.
    const saved = Object.fromEntries(Object.keys(S3).map((k) => [k, process.env[k]]));
    Object.assign(process.env, S3);
    const served = await build({ logger: false });
    try {
      const csp = String((await served.inject({ method: 'GET', url: '/api/health' })).headers['content-security-policy']);
      expect(csp).toContain("connect-src 'self' https://storage.railway.app");
      expect(csp).toContain("media-src 'self' blob:;");
    } finally {
      await served.close();
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe('§ 9.4 · the global rate limit @g7', () => {
  it('allows 100 a minute and refuses the 101st', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 101; i++) {
      codes.push((await app.inject({ method: 'GET', url: '/api/health' })).statusCode);
    }
    expect(codes.filter((c) => c === 200)).toHaveLength(100);
    expect(codes[100]).toBe(429);
    // `{ error }`, because `apps/web/src/data/http.ts` reads `body.error` to build its message.
    const limited = await app.inject({ method: 'GET', url: '/api/health' });
    expect(Object.keys(limited.json() as object)).toEqual(['error']);
  });
});

describe('§ 9.4 · the log and the cookie @g7', () => {
  it('never puts a magic-link token in the log', () => {
    // Fastify logs `req.url`, and both of § 7.5's links carry a bearer credential that stays valid
    // for 15 minutes or 7 days. Without this the log file is a list of working sign-ins.
    expect(scrubUrl('/sign-in?token=abc123')).toBe('/sign-in?token=REDACTED');
    expect(scrubUrl('/invite/abc123')).toBe('/invite/:token');
    expect(scrubUrl('/invite/abc123?ref=email')).toBe('/invite/:token?ref=email');
    // § 9.4 names emails in URLs and presigned URLs in the same sentence.
    expect(scrubUrl('/x?email=a@b.co')).toBe('/x?email=REDACTED');
    // D-139: Google's callback carries a one-time code and the CSRF state.
    expect(scrubUrl('/api/auth/google/callback?state=s1&code=4%2F0Ab&scope=email')).toBe('/api/auth/google/callback?state=REDACTED&code=REDACTED&scope=email');
    expect(scrubUrl('/f?X-Amz-Signature=deadbeef')).toBe('/f?X-Amz-Signature=REDACTED');
    // Everything else is left exactly as it was, byte for byte.
    expect(scrubUrl('/api/snapshot')).toBe('/api/snapshot');
    expect(scrubUrl('/api/mutate/toggleStep?a=1&b=2')).toBe('/api/mutate/toggleStep?a=1&b=2');
    expect(scrubUrl('/invitees/abc')).toBe('/invitees/abc');
  });

  it('pins Secure on the session cookie in production', () => {
    // `'auto'` elsewhere, because a `Secure` cookie is dropped over plain http and local
    // development runs on `http://localhost:3000`.
    expect(sessionCookieOptions({ NODE_ENV: 'production' } as NodeJS.ProcessEnv).secure).toBe(true);
    expect(sessionCookieOptions({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).secure).toBe('auto');
    expect(sessionCookieOptions({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      path: '/',
    });
  });
});

// ================================================================================================
// THIS DESCRIBE MUST STAY LAST IN THE FILE.
//
// `shutdown()` ends the connection POOL (`db/client.ts`'s `close`), and that pool is the one
// `test/helpers.ts` pointed at this worker's database — so every `resetDatabase` after it would
// fail with `CONNECTION_ENDED`. Measured: moving this above the other suites turned eight of them
// red for a reason that had nothing to do with what they test. The harness's own `afterAll`
// already tolerates a closed pool, so being last is enough; anything appended BELOW this will not
// be.
// ================================================================================================

describe('§ 9.4 · graceful shutdown @g7', () => {
  beforeEach(seeded);

  it('drains the stream, settles the mail, and releases the pool', async () => {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const res = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = httpGet(`${address}/api/events`, resolve);
      req.on('error', reject);
    });
    res.resume();
    const ended = new Promise<void>((resolve) => res.on('end', resolve));
    await waitFor('the hub to see the client', () => app.events!.clients() === 1);

    // A sign-in request answers before it has minted or sent anything, so at the instant SIGTERM
    // arrives there can be a link half-written. `shutdown` settles that queue FIRST; closing first
    // would leave the learner waiting for an email that was never sent.
    await app.inject({ method: 'POST', url: '/api/auth/request', payload: { email: 'jamie@ortizhomes.com' } });

    await shutdown(app);

    await ended;
    expect(app.events!.clients()).toBe(0);
    // The outbox is read directly rather than through `/api/test/outbox`: the server is closed.
    expect(outbox().filter((m) => m.template === 'sign-in')).toHaveLength(1);
  });
});
