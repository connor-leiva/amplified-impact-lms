// Meet Spring and Connor: the live homepage's section (`HOME.meet`), their real headshots (`PHOTOS`,
// the files the live site serves) and their bios, and the link to their story. On the bone ground.
// Real photos only (the overnight brief): no other image is on the page.

import { photoTag } from '../../site/people';
import { HOME, PHOTOS } from '../content';
import { cta, esc } from '../parts';

export function meet(): string {
  const m = HOME.meet;
  const people = m.people
    .map(
      (p) =>
        `<li class="person">${photoTag(PHOTOS[p.photo], 'person-photo')}<div class="person-text"><h3 class="person-name">${esc(
          p.name,
        )}</h3><p class="person-role">${esc(p.role)}</p><p class="person-body">${esc(p.body)}</p></div></li>`,
    )
    .join('');
  return [
    `<section class="sec meet" data-theme="light" aria-labelledby="meet-title">`,
    `<div class="wrap">`,
    `<div class="meet-head rv"><h2 id="meet-title" class="h-section">${esc(m.heading)}</h2></div>`,
    `<ul class="people rv" role="list">${people}</ul>`,
    `<p class="meet-more">${cta(m.more.label, m.more.href, { variant: 'link' })}</p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
