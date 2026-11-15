import lockupSvg from '../assets/brand/amplified-impact-wordmark.svg?raw';
import lockupReversedSvg from '../assets/brand/amplified-impact-wordmark-reversed.svg?raw';
import mark from '../assets/brand/favicon.svg';
import s from './BrandSlot.module.css';

// D-156: the wordmark's drawing is about 7 KB, over Vite's 4 KB inline limit, so it is read as text and
// inlined here as a data: URI, as the smaller brand files are by Vite itself: no request (D-031), and
// the CSP's `img-src 'self' data:` already allows it.
const inline = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
const lockup = inline(lockupSvg);
const lockupReversed = inline(lockupReversedSvg);

// The brand row's logo, ported from design-reference/Amplified Impact LMS.dc.html (D-031, D-156).
//
// D-156: the LMS now carries the Amplified Impact wordmark, the www kit's Logo 1 (apps/web/src/kit/
// logo.ts, drawn as two brand files: near-black letters with the energy ring on light, cream with
// mint on dark), so the first thing a learner or an admin sees reads as the same brand as www. It
// replaced the `ai academy` app lockup in the expanded sidebar, the drawer and the screens outside
// the shell; `head` is the same drawing at 20px for the phone's top bar, where the sidebar is hidden.
// The rail keeps the favicon mark. What follows is D-031's reasoning, which still holds.
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
  /** `lockup` is the 160×24 wordmark; `head` is the 133×20 wordmark for the phone's top bar; `mark` is the 28×28 favicon drawing for the rail. */
  kind: 'lockup' | 'head' | 'mark';
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
    <span className={s.slot} data-kind={kind} data-brand-slot={kind}>
      <img className={`${s.img} ${s.light}`} src={lockup} alt="" />
      <img className={`${s.img} ${s.dark}`} src={lockupReversed} alt="" />
    </span>
  );
}
