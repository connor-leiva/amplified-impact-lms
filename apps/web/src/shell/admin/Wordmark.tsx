import academy from '../../assets/brand/amplified-impact-academy-app.svg?raw';
import academyReversed from '../../assets/brand/amplified-impact-academy-app-reversed.svg?raw';
import s from './AdminShell.module.css';

// D-239 (ADMIN-SIDEBAR-SPEC.md §2, the admin half of R-2): the admin shell's logo is the brand's "ai academy" app
// lockup at 161×34, as an image (the reversed file on a dark page). ONE image in both layouts: the rail shows it
// through a 26 px window, its "ai" (at 161×34 the "ai" ends at 25.8 px and "academy" begins at 29.6 px), which
// closes and opens with the column (AdminShell.module.css). Never a second file for the rail, never a cropped
// copy, never the favicon drawing. Inlined as `data:` URIs, as `BrandSlot` inlines the same two files.
//
// D-256 (R-2, B-42): the older learner shell (`shell/learner/LearnerShell.tsx`, its sidebar, rail, drawer and phone
// bar) and the masquerade's paused console (`components/masquerade/ConsolePaused.tsx`) draw this too, in place of
// D-160's Amplified Impact wordmark, which no LMS screen draws any more.
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
