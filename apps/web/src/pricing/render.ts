// /pricing, Programs and Pricing, as strings (DECISIONS.md D-111), from `content.ts`, /offer's cards
// (`../offer/content.ts`) and the site's header and footer (`../site/render.ts`).
//
// Built once by `../site/vite-plugin.ts` into `dist/pricing.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /offer (`apps/api/src/routes/offer.ts`, `SALES_PAGES`): each card's state
// and Payment Link (`OFFER_TOKENS`), the founding deadline, the countdown and the seats left
// (`FOUNDING_TOKENS`). The API escapes every value.
//
// THE SHARED PIECES are `../site/offers.ts`'s: the offer card, four times (Spring's plan, "Make the
// choice easy"), the founding banner and the questions, with their states set by attributes and no
// script at all. This file is the page's own: the hero and picker, the comparison table and the end.
//
// Every string from content goes through `esc()`.

import { esc } from '../ai101/render';
import { HOME } from '../home/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { CARD_NAMES, CARD_ORDER, faqSection, foundingBanner, offerCard } from '../site/offers';
import { icon, siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { COMPARE, END, FAQ, PICKER, PLANS_HEADING, PRICING_HERO, PRICING_META } from './content';
import type { Cell } from './content';

// The cards' names and order, and where every "Join the Waitlist" goes, are the shared pieces' own.
export { CARD_NAMES, CARD_ORDER, WAITLIST_HREF } from '../site/offers';

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

function plans(): string {
  return [
    `<section class="section plans" id="plans" aria-labelledby="plans-title">`,
    `<div class="wrap">`,
    `<h2 id="plans-title">${esc(PLANS_HEADING)}</h2>`,
    `<ol class="plan-grid" role="list">${CARD_ORDER.map(offerCard).join('')}</ol>`,
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
  return [skipLink(), siteHeader('/pricing'), `<main id="main" tabindex="-1">`, hero(), foundingBanner(), plans(), compare(), faqSection(FAQ.heading, FAQ.items), end(), `</main>`, siteFooter()].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderPricingHead;
export const renderBody = renderPricingBody;
