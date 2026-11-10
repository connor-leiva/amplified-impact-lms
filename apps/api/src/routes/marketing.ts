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
import { GUIDE_ALIASES, GUIDE_SLUGS } from './guide-list';

/**
 * Paths that reach their real handler on the marketing host rather than the placeholder.
 *
 * `/ai101` because it is public by design, and its two other spellings, `/AI101` and `/ai-101`, because
 * the slides and the room type them: `routes/ai101.ts` answers each with its own 301 to `/ai101`, and
 * without them here www sent a typed `/AI101` to the placeholder instead (found after the 2026-10-08
 * deploy; learn was always right). `/waitlist`, the short link to the page's waitlist screen
 * (D-037), for the same reason. The free guides' landing pages, which ManyChat sends people to:
 * `/task-sync-starter` (D-038), `/ops-time-audit` (D-039), `/voice-profile` (D-040), `/reel-editor`
 * (D-045) and `/retool` (D-046), every slug in
 * `routes/guide-list.ts`
 * (a test holds the two together), and every spelling in its `GUIDE_ALIASES`: `/RETOOL` and `/Retool`,
 * which the "Retool, Don't Replace" talk's room types ("Type RETOOL in the chat"), for `/AI101`'s
 * reason — `routes/guides.ts` 301s each to `/retool`, but only if www lets it reach that route. Their
 * PDFs, under `/downloads/`, are files, so they pass on their
 * own. `/library`, the free library that lists them all (D-050), with `/guides` and `/skills`, the
 * other words someone would type for it (`routes/library.ts` 301s both). `/terms` and `/privacy`
 * because the waitlist on it links to them, and a visitor on www must land on the page, not on the
 * placeholder (`routes/legal.ts`).
 * Built from `GUIDE_SLUGS` and `GUIDE_ALIASES` (D-052), so a guide added there is public on www with
 * nothing more to edit, and matched exactly like the rest.
 *
 * `/api/` because the health check lives there — Railway's probe arrives with its own `Host` and a
 * redirect would fail a deploy that is perfectly healthy — and so does the waitlist the page posts to.
 *
 * EXACT PATHS, NOT PREFIXES (D-051). Every page path above matches whole, with or without a query
 * string, and with a trailing slash only where a route answers one: `/ai101/`, `/waitlist/`, each
 * `/<slug>/`, `/library/`, `/guides/` and `/skills/` each 301 (or 302) to the page, but `/AI101/`,
 * `/ai-101/`, `/RETOOL/`, `/Retool/`, `/terms/` and `/privacy/` have no route. A path that matched
 * here and had no route fell through to `@fastify/static`'s not-found handler, which answers with the
 * app's `index.html`: until D-051, `www.amplifiedimpact.io/retool/x` (or `/ai101/anything`) served the
 * LMS shell on the public host. Now a deeper or lookalike path goes to `/` like any other unknown one,
 * and so does `/terms-old`. The sprint's calendar file, `/ai101/carousel-sprint.ics`, is a file, so it
 * passes on its own.
 */
const PUBLIC_PREFIX = exactPaths(
  // A route answers each of these with and without a trailing slash.
  ['ai101', 'waitlist', ...GUIDE_SLUGS, 'library', 'guides', 'skills'],
  // A route answers each of these only as written.
  // The offer (D-075): its page at both addresses, the page after Stripe, and the agreement. Exact, with
  // no trailing slash, so `/offer/`, `/forum/` and `/offer/welcome/x` stay off it.
  [
    'AI101', 'ai-101', ...Object.values(GUIDE_ALIASES).flatMap((aliases) => (aliases ?? []).map((a) => a.slice(1))), 'terms', 'privacy',
    'offer', 'forum', 'offer/welcome', 'agreement',
  ],
);

/**
 * `^/(a|b|c)/?($|\?)`-shaped: each name exactly, with or without a query string, and a trailing slash
 * only for `withSlash`; plus `/api/` as a prefix. Names are escaped, so a slug can never widen the match.
 */
function exactPaths(withSlash: readonly string[], asWritten: readonly string[]): RegExp {
  const alt = (names: readonly string[]) => names.map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|');
  return new RegExp(`^/((${alt(withSlash)})/?|${alt(asWritten)})($|\\?)|^/api/`);
}

/** The placeholder's own path, and the only two spellings of it. */
const ROOT = new Set(['/', '/index.html']);

/**
 * A request for a file rather than a page: anything whose last segment carries an extension.
 *
 * A real one is left alone, so an image, a font, a guide's PDF or the sprint's `.ics` resolves
 * normally instead of being bounced to the placeholder. One that no route serves answers a plain 404
 * (D-051): the page itself requests nothing — it is one self-contained response — but a browser asks
 * for `/favicon.ico` unprompted, and a 302 on that is a pointless round trip on every load. Before
 * D-051 such a path fell through to the app's not-found handler, which answers with the LMS's
 * `index.html`, so `www.../vault/x.png` and `www.../ai101.html` were the app's shell.
 */
const LOOKS_LIKE_A_FILE = /\/[^/]+\.[a-z0-9]+$/i;

export interface MarketingOptions {
  /** `apps/web/dist/holding.html`, read once by `server.ts`. `null` when it has not been built. */
  page: string | null;
}

/**
 * Serve the marketing host's placeholder, and keep the app off that host.
 *
 * Everything that is not the placeholder, a public page in `PUBLIC_PREFIX`, `/api/` or a real file
 * redirects to `/` — so a link to `www.amplifiedimpact.io/vault` lands on the placeholder rather than
 * on the LMS sign-in screen, which is what a visitor who has never heard of the product would
 * otherwise be shown. A missing file answers 404. Nothing on this host reaches the app's shell.
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

    // The placeholder first: `/index.html` also looks like a file, and is one (the app's own), so
    // checked after the file rule below it served the app's shell on www (until D-051).
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

    if (PUBLIC_PREFIX.test(req.url)) return;

    if (LOOKS_LIKE_A_FILE.test(path)) {
      // `is404` is the router's own answer, worked out before this hook runs: no route serves this
      // path. In production every file in `dist/` is a route (`wildcard: false` in `server.ts`), so
      // this is exactly "the file does not exist", and the not-found handler would answer it with the
      // app's `index.html`.
      if (!req.is404) return;
      await reply.code(404).type('text/plain; charset=utf-8').send('Not found');
      return;
    }

    await reply.code(302).redirect('/', 302);
  });
}
