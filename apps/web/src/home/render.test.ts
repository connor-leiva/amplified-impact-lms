import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRIES } from '../library/content';
import { paid, renderLibraryBody } from '../library/render';
import { HOME, PHOTOS } from './content';
import { entryFor, liveEntries, renderHomeBody, renderHomeHead } from './render';

// www's homepage (D-102, rewritten in D-107 to Spring's homepage outline), on the parsed DOM: what it
// says, in which order, where every button goes, and that it says nothing the rest of the site does
// not. That the API serves it at `/` on www only is `apps/api/test/marketing.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderHomeHead()}</head><body>${renderHomeBody()}</body></html>`,
  'text/html',
);
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => [...doc.querySelectorAll(selector)];
const meta = (key: string) => doc.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content') ?? null;

describe('the head', () => {
  it('says what Amplified Impact is, with its canonical address and a real share image', () => {
    expect(text($('title'))).toBe('Amplified Impact · AI Coaching and Training for Business Owners and Their Teams');
    expect(meta('description')).toMatch(/^AI coaching and training for business owners and their teams/);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/');
    expect(meta('og:image')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen.jpg');
    expect(meta('og:image:alt')).toBe('Spring Bengtzen');
    expect(meta('twitter:card')).toBe('summary_large_image');
  });

  it('has the inline favicon and the stylesheet in its shell, and no script anywhere', () => {
    const shell = read('../../home.html');
    expect(shell).toContain('rel="icon" type="image/svg+xml" href="data:image/svg+xml,');
    expect(shell).not.toMatch(/<script/i);
    expect(renderHomeBody()).not.toMatch(/<script/i);
  });
});

describe('Spring’s outline, in her order', () => {
  it('has one h1, a skip link, and the nine sections’ headings in order', () => {
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
    expect($$('h1').map(text)).toEqual(['AI coaching and training for business owners and their teams.']);
    expect($$('main h2').map(text)).toEqual([
      'Use AI as a tool, or run a business where AI does real work.',
      'Four ways in',
      'The Library',
      'The AI drafts. You check, then send.',
      'Free resources',
      'Meet Spring and Connor',
      'Start with 5 free skills.',
    ]);
    expect([text($('.proof-label')), text($('.proof-figure'))]).toEqual(['Built inside The Utah Life Real Estate Group', '100 agents, 700+ homes a year']);
  });

  it('opens with Spring’s subhead and two buttons: the free skills, then the programs', () => {
    expect(text($('.hero .lede'))).toBe(
      'We teach you to build AI into how you work, with live coaching, ready to use skills and prompts. Right now we’re doing it for real estate, because that’s the business we run every day.',
    );
    expect($$('.hero .actions a').map((a) => [text(a), a.getAttribute('href'), a.className])).toEqual([
      ['Get 5 Free Skills', '/library?show=free', 'btn btn-primary'],
      ['See the Programs', '/pricing', 'btn btn-secondary'],
    ]);
  });

  it('shows Spring and Connor in their own photos, named, from files on this site', () => {
    expect($$('.hero-photos img').map((i) => [i.getAttribute('src'), i.getAttribute('alt')])).toEqual([
      ['/img/team/spring-bengtzen.jpg', 'Spring Bengtzen'],
      ['/img/team/connor-leiva.jpg', 'Connor Leiva'],
    ]);
    for (const p of Object.values(PHOTOS)) {
      const file = readFileSync(resolve(HERE, `../../public${p.src}`));
      expect([file[0], file[1]], p.src).toEqual([0xff, 0xd8]);
      expect(file.length, p.src).toBeLessThan(250_000);
    }
    expect(existsSync(resolve(HERE, '../../public/img/home-hero.jpg'))).toBe(false);
  });

  it('shows four ways in, by their exact names, each with its price and one button', () => {
    const cards = $$('.way');
    expect(cards.map((c) => text(c.querySelector('h3')))).toEqual(['Amplified AI Accelerator', 'Amplified Agent Plan', 'Amplified Team Plan', 'Amplified Insiders']);
    expect(cards.map((c) => text(c.querySelector('.figure')))).toEqual([
      '$7,500 founding price',
      '$79 a month, or $790 a year',
      '$1,491 today for 3 months, up to 15 agents',
      '$1,997 today for one year, or $197 a month',
    ]);
    expect(cards.map((c) => [...c.querySelectorAll('a')].map((a) => a.getAttribute('href')))).toEqual([['/team-build'], ['/agents'], ['/teams'], ['/pricing#insiders']]);
    expect(text($('.ways-every'))).toBe('Every program includes weekly office hours.');
    expect(text($('.ways-free'))).toBe('Not ready? Start with 5 free skills');
  });

  it('previews the Library from its own cards: each skill a link to its page, tagged free or locked', () => {
    const n = liveEntries().length;
    expect(n).toBe(ENTRIES.filter((e) => e.href !== null).length);
    const library = new DOMParser().parseFromString(`<body>${renderLibraryBody()}</body>`, 'text/html');
    expect(library.body.textContent).toContain(`Showing ${n} resources`);
    for (const row of HOME.library.rows) {
      for (const slug of row.slugs) {
        const entry = entryFor(slug);
        const li = $$('.row-list li').find((l) => l.querySelector('a')?.getAttribute('href') === `/${slug}`);
        expect(text(li?.querySelector('a')), slug).toBe(entry.title);
        expect(text(li?.querySelector('.tag')), slug).toBe(paid(entry) ? 'Locked' : 'Free');
        expect(existsSync(resolve(HERE, `../../${slug}.html`)), `${slug}.html`).toBe(true);
      }
    }
    expect(() => entryFor('not-a-page')).toThrow(/no library card/);
    // The lock is drawn and labelled: never colour alone.
    for (const lock of $$('.tag-lock')) expect(lock.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the old hero idea as the trust section: Run and Draft ticked, Own left empty, beside the made-up sheet', () => {
    expect($$('.role-list li').map((li) => [text(li.querySelector('strong')), li.querySelector('.box')?.classList.contains('on')])).toEqual([
      ['Run', true],
      ['Draft', true],
      ['Own', false],
    ]);
    expect(text($('.sheet-meta'))).toBe('Offer plan · Made-up example');
    const sample = read('../../../../skills/offer-strategy/sample.md');
    for (const n of ['$562,500', '$5,000', '2286 E Pretend Poppy Ln', 'December 11']) expect(sample).toContain(n);
  });

  it('lists the free resources for agents and for team owners, by their Library titles', () => {
    expect($$('.free-col h3').map(text)).toEqual(['For Agents', 'For Team Owners']);
    expect($$('.free-col a').map((a) => a.getAttribute('href'))).toEqual(['/voice-profile', '/ai101', '/ops-time-audit', '/retool', '/task-sync-starter']);
  });

  it('introduces Spring and Connor from their bios, and links to the full story', () => {
    expect($$('.person-card h3').map(text)).toEqual(['Spring Bengtzen', 'Connor Leiva']);
    expect(text($$('.person-card')[0])).toContain('100 agents closing 700+ homes a year');
    expect(text($$('.person-card')[1])).toContain('co-founder of Amplified Impact, an AI consulting firm that specializes in real estate');
    expect($('.meet .section-more a')?.getAttribute('href')).toBe('/about');
  });

  it('ends with the free skills and the programs, and no testimonials', () => {
    expect($$('.end .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
    expect(text(doc.body)).not.toMatch(/testimonial|“[^”]+” —/i);
  });
});

describe('the words', () => {
  const words = text(doc.body) + ' ' + renderHomeHead();

  it('follow the house rules: no em dashes, no “Forum”, no income or results promises', () => {
    expect(renderHomeBody() + renderHomeHead()).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(/guarantee|\bincome\b|\bearn(s|ings)?\b|revenue|\broi\b|double|10x|save \d|close more|more deals/i);
    expect(words).not.toMatch(/skill library|free library/i);
  });
});

describe('the stylesheet', () => {
  const css = read('./home.css') + read('../site/site.css');

  it('keeps text legible on a phone: nothing under 16px, no tertiary grey', () => {
    expect(css).not.toContain('--text-tertiary');
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
  });

  it('draws a visible focus ring and honors reduced motion', () => {
    expect(css).toMatch(/:focus-visible \{\s*outline: 2px solid var\(--action-primary\);/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
