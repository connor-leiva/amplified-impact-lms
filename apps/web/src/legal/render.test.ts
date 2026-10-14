import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHROME, CONSENT, DRAFT, EFFECTIVE, LEGAL_VERSION, PRIVACY, SENDERS, SMS_PROGRAM, TERMS } from './content';
import type { Block, Inline, LegalDoc } from './content';
import { brandLogo, esc, highlight, renderLegal, renderLegalBody, renderLegalHead } from './render';

// The markup contract for /terms and /privacy, checked on the parsed DOM: what matters is what a
// browser builds from the bytes. The API serves these pages as built (`apps/api/test/legal.test.ts`);
// this file is what holds the words and the markup to what the waitlist form promises.

const parse = (doc: LegalDoc, draft = DRAFT) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderLegalHead(doc, draft)}</head>` +
      `<body>${renderLegalBody(doc, draft)}</body></html>`,
    'text/html',
  );

const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));
const text = (el: Element | null | undefined) => el?.textContent ?? '';

/** What one run of inline copy contributes to `textContent`. */
const inlineText = (segments: string | readonly Inline[]) =>
  typeof segments === 'string'
    ? segments
    : segments.map((s) => (typeof s === 'string' ? s : 'strong' in s ? s.strong : s.link)).join('');

const blockText = (b: Block): string[] =>
  'p' in b ? [inlineText(b.p)] : 'ul' in b ? b.ul.map((item) => inlineText(item)) : [b.label, b.quote];

/** Every readable paragraph, list item, heading and label in one page's content. */
const copyOf = (doc: LegalDoc): string[] => [
  doc.heading,
  inlineText(doc.intro),
  ...doc.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap(blockText)]),
];

/** The copy that both pages share, except the draft note (which mentions "[brackets]" on purpose). */
const chromeCopy = (): string[] => [
  CHROME.logoLabel,
  CHROME.tocLabel,
  CHROME.footerLabel,
  CHROME.footerContact,
  ...CHROME.footerLinks.map((l) => l.label),
];

const PLACEHOLDER = /\[[^\]\n]*\]/g;
const placeholdersIn = (strings: readonly string[]) => strings.flatMap((s) => s.match(PLACEHOLDER) ?? []);

const DOCS = [TERMS, PRIVACY] as const;

/**
 * A file beside this one, by path. Not `new URL(path, import.meta.url)`: under jsdom the global
 * `URL` is jsdom's, which resolves a relative path against `http://localhost:3000`.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

// --- The form's words, typed out: the oracle `CONSENT` is held to -----------------------------------

const SMS_LABEL =
  "Text me about the December agent track and other programs from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor at the number above. Messages may be sent using automated technology. Consent isn't required to join or to buy anything. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.";
const JOIN_LINE =
  'By joining, you agree to our Terms of Service and Privacy Policy and to emails about the December agent track and other programs from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor. Unsubscribe anytime.';

