// /morning-brief (DECISIONS.md D-108): the AI Accelerator's week 2 flagship, a skill that ships a Grok Bot
// template beside its Claude skill and ChatGPT Project. One page with three ways in, Grok Bot first; one
// catalog row with four files; one card in the library's main list, not on the Grok Bot shelf. Paid, so
// the page is drawn with the Skill Library card and the whole guided setup (D-082, D-101).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { FREE_SKILLS, isFreeSkill, PAID_DOWNLOADS, SETUP_GUIDE_ORIGIN, setupGuideHref, SKILL_CATALOG } from '@ai/core/skills';
import { describe, expect, it } from 'vitest';
import { SKILLS_DIR } from '../../../../scripts/skills.mjs';
import { ENTRIES } from '../library/content';
import { renderLibraryBody } from '../library/render';
import { GUIDES, inSkillLibrary, SHARED, type Guide } from './content';
import { nameOf, routineOf } from './grok-page';
import { renderGuideBody, renderGuideHead, renderSetup } from './render';

const guide = GUIDES['morning-brief'] as Guide;
const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderGuideHead(guide)}</head><body>${renderGuideBody(guide)}</body></html>`,
  'text/html',
);
const $$ = (selector: string) => Array.from(doc.querySelectorAll(selector));
/** Its whole setup, as its content carries it (D-151: in learn, behind sign-in, not on its page). */
const setup = new DOMParser().parseFromString(`<!doctype html><body>${renderSetup(guide)}</body>`, 'text/html');
const s$$ = (selector: string) => Array.from(setup.querySelectorAll(selector));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const source = (rel: string) => readFileSync(join(SKILLS_DIR, 'morning-brief', rel), 'utf8');
const template = source('grok/SKILL.md');

describe('the catalog', () => {
  it('is one paid owner-and-ops skill with four files, the Grok Bot template among them', () => {
    const row = SKILL_CATALOG.find((s) => s.id === 'morning-brief');
    expect(row?.title).toBe('Morning Brief');
    expect(row?.sets).toBe('owner_ops');
    expect(row?.files).toEqual({
      claude: 'morning-brief.zip',
      chatgpt: 'morning-brief-chatgpt.zip',
      practice: 'morning-brief-practice.zip',
      grok: 'morning-brief-grok.zip',
    });
    // Not one of the free skills, so every file stays off www (D-082).
    expect(isFreeSkill('morning-brief')).toBe(false);
    expect(FREE_SKILLS).not.toContain('morning-brief');
    for (const f of Object.values(row?.files ?? {})) expect(PAID_DOWNLOADS).toContain(f);
    expect(setupGuideHref('morning-brief')).toBe(`${SETUP_GUIDE_ORIGIN}/morning-brief`);
  });

  it('is not a Grok Bot shelf template: the shelf keeps its sixteen, with no skill among them', () => {
    expect(GROK_TEMPLATES.map((g) => g.id)).not.toContain('morning-brief');
    expect(GROK_TEMPLATES).toHaveLength(16);
  });
});

describe('the page', () => {
  it('is the paid skill page: the hero, the sample and the Skill Library card, no ZIP and no form', () => {
    expect(guide.skill).toBe('morning-brief');
    expect(guide.grok).toBeUndefined();
    expect(inSkillLibrary(guide)).toBe(true);
    expect(text(doc.querySelector('h1'))).toBe('Morning Brief');
    expect(guide.facts).toEqual(['Locked', 'About 15 minutes to set up', 'Grok Bot, Claude or ChatGPT']);
    expect(doc.getElementById(SHARED.skillLibrary.anchor)).not.toBeNull();
    expect($$('form, a[download], a[href^="/downloads/"]')).toEqual([]);
    expect(doc.title).toBe('Morning Brief: A Grok Bot Template and AI Skill · Amplified Impact');
    expect(text(doc.querySelector('.eyebrow'))).toBe('Grok Bot Template and AI Skill · For Team Owners');
  });

  it('asks which app with three radio buttons, Grok Bot first and checked, then Claude and ChatGPT', () => {
    // D-151: on its page, only the steps' titles; the switch is in its guided setup in learn.
    expect($$('input.app-radio, .app-switch, [data-guided]')).toEqual([]);
    const radios = s$$('input.app-radio') as HTMLInputElement[];
    expect(radios.map((r) => [r.id, r.checked])).toEqual([
      ['app-grok', true],
      ['app-claude', false],
      ['app-chatgpt', false],
    ]);
    expect(setup.querySelector('.app-switch')?.classList.contains('app-switch-3')).toBe(true);
    expect(s$$('.app-switch label').map((l) => text(l))).toEqual(['Grok Bot', 'Claude', 'ChatGPT']);
    expect(s$$('.app-setup').map((d) => d.className)).toEqual(['app-setup app-setup-grok', 'app-setup app-setup-claude', 'app-setup app-setup-chatgpt']);
    // Each lane remembers its own place (D-070).
    expect(s$$('[data-guided]').map((g) => g.getAttribute('data-guided-key'))).toEqual([
      'morning-brief-unlocked-step-grok',
      'morning-brief-unlocked-step-claude',
      'morning-brief-unlocked-step-chatgpt',
    ]);
  });

  it('walks Grok Bot through the shelf’s seven steps on the skill’s own template', () => {
    const lane = setup.querySelector('.app-setup-grok');
    expect(Array.from(lane?.querySelectorAll('.setup-step h3') ?? []).map((h) => text(h))).toEqual([
      'Create the Bot',
      'Save the Template as a Skill',
      'Connect Its Apps',
      'Answer the Setup Questions',
      'Set the Schedule',
      'Run a First Test',
      'Check the First Result',
    ]);
    const name = nameOf(template);
    expect(name).toBe('Morning Brief');
    const routine = routineOf(template);
    expect(routine.schedule).toMatch(/^Weekdays /);
    const copied = Array.from(lane?.querySelectorAll('[data-copy-text]') ?? []).map((el) => el.textContent);
    // Paid (D-101): step 2 copies only what to paste the template under; the routine is word for word.
    expect(copied).toContain(`Save these instructions as a skill called "${name}". Keep them exactly as written.`);
    expect(copied).toContain(`Set up a routine to run @${name} on this schedule: ${routine.schedule}\n\nEach time, use this prompt:\n\n${routine.prompt}`);
    // Grok Bot has no button that opens it: the words copy, and the toast names Grok Bot.
    expect(lane?.querySelector('[data-copy-open]')).toBeNull();
    for (const c of Array.from(lane?.querySelectorAll('[data-copy]') ?? [])) expect(c.getAttribute('data-toast')).toBe('Copied. Paste it into Grok Bot.');
    // The template's file is a button to the Skill Library.
    expect(Array.from(lane?.querySelectorAll('a.btn') ?? []).map((a) => text(a))).toContain(SHARED.skillLibrary.get.label);
  });

  it('keeps the template’s procedure off the page: it is in the Skill Library', () => {
    const procedure = (template.split('\n## Procedure')[1] ?? '').split('\n## ')[0] ?? '';
    const lines = procedure.split('\n').map((l) => l.replace(/[*`#]/g, '').replace(/^\s*(\d+\.|-)\s*/, '').trim()).filter((l) => l.length > 40);
    expect(lines.length).toBeGreaterThan(5);
    const page = text(doc.body);
    for (const line of lines) expect(page, line).not.toContain(line);
  });

  it('gives Claude and ChatGPT their own steps, with Copy & Open and the Project’s words as written', () => {
    expect(setup.querySelector('.app-setup-claude [data-copy-open]')).not.toBeNull();
    expect(setup.querySelector('.app-setup-chatgpt [data-copy-open]')).not.toBeNull();
    const paste = source('chatgpt/paste.txt').trim();
    expect(Array.from(setup.querySelectorAll('.app-setup-chatgpt [data-copy-text]')).map((el) => el.textContent)).toContain(paste);
    // None of it on its page (D-151).
    expect(doc.querySelector('[data-copy-open], [data-copy-text]')).toBeNull();
  });

  it('says Grok Bot, Claude or ChatGPT in the hero', () => {
    expect(guide.hero.steps.map((s) => s.title)).toEqual(['Set It Up Once', 'Practise First', 'Own the Day']);
    expect(guide.hero.steps[0]?.body).toBe('In Grok Bot, Claude or ChatGPT, about 15 minutes.');
  });

  it('shows the practice run as its sample, in the run’s own words', () => {
    const sample = source('sample.md').replace(/\*\*/g, '').replace(/"/g, '').replace(/'/g, '’');
    const plain = (s: string) => s.replace(/[“”]/g, '');
    const s = guide.sections.find((x) => x.kind === 'sample');
    expect(s?.kind).toBe('sample');
    if (s?.kind !== 'sample') return;
    for (const b of s.blocks) {
      if ('items' in b) for (const item of b.items) expect(sample, item).toContain(plain(item));
      if ('table' in b) for (const row of b.table.rows) for (const cell of row) expect(sample, cell).toContain(plain(cell));
    }
  });

  it('follows the house voice: no em dashes, no exclamation marks, nothing it must not say', () => {
    const body = doc.body.textContent ?? '';
    expect(body).not.toMatch(/[–—!]/);
    for (const banned of ['Forum', '$37', 'guarantee', 'ROI story', 'income']) expect(body, banned).not.toContain(banned);
    expect(doc.querySelector('a[href="mailto:support@amplifiedimpact.io"]')).not.toBeNull();
  });
});

describe('the library card', () => {
  const lib = new DOMParser().parseFromString(`<!doctype html><body>${renderLibraryBody()}</body>`, 'text/html');

  it('is in the main list, not on the shelf, and names all three apps, and says Locked (D-115)', () => {
    const entry = ENTRIES.find((e) => e.href === '/morning-brief');
    expect(entry?.title).toBe('Morning Brief');
    expect(entry?.collection).toBeUndefined();
    expect(entry?.tools).toEqual(['grok', 'claude', 'chatgpt']);
    const card = lib.querySelector('#library-items a.item-body[href="/morning-brief"]');
    expect(card).not.toBeNull();
    expect(lib.querySelector('[data-shelf] a[href="/morning-brief"]')).toBeNull();
    expect(Array.from(card?.querySelectorAll('.item-tags li') ?? []).map((li) => text(li))).toEqual([
      'Grok Bot Template',
      'Claude',
      'ChatGPT',
      'Locked',
    ]);
  });
});
