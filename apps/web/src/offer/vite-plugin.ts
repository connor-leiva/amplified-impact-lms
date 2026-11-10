// The Vite plugin behind /offer and /offer/welcome (D-074), exactly as the legal pages' and the
// library's: it fills the markers in `apps/web/offer.html` and `offer-welcome.html` with what
// `render.ts` renders from `content.ts`. In both configs, so `pnpm dev` shows the pages too (with
// their `%%tokens%%` unfilled: the API fills them per request).

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

export const OFFER_HTML = ['offer.html', 'offer-welcome.html'] as const;

const RENDER_URL = '/src/offer/render.ts';

function pageOf(filename: string): 'offer' | 'welcome' | null {
  const path = filename.replace(/\\/g, '/');
  if (path.endsWith('/offer.html')) return 'offer';
  if (path.endsWith('/offer-welcome.html')) return 'welcome';
  return null;
}

export function offerRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'offer-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const page = pageOf(ctx.filename);
        if (!page) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        const file = page === 'offer' ? 'offer.html' : 'offer-welcome.html';
        const [head, body] = page === 'offer' ? [render.renderOfferHead(), render.renderOfferBody()] : [render.renderWelcomeHead(), render.renderWelcomeBody()];
        return fill(fill(html, `<!--${page}:head-->`, head, file), `<!--${page}:body-->`, body, file);
      },
    },
  };
}
