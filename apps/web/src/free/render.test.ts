import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_PATTERN } from '@ai/core/offer';
import { ENTRIES, FREE_FIVE } from '../library/content';
import { HOME } from '../home/content';
import { entryFor } from '../home/library-data';
import { paid } from '../library/render';
import { AI101_SIGNUP, COLUMNS } from './content';
import { EXAMPLES_ON } from './examples';
import { renderBody, renderFreeBody, renderFreeHead, renderHead, resource } from './render';

// /free, Free Resources (D-116), on the parsed DOM: Spring's two columns, the five resources the brief
// names plus the AI 101 registration, each by its Library card, and the house rules.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const html = `<!doctype html><html lang="en"><head>${renderFreeHead()}</head><body>${renderFreeBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

describe('/free', () => {
  it('is what the site plugin builds, with its canonical address, the nav marking Free Resources, and only the kit’s script', () => {
    expect(renderHead).toBe(renderFreeHead);
    expect(renderBody()).toBe(renderFreeBody());
    expect(text(doc.querySelector('title'))).toBe('Free Resources · Amplified Impact');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.amplifiedimpact.io/free',
    );
    expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current="page"]'))).toBe('Free Resources');
    const shell = read('../../free.html');
    expect(shell).toContain('<body class="aiw" data-theme="dark" data-app-ready="true">');
    expect([...shell.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0])).toEqual([
      '<script type="module" src="/src/kit/client/main.ts">',
    ]);
    expect(html).not.toMatch(/<script/i);
    expect(shell + html).not.toMatch(/\son[a-z]+=/i);
    expect([...html.matchAll(TOKEN_PATTERN)]).toEqual([]);
  });

  it('has Spring’s two columns, For Agents and For Team Owners', () => {
    expect($$('.free-col h2').map(text)).toEqual(['For Agents', 'For Team Owners']);
  });

  it('opens with the two doors, one to each column, each listing what is in it', () => {
    expect($$('.doors a.door').map((a) => [text(a.querySelector('.door-name')), a.getAttribute('href')])).toEqual([
      ['For Agents', '#agents'],
      ['For Team Owners', '#owners'],
    ]);
    expect($$('.door').map((d) => $$('.door-list li', d).map(text))).toEqual([
      [...COLUMNS[0].slugs.map((s) => resource(s).title), AI101_SIGNUP.label],
      COLUMNS[1].slugs.map((s) => resource(s).title),
    ]);
    expect(doc.getElementById('agents')?.matches('section')).toBe(true);
    expect(doc.getElementById('owners')?.matches('section.inverse')).toBe(true);
  });

  it('links exactly what the brief names: the five pages and the AI 101 registration at ai.springb.co', () => {
    const hrefs = $$('.res h3 a').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/voice-profile',
      '/ai101',
      'https://ai.springb.co',
      '/ops-time-audit',
      '/task-sync-starter',
      '/retool',
    ]);
  });

  it('names each resource by its Library card, each a free one with its own opt-in', () => {
    for (const c of COLUMNS) {
      for (const slug of c.slugs) {
        const e = resource(slug);
        const a = doc.querySelector(`.res h3 a[href="/${slug}"]`);
        const card = a?.closest('.res');
        expect(text(a), slug).toBe(e.title);
        expect(text(card?.querySelector('.fr-type, .own-type')), slug).toBe(e.kind);
        expect(text(card?.querySelector('.fr-text, .own-text')), slug).toBe(e.description);
        // A guide or kit (a Free Resource), or the voice profile, one of the free five: never locked.
        expect(paid(e), slug).toBe(false);
      }
    }
    expect(() => resource('not-a-page')).toThrow(/no Library card/);
    // The homepage's free resources are the same ones, so the two pages cannot disagree.
    expect(HOME.free.columns.flatMap((c) => [...c.slugs]).sort()).toEqual(COLUMNS.flatMap((c) => [...c.slugs]).sort());
    expect(
      ENTRIES.filter((e) => COLUMNS.some((c) => (c.slugs as readonly string[]).includes((e.href ?? '').slice(1)))),
    ).toHaveLength(5);
  });

  it('makes each card one link, its title, with Open drawn for the eye only', () => {
    for (const card of $$('.res')) {
      expect($$('a', card)).toHaveLength(1);
      expect(card.querySelector('h3 a')).not.toBeNull();
      expect(card.querySelector('.res-open')?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(read('./free.css')).toContain(
      ".aiw .fr-name a::after,\n.aiw .own-name a::after {\n  content: '';\n  position: absolute;\n  inset: 0;",
    );
  });

  it('points to the 5 free skills and the programs, and lists the five beside them', () => {
    expect($$('.free-skills .actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
    expect($$('.free-skills .free-list a').map((a) => a.getAttribute('href'))).toEqual(
      FREE_FIVE.map((slug) => entryFor(slug).href),
    );
  });

  it('keeps the made-up previews and panels off, and when on, tags each one', () => {
    expect(EXAMPLES_ON).toBe(false);
    expect(html).not.toContain('Made-up example');
    expect($$('.fr-pv, .own-panels')).toHaveLength(0);
    expect(doc.querySelector('.own-grid')?.classList.contains('is-solo')).toBe(true);
    const on = new DOMParser().parseFromString(renderFreeBody({ examples: true }), 'text/html');
    expect(on.querySelectorAll('.fr-pv')).toHaveLength(3);
    expect(on.querySelectorAll('.own-panels .panel')).toHaveLength(3);
    // The two agents' previews and the three panels are made up; AI 101's only says what it is.
    expect(on.querySelectorAll('.ex-tag')).toHaveLength(5);
    // The same links, on or off.
    const hrefs = (d: Document) => [...d.querySelectorAll('main a')].map((a) => a.getAttribute('href'));
    expect(hrefs(on)).toEqual(hrefs(doc));
  });

  it('follows the house rules', () => {
    const words = text(doc.body) + renderFreeHead();
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum|!/i);
    expect(read('./free.css')).toContain("@import '../kit/kit.css';");
    const css = read('./free.css') + read('../kit/kit.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});
