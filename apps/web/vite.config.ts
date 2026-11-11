import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { ai101Render } from './src/ai101/vite-plugin.ts';
import { legalRender } from './src/legal/vite-plugin.ts';
import { guideRender } from './src/guides/vite-plugin.ts';
import { voiceRender } from './src/voice/vite-plugin.ts';
import { retoolRender } from './src/retool/vite-plugin.ts';
import { libraryRender } from './src/library/vite-plugin.ts';
import { offerRender } from './src/offer/vite-plugin.ts';
import { homeRender } from './src/home/vite-plugin.ts';

// `--mode fixture` builds the prototype-identical fixture app the compliance suite runs against.
export default defineConfig(({ mode }) => ({
  // `ai101Render` only so `pnpm dev` serves /ai101 with its content. It leaves `index.html` alone;
  // the page's real build is vite.ai101.config.ts (see src/ai101/vite-plugin.ts for why).
  // `legalRender` is the same thing for /terms and /privacy (src/legal/vite-plugin.ts).
  // `guideRender`, `voiceRender` and `retoolRender` likewise, for the free guides (D-038, D-039), the
  // voice profile setup (D-040), the "Retool, Don't Replace" kit (D-046) and the free library (D-050).
  plugins: [react(), ai101Render(), legalRender(), guideRender(), voiceRender(), retoolRender(), libraryRender(), offerRender(), homeRender()],
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
  // /ai101's calendar file is an API route outside /api (D-032), so it is proxied by name.
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3000', '/ai101/carousel-sprint.ics': 'http://127.0.0.1:3000' },
  },
  // The compliance suite's target. strictPort so a port already in use fails loudly instead of
  // silently sliding to the next one; APP_PORT lets a developer dodge a local collision.
  preview: { host: '127.0.0.1', port: Number(process.env.APP_PORT ?? 4173), strictPort: true },
}));
