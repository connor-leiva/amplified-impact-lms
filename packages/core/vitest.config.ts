import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/icons.ts', 'src/types.ts'],
      thresholds: { lines: 95, functions: 90, branches: 85, statements: 95 },
    },
  },
});
