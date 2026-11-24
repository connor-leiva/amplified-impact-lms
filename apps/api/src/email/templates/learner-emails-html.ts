// D-247 (H-9): the two emails staff send by hand from Learners & Teams, in the $37 skill purchase
// email's design (`branded-html.ts`, Connor's HTML, shared and unchanged), as Connor asked on Nov 24:
//
//   learner-invite   Resend Invite: a fresh set-password link (72 hours) for a learner who hasn't joined.
//                    A Team Owner's Resend Invite in the Team Hub sends the same one.
//   learner-nudge    Send Nudge: a short note asking a learner who has joined to pick up where they left off.

import { brandedEmailHtml, buttonRow, cardRow, esc, fineRow, spacerRow } from './branded-html';
import { absolute, setPasswordPath } from './links';
import { LEARN_ORIGIN } from '@ai/core/skill-guides';
import { SUPPORT_EMAIL } from '@ai/core/offer';

export interface LearnerInviteInput {
  firstName: string;
  /** The address they sign in with, shown on the card. */
  email: string;
  /** The `purpose: 'set_password'` token. */
  token: string;
  appUrl?: string | null;
}

export interface LearnerNudgeInput {
  firstName: string;
  appUrl?: string | null;
}

/** The set-password link's own small print, as the set-password and purchase emails word it. */
const LINK_FINE = 'This link works once and expires in 72 hours. Need a new one? Use Forgot Password on the sign-in page.';
const NUDGE_FINE = 'Forgot your password? Use Forgot Password on the sign-in page.';

const welcome = (first: string): string => (first ? `Welcome, ${first}.` : 'Welcome.');
const hello = (first: string): string => (first ? `Hi, ${first}.` : 'Hi.');

const inviteHref = (i: LearnerInviteInput): string => absolute(setPasswordPath(i.token), i.appUrl);
const signInHref = (appUrl?: string | null): string => absolute('/sign-in', appUrl);

export function learnerInviteHtml(input: LearnerInviteInput): string {
  const heading = esc(welcome(input.firstName));
  return brandedEmailHtml({
    title: heading,
    preheader: 'Set your password to sign in to Amplified Impact.',
    eyebrow: 'Your account is ready',
    heading,
    rows: [
      // An address is one long word: it may break anywhere, so a phone never scrolls sideways for it.
      cardRow('Your login', `<span style="word-break:break-all;">${esc(input.email)}</span>`, 'Choose a password, and you’re signed in.'),
      buttonRow('Set Your Password', inviteHref(input)),
      fineRow(LINK_FINE),
      spacerRow(),
    ].join('\n'),
  });
}

export function learnerInviteText(input: LearnerInviteInput): string {
  return [
    welcome(input.firstName),
    '',
    'Your account is ready',
    '',
    'Your login',
    input.email,
    'Choose a password, and you’re signed in.',
    '',
    `Set Your Password: ${inviteHref(input)}`,
    '',
    LINK_FINE,
    '',
    `Sign In: ${LEARN_ORIGIN}`,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ].join('\n');
}

export function learnerNudgeHtml(input: LearnerNudgeInput): string {
  const heading = esc(hello(input.firstName));
  return brandedEmailHtml({
    title: heading,
    preheader: 'Pick up where you left off in Amplified Impact.',
    eyebrow: 'A quick nudge',
    heading,
    rows: [
      cardRow('Next step', 'Pick up where you left off', 'Sign in to see your next step.'),
      buttonRow('Sign In', signInHref(input.appUrl)),
      fineRow(NUDGE_FINE),
      spacerRow(),
    ].join('\n'),
  });
}

export function learnerNudgeText(input: LearnerNudgeInput): string {
  return [
    hello(input.firstName),
    '',
    'A quick nudge',
    '',
    'Next step',
    'Pick up where you left off',
    'Sign in to see your next step.',
    '',
    `Sign In: ${signInHref(input.appUrl)}`,
    '',
    NUDGE_FINE,
    '',
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ].join('\n');
}
