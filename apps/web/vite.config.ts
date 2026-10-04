import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `--mode fixture` builds the prototype-identical fixture app the compliance suite runs against.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    // The subpath alias must come first: '@ai/core/mutations' resolves to the module file, while
    // bare '@ai/core' resolves to the barrel.
    alias: [
      {
        find: /^@ai\/core\/(.*)$/,
        replacement: fileURLToPath(new URL('../../packages/core/src/$1.ts', import.meta.url)),
      },
      { find: '@ai/core', replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
    ],
  },
  define: mode === 'fixture' ? {} : {},
  css: { modules: { generateScopedName: '[name]_[local]_[hash:base64:4]' } },
  // tokens.css and global.css are GENERATED and must ship verbatim (CLAUDE.md § Non-negotiables).
  // Vite 8 minifies CSS with LightningCSS, which rewrites custom-property values (0.08 -> .08,
  // ' -> ") and injects --lightningcss-light/dark for the color-scheme declarations. That breaks
  // the Gate 1 token-parity contract, so CSS minification is off. The payload cost is small and
  // gzips well; the phase 09 budget is on JS.
  build: { sourcemap: true, cssMinify: false },
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:3000' } },
  // The compliance suite's target. strictPort so a port already in use fails loudly instead of
  // silently sliding to the next one; APP_PORT lets a developer dodge a local collision.
  preview: { host: '127.0.0.1', port: Number(process.env.APP_PORT ?? 4173), strictPort: true },
}));
