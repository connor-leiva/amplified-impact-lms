// The public /ai101 page, its redirects and its December waitlist — DECISIONS.md D-028, over HTTP.
//
// `routes/ai101.ts` carries the arguments; this file is what holds each of them to a measurement.
// The ones that would fail silently in production rather than loudly in a test are:
//
//   1. THE PAGE IS EXEMPT FROM § 9.4's LIMIT. A conference room behind one NAT address opening the
//      page in the same minute is the case the spec is written for; under the global 100/minute the
//      101st attendee gets a 429 instead of the prompts. Proved with 120 requests from one address.
//   2. THE WAITLIST EXISTS IN FIXTURE MODE WHEN A DATABASE DOES. Production is fixture mode WITH a
//      database, so a route keyed on `fixtureOnly` would be missing from the one deploy that needs
//      it — and present-and-throwing on the database-less demo deploy if keyed on nothing.
//   3. THE NO-JS FORM POST IS NOT A 403. A plain form POST under helmet's `no-referrer` carries
//      `Origin: null`, which the same-origin check refuses on purpose. The page's response sets
//      `Referrer-Policy: same-origin` so a real browser sends the real origin; both halves are here.
//   4. THE VISITOR'S ADDRESS NEVER REACHES THE LOG, including on a failed insert — where drizzle's
//      error message carries every bound parameter. Proved by making the insert fail for real.
//   5. THE MESSAGES ARE THE PAGE'S OWN. The script shows a 400's `error` under the field, so each is
//      asserted as a literal here, not through the route's constant (the `routes/join.ts`
//      arrangement: two copies that cannot drift together).
//
// A fresh `build()` per test, like every suite in this directory: `@fastify/rate-limit`'s store is
// per-instance, and two of these tests spend a whole budget on purpose. The database is truncated
// before every waitlist test (`resetDatabase()` with no snapshot: this table is the only one read).

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { build, cspScriptHashes } from '../src/app';
import type { App, BuildOptions } from '../src/app';
import { ai101Waitlist } from '../src/db/schema';
import { ai101Location, etagMatches, pageEtag, validateWaitlist } from '../src/routes/ai101';
import { foldLine, SPRINT_ICS } from '../src/routes/ai101-calendar';
import { resetDatabase, testDatabase } from './helpers';

/** § 7.7's pinned instant, so `created_at` can be compared with `toBe`. */
const NOW = Date.parse('2026-10-08T09:00:00-05:00');

/**
 * A stand-in for `dist/ai101.html` with what matters about the real one: an inline module script
 * (which the CSP must hash), a non-ASCII character (so a byte length and a character length differ)
 * and the form the no-JS path posts.
 */
const PAGE = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AI 101 for Agents</title></head>',
  '<body data-app-ready="true"><main><h1>Sounds Like You, Looks Like You</h1>',
  '<p>eXpCon 2026 · AI 101 for Agents</p>',
  '<form id="waitlist-form" method="post" action="/api/ai101/waitlist"></form></main>',
  '<script type="module">document.querySelector("form").noValidate = true;</script></body></html>',
].join('');

/** The Origin a same-origin browser request carries: `light-my-request`'s default Host is `localhost`. */
const ORIGIN = 'http://localhost';

const WAITLIST = '/api/ai101/waitlist';

let app: App;

/** A fresh app per test; `opts` override the default of "page built, real API". */
const fresh = async (opts: BuildOptions = {}): Promise<App> => {
  app = await build({ logger: false, ai101Page: PAGE, ...opts });
  return app;
};

/** What the page's script sends. */
const postJson = (payload: unknown, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: WAITLIST,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
  });

/** What a browser with no script sends: the form, urlencoded, from this origin. */
const postForm = (fields: Record<string, string>, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: WAITLIST,
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN, ...headers },
  });

const rows = async () => (await testDatabase()).select().from(ai101Waitlist).orderBy(ai101Waitlist.email);

const valid = { firstName: 'Pat', email: 'pat@example.com', brokerage: 'Northline Realty', website: '', src: 'qr' };

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  // Pay for CREATE DATABASE and the migration once, in the hook with the 60 s budget.
  await testDatabase();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

beforeEach(() => {
  // `clock.ts` reads it per call, so it is re-set per test rather than trusted from `beforeAll`.
  process.env.FIXED_NOW = new Date(NOW).toISOString();
});

