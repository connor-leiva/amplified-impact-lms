import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CART_IDS, COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT } from '@ai/core/offer';
import { ENTRIES } from '../library/content';
import { paid } from '../library/render';
import { WAITLIST_HREF } from '../site/offers';
import { HELP_EMAIL } from '../site/content';
import { fill } from './client/fill';
import { HOME, PAGE } from './content';
import { dollarsIn, PRICES } from './prices';
import { PROGRAMS } from './program-logo';
import { entryFor, liveEntries, renderHomeBody, renderHomeHead } from './render';

// www's homepage, redesigned from Connor's reference (`design/home-redesign`), on the parsed DOM: the
// reference's sections in its order and in its words, the Library's real count, prices read from the
// offer's own words, where every link goes, and the buy buttons waiting for /api/offer. What the script
// does with them is `client/*.test.ts`'s; that the API serves the page at `/` on www only is
// `apps/api/test/marketing.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderHomeHead()}</head><body>${renderHomeBody()}</body></html>`,
  'text/html',
);
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => [...doc.querySelectorAll(selector)];
const meta = (key: string) =>
  doc.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content') ?? null;
const n = liveEntries().length;

describe('the head and the shell', () => {
  it('keeps the page’s title, description, canonical address and share image', () => {
    expect(text($('title'))).toBe('Amplified Impact · AI Coaching and Training for Business Owners and Their Teams');
    expect(meta('description')).toMatch(/^AI coaching and training for business owners and their teams/);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/');
    expect(meta('og:image')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen.jpg');
  });

  it('loads its stylesheet and exactly one script, as a module file (never inline), and the body opts into the page’s look', () => {
    const shell = read('../../home.html');
    expect(shell).toContain('rel="icon" type="image/svg+xml" href="data:image/svg+xml,');
    expect(shell).toContain('<link rel="stylesheet" href="/src/home/home.css" />');
    expect(shell.match(/<script\b[^>]*>/g)).toEqual(['<script type="module" src="/src/home/client/main.ts">']);
    expect(shell).toMatch(/<body class="hp"/);
    expect(renderHomeBody()).not.toMatch(/<script/i);
  });

  it('self-hosts Geist and Geist Mono, with their licence beside them', () => {
    const css = read('./home.css');
    expect(css).toContain("src: url('./fonts/geist-latin-wght-normal.woff2') format('woff2')");
    expect(css).toContain("src: url('./fonts/geist-mono-latin-wght-normal.woff2') format('woff2')");
    for (const f of ['geist-latin-wght-normal.woff2', 'geist-mono-latin-wght-normal.woff2']) {
      const bytes = readFileSync(resolve(HERE, 'fonts', f));
      expect(bytes.subarray(0, 4).toString('latin1'), f).toBe('wOF2');
      expect(bytes.length, f).toBeLessThan(40_000);
    }
    expect(read('./fonts/OFL.txt')).toContain('SIL Open Font License, Version 1.1');
    // No font or stylesheet from anywhere else: § 9.4's `font-src 'self'`.
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|url\(['"]?https?:/);
  });
});

describe('the site’s own header and footer, unchanged', () => {
  it('has the shared nav, Log In and Get 5 Free Skills, and the footer’s legal links and support address', () => {
    const nav = $$('header.site-top nav[aria-label="Main"] a').map((a) => [text(a), a.getAttribute('href')]);
    expect(nav).toEqual(
      expect.arrayContaining([
        ['The Library', '/library'],
        ['Free Resources', '/free'],
        ['About', '/about'],
        ['Log In', 'https://learn.amplifiedimpact.io/login'],
      ]),
    );
    expect([text($('.site-cta')), $('.site-cta')?.getAttribute('href')]).toEqual([
      'Get 5 Free Skills',
      '/library?show=free',
    ]);
    expect($$('footer.site-foot a').map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/agreement', '/terms', '/privacy', `mailto:${HELP_EMAIL}`]),
    );
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
  });
});

describe('the reference’s sections, in its order', () => {
  it('runs hero, Built inside, two ways, Run/Draft/Own, the Library, For Team Owners, Plans and Prices, AI 101', () => {
    expect($$('main > section').map((s) => s.className.split(' ')[1])).toEqual([
      'hero',
      'proof',
      'cmp',
      'dcs',
      'skills',
      'team',
      'plans',
      'start',
    ]);
    expect($$('h1').map(text)).toEqual(['AI that drafts the paperwork. You keep the decisions.']);
    // The offer plan's address is a heading in the reference too, inside the hero.
    expect($$('main h2').map(text)).toEqual([
      '2286 E Pretend Poppy Ln',
      'Use AI as a tool, or run a business where AI does real work.',
      'The AI drafts. You check, then send.',
      'Skills for the work you do this week',
      'Amplified Team Plan',
      'Four ways in',
      'Sounds like you. Looks like you.',
    ]);
  });

  it('opens with the reference’s lead and its two links', () => {
    expect(text($('.hero-lead'))).toBe(PAGE.hero.lead);
    expect($$('.hero-actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Browse the Library', '/library'],
      ['Start AI 101', '/ai101'],
    ]);
  });

  it('draws the made-up offer plan as five real checkboxes, the hint and its words for the script', () => {
    const card = $('[data-offer]')!;
    expect(card.getAttribute('aria-label')).toBe('Offer plan, a made-up example');
    expect(
      $$('.term').map((t) => [
        text(t.querySelector('.term-label')),
        text(t.querySelector('.term-value')),
        t.querySelector('input[type="checkbox"]') !== null,
      ]),
    ).toEqual([
      ['Price', '$562,500', true],
      ['Seller’s contribution', '$5,000', true],
      ['Earnest money', '$5,000', true],
      ['Due diligence', '10 days', true],
      ['Settlement', 'Dec 11, 2026', true],
    ]);
    expect(fill(card.getAttribute('data-hint-some')!, { n: 2, total: 5 })).toBe('2 of 5 checked');
    const sample = read('../../../../skills/offer-strategy/sample.md');
    for (const s of ['$562,500', '$5,000', '2286 E Pretend Poppy Ln', 'December 11']) expect(sample).toContain(s);
  });

  it('has no photos of people: no image in the page at all', () => {
    expect($$('main img')).toHaveLength(0);
  });
});

describe('the Library’s real count', () => {
  it('is counted from the Library’s live cards, in the ticker, the ghosted figure, the intro and See All', () => {
    expect(n).toBe(ENTRIES.filter((e) => e.href !== null).length);
    expect(n).not.toBe(56);
    expect(text($$('.meta-strip li')[0])).toBe(`${n} guides, skills and templates`);
    expect(text($('.big-num'))).toBe(String(n));
    expect(text($('.skills-intro .intro'))).toMatch(
      new RegExp(`^${n} guides, skills and templates for real estate teams\\.`),
    );
    expect([text($('.skills-intro .cta')), $('.skills-intro .cta')?.getAttribute('href')]).toEqual([
      `See All ${n}`,
      '/library',
    ]);
  });

  it('shows four skills per role behind tabs, each a link to its page, named and tagged free by its own card', () => {
    expect($$('[role="tab"]').map(text)).toEqual([
      'Buyer’s agents',
      'Listing agents',
      'Team owners',
      'Content and your week',
    ]);
    expect($$('[role="tabpanel"]').map((p) => p.hasAttribute('hidden'))).toEqual([false, true, true, true]);
    for (const role of PAGE.library.roles) {
      const panel = $(`#hp-panel-${role.id}`)!;
      expect(panel.getAttribute('aria-labelledby')).toBe(`hp-tab-${role.id}`);
      const links = [...panel.querySelectorAll('a.skill')];
      expect(links).toHaveLength(role.slugs.length);
      role.slugs.forEach((slug, i) => {
        const e = entryFor(slug);
        expect(links[i]!.getAttribute('href'), slug).toBe(`/${slug}`);
        expect(text(links[i]!.querySelector('.skill-name')), slug).toBe(e.title);
        expect(links[i]!.querySelector('.free-tag') !== null, slug).toBe(!paid(e));
        expect(existsSync(resolve(HERE, `../../${slug}.html`)), `${slug}.html`).toBe(true);
      });
    }
    expect(() => entryFor('not-a-page')).toThrow(/no library card/);
  });
});

describe('Built inside', () => {
  it('says the same figures as the proof line every buy button carries', () => {
    expect($$('.proof-stat').map((s) => text(s.querySelector('.proof-label')))).toEqual([
      '100 agents',
      '700+ homes a year',
    ]);
    expect(HOME.proof.figure).toBe('100 agents, 700+ homes a year');
    expect(text($('.proof-name'))).toBe(HOME.proof.label.replace('Built inside ', ''));
  });
});

describe('prices, read from the offer’s own words', () => {
  it('are the figures Connor’s brief names', () => {
    expect(PRICES.accelerator).toEqual({ founding: 7500, standard: 9997, twoPay: 3750 });
    expect(PRICES.agentPlan).toEqual({ monthly: 79, yearly: 790 });
    expect(PRICES.teamPlan.today).toEqual([1491, 2391]);
    expect(PRICES.teamPlan.monthly).toEqual([497, 797]);
    expect(PRICES.teamPlan.monthlyFrom).toBe('April 4, 2027');
    expect(PRICES.insiders).toEqual({ yearly: 1997, monthly: 197 });
    expect(dollarsIn('Then $497 or $797 a month')).toEqual([497, 797]);
  });

  it('show on each card as the page loads, and each switch carries its other option', () => {
    const price = (card: string) => $$(`.plan[data-card="${card}"] .price[data-price]`).map(text);
    expect(price('accelerator')).toEqual(['$7,500', '$9,997']);
    expect(text($('.plan[data-card="accelerator"] .founding-open .price-after'))).toBe('Standard price $9,997.');
    expect(price('agentPlan')).toEqual(['$79']);
    expect(price('teamPlan')).toEqual(['$1,491']);
    expect(price('insiders')).toEqual(['$1,997']);
    const options = (card: string) =>
      $$(`.plan[data-card="${card}"] [data-toggle] button`).map((b) => [
        text(b),
        b.getAttribute('data-option-price'),
        b.getAttribute('data-option-after'),
        b.getAttribute('data-option-cart'),
      ]);
    expect(options('agentPlan')).toEqual([
      ['Monthly', '79', 'Or $790 a year.', null],
      ['Yearly', '790', 'Twelve months for the price of ten.', null],
    ]);
    expect(options('insiders')).toEqual([
      ['Yearly', '1997', 'Two months free, counted toward the Accelerator.', 'insiders-year'],
      ['Monthly', '197', 'Three-month minimum.', 'insiders-monthly'],
    ]);
  });

  it('give the calculator both tiers’ figures and words, starting at 12 agents', () => {
    const calc = $('[data-calc]')!;
    expect(calc.getAttribute('data-today')).toBe('1491,2391');
    expect(calc.getAttribute('data-tiers')).toBe('Up to 15 agents|16 to 40 agents');
    expect(calc.getAttribute('data-after')).toBe(
      'January 4 to April 3, 2027. Then $497 a month from April 4, 2027.|January 4 to April 3, 2027. Then $797 a month from April 4, 2027.',
    );
    expect($('#hp-agents')?.getAttribute('value')).toBe('12');
    expect($$('.seat.is-on')).toHaveLength(12);
    expect(text($('[data-calc-price]'))).toBe('$1,491');
  });
});

describe('Plans and Prices: live from /api/offer, like /pricing', () => {
  const card = (name: string) => $(`.plan[data-card="${name}"]`)!;

  it('sells each card’s real cart, and every buy button waits with no address until /api/offer gives one', () => {
    expect(
      ['accelerator', 'teamPlan', 'insiders'].map((c) => [
        card(c).getAttribute('data-cart'),
        card(c).getAttribute('data-state'),
      ]),
    ).toEqual([
      ['cohort-full', 'loading'],
      ['agents-upto15', 'loading'],
      ['insiders-year', 'loading'],
    ]);
    for (const b of $$('[data-buy], [data-buy-more]')) expect(b.hasAttribute('href'), text(b)).toBe(false);
    expect($$('[data-buy]').map(text)).toEqual([
      'Get Amplified AI Accelerator',
      'Get Amplified Team Plan',
      'Get Amplified Insiders',
    ]);
    expect([text($('[data-buy-more]')), $('[data-buy-more]')?.getAttribute('data-buy-more')]).toEqual([
      'Or pay in 2 payments of $3,750',
      'cohort-two-pay',
    ]);
    for (const c of [...$$('[data-cart]'), ...$$('[data-option-cart]'), ...$$('[data-buy-more]')]) {
      const id = c.getAttribute('data-cart') ?? c.getAttribute('data-option-cart') ?? c.getAttribute('data-buy-more');
      expect(CART_IDS as readonly string[]).toContain(id);
    }
    const plans = $('[data-plans]')!;
    expect([plans.getAttribute('data-founding'), plans.getAttribute('data-closes-at')]).toEqual([
      'open',
      DEFAULT_FOUNDING_CLOSES_AT,
    ]);
  });

  it('puts the proof line right under every buy button', () => {
    for (const b of $$('[data-buy]')) {
      const next = b.nextElementSibling;
      expect(next?.className, text(b)).toBe('proof-line');
      expect(text(next)).toBe(`${HOME.proof.label} ${HOME.proof.figure}`);
    }
  });

  it('links every card to its own page, and the Agent Plan’s button is its page', () => {
    expect(
      ['accelerator', 'teamPlan', 'insiders'].map((c) => card(c).querySelector('a.details')?.getAttribute('href')),
    ).toEqual(['/team-build', '/teams', '/library']);
    expect($$('.plan[data-card="agentPlan"] a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['See the Agent Plan', '/agents'],
    ]);
  });

  it('has /pricing’s words for every other state, and the waitlist where /pricing has it', () => {
    expect(text(card('accelerator').querySelector('.act-soon'))).toBe('Opens soon.');
    expect(text(card('accelerator').querySelector('.act-closed .act-note'))).toBe(
      'The founding price ended Monday, November 30 at 11:59 PM Mountain. Join the waitlist to hear first about the next cohort.',
    );
    expect(text(card('teamPlan').querySelector('.act-closed .act-note'))).toBe(
      'Founding prices ended Monday, November 30 at 11:59 PM Mountain. Join the waitlist to hear what’s next.',
    );
    expect($$('.act-closed a, .act-soldout a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Join the Waitlist', WAITLIST_HREF],
      ['Join the Waitlist', WAITLIST_HREF],
      ['Join the Waitlist', WAITLIST_HREF],
    ]);
    expect(card('insiders').querySelector('.act-closed, .act-soldout')).toBeNull();
  });

  it('keeps the Accelerator’s 15 seats hidden until they are known, with both of its labels', () => {
    const block = $('[data-seats]')!;
    expect(block.hasAttribute('hidden')).toBe(true);
    expect(block.querySelectorAll('.seatbar span')).toHaveLength(COHORT_SEATS);
    expect(fill(block.getAttribute('data-left')!, { left: 12, total: 15 })).toBe('12 of 15 founding seats left');
    expect(fill(block.getAttribute('data-taken')!, { total: 15 })).toBe('15 of 15 founding seats taken');
  });

  it('points For Team Owners at the Team Plan’s page and all the programs', () => {
    expect($$('.team-copy .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['See the Team Plan', '/teams'],
      ['All Plans and Prices', '/pricing'],
    ]);
    expect($('.plan-adjust')?.getAttribute('href')).toBe('#team-owners');
    expect($('#team-owners')).not.toBeNull();
  });

  it('ends with the free skills line and AI 101', () => {
    expect([text($('.plans-free p')), $('.plans-free a')?.getAttribute('href')]).toEqual([
      'Five free skills to start. The free ones ask for your name and email.',
      '/library',
    ]);
    expect($$('.start .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Start AI 101', '/ai101'],
      ['Browse the Library', '/library'],
    ]);
  });
});

