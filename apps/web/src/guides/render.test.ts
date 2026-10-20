import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { CONSENT, SENDERS } from '../legal/content';
import { GUIDE_SENDERS, GUIDES, type Guide } from './content';
import { esc, guideFor, renderGuideBody, renderGuideHead } from './render';
import { GUIDE_HTML } from './vite-plugin';

// The free guides' markup contract (D-038, D-039, D-045), on the parsed DOM, for every guide. What the
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
    file: '/downloads/task-sync-starter-kit.pdf',
    filename: 'Task Sync Starter Kit - Amplified Impact.pdf',
    magic: '%PDF-',
    minBytes: 100_000,
    unlockKey: 'tss-unlocked',
  },
  'ops-time-audit': {
    title: 'The Ops Time Audit · Amplified Impact',
    h1: 'The Ops Time Audit',
    anchor: 'get-the-guide',
    button: 'Get the Guide',
    file: '/downloads/ops-time-audit.pdf',
    filename: 'The Ops Time Audit - Amplified Impact.pdf',
    magic: '%PDF-',
    minBytes: 100_000,
    unlockKey: 'ota-unlocked',
  },
  'reel-editor': {
    title: 'Reel Editor: A Free Claude Skill · Amplified Impact',
    h1: 'Reel Editor',
    anchor: 'get-the-skill',
    button: 'Get the Skill',
    file: '/downloads/reel-editor.zip',
    filename: 'reel-editor.zip',
    // A ZIP's local file header.
    magic: 'PK\u0003\u0004',
    minBytes: 20_000,
    unlockKey: 're-unlocked',
  },
} as const;

