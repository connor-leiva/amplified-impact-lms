// The Vite plugin behind homepage v3's preview, `home-v3.html`, as `../vite-plugin.ts` is the live
// homepage's: it fills the shell's two markers with what `./render.ts` renders, and `ai101Inline()`
// inlines the stylesheet and keeps the one script (`client/main.ts`) a same-origin file.
//
// BUILT ONLY ON PURPOSE. Railway deploys every merge to main, and the API would serve any file in
// `dist/`, so an ordinary build (`pnpm build`, no `V3_PREVIEW`) leaves v3 out entirely and builds
// exactly what main builds. `V3_PREVIEW=1` builds the preview with every pending placeholder shown
// (dev and screenshot builds); `V3_PREVIEW=0` builds the production render, placeholders resolved to
// their fallbacks, which is what the switch-over PR will put at `home.html`.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** The preview's HTML entry, relative to the web app's root, and so its name in `dist/`. */
export const HOME_V3_HTML = 'home-v3.html';

/** What `V3_PREVIEW` asks for: no v3 page at all (unset), the preview (`1`), or the production render (`0`). */
export function v3Mode(env: Record<string, string | undefined> = process.env): 'off' | 'preview' | 'production' {
  const v = env.V3_PREVIEW;
  if (v === undefined || v === '') return 'off';
  return v === '1' ? 'preview' : 'production';
}

const RENDER_URL = '/src/home/v3/render.ts';
const HEAD_MARKER = '<!--home-v3:head-->';
const BODY_MARKER = '<!--home-v3:body-->';

const isV3 = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${HOME_V3_HTML}`);

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
        if (!isV3(ctx.filename)) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        const body = render.renderV3Body({ preview: v3Mode() === 'preview' });
        return fill(fill(html, HEAD_MARKER, render.renderV3Head(), HOME_V3_HTML), BODY_MARKER, body, HOME_V3_HTML);
      },
    },
  };
}
