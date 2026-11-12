// The small pieces every homepage section is built from, as strings: the eyebrow, the buttons and the
// split headline. Every string from content goes through `esc()`.

import { esc } from '../ai101/render';
import { ringDot } from './icons';

export { esc };

/**
 * The mono label over a section's heading; `mark` puts the ring and dot before it and quiets its colour.
 * `logo` puts a program's logo there instead (an SVG string from `programLogo()`), at full ink.
 */
export const eyebrow = (text: string, { mark = false, cls = '', logo = '' } = {}): string =>
  `<p class="eb${mark ? ' eb-mark' : ''}${cls ? ` ${cls}` : ''}">${logo ? `<span class="eb-logo">${logo}</span>` : mark ? ringDot(22) : ''}<span>${esc(text)}</span></p>`;

export type CtaVariant = 'primary' | 'secondary' | 'link';

/**
 * A link styled as the reference's buttons: `primary` (filled), `secondary` (outlined) or `link`
 * (underlined text). `cta-*` and not the site's `btn-*`, so the shared header's own button keeps its
 * rules and the two can't collide. With no `href` it is an `<a>` with no address, which is not a link
 * at all: the buy buttons wait like that until /api/offer gives them one.
 */
export function cta(
  label: string,
  href: string | null,
  { variant = 'primary' as CtaVariant, cls = '', attrs = '' } = {},
): string {
  const classes = `cta cta-${variant}${cls ? ` ${cls}` : ''}`;
  return `<a class="${classes}"${href === null ? '' : ` href="${esc(href)}"`}${attrs ? ` ${attrs}` : ''}>${esc(label)}</a>`;
}

/** A headline line split into words, so each can rise into place on load (CSS; not under reduced motion). */
export function words(text: string, start = 0): string {
  return text
    .split(' ')
    .map((word, i) => `<span class="w"><span style="--wi:${start + i}">${esc(word)}</span></span>`)
    .join(' ');
}

/** "01", "02": the mono indexes beside list rows. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
