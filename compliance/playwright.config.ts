import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { REF_BASE, APP_BASE, HTTP_BASE, HTTP_PARITY, HTTP_PORT } from './lib/prepare';
import { PHASE_NOW, SCENARIOS } from './lib/scenarios';

// The reference prototype is the test oracle. `capture` and `harness` only need it;
// `parity` and `e2e` also need the app's fixture build.
// APP_URL points the suite at a deployed environment instead (phase 09 post-deploy).
// Ports are overridable so a developer whose machine already has something on 4173 or 4400 can
// run the suite without stopping it: `APP_PORT=4273 pnpm compliance`. lib/global-setup.ts then
// proves the servers that answer are actually ours.
const referenceServer = {
  command: 'pnpm reference',
  url: `${REF_BASE}/lms-data.js`,
  reuseExistingServer: !process.env.CI,
};
const appServer = {
  command: 'pnpm --filter @ai/web preview:fixture',
  url: APP_BASE,
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
};
const needsApp = !process.env.APP_URL && !process.env.REFERENCE_ONLY;

// The repository root, for the http-mode server's cwd. `webServer.cwd` defaults to the directory
// holding this file, and `pnpm --filter` wants to be run from inside the workspace.
const ROOT = fileURLToPath(new URL('..', import.meta.url));

// ================================================================================================
// GATE 7's SECOND MODE: the portal, rendered from the real API, against the SAME goldens
// ================================================================================================
//
// § 7.3's checklist: "Build the web app with `VITE_DATA_SOURCE=http`, run the API with
// `NODE_ENV=test FIXED_NOW=…` against a database seeded from `seed('live')`, and sign in each
// persona through `/api/test/session`. … Every portal scenario must pass **with the same
// goldens**. This proves the backend is invisible to the user."
//
// ONE SERVER, NOT TWO. `apps/api/src/server.ts` serves `apps/web/dist` through `@fastify/static`
// and routes every non-`/api/` path to `index.html`, so the SPA and the API share an origin —
// which is how Railway serves them. A `vite preview` with a dev proxy in front would make the
// session cookie, `credentials: 'include'` and the `/api/events` EventSource all pass through a
// piece of infrastructure production does not have. That is the one thing this mode exists to
// avoid, so the command below BUILDS the SPA and then starts the API over it.
//
// `pnpm --filter @ai/web build` (not `build:fixture`) writes `apps/web/dist` with no
// `--mode fixture`, which is how `data/boot.ts` ends up in http mode: `VITE_DATA_SOURCE ?? 'http'`.
// It is set explicitly below anyway, because the same variable is what keeps `server.ts` out of
// `fixtureOnly` — which would register `/api/health` and nothing else.
//
// IT IS A DISTINCT MODE, NOT A REPLACEMENT. `appServer` and the `parity` project are untouched:
// gate 6 runs exactly what it ran before, against `dist-fixture` on APP_PORT, with no database.
const httpServer = {
  command: 'pnpm --filter @ai/web build && pnpm --filter @ai/api exec tsx src/server.ts',
  cwd: ROOT,
  // `/api/health` rather than `/`: it is the one route that exists even in `fixtureOnly`, so when
  // the guard is wrong the failure is global-setup's clear "is not serving this SPA" rather than a
  // timeout with nothing to read.
  url: `${HTTP_BASE}/api/health`,
  reuseExistingServer: !process.env.CI,
  // A cold `vite build` of the whole app plus the API's first boot. The fixture entry allows 180s
  // for one build; this one does a build and a server start.
  timeout: 300_000,
  env: {
    // Exactly 'test'. `routes/test.ts` compares `NODE_ENV` to that string and registers
    // `/api/test/session` and `/api/test/outbox` only then — and its header explains at length why
    // it is not a prefix, a truthiness check or a default. Without it every scenario 401s.
    NODE_ENV: 'test',
    // § 7.7's test clock. `clock.now()` reads this on EVERY call rather than at import, and the
    // value is the same instant `prepare.ts` hands `page.clock.setFixedTime` for a live-phase
    // scenario, so the server and the browser agree about "now".
    FIXED_NOW: PHASE_NOW.live,
    PORT: String(HTTP_PORT),
    VITE_DATA_SOURCE: 'http',
    // `email/templates/links.ts` refuses to render a sign-in or invite link against a missing
    // APP_URL, so the outbox would stay empty and `signin.spec.ts`'s "receives one message" would
    // fail for a reason that has nothing to do with sign-in. It must be THIS origin, because the
    // test then opens the emailed link in the browser.
    APP_URL: HTTP_BASE,
    // www's homepage is served at `/` on the marketing host only (`routes/marketing.ts`), so
    // `clarity-call.spec.ts` asks for it with this `Host` (D-161). Every other request here arrives
    // as 127.0.0.1, which that hook stands aside for: the app host's `/` is still the SPA.
    MARKETING_HOST: 'www.amplifiedimpact.io',
  },
};

/**
 * The scenarios http mode cannot run, and why — derived, not listed.
 *
 * `db/codec.ts`: "`Db.v`, `Db.phase` and `Db.base` are snapshot metadata, not rows … and no
 * `phase` at all — `phase` is the sales demo's time machine, and a real cohort moves through its
 * dates on its own." `Dashboard.vm.ts` reads an absent phase as `'live'` (line 229), and `phase`
 * is what selects the dashboard variant (lines 293, 337, 343). So `dash-agent-week0` and
 * `dash-agent-post` do not *nearly* match in http mode — they render the live dashboard, and the
 * diff would read as a regression in the snapshot rather than as the absence of a column.
 *
 * This is not a tolerance, a mask or an edited golden: both scenarios keep their goldens and keep
 * being checked, by fixture parity, which is where the phase seeds exist. The Gate 7 checklist
 * asks for "a database seeded from `seed('live')`", which is the one phase a single database can
 * hold, and D-018 already records the surrounding `base`/`enrolled` consequence of the same split.
 */
