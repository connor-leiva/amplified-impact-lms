import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, PLAN_NAMES, TOKEN_PATTERN } from '@ai/core/offer';
import { FOUNDING_TOKENS } from '@ai/core/founding';
import { ENTRIES } from '../library/content';
import { HOME } from '../home/content';
import { OFFERS } from '../offer/content';
import { AGENT_PLAN, CARD_IDS } from '../site/offers-content';
import { COMPARE, END, FAQ, PICKER, PRICING_HERO } from './content';
import { CARD_NAMES, CARD_ORDER, renderBody, renderHead, renderPricingBody, renderPricingHead, WAITLIST_HREF } from './render';

// /pricing, Programs and Pricing (D-111), on the parsed DOM: Spring's seven parts in her order, the
// four cards' facts, the states the API fills, and the house rules. That the API serves it at
// `/pricing`, filled, is `apps/api/test/marketing.test.ts`'s and `offer.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const html = `<!doctype html><html lang="en"><head>${renderPricingHead()}</head><body>${renderPricingBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

describe('the page', () => {
  it('is what the site plugin builds, with its canonical address and the site nav marking Programs', () => {
    expect([renderHead, renderBody]).toEqual([renderPricingHead, renderPricingBody]);
    expect(text($('title'))).toBe('Programs and Pricing · Amplified Impact');
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/pricing');
    expect(text($('nav[aria-label="Main"] [aria-current="page"]'))).toBe('Programs');
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
  });

  it('has its shell, with the states on <body> and no script anywhere', () => {
    const shell = read('../../pricing.html');
    expect(shell).toContain('<!--x:head-->');
    expect(shell).toContain('<!--x:body-->');
    expect(shell).toContain('data-founding="%%founding%%" data-seats="%%seats%%"');
    expect(shell).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<script/i);
  });

  it('runs in Spring’s order: headline, picker, founding banner, four cards, comparison, questions, the last line', () => {
    expect($$('h1').map(text)).toEqual([PRICING_HERO.title]);
    expect($$('main h2').map(text)).toEqual([PICKER.heading, 'Four ways in', COMPARE.heading, FAQ.heading, END.heading]);
    const order = ['class="picker"', 'class="founding ', 'class="section plans"', 'class="section compare"', 'class="section faq"', 'class="section end"'].map((s) => html.indexOf(s));
    expect(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1]!)), String(order)).toBe(true);
    expect([text($('.proof-line span')), text($('.proof-line strong'))]).toEqual([HOME.proof.label, HOME.proof.figure]);
  });
});

describe('the picker', () => {
  it('has three buttons, each one scrolling to its card', () => {
    const picks = $$('.pick');
    expect(picks.map((a) => text(a.querySelector('.pick-label')))).toEqual(['I’m an Agent', 'I Own a Team', 'I Just Want the Skills']);
    for (const a of picks) expect($(a.getAttribute('href')!), a.getAttribute('href')!).not.toBeNull();
    expect(picks.map((a) => a.getAttribute('href'))).toEqual([`#${CARD_IDS.agentPlan}`, `#${CARD_IDS.cohort}`, `#${CARD_IDS.membership}`]);
  });

  it('keeps the homepage’s link to Amplified Insiders landing on its card', () => {
    const fromHome = HOME.ways.cards.find((c) => c.name === 'Amplified Insiders')!.button.href;
    expect(fromHome).toBe('/pricing#insiders');
    expect($('#insiders .plan-name')?.textContent).toBe(PLAN_NAMES.membership);
  });
});

describe('the founding banner', () => {
  it('counts down to the deadline and shows the seats left, all filled per request', () => {
    const banner = $('.founding')!;
    expect(banner.classList.contains('founding-open')).toBe(true);
    expect(text($('.countdown', banner))).toBe(FOUNDING_TOKENS.countdown);
    expect(text(banner)).toContain('Founding prices end %%founding-closes%%.');
    expect(text($('.seats-left', banner))).toBe('%%seats-left%% of %%seats-total%% Amplified AI Accelerator seats left.');
    expect(text($('.seats-soldout', banner))).toBe('All Amplified AI Accelerator founding seats are taken.');
  });
});

