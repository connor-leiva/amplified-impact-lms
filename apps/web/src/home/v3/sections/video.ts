// S2 (`section.vid`, following the page's theme): "Watch it run in a real business." (brief § 4, S2).
//
// A STILL, NOT A VIDEO (Connor, Nov 12, C9): the mockup's video placeholder is gone, and a real photo
// takes its place. Connor is choosing which one, so the section waits on `video-still`: a preview shows
// the heading, an empty photo slot (itself marked, as Connor asked) and the caption; the production
// render leaves the whole section out, as it did for the video. The slot never holds a stock or AI
// image: when the photo is chosen it becomes an <img> of it, from `/img/`, with its size and alt text.

import { esc } from '../../../ai101/render';
import { STILL } from '../content';
import { MARKER, pending } from '../pending';

export function video(): string {
  const s = STILL;
  return pending(
    'video-still',
    [
      `<section class="sec vid" aria-labelledby="vid-title" data-v3-enter>`,
      `<div class="wrap">`,
      `<div class="rv vid-head"><h2 id="vid-title" class="h-sub vid-title">${esc(s.title)}</h2></div>`,
      `<figure class="vid-frame vid-still" ${MARKER}="video-still">`,
      `<div class="vid-slot" role="img" aria-label="${esc(s.slotLabel)}"><span class="mono vid-slot-k">${esc(s.slot)}</span></div>`,
      `</figure>`,
      `<p class="vid-caption">${esc(s.caption)}</p>`,
      `</div>`,
      `</section>`,
    ].join(''),
  );
}
