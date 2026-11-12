import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFreeBody } from '../free/render';
import { GUIDES, type Guide } from '../guides/content';
import { renderGuideBody, renderGuideHead } from '../guides/render';
import { ENTRIES, LEAD, leadFor, type Entry } from './content';
import { renderLibraryBody } from './render';

// WHERE THE LEAD SHOWS (`LEAD` in `content.ts`): every card, skill page and Grok Bot template page says
// it first, above any setup, which sits under "Set it up" (Spring, via Connor, 2026-11-12). Its look is
// the pages' existing tokens, at 16px or more. The copy's own rules are `lead-copy.test.ts`'s.

const parse = (body: string, head = '') =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** Whether `a` comes before `b` in the document. */
const before = (a: Element | null | undefined, b: Element | null | undefined) =>
  !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

describe('the Library’s cards (/library)', () => {
  const doc = parse(renderLibraryBody());

  it('puts the lead on every card first, under its title and tags, before what it is and how to set it up', () => {
    const cards = [...doc.querySelectorAll('li[data-item]')];
    expect(cards).toHaveLength(ENTRIES.length);
    for (const card of cards) {
      const title = text(card.querySelector('.item-title'));
      const e = ENTRIES.find((x) => x.title === title) as Entry;
      expect(text(card.querySelector('.item-problem')), title).toBe(e.problem);
      expect(text(card.querySelector('.item-outcome')), title).toBe(e.outcome);
      expect(text(card.querySelector('.item-for')), title).toBe(`${LEAD.forRole}: ${e.forRole}`);
      expect(before(card.querySelector('.item-lead'), card.querySelector('.item-desc')), title).toBe(true);
      // The description is kept, word for word, after the lead.
      expect(text(card.querySelector('.item-desc')), title).toBe(e.description);
    }
  });

  it('puts the lead first on the free five, before each one’s description', () => {
    const cards = [...doc.querySelectorAll('.free-card')];
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      const e = ENTRIES.find((x) => x.title === text(card.querySelector('.free-title'))) as Entry;
      expect(text(card.querySelector('.free-problem'))).toBe(e.problem);
      expect(text(card.querySelector('.free-outcome'))).toBe(e.outcome);
      expect(before(card.querySelector('.free-lead'), card.querySelector('.free-desc'))).toBe(true);
    }
  });
});

describe('Free Resources (/free)', () => {
  const doc = parse(renderFreeBody({ examples: false }));

  it('puts each resource’s lead first, before its description', () => {
    const cards = [...doc.querySelectorAll('.fr-card, .own-step')].filter((c) => c.querySelector('.fr-text, .own-text'));
    const withLead = cards.filter((c) => c.querySelector('.fr-lead, .own-lead'));
    // Every resource from the Library; the AI 101 sign-up on Spring's site is not a Library card.
    expect(withLead).toHaveLength(5);
    for (const card of withLead) {
      const e = ENTRIES.find((x) => x.title === text(card.querySelector('.fr-name, .own-name'))) as Entry;
      expect(text(card.querySelector('.fr-problem, .own-problem'))).toBe(e.problem);
      expect(text(card.querySelector('.fr-outcome, .own-outcome'))).toBe(e.outcome);
      expect(before(card.querySelector('.fr-lead, .own-lead'), card.querySelector('.fr-text, .own-text'))).toBe(true);
    }
  });
});

