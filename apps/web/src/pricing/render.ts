// /pricing, Programs and Pricing, as strings (DECISIONS.md D-111), from `content.ts`, /offer's cards
// (`../offer/content.ts`) and the site's header and footer (`../site/render.ts`).
//
// Built once by `../site/vite-plugin.ts` into `dist/pricing.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /offer (`apps/api/src/routes/offer.ts`, `SALES_PAGES`): each card's state
// and Payment Link (`OFFER_TOKENS`), the founding deadline, the countdown and the seats left
// (`FOUNDING_TOKENS`). The API escapes every value.
//
// STATES WITHOUT A SCRIPT, as on /offer (D-105): the API writes `data-founding` and `data-seats` on
// <body> and `data-state` on each card, and the stylesheet shows what fits. A link that does not sell
// today has an empty href, which the stylesheet hides. No script at all.
//
// ONE CARD, FOUR TIMES (Spring's plan, "Make the choice easy"): who it's for, what you get, how it
// runs, when it starts, the price, one button, then "Every program includes weekly office hours." and
// "Not ready? Start with 5 free skills".
//
// Every string from content goes through `esc()`.

import { CARD_CARTS, OFFER_TOKENS as T, PLAN_NAMES } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';
import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { esc } from '../ai101/render';
import { HOME } from '../home/content';
import { CARD_STATES as S, EVERY_CARD, FACT_LABELS, NOTES, OFFERS } from '../offer/content';
import type { OfferCopy } from '../offer/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { icon, siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { AGENT_PLAN, CARD_IDS, COMPARE, END, FAQ, FOUNDING, PICKER, PLANS_HEADING, PRICING_HERO, PRICING_META } from './content';
import type { Cell } from './content';

/** The four cards in Spring's order. `agentPlan` is the Amplified Agent Plan; `agents` is the Team Plan. */
export const CARD_ORDER = ['cohort', 'agentPlan', 'agents', 'membership'] as const;
export type PricingCard = (typeof CARD_ORDER)[number];

export const CARD_NAMES: Readonly<Record<PricingCard, string>> = {
  cohort: PLAN_NAMES.cohort,
  agentPlan: 'Amplified Agent Plan',
  agents: PLAN_NAMES.agents,
  membership: PLAN_NAMES.membership,
};

const copyOf = (card: PricingCard): OfferCopy => (card === 'agentPlan' ? AGENT_PLAN : OFFERS[card]);

/**
 * A card's carts, its first one's state being the card's. The Agent Plan has none here yet: its carts
 * (`agent-monthly`, `agent-yearly`) and its thank-you page land with the LMS wiring (D-106) and the
 * /agents page (D-114), so until then its card says "Opens soon." whatever the API holds.
 */
const cartsOf = (card: PricingCard): readonly CartId[] => (card === 'agentPlan' ? [] : (CARD_CARTS[card] ?? []));

/** Where every "Join the Waitlist" on this page goes: /offer's waitlist form, the one that exists. */
export const WAITLIST_HREF = '/offer#waitlist';

export function renderPricingHead(): string {
  return siteHead(PRICING_META);
}

