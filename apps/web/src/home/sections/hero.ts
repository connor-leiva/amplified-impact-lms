// The hero: the two-line headline, the lead, the two links, and the made-up offer plan to check term
// by term. Then the strip under it ("the ticker"), with the Library's real count.

import { PAGE } from '../content';
import { glyph, ripple } from '../icons';
import { cta, esc, eyebrow, words } from '../parts';

/** The card's changing words, for the script to swap in: never assembled in the browser. */
function offerWords(): string {
  const o = PAGE.offer;
  const words = {
    'status-drafting': o.status.drafting,
    'status-drafted': o.status.drafted,
    'status-checked': o.status.checked,
    'sign-decides': o.decides,
    'sign-ready': o.ready,
    'hint-start': o.hint.start,
    'hint-some': o.hint.some,
    'hint-all': o.hint.all,
  };
  return Object.entries(words)
    .map(([k, v]) => `data-${k}="${esc(v)}"`)
    .join(' ');
}

/**
 * The offer plan card. Each term is a real checkbox in its row, so tapping a row ticks it with or
 * without the script; the script adds the drafting intro, the progress bar and the running count.
 * Rendered in its finished state ("Drafted", every term in), which is what shows with no script.
 */
export function offerCard(): string {
  const o = PAGE.offer;
  const terms = o.terms
    .map(
      (t) =>
        `<li class="term-li is-in"><label class="term"><input class="term-input" type="checkbox" /><span class="term-label">${esc(t.label)}</span><span class="term-value tnum">${esc(
          t.value,
        )}</span><span class="term-box" aria-hidden="true">${glyph('check', 14)}</span></label></li>`,
    )
    .join('');
  return [
    `<article class="offer" aria-label="${esc(o.label)}" data-offer ${offerWords()}>`,
    `<div class="offer-head">`,
    `<p class="mono offer-kicker">${esc(o.kicker)}</p>`,
    `<p class="mono offer-status" aria-live="polite"><span class="offer-dot" aria-hidden="true"></span><span data-offer-status>${esc(o.status.drafted)}</span></p>`,
    `</div>`,
    `<h2 class="offer-addr">${esc(o.address)}</h2>`,
    `<p class="offer-rec">${esc(o.recommendBefore)}<strong>${esc(o.recommendStrong)}</strong>${esc(o.recommendAfter)}</p>`,
    `<ul class="offer-terms" role="list">${terms}</ul>`,
    `<div class="offer-progress" aria-hidden="true"><span data-offer-progress></span></div>`,
    `<div class="offer-foot">`,
    `<div class="offer-sign"><span class="initials" aria-hidden="true">${glyph('check', 18)}</span><p class="offer-sign-text"><span class="mono">${esc(
      o.initials,
    )}</span><span data-offer-sign>${esc(o.decides)}</span></p></div>`,
    `<p class="mono offer-hint" data-offer-hint>${esc(o.hint.start)}</p>`,
    `</div>`,
    `</article>`,
  ].join('');
}

/** The strip under the hero: the Library's count and two facts, and a scroll cue on wide screens. */
function ticker(count: number): string {
  const t = PAGE.ticker;
  const items = [t.count(count), ...t.items].map((i) => `<li>${esc(i)}</li>`).join('');
  return `<div class="wrap"><ul class="mono meta-strip" role="list">${items}<li class="scroll-cue" aria-hidden="true"><span>${esc(
    t.scroll,
  )}</span><span class="cue-line"></span></li></ul></div>`;
}

export function hero(libraryCount: number): string {
  const h = PAGE.hero;
  const [first, second] = h.title;
  return [
    `<section class="sec hero" aria-labelledby="hero-title" data-scroll="exit">`,
    `<div class="hero-ripple" aria-hidden="true">${ripple(1040, { intro: true })}</div>`,
    `<div class="wrap hero-grid">`,
    `<div class="hero-copy">`,
    eyebrow(h.eyebrow, { cls: 'hero-eb' }),
    `<h1 id="hero-title" class="hero-title"><span class="hero-line">${words(first)}</span> <span class="hero-line hero-line-2">${words(second, first.split(' ').length)}</span></h1>`,
    `<p class="lead hero-lead">${esc(h.lead)}</p>`,
    `<div class="actions hero-actions">${cta(h.primary.label, h.primary.href, { cls: 'cta-lg' })}${cta(h.secondary.label, h.secondary.href, { variant: 'link' })}</div>`,
    `</div>`,
    `<div class="hero-card"><div class="hero-card-in">${offerCard()}</div></div>`,
    `</div>`,
    ticker(libraryCount),
    `</section>`,
  ].join('\n');
}
