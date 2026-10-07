import { afterEach, describe, expect, it, vi } from 'vitest';
import { ICONS } from '@ai/core';
import { PAGE, UI } from './content';
import type * as Content from './content';
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
const NOT_COPY = new Set(['id', 'anchor', 'target', 'url']);

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
    // The sub-blocks are h3s: both prompt labels, "Setup checklist" and "How a week works".
    expect(all(doc, 'h3').map(text)).toEqual([
      PAGE.voiceProfile.prompt.label,
      PAGE.carouselCreator.checklistHeading,
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
      const h3 = block.querySelector('h3')!;
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
    const labels = all(doc.body, '[aria-label]').map((el) => el.getAttribute('aria-label'));
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
      expect(all(tr, 'th, td').map(text)).toEqual([...rows[i]!]);
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
    const items = all(list, 'li');
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
      expect(text(li).trim()).toBe(item.text);
    });
  });

  it('renders the numbered lists as <ol> and the sprint weeks as a <ul>', () => {
    const lists = all(doc, 'ol.steps').map((ol) => all(ol, 'li').map(text));
    expect(lists).toEqual([[...PAGE.voiceProfile.steps], [...PAGE.carouselCreator.week], [...PAGE.ownership.items]]);
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
    const labels = all(doc.body, '[aria-label]').map((el) => el.getAttribute('aria-label'));
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
