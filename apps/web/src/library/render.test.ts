import { GROK_COLLECTIONS, GROK_TEMPLATES, isFreeGrokTemplate } from '@ai/core/grok-templates';
import { isFreeSkill, SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../guides/content';
import { ENTRIES, LIBRARY, TOOLS, TOPICS } from './content';
import { countLabel } from './main';
import { renderLibraryBody, renderLibraryHead } from './render';

// /library's markup contract (D-050), on the parsed DOM. What the script does with it is
// `main.test.ts`'s; that the API serves it is `apps/api/test/library.test.ts`'s.

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderLibraryHead()}</head><body>${renderLibraryBody()}</body></html>`,
  'text/html',
);
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

/** The API's list of guides, read from its source: this app does not import the API's code. */
const GUIDE_SLUGS = [
  ...(/GUIDE_SLUGS = \[([^\]]+)\]/.exec(read('../../../api/src/routes/guide-list.ts'))?.[1] ?? '').matchAll(
    /'([^']+)'/g,
  ),
].map((m) => m[1]!);

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe('The Free Library · Amplified Impact');
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/library');
    expect($('meta[name="description"]')?.getAttribute('content')).toBe(LIBRARY.meta.description);
  });
});

describe('the catalog', () => {
  it('lists every guide the API serves, so a new one cannot ship missing from the library', () => {
    expect(GUIDE_SLUGS.length).toBeGreaterThan(0);
    const hrefs = ENTRIES.map((e) => e.href);
    for (const slug of GUIDE_SLUGS) expect(hrefs, slug).toContain(`/${slug}`);
  });

  it('links only to pages that exist: a guide, or /ai101', () => {
    const real = new Set([...GUIDE_SLUGS.map((s) => `/${s}`), '/ai101']);
    for (const e of ENTRIES) if (e.href !== null) expect(real.has(e.href), e.title).toBe(true);
  });

  it('gives every entry a kind, a tool, a topic, keywords and a real date, and no title twice', () => {
    for (const e of ENTRIES) {
      expect(e.keywords, e.title).not.toBe('');
      expect(e.kind, e.title).not.toBe('');
      expect(e.tools.length, e.title).toBeGreaterThan(0);
      expect(e.topics.length, e.title).toBeGreaterThan(0);
      expect(e.added, e.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(e.added)), e.title).toBe(false);
    }
    expect(new Set(ENTRIES.map((e) => e.title)).size).toBe(ENTRIES.length);
  });
});

describe('with no script', () => {
  // The main list holds everything that is not on the Grok Bot shelf (D-100).
  const MAIN = ENTRIES.filter((e) => e.collection === undefined);

  it('shows every card, newest first, each a real link', () => {
    const titles = $$('#library-items .item-title').map((t) => text(t));
    const live = MAIN.filter((e) => e.href !== null);
    const soon = MAIN.filter((e) => e.href === null);
    const newest = [...live].sort((a, b) => b.added.localeCompare(a.added)).map((e) => e.title);
    // A card that cannot be opened is never the first thing a visitor sees.
    expect(titles).toEqual([...newest, ...soon.map((e) => e.title)]);
    expect($$('#library-items a.item-body').length).toBe(MAIN.filter((e) => e.href !== null).length);
    expect($$('#library-items [hidden], [data-shelf] [hidden]')).toEqual([]);
    // The count is of every card, the main list's and the shelf's.
    expect($$('[data-item]')).toHaveLength(ENTRIES.length);
    expect(text($('#library-count'))).toBe(`Showing ${ENTRIES.length} resources`);
  });

  it('hides the controls, which would do nothing, and the empty line', () => {
    const controls = $('.controls') as HTMLElement;
    expect(controls.hidden).toBe(true);
    expect(controls.hasAttribute('data-js-only')).toBe(true);
    expect(($('#library-empty') as HTMLElement).hidden).toBe(true);
    const sorter = $('.sorter') as HTMLElement;
    expect(sorter.hidden).toBe(true);
    expect(sorter.hasAttribute('data-js-only')).toBe(true);
  });
});

describe('a card', () => {
  it('links its page in this tab, with its kind, its tools, its title and its words', () => {
    const entry = ENTRIES.find((e) => e.href === '/reel-editor')!;
    const link = $('a.item-body[href="/reel-editor"]')!;
    expect(link.hasAttribute('target')).toBe(false);
    expect(text(link.querySelector('.item-title'))).toBe('Reel Editor');
    expect(text(link.querySelector('.item-desc'))).toBe(entry.description);
    // The Reel Editor is paid, so its card says where it is now (D-082).
    expect(Array.from(link.querySelectorAll('.item-tags li')).map((li) => text(li))).toEqual(['Claude Skill', 'In the Amplified Skill Library']);
    const item = link.closest('[data-item]')!;
    expect(item.getAttribute('data-tools')).toBe('claude');
    expect(item.getAttribute('data-topics')).toBe('skills content');
    expect(item.getAttribute('data-added')).toBe('2026-10-20');
  });

  it('says "Coming soon" and links nowhere when its page is not up yet', () => {
    const soon = ENTRIES.filter((e) => e.href === null);
    expect($$('.item-soon')).toHaveLength(soon.length);
    for (const el of $$('.item-soon')) {
      expect(el.querySelector('a')).toBeNull();
      expect(text(el.querySelector('.item-soon-tag'))).toBe('Coming soon');
    }
  });

  it('says "In the Amplified Skill Library" on every paid skill’s and template’s card, and on no other (D-082, D-100)', () => {
    // Paid is the catalog's call, read through the skill a page names (the ZIP's name, not always the
    // slug), or the Grok Bot template, by its own free list.
    const paidSkill = (href: string | null) => {
      const skill = href === null ? undefined : GUIDES[href.slice(1)]?.skill;
      return skill !== undefined && !isFreeSkill(skill);
    };
    const paidTemplate = (href: string | null) => {
      const grok = href === null ? undefined : GUIDES[href.slice(1)]?.grok;
      return grok !== undefined && !isFreeGrokTemplate(grok);
    };
    const tagged = (href: string) =>
      Array.from(doc.querySelectorAll(`a.item-body[href="${href}"] .item-tags li`)).map((li) => text(li)).includes('In the Amplified Skill Library');
    for (const e of ENTRIES) if (e.href !== null) expect(tagged(e.href), e.title).toBe(paidSkill(e.href) || paidTemplate(e.href));
    // One card for each paid skill in the catalog: every one is labelled, under whichever slug.
    expect(ENTRIES.filter((e) => paidSkill(e.href))).toHaveLength(SKILL_CATALOG.filter((s) => !isFreeSkill(s.id)).length);
    expect(ENTRIES.filter((e) => paidTemplate(e.href))).toHaveLength(GROK_TEMPLATES.filter((g) => !isFreeGrokTemplate(g.id)).length);
    expect(tagged('/content-strategist')).toBe(!isFreeSkill('content-opportunity-research'));
    expect(tagged('/appointment-follow-up')).toBe(!isFreeSkill('appointment-follow-up'));
    expect(LIBRARY.paid).toBe('In the Amplified Skill Library');
  });

  it('names its tools when its kind does not already', () => {
    const tags = $('a.item-body[href="/ops-time-audit"] .item-tags');
    expect(Array.from(tags?.querySelectorAll('li') ?? []).map((li) => text(li))).toEqual(['Guide', 'Claude']);
  });

  it('puts the title first in the markup, so a screen reader names the link by it', () => {
    const link = $('a.item-body[href="/retool"]')!;
    expect(link.firstElementChild?.classList.contains('item-title')).toBe(true);
  });

  it('hides its arrow from a screen reader', () => {
    expect($$('.item-arrow')).toHaveLength(ENTRIES.filter((e) => e.href !== null).length);
    for (const arrow of $$('.item-arrow')) expect(arrow.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('the Grok Bot shelf (D-100)', () => {
  const shelf = $('[data-shelf]');
  const cardTitles = (root: Element | null) => Array.from(root?.querySelectorAll('.item-title') ?? []).map((t) => text(t));

  it('comes after the main list: one section, its heading, its line, and its two collections in order', () => {
    expect(shelf?.tagName).toBe('SECTION');
    expect(shelf?.previousElementSibling?.id).toBe('library-items');
    expect(text(shelf?.querySelector('h2'))).toBe('Grok Bot');
    expect(shelf?.getAttribute('aria-labelledby')).toBe('shelf-grok');
    expect(text(shelf?.querySelector('.shelf-body'))).toBe(LIBRARY.grok.body);
    const collections = Array.from(shelf?.querySelectorAll('[data-collection]') ?? []);
    expect(collections.map((c) => c.getAttribute('data-collection'))).toEqual([...GROK_COLLECTIONS]);
    expect(collections.map((c) => text(c.querySelector('h3')))).toEqual(['Bookkeeping', 'Transactions']);
  });

  it('holds every template, each under its own collection, in the catalog’s order, and nothing else', () => {
    for (const c of GROK_COLLECTIONS) {
      const list = $(`[data-collection="${c}"] ul.items`);
      expect(cardTitles(list), c).toEqual(GROK_TEMPLATES.filter((g) => g.collection === c).map((g) => g.title));
      expect(cardTitles(list), c).toHaveLength(8);
    }
    expect(cardTitles(shelf)).toHaveLength(16);
    // No template in the main list, and no skill or guide on the shelf.
    const grokTitles = new Set(GROK_TEMPLATES.map((g) => g.title));
    expect(cardTitles($('#library-items')).filter((t) => grokTitles.has(t))).toEqual([]);
    for (const e of ENTRIES) expect(e.collection !== undefined, e.title).toBe(grokTitles.has(e.title));
  });

  it('says Grok Bot on each card, never Claude, with its title a heading under its collection’s', () => {
    for (const el of Array.from(shelf?.querySelectorAll('[data-item]') ?? [])) {
      const tags = Array.from(el.querySelectorAll('.item-tags li')).map((li) => text(li));
      expect(tags[0]).toBe('Grok Bot');
      expect(tags).not.toContain('Claude');
      expect(tags).not.toContain('Claude Skill');
      expect(el.getAttribute('data-tools')).toBe('grok');
      expect(el.querySelector('.item-title')?.tagName).toBe('H4');
    }
    const trust = $('a.item-body[href="/trust-earnest-watch"]');
    expect(Array.from(trust?.querySelectorAll('.item-tags li') ?? []).map((li) => text(li))).toEqual(['Grok Bot', 'For Brokers', 'In the Amplified Skill Library']);
  });

  it('tells a template’s reader to add it to Grok Bot, never the skills’ Claude closer', () => {
    for (const e of ENTRIES.filter((x) => x.collection !== undefined)) {
      expect(e.description, e.title).toMatch(/Download the template, add it to Grok Bot and save the routine it recommends\.$/);
      expect(e.description, e.title).not.toContain('in Claude or a ChatGPT Project');
      expect(e.kind, e.title).toBe('Grok Bot');
      expect(e.topics[0], e.title).toBe(e.collection);
    }
  });
});

describe('the controls', () => {
  const chips = (name: string) => $$(`button[data-filter="${name}"]`);

  it('offers a pill for each tool and topic in use, in order, after All, with All pressed', () => {
    expect(chips('tool').map((b) => text(b))).toEqual(['All', 'Claude', 'ChatGPT', 'Grok Bot']);
    expect(chips('topic').map((b) => text(b))).toEqual([
      'All',
      'Claude Skills',
      'Setup',
      'Copy and Paste Prompts',
      'Content',
      'Team Ops',
      'Buyer Side',
      'Listing Side',
      'Contracts and Offers',
      'Bookkeeping',
      'Transactions',
    ]);
    for (const name of ['tool', 'topic']) {
      expect(chips(name).map((b) => b.getAttribute('aria-pressed'))[0]).toBe('true');
      expect(chips(name).filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
      expect(chips(name)[0]!.getAttribute('data-value')).toBe('');
    }
  });

  it('shows no pill nothing uses', () => {
    const usedTools = new Set(ENTRIES.flatMap((e) => e.tools));
    const usedTopics = new Set(ENTRIES.flatMap((e) => e.topics));
    expect(
      chips('tool')
        .slice(1)
        .map((b) => b.getAttribute('data-value')),
    ).toEqual(Object.keys(TOOLS).filter((k) => usedTools.has(k as keyof typeof TOOLS)));
    expect(
      chips('topic')
        .slice(1)
        .map((b) => b.getAttribute('data-value')),
    ).toEqual(Object.keys(TOPICS).filter((k) => usedTopics.has(k as keyof typeof TOPICS)));
  });

  it('labels each group, the search and the sort', () => {
    expect($$('.filter[role="group"]')).toHaveLength(2);
    for (const group of $$('.filter[role="group"]')) {
      expect($(`#${group.getAttribute('aria-labelledby')}`)).not.toBeNull();
    }
    expect(text($('label[for="library-search"]'))).toBe('Search');
    expect(text($('label[for="library-sort"]'))).toBe('Sort by');
    expect(Array.from(($('#library-sort') as HTMLSelectElement).options).map((o) => [o.value, o.textContent])).toEqual([
      ['newest', 'Newest first'],
      ['oldest', 'Oldest first'],
    ]);
  });

  it('agrees with the script on how the count reads', () => {
    for (const n of [0, 1, 2, 7]) expect(countLabel(n)).toBe(LIBRARY.count(n));
  });
});

