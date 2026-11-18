import lockup from '../../assets/brand/amplified-impact-wordmark.svg?raw';
import lockupReversed from '../../assets/brand/amplified-impact-wordmark-reversed.svg?raw';
import s from './AdminShell.module.css';

// The admin shell's wordmark (D-160, BUILD-SPEC § 4): design-reference/brand/amplified-impact-wordmark.svg
// as is (this app's copy, which scripts/reference-tokens.mjs --check holds byte-identical), drawn
// inline at 22px as the mockup's `Wordmark` draws it. The 64px rail crops the same artwork to its
// first glyph with a 540-unit viewBox (`Wordmark short`); nothing is redrawn.

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
