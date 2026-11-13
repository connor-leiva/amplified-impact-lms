// S14, the founders (`section.fd`, #founders): "Built by people who run real estate, not people who
// read about it." (brief § 4, S14).
//
// THEIR REAL PHOTOS, NEVER INITIALS (Connor's D6, and the rule: real photos only): the live homepage's
// own (`PHOTOS`), where the mockup draws "CL" and "SB". Their words are the mockup's (D6), Spring's 38%
// included (D3: cleared). The Venn ("Spring + Connor = Every skill") is drawn once, settled in the
// markup (`is-in`); on a wide screen with motion allowed, one arriving from below draws itself.

import { esc } from '../../../ai101/render';
import { button } from '../../../kit/parts';
import { PHOTOS } from '../../content';
import { FOUNDERS } from '../content';
import { ringDot } from '../icons';

const VENN =
  '<svg class="vn-svg" viewBox="0 0 600 340" aria-hidden="true" focusable="false"><defs><clipPath id="vn-clip"><circle cx="210" cy="170" r="150"/></clipPath></defs><circle class="vn-overlap" cx="390" cy="170" r="150" clip-path="url(#vn-clip)"/><circle class="vn-c vn-a" cx="210" cy="170" r="150" pathLength="1"/><circle class="vn-c vn-b" cx="390" cy="170" r="150" pathLength="1"/></svg>';

export function founders(): string {
  const f = FOUNDERS;
  const cards = f.people
    .map((p, i) => {
      const photo = PHOTOS[p.photo];
      const id = `fd-${p.photo}`;
      return [
        `<article class="rv fd-card" aria-labelledby="${id}" style="--d:${i * 120}ms">`,
        `<div class="portrait fd-portrait"><img class="portrait-img" src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="${photo.width}" height="${
          photo.height
        }" loading="lazy" decoding="async"></div>`,
        `<div class="fd-body"><p class="mono fd-role">${esc(p.role)}</p><h3 id="${id}" class="fd-name">${esc(p.name)}</h3><p class="fd-tag">${esc(
          p.tag,
        )}</p><p class="fd-bio">${esc(p.bio)}</p><ul class="fd-tags" role="list">${p.facts.map((t) => `<li class="mono">${esc(t)}</li>`).join('')}</ul></div>`,
        `</article>`,
      ].join('');
    })
    .join('');
  const v = f.venn;
  return [
    `<section id="founders" class="sec fd" aria-labelledby="fd-title">`,
    `<div class="wrap">`,
    `<div class="fd-head"><div class="rv fd-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(f.eyebrow)}</span></p><h2 id="fd-title" class="h-section">${esc(
      f.title,
    )}</h2></div><p class="rv intro">${esc(f.intro)}</p></div>`,
    `<div class="fd-grid">${cards}</div>`,
    `<div class="vn is-in" data-vn>`,
    `<div class="vn-art" aria-hidden="true">${VENN}<span class="vn-l vn-l-a"><span class="vn-l-n">${esc(v.a.n)}</span><span class="vn-l-t">${esc(
      v.a.t,
    )}</span></span><span class="vn-l vn-l-mid">${ringDot(18)}<span class="vn-l-n">${esc(v.mid)}</span></span><span class="vn-l vn-l-b"><span class="vn-l-n">${esc(
      v.b.n,
    )}</span><span class="vn-l-t">${esc(v.b.t)}</span></span></div>`,
    `<div class="vn-copy"><p class="vn-title">${esc(f.vennTitle)}</p><p class="vn-text">${esc(f.vennText)}</p></div>`,
    `</div>`,
    `<div class="rv fd-foot">${button(f.more.label, f.more.href, { variant: 'link' })}</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