afterEach(async () => {
  // `close()`, never `shutdown()`: `shutdown` releases the pool `test/helpers.ts` owns.
  await app?.close();
});

// ================================================================================================
// The page
// ================================================================================================

describe('GET /ai101 · the page (D-028) @g9', () => {
  it('serves the built page whole, as HTML, revalidated on every visit @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: '/ai101' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(PAGE);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    // `no-cache` is "revalidate", not "do not store": a revisit is a bodiless 304.
    expect(res.headers['cache-control']).toBe('no-cache');
    // A STRONG validator over the exact bytes: quoted, no `W/`, and the sha256 of the page.
    const expected = `"${createHash('sha256').update(PAGE, 'utf8').digest('base64url')}"`;
    expect(res.headers.etag).toBe(expected);
    expect(pageEtag(PAGE)).toBe(expected);
  });

  it('sets Referrer-Policy: same-origin on the page and nowhere else @g9', async () => {
    // Without it a no-JS form post carries `Origin: null` and is refused (see the waitlist suite).
    await fresh();
    expect((await app.inject({ method: 'GET', url: '/ai101' })).headers['referrer-policy']).toBe('same-origin');
    // Every other response keeps helmet's default — the override is the page's, not the app's.
    expect((await app.inject({ method: 'GET', url: '/api/health' })).headers['referrer-policy']).toBe('no-referrer');
  });

  it('answers the same bytes whatever the query string says @g9', async () => {
    // The spec: `?src=qr` "must not change the page content". The attribution is the script's to
    // read from `location.search`, never the server's to render.
    await fresh();
    const plain = await app.inject({ method: 'GET', url: '/ai101' });
    for (const url of ['/ai101?src=qr', '/ai101?src=qr&utm_source=slide', '/ai101?src=<script>']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(200);
      expect(res.body, url).toBe(plain.body);
      expect(res.headers.etag, url).toBe(plain.headers.etag);
    }
  });

  it('answers 304 to a matching If-None-Match, weak or strong, and 200 otherwise @g9', async () => {
    await fresh();
    const etag = String((await app.inject({ method: 'GET', url: '/ai101' })).headers.etag);
    // `W/` because Railway's edge gzips this response, and a compressing proxy may weaken the
    // validator on the way out; RFC 9110 has If-None-Match compare weakly for exactly this reason.
    for (const header of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
      const res = await app.inject({ method: 'GET', url: '/ai101?src=qr', headers: { 'if-none-match': header } });
      expect(res.statusCode, header).toBe(304);
      expect(res.body, header).toBe('');
      expect(res.headers.etag, header).toBe(etag);
      expect(res.headers['cache-control'], header).toBe('no-cache');
    }
    const stale = await app.inject({ method: 'GET', url: '/ai101', headers: { 'if-none-match': '"not-this-page"' } });
    expect(stale.statusCode).toBe(200);
    expect(stale.body).toBe(PAGE);
  });

  it('answers HEAD with the headers and no body @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'HEAD', url: '/ai101' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('');
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    // Bytes, not characters: the page has a `·` in it.
    expect(Number(res.headers['content-length'])).toBe(Buffer.byteLength(PAGE, 'utf8'));
    expect(res.headers.etag).toBe(pageEtag(PAGE));
  });

  it('answers a JSON 404 when no page has been built @g9', async () => {
    // A checkout nobody built, and the shape every other suite in this directory builds. The route
    // still exists, so it never falls through to the SPA's not-found screen.
    for (const ai101Page of [undefined, null]) {
      const unbuilt = await build({ logger: false, ai101Page });
      try {
        const res = await unbuilt.inject({ method: 'GET', url: '/ai101' });
        expect(res.statusCode, String(ai101Page)).toBe(404);
        expect(res.json()).toEqual({ error: 'Not found' });
      } finally {
        await unbuilt.close();
      }
    }
  });

  it("is served under a CSP that admits the page's inline module script by hash @g9", async () => {
    // `server.ts` passes `cspScriptHashes([index.html, ai101.html])`. Without the page's hash every
    // copy button on it is dead, silently: a blocked script throws nothing the server can see.
    const body = 'document.querySelector("form").noValidate = true;';
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    expect(cspScriptHashes([PAGE])).toEqual([hash]);

    await fresh({ inlineScriptHashes: cspScriptHashes([PAGE]) });
    const csp = String((await app.inject({ method: 'GET', url: '/ai101' })).headers['content-security-policy']);
    expect(csp).toContain(`script-src 'self' ${hash}`);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    // The form posts to this origin, and helmet's default `form-action 'self'` is what allows it.
    expect(csp).toContain("form-action 'self'");
  });

  it('is exempt from § 9.4\'s global limit: 120 visits from one address all load @g9', async () => {
    await fresh();
    const venue = { 'x-forwarded-for': '198.51.100.22' };
    const codes: number[] = [];
    for (let i = 0; i < 120; i++) {
      const res = await app.inject({ method: 'GET', url: '/ai101?src=qr', headers: venue });
      codes.push(res.statusCode);
      // No limiter ran at all, so it reported no budget.
      if (i === 0) expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
    expect(codes.filter((c) => c !== 200)).toEqual([]);
    // And none of that was spent from the global budget the rest of the app shares.
    const health = await app.inject({ method: 'GET', url: '/api/health', headers: venue });
    expect(health.statusCode).toBe(200);
    expect(health.headers['x-ratelimit-remaining']).toBe('99');
  });
});

