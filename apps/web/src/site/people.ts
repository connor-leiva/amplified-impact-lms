// Spring and Connor, as the www pages introduce them (DECISIONS.md D-107, shared in D-112): their own
// photos and their short bios, from the homepage's words (`HOME.meet`, `PHOTOS`), so Home, the sales
// pages and /about cannot describe them two ways. Real photos only (the overnight brief).

import { esc } from '../ai101/render';
import { HOME, PHOTOS } from '../home/content';

export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/** A photo with its size, so the page does not jump while it loads. Lazy unless it is above the fold. */
export const photoTag = (p: Photo, cls: string, eager = false): string =>
  `<img class="${cls}" src="${esc(p.src)}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} />`;

/** "Meet Spring and Connor": a card each, and the link to their full story. */
export function meetSection(): string {
  const m = HOME.meet;
  const cards = m.people
    .map(
      (p) =>
        `<li class="card person-card">${photoTag(PHOTOS[p.photo], 'person-card-photo')}<div><h3>${esc(p.name)}</h3><p class="person-role">${esc(p.role)}</p><p>${esc(p.body)}</p></div></li>`,
    )
    .join('');
  return [
    `<section class="section meet" data-theme="light" aria-labelledby="meet-title">`,
    `<div class="wrap">`,
    `<h2 id="meet-title">${esc(m.heading)}</h2>`,
    `<ul class="people" role="list">${cards}</ul>`,
    `<p class="section-more"><a class="text-link" href="${esc(m.more.href)}">${esc(m.more.label)}</a></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
