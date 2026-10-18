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
  'h3' in b ? [b.h3] : 'p' in b ? [inlineText(b.p)] : b.ul.map((item) => inlineText(item));

/** Every readable paragraph, list item, heading and label in one page's content. */
const copyOf = (doc: LegalDoc): string[] => [
  doc.heading,
  ...(doc.notice ? [doc.notice] : []),
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
  "Text me about the December agent track and other programs from Amplified Impact, LLC at the number above. Messages may be sent using automated technology. Consent isn't required to join or to buy anything. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.";
const JOIN_LINE =
  'By joining, you agree to our Terms of Service and Privacy Policy and to emails about the December agent track and other programs from Amplified Impact, LLC. Unsubscribe anytime.';
const GUIDES_LINE =
  'By signing up, you agree to our Terms of Service and Privacy Policy and to emails from Amplified Impact, LLC. Unsubscribe anytime.';

/** The Privacy Policy's own words about mobile numbers (D-042), typed out. */
const NO_MOBILE_SHARING =
  'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.';
const NO_OPT_IN_SHARING =
  'Text messaging originator opt-in data and consent will not be shared with any third parties, except the aggregators and providers that deliver our text messages.';

/** Who "we" are, in the same sentence on both pages. */
const WE = '“Amplified Impact,” “we,” “us,” and “our” mean Amplified Impact, LLC, a Utah limited liability company.';

/** Every off-site link, by page: the Privacy Policy's ad opt-out pages, and nothing on the Terms. */
const OFF_SITE: Record<LegalDoc['path'], readonly string[]> = {
  '/terms': [],
  '/privacy': [
    'https://optout.aboutads.info',
    'https://optout.networkadvertising.org',
    'https://tools.google.com/dlpage/gaoptout',
  ],
};

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
    expect(time?.getAttribute('datetime')).toBe('2026-10-18');
    expect(text(time)).toBe('October 18, 2026');
    expect(text(page.querySelector('.doc-head .meta'))).toBe('Effective October 18, 2026 · Version 2026-10-18');
    expect(EFFECTIVE.iso).toBe(LEGAL_VERSION);
  });

  it('has a table of contents that links every section, in order', () => {
    const nav = page.querySelector('nav.toc');
    expect(nav?.getAttribute('aria-labelledby')).toBe('toc-title');
    expect(text(page.getElementById('toc-title'))).toBe(CHROME.tocLabel);
    const links = all(nav!, 'ol > li > a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(doc.sections.map((s) => `#${s.id}`));
    expect(links.map(text)).toEqual(doc.sections.map((s) => s.heading));
    // Numbered headings are numbered 1, 2, 3 in order (the policy's "Section 8" must be the eighth),
    // and the list then adds no numbers of its own.
    if (doc.numberedHeadings) doc.sections.forEach((s, i) => expect(s.heading).toMatch(new RegExp(`^${i + 1}\\. \\S`)));
    expect(nav!.querySelector('ol')?.classList.contains('plain')).toBe(doc.numberedHeadings === true);
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

  it('links within the site in this tab, and off it only to the listed opt-out pages, in a new tab', () => {
    for (const a of all(page, 'a[href]')) {
      const href = a.getAttribute('href')!;
      if (/^(\/|#)/.test(href)) {
        expect(a.hasAttribute('target'), href).toBe(false);
        continue;
      }
      expect(OFF_SITE[doc.path], href).toContain(href);
      expect(a.getAttribute('target'), href).toBe('_blank');
      expect(a.getAttribute('rel'), href).toBe('noopener');
    }
    const offSite = all(page, 'a[href^="http"]').map((a) => a.getAttribute('href'));
    expect(offSite).toEqual(OFF_SITE[doc.path]);
    for (const a of all(page, 'a[href^="#"]')) {
      expect(page.getElementById(a.getAttribute('href')!.slice(1)), a.getAttribute('href')!).not.toBeNull();
    }
    // A link is not a request: the page itself still loads nothing from anywhere.
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

  it('records each form’s consent wording exactly', () => {
    expect(SENDERS).toBe('Amplified Impact, LLC');
    expect(CONSENT.sms).toBe(SMS_LABEL);
    expect(CONSENT.join).toBe(JOIN_LINE);
    expect(CONSENT.guides).toBe(GUIDES_LINE);
  });

  it('warns about arbitration in bold above the Terms, pointing at the arbitration section', () => {
    const notice = terms.querySelector('.doc-head p.notice');
    expect(text(notice)).toBe(TERMS.notice);
    expect(notice?.firstElementChild?.tagName).toBe('STRONG');
    expect(text(notice?.firstElementChild)).toBe(text(notice));
    // Before the intro, and "Section 24" is the arbitration section.
    expect(notice?.nextElementSibling?.classList.contains('lede')).toBe(true);
    expect(TERMS.notice).toContain('Section 24');
    expect(TERMS.sections[23]?.id).toBe('arbitration');
    expect(privacy.querySelector('.notice')).toBeNull();
  });

  it('backs every place the Privacy Policy points at the Terms', () => {
    // "as our Terms of Service describe" (recordings) and "our full text message terms".
    expect(text(privacy.getElementById('how-we-use-information'))).toContain('as our Terms of Service describe');
    expect(text(terms.getElementById('recordings'))).toContain('replays, course Materials, promotion, and advertising');
    expect(all(privacy, 'a[href="/terms#text-messages"]')).toHaveLength(1);
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
      'You do not have to agree to texts to buy anything.',
      'automated technology',
    ]) {
      expect(sms, required).toContain(required);
    }
    expect(SMS_PROGRAM).toBe('Amplified Impact Updates');
  });

  it('says every marketing email can be unsubscribed from, on both pages', () => {
    const line = 'unsubscribe from marketing emails at any time with the link in any email';
    expect(text(terms.getElementById('communications'))).toContain(line);
    expect(text(privacy.getElementById('marketing'))).toContain(line);
  });

  it('lists what a sign-up stores, the consent record among it, and that browser-only data is never sent', () => {
    const collect = text(privacy.getElementById('information-we-collect'));
    for (const item of [
      'name, email address, mobile number',
      'company or brokerage',
      'Consent records.',
      'the words shown to you, the page or form, the date and time, and the version of our terms and this policy in effect',
      'a tag in the link or QR code',
      'That information is not sent to us',
    ]) {
      expect(collect, item).toContain(item);
    }
  });

  it('never shares mobile numbers or text opt-in data for anyone’s marketing, in the same words on both pages', () => {
    for (const sms of [text(privacy.getElementById('text-messages')), text(terms.getElementById('text-messages'))]) {
      expect(sms).toContain(NO_MOBILE_SHARING);
    }
    expect(text(privacy.getElementById('text-messages'))).toContain(NO_OPT_IN_SHARING);
    // Section 5's sharing with Affiliated Companies leaves the mobile number out, and Section 7's
    // categories leave the opt-in data out.
    expect(text(privacy.getElementById('marketing'))).toContain('except your mobile number');
    expect(text(privacy.getElementById('sharing'))).toContain(
      'All of the categories above exclude text messaging originator opt-in data and consent',
    );
    expect(privacyText).toContain('We do not sell personal information in exchange for money.');
  });

  it('names one company as “we” on both pages, and no Spring', () => {
    expect(text(terms.getElementById('who-we-are'))).toContain(WE);
    expect(text(privacy.getElementById('who-we-are'))).toContain(WE);
    for (const page of [termsText, privacyText]) {
      expect(page).not.toMatch(/Spring|SB Coaching/);
    }
  });

  it('lists the same opt-out words on both pages', () => {
    const termsWords = text(terms.getElementById('text-messages'));
    const privacyWords = text(privacy.getElementById('your-choices'));
    for (const word of ['STOP', 'CANCEL', 'END', 'QUIT', 'UNSUBSCRIBE', 'REVOKE', 'OPT OUT']) {
      expect(termsWords, word).toContain(word);
      expect(privacyWords, word).toContain(word);
    }
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
