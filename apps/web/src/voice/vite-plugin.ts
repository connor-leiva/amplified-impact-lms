// The Vite plugin behind /voice-profile (D-040): it fills `apps/web/voice-profile.html`'s two markers
// with what `render.ts` renders from `content.ts`, as `src/legal/vite-plugin.ts` does for the legal
// pages and for the same reasons (see `src/ai101/vite-plugin.ts`). `ai101Inline()` then makes the page
// one response, its stylesheet and script inlined.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

/** The HTML entry, relative to the web app's root, and so its name in `dist/` (the API reads it by slug). */
export const VOICE_HTML = 'voice-profile.html';

/** `render.ts`, as a URL from the app's root: what `ssrLoadModule` takes. */
const RENDER_URL = '/src/voice/render.ts';

const HEAD_MARKER = '<!--voice:head-->';
const BODY_MARKER = '<!--voice:body-->';

const isVoice = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${VOICE_HTML}`);

export function voiceRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'voice-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        if (!isVoice(ctx.filename)) return;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        return fill(
          fill(html, HEAD_MARKER, render.renderVoiceHead(), VOICE_HTML),
          BODY_MARKER,
          render.renderVoiceBody(),
          VOICE_HTML,
        );
      },
    },
  };
}
