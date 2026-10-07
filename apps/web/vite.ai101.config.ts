import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { ai101Inline, ai101Render } from './src/ai101/vite-plugin.ts';

// The /ai101 page's own build (DECISIONS.md D-028), run after the SPA's by `pnpm build` into the
// same `dist/` (or `dist-fixture/`, from `--outDir`). Its own config and not a second input to
// `vite.config.ts`, because two entries in one build may share chunks and so rewrite the SPA's
// gated `index.html` — `src/ai101/vite-plugin.ts` has the whole argument.
//
// The output is one file, `ai101.html`, with the stylesheet and the script inlined; the only other
// files written are the font files the stylesheet points at, which the SPA's build has already
// written under the same names with the same bytes.
export default defineConfig({
  plugins: [ai101Render(), ai101Inline()],
  resolve: {
    // vite.config.ts's aliases, verbatim. The subpath alias must come first: '@ai/core/mutations'
    // resolves to the module file, while bare '@ai/core' resolves to the barrel.
    alias: [
      {
        find: /^@ai\/core\/(.*)$/,
        replacement: fileURLToPath(new URL('../../packages/core/src/$1.ts', import.meta.url)),
      },
      { find: '@ai/core', replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)) },
    ],
  },
  // The SPA's build has already copied `public/` into the same output directory.
  publicDir: false,
  build: {
    // The SPA is already in the output directory; this build adds to it.
    emptyOutDir: false,
    // tokens.css and global.css ship verbatim, here as in the SPA: see vite.config.ts.
    cssMinify: false,
    // The script is inlined into the HTML, where a map file beside it would be an orphan.
    sourcemap: false,
    // Every font a file, none a `data:` URI. Vite inlines assets under 4 KB, which catches the
    // ~1 KB cyrillic-ext subsets, and the API's CSP is `font-src 'self'`: Chromium decodes a `data:`
    // font as soon as it parses the rule, so the page logged three CSP violations on every load
    // without ever needing those glyphs. As files they are only fetched if a Cyrillic glyph appears.
    assetsInlineLimit: 0,
    // One inline module and no chunks to preload: the polyfill would be dead weight in the page.
    modulePreload: { polyfill: false },
    // The page is opened from a QR code, often inside an app's WebView rather than a current
    // browser. es2019 still has optional catch binding and object spread; Safari 13 is iOS 13.
    target: ['es2019', 'safari13'],
    rolldownOptions: {
      input: fileURLToPath(new URL('./ai101.html', import.meta.url)),
    },
  },
});
