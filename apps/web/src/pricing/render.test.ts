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
    expect(text($('nav[aria-label="Main"] details[data-current] summary'))).toBe('Programs');
    expect($$('nav[aria-label="Main"] [aria-current="page"]').map(text)).toEqual(['Compare All Programs']);
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

  it('takes an owner to both of an owner’s cards: the button to the Accelerator, a link to the Team Plan', () => {
    const owner = $$('.pick-list > li')[1]!;
    expect(text($('.pick-label', owner))).toBe('I Own a Team');
    expect([text($('.pick-hint', owner)), $('a.pick', owner)?.getAttribute('href')]).toEqual(['Amplified AI Accelerator', `#${CARD_IDS.cohort}`]);
    const also = $('a.pick-also', owner)!;
    expect([text(also), also.getAttribute('href')]).toEqual(['Or the Amplified Team Plan', `#${CARD_IDS.agents}`]);
    expect($(also.getAttribute('href')!)?.querySelector('.plan-name')?.textContent).toBe(PLAN_NAMES.agents);
    // The other two choices have one target each, and the cards keep Spring's order.
    expect($$('a.pick-also')).toHaveLength(1);
    expect($$('.plan').map((c) => c.id)).toEqual(['accelerator', 'agent-plan', 'team-plan', 'insiders']);
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

  it('link to each program’s own page, See Full Details, under the button in every state', () => {
    expect(cards.map((c) => [c.id, text($('.plan-actions a.details', c)), $('.plan-actions a.details', c)?.getAttribute('href')])).toEqual([
      ['accelerator', 'See Full Details', '/team-build'],
      ['agent-plan', 'See Full Details', '/agents'],
      ['team-plan', 'See Full Details', '/teams'],
      ['insiders', 'See Full Details', '/library'],
    ]);
    for (const c of cards) {
      const a = $('a.details', c)!;
      // Four links with one name: each says which program it is through its card's heading.
      expect(a.getAttribute('aria-describedby'), c.id).toBe(`${c.id}-name`);
      expect(a.closest('.act-link, .act-soon, .act-closed, .act-soldout'), c.id).toBeNull();
      expect(a.parentElement?.classList.contains('plan-actions'), c.id).toBe(true);
    }
  });

  it('put the proof right under each card’s buy buttons, showing exactly when they do', () => {
    for (const c of cards) {
      const proof = $('.act-link .proof-line', c);
      expect(text(proof), c.id).toBe('Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year');
      expect(text($('strong', proof!)), c.id).toBe('100 agents, 700+ homes a year');
      // After the card's last buy link, inside the block the stylesheet shows only for a live cart.
      expect(proof!.previousElementSibling?.matches('a.btn, a.more'), c.id).toBe(true);
    }
    expect(text($('.pricing-hero .proof-line'))).toBe('Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year');
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

  it('sell the Amplified Agent Plan through its two carts (D-114), saying "Opens soon." until the API knows them', () => {
    const card = $('#agent-plan')!;
    expect(text($('.figure', card))).toBe('$79 a month');
    expect($$('.price .terms', card).map(text)).toEqual(['Or $790 a year.', 'Your first charge is Monday, January 4, 2027.', 'Cancel anytime.']);
    expect(card.getAttribute('data-state')).toBe('%%state:agent-monthly%%');
    expect($$('.act-link a', card).map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get Amplified Agent Plan', '%%link:agent-monthly%%'],
      ['Or pay $790 a year', '%%link:agent-yearly%%'],
    ]);
    // An empty state (a cart the API does not know yet) shows "Opens soon.", never a dead button.
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

  it('links each program’s name to its own page', () => {
    expect($$('thead th a', table).map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Amplified AI Accelerator', '/team-build'],
      ['Amplified Agent Plan', '/agents'],
      ['Amplified Team Plan', '/teams'],
      ['Amplified Insiders', '/library'],
    ]);
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

  it('say single-skill checkout is not open, with no price and no “opens soon”', () => {
    const item = $$('.faq-list li').find((li) => text($('summary', li)) === 'Can I buy one skill?')!;
    expect($$('.answer p', item).map(text)).toEqual([
      'Not right now. Single-skill checkout is not open. If you want every owner and ops skill, Amplified Insiders includes them. Anyone can start with the 5 free skills.',
      'See the Library',
    ]);
    expect($('.answer a', item)?.getAttribute('href')).toBe('/library');
    expect(html).not.toContain('$37');
    expect(html).not.toMatch(/That checkout opens soon/i);
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

describe('the links to the programs’ own pages', () => {
  it('reach /team-build, /teams and /agents from the page itself, not only from the nav and footer', () => {
    const hrefs = new Set($$('main a').map((a) => a.getAttribute('href')));
    for (const page of ['/team-build', '/teams', '/agents', '/library']) expect(hrefs.has(page), page).toBe(true);
    for (const page of ['/team-build', '/teams', '/agents']) {
      expect($(`header nav[aria-label="Main"] a[href="${page}"]`), `nav ${page}`).not.toBeNull();
      expect($(`footer nav[aria-label="Programs"] a[href="${page}"]`), `footer ${page}`).not.toBeNull();
    }
  });

  it('leave the buttons and prices as they were', () => {
    expect($$('.plan .act-link .btn').map((b) => b.getAttribute('href'))).toEqual(['%%link:cohort-full%%', '%%link:agent-monthly%%', '%%link:agents-upto15%%', '%%link:insiders-year%%']);
    expect($$('.plan .price:not(.founding-closed) .amount').map(text)).toEqual(['$7,500', '$79', '$1,491', '$1,997']);
  });
});

describe('the share tags', () => {
  it('carry the title, description, canonical address and Spring’s real headshot, as a large card', () => {
    const meta = (sel: string) => $(sel)?.getAttribute('content');
    expect(text($('title'))).toBe('Programs and Pricing · Amplified Impact');
    expect(meta('meta[name="description"]')).toMatch(/^Pick the way you want to learn AI\./);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/pricing');
    expect(meta('meta[property="og:url"]')).toBe('https://www.amplifiedimpact.io/pricing');
    expect(meta('meta[property="og:title"]')).toBe('Programs and Pricing · Amplified Impact');
    expect(meta('meta[property="og:image"]')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen.jpg');
    expect([meta('meta[property="og:image:width"]'), meta('meta[property="og:image:height"]'), meta('meta[property="og:image:alt"]')]).toEqual(['890', '1113', 'Spring Bengtzen']);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
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
      expect(known.has(name!) || /^(state|link):(cohort-full|cohort-two-pay|insiders-year|insiders-monthly|agents-upto15|agents-16to40|agent-monthly|agent-yearly)$/.test(name!), name).toBe(true);
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

describe('in the site’s look (`design/site-pricing`)', () => {
  it('opts the page into the look, keeping the attributes the API fills', () => {
    expect(read('../../pricing.html')).toMatch(/<body class="site" data-app-ready="true" data-founding="%%founding%%" data-seats="%%seats%%">/);
    expect(doc.querySelector('section.plans')?.getAttribute('data-theme')).toBe('light');
  });

  it('opens each card with its program’s logo and number, as the homepage’s cards do, and says nothing new', () => {
    const cards = [...doc.querySelectorAll('.plan-grid > li.plan')];
    expect(cards.map((c) => c.firstElementChild?.className)).toEqual(['plan-top', 'plan-top', 'plan-top', 'plan-top']);
    expect(cards.map((c) => c.querySelector('.plan-logo')?.getAttribute('data-program'))).toEqual(['accelerator', 'agent-plan', 'team-plan', 'insiders']);
    for (const c of cards) {
      expect(c.querySelector('.plan-logo svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(c.querySelector('.plan-idx')?.getAttribute('aria-hidden')).toBe('true');
      // The name is still the card's label, right after the top row.
      expect(c.querySelector('.plan-top + h3.plan-name')).not.toBeNull();
    }
    expect(cards.map((c) => text(c.querySelector('.plan-idx')))).toEqual(['01', '02', '03', '04']);
  });
});
