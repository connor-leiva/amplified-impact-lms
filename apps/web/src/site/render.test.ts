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
  // Its own page since Connor's Nov 11 yes; the Library before.
  ['Amplified Insiders', '/insiders'],
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

  it('writes the canonical address and share tags from a path, with the branded share image by default', () => {
    const head = parse(siteHead({ title: 'T', description: 'D', path: '/about' })).body;
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE.url}/about`);
    expect(head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/img/og/amplified-impact.png');
    expect(head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  });

  it('lets a page name its own share image in its page data', () => {
    const image = { src: '/img/og/other.png', width: 1200, height: 630, alt: 'Other' };
    const head = parse(siteHead({ title: 'T', description: 'D', path: '/x', image })).body;
    expect(head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(`${SITE.url}/img/og/other.png`);
    expect(head.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(`${SITE.url}/img/og/other.png`);
    expect(head.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBe('Other');
  });

  it('has no em dash anywhere', () => {
    expect(siteHeader('/') + siteFooter()).not.toMatch(/[–—]/);
  });
});
