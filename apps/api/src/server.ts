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

import { existsSync, readFileSync } from 'node:fs';
import { SKILL_GUIDES_DIR, SKILL_GUIDES_FILE } from '@ai/core/skill-guides';
import type { SkillGuidesFile } from '@ai/core/skill-guides';
import { fileURLToPath } from 'node:url';
import { build, cspScriptHashes, installShutdown, productionLogger } from './app';
import { registerStaticFiles } from './static';
import { readDatabaseUrl } from './db/client';
import { startScheduler } from './jobs/scheduler';
import { startGhlSync } from './jobs/ghl-sync';
import { intakeDryRun, startGhlIntakeLoop } from './jobs/ghl-intake';
import { ghlSyncPaused, readGhlConfig } from './integrations/ghl';
import { clock } from './lib/clock';
import { GUIDE_SLUGS } from './routes/guide-list';
import { fillGuideLinks } from './routes/guides';
import { SALES_PAGES } from './routes/offer';
import type { SalesPath } from './routes/offer';
import { describeOfferConfig, readOfferConfig } from './billing/config';
import { withAnalytics } from './lib/analytics';
import { startBillingLoop } from './jobs/billing';
import { stripeClient } from './billing/stripe';

const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
const indexHtml = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url));
const ai101Html = fileURLToPath(new URL('../../web/dist/ai101.html', import.meta.url));
// The public legal pages the /ai101 waitlist links to, built beside it (`routes/legal.ts`).
const termsHtml = fileURLToPath(new URL('../../web/dist/terms.html', import.meta.url));
const privacyHtml = fileURLToPath(new URL('../../web/dist/privacy.html', import.meta.url));
// The free guides' landing pages (D-038, D-039), built beside them, one per slug. Each has an inline
// script (the same one).
const guideHtml = (slug: string) => fileURLToPath(new URL(`../../web/dist/${slug}.html`, import.meta.url));
// The marketing host's homepage (D-102), built beside the guides from `apps/web/src/home/`. It carries
// no script, so it has nothing to hash. `routes/marketing.ts` serves it at `/` on MARKETING_HOST and
// nowhere else. It replaced the "under construction" placeholder, `public/holding.html` (D-029).
const homeHtml = fileURLToPath(new URL('../../web/dist/home.html', import.meta.url));

/**
 * A www marketing page, read once: with the GA4 and Meta Pixel tag and its Buy buttons labelled
 * (D-155, `lib/analytics.ts`). Only these pages: never the learn app's `index.html`, never a legal page.
 */
const readWww = (path: string): string | null => withAnalytics(readBuilt(path));

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
const ai101Page = readWww(ai101Html);
const guidePages = Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, readWww(guideHtml(slug))]));
// D-151: every skill's full guided setup, from the web build's server-only file (never under `dist/`).
const skillGuidesJson = fileURLToPath(new URL(`../../web/${SKILL_GUIDES_DIR}/${SKILL_GUIDES_FILE}`, import.meta.url));
const skillGuides = existsSync(skillGuidesJson) ? (JSON.parse(readFileSync(skillGuidesJson, 'utf8')) as SkillGuidesFile) : null;
// The free library that lists them (D-050), which has an inline script of its own.
const libraryPage = readWww(fileURLToPath(new URL('../../web/dist/library.html', import.meta.url)));
// The offer's pages (D-075, D-104): the page after Stripe carries one inline script; the offer page
// carries none since its checkout form was retired, and the agreement is a legal page.
const offerPage = readWww(fileURLToPath(new URL('../../web/dist/offer.html', import.meta.url)));
const welcomePage = readWww(fileURLToPath(new URL('../../web/dist/offer-welcome.html', import.meta.url)));
// The www sales pages (D-111), filled per request like the offer page: no script.
const salesPages = Object.fromEntries(
  Object.entries(SALES_PAGES).map(([path, name]) => [path, readWww(fileURLToPath(new URL(`../../web/dist/${name}.html`, import.meta.url)))]),
) as Record<SalesPath, string | null>;
const agreementHtml = fileURLToPath(new URL('../../web/dist/agreement.html', import.meta.url));
// Read once, here, so a malformed FOUNDING_CLOSES_AT stops the deploy before it serves a wrong price.
const offerConfig = readOfferConfig();
const linkedGuidePages = Object.fromEntries(
  Object.entries(guidePages).map(([slug, html]) => [slug, fillGuideLinks(html, offerConfig.paymentLinks)]),
);

const app = await build({
  // § 9.4's logger, with its redaction: no cookie, and no token, email, or Google `code` or `state`
  // in a logged URL (D-139). `logger: true` here used to skip it, so production logged raw URLs.
  logger: productionLogger(),
  fixtureOnly,
  // Not the legal pages: they carry no script (`apps/web/src/legal/render.test.ts` holds them to
  // that), so they have nothing to hash, and a script added to one later stays blocked.
  inlineScriptHashes: cspScriptHashes([readBuilt(indexHtml), ai101Page, ...Object.values(linkedGuidePages), libraryPage, offerPage, welcomePage]),
  ai101Page,
  guidePages: linkedGuidePages,
  skillGuides,
  libraryPage,
  legalPages: { terms: readBuilt(termsHtml), privacy: readBuilt(privacyHtml), agreement: readBuilt(agreementHtml) },
  offer: { pages: { offer: offerPage, welcome: welcomePage, sales: salesPages }, config: offerConfig },
  marketingPage: readWww(homeHtml),
  waitlist: databaseConfigured(),
});

// The SPA's files and its client routes, outside the API's rate limit (D-137): `static.ts`.
if (existsSync(webDist)) await registerStaticFiles(app, webDist);

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

// D-229 (B-20): a submitted intake to GHL. A dry run unless GHL_INTAKE_DRY_RUN=false (it logs what it would send,
// every value redacted to its length); off in the fixture build, without a database, and while GHL_SYNC_ENABLED=false.
if (!fixtureOnly && databaseConfigured() && !ghlSyncPaused()) {
  startGhlIntakeLoop({ config: readGhlConfig(), log: app.log, now: () => clock.now() });
  app.log.info({ dryRun: intakeDryRun(), configured: readGhlConfig() !== null }, 'ghl-intake loop on');
}

// The offer (D-073 to D-078): say once what is on and in which mode, never a secret, and send the
// owner invites held for Monday once Monday comes.
app.log.info(describeOfferConfig(offerConfig), 'offer configuration');
// Not in fixture mode: there is no sign-in to invite anyone to, so invites wait for the http deploy.
// D-154: and keep both AI Accelerator Payment Links off at 15 seats sold, on again below it.
startBillingLoop({
  database: databaseConfigured() && offerConfig.invitesEnabled,
  invitesFrom: offerConfig.invitesFrom,
  log: app.log,
  seatCap: { stripe: offerConfig.stripeSecretKey ? stripeClient(offerConfig.stripeSecretKey) : null, config: offerConfig },
});

await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