// ================================================================================================
// The redirects
// ================================================================================================

describe('the /ai101 redirects (D-028) @g9', () => {
  it('sends /AI101, /ai-101 and /ai101/ to /ai101 with a 301 @g9', async () => {
    await fresh();
    for (const alias of ['/AI101', '/ai-101', '/ai101/']) {
      const res = await app.inject({ method: 'GET', url: alias });
      expect(res.statusCode, alias).toBe(301);
      expect(res.headers.location, alias).toBe('/ai101');
    }
  });

  it('keeps the query string exactly as it arrived @g9', async () => {
    // `?src=qr` is the attribution the QR code exists to carry; re-serializing could reorder or
    // re-encode it, so it is passed through byte for byte.
    await fresh();
    for (const alias of ['/AI101', '/ai-101', '/ai101/']) {
      for (const query of ['?src=qr', '?src=qr&utm_source=slide', '?a=%20b+c&a=d']) {
        const res = await app.inject({ method: 'GET', url: `${alias}${query}` });
        expect(res.statusCode, alias + query).toBe(301);
        expect(res.headers.location, alias + query).toBe(`/ai101${query}`);
      }
    }
    expect(ai101Location('/AI101')).toBe('/ai101');
    expect(ai101Location('/ai-101?src=qr')).toBe('/ai101?src=qr');
  });

  it('answers HEAD the same way, and is exempt from the global limit too @g9', async () => {
    await fresh();
    expect((await app.inject({ method: 'HEAD', url: '/AI101?src=qr' })).headers.location).toBe('/ai101?src=qr');
    const codes: number[] = [];
    for (let i = 0; i < 110; i++) {
      codes.push((await app.inject({ method: 'GET', url: '/AI101', headers: { 'x-forwarded-for': '198.51.100.23' } })).statusCode);
    }
    expect(codes.filter((c) => c !== 301)).toEqual([]);
  });
});

// ================================================================================================
// The waitlist
// ================================================================================================

