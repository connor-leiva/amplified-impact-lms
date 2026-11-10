import { isFreeSkill, PAID_DOWNLOADS, SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { GUIDES, inSkillLibrary, SHARED, type Guide } from './content';
import { renderGuideBody, renderGuideHead } from './render';

// The skill pages after the launch (D-080, D-082), as they ship: no mocks. A paid skill's page keeps
// its hero and its sample, and shows the Skill Library card in place of the sign-up and the setup,
// with no link to any paid ZIP and no opt-in form. A free skill's page keeps its sign-up and its
// downloads. Which is which is the catalog's call (`FREE_SKILLS`), so nothing here names a skill: the
// day Connor adds his picks, these tests follow.

const parse = (guide: Guide) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderGuideHead(guide)}</head><body>${renderGuideBody(guide)}</body></html>`,
    'text/html',
  );
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const PAGES = Object.values(GUIDES).filter((g) => g.skill !== undefined);
const PAID = PAGES.filter((g) => !isFreeSkill(g.skill ?? ''));
const FREE = PAGES.filter((g) => isFreeSkill(g.skill ?? ''));
const entryFor = (g: Guide) => SKILL_CATALOG.find((s) => s.id === g.skill);

describe('the catalog and the pages', () => {
  it('gives every skill in the catalog one page, and every skill page a skill in the catalog', () => {
    expect(PAGES.map((g) => g.skill).sort()).toEqual(SKILL_CATALOG.map((s) => s.id).sort());
  });

  it('names each page’s skill by its ZIP, which is not always the slug', () => {
    for (const g of PAGES) expect(g.download.href, g.slug).toBe(`/downloads/${entryFor(g)?.files.claude}`);
    expect(GUIDES['content-strategist']?.skill).toBe('content-opportunity-research');
  });

  it('draws a page as paid exactly when the catalog says its skill is not free', () => {
    expect(PAID.length).toBeGreaterThan(0);
    expect(FREE.length).toBeGreaterThan(0);
    for (const g of Object.values(GUIDES)) expect(inSkillLibrary(g), g.slug).toBe(PAID.includes(g));
    // A guide that is not a skill (a PDF) is never in the Skill Library.
    expect(inSkillLibrary(GUIDES['ops-time-audit'] as Guide)).toBe(false);
  });
});

describe.each(PAID.map((g) => [g.slug, g] as const))('paid /%s (D-082)', (slug, guide) => {
  const doc = parse(guide);
  const html = doc.documentElement.outerHTML;
  const card = doc.getElementById(SHARED.skillLibrary.anchor);
  const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));

  it('keeps the hero: its title, eyebrow and lede', () => {
    // Raw text, not `text()`: an eyebrow may hold a non-breaking space, which `\s` would turn into a space.
    expect($$('h1').map((h) => h.textContent)).toEqual([guide.hero.title]);
    expect(doc.querySelector('.eyebrow')?.textContent).toBe(guide.hero.eyebrow);
    expect(doc.querySelector('.sk-lede, .lede')?.textContent).toBe(guide.hero.lede);
  });

  it('keeps the sample as the preview, or the before and after where the page has no sample', () => {
    const sample = guide.sections.find((s) => s.kind === 'sample');
    if (sample?.kind === 'sample') {
      expect(text(doc.querySelector('section.sample .sample-title'))).toBe(sample.title);
      expect(doc.querySelectorAll('section.sample .sample-doc > *').length).toBeGreaterThan(1);
    } else {
      expect(doc.querySelectorAll('section.compare video')).toHaveLength(2);
    }
  });

  it('shows the Skill Library card where the sign-up was, first after the hero’s words', () => {
    expect(card?.tagName).toBe('SECTION');
    expect(card?.className).toBe('card optin');
    expect(card?.hasAttribute('data-skill-library')).toBe(true);
    if (guide.layout === 'skill') {
      expect([...(doc.querySelector('.sk-hero')?.children ?? [])].indexOf(card as Element)).toBe(1);
    } else {
      expect(doc.querySelector('main.page')?.firstElementChild).toBe(card);
    }
    expect(text(doc.getElementById(card?.getAttribute('aria-labelledby') ?? ''))).toBe('In the Skill Library');
    expect(text(card?.querySelector('h2 + p'))).toBe('This skill is part of the Skill Library in the Amplified Impact platform.');
    const links = Array.from(card?.querySelectorAll('a') ?? []).map((a) => [text(a), a.getAttribute('href'), a.hasAttribute('target')]);
    expect(links).toEqual([
      ['See Plans', '/offer#plans', false],
      ['Sign In', 'https://learn.amplifiedimpact.io/skill-library', false],
    ]);
    expect(card?.querySelector('a.btn.btn-primary')?.getAttribute('href')).toBe('/offer#plans');
  });

  it('links no paid ZIP, and no download at all: no setup, no file to save', () => {
    for (const file of PAID_DOWNLOADS) expect(html, file).not.toContain(`/downloads/${file}`);
    expect($$('a[href^="/downloads/"], a[download], [data-download], #download, .setup, [data-guided], .handoff')).toEqual([]);
  });

  it('has no opt-in form: nothing posts to its sign-up route', () => {
    expect($$('form, input, button[type="submit"], [data-unlock-key]')).toEqual([]);
    expect(html).not.toContain(`/api/${slug}`);
  });

  it('sends the buttons lower on the page to the plans, never back up to a sign-up', () => {
    expect($$('a[href^="#get-"], a[href="#download"]')).toEqual([]);
    const lower = $$('main a.btn').filter((a) => !card?.contains(a));
    expect(lower.length, 'a page with a "What you need" button').toBe(guide.sections.filter((s) => s.kind === 'tiles' && s.cta).length);
    for (const a of lower) expect([text(a), a.getAttribute('href')]).toEqual(['See Plans', '/offer#plans']);
    expect(doc.querySelector('[data-sk-bar]')).toBeNull();
    expect(doc.body.textContent).not.toMatch(/Get the (Free )?Skill/);
  });

  it('uses no id twice', () => {
    const ids = $$('[id]').map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(FREE.map((g) => [g.slug, g] as const))('free /%s', (slug, guide) => {
  const doc = parse(guide);
  const saved = Array.from(doc.querySelectorAll('a[download]')).map((a) => a.getAttribute('href'));

  it('still offers every file of its skill, each saved under its own name', () => {
    const files = Object.values(entryFor(guide)?.files ?? {});
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(saved, file).toContain(`/downloads/${file}`);
    for (const file of PAID_DOWNLOADS) expect(saved).not.toContain(`/downloads/${file}`);
  });

  it('still has its sign-up, and no Skill Library card', () => {
    expect(doc.querySelector('#guide-form')?.getAttribute('action')).toBe(`/api/${slug}`);
    expect(doc.querySelector('[data-skill-library]')).toBeNull();
    expect(doc.querySelector('[data-unlock-key]')?.id).toBe('get-the-skill');
  });
});

describe('the card’s words', () => {
  const l = SHARED.skillLibrary;
  const words = [l.heading, l.body, l.plans.label, l.signIn.lead, l.signIn.label];

  it('follow the house rules: no em dashes, no exclamation marks, no slop words', () => {
    for (const w of words) {
      expect(w).not.toMatch(/[–—!]/);
      expect(w).not.toMatch(/\b(unlock|seamless|simply)\b/i);
    }
  });

  it('give the buttons Title Case labels, and the sentence a full stop', () => {
    expect([l.plans.label, l.signIn.label]).toEqual(['See Plans', 'Sign In']);
    expect(l.body).toMatch(/^[A-Z][^.]*\.$/);
  });
});
