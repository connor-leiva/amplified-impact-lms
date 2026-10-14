// The Task Sync Starter Kit's landing page and opt-in (DECISIONS.md D-038), over HTTP.
//
// The opt-in is the /ai101 waitlist's route under a second path (`routes/ai101.ts`), so what that
// route already proves (origin check, body limit, honeypot, duplicates, the log) is `ai101.test.ts`'s.
// This file holds what is the kit's own:
//
//   1. ITS SIGN-UPS ARE ITS OWN. Stored under `task-sync-starter`, so the GoHighLevel sync tags them
//      as the kit and not the waitlist, and someone on both lists is two rows, not a duplicate.
//   2. IT NEVER RECORDS SMS CONSENT. Its page has no SMS box, so a phone number or a "yes" sent to it
//      by hand is dropped, never stored as consent that visitor never saw.
//   3. THE NO-JS FORM LANDS ON THE KIT'S PAGE: `#download` or `#tss-error`, never /ai101.
//   4. THE PAGE IS SERVED LIKE /ai101: from memory, exempt from the global limit, revalidated, with
//      `Referrer-Policy: same-origin` (which the no-JS post needs) and its inline script in the CSP.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { build, cspScriptHashes } from '../src/app';
import type { App, BuildOptions } from '../src/app';
import { ai101Waitlist } from '../src/db/schema';
import { TERMS_VERSION } from '../src/routes/ai101';
import { tssLocation } from '../src/routes/task-sync-starter';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-10-13T09:00:00-06:00');

/** A stand-in for `dist/task-sync-starter.html`: an inline module script, a non-ASCII character, the form. */
const PAGE = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Task Sync Starter Kit · Amplified Impact</title></head>',
  '<body><main><h1>Task Sync Starter Kit</h1>',
  '<form id="tss-form" method="post" action="/api/task-sync-starter"></form></main>',
  '<script type="module">document.querySelector("form").noValidate = true;</script></body></html>',
].join('');

const ORIGIN = 'http://localhost';
const KIT = '/api/task-sync-starter';

let app: App;

const fresh = async (opts: BuildOptions = {}): Promise<App> => {
  app = await build({ logger: false, taskSyncStarterPage: PAGE, ...opts });
  return app;
};

const postJson = (payload: unknown, url = KIT) =>
  app.inject({
    method: 'POST',
    url,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', origin: ORIGIN },
  });

const postForm = (fields: Record<string, string>) =>
  app.inject({
    method: 'POST',
    url: KIT,
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
  });

const rows = async () => (await testDatabase()).select().from(ai101Waitlist).orderBy(ai101Waitlist.source);

/** What the page's script sends, arriving from ManyChat's link. */
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

describe('GET /task-sync-starter · the page (D-038) @g9', () => {
  it('serves the built page whole, revalidated, with the Referrer-Policy its no-JS form needs @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: '/task-sync-starter?src=ig' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(PAGE);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['referrer-policy']).toBe('same-origin');
    expect(res.headers.etag).toBe(`"${createHash('sha256').update(PAGE, 'utf8').digest('base64url')}"`);

    const again = await app.inject({
      method: 'GET',
      url: '/task-sync-starter',
      headers: { 'if-none-match': res.headers.etag! },
    });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
  });

  it("is served under a CSP that admits the page's inline script by hash @g9", async () => {
    // `server.ts` adds the built page to `cspScriptHashes`. Without it the opt-in still posts (no-JS),
    // but the in-place unlock and the in-app hint are dead, silently.
    const body = 'document.querySelector("form").noValidate = true;';
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    await fresh({ inlineScriptHashes: cspScriptHashes([PAGE]) });
    const csp = String(
      (await app.inject({ method: 'GET', url: '/task-sync-starter' })).headers['content-security-policy'],
    );
    expect(csp).toContain(`script-src 'self' ${hash}`);
    expect(csp).toContain("form-action 'self'");
  });

  it('sends /task-sync-starter/ to the page with a 301, query string kept @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: '/task-sync-starter/?src=ig' });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/task-sync-starter?src=ig');
    expect(tssLocation('/task-sync-starter/')).toBe('/task-sync-starter');
  });

  it('answers a JSON 404 when no page has been built @g9', async () => {
    await fresh({ taskSyncStarterPage: null });
    const res = await app.inject({ method: 'GET', url: '/task-sync-starter' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not found' });
  });

  it("is exempt from § 9.4's global limit: 120 visits from one address all load @g9", async () => {
    // A Reel's comments arrive in bursts, many through the same carrier NAT.
    await fresh();
    const codes = new Set<number>();
    for (let i = 0; i < 120; i++)
      codes.add((await app.inject({ method: 'GET', url: '/task-sync-starter' })).statusCode);
    expect([...codes]).toEqual([200]);
  });
});

