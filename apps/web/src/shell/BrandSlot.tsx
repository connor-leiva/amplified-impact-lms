import lockupSvg from '../assets/brand/amplified-impact-academy-app.svg?raw';
import lockupReversedSvg from '../assets/brand/amplified-impact-academy-app-reversed.svg?raw';
import mark from '../assets/brand/favicon.svg';
import s from './BrandSlot.module.css';

// D-156, D-256: the lockup's drawing is about 12 KB, over Vite's 4 KB inline limit, so it is read as text and
// inlined here as a data: URI, as the smaller brand files are by Vite itself: no request (D-031), and
// the CSP's `img-src 'self' data:` already allows it.
const inline = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
const lockup = inline(lockupSvg);
const lockupReversed = inline(lockupReversedSvg);

// The brand row's logo, ported from design-reference/Amplified Impact LMS.dc.html (D-031, D-156, D-256).
//
// D-256 (R-2, B-42, Connor, Nov 20: "switch all the branding in the LMS to the academy logos"): the
// `lockup` and `head` kinds are the brand's "ai academy" app lockup again, at 161×34, the light file
// on light and the reversed file on dark, as the learner v3 sidebar (D-233) and the admin shell (D-239)
// draw it. It replaces D-156's Amplified Impact wordmark (160×24, and 133×20 in the phone's top bar)
// in the expanded sidebar, the drawer, the phone's top bar and every screen outside the shell. The
// rail keeps the favicon mark. What follows is D-031's reasoning, which holds again.
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
  /** `lockup` is the 161×34 academy app lockup; `head` is the same lockup in the phone's top bar; `mark` is the 28×28 favicon drawing for the rail. */
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
