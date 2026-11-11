import { GROK_TEMPLATES, isFreeGrokTemplate, PAID_GROK_DOWNLOADS } from '@ai/core/grok-templates';
import { isFreeSkill, PAID_DOWNLOADS, SETUP_GUIDE_ORIGIN, setupGuideHref, SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { GUIDES, inSkillLibrary, SHARED, unlockFor, type Guide } from './content';
import { renderGuideBody, renderGuideHead } from './render';

// The skill pages after the launch (D-080, D-082, D-101), as they ship: no mocks. A paid skill's page
// keeps its hero and its sample, and shows the Skill Library card in place of the sign-up, with the
// same guided setup under it as the free page, no link to any paid ZIP and no opt-in form: each step's
// file is a button to the Skill Library. A free skill's page keeps its sign-up and its downloads.
// Which is which is the catalog's call (`FREE_SKILLS`), so nothing here names a skill: the day Connor
// adds his picks, these tests follow.

const parse = (guide: Guide) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${renderGuideHead(guide)}</head><body>${renderGuideBody(guide)}</body></html>`,
    'text/html',
  );
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const PAGES = Object.values(GUIDES).filter((g) => g.skill !== undefined);
const PAID = PAGES.filter((g) => !isFreeSkill(g.skill ?? ''));
const FREE = PAGES.filter((g) => isFreeSkill(g.skill ?? ''));
// The paid Grok Bot templates (D-100), by their own free list: their pages are drawn the same way, so
// the page checks below hold them too. The skill-only checks (the catalog, its ZIP names) do not.
const PAID_GROK = Object.values(GUIDES).filter((g) => g.grok !== undefined && !isFreeGrokTemplate(g.grok));
const ALL_PAID_DOWNLOADS = [...PAID_DOWNLOADS, ...PAID_GROK_DOWNLOADS];
const entryFor = (g: Guide) => SKILL_CATALOG.find((s) => s.id === g.skill);

describe('the catalog and the pages', () => {
  it('gives every skill in the catalog one page, and every skill page a skill in the catalog', () => {
    expect(PAGES.map((g) => g.skill).sort()).toEqual(SKILL_CATALOG.map((s) => s.id).sort());
  });

  it('gives every skill and template in the Skill Library a Setup Guide link to its own page (D-101)', () => {
    for (const s of SKILL_CATALOG) {
      const slug = setupGuideHref(s.id).replace(`${SETUP_GUIDE_ORIGIN}/`, '');
      expect(GUIDES[slug]?.skill, s.id).toBe(s.id);
    }
    for (const g of GROK_TEMPLATES) expect(GUIDES[setupGuideHref(g.id).replace(`${SETUP_GUIDE_ORIGIN}/`, '')]?.grok, g.id).toBe(g.id);
    expect(SETUP_GUIDE_ORIGIN).toBe('https://www.amplifiedimpact.io');
  });

  it('names each page’s skill by its ZIP, which is not always the slug', () => {
    for (const g of PAGES) expect(g.download.href, g.slug).toBe(`/downloads/${entryFor(g)?.files.claude}`);
    expect(GUIDES['content-strategist']?.skill).toBe('content-opportunity-research');
  });

  it('draws a page as paid exactly when the catalog says its skill is not free', () => {
    expect(PAID.length).toBeGreaterThan(0);
    expect(FREE.length).toBeGreaterThan(0);
    for (const g of Object.values(GUIDES)) expect(inSkillLibrary(g), g.slug).toBe(PAID.includes(g) || PAID_GROK.includes(g));
    expect(PAID_GROK).toHaveLength(16);
    // A guide that is not a skill (a PDF) is never in the Skill Library.
    expect(inSkillLibrary(GUIDES['ops-time-audit'] as Guide)).toBe(false);
  });
});

describe.each([...PAID, ...PAID_GROK].map((g) => [g.slug, g] as const))('paid /%s (D-082, D-101)', (slug, guide) => {
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
    // The plan that opens it (D-115): Amplified Insiders, or the Amplified Agent Plan for an agent-only skill.
    const plan = SHARED.skillLibrary[unlockFor(guide)];
    expect(text(doc.getElementById(card?.getAttribute('aria-labelledby') ?? ''))).toBe('Get this skill');
    expect(text(card?.querySelector('h2 + p'))).toBe(plan.body);
    const top = card?.querySelector(':scope > .locked');
    const links = Array.from(top?.querySelectorAll('a') ?? []).map((a) => [text(a), a.getAttribute('href'), a.hasAttribute('target')]);
    expect(links).toEqual([
      [plan.label, plan.href, false],
      ['Sign In', 'https://learn.amplifiedimpact.io/skill-library', false],
    ]);
    expect(top?.querySelector('a.btn.btn-primary')?.getAttribute('href')).toBe(plan.href);
  });

  it('links no paid ZIP, and no download at all: no file to save, no hand-off to a download', () => {
    for (const file of ALL_PAID_DOWNLOADS) expect(html, file).not.toContain(`/downloads/${file}`);
    expect($$('a[href^="/downloads/"], a[download], [data-download], #download, .unlocked, .handoff')).toEqual([]);
  });

  it('shows the same guided setup as the free page, under the card (D-101)', () => {
    const d = guide.download;
    // A Grok Bot lane comes first in the switch (D-108).
    const lists = [...(d.grok ? [d.grok.setup] : []), d.setup ?? [], ...(d.chatgpt ? [d.chatgpt.setup] : [])];
    const boxes = Array.from(card?.querySelectorAll(':scope > .library-setup [data-guided]') ?? []);
    expect(boxes).toHaveLength(lists.length);
    expect(lists[0]?.length, 'a paid page with steps').toBeGreaterThan(3);
    lists.forEach((list, i) => {
      const items = Array.from(boxes[i]?.querySelectorAll('.setup-step') ?? []);
      expect(items.map((li) => text(li.querySelector('h3'))), slug).toEqual(list.map((s) => s.title));
      list.forEach((s, n) => {
        const li = items[n];
        // Every word to say, copy-ready, exactly as the free page has it.
        for (const words of [s.copy, s.copyBlock].filter((w): w is string => w !== undefined)) {
          expect(Array.from(li?.querySelectorAll('[data-copy-text]') ?? []).map((el) => el.textContent), s.title).toContain(words);
        }
        // A file is a button to the Skill Library; any other button is as on the free page.
        const buttons = Array.from(li?.querySelectorAll('a.btn:not(.copy-open)') ?? []).map((a) => [text(a), a.getAttribute('href')]);
        if (s.action === 'download' || (s.action !== undefined && s.action.download !== undefined)) {
          expect(buttons, s.title).toEqual([[SHARED.skillLibrary.get.label, SHARED.skillLibrary.get.href]]);
        } else if (s.action !== undefined) {
          expect(buttons, s.title).toEqual([[s.action.label, s.action.href]]);
        } else {
          expect(buttons, s.title).toEqual([]);
        }
      });
    });
    expect(doc.getElementById('guide-live')?.getAttribute('role')).toBe('status');
  });

  it('has no opt-in form: nothing posts to its sign-up route', () => {
    // The app switch's two radio buttons are the only inputs, and post nothing.
    expect($$('form, input:not(.app-radio), button[type="submit"], [data-unlock-key]')).toEqual([]);
    expect(html).not.toContain(`/api/${slug}`);
  });

  it('sends the buttons lower on the page to the plans, never back up to a sign-up', () => {
    expect($$('a[href^="#get-"], a[href="#download"]')).toEqual([]);
    const lower = $$('main a.btn').filter((a) => !card?.contains(a));
    expect(lower.length, 'a page with a "What you need" button').toBe(guide.sections.filter((s) => s.kind === 'tiles' && s.cta).length);
    const plan = SHARED.skillLibrary[unlockFor(guide)];
    for (const a of lower) expect([text(a), a.getAttribute('href')]).toEqual([plan.label, plan.href]);
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
  const words = [l.heading, l.insiders.body, l.insiders.label, l.agentPlan.body, l.agentPlan.label, l.signIn.lead, l.signIn.label, l.get.label];

  it('follow the house rules: no em dashes, no exclamation marks, no slop words, no retired name', () => {
    for (const w of words) {
      expect(w).not.toMatch(/[–—!]/);
      expect(w).not.toMatch(/\b(unlock|seamless|simply)\b/i);
      expect(w).not.toMatch(/Skill Library/);
    }
  });

  it('give the buttons the plans’ exact names in Title Case, and each sentence a full stop', () => {
    expect([l.insiders.label, l.agentPlan.label, l.signIn.label, l.get.label]).toEqual([
      'Get Amplified Insiders',
      'Get Amplified Agent Plan',
      'Sign In',
      'Download After You Sign In',
    ]);
    expect([l.insiders.href, l.agentPlan.href]).toEqual(['/pricing#insiders', '/pricing#agent-plan']);
    // The setup's button goes where the sign-in goes: the platform's library.
    expect(l.get.href).toBe(l.signIn.href);
    for (const b of [l.insiders.body, l.agentPlan.body]) expect(b).toMatch(/^[A-Z][^.]*\.$/);
  });
});

describe('which plan opens a paid skill (D-115)', () => {
  it('is the Amplified Agent Plan for an agent-only skill or template, and Amplified Insiders for the rest', () => {
    for (const g of PAID) {
      const sets = SKILL_CATALOG.find((s) => s.id === g.skill)?.sets;
      expect(unlockFor(g), g.slug).toBe(sets === 'agent' ? 'agentPlan' : 'insiders');
    }
    for (const g of PAID_GROK) {
      const sets = GROK_TEMPLATES.find((t) => t.id === g.grok)?.sets;
      expect(unlockFor(g), g.slug).toBe(sets === 'agent' ? 'agentPlan' : 'insiders');
    }
    const byId = (id: string) => Object.values(GUIDES).find((g) => g.skill === id)!;
    expect(unlockFor(byId('offer-strategy'))).toBe('agentPlan');
    expect(unlockFor(byId('team-ai-brain'))).toBe('insiders');
  });
});
