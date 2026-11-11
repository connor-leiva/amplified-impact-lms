// "Built inside The Utah Life Real Estate Group": the two figures, which count up once as they come
// into view (the script; never under reduced motion), and the skills drifting past underneath.

import { PAGE } from '../content';
import { ringDot } from '../icons';
import { esc, eyebrow } from '../parts';

export function proof(skillNames: readonly string[]): string {
  const p = PAGE.proof;
  const stats = p.stats
    .map(
      (s, i) =>
        // The figure is drawn for the eye and counts up; a screen reader reads the settled one beside it.
        `<p class="proof-stat rv" style="--d:${(i + 1) * 90}ms"><span class="proof-num" aria-hidden="true"><span class="tnum" data-count="${s.value}">${s.value.toLocaleString(
          'en-US',
        )}</span>${s.plus ? '+' : ''}</span><span class="proof-label"><span class="sr-only">${s.value.toLocaleString('en-US')}${s.plus ? '+' : ''} </span>${esc(s.label)}</span></p>`,
    )
    .join('');
  const set = skillNames.map((n) => `<span class="mq-item">${ringDot(12)}${esc(n)}</span>`).join('');
  return [
    `<section class="sec proof" aria-label="${esc(p.label)}">`,
    `<div class="wrap proof-grid">`,
    `<div class="proof-where rv">${eyebrow(p.eyebrow, { mark: true })}<p class="proof-name">${esc(p.name)}</p></div>`,
    stats,
    `</div>`,
    `<div class="mq" role="region" aria-label="${esc(p.marquee)}"><div class="mq-track"><div class="mono mq-set">${set}</div><div class="mono mq-set" aria-hidden="true">${set}</div></div></div>`,
    `</section>`,
  ].join('\n');
}