describe('the program logos (Connor’s, from `program-logo.ts`)', () => {
  const plan = (name: string) => $(`.plan[data-card="${name}"]`)!;

  it('open each plan card: its own program’s symbol, 40px, above the name written out as text', () => {
    const cards = $$('.plan');
    expect(cards.map((c) => c.querySelector('.plan-top .plan-logo')?.getAttribute('data-program'))).toEqual([
      'accelerator',
      'agent-plan',
      'team-plan',
      'insiders',
    ]);
    for (const card of cards) {
      const holder = card.querySelector('.plan-logo')!;
      const key = holder.getAttribute('data-program')!;
      const svg = holder.querySelector('svg')!;
      expect([svg.getAttribute('viewBox'), svg.getAttribute('width')], key).toEqual(['0 0 48 48', '40']);
      expect(text(card.querySelector('.plan-name')), key).toBe(PROGRAMS.find((p) => p.key === key)!.name);
    }
    expect(plan('accelerator').querySelectorAll('svg[viewBox="0 0 48 48"]')).toHaveLength(1);
  });

  it('mark the Team Plan’s own section, in its eyebrow, over the heading that names it', () => {
    const eyebrow = $('#team-owners .eb')!;
    expect(eyebrow.querySelector('.eb-logo svg')?.getAttribute('width')).toBe('32');
    expect(eyebrow.querySelector('.ringdot')).toBeNull();
    expect(eyebrow.nextElementSibling?.tagName).toBe('H2');
    expect(text(eyebrow.nextElementSibling)).toBe('Amplified Team Plan');
  });

  it('are hidden from screen readers where the name is written beside them, and no drawing is an unnamed image', () => {
    const logos = $$('.plan-logo svg, .eb-logo svg');
    expect(logos).toHaveLength(5);
    for (const svg of logos) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.hasAttribute('role')).toBe(false);
    }
    for (const svg of $$('main svg')) {
      const named = svg.getAttribute('role') === 'img' && !!svg.getAttribute('aria-label');
      expect(named || svg.getAttribute('aria-hidden') === 'true').toBe(true);
    }
  });

  it('take the section’s colours: the “-dark” logo on the near-black Plans, the “-light” one on the bone Team section', () => {
    expect($('#plans')!.closest('[data-theme="light"]')).toBeNull();
    expect($('#team-owners')!.getAttribute('data-theme')).toBe('light');
    for (const svg of $$('.plan-logo svg, .eb-logo svg')) {
      const [ink, signal] = [...svg.querySelectorAll('path')];
      expect(ink!.getAttribute('fill')).toBe('currentColor');
      expect(signal!.getAttribute('style')).toBe('fill:var(--signal, currentColor)');
    }
    const css = read('./home.css');
    expect(css).toContain('.hp .plan-logo {\n  color: var(--ink);\n}');
    expect(css).toContain('.hp .eb-logo {\n  color: var(--ink);\n}');
  });

  it('don’t put the Programs menu’s lines on the page (new copy, for the menu follow-up)', () => {
    for (const p of PROGRAMS) expect(text(doc.body), p.tagline).not.toContain(p.tagline);
  });
});

