// S2 (`section.vid`, following the page's theme): "Watch it run in a real business." (brief § 4, S2).
//
// NO VIDEO YET (Connor's D5): the mockup's video placeholder is gone. Until the 90-second screen
// recording is ready, Spring's real headshot sits in the video's 16:9 frame (Connor, 4:41 PM MT Nov 12),
// whole and never cropped, and the note under it says the recording is coming. The photo is the one
// /about and the founders use (`PHOTOS.spring`): never a stock or AI image.

import { esc } from '../../../ai101/render';
import { PHOTOS } from '../../content';
import { STILL } from '../content';

export function video(): string {
  const s = STILL;
  const photo = PHOTOS.spring;
  return [
    `<section class="sec vid" aria-labelledby="vid-title" data-v3-enter>`,
    `<div class="wrap">`,
    `<div class="rv vid-head"><h2 id="vid-title" class="h-sub vid-title">${esc(s.title)}</h2></div>`,
    `<figure class="vid-frame vid-still">`,
    `<img class="vid-photo" src="${esc(photo.src)}" alt="${esc(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">`,
    `</figure>`,
    `<p class="mono vid-note">${esc(s.note)}</p>`,
    `<p class="vid-caption">${esc(s.caption)}</p>`,
    `</div>`,
    `</section>`,
  ].join('');
}
