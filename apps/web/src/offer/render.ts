// /offer (and /forum) and /offer/welcome, as strings, from `content.ts` (DECISIONS.md D-075, D-104, D-105).
//
// Built once by `vite-plugin.ts` into `dist/offer.html` and `dist/offer-welcome.html`, then filled per
// request by the API: every link, state and date is a `%%token%%` (`OFFER_TOKENS` and `WELCOME_TOKENS`
// in @ai/core/offer) that `apps/api/src/routes/offer.ts` replaces with an escaped value.
//
// STATES WITHOUT A SCRIPT. The API writes each card's state (`link`, `soon`, `closed` or, for the
// Accelerator's 15 seats, `soldout`) into its `data-state`, and the page's own into <body data-offer>,
// `data-founding` and `data-invites`; the stylesheet shows what fits. A link that does not sell today
// has an empty href, which the stylesheet hides. The offer page carries no script at all; the welcome
// page's one script polls until the webhook confirms the order, and holds no token.
//
// ONE CARD, THREE TIMES (docs/SPRING-PLAN.md, "Design and copy rules"): who it's for, what you get,
// how it runs, when it starts, the price, one button, then "Every program includes weekly office
// hours." and "Not ready? Start with 5 free skills".
//
// ESCAPING. Every string from `content.ts` goes through `esc()`; the tokens are escaped by the API.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { esc, HONEYPOT_LABEL, logo } from '../ai101/render';
import { CARD_CARTS, CARDS, HELP_EMAIL, OFFER_TOKENS as T, PLAN_NAMES, WELCOME_TOKENS as W } from '@ai/core/offer';
import {
  AFTER,
  AGENT_PLAN_THANKS,
  CARD_STATES as S,
  CHROME,
  EVERY_CARD,
  FACT_LABELS,
  HERO,
  META,
  NOTES,
  OFFERS,
  PLANS_HEADING,
  THANKS,
  THANKS_PARTS,
  WAITLIST,
  WELCOME,
} from './content';
import type { CardPlan, StepExtra, ThanksStep } from './content';

/** The cards, in the plan's order: the AI Accelerator, Amplified Insiders, the Team Plan. */
const PLANS = CARDS as readonly CardPlan[];
const cartsOf = (plan: CardPlan) => CARD_CARTS[plan] ?? [];

const head = (title: string, description: string): string =>
  [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    // Event and checkout pages: kept out of search results.
    `<meta name="robots" content="noindex" />`,
  ].join('\n    ');

const brand = (): string =>
  `<header class="top"><div class="inner"><a class="brand" href="/library" data-brand-slot="signature">${logo(signatureSvg, CHROME.logoLabel, 'brand-logo')}</a></div></header>`;

/** "Questions? Write to support@amplifiedimpact.io." with the address as a link: in the footer, so every page and state has it once. */
const contact = (cls: string): string =>
  `<p class="${cls}">${esc(CHROME.contactBefore)}<a href="mailto:${esc(HELP_EMAIL)}">${esc(HELP_EMAIL)}</a>${esc(CHROME.contactAfter)}</p>`;