describe('POST /api/ai101/waitlist · what the page script sends (D-028) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it('stores a sign-up under the server-side source and answers 201 @g9', async () => {
    const res = await postJson({ ...valid, firstName: '  Pat  ', email: '  Pat@Example.COM ', brokerage: ' Northline Realty ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });

    const [row, ...rest] = await rows();
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      firstName: 'Pat',
      // Trimmed and lower-cased: the unique index is then "the same person", not the same keystrokes.
      email: 'pat@example.com',
      brokerage: 'Northline Realty',
      source: 'expcon-2026-ai101',
      src: 'qr',
      createdAt: NOW,
    });
    expect(row!.id).toMatch(/^wl/);
  });

  it('takes the source from the server, never from the body @g9', async () => {
    expect((await postJson({ ...valid, source: 'some-other-event' })).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source)).toEqual(['expcon-2026-ai101']);
  });

  it('stores an empty brokerage as null, and drops a src that is not a short slug @g9', async () => {
    // A mangled attribution tag never costs a sign-up: it is simply not recorded.
    const cases: [Record<string, unknown>, string | null][] = [
      [{ email: 'a@example.com', brokerage: '', src: 'qr' }, 'qr'],
      [{ email: 'b@example.com', brokerage: '   ', src: 'not a slug!' }, null],
      [{ email: 'c@example.com', src: 'x'.repeat(33) }, null],
      [{ email: 'd@example.com', src: 'Slide_2-b' }, 'Slide_2-b'],
      [{ email: 'e@example.com', brokerage: null, src: null }, null],
      [{ email: 'f@example.com' }, null],
    ];
    for (const [body] of cases) {
      const res = await postJson({ firstName: 'Pat', ...body });
      expect(res.statusCode, JSON.stringify(body)).toBe(201);
    }
    const stored = await rows();
    expect(stored.map((r) => r.src)).toEqual(cases.map(([, src]) => src));
    expect(stored.map((r) => r.brokerage)).toEqual(cases.map(() => null));
  });

  it("refuses each field with the page's own message, and stores nothing @g9", async () => {
    const firstName = { error: 'Enter your first name.', field: 'firstName' };
    const email = { error: 'Enter a valid email address.', field: 'email' };
    const brokerage = { error: 'Enter a brokerage name under 120 characters.', field: 'brokerage' };
    const cases: [Record<string, unknown>, object][] = [
      [{ ...valid, firstName: undefined }, firstName],
      [{ ...valid, firstName: '' }, firstName],
      [{ ...valid, firstName: '    ' }, firstName],
      [{ ...valid, firstName: 'x'.repeat(81) }, firstName],
      [{ ...valid, email: undefined }, email],
      [{ ...valid, email: '' }, email],
      [{ ...valid, email: 'pat' }, email],
      [{ ...valid, email: 'pat@example' }, email],
      [{ ...valid, email: 'pat@example.c' }, email],
      [{ ...valid, email: 'pat lee@example.com' }, email],
      [{ ...valid, email: 'pat@@example.com' }, email],
      [{ ...valid, email: `${'p'.repeat(243)}@example.com` }, email], // 255 characters
      [{ ...valid, brokerage: 'b'.repeat(121) }, brokerage],
      // The first failing field in form order wins: it is the one the page focuses.
      [{ ...valid, firstName: '', email: 'nope', brokerage: 'b'.repeat(121) }, firstName],
      [{ ...valid, email: 'nope', brokerage: 'b'.repeat(121) }, email],
    ];
    for (const [body, expected] of cases) {
      const res = await postJson(body);
      expect(res.statusCode, JSON.stringify(body).slice(0, 80)).toBe(400);
      expect(res.json(), JSON.stringify(body).slice(0, 80)).toEqual(expected);
    }
    expect(await rows()).toEqual([]);
  });

  it('accepts every field at its exact limit @g9', async () => {
    const atLimit = {
      firstName: 'x'.repeat(80),
      email: `${'p'.repeat(242)}@example.com`, // 254 characters
      brokerage: 'b'.repeat(120),
    };
    expect(atLimit.email).toHaveLength(254);
    expect((await postJson(atLimit)).statusCode).toBe(201);
    expect(await rows()).toHaveLength(1);
  });

  it('answers a filled honeypot exactly as a success, and stores nothing @g9', async () => {
    // Even when the rest is invalid: a 400 would tell the bot which field to fix.
    for (const body of [{ ...valid, website: 'https://spam.example' }, { firstName: '', email: 'x', website: 'x' }]) {
      const res = await postJson(body);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ ok: true });
    }
    expect(await rows()).toEqual([]);
  });

  it('answers a duplicate as a success and keeps one row — the first @g9', async () => {
    // Same answer either way: "already on the list" would tell anyone which addresses are.
    expect((await postJson({ ...valid, firstName: 'Pat' })).statusCode).toBe(201);
    const again = await postJson({ ...valid, firstName: 'Patricia', email: 'PAT@example.com' });
    expect(again.statusCode).toBe(201);
    expect(again.json()).toEqual({ ok: true });
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.firstName).toBe('Pat');
  });

  it('stores two different people under a pinned clock @g9', async () => {
    // `newIds()` would hand both requests the same deterministic id under FIXED_NOW, and the second
    // insert would be a primary-key violation — a 500 in every http-mode suite. The route uses
    // `randomIds()` for exactly this reason.
    expect(process.env.FIXED_NOW).toBe(new Date(NOW).toISOString());
    expect((await postJson({ ...valid, email: 'one@example.com' })).statusCode).toBe(201);
    expect((await postJson({ ...valid, email: 'two@example.com' })).statusCode).toBe(201);
    const stored = await rows();
    expect(stored.map((r) => r.email)).toEqual(['one@example.com', 'two@example.com']);
    expect(new Set(stored.map((r) => r.id)).size).toBe(2);
  });

  it('403s another origin and the literal `null`, and lets an absent Origin through @g9', async () => {
    for (const origin of ['https://evil.example', 'null']) {
      const res = await postJson(valid, { origin });
      expect(res.statusCode, origin).toBe(403);
      expect(res.json()).toEqual({ error: 'That request came from another origin.' });
    }
    expect(await rows()).toEqual([]);
    // curl, a smoke test, `app.inject` with no header — no ambient cookie to ride, so no CSRF vector.
    const absent = await app.inject({ method: 'POST', url: WAITLIST, payload: valid });
    expect(absent.statusCode).toBe(201);
  });

  it('415s anything that is neither JSON nor a form @g9', async () => {
    for (const [type, payload] of [
      ['text/plain', 'firstName=Pat&email=pat@example.com'],
      ['multipart/form-data; boundary=x', '--x--'],
    ] as const) {
      const res = await app.inject({ method: 'POST', url: WAITLIST, payload, headers: { 'content-type': type, origin: ORIGIN } });
      expect(res.statusCode, type).toBe(415);
    }
    expect((await app.inject({ method: 'POST', url: WAITLIST, headers: { origin: ORIGIN } })).statusCode).toBe(415);
    expect(await rows()).toEqual([]);
  });

  it('400s a body that is not an object of strings, with no field to point at @g9', async () => {
    const res = await postJson({ ...valid, firstName: 42 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).not.toHaveProperty('field');
  });
});

