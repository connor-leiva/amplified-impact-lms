// R-5 Phase 6 (D-265): the config for `shoot.spec.ts` (Program's screens, fixture build, the launch database), Chromium
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
  outputDir: '../../../../compliance/test-results/r5-phase6',
  workers: 1,
  timeout: 180_000,
  reporter: 'line',
  use: {
    channel: 'chromium',
    launchOptions: { args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'], env },
  },
});
