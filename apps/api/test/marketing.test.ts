// The www/learn split. One service, two sites, told apart by `Host`.
//
// The failures worth guarding against here are all of the "quiet and expensive" kind:
//
//   - The placeholder winning on the APP host would replace the product with an "under
//     construction" page, which is the single most costly thing this file could do.
//   - A redirect on `/api/health` fails Railway's healthcheck, which rolls back a deploy that is
//     perfectly healthy. The probe arrives with its own `Host`, not the public one.
//   - `/ai101` is public BY DESIGN (D-028) and has to work on both hosts. It is the URL on the
//     printed QR code's successor, and a visitor has no session.
import { describe, it, expect, afterEach } from 'vitest';
import { build } from '../src/app';
import type { App } from '../src/app';
import { GUIDE_ALIASES, GUIDE_SLUGS } from '../src/routes/guide-list';

const WWW = 'www.amplifiedimpact.io';
const APP = 'learn.amplifiedimpact.io';
const PAGE = '<!doctype html><title>Amplified Impact</title>Under construction';

let app: App | null = null;
let saved: string | undefined;

afterEach(async () => {
  await app?.close();
  app = null;
  if (saved === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = saved;
});

/** `MARKETING_HOST` is read during `build()`, so it has to be set before the app is constructed. */
async function serve(marketingHost: string | undefined, page: string | null = PAGE): Promise<App> {
  saved = process.env.MARKETING_HOST;
  if (marketingHost === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = marketingHost;
  // `fixtureOnly` so no database is needed; the /ai101 page is registered in both modes.
  app = await build({
    fixtureOnly: true,
    logger: false,
    ai101Page: '<title>AI 101</title>',
    guidePages: Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, `<title>Guide ${slug}</title>`])),
    libraryPage: '<title>The Free Library</title>',
    marketingPage: page,
  });
  await app.ready();
  return app;
}

const get = (a: App, url: string, host: string) => a.inject({ method: 'GET', url, headers: { host } });

