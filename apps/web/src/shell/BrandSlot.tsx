import s from './BrandSlot.module.css';

// Ported from the two brand placeholders in the brand row of
// design-reference/Amplified Impact LMS.dc.html. SCREENS § 2.1 (Brand row), phase 04 § 4.3.
//
// The prototype holds each slot open with an `<image-slot>` custom element the designer can drop a
// file onto. The app has no such runtime: the real assets arrive as build configuration, so the
// placeholder renders until `VITE_BRAND_LOGO_URL` / `VITE_BRAND_WORDMARK_URL` are set, and an
// `<img>` of the same size takes over when they are.
//
// Both placeholders carry `data-brand-slot`, which is a required landmark (CLAUDE.md): the
// compliance harness masks it, so a dropped logo can never fail a pixel test. Both are also
// `aria-hidden`, as the reference's dashed boxes are — that is what keeps the word `Wordmark` out
// of the copy fingerprint on both sides.

/** The reference's `title` strings, including the `·` separator. */
const TITLE = {
  mark: 'Logo slot · drop your logo here',
  wordmark: 'Wordmark slot · drop your wordmark here',
} as const;

const URL_FOR = {
  mark: import.meta.env.VITE_BRAND_LOGO_URL as string | undefined,
  wordmark: import.meta.env.VITE_BRAND_WORDMARK_URL as string | undefined,
} as const;

export interface BrandSlotProps {
  /** `mark` is the 28×28 logo; `wordmark` is the 132×22 name, which the rail hides. */
  kind: 'mark' | 'wordmark';
}

export function BrandSlot({ kind }: BrandSlotProps) {
  const src = URL_FOR[kind];

  if (src) {
    return <img className={s.img} data-kind={kind} data-brand-slot={kind} src={src} alt="" aria-hidden="true" />;
  }

  return (
    <div className={s.slot} data-kind={kind} data-brand-slot={kind} title={TITLE[kind]} aria-hidden="true">
      {kind === 'wordmark' ? 'Wordmark' : null}
    </div>
  );
}
