import { defineConfig } from '@playwright/test';
import { APP_BASE, ROUTES } from './lib/admin-r2';

// `pnpm parity:admin-r2`: the Admin redesign R2 pixel-parity run (D-160, BUILD-SPEC § 6).
//
// ITS OWN CONFIG, deliberately. The main config's `parity`, `parity-http` and `e2e` projects keep
// their tests, goldens, tolerances and counts (55 / 24 / 112); that config ignores this spec, and
// this one runs nothing else. Report-only until a cell is enforced (`lib/admin-r2.ts`).
//
// ONE RENDERER. The refs in `design-reference/admin-redesign-r2/ref/` are rendered by
// `harness/render-mockup.mjs` in the pinned container (`mcr.microsoft.com/playwright:v1.63.0-noble`)
// with `CHROME=/ms-playwright/chromium-1243/chrome-linux64/chrome`, the full Chromium build (Google
// Chrome for Testing 153.0.8010.12). `channel: 'chromium'` launches that same binary here (not the
// headless shell the main config's projects use), with the harness's own launch arguments, so the
// app and the refs are rasterised alike. Run it in the container:
//
//   docker run --rm --network host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-noble \
//     bash -lc 'corepack enable && pnpm i --frozen-lockfile && pnpm parity:admin-r2'
//
// The report is `compliance/parity/out/report.md` (gitignored), with the diff PNGs and app/ref
// side-by-sides beside it.
const HARNESS_ARGS = ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'];

const built = Object.keys(ROUTES).length > 0;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /admin-r2-parity\.spec\.ts$/,
  globalSetup: './lib/admin-r2-setup.ts',
  globalTeardown: './lib/admin-r2-report.ts',
  outputDir: './test-results/admin-r2',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: { channel: 'chromium', launchOptions: { args: HARNESS_ARGS } },
  projects: [{ name: 'admin-r2' }],
  // The app's fixture build, only once a screen is built. R2-0 builds none, so no server starts.
  webServer: built
    ? [{ command: 'pnpm --filter @ai/web preview:fixture', url: APP_BASE, reuseExistingServer: !process.env.CI, timeout: 180_000 }]
    : [],
});
