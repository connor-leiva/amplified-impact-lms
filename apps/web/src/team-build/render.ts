// /team-build, the Amplified AI Accelerator's sales page, as strings (DECISIONS.md D-112), from
// `content.ts`, /offer's card words (`OFFERS.cohort`), the shared sales pieces (`../site/offers.ts`)
// and the homepage's proof and people (`../site/people.ts`).
//
// Built once by `../site/vite-plugin.ts` into `dist/team-build.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): the
// Accelerator's state and Payment Links, the deadline, the countdown and the seats left. No script.
//
// The buy block appears twice, in the hero and in the price section, from one function, so the two can
// never show different prices or states. The price section's has the proof line under its buttons (the
// offer-pages brief, Nov 11); the hero's proof sits beside its block already. Every string goes
// through `esc()`.

import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { CARD_CARTS, OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { HOME } from '../home/content';
import { ENTRIES, type Entry } from '../library/content';
import { OFFERS } from '../offer/content';
import { faqSection, offerActions, offerPrice, proofLine, SHARE_IMAGE, WAITLIST_HREF } from '../site/offers';
import { meetSection } from '../site/people';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { BUY, GET, HOW, NEW_SKILLS, PRICE, PROOF, TB_FAQ, TB_HERO, TEAM_BUILD_META, WEEKS, WHO } from './content';

/** The Library card for a slug, or null for one of the two new skills not yet in the Library. */
export function libraryEntry(slug: string): Entry | null {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`) ?? null;
  if (!entry && !(slug in NEW_SKILLS)) throw new Error(`/team-build names /${slug}, but no Library card links to it. Fix src/team-build/content.ts.`);
  return entry;
}

export function renderTeamBuildHead(): string {
  return siteHead({ ...TEAM_BUILD_META, image: SHARE_IMAGE });
}

/**
 * The price, the countdown and seats, and the buttons, with the card's state from its first cart.
 * `proof` puts the proof line under the buttons, showing exactly when they do.
 */
function buy({ proof = false } = {}): string {
  const first = CARD_CARTS.cohort![0]!;
  return [
    `<div class="plan buy" data-state="${T.state(first)}">`,
    offerPrice('cohort'),
    `<div class="buy-facts founding-open">`,
    `<p><strong>${F.countdown}</strong>${esc(BUY.countdownAfter)}</p>`,
    `<p class="seats-left"><strong>${F.seatsLeft}</strong>${esc(BUY.seatsOf)}${F.seatsTotal}${esc(BUY.seatsAfter)}</p>`,
    `</div>`,
    offerActions('cohort', { proof }),
    `</div>`,
  ].join('');
}

function hero(): string {
  const h = TB_HERO;
  return [
    `<section class="tb-hero" aria-labelledby="tb-title">`,
    `<div class="wrap tb-hero-in">`,
    `<div>`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="tb-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<p class="first">${esc(h.first)}</p>`,
    proofLine(),
    `</div>`,
    buy(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

function who(): string {
  const w = WHO;
  const list = (items: readonly string[]) => `<ul class="ticks" role="list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  return [
    `<section class="section who" aria-labelledby="who-title">`,
    `<div class="wrap who-cols">`,
    `<div><h2 id="who-title">${esc(w.heading)}</h2>${list(w.forItems)}</div>`,
    `<div><h2>${esc(w.notHeading)}</h2>${list(w.notItems)}<p class="who-waitlist">${esc(w.waitlistBefore)}<a href="${WAITLIST_HREF}">${esc(w.waitlistLink)}</a>${esc(w.waitlistAfter)}</p></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** A skill by its Library title: a link to its page, or the new skill's name with a New tag. */
function skillLink(slug: string): string {
  const e = libraryEntry(slug);
  return e ? `<a href="${esc(e.href!)}">${esc(e.title)}</a>` : `<span class="skill-new">${esc(NEW_SKILLS[slug]!)} <span class="tag tag-free">${esc(WEEKS.newTag)}</span></span>`;
}

function weeks(): string {
  const w = WEEKS;
  const items = w.items
    .map((wk) =>
      [
        `<li class="week">`,
        `<p class="week-when"><span class="week-n">${esc(w.weekLabel)} ${wk.n}</span> <span>${esc(wk.date)}</span></p>`,
        `<h3>${esc(wk.title)}</h3>`,
        wk.question ? `<p class="week-q">${esc(wk.question)}</p>` : '',
        wk.skills.length ? `<p class="week-skills">${wk.skills.map(skillLink).join(', ')}</p>` : '',
        wk.support?.length ? `<p class="week-support">${esc(w.supportLabel)} ${wk.support.map(skillLink).join(', ')}</p>` : '',
        wk.note ? `<p class="week-note">${esc(wk.note)}</p>` : '',
        `</li>`,
      ].join(''),
    )
    .join('');
  return [
    `<section class="section weeks" aria-labelledby="weeks-title">`,
    `<div class="wrap">`,
    `<h2 id="weeks-title">${esc(w.heading)}</h2>`,
    `<p class="section-lede">${esc(w.lede)}</p>`,
    `<ol class="week-list" role="list">${items}</ol>`,
    `<p class="weeks-holiday">${esc(w.holiday)}</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function how(): string {
  const items = HOW.items.map((i) => `<div class="how-item"><dt>${esc(i.title)}</dt><dd>${esc(i.body)}</dd></div>`).join('');
  const lines = OFFERS.cohort.lines.map((l) => `<li>${esc(l)}</li>`).join('');
  return [
    `<section class="section how" aria-labelledby="how-title">`,
    `<div class="wrap how-cols">`,
    `<div><h2 id="how-title">${esc(HOW.heading)}</h2><dl class="how-list">${items}</dl></div>`,
    `<div><h2 id="get-title">${esc(GET.heading)}</h2><ul class="ticks" role="list">${lines}</ul></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function proof(): string {
  const p = HOME.proof;
  return [
    `<section class="section proof" aria-labelledby="proof-title">`,
    `<div class="wrap">`,
    `<h2 id="proof-title">${esc(PROOF.heading)}</h2>`,
    `<p class="proof-figure"><span>${esc(p.label)}</span> <strong>${esc(p.figure)}</strong></p>`,
    `<p class="section-lede">${esc(PROOF.body)}</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function price(): string {
  return [
    `<section class="section price-section" id="price" aria-labelledby="price-title">`,
    `<div class="wrap price-in">`,
    `<div><h2 id="price-title">${esc(PRICE.heading)}</h2><p class="section-lede">${esc(PRICE.lede)}</p></div>`,
    buy({ proof: true }),
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>, in Spring's order. */
export function renderTeamBuildBody(): string {
  return [
    skipLink(),
    siteHeader('/team-build'),
    `<main id="main" tabindex="-1">`,
    hero(),
    who(),
    weeks(),
    how(),
    proof(),
    meetSection(),
    price(),
    faqSection(TB_FAQ.heading, TB_FAQ.items),
    `</main>`,
    siteFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderTeamBuildHead;
export const renderBody = renderTeamBuildBody;
