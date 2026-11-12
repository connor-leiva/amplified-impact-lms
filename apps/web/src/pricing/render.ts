// /pricing, Programs and Pricing, as strings (DECISIONS.md D-111): the v2 mockup's ComparePage, built on
// the kit (`../kit/`), with every word, price, link and state the live page has.
//
// Built once by `../site/vite-plugin.ts` into `dist/pricing.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /offer (`apps/api/src/routes/offer.ts`, `SALES_PAGES`): each card's state
// and Payment Link (`OFFER_TOKENS`), the founding deadline, the countdown and the seats left
// (`FOUNDING_TOKENS`). The API escapes every value.
//
// THE WORDS are `content.ts`'s, /offer's cards' (`../offer/content.ts`) and the shared pieces'
// (`../site/offers.ts`: the price block and the buttons, with all eight Payment Links in the markup and
// their states set by attributes). The mockup's layout puts the founding banner's pieces where they are
// used: the countdown and the deadline in the hero, the seats in the Accelerator's card.
//
// NO SCRIPT NEEDED. The picker's buttons are links to the cards; the kit's script (`../kit/client/`)
// only adds the mockup's highlight of the programs that fit.
//
// Every string from content goes through `esc()`.

import { OFFER_TOKENS as T } from '@ai/core/offer';
import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { esc } from '../ai101/render';
import { CARD_STATES as S, EVERY_CARD, FACT_LABELS, OFFERS } from '../offer/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { CARD_IDS, FOUNDING, AGENT_PLAN } from '../site/offers-content';
import {
  CARD_NAMES,
  CARD_ORDER,
  CARD_PAGES,
  cartsOf,
  offerActions,
  offerPrice,
  SHARE_IMAGE,
  stateToken,
} from '../site/offers';
import type { OfferCard } from '../site/offers';
import { siteHead } from '../site/render';
import { brandIcon, glyph, ringDot, ripple, type BrandIconName } from '../kit/icons';
import { button, closeCta, eyebrow, faq, pad2, seatMeter, words } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { HOME } from '../home/content';
import { COMPARE, END, FAQ, PICKER, PLANS_HEADING, PRICING_HERO, PRICING_META } from './content';
import type { Cell } from './content';

// The cards' names and order, and where every "Join the Waitlist" goes, are the shared pieces' own.
export { CARD_NAMES, CARD_ORDER, WAITLIST_HREF } from '../site/offers';

/** Each program's brand icon (the kit's menu draws the same ones). */
const ICON: Readonly<Record<OfferCard, BrandIconName>> = {
  cohort: 'sessions',
  agentPlan: 'ai-employee',
  agents: 'team-hub',
  membership: 'resource-vault',
};

const copyOf = (card: OfferCard) => (card === 'agentPlan' ? AGENT_PLAN : OFFERS[card]);

export function renderPricingHead(): string {
  return siteHead({ ...PRICING_META, image: SHARE_IMAGE });
}

/** The live headline in two lines, as the mockup sets it, each word rising in on load. */
function headline(title: string): string {
  const all = title.split(' ');
  const half = Math.ceil(all.length / 2);
  const [a, b] = [all.slice(0, half).join(' '), all.slice(half).join(' ')];
  return `<span class="hero-line">${words(a)}</span> <span class="hero-line hero-line-2">${words(b, half)}</span>`;
}

/** The price row's figure and its words: "$7,500 founding price" is "$7,500" and "founding price". */
function split(text: string): { figure: string; note: string } {
  const m = /^(\$\d{1,3}(?:,\d{3})*),?\s+(.*)$/.exec(text);
  return m ? { figure: m[1]!, note: m[2]! } : { figure: text, note: '' };
}

/** Every price, in a row: the comparison's own Price row, each linking to its card. */
function ladder(): string {
  const prices = COMPARE.rows.find((r) => r.label === 'Price');
  if (!prices) throw new Error('The comparison has no Price row. Fix src/pricing/content.ts.');
  const rung = (text: string, cls = '') => {
    const p = split(text);
    return `<span class="rung-price tnum${cls}">${esc(p.figure)}</span>${p.note ? `<span class="rung-note${cls}">${esc(p.note)}</span>` : ''}`;
  };
  const rungs = CARD_ORDER.map((card, i) => {
    const c = prices.cells[i]!;
    if (typeof c === 'boolean') throw new Error(`The Price row's ${CARD_NAMES[card]} cell is a mark, not a price. Fix src/pricing/content.ts.`);
    const body =
      typeof c === 'string' ? rung(c) : `${rung(c.open, ' founding-open')}${rung(c.closed, ' founding-closed')}`;
    return `<li style="--li:${i}"><a class="rung" href="#${CARD_IDS[card]}"><span class="rung-top">${brandIcon(ICON[card], 20)}<span class="rung-name">${esc(
      CARD_NAMES[card],
    )}</span></span>${body}${glyph('arrow', 18, 'rung-go')}</a></li>`;
  }).join('');
  return `<ol class="ladder" role="list">${rungs}</ol>`;
}

