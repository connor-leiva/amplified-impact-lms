// Plans and Prices: "Four ways in", the four programs side by side, each with its price, what you get,
// its button and a link to its own page.
//
// LIVE, LIKE /pricing. The buy buttons, the Accelerator's seats and the founding prices come from
// `GET /api/offer`, the same facts /pricing is filled from (`apps/api/src/routes/offer.ts`). The page is
// one static file on www, so the script reads them on load and sets each card's `data-state` from its
// cart, as the API does on /pricing: `link` shows the button with that cart's Payment Link, `soon`,
// `closed` and `soldout` show /pricing's words instead (and the waitlist where /pricing has it). Until
// then, or with no script, no card offers to sell anything: a buy button never shows without a live
// link. The cards' own pages, the Agent Plan's button and the prices show either way.
//
// Which cart a card sells follows its switch: the Team Plan's tier (the calculator above), Amplified
// Insiders' Yearly or Monthly. The Agent Plan has no buy button in the reference: its button is its page.

import { DEFAULT_FOUNDING_CLOSES_AT, mountainDeadline } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';
import { CARD_STATES, OFFERS } from '../../offer/content';
import { proofLine, SEE_DETAILS, WAITLIST_HREF } from '../../site/offers';
import { HREFS, PAGE } from '../content';
import { glyph } from '../icons';
import { programLogo, type ProgramKey } from '../program-logo';
import { PRICES, usd } from '../prices';
import { cta, esc, eyebrow } from '../parts';
import { tierOf } from './team';

const P = PAGE.plans;
const S = CARD_STATES;

/** The founding deadline as /pricing says it, "Monday, November 30 at 11:59 PM Mountain"; the script puts in /api/offer's. */
const DEADLINE = mountainDeadline(Date.parse(DEFAULT_FOUNDING_CLOSES_AT));

const priceLine = (amount: number, note: string) =>
  `<p class="price-line"><span class="price tnum" data-price>${usd(amount)}</span><span class="mono price-note" data-note>${esc(note)}</span></p>`;

const list = (items: readonly string[]) =>
  `<ul class="plan-list" role="list">${items.map((i) => `<li>${glyph('check', 16)}<span>${esc(i)}</span></li>`).join('')}</ul>`;

/**
 * The top of a card: the program's logo (Connor's symbol, 40px) and its number, then its name as text.
 * The logo is hidden from screen readers (`title: ''`): the name is written right under it. Inline, it
 * takes the section's ink and signal, so on this near-black section it is the README's "-dark" logo.
 */
const head = (id: string, index: string, name: string, who: string, logo: ProgramKey) =>
  `<div class="plan-top"><span class="plan-logo" data-program="${logo}">${programLogo(logo, { size: 40, title: '' })}</span><p class="mono plan-idx" aria-hidden="true">${esc(
    index,
  )}</p></div><h3 id="${id}" class="plan-name">${esc(name)}</h3><p class="plan-who">${esc(who)}</p>`;

/** A Monthly/Yearly switch. Each button carries its option's price and words, so the script only swaps them. */
function toggle(
  label: string,
  options: readonly { value: string; label: string; note: string; after: string; price: number; cart?: CartId }[],
): string {
  const buttons = options
    .map(
      (o, i) =>
        `<button type="button" aria-pressed="${i === 0}" data-value="${esc(o.value)}" data-option-price="${o.price}" data-option-note="${esc(o.note)}" data-option-after="${esc(
          o.after,
        )}"${o.cart ? ` data-option-cart="${o.cart}"` : ''}>${esc(o.label)}</button>`,
    )
    .join('');
  return `<div class="seg-toggle" role="group" aria-label="${esc(label)}" data-toggle>${buttons}</div>`;
}

const waitlist = () => cta(S.waitlist, WAITLIST_HREF, { variant: 'secondary' });

/** A card's page, under its buttons in every state (Ampy's addendum: Accelerator, Team Plan, Insiders). */
const details = (href: string, nameId: string) =>
  cta(SEE_DETAILS, href, { variant: 'link', cls: 'details', attrs: `aria-describedby="${nameId}"` });

/**
 * A card's buy block, in all its states. The button has no address until /api/offer gives its cart's
 * Payment Link; the proof line sits right under it (Connor's brief). `more` is a second cart's plain link.
 */
function buyBlock(o: {
  label: string;
  variant: 'primary' | 'secondary';
  more?: { cart: CartId; label: string };
  closed?: string;
  soldout?: boolean;
}): string {
  return [
    `<div class="act act-link">`,
    cta(o.label, null, { variant: o.variant, cls: 'cta-lg buy', attrs: 'data-buy' }),
    proofLine(),
    ...(o.more
      ? [cta(o.more.label, null, { variant: 'link', cls: 'more', attrs: `data-buy-more="${o.more.cart}"` })]
      : []),
    `</div>`,
    `<p class="act act-soon">${esc(S.soon)}</p>`,
    ...(o.closed ? [`<div class="act act-closed"><p class="act-note">${o.closed}</p>${waitlist()}</div>`] : []),
    ...(o.soldout ? [`<div class="act act-soldout">${waitlist()}</div>`] : []),
  ].join('');
}

