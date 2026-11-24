import { GROK_COLLECTIONS, GROK_TEMPLATES, isFreeGrokTemplate } from '@ai/core/grok-templates';
import { isFreeSkill, SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../guides/content';
import { renderGuideBody, renderGuideHead } from '../guides/render';
import { renderHomeBody, renderHomeHead } from '../home/render';
import { ENTRIES, FREE_FIVE, GENERAL_TRACK, GUIDE_WHO, LIBRARY, TOOLS, TOPICS } from './content';
import { countLabel } from './main';
import { access, renderLibraryBody, renderLibraryHead, trackOf, whoOf } from './render';
import { FREE_SKILLS } from '@ai/core/skills';
import { FREE_GROK_TEMPLATES } from '@ai/core/grok-templates';

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

describe('the name (D-103)', () => {
  it('is "The Library" on www: no page calls it the free library, and every skill page’s breadcrumb says so', () => {
    // Most of the library is paid now (D-080, D-082); each free item says so on its own card or page.
    const pages: Array<[string, string]> = [
      ['/library', renderLibraryHead() + renderLibraryBody()],
      ['/', renderHomeHead() + renderHomeBody()],
      ...Object.values(GUIDES).map((g): [string, string] => [`/${g.slug}`, renderGuideHead(g) + renderGuideBody(g)]),
    ];
    for (const [path, html] of pages) expect(html, path).not.toMatch(/free\s+library/i);
    expect(text($('.eyebrow'))).toBe('The Library');
    for (const g of Object.values(GUIDES).filter((guide) => guide.layout === 'skill')) {
      const page = new DOMParser().parseFromString(`<body>${renderGuideBody(g)}</body>`, 'text/html');
      const crumb = page.querySelector('nav[aria-label="Breadcrumb"] a[href="/library"]');
      expect(crumb?.textContent?.trim(), g.slug).toBe('The Library');
    }
  });
});

describe('the head', () => {
  it('names the page and its canonical address', () => {
    expect(text($('title'))).toBe('The Library · Amplified Impact');
    expect($('meta[property="og:title"]')?.getAttribute('content')).toBe('The Library · Amplified Impact');
    expect($('meta[property="og:url"]')?.getAttribute('content')).toBe('https://www.amplifiedimpact.io/library');
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/library');
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
    // The Reel Editor is paid, so its card says Locked, and a lock takes the arrow's place (D-115).
    expect(Array.from(link.querySelectorAll('.item-tags li')).map((li) => text(li))).toEqual(['Claude Skill', 'Locked']);
    expect(link.querySelector('.item-access svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.querySelector('.item-arrow.item-lock svg')).not.toBeNull();
    const item = link.closest('[data-item]')!;
    expect(item.getAttribute('data-tools')).toBe('claude');
    expect(item.getAttribute('data-topics')).toBe('skills content');
    expect([item.getAttribute('data-track'), item.getAttribute('data-who'), item.getAttribute('data-access')]).toEqual(['real-estate', 'agents owners', 'locked']);
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

  it('says Locked on every paid skill’s and template’s card, Free on the free five, and Free Resource on a free guide (D-115)', () => {
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
    const said = (href: string) =>
      text(doc.querySelector(`#library-items a.item-body[href="${href}"] .item-access, [data-shelf] a.item-body[href="${href}"] .item-access`));
    for (const e of ENTRIES) {
      if (e.href === null) continue;
      const want = paidSkill(e.href) || paidTemplate(e.href) ? 'Locked' : FREE_FIVE.includes(e.href.slice(1)) ? 'Free' : 'Free Resource';
      expect(said(e.href), e.title).toBe(want);
      expect(LIBRARY.access[access(e)]).toBe(want);
    }
    // One card for each paid skill in the catalog: every one is locked, under whichever slug.
    expect(ENTRIES.filter((e) => paidSkill(e.href))).toHaveLength(SKILL_CATALOG.filter((s) => !isFreeSkill(s.id)).length);
    expect(ENTRIES.filter((e) => paidTemplate(e.href))).toHaveLength(GROK_TEMPLATES.filter((g) => !isFreeGrokTemplate(g.id)).length);
    expect(said('/content-strategist')).toBe('Locked');
    // Locked now, free before D-115 (the overnight brief: "Lock the rest").
    for (const href of ['/appointment-follow-up', '/database-health-check', '/team-pnl-review', '/card-bank-feed-audit', '/new-contract-intake']) {
      expect(said(href), href).toBe('Locked');
    }
    // Free: the five, and the guides that are lead magnets.
    for (const href of ['/ai-brain-setup', '/voice-profile', '/ai-brain-tuneup', '/perfect-week', '/inbox-meeting-follow-through']) {
      expect(said(href), href).toBe('Free');
    }
    for (const href of ['/ops-time-audit', '/task-sync-starter', '/retool', '/ai101']) expect(said(href), href).toBe('Free Resource');
  });

  it('keeps the free five and the catalog’s free list together: four skills and the voice profile, no template', () => {
    expect(FREE_FIVE).toHaveLength(5);
    const skills = FREE_FIVE.map((slug) => GUIDES[slug]?.skill).filter(Boolean);
    expect([...skills].sort()).toEqual([...FREE_SKILLS].sort());
    expect(GUIDES['voice-profile']?.skill).toBeUndefined();
    expect(FREE_GROK_TEMPLATES).toEqual([]);
  });

  it('names its tools when its kind does not already', () => {
    const tags = $('a.item-body[href="/ops-time-audit"] .item-tags');
    expect(Array.from(tags?.querySelectorAll('li') ?? []).map((li) => text(li))).toEqual(['Guide', 'Claude', 'Free Resource']);
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
    expect(Array.from(trust?.querySelectorAll('.item-tags li') ?? []).map((li) => text(li))).toEqual(['Grok Bot', 'For Brokers', 'Locked']);
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
    // Spring's two (D-115).
    expect(chips('track').map((b) => text(b))).toEqual(['All', 'Real Estate', 'General']);
    expect(chips('who').map((b) => text(b))).toEqual(['All', 'Agents', 'Team Owners']);
    for (const name of ['tool', 'topic', 'track', 'who']) {
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
    expect($$('.filter[role="group"]')).toHaveLength(4);
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
    expect($$('h2').map((h) => text(h)).slice(0, 2)).toEqual(['Start with 5 free skills', 'Everything in the library']);
  });

  it('follows the house rule: no em dashes', () => {
    expect(doc.body.textContent).not.toContain('—');
    expect(text($('title'))).not.toContain('—');
  });

  it('uses no id twice', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ends with the general note: the compliance rules are conservative defaults to calibrate with counsel (D-101)', () => {
    const note = $('main .lb-all p.library-note');
    expect(text(note)).toBe(LIBRARY.note);
    expect(LIBRARY.note).toMatch(/conservative defaults/);
    expect(LIBRARY.note).toMatch(/your own legal counsel\.$/);
    // After every list and the empty line, so a filter never hides it.
    expect(note?.previousElementSibling?.id).toBe('library-empty');
  });

  it('escapes what it draws: an apostrophe in a title stays one character', () => {
    expect(text($('a.item-body[href="/retool"] .item-title'))).toBe("Retool, Don't Replace");
    expect(renderLibraryBody()).toContain('Retool, Don&#39;t Replace');
  });

  it('asks for nothing: no form, no email, no field that posts', () => {
    expect($$('form')).toEqual([]);
    expect($$('input[type="email"]')).toEqual([]);
  });

  it('carries the site’s header with Spring’s nav, The Library marked, and the site’s footer (D-115)', () => {
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
    expect($('main')?.id).toBe('main');
    expect(text($('nav[aria-label="Main"] [aria-current="page"]'))).toBe('The Library');
    expect($('[data-brand-slot]')?.getAttribute('href')).toBe('/');
    expect($$('nav[aria-label="Legal"] a').map((a) => a.getAttribute('href'))).toEqual(['/terms', '/privacy', '/agreement']);
    expect(renderLibraryBody()).not.toContain('admin@');
  });
});

describe('the stylesheet and the shell', () => {
  it('lets `hidden` win, so the controls stay away until the script shows them', () => {
    // The kit's rule, which this page's stylesheet imports first.
    expect(read('./library.css')).toContain("@import '../kit/kit.css';");
    expect(read('../kit/kit.css')).toMatch(/\.aiw \[hidden\] \{\s*display: none !important;/);
  });

  it('fills its own markers and runs its own script', () => {
    const shell = read('../../library.html');
    expect(shell).toContain('<!--library:head-->');
    expect(shell).toContain('<!--library:body-->');
    expect(shell).toContain('href="/src/library/library.css"');
    expect(shell).toContain('src="/src/library/main.ts"');
  });
});

describe('the free five and Spring’s filters (D-115)', () => {
  it('lists the free five first, in Spring’s order, each a link to its page, tagged Free', () => {
    const free = $('#free')!;
    expect(text(free.querySelector('h2'))).toBe('Start with 5 free skills');
    expect(Array.from(free.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(FREE_FIVE.map((slug) => `/${slug}`));
    expect(Array.from(free.querySelectorAll('.free-title')).map(text)).toEqual(FREE_FIVE.map((slug) => ENTRIES.find((e) => e.href === `/${slug}`)!.title));
    for (const tag of Array.from(free.querySelectorAll('.item-access'))) expect(text(tag)).toBe('Free');
    // Before the controls and every list: what "Get 5 Free Skills" lands on.
    const html = renderLibraryBody();
    expect(html.indexOf('id="free"')).toBeLessThan(html.indexOf('id="library-items"'));
  });

  it('puts every card on a track, General only for the free five and the skills Spring names', () => {
    expect(GENERAL_TRACK).toEqual([...FREE_FIVE, 'team-pnl-review', 'l10-meeting-prep']);
    for (const e of ENTRIES.filter((x) => x.href !== null)) {
      expect(trackOf(e), e.title).toBe(GENERAL_TRACK.includes(e.href!.slice(1)) ? 'general' : 'real-estate');
    }
  });

  it('says who each card is for from its catalog set, or the guide’s own', () => {
    const by = (href: string) => [...whoOf(ENTRIES.find((e) => e.href === href)!)];
    expect(by('/offer-strategy')).toEqual(['agents']);
    expect(by('/team-ai-brain')).toEqual(['owners']);
    expect(by('/ai-brain-setup')).toEqual(['agents', 'owners']);
    expect(by('/listing-to-live')).toEqual(['agents']);
    expect(by('/ops-time-audit')).toEqual(['owners']);
    expect(by('/ai101')).toEqual(['agents']);
    for (const slug of Object.keys(GUIDE_WHO)) expect(ENTRIES.some((e) => e.href === `/${slug}`), slug).toBe(true);
  });

  it('never names the retired Skill Library', () => {
    expect(renderLibraryBody() + renderLibraryHead()).not.toMatch(/Amplified Skill Library|In the Skill Library/);
  });
});
