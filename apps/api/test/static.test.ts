// The SPA's files under the API's rate limit, or rather not under it (D-137), through the real
// `registerStaticFiles` and a real directory, on learn and on www.
//
// The incident: rapid reloads of /employees/marketing got 429 on /assets/*.js and *.css, some with
// the limiter's JSON body, so the SPA never booted. A conference room shares one IP.
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, GLOBAL_RATE_MAX, isApiPath } from '../src/app';
import type { App } from '../src/app';
import { IMMUTABLE, cacheControlFor, hasSessionCookie, registerStaticFiles, signedOutSkillRedirect } from '../src/static';
import { GUIDE_SLUGS } from '../src/routes/guide-list';

const SHELL = '<!doctype html><title>Amplified Impact</title><div id="root"></div>';
const FILES: Record<string, { body: string | Buffer; type: RegExp }> = {
  '/assets/index-a1b2c3.js': { body: 'console.log("app")', type: /^(text|application)\/javascript/ },
  '/assets/index-a1b2c3.css': { body: 'body{margin:0}', type: /^text\/css/ },
  '/assets/hanken-grotesk-d4e5f6.woff2': { body: Buffer.from([0x77, 0x4f, 0x46, 0x32, 0, 1]), type: /^font\/woff2/ },
  '/assets/logo-g7h8i9.svg': { body: '<svg xmlns="http://www.w3.org/2000/svg"/>', type: /^image\/svg\+xml/ },
  '/assets/hero-j0k1l2.png': { body: Buffer.from([0x89, 0x50, 0x4e, 0x47]), type: /^image\/png/ },
};
const ASSET_URLS = Object.keys(FILES);

let root: string;
let app: App | undefined;
let savedHost: string | undefined;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'ai-static-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), SHELL);
  for (const [url, f] of Object.entries(FILES)) writeFileSync(join(root, url), f.body);
});
afterAll(() => rmSync(root, { recursive: true, force: true }));
afterEach(async () => {
  await app?.close();
  app = undefined;
  if (savedHost === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = savedHost;
});

/** The app as `server.ts` builds it: `build()`, then the static files and the client routes. */
async function serve(marketingHost?: string): Promise<App> {
  savedHost = process.env.MARKETING_HOST;
  if (marketingHost === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = marketingHost;
  app = await build({
    fixtureOnly: true,
    logger: false,
    guidePages: Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, `<title>Guide ${slug}</title>`])),
    marketingPage: '<!doctype html><title>Amplified Impact</title>Home',
  });
  await registerStaticFiles(app, root);
  await app.ready();
  return app;
}

// Every request from one address, the conference Wi-Fi's.
const ROOM = { 'x-forwarded-for': '203.0.113.50' };
const get = (a: App, url: string, host = 'learn.amplifiedimpact.io') => a.inject({ method: 'GET', url, headers: { ...ROOM, host } });

describe('D-137: files are never rate limited', () => {
  it('answers 200 parallel asset requests from one IP, every one 200 with its type and a year of cache', async () => {
    const a = await serve();
    const urls = Array.from({ length: 200 }, (_, i) => ASSET_URLS[i % ASSET_URLS.length]!);
    const responses = await Promise.all(urls.map((url) => get(a, url)));
    for (const [i, res] of responses.entries()) {
      const url = urls[i]!;
      expect(res.statusCode, url).toBe(200);
      expect(res.headers['content-type'], url).toMatch(FILES[url]!.type);
      expect(res.headers['content-type'], url).not.toMatch(/json/);
      expect(res.headers['cache-control'], url).toBe(IMMUTABLE);
      // Not counted at all: the limiter adds no headers to what it does not count.
      expect(res.headers['x-ratelimit-limit'], url).toBeUndefined();
    }
    // And none of it was spent from the API's budget.
    const health = await get(a, '/api/health');
    expect(health.statusCode).toBe(200);
    expect(health.headers['x-ratelimit-remaining']).toBe(String(GLOBAL_RATE_MAX - 1));
  });

  it('serves the app shell for a client route as often as a room reloads it, never cached', async () => {
    const a = await serve();
    const responses = await Promise.all(Array.from({ length: 200 }, () => get(a, '/employees/marketing')));
    for (const res of responses) {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/html/);
      expect(res.body).toBe(SHELL);
    }
    expect(responses[0]!.headers['cache-control']).toBe('no-cache');
  });

  it('still limits the API: the 101st request in a minute is refused, with the JSON the app reads', async () => {
    const a = await serve();
    const codes: number[] = [];
    for (let i = 0; i <= GLOBAL_RATE_MAX; i++) codes.push((await get(a, '/api/health')).statusCode);
    expect(codes.filter((c) => c === 200)).toHaveLength(GLOBAL_RATE_MAX);
    expect(codes[GLOBAL_RATE_MAX]).toBe(429);
    const limited = await get(a, '/api/health');
    expect(limited.headers['content-type']).toMatch(/json/);
    // Files keep loading while the API is limited.
    const file = await get(a, ASSET_URLS[0]!);
    expect([file.statusCode, file.headers['content-type']]).toEqual([200, expect.stringMatching(FILES[ASSET_URLS[0]!]!.type)]);
  });

  it('answers a missing file under /assets with a real 404 in plain text, never the app shell or JSON', async () => {
    const a = await serve();
    for (const url of ['/assets/index-old999.js', '/assets/index-old999.css', '/assets/gone.woff2?v=1']) {
      const res = await get(a, url);
      expect(res.statusCode, url).toBe(404);
      expect(res.headers['content-type'], url).toMatch(/^text\/plain/);
      expect(res.body, url).toBe('Not found');
    }
    // An unknown API path is still the JSON 404 the app reads.
    const api = await get(a, '/api/nope');
    expect([api.statusCode, api.json()]).toEqual([404, { error: 'Not found' }]);
  });

  it('does the same on www: 200 parallel file requests from one IP all load', async () => {
    const a = await serve('www.amplifiedimpact.io');
    const responses = await Promise.all(Array.from({ length: 200 }, (_, i) => get(a, ASSET_URLS[i % ASSET_URLS.length]!, 'www.amplifiedimpact.io')));
    for (const [i, res] of responses.entries()) {
      const url = ASSET_URLS[i % ASSET_URLS.length]!;
      expect(res.statusCode, url).toBe(200);
      expect(res.headers['content-type'], url).toMatch(FILES[url]!.type);
    }
    // www's own pages are not counted either.
    const pages = await Promise.all(Array.from({ length: 150 }, () => get(a, '/', 'www.amplifiedimpact.io')));
    expect(pages.every((p) => p.statusCode === 200)).toBe(true);
  });

  it('counts exactly the API paths', () => {
    for (const url of ['/api', '/api/', '/api/health', '/api/auth/request?x=1', '/api/snapshot']) expect(isApiPath(url), url).toBe(true);
    for (const url of ['/', '/assets/index-a1b2c3.js', '/employees/marketing', '/sign-in?token=abc', '/apiary', '/pricing', '/calendar/builds.ics']) expect(isApiPath(url), url).toBe(false);
  });
});

