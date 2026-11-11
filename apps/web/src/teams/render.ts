// /teams, the Amplified Team Plan's sales page, as strings (DECISIONS.md D-113), from `content.ts`, the
// shared sales pieces (`../site/offers.ts`, `offers.css`) and the homepage's proof line.
//
// Built once by `../site/vite-plugin.ts` into `dist/teams.html`, its stylesheet inlined, then FILLED PER
// REQUEST by the API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): each size's state
// and Payment Link, the founding deadline and countdown, the login day, and where "Let's talk" goes. No
// script: the API writes `data-founding` and `data-invites` on <body> and `data-state` on each size, and
// the stylesheet shows what fits. Every string goes through `esc()`.

import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { CARD_STATES as S } from '../offer/content';
import { faqSection, WAITLIST_HREF } from '../site/offers';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { proofLine, SHARE_IMAGE } from '../site/offers';
import { AGENTS_GET, BILLING, JOIN, OWNER_GETS, TEAMS_END, TEAMS_FAQ, TEAMS_HERO, TEAMS_META, TIERS } from './content';
import type { Tier } from './content';

export function renderTeamsHead(): string {
  return siteHead({ ...TEAMS_META, image: SHARE_IMAGE });
}

const list = (items: readonly string[], cls = 'ticks') => `<ul class="${cls}" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/**
 * One team size: its price and what the owner gets, then its button, or what it says instead. The two
 * sizes with a cart have the proof line right under their button, showing exactly when it does.
 */
function tier(t: Tier): string {
  const actions = t.cart
    ? [
        `<div class="act-link"><a class="btn btn-primary" href="${T.link(t.cart)}" aria-describedby="${t.id}-name">${esc(t.button)}</a>${proofLine()}</div>`,
        `<p class="act-soon">${esc(S.soon)}</p>`,
        `<p class="act-closed">${esc(S.teamClosedBefore)}${T.foundingCloses}${esc(S.teamClosedAfter)}</p>`,
        `<a class="btn btn-secondary act-closed" href="${WAITLIST_HREF}">${esc(S.waitlist)}</a>`,
      ]
    : [`<div class="act-link"><a class="btn btn-secondary" href="${T.teamCall}" aria-describedby="${t.id}-name">${esc(t.button)}</a></div>`];
  return [
    // Over 40 has no cart: always its conversation, whatever founding does.
    `<li class="card plan tier" id="${t.id}" data-state="${t.cart ? T.state(t.cart) : 'link'}" aria-labelledby="${t.id}-name">`,
    `<h3 class="plan-name" id="${t.id}-name">${esc(t.name)}</h3>`,
    `<div class="price">`,
    `<p class="figure"><span class="amount">${esc(t.amount)}</span> <span class="unit">${esc(t.unit)}</span></p>`,
    ...t.terms.map((x) => `<p class="terms">${esc(x)}</p>`),
    `</div>`,
    `<div class="tier-owner"><p class="tier-label">${esc(TIERS.ownerLabel)}</p>${list(t.owner)}</div>`,
    `<div class="plan-actions">${actions.join('')}</div>`,
    `</li>`,
  ].join('');
}

function hero(): string {
  const h = TEAMS_HERO;
  return [
    `<section class="teams-hero" aria-labelledby="teams-title">`,
    `<div class="wrap">`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="teams-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<p class="teams-founding founding-open"><strong>${F.countdown}</strong>${esc(h.countdownAfter)}${T.foundingCloses}${esc(h.countdownEnd)}</p>`,
    `<p class="teams-founding founding-closed">${esc(h.closedBefore)}${T.foundingCloses}${esc(h.closedAfter)}</p>`,
    proofLine(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

function sizes(): string {
  return [
    `<section class="section sizes" id="sizes" aria-labelledby="sizes-title">`,
    `<div class="wrap">`,
    `<h2 id="sizes-title">${esc(TIERS.heading)}</h2>`,
    `<ol class="plan-grid tier-grid" role="list">${TIERS.items.map(tier).join('')}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function gets(): string {
  const a = AGENTS_GET;
  return [
    `<section class="section gets" aria-labelledby="agents-get-title">`,
    `<div class="wrap two-cols">`,
    `<div>`,
    `<h2 id="agents-get-title">${esc(a.heading)}</h2>`,
    `<p class="section-lede">${esc(a.lede)}</p>`,
    list(a.lines),
    `<p class="rotation-label">${esc(a.rotationLabel)}</p>`,
    list(a.rotation, 'rotation'),
    `</div>`,
    `<div>`,
    `<h2 id="owner-get-title">${esc(OWNER_GETS.heading)}</h2>`,
    list(OWNER_GETS.lines),
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function join(): string {
  const steps = JOIN.steps
    .map((s) => {
      const body =
        'body' in s
          ? esc(s.body)
          : `<span class="invites-held">${esc(s.held.before)}${T.loginDay}${esc(s.held.after)}</span><span class="invites-sent">${esc(s.sent)}</span>`;
      return `<li><h3>${esc(s.title)}</h3><p>${body}</p></li>`;
    })
    .join('');
  return [
    `<section class="section join" aria-labelledby="join-title">`,
    `<div class="wrap two-cols">`,
    `<div><h2 id="join-title">${esc(JOIN.heading)}</h2><ol class="steps" role="list">${steps}</ol></div>`,
    `<div><h2 id="billing-title">${esc(BILLING.heading)}</h2>${list(BILLING.lines)}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function end(): string {
  const e = TEAMS_END;
  return [
    `<section class="section end" aria-labelledby="end-title">`,
    `<div class="wrap">`,
    `<h2 id="end-title">${esc(e.heading)}</h2>`,
    `<p class="end-action"><a class="btn btn-primary" href="#sizes">${esc(e.button)}</a></p>`,
    proofLine(),
    `<p class="end-more">${esc(e.moreBefore)}<a href="${T.teamCall}">${esc(e.moreLink)}</a>${esc(e.moreAfter)}</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>, in Spring's order. */
export function renderTeamsBody(): string {
  return [
    skipLink(),
    siteHeader('/teams'),
    `<main id="main" tabindex="-1">`,
    hero(),
    sizes(),
    gets(),
    join(),
    faqSection(TEAMS_FAQ.heading, TEAMS_FAQ.items),
    end(),
    `</main>`,
    siteFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderTeamsHead;
export const renderBody = renderTeamsBody;
