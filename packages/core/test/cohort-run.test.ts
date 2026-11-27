// R-5 (D-254): a cohort owns its run and its shape. Pure, over the production seed (December as the launch seed put
// it, with the release plan's dates). The API runs the same actions through `POST /api/admin/actions/:name`
// (apps/api/test/cohort-run.test.ts), and December's own outputs are `apps/api/test/december.test.ts`'s.
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  ADMIN_ACTIONS,
  addCohortSessions,
  cohortOfPlans,
  cohortRun,
  cohortView,
  createCohortFromShape,
  federalHolidays,
  layOut,
  layoutProblem,
  layoutWarnings,
  meetsLine,
  relayout,
  saveCohortRun,
  saveCohortShape,
  scopeSnapshot,
  sessionKind,
  zonedInputs,
} from '../src';
import { toggleStep } from '../src/mutations';
import type { Actor, CohortSlot, Ctx, Db, Learner } from '../src';
import { ACCELERATOR_MODULE_IDS, COURSE_OPENS_AT, DEFAULT_COHORT_ID, cohortOpensAt } from '../src/accelerator';
import { courseFor, courseSessions, courseWeekModules } from '../src/course';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOW = MT('2026-12-16T10:00:00');
const mkCtx = (now = NOW): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };
const W = ACCELERATOR_MODULE_IDS;

/** December as production has it: the launch seed and the release plan. */
const prod = (): Db => {
  const db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
  db.staff.push({
    id: 'st_editor',
    name: 'Erin Editor',
    email: 'erin@example.test',
    role: 'Content Editor',
    last: null,
  });
  return db;
};

