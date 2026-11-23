// The words on /insiders, Amplified Insiders' own page (Connor, Nov 11: "build the Amplified Insiders
// page at /insiders").
//
// THE PAGE SAYS WHAT /pricing's INSIDERS CARD SAYS. Its name, who it's for, what you get, how it runs,
// when it starts, the price and its terms, the buttons and their Payment Links are the card's own
// (`OFFERS.membership` in `../offer/content.ts`, `offerPrice` in `../site/offers.ts`), read from there and
// never retyped, so the two pages can't disagree. Its questions are /pricing's own (`FAQ`), and the
// skills it lists are every set Insiders opens (`PLAN_SETS.membership`, owner and ops and agent), by their Library names.
//
// The only words written here are below, and every one is on the PR's list for Spring's review.

import { MEMBERSHIP_NAME } from '@ai/core/offer';
import { OFFERS } from '../offer/content';

export const INSIDERS_META = {
  title: `${MEMBERSHIP_NAME} · Amplified Impact`,
  description: OFFERS.membership.forWho,
  path: '/insiders',
} as const;

/** The v2 mockup's (InsidersPage) words that the live card doesn't have. NEW COPY FOR SPRING'S REVIEW. */
export const V2_INSIDERS = {
  /** The hero's headline, from the card's "Every skill" and /pricing's "at your own pace". */
  title: 'Every skill. At your own pace.',
  /** Over the ways to pay. */
  plans: 'Three ways to pay',
} as const;