function hero(): string {
  const h = PRICING_HERO;
  const p = HOME.proof;
  const choices = PICKER.choices
    .map((c) => `<li><a class="btn btn-secondary pick" href="${esc(c.href)}"><span class="pick-label">${esc(c.label)}</span><span class="pick-hint">${esc(c.hint)}</span></a></li>`)
    .join('');
  return [
    `<section class="pricing-hero" aria-labelledby="pricing-title">`,
    `<div class="wrap">`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="pricing-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<p class="proof-line"><span>${esc(p.label)}</span> <strong>${esc(p.figure)}</strong></p>`,
    `<nav class="picker" aria-labelledby="picker-title">`,
    `<h2 id="picker-title">${esc(PICKER.heading)}</h2>`,
    `<ul class="pick-list" role="list">${choices}</ul>`,
    `</nav>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The founding banner: the countdown, the deadline and the Accelerator's seats. Gone once founding closes. */
function founding(): string {
  const f = FOUNDING;
  return [
    `<section class="founding founding-open" aria-labelledby="founding-title">`,
    `<div class="wrap founding-in">`,
    `<div>`,
    `<p class="eyebrow" id="founding-title">${esc(f.label)}</p>`,
    `<p class="countdown">${F.countdown}</p>`,
    `</div>`,
    `<div class="founding-facts">`,
    `<p>${esc(f.endsBefore)}${T.foundingCloses}${esc(f.endsAfter)}</p>`,
    `<p class="seats-left"><strong>${F.seatsLeft}</strong>${esc(f.seatsOf)}${F.seatsTotal}${esc(f.seatsAfter)}</p>`,
    `<p class="seats-soldout">${esc(f.soldout)}</p>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The price block, with the Accelerator's after-founding twin and the founding deadline line. */
function price(card: PricingCard): string {
  const p = copyOf(card).price;
  const accelerator = card === 'cohort';
  const figure = (amount: string, unit: string) =>
    `<p class="figure"><span class="amount">${esc(amount)}</span> <span class="unit">${esc(unit)}</span></p>`;
  const deadline =
    card === 'cohort'
      ? [`<p class="terms deadline">${esc(S.deadlineBefore)}${T.foundingCloses}${esc(S.deadlineAfter)}</p>`]
      : card === 'agents'
        ? [`<p class="terms deadline founding-open">${esc(S.teamDeadlineBefore)}${T.foundingCloses}${esc(S.teamDeadlineAfter)}</p>`]
        : [];
  return [
    `<div class="price${accelerator ? ' founding-open' : ''}">`,
    figure(p.amount, p.unit),
    ...p.terms.map((t) => `<p class="terms">${esc(t)}</p>`),
    ...deadline,
    `</div>`,
    ...(accelerator ? [`<div class="price founding-closed">${figure(S.closedAmount, S.closedUnit)}</div>`] : []),
  ].join('');
}

/** The card's one button and its plain-text links, or what it says instead: soon, closed, sold out. */
function actions(card: PricingCard): string {
  const c = copyOf(card);
  const [first, ...rest] = cartsOf(card);
  const waitlist = (cls: string) => `<a class="btn btn-secondary ${cls}" href="${WAITLIST_HREF}">${esc(S.waitlist)}</a>`;
  const note =
    card === 'cohort'
      ? `<p class="note">${esc(NOTES.fubBefore)}<a href="${WAITLIST_HREF}">${esc(NOTES.fubLink)}</a>.</p>`
      : card === 'agents'
        ? `<p class="note">${esc(NOTES.bigTeamBefore)}<a href="${T.teamCall}">${esc(NOTES.bigTeamLink)}</a>.</p>`
        : '';
  return [
    `<div class="plan-actions">`,
    ...(first
      ? [
          `<div class="act-link">`,
          `<a class="btn btn-primary" href="${T.link(first)}">${esc(c.button)}</a>`,
          ...rest.map((id) => (c.more[id] ? `<a class="text-link more" href="${T.link(id)}">${esc(c.more[id]!)}</a>` : '')),
          `</div>`,
        ]
      : []),
    `<p class="act-soon">${esc(S.soon)}</p>`,
    ...(card === 'cohort'
      ? [
          `<p class="act-closed">${esc(S.closedBefore)}${T.foundingCloses}${esc(S.closedAfter)}</p>`,
          waitlist('act-closed'),
          `<p class="act-soldout">${esc(S.soldout)}</p>`,
          waitlist('act-soldout'),
        ]
      : card === 'agents'
        ? [`<p class="act-closed">${esc(S.teamClosedBefore)}${T.foundingCloses}${esc(S.teamClosedAfter)}</p>`, waitlist('act-closed')]
        : []),
    note,
    `</div>`,
  ].join('');
}

function cardHtml(card: PricingCard): string {
  const c = copyOf(card);
  const id = CARD_IDS[card];
  const first = cartsOf(card)[0];
  const fact = (label: string, body: string) => `<div class="fact"><dt>${esc(label)}</dt><dd>${body}</dd></div>`;
  return [
    `<li class="card plan" id="${id}" data-state="${first ? T.state(first) : 'soon'}" aria-labelledby="${id}-name">`,
    `<h3 class="plan-name" id="${id}-name">${esc(CARD_NAMES[card])}</h3>`,
    `<dl class="facts">`,
    fact(FACT_LABELS.forWho, esc(c.forWho)),
    fact(FACT_LABELS.lines, `<ul class="lines" role="list">${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`),
    fact(FACT_LABELS.howItRuns, esc(c.howItRuns)),
    fact(FACT_LABELS.starts, c.starts.map((s) => `<p>${esc(s)}</p>`).join('')),
    `</dl>`,
    price(card),
    actions(card),
    `<p class="every">${esc(EVERY_CARD.officeHours)}</p>`,
    `<p class="not-ready">${esc(EVERY_CARD.notReadyBefore)}<a href="${esc(FREE_SKILLS_HREF)}">${esc(EVERY_CARD.notReadyLink)}</a>.</p>`,
    `</li>`,
  ].join('');
}

function plans(): string {
  return [
    `<section class="section plans" id="plans" aria-labelledby="plans-title">`,
    `<div class="wrap">`,
    `<h2 id="plans-title">${esc(PLANS_HEADING)}</h2>`,
    `<ol class="plan-grid" role="list">${CARD_ORDER.map(cardHtml).join('')}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** One table cell: words, a check that says "Included", or a dash that says "Not included". Never a mark alone. */
function cell(c: Cell): string {
  if (c === true) return `<span class="mark mark-yes">${icon('check')}${esc(COMPARE.included)}</span>`;
  if (c === false) return `<span class="mark mark-no"><span class="dash" aria-hidden="true"></span>${esc(COMPARE.notIncluded)}</span>`;
  if (typeof c === 'string') return esc(c);
  return `<span class="founding-open">${esc(c.open)}</span><span class="founding-closed">${esc(c.closed)}</span>`;
}

/**
 * The comparison table. A real table, with roles spelled out, because on a phone each row stacks into a
 * list (no sideways scroll) and `display: block` would otherwise drop the table's meaning in some
 * browsers. Each cell carries its program's name for that stacked view.
 */
function compare(): string {
  const names = CARD_ORDER.map((c) => CARD_NAMES[c]);
  const head = `<tr role="row"><th role="columnheader" scope="col"><span class="sr-only">${esc(COMPARE.rowLabel)}</span></th>${names
    .map((n) => `<th role="columnheader" scope="col">${esc(n)}</th>`)
    .join('')}</tr>`;
  const rows = COMPARE.rows
    .map(
      (r) =>
        `<tr role="row"><th role="rowheader" scope="row">${esc(r.label)}</th>${r.cells
          .map((c, i) => `<td role="cell" data-label="${esc(names[i]!)}">${cell(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return [
    `<section class="section compare" aria-labelledby="compare-title">`,
    `<div class="wrap">`,
    `<h2 id="compare-title">${esc(COMPARE.heading)}</h2>`,
    `<table class="compare-table" role="table">`,
    `<caption class="sr-only">${esc(COMPARE.caption)}</caption>`,
    `<thead role="rowgroup">${head}</thead>`,
    `<tbody role="rowgroup">${rows}</tbody>`,
    `</table>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Spring's questions, each one a <details>: open and close with no script. */
function faq(): string {
  const items = FAQ.items
    .map(
      (f) =>
        `<li><details><summary>${esc(f.q)}</summary><div class="answer">${f.a.map((a) => `<p>${esc(a)}</p>`).join('')}${
          f.link ? `<p><a class="text-link" href="${esc(f.link.href)}">${esc(f.link.label)}</a></p>` : ''
        }</div></details></li>`,
    )
    .join('');
  return [
    `<section class="section faq" aria-labelledby="faq-title">`,
    `<div class="wrap">`,
    `<h2 id="faq-title">${esc(FAQ.heading)}</h2>`,
    `<ul class="faq-list" role="list">${items}</ul>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function end(): string {
  return [
    `<section class="section end" aria-labelledby="end-title">`,
    `<div class="wrap">`,
    `<h2 id="end-title">${esc(END.heading)}</h2>`,
    `<p class="section-lede">${esc(END.body)}</p>`,
    `<p class="end-action"><a class="btn btn-primary" href="${esc(FREE_SKILLS_HREF)}">${esc(END.button)}</a></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>, in Spring's order. */
export function renderPricingBody(): string {
  return [skipLink(), siteHeader('/pricing'), `<main id="main" tabindex="-1">`, hero(), founding(), plans(), compare(), faq(), end(), `</main>`, siteFooter()].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderPricingHead;
export const renderBody = renderPricingBody;
