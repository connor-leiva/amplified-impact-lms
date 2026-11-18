import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { FREE_SKILLS, SKILL_CATALOG } from '@ai/core/skills';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { COPY as LIBRARY } from '../library/SkillLibrary';
import { clampStep, getRows, groupOf, ledeOf, libraryVM, lockLine, matches, offersPlans, placeKey, platformsOf, progressText, skillMeta, skillOfSlug, skillPageVM, snipOf } from './Library.vm';
import { OPENS, UI, UTAH_LINE, answerOf, buyerSkills, utahSkills } from './test/library-fixture';

// D-179: the Skill Library's view-model, against the catalog as the API answers it.

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const TOTAL = SKILL_CATALOG.length + GROK_TEMPLATES.length;

describe('the library (D-179)', () => {
  it('counts every skill and the open ones, from the data', () => {
    const vm = libraryVM(buyerSkills());
    expect(vm.title).toBe('Skill library');
    expect(vm.lede).toBe(`${TOTAL} skills with step-by-step setups, and ${['zero', 'one', 'two', 'three', 'four', 'five'][FREE_SKILLS.length]} of them are open now.`);
    expect(ledeOf(53, 1)).toBe('53 skills with step-by-step setups, and one of them is open now.');
    expect(ledeOf(53, 38)).toBe('53 skills with step-by-step setups, and 38 of them are open now.');
  });

  it('starts with the free skills, open, the first one the featured card', () => {
    const vm = libraryVM(buyerSkills());
    expect(vm.start.map((c) => c.id).sort()).toEqual([...FREE_SKILLS].sort());
    expect(vm.start.every((c) => c.open && c.lock === null)).toBe(true);
    expect(vm.start[0]).toMatchObject({ id: 'ai-brain-setup', href: '/learn/skills/ai-brain-setup', meta: 'Claude or ChatGPT · Anyone', aria: 'AI Brain Setup, open' });
  });

  it('groups the rest by set and Grok Bot collection, with one lock line for a group that opens on one day', () => {
    const vm = libraryVM(buyerSkills());
    expect(vm.groups.map((g) => g.label)).toEqual([LIBRARY.sets.owner_ops, 'Bookkeeping', 'Transactions', LIBRARY.sets.agent, LIBRARY.sets.both]);
    for (const g of vm.groups) expect(g.lock).toBe('Opens Wed, Dec 2');
    const shown = vm.groups.flatMap((g) => g.cards);
    expect(shown).toHaveLength(TOTAL - FREE_SKILLS.length);
    expect(vm.groups[1]!.cards.every((c) => GROK_TEMPLATES.some((t) => t.id === c.id && t.collection === 'bookkeeping'))).toBe(true);
    expect(vm.groups[1]).toMatchObject({ icon: 'dollar', tone: 'amber', count: '8 skills' });
    const tc = shown.find((c) => c.id === 'tc-file-audit')!;
    expect(tc).toMatchObject({ title: 'TC File Audit', meta: 'Claude or ChatGPT · Ops/admin', lock: 'Opens Wed, Dec 2', aria: 'TC File Audit, opens Wed, Dec 2', open: false });
    expect(shown.find((c) => c.id === 'morning-brief')!.meta).toBe('Grok Bot, Claude or ChatGPT · Team owner');
  });

  it('has a chip for all and one per group, counted from the data, and filters by it', () => {
    const vm = libraryVM(buyerSkills(), '', 'transactions');
    expect(vm.chips[0]).toEqual({ key: 'all', label: 'All', count: TOTAL - FREE_SKILLS.length, tone: null });
    expect(vm.chips.find((c) => c.key === 'transactions')).toMatchObject({ label: 'Transactions', count: 8, tone: 'terra' });
    expect(vm.groups.map((g) => g.key)).toEqual(['transactions']);
  });

  it('searches names and one-liners, every word, in any case', () => {
    expect(matches({ title: 'TC File Audit', summary: 'Crosses one transaction file' }, 'file tc')).toBe(true);
    expect(matches({ title: 'TC File Audit', summary: 'Crosses one transaction file' }, 'roi')).toBe(false);
    const vm = libraryVM(buyerSkills(), 'audit');
    expect(vm.groups.flatMap((g) => g.cards).every((c) => /audit/i.test(`${c.title} ${c.summary}`))).toBe(true);
    // A group's count is the group's, not the search's.
    expect(vm.groups[0]!.count).toBe('12 skills');
  });

  it('reads a Utah Life member’s locked line from the copy string, never an upsell', () => {
    const p = utahSkills();
    const vm = libraryVM(p);
    const owner = vm.groups.find((g) => g.key === 'owner_ops')!;
    expect(owner.lock).toBe(UTAH_LINE);
    expect(UTAH_LINE).toBe('Not included with Utah Life access');
    expect(vm.groups.find((g) => g.key === 'agent')!.lock).toBeNull();
    const tc = p.skills.find((k) => k.id === 'tc-file-audit')!;
    expect(offersPlans(tc, p)).toBe(false);
    // The builder's edit shows as it is.
    expect(lockLine(tc, { ...p, lockedLines: { 'utah-life': 'Edited line' } })).toBe('Edited line');
    // A group with no string reads the current library's same words.
    expect(lockLine(tc, { ...p, lockedLines: {} })).toBe(LIBRARY.notIncluded('Utah Life'));
  });

  it('says why anyone else’s skill is locked, offering the plans only when it may', () => {
    const k = { state: 'locked' as const, opensAt: null, releasedAt: 0, sets: 'owner_ops' as const };
    expect(lockLine(k, {})).toBe(LIBRARY.locked);
    expect(offersPlans(k, {})).toBe(true);
    expect(lockLine(k, { paused: true })).toBe(LIBRARY.paused);
    expect(offersPlans(k, { paused: true })).toBe(false);
    expect(libraryVM({ ...buyerSkills(), paused: true }).paused).toBe(LIBRARY.paused);
  });

  it('places a skill by its set, or a Grok Bot template by its collection', () => {
    expect(groupOf({ id: 'lead-source-roi', sets: 'both' })).toBe('bookkeeping');
    expect(groupOf({ id: 'missing-documents-audit', sets: 'both' })).toBe('transactions');
    expect(groupOf({ id: 'appointment-follow-up', sets: 'agent' })).toBe('agent');
    expect(platformsOf(['claude'])).toBe('Claude');
    expect(platformsOf(['claude', 'chatgpt', 'practice', 'grok'], 'and')).toBe('Grok Bot, Claude and ChatGPT');
    expect(skillMeta({ id: 'reel-editor', files: ['claude'] })).toBe('Claude · Agent');
  });

  it('takes the featured card’s sample as written, and nothing when there is none', () => {
    expect(snipOf(null)).toBeNull();
    expect(snipOf({ title: 'T', body: 'b', note: 'n', blocks: [{ h: 'Flags' }, { p: ['A ', { strong: 'b' }, ' c'] }] })).toEqual({ title: 'T', text: 'A b c' });
    expect(snipOf({ title: 'T', body: 'b', note: 'n', blocks: [{ items: ['x'] }] })).toEqual({ title: 'T', text: null });
  });
});

