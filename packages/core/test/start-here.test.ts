// D-195: Week 0's Start Here card, insert-only, and a step's checklist status.
import { describe, expect, it } from 'vitest';
import type { CheckBlock, PathBlock } from '../src/course-types';
import { stepChecklistStatus } from '../src/checklist';
import { cohortCopyFields, copyIssues, moduleCopyFields } from '../src/course-rules';
import { START_HERE, START_HERE_V1, WEEK0_MODULE_ID, planStartHereV1 } from '../seed/start-here-v1';
import { seedProduction } from '../seed/curriculum';

const prod = () => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

describe('Week 0 Start Here (D-195)', () => {
  it('is the design’s card, without a step list, and it passes the copy rules', () => {
    expect(START_HERE_V1).toBe('2026-11-18-start-here');
    expect(START_HERE).toEqual({
      title: 'Start Here: Week 0',
      sub: 'Foundations: Set Up the Office',
      // D-248: Week 1 opens Sun, Nov 29, and the line names it. The first live build stays Wed, Dec 2.
      line: 'Eight steps get every team to the same starting line for Week 1, which opens Sun, Nov 29, 2026, 12:00 PM MT. Everything is due Mon, Nov 30, 2026, 12:00 PM MT.',
      hint: 'Start with Step 1. Steps 3 and 5 can run alongside the others.',
      totals: { owner: 'About 1 hr 30 min', operator: 'About 2 hr 15 min' },
    });
    expect(START_HERE).not.toHaveProperty('steps');
    const db = prod();
    const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
    week.course = { ...week.course!, startHere: START_HERE };
    const fields = moduleCopyFields(week).filter((f) => f.path.startsWith('course.startHere'));
    expect(fields.map((f) => f.path)).toEqual([
      'course.startHere.title',
      'course.startHere.sub',
      'course.startHere.line',
      'course.startHere.hint',
      'course.startHere.totals.owner',
      'course.startHere.totals.operator',
    ]);
    expect(copyIssues(fields)).toEqual([]);
    expect(copyIssues(cohortCopyFields(db.cohorts[0]!))).toEqual(copyIssues(cohortCopyFields(prod().cohorts[0]!)));
  });

  it('sets Start Here on Week 0 only, and only when it is unset', () => {
    const before = prod();
    const out = planStartHereV1(before);
    expect(out.skipped).toEqual([]);
    expect(out.changes.map((c) => c.target.id)).toEqual([WEEK0_MODULE_ID]);
    expect(out.db.modules.find((m) => m.id === WEEK0_MODULE_ID)!.course!.startHere).toEqual(START_HERE);
    expect(out.db.modules.filter((m) => m.id !== WEEK0_MODULE_ID).every((m) => m.course?.startHere === undefined)).toBe(true);
    const twice = planStartHereV1(out.db);
    expect(twice.changes).toEqual([]);
    expect(twice.db).toBe(out.db);
    const cleared = structuredClone(out.db);
    delete cleared.modules.find((m) => m.id === WEEK0_MODULE_ID)!.course!.startHere;
    cleared.modules.find((m) => m.id === WEEK0_MODULE_ID)!.course!.startHere = { title: 'Staff', sub: '', line: '', hint: '', totals: { owner: '', operator: '' } };
    expect(planStartHereV1(cleared).db).toBe(cleared);
  });
});

describe('a step’s checklist status', () => {
  const item = (id: string, dependsOn?: string[]): CheckBlock => ({ type: 'check', id, title: id, ...(dependsOn ? { dependsOn } : {}) });
  const blocks = (items: CheckBlock[]): PathBlock[] => items;

  it('is done, in progress, waiting, or not started', () => {
    const one = item('a');
    expect(stepChecklistStatus(true, blocks([one]), false, () => false, () => false)).toBe('done');
    expect(stepChecklistStatus(false, blocks([one]), true, () => false, () => false)).toBe('progress');
    expect(stepChecklistStatus(false, blocks([one]), false, () => true, () => false)).toBe('progress');
    expect(stepChecklistStatus(false, blocks([item('a', ['step:2:b'])]), false, () => false, () => true)).toBe('waiting');
    expect(stepChecklistStatus(false, blocks([one]), false, () => false, () => false)).toBe('idle');
  });
});
