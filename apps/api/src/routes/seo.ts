// Public discovery files for the two hosts this process serves.
//
// `www` is the marketing site Google should index. `learn` is the product: sign-in, the course, and
// the same public pages under a second hostname. Unknown paths on learn are the app shell with 200,
// so a crawler that is allowed in would index the shell over and over and would also index copies of
// the marketing pages. learn's robots.txt therefore disallows everything. The public pages declare
// www as their canonical address.
//
// Both files are answered here, in an `onRequest` hook, for the same reason `routes/marketing.ts`
// does not register `GET /`: a route would be in the authorization inventory, and on learn a missing
// file otherwise falls through to `index.html`. The hook runs before that one, so `/robots.txt` and
// `/sitemap.xml` never become the homepage redirect or the app shell.
//
// THE SITEMAP IS THE ROUTE LISTS. Sales paths come from `SALES_PAGES`, skill and guide paths from
// `GUIDE_SLUGS` (the same arrays the marketing host lets through). A page added to either list is in
// the sitemap with no second edit. `lastmod` is the library card's `added` date when that card names
// the path (`ENTRIES` in the web app); a page with no such date omits the tag rather than inventing one.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { ENTRIES } from '../../../web/src/library/content';
import type { App } from '../app';
import { GUIDE_SLUGS } from './guide-list';
import { SALES_PAGES } from './offer';

/** The public marketing pages that are not a sales path and not a guide slug. */
const STATIC_PATHS = ['/', '/library', '/privacy', '/terms', '/agreement', '/ai101'] as const;

const ADDED = new Map(
  ENTRIES.flatMap((entry) => (entry.href && /^\d{4}-\d{2}-\d{2}$/.test(entry.added) ? [[entry.href, entry.added] as const] : [])),
);

/** `Host` without a port, lower-cased. A header is not case-normalised by every client. */
export function requestHostname(hostHeader: string | undefined): string {
  return (hostHeader ?? '').toLowerCase().split(':')[0] ?? '';
}

/**
 * Every public marketing URL path, in a stable order: the homepage and the named site pages first,
 * then any sales path added later, then every guide and skill slug. Duplicates collapse.
 */
export function marketingPaths(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of [...STATIC_PATHS, ...Object.keys(SALES_PAGES), ...GUIDE_SLUGS.map((slug) => `/${slug}`)]) {
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/** `https://www.example` + `/pricing` → `https://www.example/pricing`, and `/` keeps its slash. */
export function absoluteUrl(origin: string, path: string): string {
  return path === '/' ? `${origin}/` : `${origin}${path}`;
}

const xml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The sitemap, canonical https URLs on `origin`, `lastmod` only where the library records a date. */
export function sitemapXml(origin: string): string {
  const urls = marketingPaths().map((path) => {
    const lastmod = ADDED.get(path);
    const loc = `    <loc>${xml(absoluteUrl(origin, path))}</loc>`;
    const when = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n${loc}${when}\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** www: crawl the site, skip the API and the lead-magnet files, and point at the sitemap. */
export function marketingRobots(origin: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /downloads/', '', `Sitemap: ${absoluteUrl(origin, '/sitemap.xml')}`, ''].join('\n');
}

/**
 * learn (and any host that is not the marketing site): do not crawl. The app is behind sign-in, and
 * the pages that are public on purpose are the same documents on www.
 */
export function appRobots(): string {
  return ['User-agent: *', 'Disallow: /', ''].join('\n');
}

/**
 * The marketing host's not-found page. A real 404, with a way onward, so an unknown address is not a
 * soft 404 (a 302 to `/`, which search engines store as another copy of the homepage).
 *
 * `no-store`: a path that 404s today may be a page after the next deploy, and a cached 404 would hide
 * it. `noindex` as well, in the document and on the response, so the 404 itself is not a result.
 */
export function notFoundPage(): string {
  const link = (href: string, label: string) => `<li><a href="${href}">${label}</a></li>`;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="robots" content="noindex" />',
    '<title>Page Not Found · Amplified Impact</title>',
    '<style>',
    ':root { color-scheme: dark; }',
    'body { margin: 0; min-height: 100vh; background: #10211c; color: #f4f2ec; font: 18px/1.5 ui-sans-serif, system-ui, sans-serif; }',
    'main { max-width: 36rem; padding: 64px 24px; }',
    'img { height: 28px; width: auto; }',
    'h1 { font-size: 2.25rem; line-height: 1.15; font-weight: 650; letter-spacing: -0.03em; margin: 28px 0 8px; }',
    'p { margin: 0 0 24px; }',
    'ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }',
    'a { color: #b7ead4; }',
    'a:focus-visible { outline: 2px solid #b7ead4; outline-offset: 3px; }',
    '</style>',
    '</head>',
    '<body>',
    '<main>',
    '<a href="/"><img src="/brand/amplified-impact-wordmark-on-dark.png" width="180" height="27" alt="Amplified Impact" /></a>',
    '<h1>Page not found</h1>',
    '<p>That address isn’t on this site. It may be mistyped, or the page may have moved.</p>',
    '<ul>',
    link('/', 'Home'),
    link('/pricing', 'Programs'),
    link('/library', 'The Library'),
    link('/free', 'Free Resources'),
    link('/about', 'About'),
    '</ul>',
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

const TEXT = 'text/plain; charset=utf-8';
const XML = 'application/xml; charset=utf-8';
const SHORT = 'public, max-age=300';

/**
 * `/robots.txt` on every host, and `/sitemap.xml` on the marketing host only.
 *
 * Registered before the marketing hook. Sending a reply sets `reply.sent`, and Fastify then skips
 * the hooks after this one, so www does not answer these paths with the homepage or a file 404.
 * Inert for every other path. No sitemap on learn: that host's robots file disallows crawling, and
 * a sitemap there would name www's URLs from the wrong host. A request for it falls through as before.
 */
export function registerPublicSeo(app: App): void {
  const marketing = (process.env.MARKETING_HOST ?? '').trim().toLowerCase();
  const origin = marketing === '' ? '' : `https://${marketing}`;

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return;
    const path = req.url.split('?')[0] ?? '/';
    if (path !== '/robots.txt' && path !== '/sitemap.xml') return;

    const host = requestHostname(req.headers.host);
    if (path === '/sitemap.xml') {
      if (origin === '' || host !== marketing) return;
      await reply.code(200).type(XML).header('cache-control', SHORT).send(sitemapXml(origin));
      return;
    }

    const body = origin !== '' && host === marketing ? marketingRobots(origin) : appRobots();
    await reply.code(200).type(TEXT).header('cache-control', SHORT).send(body);
  });
}
