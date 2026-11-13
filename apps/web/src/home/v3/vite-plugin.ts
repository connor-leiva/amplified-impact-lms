// The Vite plugin behind www's homepage (D-102), homepage v3 since the switch-over PR: it fills
// `apps/web/home.html`'s two markers with what `./render.ts` renders, and `ai101Inline()` inlines the
// stylesheet and keeps the one script (`client/main.ts`) a same-origin file. `apps/api/src/server.ts`
// reads the result from `dist/home.html`, and `routes/marketing.ts` serves it at `/` on www only.
//
// THE PRODUCTION RENDER. Every build renders `preview: false`, unless `V3_PREVIEW=1` asks for the
// preview render (pending placeholders shown and labelled). No question is pending today
// (`./pending.ts`), so the two are the same page.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** www's homepage: the HTML entry, relative to the web app's root, and so its name in `dist/`. */
export const HOME_HTML = 'home.html';

/** Which render `V3_PREVIEW` asks for: the preview (`1`), or else the production render. */
export function v3Mode(env: Record<string, string | undefined> = process.env): 'preview' | 'production' {
  return env.V3_PREVIEW === '1' ? 'preview' : 'production';
}

const RENDER_URL = '/src/home/v3/render.ts';
const HEAD_MARKER = '<!--home-v3:head-->';
const BODY_MARKER = '<!--home-v3:body-->';

const isHome = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${HOME_HTML}`);

export function homeV3Render(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'home-v3-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        if (!isHome(ctx.filename)) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        const body = render.renderV3Body({ preview: v3Mode() === 'preview' });
        return fill(fill(html, HEAD_MARKER, render.renderV3Head(), HOME_HTML), BODY_MARKER, body, HOME_HTML);
      },
    },
  };
}
