// § 8.1 row 6 · `replay-ready` · "Replay is up: Session {n} · {title}" · effect of `publishReplay`
//
// Copy: both strings are the product's own, and this is the one template where the reference
// actually wrote the email for us. `seed.ts`'s announcement `a2` IS this notice:
//
//   title: 'Replay is up: Session 2 · Speed to Lead'
//   body:  'The replay, chapters and transcript are on the Sales AI Employee page.'
//
// The title is § 8.1's subject, character for character, which is how we know the body belongs to
// this template too. It is reproduced verbatim with the one name that varies interpolated, so a
// Marketing replay reads "… on the Marketing AI Employee page." (`AIEmployee.name` is already the
// full "Marketing AI Employee", so nothing is appended).
//
// The button is `Watch Replay`, which is the reference's own label — `Sessions.vm.ts`'s `watch`
// action and the reference files render it on the replay-ready session row.
//
// The link is `/employees/:id`, the page the body names.

import { EmailLayout, Para } from './layout';
import { absolute, employeePath } from './links';

export interface ReplayReadyEmailProps {
  subject: string;
  /** `AIEmployee.name`, e.g. `Sales AI Employee`. */
  employee: string;
  /** `AIEmployee.id`, e.g. `sales`. */
  moduleId: string;
  appUrl?: string | null;
}

export function ReplayReadyEmail({ subject, employee, moduleId, appUrl }: ReplayReadyEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Watch Replay', href: absolute(employeePath(moduleId), appUrl) }}>
      {/* One interpolated string, not `… the {employee} page.` as JSX children: React's server
          renderer separates adjacent text children with `<!-- -->` markers, which would split the
          sentence in the delivered HTML and in every assertion made against it. */}
      <Para>{`The replay, chapters and transcript are on the ${employee} page.`}</Para>
    </EmailLayout>
  );
}
