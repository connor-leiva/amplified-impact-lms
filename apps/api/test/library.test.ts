import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, cspScriptHashes, type App } from '../src/app';
import { LIBRARY_ALIASES } from '../src/routes/library';

// The free library's page (D-050). Its words and its script are the web app's
// (`apps/web/src/library/`); this file is that the API serves it the way it serves the guides. The www
// allow-list is `marketing.test.ts`'s.

const PAGE = '<!doctype html><title>The Free Library</title>';

describe('GET /library', () => {
  let app: App;
  beforeAll(async () => {
    app = await build({ fixtureOnly: true, libraryPage: PAGE });
  });
  afterAll(() => app.close());

  it('serves the page, uncached, with the Referrer-Policy the public pages use', async () => {
    const res = await app.inject({ method: 'GET', url: '/library' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['referrer-policy']).toBe('same-origin');
    expect(res.body).toBe(PAGE);
  });

  it('answers a matching ETag with a bodiless 304', async () => {
    const first = await app.inject({ method: 'GET', url: '/library' });
    const etag = first.headers.etag as string;
    expect(etag).toBeTruthy();
    const second = await app.inject({ method: 'GET', url: '/library', headers: { 'if-none-match': etag } });
    expect(second.statusCode).toBe(304);
    expect(second.body).toBe('');
  });

  it('is exempt from the global limit: a whole room can open it at once', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 150 }, () => app.inject({ method: 'GET', url: '/library' }).then((r) => r.statusCode)),
    );
    expect(new Set(statuses)).toEqual(new Set([200]));
  });

  it.each(['/library/', '/guides', '/guides/', '/skills', '/skills/'])('301s %s to /library', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/library');
  });

  it('keeps the query string through the redirect', async () => {
    const res = await app.inject({ method: 'GET', url: '/skills?src=ig' });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/library?src=ig');
  });

  it('holds the two words a person would type', () => {
    expect(LIBRARY_ALIASES).toEqual(['/guides', '/skills']);
  });
});

describe('its inline script', () => {
  it("is served under a CSP that admits it by hash, or the pills, search and sort never appear", async () => {
    const body = 'document.title = "x";';
    const page = `<!doctype html><title>t</title><script type="module">${body}</script>`;
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    const app = await build({ fixtureOnly: true, libraryPage: page, inlineScriptHashes: cspScriptHashes([page]) });
    try {
      const res = await app.inject({ method: 'GET', url: '/library' });
      expect(String(res.headers['content-security-policy'])).toContain(hash);
    } finally {
      await app.close();
    }
  });

  it('is wired up in server.ts: hashed for the CSP, and not also served as a static file', () => {
    // `server.ts` boots the real process, so no test can import it. Read, as the page's own wiring.
    const server = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
    expect(server).toMatch(/cspScriptHashes\(\[[^\]]*libraryPage[^\]]*\]\)/);
    expect(server).toMatch(/globIgnore: \[[^\]]*'library\.html'/);
    expect(server).toMatch(/\n\s+libraryPage,\n/);
  });
});

describe('GET /library, not built', () => {
  let app: App;
  beforeAll(async () => {
    app = await build({ fixtureOnly: true });
  });
  afterAll(() => app.close());

  it('is a JSON 404, not the single-page app', async () => {
    const res = await app.inject({ method: 'GET', url: '/library' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not found' });
  });
});