describe('the list of guides', () => {
  it('has the three guides, each with a shell the build reads and the API serves by the same slug', () => {
    expect(Object.keys(GUIDES)).toEqual(['task-sync-starter', 'ops-time-audit', 'reel-editor']);
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

  it('says, under the button, exactly what CONSENT.guides records, naming only Amplified Impact, LLC (D-041)', () => {
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

  it('offers one "Download Here", saved under the guide\'s own name, from a file the build ships', () => {
    expect($$('[data-download]')).toHaveLength(1);
    const link = $('#download a[data-download]')!;
    expect(text(link)).toBe('Download Here');
    expect(link.getAttribute('href')).toBe(want.file);
    expect(link.getAttribute('download')).toBe(want.filename);
    const file = readFileSync(resolve(HERE, `../../public${want.file}`));
    expect(file.subarray(0, want.magic.length).toString('latin1')).toBe(want.magic);
    expect(file.length).toBeGreaterThan(want.minBytes);
  });

  it('has the in-app browser hint, hidden until the script finds one', () => {
    const hint = $('#download [data-in-app]') as HTMLElement;
    expect(hint.hidden).toBe(true);
    expect(text(hint)).toMatch(/Open in browser/);
  });

  it('sends the lower button back up to the opt-in', () => {
    // Outside the opt-in card: inside it, a skill's setup steps have outline buttons of their own.
    expect($$('main > section:not(.optin) a.btn-outline').map((a) => [text(a), a.getAttribute('href')])).toEqual([
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

/**
 * The entries of a ZIP, read from its central directory, and each one's contents. Enough of the format
 * for a test: no ZIP64, no encryption, stored or deflated.
 */
function unzip(buf: Buffer): Map<string, Buffer> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('No end of central directory: not a ZIP.');
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const skip = nameLength + buf.readUInt16LE(at + 30) + buf.readUInt16LE(at + 32);
    const name = buf.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const local = buf.readUInt32LE(at + 42);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(raw) : raw);
    at += 46 + skip;
  }
  return out;
}

describe('The Reel Editor, its own parts (D-045)', () => {
  const guide = guideFor('reel-editor');
  const doc = parse(guide);
  const $ = (selector: string) => doc.querySelector(selector);
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
  const steps = () => $$('#download .setup > li');

  it('walks through setup in the unlocked card, numbered, with the download as step 2', () => {
    expect(steps().map((li) => [text(li.querySelector('.setup-n')), text(li.querySelector('h3'))])).toEqual([
      ['1', 'Turn On Code Execution'],
      ['2', 'Download the Skill'],
      ['3', 'Add It to Claude'],
      ['4', 'Make Your First Reel'],
    ]);
    // The number is drawn, and the list already says it.
    expect(steps().every((li) => li.querySelector('.setup-n')?.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(steps()[1]!.querySelector('a[data-download]')).not.toBeNull();
    expect(steps()[1]!.querySelector('[data-in-app]')).not.toBeNull();
    expect(text(steps()[1])).toContain('Don’t unzip it.');
  });

  it("opens Claude's own settings and skills pages in a new tab, from steps 1 and 3", () => {
    const links = $$('#download .setup a:not([data-download])').map((a) => [
      text(a),
      a.getAttribute('href'),
      a.getAttribute('target'),
      a.getAttribute('rel'),
    ]);
    expect(links).toEqual([
      ['Open Claude Settings', 'https://claude.ai/settings/capabilities', '_blank', 'noopener'],
      ['Open Claude Skills', 'https://claude.ai/customize/skills', '_blank', 'noopener'],
    ]);
  });

  it('says, in Instagram, to open the real browser, about a ZIP rather than a PDF', () => {
    const hint = text($('#download [data-in-app]'));
    expect(hint).toMatch(/Open in browser/);
    expect(hint).not.toMatch(/PDF/);
  });

  it('ships the skill as Claude takes it: one reel-editor folder whose SKILL.md is named reel-editor', () => {
    // Claude's upload refuses a ZIP whose folder name and skill name differ, or that has no SKILL.md.
    const zip = unzip(readFileSync(resolve(HERE, '../../public/downloads/reel-editor.zip')));
    const names = [...zip.keys()];
    expect(names.every((n) => n.startsWith('reel-editor/'))).toBe(true);
    expect(names.some((n) => n.includes('__MACOSX') || n.endsWith('.DS_Store'))).toBe(false);
    const skill = zip.get('reel-editor/SKILL.md')?.toString('utf8') ?? '';
    expect(skill.match(/^---\nname: (.+)\n/)?.[1]).toBe('reel-editor');
    expect(names).toContain('reel-editor/scripts/setup.sh');
  });

  it("sends a phone to a computer: a mailto with the page, and the share sheet's title and link", () => {
    const handoff = $('#download .handoff')!;
    expect(handoff.compareDocumentPosition($('#download .setup')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const link = handoff.querySelector('a[data-share]')!;
    expect(text(link)).toBe('Send This to My Computer');
    const href = link.getAttribute('href')!;
    expect(href.startsWith('mailto:?')).toBe(true);
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe('Reel Editor: add it to Claude on your computer');
    expect(params.get('body')).toBe('Open this on your computer:\nhttps://www.amplifiedimpact.io/reel-editor#download');
    expect(link.getAttribute('data-share-title')).toBe('Reel Editor: add it to Claude on your computer');
    expect(link.getAttribute('data-share-url')).toBe('https://www.amplifiedimpact.io/reel-editor#download');
  });

  it('copies "Edit this into a Reel" from step 4, by a button named for what it does', () => {
    const chip = steps()[3]!.querySelector('button[data-copy]')!;
    expect(chip.getAttribute('type')).toBe('button');
    expect(text(chip.querySelector('[data-copy-text]'))).toBe('Edit this into a Reel');
    expect(text(chip.querySelector('.visually-hidden'))).toBe('Copy:');
    expect(chip.querySelector('.chip-tag')?.getAttribute('aria-hidden')).toBe('true');
    expect(chip.getAttribute('data-toast')).toBe('Copied. Paste it into Claude.');
  });

  it("lists what to say, in the README's three groups, each one a copy button", () => {
    const section = $('section.prompts')!;
    expect(text(section.querySelector('h2'))).toBe('What to say');
    expect($$('section.prompts .group-label').map(text)).toEqual([
      'To start',
      'Quick fixes, no full re-render',
      'Other changes',
    ]);
    expect($$('section.prompts [data-copy-text]').map(text)).toEqual([
      'Edit this into a Reel',
      'Make this more engaging with animations, sound effects and music',
      'Make my voice louder',
      'Turn the sound effects down',
      'No music',
      'Move the graphics lower',
      'Make it look more like a creator edited it',
      'Cleaner, less busy',
    ]);
  });

  it('has the one live region the copy buttons report to', () => {
    expect($$('[aria-live]').map((el) => [el.id, el.getAttribute('role'), el.getAttribute('aria-live')])).toEqual([
      ['guide-live', 'status', 'polite'],
    ]);
  });

  it('answers its questions in <details>, which open with no script', () => {
    const items = $$('section.faq details.faq-item');
    expect(items.map((d) => text(d.querySelector('summary')))).toEqual([
      'Claude stopped partway through.',
      'How long does it take?',
      'My video won’t upload.',
      'My Mac unzipped the download.',
      'The skill is greyed out, or setup fails.',
      'Can it match a style I like?',
      'Is the music safe to post?',
      'Does it work for TikTok and Shorts?',
      'Do I need editing software?',
    ]);
    expect(items.every((d) => text(d.querySelector('p')).length > 0)).toBe(true);
  });

  it("asks for a paid plan, as the skill's README does", () => {
    const section = $$('section.need').find((s) => text(s.querySelector('h2')) === 'What you need')!;
    const need = Array.from(section.querySelectorAll('li')).map((li) => [
      text(li.querySelector('strong')),
      text(li.querySelector('span')),
    ]);
    expect(need[0]).toEqual(['A paid Claude plan', 'Pro, Max, Team or Enterprise.']);
  });

  it('lays its four-card and two-card rows out two by two', () => {
    expect($$('ul.tiles-2').map((ul) => ul.children.length)).toEqual([4, 2]);
  });
});

describe('a PDF guide, untouched by the skill parts (D-045)', () => {
  it.each(['task-sync-starter', 'ops-time-audit'])('/%s has no setup, handoff, copy buttons or live region', (slug) => {
    const doc = parse(guideFor(slug));
    expect(doc.querySelectorAll('.setup, .handoff, [data-copy], [aria-live], details').length).toBe(0);
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

  it('shows the handoff to a computer on a touch screen only (D-045)', () => {
    expect(css).toMatch(/\.handoff \{\s*display: none;/);
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.handoff \{\s*display: flex;/);
  });

  it('never hides the empty toast with display: none, which would silence the next "Copied" (D-045)', () => {
    const empty = css.match(/\.toast:empty \{([^}]*)\}/)?.[1] ?? '';
    expect(empty).toContain('opacity: 0');
    expect(empty).not.toContain('display');
  });
});

describe('esc', () => {
  it('escapes what it renders', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
