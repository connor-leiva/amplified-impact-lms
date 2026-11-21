// The page's icon sprite (hand-drawn 24px line icons, no icon library), generated from mockup/index.html
// by tools/make-css.mjs into icons.generated.js. In the LMS these can become entries in components/Icon.tsx.
// D-225: `handoff/lms-v3/src/components/Icons.jsx`, converted to TSX and nothing else (the mockup's own sprite,
// exempt from the `ICONS` rule on these surfaces as the step page's is, D-210).
import { SYMBOLS } from './icons.generated.js';

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs dangerouslySetInnerHTML={{ __html: SYMBOLS }} />
    </svg>
  );
}

export function Icon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size}><use href={`#k-${name}`} /></svg>;
}

/** The small check in a done step's circle. */
export function NumCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
  );
}
