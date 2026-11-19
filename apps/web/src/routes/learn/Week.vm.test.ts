// D-177: the week overview's view-model, open and locked.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { stepsHeading, weekParam, weekVM } from './Week.vm';
import { LEARNER_ID, prelaunchState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const st = prelaunchState();
const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
const files = (id: string) => `/api/files/resource/${id}`;

describe('the week overview (D-177)', () => {
  it('an open week: its title, outcome, pill and due date, the step up next and the steps done', () => {
    const vm = weekVM(st.payload, rows, 0, st.now, files);
    if (vm.kind !== 'open') throw new Error('not open');
    expect(vm).toMatchObject({
      title: 'Foundations',
      lede: 'Every team at the same starting line by Mon, Nov 30.',
      pill: { tone: 'ip', label: 'In progress' },
      pk: 'Week 0 · Due Mon, Nov 30 at 12:00 PM MT (1:00 PM CT)',
      hero: {
        kind: 'step',
        eyebrow: 'Up next · Step 3 of 8',
        title: 'Start Your Time Baseline',
        doneWhen: 'Done when: Six tasks timed per occurrence, or marked not done today',
        cta: { label: 'Continue step 3', href: '/learn/week/0/step/3' },
      },
      right: { done: 2, total: 8, ofTotal: 'of 8', foot: 'About 2 hrs 5 min left, due Nov 30' },
    });
  });

  it('lists the steps with who and time, done, up next or to do', () => {
    const vm = weekVM(st.payload, rows, 0, st.now, files);
    if (vm.kind !== 'open') throw new Error('not open');
    expect(vm.steps.heading).toBe('Eight steps');
    expect(vm.steps.meta).toBe('About 2 hrs 45 min in all');
    expect(vm.steps.rows.map((r) => r.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo', 'todo', 'todo']);
    expect(vm.steps.rows[2]).toMatchObject({ pill: { tone: 'ip', label: 'In progress' }, meta: '20 min, over two weeks · Owner', aria: 'Step 3, Start Your Time Baseline, up next' });
    expect(vm.steps.rows[0]!.pill).toEqual({ tone: 'done', label: 'Done' });
    expect(vm.steps.rows[3]!.pill).toBeNull();
  });

  it('the week’s kit: its Library skills, linked only where the page exists', () => {
    const vm = weekVM(st.payload, rows, 0, st.now, files);
    if (vm.kind !== 'open') throw new Error('not open');
    expect(vm.kit!.heading).toBe('Week 0 kit');
    expect(vm.kit!.rows.map((r) => [r.title, r.href, r.meta])).toEqual([
      ['AI Brain Setup', '/learn/skills/ai-brain-setup', 'Skill · Open now'],
      ['Map Your Spend', null, 'Skill · Coming With Week 1'],
      ['Lead Source Review', null, 'Skill · Coming With Week 1'],
    ]);
  });

  it('a skill a step links, with no Library page, reads In Step N and opens that step (D-189)', () => {
    const p = structuredClone(st.payload);
    p.copy = { ...(p.copy ?? {}), 'skill.in_step': 'In Step {n}' };
    const w = p.course.weeks[0] as { module: { checklist: { linkedSkill?: string }[] } };
    w.module.checklist[3]!.linkedSkill = 'map-your-spend, lead-source-review';
    const vm = weekVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID)), 0, st.now, files);
    if (vm.kind !== 'open') throw new Error('not open');
    expect(vm.kit!.rows.map((r) => [r.title, r.href, r.meta])).toEqual([
      ['AI Brain Setup', '/learn/skills/ai-brain-setup', 'Skill · Open now'],
      ['Map Your Spend', '/learn/week/0/step/4', 'Skill · In Step 4'],
      ['Lead Source Review', '/learn/week/0/step/4', 'Skill · In Step 4'],
    ]);
  });

  it('without the In Step copy string, a linked skill still reads Coming With Week 1 and does not link', () => {
    const p = structuredClone(st.payload);
    p.copy = { ...(p.copy ?? {}) };
    delete p.copy['skill.in_step'];
    const w = p.course.weeks[0] as { module: { checklist: { linkedSkill?: string }[] } };
    w.module.checklist[3]!.linkedSkill = 'map-your-spend';
    const vm = weekVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID)), 0, st.now, files);
    if (vm.kind !== 'open') throw new Error('not open');
    expect(vm.kit!.rows.find((r) => r.title === 'Map Your Spend')).toMatchObject({ href: null, meta: 'Skill · Coming With Week 1' });
  });

  it('a locked week: its stub alone (title, outcome, question, when it opens) and its sessions', () => {
    const vm = weekVM(st.payload, rows, 2, st.now, files);
    if (vm.kind !== 'locked') throw new Error('not locked');
    expect(vm).toMatchObject({
      title: 'Leads That Pay',
      lede: 'Know which lead sources pay you back, and catch every new lead that isn’t worked to standard.',
      pk: 'Opens Wed, Dec 9 · 12:00 PM MT · Week 2',
      headline: 'Which lead sources pay, and is every lead worked?',
      line: null,
      question: null,
    });
    expect(vm.sessions!.rows.map((r) => r.title)).toEqual(['Lead Source Review Live Build', 'Goal-Planning Session 1 and Office Hours', 'Lead Source Review Office Hours']);
    expect(vm.sessions!.add!.label).toBe('Add all to calendar');
    // Nothing of the week's content: the stub has no steps, and the page draws none.
    expect(JSON.stringify(vm)).not.toMatch(/Seat Card|playbook/i);
  });

  it('a locked week’s own locked copy comes first, and its question stays', () => {
    const p = structuredClone(st.payload);
    const w = p.course.weeks[2] as { lockedCopy?: { headline: string; line: string; opens: string } };
    w.lockedCopy = { headline: 'Two more weeks', line: 'Finish Week 0 first.', opens: 'Unlocks {date}' };
    const vm = weekVM(p, weekRows(p, st.db, learnerOf(st.db, LEARNER_ID)), 2, st.now, files);
    expect(vm).toMatchObject({ kind: 'locked', headline: 'Two more weeks', line: 'Finish Week 0 first.', question: 'Which lead sources pay, and is every lead worked?', pk: 'Unlocks Wed, Dec 9 · 12:00 PM MT · Week 2' });
  });

  it('a week that isn’t in the course goes back home', () => {
    expect(weekVM(st.payload, rows, 42, st.now, files)).toMatchObject({ kind: 'missing', href: '/learn' });
    expect(weekVM(st.payload, rows, null, st.now, files).kind).toBe('missing');
    expect(weekParam('3')).toBe(3);
    expect(weekParam('week-3')).toBeNull();
    expect(stepsHeading(1)).toBe('One step');
    expect(stepsHeading(14)).toBe('14 steps');
  });
});
