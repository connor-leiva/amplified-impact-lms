// The Vite plugin behind /terms and /privacy.
//
// `legalRender()` fills the markers in `apps/web/terms.html` and `apps/web/privacy.html` with what
// `render.ts` renders from `content.ts`, exactly as `ai101Render()` fills `ai101.html`, and for the
// same reasons, which `src/ai101/vite-plugin.ts`'s header gives in full:
//
//   - It is in BOTH configs. In `vite.config.ts` so `pnpm dev` serves /terms and /privacy with their
//     words (Vite's dev server answers `/terms` with `terms.html`); in `vite.ai101.config.ts`, which
//     builds them beside /ai101 and inlines their stylesheet (`ai101Inline`). For any other HTML file
//     it returns nothing, which Vite treats as "no change", so the SPA's `index.html` is untouched.
//   - `render.ts` is loaded through Vite, never imported here. This file is part of the SPA's
//     config, and `render.ts` imports an SVG with `?raw`, which only Vite can resolve.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** The two HTML entries, relative to the web app's root, and so their names in `dist/`. */
export const LEGAL_HTML = ['terms.html', 'privacy.html', 'agreement.html'] as const;

/** `render.ts`, as a URL from the app's root: what `ssrLoadModule` takes. */
const RENDER_URL = '/src/legal/render.ts';

const HEAD_MARKER = '<!--legal:head-->';
const BODY_MARKER = '<!--legal:body-->';

/** `terms` for `.../terms.html`, and so on; null for every other file. */
function pageOf(filename: string): Render.LegalPageName | null {
  const path = filename.replace(/\\/g, '/');
  for (const html of LEGAL_HTML) {
    if (path.endsWith(`/${html}`)) return html.replace(/\.html$/, '') as Render.LegalPageName;
  }
  return null;
}

export function legalRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'legal-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        const name = pageOf(ctx.filename);
        if (!name) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        const { head, body } = render.renderLegal(name);
        const shell = `${name}.html`;
        return fill(fill(html, HEAD_MARKER, head, shell), BODY_MARKER, body, shell);
      },
    },
  };
}
