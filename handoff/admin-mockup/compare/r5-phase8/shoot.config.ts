// R-5 Phase 8 (D-269): the config for `shoot.spec.ts` (Revenue › Summary, the fixture build and the http build), Chromium
// with the R2 renderer's flags and fonts, as Phase 3's and Phase 5's screenshots were taken.
import { defineConfig } from '@playwright/test';
import { R2_FONTCONFIG } from '../../../../compliance/lib/admin-r2';

const env: Record<string, string> = {
  ...Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)),
  FONTCONFIG_FILE: R2_FONTCONFIG,
};

export default defineConfig({
  testDir: '.',
  testMatch: /shoot\.spec\.ts$/,
  outputDir: '../../../../compliance/test-results/r5-phase8',
  workers: 1,
  timeout: 180_000,
  reporter: 'line',
  use: {
    channel: 'chromium',
    launchOptions: { args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'], env },
  },
});
