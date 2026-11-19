import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_SKILLS_FROM, CARD_CARTS, PLAN_NAMES, TOKEN_PATTERN } from '@ai/core/offer';
import { HOME } from '../home/content';
import { OFFERS } from '../offer/content';
import { AGENT_PLAN } from '../site/offers-content';
import { AGENTS_GET, TEAMS_FAQ, TIERS } from './content';
import { renderBody, renderHead, renderTeamsBody, renderTeamsHead } from './render';
import { EXAMPLES_ON } from './examples';

// /teams, the Amplified Team Plan's sales page (D-113), on the parsed DOM: Spring's outline in her
// order, the three sizes and their carts, the dates the checkout already states, and the house rules.
// That the API serves it at `/teams`, filled, is `apps/api/test/offer.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const html = `<!doctype html><html lang="en"><head>${renderTeamsHead()}</head><body>${renderTeamsBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

describe('the page', () => {
  it('is what the site plugin builds, with its canonical address, its shell and only the kit’s script', () => {
    expect(renderHead).toBe(renderTeamsHead);
    expect(renderBody()).toBe(renderTeamsBody());
    expect(text($('title'))).toBe('Amplified Team Plan · Amplified Impact');
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/teams');
    const shell = read('../../teams.html');
    expect(shell).toContain(
      '<body class="aiw" data-theme="dark" data-app-ready="true" data-founding="%%founding%%" data-invites="%%invites%%">',
    );
    expect([...shell.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0])).toEqual([
      '<script type="module" src="/src/kit/client/main.ts">',
    ]);
    expect(html).not.toMatch(/<script/i);
    expect(shell + html).not.toMatch(/\son[a-z]+=/i);
  });

  it('runs in Spring’s order: the hero, the sizes, what agents and the owner get, joining and billing, questions, the buttons', () => {
    expect($$('h1').map(text)).toEqual(['Let us train your team.']);
    expect($$('main h2').map(text)).toEqual([
      // The mockup's proof section after the hero: /team-build's live words for it.
      'The Utah Life Real Estate Group',
      'Pick your team size',
      'What your agents get',
      'What you get as the owner',
      'How your agents join',
      'How billing works',
      'Questions',
      'Ready to train your team?',
    ]);
    expect([text($('.proof-line span')), text($('.proof-line strong'))]).toEqual([HOME.proof.label, HOME.proof.figure]);
  });

  it('counts down to the founding deadline, and says the waitlist after it', () => {
    expect(text($('.teams-founding.founding-open'))).toBe(
      '%%countdown%% at founding prices. They end %%founding-closes%%.',
    );
    expect(text($('.teams-founding.founding-closed'))).toBe(
      'Founding prices ended %%founding-closes%%. Join the waitlist to hear what’s next.',
    );
  });
});

