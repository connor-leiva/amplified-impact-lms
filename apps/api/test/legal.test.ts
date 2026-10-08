// The public legal pages, /terms and /privacy, over HTTP. `routes/legal.ts` carries the arguments;
// this file holds each to a measurement.
//
// No database: the pages need none, and every app here is built in fixture mode (the shape
// production runs) or with the waitlist switched off, so this suite runs anywhere, CI's `quality`
// job included. The page strings are stand-ins with what matters about the real ones: a non-ASCII
// character (so bytes and characters differ) and no script.

import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { build, GLOBAL_RATE_MAX } from '../src/app';
import type { App, BuildOptions } from '../src/app';
import { PRIVACY_PATH, TERMS_PATH } from '../src/routes/legal';

const TERMS = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Terms of Service | Amplified Impact</title>',
  '<style>body{margin:0}</style></head><body data-app-ready="true"><main><h1>Terms of Service</h1>',
  '<p>Effective October 8, 2026 · Version 2026-10-08</p></main></body></html>',
].join('');

const PRIVACY = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Privacy Policy | Amplified Impact</title>',
  '<style>body{margin:0}</style></head><body data-app-ready="true"><main><h1>Privacy Policy</h1>',
  '<p>Effective October 8, 2026 · Version 2026-10-08</p></main></body></html>',
].join('');

const PAGES = [
  { path: TERMS_PATH, page: TERMS },
  { path: PRIVACY_PATH, page: PRIVACY },
] as const;

const WWW = 'www.amplifiedimpact.io';
const APP = 'learn.amplifiedimpact.io';

let app: App | null = null;
let savedHost: string | undefined;
let hostTouched = false;

/** A fresh app per test: the rate limiter's store is per instance, and one test spends a budget. */
const fresh = async (opts: BuildOptions = {}): Promise<App> => {
  app = await build({ logger: false, fixtureOnly: true, legalPages: { terms: TERMS, privacy: PRIVACY }, ...opts });
  return app;
};

/** `MARKETING_HOST` is read during `build()`, so it is set before the app is constructed. */
const onMarketingHost = async (): Promise<App> => {
  savedHost = process.env.MARKETING_HOST;
  hostTouched = true;
  process.env.MARKETING_HOST = WWW;
  return fresh({ marketingPage: '<!doctype html><title>Amplified Impact</title>Under construction' });
};

afterEach(async () => {
  await app?.close();
  app = null;
  if (hostTouched) {
    if (savedHost === undefined) delete process.env.MARKETING_HOST;
    else process.env.MARKETING_HOST = savedHost;
    hostTouched = false;
  }
});

const etagOf = (html: string) => `"${createHash('sha256').update(html, 'utf8').digest('base64url')}"`;

