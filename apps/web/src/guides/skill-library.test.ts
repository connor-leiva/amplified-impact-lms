import { GROK_TEMPLATES, isFreeGrokTemplate, PAID_GROK_DOWNLOADS } from '@ai/core/grok-templates';
import { isFreeSkill, PAID_DOWNLOADS, SETUP_GUIDE_ORIGIN, setupGuideHref, SKILL_CATALOG } from '@ai/core/skills';
import { skillGuideUrl } from '@ai/core/skill-guides';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES, inSkillLibrary, SHARED, unlockFor, type Guide } from './content';
import { renderGuideBody, renderGuideHead } from './render';

// The skill pages after the launch (D-080, D-082, D-101, D-151), as they ship: no mocks. A paid
// skill's page keeps its hero and its sample, and shows the Skill Library card in place of the sign-up:
// "Unlock the Guided Setup" to the plans, "Already own it? Sign In" to its guide in learn, and under it
// the setup's step titles only (D-151; the whole setup is in learn, `gated.test.ts`). A free skill's
// page keeps its sign-up, whose button unlocks the guided setup with a free account, and links no file.
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
    // D-151: the button unlocks the guided setup (at the plans), and a buyer signs in to its guide.
    expect(links).toEqual([
      ['Unlock the Guided Setup', plan.href, false],
      ['Sign In', skillGuideUrl(slug), false],
    ]);
    expect(text(top?.querySelector('.legal'))).toBe('Already own it? Sign In');
    expect(top?.querySelector('a.btn.btn-primary')?.getAttribute('href')).toBe(plan.href);
  });

  it('links no paid ZIP, and no download at all: no file to save, no hand-off to a download', () => {
    for (const file of ALL_PAID_DOWNLOADS) expect(html, file).not.toContain(`/downloads/${file}`);
    expect($$('a[href^="/downloads/"], a[download], [data-download], #download, .unlocked, .handoff')).toEqual([]);
  });

  it('shows the setup’s step titles under the card, and nothing more of it (D-151)', () => {
    const d = guide.download;
    const first = d.grok?.setup ?? d.setup ?? [];
    const preview = card?.querySelector(':scope > [data-guide-preview]');
    expect(Array.from(preview?.querySelectorAll('.setup-step h3') ?? []).map((h) => text(h)), slug).toEqual(first.map((s) => s.title));
    expect(first.length, 'a paid page with steps').toBeGreaterThan(3);
    expect(card?.querySelectorAll('[data-guided], [data-copy-text], .copy-open, a.btn:not(.btn-primary)')).toHaveLength(0);
    expect(doc.getElementById('guide-live')).toBeNull();
  });

  it('has no opt-in form: nothing posts to its sign-up route', () => {
    // No app switch either (D-151): the steps are in learn.
    expect($$('form, input, button[type="submit"], [data-unlock-key]')).toEqual([]);
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

describe.each(FREE.map((g) => [g.slug, g] as const))('free /%s (D-151)', (slug, guide) => {
  const doc = parse(guide);

  it('links no file: its downloads are in its guided setup, behind a free account', () => {
    expect(doc.querySelectorAll('a[download], a[href^="/downloads/"], [data-download]')).toHaveLength(0);
  });

  it('still has its sign-up, whose button unlocks the guided setup, and no Skill Library card', () => {
    expect(doc.querySelector('#guide-form')?.getAttribute('action')).toBe(`/api/${slug}`);
    expect(text(doc.querySelector('#guide-form button[type="submit"]'))).toBe('Unlock the Guided Setup');
    expect(doc.querySelector('[data-skill-library]')).toBeNull();
    expect(doc.querySelector('[data-unlock-key]')?.id).toBe('get-the-skill');
  });

  it('once signed up, says the link is in their inbox, with a button to the guide in learn', () => {
    const panel = doc.getElementById('check-email');
    expect(panel?.className).toBe('unlocked');
    expect(text(panel?.querySelector('h2'))).toBe('Your guided setup is ready');
    expect(Array.from(panel?.querySelectorAll('a') ?? []).map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Open the Guided Setup', skillGuideUrl(slug)],
    ]);
    expect(doc.getElementById('download')).toBeNull();
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

describe('Design’s live recheck of PR 105', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'skills.css'), 'utf8');
  /** A rule's body, by its exact selector at the start of a line. */
  const rule = (selector: string) => {
    const at = css.indexOf(`\n${selector} {`);
    return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  };

  it('gives "Already own it? Sign In" 16px and a 44px tap target, and leaves the consent line at 13px', () => {
    expect(rule('.sk .legal.owned')).toMatch(/font-size: 16px;/);
    const link = rule('.sk .legal.owned a');
    expect(link).toMatch(/display: inline-block;/);
    expect(link).toMatch(/min-height: 44px;/);
    expect(link).toMatch(/line-height: 44px;/);
    expect(rule('.sk .legal')).toMatch(/font-size: 13px;/);
    for (const g of [...PAID, ...PAID_GROK]) {
      const doc = parse(g);
      expect(doc.querySelector('[data-skill-library] p.legal.owned a')?.textContent, g.slug).toBe('Sign In');
    }
    for (const g of FREE) expect(parse(g).querySelector('#guide-form .legal')?.classList.contains('owned'), g.slug).toBe(false);
  });

  it('pads the "Your guided setup is ready" panel 24px, as the cards around it', () => {
    expect(rule('.sk .unlocked')).toMatch(/padding: 24px;/);
  });
});
