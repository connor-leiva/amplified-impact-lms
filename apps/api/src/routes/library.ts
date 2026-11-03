// The free library's page (DECISIONS.md D-050): one place that lists every guide, skill and setup.
//
//   GET /library   → the built page, from memory; 304 on a matching ETag
//   GET /library/  → 301 to /library, query string kept
//   GET <alias>    → the same 301, for each spelling in `LIBRARY_ALIASES`
//
// Served exactly as the guides are (routes/guides.ts): from memory, exempt from the global limit,
// `no-cache` with a strong ETag, and `Referrer-Policy: same-origin`, and a JSON 404 when the page has
// not been built. Not one of `GUIDE_SLUGS`, because a slug is also an opt-in route and a sign-up
// `source`, and this page has no form. Registered in both modes, as /terms and /privacy are: production
// is fixture mode and the page must be there. `routes/marketing.ts` lets every path here through on www.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { etagMatches, pageEtag } from './ai101';
import { withQuery } from './guides';

export const LIBRARY_PATH = '/library';

/**
 * The other words someone would type for this page, each answered with a 301 to `/library`. On www an
 * unknown path goes to the placeholder, so a talk that says "amplifiedimpact.io/skills" needs this.
 */
export const LIBRARY_ALIASES = ['/guides', '/skills'] as const;

export function registerLibraryPage(app: FastifyInstance, page: string | null = null): void {
  // Computed once: the page cannot change while the process runs.
  const etag = page === null ? null : pageEtag(page);

  app.get(LIBRARY_PATH, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (page === null || etag === null) return reply.code(404).send({ error: 'Not found' });
    reply.header('cache-control', 'no-cache');
    reply.header('etag', etag);
    reply.header('referrer-policy', 'same-origin');
    if (etagMatches(req.headers['if-none-match'], etag)) return reply.code(304).send();
    return reply.code(200).type('text/html; charset=utf-8').send(page);
  });

  for (const path of [`${LIBRARY_PATH}/`, ...LIBRARY_ALIASES, ...LIBRARY_ALIASES.map((alias) => `${alias}/`)]) {
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> =>
      reply.redirect(withQuery(LIBRARY_PATH, req.url), 301),
    );
  }
}
