import { describe, expect, it } from 'vitest';
import { CARDS, CART_IDS, PLAN_NAMES, TOKEN_PATTERN } from '@ai/core/offer';
import { AFTER, CARDS_COPY, CHECKOUT, CHROME, HERO, WAITLIST, WELCOME } from './content';
import { renderOfferBody, renderOfferHead, renderWelcomeBody, renderWelcomeHead } from './render';

// The markup contract for /offer and /offer/welcome (D-074), on the parsed DOM, plus the house rules
// for their words. The API fills the `%%tokens%%`; `apps/api/test/offer.test.ts` serves the pages.

const parse = (head: string, body: string) =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`, 'text/html');

const offer = parse(renderOfferHead(), renderOfferBody());
const welcome = parse(renderWelcomeHead(), renderWelcomeBody());
const all = (doc: Document, sel: string) => Array.from(doc.querySelectorAll(sel));

/** Every visible string in content.ts, flattened. */
const copy = (): string[] => {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  [CHROME, HERO, CARDS_COPY, CHECKOUT, AFTER, WAITLIST, WELCOME].forEach(walk);
  return out;
};

describe('/offer markup', () => {
  it('has one h1, a skip link to the plans, the brand slot and noindex', () => {
    expect(all(offer, 'h1')).toHaveLength(1);
    expect(offer.querySelector('a.skip')?.getAttribute('href')).toBe('#plans');
    expect(offer.querySelector('#plans')).not.toBeNull();
    expect(offer.querySelector('[data-brand-slot]')).not.toBeNull();
    expect(offer.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
  });

  it('shows the three plans in order, each with one filled Choose button', () => {
    expect(all(offer, '.plan-name').map((h) => h.textContent)).toEqual(CARDS.map((c) => PLAN_NAMES[c]));
    for (const plan of all(offer, '.plan')) expect(plan.querySelectorAll('.act-checkout.button.primary')).toHaveLength(1);
  });

  it('posts a real form to /api/checkout that works with no script', () => {
    const form = offer.querySelector<HTMLFormElement>('#checkout-form')!;
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe('/api/checkout');
    expect(all(offer, 'input[name="cart"]').map((r) => r.getAttribute('value'))).toEqual([...CART_IDS]);
    expect(offer.querySelector('#f-agree')?.hasAttribute('required')).toBe(true);
    for (const id of CART_IDS) expect(offer.querySelector(`#renew-${id}`)?.getAttribute('name')).toBe(`renew-${id}`);
    expect(offer.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('labels every field above it, with the right types and autocomplete', () => {
    for (const input of all(offer, '#checkout-form input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not(#f-website), #checkout-form select')) {
      expect(offer.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
    expect(offer.querySelector('#f-email')?.getAttribute('type')).toBe('email');
    expect(offer.querySelector('#f-email')?.getAttribute('autocomplete')).toBe('email');
    expect(offer.querySelector('#f-phone')?.getAttribute('type')).toBe('tel');
    expect(offer.querySelector('#f-company')?.getAttribute('autocomplete')).toBe('organization');
    expect(offer.querySelector('fieldset.carts legend')?.textContent).toBe('Plan');
  });

  it('links the agreement from its box', () => {
    expect(offer.querySelector('label[for="f-agree"] a')?.getAttribute('href')).toBe('/agreement');
  });

  it('keeps every token outside the script, so the CSP hash never moves', () => {
    const html = renderOfferBody();
    expect(html).not.toMatch(/<script/);
    expect([...html.matchAll(TOKEN_PATTERN)].length).toBeGreaterThan(20);
  });
});

describe('/offer/welcome markup', () => {
  it('has a section per state, one h1 each, and the intake link opening in a new tab', () => {
    expect(all(welcome, 'section').map((s) => s.className)).toEqual(['w-confirmed', 'w-pending', 'w-unknown']);
    for (const s of all(welcome, 'section')) expect(s.querySelectorAll('h1')).toHaveLength(1);
    expect(welcome.querySelector('.intake-link a')?.getAttribute('target')).toBe('_blank');
  });
});

describe('the words (house rules and the taste rubric)', () => {
  const words = copy();

  it('has no em dash, no exclamation mark and no slop word', () => {
    const bad = words.filter((w) => /[—!]|\b(unlock|seamless|simply|honest(ly)?|game.?changer|supercharge)\b/i.test(w));
    expect(bad).toEqual([]);
  });

  it('writes buttons as a verb and an object in Title Case, five words at most', () => {
    const buttons = [
      ...CARDS.map((c) => CARDS_COPY[c].choose),
      ...CARDS.flatMap((c) => Object.values(CARDS_COPY[c].pay)),
      CHECKOUT.submit,
      WAITLIST.submit,
      WELCOME.confirmed.intakeButton,
      WELCOME.back,
    ];
    for (const b of buttons) {
      expect(b.split(' ').length, b).toBeLessThanOrEqual(5);
      expect(b, b).toMatch(/^[A-Z][a-z]+( (to|in|for|the|of|[A-Z0-9][A-Za-z0-9-]*))*$/);
    }
    expect(new Set(buttons).size).toBeLessThanOrEqual(12);
  });

  it('keeps each plan to three to seven plain lines and a short line about who it is for', () => {
    for (const c of CARDS) {
      expect(CARDS_COPY[c].lines.length).toBeGreaterThanOrEqual(3);
      expect(CARDS_COPY[c].lines.length).toBeLessThanOrEqual(7);
      expect(CARDS_COPY[c].forWho.split(' ').length).toBeLessThanOrEqual(25);
    }
  });

  it('keeps the page under 900 words', () => {
    const text = offer.body.textContent ?? '';
    expect(text.replace(/%%[^%]+%%/g, '').split(/\s+/).filter(Boolean).length).toBeLessThan(900);
  });
});