describe('the page', () => {
  it('has one h1, and a heading under it for the list', () => {
    expect($$('h1').map((h) => text(h))).toEqual(['Put AI to work on your team.']);
    expect(text($('h2'))).toBe('Everything in the library');
  });

  it('follows the house rule: no em dashes', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(text($('title'))).not.toContain('—');
  });

  it('uses no id twice', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('escapes what it draws: an apostrophe in a title stays one character', () => {
    expect(text($('a.item-body[href="/retool"] .item-title'))).toBe("Retool, Don't Replace");
    expect(renderLibraryBody()).toContain('Retool, Don&#39;t Replace');
  });

  it('asks for nothing: no form, no email, no field that posts', () => {
    expect($$('form')).toEqual([]);
    expect($$('input[type="email"]')).toEqual([]);
  });

  it("carries the guides' footer, with the Terms and the Privacy Policy", () => {
    expect($$('.foot-links a').map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy']);
  });
});

describe('the stylesheet and the shell', () => {
  it('lets `hidden` win, so the controls stay away until the script shows them', () => {
    expect(read('./library.css')).toMatch(/\[hidden\] \{\s*display: none !important;/);
  });

  it('fills its own markers and runs its own script', () => {
    const shell = read('../../library.html');
    expect(shell).toContain('<!--library:head-->');
    expect(shell).toContain('<!--library:body-->');
    expect(shell).toContain('href="/src/library/library.css"');
    expect(shell).toContain('src="/src/library/main.ts"');
  });
});
