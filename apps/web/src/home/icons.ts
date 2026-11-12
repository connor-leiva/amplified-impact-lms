// The homepage's drawings, ported from Connor's reference (its compiled bundle, not retyped by hand):
// the six role icons (a stroked figure plus the signal dot that lights up when its row is active),
// the four line glyphs, the ring-and-dot mark, the ripple and the "ai" monogram tile.
//
// Homepage-only: the reference draws its icons in the brand's two-tone style, which `ICONS` in
// @ai/core (the LMS's single-stroke set) has no equivalent for. Every one is decorative and
// `aria-hidden`; the words beside it carry the meaning. Colours come from CSS, never from here.

export type RoleIconName = 'analytics' | 'ai-employee' | 'checklist' | 'team-hub' | 'sessions' | 'video-lesson';

/** Each role icon: its stroked paths (1.75px, round), and its dot. */
const ROLE_ICONS: Readonly<
  Record<RoleIconName, { strokes: readonly string[]; dot: { cx: number; cy: number; r: number } }>
> = {
  analytics: {
    strokes: ['M4.5 19.4L4.5 14.4M9.5 19.4L9.5 11.4M14.5 19.4L14.5 8.4'],
    dot: { cx: 19.5, cy: 4.9, r: 2.1 },
  },
  'ai-employee': {
    strokes: [
      'M6.5 9.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z',
      'M3.5 20C3.5 16.4 6.4 13.75 10 13.75C13.6 13.75 16.5 16.4 16.5 20M15.4 4.6C15.778 4.281 16.2 4.041 16.663 3.872C17.128 3.703 17.606 3.616 18.1 3.616C18.594 3.616 19.072 3.703 19.538 3.872C20 4.041 20.422 4.281 20.8 4.6',
    ],
    dot: { cx: 18.1, cy: 7.9, r: 1.9 },
  },
  checklist: {
    strokes: ['M11 6.4L20 6.4M11 11.4L20 11.4M11 16.4L20 16.4M3.75 6.4L5.35 8L8.25 4.9M3.75 11.4L5.35 13L8.25 9.9'],
    dot: { cx: 6, cy: 16.4, r: 2.1 },
  },
  'team-hub': {
    strokes: [
      'M5.75 8.5a3.25 3.25 0 1 0 6.5 0a3.25 3.25 0 1 0 -6.5 0Z',
      'M3.5 19.5C3.5 16.3 5.9 14 9 14C12.1 14 14.5 16.3 14.5 19.5M15.5 14.4C18.1 14.8 20 16.8 20 19.5',
    ],
    dot: { cx: 16.75, cy: 8.75, r: 2.2 },
  },
  sessions: {
    strokes: [
      'M6 5.5L18 5.5C18.266 5.5 18.522 5.55 18.766 5.653C19.009 5.753 19.228 5.897 19.416 6.084C19.603 6.272 19.747 6.491 19.847 6.734C19.95 6.978 20 7.234 20 7.5L20 18C20 18.266 19.95 18.522 19.847 18.766C19.747 19.009 19.603 19.228 19.416 19.416C19.228 19.603 19.009 19.747 18.766 19.847C18.522 19.95 18.266 20 18 20L6 20C5.734 20 5.478 19.95 5.234 19.847C4.991 19.747 4.772 19.603 4.584 19.416C4.397 19.228 4.253 19.009 4.153 18.766C4.05 18.522 4 18.266 4 18L4 7.5C4 7.234 4.05 6.978 4.153 6.734C4.253 6.491 4.397 6.272 4.584 6.084C4.772 5.897 4.991 5.753 5.234 5.653C5.478 5.55 5.734 5.5 6 5.5Z',
      'M4 10L20 10M8.5 3.5L8.5 7.5M15.5 3.5L15.5 7.5',
    ],
    dot: { cx: 15.5, cy: 15, r: 2 },
  },
  'video-lesson': {
    strokes: [
      'M5.5 5.4L14 5.4C14.331 5.4 14.65 5.463 14.956 5.591C15.263 5.716 15.534 5.897 15.769 6.131C16.003 6.366 16.184 6.638 16.309 6.944C16.438 7.25 16.5 7.569 16.5 7.9L16.5 14.9C16.5 15.231 16.438 15.55 16.309 15.856C16.184 16.163 16.003 16.434 15.769 16.669C15.534 16.903 15.263 17.084 14.956 17.209C14.65 17.338 14.331 17.4 14 17.4L5.5 17.4C5.169 17.4 4.85 17.338 4.544 17.209C4.238 17.084 3.966 16.903 3.731 16.669C3.497 16.434 3.316 16.163 3.191 15.856C3.063 15.55 3 15.231 3 14.9L3 7.9C3 7.569 3.063 7.25 3.191 6.944C3.316 6.638 3.497 6.366 3.731 6.131C3.966 5.897 4.238 5.716 4.544 5.591C4.85 5.463 5.169 5.4 5.5 5.4Z',
      'M16.5 9.9L21 7.4L21 15.4L16.5 12.9',
    ],
    dot: { cx: 7.5, cy: 9.65, r: 1.9 },
  },
};

