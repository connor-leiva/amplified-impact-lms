import lockup from '../assets/brand/amplified-impact-academy-app.svg';
import lockupReversed from '../assets/brand/amplified-impact-academy-app-reversed.svg';
import mark from '../assets/brand/favicon.svg';
import s from './BrandSlot.module.css';

// The brand row's logo, ported from design-reference/Amplified Impact LMS.dc.html (D-031).
//
// The Brand Guide's rule is "use the app lockup in the LMS sidebar, on login screens and in emails",
// with a 160 px minimum, and "below each minimum, switch to the next drawing down". So the expanded
// sidebar, the drawer and the auth card show the `ai academy` app lockup at 161×34 (the guide's own
// sidebar size), and the 64 px rail — which has room for 28 px — shows the favicon drawing, which
// the guide sizes for 16-32 px.
//
// The files are the brand package's own drawings with only their C2PA provenance block removed;
// scripts/reference-tokens.mjs --check asserts they are byte-identical to design-reference/brand/.
// They are imported rather than served: at 400-970 bytes Vite inlines them as data: URIs, which the
// CSP's `img-src 'self' data:` allows and which costs no request against the per-IP rate limit.
//
// Light and dark are both rendered and one is hidden by `:root[data-theme]`, NOT by
// prefers-color-scheme: the app's theme is a stored preference, and a viewer can run a dark app on
// a light OS. The reference swaps one <img>'s src on the same preference; the pixels are the same.
// `data-brand-slot` stays on the wrapper — one per logo — as the CLAUDE.md landmark.

export interface BrandSlotProps {
  /** `lockup` is the 161×34 app lockup; `mark` is the 28×28 favicon drawing for the rail. */
  kind: 'lockup' | 'mark';
}

export function BrandSlot({ kind }: BrandSlotProps) {
  if (kind === 'mark') {
    return (
      <span className={s.slot} data-kind="mark" data-brand-slot="mark">
        <img className={s.img} src={mark} alt="" />
      </span>
    );
  }
  return (
    <span className={s.slot} data-kind="lockup" data-brand-slot="lockup">
      <img className={`${s.img} ${s.light}`} src={lockup} alt="" />
      <img className={`${s.img} ${s.dark}`} src={lockupReversed} alt="" />
    </span>
  );
}
