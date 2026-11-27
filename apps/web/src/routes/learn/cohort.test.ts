// R-5 Phase 4 (D-261): the learner portal reads its own cohort. A cohort whose run numbers the curriculum's weeks its
// own way (its Week 3 is the curriculum's Week 4) shows that numbering everywhere a week's number turns into a module:
// the week rows and their progress, an old `/employees/:id` address, and the replays; its Schedule's calendar file,
// the vault's lock and the course's next opening are its own. December's are as before.
//
// The learner's snapshot carries no run (D-255, `cohortForLearner`): the numbering comes from the course and the
// snapshot's own weeks (`viewWeekModules`, `viewWeekOf`), and these tests would fail if it fell back to the curriculum's
// `accelerator-week-N`, since this cohort skips the curriculum's Weeks 3 and 6.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCohortFromShape, setViewerZone } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID, acceleratorModuleId } from '@ai/core/accelerator';
import { courseFor, courseSessions } from '@ai/core/course';
import { cohortOfViewer, learnerOf } from '@ai/core/learner';
import { scopeSnapshot } from '@ai/core/scope';
import { SCHEDULE_ICS_PATH } from '@ai/core/schedule';
import type { CoursePayload } from '../course/Course.vm';
import { nextOpening } from './data';
import { courseOpensAtFor, navVM, weekRows } from './learn.vm';
import { learnerPathFor, weekOfModule } from './redirects';
import { weekLiveVM, weekSource } from './Replay.vm';
import { scheduleVM } from './Schedule.vm';
import { LEARNER_ID, deployed, learnState } from './test/fixture';

const W = ACCELERATOR_MODULE_IDS;
const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV25 = MT('2026-11-25T12:00:00');

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

