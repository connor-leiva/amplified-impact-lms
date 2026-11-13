// The SPA's built files and its client routes (D-137), moved out of `server.ts` so a test can serve a
// real directory through them. `server.ts` calls `registerStaticFiles` once, after `build()`.
//
// WHY THIS IS ITS OWN FILE. On Nov 11, rapid reloads of learn.amplifiedimpact.io/employees/marketing
// answered `/assets/*.js` and `*.css` with 429, and with the rate limiter's JSON body, so the SPA never
// booted: a blank page. The global limit (`GLOBAL_RATE_MAX` a minute per IP) was counting every
// file. A room of buyers on one conference Wi-Fi shares one IP, and one cold load of the app is about
// twenty files, so five people loading at once could lock the room out. Now:
//
//   - THE LIMITER IS FOR THE API. `app.ts` limits `/api/*` only (`isApiPath`); files and pages never
//     count, wherever they are served from (learn or www).
//   - HASHED FILES ARE IMMUTABLE. Vite names every file under `/assets/` by its content, so a browser
//     may keep it for a year and never ask again: `public, max-age=31536000, immutable`. `index.html`
//     is `no-cache`, so a new deploy's file names are picked up on the next load.
//   - A MISSING FILE IS A REAL 404. A request under `/assets/` that matches no file answers
//     `404 Not found` as text, never `index.html` (which a browser would try to run as a script, or
//     apply as a stylesheet) and never JSON.

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { PAID_GROK_DOWNLOADS } from '@ai/core/grok-templates';
import { GUIDED_DOWNLOADS, guidedPageOfFile, skillGuideUrl } from '@ai/core/skill-guides';
import { PAID_DOWNLOADS } from './billing/skills-catalog';
import { GUIDE_SLUGS } from './routes/guide-list';
import { SALES_PAGES } from './routes/offer';

/** Vite's content-hashed build output. */
export const HASHED_PREFIX = '/assets/';
export const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Files in `dist/` that have a route of their own (or are not public at all), so the static plugin
 * must not serve a second copy. Unchanged from `server.ts`; see each line's reason there and below.
 */
export function staticIgnores(): string[] {
  return [
    // `wildcard: false` registers a route for every file in `dist/`, which would serve the /ai101
    // page a second time at `/ai101.html` — under § 9.4's global limit and helmet's `no-referrer`,
    // i.e. without the two things `routes/ai101.ts` serves it with (its no-JS form would 403 from
    // there). One URL for the page; `/ai101.html` falls through to the SPA like any unknown path.
    // The legal pages likewise: one URL each, `/terms` and `/privacy` (`routes/legal.ts`).
    // And the free guides (D-038, D-039), whose route sets the Referrer-Policy their no-JS opt-in needs.
    'ai101.html',
    'terms.html',
    'privacy.html',
    'library.html',
    // The offer's pages have one URL each (routes/offer.ts, routes/legal.ts), filled per request.
    'offer.html',
    'offer-welcome.html',
    'agreement.html',
    // So do the www sales pages (D-111): `/pricing` and the rest of `SALES_PAGES`.
    ...Object.values(SALES_PAGES).map((name) => `${name}.html`),
    // www's homepage has one URL, `/` on the marketing host (routes/marketing.ts), and none on learn.
    'home.html',
    ...GUIDE_SLUGS.map((slug) => `${slug}.html`),
    // Paid skills are not public files (D-082): they live in the bucket and open through the
    // platform's library. `PAID_DOWNLOADS` names them; `test/paid-skills.test.ts` holds the list.
    ...PAID_DOWNLOADS.map((file) => `downloads/${file}`),
    // So are the paid Grok Bot templates (D-100), from their own list, not the skills'.
    ...PAID_GROK_DOWNLOADS.map((file) => `downloads/${file}`),
    // And, since D-151, every skill's and template's file, free ones too: each is part of its guided
    // setup in learn, downloaded through the access-checked route (a free one needs a free account).
    ...GUIDED_DOWNLOADS.map((file) => `downloads/${file}`),
  ];
}

const pathOf = (url: string): string => url.split('?')[0] ?? url;

/**
 * A hashed file is kept for a year; `index.html` is checked on every load, so a deploy's new file
 * names are picked up; anything else keeps the `public, max-age=0` it always had.
 */
export function cacheControlFor(filePath: string): string {
  if (filePath.includes(HASHED_PREFIX)) return IMMUTABLE;
  if (filePath.endsWith('/index.html')) return 'no-cache';
  return 'public, max-age=0';
}

export async function registerStaticFiles(app: FastifyInstance, root: string): Promise<void> {
  await app.register(fastifyStatic, {
    root,
    wildcard: false,
    globIgnore: staticIgnores(),
    // `send` would set its own `public, max-age=0` after `setHeaders` runs, over the top of ours, so
    // the plugin leaves Cache-Control alone and `setHeaders` sets it for every file.
    cacheControl: false,
    setHeaders: (res, path) => {
      const p = path.replace(/\\/g, '/');
      // The guides' files (D-038, D-039; the Reel Editor's ZIP, D-045) are lead magnets behind an
      // opt-in: kept out of search results.
      if (p.includes('/downloads/')) res.setHeader('x-robots-tag', 'noindex');
      res.setHeader('cache-control', cacheControlFor(p));
    },
  });

  // Every non-API path is a client route — `/sign-in`, `/invite/:token`, `/employees/:id` — so it
  // gets `index.html` and the router takes over. An unknown `/api/` path stays a JSON 404, because
  // a repository handed an HTML document would throw a parse error instead of the `{ error }`
  // `apps/web/src/data/http.ts` knows how to read.
  app.setNotFoundHandler((req, reply) => {
    const path = pathOf(req.url);
    if (path.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
    // A skill's or template's old ZIP link (D-151): on to its guided setup in learn, which signs the
    // visitor in and checks the plan first. Its own page, by the catalog, never anywhere else.
    if (path.startsWith('/downloads/')) {
      const page = guidedPageOfFile(path.slice('/downloads/'.length));
      if (page) return reply.redirect(skillGuideUrl(page), 302);
    }
    // A file no route serves is a plain 404, never the SPA: a hashed file an older or newer deploy
    // named (D-137), or any other missing download.
    if (path.startsWith('/downloads/') || path.startsWith(HASHED_PREFIX)) return reply.code(404).type('text/plain; charset=utf-8').send('Not found');
    return reply.sendFile('index.html');
  });
}