function hero(): string {
  const h = PRICING_HERO;
  return [
    `<section class="sec cp-hero" aria-labelledby="pricing-title" data-scroll="exit">`,
    `<div class="cp-ripple" aria-hidden="true">${ripple(820, { intro: true })}</div>`,
    `<div class="wrap cp-hero-in">`,
    eyebrow(h.eyebrow, { icon: 'dashboard' }),
    `<h1 id="pricing-title" class="h-hero cp-title">${headline(h.title)}</h1>`,
    `<div class="cp-hero-row fade-1">`,
    `<p class="lead lede">${esc(h.lede)}</p>`,
    `<div class="cp-founding">`,
    `<p class="status founding-open"><span class="status-dot" aria-hidden="true"></span><span><strong class="countdown">${F.countdown}</strong>. ${esc(
      FOUNDING.endsBefore,
    )}${T.foundingCloses}${esc(FOUNDING.endsAfter)}</span></p>`,
    `<p class="status status-closed founding-closed"><span class="status-dot" aria-hidden="true"></span><span>${esc(S.teamClosedBefore)}${T.foundingCloses}.</span></p>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `<div class="wrap">${ladder()}</div>`,
    `</section>`,
  ].join('\n');
}

/** The picker's card ids for a choice: the button's card, and the also-link's. */
const idsOf = (hrefs: readonly (string | undefined)[]) =>
  hrefs.filter((h): h is string => !!h && h.startsWith('#')).map((h) => h.slice(1));

/**
 * "Which one is right for me?": a panel per choice, its name a link to its card, and the programs that
 * fit as links under it. The kit's script marks the panel you pick and the programs that fit.
 */
function picker(): string {
  const panels = PICKER.choices
    .map((c, i) => {
      const show = idsOf([c.href, c.also?.href]);
      const recs = [
        `<li><a class="persona-rec" href="${esc(c.href)}"><span class="pick-hint">${esc(c.hint)}</span>${glyph('arrow', 16)}</a></li>`,
        ...(c.also
          ? [
              `<li><a class="persona-rec pick-also" href="${esc(c.also.href)}"><span>${esc(c.also.label)}</span>${glyph('arrow', 16)}</a></li>`,
            ]
          : []),
      ].join('');
      return `<li class="persona rv" style="--d:${i * 90}ms" data-show="${esc(show.join(' '))}"><a class="persona-btn pick" href="${esc(c.href)}"><span class="persona-mark">${ringDot(
        24,
      )}</span><span class="persona-label pick-label">${esc(c.label)}</span></a><ul class="persona-recs" role="list">${recs}</ul></li>`;
    })
    .join('');
  return [
    `<section class="sec chooser" aria-labelledby="picker-title">`,
    `<div class="wrap">`,
    `<div class="chooser-head rv"><h2 id="picker-title" class="h-section">${esc(PICKER.heading)}</h2></div>`,
    `<nav class="picker" aria-labelledby="picker-title" data-chooser><ul class="personas pick-list" role="list">${panels}</ul></nav>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The Accelerator's founding status: the countdown and its seats, or that they're gone. */
function seats(): string {
  return [
    `<div class="pc-status founding-open">`,
    `<div class="seats-left">${seatMeter(F.seatsLeft, `${F.seatsLeft}${esc(FOUNDING.seatsOf)}${F.seatsTotal}${esc(FOUNDING.seatsAfter)}`)}</div>`,
    `<p class="status seats-left"><span class="status-dot" aria-hidden="true"></span><span><strong>${F.countdown}</strong> · ${F.seatsLeft}${esc(FOUNDING.seatsOf)}${
      F.seatsTotal
    }${esc(FOUNDING.seatsAfter)}</span></p>`,
    `<p class="status status-closed seats-soldout"><span class="status-dot" aria-hidden="true"></span><span>${esc(FOUNDING.soldout)}</span></p>`,
    `</div>`,
  ].join('');
}

/**
 * One program, in the mockup's card: its number and icon, its name, who it's for, the price, the
 * Accelerator's seats, what you get, how it runs and when it starts, then the buttons with the proof
 * right under them, See Full Details, and the two lines every card ends with.
 */
function card(card: OfferCard, i: number): string {
  const c = copyOf(card);
  const id = CARD_IDS[card];
  const first = cartsOf(card)[0];
  const fact = (label: string, body: string, cls = '') =>
    `<div class="fact${cls}"><dt class="mono">${esc(label)}</dt><dd>${body}</dd></div>`;
  return [
    `<li class="card plan pc rv" style="--d:${i * 80}ms" id="${id}" data-state="${first ? stateToken(first) : 'soon'}" aria-labelledby="${id}-name">`,
    `<div class="pc-top"><span class="mono pc-idx" aria-hidden="true">${pad2(i + 1)}</span><span class="pc-ic">${brandIcon(ICON[card], 22)}</span></div>`,
    `<h3 class="plan-name pc-name" id="${id}-name">${esc(CARD_NAMES[card])}</h3>`,
    `<dl class="facts pc-who-list">${fact(FACT_LABELS.forWho, esc(c.forWho), ' pc-who')}</dl>`,
    `<div class="pc-price">${offerPrice(card)}</div>`,
    // Every card has the slot, so the rows line up across the four (the stylesheet's subgrid).
    `<div class="pc-slot">${card === 'cohort' ? seats() : ''}</div>`,
    `<dl class="facts pc-facts">`,
    fact(
      FACT_LABELS.lines,
      `<ul class="lines checks checks-check" role="list">${c.lines.map((l) => `<li><span class="checks-mark">${glyph('check', 14)}</span><span>${esc(l)}</span></li>`).join('')}</ul>`,
      ' pc-lines',
    ),
    fact(FACT_LABELS.howItRuns, esc(c.howItRuns)),
    fact(FACT_LABELS.starts, c.starts.map((s) => `<p>${esc(s)}</p>`).join('')),
    `</dl>`,
    `<div class="pc-cta">${offerActions(card, { details: true, proof: true })}</div>`,
    `<p class="every">${esc(EVERY_CARD.officeHours)}</p>`,
    `<p class="not-ready">${esc(EVERY_CARD.notReadyBefore)}<a href="${esc(FREE_SKILLS_HREF)}">${esc(EVERY_CARD.notReadyLink)}</a>.</p>`,
    `</li>`,
  ].join('');
}

function plans(): string {
  return [
    `<section class="sec ways plans" id="plans" aria-labelledby="plans-title">`,
    `<div class="wrap">`,
    `<div class="ways-head rv">${eyebrow(`${HOME.proof.label} · ${HOME.proof.figure}`, { mark: true })}<h2 id="plans-title" class="h-section">${esc(PLANS_HEADING)}</h2></div>`,
    `<ol class="pcs plan-grid" role="list">${CARD_ORDER.map(card).join('')}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** One table cell: words, a check that says "Included", or a dash that says "Not included". Never a mark alone. */
function cell(c: Cell): string {
  if (c === true) return `<span class="mark mark-yes">${glyph('check', 14)}${esc(COMPARE.included)}</span>`;
  if (c === false) return `<span class="mark mark-no">${glyph('dash', 14)}${esc(COMPARE.notIncluded)}</span>`;
  if (typeof c === 'string') return esc(c);
  return `<span class="founding-open">${esc(c.open)}</span><span class="founding-closed">${esc(c.closed)}</span>`;
}

/**
 * The comparison table, the mockup's: a real table (roles spelled out), the first column and the header
 * holding still while it scrolls sideways on a narrow screen. Each column's name links to its program's
 * page; each cell carries its program's name and column.
 */
function compare(): string {
  const names = CARD_ORDER.map((c) => CARD_NAMES[c]);
  const head = `<tr role="row"><th role="columnheader" scope="col" class="ct-corner"><span class="mono">${esc(COMPARE.rowLabel)}</span></th>${CARD_ORDER.map(
    (c) =>
      `<th role="columnheader" scope="col" class="ct-h" data-col="${CARD_IDS[c]}"><a class="ct-hl" href="${esc(CARD_PAGES[c])}">${brandIcon(ICON[c], 20)}<span>${esc(
        CARD_NAMES[c],
      )}</span></a></th>`,
  ).join('')}</tr>`;
  const rows = COMPARE.rows
    .map(
      (r, ri) =>
        `<tr role="row"${r.label === 'Price' ? ' class="ct-price"' : ''} style="--ri:${ri}"><th role="rowheader" scope="row" class="mono">${esc(r.label)}</th>${r.cells
          .map(
            (c, i) =>
              `<td role="cell" data-label="${esc(names[i]!)}" data-col="${CARD_IDS[CARD_ORDER[i]!]}">${cell(c)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  return [
    `<section id="compare" class="sec ctable compare" aria-labelledby="compare-title">`,
    `<div class="wrap">`,
    `<div class="ctable-head rv"><h2 id="compare-title" class="h-section">${esc(COMPARE.heading)}</h2></div>`,
    `<div class="ct-scroll rv" role="region" aria-labelledby="compare-title" tabindex="0">`,
    `<table class="ct compare-table" role="table">`,
    `<caption class="sr-only">${esc(COMPARE.caption)}</caption>`,
    `<thead role="rowgroup">${head}</thead>`,
    `<tbody role="rowgroup">${rows}</tbody>`,
    `</table>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function end(): string {
  return closeCta({
    title: END.heading,
    lead: END.body,
    actions: button(END.button, FREE_SKILLS_HREF),
    free: true,
    cls: 'end',
  });
}

/** Everything inside <body>, in Spring's order. */
export function renderPricingBody(): string {
  return [
    kitSkip(),
    kitHeader('/pricing'),
    `<main id="main" tabindex="-1">`,
    hero(),
    picker(),
    plans(),
    compare(),
    faq(FAQ.items, { title: FAQ.heading }),
    end(),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderPricingHead;
export const renderBody = renderPricingBody;
