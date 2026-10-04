// § 8.1 row 3 · `staff-invite` · "You’ve been added to the Amplified Impact admin console"
// Effect of `inviteStaff`. Same 7-day `purpose:'invite'` token as `team-invite` (§ 7.5).
//
// Copy:
//   - the body line is `team-invite`'s, verbatim, because it states the same fact about the same
//     kind of token. Authored, and listed in the sprint report.
//   - the button is "Open Admin Console": `Admin Console` is the app's own name for the
//     destination (`AppShell.tsx` renders `Admin Console · {cohort} Cohort` and
//     `Owner · Admin Console`), and `Open {screen}` is the app's own action-label pattern
//     (`mutations.ts`'s `ACTION_LABELS` gives `Open Sessions`; `Dashboard.vm.ts` falls back to a
//     bare `Open`). Composed from two existing strings rather than written, but still a new string.
//
// It links to `/invite/:token`, not to `/admin`: a staff member who has not accepted yet has no
// session, so `/admin` would bounce them to /sign-in and the email's one button would be a dead
// end. The invite route verifies, signs them in, and redirects — and the shell routes staff to
// `/admin` from there.

import { EmailLayout, Para } from './layout';
import { absolute, invitePath } from './links';

export interface StaffInviteEmailProps {
  subject: string;
  token: string;
  appUrl?: string | null;
}

export function StaffInviteEmail({ subject, token, appUrl }: StaffInviteEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Open Admin Console', href: absolute(invitePath(token), appUrl) }}>
      <Para>This invite expires in 7 days.</Para>
    </EmailLayout>
  );
}