/** A cohort that takes Weeks 1, 2, 4, 5, 7 and 8, Tuesday builds from Sun, Jan 3, and a learner in it, in the preview. */
function oddWeeks(): { now: number; payload: CoursePayload; db: Db; me: Learner; cohortId: string } {
  const made = createCohortFromShape(
    deployed(),
    { kind: 'staff', staffId: 'st_owner' },
    {
      name: 'Odd Weeks 2027',
      start: '2027-01-03',
      sourceCohortId: DEFAULT_COHORT_ID,
      picks: [W[1]!, W[2]!, W[4]!, W[5]!, W[7]!, W[8]!],
      shape: { setupWeek: true, slots: [{ day: 2, time: '12:00', kind: 'live_build', mins: 90 }], hosts: '' },
    },
    { now: NOV25, id: ((n) => (p: string) => `${p}_o${n++}`)(1) },
  );
  expect(made.error).toBeUndefined();
  const cohortId = made.cohort!.cohortId;
  const d = structuredClone(made.db);
  const me: Learner = {
    id: LEARNER_ID,
    name: 'Dana Ross',
    email: 'dana@example.com',
    tier: 'team',
    role: 'Team Owner',
    teamId: null,
    cohortId,
    joined: 0,
    last: null,
    status: 'active',
    progress: { [W[4]!]: { steps: [d.modules.find((m) => m.id === W[4])!.checklist[0]!.id], builtAt: null, deployedAt: null, runtime: null } },
  };
  d.users.push(me);
  const now = NOV25;
  const payload: CoursePayload = {
    open: true,
    preview: false,
    prelaunch: true,
    // Every week whole, as the test account's early access opens them (`early`), so each week's steps line up.
    course: courseFor(d, now, 'staff', cohortId)!,
    sessions: courseSessions(d, cohortId),
    copy: Object.fromEntries((d.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
  };
  const db = scopeSnapshot(d, { kind: 'learner', userId: LEARNER_ID }, { accelerator: true, at: now, early: true });
  return { now, payload, db, me: learnerOf(db, LEARNER_ID)!, cohortId };
}

describe('a learner in a cohort with its own run', () => {
  it('a week’s module is the cohort’s week N: its Week 3 is the curriculum’s Week 4, with its progress', () => {
    const { payload, db, me } = oddWeeks();
    const rows = weekRows(payload, db, me);
    expect(rows.map((r) => [r.week, r.moduleId])).toEqual([
      [0, W[0]],
      [1, W[1]],
      [2, W[2]],
      [3, W[4]],
      [4, W[5]],
      [5, W[7]],
      [6, W[8]],
    ]);
    expect(rows[3]!.module?.id).toBe(W[4]);
    expect(rows[3]!.done).toBe(1);
    expect(rows[4]!.done).toBe(0);
    // The run is not in the snapshot, and the curriculum's ids would be wrong here: the numbering is the view's.
    expect(db.cohorts[0]).not.toHaveProperty('run');
    expect(rows[3]!.moduleId).not.toBe(acceleratorModuleId(3));
  });

  it('an old /employees address goes to the week the cohort numbers it, and a week it doesn’t take goes Home', () => {
    const { db } = oddWeeks();
    expect(learnerPathFor('/employees/accelerator-week-4', db.modules)).toBe('/learn/week/3');
    expect(learnerPathFor('/employees/accelerator-week-8', db.modules)).toBe('/learn/week/6');
    expect(learnerPathFor('/employees/accelerator-week-3', db.modules)).toBe('/learn');
    expect(weekOfModule(W[7]!, db.modules)).toBe('/learn/week/5');
    // December's learner: the curriculum's numbers, as before; and with no course weeks given, the same.
    const dec = learnState(NOV25, true, { 0: ['c1'] });
    expect(learnerPathFor('/employees/accelerator-week-3', dec.db.modules)).toBe('/learn/week/3');
    expect(learnerPathFor('/employees/accelerator-week-3')).toBe('/learn/week/3');
  });

  it('its Schedule’s “Add all to calendar” is its own file; December’s is the welcome page’s, as before', () => {
    const { payload, db, me, now, cohortId } = oddWeeks();
    const rows = weekRows(payload, db, me);
    expect(scheduleVM(payload, rows, cohortOfViewer(db, me), 'weeks', now).addAll?.href).toBe(`${SCHEDULE_ICS_PATH}?cohort=${cohortId}`);
    const dec = learnState(NOV25, true, { 0: ['c1'] });
    const decMe = learnerOf(dec.db, LEARNER_ID);
    const decRows = weekRows(dec.payload, dec.db, decMe);
    expect(scheduleVM(dec.payload, decRows, cohortOfViewer(dec.db, decMe), 'weeks', NOV25).addAll?.href).toBe(SCHEDULE_ICS_PATH);
  });

  it('the vault’s lock and the preview’s end are its own first live build; December’s stay Wed, Dec 2', () => {
    const { payload, db, me, now } = oddWeeks();
    const opensAt = courseOpensAtFor(db, me);
    expect(opensAt).toBe(MT('2027-01-05T12:00:00'));
    expect(navVM(payload, weekRows(payload, db, me), '/learn', [], opensAt).vault).toMatchObject({ locked: true, title: 'Opens Tue, Jan 5 · 12:00 PM MT' });
    // Every week is whole here (early access), so the next opening is the preview's end: its own first live build.
    expect(nextOpening({ kind: 'ready', payload }, now, opensAt)).toBe(MT('2027-01-05T12:00:00'));
    expect(nextOpening({ kind: 'ready', payload }, now)).toBe(MT('2026-12-02T12:00:00'));
    const dec = learnState(NOV25, true, { 0: ['c1'] });
    const decMe = learnerOf(dec.db, LEARNER_ID);
    expect(courseOpensAtFor(dec.db, decMe)).toBe(MT('2026-12-02T12:00:00'));
    expect(navVM(dec.payload, weekRows(dec.payload, dec.db, decMe), '/learn', [], courseOpensAtFor(dec.db, decMe)).vault.title).toBe('Opens Wed, Dec 2 · 12:00 PM MT');
  });
});

describe('no fallback to December', () => {
  it('a viewer with no learner row reads no cohort’s replay, unless the preview names its cohort', () => {
    const at = MT('2026-12-04T12:00:00');
    const { payload, db } = learnState(at, false, {}, 15, (d) => {
      const s = d.sessions.find((x) => x.id === 'dec26-s1')!;
      Object.assign(s, { replay: 'ready', replayUrl: 'https://replay.example/dec26-s1', replayVisibility: 'published' });
    });
    const staffDb = { ...db, users: [] } as Db;
    const m = db.modules.find((x) => x.id === W[1])!;
    expect(weekSource({ db: staffDb, me: null }, m)).toBeNull();
    expect(weekSource({ db: staffDb, me: null, cohortId: DEFAULT_COHORT_ID }, m)).not.toBeNull();
    const rows = weekRows(payload, staffDb, null);
    expect(weekLiveVM(payload, rows, { db: staffDb, me: null }, 1, at)).toBeNull();
    expect(weekLiveVM(payload, rows, { db: staffDb, me: null, cohortId: DEFAULT_COHORT_ID }, 1, at)).toMatchObject({ kind: 'replay' });
  });
});
