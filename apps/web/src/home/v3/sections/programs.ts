// S11, the programs (`section.pg`, #programs): four ways to hire AI, every price shown (brief § 4, S11).
//
// NO STRIPE BUTTONS (Connor's D1): each card's button goes to its program's own page (/team-build,
// /insiders, /teams, /agents), as the live homepage's do, and the proof line sits beside it (rule). The
// switches (Yearly / Monthly, Up to 15 / 16 to 40, Monthly / Yearly) swap the price shown; the button
// stays on the program's page.
//
// EVERY FIGURE IS /pricing's: the amounts from `../../prices.ts` (read from the offer's own words), the
// dates from `@ai/core/offer`, the seats left from `GET /api/offer` once it counts. The sentences around them
// are the mockup's (`PROGRAMS`); a test holds the result to copy.md.
//
// LIVE (`client/offer.ts`): the Accelerator open, sold out or closed, and the Team Plan open or closed,
// in /pricing's words (`CARD_STATES`). The seat meter and its line show from the start (`./offer.ts`).
//
// The Team Plan's dates are /pricing's (Connor's D7, 4:41 PM MT Nov 12): the starter path and the 5 free
// skills on December 14, and live classes from the week of January 4.
//
// The cards hold buttons, seats and the proof line, so none of them is a reveal (`.rv`): they are
// simply there. The Accelerator's card is the forest one, as in the mockup.

