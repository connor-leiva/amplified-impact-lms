import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../playwright.config';

/**
 * `pnpm parity:learner`'s Playwright config (Connor's parity brief § 3): every test whose title carries
 * `@parity:<ID>`, wherever it lives, plus the learner parity suite's own specs.
 *
 * It is the main config (`../playwright.config.ts`) with three changes, so the tagged tests run exactly as
 * they do under `pnpm e2e` / `pnpm compliance`, against the same servers:
 *
 *   1. Its projects are the main config's test projects (every one but `reference` and `harness`, which
 *      capture and drive the prototype), so a project another branch adds (a flag-off fixture build, say)
 *      is picked up without editing this file, plus two of its own:
 *        `parity-learner`       the suite's fixture specs (`tests/parity/*.spec.ts`), on the fixture build
 *        `parity-learner-http`  the suite's request-capture specs (`tests/parity/http/*.spec.ts`), on the
 *                               SAME screens built in http mode (`VITE_DATA_SOURCE=http`, the flag on),
 *                               every `/api/*` answered by the test, so the test can see which endpoints
 *                               a screen calls. Nothing else in the repository runs these two folders.
 *   2. It writes Playwright's JSON report to `compliance/parity/results/playwright.json`, which
 *      `check.ts` reads.
 *   3. Paths are re-anchored: this file sits one folder below the main config.
 *
 * The `@parity:` filter is NOT set here. A project's own `grep` (the main config's `parity-http` has one)
 * takes precedence over a config-level one, so `run.ts` passes `--grep @parity:` on the command line,
 * which Playwright ANDs with every project's own.
 */

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TESTS = fileURLToPath(new URL('../tests', import.meta.url));

export const LEARNER_HTTP_PORT = Number(process.env.LEARNER_HTTP_PORT ?? 4474);
export const LEARNER_HTTP_BASE = `http://127.0.0.1:${LEARNER_HTTP_PORT}`;
export const PLAYWRIGHT_JSON = `${HERE}results/playwright.json`;

const CAPTURE_ONLY = new Set(['reference', 'harness']);
const inherited = (base.projects ?? []).filter((p) => !CAPTURE_ONLY.has(p.name ?? ''));

/**
 * The http-mode build the request-capture specs open. Its own output folder (`compliance/parity/dist/`, which git and eslint ignore as every `dist/`)
 * and port, so it never touches `apps/web/dist` (which the http parity server serves) or the fixture build.
 */
const HTTP_BUILD = `${HERE}dist`;
const learnerHttpServer = {
  command: `pnpm --filter @ai/web exec vite build --outDir ${HTTP_BUILD} --emptyOutDir && pnpm --filter @ai/web exec vite preview --outDir ${HTTP_BUILD} --port ${LEARNER_HTTP_PORT} --strictPort`,
  cwd: ROOT,
  url: LEARNER_HTTP_BASE,
  reuseExistingServer: !process.env.CI,
  timeout: 300_000,
  env: { VITE_DATA_SOURCE: 'http', VITE_LEARNER_V2: 'true' },
};

const webServers = Array.isArray(base.webServer) ? base.webServer : base.webServer ? [base.webServer] : [];
const needsHttpBuild = !process.env.APP_URL && !process.env.REFERENCE_ONLY;

const config: PlaywrightTestConfig = {
  ...base,
  testDir: TESTS,
  globalSetup: fileURLToPath(new URL('../lib/global-setup.ts', import.meta.url)),
  snapshotPathTemplate: `${TESTS}/../goldens/{arg}{ext}`,
  outputDir: `${HERE}results/artifacts`,
  reporter: [
    ['list'],
    ['json', { outputFile: PLAYWRIGHT_JSON }],
    ['html', { open: 'never', outputFolder: `${HERE}results/report` }],
  ],
  projects: [
    ...inherited,
    { name: 'parity-learner', testMatch: /parity\/[^/]+\.spec\.ts$/ },
    {
      name: 'parity-learner-http',
      testMatch: /parity\/http\/[^/]+\.spec\.ts$/,
      metadata: { learnerHttpBase: LEARNER_HTTP_BASE },
    },
  ],
  webServer: [
    // The main config's servers keep their relative cwd (`compliance/`), so anchor them there.
    ...webServers.map((w) => ({ ...w, cwd: w.cwd ?? fileURLToPath(new URL('..', import.meta.url)) })),
    ...(needsHttpBuild ? [learnerHttpServer] : []),
  ],
};

export default defineConfig(config);