describe('POST /api/ai101/waitlist · the no-JS form (D-028) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it('stores the sign-up and sends the browser back to the success line with a 303 @g9', async () => {
    // `+` and `%40` exactly as a browser's form encoder writes them.
    const res = await app.inject({
      method: 'POST',
      url: WAITLIST,
      payload: 'firstName=Pat+Lee&email=Pat%40Example.com&brokerage=&website=',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
    });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/ai101#waitlist-joined');
    expect(await rows()).toEqual([
      expect.objectContaining({ firstName: 'Pat Lee', email: 'pat@example.com', brokerage: null, src: null }),
    ]);
  });

  it('accepts the charset parameter some browsers add @g9', async () => {
    const res = await postForm(valid, { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/ai101#waitlist-joined');
  });

  it('sends an invalid form back to the error line, and stores nothing @g9', async () => {
    for (const fields of [{ ...valid, email: 'nope' }, { ...valid, firstName: '' }, {}]) {
      const res = await postForm(fields);
      expect(res.statusCode).toBe(303);
      expect(res.headers.location).toBe('/ai101#waitlist-error');
    }
    expect(await rows()).toEqual([]);
  });

  it('answers a filled honeypot and a duplicate as success @g9', async () => {
    const bot = await postForm({ ...valid, website: 'https://spam.example' });
    expect(bot.headers.location).toBe('/ai101#waitlist-joined');
    expect(await rows()).toEqual([]);

    expect((await postForm(valid)).headers.location).toBe('/ai101#waitlist-joined');
    expect((await postForm(valid)).headers.location).toBe('/ai101#waitlist-joined');
    expect(await rows()).toHaveLength(1);
  });

  it('is refused with `Origin: null` — which is why the page sets same-origin @g9', async () => {
    // Under helmet's `no-referrer` a real browser sends exactly this for a plain form POST. The
    // page's `Referrer-Policy: same-origin` (asserted above) is what makes it send `ORIGIN` instead.
    expect((await postForm(valid, { origin: 'null' })).statusCode).toBe(403);
    expect(await rows()).toEqual([]);
  });

  it('parses forms on this route only: everywhere else a form post is still 415 @g9', async () => {
    // The 415 is the half of § 9.4's CSRF rule that actually closes the hole (`auth/guard.ts`), so
    // the parser must not leak out of the waitlist's plugin. `/api/auth/request` is open and so
    // answers on its body rather than on a session.
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/request',
      payload: 'email=pat%40example.com',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
    });
    expect(res.statusCode).toBe(415);
  });
});