describe('POST /api/task-sync-starter · the opt-in (D-038) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it("stores the sign-up under the kit's own source and answers 201 @g9", async () => {
    const res = await postJson({ ...valid, firstName: '  Pat ', email: ' Pat@Example.COM ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    const [row, ...rest] = await rows();
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      firstName: 'Pat',
      email: 'pat@example.com',
      brokerage: null,
      source: 'task-sync-starter',
      src: 'ig',
      phone: null,
      smsConsent: false,
      smsConsentAt: null,
      smsConsentText: null,
      termsVersion: TERMS_VERSION,
      createdAt: NOW,
      ghlSyncedAt: null,
    });
    expect(TERMS_VERSION).toBe('2026-10-13');
  });

  it('never records a phone number or SMS consent, whatever the request says @g9', async () => {
    // Its page has no SMS box. A "yes" sent by hand is words that visitor never saw: dropped, and the
    // sign-up stored as email-only.
    const res = await postJson({ ...valid, phone: '(860) 555-0199', smsConsent: true });
    expect(res.statusCode).toBe(201);
    expect(await rows()).toEqual([
      expect.objectContaining({ phone: null, smsConsent: false, smsConsentAt: null, smsConsentText: null }),
    ]);
    // Not even a number that would be refused on the waitlist turns into an error here.
    expect(
      (await postJson({ ...valid, email: 'b@example.com', phone: 'not a phone', smsConsent: 'on' })).statusCode,
    ).toBe(201);
  });

  it('keeps someone on the waitlist and the kit as two rows, and a second kit sign-up as one @g9', async () => {
    expect((await postJson(valid, '/api/ai101/waitlist')).statusCode).toBe(201);
    expect((await postJson(valid)).statusCode).toBe(201);
    expect((await postJson(valid)).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source)).toEqual(['expcon-2026-ai101', 'task-sync-starter']);
  });

  it('takes the source from the server, never from the body @g9', async () => {
    expect((await postJson({ ...valid, source: 'expcon-2026-ai101' })).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source)).toEqual(['task-sync-starter']);
  });

  it("refuses a bad name or address with the page's own messages, and stores nothing @g9", async () => {
    const name = await postJson({ ...valid, firstName: '  ' });
    expect(name.statusCode).toBe(400);
    expect(name.json()).toEqual({ field: 'firstName', error: 'Enter your first name.' });
    const email = await postJson({ ...valid, email: 'pat@' });
    expect(email.statusCode).toBe(400);
    expect(email.json()).toEqual({ field: 'email', error: 'Enter a valid email address.' });
    expect(await rows()).toEqual([]);
  });

  it('answers a filled honeypot exactly as a success, and stores nothing @g9', async () => {
    const res = await postJson({ ...valid, website: 'https://spam.example' });
    expect(res.statusCode).toBe(201);
    expect(await rows()).toEqual([]);
  });

  it('403s another origin @g9', async () => {
    const res = await app.inject({
      method: 'POST',
      url: KIT,
      payload: JSON.stringify(valid),
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect(await rows()).toEqual([]);
  });
});

describe('POST /api/task-sync-starter · the no-JS form (D-038) @g9', () => {
  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it("stores the sign-up and lands on the kit's download with a 303 @g9", async () => {
    const res = await postForm({ firstName: 'Pat', email: 'pat@example.com', website: '' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/task-sync-starter#download');
    expect(await rows()).toHaveLength(1);
  });

  it("lands an invalid form on the kit's error line, never on /ai101 @g9", async () => {
    const res = await postForm({ firstName: 'Pat', email: 'nope', website: '' });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/task-sync-starter#tss-error');
    expect(await rows()).toEqual([]);
  });

  it('logs the sign-up under its own name, without the visitor @g9', async () => {
    await app.close();
    const lines: string[] = [];
    await fresh({ logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } } });
    expect(
      (await postForm({ firstName: 'Zephyrine', email: 'zephyrine.kit@example.com', website: '' })).statusCode,
    ).toBe(303);
    const log = lines.join('');
    expect(log).toContain('task-sync-starter: sign-up recorded');
    expect(log).not.toContain('Zephyrine');
    expect(log.toLowerCase()).not.toContain('zephyrine.kit@example.com');
  });
});
