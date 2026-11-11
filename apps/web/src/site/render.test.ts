import { describe, expect, it } from 'vitest';
import { HELP_EMAIL, SITE } from './content';
import { freeTag, lockTag, siteFooter, siteHead, siteHeader } from './render';

// The pieces every www page shares (D-107): Spring's main nav, the footer and the share tags.

const parse = (html: string) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the header', () => {
  it('has Spring’s main nav: Programs, The Library, Free Resources, About, and a Get 5 Free Skills button', () => {
    const doc = parse(siteHeader('/library'));
    expect([...doc.querySelectorAll('nav[aria-label="Main"] a')].map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Programs', '/pricing'],
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
    ]);
    const cta = doc.querySelector('a.site-cta');
    expect([text(cta), cta?.getAttribute('href'), cta?.className]).toEqual(['Get 5 Free Skills', '/library?show=free', 'btn btn-primary btn-sm site-cta']);
    expect(doc.querySelector('[data-brand-slot]')?.getAttribute('href')).toBe('/');
  });

  it('marks the page the visitor is on', () => {
    const doc = parse(siteHeader('/about'));
    expect([...doc.querySelectorAll('[aria-current="page"]')].map(text)).toEqual(['About']);
  });
});

describe('the footer', () => {
  it('names support, and links the site and the legal pages', () => {
    const doc = parse(siteFooter());
    expect(doc.querySelector('.site-contact a')?.getAttribute('href')).toBe(`mailto:${HELP_EMAIL}`);
    expect(HELP_EMAIL).toBe('support@amplifiedimpact.io');
    expect([...doc.querySelectorAll('nav[aria-label="Legal"] a')].map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy', '/agreement']);
    expect(siteFooter()).not.toContain('admin@');
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
