// Every word on /offer (and /forum) and /offer/welcome (DECISIONS.md D-075).
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build time; the API
// fills the prices and dates per request (`%%tokens%%`, @ai/core/offer). Nothing here is markup.
//
// House rules: no em dashes, no exclamation marks, short plain sentences. Labels and buttons in Title
// Case, descriptions in sentence case. Each plan's lines say only what the spec's plan table says: no
// counts, ratings or claims the offer does not make. The plan names are working names until Spring
// names them; they live in @ai/core/offer (`PLAN_NAMES`), which Stripe's receipts share.

import { SUPPORT_EMAIL } from '@ai/core/offer';
import type { CartId, PlanKind } from '@ai/core/offer';

export const META = {
  title: 'Plans and Prices | Amplified Impact',
  description: 'The Skill Library, the Core Cohort and the Agent Team Plan: AI training software for real estate teams.',
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
  /** What it includes: three to seven plain lines from the spec's plan table. */
  lines: readonly string[];
  choose: string;
  /** When the cart has no form today, the Payment Link buttons, one per cart. */
  pay: Partial<Record<CartId, string>>;
}

export const CARDS_COPY: Readonly<Record<PlanKind, CardCopy>> = {
  library: {
    forWho: 'For owners and operations leads who want the skills and office hours, at their own pace.',
    lines: [
      'Every owner and operations skill in the platform',
      'Two new skills a month while you pay',
      'Office hours for 30 days, then while you pay',
      'If you cancel, you keep every skill released before then',
    ],
    choose: 'Choose Skill Library',
    pay: { library: 'Pay for Skill Library' },
  },
  cohort: {
    forWho: 'For Follow Up Boss teams who want to build the skills live, as a group, over eight weeks.',
    lines: [
      'Both skill sets: owner and operations, and agent',
      'Eight weekly 90-minute builds on Tuesdays from December 1',
      'Weekly 60-minute office hours',
      'Then 90 days of new skills and office hours',
      'Ten founding seats',
    ],
    choose: 'Choose Core Cohort',
    pay: { 'cohort-full': 'Pay in Full', 'cohort-two-pay': 'Pay in Two Payments' },
  },
  agents: {
    forWho: 'For teams who want every agent on the agent skills, with weekly coaching.',
    lines: [
      'Every agent skill in the platform',
      'A recorded core path, so a new hire starts the week they join',
      'A weekly live agent coaching session',
      'Logins for your agents and for you',
      'A 3-month minimum, with nothing charged until January 26',
    ],
    choose: 'Choose Agent Team Plan',
    pay: { 'agents-upto15': 'Buy 15-Agent Plan', 'agents-16to40': 'Buy 40-Agent Plan' },
  },
};

export const CARD_STATES = {
  /** The founding carts after the close. The date is filled per request. */
  closed: 'Founding prices closed on',
  soon: 'Opens soon.',
  /** When Stripe could not say a price: the payment page still shows it. */
  priceOnStripe: 'The price shows on the payment page.',
  waitlist: 'Join the Cohort Waitlist',
} as const;

export const PLANS_HEADING = 'Plans and prices';

export const CHECKOUT = {
  heading: 'Checkout',
  intro: "Choose a plan and tell us who you are. You pay on Stripe's page next, and nothing is charged before you confirm there.",
  planLegend: 'Plan',
  fields: {
    name: { label: 'Name', autocomplete: 'name' },
    email: { label: 'Email', autocomplete: 'email', hint: 'Your login and receipt go here.' },
    phone: { label: 'Mobile Number', autocomplete: 'tel', hint: 'Optional.' },
    company: { label: 'Team Name', autocomplete: 'organization', hint: 'Optional. It names your team in the platform.' },
    crm: { label: 'Team CRM', hint: 'The Core Cohort is built on Follow Up Boss.' },
  },
  crmOptions: [
    { value: '', label: 'Choose one' },
    { value: 'follow_up_boss', label: 'Follow Up Boss' },
    { value: 'other', label: 'Another CRM' },
  ],
  /** The SMS box, word for word: the API stores it as the proof (`OFFER_SMS_CONSENT_TEXT`), and a test holds them equal. */
  sms: "Text me about my plan, sessions and other programs from Amplified Impact, LLC at the number above. Messages may be sent using automated technology. Consent isn't required to buy. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.",
  agreeBefore: 'I accept the ',
  agreeLink: 'Subscription Agreement',
  agreeAfter: ', including its no-refund terms.',
  submit: 'Continue to Payment',
  submitting: 'Opening Stripe',
  secure: 'Payments are processed by Stripe. Your card never touches this site.',
  /** The client-side refusals, word for word the API's (`CHECKOUT_ERRORS`); a test holds them equal. */
  errors: {
    cart: 'Choose a plan.',
    name: 'Enter your name.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid mobile number.',
    crmMissing: 'Tell us which CRM your team uses.',
    crm: 'The cohort is built on Follow Up Boss. The Skill Library works with any CRM, or join the cohort waitlist.',
    sms: 'Add your mobile number to get texts.',
    agree: 'Tick the box to accept the subscription agreement.',
    renew: 'Tick the box to agree to the later charge.',
    network: "Checkout didn't open. Check your connection and try again.",
  },
  fallbackLink: 'Use the Backup Payment Link',
  linksIntro: 'Pay on Stripe with the link for your plan. Your account is set up the same way.',
} as const;

export const AFTER = {
  heading: 'After you pay',
  steps: [
    { title: 'Your receipt', body: 'Stripe emails your receipt, and an invoice for a one-time payment.' },
    { title: 'Your login', before: 'Your login arrives by email on ', after: '. After that day, it arrives within minutes.' },
    { title: 'Your intake form', body: 'A short intake form for your plan comes with your welcome email.' },
  ],
} as const;

export const WAITLIST = {
  heading: 'Cohort waitlist',
  body: 'The Core Cohort is built on Follow Up Boss. Teams on another CRM, and anyone who missed the founding seats, can join the waitlist for cohort two.',
  firstName: 'First Name',
  email: 'Email',
  submit: 'Join the Waitlist',
  joined: "You're on the cohort waitlist. We'll email you when cohort two opens.",
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
