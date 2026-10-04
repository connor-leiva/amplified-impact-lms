// § 8.1 row 7 · `build-reminder` · "Finish your {employee}"
// Sent by `remindMembers`, `nudgeLearners` and § 8.5's 48-hour job. § 8's top mapping also routes
// the `nudge` action here — there are nine templates, not ten (see `subjects.ts`).
//
// Copy: both strings are the app's, and both come from the card this email is about.
//   - the body is `EmployeeCard.tsx`'s own progress string, `${card.n} of ${card.total} steps
//     verified`, which the card renders as the `title` on its progress segments. No trailing
//     period, because the source has none.
//   - the button is `cards.ts`'s `CardCta` for an unfinished build, chosen by the same rule
//     `employeeCard` uses: `buildOf` reports `not_started` at zero verified steps and
//     `in_progress` above it, which the card maps to `Start Build` and `Continue Build`. So the
//     email's button says exactly what the button on the page it opens will say.
//
// `verified` is unreachable here by construction — nobody is reminded to finish a build they have
// finished — so the card's third label, `Open`, has no arm.
//
// The AI Employee's name is not a prop: it is in § 8.1's subject, which is this email's H1, so the
// body would only repeat it.
//
// The link is `/employees/:id`, the page that carries the checklist.

import { STEPS } from '@ai/core';
import { EmailLayout, Para } from './layout';
import { absolute, employeePath } from './links';

export interface BuildReminderEmailProps {
  subject: string;
  /** `AIEmployee.id`. */
  moduleId: string;
  /** `buildOf(user, m).n` — verified steps. */
  steps: number;
  /** `buildOf(user, m).total`. Defaults to `STEPS` (6), which is what `buildOf` itself falls back to. */
  total?: number;
  appUrl?: string | null;
}

export function BuildReminderEmail({ subject, moduleId, steps, total = STEPS, appUrl }: BuildReminderEmailProps) {
  // `cards.ts`: `b.state === 'in_progress' ? 'Continue Build' : 'Start Build'`, and `buildOf`
  // reports `in_progress` for exactly `n > 0`.
  const label = steps > 0 ? 'Continue Build' : 'Start Build';

  // One interpolated string, not `{steps} of {total} steps…` as JSX children: React's server
  // renderer separates adjacent text children with `<!-- -->` markers, which would split the
  // sentence in the delivered HTML and in every assertion made against it.
  return (
    <EmailLayout subject={subject} cta={{ label, href: absolute(employeePath(moduleId), appUrl) }}>
      <Para>{`${steps} of ${total} steps verified`}</Para>
    </EmailLayout>
  );
}
