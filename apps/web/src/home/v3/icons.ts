// The drawings v3 repeats, drawn once (brief § 8: the ring and dot appears about 66 times, the check
// 37 and the arrow 25; one copy each, with a <use> per place, saves about 45 KB of markup).
//
// `sprite()` goes once at the top of <body>; `ringDot()` and `glyph()` point at it. The artwork is the
// kit's, unchanged: the ring and dot from `../icons.ts` (its `.rd-ring` / `.rd-dot` colours), the glyphs
// from the kit's `GLYPHS`. A <use> copy can't be reached by the page's class selectors, so each
// symbol takes its colours from custom properties and `currentColor`, which a <use> copy does inherit:
// the result is the same colours the kit's stylesheet gives the inline drawings.
//
// Every drawing is decorative and `aria-hidden`: the words beside it carry the meaning.

import { GLYPHS } from '../../kit/icons';

const stroke = (d: string) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`;

const SYMBOLS = {
  ringdot:
    '<symbol id="v3-ringdot" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.5" style="fill:none;stroke:var(--signal);stroke-width:1.5"/><circle cx="11" cy="11" r="4" style="fill:var(--signal)"/></symbol>',
  check: `<symbol id="v3-check" viewBox="0 0 24 24">${stroke(GLYPHS.check)}</symbol>`,
  arrow: `<symbol id="v3-arrow" viewBox="0 0 24 24">${stroke(GLYPHS.arrow)}</symbol>`,
} as const;

export type V3Icon = keyof typeof SYMBOLS;

/** Every symbol, once, in an <svg> that takes no room and says nothing. */
export const sprite = (): string =>
  `<svg class="v3-sprite" width="0" height="0" aria-hidden="true" focusable="false">${Object.values(SYMBOLS).join('')}</svg>`;

const use = (name: V3Icon, cls: string, size: number, viewBox: string) =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" aria-hidden="true" focusable="false"><use href="#v3-${name}"/></svg>`;

/** The ring and dot, as the kit's `ringDot()` draws it. */
export const ringDot = (size = 16): string => use('ringdot', 'ringdot', size, '0 0 22 22');

/** An interface glyph, as the kit's `glyph()` draws it (classes `gl` and `cls`). */
export const glyph = (name: Exclude<V3Icon, 'ringdot'>, size = 18, cls = ''): string =>
  use(name, `gl${cls ? ` ${cls}` : ''}`, size, '0 0 24 24');
