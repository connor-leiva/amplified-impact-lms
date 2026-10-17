import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONSENT, SENDERS } from '../legal/content';
import { GUIDE_SENDERS, GUIDES, type Guide } from './content';
import { esc, guideFor, renderGuideBody, renderGuideHead } from './render';
import { GUIDE_HTML } from './vite-plugin';

// The free guides' markup contract (D-038, D-039), on the parsed DOM, for every guide. What the
// script does with it is `main.test.ts`'s; that the API serves it is
// `apps/api/test/guides.test.ts`'s.
//
// Values a visitor sees or a link depends on are typed out here, not read from the content files, so
// a change to one is a change to this file too.

const parse = (guide: Guide) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderGuideHead(guide)}</head><body>${renderGuideBody(guide)}</body></html>`,
    'text/html',
  );
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

/** What differs between the guides, typed out. */
const EXPECTED = {
  'task-sync-starter': {
    title: 'Task Sync Starter Kit · Amplified Impact',
    h1: 'Task Sync Starter Kit',
    anchor: 'get-the-kit',
    button: 'Get the Kit',
    pdf: '/downloads/task-sync-starter-kit.pdf',
    filename: 'Task Sync Starter Kit - Amplified Impact.pdf',
    unlockKey: 'tss-unlocked',
  },
  'ops-time-audit': {
    title: 'The Ops Time Audit · Amplified Impact',
    h1: 'The Ops Time Audit',
    anchor: 'get-the-guide',
    button: 'Get the Guide',
    pdf: '/downloads/ops-time-audit.pdf',
    filename: 'The Ops Time Audit - Amplified Impact.pdf',
    unlockKey: 'ota-unlocked',
  },
} as const;

describe('the list of guides', () => {
  it('has the two guides, each with a shell the build reads and the API serves by the same slug', () => {
    expect(Object.keys(GUIDES)).toEqual(['task-sync-starter', 'ops-time-audit']);
    expect(GUIDE_HTML).toEqual(Object.keys(GUIDES).map((slug) => `${slug}.html`));
    for (const slug of Object.keys(GUIDES)) {
      expect(GUIDES[slug]!.slug).toBe(slug);
      const shell = read(`../../${slug}.html`);
      expect(shell, slug).toContain('<!--guide:head-->');
      expect(shell, slug).toContain('<!--guide:body-->');
      expect(shell, slug).toContain('href="/src/guides/guides.css"');
      expect(shell, slug).toContain('src="/src/guides/main.ts"');
    }
  });

  it('keeps every guide apart: its own anchor, PDF and unlock key', () => {
    const guides = Object.values(GUIDES);
    for (const pick of [(g: Guide) => g.download.href, (g: Guide) => g.unlockKey, (g: Guide) => g.download.filename]) {
      expect(new Set(guides.map(pick)).size).toBe(guides.length);
    }
  });

  it('names a slug nobody wrote as a build error', () => {
    expect(() => guideFor('nope')).toThrow(/No guide has the slug "nope"/);
  });
});

describe.each(Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>)('/%s', (slug) => {
  const want = EXPECTED[slug];
  const guide = guideFor(slug);
  const doc = parse(guide);
  const $ = (selector: string) => doc.querySelector(selector);
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));

  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe(want.title);
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe(`https://www.amplifiedimpact.io/${slug}`);
    expect($$('h1').map(text)).toEqual([want.h1]);
  });

  it("posts the opt-in to the guide's own route, as a plain form that works with no script", () => {
    const form = $('#guide-form') as HTMLFormElement;
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe(`/api/${slug}`);
    expect(form.hasAttribute('novalidate')).toBe(false);
    expect($$('#guide-form input').map((i) => (i as HTMLInputElement).name)).toEqual(['firstName', 'email', 'website']);
  });

  it('asks for a first name and an email, both required', () => {
    const name = $('#guide-firstName') as HTMLInputElement;
    const email = $('#guide-email') as HTMLInputElement;
    expect([name.name, name.type, name.required, name.autocomplete]).toEqual(['firstName', 'text', true, 'given-name']);
    expect([email.name, email.type, email.required, email.autocomplete]).toEqual(['email', 'email', true, 'email']);
    expect(text($('label[for="guide-firstName"]'))).toBe('First name');
    expect(text($('label[for="guide-email"]'))).toBe('Email');
  });

  it('has no phone field and no SMS box: the API refuses to record either from a guide (D-038)', () => {
    expect($$('input[name="phone"], input[name="smsConsent"], input[type="tel"], input[type="checkbox"]')).toEqual([]);
  });

  it('hides the honeypot from people and from the tab order', () => {
    const trap = $('#guide-website') as HTMLInputElement;
    expect(trap.name).toBe('website');
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('says, under the button, exactly what the Terms quote, naming only Amplified Impact, LLC (D-041)', () => {
    expect(text($('#guide-form .legal'))).toBe(
      'By signing up, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.',
    );
    expect(text($('#guide-form .legal'))).toBe(CONSENT.guides);
    const links = $$('#guide-form .legal a').map((a) => [text(a), a.getAttribute('href'), a.getAttribute('target')]);
    expect(links).toEqual([
      ['Terms of Service', '/terms', '_blank'],
      ['Privacy Policy', '/privacy', '_blank'],
    ]);
  });

  it('never mentions Spring or Spring B anywhere on the page (D-039)', () => {
    expect(doc.documentElement.outerHTML).not.toMatch(/Spring/);
  });

  it('has the button the reel promises, and an error line that is an alert', () => {
    expect(text($('#guide-form button[type="submit"]'))).toBe(want.button);
    expect($('#guide-error')?.getAttribute('role')).toBe('alert');
  });

  it('keeps the download in the same card as the form, behind it, under its own unlock key', () => {
    const card = $(`#${want.anchor}`)!;
    expect(card.getAttribute('data-unlock-key')).toBe(want.unlockKey);
    const download = $('#download')!;
    expect(download.closest(`#${want.anchor}`)).toBe(card);
    expect(download.classList.contains('unlocked')).toBe(true);
    expect(download.getAttribute('tabindex')).toBe('-1');
    expect($('#guide-form')!.closest('.locked')?.closest(`#${want.anchor}`)).toBe(card);
  });

  it('offers "Download Here", saved under the guide\'s own name, from a PDF the build ships', () => {
    const link = $('#download a[data-download]')!;
    expect(text(link)).toBe('Download Here');
    expect(link.getAttribute('href')).toBe(want.pdf);
    expect(link.getAttribute('download')).toBe(want.filename);
    const pdf = readFileSync(resolve(HERE, `../../public${want.pdf}`));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(100_000);
  });

  it('has the in-app browser hint, hidden until the script finds one', () => {
    const hint = $('#download [data-in-app]') as HTMLElement;
    expect(hint.hidden).toBe(true);
    expect(text(hint)).toMatch(/Open in browser/);
  });

  it('sends the lower button back up to the opt-in', () => {
    expect($$('a.btn-outline').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      [want.button, `#${want.anchor}`],
    ]);
  });

  it('names every section by its own heading, with no id used twice', () => {
    for (const section of $$('section[aria-labelledby]')) {
      expect(doc.getElementById(section.getAttribute('aria-labelledby')!), section.className).not.toBeNull();
    }
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links the Terms and Privacy Policy from the footer too', () => {
    expect($$('footer a').map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy']);
  });

  it('follows the house rule: no em dashes anywhere in the copy', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(JSON.stringify(guide)).not.toContain('—');
  });
});