describe('the four cards', () => {
  const cards = $$('.plan');

  it('are the four programs, by their exact names, in Spring’s order', () => {
    expect(cards.map((c) => text($('.plan-name', c)))).toEqual([
      'Amplified AI Accelerator',
      'Amplified Agent Plan',
      'Amplified Team Plan',
      'Amplified Insiders',
    ]);
    expect(CARD_ORDER.map((c) => CARD_NAMES[c])).toEqual(cards.map((c) => text($('.plan-name', c))));
  });

  it('answer the same five things in the same order, then the office hours and the free skills', () => {
    for (const c of cards) {
      expect($$('.fact dt', c).map(text), c.id).toEqual(['Who it’s for', 'What you get', 'How it runs', 'When it starts']);
      expect($('.price .amount', c), c.id).not.toBeNull();
      expect(text($('.every', c))).toBe('Every program includes weekly office hours.');
      expect(text($('.not-ready', c))).toBe('Not ready? Start with 5 free skills.');
      expect($('.not-ready a', c)?.getAttribute('href')).toBe('/library?show=free');
    }
  });

  it('say /offer’s words for the three plans it sells, so the two pages cannot disagree', () => {
    for (const [plan, id] of [['cohort', 'accelerator'], ['agents', 'team-plan'], ['membership', 'insiders']] as const) {
      const card = $(`#${id}`)!;
      expect(text($('.fact dd', card))).toBe(OFFERS[plan].forWho);
      expect($$('.lines li', card).map(text)).toEqual([...OFFERS[plan].lines]);
      expect(text($('.price .amount', card))).toBe(OFFERS[plan].price.amount);
    }
  });

  it('sell each plan through its first cart’s link, one button each, named exactly', () => {
    for (const [plan, id] of [['cohort', 'accelerator'], ['agents', 'team-plan'], ['membership', 'insiders']] as const) {
      const card = $(`#${id}`)!;
      const [first, ...rest] = CARD_CARTS[plan]!;
      expect(card.getAttribute('data-state')).toBe(`%%state:${first}%%`);
      expect($$('.act-link .btn', card).map((b) => [text(b), b.getAttribute('href')])).toEqual([[OFFERS[plan].button, `%%link:${first}%%`]]);
      expect(text($('.act-link .btn', card))).toMatch(new RegExp(`^Get ${PLAN_NAMES[plan]}$`));
      expect($$('.act-link .more', card).map((a) => a.getAttribute('href'))).toEqual(rest.map((r) => `%%link:${r}%%`));
    }
  });

  it('show the Amplified Agent Plan’s price and terms, and "Opens soon." until its carts are wired (D-114)', () => {
    const card = $('#agent-plan')!;
    expect(text($('.figure', card))).toBe('$79 a month');
    expect($$('.price .terms', card).map(text)).toEqual(['Or $790 a year.', 'Your first charge is Monday, January 4, 2027.', 'Cancel anytime.']);
    expect(card.getAttribute('data-state')).toBe('soon');
    expect($('.act-link', card)).toBeNull();
    expect(text($('.act-soon', card))).toBe('Opens soon.');
    expect(AGENT_PLAN.button).toBe('Get Amplified Agent Plan');
    expect(text(card)).toContain('Weekly training starts the week of January 4.');
  });

  it('close the founding prices on Nov 30: the Accelerator’s $9,997 and the waitlist, the Team Plan’s waitlist', () => {
    const acc = $('#accelerator')!;
    expect(text($('.price.founding-closed', acc))).toBe('$9,997 next cohort');
    expect($$('.act-closed', acc).map((e) => e.tagName)).toEqual(['P', 'A']);
    expect($$('.act-soldout', acc).map((e) => e.tagName)).toEqual(['P', 'A']);
    const team = $('#team-plan')!;
    expect(text($('.deadline.founding-open', team))).toBe('Founding prices end %%founding-closes%%.');
    for (const a of $$('a.act-closed, a.act-soldout')) expect(a.getAttribute('href')).toBe(WAITLIST_HREF);
    expect(text($('#accelerator .note'))).toBe('Requires Follow Up Boss. On another CRM? Join the waitlist.');
    expect($('#team-plan .note a')?.getAttribute('href')).toBe('%%team-call%%');
  });
});

