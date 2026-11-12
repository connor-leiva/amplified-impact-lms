// The Library: the live homepage's section (`HOME.library`), its real count (the ghosted figure, the
// intro and "See All"), and the same four skills for each role, behind the reference's tabs. Every skill
// is a link to its page, named and tagged Free or Locked by its own Library card (`../library`), with
// the site's own tags, so this section can't drift from the Library.
//
// The tabs are the ARIA tabs pattern (arrow keys, Home, End) once the script runs. With no script the
// first role shows and "See All" still reaches every skill.

import { paid } from '../../library/render';
import { freeTag, lockTag } from '../../site/render';
import { HOME } from '../content';
import { glyph, roleIcon, type RoleIconName } from '../icons';
import { entryFor } from '../library-data';
import { cta, esc, pad2 } from '../parts';

/** Each role's drawing, in the live rows' order: buyers, listings, team owners, content. */
const ROLE_ICONS: readonly RoleIconName[] = ['sessions', 'analytics', 'team-hub', 'video-lesson'];

export function library(count: number): string {
  const l = HOME.library;
  const tabs = l.rows
    .map(
      (r, i) =>
        `<button type="button" role="tab" id="hp-tab-${i + 1}" class="tab${i === 0 ? ' is-on' : ''}" aria-selected="${i === 0}" aria-controls="hp-panel-${
          i + 1
        }" tabindex="${i === 0 ? 0 : -1}">${roleIcon(ROLE_ICONS[i] ?? 'sessions', 20)}<span>${esc(r.heading)}</span></button>`,
    )
    .join('');
  const panels = l.rows
    .map((r, i) => {
      const skills = r.slugs
        .map((slug, j) => {
          const e = entryFor(slug);
          const tag = paid(e) ? lockTag(l.locked) : freeTag(l.free);
          return `<li style="--si:${j}"><a class="skill" href="${esc(e.href!)}"><span class="mono skill-idx" aria-hidden="true">${pad2(j + 1)}</span><span class="skill-name">${esc(
            e.title,
          )}</span>${tag}${glyph('arrow', 20, 'skill-arrow')}</a></li>`;
        })
        .join('');
      return `<div class="tabpanel" role="tabpanel" id="hp-panel-${i + 1}" aria-labelledby="hp-tab-${i + 1}"${i === 0 ? '' : ' hidden'}><p class="tp-count">${esc(
        l.count(r.slugs.length),
      )}</p><ul class="skill-list" role="list">${skills}</ul></div>`;
    })
    .join('');
  return [
    `<section id="library" class="sec skills" aria-labelledby="library-title" data-scroll="through">`,
    `<div class="wrap skills-grid">`,
    `<div class="skills-intro rv">`,
    `<span class="big-num" aria-hidden="true">${count}</span>`,
    `<h2 id="library-title" class="h-section">${esc(l.heading)}</h2>`,
    `<p class="intro">${esc(l.body(count))}</p>`,
    cta(l.all(count), '/library', { cls: 'cta-lg' }),
    `</div>`,
    `<div class="skills-browser rv" style="--d:120ms" data-tabs>`,
    `<div class="tabs" role="tablist" aria-labelledby="library-title">${tabs}</div>`,
    panels,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
