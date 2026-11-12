// The Vite plugin behind the www site's own pages (DECISIONS.md D-111): one plugin for every page of
// Spring's site map past the homepage, so a new page is a line in `SITE_PAGES`, a shell and its
// `src/<name>/` folder, not a new plugin.
//
// Each page is `apps/web/<name>.html`, a shell with two markers, `<!--x:head-->` and `<!--x:body-->`,
// which this fills with what `src/<name>/render.ts` renders (its `renderHead()` and `renderBody()`).
// `ai101Inline()` then inlines its stylesheet, so the page is one response. In both configs, so
// `pnpm dev` shows the pages too (with any `%%tokens%%` unfilled: the API fills them per request).

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';

/** Each page by its folder under `src/`, and so its HTML entry `<name>.html` and its file in `dist/`. */
export const SITE_PAGES = ['pricing', 'team-build', 'teams', 'agents', 'free', 'about'] as const;
export type SitePage = (typeof SITE_PAGES)[number];

/** The HTML entries, relative to the web app's root (`apps/api/src/server.ts` reads them from `dist/`). */
export const SITE_HTML: readonly string[] = SITE_PAGES.map((name) => `${name}.html`);

/**
 * The pages built on the v2 kit (`src/kit/`). Each loads the kit's one script as a same-origin file
 * (`/assets/main-[hash].js`), never inlined, so the CSP's `script-src 'self'` admits it.
 */
export const KIT_PAGES: readonly SitePage[] = ['pricing'];
export const KIT_HTML: readonly string[] = KIT_PAGES.map((name) => `${name}.html`);

export const HEAD_MARKER = '<!--x:head-->';
export const BODY_MARKER = '<!--x:body-->';

/** What every page's `render.ts` exports. */
export interface SitePageRender {
  renderHead(): string;
  renderBody(): string;
}

function pageOf(filename: string): SitePage | null {
  const path = filename.replace(/\\/g, '/');
  return SITE_PAGES.find((name) => path.endsWith(`/${name}.html`)) ?? null;
}

export function siteRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'site-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        const page = pageOf(ctx.filename);
        if (!page) return;
        const url = `/src/${page}/render.ts`;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(url)) as SitePageRender)
          : await ssrLoadForBuild<SitePageRender>(config, url);
        const file = `${page}.html`;
        return fill(fill(html, HEAD_MARKER, render.renderHead(), file), BODY_MARKER, render.renderBody(), file);
      },
    },
  };
}
