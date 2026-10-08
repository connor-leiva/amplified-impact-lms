import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAGE, UI, type Inline } from './content';
import type * as Content from './content';
import { esc, highlightPlaceholders, inline, renderAi101Body, renderAi101Head } from './render';

// /ai101's markup contract (DECISIONS.md D-028, D-032 and D-034), checked on the parsed DOM rather
// than on the string: what matters is what a browser builds from the bytes, and the HTML parser has
// opinions. It drops a newline after `<pre>`, it decodes entities, it closes what it likes.
// `main.ts`, the API's CSP and the e2e spec all lean on the hooks asserted here.
//
// The page is a step-through (D-034): twelve <section data-screen>s in order, every one in the
// markup, with the progress header and the Back / Next footer hidden until `main.ts` runs.
//
// Where the point of an assertion is to PIN a value (an id a QR code points at, a URL, the consent
// wording, the design's labels), the oracle is typed out here rather than read from `content.ts`,
// so an edit there that changes what the page promises fails a test instead of passing silently.

const parse = (body = renderAi101Body(), head = renderAi101Head()) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`,
    'text/html',
  );

const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));
const text = (el: Element | null | undefined) => el?.textContent ?? '';
const attr = (el: Element | null | undefined, name: string) => el?.getAttribute(name) ?? null;
/** Every attribute value on every element under `root`: where labels, toasts and stage names live. */
const attributeValues = (root: Element) =>
  all(root, '*').flatMap((el) => el.getAttributeNames().map((n) => el.getAttribute(n) ?? ''));

/** The text of one run of inline copy, as it lands in `textContent`. */
const inlineText = (segments: readonly Inline[]) =>
  segments.map((s) => (typeof s === 'string' ? s : 'strong' in s ? s.strong : s.link)).join('');

// --- Walking PAGE ---------------------------------------------------------------------------------

/** Keys whose values (and everything under them) are identifiers or URLs, not words anybody reads. */
const IDENTIFIER_KEYS = new Set(['id', 'anchor', 'href', 'url']);
/** `name` is an identifier inside `fields` (a fill field's key), and copy elsewhere ("Your AI voice profile."). */
const isIdentifier = (path: readonly string[]) =>
  path.some((k) => IDENTIFIER_KEYS.has(k)) || (path[path.length - 1] === 'name' && path.includes('fields'));

/** An array that is one run of inline copy (it has a { strong } or { link } in it). */
const isInlineRun = (value: readonly unknown[]) =>
  value.some((v) => v !== null && typeof v === 'object' && !Array.isArray(v) && ('strong' in v || 'link' in v));

interface CopyString {
  path: string;
  value: string;
}

/** Every readable string under `value`, with its path. A run of inline copy is one string. */
function copyStrings(value: unknown, path: string[] = []): CopyString[] {
  if (isIdentifier(path)) return [];
  if (typeof value === 'string') return [{ path: path.join('.'), value }];
  if (Array.isArray(value)) {
    if (isInlineRun(value)) return [{ path: path.join('.'), value: inlineText(value as Inline[]) }];
    return value.flatMap((v, i) => copyStrings(v, [...path, String(i)]));
  }
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => copyStrings(v, [...path, k]));
  return [];
}

/**
 * Strings in PAGE that the page never shows: none. Kept as the place to name one, with its defect
 * written up as a skipped test, should a string ever have to be carried unrendered.
 */
const KNOWN_UNRENDERED = new Set<string>();

/** Is `s` somewhere a person or a screen reader meets it: the body's text, or an attribute value. */
const rendered = (doc: Document, s: string) => (doc.body.textContent ?? '').includes(s) || attributeValues(doc.body).includes(s);

// --- Oracles ----------------------------------------------------------------------------------------

/** The design's twelve screens: id, header stage, count, Next label, heading tag and heading. */
const SCREENS: Array<[id: string, stage: string, count: string | null, next: string | null, tag: 'H1' | 'H2', heading: string]> = [
  ['welcome', 'Welcome', null, 'Start Step 1', 'H1', 'Sounds Like You, Looks Like You'],
  ['voice-profile', 'Step 1 · Voice Profile', '1 of 4', 'I Have My Samples', 'H2', 'Collect 10 to 15 samples of you'],
  ['voice-profile-copy', 'Step 1 · Voice Profile', '2 of 4', 'I Have My Profile', 'H2', 'Fill in two blanks, then copy'],
  ['voice-profile-save', 'Step 1 · Voice Profile', '3 of 4', 'Saved It', 'H2', 'Save your profile so the AI remembers it'],
  ['voice-profile-test', 'Step 1 · Voice Profile', '4 of 4', 'Start Step 2', 'H2', 'Test it'],
  ['carousel-creator', 'Step 2 · Carousel Creator', '1 of 5', "I'm on My Laptop", 'H2', 'Build your Carousel Creator'],
  ['carousel-creator-checklist', 'Step 2 · Carousel Creator', '2 of 5', 'My Brand Is Saved', 'H2', 'Set up your brand'],
  ['carousel-creator-about', 'Step 2 · Carousel Creator', '3 of 5', 'Next', 'H2', 'Tell it about you'],
  ['carousel-creator-project', 'Step 2 · Carousel Creator', '4 of 5', 'Project Is Made', 'H2', 'Make the Project'],
  ['carousel-creator-first-idea', 'Step 2 · Carousel Creator', '5 of 5', 'How a Week Works', 'H2', 'Send your first idea'],
  ['carousel-creator-week', 'Your Week', null, 'Last Thing', 'H2', 'How a week works'],
  ['waitlist', 'December Waitlist', null, null, 'H2', 'Join the December waitlist'],
];

/**
 * The three prompts. `text` is the one value read from `content.ts`, because the <pre> contract IS
 * "the <pre> holds content.ts's text"; the rest is typed out.
 */
const PROMPTS = [
  {
    block: 'voice-profile-prompt',
    id: 'voice_profile',
    screen: 'voice-profile-copy',
    label: 'Voice profile prompt',
    summary: 'See the full prompt',
    placeholders: ['[city or market]', '[buyers, sellers, or both]', '[paste 10 to 15 samples]'],
    firstLine: 'Below are samples of how I write and talk. Study them and build my voice profile.',
    // "Replace the last line with your samples": the last line is the placeholder for them.
    lastLine: '[paste 10 to 15 samples]',
    text: PAGE.voicePrompt.text,
  },
  {
    block: 'carousel-creator-brand-prompt',
    id: 'brand_system',
    screen: 'carousel-creator-checklist',
    label: 'Brand prompt',
    summary: 'See the full prompt',
    placeholders: ['[brokerage name]'],
    firstLine:
      'Build a reusable design system for my real estate brand from the files I attached: my logo, my headshot, and screenshots of posts I like.',
    lastLine: 'Name it My Carousel Brand. Then show me the colors, fonts, and one sample slide.',
    text: PAGE.brandPrompt.text,
  },
  {
    block: 'carousel-creator-prompt',
    id: 'carousel_creator',
    screen: 'carousel-creator-project',
    label: 'Carousel Creator instructions',
    summary: 'See the full instructions',
    placeholders: [
      '[your niche]',
      '[neighborhoods]',
      '[top client questions]',
      '[brokerage name]',
      '[paste the profile that starts with "Write as me."]',
    ],
    firstLine: "You're my Carousel Creator. Write as me, using my voice profile.",
    lastLine: '[paste the profile that starts with "Write as me."]',
    text: PAGE.carouselPrompt.text,
  },
];

/** The exact Google Calendar link: Mondays from October 12, 2026, 9:00 to 9:30, four weeks. */
const GOOGLE_CALENDAR =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Carousel%20Creator%3A%20weekly%20approval%20block&dates=20261012T090000/20261012T093000&recur=RRULE%3AFREQ%3DWEEKLY%3BCOUNT%3D4&details=Week%201%20Market%2C%20Week%202%20Method%2C%20Week%203%20Me%2C%20Week%204%20Market.%20Open%20your%20Carousel%20Creator%20Project%20at%20https%3A%2F%2Fclaude.ai%2Fprojects%20and%20send%20one%20idea%20from%20this%20week%27s%20pillar.%20Track%20conversations%20started%2C%20not%20likes.';

/** "Send This to My Laptop" without JavaScript: an email to yourself that lands on Step 2. */
const SHARE_MAILTO =
  'mailto:?subject=AI%20101%20for%20Agents%3A%20Step%202%20(do%20this%20on%20your%20laptop)&body=Open%20this%20on%20your%20laptop%3A%0Ahttps%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator';

/** Every off-site URL the page may link to. Nothing else leaves the site, and each of these is used. */
const OFF_SITE_URLS = new Set([
  'https://chatgpt.com/download',
  'https://claude.com/download',
  'https://chatgpt.com/',
  'https://claude.ai/new',
  'https://claude.ai/projects',
  // Connor's deep link (2026-10-07): it lands on Custom instructions itself.
  'https://chatgpt.com/settings/personalization?instructions=chatgpt',
  'https://claude.ai/settings/design-systems',
  'https://claude.ai/settings/capabilities',
  GOOGLE_CALENDAR,
]);

/** Who the waitlist's consent names (Connor, 2026-10-08): the email line and the SMS box both. */
const SENDERS = 'Amplified Impact, Spring B and its affiliated companies, Spring, and Connor';

/** The SMS box's label, word for word: the API stores exactly this as the proof of consent. */
const SMS_CONSENT =
  "Text me about the December agent track and other programs from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor at the number above. Messages may be sent using automated technology. Consent isn't required to join or to buy anything. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.";

/** The line under the button: joining is the Terms, the Privacy Policy and the email consent. */
const LEGAL_LINE =
  'By joining, you agree to our Terms of Service and Privacy Policy and to emails about the December agent track and other programs from Amplified Impact, Spring B and its affiliated companies, Spring, and Connor. Unsubscribe anytime.';

// ================================================================================================

describe('escaping', () => {
  afterEach(() => {
    vi.doUnmock('./content');
    vi.resetModules();
  });

  it('esc() covers text and attribute positions', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    // An entity typed into the copy is shown as typed, not decoded.
    expect(esc('&amp;')).toBe('&amp;amp;');
    // Everything else passes through: brackets, the middle dot, the ellipsis, accents, newlines.
    expect(esc('[x] · … é\nnext')).toBe('[x] · … é\nnext');
    expect(esc('')).toBe('');
  });

  it('highlightPlaceholders() escapes first and keeps the brackets inside the mark', () => {
    expect(highlightPlaceholders('a <b> [x & y] "c"')).toBe(
      'a &lt;b&gt; <mark class="placeholder">[x &amp; y]</mark> &quot;c&quot;',
    );
    expect(highlightPlaceholders('[a][b]')).toBe('<mark class="placeholder">[a]</mark><mark class="placeholder">[b]</mark>');
  });

  it('highlightPlaceholders() marks nothing that is not a closed bracket on one line', () => {
    expect(highlightPlaceholders('no brackets, it\'s "plain"')).toBe(esc('no brackets, it\'s "plain"'));
    expect(highlightPlaceholders('[open\nclose]')).toBe('[open\nclose]');
    expect(highlightPlaceholders('[never closed')).toBe('[never closed');
    expect(highlightPlaceholders('closed] only')).toBe('closed] only');
  });

  it('inline() escapes every segment and writes only its own tags', () => {
    expect(
      inline([
        'a<b>',
        { strong: 'S&"' },
        { link: `L'`, href: '/x?a=1&b="2"' },
        ' ',
        { link: 'here', href: '#y', sameTab: true },
      ]),
    ).toBe(
      'a&lt;b&gt;<strong>S&amp;&quot;</strong>' +
        '<a href="/x?a=1&amp;b=&quot;2&quot;" target="_blank" rel="noopener">L&#39;</a> ' +
        '<a href="#y">here</a>',
    );
  });

  const HOSTILE = `<img src=x onerror=alert(1)><b>&amp;"'</b>`;

  /** A copy of `value` with HOSTILE after every string: copy only, or identifiers too. */
  function poison(value: unknown, identifiers: boolean, path: string[] = []): unknown {
    if (typeof value === 'string') return !identifiers && isIdentifier(path) ? value : value + HOSTILE;
    if (Array.isArray(value)) return value.map((v, i) => poison(v, identifiers, [...path, String(i)]));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, identifiers, [...path, k])]));
    }
    return value;
  }

  /** Renders with a poisoned PAGE: a fresh `render.ts` over a mocked `content.ts`. */
  async function renderPoisoned(identifiers: boolean) {
    vi.resetModules();
    vi.doMock('./content', async (importOriginal) => {
      const real = await importOriginal<typeof Content>();
      return { ...real, PAGE: poison(real.PAGE, identifiers) };
    });
    const mod = await import('./render');
    const content = await import('./content');
    const body = mod.renderAi101Body();
    const head = mod.renderAi101Head();
    return { body, head, doc: parse(body, head), page: content.PAGE };
  }

  it('renders markup typed into content.ts as text, never as tags', async () => {
    const { body, head, doc, page } = await renderPoisoned(false);
    // The poison really is in (a mock that silently did nothing would pass everything below).
    expect(page.welcome.title.endsWith(HOSTILE)).toBe(true);

    // Not one tag from the copy, in the bytes or in the DOM.
    expect(body).not.toContain('<img');
    expect(body).not.toContain('<b>');
    expect(head).not.toContain('<img');
    expect(all(doc, 'img, b')).toHaveLength(0);
    expect(all(doc, '[onerror]')).toHaveLength(0);

    // Every string arrives as itself.
    expect(doc.title).toBe(page.meta.title);
    expect(doc.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(page.meta.description);
    expect(text(doc.querySelector('h1'))).toBe(page.welcome.title);
    for (const { block, placeholders } of PROMPTS) {
      const key = block === 'voice-profile-prompt' ? 'voicePrompt' : block === 'carousel-creator-prompt' ? 'carouselPrompt' : 'brandPrompt';
      const pre = doc.querySelector(`#${block} pre[data-prompt-text]`)!;
      expect(pre.textContent).toBe(page[key].text);
      expect(all(pre, 'mark').map(text)).toEqual(placeholders);
    }
    // In attributes too: what the header, the toast and the labels carry.
    const sections = all(doc, 'section[data-screen]');
    sections.forEach((s, i) => expect(attr(s, 'data-stage')).toBe(page.screens[i]!.stage));
    expect(attr(doc.querySelector('[data-pick]')?.parentElement, 'aria-label')).toBe(page.save.pickLabel);
    const opens = [...page.voiceCopy.open, page.brand.open, page.project.open];
    expect(all(doc, 'a[data-copy-open]').map((a) => [attr(a, 'data-app'), attr(a, 'data-toast')])).toEqual(
      opens.map((o) => [o.app, o.toast]),
    );
    expect(attr(doc.querySelector('#waitlist-email'), 'placeholder')).toBe(page.waitlist.fields.email);
    expect(attr(doc.querySelector('#welcome svg'), 'aria-label')).toBe(page.welcome.logoAlt);
    expect(text(doc.querySelector('label[for="waitlist-sms"]'))).toBe(page.waitlist.sms);

    // And every string in PAGE reaches the page, whole.
    const missing = copyStrings(page)
      .filter(({ path }) => !path.startsWith('meta.') && !KNOWN_UNRENDERED.has(path))
      .filter(({ value }) => !rendered(doc, value));
    expect(missing).toEqual([]);
  });

  // The identifiers too: welcome's heading id and the fill fields' ids once went out unescaped.
  it('escapes the identifiers from content.ts too (anchors, field names, prompt ids, hrefs)', async () => {
    const { body, doc, page } = await renderPoisoned(true);
    expect(page.screens[0]!.anchor.endsWith(HOSTILE)).toBe(true);
    // Every screen still has its id and is still labelled by its own heading, which main.ts can focus.
    const sections = all(doc, 'section[data-screen]');
    expect(sections.map((s) => s.id)).toEqual(page.screens.map((s) => s.anchor));
    for (const s of sections) {
      const heading = doc.getElementById(attr(s, 'aria-labelledby') ?? '');
      expect(heading, `${s.id}'s heading`).not.toBeNull();
      expect(heading?.getAttribute('tabindex')).toBe('-1');
    }
    // Every fill field is still one control, with its label and its data-field.
    const fields = [...page.voiceCopy.fields, ...page.about.fields];
    expect(all(doc, '[data-field]').map((f) => attr(f, 'data-field'))).toEqual(fields.map((f) => f.name));
    for (const f of all(doc, '[data-field]')) {
      expect(all(doc, 'label[for]').filter((l) => attr(l, 'for') === f.id)).toHaveLength(1);
    }
    // Every link still goes where content.ts says.
    expect(attr(doc.querySelector('a[data-get-app]'), 'href')).toBe(page.welcome.getApp.apps[0].href.web);
    // And nothing from content.ts reaches the bytes unescaped.
    expect(all(doc, 'img, b')).toHaveLength(0);
    expect(body).not.toContain('<img');
    expect(body).not.toContain('<b>');
  });
});

