// The words the www sales pages share (DECISIONS.md D-111): the offer cards' ids and the Amplified
// Agent Plan's card, the founding banner, and the shape of a question. /pricing, /team-build, /teams
// and /agents say them from here, so no two pages can word a fact two ways. The other three cards are
// /offer's own words (`OFFERS` in `../offer/content.ts`, D-105).
//
// Spring's voice: contractions, short sentences, no em dashes, no exclamation marks. Labels and
// buttons in Title Case.

import type { OfferCopy } from '../offer/content';

/** The card ids, so a link from another page (`/pricing#insiders`) lands on its card. */
export const CARD_IDS = {
  cohort: 'accelerator',
  agentPlan: 'agent-plan',
  agents: 'team-plan',
  membership: 'insiders',
} as const;

/**
 * The founding banner (Spring's plan: "a live countdown to November 30, and seats left for the
 * Amplified AI Accelerator"). The countdown, the deadline and the seats are filled per request.
 */
export const FOUNDING = {
  label: 'Founding prices',
  endsBefore: 'Founding prices end ',
  endsAfter: '.',
  seatsAfter: ' Amplified AI Accelerator seats left.',
  seatsOf: ' of ',
  soldout: 'All Amplified AI Accelerator founding seats are taken.',
} as const;

/** The Amplified Agent Plan's card, in the same five answers as the other three. */
export const AGENT_PLAN: OfferCopy = {
  forWho: 'Agents who want AI to help with leads, listings, buyers and their week.',
  lines: [
    'Every agent skill',
    'A short recorded starter path for your first week',
    'One live training a week, 60 minutes',
    'Weekly office hours, 60 minutes on Thursdays',
  ],
  howItRuns: 'Start with the recorded starter path. Then join one live training a week. The topic changes each week of the month, so you cover every topic in 4 weeks.',
  // [OPEN: the day and time of the weekly agent training]. Spring's placeholder stands until Connor sets it.
  starts: ['Weekly training starts the week of January 4.', 'Join any day.'],
  price: {
    amount: '$117',
    unit: 'a month',
    terms: ['Or $790 a year.', 'Your first charge is Monday, January 4, 2027.', '3-Month Minimum.'],
  },
  button: 'Get Amplified Agent Plan',
  more: {},
};

/** The Agent Plan's link under its button, for its yearly cart (D-114). */
export const AGENT_PLAN_MORE: Readonly<Record<string, string>> = { 'agent-yearly': 'Or pay $790 a year' };

/** Agent Insiders, sold beside Team Leader Insiders. The insiders page reads this card, it does not retype it. */
export const AGENT_INSIDERS = {
  cart: 'insiders-agent-monthly',
  amount: '$79',
  unit: 'a month',
  terms: ['3-Month Minimum.', 'Every agent skill, plus weekly office hours.', 'No weekly live training.'],
  label: 'Get Amplified Insiders for Agents',
} as const;

/** Spring's FAQ, her questions in her order. Each answer is a few short sentences; a link is a plain text link. */
export interface Faq {
  q: string;
  a: readonly string[];
  link?: { label: string; href: string };
}
