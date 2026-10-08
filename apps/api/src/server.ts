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
// The live site runs `VITE_DATA_SOURCE: 'fixture'`: the SPA runs against its own in-browser
// fixture, so the API's jobs there are `/api/health`, handing over `index.html`, and the public
// /ai101 page. It runs fixture mode WITH a `DATABASE_URL` — for the /ai101 waitlist and nothing
// else. The planned demo environment is the other shape: fixture mode with no database at all (no
// `DATABASE_URL`, and `preDeploy` skips the migration there; `.railway/railway.ts`).
//
// `build({ fixtureOnly })` therefore registers the hardening, `/api/health` and the /ai101 page,
// and skips auth, snapshot, mutate, events and the test routes entirely — which is what keeps a
// fixture deploy from exposing data routes, and a database-less one from needing a `DATABASE_URL`
// it does not have. `getDb()` resolves its URL on the first query rather than at import (see
// `db/client.ts`), so "no routes" really does mean "no connection attempt"; registering the routes
// and relying on nobody calling them would throw a `DatabaseConfigError` the first time a crawler
// hit `/api/snapshot`.
//
// The waitlist is the one route that needs a database and nothing else, so it is NOT behind the
// fixture guard: it gets `waitlist`, read below from whether a database is configured at all. Keyed
// on `fixtureOnly` it would not exist in production, which is fixture mode; keyed on nothing it
// would throw `DatabaseConfigError` on the demo deploy's first sign-up. `routes/ai101.ts` has the
// rest of that argument.
//
// CLAUDE.md's own line on this: "Demo controls (View As, Timeline, Reset Demo) and the `?as=`,
// `?phase=` and `?now=` params exist **only** in fixture mode. They must be impossible in `http`
// mode." The guard here is the other side of that fence — in fixture mode there is no real data to
// reach, because there are no routes to reach it through. The waitlist does not breach that: it
// only writes, into a table no route reads.
//
// ------------------------------------------------------------------------------------------------
// WHY THE INLINE SCRIPTS ARE HASHED HERE
// ------------------------------------------------------------------------------------------------
// § 9.4's CSP resolves `script-src` to `'self'`, and `apps/web/index.html` carries one inline
// `<script>`: the pre-paint theme script, which sets `data-theme` before first paint so dark-mode
// viewers do not get a flash of white on every load. A CSP that blocks it throws nothing — the
// script silently does not run — so the symptom would be a flashing demo site and a clean log.
// `dist/ai101.html` carries one too: its whole client script (copy buttons, checklist, waitlist),
// inlined by its build so the page is a single request. Blocked, the page still reads — it is
// built to — but every copy button is dead, which is the page's whole point.
//
// The hashes are computed from the files this process is about to serve rather than hard-coded:
// Vite rewrites both files on every build, and a hash that drifted from the bytes would fail the
// same silent way. `app.ts`'s `cspScriptHashes` is the pure function; this is its one caller.

import fastifyStatic from '@fastify/static';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build, cspScriptHashes, installShutdown } from './app';
import { readDatabaseUrl } from './db/client';
import { startScheduler } from './jobs/scheduler';
import { startGhlSync } from './jobs/ghl-sync';

const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
const indexHtml = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url));
const ai101Html = fileURLToPath(new URL('../../web/dist/ai101.html', import.meta.url));
// The public legal pages the /ai101 waitlist links to, built beside it (`routes/legal.ts`).
const termsHtml = fileURLToPath(new URL('../../web/dist/terms.html', import.meta.url));
const privacyHtml = fileURLToPath(new URL('../../web/dist/privacy.html', import.meta.url));
// The marketing host's placeholder. It ships in `public/`, so the SPA's own build copies it
// into `dist/` verbatim — it needs no build step of its own, because it carries no script and
// no import. `routes/marketing.ts` serves it on MARKETING_HOST and nowhere else.
const holdingHtml = fileURLToPath(new URL('../../web/dist/holding.html', import.meta.url));

/** A built page's contents, or `null` when it has not been built or cannot be read. */
function readBuilt(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    // An unreadable page is not a reason to refuse to boot: the API half still works. A missing
    // `index.html` is the static plugin's to report; a missing `ai101.html` makes `/ai101` a 404.
    return null;
  }
}

