// S8, "In Spring’s words" (`section.qt`): her quote, word by word, with four steps under it (brief § 4,
// S8; § 5).
//
// SPRING APPROVED IT (Connor's D2, cleared 4:41 PM MT Nov 12): her words, the steps that repeat her 95%
// and 38%, and the line under them, "26 of 29 are in the Library", all render in production.
//
// SETTLED IN THE MARKUP: every word in full ink and every step on (no `--p`: the stylesheet reads it as
// 1), which is what a phone, reduced motion or no script shows (brief § 5: "all words full ink"). On a
// wide screen with motion allowed, the words light up one by one as the section scrolls through, the
// 95% and 38% get marked as they light, and each step comes on when the highlight reaches its word
// (`client/proof.ts`). A word not lit yet is in the quieter ink, never faded: it stays AA.
//
// The photo is Spring's real headshot, the live homepage's own (`PHOTOS.spring`), in place of the
// mockup's "SB" initials, as Connor decided for the founders (D6: real headshots, no initials).
// It is decorative: her name is beside it.
//
// The light band the mockup draws is `.inverse`, so it swaps with the page's theme (D8).

import { esc } from '../../../ai101/render';
import { button } from '../../../kit/parts';
import { PHOTOS } from '../../content';
import { chartCounts, QUOTE } from '../content';

/** The quote's words, in order, as the highlight counts them. */
export const quoteWords = (): string[] => QUOTE.text.split(' ');

/** Where in the highlight (0 to 1) a step comes on: just after its word in the quote lights. */
export function stopAt(word: string): number {
  const words = quoteWords();
  const i = words.indexOf(word);
  if (i < 0) throw new Error(`"${word}" is not in Spring's quote`);
  return (i + 1) / words.length;
}

const QUOTE_MARK =
  '<svg class="qt-mark" viewBox="0 0 112 96" aria-hidden="true" focusable="false"><path d="M10 70C10 42 22 22 46 10l3 6C34 26 28 38 29 50A20 20 0 1 1 10 70Z"/><path d="M62 70C62 42 74 22 98 10l3 6C86 26 80 38 81 50A20 20 0 1 1 62 70Z"/></svg>';

export function quote(): string {
  const q = QUOTE;
  const words = quoteWords();
  const keys: readonly string[] = q.keys;
  const text = words.map((w, i) => `<span class="qt-w${keys.includes(w) ? ' is-key' : ''}" style="--i:${i}">${esc(w)}</span>`).join(' ');
  const ats = q.stops.map((s) => stopAt(s.at));
  const stops = q.stops
    .map(
      (s, i) =>
        `<li class="qt-stop" style="--at:${ats[i]!.toFixed(4)}"><span class="qt-dot" aria-hidden="true"><i></i></span><span class="mono qt-step">${String(
          i + 1,
        ).padStart(2, '0')}</span><span class="qt-k">${esc(s.k)}</span><span class="qt-t">${esc(s.t)}</span></li>`,
    )
    .join('');
  const counts = chartCounts();
  const photo = PHOTOS.spring;
  return [
    `<section class="sec qt inverse" aria-labelledby="qt-title" style="--n:${words.length};--a0:${ats[0]!.toFixed(4)};--a1:${ats.at(-1)!.toFixed(4)}" data-qt>`,
    `<h2 id="qt-title" class="sr-only">${esc(q.heading)}</h2>`,
    `<div class="wrap">`,
    `<figure class="qt-fig">${QUOTE_MARK}<blockquote class="qt-text"><p>${text}</p></blockquote>`,
    `<figcaption class="qt-by"><span class="qt-face" aria-hidden="true"><img src="${esc(photo.src)}" alt="" width="56" height="56" loading="lazy" decoding="async"></span><span class="qt-who"><span class="qt-name">${esc(
      q.name,
    )}</span><span class="qt-role">${esc(q.role)}</span></span></figcaption>`,
    `</figure>`,
    `<ol class="qt-path" aria-label="${esc(q.pathLabel)}">${stops}</ol>`,
    `<div class="qt-foot"><p class="qt-foot-t">${esc(q.foot)}</p><div class="qt-foot-a"><span class="mono qt-foot-k">${esc(
      q.inLibrary(counts.inLibrary, counts.skills),
    )}</span>${button(q.library.label, q.library.href, { variant: 'link' })}</div></div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
