import { afterEach, describe, expect, it, vi } from 'vitest';
import { ICONS } from '@ai/core';
import { PAGE, UI, type Inline, type Step } from './content';
import type * as Content from './content';
import { LOGOS } from './logos';
import { esc, highlightPlaceholders, icon, renderAi101Body, renderAi101Head } from './render';

// /ai101's markup contract (DECISIONS.md D-028), checked on the parsed DOM rather than on the string:
// what matters is what a browser builds from the bytes, and the HTML parser has opinions — it drops a
// newline after `<pre>`, it decodes entities, it closes what it likes. `main.ts`, the API's CSP and
// the e2e spec all lean on the hooks asserted here.

const parse = (body = renderAi101Body(), head = renderAi101Head()) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`,
    'text/html',
  );

const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));
const text = (el: Element | null | undefined) => el?.textContent ?? '';

/** Keys whose values are identifiers or URLs, not words anybody reads. */
const NOT_COPY = new Set(['id', 'anchor', 'target', 'url', 'href', 'kind', 'name']);

/** Copy that is rendered into an attribute rather than as text: labels and field placeholders. */
const attributeCopy = (doc: Document) =>
  all(doc.body, '[aria-label], [placeholder]').flatMap((el) =>
    [el.getAttribute('aria-label'), el.getAttribute('placeholder')].filter((v): v is string => v !== null),
  );

/** What one run of inline copy contributes to `textContent`: a phone-only line is in the DOM too. */
const inlineText = (segments: readonly Inline[]) =>
  segments
    .map((s) =>
      typeof s === 'string' ? s : 'strong' in s ? s.strong : 'link' in s ? s.link : s.button + (s.phone ?? ''),
    )
    .join('');

const stepText = (step: Step) =>
  typeof step === 'string' ? step : step.lead + step.options.map((o) => inlineText(o)).join('');

/** Every readable string in `PAGE` (except `meta`, which lives in <head> and is checked there). */
function copyStrings(value: unknown, key = ''): string[] {
  if (NOT_COPY.has(key) || key === 'meta') return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((v) => copyStrings(v));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => copyStrings(v, k));
  return [];
}

const PROMPTS = [
  { anchor: PAGE.voiceProfile.anchor, prompt: PAGE.voiceProfile.prompt },
  { anchor: PAGE.carouselCreator.anchor, prompt: PAGE.carouselCreator.prompt },
  // Checklist item 1's, inside the checklist, so its label is an h4 (D-032).
  { anchor: `${PAGE.carouselCreator.anchor}-brand`, prompt: PAGE.carouselCreator.brandPrompt },
];

describe('/ai101 document outline', () => {
  const doc = parse();

  it('has exactly one h1, and it is the title', () => {
    expect(all(doc, 'h1')).toHaveLength(1);
    expect(text(doc.querySelector('h1'))).toBe(PAGE.header.title);
  });

  it('never skips a heading level, starting from the h1', () => {
    const levels = all(doc.body, 'h1, h2, h3, h4, h5, h6').map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i]!).toBeLessThanOrEqual(levels[i - 1]! + 1);
    // The sub-blocks are h3s: both prompt labels, "Setup checklist", "About you" and "How a week works".
    expect(all(doc, 'h3').map(text)).toEqual([
      PAGE.voiceProfile.prompt.label,
      PAGE.carouselCreator.checklistHeading,
      PAGE.carouselCreator.aboutYou.heading,
      PAGE.carouselCreator.prompt.label,
      PAGE.carouselCreator.weekHeading,
    ]);
  });

  it('is one <main> with the header and the five sections in the spec order', () => {
    expect(all(doc, 'main')).toHaveLength(1);
    const main = doc.querySelector('main')!;
    expect(main.firstElementChild?.tagName).toBe('HEADER');
    expect(all(main, ':scope > section').map((s) => s.id)).toEqual([
      'voice-profile',
      'carousel-creator',
      'four-things',
      'sprint',
      'waitlist',
    ]);
    // No app shell: this page has no sidebar, no breadcrumb header.
    expect(doc.querySelector('aside')).toBeNull();
  });

  it('labels every section by its own h2', () => {
    for (const section of all(doc, 'main > section')) {
      const heading = doc.getElementById(section.getAttribute('aria-labelledby') ?? '');
      expect(heading?.tagName).toBe('H2');
      expect(section.contains(heading)).toBe(true);
    }
    expect(all(doc, 'h2').map(text)).toEqual([
      PAGE.voiceProfile.heading,
      PAGE.carouselCreator.heading,
      PAGE.ownership.heading,
      PAGE.sprint.heading,
      PAGE.waitlist.heading,
    ]);
  });

  it('puts the eyebrow, subhead and jump links in the header, with aria-hidden separators', () => {
    const header = doc.querySelector('main > header')!;
    expect(text(header.querySelector('.eyebrow'))).toBe(PAGE.header.eyebrow);
    expect(text(header.querySelector('.subhead'))).toBe(PAGE.header.subhead);
    const nav = header.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe(PAGE.header.jumpLinksLabel);
    const links = all(nav, 'a');
    expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Voice profile prompt', '#voice-profile-prompt'],
      ['Carousel Creator', '#carousel-creator'],
      ['December waitlist', '#waitlist'],
    ]);
    for (const a of links) expect(doc.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull();
    const seps = all(nav, '.sep');
    expect(seps).toHaveLength(2);
    for (const sep of seps) {
      expect(sep.getAttribute('aria-hidden')).toBe('true');
      expect(text(sep)).toBe(' · ');
    }
    expect(text(nav)).toBe('Voice profile prompt · Carousel Creator · December waitlist');
  });

  it('renders the head metadata from content.ts', () => {
    const meta = (selector: string) => doc.head.querySelector(selector)?.getAttribute('content');
    expect(doc.title).toBe('AI 101 for Agents: Prompts and Setup | Amplified Impact');
    expect(doc.title).toBe(PAGE.meta.title);
    expect(meta('meta[name="description"]')).toBe(PAGE.header.subhead);
    expect(meta('meta[property="og:title"]')).toBe(PAGE.meta.title);
    expect(meta('meta[property="og:description"]')).toBe(PAGE.header.subhead);
    expect(meta('meta[property="og:type"]')).toBe('website');
    expect(meta('meta[property="og:url"]')).toBe('https://learn.amplifiedimpact.io/ai101');
    expect(meta('meta[property="og:site_name"]')).toBe(PAGE.meta.siteName);
    expect(meta('meta[name="twitter:card"]')).toBe('summary');
  });
});

describe('/ai101 prompts', () => {
  const doc = parse();

  it.each(PROMPTS)('$prompt.id has no leading or trailing whitespace to lose', ({ prompt }) => {
    // The parser drops one newline after <pre>, and the copy would silently differ from the source.
    expect(prompt.text).toBe(prompt.text.trim());
  });

  it.each(PROMPTS)('$prompt.id: the <pre> text is the prompt, character for character', ({ anchor, prompt }) => {
    const block = doc.getElementById(`${anchor}-prompt`)!;
    expect(block.getAttribute('data-prompt')).toBe(prompt.id);
    expect(block.classList.contains('prompt')).toBe(true);
    const pre = block.querySelector('pre[data-prompt-text]')!;
    expect(pre.textContent).toBe(prompt.text);
  });

  it.each(PROMPTS)('$prompt.id: every [placeholder] is highlighted, and only those', ({ anchor, prompt }) => {
    const pre = doc.querySelector(`#${anchor}-prompt pre`)!;
    const marks = all(pre, 'mark');
    const expected = prompt.text.match(/\[[^\]\n]*\]/g) ?? [];
    expect(expected.length).toBeGreaterThan(0);
    expect(marks.map(text)).toEqual(expected);
    for (const mark of marks) {
      expect(mark.className).toBe('placeholder');
      expect(mark.children).toHaveLength(0);
    }
    // Nothing but text and marks inside the <pre>.
    for (const node of Array.from(pre.childNodes)) expect(['#text', 'MARK']).toContain(node.nodeName);
  });

  it.each(PROMPTS)(
    '$prompt.id: a real copy button, labelled "Copy prompt" and described by the label',
    ({ anchor, prompt }) => {
      const block = doc.getElementById(`${anchor}-prompt`)!;
      const h3 = block.querySelector('h3, h4')!;
      expect(text(h3)).toBe(prompt.label);
      const button = block.querySelector('button[data-copy]')!;
      expect(button.getAttribute('type')).toBe('button');
      expect(text(button)).toBe(UI.copy);
      expect(text(button.querySelector('[data-copy-label]'))).toBe(UI.copy);
      expect(button.getAttribute('aria-describedby')).toBe(h3.id);
      // The copy and check glyphs are both present; CSS shows one by `[data-copied]`.
      expect(all(button, 'svg.icon-copy')).toHaveLength(1);
      expect(all(button, 'svg.icon-check')).toHaveLength(1);
      expect(button.hasAttribute('data-copied')).toBe(false);
    },
  );

  it('highlightPlaceholders escapes first and keeps the brackets inside the mark', () => {
    expect(highlightPlaceholders('a <b> [x & y] "c"')).toBe(
      'a &lt;b&gt; <mark class="placeholder">[x &amp; y]</mark> &quot;c&quot;',
    );
  });
});