const footer = (): string =>
  [
    `<footer class="foot"><div class="inner">`,
    `<nav aria-label="${esc(CHROME.footerLabel)}"><ul class="foot-links" role="list">`,
    ...CHROME.footerLinks.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`),
    `</ul></nav>`,
    contact('foot-contact'),
    `</div></footer>`,
  ].join('');

/** Two versions of a sentence, by whether logins still wait for INVITES_FROM (<body data-invites>). */
const loginLine = (held: { before: string; after: string }, sent: string, day: string): string =>
  `<span class="invites-held">${esc(held.before)}${day}${esc(held.after)}</span><span class="invites-sent">${esc(sent)}</span>`;

// --- /offer ----------------------------------------------------------------------------------------

export function renderOfferHead(): string {
  return head(META.title, META.description);
}

/**
 * The price block. The Accelerator has a second one for after its founding deadline (<body
 * data-founding>); the Accelerator and the Team Plan both say when founding prices end.
 */
function price(plan: CardPlan): string {
  const p = OFFERS[plan].price;
  const accelerator = plan === 'cohort';
  const figure = (amount: string, unit: string) =>
    `<p class="figure"><span class="amount">${esc(amount)}</span> <span class="unit">${esc(unit)}</span></p>`;
  const deadline =
    plan === 'cohort'
      ? [`<p class="terms deadline">${esc(S.deadlineBefore)}${T.foundingCloses}${esc(S.deadlineAfter)}</p>`]
      : plan === 'agents'
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

/** The card's actions: its button and other links, "opens soon", closed or sold out (then the waitlist). */
function actions(plan: CardPlan): string {
  const c = OFFERS[plan];
  const [first, ...rest] = cartsOf(plan);
  const waitlist = (cls: string) => `<a class="button secondary ${cls}" href="#waitlist">${esc(S.waitlist)}</a>`;
  const note =
    plan === 'cohort'
      ? `<p class="note">${esc(NOTES.fubBefore)}<a href="#waitlist">${esc(NOTES.fubLink)}</a>.</p>`
      : plan === 'agents'
        ? `<p class="note">${esc(NOTES.bigTeamBefore)}<a href="${T.teamCall}">${esc(NOTES.bigTeamLink)}</a>.</p>`
        : '';
  return [
    `<div class="plan-actions">`,
    `<div class="act-link">`,
    `<a class="button primary" href="${T.link(first!)}">${esc(c.button)}</a>`,
    ...rest.map((id) => (c.more[id] ? `<a class="more" href="${T.link(id)}">${esc(c.more[id]!)}</a>` : '')),
    `</div>`,
    `<p class="act-soon">${esc(S.soon)}</p>`,
    ...(plan === 'cohort'
      ? [
          `<p class="act-closed">${esc(S.closedBefore)}${T.foundingCloses}${esc(S.closedAfter)}</p>`,
          waitlist('act-closed'),
          `<p class="act-soldout">${esc(S.soldout)}</p>`,
          waitlist('act-soldout'),
        ]
      : plan === 'agents'
        ? [`<p class="act-closed">${esc(S.teamClosedBefore)}${T.foundingCloses}${esc(S.teamClosedAfter)}</p>`, waitlist('act-closed')]
        : []),
    note,
    `</div>`,
  ].join('');
}

/** One offer card. Its state is its first cart's: a card's carts share one state. */
function card(plan: CardPlan): string {
  const c = OFFERS[plan];
  const fact = (label: string, body: string) => `<div class="fact"><dt>${esc(label)}</dt><dd>${body}</dd></div>`;
  return [
    `<li class="plan" id="plan-${plan}" data-state="${T.state(cartsOf(plan)[0]!)}" aria-labelledby="plan-${plan}-name">`,
    `<h3 class="plan-name" id="plan-${plan}-name">${esc(PLAN_NAMES[plan])}</h3>`,
    `<dl class="facts">`,
    fact(FACT_LABELS.forWho, esc(c.forWho)),
    fact(FACT_LABELS.lines, `<ul class="lines" role="list">${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`),
    fact(FACT_LABELS.howItRuns, esc(c.howItRuns)),
    fact(FACT_LABELS.starts, c.starts.map((s) => `<p>${esc(s)}</p>`).join('')),
    `</dl>`,
    price(plan),
    actions(plan),
    `<p class="every">${esc(EVERY_CARD.officeHours)}</p>`,
    `<p class="not-ready">${esc(EVERY_CARD.notReadyBefore)}<a href="${esc(EVERY_CARD.notReadyHref)}">${esc(EVERY_CARD.notReadyLink)}</a>.</p>`,
    `</li>`,
  ].join('');
}

function after(): string {
  const steps = AFTER.steps.map((s) => {
    const body = 'body' in s ? esc(s.body) : loginLine(s.held, s.sent, T.loginDay);
    return `<li><h3>${esc(s.title)}</h3><p>${body}</p></li>`;
  });
  return [
    `<section class="after" aria-labelledby="after-title"><div class="inner">`,
    `<h2 id="after-title">${esc(AFTER.heading)}</h2>`,
    `<ol class="steps" role="list">${steps.join('')}</ol>`,
    `</div></section>`,
  ].join('');
}

function waitlist(): string {
  return [
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
  ].join('');
}

export function renderOfferBody(): string {
  return [
    `<a class="skip" href="#plans">${esc(CHROME.skip)}</a>`,
    brand(),
    `<main id="main">`,
    `<section class="hero" aria-labelledby="offer-title"><div class="inner">`,
    `<p class="eyebrow">${esc(HERO.eyebrow)}</p>`,
    `<h1 id="offer-title">${esc(HERO.title)}</h1>`,
    `<p class="lede">${esc(HERO.lede)}</p>`,
    `<p class="soon-note">${esc(HERO.soon)}</p>`,
    `</div></section>`,
    `<section class="plans" id="plans" aria-labelledby="plans-title"><div class="inner">`,
    `<h2 id="plans-title">${esc(PLANS_HEADING)}</h2>`,
    `<ol class="plan-grid" role="list">${PLANS.map(card).join('')}</ol>`,
    `</div></section>`,
    after(),
    waitlist(),
    `</main>`,
    footer(),
  ].join('\n');
}

// --- /offer/welcome --------------------------------------------------------------------------------

export function renderWelcomeHead(): string {
  return head(THANKS_PARTS.title, THANKS_PARTS.description);
}

/** A thank-you step's extra pieces, after its sentences. */
function extras(list: readonly StepExtra[]): string {
  const out: string[] = [];
  if (list.includes('login')) {
    out.push(`<p>${loginLine(THANKS_PARTS.login.held, THANKS_PARTS.login.sent, W.loginDay)}</p>`);
  }
  if (list.includes('intake')) {
    out.push(
      `<p class="intake-link"><a class="button primary" href="${W.intakeUrl}" target="_blank" rel="noopener">${esc(THANKS_PARTS.intakeButton)}</a></p>`,
    );
  }
  // The starter path's link, on the LMS host (the buyer signs in there with the login from their email).
  for (const kind of ['course', 'library'] as const) {
    if (!list.includes(kind)) continue;
    const link = THANKS_PARTS[kind];
    out.push(`<p class="start-link"><a class="button primary" href="${link.href}">${esc(link.label)}</a></p>`);
  }
  const cal = THANKS_PARTS.calendar;
  const links = [
    ...(list.includes('calendar-builds') ? [`<a class="button secondary" href="${W.calendarBuilds}" target="_blank" rel="noopener">${esc(cal.builds)}</a>`] : []),
    ...(list.includes('calendar-office-hours')
      ? [`<a class="button secondary" href="${W.calendarOfficeHours}" target="_blank" rel="noopener">${esc(cal.officeHours)}</a>`]
      : []),
  ];
  if (links.length) out.push(`<p class="cal-links">${links.join('')}</p>`, `<p class="cal-email">${esc(cal.email)}</p>`);
  return out.join('');
}

/** A step: its title, its sentences, then its pieces. The login comes first in "Watch your email". */
function thanksStep(s: ThanksStep): string {
  const lines = s.body.map((b) => `<p>${esc(b)}</p>`);
  const more = extras(s.extras ?? []);
  const loginFirst = s.extras?.includes('login') ?? false;
  return `<li><h2>${esc(s.title)}</h2>${loginFirst ? more + lines.join('') : lines.join('') + more}</li>`;
}

/** The plan kind the LMS wiring gives the Amplified Agent Plan (D-106), as `data-product` says it. */
export const AGENT_PLAN_PRODUCT = 'agent_plan';

function thanks(plan: CardPlan | typeof AGENT_PLAN_PRODUCT): string {
  const t = plan === AGENT_PLAN_PRODUCT ? AGENT_PLAN_THANKS : THANKS[plan];
  return [
    `<section class="w-thanks t-${plan}" aria-labelledby="t-${plan}-title">`,
    `<h1 id="t-${plan}-title">${esc(t.heading)}</h1>`,
    `<p class="lede">${esc(t.lede)}</p>`,
    `<ol class="steps" role="list">${t.steps.map(thanksStep).join('')}</ol>`,
    `</section>`,
  ].join('');
}

export function renderWelcomeBody(): string {
  return [
    brand(),
    `<main id="main" class="welcome" data-session="${W.sessionId}"><div class="inner narrow">`,
    // Confirmed by the webhook: the next steps for the plan bought, one section per plan.
    ...PLANS.map(thanks),
    thanks(AGENT_PLAN_PRODUCT),
    // Pending: the webhook has not landed yet.
    `<section class="w-pending" aria-labelledby="w-pending-title">`,
    `<h1 id="w-pending-title">${esc(WELCOME.pending.heading)}</h1>`,
    `<p class="lede" role="status">${esc(WELCOME.pending.body)}</p>`,
    `<noscript><p>${esc(WELCOME.pending.noscript)}</p></noscript>`,
    `</section>`,
    // Unknown: no such checkout. No success line without a session id from Stripe.
    `<section class="w-unknown" aria-labelledby="w-unknown-title">`,
    `<h1 id="w-unknown-title">${esc(WELCOME.unknown.heading)}</h1>`,
    `<p class="lede">${esc(WELCOME.unknown.body)}</p>`,
    `<p><a class="button secondary" href="/offer">${esc(WELCOME.back)}</a></p>`,
    `</section>`,
    `</div></main>`,
    footer(),
  ].join('\n');
}