describe('The Ops Time Audit, its own parts (D-039)', () => {
  const doc = parse(guideFor('ops-time-audit'));
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));

  it("shows page 2's example report as a real table, with its headers and five rows", () => {
    expect($$('.report-table thead th').map(text)).toEqual(['Category', 'Est. hrs/wk', 'Evidence', 'Tag', 'AI-ready']);
    const rows = $$('.report-table tbody tr').map((tr) => [
      text(tr.querySelector('th[scope="row"]')),
      text(tr.querySelector('.hrs')),
      text(tr.querySelector('.tag')),
      text(tr.querySelector('.ready')),
    ]);
    expect(rows).toEqual([
      ['Follow-up writing', '6.5 hrs/wk', 'Draft', 'AI-ready: Yes'],
      ['Transaction coordination', '4 hrs/wk', 'Draft', 'AI-ready: Partial'],
      ['Meeting notes and action items', '3 hrs/wk', 'Run', 'AI-ready: Yes'],
      ['Lead routing and assignment', '2.5 hrs/wk', 'Run', 'AI-ready: Partial'],
      ['Reporting and scorecard assembly', '2 hrs/wk', 'Run', 'AI-ready: Yes'],
    ]);
    expect(text(doc.querySelector('.verdict'))).toMatch(/^Build this first: Follow-up writing\. It has more hours/);
  });

  it('names the three doors with the plan each needs', () => {
    const doors = $$('.tile-label').map((label) => {
      const li = label.closest('li')!;
      return [text(label), text(li.querySelector('strong')), text(li.querySelector('.tile-tag'))];
    });
    expect(doors).toEqual([
      ['Door A', 'Connected tools', 'Paid Claude plans'],
      ['Door B', 'Files or screenshots', 'Any Claude plan'],
      ['Door C', 'Interview', 'Any Claude plan'],
    ]);
  });

  it('points to the Task Sync Starter Kit in the same tab, as page 8 does', () => {
    const link = doc.querySelector('.crosslink a')!;
    expect(text(link)).toBe('The Task Sync Starter Kit');
    expect(link.getAttribute('href')).toBe('/task-sync-starter');
    expect(link.hasAttribute('target')).toBe(false);
  });
});

describe('who a guide sign-up hears from (D-041)', () => {
  it('is Amplified Impact, LLC, the same on the guide pages and in the legal pages', () => {
    expect(GUIDE_SENDERS).toBe('Amplified Impact, LLC');
    expect(SENDERS).toBe(GUIDE_SENDERS);
  });
});

describe('the stylesheet', () => {
  const css = read('./guides.css');

  it('hides the download until the visitor opts in, by script or by the no-JS 303', () => {
    expect(css).toMatch(/\.unlocked \{\s*display: none;\s*\}/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.unlocked,\s*\.unlocked:target \{\s*display: flex;/);
    expect(css).toMatch(/\.optin\[data-state='unlocked'\] \.locked \{\s*display: none;/);
    expect(css).toMatch(/\.optin:has\(\.unlocked:target\) \.locked \{\s*display: none;/);
  });

  it('shows the form error for the no-JS 303 to #guide-error', () => {
    expect(css).toMatch(/\.form-error:target,\s*\.form-error\[data-shown\] \{\s*display: block;/);
  });
});

describe('esc', () => {
  it('escapes what it renders', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
