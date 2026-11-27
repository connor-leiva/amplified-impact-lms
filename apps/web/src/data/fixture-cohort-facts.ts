import { cohortSelling } from '@ai/core';
import type { CohortFacts, CohortStripeFacts, Db, StripePrice } from '@ai/core';

// R-5 Phase 5 (D-262): what the fixture build answers for a cohort's facts (`GET /api/admin/cohorts/:id/facts` in http
// mode). FIXTURE MODE ONLY: the http build asks the API, which asks Stripe read only.
//
// The fixture has no server and no Stripe, so it answers the facts of a cohort nobody has touched (none sold, no test
// sends) and a Stripe that holds December's three prices as the offer sells them ($7,500 in full; $3,750 a month, twice;
// Team Leader Insiders at $169 a month) and no other key, and finds every Payment Link entered, naming its own cohort.
//
// A browser test may set more (test sends done, another cohort's keys found) under `FIXTURE_FACTS_KEY` in the tab's
// storage before the page loads: `{ "<cohortId>": { …CohortFacts } }`, merged over these. Never read in http mode.

export const FIXTURE_FACTS_KEY = 'ai-fixture-cohort-facts';

/** December's prices, as the offer sells them (D-240): the fixture's Stripe. */
export const FIXTURE_PRICES: Readonly<Record<string, StripePrice>> = {
  cohort_founding_full: { unitAmount: 750000, currency: 'usd', interval: null, intervalCount: null },
  cohort_founding_two_pay: { unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1 },
  membership_monthly_team_leader: { unitAmount: 16900, currency: 'usd', interval: 'month', intervalCount: 1 },
};

const NONE: CohortFacts = {
  testSends: { welcome: false, week0: false },
  plans: 0,
  teams: 0,
  learners: 0,
  intakeNotStarted: 0,
  intakeGhlFailed: 0,
};

function stored(): Record<string, Partial<CohortFacts>> {
  try {
    const raw = localStorage.getItem(FIXTURE_FACTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<CohortFacts>>) : {};
  } catch {
    return {};
  }
}

/** The fixture's Stripe for one cohort: its keys priced from `FIXTURE_PRICES`, its links found naming it. */
export function fixtureStripeFacts(db: Pick<Db, 'cohorts'>, cohortId: string): CohortStripeFacts {
  const s = cohortSelling(db, cohortId);
  const keys = [s.keys.full, s.keys.rollover, s.twoPay ? s.keys.twoPay : null].filter((k): k is string => !!k);
  const urls = [s.links.full, s.twoPay ? s.links.twoPay : null].filter((u): u is string => !!u);
  return {
    prices: 'ok',
    price: Object.fromEntries(keys.map((k) => [k, FIXTURE_PRICES[k] ?? null])),
    links: 'ok',
    link: Object.fromEntries(urls.map((u) => [u, { active: true, aiCohort: cohortId }])),
  };
}

/** A cohort's facts in the fixture build: none sold, none sent, the fixture's Stripe, and what a test stored. */
export function fixtureCohortFacts(db: Pick<Db, 'cohorts'>, cohortId: string): CohortFacts {
  const over = stored()[cohortId] ?? {};
  return { ...NONE, stripe: fixtureStripeFacts(db, cohortId), ...over };
}