const PHASE_SHIFTED = SCENARIOS.filter((s) => (s.phase ?? 'live') !== 'live').map((s) => s.id);

/**
 * D-182: no `@g5` scenario is left. The learner portal those scenarios compared with the reference was
 * retired for the one at /learn, which has no golden in design-reference/, so this project runs nothing
 * and `pnpm compliance:http` passes with no tests (`--pass-with-no-tests`). It stays, so a portal scenario
 * that comes back is run in both modes again without new wiring.
 *
 * `@g5` is the portal, which is the half of the checklist http mode covers: "Admin scenarios use
 * fixture parity plus the oracle tests above" (and D-018 says why — in http mode a cohort's
 * enrolment is the row count, so the admin numbers legitimately differ from the fixture's).
 *
 * A project-level `grep` ANDs with the CLI's `--grep` rather than replacing it, which is what lets
 * `pnpm gate 7` — `pnpm compliance --grep "@g[0-7]\b"` — reach this project with the portal filter
 * still applied. Verified in the installed Playwright (1.63.0): the project's own grep is
 * `takeFirst(projectConfig.grep, config.grep, defaultGrep)` and the CLI's value is a SEPARATE
 * `preOnlyTestFilters` entry, so both matchers have to pass.
 */
const parityHttp = {
  name: 'parity-http',
  testMatch: /parity\.spec\.ts/,
  grep: /@g5\b/,
  // With no phase-shifted scenario left (D-182 retired the portal's), there is nothing to leave out: an
  // empty alternation would match every title and leave out everything.
  ...(PHASE_SHIFTED.length ? { grepInvert: new RegExp(`\\b(?:${PHASE_SHIFTED.join('|')})\\b`) } : {}),
  // Read by `lib/prepare.ts`'s `appMode()`. Metadata rather than an environment variable because
  // `parity` and `parity-http` run in ONE process environment and are distinguishable only per
  // test; `test.info().project.metadata` is per test.
  metadata: { mode: 'http' },
};

// Deterministic rasterization. Without these, Chromium's text anti-aliasing varies between runs
// (subpixel LCD filtering and CPU-dependent Skia paths), so a second capture of the same reference
// produces a few hundred differing pixels and Gate 0's zero-diff requirement cannot hold.
// These are capture conditions, not tolerances: the reference and the app both render through them.
const DETERMINISTIC_RENDER = [
  '--font-render-hinting=none',
  '--disable-lcd-text',
  '--disable-font-subpixel-positioning',
  '--force-color-profile=srgb',
  '--disable-skia-runtime-opts',
  '--disable-gpu',
  '--disable-partial-raster',
  '--disable-features=PaintHolding',
  '--hide-scrollbars',
];

export default defineConfig({
  testDir: './tests',
  // Admin redesign R2's pixel parity (D-160) has its own config, `admin-r2.config.ts`, run by
  // `pnpm parity:admin-r2`. Its spec sits in `tests/e2e/` and its name ends in `parity.spec.ts`, so
  // without this the `parity`, `parity-http` and `e2e` projects would all pick it up. No project here
  // sets its own `testIgnore`, so each inherits this one and runs exactly the tests it ran before.
  testIgnore: /admin-r2-parity\.spec\.ts$/,
  globalSetup: './lib/global-setup.ts',
  snapshotPathTemplate: '{testDir}/../goldens/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  use: { launchOptions: { args: DETERMINISTIC_RENDER } },
  expect: { toMatchSnapshot: { maxDiffPixelRatio: 0.01, threshold: 0.15 } },
  projects: [
    { name: 'reference', testMatch: /capture\.spec\.ts/ },
    { name: 'harness', testMatch: /harness\.spec\.ts/ },
    ...(HTTP_PARITY ? [parityHttp] : []),
    {
      name: 'parity',
      testMatch: /parity\.spec\.ts/,
      // INDEPENDENT of `parity-http`, deliberately. An earlier version hung http parity off this
      // project's `dependencies`, because that was the only hook into `pnpm gate 7` available to
      // someone who could not edit `scripts/gate.mjs`. The cost was severe: Playwright SKIPS a
      // project whose dependency failed, so three http-mode diffs suppressed all 55 fixture
      // scenarios and the run reported `55 did not run`. That hides the first question worth asking
      // about any http-mode failure — did fixture mode move too, or is this backend-only? It took
      // the whole primary signal away to report a secondary one.
      //
      // `scripts/gate.mjs` now runs `pnpm compliance:http` as its own step from gate 7 onwards, so
      // both suites run and both report, and neither can silence the other.
    },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/ },
  ],
  webServer: [
    referenceServer,
    ...(needsApp ? [appServer] : []),
    // `HTTP_PARITY` is already false whenever APP_URL or REFERENCE_ONLY is set (see `prepare.ts`),
    // so a post-deploy run against a deployment never tries to start a local API or seed a
    // database it does not have.
    ...(HTTP_PARITY ? [httpServer] : []),
  ],
});
