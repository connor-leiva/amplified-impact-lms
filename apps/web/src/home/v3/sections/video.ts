// S2, the video (`section.vid`, dark): "Watch it run in a real business." (brief § 4, S2).
//
// PENDING (`video`, conflict C9): no recording exists. The whole section is a preview-only placeholder,
// the mockup's: a drawn screen, a play button and an "SB / Spring on camera" bubble, every part of it
// decorative except the frame's own name, which says it is a placeholder. The production render
// leaves the section out (brief § 7). When the recording exists, this becomes a <video> with a poster.

import { esc } from '../../../ai101/render';
import { VIDEO } from '../content';
import { glyph } from '../icons';
import { pending } from '../pending';

const lines = (n: number) =>
  Array.from({ length: n }, (_, k) => `<span class="vid-item" style="--k:${k}"><i></i><span class="vid-ln"></span></span>`).join('');

const BARS = [0.5, 0.8, 0.62, 0.95, 0.74] as const;

export function video(): string {
  const v = VIDEO;
  return pending(
    'video',
    [
      `<section class="sec vid" aria-labelledby="vid-title" data-v3-enter>`,
      `<div class="wrap">`,
      `<div class="rv vid-head"><h2 id="vid-title" class="h-sub vid-title">${esc(v.title)}</h2><p class="mono vid-meta">${esc(v.meta)}</p></div>`,
      `<div class="vid-frame"><div class="vid-ph" role="img" aria-label="${esc(v.placeholderLabel)}">`,
      `<div class="vid-chrome" aria-hidden="true"><span></span><span></span><span></span><span class="mono vid-clock">${esc(v.clock)}</span></div>`,
      `<div class="vid-screen" aria-hidden="true"><div class="vid-doc"><span class="vid-doc-k mono">${esc(
        v.doc,
      )}</span><span class="vid-ln vid-ln-h"></span>${lines(3)}<span class="vid-ln vid-ln-s"></span><span class="vid-ln vid-ln-m"></span></div>`,
      `<div class="vid-side"><span class="vid-ln"></span><span class="vid-ln vid-ln-s"></span><span class="vid-bars">${BARS.map(
        (h, k) => `<i style="--v:${h};--k:${k}"></i>`,
      ).join('')}</span></div></div>`,
      `<span class="vid-play" aria-hidden="true">${glyph('play', 30)}</span>`,
      `<span class="mono vid-ph-label" aria-hidden="true">${esc(v.placeholder)}</span>`,
      `<div class="vid-cam" aria-hidden="true"><span class="vid-cam-ring"></span><span class="vid-cam-ring vid-cam-ring-2"></span><span class="vid-cam-face"><span class="vid-cam-initials">${esc(
        v.camInitials,
      )}</span></span><span class="mono vid-cam-label">${esc(v.camLabel)}</span></div>`,
      `</div></div>`,
      `<p class="vid-caption">${esc(v.caption)}</p>`,
      `</div>`,
      `</section>`,
    ].join(''),
  );
}
