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
  test: { globals: true, environment: 'node', include: ['test/**/*.test.ts', 'src/**/*.test.ts'] },
});