describe.each(DOCS.map((doc) => [doc.path, doc] as const))('%s · outline and landmarks', (_path, doc) => {
  const page = parse(doc);

  it('has exactly one h1, and it is the page heading', () => {
    expect(all(page, 'h1')).toHaveLength(1);
    expect(text(page.querySelector('h1'))).toBe(doc.heading);
  });

  it('never skips a heading level, and every section is an h2 region named by its heading', () => {
    const levels = all(page.body, 'h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeLessThanOrEqual(levels[i - 1]! + 1);
    const sections = all(page, 'main section');
    expect(sections.map((s) => s.id)).toEqual(doc.sections.map((s) => s.id));
    for (const s of sections) {
      const heading = page.getElementById(s.getAttribute('aria-labelledby') ?? '');
      expect(heading?.tagName, s.id).toBe('H2');
      expect(s.contains(heading), s.id).toBe(true);
    }
  });

  it('is a banner with the logo, one <main> with the document, and a footer', () => {
    expect(all(page, 'main')).toHaveLength(1);
    expect(all(page.body, ':scope > header')).toHaveLength(1);
    expect(all(page.body, ':scope > footer')).toHaveLength(1);
    expect(page.querySelector('main article h1')).not.toBeNull();
  });

  it('shows the effective date and the version at the top', () => {
    const time = page.querySelector('.doc-head time');
    expect(time?.getAttribute('datetime')).toBe('2026-10-14');
    expect(text(time)).toBe('October 14, 2026');
    expect(text(page.querySelector('.doc-head .meta'))).toBe('Effective October 14, 2026 · Version 2026-10-14');
    expect(EFFECTIVE.iso).toBe(LEGAL_VERSION);
  });

  it('has a table of contents that links every section, in order', () => {
    const nav = page.querySelector('nav.toc');
    expect(nav?.getAttribute('aria-labelledby')).toBe('toc-title');
    expect(text(page.getElementById('toc-title'))).toBe(CHROME.tocLabel);
    const links = all(nav!, 'ol > li > a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(doc.sections.map((s) => `#${s.id}`));
    expect(links.map(text)).toEqual(doc.sections.map((s) => s.heading));
  });

  it('links the signature logo to the workshop page, with the brand drawing unchanged', () => {
    const brand = page.querySelector('header a.brand');
    expect(brand?.getAttribute('href')).toBe('/ai101');
    expect(brand?.getAttribute('aria-label')).toBe(CHROME.logoLabel);
    expect(brand?.hasAttribute('data-brand-slot')).toBe(true);
    const svg = brand?.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    // The brand package's own file, with only the three attributes above added to its root.
    const file = read('../../../../design-reference/brand/amplified-impact-signature.svg');
    expect(brandLogo()).toContain(
      file.replace(/^<svg /, '<svg class="brand-logo" aria-hidden="true" focusable="false" '),
    );
  });

  it('links Terms, Privacy and the workshop page in the footer, marking the current page', () => {
    const links = all(page, 'footer nav a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy', '/ai101']);
    expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.getAttribute('href'))).toEqual([
      doc.path,
    ]);
  });

  it('renders every string of its content', () => {
    const visible = page.body.textContent ?? '';
    const labels = all(page.body, '[aria-label]').map((el) => el.getAttribute('aria-label') ?? '');
    const missing = [...copyOf(doc), ...chromeCopy()].filter((s) => !visible.includes(s) && !labels.includes(s));
    expect(missing).toEqual([]);
  });

  it('highlights every [placeholder], and nothing else', () => {
    const marks = all(page, 'mark.placeholder').map(text);
    // The copy, plus the section headings a second time for the table of contents.
    const expected = placeholdersIn([...copyOf(doc), ...doc.sections.map((s) => s.heading), CHROME.footerContact]);
    expect([...marks].sort()).toEqual([...expected].sort());
    for (const m of marks) expect(m).toMatch(/^\[[^\]]+\]$/);
  });

  it('has no script, no inline handlers, no style attributes, and nothing left over from a template', () => {
    expect(all(page, 'script')).toHaveLength(0);
    for (const el of all(page, '*')) {
      expect(el.getAttributeNames().filter((n) => n.startsWith('on') || n === 'style')).toEqual([]);
    }
    expect(page.documentElement.innerHTML).not.toMatch(/undefined|\[object Object\]/);
    const ids = all(page, '[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links only within the site, so it makes no request and sends no one elsewhere', () => {
    for (const a of all(page, 'a[href]')) expect(a.getAttribute('href'), text(a)).toMatch(/^(\/|#)/);
    for (const a of all(page, 'a[href^="#"]')) {
      expect(page.getElementById(a.getAttribute('href')!.slice(1)), a.getAttribute('href')!).not.toBeNull();
    }
    expect(all(page, 'img, iframe, link, object, embed')).toHaveLength(0);
  });

  it('has no em dash anywhere in the copy or on the page', () => {
    expect([...copyOf(doc), ...chromeCopy(), CHROME.draft].filter((s) => s.includes('—'))).toEqual([]);
    expect(page.documentElement.textContent).not.toContain('—');
  });

  it('puts the title and description in the head', () => {
    expect(page.title).toBe(doc.title);
    expect(page.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(doc.description);
  });
});

describe('the draft state', () => {
  it('while a draft: says so at the top and asks search engines not to index the page', () => {
    for (const doc of DOCS) {
      const page = parse(doc, true);
      const note = page.querySelector('.doc-head .draft');
      expect(text(note)).toBe(CHROME.draft);
      expect(note?.getAttribute('role')).toBe('note');
      // The note explains the brackets; it is not itself a placeholder.
      expect(note?.querySelector('mark')).toBeNull();
      expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    }
  });

  it('once final: neither the note nor the noindex', () => {
    for (const doc of DOCS) {
      const page = parse(doc, false);
      expect(page.querySelector('.draft')).toBeNull();
      expect(page.querySelector('meta[name="robots"]')).toBeNull();
    }
  });

  it('cannot be switched off while any [placeholder] is left', () => {
    const left = placeholdersIn([...DOCS.flatMap(copyOf), ...chromeCopy()]);
    if (!DRAFT) expect(left).toEqual([]);
    // Today it is a draft, and these are the facts still to be supplied.
    if (DRAFT) expect(left.length).toBeGreaterThan(0);
  });

  it('renderLegal() renders each page with the draft state from content.ts', () => {
    for (const name of ['terms', 'privacy'] as const) {
      const { head, body } = renderLegal(name);
      expect(head).toBe(renderLegalHead(name === 'terms' ? TERMS : PRIVACY));
      expect(body).toBe(renderLegalBody(name === 'terms' ? TERMS : PRIVACY));
      expect(body.includes('class="draft"')).toBe(DRAFT);
    }
  });
});

describe('what the pages promise, against the waitlist form', () => {
  const terms = parse(TERMS);
  const privacy = parse(PRIVACY);
  const termsText = terms.body.textContent ?? '';
  const privacyText = privacy.body.textContent ?? '';

  it('quotes the form’s consent wording exactly', () => {
    expect(SENDERS).toBe('Amplified Impact, Spring B and its affiliated companies, Spring, and Connor');
    expect(CONSENT.sms).toBe(SMS_LABEL);
    expect(CONSENT.join).toBe(JOIN_LINE);
    const quotes = all(terms, 'figure.quote blockquote').map(text);
    expect(quotes).toContain(SMS_LABEL);
    expect(quotes).toContain(JOIN_LINE);
  });

  it('carries the SMS program terms carriers look for', () => {
    const sms = text(terms.getElementById('text-messages'));
    for (const required of [
      SMS_PROGRAM,
      'Message frequency varies.',
      'Msg & data rates may apply.',
      'Reply STOP to any text.',
      'Reply HELP to any text',
      'Carriers are not liable for delayed or undelivered messages.',
      'You do not have to agree to texts to join the waitlist or to buy anything.',
      'automated technology',
    ]) {
      expect(sms, required).toContain(required);
    }
    expect(SMS_PROGRAM).toBe('Amplified Impact updates');
  });

  it('says every email has an unsubscribe link', () => {
    expect(text(terms.getElementById('emails'))).toContain('has an unsubscribe link');
  });

  it('lists what the waitlist collects, and what the page never sends', () => {
    const collect = text(privacy.getElementById('what-we-collect'));
    for (const item of [
      'first name',
      'email address',
      'brokerage',
      'mobile number',
      'record of your consent',
      'tag from the link',
    ]) {
      expect(collect, item).toContain(item);
    }
    const not = text(privacy.getElementById('what-we-do-not-collect'));
    expect(not).toContain('never sent to us');
    expect(not).toContain('no analytics, no tracking cookies, no ad pixels');
  });

  it('never sells, and never shares mobile numbers or text consent for anyone else’s marketing', () => {
    expect(privacyText).toContain('We do not sell your personal information');
    expect(text(privacy.getElementById('text-messages'))).toContain(
      'We never share your mobile number or your text consent with any other third party or affiliate for their own marketing.',
    );
    expect(termsText).toContain(
      'We never share your mobile number or your text consent with any other third party or affiliate for their own marketing.',
    );
  });

  it('cross-links to sections that exist on the other page', () => {
    const anchors = (doc: LegalDoc) => new Set(doc.sections.map((s) => s.id));
    const check = (from: Document, to: LegalDoc) => {
      const links = all(from, `main a[href^="${to.path}"]`).map((a) => a.getAttribute('href')!);
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) {
        const hash = href.split('#')[1];
        if (hash) expect(anchors(to).has(hash), href).toBe(true);
      }
    };
    check(terms, PRIVACY);
    check(privacy, TERMS);
  });
});

describe('escaping', () => {
  it('esc() covers text and attribute positions', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('highlight() escapes first and keeps the brackets inside the mark', () => {
    expect(highlight('Email [contact <email>] now')).toBe(
      'Email <mark class="placeholder">[contact &lt;email&gt;]</mark> now',
    );
  });

  it('renders markup typed into the content as text, never as tags', () => {
    const hostile = `<img src=x onerror=alert(1)><b>&amp;"'</b>`;
    const poison = (value: unknown, key = ''): unknown => {
      if (typeof value === 'string') return key === 'href' || key === 'path' || key === 'id' ? value : value + hostile;
      if (Array.isArray(value)) return value.map((v) => poison(v));
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, k)]));
      }
      return value;
    };
    for (const doc of DOCS) {
      const bad = poison(doc) as LegalDoc;
      const page = parse(bad);
      expect(all(page, 'img, b')).toHaveLength(0);
      expect(page.title).toBe(bad.title);
      expect(text(page.querySelector('h1'))).toBe(bad.heading);
      const visible = page.body.textContent ?? '';
      expect(copyOf(bad).filter((s) => !visible.includes(s))).toEqual([]);
    }
  });
});

describe('the shells and the stylesheet', () => {
  it.each(['terms', 'privacy'])('%s.html has each marker once, the stylesheet, and no script', (name) => {
    const shell = read(`../../${name}.html`);
    expect(shell.split('<!--legal:head-->')).toHaveLength(2);
    expect(shell.split('<!--legal:body-->')).toHaveLength(2);
    expect(shell).toContain('<link rel="stylesheet" href="/src/legal/legal.css" />');
    expect(shell).not.toMatch(/<script/i);
    expect(shell).toContain('<html lang="en">');
  });

  it('loads Hanken Grotesk 400 and 700 and no other font', () => {
    const css = read('./legal.css');
    const fonts = [...css.matchAll(/@import '(@fontsource\/[^']+)'/g)].map((m) => m[1]);
    expect(fonts).toEqual(['@fontsource/hanken-grotesk/400.css', '@fontsource/hanken-grotesk/700.css']);
    expect(css).not.toMatch(/url\(\s*['"]?https?:/);
  });
});
