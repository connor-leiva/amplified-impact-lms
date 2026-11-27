// R-5 audit fixes (D-267): the config for `shoot.spec.ts` (every screen this change touches, fixture build). README.md
// says how it was run. Chromium with the R2 renderer's flags and fonts, as Phase 5's screenshots were taken.
import { defineConfig } from '@playwright/test';
import { R2_FONTCONFIG } from '../../../../compliance/lib/admin-r2';

const env: Record<string, string> = {
  ...Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)),
  FONTCONFIG_FILE: R2_FONTCONFIG,
};

export default defineConfig({
  testDir: '.',
  testMatch: /shoot\.spec\.ts$/,
  outputDir: '../../../../compliance/test-results/r5-audit-fixes',
  workers: 1,
  timeout: 600_000,
  reporter: 'line',
  use: {
    channel: 'chromium',
    launchOptions: { args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'], env },
  },
  webServer: { command: 'pnpm --filter @ai/web preview:fixture', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 240_000 },
});
