// /insiders, Amplified Insiders' own page, as strings, from /pricing's Insiders card (`./content.ts` says
// why). Built once by `../site/vite-plugin.ts` into `dist/insiders.html`, its stylesheet inlined, then
// FILLED PER REQUEST by the API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): the two
// Insiders carts' state and Payment Links. No script.
//
// The proof line sits right under the buy buttons, showing exactly when they do (`offerActions`).

import { MEMBERSHIP_NAME } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { EVERY_CARD, FACT_LABELS, OFFERS } from '../offer/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { cartsOf, offerActions, offerPrice, SHARE_IMAGE, stateToken } from '../site/offers';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { INSIDERS_META } from './content';

const c = OFFERS.membership;

export function renderInsidersHead(): string {
  return siteHead({ ...INSIDERS_META, image: SHARE_IMAGE });
}

/** The price and the two carts' buttons, the card's own, with its state from its first cart. */
function buy(): string {
  const first = cartsOf('membership')[0]!;
  return [
    `<div class="plan buy" id="join" data-state="${stateToken(first)}" aria-labelledby="insiders-title">`,
    offerPrice('membership'),
    offerActions('membership', { proof: true }),
    `</div>`,
  ].join('');
}

function hero(): string {
  return [
    `<section class="ins-hero" aria-labelledby="insiders-title">`,
    `<div class="wrap ins-hero-in">`,
    `<div>`,
    `<h1 id="insiders-title">${esc(MEMBERSHIP_NAME)}</h1>`,
    `<p class="lede">${esc(c.forWho)}</p>`,
    `</div>`,
    buy(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** What you get, how it runs and when it starts: the card's facts, under its labels. */
function facts(): string {
  const fact = (id: string, label: string, body: string) => `<div class="fact"><h2 id="${id}">${esc(label)}</h2>${body}</div>`;
  return [
    `<section class="section ins-facts" aria-label="${esc(MEMBERSHIP_NAME)}">`,
    `<div class="wrap ins-facts-in">`,
    fact('ins-get', FACT_LABELS.lines, `<ul class="lines" role="list">${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`),
    fact('ins-how', FACT_LABELS.howItRuns, `<p>${esc(c.howItRuns)}</p>`),
    fact('ins-starts', FACT_LABELS.starts, c.starts.map((s) => `<p>${esc(s)}</p>`).join('')),
    `</div>`,
    `<div class="wrap">`,
    `<p class="every">${esc(EVERY_CARD.officeHours)}</p>`,
    `<p class="not-ready">${esc(EVERY_CARD.notReadyBefore)}<a href="${esc(FREE_SKILLS_HREF)}">${esc(EVERY_CARD.notReadyLink)}</a>.</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>. */
export function renderInsidersBody(): string {
  return [skipLink(), siteHeader(INSIDERS_META.path), `<main id="main" tabindex="-1">`, hero(), facts(), `</main>`, siteFooter()].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderInsidersHead;
export const renderBody = renderInsidersBody;
