// For Team Owners: the Amplified Team Plan, and the calculator that prices it by team size. On the light
// ground.
//
// The slider sets one number the page shares: the Team Plan's card under Plans and Prices shows the same
// tier, and its button buys that tier. Every figure the script shows is written into the markup here, from
// `prices.ts`, so the script holds no price of its own.

import { PAGE } from '../content';
import { ringDot } from '../icons';
import { PRICES, usd } from '../prices';
import { cta, esc, eyebrow, pad2 } from '../parts';

const T = PRICES.teamPlan;

/** The tier (0: up to 15, 1: 16 to 40) a team of `agents` is in. */
export const tierOf = (agents: number): 0 | 1 => (agents > T.tierMax ? 1 : 0);

function calculator(): string {
  const c = PAGE.team.calc;
  const n = c.start;
  const tier = tierOf(n);
  const seats = Array.from(
    { length: T.max },
    (_, i) => `<span class="seat${i < n ? ' is-on' : ''}${i >= T.tierMax ? ' tier-2' : ''}" style="--si:${i}"></span>`,
  ).join('');
  const fill = (((n - 1) / (T.max - 1)) * 100).toFixed(2);
  // Both tiers' words, for the script to swap between: never assembled in the browser.
  const data = [
    `data-calc`,
    `data-tier-max="${T.tierMax}"`,
    `data-today="${T.today.join(',')}"`,
    `data-tiers="${esc(c.tiers.join('|'))}"`,
    `data-after="${esc(T.monthly.map((m) => c.after(m)).join('|'))}"`,
    `data-unit="${esc(c.note)}"`,
  ].join(' ');
  return [
    `<div class="calc-panel" ${data}>`,
    `<div class="calc-top"><label for="hp-agents" class="calc-label">${esc(c.label)}</label><span class="mono calc-tier" data-calc-tier>${esc(c.tiers[tier])}</span></div>`,
    `<output for="hp-agents" class="calc-count tnum" data-calc-count>${n}</output>`,
    `<input id="hp-agents" class="range" type="range" min="1" max="${T.max}" step="1" value="${n}" style="--fill:${fill}%" />`,
    `<div class="seats" aria-hidden="true">${seats}</div>`,
    `<div class="calc-price">`,
    `<p class="price-line"><span class="price tnum" data-calc-price>${usd(T.today[tier])}</span><span class="mono price-note">${esc(c.note)}</span></p>`,
    `<p class="price-after" data-calc-after>${esc(c.after(T.monthly[tier]))}</p>`,
    `<p class="calc-extra" data-calc-extra${tier === 1 ? '' : ' hidden'}>${ringDot(16)}<span>${esc(c.extra)}</span></p>`,
    `</div>`,
    `<p class="calc-note">${esc(c.more)}</p>`,
    `</div>`,
  ].join('');
}

export function team(): string {
  const t = PAGE.team;
  const items = t.items
    .map(
      (it, i) =>
        `<li class="fl-row"><span class="mono fl-idx" aria-hidden="true">${pad2(i + 1)}</span><span class="fl-title">${esc(it)}</span></li>`,
    )
    .join('');
  return [
    `<section id="team-owners" class="sec team" data-theme="light" aria-labelledby="team-title">`,
    `<div class="wrap team-grid">`,
    `<div class="team-copy rv">`,
    eyebrow(t.eyebrow, { mark: true }),
    `<h2 id="team-title" class="h-section">${esc(t.heading)}</h2>`,
    `<p class="intro">${esc(t.intro)}</p>`,
    `<ol class="fl" role="list">${items}</ol>`,
    `<div class="actions">${cta(t.primary.label, t.primary.href, { cls: 'cta-lg' })}${cta(t.secondary.label, t.secondary.href, { variant: 'link' })}</div>`,
    `</div>`,
    `<div class="team-calc rv" style="--d:140ms">${calculator()}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
