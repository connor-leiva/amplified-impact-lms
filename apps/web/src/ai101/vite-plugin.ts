// The two Vite plugins behind /ai101. DECISIONS.md D-028.
//
// `ai101Render()` fills `apps/web/ai101.html`'s markers with what `render.ts` renders from
// `content.ts`. It is in BOTH configs: in `vite.config.ts` so `pnpm dev` serves /ai101 with its
// content (Vite's dev server answers `/ai101` with `ai101.html`), and in `vite.ai101.config.ts`,
// which builds the page. For every other HTML file — the SPA's `index.html` — it returns nothing,
// which Vite treats as "no change"; the SPA's built `index.html` is byte-identical with or without it.
//
// `ai101Inline()` is the page build's last step: it pours the emitted stylesheet and script into
// the HTML and deletes both files from the bundle, so `dist/ai101.html` is ONE response. Why that
// matters is in `render.ts`'s header (venue NAT, a shared per-IP rate limit, bad Wi-Fi); the short
// version is that the only other requests the page can make are its four font files.
//
// The same build also makes /terms and /privacy (`src/legal/`), which `ai101Inline` treats the
// same way, and whose renderer is loaded through `ssrLoadForBuild` below and filled with `fill`.
//
// WHY THE PAGE HAS ITS OWN BUILD
// A second `input` in the SPA's config would let Rolldown share chunks between the two entries — a
// CSS file, a helper — and any shared chunk renames the SPA's own assets and rewrites its gated
// `index.html`. A separate build with `emptyOutDir: false` cannot touch the SPA's output except to
// rewrite the font files both builds emit, with identical names (content-hashed) and bytes.
//
// WHY `render.ts` IS LOADED THROUGH VITE, AND NEVER IMPORTED HERE
// This file is part of the SPA's config. A static import of `render.ts` would make the config
// bundle carry `content.ts`, and `@ai/core` with it — and Vite leaves a bare import in a config to
// Node, so Node would be loading `packages/core/src/*.ts` itself, on every SPA build, in every CI
// container, on whatever type-stripping that container's Node has. Instead `render.ts` goes through
// Vite's own module pipeline, with the app's aliases: in dev through the running server (so an edit
// to a prompt shows on the next reload, with no restart), and in the page build through a
// throwaway middleware-mode server that lives for one `ssrLoadModule`. The SPA build never runs it.
//
// The `.ts` specifier on this file's import in both configs is the one thing the config loader
// does see: without it Vite warns, on every build and every `pnpm dev`, that the config will break
// under `configLoader: 'native'`, its planned default (hence `allowImportingTsExtensions`).

import { createServer, type Plugin, type ResolvedConfig, type ViteDevServer } from 'vite';
import type * as Render from './render.ts';

/** The page's HTML entry, relative to the web app's root — and so its name in `dist/`. */
export const AI101_HTML = 'ai101.html';

/** `render.ts`, as a URL from the app's root: what `ssrLoadModule` takes. */
const RENDER_URL = '/src/ai101/render.ts';

const HEAD_MARKER = '<!--ai101:head-->';
const BODY_MARKER = '<!--ai101:body-->';

const isAi101 = (filename: string) => filename.replace(/\\/g, '/').endsWith(`/${AI101_HTML}`);

/**
 * Replaces one marker, and fails loudly if it is gone: a shell without it would ship blank.
 *
 * Exported, with `page` to name the shell in the error, for the /terms and /privacy shells
 * (`src/legal/vite-plugin.ts`), which are filled the same way.
 */
export function fill(html: string, marker: string, content: string, page: string = AI101_HTML): string {
  const at = html.indexOf(marker);
  if (at === -1) throw new Error(`${page}: the ${marker} marker is missing.`);
  // Spliced rather than `String.replace`d: a replacement STRING gives `$&`, `$'` and `$1` special
  // meanings, and the prompts are free text that may one day contain a dollar sign.
  return html.slice(0, at) + content + html.slice(at + marker.length);
}

const load = async (server: ViteDevServer) => (await server.ssrLoadModule(RENDER_URL)) as typeof Render;

/** The page build has no server of its own: start one for the one module, and close it again. */
async function loadForBuild(config: ResolvedConfig): Promise<typeof Render> {
  return ssrLoadForBuild<typeof Render>(config, RENDER_URL);
}

/**
 * `loadForBuild` for any module. Exported for `src/legal/vite-plugin.ts`, whose renderer has the
 * same reasons (this file's header) never to be imported by a config file.
 */
export async function ssrLoadForBuild<T>(config: ResolvedConfig, url: string): Promise<T> {
  const server = await createServer({
    configFile: false,
    root: config.root,
    resolve: { alias: config.resolve.alias },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    return (await server.ssrLoadModule(url)) as T;
  } finally {
    await server.close();
  }
}

export function ai101Render(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'ai101-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        if (!isAi101(ctx.filename)) return;
        const render = ctx.server ? await load(ctx.server) : await loadForBuild(config);
        return fill(fill(html, HEAD_MARKER, render.renderAi101Head()), BODY_MARKER, render.renderAi101Body());
      },
    },
  };
}

