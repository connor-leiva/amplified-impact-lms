// /teams, the Amplified Team Plan's sales page, as strings (DECISIONS.md D-113): the v2 mockup's
// TeamPlanPage, built on the kit (`../kit/`), with every word, date, price, link and state the live page
// has (`content.ts`).
//
// Built once by `../site/vite-plugin.ts` into `dist/teams.html`, its stylesheet inlined, then FILLED PER
// REQUEST by the API like /pricing: the two carts' state and Payment Links, the founding deadline and
// countdown, the login line's day, and where "Let's talk" goes (`%%team-call%%`, support's address
// unless set).
//
// ALL THREE SIZES ARE IN THE MARKUP, each with its own link. The mockup's team-size slider is the kit
// script's (`[data-sizer]`): hidden with no script, it only marks the size that fits and shows its price;
// it never swaps an href. The usage view and the join panels (`./examples.ts`) are made up, and off.
// Every string goes through `esc()`.

import { FOUNDING_TOKENS as F } from '@ai/core/founding';
import { OFFER_TOKENS as T } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { ENTRIES } from '../library/content';
import { CARD_STATES as S } from '../offer/content';
import { proofLine, SHARE_IMAGE, WAITLIST_HREF } from '../site/offers';
import { siteHead } from '../site/render';
import { brandIcon, glyph, ringDot, ripple, type BrandIconName } from '../kit/icons';
import { button, checks, closeCta, exTag, eyebrow, faq, headline, pad2, proofSection } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { PROOF } from '../team-build/content';
import {
  AGENTS_GET,
  BILLING,
  JOIN,
  OWNER_GETS,
  TEAMS_END,
  TEAMS_FAQ,
  TEAMS_HERO,
  TEAMS_META,
  TIERS,
  V2_SIZER,
} from './content';
import type { Tier } from './content';
import { EXAMPLES_ON, JOIN_PANELS, USAGE } from './examples';

export function renderTeamsHead(): string {
  return siteHead({ ...TEAMS_META, image: SHARE_IMAGE });
}

/** The countdown to the end of founding prices, or that they've ended: the hero's own lines. */
function salesLine(): string {
  const h = TEAMS_HERO;
  return [
    `<p class="status teams-founding founding-open"><span class="status-dot" aria-hidden="true"></span><span><strong>${F.countdown}</strong>${esc(h.countdownAfter)}${T.foundingCloses}${esc(
      h.countdownEnd,
    )}</span></p>`,
    `<p class="status status-closed teams-founding founding-closed"><span class="status-dot" aria-hidden="true"></span><span>${esc(h.closedBefore)}${T.foundingCloses}${esc(
      h.closedAfter,
    )}</span></p>`,
  ].join('');
}

/** The mockup's owner view of who's using it: made up, tagged, never by a price or a button. */
function usage(): string {
  const u = USAGE;
  const rows = u.roster
    .map(
      ([ini, name, used, last], i) =>
        `<li class="usage-row" style="--ui:${i};--used:${used / 10}"><span class="usage-av">${esc(ini)}</span><span class="usage-name">${esc(name)}</span><span class="usage-bar"><span></span></span><span class="usage-n tnum">${used}</span><span class="mono usage-last">${esc(
          last,
        )}</span></li>`,
    )
    .join('');
  const n = u.invited;
  return [
    `<div class="usage">`,
    `<div class="usage-top"><div><p class="mono usage-k">${esc(u.kicker)}</p><p class="usage-title">${esc(u.title)}</p></div>${exTag()}</div>`,
    `<ul class="usage-list" role="list">${rows}<li class="usage-row usage-new"><span class="usage-av is-new">${esc(n.initials)}</span><span class="usage-name">${esc(n.name)}</span><span class="mono usage-chip">${esc(
      n.chip,
    )}</span></li></ul>`,
    `<div class="usage-invite"><span class="usage-field">${esc(n.email)}</span><span class="usage-btn">${esc(n.button)}</span></div>`,
    `<p class="mono usage-cap">${esc(u.caption)}</p>`,
    `</div>`,
  ].join('');
}

