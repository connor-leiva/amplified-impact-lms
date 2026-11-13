// S1, the hero (`section.hh`, dark): "Your next employee doesn’t need a desk.", the free and Programs
// buttons, the AI-employee badge with its three tabs, and the stat strip (brief § 4, S1).
//
// FROM THE MOCKUP, WITH THE SITE'S RULES ON TOP (brief § 6):
//   - the proof line sits in the same group as "Get 5 Free Skills" (rule: next to every free or buy
//     button), and that group and the stat strip never fade in: they hold proof (rule: nothing buy,
//     seat or proof related starts hidden). The mockup fades both in on load;
//   - the figures are final in the markup, from their sources: 100 and 700+ from the proof line,
//     58 from the Library. The script may count them up only once they scroll into view;
//   - the badge is an illustration. Each card's accessible name still says it is a made-up example.
//     The visible "Made-up example" tag is not printed on the card.
//
// THE BADGE'S TABS work without the script as far as they can: Owners shows, and the other two badges
// are in the markup, hidden. The script (`client/badges.ts`) switches them and, on a wide screen with
// motion allowed, rotates through them with a fill bar.

import { esc } from '../../../ai101/render';
import { ripple } from '../../../kit/icons';
import { button, proofLine, words } from '../../../kit/parts';
import { ENTRIES } from '../../../library/content';
import { splitProof } from '../../sections/proof';
import { HERO, type Badge } from '../content';
import { glyph, ringDot } from '../icons';

/** The hero's three figures: the proof line's two, then the Library's count, each final in the markup. */
export function heroStats(): { value: number; plus: boolean; label: string }[] {
  const [agents, homes] = splitProof().stats;
  return [
    { value: agents!.value, plus: agents!.plus, label: HERO.stats.agents },
    { value: homes!.value, plus: homes!.plus, label: HERO.stats.homes },
    { value: ENTRIES.length, plus: false, label: HERO.stats.library },
  ];
}

/**
 * The badge's photo: a head-and-shoulders silhouette on a light photo slot.
 * Geometry only, so it cannot be read as a real or generated face.
 */
const avatar = () =>
  '<svg viewBox="0 0 76 76" class="bdg-avatar" aria-hidden="true" focusable="false"><path class="bdg-avatar-shoulders" d="M38 39c-5.5 0-9.5 2.4-12.4 6.2C18.2 50.4 6.4 63 2.5 82h71C69.6 63 57.8 50.4 50.4 45.2 47.5 41.4 43.5 39 38 39z"/><circle class="bdg-avatar-head" cx="38" cy="27" r="13.5"/></svg>';

function badge(b: Badge, shown: boolean): string {
  const label = `${b.name}, an AI employee ${b.role.charAt(0).toLowerCase()}${b.role.slice(1)}. A made-up example.`;
  return [
    `<article class="bdg" data-badge="${b.key}" aria-label="${esc(label)}"${shown ? '' : ' hidden'}>`,
    `<span class="bdg-slot" aria-hidden="true"><span class="bdg-clip"></span></span>`,
    `<div class="bdg-top"><span class="mono bdg-kicker">${ringDot(14)}${esc(HERO.kicker)}</span></div>`,
    `<div class="bdg-id"><span class="bdg-photo" aria-hidden="true">${avatar()}</span><div class="bdg-who"><p class="bdg-name">${esc(
      b.name,
    )}</p><p class="mono bdg-role">${esc(b.role)}</p></div></div>`,
    `<dl class="bdg-facts">${b.facts
      .map(
        ([k, v], j) => `<div class="bdg-fact" style="--j:${j}"><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`,
      )
      .join('')}</dl>`,
    `<div class="bdg-feed"><p class="mono bdg-feed-h"><span class="bdg-live" aria-hidden="true"></span>${esc(b.readyAt)}</p><ul role="list">${b.ready
      .map(
        (item, j) =>
          `<li style="--j:${j}"><span class="bdg-check" aria-hidden="true">${glyph('check', 12)}</span><span>${esc(item)}</span></li>`,
      )
      .join('')}</ul></div>`,
    `</article>`,
  ].join('');
}

function visual(): string {
  const badges = HERO.badges as readonly Badge[];
  const tabs = badges
    .map(
      (b, i) =>
        `<button type="button" class="bdg-tab" data-badge-tab="${b.key}" aria-pressed="${i === 0}"><span class="bdg-tab-track" aria-hidden="true"></span><span class="mono bdg-tab-k">${esc(
          b.tab,
        )}</span></button>`,
    )
    .join('');
  return [
    `<div class="hh-visual fade-1" data-badges>`,
    `<div class="bdg-wrap">`,
    `<span class="bdg-strap" aria-hidden="true"></span>`,
    `<div class="bdg-deck"><span class="bdg-ghost bdg-ghost-1" aria-hidden="true"></span><span class="bdg-ghost bdg-ghost-2" aria-hidden="true"></span>${badges
      .map((b, i) => badge(b, i === 0))
      .join('')}</div>`,
    `<div class="bdg-tabs" role="group" aria-label="${esc(HERO.tabsLabel)}">${tabs}</div>`,
    `</div>`,
    `</div>`,
  ].join('');
}

function stats(): string {
  return `<div class="wrap"><ul class="hh-stats" role="list">${heroStats()
    .map(
      (s) =>
        `<li class="hh-stat"><span class="hh-num tnum"><span class="tnum" data-v3-count="${s.value}">${s.value.toLocaleString(
          'en-US',
        )}</span>${s.plus ? '+' : ''}</span><span class="mono hh-label">${esc(s.label)}</span></li>`,
    )
    .join('')}</ul></div>`;
}

export function hero(): string {
  let wi = 0;
  const lines = HERO.title.map((line) => {
    const html = `<span class="hero-line">${words(line, wi)}</span>`;
    wi += line.split(' ').length;
    return html;
  });
  return [
    `<section class="sec hh" aria-labelledby="hh-title" data-scroll="exit">`,
    `<div class="hh-ripple" aria-hidden="true">${ripple(1100, { intro: true })}</div>`,
    `<div class="wrap hh-grid">`,
    `<div class="hh-copy">`,
    `<p class="eb eb-mark hh-eb">${ringDot(22)}<span>${esc(HERO.eyebrow)}</span></p>`,
    `<h1 id="hh-title" class="h-hero hh-title">${lines.join(' ')}</h1>`,
    `<p class="lead fade-1">${esc(HERO.lead)}</p>`,
    `<div class="hh-cta"><div class="actions">${button(HERO.primary.label, HERO.primary.href, { size: 'lg' })}${button(
      HERO.secondary.label,
      HERO.secondary.href,
      { variant: 'link' },
    )}</div>${proofLine()}</div>`,
    `</div>`,
    visual(),
    `</div>`,
    stats(),
    `</section>`,
  ].join('');
}
