// www's homepage, `/` on the marketing host, as strings (DECISIONS.md D-102, D-107; redesigned from
// Connor's reference on `design/home-redesign`).
//
// Built once by `vite-plugin.ts` into `dist/home.html`, its stylesheet inlined by `ai101Inline()`, and
// served by `apps/api/src/routes/marketing.ts` at `/` on MARKETING_HOST only.
//
// ONE SCRIPT, AS A FILE. The reference moves: the offer plan drafts itself, the figures count up, two
// sections play as you scroll, the Library has tabs, the Team Plan has a calculator, and the buy buttons
// and the Accelerator's seats are live from /api/offer. That is `client/main.ts`, loaded as a
// same-origin module file (never inlined), so § 9.4's `script-src 'self'` admits it with no hash for the
// API to compute. Everything here renders without it: every word, every price, every link but the
// Payment Links, which only the live state can give.
//
// The header, the footer and the share tags are the site's own (`../site/render.ts`), unchanged: the
// homepage restyles them in `home.css` only. The Library's count, names, pages and free tags come from
// the Library (`library-data.ts`). Every string goes through `esc()`.

import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { HOME, PAGE, PHOTOS } from './content';
import { entryFor, liveEntries } from './library-data';
import { compare } from './sections/compare';
import { hero } from './sections/hero';
import { library } from './sections/library';
import { plans } from './sections/plans';
import { proof } from './sections/proof';
import { start } from './sections/start';
import { steps } from './sections/steps';
import { team } from './sections/team';

export { entryFor, liveEntries };

export function renderHomeHead(): string {
  const p = PHOTOS.spring;
  return siteHead({ ...HOME.meta, image: { src: p.src, width: p.width, height: p.height, alt: p.alt } });
}

/** The skills the Library section shows, by role, in order: the marquee drifts through the same names. */
const skillNames = (): string[] => PAGE.library.roles.flatMap((r) => r.slugs.map((slug) => entryFor(slug).title));

/** Everything inside <body>: the reference's sections, in its order, between the site's own header and footer. */
export function renderHomeBody(): string {
  const count = liveEntries().length;
  return [
    skipLink(),
    siteHeader('/'),
    `<main id="main" tabindex="-1" class="hp-main">`,
    hero(count),
    proof(skillNames()),
    compare(),
    steps(),
    library(count),
    team(),
    plans(),
    start(),
    `</main>`,
    siteFooter(),
  ].join('\n');
}