describe('D-137: a limit of its own is for API routes only', () => {
  it('refuses to boot with a stricter limit on a route outside /api/, where it would silently be none', async () => {
    const a = await build({ fixtureOnly: true, logger: false });
    try {
      expect(() => a.get('/not-api', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async () => 'ok')).toThrow(/limits apply under \/api\/ only/);
      // Under /api/ it is fine, and so is opting a page out.
      expect(() => a.get('/api/limited', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async () => 'ok')).not.toThrow();
      expect(() => a.get('/a-page', { config: { rateLimit: false } }, async () => 'ok')).not.toThrow();
    } finally {
      await a.close();
    }
  });
});

// D-170: a tab opened before a deploy reloads once to pick up the new files (`apps/web/src/lib/
// stale-chunk.ts`). That reload, and every fresh load, must get the CURRENT `index.html`, which names
// the current hashed files: so the app shell is `no-cache` (checked with the server on every load)
// wherever it is answered, and the hashed files it names keep their year. Already so since D-137;
// held here for each way the shell is reached.
describe('D-170: the learn app shell is no-cache wherever it is answered; hashed files keep their year', () => {
  const LEARN_SHELL = [
    '/',
    '/index.html',
    '/admin/staff',
    '/employees/marketing?tab=replay',
    '/sign-in?token=abc',
    '/invite/abc123',
  ];

  it('answers index.html and every SPA deep link with Cache-Control: no-cache', async () => {
    const a = await serve();
    for (const url of LEARN_SHELL) {
      for (const method of ['GET', 'HEAD'] as const) {
        const res = await a.inject({ method, url, headers: { ...ROOM, host: 'learn.amplifiedimpact.io' } });
        expect(res.statusCode, `${method} ${url}`).toBe(200);
        expect(res.headers['content-type'], `${method} ${url}`).toMatch(/^text\/html/);
        expect(res.headers['cache-control'], `${method} ${url}`).toBe('no-cache');
        if (method === 'GET') expect(res.body, url).toBe(SHELL);
      }
    }
  });

  it('keeps the year-long immutable cache on the hashed files the shell names', async () => {
    const a = await serve();
    for (const url of ASSET_URLS) expect((await get(a, url)).headers['cache-control'], url).toBe(IMMUTABLE);
  });

  it('sends a signed-out skill guide straight to sign-in, and leaves a session on the app', async () => {
    expect(signedOutSkillRedirect('/skill-library/agent-1on1-prep', false)).toBe('/sign-in?next=%2Fskill-library%2Fagent-1on1-prep');
    expect(signedOutSkillRedirect('/skill-library/agent-1on1-prep', true)).toBeNull();
    expect(signedOutSkillRedirect('/skill-library', false)).toBeNull();
    expect(signedOutSkillRedirect('/skill-library/not-a-skill', false)).toBeNull();
    expect(hasSessionCookie(undefined)).toBe(false);
    expect(hasSessionCookie('ai_sid=abc')).toBe(true);
    expect(hasSessionCookie('other=1')).toBe(false);

    const a = await serve();
    const out = await a.inject({ method: 'GET', url: '/skill-library/agent-1on1-prep' });
    expect(out.statusCode).toBe(302);
    expect(out.headers.location).toBe('/sign-in?next=%2Fskill-library%2Fagent-1on1-prep');
    const inSession = await a.inject({ method: 'GET', url: '/skill-library/agent-1on1-prep', headers: { cookie: 'ai_sid=abc' } });
    expect(inSession.statusCode).toBe(200);
    expect(inSession.headers['content-type']).toMatch(/^text\/html/);
    const library = await a.inject({ method: 'GET', url: '/skill-library' });
    expect(library.statusCode).toBe(200);
  });

  it('changes nothing else: other files, and www’s homepage, keep the headers they had', async () => {
    expect(cacheControlFor('/srv/apps/web/dist/robots.txt')).toBe('public, max-age=0');
    expect(cacheControlFor('/srv/apps/web/dist/downloads/guide.pdf')).toBe('public, max-age=0');
    const a = await serve('www.amplifiedimpact.io');
    const home = await get(a, '/', 'www.amplifiedimpact.io');
    expect([home.statusCode, home.headers['cache-control']]).toEqual([200, 'public, max-age=300']);
  });
});