/**
 * Whether a database is configured — the waitlist's switch.
 *
 * Through `readDatabaseUrl` rather than a bare `process.env.DATABASE_URL` check, because that is the
 * function `getDb()` will resolve the URL with: it loads `apps/api/.env` when the environment does
 * not carry the variable, which is how `pnpm dev` gets its database. A bare check would answer
 * "none" locally and quietly 404 the waitlist on a machine where every other route works. On
 * Railway it reads the service's variable and nothing else, so the two answers agree there.
 */
function databaseConfigured(): boolean {
  try {
    readDatabaseUrl();
    return true;
  } catch {
    return false;
  }
}

// `VITE_DATA_SOURCE === 'fixture'` — the exact string, as a fixture deploy sets it. Anything else,
// including unset, is the real API. That is the safe direction: an http-mode deploy wrongly read
// as fixture would serve the SPA with no API behind it, which fails on the first screen.
const fixtureOnly = process.env.VITE_DATA_SOURCE === 'fixture';

// Read ONCE, and the same string goes to both places: `build()` serves it from memory and
// `cspScriptHashes` hashes it, so a rebuild on disk while this process runs cannot leave the page
// served under a hash computed from different bytes.
const ai101Page = readBuilt(ai101Html);

const app = await build({
  logger: true,
  fixtureOnly,
  // Not the legal pages: they carry no script (`apps/web/src/legal/render.test.ts` holds them to
  // that), so they have nothing to hash, and a script added to one later stays blocked.
  inlineScriptHashes: cspScriptHashes([readBuilt(indexHtml), ai101Page]),
  ai101Page,
  legalPages: { terms: readBuilt(termsHtml), privacy: readBuilt(privacyHtml) },
  marketingPage: readBuilt(holdingHtml),
  waitlist: databaseConfigured(),
});

if (existsSync(webDist)) {
  await app.register(fastifyStatic, {
    root: webDist,
    wildcard: false,
    // `wildcard: false` registers a route for every file in `dist/`, which would serve the /ai101
    // page a second time at `/ai101.html` — under § 9.4's global limit and helmet's `no-referrer`,
    // i.e. without the two things `routes/ai101.ts` serves it with (its no-JS form would 403 from
    // there). One URL for the page; `/ai101.html` falls through to the SPA like any unknown path.
    // The legal pages likewise: one URL each, `/terms` and `/privacy` (`routes/legal.ts`).
    globIgnore: ['ai101.html', 'terms.html', 'privacy.html'],
  });
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

// § 8.5: "Run the scheduler in-process in the API service, guarded by a Postgres advisory lock so
// only one replica executes jobs."
//
// HERE AND NOT IN `build()`, for the two reasons this file already gives about `installShutdown`
// one line up, plus one of its own:
//   - `build()` runs once per test — Gate 7's oracle calls it 37 times — so an interval and two
//     signal listeners per built app would leak across a run, and a suite that fired the signal
//     would take the whole run down. `scheduler.test.ts` drives `runScheduledJobs` and
//     `startScheduler` directly instead, which is also the only way to test the lock and the loop.
//   - THE FIXTURE GUARD IS HERE. `fixtureOnly` is already computed above for `build()`, and the
//     demo environment has no `DATABASE_URL` at all — an armed scheduler there would throw
//     `DatabaseConfigError` every 60 seconds on the deploy serving the live sales demo. (Production
//     is fixture mode WITH a database, for the /ai101 waitlist. The scheduler follows
//     `fixtureOnly`, not the database, so it stays off there as it did before the waitlist
//     existed; arming it is a decision about the program's emails, not about this page.) Passing
//     the flag rather than re-reading `VITE_DATA_SOURCE` inside the scheduler
//     keeps one reading of that variable in the process, which is the point of the comment above
//     `const fixtureOnly`.
//
// `app.log` so a tick's lines land in § 9.4's JSON log with its redaction, rather than on a bare
// console the deploy does not collect.
//
// After `installShutdown` and before `listen`, and neither position is load-bearing: both SIGTERM
// handlers run in the same synchronous dispatch (Node calls listeners in registration order) and
// `shutdown()`'s first `await`, inside `settleEmails()`, yields before the interval could fire
// again — and the first tick is 60 s out, so it cannot precede Railway's first healthcheck either.
startScheduler({ fixtureOnly, log: app.log });

// The /ai101 waitlist's copy into GoHighLevel (D-033). Its own loop, armed by the WAITLIST — a
// database — and both GHL variables, not by `fixtureOnly`: it is about this page, not about the
// program's emails, which is the distinction the comment above draws. Off and saying so otherwise.
startGhlSync({ waitlist: databaseConfigured(), log: app.log });

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
