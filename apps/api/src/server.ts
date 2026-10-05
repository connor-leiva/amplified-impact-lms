// The process — phase 07 § 7.1, § 9.3 and § 9.4.
//
// This file does four things and nothing else: read the environment, build the app, serve the SPA,
// and bind a port. Every route lives in `app.ts`, which is what makes all of them reachable from
// `app.inject()` without a socket (Gate 7's oracle, its authorization matrix, and both suites in
// `apps/api/test/`).
//
// ------------------------------------------------------------------------------------------------
// THE FIXTURE GUARD IS LOAD-BEARING, AND IT IS SERVING THE LIVE SITE RIGHT NOW
// ------------------------------------------------------------------------------------------------
// `.railway/railway.ts` gives the demo environment `VITE_DATA_SOURCE: 'fixture'` and no database
// (no `DATABASE_URL`, and `preDeploy` skips the migration there). The demo site is the sales demo:
// the SPA runs against its own in-browser fixture, so the API's only jobs there are `/api/health`
// and handing over `index.html`.
//
// `build({ fixtureOnly })` therefore registers the hardening and `/api/health` and skips auth,
// snapshot, mutate, events and the test routes entirely — which is what keeps the demo deploy from
// needing a `DATABASE_URL` it does not have. `getDb()` resolves its URL on the first query rather
// than at import (see `db/client.ts`), so "no routes" really does mean "no connection attempt";
// registering the routes and relying on nobody calling them would throw a `DatabaseConfigError`
// the first time a crawler hit `/api/snapshot`.
//
// CLAUDE.md's own line on this: "Demo controls (View As, Timeline, Reset Demo) and the `?as=`,
// `?phase=` and `?now=` params exist **only** in fixture mode. They must be impossible in `http`
// mode." The guard here is the other side of that fence — in fixture mode there is no real data to
// reach, because there are no routes to reach it through.
//
// ------------------------------------------------------------------------------------------------
// WHY THE SPA's INLINE SCRIPT IS HASHED HERE
// ------------------------------------------------------------------------------------------------
// § 9.4's CSP resolves `script-src` to `'self'`, and `apps/web/index.html` carries one inline
// `<script>`: the pre-paint theme script, which sets `data-theme` before first paint so dark-mode
// viewers do not get a flash of white on every load. A CSP that blocks it throws nothing — the
// script silently does not run — so the symptom would be a flashing demo site and a clean log.
//
// The hash is computed from the file this process is about to serve rather than hard-coded: Vite
// rewrites `index.html` on every build, and a hash that drifted from the bytes would fail the same
// silent way. `app.ts`'s `inlineScriptHashes` is the pure function; this is its one caller.

import fastifyStatic from '@fastify/static';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build, inlineScriptHashes, installShutdown } from './app';

const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
const indexHtml = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url));

/** The CSP source expressions for whatever inline scripts the built SPA actually contains. */
function scriptHashes(): string[] {
  if (!existsSync(indexHtml)) return [];
  try {
    return inlineScriptHashes(readFileSync(indexHtml, 'utf8'));
  } catch {
    // An unreadable `index.html` is the static plugin's problem to report, not a reason to refuse
    // to boot: the API half still works, and the CSP is simply stricter than the page needs.
    return [];
  }
}

// `VITE_DATA_SOURCE === 'fixture'` — the exact string, as the demo environment sets it. Anything
// else, including unset, is the real API. That is the safe direction: an http-mode deploy wrongly
// read as fixture would serve the SPA with no API behind it, which fails on the first screen.
const fixtureOnly = process.env.VITE_DATA_SOURCE === 'fixture';

const app = await build({ logger: true, fixtureOnly, inlineScriptHashes: scriptHashes() });

if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false });
  // Every non-API path is a client route — `/sign-in`, `/invite/:token`, `/employees/:id` — so it
  // gets `index.html` and the router takes over. An unknown `/api/` path stays a JSON 404, because
  // a repository handed an HTML document would throw a parse error instead of the `{ error }`
  // `apps/web/src/data/http.ts` knows how to read.
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.sendFile('index.html'),
  );
}

// § 9.4's "Handle SIGTERM gracefully (close Fastify, drain SSE) so redeploys don't drop requests".
// Installed here and not in `build()`: a process listener per built app would leak across a test
// run, and a suite that emitted the signal would take the whole run down with it. `app.ts` carries
// the order the drain has to happen in.
installShutdown(app);

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
