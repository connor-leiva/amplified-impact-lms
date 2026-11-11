import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, CARDS, HELP_EMAIL, PLAN_NAMES, TOKEN_PATTERN } from '@ai/core/offer';
import { AFTER, CARD_STATES, CHROME, EVERY_CARD, FACT_LABELS, HERO, NOTES, OFFERS, THANKS, THANKS_PARTS, WAITLIST, WELCOME } from './content';
import type { CardPlan } from './content';
import { renderOfferBody, renderOfferHead, renderWelcomeBody, renderWelcomeHead } from './render';

// The markup contract for /offer and /offer/welcome (D-075, D-104, D-105), on the parsed DOM, plus the
// house rules for their words and the facts from Spring's plan (docs/SPRING-PLAN.md), held to the live
// Payment Links' checkout text. The API fills the `%%tokens%%`; `apps/api/test/offer.test.ts` serves
// the pages.

const PLANS = CARDS as readonly CardPlan[];

const HERE = dirname(fileURLToPath(import.meta.url));
const parse = (head: string, body: string) =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`, 'text/html');

const offer = parse(renderOfferHead(), renderOfferBody());
const welcome = parse(renderWelcomeHead(), renderWelcomeBody());
const all = (doc: Document | Element, sel: string) => Array.from(doc.querySelectorAll(sel));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const pageText = text(offer.body) + ' ' + renderOfferHead();

/** Every visible string in content.ts, flattened. */
const copy = (): string[] => {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  [CHROME, HERO, OFFERS, CARD_STATES, EVERY_CARD, NOTES, AFTER, WAITLIST, THANKS, THANKS_PARTS, WELCOME].forEach(walk);
  return out;
};

describe('/offer markup', () => {
  it('has one h1, a skip link to the programs, the brand slot and noindex, and no script', () => {
    expect(all(offer, 'h1')).toHaveLength(1);
    expect(offer.querySelector('a.skip')?.getAttribute('href')).toBe('#plans');
    expect(offer.querySelector('#plans')).not.toBeNull();
    expect(offer.querySelector('[data-brand-slot]')).not.toBeNull();
    expect(offer.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    expect(renderOfferBody()).not.toMatch(/<script/);
    const shell = readFileSync(resolve(HERE, '../../offer.html'), 'utf8');
    expect(shell).not.toMatch(/<script/);
    expect(shell).toContain('data-offer="%%offer-state%%" data-founding="%%founding%%" data-invites="%%invites%%"');
  });

  it('shows the three offers in order, by their locked names, each anchored for links from other pages', () => {
    expect(all(offer, '.plan-name').map(text)).toEqual(['Amplified AI Accelerator', 'Amplified Insiders', 'Amplified Team Plan']);
    expect(PLANS.map((p) => PLAN_NAMES[p])).toEqual(all(offer, '.plan-name').map(text));
    // The homepage's team owners' card links to #plan-agents.
    expect(all(offer, '.plan').map((p) => p.id)).toEqual(['plan-cohort', 'plan-membership', 'plan-agents']);
  });

  it('answers the same four questions on every card, in the same order, then the price', () => {
    for (const card of all(offer, '.plan')) {
      expect(all(card, '.facts dt').map(text), card.id).toEqual(Object.values(FACT_LABELS));
      const order = [...card.children].map((c) => c.classList[0]);
      expect(order.slice(0, 3), card.id).toEqual(['plan-name', 'facts', 'price']);
      expect(card.querySelector('.price .amount'), card.id).not.toBeNull();
    }
  });

  it('gives every card one button, for its first cart\'s Payment Link, and plain-text links for the others', () => {
    for (const id of PLANS) {
      const card = offer.getElementById(`plan-${id}`)!;
      const [first, ...rest] = CARD_CARTS[id] ?? [];
      const buttons = all(card, '.act-link .button');
      expect(buttons.map((b) => [text(b), b.getAttribute('href'), b.className]), id).toEqual([[OFFERS[id].button, `%%link:${first}%%`, 'button primary']]);
      expect(all(card, '.act-link a.more').map((a) => a.getAttribute('href')), id).toEqual(rest.map((r) => `%%link:${r}%%`));
      expect(card.getAttribute('data-state')).toBe(`%%state:${first}%%`);
      expect(text(card.querySelector('.act-soon'))).toBe('Opens soon.');
    }
  });

  it('ends every card with the office hours line and the free skills', () => {
    for (const card of all(offer, '.plan')) {
      expect(text(card.querySelector('.every'))).toBe('Every program includes weekly office hours.');
      const link = card.querySelector('.not-ready a');
      expect([text(card.querySelector('.not-ready')), link?.getAttribute('href')]).toEqual(['Not ready? Start with 5 free skills.', '/library']);
    }
  });

  it('closes the Accelerator\'s and the Team Plan\'s founding prices on Nov 30: the waitlist instead of a button', () => {
    const acc = offer.getElementById('plan-cohort')!;
    expect(acc.querySelector('.price.founding-open .deadline')?.innerHTML).toBe('Founding price ends %%founding-closes%%. Then it’s $9,997.');
    expect(text(acc.querySelector('.price.founding-closed'))).toBe('$9,997 next cohort');
    expect(all(acc, 'a.act-closed').map((a) => [text(a), a.getAttribute('href')])).toEqual([['Join the Waitlist', '#waitlist']]);
    expect(acc.querySelector('.note a')?.getAttribute('href')).toBe('#waitlist');
    const team = offer.getElementById('plan-agents')!;
    expect(team.querySelector('.deadline.founding-open')?.innerHTML).toBe('Founding prices end %%founding-closes%%.');
    expect(team.querySelector('p.act-closed')?.innerHTML).toBe('Founding prices ended %%founding-closes%%. Join the waitlist to hear what’s next.');
    expect(all(team, 'a.act-closed').map((a) => a.getAttribute('href'))).toEqual(['#waitlist']);
    // Insiders has no founding price.
    expect(offer.getElementById('plan-membership')!.querySelector('.act-closed, .deadline')).toBeNull();
  });

  it('switches the Accelerator to the waitlist when its 15 seats are sold', () => {
    const acc = offer.getElementById('plan-cohort')!;
    expect(text(acc.querySelector('p.act-soldout'))).toBe('All 15 founding seats are taken. Join the waitlist to hear first about the next cohort.');
    expect(all(acc, 'a.act-soldout').map((a) => a.getAttribute('href'))).toEqual(['#waitlist']);
    expect(all(offer, '.act-soldout').every((el) => el.closest('#plan-cohort'))).toBe(true);
  });

  it('sends a team over 40 agents to a conversation', () => {
    const note = offer.getElementById('plan-agents')!.querySelector('.note');
    expect(text(note)).toBe('Over 40 agents? Let’s talk.');
    expect(note?.querySelector('a')?.getAttribute('href')).toBe('%%team-call%%');
  });

  it('keeps the waitlist form, posting with no script, and its consent line word for word', () => {
    const form = offer.querySelector<HTMLFormElement>('#waitlist-form')!;
    expect([form.getAttribute('method'), form.getAttribute('action')]).toEqual(['post', '/api/offer/waitlist']);
    expect(text(offer.querySelector('.consent'))).toBe(
      'By joining, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
    );
    expect(offer.querySelector('input[name="src"]')?.getAttribute('value')).toBe('%%src%%');
  });

  it('has no site checkout: no form posts to /api/checkout, and no link leaves for Stripe but a token', () => {
    expect(offer.querySelector('form[action="/api/checkout"]')).toBeNull();
    expect(renderOfferBody()).not.toMatch(/stripe\.com/);
    expect([...renderOfferBody().matchAll(TOKEN_PATTERN)].length).toBeGreaterThan(10);
  });

  it('says when logins go out, in two versions, and names support', () => {
    expect(all(offer, '.after .invites-held, .after .invites-sent').map((s) => s.innerHTML)).toEqual([
      'Your welcome email and login come on %%login-day%%.',
      'Your welcome email and login come by email.',
    ]);
    expect(offer.querySelector('.foot-contact a')?.getAttribute('href')).toBe(`mailto:${HELP_EMAIL}`);
    expect(HELP_EMAIL).toBe('support@amplifiedimpact.io');
  });
});

describe('the facts (docs/SPRING-PLAN.md, "Facts to use everywhere")', () => {
  const card = (id: string) => text(offer.getElementById(`plan-${id}`));

  it('prices the Accelerator at $7,500 founding, or 2 payments of $3,750, then $9,997, with its dates', () => {
    const c = card('cohort');
    for (const s of ['$7,500 founding price', 'Or 2 payments of $3,750.', '$9,997', '15 founding seats', 'Follow Up Boss', 'Wednesday, December 2.', 'February 3', 'December 23 or 30', 'Tuesday, May 4, 2027', '$197 a month', '90 minutes', '60 minutes']) {
      expect(c, s).toContain(s);
    }
  });

  it('shows Amplified Insiders for one year first, then monthly, in the checkout\'s own words', () => {
    const c = card('membership');
    // One year, then monthly: never "a year", which would read as a price that renews every year.
    expect(text(offer.querySelector('#plan-membership .figure'))).toBe('$1,997 today for one year');
    expect(c).not.toMatch(/\$1,997 a year|per year|annual/i);
    expect(c.indexOf('$1,997')).toBeLessThan(c.indexOf('Or $197 a month'));
    for (const s of ['2 months free', 'After your year, $197 a month unless you cancel with 30 days’ notice.', 'counts in full toward the Amplified AI Accelerator', '3 month minimum', 'Monthly payments don’t count', '2 new skills every month', 'keep what you’ve downloaded']) {
      expect(c, s).toContain(s);
    }
    expect(OFFERS.membership.button).toBe('Get Amplified Insiders');
  });

  it('names each plan exactly on its button, as the cart and the LMS name it (the overnight brief)', () => {
    for (const plan of PLANS) expect(OFFERS[plan].button, plan).toMatch(new RegExp(`^Get ${PLAN_NAMES[plan]}(,|$)`));
  });

  it('prices the Team Plan’s first 3 months today, then monthly from Sunday, April 4, 2027', () => {
    const c = card('agents');
    for (const s of ['$1,491 today, up to 15 agents', '$2,391 today for 16 to 40 agents', 'January 4 to April 3, 2027', '$497 or $797 a month, starting Sunday, April 4, 2027', 'the week of January 4', 'December 14', 'December 17']) {
      expect(c, s).toContain(s);
    }
  });

  it('never says what the old offer said, never "Forum", and never hides a price', () => {
    expect(pageText).not.toMatch(/forum/i);
    expect(pageText).not.toMatch(/skill library|skills library|\$2,000|nothing (is )?charged|January 26|Tuesday, December 1\b|December 1\b|May 3\b|day 31|software|10 founding/i);
    expect(pageText).not.toMatch(/price shows|payment page/i);
  });
});

describe('/offer/welcome markup', () => {
  it('has a thank-you section per plan, then the pending and unknown states, one h1 each', () => {
    expect(all(welcome, 'section').map((s) => s.className)).toEqual([
      'w-thanks t-cohort',
      'w-thanks t-membership',
      'w-thanks t-agents',
      'w-thanks t-agent_plan',
      'w-pending',
      'w-unknown',
    ]);
    for (const s of all(welcome, 'section')) expect(s.querySelectorAll('h1')).toHaveLength(1);
    // The Amplified Agent Plan's (D-114): no receipt, nothing charged until January 4, and no intake form.
    const agent = welcome.querySelector('.t-agent_plan')!;
    expect(text(agent.querySelector('h1'))).toBe('Welcome to the Amplified Agent Plan.');
    expect(text(agent)).toContain('Your first charge is Monday, January 4, 2027, when your agent skills open.');
    expect(text(agent)).not.toMatch(/receipt|intake/i);
    expect(readFileSync(resolve(HERE, './offer.css'), 'utf8')).toContain(`[data-product='agent_plan'] .t-agent_plan`);
    const shell = readFileSync(resolve(HERE, '../../offer-welcome.html'), 'utf8');
    expect(shell).toContain('data-state="%%welcome-state%%" data-product="%%product%%" data-invites="%%invites%%" data-intake="%%intake-state%%" data-calendar="%%calendar-state%%"');
  });

  it('gives every thank-you page the login note and the intake form, and the page the support email once', () => {
    for (const id of PLANS) {
      const s = welcome.querySelector(`.t-${id}`)!;
      expect(s.querySelector('.invites-held')?.innerHTML, id).toBe('Your welcome email and login come on %%login-day%%.');
      const intake = s.querySelector('.intake-link a');
      expect([intake?.getAttribute('href'), intake?.getAttribute('target')], id).toEqual(['%%intake-url%%', '_blank']);
    }
    expect(all(welcome, 'a[href^="mailto:"]').map((a) => [a.closest('footer') !== null, a.getAttribute('href')])).toEqual([[true, `mailto:${HELP_EMAIL}`]]);
  });

  it('offers calendar buttons for the builds and office hours each offer has, and an email line without them', () => {
    const cal = (id: string) => all(welcome, `.t-${id} .cal-links a`).map((a) => [text(a), a.getAttribute('href')]);
    expect(cal('cohort')).toEqual([
      ['Add Builds to Calendar', '%%calendar-builds%%'],
      ['Add Office Hours to Calendar', '%%calendar-office-hours%%'],
    ]);
    expect(cal('membership')).toEqual([['Add Office Hours to Calendar', '%%calendar-office-hours%%']]);
    expect(cal('agents')).toEqual([['Add Office Hours to Calendar', '%%calendar-office-hours%%']]);
    for (const id of PLANS) expect(text(welcome.querySelector(`.t-${id} .cal-email`)), id).toBe('Your calendar invites come by email.');
  });

  it('tells each buyer what happens next in the plan’s own dates', () => {
    const t = (id: string) => text(welcome.querySelector(`.t-${id}`));
    expect(t('cohort')).toContain('Tuesday, May 4, 2027');
    expect(t('cohort')).toContain('Thursday, December 10');
    expect(t('membership')).toContain('counts in full toward the Amplified AI Accelerator');
    expect(t('membership')).toContain('After your year, it’s $197 a month unless you cancel with 30 days’ notice.');
    expect(t('agents')).toContain('starter path');
    expect(t('agents')).toContain('January 4 to April 3, 2027');
    expect(t('agents')).toContain('Monthly billing starts Sunday, April 4, 2027');
  });
});

describe('the words (house rules and Spring’s voice)', () => {
  const words = copy();

  it('has no em dash, no exclamation mark and no slop word', () => {
    const bad = words.filter((w) => /[—–!]|\b(unlock|seamless|simply|honest(ly)?|game.?changer|supercharge)\b/i.test(w));
    expect(bad).toEqual([]);
  });

  it('writes buttons in Title Case, seven words at most', () => {
    const buttons = [
      ...PLANS.map((o) => OFFERS[o].button),
      WAITLIST.submit,
      THANKS_PARTS.intakeButton,
      THANKS_PARTS.calendar.builds,
      THANKS_PARTS.calendar.officeHours,
      WELCOME.back,
    ];
    for (const b of buttons) {
      expect(b.split(' ').length, b).toBeLessThanOrEqual(7);
      expect(b, b).toMatch(/^[A-Z][a-z]+,?( (to|in|for|the|of|[A-Z0-9][A-Za-z0-9-]*,?))*$/);
    }
  });

  it('keeps each offer to three to seven plain lines and a short line about who it is for', () => {
    for (const o of PLANS) {
      expect(OFFERS[o].lines.length).toBeGreaterThanOrEqual(3);
      expect(OFFERS[o].lines.length).toBeLessThanOrEqual(7);
      expect(OFFERS[o].forWho.split(' ').length).toBeLessThanOrEqual(15);
    }
  });

  it('keeps sentences short: none over 30 words', () => {
    const sentences = words.flatMap((w) => w.split(/(?<=[.?])\s+/));
    const long = sentences.filter((s) => s.split(/\s+/).length > 30);
    expect(long).toEqual([]);
  });

  it('keeps the page under 1,000 words', () => {
    const body = offer.body.textContent ?? '';
    expect(body.replace(/%%[^%]+%%/g, '').split(/\s+/).filter(Boolean).length).toBeLessThan(1000);
  });
});

describe('the stylesheet (mobile first)', () => {
  const css = readFileSync(resolve(HERE, './offer.css'), 'utf8');

  it('sets no text under 16px', () => {
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
  });

  it('keeps buttons and plain links a thumb’s height', () => {
    expect(css).toMatch(/\.button \{[^}]*min-height: 48px;/);
    expect(css).toMatch(/\.more \{[^}]*min-height: 44px;/);
  });

  it('draws a visible focus ring and honors reduced motion', () => {
    expect(css).toMatch(/:focus-visible \{\s*outline: 2px solid var\(--action-primary\);/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
