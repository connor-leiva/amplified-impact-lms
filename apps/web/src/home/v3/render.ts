// Homepage v3 (docs/design/home-v3/brief.md): Spring's positioning, "Your next employee doesn’t need a
// desk.", built on the v2 kit. A kit page like /pricing: `body.aiw`, dark, the kit's header and Programs
// menu exactly as every kit page has them (#94: `kitHeader('/')`, Logo 1, `SITE.nav`), the kit's
// footer, and the kit's stylesheet under its own (`v3.css`). The theme switch stays hidden: `/` is dark,
// with the mockup's light and forest sections inside it (conflict C16).
//
// NOT LIVE YET. `home.html` still renders v2 (`../render.ts`). This page is built only into a preview,
// `home-v3.html`, when `V3_PREVIEW` is set (`./vite-plugin.ts`); the last PR of the series points
// `home.html` here, in one step.
//
// PENDING. Whatever waits on Connor (`./pending.ts`) shows only in a preview (`V3_PREVIEW=1`); the
// production render (`preview: false`) puts each one's fallback in its place and leaves no marker.

import { kitFooter, kitHeader, kitSkip } from '../../kit/render';
import { renderHomeHead } from '../render';
import { sprite } from './icons';
import { resolvePending } from './pending';
import { hero } from './sections/hero';
import { video } from './sections/video';

/** The head: the live homepage's own (title, description, canonical address, share image). */
export const renderV3Head = (): string => renderHomeHead();

/** Everything inside <body>, in the mockup's order, with every pending region resolved for `preview`. */
export function renderV3Body({ preview }: { preview: boolean }): string {
  const html = [
    sprite(),
    kitSkip(),
    kitHeader('/'),
    `<main id="main" tabindex="-1" class="v3">`,
    hero(),
    video(),
    `</main>`,
    kitFooter(),
  ].join('\n');
  return resolvePending(html, { preview });
}
