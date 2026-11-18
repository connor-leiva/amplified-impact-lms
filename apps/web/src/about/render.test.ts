import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_PATTERN } from '@ai/core/offer';
import { HOME } from '../home/content';
import { ABOUT_HERO_PHOTO, ABOUT_PHOTOS, BIOS, STORY, V2_RINGS, WHY } from './content';
import { renderAboutBody, renderAboutHead, renderBody, renderHead, splitLead } from './render';

// /about (D-117), on the parsed DOM: Spring and Connor by their own photos and the brief's bios, the
// Utah Life story, why we built this, and the house rules (above all: no "Forum").

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const html = `<!doctype html><html lang="en"><head>${renderAboutHead()}</head><body>${renderAboutBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

/** The overnight brief's bios, word for word, as Ampy sent them. */
const BRIEF_SPRING =
  "Spring Bengtzen is the founder and CEO of The Utah Life Real Estate Group, an eXp Realty team based in Farmington, Utah, and the founder of Spring B, where she coaches real estate team owners. Her team is 100 agents closing 700+ homes a year. She has more than 20 years in the business and was named to REALTOR Magazine's 30 Under 30 in 2010. She also leads Spring B Coaching, co-leads be Collective, and founded The Forum and Activated Agents, along with mortgage and title businesses.";
const BRIEF_CONNOR =
  "Connor Leiva is a Dallas-based real estate operator and a licensed Texas sales agent with Owns the Home Group and eXp Realty. He has spent more than a decade in the industry, starting as a data analyst at RE/MAX Headquarters, later leading strategic growth work at Realogy for the Better Homes and Gardens Real Estate and ERA networks, and serving since 2021 as Executive Director of Onboarding & Launch at PLACE. He holds an MBA from the University of Denver and a master's in Organization Development and Change from Penn State, and he also coaches leaders on real estate systems and business planning. He is co-founder of Amplified Impact.";
const curly = (s: string) => s.replace(/'/g, '’');
const ROLES = ['Founder and CEO, The Utah Life Real Estate Group', 'Co-founder, Amplified Impact'];
const SRCS = [
  ['/img/team/spring-bengtzen-2.jpg', 'Spring Bengtzen'],
  ['/img/team/connor-leiva.jpg', 'Connor Leiva'],
];

describe('/about', () => {
  it('is what the site plugin builds, with its canonical address, the nav marking About, a real share image and only the kit’s script', () => {
    expect(renderHead).toBe(renderAboutHead);
    expect(renderBody).toBe(renderAboutBody);
    expect(text(doc.querySelector('title'))).toBe('About · Amplified Impact');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.amplifiedimpact.io/about',
    );
    // The branded share image, never a headshot: the photos stay in the page.
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://www.amplifiedimpact.io/img/og/amplified-impact.png',
    );
    expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current="page"]'))).toBe('About');
    const shell = read('../../about.html');
    expect(shell).toContain('<body class="aiw" data-theme="dark" data-app-ready="true">');
    expect([...shell.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0])).toEqual([
      '<script type="module" src="/src/kit/client/main.ts">',
    ]);
    expect(html).not.toMatch(/<script/i);
    expect(shell + html).not.toMatch(/\son[a-z]+=/i);
    expect([...html.matchAll(TOKEN_PATTERN)]).toEqual([]);
  });

  it('opens on the live words and one photo of the two of them, captioned with each full live role', () => {
    expect(text(doc.querySelector('h1'))).toBe('We build AI into our own businesses first. Then we teach it.');
    expect($$('.ab-hero .ab-fig img').map((i) => [i.getAttribute('src'), i.getAttribute('alt')])).toEqual([
      [ABOUT_HERO_PHOTO.src, 'Spring Bengtzen and Connor Leiva on stage together'],
    ]);
    expect(
      $$('.ab-fig .ab-cap').map((f) => [text(f.querySelector('.ab-cap-name')), text(f.querySelector('.ab-cap-role'))]),
    ).toEqual([
      ['Spring Bengtzen', ROLES[0]],
      ['Connor Leiva', ROLES[1]],
    ]);
    expect($$('.ab-hero .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
  });

  it('puts Spring first and Connor second, each in their own photo from this site, never initials', () => {
    expect($$('.bio h3').map(text)).toEqual(['Spring Bengtzen', 'Connor Leiva']);
    expect($$('.bio img').map((i) => [i.getAttribute('src'), i.getAttribute('alt')])).toEqual(SRCS);
    for (const p of [...Object.values(ABOUT_PHOTOS), ABOUT_HERO_PHOTO]) {
      const file = readFileSync(resolve(HERE, `../../public${p.src}`));
      expect([file[0], file[1]], p.src).toEqual([0xff, 0xd8]);
    }
    expect($$('.bio-role').map(text)).toEqual(ROLES);
    // Every image on the page is one of their own photos: the two of them together, then one each.
    expect(new Set($$('main img').map((i) => i.getAttribute('src')))).toEqual(
      new Set([ABOUT_HERO_PHOTO.src, ...SRCS.map(([s]) => s)]),
    );
    expect(html).not.toMatch(/initials|>SB<|>CL</);
  });

  it('uses the brief’s bios word for word, with only Spring’s “The Forum” cut', () => {
    expect(BIOS.connor.body).toBe(curly(BRIEF_CONNOR));
    expect(BIOS.spring.body).toBe(
      curly(BRIEF_SPRING.replace('founded The Forum and Activated Agents', 'founded Activated Agents')),
    );
    expect($$('.bio-text p:last-child').map(text)).toEqual([BIOS.spring.body, BIOS.connor.body]);
  });

  it('tells the Utah Life story with the homepage’s numbers, and why we built this in the live words', () => {
    expect($$('main h2').map(text)).toEqual([
      'The Utah Life Real Estate Group',
      'Why we built this',
      HOME.meet.heading,
      'Start with 5 free skills.',
    ]);
    const proof = doc.querySelector('.proof')!;
    expect(text(proof.querySelector('.eb'))).toBe(STORY.heading);
    expect(text(proof.querySelector('.proof-text'))).toBe(STORY.body.join(' '));
    expect($$('.proof-stat', proof).map((s) => text(s.querySelector('.sr-only')))).toEqual(['100', '700+']);
    // Each paragraph is the live one, set as a title and a line: the same words, in order.
    expect($$('.why .story-p').map(text)).toEqual([...WHY.body]);
    expect(splitLead('One. Two three.')).toEqual(['One.', 'Two three.']);
    expect(splitLead('Just one.')).toEqual(['Just one.', '']);
    expect($$('.about-end .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
  });

  it('draws the rings as a picture only, the center keeping the group’s full name', () => {
    const art = doc.querySelector('.why .sr')!;
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect($$('.sr-label', art).map(text)).toEqual([...V2_RINGS]);
    expect(V2_RINGS[0]).toBe('The Utah Life Real Estate Group');
  });

  it('leaves out what the brief does: “How we work”, and any stat the live page doesn’t say', () => {
    const words = text(doc.body);
    expect(words).not.toMatch(/How we work|Who you learn from|10\+|20\+|\+24/);
    expect(doc.querySelector('.beliefs, .bel')).toBeNull();
  });

  it('follows the house rules: no “Forum”, no em dashes, no testimonials or results promises', () => {
    const words = text(doc.body) + renderAboutHead();
    expect(words).not.toMatch(/forum/i);
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|10x|close more|more deals|!/i);
    expect(read('./about.css')).toContain("@import '../kit/kit.css';");
    const css = read('./about.css') + read('../kit/kit.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});