function hero(examples: boolean): string {
  const h = TEAMS_HERO;
  return [
    `<section class="sec tm-hero teams-hero" aria-labelledby="teams-title" data-scroll="exit">`,
    `<div class="tm-ripple" aria-hidden="true">${ripple(820, { intro: true })}</div>`,
    `<div class="wrap tm-hero-grid">`,
    `<div class="tm-hero-copy">`,
    eyebrow(h.eyebrow, { icon: 'team-hub' }),
    `<h1 id="teams-title" class="h-hero tm-title">${headline(h.title)}</h1>`,
    `<p class="lead lede fade-1">${esc(h.lede)}</p>`,
    `<div class="actions fade-2">${button(TEAMS_END.button, '#sizes')}</div>`,
    `<div class="tm-sales fade-3">${salesLine()}${proofLine()}</div>`,
    `</div>`,
    examples ? `<div class="tm-hero-art"><div class="tm-art-in">${usage()}</div></div>` : '',
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The largest team a size takes, from its live name: "Up to 15 agents" is 15, "16 to 40 agents" 40, "Over 40" none. */
function maxOf(t: Tier): number | null {
  const m = /(\d+) agents$/.exec(t.name);
  return /^Over /.test(t.name) || !m ? null : Number(m[1]);
}

/** The price block of one size, its live words: the figure, its unit and its terms. */
const priceOf = (t: Tier) =>
  `<div class="price"><p class="figure"><span class="amount">${esc(t.amount)}</span> <span class="unit">${esc(t.unit)}</span></p>${t.terms
    .map((x) => `<p class="terms">${esc(x)}</p>`)
    .join('')}</div>`;

/**
 * The mockup's team-size slider. Hidden with no script (the kit's script shows it): drag it and the size
 * that fits is marked, its price shown beside the seats. Its only new words are its label.
 */
function sizer(): string {
  const tiers = TIERS.items;
  const caps = tiers.map(maxOf);
  const first = caps[0];
  if (first === null || first === undefined) throw new Error('The first team size names no top size. Fix src/teams/content.ts.');
  const top = Math.max(...caps.filter((c): c is number => c !== null));
  const start = 12;
  const seats = Array.from(
    { length: top },
    (_, i) =>
      `<span class="seat${i < start ? ' is-on' : ''}${i >= first ? ' tier-2' : ''}" style="--si:${i}"></span>`,
  ).join('');
  const panels = tiers
    .map(
      (t, i) =>
        `<div class="sizer-tier" data-tier="${t.id}" data-max="${caps[i] ?? top + 1}"${i === 0 ? '' : ' hidden'}>${priceOf(t)}</div>`,
    )
    .join('');
  return [
    `<div class="sizer" data-sizer hidden>`,
    `<div class="sizer-count">`,
    `<label for="team-size" class="mono sizer-label">${esc(V2_SIZER.label)}</label>`,
    `<output for="team-size" class="sizer-num tnum">${start}</output>`,
    `<div class="sizer-range"><input id="team-size" class="range" type="range" min="1" max="${top + 1}" step="1" value="${start}" style="--fill:${((start - 1) / top) * 100}%"/><div class="sizer-ticks mono" aria-hidden="true"><span style="left:0%">1</span><span style="left:${(
      ((first - 1) / top) *
      100
    ).toFixed(2)}%">${first}</span><span style="left:100%">${top}+</span></div></div>`,
    `</div>`,
    `<div class="seats" aria-hidden="true">${seats}<span class="seat seat-more">+</span></div>`,
    `<div class="sizer-math">${panels}</div>`,
    `</div>`,
  ].join('');
}

/**
 * One team size: its number and name, its price, what the owner gets, then its button with the proof
 * right under it, or what it says instead. Over 40 has no cart: always its conversation.
 */
function tier(t: Tier, i: number): string {
  const actions = t.cart
    ? [
        `<div class="act-link"><a class="btn btn-primary" href="${T.link(t.cart)}" aria-describedby="${t.id}-name">${esc(t.button)}</a>${proofLine()}</div>`,
        `<p class="act-soon">${esc(S.soon)}</p>`,
        `<p class="act-closed">${esc(S.teamClosedBefore)}${T.foundingCloses}${esc(S.teamClosedAfter)}</p>`,
        `<a class="btn btn-secondary act-closed" href="${WAITLIST_HREF}">${esc(S.waitlist)}</a>`,
      ]
    : [
        `<div class="act-link"><a class="btn btn-secondary" href="${T.teamCall}" aria-describedby="${t.id}-name">${esc(t.button)}</a></div>`,
      ];
  return [
    `<li class="card plan tier rv" style="--d:${i * 90}ms" id="${t.id}" data-state="${t.cart ? T.state(t.cart) : 'link'}" aria-labelledby="${t.id}-name">`,
    `<p class="mono tier-idx" aria-hidden="true">${pad2(i + 1)}</p>`,
    `<h3 class="plan-name tier-name" id="${t.id}-name">${esc(t.name)}</h3>`,
    `<div class="tier-price">${priceOf(t)}</div>`,
    `<div class="tier-owner"><p class="mono tier-label">${esc(TIERS.ownerLabel)}</p>${checks(t.owner)}</div>`,
    `<div class="plan-actions">${actions.join('')}</div>`,
    `</li>`,
  ].join('');
}

function sizes(): string {
  return [
    `<section id="sizes" class="sec sizes" aria-labelledby="sizes-title">`,
    `<div class="wrap">`,
    `<div class="sizes-head rv"><h2 id="sizes-title" class="h-section">${esc(TIERS.heading)}</h2>${salesLine()}</div>`,
    sizer(),
    `<ol class="tiers plan-grid tier-grid" role="list">${TIERS.items.map(tier).join('')}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** What your agents get, and what you get as the owner, side by side. */
function gets(): string {
  const a = AGENTS_GET;
  return [
    `<section id="agents-get" class="sec gets" aria-labelledby="agents-get-title">`,
    `<div class="wrap gets-grid">`,
    `<div class="gets-col rv"><span class="gets-ic">${brandIcon('ai-employee', 24)}</span><h2 id="agents-get-title" class="h-sub">${esc(a.heading)}</h2><p class="gets-lede section-lede">${esc(
      a.lede,
    )}</p>${checks(a.lines)}<p class="mono rotation-label">${esc(a.rotationLabel)}</p><ul class="rotation" role="list">${a.rotation.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`,
    `<div class="gets-col rv" style="--d:100ms"><span class="gets-ic">${brandIcon('dashboard', 24)}</span><h2 id="owner-get-title" class="h-sub">${esc(OWNER_GETS.heading)}</h2>${checks(
      OWNER_GETS.lines,
    )}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The mockup's panels beside the steps: made up, tagged, never by a price or a button. */
function joinPanels(): string {
  const p = JOIN_PANELS;
  const titles = p.open.slugs.map((s) => ENTRIES.find((e) => e.href === `/${s}`)?.title ?? s);
  return [
    `<div class="jp-stack">`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(p.invite.tag)}</span><span class="mono panel-meta">${esc(p.invite.meta)}</span></div><ul class="jp-list" role="list">${p.invite.emails
      .map(
        (e) =>
          `<li><span class="jp-mail">${esc(e)}</span><span class="mono jp-chip">${glyph('check', 14)}${esc(p.invite.chip)}</span></li>`,
      )
      .join('')}</ul></div>`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(p.open.tag)}</span><span class="mono panel-meta">${esc(p.open.meta)}</span></div><p class="jp-tiles">${titles
      .map((t) => `<span class="jp-tile">${ringDot(14)}<span class="jp-tn">${esc(t)}</span></span>`)
      .join('')}</p></div>`,
    `<div class="panel"><div class="panel-bar"><span class="mono panel-tag">${esc(p.week.tag)}</span><span class="mono panel-meta">${esc(p.week.meta)}</span></div><div class="jp-week">${p.week.events
      .map(
        ([t, m], i) =>
          `<div class="jp-ev${i === 0 ? ' is-live' : ''}">${brandIcon(i === 0 ? 'sessions' : 'video-lesson', 22)}<span class="jp-ev-t">${esc(t)}</span><span class="mono">${esc(m)}</span></div>`,
      )
      .join('')}</div></div>`,
    `<p class="jp-tag">${exTag()}</p>`,
    `</div>`,
  ].join('');
}

const JOIN_ICONS: readonly BrandIconName[] = ['checklist', 'team-hub', 'modules', 'sessions'];

/** How your agents join: four steps, each with its brand icon; the first keeps the login line's two versions. */
function join(examples: boolean): string {
  const steps = JOIN.steps
    .map((s, i) => {
      const body =
        'body' in s
          ? esc(s.body)
          : `<span class="invites-held">${esc(s.held.before)}${T.loginDay}${esc(s.held.after)}</span><span class="invites-sent">${esc(s.sent)}</span>`;
      return `<li class="join-step"><span class="join-ic">${brandIcon(JOIN_ICONS[i]!, 20)}</span><div class="join-txt"><h3 class="join-name">${esc(s.title)}</h3><p class="join-text">${body}</p></div></li>`;
    })
    .join('');
  return [
    `<section class="sec join" aria-labelledby="join-title">`,
    `<div class="wrap join-grid${examples ? '' : ' is-solo'}">`,
    `<div class="join-copy rv"><h2 id="join-title" class="h-section">${esc(JOIN.heading)}</h2><ol class="join-steps steps" role="list">${steps}</ol></div>`,
    examples ? `<div class="join-stage">${joinPanels()}</div>` : '',
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** How billing works, on the other theme: the live lines. */
function billing(): string {
  return [
    `<section class="sec billing inverse" aria-labelledby="billing-title">`,
    `<div class="wrap billing-grid">`,
    `<div class="billing-head rv"><h2 id="billing-title" class="h-section">${esc(BILLING.heading)}</h2></div>`,
    `<div class="billing-copy rv" style="--d:100ms">${BILLING.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The close: "Ready to train your team?", its button to the sizes, the proof, and Over 40's conversation. */
function end(): string {
  const e = TEAMS_END;
  return closeCta({
    title: e.heading,
    actions: `${button(e.button, '#sizes')}${proofLine()}<p class="end-more">${esc(e.moreBefore)}<a class="inline-link" href="${T.teamCall}">${esc(e.moreLink)}</a>${esc(e.moreAfter)}</p>`,
    cls: 'end',
  });
}

/** Everything inside <body>, in Spring's order. `examples` turns on the made-up illustrations. */
export function renderTeamsBody({ examples = EXAMPLES_ON } = {}): string {
  return [
    kitSkip(),
    kitHeader('/teams'),
    `<main id="main" tabindex="-1">`,
    hero(examples),
    proofSection(PROOF),
    sizes(),
    gets(),
    join(examples),
    billing(),
    faq(TEAMS_FAQ.items, { title: TEAMS_FAQ.heading }),
    end(),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderTeamsHead;
export const renderBody = (): string => renderTeamsBody();