describe('the skill pages (www)', () => {
  // Every skill's and Grok Bot template's page, free and paid, and the two kits in the same look.
  const PAGES = Object.values(GUIDES).filter((g) => g.layout === 'skill');

  it('covers every skill and template: each page has a Library card, so a lead', () => {
    expect(PAGES.filter((g) => g.skill !== undefined)).toHaveLength(SKILL_CATALOG.length);
    expect(PAGES.filter((g) => g.grok !== undefined)).toHaveLength(GROK_TEMPLATES.length);
    for (const g of PAGES) expect(leadFor(g.slug), g.slug).toBeDefined();
  });

  describe.each(PAGES.map((g) => [g.slug, g] as const))('/%s', (slug, guide: Guide) => {
    const doc = parse(renderGuideBody(guide), renderGuideHead(guide));
    const lead = leadFor(slug)!;

    it('says the lead first, right under the title, in its card’s words', () => {
      const dl = doc.querySelector('.sk-intro > [data-lead]');
      expect(dl?.previousElementSibling?.tagName).toBe('H1');
      expect(dl?.nextElementSibling?.className).toBe('sk-lede');
      expect([...(dl?.querySelectorAll('dt') ?? [])].map(text)).toEqual([LEAD.problem, LEAD.outcome, LEAD.forRole]);
      expect([...(dl?.querySelectorAll('dd') ?? [])].map(text)).toEqual([lead.problem, lead.outcome, lead.forRole]);
    });

    it('renders the lead before the setup, which sits under "Set it up"', () => {
      const dl = doc.querySelector('[data-lead]');
      const steps = [...doc.querySelectorAll('.setup-step')];
      expect(steps.length, 'a skill page has its setup steps').toBeGreaterThan(3);
      for (const step of steps) expect(before(dl, step)).toBe(true);
      const heads = [...doc.querySelectorAll('[data-guided] .guided-title')];
      expect(heads.length).toBeGreaterThan(0);
      for (const h of heads) expect(text(h)).toBe(LEAD.setup);
      // The opt-in or the Skill Library card, which holds the setup, also comes after the lead.
      expect(before(dl, doc.querySelector('.optin'))).toBe(true);
    });
  });

  // The buy or sign-up card never moves down for the lead (design review of PR 93): the lead lives in
  // the words' grid area, so what decides where the card sits is the grid, which these pin.
  describe('the buy or sign-up card stays where it was', () => {
    const css = read('../guides/skills.css');
    const at = css.indexOf('@media (min-width: 960px)');
    const phone = css.slice(0, at);
    const desktop = css.slice(at);
    const areas = (block: string) =>
      (/\.sk-hero \{[^}]*grid-template-areas:([^;]+);/.exec(block)?.[1] ?? '').match(/'[^']+'/g)?.map((row) => row.slice(1, -1).split(/\s+/));

    it('from 960px, is the right column from the very top, beside the title and the lead, never under them', () => {
      expect(areas(desktop)).toEqual([
        ['intro', 'optin'],
        ['sample', 'optin'],
      ]);
      // Pinned to the top of its column, so the lead's length can't move it: at 1280 by 900 its first
      // button sits where it did before the lead (about 248px down on a paid page, 395px on a free one).
      expect(desktop).toMatch(/\.sk \.optin \{\s*position: sticky;\s*top: 24px;\s*align-self: start;\s*\}/);
    });

    it('on a phone, comes right after the title and the lead, before the sample, so it sits no lower than before', () => {
      expect(areas(phone)).toEqual([['intro'], ['optin'], ['sample']]);
      // No later rule moves it back under the sample on a phone.
      expect(css.match(/grid-template-areas:/g)).toHaveLength(2);
    });

    it('keeps the lead in the title’s column, the left one, on every page', () => {
      for (const g of PAGES) {
        const doc = parse(renderGuideBody(g));
        const hero = doc.querySelector('.sk-hero');
        expect(doc.querySelector('[data-lead]')?.closest('.sk-intro')?.parentElement, g.slug).toBe(hero);
        expect([...(hero?.children ?? [])].map((c) => c.className.split(' ')[0]), g.slug).toEqual(['sk-intro', 'card', expect.any(String)]);
      }
    });
  });
});

describe('the lead’s look', () => {
  // Every rule that styles the lead or "Set it up", in each page's own stylesheet.
  const SHEETS = ['./library.css', '../free/free.css', '../guides/skills.css', '../routes/library/SkillLibrary.module.css'];
  const LEAD_RULE = /(-lead|-problem|-outcome|-for|-for-k|\.lead\b|leadProblem|setupLabel|guided-title)/;

  it('sets every line of the lead, and "Set it up", at 16px or more, in tokens only', () => {
    let rules = 0;
    for (const sheet of SHEETS) {
      const css = read(sheet);
      for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!LEAD_RULE.test(selector!)) continue;
        rules++;
        for (const [, px] of body!.matchAll(/font-size:\s*(\d+)px/g)) expect(Number(px), `${sheet} ${selector!.trim()}`).toBeGreaterThanOrEqual(16);
        // Colours from the pages' existing tokens only: no hex, rgb, hsl or named colour.
        for (const [, value] of body!.matchAll(/(?:^|;)\s*(?:color|background(?:-color)?|border(?:-[a-z]+)*)\s*:\s*([^;]+)/g)) {
          expect(value!.replace(/var\(--[a-z0-9-]+\)/g, '').replace(/\b(\d+px|solid|transparent|none|0)\b/g, '').trim(), `${sheet} ${selector!.trim()}`).toBe('');
        }
      }
    }
    expect(rules).toBeGreaterThan(10);
  });

  it('clamps the description under the lead to two lines on /library’s cards, and nowhere else', () => {
    const rule = (css: string, selector: string) => new RegExp(`${selector.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    const library = read('./library.css');
    for (const selector of ['.aiw .item-desc', '.aiw .free-desc']) {
      expect(rule(library, selector), selector).toMatch(/-webkit-line-clamp: 2;[\s\S]*line-clamp: 2;[\s\S]*overflow: hidden;/);
    }
    expect(read('../free/free.css')).not.toMatch(/line-clamp/);
    expect(read('../guides/skills.css')).not.toMatch(/line-clamp/);
  });
});