describe('/ai101 content', () => {
  const doc = parse();

  it('renders every string in PAGE', () => {
    const visible = doc.body.textContent ?? '';
    const labels = attributeCopy(doc);
    const missing = copyStrings(PAGE).filter((s) => !visible.includes(s) && !labels.includes(s));
    expect(missing).toEqual([]);
  });

  it('renders the layers as a real table with column and row headers', () => {
    const table = doc.querySelector('table.layers')!;
    const { columns, rows } = PAGE.carouselCreator.layers;
    expect(all(table, 'thead th[scope="col"]').map(text)).toEqual([...columns]);
    const bodyRows = all(table, 'tbody tr');
    expect(bodyRows).toHaveLength(rows.length);
    bodyRows.forEach((tr, i) => {
      expect(all(tr, 'th, td').map(text)).toEqual(rows[i]!.map((c) => (typeof c === 'string' ? c : inlineText(c))));
      expect(tr.querySelector('th')?.getAttribute('scope')).toBe('row');
      // The stacked phone layout captions each cell with its column; the table still names it.
      expect(all(tr, 'td').map((td) => td.getAttribute('data-label'))).toEqual(columns.slice(1));
    });
    // Explicit roles, because the phone layout changes `display` and browsers then drop the semantics.
    expect(table.getAttribute('role')).toBe('table');
    expect(all(table, 'tr').every((tr) => tr.getAttribute('role') === 'row')).toBe(true);
    expect(all(table, 'td').every((td) => td.getAttribute('role') === 'cell')).toBe(true);
  });

  it('renders the checklist as native checkboxes with unique, persisted ids', () => {
    const ids = PAGE.carouselCreator.checklist.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const list = doc.querySelector('ul.checklist')!;
    expect(doc.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe(
      PAGE.carouselCreator.checklistHeading,
    );
    const items = all(list, ':scope > li');
    expect(items).toHaveLength(ids.length);
    items.forEach((li, i) => {
      const item = PAGE.carouselCreator.checklist[i]!;
      const input = li.querySelector('label > input')!;
      expect(input.getAttribute('type')).toBe('checkbox');
      expect(input.getAttribute('name')).toBe('ai101-check');
      expect(input.getAttribute('value')).toBe(item.id);
      expect(input.getAttribute('data-check-id')).toBe(item.id);
      expect(input.hasAttribute('checked')).toBe(false);
      expect(li.querySelector('.box')?.getAttribute('aria-hidden')).toBe('true');
      // The label is the title alone; the detail sits outside it, so its links never tick the box
      // and never join the checkbox's accessible name (D-032).
      expect(text(li.querySelector('label')).trim()).toBe(inlineText(item.title));
      expect(li.querySelector('label a, label button')).toBeNull();
    });
  });

  it('renders the numbered lists as <ol> and the sprint weeks as a <ul>', () => {
    const lists = all(doc, 'ol.steps').map((ol) => all(ol, ':scope > li').map(text));
    expect(lists).toEqual([
      PAGE.voiceProfile.steps.map((s) => stepText(s)),
      [...PAGE.carouselCreator.week],
      [...PAGE.ownership.items],
    ]);
    expect(all(doc, '#sprint ul.weeks li').map(text)).toEqual([
      'Week 1: Market',
      'Week 2: Method',
      'Week 3: Me',
      'Week 4: Market',
    ]);
  });

  it('has one polite live region, empty until a copy', () => {
    const live = all(doc, '[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]!.id).toBe('ai101-live');
    expect(live[0]!.getAttribute('aria-live')).toBe('polite');
    expect(text(live[0])).toBe('');
  });

  it('puts nothing in the markup that the CSP would block or that a template would leave behind', () => {
    for (const el of all(doc, '*')) {
      // `script-src-attr 'none'`: no inline handlers. And no style attributes, so a stricter
      // `style-src-attr` later costs nothing.
      expect(el.getAttributeNames().filter((n) => n.startsWith('on') || n === 'style')).toEqual([]);
    }
    expect(doc.body.innerHTML).not.toMatch(/undefined|\[object Object\]/);
  });
});

describe('/ai101 waitlist markup', () => {
  const doc = parse();
  const form = doc.getElementById('waitlist-form') as HTMLFormElement;
  const field = (name: string) => form.querySelector(`[name="${name}"]`)!;
  const labelOf = (input: Element) => doc.querySelector(`label[for="${input.id}"]`);

  it('is a native form that posts to the API, with the browser validating until main.ts takes over', () => {
    expect(form.closest('section')?.id).toBe('waitlist');
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe('/api/ai101/waitlist');
    expect(form.hasAttribute('novalidate')).toBe(false);
  });

  it.each([
    [
      'firstName',
      'text',
      PAGE.waitlist.fields.firstName.label,
      { required: '', autocomplete: 'given-name', maxlength: '80' },
    ],
    [
      'email',
      'email',
      PAGE.waitlist.fields.email.label,
      { required: '', autocomplete: 'email', maxlength: '254', inputmode: 'email' },
    ],
    ['brokerage', 'text', PAGE.waitlist.fields.brokerage.label, { autocomplete: 'organization', maxlength: '120' }],
  ] as const)('%s: type, attributes, label and an empty error line', (name, type, label, attrs) => {
    const input = field(name);
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe(type);
    for (const [attr, value] of Object.entries(attrs)) expect(input.getAttribute(attr)).toBe(value);
    if (!('required' in attrs)) expect(input.hasAttribute('required')).toBe(false);
    expect(labelOf(input)?.firstChild?.textContent?.trim()).toBe(label);
    const error = doc.getElementById(`${name}-error`)!;
    expect(error.classList.contains('field-error')).toBe(true);
    expect(text(error)).toBe('');
    // Described by the error only once there is one: main.ts adds it with aria-invalid.
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('marks brokerage as optional inside its label', () => {
    expect(text(labelOf(field('brokerage'))?.querySelector('.optional'))).toBe(PAGE.waitlist.fields.brokerage.optional);
  });

  it('hides the honeypot from people without display:none', () => {
    const input = field('website');
    expect(input.getAttribute('tabindex')).toBe('-1');
    expect(input.getAttribute('autocomplete')).toBe('off');
    const wrapper = input.parentElement!;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.hasAttribute('hidden')).toBe(false);
    expect(text(labelOf(input))).toBe('Leave this field empty');
  });

  it('orders the form-level error, the button and the consent line', () => {
    const error = doc.getElementById('waitlist-error')!;
    expect(error.classList.contains('form-error')).toBe(true);
    // It carries its text for the no-JavaScript 303 to #waitlist-error, which only CSS can show.
    expect(text(error)).toBe(UI.errors.generic);
    const button = error.nextElementSibling!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('submit');
    expect(text(button)).toBe(PAGE.waitlist.button);
    expect(button.nextElementSibling?.tagName).toBe('P');
    expect(text(button.nextElementSibling)).toBe(PAGE.waitlist.consent);
  });

  it('has the success line outside the form, focusable for when it appears', () => {
    const joined = doc.getElementById('waitlist-joined')!;
    expect(joined.classList.contains('success')).toBe(true);
    expect(joined.getAttribute('tabindex')).toBe('-1');
    expect(text(joined)).toBe(PAGE.waitlist.success);
    expect(form.contains(joined)).toBe(false);
    expect(joined.closest('section')?.id).toBe('waitlist');
  });
});

describe('escaping', () => {
  afterEach(() => {
    vi.doUnmock('./content');
    vi.resetModules();
  });

  it('esc() covers text and attribute positions', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('renders markup typed into content.ts as text, never as tags', async () => {
    const hostile = `<img src=x onerror=alert(1)><b>&amp;"'</b>`;
    const poison = (value: unknown, key = ''): unknown => {
      if (typeof value === 'string') return NOT_COPY.has(key) ? value : value + hostile;
      if (Array.isArray(value)) return value.map((v) => poison(v));
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, k)]));
      }
      return value;
    };
    vi.resetModules();
    vi.doMock('./content', async (importOriginal) => {
      const real = await importOriginal<typeof Content>();
      return { ...real, PAGE: poison(real.PAGE) };
    });
    const mod = await import('./render');
    const content = await import('./content');
    const doc = parse(mod.renderAi101Body(), mod.renderAi101Head());

    expect(all(doc, 'img, b')).toHaveLength(0);
    expect(doc.title).toBe(content.PAGE.meta.title);
    expect(doc.querySelector('h1')?.textContent).toBe(content.PAGE.header.title);
    for (const { prompt } of [content.PAGE.voiceProfile, content.PAGE.carouselCreator]) {
      expect(doc.querySelector(`[data-prompt="${prompt.id}"] pre`)?.textContent).toBe(prompt.text);
    }
    const visible = doc.body.textContent ?? '';
    const labels = attributeCopy(doc);
    expect(copyStrings(content.PAGE).filter((s) => !visible.includes(s) && !labels.includes(s))).toEqual([]);
  });
});

