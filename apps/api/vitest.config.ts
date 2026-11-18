import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // The subpath alias must come first: '@ai/core/mutations' resolves to the module file, while
    // bare '@ai/core' resolves to the barrel. Same ordering as apps/web and the two vite configs.
    alias: [
      // D-173: the one-time seed lives outside src/ (packages/core/seed). Tests and the seed CLI may
      // import it; runtime code may not (the copy guard test and ESLint), and no bundler alias exists.
      {
        find: /^@ai\/core\/seed\/(.*)$/,
        replacement: fileURLToPath(new URL('../../packages/core/seed/$1.ts', import.meta.url)),
      },
      {
        find: /^@ai\/core\/(.*)$/,
        replacement: fileURLToPath(new URL('../../packages/core/src/$1.ts', import.meta.url)),
      },
      { find: '@ai/core', replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    // .tsx is included for the React Email template tests (phase 08 section 8.1).
    include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    // Phase 07's suites talk to a real Postgres over Railway's TCP proxy, and the first test in a
    // cold slot pays for CREATE DATABASE plus the migration — measured at 1.1s + 3.8s, which blows
    // vitest's 5000ms default and was reproduced on 6 of 6 cold runs. A Gate 7 oracle body costs
    // ~3.5s on its own (loadDb is 14 round trips, and the route under test does its own), so the
    // default leaves no headroom either. These are network-bound integration tests, not unit tests.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
