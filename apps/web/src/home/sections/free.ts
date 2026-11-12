// Free resources: the live homepage's section (`HOME.free`), for agents and for team owners, each
// resource named and described by its own Library card, in the reference's numbered-list drawing.

import { HOME } from '../content';
import { ripple } from '../icons';
import { entryFor } from '../library-data';
import { cta, esc } from '../parts';

export function free(): string {
  const f = HOME.free;
  const groups = f.columns
    .map((c) => {
      const items = c.slugs
        .map((slug) => {
          const e = entryFor(slug);
          return `<li class="part"><a class="part-title" href="${esc(e.href!)}">${esc(e.title)}</a><span class="part-text">${esc(e.description)}</span></li>`;
        })
        .join('');
      return `<div class="part-group"><h3 class="part-head">${esc(c.heading)}</h3><ul class="parts" role="list">${items}</ul></div>`;
    })
    .join('');
  return [
    `<section class="sec start free" aria-labelledby="free-title">`,
    `<div class="start-ripple" aria-hidden="true">${ripple(1180, { quiet: true })}</div>`,
    `<div class="wrap start-grid">`,
    `<div class="start-copy rv"><h2 id="free-title" class="start-title">${esc(f.heading)}</h2><p class="lead">${esc(f.lede)}</p><div class="actions">${cta(
      f.all.label,
      f.all.href,
      { variant: 'link' },
    )}</div></div>`,
    `<div class="part-groups rv" style="--d:140ms">${groups}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