import { AGENT_PLAN_FIRST_CHARGE_AT, HELP_EMAIL, MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { esc } from '../../../ai101/render';
import { button } from '../../../kit/parts';
import { CARD_STATES } from '../../../offer/content';
import { PRICES, usd } from '../../prices';
import { PROGRAMS } from '../content';
import { programLogo, type ProgramKey } from '../../program-logo';
import { glyph, ringDot } from '../icons';
import { CENTRAL, ctaGroup, foundingDay, offerAttrs, seatBlock, shortDay, soldoutLine, closedLine, teamClosedLine, waitlistButton } from './offer';

type Key = keyof typeof PROGRAMS.cards;

/**
 * Each card's id, its name as the offer names it, and its logo: Connor's (`programLogo()`), as the
 * homepage's cards had them (PR #73), never a generic icon or a typed name.
 */
const CARDS: readonly { key: Key; id: string; name: string; logo: ProgramKey }[] = [
  { key: 'accelerator', id: 'p-accelerator', name: PLAN_NAMES.cohort, logo: 'accelerator' },
  { key: 'insiders', id: 'p-insiders', name: MEMBERSHIP_NAME, logo: 'insiders' },
  { key: 'team', id: 'p-team', name: PLAN_NAMES.agents, logo: 'team-plan' },
  { key: 'agent', id: 'p-agent', name: PLAN_NAMES.agent_plan, logo: 'agent-plan' },
];

/**
 * THE LOCKUP IS THE HEADING (PR #73's pattern): each card's <h3> holds the offer's exact name, visually
 * hidden, and the program's stacked lockup, hidden from screen readers since the heading says the name.
 * 28px type: the typed name's size here (`clamp(26px, 2.4vw, 32px)`), and the widest lockup (the
 * Accelerator's, 216px) fits the narrowest card with room to spare. Every stacked lockup is the same
 * height at it, so the cards' rows still line up.
 */
export const CARD_LOGO_TYPE = 28;

const priceLine = (amount: string, note: string) =>
  `<p class="price-line"><span class="price-big tnum">${esc(amount)}</span><span class="mono price-note">${esc(note)}</span></p>`;
const after = (text: string, attrs = '') => `<p class="price-after"${attrs}>${esc(text)}</p>`;

/** A two-way switch and its two prices: the first shown, the second waiting for its button. */
function switched(label: string, a: string, b: string, prices: readonly [string, string]): string {
  return [
    `<div class="seg-toggle" role="group" aria-label="${esc(label)}" data-v3-switch><button type="button" aria-pressed="true" data-v3-opt="0">${esc(
      a,
    )}</button><button type="button" aria-pressed="false" data-v3-opt="1">${esc(b)}</button></div>`,
    `<div class="pg-alt" data-v3-alt="0">${prices[0]}</div>`,
    `<div class="pg-alt" data-v3-alt="1" hidden>${prices[1]}</div>`,
  ].join('');
}

function price(key: Key): string {
  const c = PROGRAMS.cards;
  switch (key) {
    case 'accelerator': {
      const a = PRICES.accelerator;
      return [
        `<div class="pg-state" data-when="acc-open acc-soldout">${priceLine(usd(a.founding), c.accelerator.note)}</div>`,
        after(c.accelerator.after(usd(a.twoPay), usd(a.standard), foundingDay()), ' data-when="acc-open"'),
        after(soldoutLine(), ' data-when="acc-soldout" hidden'),
        `<div class="pg-state" data-when="acc-closed" hidden>${priceLine(CARD_STATES.closedAmount, CARD_STATES.closedUnit)}${after(closedLine())}</div>`,
        seatBlock('pg-seats'),
      ].join('');
    }
    case 'insiders': {
      const i = PRICES.insiders;
      const line = after(c.insiders.after(usd(i.monthly)));
      return switched(c.insiders.toggle.label, c.insiders.toggle.a, c.insiders.toggle.b, [
        `${priceLine(usd(i.yearly), c.insiders.notes[0])}${line}`,
        `${priceLine(usd(i.monthly), c.insiders.notes[1])}${line}`,
      ]);
    }
    case 'team': {
      const t = PRICES.teamPlan;
      return [
        `<div class="pg-state" data-when="team-open" data-v3-switch-scope>${switched(c.team.toggle.label, c.team.toggle.a, c.team.toggle.b, [
          `${priceLine(usd(t.today[0]), c.team.note)}${after(c.team.after(t.tierMax, usd(t.monthly[0]), t.monthlyFrom))}`,
          `${priceLine(usd(t.today[1]), c.team.note)}${after(c.team.afterWide(t.tierMax + 1, t.max, usd(t.monthly[1]), t.monthlyFrom))}`,
        ])}</div>`,
        after(teamClosedLine(), ' data-when="team-closed" hidden'),
      ].join('');
    }
    case 'agent': {
      const g = PRICES.agentPlan;
      const line = after(c.agent.after(usd(g.yearly), shortDay(AGENT_PLAN_FIRST_CHARGE_AT, CENTRAL)));
      return switched(c.agent.toggle.label, c.agent.toggle.a, c.agent.toggle.b, [
        `${priceLine(usd(g.monthly), c.agent.notes[0])}${line}`,
        `${priceLine(usd(g.yearly), c.agent.notes[1])}${line}`,
      ]);
    }
  }
}

function actions(key: Key): string {
  const c = PROGRAMS.cards;
  const href = c[key].href;
  switch (key) {
    case 'accelerator':
      return ctaGroup('pg-cta', [
        {
          when: 'acc-open',
          html: `${button(c.accelerator.cta, href, { size: 'lg' })}${button(c.accelerator.alt(usd(PRICES.accelerator.twoPay)), href, { variant: 'link' })}`,
        },
        { when: 'acc-soldout acc-closed', hidden: true, html: waitlistButton(href) },
      ]);
    case 'team':
      return ctaGroup('pg-cta', [
        {
          when: 'team-open',
          html: `${button(c.team.cta, href, { variant: 'secondary', size: 'lg' })}${button(c.team.over, `mailto:${HELP_EMAIL}`, { variant: 'link' })}`,
        },
        { when: 'team-closed', hidden: true, html: waitlistButton(href, 'secondary') },
      ]);
    default:
      return ctaGroup('pg-cta', [{ html: button(c[key].cta, href, { variant: 'secondary', size: 'lg' }) }]);
  }
}

function best(key: Key): string {
  const c = PROGRAMS.cards;
  if (key !== 'team') return `<p class="pg-best">${esc(c[key].best)}</p>`;
  return `<p class="pg-best">${esc(c.team.best)} ${esc(c.team.dates)}</p>`;
}

function card({ key, id, name, logo }: (typeof CARDS)[number]): string {
  const c = PROGRAMS.cards[key];
  const featured = key === 'accelerator';
  const head = `${id.replace('p-', 'pg-')}`;
  return [
    `<article class="pg-card${featured ? ' is-featured' : ''}" id="${id}"${featured ? ' data-theme="forest"' : ''} aria-labelledby="${head}"${
      key === 'insiders' || key === 'agent' ? ' data-v3-switch-scope' : ''
    }>`,
    `<div class="pg-top"><span class="pg-kick"><span class="mono pg-kicker">${esc(
      c.kicker,
    )}</span><span class="mono pg-who">${esc(c.who)}</span></span><a href="${esc(c.href)}" class="pg-more" aria-label="${esc(
      PROGRAMS.detailsSaid(name),
    )}"><span class="mono">${esc(PROGRAMS.details)}</span>${glyph('arrow', 16)}</a></div>`,
    `<h3 id="${head}" class="pg-name"><span class="sr-only">${esc(name)}</span><span class="pg-logo" data-program="${logo}">${programLogo(logo, {
      variant: 'stacked',
      size: CARD_LOGO_TYPE,
      title: '',
    })}</span></h3>`,
    `<p class="pg-text">${esc(c.text)}</p>`,
    `<ul class="pg-list" role="list">${c.list.map((l) => `<li>${glyph('check', 14)}<span>${esc(l)}</span></li>`).join('')}</ul>`,
    best(key),
    `<div class="pg-price">${price(key)}</div>`,
    actions(key),
    `</article>`,
  ].join('');
}

export function programs(): string {
  const p = PROGRAMS;
  const index = CARDS.map(
    ({ key, id, logo }) =>
      `<li><a href="#${id}" class="pg-jump"><span class="pg-jump-ic">${programLogo(logo, { variant: 'symbol', title: '' })}</span><span class="mono pg-jump-k">${esc(
        p.cards[key].kicker,
      )}</span><span class="pg-jump-n">${esc(p.cards[key].short)}</span>${glyph('arrow', 16, 'pg-jump-go')}</a></li>`,
  ).join('');
  return [
    `<section id="programs" class="sec pg" aria-labelledby="pg-title" ${offerAttrs()}>`,
    `<div class="wrap">`,
    `<div class="pg-head"><div class="rv pg-head-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(p.eyebrow)}</span></p><h2 id="pg-title" class="h-section">${esc(
      p.title,
    )}</h2></div><p class="rv intro">${esc(p.intro)}</p></div>`,
    `<ol class="rv pg-index" role="list" aria-label="${esc(p.indexLabel)}">${index}</ol>`,
    `<div class="pg-grid">${CARDS.map(card).join('')}</div>`,
    `<div class="rv pg-foot"><p>${esc(p.foot)}</p>${button(p.compare.label, p.compare.href, { variant: 'link' })}</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
