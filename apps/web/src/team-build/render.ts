// /team-build, the Amplified AI Accelerator's sales page, as strings (DECISIONS.md D-112): the v2 mockup's
// AcceleratorPage, built on the kit (`../kit/`), with every word, date, price, link and state the live
// page has: `content.ts`, /offer's card (`OFFERS.cohort`), the shared sales pieces (`../site/offers.ts`)
// and the homepage's proof and people.
//
// Built once by `../site/vite-plugin.ts` into `dist/team-build.html`, its stylesheet inlined, then FILLED
// PER REQUEST by the API like /pricing (`SALES_PAGES` in `apps/api/src/routes/offer.ts`): the
// Accelerator's state and Payment Links, the deadline, the countdown and the seats left.
//
// The buy block appears twice, in the hero and in the price section, from one function, so the two can
// never show different prices or states. Both have the proof line right under their buttons.
//
// NO SCRIPT NEEDED. The calendar strip links to each week; the kit's script only animates. The week
// previews (`./examples.ts`) are made up, and off. Every string goes through `esc()`.

import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { CARD_CARTS, OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { OFFERS } from '../offer/content';
import { END } from '../pricing/content';
import { FREE_SKILLS_HREF, HELP_EMAIL, SITE } from '../site/content';
import { offerActions, offerPrice, SHARE_IMAGE, WAITLIST_HREF } from '../site/offers';
import { siteHead } from '../site/render';
import { brandIcon, glyph, ringDot, ripple } from '../kit/icons';
import {
  button,
  checks,
  closeCta,
  exTag,
  eyebrow,
  faq,
  founders,
  headline,
  pad2,
  proofSection,
  seatMeter,
} from '../kit/parts';
import { clarityCall } from '../kit/clarity';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import {
  BUY,
  GET,
  HOW,
  NEW_SKILLS,
  PRICE,
  PROOF,
  TB_FAQ,
  TB_HERO,
  TEAM_BUILD_META,
  V2_DRAWINGS,
  WEEKS,
  WHO,
} from './content';
import type { Week } from './content';
import { EXAMPLE_LABELS, EXAMPLES_ON, PREVIEWS } from './examples';
import type { Preview } from './examples';

/** The Library card for a slug, or null for one of the two new skills not yet in the Library. */
export function libraryEntry(slug: string): Entry | null {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`) ?? null;
  if (!entry && !(slug in NEW_SKILLS))
    throw new Error(`/team-build names /${slug}, but no Library card links to it. Fix src/team-build/content.ts.`);
  return entry;
}

export function renderTeamBuildHead(): string {
  return siteHead({ ...TEAM_BUILD_META, image: SHARE_IMAGE });
}

const FIRST_CART = CARD_CARTS.cohort![0]!;

/** The countdown and the seats: drawn, then in /team-build's own words, or that they're gone. */
function seats(): string {
  return [
    `<div class="tk-seats seats-left">`,
    `<p class="mono tk-row"><span class="tnum">${F.seatsLeft}${esc(BUY.seatsOf)}${F.seatsTotal}${esc(BUY.seatsAfter)}</span></p>`,
    seatMeter(F.seatsLeft, `${F.seatsLeft}${esc(BUY.seatsOf)}${F.seatsTotal}${esc(BUY.seatsAfter)}`),
    `</div>`,
    `<p class="status seats-left"><span class="status-dot" aria-hidden="true"></span><span><strong>${F.countdown}</strong>${esc(BUY.countdownAfter)}</span></p>`,
  ].join('');
}

/**
 * The mockup's ticket: the price block (with its after-founding twin and the deadline), a perforation,
 * then the countdown and the seats while founding is open.
 */
function ticket(): string {
  return [
    `<div class="ticket">`,
    `<p class="mono ticket-kicker">${esc(PRICE.heading)}</p>`,
    `<div class="tk-price">${offerPrice('cohort')}</div>`,
    `<div class="ticket-perf" aria-hidden="true"></div>`,
    `<div class="tk-status founding-open">${seats()}</div>`,
    `</div>`,
  ].join('');
}

/** The short date the calendar strip shows: the live date without its weekday ("December 2"). */
const shortDate = (date: string) => date.replace(/^[A-Z][a-z]+day, /, '');

/** The cohort's calendar under the hero: each week, its date and its title, linking to its card. */
function strip(): string {
  const cells = WEEKS.items
    .map(
      (w, i) =>
        `<li class="strip-cell" style="--ci:${i}"><a class="strip-btn" href="#week-${w.n}"><span class="mono strip-n">${esc(WEEKS.weekLabel)} ${w.n}</span><span class="strip-date">${esc(
          shortDate(w.date),
        )}</span><span class="strip-theme">${esc(w.title)}</span></a></li>`,
    )
    .join('');
  return `<ol class="strip" role="list">${cells}</ol>`;
}

function hero(): string {
  const h = TB_HERO;
  return [
    `<section class="sec acc-hero tb-hero" aria-labelledby="tb-title" data-scroll="exit">`,
    `<div class="acc-ripple" aria-hidden="true">${ripple(760, { intro: true })}</div>`,
    `<div class="wrap acc-hero-in">`,
    `<div class="acc-hero-top">${eyebrow(h.eyebrow, { icon: 'sessions' })}<h1 id="tb-title" class="h-hero acc-title">${headline(h.title)}</h1></div>`,
    `<div class="acc-hero-grid plan buy" data-state="${T.state(FIRST_CART)}">`,
    `<div class="acc-hero-copy">`,
    `<p class="lead lede fade-1">${esc(h.lede)}</p>`,
    `<p class="first fade-1">${ringDot(14)}<span>${esc(h.first)}</span></p>`,
    `<div class="acc-actions">${offerActions('cohort', { proof: true })}</div>`,
    `</div>`,
    `<div class="acc-aside"><div class="acc-ticket-move"><div class="acc-ticket-in">${ticket()}</div></div></div>`,
    `</div>`,
    `</div>`,
    `<div class="wrap">${strip()}</div>`,
    `</section>`,
  ].join('\n');
}

/** The owner's and the ops lead's hours, as a small chart: the numbers are `WHO`'s own. */
function hours(): string {
  const said = WHO.forItems.find((i) => /hours a week/.test(i));
  const spans = said
    ? [...said.matchAll(/(\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)/g)].map((m) => [m[1]!, m[2]!] as const)
    : [];
  if (spans.length !== 2)
    throw new Error('WHO no longer gives the owner’s and ops lead’s hours as "N to N". Fix src/team-build/render.ts.');
  const d = V2_DRAWINGS.hours;
  const max = 5;
  const rows = [d.owner, d.ops]
    .map((who, i) => {
      const [from, to] = spans[i]!;
      return `<div class="hours-row" style="--from:${Number(from) / max};--to:${Number(to) / max};--hi:${i}"><span class="hours-who">${esc(who)}</span><span class="hours-track"><span class="hours-bar"></span></span><span class="hours-val">${esc(
        `${from} to ${to} ${d.unit}`,
      )}</span></div>`;
    })
    .join('');
  const ticks = Array.from({ length: max + 1 }, (_, n) => `<span class="mono">${n}</span>`).join('');
  return [
    `<div class="hours" aria-hidden="true" data-in>`,
    `<div class="hours-head"><p class="mono">${esc(d.title)}</p><p class="mono hours-note">${esc(d.note)}</p></div>`,
    rows,
    `<div class="hours-axis"><span class="hours-who"></span><span class="hours-ticks">${ticks}</span><span class="hours-val"></span></div>`,
    `</div>`,
  ].join('');
}

function who(): string {
  const w = WHO;
  return [
    `<section class="sec fit who" aria-labelledby="who-title">`,
    `<div class="wrap fit-grid">`,
    `<div class="fit-col rv"><h2 id="who-title" class="h-sub">${esc(w.heading)}</h2>${checks(w.forItems)}</div>`,
    `<div class="fit-col fit-not rv" style="--d:100ms"><h2 class="h-sub">${esc(w.notHeading)}</h2>${checks(w.notItems, { mark: 'dash' })}<p class="who-waitlist">${esc(
      w.waitlistBefore,
    )}<a class="inline-link" href="${WAITLIST_HREF}">${esc(w.waitlistLink)}</a>${esc(w.waitlistAfter)}</p></div>`,
    hours(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** A skill by its Library title: a link to its page, or the new skill's name with a New tag. */
function skillLink(slug: string): string {
  const e = libraryEntry(slug);
  return e
    ? `<a class="wk-skill" href="${esc(e.href!)}">${ringDot(12)}<span>${esc(e.title)}</span></a>`
    : `<span class="wk-skill skill-new">${esc(NEW_SKILLS[slug]!)} <span class="free-tag">${esc(WEEKS.newTag)}</span></span>`;
}

/** One made-up preview of what a week's skill produces (`./examples.ts`). */
function preview(p: Preview): string {
  const flag = (t: string) => `<p class="pv-flag"><span class="pv-dot"></span>${esc(t)}</p>`;
  switch (p.kind) {
    case 'ticks':
      return `<div class="pv"><ul class="pv-rows" role="list">${p.rows
        .map(
          (t, i) =>
            `<li><span>${esc(t)}</span><span class="pv-tick" style="--bi:${i}">${glyph('check', 12)}</span></li>`,
        )
        .join('')}</ul>${flag(p.flag)}</div>`;
    case 'bars': {
      const top = Math.max(...p.rows.map(([, v]) => v));
      return `<div class="pv"><p class="mono pv-cap">${esc(p.caption)}</p>${p.rows
        .map(
          ([l, v], i) =>
            `<div class="pv-bar" style="--w:${v / top};--bi:${i}"><span class="pv-l">${esc(l)}</span><span class="pv-track"><span></span></span><span class="pv-v tnum">$${v.toLocaleString(
              'en-US',
            )}</span></div>`,
        )
        .join('')}${flag(p.flag)}</div>`;
    }
    case 'owners':
      return `<ul class="pv pv-rows" role="list">${p.rows
        .map(
          ([t, o]) =>
            `<li><span>${esc(t)}</span><span class="mono pv-owner${o ? '' : ' is-none'}">${esc(o ?? p.none)}</span></li>`,
        )
        .join('')}</ul>`;
    case 'agenda':
      return `<div class="pv"><p class="mono pv-cap">${esc(p.caption)}</p><div class="pv-agenda">${p.parts
        .map(
          ([t, m], i) =>
            `<span class="pv-seg${m > 5 ? ' is-big' : ''}" style="--m:${m};--bi:${i}">${m > 5 ? esc(`${t} · ${m} min`) : ''}</span>`,
        )
        .join('')}</div>${flag(p.flag)}</div>`;
    case 'stages': {
      const top = Math.max(...p.stages.map(([, n]) => n));
      return `<div class="pv"><div class="pv-cols">${p.stages
        .map(
          ([t, n, old], i) =>
            `<div class="pv-col" style="--h:${n / top};--old:${old / n};--bi:${i}"><span class="pv-colbar"><span class="pv-colold"></span></span><span class="mono pv-coln tnum">${n}</span><span class="pv-colt">${esc(
              t,
            )}</span></div>`,
        )
        .join('')}</div>${flag(p.flag)}</div>`;
    }
    case 'pace':
      return `<div class="pv"><div class="pv-pace">${p.cells
        .map(
          ([t, v, f]) =>
            `<div${f ? ' class="is-flag"' : ''}><span class="mono">${esc(t)}</span><span class="pv-big tnum">${v}</span></div>`,
        )
        .join('')}</div>${flag(p.flag)}</div>`;
    case 'sources':
      return `<div class="pv"><ol class="pv-rows" role="list">${p.rows
        .map(
          ([t, src], i) =>
            `<li><span><span class="mono pv-i">${pad2(i + 1)}</span>${esc(t)}</span><span class="mono pv-src">${esc(src)}</span></li>`,
        )
        .join('')}</ol>${flag(p.flag)}</div>`;
    case 'days':
      return `<div class="pv"><div class="pv-days">${p.days
        .map(
          ([d, o], i) =>
            `<div class="pv-day" style="--bi:${i}"><span class="pv-node"></span><span class="pv-dayt">${esc(d)}</span><span class="mono pv-dayo">${esc(o)}</span></div>`,
        )
        .join('')}</div>${flag(p.flag)}</div>`;
    case 'verdicts':
      return `<div class="pv"><ul class="pv-rows" role="list">${p.rows
        .map(
          ([t, v]) =>
            `<li><span>${esc(t)}</span><span class="mono pv-verdict is-${v.toLowerCase()}">${esc(v)}</span></li>`,
        )
        .join('')}</ul>${flag(p.flag)}</div>`;
  }
}

/** Between two skills: the live list's comma, for screen readers and copy; the chips need none to the eye. */
const SEP = '<span class="sr-only">, </span>';

/** One week's card: its number and date, its title and question, its skills, and (if on) its preview. */
function weekCard(wk: Week, examples: boolean): string {
  const p = examples ? PREVIEWS[wk.n] : undefined;
  return [
    `<article class="wk-card week" aria-labelledby="week-${wk.n}-title">`,
    `<header class="wk-top"><span class="mono wk-n week-n">${esc(WEEKS.weekLabel)} ${wk.n}</span><span class="mono wk-date">${esc(wk.date)}</span></header>`,
    `<h3 class="wk-theme" id="week-${wk.n}-title">${esc(wk.title)}</h3>`,
    wk.question ? `<p class="wk-q week-q">${esc(wk.question)}</p>` : '',
    wk.note ? `<p class="${wk.question ? 'wk-note' : 'wk-q'} week-note">${esc(wk.note)}</p>` : '',
    wk.skills.length ? `<p class="wk-skills week-skills">${wk.skills.map(skillLink).join(SEP)}</p>` : '',
    wk.support?.length
      ? `<p class="wk-skills week-support"><span class="mono wk-with">${esc(WEEKS.supportLabel)}</span> ${wk.support.map(skillLink).join(SEP)}</p>`
      : '',
    p
      ? `<div class="wk-pv"><div class="wk-pv-top"><span class="mono">${esc(wk.n === 0 ? EXAMPLE_LABELS.setup : EXAMPLE_LABELS.result)}</span>${
          wk.n === 0 ? '' : exTag()
        }</div>${preview(p)}</div>`
      : '',
    `</article>`,
  ].join('');
}

/** One skill a week: the eight weeks and week 0, with the holiday break where it falls. */
function weeks(examples: boolean): string {
  const w = WEEKS;
  const items: string[] = [];
  for (const wk of w.items) {
    // The break sits between the last build of December and the first of January.
    if (wk.n === 4)
      items.push(
        `<li class="wk wk-break"><div class="wk-break-in"><p class="weeks-holiday">${esc(w.holiday)}</p></div></li>`,
      );
    items.push(`<li class="wk rv" id="week-${wk.n}">${weekCard(wk, examples)}</li>`);
  }
  return [
    `<section id="weeks" class="sec weeks is-static" aria-labelledby="weeks-title">`,
    `<div class="weeks-stick">`,
    `<div class="weeks-eight" aria-hidden="true">8</div>`,
    `<div class="wrap weeks-head"><div class="weeks-head-copy rv"><h2 id="weeks-title" class="h-section">${esc(w.heading)}</h2><p class="intro section-lede">${esc(w.lede)}</p></div></div>`,
    `<div class="weeks-view"><ol class="weeks-track week-list" role="list">${items.join('')}</ol></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** A normal week, drawn: the live build and office hours from `HOW`'s own days, times and lengths. */
function calendar(): string {
  const d = V2_DRAWINGS.week;
  const slot = (title: string) => {
    const item = HOW.items.find((i) => i.title === title);
    const m = item && /^(\w+)days at (\d+):(\d\d) PM MT, (\d+) minutes/.exec(item.body);
    if (!item || !m)
      throw new Error(
        `HOW no longer says when "${title}" runs as "<Day>s at H:MM PM MT, N minutes". Fix src/team-build/render.ts.`,
      );
    const col = d.days.findIndex((day) => m[1]!.startsWith(day));
    const start = (Number(m[2]) % 12) + 12 + Number(m[3]) / 60;
    // The axis's first hour ("10 AM"), so a row is hours after it.
    const first = Number(/^(\d+)/.exec(d.times[0]!)![1]);
    // Where and how long: the times are the axis's, so the drawing adds no words of its own.
    return { title: item.title, col, row: start - first, length: Number(m[4]) / 60 };
  };
  const events = [slot('Live builds'), slot('Office hours')]
    .map(
      (e, i) =>
        `<div class="cal-ev${i === 0 ? ' is-build' : ''}" style="--c:${e.col};--s:${e.row};--l:${e.length};--ei:${i}">${i === 0 ? brandIcon('sessions', 18) : ''}<span class="cal-ev-t">${esc(
          e.title,
        )}</span></div>`,
    )
    .join('');
  return [
    `<div class="cal" aria-hidden="true">`,
    `<div class="cal-top"><span class="mono">${esc(d.title)}</span><span class="mono cal-tz">${esc(d.zone)}</span></div>`,
    `<div class="cal-grid"><span></span>${d.days.map((day) => `<span class="mono cal-day">${esc(day)}</span>`).join('')}`,
    `<div class="cal-times">${d.times.map((t) => `<span class="mono">${esc(t)}</span>`).join('')}</div>`,
    `<div class="cal-area">${d.days.map((_, c) => `<span class="cal-col" style="--c:${c}"></span>`).join('')}${events}</div>`,
    `</div>`,
    `</div>`,
  ].join('');
}

/** How it runs, on the other theme, with a normal week drawn beside it. */
function how(): string {
  const items = HOW.items
    .map((i) => `<div class="runs-row how-item"><dt class="mono">${esc(i.title)}</dt><dd>${esc(i.body)}</dd></div>`)
    .join('');
  return [
    `<section class="sec runs how inverse" aria-labelledby="how-title">`,
    `<div class="wrap runs-grid">`,
    `<div class="runs-copy rv"><h2 id="how-title" class="h-section">${esc(HOW.heading)}</h2><dl class="runs-list how-list">${items}</dl></div>`,
    calendar(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** What you get: /offer's lines for the Accelerator, numbered. */
function get(): string {
  const lines = OFFERS.cohort.lines
    .map(
      (l, i) =>
        `<li class="fl-row"><span class="mono fl-idx" aria-hidden="true">${pad2(i + 1)}</span><span class="fl-title">${esc(l)}</span></li>`,
    )
    .join('');
  return [
    `<section class="sec get" aria-labelledby="get-title">`,
    `<div class="wrap get-grid">`,
    `<div class="get-head rv"><h2 id="get-title" class="h-section">${esc(GET.heading)}</h2></div>`,
    `<ol class="fl ticks rv" style="--d:100ms" role="list">${lines}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The founding price: the same buy block as the hero's, beside the price's heading and its line. */
function price(): string {
  return [
    `<section id="price" class="sec founding price-section" aria-labelledby="price-title">`,
    `<div class="founding-ripple" aria-hidden="true">${ripple(980)}</div>`,
    `<div class="wrap founding-grid">`,
    `<div class="founding-copy rv">${eyebrow(PRICE.heading, { mark: true })}<h2 id="price-title" class="h-section">${esc(PRICE.lede)}</h2></div>`,
    `<div class="founding-panel plan buy" data-state="${T.state(FIRST_CART)}">`,
    `<div class="tk-price">${offerPrice('cohort')}</div>`,
    `<div class="tk-status founding-open">${seats()}</div>`,
    offerActions('cohort', { proof: true }),
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>, in Spring's order. `examples` turns on the made-up week previews. */
export function renderTeamBuildBody({ examples = EXAMPLES_ON } = {}): string {
  const contact = `<p>${esc(SITE.footer.contactBefore)}<a class="inline-link" href="mailto:${esc(HELP_EMAIL)}">${esc(HELP_EMAIL)}</a>${esc(SITE.footer.contactAfter)}</p>`;
  return [
    kitSkip(),
    kitHeader('/team-build'),
    `<main id="main" tabindex="-1">`,
    hero(),
    who(),
    weeks(examples),
    how(),
    get(),
    proofSection(PROOF),
    founders(),
    price(),
    faq(TB_FAQ.items, { title: TB_FAQ.heading, aside: contact }),
    closeCta({ title: END.heading, lead: END.body, actions: button(END.button, FREE_SKILLS_HREF), free: true }),
    `</main>`,
    // The Clarity Call (D-161): after the price section's buy block and the close, above the footer.
    clarityCall('kit'),
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderTeamBuildHead;
export const renderBody = (): string => renderTeamBuildBody();
