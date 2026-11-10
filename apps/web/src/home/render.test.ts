import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_NAMES } from '@ai/core/offer';
import { ENTRIES } from '../library/content';
import { paid, renderLibraryBody } from '../library/render';
import { CARDS_COPY } from '../offer/content';
import { renderOfferBody } from '../offer/render';
import { HERO_PHOTO, HOME } from './content';
import { entryFor, liveEntries, renderHomeBody, renderHomeHead } from './render';

// www's homepage (D-102), on the parsed DOM: what it says, where every button goes, and that it says
// nothing the rest of the site does not. That the API serves it at `/` on www only is
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

describe('the head', () => {
  it('has a real title and description, not the old placeholder’s', () => {
    expect(text($('title'))).toBe('Amplified Impact · AI Skills and Training for Real Estate Teams');
    expect(meta('description')).toMatch(/^Claude and ChatGPT skills for real estate agents and team owners/);
    expect(renderHomeHead() + renderHomeBody()).not.toMatch(/under construction/i);
  });

  it('has its canonical address and the Open Graph and Twitter tags, with an absolute share image', () => {
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/');
    expect(meta('og:title')).toBe(text($('title')));
    expect(meta('og:description')).toBe(meta('description'));
    expect(meta('og:type')).toBe('website');
    expect(meta('og:url')).toBe('https://www.amplifiedimpact.io/');
    expect(meta('og:site_name')).toBe('Amplified Impact');
    expect(meta('og:image')).toBe('https://www.amplifiedimpact.io/img/home-hero.jpg');
    expect([meta('og:image:width'), meta('og:image:height')]).toEqual(['1600', '1200']);
    expect(meta('og:image:alt')).toBeTruthy();
    expect(meta('twitter:card')).toBe('summary_large_image');
  });

  it('has the inline favicon and the stylesheet in its shell, and no script anywhere', () => {
    const shell = read('../../home.html');
    expect(shell).toContain('rel="icon" type="image/svg+xml" href="data:image/svg+xml,');
    expect(shell).toContain('<link rel="stylesheet" href="/src/home/home.css" />');
    expect(shell).not.toMatch(/<script/i);
    expect(renderHomeBody()).not.toMatch(/<script/i);
  });
});

describe('the page', () => {
  it('has its landmarks, a skip link to the main content, and one h1 above its h2s', () => {
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
    expect($('main#main')).not.toBeNull();
    expect($('header nav[aria-label="Main"]')).not.toBeNull();
    expect($('footer nav[aria-label="Legal"]')).not.toBeNull();
    expect($$('h1').map(text)).toEqual(['AI that drafts the paperwork. You keep the decisions.']);
    expect($$('h2').map(text)).toEqual(['Skills for the work you do this week', 'The AI drafts. You check, then send.']);
    // Every section is named by its heading.
    for (const s of $$('section[aria-labelledby]')) expect(text(doc.getElementById(s.getAttribute('aria-labelledby') ?? '')), s.className).not.toBe('');
  });

  it('sends the nav to the library, AI 101 and the team owners’ section, and its button to the library', () => {
    expect($$('header nav a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['The Library', '/library'],
      ['AI 101', '/ai101'],
      ['For Team Owners', '#team-owners'],
    ]);
    expect($('#team-owners')).not.toBeNull();
    const cta = $('header a.btn-primary');
    expect([text(cta), cta?.getAttribute('href')]).toEqual(['Browse the Library', '/library']);
    expect($('header a.brand')?.getAttribute('href')).toBe('/');
    expect($('header a.brand svg')?.getAttribute('aria-label')).toBe('Amplified Impact');
  });

  it('opens with the hero’s two buttons: the library, then AI 101', () => {
    expect($$('.hero .actions a').map((a) => [text(a), a.getAttribute('href'), a.className])).toEqual([
      ['Browse the Library', '/library', 'btn btn-primary'],
      ['Start AI 101', '/ai101', 'btn btn-secondary'],
    ]);
  });

  it('shows the hero photo from the one file to swap, sized, with an alt that is empty while it is a placeholder', () => {
    const img = $('.hero-photo img');
    expect(img?.getAttribute('src')).toBe('/img/home-hero.jpg');
    expect([img?.getAttribute('width'), img?.getAttribute('height')]).toEqual(['1600', '1200']);
    expect(img?.hasAttribute('alt')).toBe(true);
    expect(img?.getAttribute('alt')).toBe(HERO_PHOTO.alt);
    const file = readFileSync(resolve(HERE, '../../public/img/home-hero.jpg'));
    expect([file[0], file[1]]).toEqual([0xff, 0xd8]);
    expect(file.length).toBeLessThan(400_000);
  });

  it('draws Offer Strategy’s made-up offer plan, its boxes drawn and never read', () => {
    const sheet = $('figure.sheet');
    expect(sheet?.getAttribute('aria-label')).toBe('A made-up offer plan from the Offer Strategy skill');
    expect(text(sheet?.querySelector('.sheet-meta'))).toBe('Offer plan · made-up example');
    expect($$('.sheet dt').map(text)).toEqual(['Price', 'Seller’s contribution', 'Earnest money', 'Due diligence', 'Settlement']);
    expect($$('.sheet dd').map(text)).toEqual(['$562,500', '$5,000', '$5,000', '10 days', 'Dec 11, 2026']);
    expect($$('.sheet .box.on')).toHaveLength(4);
    for (const box of $$('.box, .initials')) expect(box.getAttribute('aria-hidden')).toBe('true');
    // The numbers are the practice run's own.
    const sample = read('../../../../skills/offer-strategy/sample.md');
    for (const n of ['$562,500', '$5,000', '2286 E Pretend Poppy Ln', 'December 11']) expect(sample).toContain(n);
  });
});

