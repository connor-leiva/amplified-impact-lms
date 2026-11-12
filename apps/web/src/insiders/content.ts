// The words on /insiders, Amplified Insiders' own page (Connor, Nov 11: "build the Amplified Insiders
// page at /insiders").
//
// THE PAGE SAYS WHAT /pricing's INSIDERS CARD SAYS. Its name, who it's for, what you get, how it runs,
// when it starts, the price and its terms, the buttons and their Payment Links are the card's own
// (`OFFERS.membership` in `../offer/content.ts`, `offerPrice` and `offerActions` in `../site/offers.ts`),
// read from there and never retyped, so the two pages can't disagree. The only words written here are
// the page's title and share description, and those are on the PR's list for Spring's review.

import { MEMBERSHIP_NAME } from '@ai/core/offer';
import { OFFERS } from '../offer/content';

export const INSIDERS_META = {
  title: `${MEMBERSHIP_NAME} · Amplified Impact`,
  description: OFFERS.membership.forWho,
  path: '/insiders',
} as const;
