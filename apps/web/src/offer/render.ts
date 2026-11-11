// /offer (and /forum) and /offer/welcome, as strings, from `content.ts` (DECISIONS.md D-075).
//
// Built once by `vite-plugin.ts` into `dist/offer.html` and `dist/offer-welcome.html`, then filled per
// request by the API: every price, date and state is a `%%token%%` (`OFFER_TOKENS` and `PRICE_TOKENS`
// in @ai/core/offer) that `apps/api/src/routes/offer.ts` replaces with an escaped value. So the page
// is one response with live prices, it works with no script, and its inline script's CSP hash does
// not change with the prices (no token sits inside the script).
//
// STATES WITHOUT A SCRIPT. The API writes each card's state (`link`, `closed`, `soldout`, `soon`) into a
// `data-state` attribute and the page's own state into `<body data-offer>`; the stylesheet shows what
// fits. Every plan is bought through its Stripe Payment Link (D-104): the site's own checkout form, and
// the script that drove it, are gone.
//
// ESCAPING. Every string from `content.ts` goes through `esc()`; the tokens are escaped by the API.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { esc, HONEYPOT_LABEL, logo } from '../ai101/render';
import { CARD_CARTS, CARDS, OFFER_TOKENS as T, PLAN_NAMES, PRICE_TOKENS as P, WELCOME_TOKENS as W } from '@ai/core/offer';
import type { PlanKind } from '@ai/core/offer';
import { AFTER, CARD_STATES, CARDS_COPY, CHROME, HERO, META, PLANS_HEADING, WAITLIST, WELCOME } from './content';
import type { CardPlan } from './content';

const head = (title: string, description: string): string =>
  [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    // Event and checkout pages: kept out of search results.
    `<meta name="robots" content="noindex" />`,
  ].join('\n    ');

const brand = (): string =>
  `<header class="top"><div class="inner"><a class="brand" href="/library" data-brand-slot="signature">${logo(signatureSvg, CHROME.logoLabel, 'brand-logo')}</a></div></header>`;

const footer = (): string =>
  [
    `<footer class="foot"><div class="inner">`,
    `<nav aria-label="${esc(CHROME.footerLabel)}"><ul class="foot-links" role="list">`,
    ...CHROME.footerLinks.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`),
    `</ul></nav>`,
    `<p>${esc(CHROME.contact)}</p>`,
    `</div></footer>`,
  ].join('');

// --- /offer ----------------------------------------------------------------------------------------

export function renderOfferHead(): string {
  return head(META.title, META.description);
}

/** One plan card. Its actions depend on its first cart's state; a card's carts share one state. */
function card(plan: PlanKind): string {
  const copy = CARDS_COPY[plan as CardPlan];
  const carts = CARD_CARTS[plan] ?? [];
  const first = carts[0]!;
  const lines = copy.lines.map((l) => `<li>${esc(l)}</li>`).join('');
  const payLinks = carts
    .map((id, i) => {
      const label = copy.pay[id];
      return label ? `<a class="button ${i === 0 ? 'primary' : 'secondary'}" href="${T.link(id)}">${esc(label)}</a>` : '';
    })
    .join('');
  // Founding prices close for the AI Accelerator and the Team Plan; both then offer the waitlist.
  const founding = plan === 'cohort' || plan === 'agents';
  return [
    `<li class="plan" id="plan-${plan}" data-state="${T.state(first)}" aria-labelledby="plan-${plan}-name">`,
    `<h3 class="plan-name" id="plan-${plan}-name">${esc(PLAN_NAMES[plan])}</h3>`,
    `<p class="plan-for">${esc(copy.forWho)}</p>`,
    `<p class="price"><span class="figure"><span class="amount">${P.headline(plan)}</span> <span class="unit">${P.unit(plan)}</span></span><span class="terms">${P.terms(plan)}</span></p>`,
    `<p class="price-missing">${esc(CARD_STATES.priceOnStripe)}</p>`,
    `<ul class="lines" role="list">${lines}</ul>`,
    `<div class="plan-actions">`,
    `<div class="act-link">${payLinks}</div>`,
    ...(founding
      ? [
          `<p class="act-closed">${esc(CARD_STATES.closed)} ${T.foundingCloses}.</p>`,
          `<a class="button secondary act-closed" href="#waitlist">${esc(CARD_STATES.waitlist)}</a>`,
        ]
      : []),
    ...(plan === 'cohort'
      ? [
          `<p class="act-soldout">${esc(CARD_STATES.soldout)}</p>`,
          `<a class="button secondary act-soldout" href="#waitlist">${esc(CARD_STATES.waitlist)}</a>`,
        ]
      : []),
    `<p class="act-soon">${esc(CARD_STATES.soon)}</p>`,
    `</div>`,
    `</li>`,
  ].join('');
}

export function renderOfferBody(): string {
  return [
    `<a class="skip" href="#plans">${esc(CHROME.skip)}</a>`,
    brand(),
    `<main id="main">`,
    `<section class="hero" aria-labelledby="offer-title"><div class="inner">`,
    `<p class="eyebrow"><span class="when-open">${esc(HERO.eyebrowOpen)}</span><span class="when-closed">${esc(HERO.eyebrowClosed)}</span> ${T.foundingCloses}</p>`,
    `<h1 id="offer-title">${esc(HERO.title)}</h1>`,
    `<p class="lede">${esc(HERO.lede)}</p>`,
    `<p class="soon-note">${esc(HERO.soon)}</p>`,
    `</div></section>`,
    `<section class="plans" id="plans" aria-labelledby="plans-title"><div class="inner">`,
    `<h2 id="plans-title">${esc(PLANS_HEADING)}</h2>`,
    `<ol class="plan-grid" role="list">${CARDS.map(card).join('')}</ol>`,
    `</div></section>`,
    // What happens once Stripe has the payment.
    `<section class="checkout after" id="after" aria-labelledby="after-title"><div class="inner">`,
    `<h2 id="after-title">${esc(AFTER.heading)}</h2>`,
    `<ol class="steps" role="list">`,
    ...AFTER.steps.map(
      (s) =>
        `<li><h3>${esc(s.title)}</h3><p>${'body' in s ? esc(s.body) : `${esc(s.before)}${T.loginDay}${esc(s.after)}`}</p></li>`,
    ),
    `</ol>`,
    `</div></section>`,
    `<section class="waitlist" id="waitlist" aria-labelledby="waitlist-title"><div class="inner narrow">`,
    `<h2 id="waitlist-title">${esc(WAITLIST.heading)}</h2>`,
    `<p class="section-lede">${esc(WAITLIST.body)}</p>`,
    `<p class="wl-joined" id="waitlist-joined" role="status">${esc(WAITLIST.joined)}</p>`,
    `<p class="wl-error" id="waitlist-error" role="alert">${esc(WAITLIST.error)}</p>`,
    `<form class="waitlist-form" id="waitlist-form" method="post" action="/api/offer/waitlist">`,
    `<div class="hp" aria-hidden="true"><label for="w-website">${esc(HONEYPOT_LABEL)}</label><input id="w-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>`,
    `<input type="hidden" name="src" value="${T.src}" />`,
    `<div class="row">`,
    `<div class="field"><label for="w-first">${esc(WAITLIST.firstName)}</label><input id="w-first" name="firstName" type="text" autocomplete="given-name" required maxlength="80" /></div>`,
    `<div class="field"><label for="w-email">${esc(WAITLIST.email)}</label><input id="w-email" name="email" type="email" autocomplete="email" required maxlength="254" /></div>`,
    `</div>`,
    `<button class="button secondary" type="submit">${esc(WAITLIST.submit)}</button>`,
    `<p class="consent">${esc(WAITLIST.consent)}</p>`,
    `</form>`,
    `</div></section>`,
    `</main>`,
    footer(),
  ].join('\n');
}

