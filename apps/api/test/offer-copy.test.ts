// The offer's words that exist twice, held equal (D-075): what a buyer agreed to is what the order
// stores as proof. The API cannot import the web app at runtime, but a test can read it.
//
// The site's own checkout form, with its SMS box and its refusals, was retired with D-104 (every plan is
// bought through its Stripe Payment Link), so only the agreement's version is still shared.

import { describe, expect, it } from 'vitest';
import { AGREEMENT_VERSION } from '../src/billing/agreement';
import { AGREEMENT_VERSION as WEB_AGREEMENT_VERSION } from '../../web/src/legal/agreement';

describe('the offer copy shared with the page (D-075)', () => {
  it('records the agreement version /agreement shows', () => {
    expect(WEB_AGREEMENT_VERSION).toBe(AGREEMENT_VERSION);
  });
});