// ================================================================================================

describe('THE <pre> CONTRACT: what is copied is exactly the prompt', () => {
  const body = renderAi101Body();
  const doc = parse(body);

  it('has the three prompt blocks, in this order, and no other <pre>', () => {
    expect(all(doc, '[data-prompt]').map((b) => [b.id, attr(b, 'data-prompt')])).toEqual(
      PROMPTS.map((p) => [p.block, p.id]),
    );
    expect(all(doc, 'pre')).toHaveLength(3);
    expect(all(doc, 'pre[data-prompt-text]')).toHaveLength(3);
  });

  it.each(PROMPTS)('$id has no leading or trailing whitespace to lose, and no line that ends in a space', ({ text: prompt }) => {
    // The parser drops one newline after <pre>, and a copy would silently differ from the source.
    expect(prompt).toBe(prompt.trim());
    expect(prompt.split('\n').filter((line) => line !== line.trimEnd())).toEqual([]);
    // Straight quotes, LF line breaks, no tabs: what content.ts promises the clipboard gets.
    expect(prompt).not.toMatch(/[\r\t‘’“”]/);
  });

  it.each(PROMPTS)('$id: first and last lines are the ones the steps talk about', ({ text: prompt, firstLine, lastLine }) => {
    const lines = prompt.split('\n');
    expect(lines[0]).toBe(firstLine);
    expect(lines[lines.length - 1]).toBe(lastLine);
  });

  it.each(PROMPTS)('$id: the <pre> textContent is the prompt, character for character', ({ block, text: prompt }) => {
    const pre = doc.querySelector(`#${block} pre[data-prompt-text]`)!;
    expect(pre.textContent).toBe(prompt);
    expect(pre.textContent).toBe(pre.textContent!.trim());
    // In the bytes: the template adds nothing between the tags, not even the newline the parser
    // would have hidden.
    expect(body).toContain(`<pre data-prompt-text>${highlightPlaceholders(prompt)}</pre>`);
  });

  it.each(PROMPTS)('$id: every [placeholder] is a <mark class="placeholder">, and nothing else is', ({ block, text: prompt, placeholders }) => {
    const pre = doc.querySelector(`#${block} pre[data-prompt-text]`)!;
    expect(prompt.match(/\[[^\]\n]*\]/g)).toEqual(placeholders);
    expect(all(pre, 'mark').map(text)).toEqual(placeholders);
    for (const mark of all(pre, 'mark')) {
      expect(mark.className).toBe('placeholder');
      expect(mark.getAttributeNames()).toEqual(['class']);
      expect(mark.children).toHaveLength(0);
    }
    // Nothing but text and marks inside the <pre>.
    for (const node of Array.from(pre.childNodes)) expect(['#text', 'MARK']).toContain(node.nodeName);
    // And no <mark> anywhere else on the page.
    expect(all(doc, 'mark').filter((m) => !m.closest('pre[data-prompt-text]'))).toEqual([]);
  });

  it.each(PROMPTS)('$id: collapsed in a <details> under "$summary", on the $screen screen', ({ block, screen, summary }) => {
    const el = doc.getElementById(block)!;
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('prompt')).toBe(true);
    expect(el.closest('section')?.id).toBe(screen);
    const pre = el.querySelector('pre[data-prompt-text]')!;
    const details = pre.parentElement!;
    expect(details.tagName).toBe('DETAILS');
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.parentElement).toBe(el);
    const sum = details.firstElementChild!;
    expect(sum.tagName).toBe('SUMMARY');
    expect(text(sum)).toBe(summary);
  });

  it.each(PROMPTS)('$id: a visually hidden label, $block-label, names it "$label"', ({ block, label }) => {
    const el = doc.getElementById(`${block}-label`)!;
    expect(el.classList.contains('visually-hidden')).toBe(true);
    expect(text(el)).toBe(label);
    expect(el.parentElement?.id).toBe(block);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  it('leaves every placeholder main.ts fills in the prompt it fills, spelled exactly', () => {
    // `UI.slots` names placeholders by their text; one that drifted from the prompt would never fill.
    for (const { id, placeholders } of PROMPTS) {
      const slots = UI.slots[id]!;
      expect(Object.keys(slots).filter((p) => !placeholders.includes(p)), id).toEqual([]);
    }
    expect(Object.keys(UI.slots).sort()).toEqual(PROMPTS.map((p) => p.id).sort());
  });

  it('agrees with main.ts on what a placeholder is', async () => {
    // main.ts repaints each <pre> from its own textContent; with no values it must draw the same marks.
    vi.resetModules();
    const { fillPrompt } = await import('./main');
    for (const { text: prompt, placeholders } of PROMPTS) {
      const pieces = fillPrompt(prompt, {}, {});
      expect(pieces.map((p) => p.text).join('')).toBe(prompt);
      expect(pieces.filter((p) => p.mark).map((p) => p.text)).toEqual(placeholders);
    }
  });
});

