// The pieces the www sales pages share (DECISIONS.md D-111): the offer card (who it's for, what you
// get, how it runs, when it starts, the price, one button), the founding banner, and a list of
// questions. /pricing, /team-build, /teams and /agents render them from here.
//
// STATES WITHOUT A SCRIPT, as on /offer (D-105): the API fills `data-state` on each card and
// `data-founding` and `data-seats` on <body> (`apps/api/src/routes/offer.ts`), and `offers.css` shows
// what fits. Every string from content goes through `esc()`; the tokens are escaped by the API.

import { CARD_CARTS, OFFER_TOKENS as T, PLAN_NAMES } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';
import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { esc } from '../ai101/render';
import { CARD_STATES as S, EVERY_CARD, FACT_LABELS, NOTES, OFFERS } from '../offer/content';
import type { OfferCopy } from '../offer/content';
import { FREE_SKILLS_HREF } from './content';
import { AGENT_PLAN, CARD_IDS, FOUNDING } from './offers-content';
import type { Faq } from './offers-content';

/** The four cards in Spring's order. `agentPlan` is the Amplified Agent Plan; `agents` is the Team Plan. */
export const CARD_ORDER = ['cohort', 'agentPlan', 'agents', 'membership'] as const;
export type OfferCard = (typeof CARD_ORDER)[number];

export const CARD_NAMES: Readonly<Record<OfferCard, string>> = {
  cohort: PLAN_NAMES.cohort,
  agentPlan: 'Amplified Agent Plan',
  agents: PLAN_NAMES.agents,
  membership: PLAN_NAMES.membership,
};

const copyOf = (card: OfferCard): OfferCopy => (card === 'agentPlan' ? AGENT_PLAN : OFFERS[card]);

/**
 * A card's carts, its first one's state being the card's. The Agent Plan has none here yet: its carts
 * (`agent-monthly`, `agent-yearly`) and its thank-you page land with the LMS wiring (D-106) and the
 * /agents page (D-114), so until then its card says "Opens soon." whatever the API holds.
 */
const cartsOf = (card: OfferCard): readonly CartId[] => (card === 'agentPlan' ? [] : (CARD_CARTS[card] ?? []));

/** Where every "Join the Waitlist" on this page goes: /offer's waitlist form, the one that exists. */
export const WAITLIST_HREF = '/offer#waitlist';

/** The founding banner: the countdown, the deadline and the Accelerator's seats. Gone once founding closes. */
export function foundingBanner(): string {
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
export function offerPrice(card: OfferCard): string {
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
export function offerActions(card: OfferCard): string {
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

/** One offer card, its id from `CARD_IDS` so another page can link to it. */
export function offerCard(card: OfferCard): string {
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
    offerPrice(card),
    offerActions(card),
    `<p class="every">${esc(EVERY_CARD.officeHours)}</p>`,
    `<p class="not-ready">${esc(EVERY_CARD.notReadyBefore)}<a href="${esc(FREE_SKILLS_HREF)}">${esc(EVERY_CARD.notReadyLink)}</a>.</p>`,
    `</li>`,
  ].join('');
}

/** A list of questions, each one a <details>: they open and close with no script. */
export function faqSection(heading: string, items: readonly Faq[]): string {
  const list = items
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
    `<h2 id="faq-title">${esc(heading)}</h2>`,
    `<ul class="faq-list" role="list">${list}</ul>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
