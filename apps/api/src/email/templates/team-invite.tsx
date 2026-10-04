// § 8.1 row 2 · `team-invite` · "{inviter} invited you to {team} on Amplified Impact"
// Effect of `inviteMember`. § 8's mapping: it carries "a 7-day invite link".
//
// Copy I had to author (there is none in the spec, the reference or the app for either):
//   - the body line "This invite expires in 7 days."  — the one fact a reader needs that the
//     subject does not already carry. It is modelled on § 7.5's "It expires in 15 minutes."
//   - the button "Accept Invite" — the app has `Send Invite`, `Resend Invite` and `Invited`, all of
//     them the admin's side of the same object; nothing names the invitee's action, because phase
//     07's /invite/:token screen has no button at all (it verifies and redirects).
// Both are listed for review in the sprint report.
//
// The link is phase 07 § 7.5's `/invite/:token`, which "verifies the token, sets `status: 'active'`
// and `joined`, and signs the user in" — so accepting the invite IS signing in, and one button is
// genuinely all this email needs.

import { EmailLayout, Para } from './layout';
import { absolute, invitePath } from './links';

export interface TeamInviteEmailProps {
  subject: string;
  /** The `purpose:'invite'` token, valid 7 days (§ 7.5). */
  token: string;
  appUrl?: string | null;
}

export function TeamInviteEmail({ subject, token, appUrl }: TeamInviteEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Accept Invite', href: absolute(invitePath(token), appUrl) }}>
      <Para>This invite expires in 7 days.</Para>
    </EmailLayout>
  );
}
