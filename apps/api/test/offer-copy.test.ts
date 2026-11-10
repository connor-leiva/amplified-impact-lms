// The offer's words that exist twice, held equal (D-074): what a buyer saw on the page is what the
// order stores as proof. The API cannot import the web app at runtime, but a test can read it.

import { describe, expect, it } from 'vitest';
import { AGREEMENT_VERSION, CHECKOUT_ERRORS, OFFER_SMS_CONSENT_TEXT } from '../src/billing/checkout';
import { CHECKOUT } from '../../web/src/offer/content';
import { AGREEMENT_VERSION as WEB_AGREEMENT_VERSION } from '../../web/src/legal/agreement';

describe('the offer copy shared with the page (D-074)', () => {
  it('stores the SMS box exactly as the page shows it', () => {
    expect(CHECKOUT.sms).toBe(OFFER_SMS_CONSENT_TEXT);
  });

  it('records the agreement version /agreement shows', () => {
    expect(WEB_AGREEMENT_VERSION).toBe(AGREEMENT_VERSION);
  });

  it('refuses in the page\'s words, so a message reads the same before and after a round trip', () => {
    for (const [key, message] of Object.entries(CHECKOUT.errors)) {
      if (key === 'network') continue;
      expect(CHECKOUT_ERRORS[key as keyof typeof CHECKOUT_ERRORS], key).toBe(message);
    }
  });
});
