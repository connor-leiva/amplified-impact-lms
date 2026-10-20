// The marketing host, served by the same process as the app.
//
// `www.amplifiedimpact.io` and `learn.amplifiedimpact.io` point at one Railway service, and they are
// two different sites: `learn` is the LMS behind an invite-only sign-in, `www` is public. This file
// is the split, and it is deliberately the smallest thing that can express it — a placeholder page
// and a redirect, with the real marketing page still to be designed.
//
// WHY A HOOK AND NOT A ROUTE. Registering `GET /` would claim that path for EVERY host, and on the
// app host `/` belongs to `@fastify/static`'s index — the SPA. Fastify has no clean way for a route
// handler to decline and fall through to the static plugin, so a route here would mean the marketing
// page winning on `learn` too. An `onRequest` hook can answer or stand aside, which is exactly the
// shape of "serve this page, but only on that host". It also leaves the route table untouched, so
// `authz.test.ts`'s inventory — which is checked against the real router and is what caught phase
// 08's four routes — keeps meaning what it says.
//
// WHAT STAYS PUBLIC ON BOTH HOSTS. `/ai101` and its waitlist (D-028) are the one piece of the
// product that is public by design, and they are reachable on the marketing host as well as the app
// host, with the `/terms` and `/privacy` pages the waitlist links to. That is the point of putting
// www on this service at all rather than parking it elsewhere: `www.amplifiedimpact.io/ai101` is the
// URL on the printed QR code's successor, and it has to work without a session.
//
// OFF UNLESS `MARKETING_HOST` IS SET. No default. A wrong default would serve a placeholder in
// place of the product, which is the most expensive possible failure for this file, so it does
// nothing at all until an environment names the host.

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { App } from '../app';

/**
 * Paths that reach their real handler on the marketing host rather than the placeholder.
 *
 * `/ai101` because it is public by design, and its two other spellings, `/AI101` and `/ai-101`, because
 * the slides and the room type them: `routes/ai101.ts` answers each with its own 301 to `/ai101`, and
 * without them here www sent a typed `/AI101` to the placeholder instead (found after the 2026-10-08
 * deploy; learn was always right). `/waitlist`, the short link to the page's waitlist screen
 * (D-037), for the same reason. The free guides' landing pages, which ManyChat sends people to:
 * `/task-sync-starter` (D-038), `/ops-time-audit` (D-039), `/voice-profile` (D-040) and `/reel-editor`
 * (D-045), every slug in
 * `routes/guide-list.ts`
 * (a test holds the two together). Their PDFs, under `/downloads/`, are files, so they pass on their
 * own. `/terms` and `/privacy` because the waitlist on it links
 * to them, and a visitor on www must land on the page, not on the placeholder (`routes/legal.ts`);
 * those two match exactly, with or without a query string, so `/terms-old` still goes to `/`.
 * `/api/` because the health check lives there — Railway's probe arrives with its own `Host` and a
 * redirect would fail a deploy that is perfectly healthy — and so does the waitlist the page posts to.
 */
const PUBLIC_PREFIX =
  /^\/((ai101|AI101|ai-101|waitlist|task-sync-starter|ops-time-audit|voice-profile|reel-editor)(\/|$|\?)|(terms|privacy)($|\?)|api\/)/;

/** The placeholder's own path, and the only two spellings of it. */
const ROOT = new Set(['/', '/index.html']);

/**
 * A request for a file rather than a page: anything whose last segment carries an extension.
 *
 * Left alone so a favicon, an image or a font resolves normally instead of being bounced to the
 * placeholder. The page itself requests nothing — it is one self-contained response — but a browser
 * asks for `/favicon.ico` unprompted, and a 302 on that is a pointless round trip on every load.
 */
const LOOKS_LIKE_A_FILE = /\/[^/]+\.[a-z0-9]+$/i;

export interface MarketingOptions {
  /** `apps/web/dist/holding.html`, read once by `server.ts`. `null` when it has not been built. */
  page: string | null;
}

/**
 * Serve the marketing host's placeholder, and keep the app off that host.
 *
 * Everything that is not the placeholder, `/ai101` or `/api/` redirects to `/` — so a link to
 * `www.amplifiedimpact.io/vault` lands on the placeholder rather than on the LMS sign-in screen,
 * which is what a visitor who has never heard of the product would otherwise be shown.
 *
 * 302 rather than 301, deliberately: these paths WILL mean something later, when `www` has a real
 * site with real pages. A 301 is cached by browsers more or less forever, so it would outlive the
 * reason for it and strand visitors on a placeholder after it had been replaced.
 */
export function registerMarketingHost(app: App, options: MarketingOptions): void {
  const host = (process.env.MARKETING_HOST ?? '').trim().toLowerCase();
  if (host === '') return;

  // The one failure this file cannot catch in a test: `server.ts` reads the placeholder from
  // `apps/web/dist/holding.html`, which gets there because vite copies `public/` verbatim. If that
  // ever stops happening — a changed `publicDir`, a build that did not run, a partial deploy — the
  // marketing host answers 404 at `/` and NOTHING says why. The tests below inject the page
  // directly, by design, so they cannot see it either. `error` and not `warn` because that is what
  // it is from a visitor's side, and because it is the level that stands out in Railway's log view.
  if (options.page === null) {
    app.log.error(
      { host },
      'MARKETING_HOST is set but apps/web/dist/holding.html could not be read: the marketing host will answer 404 at /. Did `pnpm --filter @ai/web build` run?',
    );
  }

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // `Host` can carry a port, and a header is not case-normalised by every client.
    const requested = (req.headers.host ?? '').toLowerCase().split(':')[0];
    if (requested !== host) return;

    if (PUBLIC_PREFIX.test(req.url) || LOOKS_LIKE_A_FILE.test(req.url.split('?')[0] ?? '')) return;

    const path = req.url.split('?')[0] ?? '/';
    if (ROOT.has(path)) {
      if (options.page === null) {
        // Built nothing to serve. A 404 rather than a redirect, which would loop on `/`.
        await reply.code(404).type('text/plain; charset=utf-8').send('Not found');
        return;
      }
      // `no-store` would be wrong — this page is static and wants caching — but it is also about to
      // be replaced, so a short max-age keeps a visitor from holding the placeholder for a week.
      await reply
        .code(200)
        .type('text/html; charset=utf-8')
        .header('cache-control', 'public, max-age=300')
        .send(options.page);
      return;
    }

    await reply.code(302).redirect('/', 302);
  });
}