describe('the words', () => {
  const body = renderHomeBody();
  const words = text(doc.body);

  it('follow the house rules: no em dashes, no “Forum”, no income or results promises, never “free library”', () => {
    expect(body + renderHomeHead()).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(
      /guarantee|\bincome\b|\bearn(s|ings)?\b|revenue|\broi\b|double|10x|save \d|close more|more deals/i,
    );
    expect(words).not.toMatch(/free\s+library/i);
  });
});

describe('the stylesheet', () => {
  const css = read('./home.css');

  it('draws a visible focus ring, and honors reduced motion', () => {
    expect(css).toMatch(/\.hp :focus-visible \{\s*outline: 2px solid var\(--focus-ring\);/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.hp \.mq-track,[\s\S]*animation: none !important;/,
    );
  });

  it('gives a thumb 44px on a phone: text links, the offer plan’s rows, the tabs, the switches, the tier link and the slider', () => {
    expect(css).toMatch(/\.hp \.cta-link \{[^}]*min-height: 44px;/);
    expect(css).toMatch(/\.hp \.term \{[^}]*min-height: 48px;/);
    expect(css).toMatch(/\.hp \.tab \{[^}]*min-height: 56px;/);
    const phone = css.slice(css.indexOf('@media (max-width: 640px), (pointer: coarse)'));
    for (const rule of [
      /\.hp \.seg-toggle button \{\s*min-height: 44px;/,
      /\.hp \.plan-adjust \{\s*min-height: 44px;/,
      /\.hp \.range \{\s*height: 44px;/,
    ])
      expect(phone).toMatch(rule);
  });

  it('never fades text with opacity in the scroll-played rows: they fade by colour, which stays AA', () => {
    for (const sel of ['.hp .q {', '.hp .work-item {', '.hp .dcs-step {']) {
      const rule = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
      expect(rule, sel).not.toMatch(/opacity/);
    }
    expect(css).toMatch(/color-mix\(in srgb, var\(--ink\) calc\(var\(--k\) \* 100%\), var\(--ink-muted\)\)/);
  });
});
