// S2 (`section.vid`, following the page's theme): "Watch it run in a real business." (brief § 4, S2).
//
// The frame plays Connor's morning task sync (`VIDEO`): a native player, controls on, inline on a
// phone, and only the metadata fetched until someone presses play. It does not autoplay. The poster
// is a frame of that recording. The caption under the frame is copy.md's.

import { esc } from '../../../ai101/render';
import { VIDEO } from '../content';

export function video(): string {
  const s = VIDEO;
  return [
    `<section class="sec vid" aria-labelledby="vid-title" data-v3-enter>`,
    `<div class="wrap">`,
    `<div class="rv vid-head"><h2 id="vid-title" class="h-sub vid-title">${esc(s.title)}</h2></div>`,
    `<figure class="vid-frame">`,
    `<video controls playsinline preload="metadata" poster="${esc(s.poster)}" width="${s.width}" height="${s.height}" aria-label="${esc(s.label)}">`,
    `<source src="${esc(s.src)}" type="video/mp4">`,
    `</video>`,
    `</figure>`,
    `<p class="vid-caption">${esc(s.caption)}</p>`,
    `</div>`,
    `</section>`,
  ].join('');
}