/** Connor's January: six weeks of building, Tuesday live build and Thursday office hours at 12:00 PM MT, Week 1 Sun, Jan 3. */
const JAN_SLOTS: CohortSlot[] = [
  { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
  { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
];
const JAN = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: [W[1]!, W[2]!, W[3]!, W[4]!, W[5]!, W[6]!],
  shape: { setupWeek: true, slots: JAN_SLOTS, hosts: 'Connor Leiva and Spring' },
};

const withJanuary = (db: Db = prod(), now = MT('2026-11-25T12:00:00')): { db: Db; id: string } => {
  const out = createCohortFromShape(db, OWNER, JAN, mkCtx(now));
  expect(out.error).toBeUndefined();
  return { db: out.db, id: out.cohort!.cohortId };
};

const mtLine = (t: number): string => {
  const { date, time } = zonedInputs(t, 'America/Denver');
  return `${new Date(`${date}T12:00:00Z`).toUTCString().slice(0, 3)} ${date} ${time}`;
};

describe('the run, with no stored run, is today’s weeks exactly (December)', () => {
  it('cohortView hands back the same database, and cohortRun is courseWeekModules with their own dates', () => {
    const db = prod();
    expect(cohortView(db, DEFAULT_COHORT_ID)).toBe(db);
    const run = cohortRun(db, DEFAULT_COHORT_ID);
    expect(run.map((w) => w.module)).toEqual(courseWeekModules(db));
    expect(run.map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(run.map((w) => w.opensAt)).toEqual(
      courseWeekModules(db).map((m) => (m.status === 'scheduled' ? m.opens : null)),
    );
    expect(run[0]!.dueAt).toBe(MT('2026-11-30T12:00:00'));
  });

  it('every cohort’s course opens at its first live build, read the same way: December’s is D-153’s instant (R-5 Phase 5)', () => {
    const db = prod();
    // R-5 Phase 5 (D-262, PLAN § 10.10): no December branch. Its first live build, dec26-s1, is D-153's instant.
    expect(cohortOpensAt(DEFAULT_COHORT_ID, db.sessions)).toBe(COURSE_OPENS_AT);
    expect(cohortOpensAt(DEFAULT_COHORT_ID, [])).toBe(Number.POSITIVE_INFINITY);
    const { db: both, id } = withJanuary(db);
    expect(mtLine(cohortOpensAt(id, both.sessions))).toBe('Tue 2027-01-05 12:00');
    expect(cohortOpensAt('none', both.sessions)).toBe(Number.POSITIVE_INFINITY);
  });

  it('December’s sessions keep reading their kind off their id; another cohort’s read their stored kind', () => {
    const db = prod();
    for (const s of db.sessions) expect(sessionKind(s), s.id).toBe(/-oh\d+$/.test(s.id) ? 'office_hours' : 'build');
    expect(sessionKind({ id: 's_x', cohortId: 'c_jan', kind: 'office_hours' })).toBe('office_hours');
    expect(sessionKind({ id: 's_x', cohortId: 'c_jan', kind: 'live_build' })).toBe('build');
    expect(sessionKind({ id: 'dec26-s9', cohortId: DEFAULT_COHORT_ID, kind: 'office_hours' })).toBe('build');
  });
});

describe('laying a shape out (the mockup’s planOf)', () => {
  it('Connor’s January: setup week Sun, Dec 27; 12 sessions; first Tue, Jan 5; last Thu, Feb 11', () => {
    const db = prod();
    const l = layOut(db, {
      start: JAN.start,
      openTime: '12:00',
      tz: 'America/Denver',
      setupWeek: true,
      picks: JAN.picks,
      slots: JAN_SLOTS,
    });
    expect(mtLine(l.setupOpensAt!)).toBe('Sun 2026-12-27 12:00');
    expect(l.weeks.map((w) => [w.n, w.moduleId, w.opensAt === null ? null : mtLine(w.opensAt)])).toEqual([
      [0, W[0], null],
      [1, W[1], 'Sun 2027-01-03 12:00'],
      [2, W[2], 'Sun 2027-01-10 12:00'],
      [3, W[3], 'Sun 2027-01-17 12:00'],
      [4, W[4], 'Sun 2027-01-24 12:00'],
      [5, W[5], 'Sun 2027-01-31 12:00'],
      [6, W[6], 'Sun 2027-02-07 12:00'],
    ]);
    expect(l.sessions).toHaveLength(12);
    expect(mtLine(l.sessions[0]!.start)).toBe('Tue 2027-01-05 12:00');
    expect(mtLine(l.sessions[11]!.start)).toBe('Thu 2027-02-11 12:00');
    const w1 = db.modules.find((m) => m.id === W[1])!;
    expect(l.sessions.slice(0, 2).map((s) => [s.title, s.kind, s.mins])).toEqual([
      [`${w1.course!.title} · Live build`, 'live_build', 90],
      [`${w1.course!.title} · Office hours`, 'office_hours', 60],
    ]);
  });

  it('reports the five Thursdays at the same time as December’s office hours, and nothing else', () => {
    const db = prod();
    const l = layOut(db, { start: JAN.start, setupWeek: true, picks: JAN.picks, slots: JAN_SLOTS });
    const w = layoutWarnings(db, null, l.sessions);
    expect(w.every((x) => x.kind === 'same_time')).toBe(true);
    expect(w.map((x) => (x.kind === 'same_time' ? x.sessionId : ''))).toEqual([
      'dec26-oh4',
      'dec26-oh5',
      'dec26-oh6',
      'dec26-oh7',
      'dec26-oh8',
    ]);
  });

  it('lays December’s own shape out on its first week exactly, and cannot draw its holiday gap (2.4 of the plan)', () => {
    const db = prod();
    const l = layOut(db, {
      start: '2026-11-29',
      setupWeek: true,
      picks: W.slice(1),
      slots: [
        { day: 3, time: '12:00', kind: 'live_build', mins: 90 },
        { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
      ],
    });
    const dec = (id: string) => db.sessions.find((s) => s.id === id)!.start;
    expect(l.sessions[0]!.start).toBe(dec('dec26-s1'));
    expect(l.sessions[1]!.start).toBe(dec('dec26-oh1'));
    // A weekly layout puts Week 4's build on Wed, Dec 23; December's is Wed, Jan 6, after its holiday gap.
    const builds = l.sessions.filter((s) => s.kind === 'live_build');
    expect(mtLine(builds[3]!.start)).toBe('Wed 2026-12-23 12:00');
    expect(builds[3]!.start).not.toBe(dec('dec26-s4'));
  });

  it('names a federal holiday: a Monday slot in the week of Jan 18 falls on Martin Luther King Jr. Day', () => {
    const db = prod();
    const l = layOut(db, {
      start: '2027-01-17',
      setupWeek: false,
      picks: [W[1]!],
      slots: [{ day: 1, time: '09:00', kind: 'other', mins: 60 }],
    });
    expect(l.sessions.map((s) => mtLine(s.start))).toEqual(['Mon 2027-01-18 09:00']);
    expect(l.sessions[0]!.title).toMatch(/ · Working session$/);
    expect(layoutWarnings(db, null, l.sessions)).toEqual([
      {
        kind: 'holiday',
        start: l.sessions[0]!.start,
        title: l.sessions[0]!.title,
        holiday: 'Martin Luther King Jr. Day',
      },
    ]);
  });

  it('one meeting a week, three a week, and no setup week', () => {
    const db = prod();
    const one = layOut(db, { start: JAN.start, setupWeek: false, picks: [W[2]!, W[1]!], slots: [JAN_SLOTS[0]!] });
    expect(one.setupOpensAt).toBeNull();
    expect(one.weeks.map((w) => [w.n, w.moduleId])).toEqual([
      [1, W[1]],
      [2, W[2]],
    ]);
    expect(one.sessions.map((s) => mtLine(s.start))).toEqual(['Tue 2027-01-05 12:00', 'Tue 2027-01-12 12:00']);
    const three = layOut(db, {
      start: JAN.start,
      setupWeek: true,
      picks: [W[1]!],
      slots: [
        { day: 1, time: '10:00', kind: 'live_build', mins: 90 },
        { day: 3, time: '10:00', kind: 'office_hours', mins: 60 },
        { day: 5, time: '10:00', kind: 'other', mins: 45 },
      ],
    });
    expect(three.sessions.map((s) => mtLine(s.start))).toEqual([
      'Mon 2027-01-04 10:00',
      'Wed 2027-01-06 10:00',
      'Fri 2027-01-08 10:00',
    ]);
    expect(meetsLine(three.weeks.length ? JAN_SLOTS : [])).toBe('Tue live build and Thu office hours');
  });

  it('refuses a layout it cannot make, inline', () => {
    const db = prod();
    const base = { start: JAN.start, setupWeek: true, picks: JAN.picks, slots: JAN_SLOTS };
    expect(layoutProblem(db, base)).toBeNull();
    expect(layoutProblem(db, { ...base, start: '2027-13-40' })).toBe('Pick the day Week 1 opens.');
    expect(layoutProblem(db, { ...base, picks: [] })).toBe('Pick at least one week.');
    expect(layoutProblem(db, { ...base, picks: [W[0]!] })).toBe('The setup week is not a week of building.');
    expect(layoutProblem(db, { ...base, picks: ['nope'] })).toBe('No week nope.');
    expect(layoutProblem(db, { ...base, slots: [{ ...JAN_SLOTS[0]!, time: '25:00' }] })).toBe(
      'Pick a time for each meeting.',
    );
    expect(layoutProblem(db, { ...base, slots: [JAN_SLOTS[0]!, JAN_SLOTS[0]!] })).toBe('Two meetings are the same.');
  });

  it('the federal holidays of 2027 and 2028, with the weekday each weekend one is observed', () => {
    const y27 = federalHolidays(2027);
    expect(Object.fromEntries([...y27].sort())).toEqual({
      '2027-01-01': 'New Year’s Day',
      '2027-01-18': 'Martin Luther King Jr. Day',
      '2027-02-15': 'Presidents’ Day',
      '2027-05-31': 'Memorial Day',
      '2027-06-18': 'Juneteenth (observed)',
      '2027-06-19': 'Juneteenth',
      '2027-07-04': 'Independence Day',
      '2027-07-05': 'Independence Day (observed)',
      '2027-09-06': 'Labor Day',
      '2027-10-11': 'Columbus Day',
      '2027-11-11': 'Veterans Day',
      '2027-11-25': 'Thanksgiving Day',
      '2027-12-24': 'Christmas Day (observed)',
      '2027-12-25': 'Christmas Day',
    });
    const y28 = federalHolidays(2028);
    expect([
      y28.get('2028-01-17'),
      y28.get('2028-02-21'),
      y28.get('2028-05-29'),
      y28.get('2028-09-04'),
      y28.get('2028-10-09'),
      y28.get('2028-11-10'),
      y28.get('2028-11-23'),
    ]).toEqual([
      'Martin Luther King Jr. Day',
      'Presidents’ Day',
      'Memorial Day',
      'Labor Day',
      'Columbus Day',
      'Veterans Day (observed)',
      'Thanksgiving Day',
    ]);
    // New Year's Day 2028 is a Saturday: observed Friday, Dec 31, 2027.
    expect(y28.get('2027-12-31')).toBe('New Year’s Day (observed)');
  });
});

describe('which cohort a viewer is in', () => {
  const plan = (p: Partial<{ kind: string; status: string; cohortId: string | null; createdAt: number }>) => ({
    kind: 'cohort',
    status: 'active',
    cohortId: 'c_jan',
    createdAt: 1,
    ...p,
  });
  it('no plan: the default cohort', () => {
    expect(cohortOfPlans([])).toBe(DEFAULT_COHORT_ID);
    expect(cohortOfPlans([plan({ kind: 'membership', cohortId: null })])).toBe(DEFAULT_COHORT_ID);
  });
  it('an ended plan is no cohort', () => {
    expect(cohortOfPlans([plan({ status: 'ended' })])).toBe(DEFAULT_COHORT_ID);
  });
  it('two plans: the newest that has not ended', () => {
    expect(cohortOfPlans([plan({ cohortId: 'dec26', createdAt: 1 }), plan({ cohortId: 'c_jan', createdAt: 2 })])).toBe(
      'c_jan',
    );
    expect(
      cohortOfPlans([
        plan({ cohortId: 'dec26', createdAt: 1 }),
        plan({ cohortId: 'c_jan', createdAt: 2, status: 'ended' }),
      ]),
    ).toBe('dec26');
  });
  it('Q-23 (Connor, Nov 26): the newest purchase decides, whichever cohort starts first and in any order', () => {
    // A January team that then buys December is in December: the purchase decides, not the cohort's dates.
    expect(cohortOfPlans([plan({ cohortId: 'c_jan', createdAt: 1 }), plan({ cohortId: 'dec26', createdAt: 2 })])).toBe('dec26');
    expect(cohortOfPlans([plan({ cohortId: 'dec26', createdAt: 2 }), plan({ cohortId: 'c_jan', createdAt: 1 })])).toBe('dec26');
    // A purchase that is not a cohort seat (a membership) moves no one.
    expect(cohortOfPlans([plan({ cohortId: 'c_jan', createdAt: 1 }), plan({ kind: 'membership', cohortId: null, createdAt: 2 })])).toBe('c_jan');
  });
});

describe('createCohortFromShape: a draft, from a shape, a start day and a source cohort', () => {
  it('copies the source’s seats, zone and default open time, and nothing else, as a draft with its run, shape and sessions', () => {
    const before = prod();
    const out = createCohortFromShape(before, OWNER, JAN, mkCtx(MT('2026-11-25T12:00:00')));
    const id = out.cohort!.cohortId;
    const co = out.db.cohorts.find((c) => c.id === id)!;
    const dec = before.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(co).toMatchObject({
      name: JAN.name,
      status: 'draft',
      capacity: dec.capacity,
      timezone: 'America/Denver',
      defaultOpenTime: '12:00',
      weeks: 6,
      cadence: 'Tue live build and Thu office hours',
    });
    expect(co.course).toBeUndefined();
    expect(co.shape).toEqual({ buildWeeks: 6, setupWeek: true, slots: JAN_SLOTS, hosts: 'Connor Leiva and Spring' });
    expect(mtLine(co.previewOpensAt!)).toBe('Sun 2026-12-27 12:00');
    expect(co.run!.map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const mine = out.db.sessions.filter((s) => s.cohortId === id);
    expect(mine).toHaveLength(12);
    expect(mine.every((s) => s.zoom === '' && s.slot && s.moduleId && s.kind)).toBe(true);
    expect(mine.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // December's rows are the very same.
    expect(out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)).toEqual(dec);
    expect(out.db.sessions.filter((s) => s.cohortId === DEFAULT_COHORT_ID)).toEqual(before.sessions);
    expect(out.db.modules).toEqual(before.modules);
    expect(out.cohort!.warnings.filter((w) => w.kind === 'same_time')).toHaveLength(5);
    expect(out.audit).toMatchObject({
      action: 'cohort.create',
      target: { type: 'cohort', id, label: JAN.name },
      before: null,
    });
    expect(AUDIT_ACTIONS).toContain('cohort.create');
    expect(ADMIN_ACTIONS.createCohortFromShape).toBe(createCohortFromShape);
  });

  it('is the cohorts permission’s, and refuses a name in use, inline', () => {
    expect(() => createCohortFromShape(prod(), EDITOR, JAN, mkCtx())).toThrow();
    const { db } = withJanuary();
    expect(createCohortFromShape(db, OWNER, JAN, mkCtx()).error).toBe('A cohort already has that name.');
  });

  it('January seen through its run: its weeks numbered 1 to 6 on its dates, its own sessions on each week’s pages', () => {
    const { db, id } = withJanuary();
    const view = cohortView(db, id);
    expect(view).not.toBe(db);
    const run = cohortRun(db, id);
    expect(run.map((w) => [w.n, w.module.id])).toEqual([
      [0, W[0]],
      [1, W[1]],
      [2, W[2]],
      [3, W[3]],
      [4, W[4]],
      [5, W[5]],
      [6, W[6]],
    ]);
    expect(run.find((w) => w.n === 3)!.module).toMatchObject({ status: 'scheduled', opens: MT('2027-01-17T12:00:00') });
    const w1 = run.find((w) => w.n === 1)!.module;
    const build = db.sessions.find((s) => s.cohortId === id && s.moduleId === W[1] && s.kind === 'live_build')!;
    expect(w1.course!.liveBuild?.sessionId).toBe(build.id);
    expect(w1.session).toBe(build.n);
    // A course January doesn't take is not on its course; December's view is untouched.
    expect(view.modules.find((m) => m.id === W[7])).toBeUndefined();
    expect(cohortView(db, DEFAULT_COHORT_ID)).toBe(db);
    // With the program's words, January's course reads its own weeks and sessions.
    const words = {
      ...db,
      cohorts: db.cohorts.map((c) =>
        c.id === id ? { ...c, course: db.cohorts.find((x) => x.id === DEFAULT_COHORT_ID)!.course } : c,
      ),
    };
    const course = courseFor(words, MT('2027-01-04T12:00:00'), { open: true, preview: false }, id)!;
    expect(course.weeks.map((w) => [w.week, 'locked' in w])).toEqual([
      [0, false],
      [1, false],
      [2, true],
      [3, true],
      [4, true],
      [5, true],
      [6, true],
    ]);
    expect(courseSessions(words, id).map((s) => s.week)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  it('a December learner’s snapshot is the same with January in the database; a January learner sees only January', () => {
    const db = prod();
    const learner: Learner = {
      id: 'u_dec',
      name: 'Dee',
      email: 'dee@example.test',
      tier: 'team',
      role: 'Team Owner',
      teamId: null,
      cohortId: DEFAULT_COHORT_ID,
      joined: 1,
      last: null,
      status: 'active',
      progress: {},
    };
    db.users.push(learner);
    const before = scopeSnapshot(db, { kind: 'learner', userId: 'u_dec' }, { accelerator: true, at: NOW });
    const { db: both, id } = withJanuary(db);
    const after = scopeSnapshot(both, { kind: 'learner', userId: 'u_dec' }, { accelerator: true, at: NOW });
    expect(after).toEqual(before);
    const withJan = {
      ...both,
      users: [...both.users, { ...learner, id: 'u_jan', email: 'jan@january.example.test', cohortId: id }],
    };
    const jan = scopeSnapshot(
      withJan,
      { kind: 'learner', userId: 'u_jan' },
      { accelerator: true, at: MT('2027-01-11T12:00:00') },
    );
    expect(jan.cohorts.map((c) => c.id)).toEqual([id]);
    expect(jan.sessions.every((s) => s.cohortId === id)).toBe(true);
    expect(jan.modules.filter((m) => m.kind === 'week').map((m) => [m.id, m.status])).toEqual([
      [W[0], 'published'],
      [W[1], 'scheduled'],
      [W[2], 'scheduled'],
      [W[3], 'scheduled'],
      [W[4], 'scheduled'],
      [W[5], 'scheduled'],
      [W[6], 'scheduled'],
    ]);
  });

  it('a January learner cannot mark a step on a week January doesn’t take', () => {
    const { db: both, id } = withJanuary();
    const db = {
      ...both,
      users: [
        ...both.users,
        {
          id: 'u_jan',
          name: 'Jan',
          email: 'jan@january.example.test',
          tier: 'team' as const,
          role: 'Team Owner' as const,
          teamId: null,
          cohortId: id,
          joined: 1,
          last: null,
          status: 'active' as const,
          progress: {},
        },
      ],
    };
    const m7 = db.modules.find((m) => m.id === W[7])!;
    expect(() =>
      toggleStep(
        db,
        { kind: 'learner', userId: 'u_jan' },
        { moduleId: W[7]!, stepId: m7.checklist[0]!.id },
        { ...mkCtx(), course: true },
      ),
    ).toThrow(/No AI Employee/);
  });
});

describe('changing a shape or a run later: only what has not happened', () => {
  it('December has no stored run, so every cohort write refuses it, inline, and writes nothing', () => {
    const db = prod();
    for (const out of [
      saveCohortShape(db, OWNER, { cohortId: DEFAULT_COHORT_ID, picks: JAN.picks, shape: JAN.shape }, mkCtx()),
      saveCohortRun(db, OWNER, { cohortId: DEFAULT_COHORT_ID, weeks: [] }, mkCtx()),
      addCohortSessions(db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx()),
    ]) {
      expect(out.error).toMatch(/still read from the curriculum/);
      expect(out.db).toBe(db);
      expect(out.audit).toBeUndefined();
    }
  });

  it('after Week 1’s sessions: they keep everything, a session edited by hand is left and listed, the rest move', () => {
    const { db, id } = withJanuary();
    // Staff edit Week 2's Thursday by hand: it loses its slot.
    const hand = db.sessions.find((s) => s.cohortId === id && s.moduleId === W[2] && s.kind === 'office_hours')!;
    const edited = {
      ...db,
      sessions: db.sessions.map((s) => (s.id === hand.id ? (({ slot: _slot, ...rest }) => rest)(s) : s)),
    };
    const now = MT('2027-01-08T12:00:00'); // after Week 1's build and office hours
    const out = saveCohortShape(
      edited,
      OWNER,
      {
        cohortId: id,
        picks: JAN.picks,
        shape: { ...JAN.shape, slots: [{ day: 3, time: '12:00', kind: 'live_build', mins: 90 }, JAN_SLOTS[1]!] },
      },
      mkCtx(now),
    );
    expect(out.error).toBeUndefined();
    const mine = out.db.sessions.filter((s) => s.cohortId === id).sort((a, b) => a.start - b.start);
    expect(out.cohort!.left.map((l) => [l.id, l.why]).sort()).toEqual(
      [
        ...edited.sessions.filter((s) => s.cohortId === id && s.moduleId === W[1]).map((s) => [s.id, 'happened']),
        [hand.id, 'by_hand'],
      ].sort(),
    );
    // Week 1 kept its Tuesday; Weeks 2 to 6 build on Wednesday now; the hand-edited Thursday is where it was.
    const builds = mine.filter((s) => s.kind === 'live_build').map((s) => mtLine(s.start));
    expect(builds).toEqual([
      'Tue 2027-01-05 12:00',
      'Wed 2027-01-13 12:00',
      'Wed 2027-01-20 12:00',
      'Wed 2027-01-27 12:00',
      'Wed 2027-02-03 12:00',
      'Wed 2027-02-10 12:00',
    ]);
    expect(out.db.sessions.find((s) => s.id === hand.id)).toEqual(edited.sessions.find((s) => s.id === hand.id));
    // A week that has opened keeps its date.
    expect(out.db.cohorts.find((c) => c.id === id)!.run!.find((w) => w.n === 1)!.opensAt).toBe(
      MT('2027-01-03T12:00:00'),
    );
    expect(out.audit?.action).toBe('cohort.shape_save');
  });

  it('relayout lists what it leaves; a slot whose time has passed is not added again', () => {
    const { db, id } = withJanuary();
    const l = layOut(db, { start: JAN.start, setupWeek: true, picks: JAN.picks, slots: JAN_SLOTS });
    const plan = relayout(db.sessions, id, l, MT('2027-01-06T00:00:00'));
    expect(plan.add).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.update).toEqual([]);
    expect(plan.left.map((x) => x.why)).toEqual(['happened']);
  });

  it('moving one week moves its sessions that have not happened, and nothing else', () => {
    const { db, id } = withJanuary();
    const co = db.cohorts.find((c) => c.id === id)!;
    const weeks = co.run!.map((w) => ({
      moduleId: w.moduleId,
      opens:
        w.opensAt === null ? null : zonedInputs(w.n === 3 ? w.opensAt + 7 * 86_400_000 : w.opensAt, 'America/Denver'),
      due: null,
    }));
    const out = saveCohortRun(db, OWNER, { cohortId: id, weeks }, mkCtx(MT('2026-12-01T12:00:00')));
    expect(out.error).toBeUndefined();
    const moved = (s: { moduleId?: string }) => s.moduleId === W[3];
    for (const s of out.db.sessions.filter((x) => x.cohortId === id)) {
      const was = db.sessions.find((x) => x.id === s.id)!;
      expect(s.start - was.start, s.title).toBe(moved(s) ? 7 * 86_400_000 : 0);
    }
    expect(out.db.cohorts.find((c) => c.id === id)!.run!.find((w) => w.n === 3)!.opensAt).toBe(
      MT('2027-01-24T12:00:00'),
    );
    expect(out.audit?.action).toBe('cohort.run_save');
    // A week that has opened keeps its opening.
    const late = saveCohortRun(
      out.db,
      OWNER,
      {
        cohortId: id,
        weeks: weeks.map((w) => (w.moduleId === W[1] ? { ...w, opens: { date: '2027-01-02', time: '12:00' } } : w)),
      },
      mkCtx(MT('2027-01-04T12:00:00')),
    );
    expect(late.error).toBe('Week 1 has opened, so its opening stays.');
  });

  it('adds the sessions a rhythm is missing, and only those', () => {
    const { db, id } = withJanuary();
    const gone = db.sessions.filter((s) => s.cohortId === id && (s.moduleId === W[5] || s.moduleId === W[6]));
    const without = { ...db, sessions: db.sessions.filter((s) => !gone.includes(s)) };
    const out = addCohortSessions(without, OWNER, { cohortId: id }, mkCtx(MT('2026-12-01T12:00:00')));
    expect(out.error).toBeUndefined();
    const added = out.db.sessions.filter((s) => s.cohortId === id && !without.sessions.includes(s));
    expect(added.map((s) => [s.moduleId, s.slot, s.start])).toEqual(gone.map((s) => [s.moduleId, s.slot, s.start]));
    expect(addCohortSessions(out.db, OWNER, { cohortId: id }, mkCtx(MT('2026-12-01T12:00:00'))).error).toBe(
      'Every week already has its sessions.',
    );
  });
});
