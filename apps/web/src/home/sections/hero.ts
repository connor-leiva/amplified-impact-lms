// The hero: the live homepage's headline, lede and two buttons, and Spring and Connor in their own
// photos, named. Every word is `HOME.hero`'s; the look is Connor's reference (the big Geist headline
// rising into place, the ripple behind it).

import { photoTag } from '../../site/people';
import { HOME, PHOTOS } from '../content';
import { ripple } from '../icons';
import { cta, esc, words } from '../parts';

export function hero(): string {
  const h = HOME.hero;
  const person = (p: (typeof PHOTOS)[keyof typeof PHOTOS]) =>
    `<figure class="hero-person">${photoTag(p, 'hero-photo', true)}<figcaption>${esc(p.alt)}</figcaption></figure>`;
  return [
    `<section class="sec hero" aria-labelledby="hero-title" data-scroll="exit">`,
    `<div class="hero-ripple" aria-hidden="true">${ripple(1040, { intro: true })}</div>`,
    `<div class="wrap hero-grid">`,
    `<div class="hero-copy">`,
    `<h1 id="hero-title" class="hero-title">${words(h.title)}</h1>`,
    `<p class="lead hero-lead">${esc(h.lede)}</p>`,
    `<div class="actions hero-actions">${cta(h.primary.label, h.primary.href, { cls: 'cta-lg' })}${cta(
      h.secondary.label,
      h.secondary.href,
      {
        variant: 'link',
      },
    )}</div>`,
    `</div>`,
    `<div class="hero-photos">${person(PHOTOS.spring)}${person(PHOTOS.connor)}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
