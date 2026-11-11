import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_PATTERN } from '@ai/core/offer';
import { HOME } from '../home/content';
import { AGENT_CARTS } from '../site/offers';
import { AGENT_PLAN } from '../site/offers-content';
import { AGENTS_FAQ, ROTATION } from './content';
import { libraryCard, renderAgentsBody, renderAgentsHead, renderBody, renderHead } from './render';

// /agents, the Amplified Agent Plan's sales page (D-114), on the parsed DOM: Spring's outline in her
// order, the price and the two carts, the rotation by the Library's own titles, and the house rules.
// That the API serves it at `/agents`, filled, is `apps/api/test/offer.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const html = `<!doctype html><html lang="en"><head>${renderAgentsHead()}</head><body>${renderAgentsBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

describe('the page', () => {
  it('is what the site plugin builds, with its canonical address, its shell and no script', () => {
    expect([renderHead, renderBody]).toEqual([renderAgentsHead, renderAgentsBody]);
    expect(text($('title'))).toBe('Amplified Agent Plan · Amplified Impact');
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/agents');
    const shell = read('../../agents.html');
    expect(shell).toContain('data-invites="%%invites%%"');
    expect(shell + html).not.toMatch(/<script/i);
  });

  it('runs in Spring’s order: hero, first week, the rotation, office hours and after you buy, questions, the button', () => {
    expect($$('h1').map(text)).toEqual(['AI for your leads, listings and buyers. Trained live every week.']);
    expect($$('main h2').map(text)).toEqual([
      'Your first week',
      'One live training a week',
      'Office hours',
      'What happens after you buy',
      'Questions',
      'Start the week of January 4.',
    ]);
    expect([text($('.proof-line span')), text($('.proof-line strong'))]).toEqual([HOME.proof.label, HOME.proof.figure]);
  });
});

describe('the price and the carts', () => {
  it('shows $79 a month, $790 a year, the January 4 first charge and cancel anytime', () => {
    const buy = $('#join')!;
    expect(text($('.figure', buy))).toBe('$79 a month');
    expect($$('.terms', buy).map(text)).toEqual([...AGENT_PLAN.price.terms]);
    expect(AGENT_PLAN.price.terms).toEqual(['Or $790 a year.', 'Your first charge is Monday, January 4, 2027.', 'Cancel anytime.']);
    // January 4, 2027 is a Monday.
    expect(new Date('2027-01-04T12:00:00Z').getUTCDay()).toBe(1);
  });

  it('sells through the Agent Plan’s two carts, and says "Opens soon." until the API knows them', () => {
    const buy = $('#join')!;
    expect(AGENT_CARTS).toEqual(['agent-monthly', 'agent-yearly']);
    expect(buy.getAttribute('data-state')).toBe('%%state:agent-monthly%%');
    expect($$('.act-link a', buy).map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get Amplified Agent Plan', '%%link:agent-monthly%%'],
      ['Or pay $790 a year', '%%link:agent-yearly%%'],
    ]);
    expect(text($('.act-soon', buy))).toBe('Opens soon.');
    expect($$('.end a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get Amplified Agent Plan', '#join'],
      ['Start with 5 free skills', '/library?show=free'],
    ]);
  });

  it('puts the proof line right under the closing Get Amplified Agent Plan button', () => {
    const proof = $('.end .end-action + .proof-line')!;
    expect([text($('span', proof)), text($('strong', proof))]).toEqual(['Built inside The Utah Life Real Estate Group', '100 agents, 700+ homes a year']);
    expect(text($('a.btn', proof.previousElementSibling!))).toBe('Get Amplified Agent Plan');
    // And in the hero, beside the buy block, as before.
    expect($$('.ag-hero .proof-line')).toHaveLength(1);
  });
});

