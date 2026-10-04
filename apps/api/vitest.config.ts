import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@ai/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
  },
  test: { globals: true, environment: 'node', include: ['test/**/*.test.ts', 'src/**/*.test.ts'] },
});
