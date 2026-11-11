// Every word on /offer and /forum (one page: the Forum's QR code opens /forum) and on /offer/welcome
// (DECISIONS.md D-075, D-104, D-105).
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build time; the API
// fills the links, the states and the dates per request (`%%tokens%%`, @ai/core/offer). Nothing here
// is markup.
//
// THE SOURCE IS SPRING'S PLAN, as Ampy rewrote it with Connor's offer names: docs/SPRING-PLAN.md,
// Phase 1 and "Facts to use everywhere", held to the live Payment Links' own checkout text (Ampy's
// Stripe update, D-104): Insiders by the year is $1,997 for one year, then $197 a month unless
// cancelled with 30 days' notice; the Team Plan's first 3 months are paid today, with monthly billing
// from Sunday, April 4, 2027; 15 founding seats. Spring reviews these words before they go live, so
// they ship on a pull request, never straight to main.
//
// Spring's voice: contractions, short sentences, about a 4th grade reading level, lead with a
// statement, no victim language. No em dashes, no exclamation marks. Labels and buttons in Title Case,
// sentences in sentence case. Never "Forum" on this page: anyone can buy a founding seat while they
// last. Every price shows; never "the price shows on the payment page".
//
// OPEN DECISIONS STAY OPEN (docs/SPRING-PLAN.md, "Open decisions"). Where these words step around one,
// a comment beside them says `[OPEN: ...]`. None is invented: no training day or time, no payment plan
// for $9,997.

import { HELP_EMAIL } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';

/** The three cards, by plan: the AI Accelerator (`cohort`), Amplified Insiders (`membership`), the Team Plan (`agents`). */
export type CardPlan = 'cohort' | 'membership' | 'agents';

export const META = {
  title: 'Programs and Prices | Amplified Impact',
  description:
    'AI coaching and training for team owners and their agents. The Amplified AI Accelerator, Amplified Insiders and the Amplified Team Plan, with every price showing.',
} as const;