function accelerator(): string {
  const a = P.accelerator;
  const id = 'hp-plan-acc';
  const dots = Array.from({ length: a.seats }, (_, i) => `<span style="--si:${i}"></span>`).join('');
  return [
    `<article class="plan rv" aria-labelledby="${id}" data-card="accelerator" data-cart="cohort-full" data-state="loading">`,
    head(id, a.index, a.name, a.who, 'accelerator'),
    `<div class="plan-price">`,
    `<div class="founding-open">${priceLine(PRICES.accelerator.founding, a.note)}<p class="price-after">${esc(a.after)}</p></div>`,
    `<div class="founding-closed">${priceLine(PRICES.accelerator.standard, a.closedNote)}</div>`,
    `</div>`,
    `<div class="seat-block founding-open" data-seats data-left="${esc(a.seatsLeft)}" data-taken="${esc(a.seatsTaken)}" hidden><div class="seatbar" aria-hidden="true">${dots}</div><p class="mono seat-label" data-seat-label></p></div>`,
    list(a.items),
    `<div class="plan-actions">`,
    buyBlock({
      label: a.button,
      variant: 'secondary',
      more: { cart: 'cohort-two-pay', label: OFFERS.cohort.more['cohort-two-pay']! },
      closed: `${esc(S.closedBefore)}<span data-deadline>${esc(DEADLINE)}</span>${esc(S.closedAfter)}`,
      soldout: true,
    }),
    details(HREFS.programs.cohort, id),
    `</div>`,
    `</article>`,
  ].join('');
}

function agentPlan(): string {
  const a = P.agentPlan;
  const id = 'hp-plan-agent';
  const prices = [PRICES.agentPlan.monthly, PRICES.agentPlan.yearly];
  const options = a.options.map((o, i) => ({ ...o, price: prices[i]! }));
  return [
    `<article class="plan rv" style="--d:80ms" aria-labelledby="${id}" data-card="agentPlan">`,
    head(id, a.index, a.name, a.who, 'agent-plan'),
    `<div class="plan-price">${toggle(a.billing, options)}${priceLine(options[0]!.price, options[0]!.note)}<p class="price-after" data-after>${esc(options[0]!.after)}</p></div>`,
    list(a.items),
    `<div class="plan-actions"><div class="act-always">${cta(a.button.label, a.button.href, { variant: 'secondary', cls: 'cta-lg' })}${proofLine()}</div></div>`,
    `</article>`,
  ].join('');
}

function teamPlan(): string {
  const t = P.teamPlan;
  const id = 'hp-plan-team';
  const tier = tierOf(PAGE.team.calc.start);
  const T = PRICES.teamPlan;
  return [
    `<article class="plan plan-featured rv" style="--d:160ms" aria-labelledby="${id}" data-card="teamPlan" data-cart="${tier ? 'agents-16to40' : 'agents-upto15'}" data-state="loading"`,
    ` data-tier-today="${T.today.join(',')}" data-tier-after="${esc(T.monthly.map((m) => t.after(m)).join('|'))}">`,
    head(id, t.index, t.name, t.who, 'team-plan'),
    `<div class="plan-price">`,
    `<a class="mono plan-adjust" href="${HREFS.teamOwners}"><span><span data-tier-label>${esc(PAGE.team.calc.tiers[tier])}</span>${esc(t.change)}</span></a>`,
    priceLine(T.today[tier], t.note),
    `<p class="price-after" data-after>${esc(t.after(T.monthly[tier]))}</p>`,
    `</div>`,
    list(t.items),
    `<div class="plan-actions">`,
    buyBlock({
      label: t.button,
      variant: 'primary',
      closed: `${esc(S.teamClosedBefore)}<span data-deadline>${esc(DEADLINE)}</span>${esc(S.teamClosedAfter)}`,
    }),
    details(HREFS.programs.agents, id),
    `</div>`,
    `</article>`,
  ].join('');
}

function insiders(): string {
  const p = P.insiders;
  const id = 'hp-plan-ins';
  const carts: CartId[] = ['insiders-year', 'insiders-monthly'];
  const prices = [PRICES.insiders.yearly, PRICES.insiders.monthly];
  const options = p.options.map((o, i) => ({ ...o, price: prices[i]!, cart: carts[i]! }));
  return [
    `<article class="plan rv" style="--d:240ms" aria-labelledby="${id}" data-card="insiders" data-cart="${carts[0]}" data-state="loading">`,
    head(id, p.index, p.name, p.who, 'insiders'),
    `<div class="plan-price">${toggle(p.billing, options)}${priceLine(options[0]!.price, options[0]!.note)}<p class="price-after" data-after>${esc(options[0]!.after)}</p></div>`,
    list(p.items),
    `<div class="plan-actions">`,
    buyBlock({ label: p.button, variant: 'secondary' }),
    details(HREFS.programs.membership, id),
    `</div>`,
    `</article>`,
  ].join('');
}

export function plans(): string {
  const f = P.free;
  return [
    `<section id="plans" class="sec plans" aria-labelledby="plans-title" data-plans data-founding="open" data-closes-at="${esc(DEFAULT_FOUNDING_CLOSES_AT)}">`,
    `<div class="wrap">`,
    `<div class="plans-head rv">${eyebrow(P.eyebrow, { mark: true })}<h2 id="plans-title" class="h-section">${esc(P.heading)}</h2><p class="intro">${esc(P.intro)}</p></div>`,
    `<div class="plans-grid">${accelerator()}${agentPlan()}${teamPlan()}${insiders()}</div>`,
    `<div class="plans-free rv"><p><strong>${esc(f.strong)}</strong>${esc(f.rest)}</p>${cta(f.link.label, f.link.href, { variant: 'link' })}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