describe('the waitlist never logs a name or an address (D-028) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  /** An app whose JSON log lines land in `lines`. */
  const logged = async (lines: string[]) =>
    fresh({ logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } } });

  const NAME = 'Zephyrine';
  const ADDRESS = 'zephyrine.logcheck@example.com';

  it('not on success, a duplicate or a honeypot @g9', async () => {
    const lines: string[] = [];
    await logged(lines);
    const body = { ...valid, firstName: NAME, email: ADDRESS };
    expect((await postJson(body)).statusCode).toBe(201);
    expect((await postJson(body)).statusCode).toBe(201);
    expect((await postJson({ ...body, website: 'x' })).statusCode).toBe(201);
    const log = lines.join('');
    // The log is not empty — the sign-up IS recorded, by src and duplicate flag.
    expect(log).toContain('ai101 waitlist: sign-up recorded');
    expect(log).toContain('honeypot filled');
    expect(log.toLowerCase()).not.toContain(ADDRESS);
    expect(log).not.toContain(NAME);
  });

  it('not when the insert fails, where drizzle puts every parameter in the message @g9', async () => {
    // A real failure, not a mock: the table is renamed away for the duration of one request, so the
    // driver raises 42P01 and drizzle wraps it in `Failed query: … params: <name>,<address>,…`.
    // This database is private to this run and this worker slot (`test/helpers.ts`), and the
    // `finally` puts the table back before anything else in the file can run.
    const db = await testDatabase();
    const lines: string[] = [];
    await logged(lines);
    await db.execute(sql.raw('alter table "ai101_waitlist" rename to "ai101_waitlist_away"'));
    try {
      const json = await postJson({ ...valid, firstName: NAME, email: ADDRESS });
      expect(json.statusCode).toBe(500);
      expect(json.json()).toEqual({ error: 'Something went wrong.' });
      // A no-JS visitor lands on the page's error line, never on a JSON body.
      const form = await postForm({ ...valid, firstName: NAME, email: ADDRESS });
      expect(form.statusCode).toBe(303);
      expect(form.headers.location).toBe('/ai101#waitlist-error');
    } finally {
      await db.execute(sql.raw('alter table "ai101_waitlist_away" rename to "ai101_waitlist"'));
    }
    const log = lines.join('');
    expect(log).toContain('ai101 waitlist: insert failed');
    expect(log).toContain('42P01');
    expect(log.toLowerCase()).not.toContain(ADDRESS);
    expect(log).not.toContain(NAME);
  });
});

// ================================================================================================
// Which deploy gets what
// ================================================================================================

