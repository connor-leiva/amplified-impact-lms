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

/**
 * What `server.ts`'s not-found handler answers every unknown non-API path with: the app's own
 * `index.html`. `build()` does not install it (the static plugin and the handler are `server.ts`'s),
 * so `asServed` below puts a stand-in back, which is what lets a test say "never the app's shell".
 */
const SHELL = '<!doctype html><title>Amplified Impact</title><div id="root"></div>';

/**
 * Production's routing around `build()`: one real file in `dist/` (`wildcard: false` makes each one a
 * route) and the not-found handler that answers anything else with the app's shell.
 */
function asServed(a: App): void {
  a.get('/assets/index-abc123.js', async (_req, reply) => reply.type('text/javascript').send('/* app */'));
  a.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api/')
      ? reply.code(404).send({ error: 'Not found' })
      : reply.code(200).type('text/html; charset=utf-8').send(SHELL),
  );
}

/** `MARKETING_HOST` is read during `build()`, so it has to be set before the app is constructed. */
async function serve(
  marketingHost: string | undefined,
  page: string | null = PAGE,
  setup?: (a: App) => void,
): Promise<App> {
  saved = process.env.MARKETING_HOST;
  if (marketingHost === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = marketingHost;
  // `fixtureOnly` so no database is needed; the /ai101 page is registered in both modes.
  app = await build({
    fixtureOnly: true,
    logger: false,
    ai101Page: '<title>AI 101</title>',
    guidePages: Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, `<title>Guide ${slug}</title>`])),
    libraryPage: '<title>The Library</title>',
    marketingPage: page,
  });
  setup?.(app);
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
      expect(res.body, url).toContain('The Library');
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
    expect(GUIDE_SLUGS).toEqual([
      'task-sync-starter',
      'ops-time-audit',
      'voice-profile',
      'reel-editor',
      'retool',
      'database-health-check',
      'recruiting-prep',
      'team-playbook-builder',
      'content-strategist',
      'perfect-week',
      'inbox-meeting-follow-through',
      'due-diligence-review',
      'repair-request-response',
      'counter-explainer',
      'offer-strategy',
      'offer-comparison',
      'pricing-conversation-prep',
      'appointment-follow-up',
      'showing-tour-prep',
      'low-appraisal-response',
      'team-pnl-review',
      'new-construction-review',
      'listing-description-writer',
      'market-update-email',
      'l10-meeting-prep',
      'open-house-follow-up',
      'sphere-touch-plan',
      'fub-pipeline-review',
      'speed-to-lead-reply',
      'fub-automation-audit',
      'seller-listing-update',
      'listing-appointment-prep',
      'expired-fsbo-outreach',
      'agent-1on1-prep',
      'tc-file-audit',
      'post-closing-client-care',
      'team-ai-brain',
      'ai-brain-tuneup',
      'ai-brain-setup',
      'card-bank-feed-audit',
      'commission-tie-out',
      'team-payout-journals',
      'month-end-close',
      'trust-earnest-watch',
      'vendor-1099-readiness',
      'quarterly-tax-profit-first',
      'lead-source-roi',
      'contract-to-close-deadlines',
      'new-contract-intake',
      'missing-documents-audit',
      'weekly-status-updates',
      'stalled-item-follow-up',
      'closing-week-checklist',
      'listing-to-live',
      'post-close-file-closeout',
    ]);
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

  it('sends /pricing to the plans and prices, and /about and /contact to the homepage, on www only (D-102) @g9', async () => {
    const a = await serve(WWW, PAGE, asServed);

    for (const url of ['/pricing', '/pricing/', '/pricing?ref=old-link']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/offer');
    }
    for (const url of ['/about', '/contact', '/pricing/old', '/pricingx']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
    }
    // The app host is the app's: no marketing redirect reaches it.
    const learn = await get(a, '/pricing', APP);
    expect(learn.statusCode).toBe(200);
    expect(learn.body).toBe(SHELL);
  });

  it('leaves real files alone, and answers a missing one 404, never with a redirect or the app (D-051) @g9', async () => {
    const a = await serve(WWW, PAGE, asServed);

    // A file a route serves: one of `dist/`'s, and the sprint's calendar under /ai101 (D-032).
    const asset = await get(a, '/assets/index-abc123.js', WWW);
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toBe('/* app */');
    const ics = await get(a, '/ai101/carousel-sprint.ics', WWW);
    expect(ics.statusCode).toBe(200);
    expect(ics.headers['content-type']).toMatch(/text\/calendar/);

    // A file nothing serves: a plain 404, so a favicon is not a redirect on every load, and not the
    // app's `index.html`, which the not-found handler would answer with (before D-051 it did, 200).
    for (const url of ['/favicon.ico', '/ai101-qr.svg', '/assets/gone-123.js', '/vault/x.png', '/retool/x.html', '/ai101.html', '/library.html', '/retool.html', '/downloads/nope.pdf?src=ig']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(404);
      expect(res.headers.location, url).toBeUndefined();
      expect(res.body, url).not.toBe(SHELL);
    }

    // On the app host the same paths are the app's, as before: this rule is www's alone.
    expect((await get(a, '/vault/x.png', APP)).body).toBe(SHELL);
  });

  it('serves the placeholder at /index.html too, not the app that file is (D-051) @g9', async () => {
    // `/index.html` looks like a file, and is one, so it once passed as a file and served the app's
    // shell on www although `ROOT` names it.
    const a = await serve(WWW, PAGE, asServed);

    for (const url of ['/index.html', '/index.html?src=ig']) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(200);
      expect(res.body, url).toBe(PAGE);
    }
  });

  it('lets each public page through exactly, and no deeper, so nothing on www reaches the app (D-051) @g9', async () => {
    const a = await serve(WWW, PAGE, asServed);

    // Before D-051 a page's slug matched as a prefix, so `/retool/x` reached the not-found handler
    // and was answered with the app's shell. Driven by the API's own lists, so a guide or an alias
    // added there is held to the same rule.
    const pages = ['ai101', 'waitlist', ...GUIDE_SLUGS, 'library', 'guides', 'skills'];
    const exact = ['AI101', 'ai-101', ...Object.values(GUIDE_ALIASES).flatMap((aliases) => (aliases ?? []).map((alias) => alias.slice(1))), 'terms', 'privacy'];
    const deeper = [
      ...pages.flatMap((p) => [`/${p}/x`, `/${p}/x?src=ig`, `/${p}/x/`, `/${p}//`, `/${p}/${p}`]),
      // No trailing-slash route answers these spellings, so a slash is as unknown as a deeper path.
      ...exact.flatMap((p) => [`/${p}/`, `/${p}/?src=ig`, `/${p}/x`]),
      '/ai101/anything/else',
      '/terms-old',
    ];
    for (const url of deeper) {
      const res = await get(a, url, WWW);
      expect(res.statusCode, url).toBe(302);
      expect(res.headers.location, url).toBe('/');
      expect(res.body, url).not.toBe(SHELL);
    }

    // And every page path still reaches its own route: the page, or its own 301 or 302.
    for (const p of pages) {
      for (const url of [`/${p}`, `/${p}?src=ig`, `/${p}/`, `/${p}/?src=ig`]) {
        const res = await get(a, url, WWW);
        expect([200, 301, 302], url).toContain(res.statusCode);
        expect(res.headers.location ?? '', url).not.toBe('/');
        expect(res.body, url).not.toBe(SHELL);
      }
    }
    for (const p of exact) {
      for (const url of [`/${p}`, `/${p}?src=ig`]) {
        const res = await get(a, url, WWW);
        expect(res.headers.location ?? '', url).not.toBe('/');
        expect(res.body, url).not.toBe(SHELL);
      }
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

    const complaint = lines.find((l) => l.includes('home.html'));
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

    expect(lines.join('')).not.toContain('home.html');
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
