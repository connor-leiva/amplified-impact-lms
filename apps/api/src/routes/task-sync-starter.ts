// The Task Sync Starter Kit's landing page (DECISIONS.md D-038).
//
//   GET /task-sync-starter    → the built page, from memory; 304 on a matching ETag
//   GET /task-sync-starter/   → 301 to /task-sync-starter, query string kept (ManyChat's `?src=`)
//
// Served exactly as /ai101 is (routes/ai101.ts): from memory, exempt from the global limit, `no-cache`
// with a strong ETag, and `Referrer-Policy: same-origin`, which its no-JS opt-in needs for the same
// reason the waitlist does (a plain form POST must carry a real `Origin`). The opt-in posts to
// `POST /api/task-sync-starter`, registered with the waitlist in routes/ai101.ts. The PDF is a static
// file, `/downloads/task-sync-starter-kit.pdf` (apps/web/public), served by server.ts.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { etagMatches, pageEtag, TSS_PAGE_PATH } from './ai101';

/** The page plus the request's own query string, exactly as it arrived. */
export function tssLocation(rawUrl: string): string {
  const q = rawUrl.indexOf('?');
  return q < 0 ? TSS_PAGE_PATH : `${TSS_PAGE_PATH}${rawUrl.slice(q)}`;
}

/** `page` is the built HTML, or null for a checkout nobody built (then a JSON 404). */
export function registerTaskSyncStarterPage(app: FastifyInstance, page: string | null): void {
  const etag = page === null ? null : pageEtag(page);

  app.get(TSS_PAGE_PATH, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (page === null || etag === null) return reply.code(404).send({ error: 'Not found' });
    reply.header('cache-control', 'no-cache');
    reply.header('etag', etag);
    reply.header('referrer-policy', 'same-origin');
    if (etagMatches(req.headers['if-none-match'], etag)) return reply.code(304).send();
    return reply.code(200).type('text/html; charset=utf-8').send(page);
  });

  app.get(`${TSS_PAGE_PATH}/`, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> =>
    reply.redirect(tssLocation(req.url), 301),
  );
}
