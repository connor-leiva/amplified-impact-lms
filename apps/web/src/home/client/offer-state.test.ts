import { describe, expect, it } from 'vitest';
import { cartView, foundingOpen, readFacts, safeLink, seatsView, type OfferFacts } from './offer-state';

// What each homepage plan card shows from /api/offer: the same rule /pricing's per-request fill uses
// (`cartStates` in apps/api/src/routes/offer.ts), read from the JSON instead.

const facts = (over: Partial<OfferFacts> = {}): OfferFacts => ({
  open: true,
  founding: { open: true, closesAt: '2026-12-01T06:59:00.000Z' },
  seats: { total: 15, sold: 3, left: 12 },
  carts: [
    { id: 'cohort-full', state: 'link', paymentLink: 'https://buy.stripe.com/a' },
    { id: 'cohort-two-pay', state: 'link', paymentLink: 'https://buy.stripe.com/b' },
    { id: 'insiders-year', state: 'soon', paymentLink: null },
    { id: 'agents-upto15', state: 'closed', paymentLink: 'https://buy.stripe.com/c' },
  ],
  ...over,
});

describe('readFacts', () => {
  it('accepts /api/offer’s answer and keeps only what the page reads', () => {
    const json = {
      ...facts(),
      extra: 1,
      carts: [{ id: 'cohort-full', plan: 'cohort', state: 'link', paymentLink: 'https://x', prices: [] }],
    };
    expect(readFacts(json)).toEqual({
      ...facts(),
      carts: [{ id: 'cohort-full', state: 'link', paymentLink: 'https://x' }],
    });
  });

  it('refuses anything else', () => {
    for (const bad of [
      null,
      'x',
      {},
      { ...facts(), open: 'yes' },
      { ...facts(), seats: { total: 15, sold: -1, left: 16 } },
      { ...facts(), carts: [{ id: 1 }] },
      { ...facts(), founding: {} },
    ]) {
      expect(readFacts(bad)).toBeNull();
    }
  });
});

describe('cartView', () => {
  it('sells a cart only while its state is `link`, with its https link', () => {
    expect(cartView(facts(), 'cohort-full')).toEqual({ state: 'link', href: 'https://buy.stripe.com/a' });
  });

  it('shows /pricing’s other states with no link, even when the API still names one', () => {
    expect(cartView(facts(), 'agents-upto15')).toEqual({ state: 'closed', href: null });
    expect(cartView(facts(), 'insiders-year')).toEqual({ state: 'soon', href: null });
    expect(
      cartView(facts({ carts: [{ id: 'cohort-full', state: 'soldout', paymentLink: 'https://x' }] }), 'cohort-full'),
    ).toEqual({ state: 'soldout', href: null });
  });

  it('sells nothing while the offer is off, or for a cart the API doesn’t know', () => {
    expect(cartView(facts({ open: false }), 'cohort-full')).toEqual({ state: 'soon', href: null });
    expect(cartView(facts(), 'agent-monthly')).toEqual({ state: 'soon', href: null });
  });

  it('never turns a missing or non-https link into a button', () => {
    for (const link of [null, '', 'javascript:alert(1)', 'http://buy.stripe.com/a', 'not a url']) {
      expect(cartView(facts({ carts: [{ id: 'x', state: 'link', paymentLink: link }] }), 'x'), String(link)).toEqual({
        state: 'soon',
        href: null,
      });
    }
    expect(safeLink('https://buy.stripe.com/test_00')).toBe('https://buy.stripe.com/test_00');
  });
});

describe('seatsView', () => {
  it('counts what is left, and is sold out at none', () => {
    expect(seatsView(facts())).toEqual({ total: 15, sold: 3, left: 12, soldout: false });
    expect(seatsView(facts({ seats: { total: 15, sold: 15, left: 0 } }))).toEqual({
      total: 15,
      sold: 15,
      left: 0,
      soldout: true,
    });
    expect(seatsView(facts({ seats: { total: 15, sold: 20, left: 0 } })).sold).toBe(15);
  });
});

describe('foundingOpen', () => {
  const closes = '2026-11-30T23:59:00-07:00';
  it('takes the API’s word when it answered', () => {
    expect(foundingOpen(facts({ founding: { open: false, closesAt: closes } }), closes, 0)).toBe(false);
  });
  it('falls back to the deadline written into the page', () => {
    expect(foundingOpen(null, closes, Date.parse('2026-11-30T23:58:00-07:00'))).toBe(true);
    expect(foundingOpen(null, closes, Date.parse('2026-12-01T00:00:00-07:00'))).toBe(false);
  });
});
