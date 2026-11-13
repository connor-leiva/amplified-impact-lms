// Homepage v3 (docs/design/home-v3/brief.md): Spring's positioning, "Your next employee doesn’t need a
// desk.", built on the v2 kit. A kit page like /pricing: `body.aiw`, dark, the kit's header and Programs
// menu exactly as every kit page has them (#94: `kitHeader('/')`, Logo 1, `SITE.nav`), the kit's
// footer, and the kit's stylesheet under its own (`v3.css`). Light and dark, with the kit's own switch
// (Connor's D8): dark is the mockup's look and the default; the script applies a saved choice and
// shows the switch. Bands the mockup draws light are `.inverse`, so they swap with the page; the forest
// bands stay forest in both.
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
import { band } from './sections/band';
import { close } from './sections/close';
import { favorites } from './sections/favorites';
import { founders } from './sections/founders';
import { free } from './sections/free';
import { hero } from './sections/hero';
import { hours } from './sections/hours';
import { howItWorks } from './sections/how';
import { monday } from './sections/monday';
import { programs } from './sections/programs';
import { proof } from './sections/proof';
import { questions } from './sections/questions';
import { quote } from './sections/quote';
import { whatsASkill } from './sections/skill';
import { timeline } from './sections/timeline';
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
    whatsASkill(),
    monday(),
    howItWorks(),
    band(),
    proof(),
    quote(),
    hours(),
    free(),
    programs(),
    timeline(),
    favorites(),
    founders(),
    questions(),
    close(),
    `</main>`,
    kitFooter(),
  ].join('\n');
  return resolvePending(html, { preview });
}