// --- /offer/welcome --------------------------------------------------------------------------------

export function renderWelcomeHead(): string {
  return head(WELCOME.title, WELCOME.description);
}

export function renderWelcomeBody(): string {
  const c = WELCOME.confirmed;
  return [
    brand(),
    `<main id="main" class="welcome" data-session="${W.sessionId}"><div class="inner narrow">`,
    // Confirmed: the plan, the login, the intake form.
    `<section class="w-confirmed" aria-labelledby="w-confirmed-title">`,
    `<h1 id="w-confirmed-title">${esc(c.headingBefore)}${W.planName}</h1>`,
    `<p class="lede">${P.paidLine}</p>`,
    `<ol class="steps" role="list">`,
    `<li><h2>${esc(c.loginTitle)}</h2><p>${W.login}</p></li>`,
    `<li><h2>${esc(c.intakeTitle)}</h2>`,
    `<p class="intake-email">${esc(c.intakeEmail)}</p>`,
    `<p class="intake-link"><a class="button primary" href="${W.intakeUrl}" target="_blank" rel="noopener">${esc(c.intakeButton)}</a></p></li>`,
    `<li><h2>${esc(c.billingTitle)}</h2><p>${esc(c.billingBody)}</p>`,
    `<p><a class="button secondary" href="${W.portalUrl}" target="_blank" rel="noopener">${esc(c.billingButton)}</a></p></li>`,
    `</ol>`,
    `<p class="contact">${esc(WELCOME.contact)}</p>`,
    `</section>`,
    // Pending: the webhook has not landed yet.
    `<section class="w-pending" aria-labelledby="w-pending-title">`,
    `<h1 id="w-pending-title">${esc(WELCOME.pending.heading)}</h1>`,
    `<p class="lede" role="status">${esc(WELCOME.pending.body)}</p>`,
    `<noscript><p>${esc(WELCOME.pending.noscript)}</p></noscript>`,
    `</section>`,
    // Unknown: no such checkout. No success line without a verified session.
    `<section class="w-unknown" aria-labelledby="w-unknown-title">`,
    `<h1 id="w-unknown-title">${esc(WELCOME.unknown.heading)}</h1>`,
    `<p class="lede">${esc(WELCOME.unknown.body)}</p>`,
    `<p><a class="button secondary" href="/offer">${esc(WELCOME.back)}</a></p>`,
    `</section>`,
    `</div></main>`,
    footer(),
  ].join('\n');
}