// ================================================================================================

describe('the twelve screens', () => {
  const doc = parse();
  const sections = all(doc, 'section[data-screen]');

  it('puts the header, one <main> of screens, the footer and the toast in <body>, in that order', () => {
    expect(Array.from(doc.body.children).map((el) => el.tagName + (el.id ? `#${el.id}` : ''))).toEqual([
      'HEADER',
      'MAIN',
      'NAV',
      'P#ai101-live',
    ]);
    const main = doc.querySelector('main')!;
    expect(main.hasAttribute('data-steps')).toBe(true);
    // Only screens in <main>, and every screen is one of its children.
    expect(Array.from(main.children).every((el) => el.matches('section[data-screen]'))).toBe(true);
    expect(main.children).toHaveLength(12);
    // One-tap Copy & Open is the default; the tests' two-tap switch is not in the markup.
    expect(main.hasAttribute('data-copy-open-taps')).toBe(false);
  });

  it('has the design’s screens in order, with their ids', () => {
    expect(sections.map((s) => s.id)).toEqual(SCREENS.map(([id]) => id));
    expect(sections.map((s) => attr(s, 'data-screen'))).toEqual(SCREENS.map((_, i) => String(i)));
    for (const s of sections) expect(s.classList.contains('screen')).toBe(true);
  });

  it.each(SCREENS)('%s: stage "%s", count %s, Next "%s"', (id, stage, count, next) => {
    const s = doc.getElementById(id)!;
    expect(attr(s, 'data-stage')).toBe(stage);
    expect(attr(s, 'data-count')).toBe(count);
    expect(attr(s, 'data-next')).toBe(next);
  });

  it.each(SCREENS)('%s is labelled by its own %s heading, which takes focus on entry', (id, _stage, _count, _next, tag, heading) => {
    const s = doc.getElementById(id)!;
    expect(attr(s, 'aria-labelledby')).toBe(`${id}-heading`);
    const h = doc.getElementById(`${id}-heading`)!;
    expect(h.tagName).toBe(tag);
    expect(s.contains(h)).toBe(true);
    expect(text(h)).toBe(heading);
    expect(attr(h, 'tabindex')).toBe('-1');
    // It is the heading main.ts focuses: the first h1 or h2 in the screen.
    expect(s.querySelector('h1, h2')).toBe(h);
    expect(all(s, 'h1, h2')).toHaveLength(1);
  });

  it('has exactly one h1, on the welcome screen', () => {
    expect(all(doc, 'h1')).toHaveLength(1);
    expect(doc.querySelector('h1')?.closest('section')?.id).toBe('welcome');
  });

  it('never skips a heading level, and the outline reads as the design', () => {
    const headings = all(doc.body, 'h1, h2, h3, h4, h5, h6');
    const levels = headings.map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeLessThanOrEqual(levels[i - 1]! + 1);
    expect(headings.map((h) => [h.tagName, text(h)])).toEqual([
      ['H1', 'Sounds Like You, Looks Like You'],
      ['H2', 'Collect 10 to 15 samples of you'],
      ['H2', 'Fill in two blanks, then copy'],
      ['H2', 'Save your profile so the AI remembers it'],
      ['H3', 'Claude'],
      ['H3', 'ChatGPT'],
      ['H2', 'Test it'],
      ['H2', 'Build your Carousel Creator'],
      ['H2', 'Set up your brand'],
      ['H2', 'Tell it about you'],
      ['H2', 'Make the Project'],
      ['H2', 'Send your first idea'],
      ['H2', 'How a week works'],
      ['H3', 'Four things you own'],
      ['H3', 'The 30-day authority sprint'],
      ['H2', 'Join the December waitlist'],
    ]);
  });

  it('shows every screen without JavaScript: none is hidden in the markup', () => {
    for (const s of sections) {
      expect(s.hasAttribute('hidden'), s.id).toBe(false);
      expect(s.hasAttribute('data-current'), s.id).toBe(false);
    }
  });

  it('keeps every anchor the QR codes, slides and redirects point at, and every id is unique', () => {
    for (const id of [
      'voice-profile',
      'voice-profile-prompt',
      'carousel-creator',
      'carousel-creator-prompt',
      'carousel-creator-checklist',
      'carousel-creator-week',
      'four-things',
      'sprint',
      'waitlist',
      'waitlist-form',
      'waitlist-joined',
      'waitlist-error',
      'ai101-live',
    ]) {
      expect(doc.getElementById(id), id).not.toBeNull();
    }
    // The two older anchors live on the week screen, where a link to them now lands.
    expect(doc.getElementById('four-things')?.closest('section')?.id).toBe('carousel-creator-week');
    expect(doc.getElementById('sprint')?.closest('section')?.id).toBe('carousel-creator-week');
    const ids = all(doc, '[id]').map((el) => el.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('points every label, aria-labelledby and aria-describedby at an element that exists', () => {
    for (const label of all(doc, 'label[for]')) {
      const target = doc.getElementById(attr(label, 'for')!);
      expect(target, attr(label, 'for')!).not.toBeNull();
      expect(['INPUT', 'TEXTAREA', 'SELECT']).toContain(target!.tagName);
    }
    for (const el of all(doc, '[aria-labelledby], [aria-describedby]')) {
      for (const name of ['aria-labelledby', 'aria-describedby']) {
        for (const id of (attr(el, name) ?? '').split(/\s+/).filter(Boolean)) expect(doc.getElementById(id), id).not.toBeNull();
      }
    }
  });
});

// ================================================================================================

describe('the step-through chrome', () => {
  const doc = parse();
  const header = doc.querySelector('header.steps-head')!;
  const nav = doc.querySelector('nav.steps-nav')!;

  it('hides the progress header and the footer with data-steps-chrome, never data-js-only', () => {
    // main.ts reveals data-js-only parts early and the chrome last, once the step-through runs: a
    // footer shown by the wrong hook would be buttons that do nothing if the steps failed to start.
    expect(all(doc, '[data-steps-chrome]')).toEqual([header, nav]);
    for (const el of [header, nav]) {
      expect(el.hasAttribute('hidden')).toBe(true);
      expect(el.hasAttribute('data-js-only')).toBe(false);
    }
    expect(all(doc, '[data-steps-chrome][data-js-only]')).toHaveLength(0);
  });

  it('gives the header its stage, count and bar hooks, starting on the welcome screen', () => {
    const stage = header.querySelectorAll('[data-stage-label]');
    const count = header.querySelectorAll('[data-count-label]');
    const bar = header.querySelectorAll('[data-bar]');
    expect([stage.length, count.length, bar.length]).toEqual([1, 1, 1]);
    expect(text(stage[0])).toBe('Welcome');
    expect(text(count[0])).toBe('');
    // The bar is drawn, not read: the count says the same thing in words.
    expect(attr(bar[0]!.parentElement, 'aria-hidden')).toBe('true');
    expect(bar[0]!.hasAttribute('style')).toBe(false);
    // Nothing outside the header carries them.
    expect(all(doc, '[data-stage-label], [data-count-label], [data-bar]').every((el) => header.contains(el))).toBe(true);
  });

  it('gives the footer Back (hidden), Next with the first label, and Start Over (hidden), in that order', () => {
    expect(attr(nav, 'aria-label')).toBe('Steps');
    const buttons = all(nav, 'button');
    expect(
      buttons.map((b) => [
        b.getAttributeNames().find((n) => ['data-back', 'data-next', 'data-restart'].includes(n)),
        attr(b, 'type'),
        b.hasAttribute('hidden'),
        text(b),
      ]),
    ).toEqual([
      ['data-back', 'button', true, 'Back'],
      ['data-next', 'button', false, 'Start Step 1'],
      ['data-restart', 'button', true, 'Start Over'],
    ]);
    const nextLabel = all(doc, '[data-next-label]');
    expect(nextLabel).toHaveLength(1);
    expect(nextLabel[0]!.parentElement).toBe(buttons[1]);
    expect(text(nextLabel[0])).toBe(attr(doc.getElementById('welcome'), 'data-next'));
  });

  it('has one polite live region, the toast, empty until there is something to say', () => {
    const live = all(doc, '[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]!.id).toBe('ai101-live');
    expect(attr(live[0], 'role')).toBe('status');
    expect(attr(live[0], 'aria-live')).toBe('polite');
    expect(live[0]!.classList.contains('toast')).toBe(true);
    expect(text(live[0])).toBe('');
  });

  it('has every hook main.ts looks for, as many times as it expects', () => {
    const counts = {
      'section[data-screen]': 12,
      '[data-stage-label]': 1,
      '[data-count-label]': 1,
      '[data-bar]': 1,
      'button[data-back]': 1,
      'button[data-next]': 1,
      '[data-next-label]': 1,
      'button[data-restart]': 1,
      '[data-steps-chrome]': 2,
      '[data-js-only]': 3,
      '[data-prompt]': 3,
      'pre[data-prompt-text]': 3,
      'a[data-copy-open]': 4,
      'button[data-copy-chip]': 4,
      '[data-field]': 7,
      'button[data-pick]': 2,
      '[data-pick-panel]': 2,
      'a[data-get-app]': 2,
      'a[data-share]': 1,
      'form#waitlist-form': 1,
      '#waitlist-form button[type="submit"]': 1,
      'section#waitlist': 1,
      '#waitlist-joined': 1,
      '#waitlist-error': 1,
      '#ai101-live': 1,
    };
    expect(Object.fromEntries(Object.keys(counts).map((s) => [s, all(doc, s).length]))).toEqual(counts);
  });
});

// ================================================================================================

describe('the parts that need the script', () => {
  const doc = parse();

  it('hides exactly three parts with data-js-only: the two sets of fill fields and the app picker', () => {
    const jsOnly = all(doc, '[data-js-only]');
    expect(jsOnly.map((el) => [el.closest('section')?.id, el.className])).toEqual([
      ['voice-profile-copy', 'fields'],
      ['voice-profile-save', 'picker'],
      ['carousel-creator-about', 'fields'],
    ]);
    for (const el of jsOnly) expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('labels every fill field and keys it to a placeholder main.ts fills', () => {
    const fields = all(doc, '[data-field]');
    expect(
      fields.map((f) => [
        f.closest('section')?.id,
        f.tagName,
        attr(f, 'data-field'),
        text(doc.querySelector(`label[for="${f.id}"]`)),
        attr(f, 'placeholder'),
        attr(f, 'rows'),
      ]),
    ).toEqual([
      ['voice-profile-copy', 'INPUT', 'market', 'Your city or market', 'Farmington, CT', null],
      ['voice-profile-copy', 'INPUT', 'clients', 'Your clients are mostly', 'buyers, sellers, or both', null],
      ['carousel-creator-about', 'INPUT', 'niche', 'Your niche', 'First time buyers', null],
      ['carousel-creator-about', 'INPUT', 'hoods', 'Neighborhoods you know best', 'Farmington, Unionville', null],
      [
        'carousel-creator-about',
        'TEXTAREA',
        'questions',
        'Questions clients ask you most One per line',
        'Should I wait for rates to drop?',
        '3',
      ],
      ['carousel-creator-about', 'INPUT', 'brokerage', 'Brokerage name, exactly as it must appear in ads', 'eXp Realty', null],
      [
        'carousel-creator-about',
        'TEXTAREA',
        'profile',
        'Your voice profile from Step 1 Starts with "Write as me." Did Step 1 on your phone? The same chat is in your history on your laptop.',
        'Write as me. …',
        '4',
      ],
    ]);
    for (const f of fields) {
      expect(f.id).toBe(`field-${attr(f, 'data-field')}`);
      expect(attr(f, 'name')).toBe(attr(f, 'data-field'));
      expect(f.hasAttribute('required')).toBe(false);
      // Nothing to submit: these fields are not in a form.
      expect(f.closest('form')).toBeNull();
      if (f.tagName === 'INPUT') {
        expect(attr(f, 'type')).toBe('text');
        expect(attr(f, 'autocomplete')).toBe('off');
      }
    }
    // The hint is lighter text inside the label.
    expect(all(doc, 'label .field-hint').map(text)).toEqual([
      'One per line',
      'Starts with "Write as me." Did Step 1 on your phone? The same chat is in your history on your laptop.',
    ]);
    // Every field fills a placeholder, and every placeholder main.ts fills has its field.
    const slotFields = new Set(Object.values(UI.slots).flatMap((s) => Object.values(s)));
    expect(new Set(fields.map((f) => attr(f, 'data-field')))).toEqual(slotFields);
  });

  it('draws both save panels without the script, each under its app’s name; the picker chooses one with it', () => {
    const picker = doc.querySelector('.picker')!;
    expect(attr(picker, 'role')).toBe('group');
    expect(attr(picker, 'aria-label')).toBe('The app you used');
    expect(all(picker, 'button').map((b) => [attr(b, 'type'), attr(b, 'data-pick'), attr(b, 'aria-pressed'), text(b)])).toEqual([
      ['button', 'claude', 'true', 'Claude'],
      ['button', 'chatgpt', 'false', 'ChatGPT'],
    ]);
    const panels = all(doc, '[data-pick-panel]');
    expect(
      panels.map((p) => [
        attr(p, 'data-pick-panel'),
        p.hasAttribute('hidden'),
        p.firstElementChild?.tagName,
        text(p.querySelector('h3.pick-title')),
        all(p, 'ol > li').map(text),
        text(p.querySelector('a.btn')),
        attr(p.querySelector('a.btn'), 'href'),
      ]),
    ).toEqual([
      [
        'claude',
        false,
        'H3',
        'Claude',
        ['Open Claude Projects.', 'Click New project, top right.', "Paste your profile into the Project's Instructions."],
        'Open Claude Projects',
        'https://claude.ai/projects',
      ],
      [
        'chatgpt',
        false,
        'H3',
        'ChatGPT',
        ['Open ChatGPT settings.', 'Paste your profile into Custom instructions.'],
        'Open ChatGPT Settings',
        'https://chatgpt.com/settings/personalization?instructions=chatgpt',
      ],
    ]);
    for (const p of panels) expect(p.closest('section')?.id).toBe('voice-profile-save');
  });
});

// ================================================================================================

describe('links', () => {
  const doc = parse();
  const links = all(doc, 'a');

  it('is every link on the page, in order, where it goes and whether it opens a new tab', () => {
    expect(links.map((a) => [text(a), attr(a, 'href'), attr(a, 'target')])).toEqual([
      ['Get ChatGPT', 'https://chatgpt.com/download', '_blank'],
      ['Get Claude', 'https://claude.com/download', '_blank'],
      ['Already have a voice profile? Skip to Step 2', '#carousel-creator', null],
      ['Copy & Open ChatGPT', 'https://chatgpt.com/', '_blank'],
      ['Copy & Open Claude', 'https://claude.ai/new', '_blank'],
      ['Open Claude Projects', 'https://claude.ai/projects', '_blank'],
      ['Open ChatGPT Settings', 'https://chatgpt.com/settings/personalization?instructions=chatgpt', '_blank'],
      ['Send This to My Laptop', SHARE_MAILTO, null],
      ['Copy & Open Claude', 'https://claude.ai/new', '_blank'],
      ['See My Design Systems', 'https://claude.ai/settings/design-systems', '_blank'],
      ['Settings, then Capabilities', 'https://claude.ai/settings/capabilities', '_blank'],
      ['Copy Instructions & Open Claude', 'https://claude.ai/projects', '_blank'],
      ['Apple or Outlook', '/ai101/carousel-sprint.ics', null],
      ['Google Calendar', GOOGLE_CALENDAR, '_blank'],
      // In a new tab, so reading them never loses what was typed into the form.
      ['Terms of Service', '/terms', '_blank'],
      ['Privacy Policy', '/privacy', '_blank'],
    ]);
  });

  it('opens every off-site link in a new tab with noopener, at a URL on the list, and uses every URL on it', () => {
    const external = all(doc, 'a[href^="http"]');
    for (const a of external) {
      const href = attr(a, 'href')!;
      expect(attr(a, 'target'), href).toBe('_blank');
      expect(attr(a, 'rel'), href).toBe('noopener');
      expect(OFF_SITE_URLS.has(href), href).toBe(true);
    }
    const hrefs = new Set(external.map((a) => attr(a, 'href')));
    expect([...OFF_SITE_URLS].filter((u) => !hrefs.has(u))).toEqual([]);
    // Every new tab is noopener, on-site ones included.
    for (const a of all(doc, 'a[target]')) expect(attr(a, 'rel')).toBe('noopener');
  });

  it('never uses a ?q= prefill link', () => {
    for (const a of links) expect(attr(a, 'href')).not.toMatch(/[?&]q=/);
  });

  it('gives "Get ChatGPT" and "Get Claude" their store links for main.ts to swap in on a phone', () => {
    expect(
      all(doc, 'a[data-get-app]').map((a) => [text(a), attr(a, 'href'), attr(a, 'data-ios'), attr(a, 'data-android')]),
    ).toEqual([
      [
        'Get ChatGPT',
        'https://chatgpt.com/download',
        'https://apps.apple.com/app/chatgpt/id6448311069',
        'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
      ],
      [
        'Get Claude',
        'https://claude.com/download',
        'https://apps.apple.com/us/app/claude-by-anthropic/id6473753684',
        'https://play.google.com/store/apps/details?id=com.anthropic.claude',
      ],
    ]);
    for (const a of all(doc, 'a[data-get-app]')) expect(a.closest('section')?.id).toBe('welcome');
  });

  it('skips to Step 2 with a real link to its screen, which works without JavaScript', () => {
    const skip = doc.querySelector('#welcome a.skip')!;
    expect(attr(skip, 'href')).toBe('#carousel-creator');
    expect(doc.getElementById('carousel-creator')?.matches('section[data-screen]')).toBe(true);
  });

  it('sends Step 2 to the laptop as a mailto: whose body is the link to Step 2', () => {
    const share = doc.querySelector('a[data-share]')!;
    expect(share.closest('section')?.id).toBe('voice-profile-test');
    const href = attr(share, 'href')!;
    expect(href).toBe(SHARE_MAILTO);
    expect(href).toContain('https%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator');
    // The same title and URL the share sheet sends with JavaScript.
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe(UI.share.title);
    expect(params.get('body')).toBe(`Open this on your laptop:\n${UI.share.url}`);
    expect(UI.share.url).toBe('https://www.amplifiedimpact.io/ai101#carousel-creator');
  });

  it('keeps the .ics in this tab and never as a download, so iOS offers "Add to Calendar"', () => {
    const ics = all(doc, 'a[href="/ai101/carousel-sprint.ics"]');
    expect(ics).toHaveLength(1);
    expect(ics[0]!.hasAttribute('target')).toBe(false);
    expect(ics[0]!.hasAttribute('download')).toBe(false);
    expect(ics[0]!.closest('#sprint')).not.toBeNull();
    expect(all(doc, '#sprint a').map((a) => attr(a, 'href'))).toEqual(['/ai101/carousel-sprint.ics', GOOGLE_CALENDAR]);
  });

  it('links the Terms of Service and the Privacy Policy from the waitlist’s legal line', () => {
    const legal = doc.querySelector('#waitlist-form .wl-legal')!;
    expect(all(legal, 'a').map((a) => [text(a), attr(a, 'href'), attr(a, 'rel')])).toEqual([
      ['Terms of Service', '/terms', 'noopener'],
      ['Privacy Policy', '/privacy', 'noopener'],
    ]);
  });
});

// ================================================================================================

describe('Copy & Open and the starter ideas', () => {
  const doc = parse();

  it('lists every Copy & Open, in order: its words, where it opens, what it copies and what it says', () => {
    const links = all(doc, 'a[data-copy-open]');
    expect(
      links.map((a) => [
        a.closest('section')?.id,
        text(a.querySelector('[data-copy-label]')),
        attr(a, 'href'),
        attr(a, 'data-copy-open'),
        attr(a, 'data-app'),
        attr(a, 'data-toast'),
      ]),
    ).toEqual([
      [
        'voice-profile-copy',
        'Copy & Open ChatGPT',
        'https://chatgpt.com/',
        'voice-profile-prompt',
        'ChatGPT',
        'Copied. Paste it into the new ChatGPT chat.',
      ],
      [
        'voice-profile-copy',
        'Copy & Open Claude',
        'https://claude.ai/new',
        'voice-profile-prompt',
        'Claude',
        'Copied. Paste it into the new Claude chat.',
      ],
      [
        'carousel-creator-checklist',
        'Copy & Open Claude',
        'https://claude.ai/new',
        'carousel-creator-brand-prompt',
        'Claude',
        'Copied. Paste it into the new Claude chat.',
      ],
      [
        'carousel-creator-project',
        'Copy Instructions & Open Claude',
        'https://claude.ai/projects',
        'carousel-creator-prompt',
        'Claude',
        'Copied. Make the Project, then paste into Instructions.',
      ],
    ]);
  });

  it('wires each one to a prompt block on its own screen, and describes it by that prompt’s label', () => {
    for (const a of all(doc, 'a[data-copy-open]')) {
      const blockId = attr(a, 'data-copy-open')!;
      const block = doc.getElementById(blockId)!;
      expect(block.querySelector('pre[data-prompt-text]'), blockId).not.toBeNull();
      expect(block.closest('section')).toBe(a.closest('section'));
      // Two of them read "Copy & Open Claude": the description tells them apart.
      expect(attr(a, 'aria-describedby')).toBe(`${blockId}-label`);
      expect(doc.getElementById(`${blockId}-label`)?.parentElement).toBe(block);
      // A real link: with JavaScript off it still opens the app.
      expect(attr(a, 'target')).toBe('_blank');
      // The label main.ts swaps is the link's only content.
      expect(a.children).toHaveLength(1);
      expect(a.firstElementChild?.matches('span[data-copy-label]')).toBe(true);
    }
  });

  it('copies the brand prompt with nothing on its screen that would have to be pasted after an attachment', () => {
    // Paste FIRST, then attach: a screenshot through the clipboard would replace the prompt.
    const steps = all(doc, '#carousel-creator-checklist ol.numbered > li').map(text);
    expect(steps).toEqual([
      'Paste. Put in your brokerage name. Know your brand colors or fonts? Add them at the end.',
      'Attach your logo, your headshot, and screenshots of two or three posts you love.',
      'Send.',
    ]);
  });

  it('draws the four starters as buttons that copy their own words', () => {
    const chips = all(doc, 'button[data-copy-chip]');
    expect(chips.map((b) => text(b.querySelector('[data-copy-label]')))).toEqual([
      'A buyer asked if they should wait for rates to drop.',
      `Here's a market stat I want to explain:`,
      'A lesson from my week:',
      'My take on this industry news:',
    ]);
    for (const b of chips) {
      expect(b.closest('section')?.id).toBe('carousel-creator-first-idea');
      expect(attr(b, 'type')).toBe('button');
      expect(attr(b, 'data-toast')).toBe('Copied. Paste it into the Project chat and finish the thought.');
      // The "Copy" tag is drawn for sight only: the button's name is the words.
      const tag = b.querySelector('.starter-tag')!;
      expect(text(tag)).toBe('Copy');
      expect(attr(tag, 'aria-hidden')).toBe('true');
      expect(Array.from(b.children)).toEqual([b.querySelector('[data-copy-label]'), tag]);
    }
  });
});

// ================================================================================================

describe('the waitlist form', () => {
  const doc = parse();
  const form = doc.getElementById('waitlist-form') as HTMLFormElement;
  const labelOf = (input: Element) => doc.querySelector(`label[for="${input.id}"]`);

  it('is a native form that posts to the API, with the browser validating until main.ts takes over', () => {
    expect(form.tagName).toBe('FORM');
    expect(form.closest('section')?.id).toBe('waitlist');
    expect(attr(form, 'method')).toBe('post');
    expect(attr(form, 'action')).toBe('/api/ai101/waitlist');
    expect(form.hasAttribute('novalidate')).toBe(false);
  });

  it('asks for these fields, in this order: the SMS box after the number it texts', () => {
    expect(all(form, 'input, textarea, select').map((el) => attr(el, 'name'))).toEqual([
      'firstName',
      'email',
      'phone',
      'brokerage',
      'smsConsent',
      'website',
    ]);
  });

  it.each([
    ['firstName', 'First name', { type: 'text', required: '', autocomplete: 'given-name', maxlength: '80' }],
    ['email', 'Email', { type: 'email', required: '', autocomplete: 'email', maxlength: '254', inputmode: 'email' }],
    // Optional, unlike the design's two: texts need a number, and no one has to want texts.
    ['phone', 'Mobile number (optional)', { type: 'tel', autocomplete: 'tel', maxlength: '24', inputmode: 'tel' }],
    ['brokerage', 'Brokerage (optional)', { type: 'text', autocomplete: 'organization', maxlength: '120' }],
  ] as const)('%s: "%s", its attributes, a hidden label and an empty error line', (name, placeholder, attrs) => {
    const input = form.querySelector(`[name="${name}"]`)!;
    expect(input.tagName).toBe('INPUT');
    expect(input.id).toBe(`waitlist-${name}`);
    expect(attr(input, 'placeholder')).toBe(placeholder);
    // Exactly these attributes: no stray `required` on an optional field, no `aria-invalid` yet.
    expect(input.getAttributeNames().sort()).toEqual(['id', 'name', 'placeholder', ...Object.keys(attrs)].sort());
    for (const [a, value] of Object.entries(attrs)) expect(attr(input, a), a).toBe(value);
    const label = labelOf(input)!;
    expect(label.classList.contains('visually-hidden')).toBe(true);
    expect(text(label)).toBe(placeholder);
    const error = doc.getElementById(`${name}-error`)!;
    expect(error.tagName).toBe('P');
    expect(error.classList.contains('field-error')).toBe(true);
    expect(text(error)).toBe('');
    expect(error.parentElement).toBe(input.parentElement);
  });

  it('has the SMS consent as its own unchecked, optional box, labelled by the consent itself', () => {
    const box = form.querySelector('input[name="smsConsent"]')!;
    expect(attr(box, 'type')).toBe('checkbox');
    expect(attr(box, 'value')).toBe('on');
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.hasAttribute('required')).toBe(false);
    const label = labelOf(box)!;
    expect(text(label)).toBe(PAGE.waitlist.sms);
    expect(text(label)).toBe(SMS_CONSENT);
    // The label is only the words: nothing in it to tap but the box.
    expect(label.children).toHaveLength(0);
  });

  it('names everyone who may text, and says what carriers require', () => {
    const consent = text(labelOf(form.querySelector('input[name="smsConsent"]')!));
    for (const words of [
      'Amplified Impact',
      'Spring B and its affiliated companies',
      'Spring,',
      'Connor',
      'automated technology',
      "Consent isn't required to join or to buy anything.",
      'Message frequency varies.',
      'Msg & data rates may apply',
      'Reply STOP to opt out',
      'HELP for help',
    ]) {
      expect(consent, words).toContain(words);
    }
    expect(consent).toContain(`from ${SENDERS} at the number above.`);
  });

  it('puts the legal line under the button: joining is the Terms, the Privacy Policy and email from the same senders', () => {
    const legal = form.querySelector('.wl-legal')!;
    expect(text(legal)).toBe(LEGAL_LINE);
    expect(text(legal)).toBe(inlineText(PAGE.waitlist.legal));
    expect(text(legal)).toContain(`from ${SENDERS}. Unsubscribe anytime.`);
  });

  it('orders the honeypot, the form-level error, the button and the legal line at the end of the form', () => {
    const tail = Array.from(form.children).slice(-5);
    expect(tail.map((el) => el.tagName + '.' + el.className)).toEqual([
      'DIV.wl-sms',
      'DIV.field-website',
      'P.form-error',
      'BUTTON.btn btn-cream',
      'P.wl-legal',
    ]);
    const button = tail[3]!;
    expect(attr(button, 'type')).toBe('submit');
    expect(text(button)).toBe('Join the Waitlist');
    expect(all(form, 'button')).toEqual([button]);
  });

  it('hides the honeypot from people without display:none', () => {
    const input = form.querySelector('input[name="website"]')!;
    expect(attr(input, 'type')).toBe('text');
    expect(attr(input, 'tabindex')).toBe('-1');
    expect(attr(input, 'autocomplete')).toBe('off');
    const wrapper = input.parentElement!;
    expect(wrapper.classList.contains('field-website')).toBe(true);
    expect(attr(wrapper, 'aria-hidden')).toBe('true');
    expect(wrapper.hasAttribute('hidden')).toBe(false);
    expect(text(labelOf(input))).toBe('Leave this field empty');
  });

  it('carries the generic error in the markup, for the no-JavaScript redirect to #waitlist-error', () => {
    const error = doc.getElementById('waitlist-error')!;
    expect(form.contains(error)).toBe(true);
    expect(attr(error, 'role')).toBe('alert');
    expect(text(error)).toBe('Something went wrong. Try again.');
    expect(text(error)).toBe(UI.errors.generic);
  });

  it('has the success line outside the form, focusable for when it appears', () => {
    const joined = doc.getElementById('waitlist-joined')!;
    expect(attr(joined, 'tabindex')).toBe('-1');
    expect(joined.classList.contains('wl-success')).toBe(true);
    expect(text(joined)).toBe("You're on the list. We'll email you about the December agent track.");
    expect(form.contains(joined)).toBe(false);
    expect(joined.closest('section')?.id).toBe('waitlist');
  });

  it('gives every button an explicit type, and only the waitlist’s submits', () => {
    const buttons = all(doc, 'button');
    for (const b of buttons) expect(['button', 'submit'], b.outerHTML.slice(0, 60)).toContain(attr(b, 'type'));
    expect(buttons.filter((b) => attr(b, 'type') === 'submit')).toEqual([form.querySelector('button')]);
  });
});

// ================================================================================================

describe('logos', () => {
  const doc = parse();
  const svgs = all(doc.body, 'svg');

  it('inlines the two brand logos as named images that the CSS sizes', () => {
    expect(svgs.map((svg) => [svg.closest('section')?.id, attr(svg, 'class')])).toEqual([
      ['welcome', 'logo'],
      ['waitlist', 'logo logo-reversed'],
    ]);
    for (const svg of svgs) {
      expect(svg.parentElement?.tagName).toBe('SECTION');
      expect(svg.parentElement?.firstElementChild).toBe(svg);
      expect(attr(svg, 'role')).toBe('img');
      expect(attr(svg, 'aria-label')).toBe('Amplified Impact');
      expect(attr(svg, 'focusable')).toBe('false');
      expect(svg.hasAttribute('width')).toBe(false);
      expect(svg.hasAttribute('height')).toBe(false);
      expect(attr(svg, 'viewBox')).toBe('0 12.11 735.53 111.89');
    }
  });

  it('puts the ink logo on the cream welcome and the reversed one on the dark waitlist card', () => {
    const fills = (svg: Element) => all(svg, '[fill]').map((el) => attr(el, 'fill'));
    expect(fills(svgs[0]!)).toContain('#15211D');
    expect(fills(svgs[0]!)).not.toContain('#F4F2EC');
    expect(fills(svgs[1]!)).toContain('#F4F2EC');
    expect(fills(svgs[1]!)).not.toContain('#15211D');
  });

  it('makes no image request: no <img>, no source sets, no external references', () => {
    const doc2 = parse();
    expect(all(doc2, 'img, picture, source, image, iframe, video, audio, object, embed, link, use')).toHaveLength(0);
    expect(all(doc2, 'input[type="image"]')).toHaveLength(0);
    expect(all(doc2, '[src], [srcset], [poster], [background]')).toHaveLength(0);
    expect(attributeValues(doc2.documentElement).filter((v) => /url\(/i.test(v))).toEqual([]);
  });
});

// ================================================================================================

describe('the copy', () => {
  const doc = parse();

  it('renders every string in PAGE somewhere a person or a screen reader meets it', () => {
    const missing = copyStrings(PAGE)
      .filter(({ path }) => !path.startsWith('meta.') && !KNOWN_UNRENDERED.has(path))
      .filter(({ value }) => !rendered(doc, value));
    expect(missing).toEqual([]);
  });

  // With no exceptions: a string in content.ts that the page never shows is dead copy.
  it('renders every string in PAGE, with no exceptions', () => {
    const missing = copyStrings(PAGE)
      .filter(({ path }) => !path.startsWith('meta.'))
      .filter(({ value }) => !rendered(doc, value));
    expect(missing).toEqual([]);
  });

  it('has no em dash anywhere: not in PAGE, not in UI, not on the page', () => {
    const strings = [
      ...copyStrings(PAGE).map((s) => s.value),
      ...copyStrings(UI).map((s) => s.value),
      UI.copiedThenOpen('ChatGPT'),
    ];
    expect(strings.filter((s) => s.includes('—'))).toEqual([]);
    expect(doc.body.textContent).not.toContain('—');
    expect(attributeValues(doc.documentElement).filter((v) => v.includes('—'))).toEqual([]);
    expect(doc.title).not.toContain('—');
  });

  it('puts the welcome screen together as the design draws it', () => {
    const w = doc.getElementById('welcome')!;
    expect(text(w.querySelector('.eyebrow'))).toBe('eXpCon 2026 · AI 101 for Agents');
    expect(text(w.querySelector('.lede'))).toBe(
      "The prompts and setup from the session with Spring and Connor. One screen at a time. Tap the big green button when you're ready for the next one.",
    );
    expect(all(w, '.card-title').map(text)).toEqual(['First: get the app and sign in']);
    expect(text(w.querySelector('.builds-lead'))).toBe("Today you'll build two things:");
    expect(all(w, '.builds ol > li').map(text)).toEqual([
      'Your AI voice profile. Phone or laptop, free.',
      'Your Carousel Creator. Laptop, Claude Pro or higher.',
    ]);
    // In this order: logo, eyebrow, title, intro, the app card, the builds, the skip link.
    expect(Array.from(w.children).map((el) => el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : ''))).toEqual([
      'svg.logo',
      'p.eyebrow',
      'h1',
      'p.lede',
      'div.card',
      'div.builds',
      'a.skip',
    ]);
  });

  it('writes the week screen’s lists, the four things you own, and the sprint', () => {
    expect(all(doc, '#carousel-creator-week > ol.circled > li').map(text)).toEqual([
      'Open the Carousel Creator and send one idea.',
      'It drafts the slide copy in your voice. You edit and approve it.',
      'Claude builds the carousel in Claude Design. Adjust anything in plain English or on the canvas.',
      'Export: send to Canva and download images for Instagram, or export a PDF for LinkedIn.',
      'Post it and answer every comment and DM yourself.',
    ]);
    expect(all(doc, '#four-things ul > li').map(text)).toEqual([
      'Fair housing review of anything about neighborhoods, schools, or who a place is right for',
      `Your state's advertising rules, like brokerage identification on every post`,
      `Your MLS's rules on using market stats, including attribution`,
      'Consent before any automated text, under TCPA',
    ]);
    // "Wk 1" reads as "Wk 1: Market": the colon is there for a screen reader only.
    expect(all(doc, '#sprint ul.weeks > li').map(text)).toEqual(['Wk 1: Market', 'Wk 2: Method', 'Wk 3: Me', 'Wk 4: Market']);
    for (const colon of all(doc, '#sprint .week-label .visually-hidden')) expect(text(colon)).toBe(':');
  });

  it('renders the numbered steps as lists, each step one item', () => {
    expect(all(doc, '#voice-profile-copy ol.numbered > li').map(text)).toEqual([
      'Paste.',
      'Replace the last line with your samples.',
      'Send.',
    ]);
    expect(all(doc, '#carousel-creator-project ol.numbered > li').map(text)).toEqual([
      'Click New project, top right.',
      'Name it Carousel Creator. Click Create project.',
      'Open Instructions on the right side and paste.',
    ]);
    // Bold runs stay inside the step's one <span>, so they read as part of the sentence.
    for (const li of all(doc, 'ol.numbered > li')) {
      expect(li.children).toHaveLength(1);
      expect(li.firstElementChild?.tagName).toBe('SPAN');
    }
  });

  it('puts nothing in the markup that the CSP would block or that a template would leave behind', () => {
    for (const el of all(doc, '*')) {
      // `script-src-attr 'none'`: no inline handlers. And no style attributes, so a stricter
      // `style-src-attr` later costs nothing.
      expect(el.getAttributeNames().filter((n) => n.startsWith('on') || n === 'style'), el.tagName).toEqual([]);
    }
    expect(all(doc.body, 'script, style')).toHaveLength(0);
    expect(doc.documentElement.innerHTML).not.toMatch(/undefined|\[object Object\]|NaN/);
    expect(renderAi101Body()).not.toMatch(/javascript:/i);
  });
});

// ================================================================================================

describe('<head>', () => {
  const doc = parse();
  const meta = (selector: string) => doc.head.querySelector(selector)?.getAttribute('content');

  it('renders the title and the link-preview metadata', () => {
    expect(doc.title).toBe('AI 101 for Agents · Amplified Impact');
    expect(doc.title).toBe(PAGE.meta.title);
    expect(meta('meta[name="description"]')).toBe('The prompts and setup from the session with Spring and Connor.');
    expect(meta('meta[property="og:title"]')).toBe('AI 101 for Agents · Amplified Impact');
    expect(meta('meta[property="og:description"]')).toBe('The prompts and setup from the session with Spring and Connor.');
    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[property="og:url"]')).toBe('https://learn.amplifiedimpact.io/ai101');
    expect(meta('meta[property="og:site_name"]')).toBe('Amplified Impact');
    expect(meta('meta[name="twitter:card"]')).toBe('summary');
  });

  it('is only those lines: no stylesheet, script, or image to fetch', () => {
    expect(Array.from(doc.head.children).map((el) => el.tagName)).toEqual(['TITLE', ...Array<string>(7).fill('META')]);
    expect(doc.head.querySelector('meta[property="og:image"]')).toBeNull();
  });
});
