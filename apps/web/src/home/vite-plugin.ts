// The Vite plugin behind www's homepage (D-102), exactly as the library's: it fills
// `apps/web/home.html`'s two markers with what `render.ts` renders from `content.ts`, and
// `ai101Inline()` then inlines its stylesheet, so the page is one response. In both configs, so
// `pnpm dev` shows it at /home.html.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** The HTML entry, relative to the web app's root, and so its name in `dist/` (`apps/api/src/server.ts` reads it). */
export const HOME_HTML = 'home.html';

const RENDER_URL = '/src/home/render.ts';
const HEAD_MARKER = '<!--home:head-->';
const BODY_MARKER = '<!--home:body-->';

const isHome = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${HOME_HTML}`);

export function homeRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'home-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        if (!isHome(ctx.filename)) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        return fill(fill(html, HEAD_MARKER, render.renderHomeHead(), HOME_HTML), BODY_MARKER, render.renderHomeBody(), HOME_HTML);
      },
    },
  };
}
