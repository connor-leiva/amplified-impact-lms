// D-265 (R-5 Phase 6): Program's view-models, on the R2 parity snapshot of the Program pages (the mockup's program: nine
// weeks, December running all nine) and on a database of production's shape.
import { describe, expect, it } from 'vitest';
import { createCohortFromShape } from '@ai/core';
import type { Db } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import { parityDb } from '../../../data/parity-r2-db';
import { curriculumWeeksVM, neighbours, sectionCounts, sectionOf, stepRows, timeOf, weekMoves, weekSections, whoOf } from './program.vm';

const program = (): Db => parityDb('/admin/program');

describe('Program › Curriculum (curriculumWeeksVM)', () => {
  const vm = curriculumWeeksVM(program());

  it('lists the program’s weeks, each with its steps, their time, where it runs and Published or Draft', () => {
    expect(vm.summary).toBe('3 published and 6 in draft. Open a week to build it.');
    expect(vm.rows.map((r) => [r.n, r.title, r.steps, r.time, r.draft])).toEqual([
      [0, 'Foundations', '8 steps', '2 hr 50 min', false],
      [1, 'Where the Money Goes', '7 steps', '2 hr 30 min', false],
      // A `scheduled` week reads Published: "scheduled" is something a cohort says about a week.
      [2, 'Leads That Pay', '7 steps', '2 hr 40 min', false],
      [3, 'Numbers on the 5th', '6 steps', '2 hr 20 min', true],
      [4, 'Protect the Pipeline', '5 steps', '2 hr', true],
      [5, 'Coach from Evidence', '4 steps', '1 hr 30 min', true],
      [6, 'Delegate an Outcome', '3 steps', '1 hr', true],
      [7, 'Make the Workflow Repeatable', 'No steps yet', 'Not built', true],
      [8, 'Sustain and Expand', 'No steps yet', 'Not built', true],
    ]);
    expect(vm.rows[3]!.runs).toEqual([{ cohortId: 'dec26', label: 'December 2026 · Week 3', to: '/admin/cohort/dec26' }]);
    expect(vm.rows.map((r) => r.canPublish)).toEqual([true, true, true, true, true, true, true, false, false]);
  });

  it('lists the cohorts that run it and counts what every week shares, each count the list it opens', () => {
    expect(vm.cohorts).toEqual([{ id: 'dec26', name: 'December 2026 Cohort', line: '8 weeks · opens Sun, Nov 29', to: '/admin/cohort/dec26' }]);
    expect(vm.shared).toEqual({ glossary: 10, words: 5, vault: 7 });
  });

  it('reads a new cohort’s own run, beside December, never December by id', () => {
    const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    const out = createCohortFromShape(
      db,
      { kind: 'staff', staffId: 'st_owner' },
      {
        name: 'January 2027 Cohort',
        start: '2027-01-03',
        sourceCohortId: db.cohorts[0]!.id,
        picks: ['accelerator-week-1', 'accelerator-week-2', 'accelerator-week-4'],
        shape: { setupWeek: true, slots: [{ day: 2, time: '12:00', kind: 'live_build', mins: 90 }], hosts: 'Connor Leiva' },
      },
      { now: Date.parse('2026-11-25T19:00:00Z'), id: (p) => `${p}_jan` },
    );
    const vm2 = curriculumWeeksVM(out.db);
    const w4 = vm2.rows.find((r) => r.id === 'accelerator-week-4')!;
    expect(w4.runs.map((r) => r.label)).toEqual(['December 2026 · Week 4', 'January 2027 · Week 3']);
    expect(vm2.rows.find((r) => r.id === 'accelerator-week-3')!.runs.map((r) => r.label)).toEqual(['December 2026 · Week 3']);
    expect(vm2.cohorts.map((c) => c.line)).toEqual([expect.stringMatching(/^8 weeks/), '3 weeks · opens Sun, Dec 27']);
  });

  it('turns a drag in the weeks list into one-place moves in the whole curriculum', () => {
    const db = program();
    // The prototype's AI Employees sit before the weeks; a week's neighbour is still the next week.
    expect(weekMoves(db, 3, 1)).toEqual({ id: 'accelerator-week-3', dir: -1, times: 2 });
    expect(weekMoves(db, 0, 0)).toBeNull();
  });

  it('formats a week’s time as the mockup does', () => {
    expect([timeOf(0), timeOf(45), timeOf(60), timeOf(150)]).toEqual(['Not built', '45 min', '1 hr', '2 hr 30 min']);
  });
});

describe('Program › a week (the section helpers)', () => {
  const db = program();
  const w1 = db.modules.find((m) => m.id === 'accelerator-week-1')!;
  const w0 = db.modules.find((m) => m.id === 'accelerator-week-0')!;

  it('has six sections, and on the setup week a seventh, Forms; an AI Employee only what it has', () => {
    expect(weekSections(w1)).toEqual(['basics', 'steps', 'page', 'live', 'cards', 'kit']);
    expect(weekSections(w0)).toEqual(['basics', 'steps', 'page', 'live', 'cards', 'kit', 'forms']);
    expect(weekSections(db.modules.find((m) => m.id === 'm1')!)).toEqual(['basics', 'steps', 'kit']);
    expect(sectionOf(w1, null)).toBe('steps');
    expect(sectionOf(w1, 'forms')).toBe('steps');
    expect(sectionOf(w0, 'forms')).toBe('forms');
  });

  it('counts each section for the admin’s cohort', () => {
    expect(sectionCounts(db, w1, 'dec26')).toEqual({ steps: 7, live: 2, cards: 3, kit: 5 });
    expect(sectionCounts(db, w0, 'dec26')).toEqual({ steps: 8, live: 0, cards: 0, kit: 7 });
    expect(sectionCounts(db, w1, null).live).toBe(0);
  });

  it('lists a week’s steps as the mockup does, and its neighbours in the curriculum', () => {
    expect(stepRows(w1)[1]).toEqual({ key: '1', title: 'Join the Live Build', doneWhen: 'Done when: The hire ran once on your own data.', who: ['Owner', 'AI Implementer'], time: '1 hr 30 min' });
    expect(whoOf('Each of you')).toEqual(['Owner', 'AI Implementer']);
    expect(whoOf('')).toEqual([]);
    expect(neighbours(db, 'accelerator-week-1')).toEqual({ prev: 'accelerator-week-0', next: 'accelerator-week-2' });
    expect(neighbours(db, 'accelerator-week-0').prev).toBeNull();
  });
});
