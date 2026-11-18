// D-177: the step player's view-model: the step, its Claude and ChatGPT paths, Mark step done, For this step.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { stepParam, stepVM } from './Step.vm';
import { LEARNER_ID, prelaunchState } from './test/fixture';

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

  it('For this step: the week’s skills, an unbuilt Library page as the coming copy string with no link; help with office hours', () => {
    const vm = stepVM(st.payload, rows[0], 3, learner, st.now);
    if (vm.kind !== 'step') throw new Error('missing');
    expect(vm.forStep.map((r) => [r.title, r.href])).toEqual([
      ['AI Brain Setup', '/learn/skills/ai-brain-setup'],
      ['Map Your Spend', null],
      ['Lead Source Review', null],
    ]);
    expect(vm.help.officeHours).toMatchObject({ label: 'Office hours', meta: 'Thu, Dec 3 · 12:00 PM MT (1:00 PM CT)', href: '/learn/schedule' });
  });

  it('a step’s linked skill alone, when the step names one', () => {
    const p = structuredClone(st.payload);
    const w = p.course.weeks[0] as { module: { checklist: { linkedSkill?: string }[] } };
    w.module.checklist[4]!.linkedSkill = 'ai-brain-setup';
    const vm = stepVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0], 5, learner, st.now);
    expect(vm.kind === 'step' && vm.forStep.map((r) => r.title)).toEqual(['AI Brain Setup']);
  });

  it('a locked week or a step that isn’t there goes to the week', () => {
    expect(stepVM(st.payload, rows[2], 1, learner, st.now)).toEqual({ kind: 'missing', href: '/learn/week/2' });
    expect(stepVM(st.payload, rows[0], 99, learner, st.now)).toEqual({ kind: 'missing', href: '/learn/week/0' });
    expect(stepParam('0')).toBeNull();
    expect(stepParam('3')).toBe(3);
  });
});
