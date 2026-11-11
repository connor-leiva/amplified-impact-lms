import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_PATTERN } from '@ai/core/offer';
import { HOME } from '../home/content';
import { ABOUT_PHOTOS, BIOS } from './content';
import { renderAboutBody, renderAboutHead, renderBody, renderHead } from './render';

// /about (D-117), on the parsed DOM: Spring and Connor by their own photos and the brief's bios, the
// Utah Life story, why we built this, and the house rules (above all: no "Forum").

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const html = `<!doctype html><html lang="en"><head>${renderAboutHead()}</head><body>${renderAboutBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $$ = (selector: string) => [...doc.querySelectorAll(selector)];

/** The overnight brief's bios, word for word, as Ampy sent them. */
const BRIEF_SPRING =
  "Spring Bengtzen is the founder and CEO of The Utah Life Real Estate Group, an eXp Realty team based in Farmington, Utah, and the founder of Spring B, where she coaches real estate team owners. Her team is 100 agents closing 700+ homes a year. She has more than 20 years in the business and was named to REALTOR Magazine's 30 Under 30 in 2010. She also leads Spring B Coaching, co-leads be Collective, and founded The Forum and Activated Agents, along with mortgage and title businesses.";
const BRIEF_CONNOR =
  "Connor Leiva is a Dallas-based real estate operator and a licensed Texas sales agent with Owns the Home Group and eXp Realty. He has spent more than a decade in the industry, starting as a data analyst at RE/MAX Headquarters, later leading strategic growth work at Realogy for the Better Homes and Gardens Real Estate and ERA networks, and serving since 2021 as Executive Director of Onboarding & Launch at PLACE. He holds an MBA from the University of Denver and a master's in Organization Development and Change from Penn State, and he also coaches leaders on real estate systems and business planning. He is co-founder of Amplified Impact.";
const curly = (s: string) => s.replace(/'/g, '’');

describe('/about', () => {
  it('is what the site plugin builds, with its canonical address, the nav marking About, a real share image and no script', () => {
    expect([renderHead, renderBody]).toEqual([renderAboutHead, renderAboutBody]);
    expect(text(doc.querySelector('title'))).toBe('About · Amplified Impact');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/about');
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen-2.jpg');
    expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current="page"]'))).toBe('About');
    expect(read('../../about.html') + html).not.toMatch(/<script/i);
    expect([...html.matchAll(TOKEN_PATTERN)]).toEqual([]);
  });

  it('puts Spring first and Connor second, each in their own photo from this site', () => {
    expect($$('.bio h2').map(text)).toEqual(['Spring Bengtzen', 'Connor Leiva']);
    expect($$('.bio img').map((i) => [i.getAttribute('src'), i.getAttribute('alt')])).toEqual([
      ['/img/team/spring-bengtzen-2.jpg', 'Spring Bengtzen'],
      ['/img/team/connor-leiva.jpg', 'Connor Leiva'],
    ]);
    for (const p of Object.values(ABOUT_PHOTOS)) {
      const file = readFileSync(resolve(HERE, `../../public${p.src}`));
      expect([file[0], file[1]], p.src).toEqual([0xff, 0xd8]);
    }
    expect($$('.bio-role').map(text)).toEqual(['Founder and CEO, The Utah Life Real Estate Group', 'Co-founder, Amplified Impact']);
  });

  it('uses the brief’s bios word for word, with only Spring’s “The Forum” cut', () => {
    expect(BIOS.connor.body).toBe(curly(BRIEF_CONNOR));
    expect(BIOS.spring.body).toBe(curly(BRIEF_SPRING.replace('founded The Forum and Activated Agents', 'founded Activated Agents')));
    expect($$('.bio-text p:last-child').map(text)).toEqual([BIOS.spring.body, BIOS.connor.body]);
  });

  it('tells the Utah Life story with the homepage’s proof line, and why we built this', () => {
    expect($$('main h2').map(text)).toEqual(['Spring Bengtzen', 'Connor Leiva', 'The Utah Life story', 'Why we built this', 'Start with 5 free skills.']);
    expect([text(doc.querySelector('.about-proof span')), text(doc.querySelector('.about-proof strong'))]).toEqual([HOME.proof.label, HOME.proof.figure]);
    expect($$('.about-end a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
  });

  it('follows the house rules: no “Forum”, no em dashes, no testimonials or results promises', () => {
    const words = text(doc.body) + renderAboutHead();
    expect(words).not.toMatch(/forum/i);
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|10x|close more|more deals|!/i);
    const css = read('./about.css') + read('../site/site.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});
