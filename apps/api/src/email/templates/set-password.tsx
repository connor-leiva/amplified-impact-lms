// "Set your password" (DECISIONS.md D-132): the email a checkout's new account gets in place of the
// owner invite, and what "Forgot password?" sends an account that has no password yet. One link,
// single use, 72 hours. It signs the person in once they choose a password.

import { EmailLayout, Para } from './layout';
import { absolute, setPasswordPath } from './links';

export interface SetPasswordEmailProps {
  subject: string;
  /** The `purpose:'set_password'` token, valid 72 hours. */
  token: string;
  appUrl?: string | null;
}

export function SetPasswordEmail({ subject, token, appUrl }: SetPasswordEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Set Your Password', href: absolute(setPasswordPath(token), appUrl) }}>
      <Para>Your Amplified Impact account is ready. Choose a password, and you’re signed in.</Para>
      <Para>This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.</Para>
    </EmailLayout>
  );
}
