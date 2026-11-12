// The kit's drawings, as strings: the brand icons (`./brand-icons.ts`, the mockup's set), the interface
// glyphs, the theme glyph, and the homepage's own ring and dot, ripple and monogram (imported, not
// copied: `../home/icons.ts` is the homepage's and stays as it is).
//
// Every drawing is decorative and `aria-hidden`: the words beside it carry the meaning. Colours come
// from the kit's stylesheet (`.ic-*`), never from here.

import { monogram, ringDot } from '../home/icons';
import { BRAND_ICONS, type BrandIconName, type BrandPath } from './brand-icons';

export { monogram, ringDot };
export type { BrandIconName };

/** The ripple's six rings, from the centre out (the homepage's and the mockup's). */
const RINGS = [70, 120, 175, 235, 300, 370] as const;

/**
 * The ripple, as the mockup's `Ripple`: `quiet` drops the two inner rings and the centre, `center: false`
 * keeps every ring and drops only the centre (the footer's), `intro` plays its arrival once (CSS, never
 * under reduced motion).
 */
export function ripple(size: number, { quiet = false, center = true, intro = false } = {}): string {
  const rings = RINGS.map((r, i) =>
    quiet && i < 2 ? '' : `<circle class="rp-ring rp-ring-${i + 1}" cx="380" cy="380" r="${r}" style="--i:${i}"/>`,
  ).join('');
  const centre =
    quiet || !center
      ? ''
      : '<circle class="rp-center" cx="380" cy="380" r="24"/><circle class="rp-dot" cx="380" cy="380" r="9"/>';
  return `<svg class="rp${quiet ? ' rp-quiet' : ''}${intro ? ' rp-intro' : ''}" width="${size}" height="${size}" viewBox="0 0 760 760" aria-hidden="true" focusable="false">${rings}${centre}</svg>`;
}

const open = (cls: string, size: number, viewBox = '0 0 24 24') =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" aria-hidden="true" focusable="false">`;

/** One path of a brand icon: ink, the signal dot, or the knockout, filled or stroked as the set says. */
function brandPath([d, fill, stroke, width]: BrandPath): string {
  const cls = [
    fill === 'i' ? 'ic-i' : fill === 'd' ? 'ic-d' : fill === 'k' ? 'ic-k' : '',
    stroke === 'i' ? 'ic-s' : stroke === 'k' ? 'ic-s ic-ks' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const noFill = fill === 0 ? ' fill="none"' : '';
  return `<path class="${cls}" d="${d}"${noFill}${stroke ? ` stroke-width="${width}"` : ''}/>`;
}

/** A brand icon at `size` (24 by 24 artwork). */
export const brandIcon = (name: BrandIconName, size = 24): string =>
  `${open('ic', size)}${(BRAND_ICONS[name] as readonly BrandPath[]).map(brandPath).join('')}</svg>`;

/** The interface glyphs, drawn to the icon rules: 24px grid, 1.75px stroke, round caps and joins. */
export const GLYPHS = {
  arrow: 'M5 12h13M13 7l5 5-5 5',
  out: 'M8 16L16 8M9.5 8H16v6.5',
  check: 'M5 12.5l4.2 4.2L19 7.5',
  dash: 'M7 12h10',
  menu: 'M4 9h16M4 15h16',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  chevron: 'M7 10l5 5 5-5',
  lock: 'M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11M6 11h12v9H6z',
} as const;
export type GlyphName = keyof typeof GLYPHS;

export const glyph = (name: GlyphName, size = 18, cls = ''): string =>
  `${open(`gl${cls ? ` ${cls}` : ''}`, size)}<path d="${GLYPHS[name]}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The theme switch's half-filled circle; it turns half a turn on the light theme (CSS). */
export const themeGlyph = (): string =>
  `${open('gl theme-gl', 20)}<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg>`;