describe('the comparison table', () => {
  const table = $('.compare-table')!;

  it('has a column per program and Spring’s eight rows', () => {
    expect($$('thead th', table).slice(1).map(text)).toEqual(CARD_ORDER.map((c) => CARD_NAMES[c]));
    expect($$('tbody th', table).map(text)).toEqual(['Skills included', 'Live training', 'Office hours', 'Owner view', 'Owner call', 'Starts', 'Price', 'Commitment']);
    for (const row of $$('tbody tr', table)) expect($$('td', row)).toHaveLength(4);
  });

  it('names each cell’s program for the stacked phone view, and never marks with a symbol alone', () => {
    for (const row of $$('tbody tr', table)) expect($$('td', row).map((td) => td.getAttribute('data-label'))).toEqual(CARD_ORDER.map((c) => CARD_NAMES[c]));
    for (const m of $$('.mark-yes', table)) expect(text(m)).toBe('Included');
    for (const m of $$('.mark-no', table)) expect(text(m)).toBe('Not included');
    expect($$('.mark-yes svg', table).every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('switches the founding prices with the page', () => {
    const price = $$('tbody tr', table).find((r) => text($('th', r)) === 'Price')!;
    expect($$('td .founding-open', price).map(text)).toEqual(['$7,500 founding price', '$1,491 today for 3 months, up to 15 agents']);
    expect($$('td .founding-closed', price).map(text)).toEqual(['$9,997, next cohort', 'Waitlist']);
  });
});

describe('the questions', () => {
  it('are Spring’s seven, in her order, each one open and close with no script', () => {
    expect($$('.faq summary').map(text)).toEqual([
      'Do I need Claude or ChatGPT?',
      'Which plan do I need?',
      'What if I join mid-month?',
      'Can I cancel?',
      'Do I need Follow Up Boss?',
      'What’s the refund policy?',
      'Can I buy one skill?',
    ]);
    expect($$('.faq details')).toHaveLength(7);
  });

  it('answer from the Library’s own cards: most skills run in Claude or ChatGPT', () => {
    const both = ENTRIES.filter((e) => e.tools.includes('claude') && e.tools.includes('chatgpt')).length;
    expect(both).toBeGreaterThan(ENTRIES.length / 2);
    for (const name of ['Perfect Week', 'Inbox and Meeting Follow-Through']) {
      expect(ENTRIES.find((e) => e.title === name)?.tools, name).toEqual(['claude']);
    }
  });

  it('point to the agreement for refunds rather than restating it', () => {
    const refund = $$('.faq li').find((li) => text($('summary', li)) === 'What’s the refund policy?')!;
    expect($('a', refund)?.getAttribute('href')).toBe('/agreement');
  });
});

describe('the last line', () => {
  it('is Spring’s, with the free skills button', () => {
    expect(text($('.end h2'))).toBe('Not ready? Start with 5 free skills.');
    expect($$('.end a').map((a) => [text(a), a.getAttribute('href')])).toEqual([['Get 5 Free Skills', '/library?show=free']]);
  });
});

describe('the words and the tokens', () => {
  const words = text(doc.body) + ' ' + renderPricingHead();

  it('follow the house rules: no em dashes, no “Forum”, no testimonials, no results promises', () => {
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|\bearn(s|ings)?\b|\broi\b|10x|close more|more deals/i);
    expect(words).not.toMatch(/price shows on the payment page/i);
    expect(words).not.toMatch(/!/);
  });

  it('uses only tokens the API fills', () => {
    const known = new Set(['founding', 'founding-closes', 'team-call', 'seats', 'countdown', 'seats-left', 'seats-total']);
    for (const [, name] of html.matchAll(TOKEN_PATTERN)) {
      expect(known.has(name!) || /^(state|link):(cohort-full|cohort-two-pay|insiders-year|insiders-monthly|agents-upto15|agents-16to40)$/.test(name!), name).toBe(true);
    }
  });
});

describe('the stylesheet', () => {
  const css = read('./pricing.css') + read('../site/offers.css') + read('../site/site.css');

  it('keeps text legible on a phone and taps thumb-sized', () => {
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
    expect(css).toMatch(/\.faq-list summary \{[^}]*min-height: 56px;/);
    expect(css).toMatch(/\.pick \{[^}]*min-height: 64px;/);
  });

  it('shows each state only when the API says so', () => {
    expect(css).toMatch(/body\[data-founding='closed'\] \.founding-open/);
    expect(css).toMatch(/body\[data-seats='soldout'\] \.seats-left/);
    expect(css).toMatch(/\.plan\[data-state='link'\] \.act-link/);
    expect(css).toMatch(/\.plan a\[href=''\]/);
  });
});