describe('the three sizes', () => {
  const tiers = $$('.tier');

  it('sell up to 15 and 16 to 40 through their carts, and send over 40 to a conversation', () => {
    expect(tiers.map((t) => text($('.plan-name', t)))).toEqual([
      'Up to 15 agents',
      '16 to 40 agents',
      'Over 40 agents',
    ]);
    expect(CARD_CARTS.agents).toEqual(['agents-upto15', 'agents-16to40']);
    expect(tiers.map((t) => t.getAttribute('data-state'))).toEqual([
      '%%state:agents-upto15%%',
      '%%state:agents-16to40%%',
      'link',
    ]);
    expect(tiers.map((t) => $$('.act-link a', t).map((a) => [text(a), a.getAttribute('href')]))).toEqual([
      [[`Get ${PLAN_NAMES.agents}`, '%%link:agents-upto15%%']],
      [[`Get ${PLAN_NAMES.agents}`, '%%link:agents-16to40%%']],
      [['Let’s Talk', '%%team-call%%']],
    ]);
    // Two buttons with the same words: each one says which size it buys.
    for (const t of tiers) expect($('.act-link a', t)?.getAttribute('aria-describedby')).toBe(`${t.id}-name`);
  });

  it('put the proof line right under the two paid sizes’ buy buttons, and leave Over 40 its conversation', () => {
    const proof = 'Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year';
    expect(tiers.map((t) => $$('.act-link .proof-line', t).map(text))).toEqual([[proof], [proof], []]);
    for (const t of tiers.slice(0, 2))
      expect($('.act-link .proof-line', t)!.previousElementSibling?.matches('a.btn-primary'), t.id).toBe(true);
    expect($('#size-more .act-link a')?.getAttribute('href')).toBe('%%team-call%%');
  });

  it('price the first 3 months today and the monthly price after, exactly as /offer and the checkout do', () => {
    const offer = [OFFERS.agents.price.amount, ...OFFERS.agents.price.terms].join(' ');
    expect(tiers.slice(0, 2).map((t) => text($('.amount', t)))).toEqual(['$1,491', '$2,391']);
    for (const n of ['$1,491', '$2,391', '$497', '$797', 'January 4 to April 3, 2027', 'Sunday, April 4, 2027']) {
      expect(offer, n).toContain(n);
      expect(text($('.sizes')), n).toContain(n);
    }
    expect(text($('.plan-actions', tiers[2]!))).not.toMatch(/waitlist/i);
  });

  it('close the two founding sizes after November 30: the waitlist instead', () => {
    for (const t of tiers.slice(0, 2)) {
      expect(text($('p.act-closed', t))).toBe(
        'Founding prices ended %%founding-closes%%. Join the waitlist to hear what’s next.',
      );
      expect($('a.act-closed', t)?.getAttribute('href')).toBe('/offer#waitlist');
    }
  });

  it('name the monthly owner call only on the 16 to 40 size', () => {
    expect(tiers.map((t) => $$('.tier-owner li', t).some((li) => /monthly owner call/.test(text(li))))).toEqual([
      false,
      true,
      false,
    ]);
  });
});

describe('what agents and the owner get, and how agents join', () => {
  it('gives an agent on a team exactly what the Amplified Agent Plan gives a solo agent', () => {
    expect(AGENTS_GET.lines.slice(0, 1)).toEqual(AGENT_PLAN.lines.slice(0, 1));
    expect(text($('.gets'))).toContain('The same as the Amplified Agent Plan.');
    expect(text($('.gets'))).toContain('Weekly office hours, Thursdays at 12:00 PM MT / 1:00pm CT, 60 minutes');
    expect($$('.rotation li').map(text)).toEqual([
      'Week 1: Leads and follow-up',
      'Week 2: Listings',
      'Week 3: Buyers and contracts',
      'Week 4: Content and your week',
    ]);
  });

  it('opens agents’ skills on Monday, December 14, as the plan’s access does', () => {
    expect(new Date(AGENTS_SKILLS_FROM).toISOString()).toBe('2026-12-14T06:00:00.000Z');
    expect(text($('.steps'))).toContain('Monday, December 14');
    expect(text($('.steps'))).toContain('The week of January 4');
  });

  it('says when the login comes, before and after the November 16 hold', () => {
    const first = $('.steps li')!;
    expect(text($('.invites-held', first))).toBe('Your login comes by email on %%login-day%%.');
    expect(text($('.invites-sent', first))).toBe('Your login comes by email within a few minutes.');
  });
});