describe('a skill’s page (D-179)', () => {
  it('knows a skill by its page, and nothing else', () => {
    expect(skillOfSlug('content-strategist')).toBe('content-opportunity-research');
    expect(skillOfSlug('tc-file-audit')).toBe('tc-file-audit');
    expect(skillOfSlug('../secret')).toBeNull();
    expect(skillPageVM(buyerSkills(), 'not-a-skill', null)).toEqual({ kind: 'missing', href: '/learn/skills' });
  });

  it('previews an upcoming skill: when it opens, its sample, what comes with it, nothing of the setup', () => {
    const p = buyerSkills();
    const vm = skillPageVM(p, 'tc-file-audit', answerOf(p, 'tc-file-audit', 'tc-file-audit'));
    expect(vm.kind).toBe('preview');
    if (vm.kind !== 'preview') return;
    expect(vm.meta).toBe('Opens Wed, Dec 2 at 12:00 PM MT (1:00 PM CT) · Claude or ChatGPT · Ops/admin');
    expect(vm.when).toEqual({ tile: { dw: 'Wed', dd: '2' }, text: 'Wed, Dec 2 at 12:00 PM MT (1:00 PM CT)' });
    expect(vm.sample?.title).toBe('TC File Audit: Example File');
    expect(vm.get.map((r) => r.label)).toEqual(['Its step-by-step setup guide', 'Downloads for Claude and ChatGPT', 'Practice files to try it safely']);
    expect(vm.plans).toBe(false);
    expect(JSON.stringify(vm)).not.toContain('SECRET');
    expect(OPENS).toBeGreaterThan(0);
  });

  it('draws no sample where the page has none', () => {
    const p = buyerSkills();
    const vm = skillPageVM(p, 'reel-editor', { ...answerOf(p, 'reel-editor', 'reel-editor'), sample: null });
    expect(vm.kind === 'preview' && vm.sample).toBeNull();
    expect(vm.kind === 'preview' && vm.get.map((r) => r.label)).toEqual(['Its step-by-step setup guide', 'Downloads for Claude']);
  });

  it('previews a Utah Life member’s locked skill with the copy string, and no date', () => {
    const p = utahSkills();
    const vm = skillPageVM(p, 'tc-file-audit', answerOf(p, 'tc-file-audit', 'tc-file-audit'));
    expect(vm.kind === 'preview' && vm.meta).toBe(`${UTAH_LINE} · Claude or ChatGPT · Ops/admin`);
    expect(vm.kind === 'preview' && vm.when).toBeNull();
  });

  it('runs an open skill’s setup in the step player, and says so when it didn’t arrive', () => {
    const p = buyerSkills();
    const vm = skillPageVM(p, 'ai-brain-setup', answerOf(p, 'ai-brain-setup', 'ai-brain-setup'));
    expect(vm.kind).toBe('setup');
    expect(vm.kind === 'setup' && vm.guide.lanes.map((l) => l.id)).toEqual(['claude', 'chatgpt']);
    expect(skillPageVM(p, 'ai-brain-setup', null)).toEqual({ kind: 'failed', title: 'AI Brain Setup' });
  });

  it('keeps the place on this device under the current guide page’s key, clamped', () => {
    expect(placeKey('ai-brain-setup', 'chatgpt')).toBe('guide-step:ai-brain-setup:chatgpt');
    expect(progressText(UI, 2, 7)).toBe('Step 2 of 7');
    expect(clampStep(9, 3)).toBe(2);
    expect(clampStep(-1, 3)).toBe(0);
    expect(getRows(['grok'])).toEqual([
      { key: 'guide', icon: 'book', label: 'Its step-by-step setup guide' },
      { key: 'downloads', icon: 'download', label: 'Downloads for Grok Bot' },
    ]);
  });
});
