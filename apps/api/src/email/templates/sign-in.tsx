// § 8.1 row 1 · `sign-in` · "Your Amplified Impact sign-in link" · POST /api/auth/request
//
// Copy: both strings are the product's, not mine.
//   - the H1 is the subject (see `EmailLayout`)
//   - "It expires in 15 minutes." is the tail of phase 07 § 7.5's own success sub, "We sent a link
//     to {email}. It expires in 15 minutes.", which is the sentence the sender is reading on
//     /sign-in at the moment this email is being written. The first half is dropped because the
//     email is already in the mailbox it names.
//   - the button is `Sign In`, § 7.5's H1 for the screen this link opens, and the app's pair for
//     `Sign Out`.
//
// The link is § 7.5's exact shape, `${APP_URL}/sign-in?token=…`, valid 15 minutes.

import { EmailLayout, Para } from './layout';
import { absolute, signInPath } from './links';

export interface SignInEmailProps {
  subject: string;
  /** The raw single-use token. § 7.5 stores only its `sha256`, so this is the only place it exists. */
  token: string;
  appUrl?: string | null;
}

export function SignInEmail({ subject, token, appUrl }: SignInEmailProps) {
  return (
    <EmailLayout subject={subject} cta={{ label: 'Sign In', href: absolute(signInPath(token), appUrl) }}>
      <Para>It expires in 15 minutes.</Para>
    </EmailLayout>
  );
}
