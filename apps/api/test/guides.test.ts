// The free guides' landing pages and opt-ins (DECISIONS.md D-038, D-039), over HTTP, for every guide.
//
// Each opt-in is the /ai101 waitlist's route under its own path (`routes/ai101.ts`), so what that
// route already proves (body limit, duplicates, the log never carrying a visitor) is `ai101.test.ts`'s.
// This file holds what is the guides' own, for each guide in `GUIDE_SLUGS`:
//
//   1. ITS SIGN-UPS ARE ITS OWN. Stored under the guide's slug, so the GoHighLevel sync tags them as
//      that guide and not the waitlist, and someone on two lists is two rows, not a duplicate.
//   2. IT NEVER RECORDS SMS CONSENT. Guide pages have no SMS box, so a phone number or a "yes" sent to
//      one by hand is dropped, never stored as consent that visitor never saw.
//   3. THE NO-JS FORM LANDS ON THE GUIDE'S OWN PAGE: its download (or, for the voice profile setup,
//      its gated steps, `#unlocked`) or `#guide-error`, never /ai101.
//   4. THE PAGE IS SERVED LIKE /ai101: from memory, exempt from the global limit, revalidated, with
//      `Referrer-Policy: same-origin` (which the no-JS post needs) and its inline script in the CSP.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { build, cspScriptHashes } from '../src/app';
import type { App, BuildOptions } from '../src/app';
import { ai101Waitlist } from '../src/db/schema';
import { TERMS_VERSION } from '../src/routes/ai101';
import { GUIDE_SLUGS, type GuideSlug } from '../src/routes/guide-list';
import { withQuery } from '../src/routes/guides';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-10-14T09:00:00-06:00');

