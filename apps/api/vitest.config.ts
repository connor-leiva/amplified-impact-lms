import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // The subpath alias must come first: '@ai/core/mutations' resolves to the module file, while
    // bare '@ai/core' resolves to the barrel. Same ordering as apps/web and the two vite configs.
    alias: [
      {
        find: /^@ai\/core\/(.*)$/,
        replacement: fileURLToPath(new URL('../../packages/core/src/$1.ts', import.meta.url)),
      },
      { find: '@ai/core', replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
    ],
  },
  // .tsx is included for the React Email template tests (phase 08 section 8.1).
  test: { globals: true, environment: 'node', include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'] },
});
