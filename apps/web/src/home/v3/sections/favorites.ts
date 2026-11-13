// S13, Library favorites (`section.fav`, #library): "58 skills and guides, sorted by who you are."
// (brief § 4, S13).
//
// The 58 is the Library's count (`ENTRIES.length`), as /library and the hero count it. Each favorite's
// name is its Library title and links to its page (brief § 4); the line under it is the mockup's.

import { esc } from '../../../ai101/render';
import { button } from '../../../kit/parts';
import { ENTRIES } from '../../../library/content';
import { FAVORITES } from '../content';
import { glyph, ringDot } from '../icons';

export function favorites(): string {
  const f = FAVORITES;
  const n = ENTRIES.length;
  const cols = f.columns
    .map((col) => {
      const items = col.items
        .map(([slug, text]) => {
          const e = ENTRIES.find((x) => x.href === `/${slug}`);
          if (!e?.href) throw new Error(`The Library has no live page for "${slug}"`);
          return `<li><a href="${esc(e.href)}" class="fav-item"><span class="fav-name">${esc(e.title)}${glyph('arrow', 16, 'fav-go')}</span><span class="fav-text">${esc(
            text,
          )}</span></a></li>`;
        })
        .join('');
      return `<div class="rv fav-col"><p class="mono fav-h">${esc(col.h)}</p><ul role="list">${items}</ul></div>`;
    })
    .join('');
  return [
    `<section id="library" class="sec fav" aria-labelledby="fav-title">`,
    `<div class="wrap">`,
    `<div class="fav-head"><div class="rv fav-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(f.eyebrow)}</span></p><h2 id="fav-title" class="h-section">${esc(
      f.title(n),
    )}</h2><p class="intro">${esc(f.intro)}</p></div><div class="rv fav-big" aria-hidden="true"><span class="fav-num"><span class="tnum">${n}</span></span></div></div>`,
    `<div class="fav-cols">${cols}</div>`,
    `<div class="rv fav-foot">${button(f.all(n), f.allHref, { variant: 'secondary', size: 'lg' })}</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