describe('the first week and the rotation', () => {
  it('starts with AI Brain Setup and Sounds Like You, then three agent skills', () => {
    expect($$('.starter .steps h3').map(text)).toEqual(['AI Brain Setup', 'Sounds Like You: Your AI Voice Profile', 'Your first 3 agent skills']);
    expect($$('.starter .steps h3 a').map((a) => a.getAttribute('href'))).toEqual(['/ai-brain-setup', '/voice-profile']);
  });

  it('lays out Spring’s four weeks, each skill by its Library title and linked to its page', () => {
    expect($$('.week h3').map(text)).toEqual(['Leads and follow-up', 'Listings', 'Buyers and contracts', 'Content and your week']);
    for (const w of ROTATION.weeks) {
      for (const slug of w.skills) {
        const a = $(`.week a[href="/${slug}"]`);
        expect(a, slug).not.toBeNull();
        expect(text(a), slug).toBe(libraryCard(slug).title);
      }
    }
    expect($$('.week a')).toHaveLength(12);
    expect(text($('.rotation-when'))).toBe('Weekly, starting the week of January 4.');
    expect(() => libraryCard('not-a-skill')).toThrow(/no Library card/);
  });
});

describe('office hours', () => {
  it('say Thursday at 1:00 PM Central, 60 minutes, and that every session is recorded', () => {
    const oh = $('#oh-title')!.parentElement!;
    expect($$('.section-lede', oh).map(text)).toEqual([
      'Every Thursday, 1:00 PM Central, 60 minutes. Drop in with a real file and get help.',
      'Every session is recorded, so you’re never behind.',
    ]);
  });

  it('leave the weekly training’s day and time open', () => {
    expect(text($('.rotation-when'))).toBe('Weekly, starting the week of January 4.');
    expect(text($('.rotation-section')).length).toBeGreaterThan(100);
    expect(text($('.rotation-section'))).not.toMatch(/\b(Monday|Tuesday|Wednesday|Thursday|Friday)s?\b|\d:\d\d/);
  });
});

describe('the share tags', () => {
  it('carry the title, description, canonical address and Spring’s real headshot, as a large card', () => {
    const meta = (sel: string) => $(sel)?.getAttribute('content');
    expect(text($('title'))).toBe('Amplified Agent Plan · Amplified Impact');
    expect(meta('meta[name="description"]')?.length).toBeGreaterThan(50);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/agents');
    expect(meta('meta[property="og:url"]')).toBe('https://www.amplifiedimpact.io/agents');
    expect(meta('meta[property="og:image"]')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen.jpg');
    expect([meta('meta[property="og:image:width"]'), meta('meta[property="og:image:height"]'), meta('meta[property="og:image:alt"]')]).toEqual(['890', '1113', 'Spring Bengtzen']);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
  });
});

describe('after you buy, and the questions', () => {
  it('says when the login comes, that nothing is charged until January 4, and that the free skills are open now', () => {
    const steps = $$('.after-buy .steps li');
    expect(text($('.invites-held', steps[0]))).toBe('Your login comes by email on %%login-day%%.');
    expect(text($('.invites-sent', steps[0]))).toBe('Your login comes by email within a few minutes.');
    expect(text(steps[1])).toContain('Your first charge is Monday, January 4, 2027, when your agent skills open.');
    expect(text(steps[3])).toContain('The 5 free skills are open to anyone');
  });

  it('answers an agent’s questions, sending a team agent to the Team Plan', () => {
    expect($$('.faq summary').map(text)).toEqual(AGENTS_FAQ.items.map((f) => f.q));
    expect($$('.faq a').map((a) => a.getAttribute('href'))).toEqual(['/teams', '/agreement']);
  });
});

describe('the words and the tokens', () => {
  const words = text(doc.body) + ' ' + renderAgentsHead();

  it('follow the house rules', () => {
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|\bearn(s|ings)?\b|10x|close more|more deals|!/i);
    // The training's day and time stay open.
    expect(words).not.toMatch(/(Monday|Tuesday|Wednesday|Friday)s? at \d/);
  });

  it('uses only tokens the API fills', () => {
    for (const [, name] of html.matchAll(TOKEN_PATTERN)) {
      expect(['invites', 'login-day'].includes(name!) || /^(state|link):agent-(monthly|yearly)$/.test(name!), name).toBe(true);
    }
  });

  it('keeps text legible on a phone', () => {
    const css = read('./agents.css') + read('../site/offers.css') + read('../site/site.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});
