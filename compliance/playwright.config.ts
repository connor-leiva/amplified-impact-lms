import { defineConfig } from '@playwright/test';
import { REF_BASE, APP_BASE } from './lib/prepare';

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
    { name: 'parity', testMatch: /parity\.spec\.ts/ },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/ },
  ],
  webServer: needsApp ? [referenceServer, appServer] : [referenceServer],
});