describe('GET /terms and GET /privacy · the legal pages @g9', () => {
  it('serves each built page whole, as HTML, revalidated on every visit @g9', async () => {
    const a = await fresh();
    for (const { path, page } of PAGES) {
      const res = await a.inject({ method: 'GET', url: path });
      expect(res.statusCode, path).toBe(200);
      expect(res.body, path).toBe(page);
      expect(res.headers['content-type'], path).toBe('text/html; charset=utf-8');
      // `no-cache` is "revalidate", not "do not store", exactly as on /ai101.
      expect(res.headers['cache-control'], path).toBe('no-cache');
      // A STRONG validator over the exact bytes: quoted, no `W/`.
      expect(res.headers.etag, path).toBe(etagOf(page));
    }
  });

  it('keeps the two pages apart: each path serves its own page @g9', async () => {
    const a = await fresh();
    expect((await a.inject({ method: 'GET', url: TERMS_PATH })).body).toContain('<h1>Terms of Service</h1>');
    expect((await a.inject({ method: 'GET', url: PRIVACY_PATH })).body).toContain('<h1>Privacy Policy</h1>');
  });

  it('sets Referrer-Policy: same-origin, as /ai101 does, under the same CSP as every page @g9', async () => {
    const a = await fresh();
    for (const { path } of PAGES) {
      const res = await a.inject({ method: 'GET', url: path });
      expect(res.headers['referrer-policy'], path).toBe('same-origin');
      const csp = String(res.headers['content-security-policy']);
      expect(csp, path).toContain("default-src 'self'");
      expect(csp, path).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    }
    // The override is the pages', not the app's.
    expect((await a.inject({ method: 'GET', url: '/api/health' })).headers['referrer-policy']).toBe('no-referrer');
  });

  it('answers the same bytes whatever the query string says @g9', async () => {
    const a = await fresh();
    for (const { path, page } of PAGES) {
      for (const url of [`${path}?src=qr`, `${path}?utm_source=email`]) {
        const res = await a.inject({ method: 'GET', url });
        expect(res.statusCode, url).toBe(200);
        expect(res.body, url).toBe(page);
      }
    }
  });

  it('answers 304 to a matching If-None-Match, weak or strong, and 200 otherwise @g9', async () => {
    const a = await fresh();
    for (const { path, page } of PAGES) {
      const etag = etagOf(page);
      for (const header of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
        const res = await a.inject({ method: 'GET', url: path, headers: { 'if-none-match': header } });
        expect(res.statusCode, `${path} ${header}`).toBe(304);
        expect(res.body, `${path} ${header}`).toBe('');
        expect(res.headers.etag, `${path} ${header}`).toBe(etag);
      }
      const stale = await a.inject({ method: 'GET', url: path, headers: { 'if-none-match': '"not-this-page"' } });
      expect(stale.statusCode, path).toBe(200);
      expect(stale.body, path).toBe(page);
    }
  });

  it('answers HEAD with the headers and no body @g9', async () => {
    const a = await fresh();
    for (const { path, page } of PAGES) {
      const res = await a.inject({ method: 'HEAD', url: path });
      expect(res.statusCode, path).toBe(200);
      expect(res.body, path).toBe('');
      expect(res.headers['content-type'], path).toBe('text/html; charset=utf-8');
      // Bytes, not characters: the pages have a `·` in them.
      expect(Number(res.headers['content-length']), path).toBe(Buffer.byteLength(page, 'utf8'));
    }
  });

  it('answers a JSON 404 for a page that has not been built, one page at a time @g9', async () => {
    // A checkout nobody built: the routes still exist, so they never fall through to the SPA.
    let a = await fresh({ legalPages: undefined });
    for (const { path } of PAGES) {
      const res = await a.inject({ method: 'GET', url: path });
      expect(res.statusCode, path).toBe(404);
      expect(res.json(), path).toEqual({ error: 'Not found' });
    }
    await a.close();

    // One built and one not: each answers for itself.
    a = await fresh({ legalPages: { terms: TERMS, privacy: null } });
    expect((await a.inject({ method: 'GET', url: TERMS_PATH })).statusCode).toBe(200);
    expect((await a.inject({ method: 'GET', url: PRIVACY_PATH })).statusCode).toBe(404);
  });

  it('exists in both modes: fixture (production) and the real API @g9', async () => {
    for (const fixtureOnly of [true, false]) {
      // `waitlist: false` so the real-API shape needs no database here.
      const a = await fresh({ fixtureOnly, waitlist: false });
      for (const { path, page } of PAGES) {
        const res = await a.inject({ method: 'GET', url: path });
        expect(res.statusCode, `${path} fixtureOnly=${fixtureOnly}`).toBe(200);
        expect(res.body, `${path} fixtureOnly=${fixtureOnly}`).toBe(page);
      }
      await a.close();
      app = null;
    }
  });

  it("is exempt from § 9.4's global limit: 120 visits from one address all load @g9", async () => {
    const a = await fresh();
    const venue = { 'x-forwarded-for': '198.51.100.23' };
    const codes: number[] = [];
    for (let i = 0; i < GLOBAL_RATE_MAX + 20; i++) {
      const { path } = PAGES[i % PAGES.length]!;
      const res = await a.inject({ method: 'GET', url: path, headers: venue });
      codes.push(res.statusCode);
      // No limiter ran at all, so it reported no budget.
      if (i === 0) expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
    expect(codes.filter((c) => c !== 200)).toEqual([]);
    // And none of that was spent from the global budget the rest of the app shares.
    const health = await a.inject({ method: 'GET', url: '/api/health', headers: venue });
    expect(health.statusCode).toBe(200);
    expect(health.headers['x-ratelimit-remaining']).toBe(String(GLOBAL_RATE_MAX - 1));
  });
});

describe('the legal pages on the marketing host @g9', () => {
  it('serves /terms and /privacy on www as well as on learn, with or without a query @g9', async () => {
    const a = await onMarketingHost();
    for (const host of [WWW, APP]) {
      for (const { path, page } of PAGES) {
        for (const url of [path, `${path}?src=ig`]) {
          const res = await a.inject({ method: 'GET', url, headers: { host } });
          expect(res.statusCode, `${url} on ${host}`).toBe(200);
          expect(res.body, `${url} on ${host}`).toBe(page);
        }
      }
    }
  });

  it('lets through only the exact paths: lookalikes still go to the placeholder @g9', async () => {
    const a = await onMarketingHost();
    for (const url of ['/terms-old', '/termsofservice', '/privacy-policy', '/terms/', '/privacy/extra']) {
      const res = await a.inject({ method: 'GET', url, headers: { host: WWW } });
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
    }
  });
});
