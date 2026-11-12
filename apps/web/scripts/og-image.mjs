// Renders the share image (`apps/web/src/site/share.ts`): the page `apps/web/src/site/og-image.ts`
// draws, screenshot at exactly 1200 by 630, written to `apps/web/public/img/og/amplified-impact.png`.
//
//   node apps/web/scripts/og-image.mjs   (from the repository root)
//
// The page goes through a Vite dev server on the web app's own config, so the kit's stylesheet, its
// self-hosted Geist fonts and Logo 1 load exactly as on the site, and is screenshot by the repo's
// Playwright Chromium (set CHROMIUM_PATH to use another build of Chromium). Rerun it whenever the
// template changes, and commit the template and the PNG together; a test holds the PNG's size.

// Node's globals, and `document` inside `page.evaluate`, which runs in the page.
/* global URL, process, console, document */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const WEB = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(WEB, 'public', 'img', 'og', 'amplified-impact.png');
const ROUTE = '/__og-image';

/** Serves the template at `ROUTE`, ahead of Vite's own pages. */
const ogImagePage = {
  name: 'og-image-page',
  configureServer(server) {
    server.middlewares.use(ROUTE, async (_req, res) => {
      const { renderOgImage } = await server.ssrLoadModule('/src/site/og-image.ts');
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(renderOgImage());
    });
  },
};

const server = await createServer({
  root: WEB,
  configFile: join(WEB, 'vite.config.ts'),
  logLevel: 'error',
  plugins: [ogImagePage],
  server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false },
});
await server.listen();
const { port } = server.httpServer.address();
const { SHARE_IMAGE } = await server.ssrLoadModule('/src/site/share.ts');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({
    viewport: { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(`http://127.0.0.1:${port}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [document.fonts.check('500 58px Geist'), document.fonts.check('28px "Geist Mono"')]);
  if (fonts.includes(false)) throw new Error(`The kit's fonts did not load (Geist, Geist Mono): ${fonts}`);
  // Every element inside the middle 1000 by 500 (`OG_SAFE`), the part every preview keeps.
  const { OG_SAFE } = await server.ssrLoadModule('/src/site/og-image.ts');
  const outside = await page.evaluate(({ w, h, safe }) => {
    const [x0, y0] = [(w - safe.width) / 2, (h - safe.height) / 2];
    return [...document.querySelectorAll('.og > *')]
      .map((el) => [el.className.baseVal ?? el.className, el.getBoundingClientRect()])
      .filter(([, r]) => r.left < x0 || r.top < y0 || r.right > x0 + safe.width || r.bottom > y0 + safe.height)
      .map(([name, r]) => `${name} at ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}`);
  }, { w: SHARE_IMAGE.width, h: SHARE_IMAGE.height, safe: OG_SAFE });
  if (outside.length) throw new Error(`Outside the safe area: ${outside.join('; ')}`);
  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: SHARE_IMAGE.width, height: SHARE_IMAGE.height } });
  console.log(`og-image: wrote ${OUT.replace(`${WEB}`, 'apps/web/')} (${SHARE_IMAGE.width} by ${SHARE_IMAGE.height})`);
} finally {
  await browser.close();
  await server.close();
}
