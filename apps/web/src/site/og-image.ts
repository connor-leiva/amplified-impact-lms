// The share image's template (`./share.ts`): one 1200 by 630 page, the kit's Logo 1 over the tagline on
// the kit's dark ground, rendered to `apps/web/public/img/og/amplified-impact.png` by
// `node apps/web/scripts/og-image.mjs`, which serves this page through Vite (for the kit's stylesheet and its
// self-hosted Geist) and screenshots it with Playwright.
//
// THE LOOK IS THE KIT'S: its stylesheet, its dark theme's tokens (`--surface`, `--grain`, `--ink`,
// `--ink-secondary`, `--signal`), Geist and Geist Mono, and Logo 1 as the header draws it (`wordmark`).
// No colour of its own, no photo and no number. Everything sits inside the middle 1000 by 500, the
// part every preview keeps, and the type is large enough to read in a preview a quarter the size.

import { esc } from '../ai101/render';
import { wordmark } from '../kit/logo';
import { SHARE_IMAGE } from './share';

/** The words on the image: the homepage's own tagline, and the site's address. */
export const OG_IMAGE = {
  tagline: 'AI Coaching and Training for Business Owners and Their Teams',
  site: 'amplifiedimpact.io',
} as const;

/** The safe area every element stays inside, centred: the middle 1000 by 500. */
export const OG_SAFE = { width: 1000, height: 500 } as const;

/** The page the script screenshots: exactly the image's size, one screen, nothing that moves. */
export function renderOgImage(): string {
  const { width, height } = SHARE_IMAGE;
  const padX = (width - OG_SAFE.width) / 2;
  const padY = (height - OG_SAFE.height) / 2;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${esc(SHARE_IMAGE.alt)}</title>`,
    '<link rel="stylesheet" href="/src/kit/kit.css" />',
    '<style>',
    `html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }`,
    `.aiw { min-height: 0; }`,
    `.og { box-sizing: border-box; width: ${width}px; height: ${height}px; padding: ${padY}px ${padX}px;`,
    '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px;',
    '  background-color: var(--surface); background-image: var(--grain); color: var(--ink); text-align: center; }',
    '.og .wm { width: 800px; height: auto; }',
    '.og-tagline { margin: 0; max-width: 940px; font-size: 58px; line-height: 1.12; font-weight: 500;',
    '  letter-spacing: -0.025em; text-wrap: balance; }',
    '.og-site { margin: 0; display: flex; align-items: center; gap: 14px; font-family: var(--font-mono);',
    '  font-size: 28px; letter-spacing: 0.04em; color: var(--ink-secondary); }',
    '.og-dot { width: 14px; height: 14px; border-radius: 50%; background: var(--signal); }',
    '</style>',
    '</head>',
    '<body class="aiw" data-theme="dark">',
    '<main class="og">',
    wordmark(108, { label: SHARE_IMAGE.alt }),
    `<p class="og-tagline">${esc(OG_IMAGE.tagline)}</p>`,
    `<p class="og-site"><span class="og-dot" aria-hidden="true"></span>${esc(OG_IMAGE.site)}</p>`,
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');
}
