// S2 (`section.vid`, following the page's theme): "Watch it run in a real business." (brief § 4, S2).
//
// The frame plays Connor's morning task sync (`VIDEO`). The heading and the caption under it are
// copy.md's, unchanged. Captions are burned into the picture, so there is no <track>.
//
// Without the script the browser's own controls play it (preload none, so nothing downloads until
// then). The script hides those, shows `.vid-chrome`, and plays it muted once the frame is on screen.
// The one new visible phrase is the sound pill, "Tap for sound".

import { esc } from '../../../ai101/render';
import { VIDEO } from '../content';

const stroke = (d: string) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;

const icon = (cls: string, body: string) =>
  `<svg class="vid-ic ${cls}" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

const PLAY = icon('vid-ic-play', '<path d="M8.6 6.7v10.6L18 12 8.6 6.7Z" fill="currentColor"/>');
const PAUSE = icon('vid-ic-pause', '<path d="M7 6h3.2v12H7zM13.8 6H17v12h-3.2z" fill="currentColor"/>');
const MUTE = icon(
  'vid-ic-mute',
  `${stroke('M4 10h3.2L12 6.2v11.6L7.2 14H4V10Z')}${stroke('M16.2 9.2l4.6 5.6M20.8 9.2l-4.6 5.6')}`,
);
const VOL = icon(
  'vid-ic-vol',
  `${stroke('M4 10h3.2L12 6.2v11.6L7.2 14H4V10Z')}${stroke('M15.2 9.4a3.6 3.6 0 0 1 0 5.2')}${stroke('M17.6 7.2a6.6 6.6 0 0 1 0 9.6')}`,
);
const ENTER = icon('vid-ic-enter', stroke('M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3'));
const EXIT = icon('vid-ic-exit', stroke('M10 5v4H6M14 5v4h4M10 19v-4H6M14 19v-4h4'));

/** Custom chrome, hidden until the script takes the controls off the video. */
function chrome(): string {
  return [
    `<div class="vid-chrome" hidden>`,
    `<div class="vid-scrim" aria-hidden="true"></div>`,
    `<button type="button" class="vid-btn vid-play vid-fade" aria-label="Play">${PLAY}${PAUSE}</button>`,
    `<button type="button" class="vid-btn vid-sound" aria-label="Tap for sound" aria-pressed="false">${MUTE}${VOL}<span class="vid-sound-label">Tap for sound</span></button>`,
    `<button type="button" class="vid-btn vid-full vid-fade" aria-label="Full screen" aria-pressed="false">${ENTER}${EXIT}</button>`,
    `<div class="vid-seek vid-fade" role="slider" tabindex="0" aria-label="Playback position" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 seconds">`,
    `<span class="vid-seek-track"><span class="vid-seek-fill"></span></span>`,
    `</div>`,
    `</div>`,
  ].join('');
}

export function video(): string {
  const s = VIDEO;
  return [
    `<section class="sec vid" aria-labelledby="vid-title" data-v3-enter>`,
    `<div class="wrap">`,
    `<div class="rv vid-head"><h2 id="vid-title" class="h-sub vid-title">${esc(s.title)}</h2></div>`,
    `</div>`,
    `<div class="vid-stage">`,
    `<figure class="vid-frame">`,
    `<video controls playsinline muted preload="none" poster="${esc(s.poster)}" width="${s.width}" height="${s.height}" aria-label="${esc(s.label)}">`,
    `<source src="${esc(s.src)}" type="video/mp4">`,
    `</video>`,
    chrome(),
    `</figure>`,
    `</div>`,
    `<div class="wrap">`,
    `<p class="vid-caption">${esc(s.caption)}</p>`,
    `</div>`,
    `</section>`,
  ].join('');
}