describe('the library section', () => {
  it('counts the library’s live cards, the number the library shows, and links to it', () => {
    const n = liveEntries().length;
    expect(n).toBe(ENTRIES.filter((e) => e.href !== null).length);
    const library = new DOMParser().parseFromString(`<body>${renderLibraryBody()}</body>`, 'text/html');
    expect(library.body.textContent).toContain(`Showing ${n} resources`);
    expect(text($('.skills-intro p'))).toBe(
      `${n} guides, skills and templates for real estate teams. The free ones ask for your name and email. The rest are in the Amplified Skill Library.`,
    );
    const all = $('.skills-intro a.btn');
    expect([text(all), all?.getAttribute('href')]).toEqual([`See All ${n}`, '/library']);
  });

  it('names each skill by its library card and links to its page, tagging only the free ones', () => {
    for (const row of HOME.skills.rows) {
      for (const slug of row.slugs) {
        const entry = entryFor(slug);
        const link = $$('.row-list a').find((a) => a.getAttribute('href') === `/${slug}`);
        expect(text(link), slug).toBe(entry.title);
        expect(existsSync(resolve(HERE, `../../${slug}.html`)), `${slug}.html`).toBe(true);
        const tagged = link?.nextElementSibling?.classList.contains('free') ?? false;
        expect(tagged, slug).toBe(!paid(entry));
      }
    }
    expect($$('.row h3').map(text)).toEqual(['Buyer’s agents', 'Listing agents', 'Team owners', 'Content and your week']);
    expect(() => entryFor('not-a-page')).toThrow(/no library card/);
  });
});

describe('Run, Draft and Own, and the team owners’ card', () => {
  it('ticks what the AI does and leaves what the agent owns empty', () => {
    expect($$('.role-list li').map((li) => [text(li.querySelector('strong')), li.querySelector('.box')?.classList.contains('on')])).toEqual([
      ['Run', true],
      ['Draft', true],
      ['Own', false],
    ]);
  });

  it('is the Team Plan, in /offer’s own words, sending its button to that plan’s card', () => {
    const card = $('#team-owners');
    expect(text(card?.querySelector('h3'))).toBe(PLAN_NAMES.agents);
    expect(text(card?.querySelector('p:not(.label)'))).toBe(CARDS_COPY.agents.forWho);
    expect([...(card?.querySelectorAll('.team-lines li') ?? [])].map(text)).toEqual(CARDS_COPY.agents.lines.slice(0, 3));
    expect([...(card?.querySelectorAll('a') ?? [])].map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['See the Team Plan', '/offer#plan-agents'],
      ['All Plans and Prices', '/offer'],
    ]);
    // The anchor is real: /offer's Team Plan card.
    expect(renderOfferBody()).toContain('id="plan-agents"');
    // No price, and no checkout link of its own.
    expect(text(card)).not.toMatch(/\$|stripe/i);
    expect(renderHomeBody()).not.toMatch(/buy\.stripe\.com|checkout\.stripe\.com/);
  });

  it('ends with the byline and the Terms of Service and Privacy Policy', () => {
    expect(text($('footer p'))).toBe('By Connor Leiva · Amplified Impact, LLC');
    expect($$('footer a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Terms of Service', '/terms'],
      ['Privacy Policy', '/privacy'],
    ]);
  });
});

describe('the words', () => {
  const words = text(doc.body) + ' ' + renderHomeHead();

  it('promise no income, results or time saved, and never call the paid skills free', () => {
    expect(words).not.toMatch(/guarantee|\bincome\b|\bearn(s|ings)?\b|revenue|\bresults?\b|\broi\b|double|10x|save \d|hours? (a|per) week|close more|more deals/i);
    expect(words).not.toMatch(/free (claude|chatgpt) skills|free skills|free live training/i);
  });

  it('never call the library free: most of it is paid, and the free items carry their own tag', () => {
    expect(text(doc.body)).not.toMatch(/free library/i);
    expect($$('a[href="/library"]').map(text)).toEqual(['The Library', 'Browse the Library', 'Browse the Library', `See All ${liveEntries().length}`]);
  });

  it('follow the house rule: no em dashes', () => {
    expect(renderHomeBody() + renderHomeHead()).not.toMatch(/[–—]/);
  });
});

describe('the stylesheet', () => {
  const css = read('./home.css');

  it('keeps small text legible: no tertiary grey, nothing under 13px (WCAG AA, 4.5:1 and up)', () => {
    expect(css).not.toContain('--text-tertiary');
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
  });

  it('draws a visible focus ring and honors reduced motion', () => {
    expect(css).toMatch(/:focus-visible \{\s*outline: 2px solid var\(--action-primary\);/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