describe('§9.1 the marketing host serves its own site @g9', () => {
  it('serves the placeholder at / on the marketing host @g9', async () => {
    const a = await serve(WWW);

    const res = await get(a, '/', WWW);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toBe(PAGE);
    // Cacheable, but briefly — the page is about to be replaced by a real one, and a visitor
    // holding it for a week would not see that happen.
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('NEVER serves the placeholder on the app host @g9', async () => {
    // The most expensive failure available to this file: replacing the product with a placeholder.
    const a = await serve(WWW);

    for (const url of ['/', '/index.html', '/vault', '/employees/marketing']) {
      const res = await get(a, url, APP);
      expect(res.body, `${url} on the app host`).not.toContain('Under construction');
      expect(res.statusCode, `${url} on the app host`).not.toBe(302);
    }
  });

  it('lets the free library and its other spellings through on www, and no deeper (D-050) @g9', async () => {
    const a = await serve(WWW);

    for (const url of ['/library', '/library?src=ig']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(200);
      expect(res.body, url).toContain('The Free Library');
    }
    for (const [url, location] of [
      ['/library/', '/library'],
      ['/guides', '/library'],
      ['/guides/', '/library'],
      ['/skills', '/library'],
      ['/skills/?src=ig', '/library?src=ig'],
    ] as const) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(301);
      expect(res.headers.location, url).toBe(location);
    }
    // A guessed deep link must not reach the app's shell on www.
    for (const url of ['/skills/reel-editor', '/guides/reel-editor', '/library/x', '/skills/x?src=ig']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
    }
  });

  it('keeps /ai101 working on BOTH hosts, with no session @g9', async () => {
    const a = await serve(WWW);

    for (const host of [WWW, APP]) {
      const res = await get(a, '/ai101', host);
      expect(res.statusCode, host).toBe(200);
      expect(res.body, host).toContain('AI 101');
    }
    // The trailing-slash spelling reaches `routes/ai101.ts`'s OWN canonical 301 (D-028) rather than
    // this file's redirect to `/` — which is the distinction that matters: the hook stands aside and
    // lets the page's own routing answer, instead of swallowing the path on the marketing host.
    const slash = await get(a, '/ai101/', WWW);
    expect(slash.statusCode).toBe(301);
    expect(slash.headers.location).toBe('/ai101');

    // And with a query string, which is how a QR code carrying a campaign tag arrives.
    expect((await get(a, '/ai101?src=qr', WWW)).statusCode).toBe(200);

    // The spellings the slides and the room type reach the page's own 301 on www too, query intact,
    // not the placeholder (they once went to `/` on www only).
    for (const [url, location] of [
      ['/AI101', '/ai101'],
      ['/ai-101', '/ai101'],
      ['/AI101?src=slide', '/ai101?src=slide'],
    ] as const) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(301);
      expect(res.headers.location, url).toBe(location);
    }
    // The short link to the waitlist screen (D-037) reaches its own 302 on www too.
    const wl = await get(a, '/waitlist?src=waitlist-qr', WWW);
    expect(wl.statusCode).toBe(302);
    expect(wl.headers.location).toBe('/ai101?src=waitlist-qr#waitlist');

    // Every free guide's page (D-038, D-039), where ManyChat sends people, with its `?src=` tag. Driven
    // by the API's own list, so a guide added there and forgotten in `PUBLIC_PREFIX` fails here.
    expect(GUIDE_SLUGS).toEqual(['task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor', 'retool']);
    for (const slug of GUIDE_SLUGS) {
      for (const url of [`/${slug}`, `/${slug}?src=ig`]) {
        const res = await get(a, url, WWW);
        expect(res.statusCode, url).toBe(200);
        expect(res.body, url).toContain(`Guide ${slug}`);
      }
      const slash = await get(a, `/${slug}/?src=ig`, WWW);
      expect(slash.statusCode, slug).toBe(301);
      expect(slash.headers.location, slug).toBe(`/${slug}?src=ig`);
    }

    // A guide's other spellings (D-046): the talk's "Type RETOOL in the chat" sends the room to
    // `/RETOOL`, which must reach `routes/guides.ts`'s 301 on www, query intact, as `/AI101` does.
    // Driven by the API's own alias list, so an alias added there and forgotten here fails.
    expect(GUIDE_ALIASES).toEqual({ retool: ['/RETOOL', '/Retool'] });
    for (const [slug, aliases] of Object.entries(GUIDE_ALIASES)) {
      for (const alias of aliases ?? []) {
        for (const [url, location] of [
          [alias, `/${slug}`],
          [`${alias}?src=slide`, `/${slug}?src=slide`],
        ] as const) {
          const res = await get(a, url, WWW);
          expect(res.statusCode, url).toBe(301);
          expect(res.headers.location, url).toBe(location);
        }
      }
    }

    // Lookalikes still go to the placeholder.
    for (const url of ['/Ai101', '/ai101x', '/ai-1010', '/waitlistx', '/task-sync-starterx', '/task-sync', '/ops-time-auditx', '/ops', '/voice-profilex', '/voice', '/reel-editorx', '/reel', '/retoolx', '/retool-x', '/RETOOLX', '/Retoolx', '/ReTool', '/reTOOL', '/retoo', '/libraryx', '/library-old', '/Library', '/guidesx', '/guide', '/skillsx', '/skill']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
    }
  });

  it('NEVER redirects /api/health, because that would roll back a healthy deploy @g9', async () => {
    // Railway's probe reaches the service directly rather than through the public edge, so its
    // `Host` is whatever the platform sends — including, possibly, the marketing host. A 302 is not
    // a 200: the check fails and Railway reverts a deploy that was fine.
    const a = await serve(WWW);

    for (const host of [WWW, APP, 'web-production-1b901.up.railway.app']) {
      const res = await get(a, '/api/health', host);
      expect(res.statusCode, host).toBe(200);
      expect(JSON.parse(res.body).ok, host).toBe(true);
    }
  });

  it('sends an app path on the marketing host to the placeholder, not to sign-in @g9', async () => {
    // Someone following an old link to `www.../vault` should see the placeholder rather than a
    // login screen for a product they have never heard of.
    const a = await serve(WWW);

    for (const url of ['/vault', '/sign-in', '/employees/marketing', '/admin']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
    }
  });

  it('uses 302 and not 301, because these paths will mean something later @g9', async () => {
    // A 301 is cached by browsers more or less forever, so it would outlive the reason for it and
    // strand a visitor on the placeholder after the real site replaced it.
    const a = await serve(WWW);

    const res = await get(a, '/about', WWW);
    expect(res.statusCode).toBe(302);
    expect(res.statusCode).not.toBe(301);
  });

  it('leaves file requests alone, so a favicon is not a redirect on every load @g9', async () => {
    const a = await serve(WWW);

    for (const url of ['/favicon.ico', '/assets/index-abc123.js', '/ai101-qr.svg']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).not.toBe(302);
    }
  });

  it('matches the host case-insensitively and ignores the port @g9', async () => {
    const a = await serve(WWW);

    expect((await get(a, '/', WWW.toUpperCase())).statusCode).toBe(200);
    expect((await get(a, '/', `${WWW}:443`)).statusCode).toBe(200);
  });

  it('does nothing at all when MARKETING_HOST is unset @g9', async () => {
    // The default has to be inert. A wrong default would serve a placeholder in place of the
    // product, which is why there is no default.
    const a = await serve(undefined);

    const res = await get(a, '/', WWW);
    expect(res.body).not.toContain('Under construction');
    expect(res.statusCode).not.toBe(302);
  });

  it('says so in the log when the placeholder was never built, instead of failing silently @g9', async () => {
    // The gap this closes: `server.ts` reads the page off disk, and every other test in this file
    // injects it directly — so nothing here can see a build that stopped copying `public/` into
    // `dist/`. Without this line the only symptom is a 404 on the marketing host with no cause
    // recorded anywhere, which is the kind of thing that costs an afternoon.
    const lines: string[] = [];
    saved = process.env.MARKETING_HOST;
    process.env.MARKETING_HOST = WWW;
    app = await build({
      fixtureOnly: true,
      logger: { level: 'error', stream: { write: (line: string) => void lines.push(line) } },
      ai101Page: '<title>AI 101</title>',
      marketingPage: null,
    });
    await app.ready();

    const complaint = lines.find((l) => l.includes('holding.html'));
    expect(complaint, 'nothing was logged about the missing page').toBeDefined();
    // pino's numeric level for `error`. A `warn` here would scroll past unnoticed.
    expect(JSON.parse(complaint as string).level).toBe(50);
  });

  it('stays quiet about the page when MARKETING_HOST is unset @g9', async () => {
    // The complaint has to be conditional on the host, or every staging and demo boot logs an
    // error about a file it was never supposed to have.
    const lines: string[] = [];
    saved = process.env.MARKETING_HOST;
    delete process.env.MARKETING_HOST;
    app = await build({
      fixtureOnly: true,
      logger: { level: 'error', stream: { write: (line: string) => void lines.push(line) } },
      ai101Page: '<title>AI 101</title>',
      marketingPage: null,
    });
    await app.ready();

    expect(lines.join('')).not.toContain('holding.html');
  });

  it('answers 404 rather than looping when the placeholder has not been built @g9', async () => {
    // `server.ts` reads the file from `dist/`, so an un-built or unreadable page gives `null`.
    // Redirecting `/` to `/` would loop until the browser gave up.
    const a = await serve(WWW, null);

    const res = await get(a, '/', WWW);
    expect(res.statusCode).toBe(404);
    expect(res.headers.location).toBeUndefined();
  });
});
