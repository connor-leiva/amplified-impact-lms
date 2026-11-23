// The email a $37 skill buyer gets. Only the guest checkout sends it, and only while
// SKILL_GUEST_CHECKOUT is on. A new account sets a password. An account that already exists signs in.
// One button, the shared shell, and the Insiders price in one place.

import { EmailLayout, Para } from './layout';
import { absolute, setPasswordPath } from './links';

/** Amplified Insiders, monthly, as this email states it. Change it here and nowhere else. */
export const INSIDERS_MONTHLY_PRICE = '$197/Month';

export interface SkillPurchaseEmailProps {
  subject: string;
  /** `new` sets a password. `ready` signs in to a skill the buyer already has an account for. */
  variant: 'new' | 'ready';
  skillName: string;
  /** The buyer's first name. Empty means the greeting is "Thank you" on its own. */
  firstName: string;
  /** `/skill-library/<page>`, already checked. */
  next: string;
  /** The set-password token. Only the new-account variant uses it. */
  token?: string | null;
  appUrl?: string | null;
}

export function SkillPurchaseEmail({ subject, variant, skillName, firstName, next, token, appUrl }: SkillPurchaseEmailProps) {
  const greeting = firstName ? `Thank you, ${firstName}.` : 'Thank you.';
  const href =
    variant === 'new' && token
      ? absolute(setPasswordPath(token) + `&next=${encodeURIComponent(next)}`, appUrl)
      : absolute(`/sign-in?next=${encodeURIComponent(next)}`, appUrl);
  return (
    <EmailLayout subject={subject} cta={{ label: variant === 'new' ? 'Set Your Password' : 'Sign In', href }}>
      <Para>{greeting}</Para>
      <Para>{variant === 'new' ? `You bought ${skillName}.` : `You bought ${skillName}. It is ready in your account.`}</Para>
      {variant === 'new' ? <Para>Setting a password keeps your access to this skill and its updates for life.</Para> : null}
      <Para>You will find a guided setup, plus the Claude and ChatGPT versions.</Para>
      <Para>{`Amplified Insiders unlocks every skill for ${INSIDERS_MONTHLY_PRICE}.`}</Para>
      <Para>
        {variant === 'new'
          ? 'This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.'
          : 'Need a new link? Use Forgot Password on the sign-in page.'}
      </Para>
    </EmailLayout>
  );
}
