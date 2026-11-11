// "Reset your password" (DECISIONS.md D-132): what "Forgot password?" sends an account that already
// has a password. One link, single use, 1 hour. Setting a new password signs out every other
// session.

import { EmailLayout, Para } from './layout';
import { absolute, setPasswordPath } from './links';

export interface ResetPasswordEmailProps {
  subject: string;
  /** The `purpose:'reset_password'` token, valid 1 hour. */
  token: string;
  appUrl?: string | null;
}

export function ResetPasswordEmail({ subject, token, appUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Reset Your Password', href: absolute(setPasswordPath(token), appUrl) }}>
      <Para>This link works once and expires in 1 hour.</Para>
      <Para>Didn’t ask for it? You can ignore this email. Your password stays the same.</Para>
    </EmailLayout>
  );
}