describe('the questions and the end', () => {
  it('asks the owner’s questions, with the waitlist and the agreement', () => {
    expect($$('.faq summary').map(text)).toEqual(TEAMS_FAQ.items.map((f) => f.q));
    expect($$('.faq a').map((a) => a.getAttribute('href'))).toEqual(['/offer#waitlist', '/agreement']);
  });

  it('ends on the sizes and the conversation for over 40', () => {
    expect($$('.end a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Pick Your Team Size', '#sizes'],
      ['Let’s talk', '%%team-call%%'],
    ]);
    expect(TIERS.items.map((t) => t.id)).toContain('size-more');
  });

  it('put the proof line right under the closing Pick Your Team Size button', () => {
    const proof = $('.end .actions > a.btn + .proof-line')!;
    expect([text($('span', proof)), text($('strong', proof))]).toEqual([
      'Built inside The Utah Life Real Estate Group',
      '100 agents, 700+ homes a year',
    ]);
    expect(text(proof.previousElementSibling)).toBe('Pick Your Team Size');
    expect(proof.previousElementSibling?.getAttribute('href')).toBe('#sizes');
    expect($$('.teams-hero .proof-line')).toHaveLength(1);
  });

  it('keeps the slider an enhancement: hidden with no script, all three sizes and their links in the markup', () => {
    const sizer = $('[data-sizer]')!;
    expect(sizer.hasAttribute('hidden')).toBe(true);
    expect($$('[data-max]', sizer).map((p) => [p.getAttribute('data-tier'), p.getAttribute('data-max')])).toEqual([
      ['size-15', '15'],
      ['size-40', '40'],
      ['size-more', '41'],
    ]);
    expect($$('a', sizer)).toHaveLength(0);
    expect($$('.tier .act-link a').map((a) => a.getAttribute('href'))).toEqual([
      '%%link:agents-upto15%%',
      '%%link:agents-16to40%%',
      '%%team-call%%',
    ]);
    expect(html).not.toMatch(/per agent a month/i);
  });

  it('keeps the made-up illustrations off, and when on, tags them and keeps them clear of the sizes', () => {
    expect(EXAMPLES_ON).toBe(false);
    expect(html).not.toContain('Made-up example');
    const on = new DOMParser().parseFromString(renderTeamsBody({ examples: true }), 'text/html');
    expect(on.querySelectorAll('.usage, .jp-stack')).toHaveLength(2);
    expect([...on.querySelectorAll('.ex-tag')].map((t) => t.textContent)).toEqual([
      'Made-up example',
      'Made-up example',
    ]);
    for (const el of on.querySelectorAll('.usage, .jp-stack')) expect(el.closest('#sizes, .plan')).toBeNull();
  });
});

describe('the share tags', () => {
  it('carry the title, description, canonical address and the branded share image, as a large card', () => {
    const meta = (sel: string) => $(sel)?.getAttribute('content');
    expect(text($('title'))).toBe('Amplified Team Plan · Amplified Impact');
    expect(meta('meta[name="description"]')?.length).toBeGreaterThan(50);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/teams');
    expect(meta('meta[property="og:url"]')).toBe('https://www.amplifiedimpact.io/teams');
    expect(meta('meta[property="og:image"]')).toBe('https://www.amplifiedimpact.io/img/og/amplified-impact.png');
    expect([
      meta('meta[property="og:image:width"]'),
      meta('meta[property="og:image:height"]'),
      meta('meta[property="og:image:alt"]'),
    ]).toEqual(['1200', '630', 'Amplified Impact']);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  });
});

describe('the words and the tokens', () => {
  const words = text(doc.body) + ' ' + renderTeamsHead();

  it('follow the house rules', () => {
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|\bearn(s|ings)?\b|10x|close more|more deals|!/i);
    expect(words).not.toMatch(/nothing is charged today|January 26/i);
  });

  it('uses only tokens the API fills', () => {
    const known = new Set(['founding', 'founding-closes', 'countdown', 'invites', 'login-day', 'team-call']);
    for (const [, name] of html.matchAll(TOKEN_PATTERN)) {
      expect(known.has(name!) || /^(state|link):agents-(upto15|16to40)$/.test(name!), name).toBe(true);
    }
  });

  it('keeps text legible on a phone', () => {
    const css = read('./teams.css') + read('../kit/kit.css');
    expect(read('./teams.css')).toContain("@import '../kit/kit.css';");
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});

describe('never hidden (Ampy’s rule)', () => {
  it('puts no buy button, payment link, plan actions, seat counter or proof line inside a reveal or a fade', () => {
    const held = '.rv, .fade-1, .fade-2, .fade-3';
    const buying = [
      ...doc.querySelectorAll(
        'a[href*="buy.stripe.com"], a[href^="%%link:"], .plan-actions, .seatm, .tk-seats, .proof-line',
      ),
    ];
    expect(buying.length).toBeGreaterThan(6);
    for (const el of buying) expect(el.closest(held), el.outerHTML.slice(0, 80)).toBeNull();
  });
});
