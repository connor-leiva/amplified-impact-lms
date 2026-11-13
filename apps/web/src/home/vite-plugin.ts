// The Vite plugin behind the v2 homepage, `apps/web/home-v2.html`: it fills the shell's two markers
// with what `render.ts` renders from `content.ts`. Since the switch-over to v3 it is NOT BUILT
// (`vite.ai101.config.ts` builds `home.html`, v3's): only `pnpm dev` uses it, at /home-v2.html, until
// the live check passes and v2 is removed (docs/design/home-v3/brief.md § 2).

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** v2's shell, relative to the web app's root: served by `pnpm dev` only, never built. */
export const HOME_V2_HTML = 'home-v2.html';

const RENDER_URL = '/src/home/render.ts';
const HEAD_MARKER = '<!--home:head-->';
const BODY_MARKER = '<!--home:body-->';

const isHome = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${HOME_V2_HTML}`);

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
        return fill(fill(html, HEAD_MARKER, render.renderHomeHead(), HOME_V2_HTML), BODY_MARKER, render.renderHomeBody(), HOME_V2_HTML);
      },
    },
  };
}