describe('the waitlist follows the database, not fixture mode (D-028) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('fixture mode with no database: the page and redirects serve, the waitlist is a 404 @g9', async () => {
    // The demo deploy. A 404, never a `DatabaseConfigError` on the first sign-up.
    await fresh({ fixtureOnly: true });
    expect((await app.inject({ method: 'GET', url: '/ai101' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/AI101?src=qr' })).headers.location).toBe('/ai101?src=qr');
    expect((await postJson(valid)).statusCode).toBe(404);
    expect(await rows()).toEqual([]);
  });

  it('fixture mode WITH a database — production — stores the sign-up @g9', async () => {
    await fresh({ fixtureOnly: true, waitlist: true });
    expect((await app.inject({ method: 'GET', url: '/ai101' })).statusCode).toBe(200);
    expect((await postJson(valid)).statusCode).toBe(201);
    expect(await rows()).toHaveLength(1);
    // And the fixture guard still holds for everything else.
    expect((await app.inject({ method: 'GET', url: '/api/snapshot' })).statusCode).toBe(404);
  });

  it('defaults to on for the real API, and can be switched off @g9', async () => {
    const off = await build({ logger: false, ai101Page: PAGE, waitlist: false });
    try {
      expect((await off.inject({ method: 'POST', url: WAITLIST, payload: valid })).statusCode).toBe(404);
    } finally {
      await off.close();
    }
    await fresh();
    expect((await postJson(valid)).statusCode).toBe(201);
  });
});

describe('the waitlist has its own rate limit (D-028) @g9', () => {
  it('lets 300 a minute through from one address — not § 9.4\'s 100 — and refuses the 301st @g9', async () => {
    // Honeypot submissions, so the budget is spent without a database write per request: the
    // limiter runs at `onRequest`, before the body is even parsed, so what the body says is
    // irrelevant to it. One venue address throughout.
    await fresh();
    const venue = { 'x-forwarded-for': '198.51.100.24' };
    const codes: number[] = [];
    for (let i = 0; i < 301; i++) codes.push((await postJson({ ...valid, website: 'x' }, venue)).statusCode);
    expect(codes.slice(0, 300).filter((c) => c !== 201)).toEqual([]);
    expect(codes[300]).toBe(429);
    // A separate bucket: the address's global 100 is untouched by all of that.
    expect((await app.inject({ method: 'GET', url: '/api/health', headers: venue })).statusCode).toBe(200);
  });
});

// ================================================================================================
// The pure halves
// ================================================================================================

describe('validateWaitlist and etagMatches (D-028) @g9', () => {
  it('normalizes a valid sign-up @g9', () => {
    expect(validateWaitlist({ firstName: ' Pat ', email: ' PAT@Example.com ', brokerage: '  ', src: ' qr ' })).toEqual({
      kind: 'valid',
      entry: { firstName: 'Pat', email: 'pat@example.com', brokerage: null, src: 'qr' },
    });
  });

  it('checks the honeypot before anything else @g9', () => {
    expect(validateWaitlist({ website: ' x ' })).toEqual({ kind: 'spam' });
    // Whitespace alone is an empty honeypot: a browser that autofills a space is not a bot.
    expect(validateWaitlist({ ...valid, website: '   ' }).kind).toBe('valid');
  });

  it('compares ETags weakly, as If-None-Match requires @g9', () => {
    expect(etagMatches(undefined, '"a"')).toBe(false);
    expect(etagMatches('', '"a"')).toBe(false);
    expect(etagMatches('"a"', '"a"')).toBe(true);
    expect(etagMatches('W/"a"', '"a"')).toBe(true);
    expect(etagMatches('"b", W/"a"', '"a"')).toBe(true);
    expect(etagMatches('*', '"a"')).toBe(true);
    expect(etagMatches('"b"', '"a"')).toBe(false);
    expect(etagMatches('"ab"', '"a"')).toBe(false);
  });
});

// ================================================================================================
// The sprint's calendar file (D-032)
// ================================================================================================

/**
 * The brief's logical content, typed out here rather than imported: this is the oracle the generator
 * in `routes/ai101-calendar.ts` is held to, so it must not come from that file.
 */
const SPRINT_LOGICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Amplified Impact//AI 101 Carousel Sprint//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:ai101-sprint-week1-2026@amplifiedimpact.io
DTSTAMP:20261007T120000Z
DTSTART:20261012T090000
DTEND:20261012T093000
SUMMARY:Carousel Creator: Market week
DESCRIPTION:30-minute approval block. Open your Carousel Creator Project at https://claude.ai/projects\\, send one Market idea\\, approve the slide copy\\, then post. Track conversations started\\, not likes.
END:VEVENT
BEGIN:VEVENT
UID:ai101-sprint-week2-2026@amplifiedimpact.io
DTSTAMP:20261007T120000Z
DTSTART:20261019T090000
DTEND:20261019T093000
SUMMARY:Carousel Creator: Method week
DESCRIPTION:30-minute approval block. Open your Carousel Creator Project at https://claude.ai/projects\\, send one Method idea\\, approve the slide copy\\, then post. Track conversations started\\, not likes.
END:VEVENT
BEGIN:VEVENT
UID:ai101-sprint-week3-2026@amplifiedimpact.io
DTSTAMP:20261007T120000Z
DTSTART:20261026T090000
DTEND:20261026T093000
SUMMARY:Carousel Creator: Me week
DESCRIPTION:30-minute approval block. Open your Carousel Creator Project at https://claude.ai/projects\\, send one Me idea\\, approve the slide copy\\, then post. Track conversations started\\, not likes.
END:VEVENT
BEGIN:VEVENT
UID:ai101-sprint-week4-2026@amplifiedimpact.io
DTSTAMP:20261007T120000Z
DTSTART:20261102T090000
DTEND:20261102T093000
SUMMARY:Carousel Creator: Market week
DESCRIPTION:30-minute approval block. Open your Carousel Creator Project at https://claude.ai/projects\\, send one Market idea\\, approve the slide copy\\, then post. Track conversations started\\, not likes.
END:VEVENT
END:VCALENDAR`;

/** RFC 5545 § 3.1 unfolding: a CRLF followed by one space or tab is removed. */
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '');

describe('GET /ai101/carousel-sprint.ics · the sprint calendar (D-032) @g9', () => {
  const get = () => app.inject({ method: 'GET', url: '/ai101/carousel-sprint.ics' });

  it('is served as text/calendar in UTF-8, so iOS offers "Add to Calendar" @g9', async () => {
    await fresh();
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
    // Not an attachment: no Content-Disposition, which on iOS would mean "download", not "add".
    expect(res.headers['content-disposition']).toBeUndefined();
  });

  it('exists without a database too, as the page does @g9', async () => {
    await fresh({ waitlist: false });
    expect((await get()).statusCode).toBe(200);
  });

  it('uses CRLF after every line, and nothing but CRLF @g9', async () => {
    await fresh();
    const body = (await get()).body;
    expect(body.endsWith('\r\n')).toBe(true);
    // Every LF is part of a CRLF, and every CR is followed by an LF.
    expect(body.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('folds every physical line to 75 octets or fewer @g9', async () => {
    await fresh();
    const lines = (await get()).body.split('\r\n').slice(0, -1);
    const tooLong = lines.filter((l) => Buffer.byteLength(l, 'utf8') > 75);
    expect(tooLong).toEqual([]);
    // The DESCRIPTION lines are long enough that folding actually happened.
    expect(lines.some((l) => l.startsWith(' '))).toBe(true);
  });

  it('unfolds to exactly the brief\'s calendar, line for line @g9', async () => {
    await fresh();
    const logical = unfold((await get()).body).split('\r\n').slice(0, -1);
    expect(logical).toEqual(SPRINT_LOGICAL.split('\n'));
  });

  it('holds four 9:00-9:30 events on Mondays, in floating local time @g9', async () => {
    await fresh();
    const logical = unfold((await get()).body).split('\r\n');
    expect(logical.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(4);
    const starts = logical.filter((l) => l.startsWith('DTSTART'));
    const ends = logical.filter((l) => l.startsWith('DTEND'));
    // No `Z` and no TZID: 9 AM wherever the agent is, across the November 1 clock change.
    for (const l of [...starts, ...ends]) expect(l).toMatch(/^DT(START|END):\d{8}T\d{6}$/);
    expect(starts.every((l) => l.endsWith('T090000'))).toBe(true);
    expect(ends.every((l) => l.endsWith('T093000'))).toBe(true);
    for (const l of starts) {
      const [, y, m, d] = /(\d{4})(\d{2})(\d{2})/.exec(l)!;
      expect(new Date(Date.UTC(+y!, +m! - 1, +d!)).getUTCDay(), l).toBe(1);
    }
    expect(new Set(logical.filter((l) => l.startsWith('UID:'))).size).toBe(4);
  });

  it('is exempt from § 9.4\'s global limit, like the page: a room can tap it at once @g9', async () => {
    await fresh();
    const venue = { 'x-forwarded-for': '198.51.100.23' };
    const codes: number[] = [];
    for (let i = 0; i < 120; i++) {
      codes.push((await app.inject({ method: 'GET', url: '/ai101/carousel-sprint.ics', headers: venue })).statusCode);
    }
    expect(codes.filter((c) => c !== 200)).toEqual([]);
  });
});

describe('foldLine (D-032)', () => {
  it('leaves a short line alone and folds a long one with a leading space @g9', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
    const long = `DESCRIPTION:${'x'.repeat(200)}`;
    const physical = foldLine(long).split('\r\n');
    expect(physical[0]).toHaveLength(75);
    for (const p of physical.slice(1)) {
      expect(p.startsWith(' ')).toBe(true);
      expect(p.length).toBeLessThanOrEqual(75);
    }
    expect(unfold(foldLine(long))).toBe(long);
  });

  it('counts octets, never splitting a multi-byte character @g9', () => {
    const line = `SUMMARY:${'é'.repeat(80)}`;
    const physical = foldLine(line).split('\r\n');
    for (const p of physical) expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75);
    expect(unfold(foldLine(line))).toBe(line);
  });

  it('serves exactly what the module builds @g9', () => {
    expect(unfold(SPRINT_ICS).split('\r\n').slice(0, -1)).toEqual(SPRINT_LOGICAL.split('\n'));
  });
});