describe('icon()', () => {
  it('draws an ICONS path the way <Icon> does', () => {
    const svg = new DOMParser().parseFromString(icon('copy'), 'text/html').querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('stroke-width')).toBe('1.8');
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe(ICONS.copy);
  });
});

// ================================================================================================
// The click paths (D-032): every step ends in one tap or one paste
// ================================================================================================

describe('/ai101 click paths (D-032)', () => {
  const doc = parse();

  /**
   * Every URL the brief names, typed out here as the oracle rather than read from content.ts.
   * Acceptance check 3: "Every new link points to the exact URL in this brief."
   */
  const BRIEF_URLS = new Set([
    'https://chatgpt.com/download',
    'https://claude.com/download',
    'https://chatgpt.com/',
    'https://claude.ai/new',
    'https://claude.ai/projects',
    // Connor's deep link, after the brief (2026-10-07).
    'https://chatgpt.com/settings/personalization?instructions=chatgpt',
    // In place of the brief's claude.ai/design, after Connor asked how a new design would know to
    // build a design system (2026-10-08): the brand is built from a chat and kept here, and designs
    // need the artifacts switch on Capabilities. Both URLs are the ones Anthropic's Help Center links.
    'https://claude.ai/settings/design-systems',
    'https://claude.ai/settings/capabilities',
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Carousel%20Creator%3A%20weekly%20approval%20block&dates=20261012T090000/20261012T093000&recur=RRULE%3AFREQ%3DWEEKLY%3BCOUNT%3D4&details=Week%201%20Market%2C%20Week%202%20Method%2C%20Week%203%20Me%2C%20Week%204%20Market.%20Open%20your%20Carousel%20Creator%20Project%20at%20https%3A%2F%2Fclaude.ai%2Fprojects%20and%20send%20one%20idea%20from%20this%20week%27s%20pillar.%20Track%20conversations%20started%2C%20not%20likes.',
  ]);

  it('puts "Before we start" after the jump links and before Step 1, with each store link', () => {
    const main = doc.querySelector('main')!;
    const strip = doc.querySelector('.get-app')!;
    expect(strip.previousElementSibling?.tagName).toBe('HEADER');
    expect(strip.nextElementSibling?.id).toBe('voice-profile');
    expect(text(strip.querySelector('strong'))).toBe('Before we start: get the app and sign in.');
    const links = all(strip, 'a[data-get-app]');
    expect(links.map((a) => [text(a), a.getAttribute('href'), a.getAttribute('data-ios'), a.getAttribute('data-android')])).toEqual([
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
    expect(main.contains(strip)).toBe(true);
  });

  it('badges the two step cards at the top', () => {
    expect(text(doc.querySelector('#voice-profile > .badge'))).toBe('Phone or laptop · Free');
    expect(text(doc.querySelector('#carousel-creator > .badge'))).toBe('Laptop · Claude Pro or higher');
    for (const id of ['voice-profile', 'carousel-creator']) {
      expect(doc.querySelector(`#${id}`)!.firstElementChild?.className).toBe('badge');
    }
  });

  it('opens every off-site link in a new tab with noopener, at a URL the brief names', () => {
    const external = all(doc, 'a[href^="http"]');
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a.getAttribute('target'), a.getAttribute('href')!).toBe('_blank');
      expect(a.getAttribute('rel'), a.getAttribute('href')!).toBe('noopener');
      expect(BRIEF_URLS.has(a.getAttribute('href')!), a.getAttribute('href')!).toBe(true);
    }
    // ...and every URL the brief names is on the page.
    const hrefs = new Set(external.map((a) => a.getAttribute('href')));
    expect([...BRIEF_URLS].filter((u) => !hrefs.has(u))).toEqual([]);
  });

  it('never uses a ?q= prefill link', () => {
    for (const a of all(doc, 'a[href]')) expect(a.getAttribute('href')).not.toMatch(/[?&]q=/);
  });

  it('draws each Copy & open as a real link to a blank chat, wired to a prompt that exists', () => {
    const links = all(doc, 'a[data-copy-open]');
    expect(links.map((a) => [text(a), a.getAttribute('href'), a.getAttribute('data-copy-open')])).toEqual([
      ['Copy & open ChatGPT', 'https://chatgpt.com/', 'voice-profile-prompt'],
      ['Copy & open Claude', 'https://claude.ai/new', 'voice-profile-prompt'],
      ['Copy & open Claude', 'https://claude.ai/new', 'carousel-creator-brand-prompt'],
      ['Copy & open Claude Projects', 'https://claude.ai/projects', 'carousel-creator-prompt'],
    ]);
    for (const a of links) {
      expect(doc.getElementById(a.getAttribute('data-copy-open')!)?.querySelector('pre[data-prompt-text]')).not.toBeNull();
      // Described by its own prompt's label: two of them are "Copy & open Claude".
      const label = doc.getElementById(a.getAttribute('aria-describedby')!)!;
      expect(label.tagName).toMatch(/^H[34]$/);
      expect(label.closest('.prompt')?.id).toBe(a.getAttribute('data-copy-open'));
    }
    // Next to "Copy prompt", with the hint under the buttons.
    const head = doc.querySelector('#voice-profile-prompt .prompt-head')!;
    expect(all(head, '.actions > *').map(text)).toEqual(['Copy prompt', 'Copy & open ChatGPT', 'Copy & open Claude']);
    expect(text(head.nextElementSibling)).toBe('Paste it into a new chat, fill in the brackets, add your samples, then send.');
  });

  it('gives Step 1 item 4 its two options, with the phone path in the settings button’s place', () => {
    const item = all(doc, '#voice-profile ol.steps > li')[3]!;
    expect(text(item.querySelector('.step-rich > span'))).toBe('Save it where your AI keeps instructions:');
    const options = all(item, 'ul.options > li');
    expect(options).toHaveLength(2);
    expect(text(options[0]!.querySelector('strong'))).toBe('Claude (free or paid):');
    expect(options[0]!.querySelector('a')?.getAttribute('href')).toBe('https://claude.ai/projects');
    expect(text(options[1]!.querySelector('strong'))).toBe('ChatGPT:');
    expect(options[1]!.querySelector('.desktop-only a')?.getAttribute('href')).toBe('https://chatgpt.com/settings/personalization?instructions=chatgpt');
    expect(text(options[1]!.querySelector('.phone-only'))).toBe(
      'In the app: Settings, then Personalization, then Custom instructions.',
    );
    // The deep link lands on Custom instructions, so the page no longer says to scroll there.
    expect(text(options[1])).not.toMatch(/scroll/i);
    // "Custom GPT" is gone: free ChatGPT cannot create one.
    expect(text(item)).not.toMatch(/custom GPT/i);
  });

  it('links the design systems page in the layers table', () => {
    const a = doc.querySelector('table.layers tbody tr td a')!;
    expect(text(a)).toBe('design systems');
    expect(a.getAttribute('href')).toBe('https://claude.ai/settings/design-systems');
    expect(text(a.closest('td'))).toBe('A design system in Claude Design, built once from a Claude chat and kept in your design systems');
  });

  it('builds the brand from a chat: item 1 brings the prompt that asks for a design system', () => {
    const item = all(doc, '.checklist > li')[0]!;
    expect(text(item.querySelector('label')).trim()).toBe('Set up your brand in Claude Design.');
    const stack = item.querySelector('.check-detail.stack')!;
    const parts = Array.from(stack.children);
    // What to do, the prompt, then what to check.
    expect(parts.map((el) => el.tagName + (el.className ? `.${el.className}` : ''))).toEqual(['P', 'DIV.prompt', 'P']);
    expect(text(parts[0])).toBe(
      "Tap Copy & open Claude below, paste the prompt into the new chat, and put in your brokerage name. Know your brand colors or fonts? Add them at the end. Don't know them? Skip it. Then attach your logo, your headshot, and screenshots of two or three posts you love, and send it.",
    );
    // Paste before attaching: a screenshot through the clipboard would replace the prompt.
    expect(text(parts[0]).indexOf('paste the prompt')).toBeLessThan(text(parts[0]).indexOf('attach'));
    const block = parts[1]!;
    expect(block.id).toBe('carousel-creator-brand-prompt');
    expect(text(block.querySelector('h4'))).toBe('Brand prompt');
    expect(all(block, '.actions > *').map(text)).toEqual(['Copy prompt', 'Copy & open Claude']);
    const prompt = text(block.querySelector('pre[data-prompt-text]'));
    // It asks for a SAVED system, by name, and fills the gaps an agent without a style guide has.
    expect(prompt).toMatch(/^Build a reusable design system/);
    expect(prompt).toContain('Name it My Carousel Brand.');
    expect(prompt).toContain('pick a simple palette and font pairing');
    expect(prompt).toContain('If I list brand colors or fonts at the end of this message, use them exactly.');
    expect(prompt).toContain('4:5 (1080 x 1350)');
    expect(all(block, 'mark').map(text)).toEqual(['[brokerage name]']);
    const check = parts[2]!;
    expect(check.querySelector('a.action')?.getAttribute('href')).toBe('https://claude.ai/settings/design-systems');
    expect(text(check.querySelector('a.action'))).toBe('See my design systems');
    expect(text(check)).toContain('It should be listed as My Carousel Brand.');
    expect(text(check)).toContain('Not listed? In the same chat, say: Save this as a design system called My Carousel Brand.');
    expect(text(check)).toContain('turn on Cloud code execution and file creation in Settings, then Capabilities.');
    const caps = check.querySelector('a:not(.action)')!;
    expect([text(caps), caps.getAttribute('href')]).toEqual(['Settings, then Capabilities', 'https://claude.ai/settings/capabilities']);
    // The standalone app's toggle and link are gone: neither applies to a brand built in a chat.
    expect(text(item)).not.toMatch(/Published/);
    expect(item.querySelector('a[href="https://claude.ai/design"]')).toBeNull();
  });

  it('puts Send this to my laptop right after Step 2’s intro, as a mailto: without JavaScript', () => {
    const send = doc.querySelector('#carousel-creator .lede')!.nextElementSibling!;
    const a = send.querySelector('a[data-share]')!;
    expect(text(a)).toBe('Send this to my laptop');
    expect(a.getAttribute('href')).toBe(
      'mailto:?subject=AI%20101%20Carousel%20Creator%20setup&body=https%3A%2F%2Fwww.amplifiedimpact.io%2Fai101%23carousel-creator',
    );
  });

  it('has the four checklist items, the chips under the last, and the hint hidden until the script runs', () => {
    expect(all(doc, '.checklist > li label').map((l) => text(l).trim())).toEqual([
      'Set up your brand in Claude Design.',
      'Fill in About you below and paste in your voice profile from Step 1.',
      'Copy the instructions and make the Project.',
      'Start a new chat in the Project and send one idea.',
    ]);
    const last = all(doc, '.checklist > li').slice(-1)[0]!;
    expect(all(last, 'button[data-copy-chip]').map(text)).toEqual([
      'A buyer asked if they should wait for rates to drop.',
      `Here's a market stat I want to explain:`,
      'A lesson from my week:',
      'My take on this industry news:',
    ]);
    const hint = last.querySelector('.hint')!;
    expect(text(hint)).toBe('Tap one to copy it, paste it into the Project chat, and finish the thought.');
    expect(hint.hasAttribute('hidden')).toBe(true);
  });

  it('puts About you directly above the instructions, hidden until the script can make it work', () => {
    const about = doc.querySelector('[data-about]')!;
    expect(about.hasAttribute('hidden')).toBe(true);
    expect(about.nextElementSibling?.id).toBe('carousel-creator-prompt');
    const fields = all(about, '[data-about-field]');
    expect(fields.map((f) => [f.tagName, f.getAttribute('data-about-field'), f.getAttribute('placeholder')])).toEqual([
      ['INPUT', 'niche', 'e.g., first-time buyers, relocation, luxury'],
      ['INPUT', 'neighborhoods', 'e.g., the three or four areas you sell most'],
      ['TEXTAREA', 'questions', 'One per line'],
      ['INPUT', 'brokerage', null],
      ['TEXTAREA', 'voice', 'Paste the profile that starts with "Write as me."'],
    ]);
    expect(fields.map((f) => f.getAttribute('rows'))).toEqual([null, null, '3', null, '6']);
    // Optional, every one, and each labelled.
    for (const f of fields) {
      expect(f.hasAttribute('required')).toBe(false);
      expect(text(doc.querySelector(`label[for="${f.id}"]`)).length).toBeGreaterThan(0);
    }
    expect(text(about.querySelector('[data-about-clear]'))).toBe('Clear');
    // It says what it does, and the instructions it fills in really are below it.
    expect(text(about.querySelector('p.hint'))).toBe(
      'What you type here fills in the instructions below, ready to copy. It stays on this device. All fields are optional.',
    );
  });

  it('marks every button that opens ChatGPT or Claude with that app’s logo, and no other link', () => {
    const marked = (a: Element) => a.querySelector('svg.logo use')?.getAttribute('href') ?? null;
    const buttons = all(doc, 'a.action');
    const byLogo = buttons.map((a) => [text(a), marked(a)]);
    expect(byLogo).toEqual([
      ['Get ChatGPT', '#ai101-logo-chatgpt'],
      ['Get Claude', '#ai101-logo-claude'],
      ['Open Claude Projects', '#ai101-logo-claude'],
      ['Open ChatGPT settings', '#ai101-logo-chatgpt'],
      ['Copy & open ChatGPT', '#ai101-logo-chatgpt'],
      ['Copy & open Claude', '#ai101-logo-claude'],
      ['Send this to my laptop', null],
      ['Copy & open Claude', '#ai101-logo-claude'],
      ['See my design systems', '#ai101-logo-claude'],
      ['Copy & open Claude Projects', '#ai101-logo-claude'],
      ['Apple or Outlook', null],
      ['Google Calendar', null],
    ]);
    // The text link in the layers table stays a plain link.
    expect(doc.querySelector('table.layers a svg')).toBeNull();
    for (const svg of all(doc, 'svg.logo')) {
      // Decoration: the button's words already name the app.
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.getAttribute('fill')).toBe('currentColor');
    }
    // Copy & open's logo sits outside the label the script swaps for "Copied".
    for (const a of all(doc, 'a[data-copy-open]')) {
      expect(a.querySelector('[data-copy-label] svg')).toBeNull();
      expect(a.firstElementChild?.matches('svg.logo')).toBe(true);
    }
  });

  it('defines each logo once, in a sprite outside <main> that takes no space', () => {
    const sprite = doc.querySelector('svg.logo-sprite')!;
    expect(sprite.parentElement).toBe(doc.body);
    expect(sprite.nextElementSibling?.tagName).toBe('MAIN');
    expect([sprite.getAttribute('width'), sprite.getAttribute('height'), sprite.getAttribute('aria-hidden')]).toEqual(['0', '0', 'true']);
    expect(all(sprite, 'symbol').map((s) => [s.id, s.getAttribute('viewBox')])).toEqual([
      ['ai101-logo-chatgpt', '0 0 24 24'],
      ['ai101-logo-claude', '0 0 24 24'],
    ]);
    for (const s of all(sprite, 'symbol')) expect(s.querySelectorAll('path')).toHaveLength(1);
    for (const [name, d] of Object.entries(LOGOS)) {
      expect(d.length).toBeGreaterThan(1000);
      expect(doc.querySelector(`#ai101-logo-${name} path`)?.getAttribute('d')).toBe(d);
    }
    // And not swapped: the OpenAI mark's path opens with its own first point, Claude's with its own.
    expect(LOGOS.chatgpt.startsWith('M22.2819 9.8211')).toBe(true);
    expect(LOGOS.claude.startsWith('m4.7144 15.9555')).toBe(true);
    // Every <use> points at a symbol that is there.
    for (const use of all(doc, 'svg.logo use')) {
      expect(doc.getElementById(use.getAttribute('href')!.slice(1))?.tagName.toLowerCase()).toBe('symbol');
    }
  });

  it('adds the sprint’s calendar links after its last line: the .ics in this tab, Google in a new one', () => {
    const cal = doc.querySelector('#sprint .calendar')!;
    expect(text(cal.previousElementSibling)).toBe('Track conversations started, not likes.');
    expect(text(cal.querySelector('p'))).toBe('Add the sprint to your calendar:');
    const [apple, google] = all(cal, 'a');
    expect([text(apple), apple!.getAttribute('href')]).toEqual(['Apple or Outlook', '/ai101/carousel-sprint.ics']);
    // No `download`, so iOS offers "Add to Calendar" instead of saving a file.
    expect(apple!.hasAttribute('download')).toBe(false);
    expect(apple!.hasAttribute('target')).toBe(false);
    expect(text(google)).toBe('Google Calendar');
  });

  it('keeps every anchor the page had, for the QR codes and slides that point at them', () => {
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
    const ids = all(doc, '[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no em dash anywhere in the page copy', () => {
    const strings = [...copyStrings(PAGE), ...copyStrings(UI)].filter((s) => typeof s === 'string');
    expect(strings.filter((s) => s.includes('—'))).toEqual([]);
    expect(doc.body.textContent).not.toContain('—');
  });
});