/**
 * Text that would end, or confuse, the element it is inlined into. The bundle is ours and contains
 * none of these today; the check is for the day a prompt or a regex does, which would otherwise
 * truncate the page's script mid-statement with no error anywhere.
 */
const UNSAFE_IN_SCRIPT = /<\/script|<!--|<script/i;
const UNSAFE_IN_STYLE = /<\/style/i;

/**
 * `pages` are the HTML entries to make self-contained. /ai101 alone by default; the page build
 * (`vite.ai101.config.ts`) also passes the /terms and /privacy shells, which are built in the same
 * run and get the same treatment: their stylesheet inlined, and nothing left to load but fonts.
 *
 * `externalScripts` names pages among `pages` whose script stays a file (`/assets/<name>-[hash].js`)
 * while their stylesheet is still inlined. www's homepage is one: the API serves it with no
 * `script-src` hash (`apps/api/src/server.ts` hashes only the pages it fills), so an inlined script
 * there would be blocked, while a same-origin file is admitted by `'self'`. Its chunk must stand alone,
 * like an inlined one: no import of a chunk another page shares.
 */
export function ai101Inline(pages: readonly string[] = [AI101_HTML], { externalScripts = [] as readonly string[] } = {}): Plugin {
  let base = '/';
  return {
    name: 'ai101-inline',
    apply: 'build',
    // After Vite's own HTML plugin has written the page's <script> and <link> tags into it.
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      // The tags Vite wrote reference `${base}assets/…`; the bundle keys are `assets/…`.
      const fileOf = (url: string) => (url.startsWith(base) ? url.slice(base.length) : url);
      // Removed from the bundle only after every page is done: /terms and /privacy share one
      // stylesheet, and each of them gets its own inline copy of it.
      const inlined = new Set<string>();
      // The chunks `externalScripts` pages load as files: kept in the bundle, and so in `dist/`.
      const external = new Set<string>();

      for (const name of pages) {
        const page = bundle[name];
        if (!page || page.type !== 'asset') return this.error(`${name} is not in the bundle.`);
        let html = typeof page.source === 'string' ? page.source : new TextDecoder().decode(page.source);
        const keepScript = externalScripts.includes(name);

        // <script type="module" crossorigin src="/assets/ai101-[hash].js"></script> → inline.
        html = html.replace(/<script\b[^>]*\ssrc="([^"]+)"[^>]*><\/script>/g, (tag, url: string) => {
          const chunk = bundle[fileOf(url)];
          if (!chunk || chunk.type !== 'chunk') return tag;
          // A chunk that imports another (a module two pages' scripts share, split out by the bundler)
          // would ask for a file this page does not have once inlined. Caught here, not in production.
          if (chunk.imports.length || chunk.dynamicImports.length) {
            this.error(
              `${chunk.fileName} imports ${[...chunk.imports, ...chunk.dynamicImports].join(', ')}; ${keepScript ? 'a page script' : 'an inlined script'} cannot.`,
            );
          }
          if (keepScript) {
            external.add(chunk.fileName);
            return tag;
          }
          if (UNSAFE_IN_SCRIPT.test(chunk.code)) this.error(`${chunk.fileName} contains text that cannot be inlined.`);
          inlined.add(chunk.fileName);
          // `.trimEnd()` only: the API hashes these exact bytes for its CSP (`inlineScriptHashes`), so
          // what is inlined here is precisely what is served.
          return `<script type="module">${chunk.code.trimEnd()}</script>`;
        });

        // <link rel="stylesheet" crossorigin href="/assets/ai101-[hash].css"> → <style>.
        html = html.replace(/<link\b[^>]*\srel="stylesheet"[^>]*>/g, (tag) => {
          const url = /\shref="([^"]+)"/.exec(tag)?.[1];
          const asset = url ? bundle[fileOf(url)] : undefined;
          if (!asset || asset.type !== 'asset') return tag;
          const css = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source);
          if (UNSAFE_IN_STYLE.test(css)) this.error(`${asset.fileName} contains text that cannot be inlined.`);
          inlined.add(asset.fileName);
          return `<style>${css.trimEnd()}</style>`;
        });

        // A kept script's own tag is the one reference allowed; anything else must be gone.
        const rest = keepScript ? html.replace(/<script\b[^>]*\ssrc="[^"]+"[^>]*><\/script>/g, '') : html;
        if (/\b(?:src|href)="[^"]*\.(?:m?js|css)"/.test(rest)) {
          this.error(`${name} still references a script or stylesheet after inlining.`);
        }

        page.source = html;
      }
      for (const file of inlined) if (!external.has(file)) delete bundle[file];

      // Whatever is left must not be a script or a stylesheet: one would be a second request (a
      // dynamic import, a shared chunk, a preload) that these pages promised not to make. The kept
      // page scripts are the only exception, one file each.
      const leftover = Object.keys(bundle).filter((file) => /\.(?:m?js|css)$/.test(file) && !external.has(file));
      if (leftover.length) this.error(`${pages.join(', ')} would load more than itself: ${leftover.join(', ')}`);
    },
  };
}
