import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { AI101_HTML, ai101Inline, ai101Render } from './src/ai101/vite-plugin.ts';
import { LEGAL_HTML, legalRender } from './src/legal/vite-plugin.ts';
import { GUIDE_HTML, guideRender } from './src/guides/vite-plugin.ts';
import { VOICE_HTML, voiceRender } from './src/voice/vite-plugin.ts';
import { RETOOL_HTML, retoolRender } from './src/retool/vite-plugin.ts';
import { LIBRARY_HTML, libraryRender } from './src/library/vite-plugin.ts';
import { OFFER_HTML, offerRender } from './src/offer/vite-plugin.ts';
import { HOME_HTML, homeRender } from './src/home/vite-plugin.ts';
import { SITE_HTML, siteRender } from './src/site/vite-plugin.ts';

// The /ai101 page's own build (DECISIONS.md D-028), run after the SPA's by `pnpm build` into the
// same `dist/` (or `dist-fixture/`, from `--outDir`). Its own config and not a second input to
// `vite.config.ts`, because two entries in one build may share chunks and so rewrite the SPA's
// gated `index.html` — `src/ai101/vite-plugin.ts` has the whole argument.
//
// The output is one file, `ai101.html`, with the stylesheet and the script inlined; the only other
// files written are the font files the stylesheet points at, which the SPA's build has already
// written under the same names with the same bytes.
//
// The same run also builds the legal pages, `terms.html` and `privacy.html` (src/legal/), each one
// self-contained the same way: its stylesheet inlined, and no script at all. They share no module
// with /ai101 (their stylesheet is their own file), so adding them leaves `ai101.html` byte-identical.
export default defineConfig({
  // And the free guides' landing pages (D-038, D-039), the voice profile setup (D-040) and the
  // "Retool, Don't Replace" kit (D-046), and the free library that lists them (D-050), built and inlined
  // the same way.
  plugins: [
    ai101Render(),
    legalRender(),
    guideRender(),
    voiceRender(),
    retoolRender(),
    libraryRender(),
    // The offer's pages (D-075), filled per request by the API.
    offerRender(),
    // www's homepage (D-102): no script, its stylesheet inlined.
    homeRender(),
    // The rest of Spring's site map (D-111): one plugin, a page per `SITE_PAGES` entry, no script.
    siteRender(),
    ai101Inline([AI101_HTML, ...LEGAL_HTML, ...GUIDE_HTML, VOICE_HTML, RETOOL_HTML, LIBRARY_HTML, ...OFFER_HTML, HOME_HTML, ...SITE_HTML]),
  ],
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
      input: [
        fileURLToPath(new URL('./ai101.html', import.meta.url)),
        ...LEGAL_HTML.map((html) => fileURLToPath(new URL(`./${html}`, import.meta.url))),
        ...GUIDE_HTML.map((html) => fileURLToPath(new URL(`./${html}`, import.meta.url))),
        fileURLToPath(new URL(`./${VOICE_HTML}`, import.meta.url)),
        fileURLToPath(new URL(`./${RETOOL_HTML}`, import.meta.url)),
        fileURLToPath(new URL(`./${LIBRARY_HTML}`, import.meta.url)),
        ...OFFER_HTML.map((html) => fileURLToPath(new URL(`./${html}`, import.meta.url))),
        fileURLToPath(new URL(`./${HOME_HTML}`, import.meta.url)),
        ...SITE_HTML.map((html) => fileURLToPath(new URL(`./${html}`, import.meta.url))),
      ],
    },
  },
});
