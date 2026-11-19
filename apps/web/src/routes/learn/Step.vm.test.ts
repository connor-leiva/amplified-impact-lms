// D-177: the step player's view-model: the step, its Claude and ChatGPT paths, Mark step done, For this step.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { PathBlock } from '@ai/core/course-types';
import { weekRows } from './learn.vm';
import { stepParam, stepVM } from './Step.vm';
import { LEARNER_ID, liveState, prelaunchState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const st = prelaunchState();
const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
const learner = { kind: 'learner', userId: LEARNER_ID } as const;

describe('the step player (D-177)', () => {
  it('a step with both paths: tabs for Claude and ChatGPT, each with its own blocks', () => {
    const vm = stepVM(st.payload, rows[0], 4, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm).toMatchObject({
      eyebrow: 'Step 4 of 8',
      title: 'Get Your AI Ready',
      meta: '20 min · Claude or ChatGPT · Operator',
      back: { label: 'Foundations', href: '/learn/week/0' },
      prev: '/learn/week/0/step/3',
      next: '/learn/week/0/step/5',
      tabs: ['claude', 'chatgpt'],
    });
    expect(vm.doneWhen).toMatch(/^Done when: Paid plan/);
    expect(vm.paths.claude![0]).toMatchObject({ type: 'list', items: expect.arrayContaining(['A paid Claude plan']) });
    expect(vm.paths.chatgpt![0]).toMatchObject({ type: 'list', items: expect.arrayContaining(['A paid ChatGPT plan']) });
  });

  it('a step with no paths has no tabs', () => {
    const vm = stepVM(st.payload, rows[0], 5, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.tabs).toEqual([]);
    expect(vm.next).toBe('/learn/week/0/step/6');
  });

  it('marks the step through the portal’s own progress: its module and id, done or not, and never for staff', () => {
    const s3 = stepVM(st.payload, rows[0], 3, learner, st.now);
    const s1 = stepVM(st.payload, rows[0], 1, learner, st.now);
    if (s3.kind !== 'step' || s1.kind !== 'step') throw new Error('missing');
    expect(s3.mark).toEqual({ moduleId: 'accelerator-week-0', stepId: 'c3', done: false, disabled: false });
    expect(s1.mark).toMatchObject({ stepId: 'c1', done: true, disabled: false });
    expect(s1.prev).toBeNull();
    const staff = stepVM(st.payload, rows[0], 3, { kind: 'staff', staffId: 's1' }, st.now);
    expect(staff.kind === 'step' && staff.mark.disabled).toBe(true);
  });

  it('the rail: every step, done, up next or to do, the open one marked', () => {
    const vm = stepVM(st.payload, rows[0], 3, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.rail.map((r) => r.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo', 'todo', 'todo']);
    expect(vm.rail.filter((r) => r.on).map((r) => r.n)).toEqual([3]);
    expect(vm.rail[0]).toMatchObject({ label: 'Fill In Your Intake and Name Your Operator', href: '/learn/week/0/step/1', aria: 'Step 1, Fill In Your Intake and Name Your Operator, done' });
  });

  it('For this step is empty when the step links nothing and has no kit item; help still names office hours (D-189)', () => {
    const vm = stepVM(st.payload, rows[0], 3, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.forStep).toEqual([]);
    expect(vm.help.officeHours).toMatchObject({ label: 'Office hours', meta: 'Thu, Dec 3 · 12:00 PM MT', href: '/learn/schedule' });
  });

  it('a step’s linked Library skill alone, and a comma list drops a skill whose page is not built', () => {
    const p = structuredClone(st.payload);
    const w = p.course.weeks[0] as { module: { checklist: { linkedSkill?: string }[] } };
    w.module.checklist[4]!.linkedSkill = 'ai-brain-setup';
    const one = stepVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0], 5, learner, st.now);
    expect(one.kind === 'step' && one.forStep.map((r) => [r.title, r.href, r.meta])).toEqual([['AI Brain Setup', '/learn/skills/ai-brain-setup', 'Skill · Open now']]);
    w.module.checklist[4]!.linkedSkill = 'ai-brain-setup, map-your-spend';
    const both = stepVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0], 5, learner, st.now);
    expect(both.kind === 'step' && both.forStep.map((r) => r.title)).toEqual(['AI Brain Setup']);
  });

  it('For this step adds kit items placed on this step, filtered by the path tab (D-189)', () => {
    const p = structuredClone(st.payload);
    const w = p.course.weeks[0] as {
      kit?: { id: string; title: string; kind: 'file' | null; platform: 'claude' | 'chatgpt' | 'both' | null; stepId: string | null }[];
      module: { checklist: { linkedSkill?: string }[] };
    };
    w.module.checklist[3]!.linkedSkill = 'ai-brain-setup, map-your-spend';
    w.kit = [
      { id: 'a', title: 'Claude zip', kind: 'file', platform: 'claude', stepId: 'c4' },
      { id: 'b', title: 'ChatGPT zip', kind: 'file', platform: 'chatgpt', stepId: 'c4' },
      { id: 'c', title: 'Both zip', kind: 'file', platform: 'both', stepId: 'c4' },
      { id: 'd', title: 'Either zip', kind: 'file', platform: null, stepId: 'c4' },
      { id: 'e', title: 'Other step', kind: 'file', platform: null, stepId: 'c5' },
    ];
    const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0];
    const fileUrl = (id: string) => `/api/files/resource/${id}`;
    const claude = stepVM(p, row, 4, learner, st.now, { fileUrl, tab: 'claude' });
    const gpt = stepVM(p, row, 4, learner, st.now, { fileUrl, tab: 'chatgpt' });
    if (claude.kind !== 'step' || gpt.kind !== 'step') throw new Error('missing');
    expect(claude.forStep.map((r) => [r.title, r.href, r.meta])).toEqual([
      ['AI Brain Setup', '/learn/skills/ai-brain-setup', 'Skill · Open now'],
      ['Claude zip', '/api/files/resource/a', 'File · Step 4'],
      ['Both zip', '/api/files/resource/c', 'File · Step 4'],
      ['Either zip', '/api/files/resource/d', 'File · Step 4'],
    ]);
    expect(gpt.forStep.map((r) => r.title)).toEqual(['AI Brain Setup', 'ChatGPT zip', 'Both zip', 'Either zip']);
    // The first tab is the default, so a caller that names no tab sees the Claude rows.
    const first = stepVM(p, row, 4, learner, st.now, { fileUrl });
    expect(first.kind === 'step' && first.forStep.map((r) => r.title)).toEqual(claude.forStep.map((r) => r.title));
  });

  it('a week without a checklist item keeps today’s view-model, key for key (D-190)', () => {
    const live = liveState();
    const week = weekRows(live.payload, live.db, learnerOf(live.db, LEARNER_ID)).find((r) => r.week === 1);
    const vm = stepVM(live.payload, week, 1, learner, live.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(Object.keys(vm).sort()).toEqual(
      ['aside', 'back', 'doneWhen', 'eyebrow', 'forStep', 'help', 'hint', 'kind', 'lede', 'mark', 'meta', 'next', 'paths', 'prev', 'rail', 'railLabel', 'tabs', 'title', 'week'].sort(),
    );
    expect('pills' in vm).toBe(false);
    expect('layouts' in vm).toBe(false);
  });

  it('a checklist path builds the one-step layout, the gate and a sub-check count (D-190)', () => {
    const p = structuredClone(st.payload);
    const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } };
    const blocks: PathBlock[] = [
      { type: 'check', id: 's3-seven', title: 'Time seven tasks', subchecks: [{ id: 's3-t1', label: 'One' }, { id: 's3-t2', label: 'Two' }], role: 'owner' },
      { type: 'callout', kind: 'tip', text: 'Time each one once.' },
      { type: 'check', id: 's3-wait', title: 'Wait for the drive', dependsOn: ['step:6:s6-google'] },
      { type: 'accordion', title: 'Why we time per occurrence', body: ['One line.'] },
    ];
    week.module.checklist[2]!.paths = { claude: { blocks } };
    const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0];
    const vm = stepVM(p, row, 3, learner, st.now, {
      checks: [{ moduleId: 'accelerator-week-0', stepId: 'c3', itemId: 's3-seven:s3-t1', checked: true, auto: false }],
    });
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.pills?.map((pill) => pill.status)[2]).toBe('progress');
    const layout = vm.layouts?.claude;
    expect(layout?.progress).toEqual({ done: 1, total: 2, label: '1 of 2 tasks timed' });
    expect(layout?.items.map((item) => item.title)).toEqual(['Time seven tasks', 'Wait for the drive']);
    expect(layout?.items[0]?.callouts[0]?.label).toBe('Tip');
    expect(layout?.items[1]?.waiting).toBe(6);
    expect(layout?.gate.reason).toBe('Check off 2 more to mark this step done.');
    expect(layout?.accordions[0]?.open).toBe(false);
    expect(layout?.countdown).toMatch(/12:00 PM MT/);
    expect(layout?.due).toBe('Due Mon, Nov 30, 12:00 PM MT');
    const open = stepVM(p, row, 3, learner, st.now, { prefs: [{ key: 'acc:accelerator-week-0:c3:0', value: '1', updatedAt: st.now }] });
    expect(open.kind === 'step' && open.layouts?.claude?.accordions[0]?.open).toBe(true);
    const staff = stepVM(p, row, 3, { kind: 'staff', staffId: 's1' }, st.now);
    expect(staff.kind === 'step' && staff.layouts?.claude?.gate).toEqual({ locked: false, reason: null });
  });

  it('the due chip stays 12:00 PM MT when the viewer is not in Mountain time', () => {
    setViewerZone('America/Chicago');
    const p = structuredClone(st.payload);
    const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } };
    week.module.checklist[2]!.paths = {
      claude: { blocks: [{ type: 'check', id: 's3-seven', title: 'Time seven tasks', subchecks: [{ id: 's3-t1', label: 'One' }] }] },
    };
    const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0];
    const vm = stepVM(p, row, 3, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.layouts?.claude?.due).toBe('Due Mon, Nov 30, 12:00 PM MT');
    expect(vm.layouts?.claude?.countdown).toContain('12:00 PM MT');
    expect(vm.layouts?.claude?.due).not.toMatch(/CT|ET|PT/);
    expect(vm.layouts?.claude?.countdown).not.toMatch(/CT|ET|PT/);
  });

  it('D-193: underlines the first use on the page, and a card skips an id that is not in the glossary', () => {
    const p = structuredClone(st.payload);
    p.course.glossary = [
      { id: 'owner', term: 'Owner', short: 'The team leader.', long: 'The team leader who decides.', aliases: [], firstStep: 1 },
      { id: 'desk', term: 'Desk', short: 'One person.', long: 'The one person a hire reports to.', aliases: [], firstStep: 4 },
    ];
    const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } };
    week.module.checklist[0]!.paths = {
      claude: {
        blocks: [
          { type: 'text', text: 'The owner keeps the desk page.' },
          { type: 'copy', text: 'The owner pastes this.' },
          { type: 'check', id: 'know', title: 'Know these', action: { type: 'card', terms: ['owner', 'missing', 'desk'] } },
          { type: 'callout', kind: 'tip', text: 'Ask the owner once.' },
        ],
      },
    };
    const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0];
    const vm = stepVM(p, row, 1, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    const layout = vm.layouts?.claude;
    // The card lists both ids. The callout is drawn before the paragraph, so it takes the first "owner".
    expect(layout?.items[0]?.card?.map((t) => t.id)).toEqual(['owner', 'desk']);
    expect(layout?.items[0]?.callouts[0]?.spans?.some((span) => span.kind === 'term' && span.id === 'owner')).toBe(true);
    expect(layout?.extraMarks?.[0]).toBeUndefined();
    expect(layout?.extraMarks?.[1]).toBeUndefined();
    expect(vm.pathMarks?.claude?.[0]?.some((span) => span.kind === 'term' && span.id === 'owner')).toBe(true);
    expect(vm.pathMarks?.claude?.[0]?.some((span) => span.kind === 'term' && span.id === 'desk')).toBe(false);
  });

  it('D-199: hides, collapses, defaults the path, and shows the operator count', () => {
    const p = structuredClone(st.payload);
    const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] }; chatgpt?: { blocks: PathBlock[] } } }[] } };
    const blocks: PathBlock[] = [
      { type: 'check', id: 's1-invite', title: 'Invite your operator', hideIf: { field: 'operator', equals: 'both' } },
      { type: 'check', id: 's1-plan', title: 'Choose a plan', collapseIf: { field: 'plan', equals: 'Claude Team' }, collapsedNote: 'Your team plan covers this.' },
      { type: 'check', id: 's1-accept', title: 'Accept the invite', role: 'operator' },
      { type: 'callout', kind: 'heads_up', text: 'Not on Google.', showIf: { field: 'google', equals: 'No' } },
    ];
    week.module.checklist[0]!.paths = { claude: { blocks }, chatgpt: { blocks } };
    const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0]!;
    const stepId = row.steps[0]?.id ?? '';
    const intake = { operator: "I'm both", ai: 'ChatGPT', plan: 'Claude Team', google: 'No' };
    const vm = stepVM(p, row, 1, learner, st.now, { intake, operator: { name: 'Jordan', byStep: { [stepId]: { done: 3, total: 6 } } } });
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.pathDefault).toBe('chatgpt');
    expect(vm.layouts?.chatgpt?.items.map((item) => item.title)).not.toContain('Invite your operator');
    expect(vm.layouts?.chatgpt?.items.find((item) => item.id === 's1-plan')).toMatchObject({ detail: 'Your team plan covers this.', checked: true });
    expect(vm.layouts?.chatgpt?.items.find((item) => item.id === 's1-accept')?.note).toBe('Jordan: 3 of 6');
    expect(vm.layouts?.chatgpt?.items.find((item) => item.id === 's1-accept')?.callouts.map((c) => c.text)).toContain('Not on Google.');
    expect(vm.pills?.[0]?.note).toBe('Jordan: 3 of 6');
    const remembered = stepVM(p, row, 1, learner, st.now, { intake, prefs: [{ key: 'path', value: 'claude', updatedAt: st.now }] });
    expect(remembered.kind === 'step' && remembered.pathDefault).toBe('claude');
    const plain = stepVM(p, row, 1, learner, st.now);
    expect(plain.kind === 'step' && plain.layouts?.claude?.items.map((item) => item.title)).toContain('Invite your operator');
    expect(plain.kind === 'step' && plain.pathDefault).toBeUndefined();
    const unknown = stepVM(p, row, 1, learner, st.now, { intake: { missing: 'Yes' } });
    expect(unknown.kind === 'step' && unknown.layouts?.claude?.items.map((item) => item.title)).toContain('Invite your operator');
  });

  it('a locked week or a step that isn’t there goes to the week', () => {
    expect(stepVM(st.payload, rows[2], 1, learner, st.now)).toEqual({ kind: 'missing', href: '/learn/week/2' });
    expect(stepVM(st.payload, rows[0], 99, learner, st.now)).toEqual({ kind: 'missing', href: '/learn/week/0' });
    expect(stepParam('0')).toBeNull();
    expect(stepParam('3')).toBe(3);
  });
});
