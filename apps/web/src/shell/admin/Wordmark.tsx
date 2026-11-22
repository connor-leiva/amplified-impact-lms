import lockup from '../../assets/brand/amplified-impact-wordmark.svg?raw';
import lockupReversed from '../../assets/brand/amplified-impact-wordmark-reversed.svg?raw';
import academy from '../../assets/brand/amplified-impact-academy-app.svg?raw';
import academyReversed from '../../assets/brand/amplified-impact-academy-app-reversed.svg?raw';
import s from './AdminShell.module.css';

// D-239 (ADMIN-SIDEBAR-SPEC.md §2, the admin half of R-2): the admin shell's logo is the brand's "ai academy" app
// lockup at 161×34, as an image (the reversed file on a dark page). ONE image in both layouts: the rail shows it
// through a 26 px window, its "ai" (at 161×34 the "ai" ends at 25.8 px and "academy" begins at 29.6 px), which
// closes and opens with the column (AdminShell.module.css). Never a second file for the rail, never a cropped
// copy, never the favicon drawing. Inlined as `data:` URIs, as `BrandSlot` inlines today's.
const inline = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
const ACADEMY = inline(academy);
const ACADEMY_REVERSED = inline(academyReversed);

export function AcademyLogo({ short = false, reversed = false }: { short?: boolean; reversed?: boolean }) {
  return (
    <span className={s.academy} data-short={short ? 'true' : undefined} data-brand-slot={short ? 'mark' : 'lockup'}>
      <img src={reversed ? ACADEMY_REVERSED : ACADEMY} width={161} height={34} alt="Amplified Impact Academy" />
    </span>
  );
}

// The Amplified Impact wordmark (D-160, BUILD-SPEC § 4): design-reference/brand/amplified-impact-wordmark.svg
// as is (this app's copy, which scripts/reference-tokens.mjs --check holds byte-identical), drawn
// inline at 22px as the R2 mockup's old `Wordmark` drew it. The admin shell itself draws `AcademyLogo` now (D-239);
// this one stays for the older learner shell and the masquerade's paused console until R-2's pass moves them.

/** The file's own viewBox: x, y, width, height. */
const VIEWBOX = [41, -963.1, 7408, 1113.2] as const;
/** Everything inside the file's `<svg>`: its one path and the two circles of the tittle. */
const inner = (svg: string): string =>
  svg
    .trim()
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
const ARTWORK = inner(lockup);
/** D-185: the brand's reversed drawing (cream letters, the mint tittle), same viewBox, for a dark page. */
const ARTWORK_REVERSED = inner(lockupReversed);
/** The width of the first glyph, "a", in the file's units. */
const SHORT = 540;

export function Wordmark({
  short = false,
  height = 22,
  reversed = false,
}: {
  short?: boolean;
  height?: number;
  reversed?: boolean;
}) {
  const w = short ? SHORT : VIEWBOX[2];
  return (
    <svg
      className={s.wordmark}
      role="img"
      aria-label="Amplified Impact"
      data-brand-slot={short ? 'mark' : 'lockup'}
      height={height}
      width={Math.round(((height * w) / VIEWBOX[3]) * 10) / 10}
      viewBox={`${VIEWBOX[0]} ${VIEWBOX[1]} ${w} ${VIEWBOX[3]}`}
      dangerouslySetInnerHTML={{ __html: reversed ? ARTWORK_REVERSED : ARTWORK }}
    />
  );
}
