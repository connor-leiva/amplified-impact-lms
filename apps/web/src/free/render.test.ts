import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_PATTERN } from '@ai/core/offer';
import { ENTRIES } from '../library/content';
import { HOME } from '../home/content';
import { paid } from '../library/render';
import { COLUMNS } from './content';
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
  it('is what the site plugin builds, with its canonical address, the nav marking Free Resources, and no script', () => {
    expect([renderHead, renderBody]).toEqual([renderFreeHead, renderFreeBody]);
    expect(text(doc.querySelector('title'))).toBe('Free Resources · Amplified Impact');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/free');
    expect(text(doc.querySelector('nav[aria-label="Main"] [aria-current="page"]'))).toBe('Free Resources');
    expect(read('../../free.html') + html).not.toMatch(/<script/i);
    expect([...html.matchAll(TOKEN_PATTERN)]).toEqual([]);
  });

  it('has Spring’s two columns, For Agents and For Team Owners', () => {
    expect($$('.free-col h2').map(text)).toEqual(['For Agents', 'For Team Owners']);
  });

  it('links exactly what the brief names: the five pages and the AI 101 registration at ai.springb.co', () => {
    const hrefs = $$('.res h3 a').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/voice-profile', '/ai101', 'https://ai.springb.co', '/ops-time-audit', '/task-sync-starter', '/retool']);
  });

  it('names each resource by its Library card, each a free one with its own opt-in', () => {
    for (const c of COLUMNS) {
      for (const slug of c.slugs) {
        const e = resource(slug);
        const a = doc.querySelector(`.res h3 a[href="/${slug}"]`);
        expect(text(a), slug).toBe(e.title);
        expect(text(a?.closest('.res')?.querySelector('p')), slug).toBe(e.description);
        // A guide or kit (a Free Resource), or the voice profile, one of the free five: never locked.
        expect(paid(e), slug).toBe(false);
      }
    }
    expect(() => resource('not-a-page')).toThrow(/no Library card/);
    // The homepage's free resources are the same ones, so the two pages cannot disagree.
    expect(HOME.free.columns.flatMap((c) => [...c.slugs]).sort()).toEqual(COLUMNS.flatMap((c) => [...c.slugs]).sort());
    expect(ENTRIES.filter((e) => COLUMNS.some((c) => (c.slugs as readonly string[]).includes((e.href ?? '').slice(1))))).toHaveLength(5);
  });

  it('points to the 5 free skills and the programs', () => {
    expect($$('.free-skills a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get 5 Free Skills', '/library?show=free'],
      ['See the Programs', '/pricing'],
    ]);
  });

  it('follows the house rules', () => {
    const words = text(doc.body) + renderFreeHead();
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum|!/i);
    const css = read('./free.css') + read('../site/site.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });
});