const svgOpen = (cls: string, size: number, viewBox = '0 0 24 24') =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" aria-hidden="true" focusable="false">`;

/** A role icon. Its dot is drawn in the signal colour while the row is active (CSS: `.is-on`, `.is-active`). */
export function roleIcon(name: RoleIconName, size = 24): string {
  const icon = ROLE_ICONS[name];
  const strokes = icon.strokes.map((d) => `<path class="ic-line" d="${d}"/>`).join('');
  const { cx, cy, r } = icon.dot;
  return `${svgOpen('ic', size)}${strokes}<circle class="ic-dot" cx="${cx}" cy="${cy}" r="${r}"/></svg>`;
}

/** The four line glyphs: 24 by 24, stroked 1.75px, round. */
const GLYPHS = {
  arrow: 'M5 12h13M13 7l5 5-5 5',
  check: 'M5 12.5l4.2 4.2L19 7.5',
} as const;
export type GlyphName = keyof typeof GLYPHS;

export const glyph = (name: GlyphName, size = 18, cls = ''): string =>
  `${svgOpen(`gl${cls ? ` ${cls}` : ''}`, size)}<path d="${GLYPHS[name]}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The ring and dot: the brand's mark of a live signal. */
export const ringDot = (size = 16): string =>
  `${svgOpen('ringdot', size, '0 0 22 22')}<circle class="rd-ring" cx="11" cy="11" r="9.5"/><circle class="rd-dot" cx="11" cy="11" r="4"/></svg>`;

/** The ripple's six rings, from the centre out. */
const RIPPLE = [70, 120, 175, 235, 300, 370] as const;

/**
 * The ripple behind the hero, the comparison and AI 101. `quiet` drops the two inner rings and the
 * centre; `intro` plays its arrival once (CSS, and never under reduced motion).
 */
export function ripple(size: number, { quiet = false, intro = false } = {}): string {
  const rings = RIPPLE.map((r, i) =>
    quiet && i < 2 ? '' : `<circle class="rp-ring rp-ring-${i + 1}" cx="380" cy="380" r="${r}" style="--i:${i}"/>`,
  ).join('');
  const centre = quiet
    ? ''
    : '<circle class="rp-center" cx="380" cy="380" r="24"/><circle class="rp-dot" cx="380" cy="380" r="9"/>';
  return `<svg class="rp${quiet ? ' rp-quiet' : ''}${intro ? ' rp-intro' : ''}" width="${size}" height="${size}" viewBox="0 0 760 760" aria-hidden="true" focusable="false">${rings}${centre}</svg>`;
}

/** The "ai" monogram on its forest tile, beside "AI that does real work". */
export const monogram = (size = 32): string =>
  `${svgOpen('mg', size, '0 0 64 64')}<rect class="mg-ground" width="64" height="64" rx="14"/><path class="mg-letters" d="M21.7 38.5Q21.7 36.4 23 35.3Q24.3 34.1 26.9 33.6L32.3 32.5Q32.3 30.8 31.5 30Q30.7 29.1 29.2 29.1Q26.5 29.1 25.9 31.6L22 31.4Q22.5 28.9 24.3 27.5Q26.2 26.1 29.2 26.1Q32.6 26.1 34.3 27.8Q36.1 29.6 36.1 32.8V38.6Q36.1 39.2 36.3 39.5Q36.5 39.7 37 39.7H37.5V42.5Q37 42.6 36.1 42.6Q34.7 42.6 33.9 42Q33 41.4 32.8 40Q32.2 41.3 30.7 42.1Q29.3 42.9 27.3 42.9Q24.8 42.9 23.2 41.7Q21.7 40.5 21.7 38.5ZM32.3 36V35.1L28.1 36Q26.9 36.2 26.3 36.7Q25.7 37.3 25.7 38.1Q25.7 39 26.3 39.6Q26.9 40.1 28.1 40.1Q30 40.1 31.1 39Q32.3 37.9 32.3 36ZM39 26.5H42.9V42.5H39Z"/><circle class="mg-ring" cx="40.22" cy="15.4" r="4.6" stroke-width="1.8"/><circle class="mg-dot" cx="40.22" cy="15.4" r="2.6"/></svg>`;
