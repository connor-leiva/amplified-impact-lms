// The public legal pages: the Terms of Service and the Privacy Policy that the /ai101 waitlist
// links to.
//
//   GET /terms    → the built page, from memory; 304 on a matching ETag
//   GET /privacy  → the same
//
// The pages are built by `apps/web` beside /ai101 (`vite.ai101.config.ts`, `src/legal/`), each one
// self-contained: its stylesheet inlined, no script, no request but its font files. `server.ts`
// reads `dist/terms.html` and `dist/privacy.html` once at boot and hands them to `build()`; this
// file never touches the disk, so every test can pass a page string of its own.
//
// SERVED EXACTLY AS /ai101 IS (`routes/ai101.ts` carries each argument):
//   - Exempt from § 9.4's global limit. The people who open these pages are the people on /ai101,
//     a session room behind one venue NAT, following the links under the waitlist form. A string
//     already in memory and a 304 on a revisit cost nothing worth limiting.
//   - `no-cache` with a strong ETag over the exact bytes, compared weakly as If-None-Match requires,
//     so a corrected sentence is never stuck behind a stale copy and a revisit is a bodiless 304.
//   - `Referrer-Policy: same-origin`, as on /ai101: moving between the three public pages carries
//     the referrer, and nothing is ever sent to another site. These pages have no form, so unlike
//     /ai101 nothing depends on it; it keeps the three pages' headers the same.
//   - A JSON 404 when the page has not been built, rather than falling through to the SPA's
//     not-found screen.
//   - Registered in BOTH modes, outside the fixture guard: production is fixture mode and the pages
//     must be there. They need neither a database nor a session.
//
// `routes/marketing.ts` lets both paths through on the marketing host, as it does /ai101, so the
// links work on www as well as on learn.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { etagMatches, pageEtag } from './ai101';

export const TERMS_PATH = '/terms';
export const PRIVACY_PATH = '/privacy';

export interface LegalPages {
  /** The built `apps/web/dist/terms.html`, or null when it has not been built. */
  terms?: string | null;
  /** The built `apps/web/dist/privacy.html`, or null when it has not been built. */
  privacy?: string | null;
}

/** One page's route. `page` is the built HTML, or null for a checkout nobody built. */
function registerPage(app: FastifyInstance, path: string, page: string | null): void {
  // Computed once: the page cannot change while the process runs.
  const etag = page === null ? null : pageEtag(page);

  app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (page === null || etag === null) return reply.code(404).send({ error: 'Not found' });

    reply.header('cache-control', 'no-cache');
    reply.header('etag', etag);
    // Overrides helmet's `no-referrer` for this response only, as /ai101's does. See the header.
    reply.header('referrer-policy', 'same-origin');

    if (etagMatches(req.headers['if-none-match'], etag)) return reply.code(304).send();
    return reply.code(200).type('text/html; charset=utf-8').send(page);
  });
}

/** `GET /terms` and `GET /privacy`. Registered in both modes; see the header. */
export function registerLegalPages(app: FastifyInstance, pages: LegalPages = {}): void {
  registerPage(app, TERMS_PATH, pages.terms ?? null);
  registerPage(app, PRIVACY_PATH, pages.privacy ?? null);
}
