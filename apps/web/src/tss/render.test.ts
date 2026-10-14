import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONSENT } from '../legal/content';
import { PAGE } from './content';
import { esc, renderTssBody, renderTssHead } from './render';

// /task-sync-starter's markup contract (D-038), on the parsed DOM. What the script does with it is
// `main.test.ts`'s; that the API serves it is `apps/api/test/task-sync-starter.test.ts`'s.
//
// Values a visitor sees or a link depends on are typed out here, not read from `content.ts`, so a
// change to one is a change to this file too.

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderTssHead()}</head><body>${renderTssBody()}</body></html>`,
  'text/html',
);
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe('Task Sync Starter Kit · Amplified Impact');
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://www.amplifiedimpact.io/task-sync-starter',
    );
    expect($('meta[name="description"]')?.getAttribute('content')).toMatch(/^Turn every promise/);
  });
});

describe('the opt-in', () => {
  const form = () => $('#tss-form') as HTMLFormElement;

  it('is a plain POST to the kit route, so it works with no script', () => {
    expect(form().getAttribute('method')).toBe('post');
    expect(form().getAttribute('action')).toBe('/api/task-sync-starter');
    // `main.ts` sets noValidate once it validates; the markup keeps the browser's own checks.
    expect(form().hasAttribute('novalidate')).toBe(false);
  });

  it('asks for a first name and an email, both required, and nothing else a person can see', () => {
    const name = $('#tss-firstName') as HTMLInputElement;
    const email = $('#tss-email') as HTMLInputElement;
    expect([name.name, name.type, name.required, name.autocomplete]).toEqual(['firstName', 'text', true, 'given-name']);
    expect([email.name, email.type, email.required, email.autocomplete]).toEqual(['email', 'email', true, 'email']);
    expect(text($('label[for="tss-firstName"]'))).toBe('First name');
    expect(text($('label[for="tss-email"]'))).toBe('Email');
    expect($$('#tss-form input').map((i) => (i as HTMLInputElement).name)).toEqual(['firstName', 'email', 'website']);
  });

  it('has no phone field and no SMS box: the API refuses to record either from this page (D-038)', () => {
    expect($$('input[name="phone"], input[name="smsConsent"], input[type="tel"], input[type="checkbox"]')).toEqual([]);
  });

  it('hides the honeypot from people and from the tab order', () => {
    const trap = $('#tss-website') as HTMLInputElement;
    expect(trap.name).toBe('website');
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("says, under the button, exactly what the Terms quote as the kit's consent", () => {
    // The Terms page quotes these words as what a visitor agreed to. The two must not drift.
    expect(text($('#tss-form .legal'))).toBe(CONSENT.kit);
    expect(CONSENT.kit).toBe(
      'By getting the kit, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor. Unsubscribe anytime.',
    );
    const links = $$('#tss-form .legal a').map((a) => [text(a), a.getAttribute('href'), a.getAttribute('target')]);
    expect(links).toEqual([
      ['Terms of Service', '/terms', '_blank'],
      ['Privacy Policy', '/privacy', '_blank'],
    ]);
  });

  it('has the button the reel promises, and an error line that is an alert', () => {
    expect(text($('#tss-form button[type="submit"]'))).toBe('Get the Kit');
    expect($('#tss-error')?.getAttribute('role')).toBe('alert');
  });
});

describe('the download', () => {
  it('sits in the same card as the form, behind it, focusable when it opens', () => {
    const card = $('#get-the-kit')!;
    const download = $('#download')!;
    expect(download.closest('#get-the-kit')).toBe(card);
    expect(download.classList.contains('unlocked')).toBe(true);
    expect(download.getAttribute('tabindex')).toBe('-1');
    expect($('#tss-form')!.closest('.locked')?.closest('#get-the-kit')).toBe(card);
  });

  it('is a "Download Here" link to the PDF, saved under the kit\'s own name', () => {
    const link = $('#download a[data-download]')!;
    expect(text(link)).toBe('Download Here');
    expect(link.getAttribute('href')).toBe('/downloads/task-sync-starter-kit.pdf');
    expect(link.getAttribute('download')).toBe('Task Sync Starter Kit - Amplified Impact.pdf');
  });

  it('has the in-app browser hint, hidden until the script finds one', () => {
    const hint = $('#download [data-in-app]') as HTMLElement;
    expect(hint.hidden).toBe(true);
    expect(text(hint)).toMatch(/Open in browser/);
  });

  it('links to a PDF that exists in public/, so the build ships it', () => {
    const pdf = readFileSync(resolve(HERE, '../../public/downloads/task-sync-starter-kit.pdf'));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100_000);
  });
});

describe('the rest of the page', () => {
  it('sends the lower button back up to the opt-in', () => {
    expect($$('a.btn-outline').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get the Kit', '#get-the-kit'],
    ]);
  });

  it('has one h1, and every section is named by its heading', () => {
    expect($$('h1').map(text)).toEqual(['Task Sync Starter Kit']);
    for (const section of $$('section[aria-labelledby]')) {
      expect(doc.getElementById(section.getAttribute('aria-labelledby')!), section.className).not.toBeNull();
    }
  });

  it('opens the Terms and Privacy Policy in a new tab from the footer too', () => {
    const links = $$('footer a').map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/terms', '/privacy']);
  });

  it('follows the house rule: no em dashes anywhere in the copy', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(JSON.stringify(PAGE)).not.toContain('—');
  });

  it('escapes what it renders', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('the gate, in the stylesheet', () => {
  const css = read('./tss.css');

  it('hides the download until the visitor opts in, by script or by the no-JS 303', () => {
    expect(css).toMatch(/\.unlocked \{\s*display: none;\s*\}/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.unlocked,\s*\.unlocked:target \{\s*display: flex;/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.locked \{\s*display: none;/);
    expect(css).toMatch(/\.optin:has\(\.unlocked:target\) \.locked \{\s*display: none;/);
  });

  it('shows the form error for the no-JS 303 to #tss-error', () => {
    expect(css).toMatch(/\.form-error:target,\s*\.form-error\[data-shown\] \{\s*display: block;/);
  });
});

describe('the shell', () => {
  const shell = read('../../task-sync-starter.html');

  it('has both markers the plugin fills, and loads its own stylesheet and script', () => {
    expect(shell).toContain('<!--tss:head-->');
    expect(shell).toContain('<!--tss:body-->');
    expect(shell).toContain('href="/src/tss/tss.css"');
    expect(shell).toContain('src="/src/tss/main.ts"');
  });
});
