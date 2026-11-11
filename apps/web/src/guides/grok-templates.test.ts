// The Grok Bot templates (DECISIONS.md D-100): every template in content/grok-bot-templates/ against
// its catalog row, its ZIP, its shell, its page and its library card. The templates are not Claude
// Skills, so this is their own file, beside `skills.test.ts`. To fix a failure here, edit the source
// in content/grok-bot-templates/ and rebuild (`node scripts/grok-templates.mjs build`), never the ZIP.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_GROK_TEMPLATES, GROK_TEMPLATES, isFreeGrokTemplate, PAID_GROK_DOWNLOADS } from '@ai/core/grok-templates';
import { FREE_SKILLS, SKILL_CATALOG } from '@ai/core/skills';
import { check, expected, grokShellFor, grokShellPath, listTemplates, templatePath } from '../../../../scripts/grok-templates.mjs';
import { DOWNLOADS_DIR, unzip } from '../../../../scripts/skills.mjs';
import { ENTRIES } from '../library/content';
import { GUIDES, inSkillLibrary, type Guide } from './content';
import { guardrailsOf, nameOf, resultOf, routineOf } from './grok-page';
import { renderGuideBody } from './render';
import { GUIDE_HTML } from './vite-plugin';

const parse = (guide: Guide) => new DOMParser().parseFromString(`<!doctype html><body>${renderGuideBody(guide)}</body>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the catalog', () => {
  it('lists the sixteen templates in content/grok-bot-templates/, each in its own collection', () => {
    const folders = listTemplates();
    expect(folders).toHaveLength(16);
    expect(GROK_TEMPLATES.map((g) => [g.id, g.collection]).sort()).toEqual(folders.map((t) => [t.id, t.collection]).sort());
    expect(GROK_TEMPLATES.filter((g) => g.collection === 'bookkeeping')).toHaveLength(8);
    expect(GROK_TEMPLATES.filter((g) => g.collection === 'transactions')).toHaveLength(8);
    expect(existsSync(join(templatePath('card-bank-feed-audit'), '..', '..', '..', 'README.md'))).toBe(true);
  });

  it('frees exactly Connor’s four, two from each collection, and nothing else', () => {
    expect([...FREE_GROK_TEMPLATES].sort()).toEqual(['card-bank-feed-audit', 'contract-to-close-deadlines', 'new-contract-intake', 'quarterly-tax-profit-first']);
    expect(GROK_TEMPLATES.filter((g) => isFreeGrokTemplate(g.id)).map((g) => g.collection).sort()).toEqual(['bookkeeping', 'bookkeeping', 'transactions', 'transactions']);
    expect(PAID_GROK_DOWNLOADS).toHaveLength(12);
    for (const id of FREE_GROK_TEMPLATES) expect(PAID_GROK_DOWNLOADS).not.toContain(`${id}.zip`);
    expect(isFreeGrokTemplate('trust-earnest-watch')).toBe(false);
  });

  it('keeps them apart from the 36 Claude Skills: no shared id, no free-skill entry, no catalog row', () => {
    expect(SKILL_CATALOG).toHaveLength(36);
    const skillIds = new Set(SKILL_CATALOG.map((s) => s.id));
    for (const g of GROK_TEMPLATES) {
      expect(skillIds.has(g.id), g.id).toBe(false);
      expect(FREE_SKILLS, g.id).not.toContain(g.id);
    }
  });

  it('marks Trust & Earnest Money Watch for brokers, and only it', () => {
    expect(GROK_TEMPLATES.filter((g) => g.audience === 'brokers').map((g) => g.id)).toEqual(['trust-earnest-watch']);
    expect(ENTRIES.find((e) => e.href === '/trust-earnest-watch')?.audience).toBe('For Brokers');
  });
});

describe.each(GROK_TEMPLATES.map((g) => [g.id, g] as const))('%s', (id, template) => {
  const source = readFileSync(templatePath(id), 'utf8');
  const guide = GUIDES[id];

  it('passes the template checks: its sections, its routine and no em or en dash', () => {
    expect(check(id).errors).toEqual([]);
  });

  it('ships its ZIP exactly as its source: one SKILL.md, in a folder of its name', () => {
    for (const download of expected(id)) {
      const path = join(DOWNLOADS_DIR, download.file);
      expect(existsSync(path), `${download.file} is not built: run node scripts/grok-templates.mjs build ${id}`).toBe(true);
      const zip = unzip(readFileSync(path));
      expect([...zip.keys()].filter((k) => !k.endsWith('/'))).toEqual([`${id}/SKILL.md`]);
      expect(zip.get(`${id}/SKILL.md`)?.equals(readFileSync(templatePath(id))), `${download.file} differs from its source`).toBe(true);
      expect(download.file).toBe(template.file);
    }
  });

  it('has its shell and its build entry', () => {
    expect(readFileSync(grokShellPath(id), 'utf8')).toBe(grokShellFor(id));
    expect(GUIDE_HTML).toContain(`${id}.html`);
  });

  it('has its page, which names the template, not a skill, and offers its one ZIP', () => {
    expect(guide, `no page for /${id}`).toBeDefined();
    if (!guide) return;
    expect(guide.grok).toBe(id);
    expect(guide.skill).toBeUndefined();
    expect(guide.download.href).toBe(`/downloads/${template.file}`);
    expect(guide.download.chatgpt).toBeUndefined();
    expect(guide.hero.title).toBe(template.title);
    expect(guide.layout).toBe('skill');
  });

  it('walks through the guided setup in Grok Bot, the ZIP only an extra (Connor, 2026-11-10)', () => {
    const steps = guide?.download.setup ?? [];
    expect(steps.map((s) => s.title)).toEqual([
      'Create the Bot',
      'Save the Template as a Skill',
      'Connect Its Apps',
      'Answer the Setup Questions',
      'Set the Schedule',
      'Run a First Test',
      'Check the First Result',
    ]);
    // Grok Bot's own labels, from docs.x.ai/grok-bot.
    const words = JSON.stringify(steps);
    for (const label of ['New Bot', 'Create', 'Connect apps', 'Authorize', 'Installed', 'Settings > Vault', 'Timezone', 'Details', 'When to run', 'Test', 'Allow once', 'Deny']) {
      expect(words, label).toContain(`"strong":"${label}"`);
    }
    // The download is a step's extra, a second button under the words to paste, never a step of its own.
    const extras = steps.filter((s) => s.action !== undefined && s.action !== 'download' && s.action.download !== undefined);
    expect(extras.map((s) => s.title)).toEqual(['Save the Template as a Skill']);
    expect(steps.some((s) => s.action === 'download')).toBe(false);
  });

  it('copies the whole template, the setup prompt, the routine on its schedule and a test prompt, word for word', () => {
    const steps = guide?.download.setup ?? [];
    const step = (title: string) => steps.find((s) => s.title === title);
    const name = nameOf(source);
    const save = `Save these instructions as a skill called "${name}". Keep them exactly as written.`;
    if (isFreeGrokTemplate(id)) {
      expect(step('Save the Template as a Skill')?.copyBlock).toBe(`${save}\n\n${source.trimEnd()}`);
    } else {
      // A paid template's words are in the Skill Library (D-101): the step copies only what to paste
      // them under, and says where they are.
      expect(step('Save the Template as a Skill')?.copy).toBe(save);
      expect(step('Save the Template as a Skill')?.copyBlock).toBeUndefined();
      expect(JSON.stringify(step('Save the Template as a Skill')?.body)).toContain('SKILL.md');
    }
    expect(step('Answer the Setup Questions')?.copy).toContain(`@${name}`);
    const routine = routineOf(source);
    const schedule = step('Set the Schedule');
    expect(schedule?.copyBlock).toBe(`Set up a routine to run @${name} on this schedule: ${routine.schedule}\n\nEach time, use this prompt:\n\n${routine.prompt}`);
    expect(JSON.stringify(schedule)).toContain(routine.cron);
    expect(step('Run a First Test')?.copy).toMatch(new RegExp(`^Run @${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} now as a first test\\.`));
  });

  it('says what a good first result looks like, from the template’s output format, and how to fix a bad one', () => {
    const result = resultOf(source);
    const good = guide?.sections.find((s) => s.kind === 'list' && s.heading === 'What a good first result looks like');
    expect(good?.kind === 'list' ? good.items.map((i) => i.title) : []).toEqual([
      'In the chat',
      ...(result.sheets.length ? ['In Google Drive'] : []),
      template.collection === 'bookkeeping' ? 'In your books' : 'In your files',
    ]);
    const fixes = guide?.sections.find((s) => s.kind === 'faq' && s.heading === 'If something goes wrong');
    expect(fixes?.kind === 'faq' ? fixes.items.length : 0).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(fixes)).toContain(template.collection === 'bookkeeping' ? 'QuickBooks' : 'transaction system');
  });

  it('shows the template’s own sample and its guardrails', () => {
    if (!guide) return;
    const doc = parse(guide);
    const sample = text(doc.querySelector('section.sample'));
    // Its opening line, and the first line of its example, as the template words them.
    const lines = source.split('## Sample output (EXAMPLE DATA ONLY)')[1]?.split('\n').filter((l) => /^[A-Z]/.test(l)) ?? [];
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(0, 2)) expect(sample).toContain(line.replace(/\*\*/g, '').replace(/`/g, '').trim());
    const list = guide.sections.find((s) => s.kind === 'list' && s.heading === 'What it never does');
    expect(list?.kind === 'list' ? list.items.map((i) => i.title) : []).toEqual(guardrailsOf(source).map((g) => g.title));
  });

  it('is on the Grok Bot shelf, in its collection, linked to its page', () => {
    const entry = ENTRIES.find((e) => e.href === `/${id}`);
    expect(entry?.collection).toBe(template.collection);
    expect(entry?.kind).toBe('Grok Bot');
    expect(entry?.tools).toEqual(['grok']);
    expect(entry?.title).toBe(template.title);
  });

  it(isFreeGrokTemplate(id) ? 'is free: its sign-up and its download' : 'is paid: the Skill Library card, no sign-up', () => {
    if (!guide) return;
    const doc = parse(guide);
    expect(inSkillLibrary(guide)).toBe(!isFreeGrokTemplate(id));
    if (isFreeGrokTemplate(id)) {
      expect(doc.querySelector('#guide-form')?.getAttribute('action')).toBe(`/api/${id}`);
      expect(Array.from(doc.querySelectorAll('a[download]')).map((a) => a.getAttribute('href'))).toContain(`/downloads/${template.file}`);
      expect(guide.facts?.[0]).toBe('Free');
    } else {
      expect(doc.querySelector('#skill-library')).not.toBeNull();
      expect(doc.querySelector('form')).toBeNull();
      expect(doc.body.innerHTML).not.toContain(`/downloads/${template.file}`);
      expect(guide.facts?.[0]).toBe('In the Amplified Skill Library');
      // The guided setup shows (D-101), and the template's own procedure stays in the Skill Library.
      expect(doc.querySelectorAll('#skill-library .library-setup .setup-step')).toHaveLength(7);
      const procedure = (source.split('\n## Procedure')[1] ?? '').split('\n## ')[0] ?? '';
      const lines = procedure.split('\n').map((l) => l.replace(/[*`#]/g, '').replace(/^\s*(\d+\.|-)\s*/, '').trim()).filter((l) => l.length > 40);
      expect(lines.length).toBeGreaterThan(2);
      const page = text(doc.body);
      for (const line of lines) expect(page, line).not.toContain(line);
    }
  });

  it('says it is a Grok Bot template, in the house voice, and never the Claude closer', () => {
    if (!guide) return;
    const body = parse(guide).body.textContent ?? '';
    expect(body).not.toMatch(/[–—]/);
    expect(body).not.toContain('in Claude or a ChatGPT Project');
    expect(body).toContain('Grok Bot');
    expect(guide.hero.eyebrow).toMatch(/Grok Bot Template · (Bookkeeping|Transactions)/);
  });

  it('copies its words for Grok Bot, with no button that opens Claude or ChatGPT', () => {
    if (!guide) return;
    const doc = parse(guide);
    expect(doc.querySelector('a.copy-open, [data-copy-open]')).toBeNull();
    const copies = Array.from(doc.querySelectorAll('[data-copy]'));
    // Free or paid, the setup's words copy (D-101).
    expect(copies.length).toBeGreaterThan(0);
    for (const c of copies) expect(c.getAttribute('data-toast')).toBe('Copied. Paste it into Grok Bot.');
  });
});

describe('where a template sits next to a Claude Skill', () => {
  const links = (id: string) => Array.from(parse(GUIDES[id] as Guide).querySelectorAll('a')).map((a) => a.getAttribute('href'));

  it('keeps the Missing-Documents File Audit apart from TC File Audit, and points to it', () => {
    expect(links('missing-documents-audit')).toContain('/tc-file-audit');
    expect(text(parse(GUIDES['missing-documents-audit'] as Guide).body)).toContain('How is this different from TC File Audit?');
  });

  it('keeps the Month-End Close Packet and Lead-Source ROI apart from Team P&L Review, and points to it', () => {
    for (const id of ['month-end-close', 'lead-source-roi']) {
      expect(links(id), id).toContain('/team-pnl-review');
      expect(text(parse(GUIDES[id] as Guide).body), id).toContain('How is this different from Team P&L Review?');
    }
  });

  it('and the skills point back to them', () => {
    expect(links('tc-file-audit')).toContain('/missing-documents-audit');
    expect(links('team-pnl-review')).toContain('/month-end-close');
    expect(links('team-pnl-review')).toContain('/lead-source-roi');
  });
});
