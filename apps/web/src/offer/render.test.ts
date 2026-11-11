import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, CARDS, PLAN_NAMES, TOKEN_PATTERN } from '@ai/core/offer';
import { AFTER, CARD_STATES, CARDS_COPY, CHROME, HERO, WAITLIST, WELCOME } from './content';
import type { CardPlan } from './content';
import { renderOfferBody, renderOfferHead, renderWelcomeBody, renderWelcomeHead } from './render';

// The markup contract for /offer and /offer/welcome (D-075, D-104), on the parsed DOM, plus the house
// rules for their words. The API fills the `%%tokens%%`; `apps/api/test/offer.test.ts` serves the pages.

const HERE = dirname(fileURLToPath(import.meta.url));
const parse = (head: string, body: string) =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`, 'text/html');

const offer = parse(renderOfferHead(), renderOfferBody());
const welcome = parse(renderWelcomeHead(), renderWelcomeBody());
const all = (doc: Document | Element, sel: string) => Array.from(doc.querySelectorAll(sel));

/** Every visible string in content.ts, flattened. */
const copy = (): string[] => {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  [CHROME, HERO, CARDS_COPY, CARD_STATES, AFTER, WAITLIST, WELCOME].forEach(walk);
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

  it('shows the AI Accelerator, Amplified Insiders and the Team Plan, in that order', () => {
    expect(all(offer, '.plan-name').map((h) => h.textContent)).toEqual(['Amplified AI Accelerator', 'Amplified Insiders', 'Amplified Team Plan']);
    expect(CARDS.map((c) => PLAN_NAMES[c])).toEqual(all(offer, '.plan-name').map((h) => h.textContent));
    // The homepage's team owners' card links here.
    expect(offer.querySelector('#plan-agents')).not.toBeNull();
  });

  it('buys through each cart\'s Payment Link: one primary button per card, then its other carts', () => {
    for (const plan of CARDS) {
      const card = offer.getElementById(`plan-${plan}`)!;
      const links = all(card, '.act-link a').map((a) => [a.getAttribute('href'), a.className]);
      expect(links, plan).toEqual((CARD_CARTS[plan] ?? []).map((id, i) => [`%%link:${id}%%`, `button ${i === 0 ? 'primary' : 'secondary'}`]));
      expect(card.getAttribute('data-state')).toBe(`%%state:${CARD_CARTS[plan]![0]}%%`);
    }
  });

  it('offers the waitlist when founding closes (the Accelerator and the Team Plan) or the 15 seats sell', () => {
    const waitlist = (plan: string, cls: string) => all(offer.getElementById(`plan-${plan}`)!, `a.${cls}`).map((a) => a.getAttribute('href'));
    expect(waitlist('cohort', 'act-closed')).toEqual(['#waitlist']);
    expect(waitlist('agents', 'act-closed')).toEqual(['#waitlist']);
    expect(waitlist('membership', 'act-closed')).toEqual([]);
    expect(waitlist('cohort', 'act-soldout')).toEqual(['#waitlist']);
    expect(waitlist('agents', 'act-soldout')).toEqual([]);
    expect(offer.querySelector('#plan-cohort p.act-soldout')?.textContent).toBe('All 15 founding seats are taken.');
  });

  it('has no checkout form and no script: the site\'s own checkout is retired', () => {
    expect(offer.querySelector('form[action="/api/checkout"]')).toBeNull();
    expect(renderOfferBody()).not.toMatch(/<script/);
    expect(readFileSync(resolve(HERE, '../../offer.html'), 'utf8')).not.toMatch(/<script/);
    expect([...renderOfferBody().matchAll(TOKEN_PATTERN)].length).toBeGreaterThan(15);
  });

  it('keeps the waitlist form, which works with no script', () => {
    const form = offer.querySelector<HTMLFormElement>('#waitlist-form')!;
    expect([form.getAttribute('method'), form.getAttribute('action')]).toEqual(['post', '/api/offer/waitlist']);
  });
});

describe('/offer/welcome markup', () => {
  it('has a section per state, one h1 each, and the intake link opening in a new tab', () => {
    expect(all(welcome, 'section').map((s) => s.className)).toEqual(['w-confirmed', 'w-pending', 'w-unknown']);
    for (const s of all(welcome, 'section')) expect(s.querySelectorAll('h1')).toHaveLength(1);
    expect(welcome.querySelector('.intake-link a')?.getAttribute('target')).toBe('_blank');
  });
});

describe('the words (house rules, and the live checkout\'s terms)', () => {
  const words = copy();

  it('has no em dash, no exclamation mark and no slop word', () => {
    const bad = words.filter((w) => /[—!]|\b(unlock|seamless|simply|honest(ly)?|game.?changer|supercharge)\b/i.test(w));
    expect(bad).toEqual([]);
  });

  it('says what the Payment Links\' checkout says, and none of the retired terms', () => {
    const text = words.join(' \n ');
    for (const old of [/\bMay 3\b/, /January 26/, /Tuesdays?\b/, /December 1\b/, /Skill Library/, /\$2,000/, /day 31/, /nothing (is )?charged/i, /\bTen\b/]) {
      expect(text, String(old)).not.toMatch(old);
    }
    const lines = (plan: CardPlan) => CARDS_COPY[plan].lines.join(' ');
    expect(lines('cohort')).toContain('Wednesdays from December 2');
    expect(lines('cohort')).toContain('from May 4');
    expect(lines('cohort')).toContain('15 founding seats');
    expect(lines('agents')).toContain('January 4 to April 3, 2027; monthly billing starts April 4, 2027');
    expect(lines('membership')).toContain('counts in full toward the Amplified AI Accelerator; monthly payments do not');
  });

  it('writes buttons as a verb and an object in Title Case, five words at most', () => {
    const buttons = [...CARDS.flatMap((c) => Object.values(CARDS_COPY[c as CardPlan].pay)), CARD_STATES.waitlist, WAITLIST.submit, WELCOME.back];
    for (const b of buttons) {
      expect(b.split(' ').length, b).toBeLessThanOrEqual(5);
      expect(b, b).toMatch(/^[A-Z][a-z]+( (to|in|for|the|of|[A-Z0-9][A-Za-z0-9-]*))*$/);
    }
  });

  it('keeps each plan to three to seven plain lines and a short line about who it is for', () => {
    for (const c of CARDS) {
      const card = CARDS_COPY[c as CardPlan];
      expect(card.lines.length).toBeGreaterThanOrEqual(3);
      expect(card.lines.length).toBeLessThanOrEqual(7);
      expect(card.forWho.split(' ').length).toBeLessThanOrEqual(25);
    }
  });
});
