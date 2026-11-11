// The Library: its real count (the ghosted figure, the intro and "See All"), and four of its skills
// for each role, behind tabs. Every skill is a link to its page, named and tagged free by its own
// Library card (`../library/content.ts`), so this section can't drift from the Library.
//
// The tabs are the ARIA tabs pattern (arrow keys, Home, End) once the script runs. With no script the
// first role shows and "See All" still reaches every skill.

import { paid } from '../../library/render';
import { HREFS, PAGE } from '../content';
import { glyph, ringDot, roleIcon } from '../icons';
import { entryFor } from '../library-data';
import { cta, esc, eyebrow, pad2 } from '../parts';

export function library(count: number): string {
  const l = PAGE.library;
  const tabs = l.roles
    .map(
      (r, i) =>
        `<button type="button" role="tab" id="hp-tab-${r.id}" class="tab${i === 0 ? ' is-on' : ''}" aria-selected="${i === 0}" aria-controls="hp-panel-${r.id}" tabindex="${
          i === 0 ? 0 : -1
        }">${roleIcon(r.icon, 20)}<span>${esc(r.label)}</span></button>`,
    )
    .join('');
  const panels = l.roles
    .map((r, i) => {
      const skills = r.slugs
        .map((slug, j) => {
          const e = entryFor(slug);
          const tag = paid(e) ? '<span></span>' : `<span class="mono free-tag">${esc(l.free)}</span>`;
          return `<li style="--si:${j}"><a class="skill" href="${esc(e.href!)}"><span class="mono skill-idx" aria-hidden="true">${pad2(j + 1)}</span><span class="skill-name">${esc(
            e.title,
          )}</span>${tag}${glyph('arrow', 20, 'skill-arrow')}</a></li>`;
        })
        .join('');
      return `<div class="tabpanel" role="tabpanel" id="hp-panel-${r.id}" aria-labelledby="hp-tab-${r.id}"${i === 0 ? '' : ' hidden'}><p class="mono tp-count">${esc(
        l.count(r.slugs.length),
      )}</p><ul class="skill-list" role="list">${skills}</ul></div>`;
    })
    .join('');
  return [
    `<section id="library" class="sec skills" aria-labelledby="skills-title" data-scroll="through">`,
    `<div class="wrap skills-grid">`,
    `<div class="skills-intro rv">`,
    `<span class="big-num" aria-hidden="true">${count}</span>`,
    eyebrow(l.eyebrow, { mark: true }),
    `<h2 id="skills-title" class="h-section">${esc(l.heading)}</h2>`,
    `<p class="intro">${esc(l.intro(count))}</p>`,
    `<p class="note">${ringDot(18)}<span>${esc(l.note)}</span></p>`,
    cta(l.all(count), HREFS.library, { cls: 'cta-lg' }),
    `</div>`,
    `<div class="skills-browser rv" style="--d:120ms" data-tabs>`,
    `<div class="tabs" role="tablist" aria-label="${esc(l.tabs)}">${tabs}</div>`,
    panels,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