export const CHROME = {
  skip: 'Skip to Programs',
  logoLabel: 'Amplified Impact',
  footerLabel: 'Legal',
  footerLinks: [
    { label: 'Subscription Agreement', href: '/agreement' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  contactBefore: 'Questions? Write to ',
  contactAfter: '.',
} as const;

export const HERO = {
  eyebrow: 'AI coaching and training',
  title: 'Pick the way you want to learn AI.',
  lede: 'Build it live with us. Get every skill and go at your own pace. Or train your whole team.',
  /** Shows while no button can be bought yet: `OFFER_OPEN` off, or no Payment Link set. */
  soon: 'Checkout opens soon. The buy buttons show up here when it does.',
} as const;

export const PLANS_HEADING = 'Three ways to start';

/** The labels for the five things every card answers, in the same order (docs/SPRING-PLAN.md, "Make the choice easy"). */
export const FACT_LABELS = {
  forWho: 'Who it’s for',
  lines: 'What you get',
  howItRuns: 'How it runs',
  starts: 'When it starts',
} as const;

export interface OfferCopy {
  forWho: string;
  /** What you get: plain lines, each one from the plan's facts. */
  lines: readonly string[];
  howItRuns: string;
  starts: readonly string[];
  price: {
    amount: string;
    unit: string;
    /** The lines under the amount: the other ways to pay and the terms. */
    terms: readonly string[];
  };
  /** The card's one button, for its first cart's Payment Link. */
  button: string;
  /** Plain-text links for its other carts' Payment Links. */
  more: Partial<Record<CartId, string>>;
}

export const OFFERS: Readonly<Record<CardPlan, OfferCopy>> = {
  cohort: {
    forWho: 'Team owners and ops leads on Follow Up Boss.',
    lines: [
      'Both skill sets: owner and ops, and agent',
      '8 live builds, 90 minutes each',
      'Weekly office hours, 60 minutes',
      '90 days of new skills and office hours after your last build',
      'Then Amplified Insiders at $197 a month, from Tuesday, May 4, 2027, until you cancel',
    ],
    howItRuns: 'Live, with a small group of owners. You build on Wednesdays. Office hours are on Thursdays.',
    // [OPEN: the time of day for the builds and office hours]. Not set yet, so no time is named.
    starts: [
      'Wednesday, December 2.',
      'Then December 9 and 16, January 6, 13, 20 and 27, and February 3. No builds on December 23 or 30.',
    ],
    price: {
      amount: '$7,500',
      unit: 'founding price',
      terms: ['Or 2 payments of $3,750.', '15 founding seats.'],
    },
    button: 'Get Amplified AI Accelerator',
    more: { 'cohort-two-pay': 'Or pay in 2 payments of $3,750' },
  },
  membership: {
    forWho: 'Owners and ops leads who want to go at their own pace.',
    lines: [
      'Every owner and ops skill',
      '2 new skills every month',
      'Weekly office hours, 60 minutes on Thursdays',
      'If you cancel, you keep what you’ve downloaded',
    ],
    howItRuns: 'Self-paced. Use the skills when you want. Bring your questions to office hours.',
    starts: ['Join any day. Your login comes by email.'],
    // One year, then monthly: not a price that renews every year (the checkout's own words).
    price: {
      amount: '$1,997',
      unit: 'today for one year',
      terms: [
        '2 months free. It counts in full toward the Amplified AI Accelerator.',
        'After your year, $197 a month unless you cancel with 30 days’ notice.',
        'Or $197 a month from today, with a 3 month minimum. Monthly payments don’t count toward the Accelerator.',
      ],
    },
    button: 'Get Amplified Insiders',
    more: { 'insiders-monthly': 'Or pay $197 a month' },
  },
  agents: {
    forWho: 'Team owners who want every agent using AI.',
    lines: [
      'Every agent skill',
      'A short recorded starter path for each agent',
      'One live agent training a week',
      'Logins for your agents, and a usage view for you',
      '16 to 40 agents: a monthly owner call on who’s using it',
    ],
    howItRuns: 'Your agents start with the recorded starter path. Then they join one live training a week, on a 4 week rotation.',
    // [OPEN: the day and time of the weekly agent training]. Spring's placeholder stands until Connor sets it.
    starts: [
      'Weekly training starts the week of January 4.',
      'December bonus: your agents get the starter path and the 5 free skills on December 14, plus a goal planning Zoom on December 17.',
    ],
    // Founding prices for the Team Plan end Nov 30 with the Accelerator's (Ampy's Stripe update, D-104);
    // the deadline line under the card's price says so.
    price: {
      amount: '$1,491',
      unit: 'today, up to 15 agents',
      terms: [
        'Or $2,391 today for 16 to 40 agents.',
        'Today covers your first 3 months, January 4 to April 3, 2027.',
        'Then $497 or $797 a month, starting Sunday, April 4, 2027.',
      ],
    },
    button: 'Get Amplified Team Plan',
    more: { 'agents-16to40': 'Or get it for 16 to 40 agents' },
  },
};

/** What a card says around its button. The dates in `closed` and the deadlines are filled per request. */
export const CARD_STATES = {
  soon: 'Opens soon.',
  /** Before the Accelerator's founding deadline: "Founding price ends <date>. Then it’s $9,997." */
  deadlineBefore: 'Founding price ends ',
  deadlineAfter: '. Then it’s $9,997.',
  /** Before the Team Plan's: "Founding prices end <date>." */
  teamDeadlineBefore: 'Founding prices end ',
  teamDeadlineAfter: '.',
  /** After it. [OPEN: a payment plan for $9,997], so there is no button for it: the waitlist instead. */
  closedAmount: '$9,997',
  closedUnit: 'next cohort',
  closedBefore: 'The founding price ended ',
  closedAfter: '. Join the waitlist to hear first about the next cohort.',
  /** The Team Plan after Nov 30 (Connor, 2026-11-10): the waitlist. */
  teamClosedBefore: 'Founding prices ended ',
  teamClosedAfter: '. Join the waitlist to hear what’s next.',
  /** The Accelerator once its 15 seats are sold, across both links. */
  soldout: 'All 15 founding seats are taken. Join the waitlist to hear first about the next cohort.',
  waitlist: 'Join the Waitlist',
} as const;

/** The lines every card ends with (docs/SPRING-PLAN.md, "Office hours" and "Make the choice easy"). */
export const EVERY_CARD = {
  officeHours: 'Every program includes weekly office hours.',
  notReadyBefore: 'Not ready? ',
  notReadyLink: 'Start with 5 free skills',
  notReadyHref: '/library',
} as const;

/** One card's own note under its button. */
export const NOTES = {
  /** The Accelerator: Follow Up Boss only; everyone else joins the waitlist. */
  fubBefore: 'Requires Follow Up Boss. On another CRM? ',
  fubLink: 'Join the waitlist',
  /** The Team Plan over 40 agents: no cart, a conversation. */
  bigTeamBefore: 'Over 40 agents? ',
  bigTeamLink: 'Let’s talk',
} as const;

export const AFTER = {
  heading: 'After you buy',
  steps: [
    { title: 'Your receipt', body: 'Stripe emails your receipt right away.' },
    {
      title: 'Your login',
      held: { before: 'Your welcome email and login come on ', after: '.' },
      sent: 'Your welcome email and login come by email.',
    },
    { title: 'Your intake form', body: 'A short intake form comes with your welcome email.' },
    { title: 'Goal planning', body: 'Every buyer is invited to our year-end AI goal planning Zoom on Thursday, December 10.' },
  ],
} as const;

export const WAITLIST = {
  heading: 'Join the waitlist',
  body: 'The Amplified AI Accelerator requires Follow Up Boss. On another CRM, or missed a seat or a founding price? Join the waitlist. You’ll hear first when the next one opens.',
  firstName: 'First Name',
  email: 'Email',
  submit: 'Join the Waitlist',
  joined: 'You’re on the waitlist. We’ll email you when the next cohort opens.',
  error: "That didn't go through. Check your name and email, then try again.",
  // Kept word for word from the waitlist form before D-104 (docs/SPRING-PLAN.md, "Checkout rules").
  consent: 'By joining, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
} as const;

// --- /offer/welcome --------------------------------------------------------------------------------

/** The pieces a thank-you step can carry besides its sentences. */
export type StepExtra = 'login' | 'intake' | 'calendar-builds' | 'calendar-office-hours' | 'course' | 'library';

/** The platform, where a buyer signs in with the login from their email (the LMS host, not www). */
export const LEARN_ORIGIN = 'https://learn.amplifiedimpact.io';
/** The starter path's two first steps on the Agent Plan and the Team Plan, by their Library names. */
const FIRST_STEPS = 'Start with AI Brain Setup, then Sounds Like You: Your AI Voice Profile, then your first 3 agent skills.';
const SIGN_IN_FIRST = 'Sign in with the login from your email first.';

export interface ThanksStep {
  title: string;
  body: readonly string[];
  extras?: readonly StepExtra[];
}

export interface ThanksCopy {
  heading: string;
  lede: string;
  steps: readonly ThanksStep[];
}

/**
 * The thank-you page per plan (docs/SPRING-PLAN.md: "what happens next, login email note, add to
 * calendar buttons for Wednesday builds and Thursday office hours, the starter path link, and a
 * support email"). A Payment Link returns to `/offer/welcome?session_id=...`; once the webhook has
 * confirmed the order, the page shows the section for its plan.
 */
export const THANKS: Readonly<Record<CardPlan, ThanksCopy>> = {
  cohort: {
    heading: 'You’re in the Amplified AI Accelerator.',
    lede: 'Thanks for joining. Stripe emailed your receipt. Here’s what happens next.',
    steps: [
      { title: 'Watch your email', body: [], extras: ['login'] },
      { title: 'Start with Week 0', body: [`Week 0 is your setup path. ${SIGN_IN_FIRST} Then open your course.`], extras: ['course'] },
      { title: 'Fill out your intake form', body: ['It comes with your welcome email.'], extras: ['intake'] },
      {
        title: 'Save the dates',
        body: [
          'Wednesday, December 2: your first build. Builds run every Wednesday through February 3, with no builds on December 23 or 30.',
          'Thursday, December 10: our year-end AI goal planning Zoom.',
          'Office hours run every Thursday.',
        ],
        extras: ['calendar-builds', 'calendar-office-hours'],
      },
      {
        title: 'After your last build',
        body: [
          'After February 3, you get 90 days of new skills and office hours. Then you move to Amplified Insiders at $197 a month, starting Tuesday, May 4, 2027, until you cancel.',
        ],
      },
    ],
  },
  membership: {
    heading: 'Welcome to Amplified Insiders.',
    lede: 'Thanks for joining. Stripe emailed your receipt. Here’s what happens next.',
    steps: [
      { title: 'Watch your email', body: [], extras: ['login'] },
      { title: 'Open your Skill Library', body: [`${SIGN_IN_FIRST} Every skill in your plan is there, each with its setup guide.`], extras: ['library'] },
      { title: 'Fill out your intake form', body: ['It comes with your welcome email.'], extras: ['intake'] },
      {
        title: 'Save the dates',
        body: ['Thursday, December 10: our year-end AI goal planning Zoom.', 'Office hours run every Thursday.'],
        extras: ['calendar-office-hours'],
      },
      {
        title: 'Your plan',
        body: [
          'Paid for a year? Your $1,997 counts in full toward the Amplified AI Accelerator. After your year, it’s $197 a month unless you cancel with 30 days’ notice.',
          'Paid monthly? Your plan has a 3 month minimum.',
          'If you cancel, you keep what you’ve downloaded.',
        ],
      },
    ],
  },
  agents: {
    heading: 'Welcome to the Amplified Team Plan.',
    lede: 'Thanks for joining. Stripe emailed your receipt. Here’s what happens next.',
    steps: [
      { title: 'Watch your email', body: ['From there, you invite your agents.'], extras: ['login'] },
      { title: 'Your starter path', body: [`${SIGN_IN_FIRST} ${FIRST_STEPS}`, 'Your agents’ skills open Monday, December 14.'], extras: ['library'] },
      { title: 'Fill out your intake form', body: ['It comes with your welcome email.'], extras: ['intake'] },
      {
        title: 'Your December bonuses',
        body: [
          'Thursday, December 10: our year-end AI goal planning Zoom.',
          'Monday, December 14: your agents’ skills open, with the starter path and the 5 free skills.',
          'Thursday, December 17: a second goal planning Zoom. Your agents are invited.',
        ],
      },
      {
        title: 'Save the dates',
        // [OPEN: the day and time of the weekly agent training].
        body: ['Weekly agent training starts the week of January 4.', 'Office hours run every Thursday.'],
        extras: ['calendar-office-hours'],
      },
      {
        title: 'Your billing',
        body: ['Today’s payment covers your first 3 months, January 4 to April 3, 2027. Monthly billing starts Sunday, April 4, 2027.'],
      },
    ],
  },
};

/**
 * The Amplified Agent Plan's thank-you section (D-114). Its plan kind, `agent_plan`, comes with the LMS
 * wiring (D-106): the page shows this section when the confirmed order's plan is that kind. Nothing is
 * charged until January 4, so it says nothing about a receipt.
 */
export const AGENT_PLAN_THANKS: ThanksCopy = {
  heading: 'Welcome to the Amplified Agent Plan.',
  lede: 'Thanks for joining. Here’s what happens next.',
  steps: [
    { title: 'Watch your email', body: [], extras: ['login'] },
    {
      title: 'Your starter path',
      body: [`${SIGN_IN_FIRST} ${FIRST_STEPS}`, 'AI Brain Setup and Sounds Like You are free, so you can start today.'],
      extras: ['library'],
    },
    { title: 'Nothing is charged yet', body: ['Your card is saved. Your first charge is Monday, January 4, 2027, when your agent skills open.'] },
    {
      title: 'The week of January 4',
      // [OPEN: the day and time of the weekly agent training].
      body: ['Start the recorded starter path. Then join one live training a week.', 'Office hours run every Thursday.'],
      extras: ['calendar-office-hours'],
    },
    { title: 'Your plan', body: ['$79 a month, or $790 a year. Cancel anytime.', 'If you cancel, you keep what you’ve downloaded.'] },
  ],
};

/** The thank-you pages' shared pieces. */
export const THANKS_PARTS = {
  title: 'Welcome | Amplified Impact',
  description: 'What happens next, your login and your intake form.',
  login: {
    held: { before: 'Your welcome email and login come on ', after: '.' },
    sent: 'Your welcome email and login are on their way.',
  },
  intakeButton: 'Open Intake Form',
  /** The starter path's way in, on the LMS host: the course for the Accelerator, the Skill Library for the rest. */
  course: { label: 'Open Your Course', href: `${LEARN_ORIGIN}/course` },
  library: { label: 'Open the Skill Library', href: `${LEARN_ORIGIN}/skill-library` },
  calendar: {
    builds: 'Add Builds to Calendar',
    officeHours: 'Add Office Hours to Calendar',
    // [OPEN: the build and office hours times]. Until a calendar link is set, the invites are Connor's emails.
    email: 'Your calendar invites come by email.',
  },
} as const;

/** The welcome page's other states: the webhook has not landed yet, or there is no such checkout. */
export const WELCOME = {
  pending: {
    heading: 'Confirming your payment',
    body: 'This usually takes a few seconds. The page updates on its own.',
    noscript: 'Refresh this page in a minute to see your plan.',
  },
  unknown: {
    heading: 'No checkout found',
    body: `If you paid, Stripe has emailed your receipt and your login is on its way. Write to ${HELP_EMAIL} and we'll check your order.`,
  },
  back: 'Back to Programs',
} as const;
