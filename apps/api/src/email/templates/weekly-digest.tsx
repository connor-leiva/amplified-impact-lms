// § 8.1 row 8 · `weekly-digest` · "Your team this week" · scheduler, Mondays at 08:00 CT
//
// Copy: the body is the reference's own description of this email. `seed.ts`'s announcement `a3` is
// the weekly digest, scheduled rather than sent:
//
//   title: 'Weekly team progress digest'
//   body:  'Who has built, who is stuck, and what to review before Thursday.'
//   audience: 'owners', channels: ['email'], status: 'scheduled', at: Mon 2026-12-11T08:00
//
// — the same audience, the same channel, the same Monday-08:00 cadence § 8.1 gives this job. So its
// body is this template's body, verbatim. (It names Thursday because the December cohort's cadence
// is "Tue & Thu"; a cohort on another cadence would want that word to follow `Cohort.cadence`.
// Flagged as a follow-up in the sprint report rather than paraphrased here.)
//
// WHAT THIS TEMPLATE DELIBERATELY DOES NOT DO: render the digest. § 8.1 specifies a subject, a
// trigger and a shell for `weekly-digest` and no content whatsoever — no metric, no roster, no
// layout — and CLAUDE.md forbids inventing UI or copy the product does not have. A per-learner
// table built on a guess would be the largest piece of unspecified design in phase 08. The digest's
// actual numbers already exist, rendered, on the Team Hub, which is where the button goes; if the
// numbers are later wanted in the email itself, the view-model behind that screen is what should
// feed it.
//
// The button is "Open Team Hub": `Team Hub` is the app's own name for the destination
// (`Breadcrumbs.tsx` maps `/team` to it) and `Open {screen}` is the app's own action-label pattern
// (`ACTION_LABELS.sessions` is `Open Sessions`). Composed from existing strings, but still a new
// string — listed for review in the sprint report.

import { EmailLayout, Para } from './layout';
import { ROUTES, absolute } from './links';

export interface WeeklyDigestEmailProps {
  subject: string;
  appUrl?: string | null;
  /**
   * The day the week's review is for. Thursday by default, as above; the AI Accelerator's cohort
   * builds on Wednesdays, so its digest names its next build's day instead (D-110, the follow-up
   * this header flagged). R-5 Phase 4 (D-260, PLAN.md § 10.4): a cohort laid out from a shape names
   * its own next meeting's day, or, with no meeting left, `null`: no day, and no review before one.
   */
  before?: string | null;
}

export function WeeklyDigestEmail({ subject, appUrl, before = 'Thursday' }: WeeklyDigestEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Open Team Hub', href: absolute(ROUTES.team, appUrl) }}>
      <Para>{before === null ? 'Who has built and who is stuck.' : `Who has built, who is stuck, and what to review before ${before}.`}</Para>
    </EmailLayout>
  );
}
