// The founding window as the www sales pages show it (DECISIONS.md D-111): how long is left before
// founding prices close, and how many Amplified AI Accelerator seats are left.
//
// The pages are built once and filled per request (`apps/api/src/routes/offer.ts`), like /offer: these
// are the extra `%%tokens%%` the sales pages carry beside `OFFER_TOKENS`, and the words the API puts in
// them. Pure, so the countdown's every edge is a unit test here, not a page test there.
//
// NO SCRIPT. The count is written when the page is served, so it is right on every load and needs no
// clock in the visitor's browser (an in-app browser, a phone with the wrong time) and nothing to hash
// under the CSP. It counts whole days, then whole hours on the last day.

import { COHORT_SEATS, token } from './offer';

export const FOUNDING_TOKENS = {
  /** "19 days left", "1 day left", "5 hours left", "Less than an hour left"; empty once closed. */
  countdown: token('countdown'),
  /** Accelerator seats left, as a number: "15". */
  seatsLeft: token('seats-left'),
  /** Accelerator seats in all: "15". */
  seatsTotal: token('seats-total'),
  /** `left` while any Accelerator seat is unsold, `soldout` after. On <body data-seats>. */
  seats: token('seats'),
} as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many} left`;

/** The countdown's words for the time left before founding closes; empty once it has. */
export function countdownWords(msLeft: number): string {
  if (!(msLeft > 0)) return '';
  if (msLeft >= DAY) return plural(Math.floor(msLeft / DAY), 'day', 'days');
  if (msLeft >= HOUR) return plural(Math.floor(msLeft / HOUR), 'hour', 'hours');
  return 'Less than an hour left';
}

/**
 * The founding tokens' values for one request. R-5 Phase 5 (D-262, PLAN § 10.10): the seats are the cohort on sale's
 * (its `capacity`, December's 15) and the countdown is to its founding close.
 */
export function foundingValues(now: number, closesAt: number, seatsSold: number, total: number = COHORT_SEATS): Record<string, string> {
  const left = Math.max(0, total - seatsSold);
  return {
    countdown: countdownWords(closesAt - now),
    'seats-left': String(left),
    'seats-total': String(total),
    seats: left > 0 ? 'left' : 'soldout',
  };
}
