// The free guides' landing pages (DECISIONS.md D-038, D-039), one per slug in `guide-list.ts`.
//
//   GET /<slug>    → the built page, from memory; 304 on a matching ETag
//   GET /<slug>/   → 301 to /<slug>, query string kept (ManyChat's `?src=`)
//   GET <alias>    → the same 301, for each spelling in `GUIDE_ALIASES` (/retool's `/RETOOL` and
//                    `/Retool`, D-046: the talk says "Type RETOOL in the chat")
//
// Served exactly as /ai101 is (routes/ai101.ts): from memory, exempt from the global limit, `no-cache`
// with a strong ETag, and `Referrer-Policy: same-origin`, which the no-JS opt-in needs for the same
// reason the waitlist does (a plain form POST must carry a real `Origin`). Each opt-in posts to
// `POST /api/<slug>`, registered with the waitlist in routes/ai101.ts. The PDFs are static files under
// `/downloads/` (apps/web/public), served by server.ts.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { etagMatches, pageEtag } from './ai101';
import { GUIDE_ALIASES, GUIDE_SLUGS, guidePagePath, type GuideSlug } from './guide-list';

/** Each guide's built HTML, by slug; a missing or null one answers a JSON 404. */
export type GuidePages = Partial<Record<GuideSlug, string | null>>;

/**
 * Skill pages name a cart (`%%link:<cart>%%`). Fill it from the Payment Link Railway holds for that
 * cart, the same tokens the sales pages use. An unset link stays empty: the button has nowhere to go
 * until the variable is set.
 */
export function fillGuideLinks(html: string | null, links: Partial<Record<string, string>>): string | null {
  if (html === null) return null;
  return html.replace(/%%link:([a-z0-9-]+)%%/g, (_whole, id: string) => links[id] ?? '');
}

/** A path plus the request's own query string, exactly as it arrived. */
export function withQuery(path: string, rawUrl: string): string {
  const q = rawUrl.indexOf('?');
  return q < 0 ? path : `${path}${rawUrl.slice(q)}`;
}

export function registerGuidePages(app: FastifyInstance, pages: GuidePages = {}): void {
  for (const slug of GUIDE_SLUGS) {
    const path = guidePagePath(slug);
    const page = pages[slug] ?? null;
    const etag = page === null ? null : pageEtag(page);

    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (page === null || etag === null) return reply.code(404).send({ error: 'Not found' });
      reply.header('cache-control', 'no-cache');
      reply.header('etag', etag);
      reply.header('referrer-policy', 'same-origin');
      if (etagMatches(req.headers['if-none-match'], etag)) return reply.code(304).send();
      return reply.code(200).type('text/html; charset=utf-8').send(page);
    });

    app.get(`${path}/`, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> =>
      reply.redirect(withQuery(path, req.url), 301),
    );

    // Its other spellings (D-046), answered exactly as the trailing slash is: a 301, query intact,
    // exempt for the page's reason (a room typing the slide's word into the same NAT in one minute).
    // find-my-way matches paths case-sensitively, so each spelling is a route of its own.
    for (const alias of GUIDE_ALIASES[slug] ?? []) {
      app.get(alias, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> =>
        reply.redirect(withQuery(path, req.url), 301),
      );
    }
  }
}
