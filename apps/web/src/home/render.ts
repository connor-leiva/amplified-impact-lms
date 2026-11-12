// www's homepage, `/` on the marketing host, as strings (DECISIONS.md D-102, D-107; restyled on
// `design/home-redesign` from Connor's reference).
//
// THE WORDS ARE THE LIVE HOMEPAGE'S. Every string comes from `content.ts` (`HOME`, `PHOTOS`), which is
// main's file unchanged: Spring's homepage outline, her nine sections in her order, the same links and
// the same two headshots. THE LOOK IS THE REFERENCE'S: Geist, the near-black and bone grounds, the mint
// signal, its type scale, spacing, motion and components, and Connor's program logos. Where the
// reference had a section the live page doesn't, it is gone; `sections/` draws the live ones.
//
// Built once by `vite-plugin.ts` into `dist/home.html`, its stylesheet inlined by `ai101Inline()`, and
// served by `apps/api/src/routes/marketing.ts` at `/` on MARKETING_HOST only.
//
// ONE SCRIPT, AS A FILE (`client/main.ts`): the motion, the Library's tabs, the offer plan's progress and
// the live offer state from /api/offer. A same-origin module file, never inlined, so § 9.4's
// `script-src 'self'` admits it with no hash for the API to compute. Everything here reads in full
// without it.
//
// The header, the footer and the share tags are the site's own (`../site/render.ts`), unchanged: the
// homepage restyles them in `home.css` only. Every string goes through `esc()`.

import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { HOME, PHOTOS } from './content';
import { entryFor, liveEntries } from './library-data';
import { compare } from './sections/compare';
import { end } from './sections/end';
import { free } from './sections/free';
import { hero } from './sections/hero';
import { library } from './sections/library';
import { meet } from './sections/meet';
import { plans } from './sections/plans';
import { proof } from './sections/proof';
import { trust } from './sections/trust';

export { entryFor, liveEntries };

export function renderHomeHead(): string {
  const p = PHOTOS.spring;
  return siteHead({ ...HOME.meta, image: { src: p.src, width: p.width, height: p.height, alt: p.alt } });
}

/** Everything inside <body>: Spring's nine sections, in her order, between the site's own header and footer. */
export function renderHomeBody(): string {
  return [
    skipLink(),
    siteHeader('/'),
    `<main id="main" tabindex="-1" class="hp-main">`,
    hero(),
    proof(),
    compare(),
    plans(),
    library(liveEntries().length),
    trust(),
    free(),
    meet(),
    end(),
    `</main>`,
    siteFooter(),
  ].join('\n');
}
