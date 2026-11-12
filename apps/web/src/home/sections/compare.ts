// The shift: "Use AI as a tool, or run a business where AI does real work.", the live homepage's two
// columns in the reference's "two ways" drawing: the chat that starts from scratch beside the skill that
// runs the same steps. Every word is `HOME.shift`'s; the chat's input box is drawn with no words in it.
//
// On a wide screen with motion allowed, the script pins it (`is-pinned`) and scrolling plays it: the
// chat side greys out and the three checks fill in. Everywhere else (a phone, reduced motion, no
// script) it is the finished picture, stacked, with nothing sticky (`is-static`).

import { HOME } from '../content';
import { glyph, monogram, ripple } from '../icons';
import { esc, pad2 } from '../parts';

export function compare(): string {
  const s = HOME.shift;
  const bubbles = s.before.items.map((b) => `<li class="bubble">${esc(b)}</li>`).join('');
  const items = s.after.items
    .map(
      (t, i) =>
        `<li class="work-item" style="--wi:${i}"><span class="work-check" aria-hidden="true">${glyph('check', 14)}</span><span>${esc(t)}</span></li>`,
    )
    .join('');
  return [
    `<section class="sec cmp is-static" data-pin="compare" aria-labelledby="shift-title">`,
    `<div class="cmp-stick">`,
    `<div class="cmp-ripple" aria-hidden="true">${ripple(980)}</div>`,
    `<div class="wrap cmp-inner">`,
    `<div class="cmp-head"><h2 id="shift-title" class="h-section cmp-title">${esc(s.heading)}</h2></div>`,
    `<div class="cmp-grid">`,
    `<div class="cmp-tool"><h3 class="cmp-label"><span class="mono" aria-hidden="true">${pad2(1)}</span>${esc(
      s.before.title,
    )}</h3><ul class="bubbles" role="list">${bubbles}</ul><div class="composer" aria-hidden="true"><span class="caret"></span></div></div>`,
    `<div class="cmp-work"><div class="work-head">${monogram(32)}<h3 class="cmp-label"><span class="mono" aria-hidden="true">${pad2(2)}</span>${esc(
      s.after.title,
    )}</h3></div><ul class="work-list" role="list">${items}</ul></div>`,
    `</div>`,
    `</div>`,
    `<div class="cmp-rail" aria-hidden="true"><span></span></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
