import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The subpath alias must come first: '@ai/core/mutations' resolves to the module file, while
    // bare '@ai/core' resolves to the barrel.
    alias: [
      // The brand's motion file, bundled as it ships (tsc reads its declaration file: see ai-motion.d.ts).
      { find: '@brand/ai-motion', replacement: fileURLToPath(new URL('./src/components/motion/ai-motion.tsx', import.meta.url)) },
      // D-173: the one-time seed lives outside src/ (packages/core/seed). Tests may import it; runtime
      // code may not, and the production vite config has no such alias, so a runtime import fails the build.
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
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // A package with nothing to test yet must not fail the gate (Gate 0: 'empty test suites are allowed').
    passWithNoTests: true,
    // Not a unit-test timeout — a jsdom-under-load one. `userEvent.type()` dispatches a full
    // keyboard event sequence per character through jsdom and React, and this suite runs 29 jsdom
    // environments in parallel (vitest reports ~78s of environment setup across workers). On this
    // machine SignIn.test.tsx's 18-character address took over vitest's 5000ms DEFAULT exactly
    // once in a full run while passing 3/3 in isolation, which is the signature of contention
    // rather than a hang. GitHub's runners have 2-4 vCPU against this machine's, so a margin that
    // is already thin locally is thinner there.
    //
    // Raised rather than worked around: making the tests type faster would mean not testing what a
    // real keystroke does, and lowering parallelism would slow every run to hide one. A test that
    // genuinely hangs still fails here, just 20 seconds later.
    testTimeout: 20_000,
  },
});
