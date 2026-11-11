// /agents, the Amplified Agent Plan's sales page, as strings (DECISIONS.md D-114), from `content.ts`,
// the Agent Plan card's words (`AGENT_PLAN`), the shared sales pieces (`../site/offers.ts`) and the
// Library's own titles for every skill it names.
//
// Built once by `../site/vite-plugin.ts` into `dist/agents.html`, its stylesheet inlined, then FILLED PER
// REQUEST by the API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): the Agent Plan's
// two carts (`agent-monthly`, `agent-yearly`, from the LMS wiring, D-106) and the login day. Until those
// carts are on `main` their tokens fill with nothing and the buy block says "Opens soon." No script.

import { OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { CARD_STATES as S } from '../offer/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { AGENT_CARTS, faqSection, linkToken, stateToken } from '../site/offers';
import { AGENT_PLAN, AGENT_PLAN_MORE } from '../site/offers-content';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { proofLine, SHARE_IMAGE } from '../site/offers';
import { AFTER_BUY, AGENTS_END, AGENTS_FAQ, AGENTS_HERO, AGENTS_META, OFFICE_HOURS, ROTATION, STARTER } from './content';

/** The Library card for a slug: a build error when there is none, so a link never names a missing page. */
export function libraryCard(slug: string): Entry {
  const e = ENTRIES.find((x) => x.href === `/${slug}`);
  if (!e) throw new Error(`/agents names /${slug}, but no Library card links to it. Fix src/agents/content.ts.`);
  return e;
}

const skill = (slug: string) => {
  const e = libraryCard(slug);
  return `<a href="${esc(e.href!)}">${esc(e.title)}</a>`;
};

export function renderAgentsHead(): string {
  return siteHead({ ...AGENTS_META, image: SHARE_IMAGE });
}

/** The price and the two carts' buttons, in the hero; "Opens soon." until the carts sell. */
function buy(): string {
  const p = AGENT_PLAN.price;
  const [monthly, yearly] = AGENT_CARTS;
  return [
    `<div class="plan buy" id="join" data-state="${stateToken(monthly)}">`,
    `<div class="price">`,
    `<p class="figure"><span class="amount">${esc(p.amount)}</span> <span class="unit">${esc(p.unit)}</span></p>`,
    ...p.terms.map((t) => `<p class="terms">${esc(t)}</p>`),
    `</div>`,
    `<div class="plan-actions">`,
    `<div class="act-link">`,
    `<a class="btn btn-primary" href="${linkToken(monthly)}">${esc(AGENT_PLAN.button)}</a>`,
    `<a class="text-link more" href="${linkToken(yearly)}">${esc(AGENT_PLAN_MORE[yearly]!)}</a>`,
    `</div>`,
    `<p class="act-soon">${esc(S.soon)}</p>`,
    `</div>`,
    `</div>`,
  ].join('');
}

function hero(): string {
  const h = AGENTS_HERO;
  return [
    `<section class="ag-hero" aria-labelledby="ag-title">`,
    `<div class="wrap ag-hero-in">`,
    `<div>`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="ag-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    proofLine(),
    `</div>`,
    buy(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

function starter(): string {
  const items = STARTER.steps
    .map((s) => {
      const title = s.slug ? skill(s.slug) : esc(s.title!);
      return `<li><h3>${title}</h3><p>${esc(s.body)}</p></li>`;
    })
    .join('');
  return [
    `<section class="section starter" aria-labelledby="starter-title">`,
    `<div class="wrap">`,
    `<h2 id="starter-title">${esc(STARTER.heading)}</h2>`,
    `<p class="section-lede">${esc(STARTER.lede)}</p>`,
    `<ol class="steps" role="list">${items}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The rotation as a 4 week calendar: each week's topic and the skills it builds. */
function rotation(): string {
  const r = ROTATION;
  const weeks = r.weeks
    .map(
      (w) =>
        `<li class="week"><p class="week-n">${esc(r.weekLabel)} ${w.n}</p><h3>${esc(w.topic)}</h3><ul class="week-skills" role="list">${w.skills
          .map((s) => `<li>${skill(s)}</li>`)
          .join('')}</ul></li>`,
    )
    .join('');
  return [
    `<section class="section rotation-section" aria-labelledby="rotation-title">`,
    `<div class="wrap">`,
    `<h2 id="rotation-title">${esc(r.heading)}</h2>`,
    `<p class="section-lede">${esc(r.lede)}</p>`,
    `<p class="rotation-when">${esc(r.when)}</p>`,
    `<ol class="week-grid" role="list">${weeks}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function officeHoursAndAfter(): string {
  const steps = AFTER_BUY.steps
    .map((s) => {
      const body =
        'body' in s
          ? esc(s.body)
          : `<span class="invites-held">${esc(s.held.before)}${T.loginDay}${esc(s.held.after)}</span><span class="invites-sent">${esc(s.sent)}</span>`;
      return `<li><h3>${esc(s.title)}</h3><p>${body}</p></li>`;
    })
    .join('');
  return [
    `<section class="section after-buy" aria-labelledby="oh-title">`,
    `<div class="wrap two-cols">`,
    `<div><h2 id="oh-title">${esc(OFFICE_HOURS.heading)}</h2><p class="section-lede">${esc(OFFICE_HOURS.body)}</p><p class="section-lede">${esc(OFFICE_HOURS.recorded)}</p></div>`,
    `<div><h2 id="after-title">${esc(AFTER_BUY.heading)}</h2><ol class="steps" role="list">${steps}</ol></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function end(): string {
  const e = AGENTS_END;
  return [
    `<section class="section end" aria-labelledby="end-title">`,
    `<div class="wrap">`,
    `<h2 id="end-title">${esc(e.heading)}</h2>`,
    `<p class="end-action"><a class="btn btn-primary" href="#join">${esc(e.button)}</a></p>`,
    proofLine(),
    `<p class="end-more">${esc(e.notReadyBefore)}<a href="${esc(FREE_SKILLS_HREF)}">${esc(e.notReadyLink)}</a>${esc(e.notReadyAfter)}</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>, in Spring's order. */
export function renderAgentsBody(): string {
  return [
    skipLink(),
    siteHeader('/agents'),
    `<main id="main" tabindex="-1">`,
    hero(),
    starter(),
    rotation(),
    officeHoursAndAfter(),
    faqSection(AGENTS_FAQ.heading, AGENTS_FAQ.items),
    end(),
    `</main>`,
    siteFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderAgentsHead;
export const renderBody = renderAgentsBody;
