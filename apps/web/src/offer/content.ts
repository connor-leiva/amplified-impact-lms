// Every word on /offer (and /forum) and /offer/welcome (DECISIONS.md D-075).
//
// D-104 (Ampy's Stripe update, 2026-11-10) changed the terms under these words: the cards now say
// what the live Payment Links' own checkout text says (Wednesdays from Dec 2, Insiders from May 4,
// the Team Plan's first 3 months paid today, billing from Apr 4, 15 founding seats), the Amplified
// Skill Library card is Amplified Insiders, and the site's own checkout form is gone. Spring's
// rewrite of this page is its own pull request.
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build time; the API
// fills the prices and dates per request (`%%tokens%%`, @ai/core/offer). Nothing here is markup.
//
// House rules: no em dashes, no exclamation marks, short plain sentences. Labels and buttons in Title
// Case, descriptions in sentence case. Each plan's lines say only what the spec's plan table says: no
// counts, ratings or claims the offer does not make. The plan names are working names until Spring
// names them; they live in @ai/core/offer (`PLAN_NAMES`), which Stripe's receipts share.

import { SUPPORT_EMAIL } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';

export const META = {
  title: 'Plans and Prices | Amplified Impact',
  description: 'The Amplified AI Accelerator, Amplified Insiders and the Amplified Team Plan: AI training software for real estate teams.',
} as const;

export const CHROME = {
  skip: 'Skip to Plans',
  logoLabel: 'Amplified Impact',
  footerLabel: 'Legal',
  footerLinks: [
    { label: 'Subscription Agreement', href: '/agreement' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  contact: `Questions about a plan: ${SUPPORT_EMAIL}`,
} as const;

export const HERO = {
  /** One of these shows, by whether founding prices are still on sale. The date is filled per request. */
  eyebrowOpen: 'Founding prices until',
  eyebrowClosed: 'Founding prices closed',
  title: 'AI training software for real estate teams',
  lede: 'Each plan opens a set of skills in the Amplified Impact platform, with logins for your team and live sessions. You pay on Stripe, and your login arrives by email.',
  soon: 'The carts open soon. This page shows the prices and the checkout as soon as they do.',
} as const;

export interface CardCopy {
  /** Who the plan is for, in one sentence. */
  forWho: string;
  /** What it includes: three to seven plain lines, in the checkout's own terms. */
  lines: readonly string[];
  /** The Payment Link buttons, one per cart, the first the primary one. */
  pay: Partial<Record<CartId, string>>;
}

/** The three cards, by plan: the AI Accelerator, Amplified Insiders, the Team Plan. */
export type CardPlan = 'cohort' | 'membership' | 'agents';

export const CARDS_COPY: Readonly<Record<CardPlan, CardCopy>> = {
  cohort: {
    forWho: 'For Follow Up Boss teams who want to build the skills live, as a group, over eight weeks.',
    lines: [
      'Both skill sets: owner and operations, and agent',
      'Eight weekly 90-minute builds on Wednesdays from December 2',
      'Weekly 60-minute office hours',
      'Then 90 days of new skills and office hours',
      'Then Amplified Insiders at $197 a month from May 4, until you cancel',
      '15 founding seats',
    ],
    pay: { 'cohort-full': 'Pay in Full', 'cohort-two-pay': 'Pay in Two Payments' },
  },
  membership: {
    forWho: 'For owners and operations leads who want every skill and office hours, at their own pace.',
    lines: [
      'Every owner and operations skill in the platform',
      'Two new skills a month',
      'Weekly office hours',
      'A year paid up front counts in full toward the Amplified AI Accelerator; monthly payments do not',
      'Paid monthly, a 3-month minimum',
      'Cancel with 30 days\u2019 notice and keep what you have downloaded',
    ],
    pay: { 'insiders-year': 'Pay for One Year', 'insiders-monthly': 'Pay Monthly' },
  },
  agents: {
    forWho: 'For teams who want every agent on the agent skills, with weekly coaching.',
    lines: [
      'Every agent skill in the platform, from December 14',
      'A recorded starter path, so a new hire starts the week they join',
      'A weekly live agent coaching session from the week of January 4',
      'Logins for your agents and for you',
      'Today covers January 4 to April 3, 2027; monthly billing starts April 4, 2027',
    ],
    pay: { 'agents-upto15': 'Buy 15-Agent Plan', 'agents-16to40': 'Buy 40-Agent Plan' },
  },
};

export const CARD_STATES = {
  /** The founding carts after the close. The date is filled per request. */
  closed: 'Founding prices closed on',
  /** The AI Accelerator once its 15 seats are sold, across both links. */
  soldout: 'All 15 founding seats are taken.',
  soon: 'Opens soon.',
  /** When Stripe could not say a price: the payment page still shows it. */
  priceOnStripe: 'The price shows on the payment page.',
  waitlist: 'Join the Waitlist',
} as const;

export const PLANS_HEADING = 'Plans and prices';

export const AFTER = {
  heading: 'After you pay',
  steps: [
    { title: 'Your receipt', body: 'Stripe emails your receipt, and an invoice for a one-time payment.' },
    { title: 'Your login', before: 'Your login arrives by email on ', after: '. After that day, it arrives within minutes.' },
    { title: 'Your intake form', body: 'A short intake form for your plan comes with your welcome email.' },
  ],
} as const;

export const WAITLIST = {
  heading: 'Accelerator waitlist',
  body: 'The Amplified AI Accelerator is built on Follow Up Boss. Teams on another CRM, and anyone who missed the founding seats or the founding prices, can join the waitlist.',
  firstName: 'First Name',
  email: 'Email',
  submit: 'Join the Waitlist',
  joined: "You're on the Accelerator waitlist. We'll email you when the next cohort opens.",
  error: "That didn't go through. Check your name and email, then try again.",
  consent: 'By joining, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
} as const;

export const WELCOME = {
  title: 'Welcome | Amplified Impact',
  description: 'Your plan, your login and your intake form.',
  confirmed: {
    headingBefore: 'Welcome to the ',
    loginTitle: 'Your login',
    intakeTitle: 'Your intake form',
    intakeButton: 'Open Intake Form',
    intakeEmail: 'Your intake form arrives with your welcome email.',
    billingTitle: 'Your billing',
    billingBody: 'Update your card, see invoices or cancel yourself in the billing portal, with 30 days\u2019 notice. You keep every skill already released.',
    billingButton: 'Manage Billing',
  },
  pending: {
    heading: 'Confirming your payment',
    body: 'This usually takes a few seconds. The page updates on its own.',
    noscript: 'Refresh this page in a minute to see your plan.',
  },
  unknown: {
    heading: 'No checkout found',
    body: `If you paid, Stripe has emailed your receipt and your login is on its way. Write to ${SUPPORT_EMAIL} and we'll check your order.`,
  },
  back: 'Back to Plans',
  contact: `Write to ${SUPPORT_EMAIL} with any question about your plan.`,
} as const;
