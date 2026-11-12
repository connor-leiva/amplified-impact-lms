// The proof: the live homepage's strip, "Built inside The Utah Life Real Estate Group" and "100 agents,
// 700+ homes a year", drawn as the reference's section (the figures count up as they come into view;
// never under reduced motion), and the Library's skills drifting past underneath.
//
// The words are `HOME.proof`'s, split for the layout and never rewritten: a build error if they stop
// fitting the pattern. The skills are the Library section's own, by their Library card titles. The
// marquee has a Pause control (WCAG 2.2.2), a checkbox, so it works with no script.

import { HOME } from '../content';
import { ringDot } from '../icons';
import { entryFor } from '../library-data';
import { esc, eyebrow } from '../parts';

/** "Built inside The Utah Life Real Estate Group" → "Built inside", "The Utah Life Real Estate Group". */
export function splitProof(): { lead: string; name: string; stats: { value: number; plus: boolean; label: string }[] } {
  const where = /^(Built inside) (.+)$/.exec(HOME.proof.label);
  const fig = /^(\d+) (agents), (\d+)(\+) (homes a year)$/.exec(HOME.proof.figure);
  if (!where || !fig)
    throw new Error(
      `HOME.proof no longer reads "Built inside …" / "N agents, N+ homes a year". Fix src/home/sections/proof.ts.`,
    );
  return {
    lead: where[1]!,
    name: where[2]!,
    stats: [
      { value: Number(fig[1]), plus: false, label: fig[2]! },
      { value: Number(fig[3]), plus: fig[4] === '+', label: fig[5]! },
    ],
  };
}

/** The one word the page adds to the live site's: the marquee's pause control. Listed for Spring's review. */
export const PAUSE = 'Pause';

export function proof(): string {
  const p = splitProof();
  const stats = p.stats
    .map(
      (s, i) =>
        // The figure is drawn for the eye and counts up; a screen reader reads the settled one beside it.
        `<p class="proof-stat rv" style="--d:${(i + 1) * 90}ms"><span class="proof-num" aria-hidden="true"><span class="tnum" data-count="${s.value}">${s.value.toLocaleString(
          'en-US',
        )}</span>${s.plus ? '+' : ''}</span><span class="proof-label"><span class="sr-only">${s.value.toLocaleString('en-US')}${
          s.plus ? '+' : ''
        } </span>${esc(s.label)}</span></p>`,
    )
    .join('');
  const names = HOME.library.rows.flatMap((r) => r.slugs.map((slug) => entryFor(slug).title));
  const set = names.map((n) => `<span class="mq-item">${ringDot(12)}${esc(n)}</span>`).join('');
  return [
    `<section class="sec proof" aria-label="${esc(HOME.proof.label)}">`,
    `<div class="wrap proof-grid">`,
    `<div class="proof-where rv">${eyebrow(p.lead, { mark: true })}<p class="proof-name">${esc(p.name)}</p></div>`,
    stats,
    `</div>`,
    `<div class="mq-band">`,
    `<div class="mq" role="region" aria-label="${esc(HOME.library.heading)}"><div class="mq-track"><div class="mono mq-set">${set}</div><div class="mono mq-set" aria-hidden="true">${set}</div></div></div>`,
    `<div class="wrap mq-controls"><label class="mq-pause"><input type="checkbox" /><span class="mq-pause-icon" aria-hidden="true"></span><span>${esc(PAUSE)}</span></label></div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
