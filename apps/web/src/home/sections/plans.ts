// "Four ways in": the live homepage's four programs (`HOME.ways`), word for word and link for link, in
// the reference's four-column cards, each headed by its program's logo lockup.
//
// THE LOCKUP IS THE HEADING (Connor, Nov 11: "use the real logo lockups for the products, not the
// small icon plus typed name"). Each card's <h3> holds the exact offer name, visually hidden, and the
// program's stacked lockup from `program-logo.ts` (Connor's artwork, byte for byte), hidden from screen
// readers because the heading already says the name. 24px type: the size the typed name was, above the
// README's 18px floor, and every stacked lockup is the same height at it, so the first row lines up.
//
// THE ROWS LINE UP across the four cards (the lockup, who it's for, the price and its unit, the line
// under the divider, the Accelerator's seats, the button and the proof line): on a wide screen each card
// is a CSS subgrid of the grid's seven rows (`home.css`).
//
// THE PRICES come from the offer's own constants (`../prices.ts`); a test holds them to the live
// homepage's figures. THE BUTTONS go where the live homepage's go: each program's own page, and
// Amplified Insiders' "Get Amplified Insiders" to /pricing#insiders. The proof line sits under each.
//
// NEVER HIDDEN (Ampy's rule, as on the v2 kit's pages): the cards hold the buttons, the proof line and
// the seats, so they carry no `.rv` and never wait below the fold to rise in. The heading above them and
// the note below still do. `client/reveal.ts` skips any such block too, and `home.css` backs both up.
//
// LIVE, LIKE /pricing (`GET /api/offer`, the same facts /pricing is filled from):
//   - the Accelerator shows its seats left, in /pricing's own words, once the API has counted them;
//   - after founding closes (the API's word, or the deadline written here if it can't be reached) the
//     Accelerator shows /pricing's "$9,997 next cohort" instead of its founding price;
//   - "Get Amplified Insiders" is the one button here that buys. While the API says Insiders' cart
//     doesn't sell (OFFER_OPEN off, no link), it hides and /pricing's "Opens soon." shows instead. It
//     links to /pricing, not to Stripe, so with no script or no answer it stays, as on the live page.

import { COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT, MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { CARD_STATES } from '../../offer/content';
import { FOUNDING } from '../../site/offers-content';
import { CARD_NAMES, proofLine } from '../../site/offers';
import { FREE_SKILLS_HREF } from '../../site/content';
import { HOME } from '../content';
import { programLogo, type ProgramKey } from '../program-logo';
import { PRICES, usd } from '../prices';
import { cta, esc, pad2 } from '../parts';

type Card = (typeof HOME.ways.cards)[number];

/** The lockups' type size on the cards, in px: the README's floor is 18. */
export const LOCKUP_TYPE = 24;

/** Each live card's logo, figure and, for the two that change with the offer, what changes. */
const LOOK: ReadonlyArray<{ name: string; logo: ProgramKey; amount: number }> = [
  { name: PLAN_NAMES.cohort, logo: 'accelerator', amount: PRICES.accelerator.founding },
  { name: CARD_NAMES.agentPlan, logo: 'agent-plan', amount: PRICES.agentPlan.monthly },
  { name: PLAN_NAMES.agents, logo: 'team-plan', amount: PRICES.teamPlan.today[0] },
  { name: MEMBERSHIP_NAME, logo: 'insiders', amount: PRICES.insiders.yearly },
];

/** The card for a live card, by its name: a build error if the homepage's programs change under it. */
function lookOf(card: Card) {
  const look = LOOK.find((l) => l.name === card.name);
  if (!look) throw new Error(`No logo or price for "${card.name}". Fix src/home/sections/plans.ts.`);
  return look;
}

const price = (amount: number, unit: string) =>
  `<p class="price-line"><span class="price tnum">${usd(amount)}</span></p><p class="price-unit">${esc(unit)}</p>`;

/** The Accelerator's seats: hidden until /api/offer counts them, then /pricing's words for them. */
function seats(): string {
  const dots = Array.from({ length: COHORT_SEATS }, (_, i) => `<span style="--si:${i}"></span>`).join('');
  const left = `{left}${FOUNDING.seatsOf}{total}${FOUNDING.seatsAfter}`;
  return `<div class="seat-block founding-open" data-seats data-left="${esc(left)}" data-taken="${esc(FOUNDING.soldout)}" hidden><div class="seatbar" aria-hidden="true">${dots}</div><p class="seat-label" data-seat-label></p></div>`;
}

function card(c: Card, i: number): string {
  const look = lookOf(c);
  const id = `way-${i + 1}`;
  const accelerator = look.logo === 'accelerator';
  const insiders = look.logo === 'insiders';
  const featured = look.logo === 'team-plan';
  const button = cta(c.button.label, c.button.href, {
    variant: featured ? 'primary' : 'secondary',
    cls: 'cta-lg',
    attrs: `aria-describedby="${id}"`,
  });
  const actions = insiders
    ? `<div class="act act-link">${button}${proofLine()}</div><p class="act act-soon">${esc(CARD_STATES.soon)}</p>`
    : `<div class="act-always">${button}${proofLine()}</div>`;
  return [
    `<article class="plan${featured ? ' plan-featured' : ''}" aria-labelledby="${id}" data-card="${look.logo}"${
      insiders ? ' data-cart="insiders-year"' : ''
    }>`,
    `<div class="plan-top"><h3 id="${id}" class="plan-name"><span class="sr-only">${esc(c.name)}</span><span class="plan-logo" data-program="${
      look.logo
    }">${programLogo(look.logo, { variant: 'stacked', size: LOCKUP_TYPE, title: '' })}</span></h3><p class="mono plan-idx" aria-hidden="true">${pad2(
      i + 1,
    )}</p></div>`,
    `<p class="plan-who">${esc(c.forWho)}</p>`,
    `<div class="plan-price">`,
    accelerator
      ? `<div class="founding-open">${price(look.amount, c.unit)}</div><div class="founding-closed">${price(PRICES.accelerator.standard, CARD_STATES.closedUnit)}</div>`
      : price(look.amount, c.unit),
    `</div>`,
    `<p class="plan-line">${esc(c.line)}</p>`,
    accelerator ? seats() : '',
    `<div class="plan-actions">${actions}</div>`,
    `</article>`,
  ].join('');
}

export function plans(): string {
  const w = HOME.ways;
  return [
    `<section id="programs" class="sec plans" data-theme="light" aria-labelledby="ways-title" data-plans data-founding="open" data-closes-at="${esc(
      DEFAULT_FOUNDING_CLOSES_AT,
    )}">`,
    `<div class="wrap">`,
    `<div class="plans-head rv"><h2 id="ways-title" class="h-section">${esc(w.heading)}</h2><p class="intro">${esc(w.lede)}</p></div>`,
    `<div class="plans-grid">${w.cards.map(card).join('')}</div>`,
    `<div class="plans-free rv"><p>${esc(w.every)}</p><p>${esc(w.notReadyBefore)}${cta(w.notReadyLink, FREE_SKILLS_HREF, { variant: 'link' })}</p></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
