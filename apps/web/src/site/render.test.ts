import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HELP_EMAIL, PROGRAMS, SITE } from './content';
import { freeTag, lockTag, siteFooter, siteHead, siteHeader } from './render';

// The pieces every www page shares (D-107): Spring's main nav, the footer and the share tags.

const parse = (html: string) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const PROGRAM_LINKS = [
  ['Amplified AI Accelerator', '/team-build'],
  ['Amplified Team Plan', '/teams'],
  ['Amplified Agent Plan', '/agents'],
  ['Amplified Insiders', '/library'],
];
const links = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map((a) => [text(a), a.getAttribute('href')]);

describe('the header', () => {
  it('has Spring’s main nav: Programs, The Library, Free Resources, About, Log In, and a Get 5 Free Skills button', () => {
    const doc = parse(siteHeader('/library'));
    const nav = doc.querySelector('nav[aria-label="Main"]')!;
    expect([...nav.querySelectorAll(':scope > ul > li')].map((li) => text(li.querySelector('summary') ?? li.querySelector('a')))).toEqual([
      'Programs',
      'The Library',
      'Free Resources',
      'About',
      'Log In',
    ]);
    expect(links(nav, ':scope > ul > li > a')).toEqual([
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
      ['Log In', 'https://learn.amplifiedimpact.io/login'],
    ]);
    // Log In comes after About and before the button, in source order too, so a phone shows it as well.
    const order = [...doc.querySelectorAll('a')].map(text);
    expect(order.indexOf('About')).toBeLessThan(order.indexOf('Log In'));
    expect(order.indexOf('Log In')).toBeLessThan(order.indexOf('Get 5 Free Skills'));
    expect(nav.querySelector('a.site-login')?.textContent).toBe('Log In');
    const cta = doc.querySelector('a.site-cta');
    expect([text(cta), cta?.getAttribute('href'), cta?.className]).toEqual(['Get 5 Free Skills', '/library?show=free', 'btn btn-primary btn-sm site-cta']);
    expect(doc.querySelector('[data-brand-slot]')?.getAttribute('href')).toBe('/');
  });

  it('opens Programs as a menu of the four programs and Compare All Programs, with no script', () => {
    const doc = parse(siteHeader('/'));
    const menu = doc.querySelector('nav[aria-label="Main"] li.site-menu > details')!;
    expect(text(menu.querySelector('summary'))).toBe('Programs');
    expect(menu.hasAttribute('open')).toBe(false);
    expect(links(menu, '.site-menu-list a')).toEqual([...PROGRAM_LINKS, ['Compare All Programs', '/pricing']]);
    // The arrow is drawn from the house icons and hidden; the summary says "Programs" in words.
    expect(menu.querySelector('summary svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(siteHeader('/')).not.toMatch(/<script|onclick|role="menu"/i);
  });

  it('marks the page the visitor is on', () => {
    const doc = parse(siteHeader('/about'));
    expect([...doc.querySelectorAll('[aria-current="page"]')].map(text)).toEqual(['About']);
    expect(doc.querySelector('details[data-current]')).toBeNull();
  });

  it('marks a program’s page inside the menu, and the menu’s summary while it’s closed', () => {
    for (const [label, href] of [...PROGRAM_LINKS.slice(0, 3), ['Compare All Programs', '/pricing']]) {
      const doc = parse(siteHeader(href!));
      expect([...doc.querySelectorAll('[aria-current="page"]')].map(text), href!).toEqual([label]);
      expect(doc.querySelector('details[data-current] .site-menu-list [aria-current="page"]'), href!).not.toBeNull();
    }
  });

  it('marks The Library once on /library, not the menu’s Amplified Insiders too', () => {
    const doc = parse(siteHeader('/library'));
    expect([...doc.querySelectorAll('[aria-current="page"]')].map(text)).toEqual(['The Library']);
    expect(doc.querySelector('details[data-current]')).toBeNull();
  });
});

describe('the footer', () => {
  it('names support, and links the site and the legal pages', () => {
    const doc = parse(siteFooter());
    expect(doc.querySelector('.site-contact a')?.getAttribute('href')).toBe(`mailto:${HELP_EMAIL}`);
    expect(HELP_EMAIL).toBe('support@amplifiedimpact.io');
    expect([...doc.querySelectorAll('nav[aria-label="Legal"] a')].map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy', '/agreement']);
    expect(links(doc, 'nav[aria-label="Site"] a')).toEqual([
      ['Home', '/'],
      ['Programs', '/pricing'],
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
      ['Log In', 'https://learn.amplifiedimpact.io/login'],
    ]);
    expect(siteFooter()).not.toContain('admin@');
  });

  it('links the four programs’ own pages', () => {
    const doc = parse(siteFooter());
    expect(links(doc, 'nav[aria-label="Programs"] a')).toEqual(PROGRAM_LINKS);
    expect(PROGRAMS.map((p) => [p.label, p.href])).toEqual(PROGRAM_LINKS);
  });
});

describe('the tags and the head', () => {
  it('labels a free skill and a locked one in words, the lock drawn from the house icons', () => {
    expect(text(parse(freeTag()).body)).toBe('Free');
    const lock = parse(lockTag()).body;
    expect(text(lock)).toBe('Locked');
    expect(lock.querySelector('svg path')?.getAttribute('d')).toMatch(/^M8 10.5H16/);
  });

  it('writes the canonical address and share tags from a path', () => {
    const head = parse(siteHead({ title: 'T', description: 'D', path: '/about' })).body;
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE.url}/about`);
    expect(head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary');
  });

  it('has no em dash anywhere', () => {
    expect(siteHeader('/') + siteFooter()).not.toMatch(/[–—]/);
  });
});

describe('the stylesheet (`site.css`, and the look’s foundation it imports, `look.css`): the homepage’s look, site-wide', () => {
  const here = (file: string) => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), file), 'utf8');
  // `site.css` imports `look.css` (the fonts, the palette, the grounds and the token map) first.
  const css = here('look.css') + here('site.css');
  /** The block of a rule written for `selector` alone (not one in a list of selectors). */
  const rule = (selector: string) => {
    let at = css.indexOf(`\n${selector} {`);
    while (at > -1 && css[at - 1] === ',') at = css.indexOf(`\n${selector} {`, at + 1);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };

  it('draws the header, the footer and the skip link in the dark look on every page, opted in or not', () => {
    // Unscoped: no `.site` or `.hp` in front, so a page still on the paper look gets them too.
    expect(rule('.site-top')).toContain('border-bottom: 1px solid var(--line);');
    expect(rule('.site-foot')).toContain('background-image: var(--grain);');
    expect(rule('.skip')).toContain('background: var(--action);');
    // They carry the dark ground's colours and Geist themselves.
    const own = css.slice(css.indexOf('\n.site,\n.site-top,\n.site-foot,\n.skip {'));
    expect(own).toMatch(/^\n\.site,\n\.site-top,\n\.site-foot,\n\.skip \{[^}]*--font-sans: 'Geist'/);
    expect(css).toMatch(/\n\.site,\n\.site \[data-theme='dark'\],\n\.site-top,\n\.site-foot,\n\.skip \{[^}]*--surface: var\(--site-black\);/);
  });

  it('keeps every word at 16px or more, taps at 44px, and a visible focus ring', () => {
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
    expect(css).not.toMatch(/font: [^;]*\b(1[0-5]|[0-9])px/);
    for (const selector of ['.site-brand', '.site-foot a', '.site .cta-link']) expect(rule(selector)).toContain('min-height: 44px;');
    expect(css).toMatch(/\.site-menu summary \{[^}]*min-height: 44px;/);
    expect(rule('.site-nav .site-menu-list a')).toContain('min-height: 48px;');
    expect(css).toMatch(/\.site-top :focus-visible,\n\.site-foot :focus-visible,\n\.skip:focus-visible \{\s*outline: 2px solid var\(--focus-ring\);/);
    expect(css).toMatch(/\.site :focus-visible \{\s*outline: 2px solid var\(--focus-ring\);/);
  });

  it('stops everything that moves under reduced motion, the chrome included', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  html:has'));
    expect(reduced).toMatch(/\.site \*,[\s\S]*\.skip,\n\s*\.site-top,\n\s*\.site-top \*,\n\s*\.site-foot \* \{[^}]*transition-duration: 0\.001ms !important;/);
  });

  it('self-hosts its fonts, from this folder only', () => {
    expect(css).toContain("src: url('./fonts/geist-latin-wght-normal.woff2') format('woff2')");
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|url\(['"]?https?:/);
  });
});

describe('the pages in the site’s look', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const shell = (name: string) => readFileSync(resolve(root, `${name}.html`), 'utf8');

  it('opt in with `class="site"` on <body>, keeping every attribute the API fills', () => {
    for (const name of ['about', 'free', 'agents', 'teams', 'team-build']) expect(shell(name), name).toMatch(/<body class="site" data-app-ready="true"/);
    expect(shell('agents')).toContain('data-invites="%%invites%%"');
    expect(shell('teams')).toContain('data-founding="%%founding%%" data-invites="%%invites%%"');
    expect(shell('team-build')).toContain('data-founding="%%founding%%" data-seats="%%seats%%"');
  });

  it('opts in the Library and the guides that have their own shells (the skill pages’ come from `shellFor`)', () => {
    for (const name of ['library', 'ops-time-audit', 'task-sync-starter', 'reel-editor']) expect(shell(name), name).toMatch(/<body class="site" data-app-ready="true">/);
    // The guides' stylesheet takes the look's foundation, without the shared pages' component rules.
    const guides = readFileSync(resolve(root, 'src/guides/guides.css'), 'utf8');
    expect(guides).toContain("@import '../site/look.css';");
    expect(guides).not.toContain("@import '../site/site.css';");
  });

  it('opts in AI 101 and the two pages built from it, /voice-profile and /retool', () => {
    for (const name of ['ai101', 'voice-profile', 'retool']) expect(shell(name), name).toMatch(/<body class="site" data-app-ready="true">/);
    const ai101 = readFileSync(resolve(root, 'src/ai101/ai101.css'), 'utf8');
    expect(ai101).toContain("@import '../site/look.css';");
    // Its tints are made from the tokens at :root, so the look makes them again from the mapped ones.
    expect(ai101).toMatch(/\n\.site \{[^}]*--ai101-line: color-mix\(in oklch, var\(--text-primary\) 15%, transparent\);/);
  });

  it('draws a page’s own tokens in the look on every ground, and leaves the homepage’s alone', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'look.css'), 'utf8');
    expect(css).toMatch(/\.site:not\(\.hp\),\n\.site:not\(\.hp\) \[data-theme='dark'\],\n\.site:not\(\.hp\) \[data-theme='light'\] \{[^}]*--text-secondary: var\(--ink-secondary\);/);
  });
});
