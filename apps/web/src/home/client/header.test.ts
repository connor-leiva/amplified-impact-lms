import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT } from '../../kit/content';
import { renderHomeBody } from '../render';
import { initHeader } from './header';

// The kit's header script on the homepage: copied from the kit's, never imported (see `header.ts`), so
// these hold the copy to the kit's source, then drive it on the page the build renders.

const HERE = dirname(fileURLToPath(import.meta.url));
const source = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const KIT_SRC = source('../../kit/client/main.ts');
const HOME_SRC = source('./header.ts');

/** A function as written (from its doc comment, if any, to its closing brace), without `export`. */
function fn(src: string, name: string): string {
  const start = src.search(new RegExp(`(/\\*\\*(?:(?!\\*/)[\\s\\S])*?\\*/\\n)?(export )?function ${name}\\(`));
  expect(start, name).toBeGreaterThanOrEqual(0);
  return src.slice(start, src.indexOf('\n}\n', start) + 3).replace(/^export /m, '');
}
/** A one-line constant as written, without `export`. */
function constant(src: string, name: string): string {
  const line = src.split('\n').find((l) => new RegExp(`^(export )?const ${name} = `).test(l));
  expect(line, name).toBeDefined();
  return line!.replace(/^export /, '');
}

describe('the copy of the kit’s header script', () => {
  it('is the kit’s, character for character: the header turning solid, Programs, closing, and the phone menu', () => {
    for (const name of ['initScrolled', 'close', 'initPrograms', 'initPhoneMenu']) {
      expect(fn(HOME_SRC, name), name).toBe(fn(KIT_SRC, name));
    }
    for (const name of ['REDUCE', 'HOVER', 'DESKTOP', 'matches', 'reducedMotion']) {
      expect(constant(HOME_SRC, name), name).toBe(constant(KIT_SRC, name));
    }
  });

  it('starts the header as the kit’s `init()` does, and nothing else of the kit', () => {
    const init = fn(KIT_SRC, 'init');
    for (const line of [
      "document.documentElement.classList.add('aiw-js');",
      'initScrolled(header);',
      "const programs = header.querySelector<HTMLDetailsElement>('details.hdr-programs');",
      'if (programs) initPrograms(header, programs);',
      "const phone = header.querySelector<HTMLDetailsElement>('details.hdr-mobile');",
      'if (phone) initPhoneMenu(header, phone);',
    ]) {
      expect(init, line).toContain(line);
      expect(fn(HOME_SRC, 'initHeader'), line).toContain(line);
    }
    // Never the kit's module itself: it would start the kit's whole script, and share a chunk.
    expect(HOME_SRC).not.toMatch(/from ['"][^'"]*kit\//);
    expect(source('./main.ts')).not.toMatch(/from ['"][^'"]*kit\//);
  });
});

describe('the kit’s header on the homepage, with the script', () => {
  const reduce = (q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });

  beforeEach(() => {
    document.documentElement.className = '';
    document.body.className = 'hp';
    document.body.innerHTML = renderHomeBody();
    // Reduced motion, so the menus shut at once.
    window.matchMedia = reduce as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.overflow = '';
    vi.restoreAllMocks();
  });

  const header = () => document.querySelector<HTMLElement>('.hp-chrome .hdr')!;
  const programs = () => document.querySelector<HTMLDetailsElement>('details.hdr-programs')!;
  const phone = () => document.querySelector<HTMLDetailsElement>('details.hdr-mobile')!;
  const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }));

  it('marks the page scripted, as the kit does, and leaves the theme switch hidden: the homepage is dark only', () => {
    initHeader(document);
    expect(document.documentElement.classList.contains('aiw-js')).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('.theme-btn')?.hidden).toBe(true);
    expect(header().classList.contains('is-scrolled')).toBe(false);
  });

  it('shuts Programs on Escape, back on Programs, and on a click outside the header', () => {
    initHeader(document);
    programs().open = true;
    key('Escape');
    expect(programs().open).toBe(false);
    expect(document.activeElement).toBe(programs().querySelector('summary'));
    programs().open = true;
    document.querySelector('main')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(programs().open).toBe(false);
  });

  it('names the phone menu’s button for what it does, and holds the page still while the menu is open', () => {
    initHeader(document);
    const btn = phone().querySelector('summary')!;
    expect(btn.getAttribute('aria-label')).toBe(KIT.menuOpen);
    phone().open = true;
    phone().dispatchEvent(new Event('toggle'));
    expect([btn.getAttribute('aria-label'), header().classList.contains('is-open'), document.documentElement.style.overflow]).toEqual([
      KIT.menuClose,
      true,
      'hidden',
    ]);
    key('Escape');
    phone().dispatchEvent(new Event('toggle'));
    expect([phone().open, btn.getAttribute('aria-label'), document.documentElement.style.overflow]).toEqual([false, KIT.menuOpen, '']);
  });
});
