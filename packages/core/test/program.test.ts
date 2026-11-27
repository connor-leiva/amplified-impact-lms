// R-5 Phase 6 (D-265): the program record. Pure, over the production seed (December as the launch seed put it, with the
// release plan's dates and Phase 3's run stored) and Connor's January made by the real admin action.
//
// THE EQUALITY. The data step `2026-11-28-program` copies December's `cohorts.course` onto the program record. Every
// cohort's course words, the course each viewer is handed (`courseFor`, what `GET /api/course` sends), the outline and
// the staff preview must read exactly as they did from December's row, and December's row itself must not move.
import { describe, expect, it } from 'vitest';
import { createCohortFromShape, saveProgramCourse, scopeSnapshot } from '../src';
import { saveModule } from '../src/mutations';
import type { Actor, CohortSlot, Ctx, Db } from '../src';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '../src/accelerator';
import { cohortCourseCopy } from '../src/cohort-learner';
import { previewDb } from '../src/cohort-page';
import { courseFor, courseOutline } from '../src/course';
import { DEFAULT_PROGRAM_ID, programCourse, programIdOf, programOf } from '../src/program';
import { seedProduction } from '../seed/curriculum';
import { planDecemberRunV1 } from '../seed/december-run-v1';
import { PROGRAM_V1, courseReads, planProgramV1, undoProgramV1 } from '../seed/program-v1';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const ctx = (now: number): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}` };
};
const W = ACCELERATOR_MODULE_IDS;
const JAN_SLOTS: CohortSlot[] = [
  { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
  { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
];

/** December as production has it (its run stored by Phase 3's step), and Connor's January made by New cohort. */
function production(): { db: Db; jan: string } {
  const dec = planDecemberRunV1(
    planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db,
  ).db;
  const out = createCohortFromShape(
    dec,
    OWNER,
    {
      name: 'January 2027 Cohort',
      start: '2027-01-03',
      sourceCohortId: DEFAULT_COHORT_ID,
      picks: W.slice(1, 7),
      shape: { setupWeek: true, slots: JAN_SLOTS, hosts: 'Connor Leiva and Spring' },
    },
    ctx(MT('2026-11-25T12:00:00')),
  );
  expect(out.error).toBeUndefined();
  return { db: out.db, jan: out.cohort!.cohortId };
}

/** Everything the course's words reach, for every cohort and viewer kind, as one string. */
function reads(db: Db): string {
  const instants = [
    MT('2026-11-22T12:00:00'),
    MT('2026-11-29T12:00:00'),
    MT('2026-12-02T12:30:00'),
    MT('2026-12-24T12:00:00'),
    MT('2027-02-10T12:00:00'),
  ];
  return JSON.stringify({
    words: courseReads(db),
    course: db.cohorts.flatMap((c) =>
      instants.flatMap((t) => [
        courseFor(db, t, 'staff', c.id),
        courseFor(db, t, { open: true, preview: false }, c.id),
        courseFor(db, t, { open: false, preview: true }, c.id),
        courseFor(previewDb(db, c.id), t, 'staff', c.id),
      ]),
    ),
    outline: db.cohorts.map((c) => courseOutline(db, c.id)),
  });
}

describe('the program record (D-265)', () => {
  it('names the one program, and a cohort with none runs it', () => {
    const { db, jan } = production();
    expect(DEFAULT_PROGRAM_ID).toBe('accelerator');
    expect(programIdOf(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID))).toBe('accelerator');
    // New cohort names its program, its source's.
    expect(db.cohorts.find((c) => c.id === jan)?.programId).toBe('accelerator');
    // December names none: its row is not written.
    expect(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)?.programId).toBeUndefined();
  });

  it('reads December’s row until the program has a copy, then the record', () => {
    const { db, jan } = production();
    const dec = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.course!;
    expect(programOf(db)).toBeNull();
    expect(programCourse(db)).toBe(dec);
    expect(programCourse(db, jan)).toBe(dec);
    const course = structuredClone(dec);
    course.intro.title = 'A program of its own';
    const withRecord: Db = { ...db, programs: [{ id: 'accelerator', name: 'Amplified AI Accelerator', course }] };
    expect(programCourse(withRecord)).toBe(course);
    expect(programCourse(withRecord, jan)).toBe(course);
    expect(cohortCourseCopy(withRecord, jan)?.intro.title).toBe('A program of its own');
    expect(cohortCourseCopy(withRecord, DEFAULT_COHORT_ID)?.intro.title).toBe('A program of its own');
    // A record with no copy yet reads December's row too.
    expect(programCourse({ ...db, programs: [{ id: 'accelerator', name: 'Amplified AI Accelerator' }] })).toBe(dec);
  });

  it('leaves which program a cohort runs out of a learner’s snapshot', () => {
    const { db, jan } = production();
    const withLearner: Db = {
      ...db,
      users: [
        ...db.users,
        {
          id: 'u_jan',
          name: 'Jan Learner',
          email: 'jan@example.com',
          role: 'owner',
          tier: 'team',
          teamId: null,
          cohortId: jan,
          status: 'active',
          joined: 0,
          last: 0,
          progress: {},
        } as unknown as Db['users'][number],
      ],
    };
    const snap = scopeSnapshot(withLearner, { kind: 'learner', userId: 'u_jan' });
    expect(snap.cohorts.map((c) => c.id)).toEqual([jan]);
    expect(snap.cohorts[0]).not.toHaveProperty('programId');
    expect(snap).not.toHaveProperty('programs');
  });
});

describe(`the data step ${PROGRAM_V1} (D-265)`, () => {
  it('copies December’s course onto the program record, and nothing any cohort reads moves', () => {
    const { db } = production();
    const before = reads(db);
    const out = planProgramV1(db);
    expect(out.skipped).toEqual([]);
    expect(out.changes).toEqual([
      {
        target: { type: 'program', id: 'accelerator', label: 'Amplified AI Accelerator' },
        before: null,
        after: { name: 'Amplified AI Accelerator', copiedFrom: 'dec26' },
      },
    ]);
    const p = out.db.programs?.find((x) => x.id === 'accelerator');
    expect(p?.name).toBe('Amplified AI Accelerator');
    // A copy, not a move: December's row keeps its course, and the record holds an equal one, not the same object.
    const dec = out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(dec.course).toEqual(p?.course);
    expect(dec.course).not.toBe(p?.course);
    expect(JSON.stringify(out.db.cohorts)).toBe(JSON.stringify(db.cohorts));
    expect(JSON.stringify(out.db.modules)).toBe(JSON.stringify(db.modules));
    expect(reads(out.db)).toBe(before);
    // Now the record is read: the program's words come from it.
    expect(programCourse(out.db)).toBe(p?.course);
  });

  it('fails the equality when the record would read differently (the sabotage the test must catch)', () => {
    const { db } = production();
    const out = planProgramV1(db);
    const p = out.db.programs![0]!;
    const sabotaged: Db = {
      ...out.db,
      programs: [{ ...p, course: { ...p.course!, intro: { ...p.course!.intro, scope: `${p.course!.intro.scope} ` } } }],
    };
    expect(reads(sabotaged)).not.toBe(reads(db));
    expect(courseReads(sabotaged)).not.toBe(courseReads(db));
  });

  it('runs once, and leaves a database it cannot copy from alone, with the reason', () => {
    const { db } = production();
    const once = planProgramV1(db);
    expect(planProgramV1(once.db)).toEqual({
      db: once.db,
      changes: [],
      skipped: [{ id: 'program.accelerator', reason: 'left as it is: the program record already exists' }],
    });
    const noCourse: Db = {
      ...db,
      cohorts: db.cohorts.map((c) => (c.id === DEFAULT_COHORT_ID ? { ...c, course: undefined } : c)),
    };
    expect(planProgramV1(noCourse).changes).toEqual([]);
    expect(planProgramV1(noCourse).skipped).toEqual([
      { id: 'dec26', reason: 'its row holds no course: nothing to copy' },
    ]);
    expect(planProgramV1({ ...db, cohorts: db.cohorts.filter((c) => c.id !== DEFAULT_COHORT_ID) }).skipped).toEqual([
      { id: 'dec26', reason: 'not in this database' },
    ]);
  });

  it('rolls back: the record goes while it holds what the step wrote, and every read is as before', () => {
    const { db } = production();
    const before = reads(db);
    const once = planProgramV1(db);
    const undone = undoProgramV1(once.db);
    expect(undone.changes).toHaveLength(1);
    expect(undone.db.programs).toBeUndefined();
    expect(reads(undone.db)).toBe(before);
    // Once Course Settings has saved it, the rollback leaves it and says why.
    const course = structuredClone(once.db.programs![0]!.course!);
    course.intro.support = 'Write to support@amplifiedimpact.io.';
    const saved = saveProgramCourse(once.db, OWNER, { programId: 'accelerator', course }, ctx(0));
    expect(saved.error).toBeUndefined();
    expect(undoProgramV1(saved.db)).toEqual({
      db: saved.db,
      changes: [],
      skipped: [
        {
          id: 'program.accelerator',
          reason: 'changed since the step wrote it (Course Settings saved it): left as it is',
        },
      ],
    });
  });
});

describe('saveProgramCourse (D-265)', () => {
  it('saves the program’s words, audited, and leaves December’s row as it is', () => {
    const { db, jan } = production();
    const step = planProgramV1(db).db;
    const course = structuredClone(programCourse(step)!);
    course.intro.support = 'Ask in the Community first.';
    const out = saveProgramCourse(step, OWNER, { programId: 'accelerator', course }, ctx(0));
    expect(out.error).toBeUndefined();
    expect(out.audit).toMatchObject({
      action: 'program.course_save',
      target: { type: 'program', id: 'accelerator', label: 'Amplified AI Accelerator' },
    });
    expect(programCourse(out.db)?.intro.support).toBe('Ask in the Community first.');
    expect(cohortCourseCopy(out.db, jan)?.intro.support).toBe('Ask in the Community first.');
    expect(cohortCourseCopy(out.db, DEFAULT_COHORT_ID)?.intro.support).toBe('Ask in the Community first.');
    expect(JSON.stringify(out.db.cohorts)).toBe(JSON.stringify(step.cohorts));
  });

  it('makes the record from what was saved when the step has not run', () => {
    const { db } = production();
    const course = structuredClone(programCourse(db)!);
    course.intro.instructor = 'Connor Leiva and Spring';
    const out = saveProgramCourse(db, OWNER, { programId: 'accelerator', course }, ctx(0));
    expect(out.error).toBeUndefined();
    expect(out.db.programs).toEqual([
      {
        id: 'accelerator',
        name: 'Amplified AI Accelerator',
        course: expect.objectContaining({ intro: expect.objectContaining({ instructor: 'Connor Leiva and Spring' }) }),
      },
    ]);
    expect(out.db.cohorts).toBe(db.cohorts);
  });

  it('keeps the rules saveCohortCourse has: a community link, the permission, a program that exists', () => {
    const { db } = production();
    const course = structuredClone(programCourse(db)!);
    course.intro.community = 'javascript:alert(1)';
    expect(saveProgramCourse(db, OWNER, { programId: 'accelerator', course }, ctx(0)).error).toBe(
      'A community link is a web address that starts with https://.',
    );
    expect(() => saveProgramCourse(db, OWNER, { programId: 'nope', course: programCourse(db)! }, ctx(0))).toThrow(
      'No such program',
    );
    const support: Db = {
      ...db,
      staff: [
        ...db.staff,
        { id: 'st_support', name: 'Sam Support', email: 'sam@example.com', role: 'Support', last: null },
      ],
    };
    expect(() =>
      saveProgramCourse(
        support,
        { kind: 'staff', staffId: 'st_support' },
        { programId: 'accelerator', course: programCourse(db)! },
        ctx(0),
      ),
    ).toThrow();
  });
});

describe('a course week’s dates are its cohorts’ (D-265, #278’s open item)', () => {
  it('a module save keeps a course week’s stored Opens and Due, whatever the draft says', () => {
    const { db } = production();
    const w0 = db.modules.find((m) => m.id === W[0])!;
    const draft = {
      ...structuredClone(w0),
      dueAt: MT('2027-03-01T12:00:00'),
      opens: MT('2027-03-01T12:00:00'),
      outcome: `${w0.outcome}`,
    };
    const out = saveModule(db, OWNER, { draft }, ctx(0));
    expect(out.error).toBeUndefined();
    const saved = out.db.modules.find((m) => m.id === W[0])!;
    expect(saved.dueAt).toBe(w0.dueAt);
    expect(saved.opens).toBe(w0.status === 'published' ? null : w0.opens);
    // A module that is not a course week keeps what it is given, as before.
    const other = { ...structuredClone(w0), id: 'm_copy', opens: MT('2027-03-01T12:00:00'), status: 'draft' as const };
    expect(saveModule(out.db, OWNER, { draft: other }, ctx(0)).db.modules.find((m) => m.id === 'm_copy')?.opens).toBe(
      MT('2027-03-01T12:00:00'),
    );
  });
});
