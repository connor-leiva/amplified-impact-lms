// The homepage's prices as numbers, read from the words the sales pages already print (DECISIONS.md
// D-104, D-106, D-111), so the homepage can never quote a price /pricing does not.
//
// The amounts live in Stripe and, as words, in `../offer/content.ts` (the Accelerator, the Team Plan,
// Amplified Insiders) and `../site/offers-content.ts` (the Amplified Agent Plan). The homepage needs
// them as numbers too: the Team Plan calculator and the Monthly/Yearly switches count from one price
// to the other. So each number here is the dollar figure in one of those strings, picked out at build
// time, and a missing one stops the build rather than printing "$0". `render.test.ts` holds each to
// the figure Connor's brief names.

import { AGENTS_FIRST_CHARGE_AT, longDate } from '@ai/core/offer';
import { CARD_STATES, OFFERS } from '../offer/content';
import { AGENT_PLAN, AGENT_PLAN_MORE } from '../site/offers-content';

/** Every whole-dollar figure in a string, in order: "Then $497 or $797 a month" is [497, 797]. */
export function dollarsIn(text: string): number[] {
  return [...text.matchAll(/\$(\d{1,3}(?:,\d{3})*)/g)].map((m) => Number(m[1]!.replace(/,/g, '')));
}

/** The `n`th dollar figure in a string; a build error when there is none. */
function figure(text: string | undefined, n = 0): number {
  const value = text === undefined ? undefined : dollarsIn(text)[n];
  if (value === undefined)
    throw new Error(`No price #${n + 1} in "${text}". Fix the offer's words or src/home/prices.ts.`);
  return value;
}

/** A line among a price's terms, by what it says, so a reordered list still finds it. */
function termWith(terms: readonly string[], words: RegExp): string | undefined {
  return terms.find((t) => words.test(t));
}

const team = OFFERS.agents.price.terms;

export const PRICES = {
  accelerator: {
    /** $7,500 */
    founding: figure(OFFERS.cohort.price.amount),
    /** $9,997, after founding closes. */
    standard: figure(CARD_STATES.closedAmount),
    /** 2 payments of $3,750: the card's own terms ("Or 2 payments of $3,750."), since D-159's buttons replaced its text link. */
    twoPay: figure(termWith(OFFERS.cohort.price.terms, /2 payments/)),
  },
  agentPlan: {
    /** $117 a month. */
    monthly: figure(AGENT_PLAN.price.amount),
    /** $790 a year. */
    yearly: figure(AGENT_PLAN_MORE['agent-yearly']),
  },
  teamPlan: {
    /** Paid today for the first 3 months: $1,491 up to 15 agents, $2,391 for 16 to 40. */
    today: [figure(OFFERS.agents.price.amount), figure(termWith(team, /16 to 40/))] as const,
    /** Then a month, from April 4, 2027: $497 and $797. */
    monthly: [figure(termWith(team, /a month/), 0), figure(termWith(team, /a month/), 1)] as const,
    /** The two tiers' sizes. */
    tierMax: 15,
    max: 40,
    /** "April 4, 2027": the first monthly charge (`AGENTS_FIRST_CHARGE_AT`). */
    monthlyFrom: longDate(AGENTS_FIRST_CHARGE_AT),
  },
  insiders: {
    /** $1,997 today for one year. */
    yearly: figure(OFFERS.membership.price.amount),
    /** $169 a month, For Team Leaders. */
    monthly: figure(OFFERS.membership.more['insiders-monthly']),
  },
} as const;

/** "$1,491": how the page prints a whole-dollar price. */
export const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;
