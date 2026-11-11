// "Two ways to use AI": the chat that starts from scratch beside the skill that runs the same steps.
//
// On a wide screen with motion allowed, the script pins it (`is-pinned`) and scrolling plays it: the
// chat side greys out and the three checks fill in. Everywhere else (a phone, reduced motion, no
// script) it is the finished picture, stacked, with nothing sticky (`is-static`).

import { PAGE } from '../content';
import { glyph, monogram, ripple } from '../icons';
import { esc, eyebrow } from '../parts';

export function compare(): string {
  const c = PAGE.compare;
  const bubbles = c.tool.bubbles.map((b) => `<li class="bubble">${esc(b)}</li>`).join('');
  const items = c.work.items
    .map(
      (t, i) =>
        `<li class="work-item" style="--wi:${i}"><span class="work-check" aria-hidden="true">${glyph('check', 14)}</span><span>${esc(t)}</span></li>`,
    )
    .join('');
  return [
    `<section class="sec cmp is-static" data-pin="compare" aria-labelledby="cmp-title">`,
    `<div class="cmp-stick">`,
    `<div class="cmp-ripple" aria-hidden="true">${ripple(980)}</div>`,
    `<div class="wrap cmp-inner">`,
    `<div class="cmp-head">${eyebrow(c.eyebrow, { mark: true })}<h2 id="cmp-title" class="h-section cmp-title">${esc(c.heading)}</h2></div>`,
    `<div class="cmp-grid">`,
    `<div class="cmp-tool"><h3 class="cmp-label"><span class="mono" aria-hidden="true">${esc(c.tool.index)}</span>${esc(c.tool.label)}</h3><ul class="bubbles" role="list">${bubbles}</ul><div class="composer" aria-hidden="true"><span>${esc(
      c.tool.composer,
    )}</span><span class="caret"></span></div></div>`,
    `<div class="cmp-work"><div class="work-head">${monogram(32)}<h3 class="cmp-label"><span class="mono" aria-hidden="true">${esc(c.work.index)}</span>${esc(
      c.work.label,
    )}</h3></div><ul class="work-list" role="list">${items}</ul></div>`,
    `</div>`,
    `</div>`,
    `<div class="cmp-rail" aria-hidden="true"><span></span></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
