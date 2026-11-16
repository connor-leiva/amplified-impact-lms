// The AI Accelerator's two ways to pay, as two equal buttons (DECISIONS.md D-159), drawn the same on
// every www page that sells it: /offer and /forum (`./render.ts`), and /pricing and /team-build
// (`../site/offers.ts`'s `offerActions`).
//
// ONE BUTTON PER CART, EACH ITS OWN PAYMENT LINK. The hrefs are the `%%link:<cart>%%` tokens the old
// single button and text link had, so the API fills them per request exactly as before (an empty href
// while the cart does not sell, which the stylesheets hide) and `apps/api/src/lib/analytics.ts` labels
// both for GA4 and Meta. Neither is a primary with the other secondary: both carry the page's one
// buy-button class. They sit inside the card's `.act-link`, so they show exactly when the old button
// did: the card's state (its first cart's) is `link`.
//
// THE AMOUNTS are the card's own words, never new figures: `price.amount` for paying in full, and the
// payment in `price.terms` (read by `../home/prices.ts`) for 2 payments. The words are `./content.ts`'s.

import { CARD_CARTS } from '@ai/core/offer';
import type { CartId } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { PRICES, usd } from '../home/prices';
import { OFFERS } from './content';

export interface PayButton {
  cart: CartId;
  label: string;
  caption: string;
}

const [FULL, TWO_PAY] = CARD_CARTS.cohort as readonly [CartId, CartId];
const PAY = OFFERS.cohort.pay;

/** The two buttons, in the card's cart order: in full, then in 2 payments. */
export const ACCELERATOR_PAY: readonly [PayButton, PayButton] = [
  { cart: FULL, label: PAY.full.label(OFFERS.cohort.price.amount), caption: PAY.full.caption },
  { cart: TWO_PAY, label: PAY.twoPay.label(usd(PRICES.accelerator.twoPay)), caption: PAY.twoPay.caption },
];

/**
 * The pair, each button with its line under it, then the tax line once: in the page's own button
 * class (`button primary` on /offer, `btn btn-primary` on the kit's pages) and link tokens.
 */
export function payPair(buttonClass: string, link: (cart: CartId) => string): string {
  const choices = ACCELERATOR_PAY.map(
    (p) =>
      `<div class="pay-choice"><a class="${buttonClass} pay-btn" href="${link(p.cart)}">${esc(p.label)}</a><p class="pay-caption">${esc(p.caption)}</p></div>`,
  ).join('');
  return `<div class="pay-pair">${choices}</div><p class="pay-tax">${esc(PAY.tax)}</p>`;
}