/** A stand-in for `dist/<slug>.html`: an inline module script, a non-ASCII character, the form. */
const page = (slug: GuideSlug) =>
  [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${slug} · Amplified Impact</title></head>`,
    `<body><main><h1>${slug}</h1>`,
    `<form id="guide-form" method="post" action="/api/${slug}"></form></main>`,
    '<script type="module">document.querySelector("form").noValidate = true;</script></body></html>',
  ].join('');
const PAGES = Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, page(slug)])) as Record<GuideSlug, string>;

const ORIGIN = 'http://localhost';

let app: App;

const fresh = async (opts: BuildOptions = {}): Promise<App> => {
  app = await build({ logger: false, guidePages: PAGES, ...opts });
  return app;
};

const postJson = (url: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', origin: ORIGIN },
  });

const postForm = (url: string, fields: Record<string, string>) =>
  app.inject({
    method: 'POST',
    url,
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
  });

const rows = async () => (await testDatabase()).select().from(ai101Waitlist).orderBy(ai101Waitlist.source);

/** What a page's script sends, arriving from ManyChat's link. */
const valid = { firstName: 'Pat', email: 'pat@example.com', website: '', src: 'ig' };

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await testDatabase();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

beforeEach(() => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
});

afterEach(async () => {
  await app?.close();
});

/** Where each guide's no-JS success lands: what its page shows with `:target`. */
const JOINED: Record<GuideSlug, string> = {
  'task-sync-starter': '#download',
  'ops-time-audit': '#download',
  'voice-profile': '#unlocked',
};

it('serves the three guides there are, by slug', () => {
  expect(GUIDE_SLUGS).toEqual(['task-sync-starter', 'ops-time-audit', 'voice-profile']);
});

describe.each(GUIDE_SLUGS)('/%s · the page (D-038, D-039) @g9', (slug) => {
  const PAGE = PAGES[slug];

  it('serves the built page whole, revalidated, with the Referrer-Policy its no-JS form needs @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: `/${slug}?src=ig` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(PAGE);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['referrer-policy']).toBe('same-origin');
    expect(res.headers.etag).toBe(`"${createHash('sha256').update(PAGE, 'utf8').digest('base64url')}"`);

    const again = await app.inject({ method: 'GET', url: `/${slug}`, headers: { 'if-none-match': res.headers.etag! } });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
  });

  it("is served under a CSP that admits the page's inline script by hash @g9", async () => {
    // `server.ts` adds every built guide to `cspScriptHashes`. Without it the opt-in still posts
    // (no-JS), but the in-place unlock and the in-app hint are dead, silently.
    const body = 'document.querySelector("form").noValidate = true;';
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    await fresh({ inlineScriptHashes: cspScriptHashes([PAGE]) });
    const csp = String((await app.inject({ method: 'GET', url: `/${slug}` })).headers['content-security-policy']);
    expect(csp).toContain(`script-src 'self' ${hash}`);
    expect(csp).toContain("form-action 'self'");
  });

  it('sends the trailing-slash spelling to the page with a 301, query string kept @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: `/${slug}/?src=ig` });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe(`/${slug}?src=ig`);
  });

  it('answers a JSON 404 when the page has not been built @g9', async () => {
    await fresh({ guidePages: {} });
    const res = await app.inject({ method: 'GET', url: `/${slug}` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not found' });
  });

  it("is exempt from § 9.4's global limit: 120 visits from one address all load @g9", async () => {
    // A Reel's comments arrive in bursts, many through the same carrier NAT.
    await fresh();
    const codes = new Set<number>();
    for (let i = 0; i < 120; i++) codes.add((await app.inject({ method: 'GET', url: `/${slug}` })).statusCode);
    expect([...codes]).toEqual([200]);
  });
});

describe.each(GUIDE_SLUGS)('POST /api/%s · the opt-in (D-038, D-039) @g9', (slug) => {
  const URL = `/api/${slug}`;

  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it("stores the sign-up under the guide's own source and answers 201 @g9", async () => {
    const res = await postJson(URL, { ...valid, firstName: '  Pat ', email: ' Pat@Example.COM ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    const [row, ...rest] = await rows();
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      firstName: 'Pat',
      email: 'pat@example.com',
      brokerage: null,
      source: slug,
      src: 'ig',
      phone: null,
      smsConsent: false,
      smsConsentAt: null,
      smsConsentText: null,
      termsVersion: TERMS_VERSION,
      createdAt: NOW,
      ghlSyncedAt: null,
    });
    expect(TERMS_VERSION).toBe('2026-10-17');
  });

  it('never records a phone number or SMS consent, whatever the request says @g9', async () => {
    // Guide pages have no SMS box. A "yes" sent by hand is words that visitor never saw: dropped, and
    // the sign-up stored as email-only.
    expect((await postJson(URL, { ...valid, phone: '(860) 555-0199', smsConsent: true })).statusCode).toBe(201);
    expect(await rows()).toEqual([
      expect.objectContaining({ phone: null, smsConsent: false, smsConsentAt: null, smsConsentText: null }),
    ]);
    // Not even a number that would be refused on the waitlist turns into an error here.
    expect(
      (await postJson(URL, { ...valid, email: 'b@example.com', phone: 'not a phone', smsConsent: 'on' })).statusCode,
    ).toBe(201);
  });

  it('keeps someone on the waitlist and this guide as two rows, and a second sign-up as one @g9', async () => {
    expect((await postJson('/api/ai101/waitlist', valid)).statusCode).toBe(201);
    expect((await postJson(URL, valid)).statusCode).toBe(201);
    expect((await postJson(URL, valid)).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source).sort()).toEqual(['expcon-2026-ai101', slug].sort());
  });

  it('takes the source from the server, never from the body @g9', async () => {
    expect((await postJson(URL, { ...valid, source: 'expcon-2026-ai101' })).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source)).toEqual([slug]);
  });

  it("refuses a bad name or address with the page's own messages, and stores nothing @g9", async () => {
    const name = await postJson(URL, { ...valid, firstName: '  ' });
    expect(name.statusCode).toBe(400);
    expect(name.json()).toEqual({ field: 'firstName', error: 'Enter your first name.' });
    const email = await postJson(URL, { ...valid, email: 'pat@' });
    expect(email.statusCode).toBe(400);
    expect(email.json()).toEqual({ field: 'email', error: 'Enter a valid email address.' });
    expect(await rows()).toEqual([]);
  });

  it('answers a filled honeypot exactly as a success, and stores nothing @g9', async () => {
    expect((await postJson(URL, { ...valid, website: 'https://spam.example' })).statusCode).toBe(201);
    expect(await rows()).toEqual([]);
  });

  it('403s another origin @g9', async () => {
    const res = await app.inject({
      method: 'POST',
      url: URL,
      payload: JSON.stringify(valid),
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect(await rows()).toEqual([]);
  });

  it("the no-JS form: stores the sign-up and lands where its page shows it, with a 303 @g9", async () => {
    const res = await postForm(URL, { firstName: 'Pat', email: 'pat@example.com', website: '' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/${slug}${JOINED[slug]}`);
    expect(await rows()).toHaveLength(1);
  });

  it("the no-JS form: lands an invalid one on the guide's error line, never on /ai101 @g9", async () => {
    const res = await postForm(URL, { firstName: 'Pat', email: 'nope', website: '' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/${slug}#guide-error`);
    expect(await rows()).toEqual([]);
  });

  it('logs the sign-up under its own name, without the visitor @g9', async () => {
    await app.close();
    const lines: string[] = [];
    await fresh({ logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } } });
    expect(
      (await postForm(URL, { firstName: 'Zephyrine', email: 'zephyrine.guide@example.com', website: '' })).statusCode,
    ).toBe(303);
    const log = lines.join('');
    expect(log).toContain(`${slug}: sign-up recorded`);
    expect(log).not.toContain('Zephyrine');
    expect(log.toLowerCase()).not.toContain('zephyrine.guide@example.com');
  });
});

describe('withQuery', () => {
  it('keeps the query string exactly as it arrived, or adds none', () => {
    expect(withQuery('/ops-time-audit', '/ops-time-audit/?src=ig&x=1')).toBe('/ops-time-audit?src=ig&x=1');
    expect(withQuery('/ops-time-audit', '/ops-time-audit/')).toBe('/ops-time-audit');
  });
});
