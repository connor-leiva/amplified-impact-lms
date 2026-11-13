// What S11 and S12 share: the founding dates, the Accelerator's seat meter and line, and its three
// states (open, sold out, closed), all in /pricing's words and from /pricing's sources.
//
// NO DIRECT BUY LINKS (Connor's D1): every button goes to the program's own page. So the live state
// only changes what the page says: `client/offer.ts` reads `GET /api/offer` (as the live homepage does)
// and shows the parts for the state it finds (`data-when`). The markup starts on "open", the state
// before the founding deadline, as the live homepage's does; the deadline written into the page
// (`data-closes-at`) moves it to "closed" even if the API can't be reached.
//
// THE SEATS ARE SHOWN FROM THE START (rule: no buy, seat or proof element starts hidden). A static page
// can't know how many are left, so with no script the meter and its line say only what the page knows
// for certain: the deadline's day and the 15-seat cap ("Ends Nov 30 · 15 of 15 founding seats"). The
// script puts the days left in from the deadline written into the page ("18 days left"), and the API's
// count when it answers ("12 of 15 founding seats left"). Sold out or closed, /pricing's line takes
// their place. The buttons and the proof line beside them are always shown.

import { COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT } from '@ai/core/offer';
import { esc } from '../../../ai101/render';
import { button, proofLine } from '../../../kit/parts';
import { CARD_STATES } from '../../../offer/content';
import { PROGRAMS } from '../content';

/** The founding deadline: 11:59 PM Mountain, November 30. */
export const FOUNDING_CLOSES = Date.parse(DEFAULT_FOUNDING_CLOSES_AT);
const MOUNTAIN = 'America/Denver';
/** Where a charge date falls: the billing calendar's zone (`@ai/core/offer`'s `longDate`). */
export const CENTRAL = 'America/Chicago';

/** "Nov 30", "Jan 4": a day, short, where it falls. */
export const shortDay = (t: number, timeZone: string): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(t);

/** "Nov 30": the founding deadline's day, in Mountain time where it falls. */
export const foundingDay = (): string => shortDay(FOUNDING_CLOSES, MOUNTAIN);

/** "November 30", for /pricing's after-the-deadline lines. */
const foundingLongDay = (): string =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: MOUNTAIN }).format(FOUNDING_CLOSES);

/** The section attributes that carry the live state: the states it starts on, and the deadline. */
export const offerAttrs = (): string => `data-v3-offer data-acc="open" data-team="open" data-closes-at="${esc(DEFAULT_FOUNDING_CLOSES_AT)}"`;

/**
 * The seat meter and its line, shown in the "open" state from the start: "Ends Nov 30 · 15 of 15
 * founding seats", the deadline's day and the written cap. The script fills in the days left
 * (`data-v3-days`) and, once the API has counted, the seats left and the line's last word (each part's
 * `data-said`): "18 days left · 12 of 15 founding seats left".
 */
export function seatBlock(cls: string): string {
  const n = COHORT_SEATS;
  const dots = Array.from({ length: n }, (_, i) => `<span class="seatm-s" style="--si:${i}"></span>`).join('');
  return [
    `<div class="${cls}" data-v3-seats data-when="acc-open">`,
    `<div class="seatm" data-left="${n}" data-said="{left} of {total} seats left" role="img" aria-label="${n} of ${n} ${esc(PROGRAMS.seatsCap)}">${dots}</div>`,
    `<p class="status status-live"><span class="status-dot" aria-hidden="true"></span><span><strong data-v3-days>${esc(
      PROGRAMS.seatsEnds(foundingDay()),
    )}</strong> · <span data-v3-left>${n}</span> of <span data-v3-total>${n}</span> <span data-v3-seats-word data-said="${esc(PROGRAMS.seatsWord)}">${esc(
      PROGRAMS.seatsCap,
    )}</span></span></p>`,
    `</div>`,
  ].join('');
}

/** /pricing's line once the seats are sold, and once founding has closed. */
export const soldoutLine = (): string => CARD_STATES.soldout;
export const closedLine = (): string => `${CARD_STATES.closedBefore}${foundingLongDay()}${CARD_STATES.closedAfter}`;
export const teamClosedLine = (): string => `${CARD_STATES.teamClosedBefore}${foundingLongDay()}${CARD_STATES.teamClosedAfter}`;

/**
 * A program's buttons and the proof line beside them (rule: next to every program button). `parts` are
 * the button sets, each shown in the states it names; the proof line is shown in all of them.
 */
export function ctaGroup(cls: string, parts: readonly { when?: string; hidden?: boolean; html: string }[]): string {
  const sets = parts
    .map((p) => `<div class="${cls}-acts"${p.when ? ` data-when="${p.when}"` : ''}${p.hidden ? ' hidden' : ''}>${p.html}</div>`)
    .join('');
  return `<div class="${cls} cta-group">${sets}${proofLine()}</div>`;
}

/** The waiting list's button, to the program's page: /pricing's words. */
export const waitlistButton = (href: string, variant: 'primary' | 'secondary' = 'primary'): string =>
  button(CARD_STATES.waitlist, href, { variant, size: 'lg' });
