// R-5 Phase 4 (D-260): the learner side reads its own cohort. Pure, over the production seed (December as the launch
// seed put it, with the release plan's dates) and Connor's January made by the real admin action.
//
// THE OVERLAP WITH PHASE 3. Phase 3 writes December's run with a one-time data step, from its modules' own `opens`,
// `due_at` and week numbers, after which `cohortView(db, 'dec26')` is no longer the very same object. Every December
// output this phase adds is checked twice here: with December's run absent (main today) and with that run stored
// (`withDecemberRun`, built the way the data step builds it), and must be identical.
import { describe, expect, it } from 'vitest';
import { cohortLine, createCohortFromShape, scopeSnapshot, setViewerZone } from '../src';
import type { Actor, Announcement, CohortSlot, CohortWeek, Ctx, Db, Learner } from '../src';
import type { CohortCourse } from '../src/course-types';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID, isCourseWeek } from '../src/accelerator';
import {
  DEFAULT_WEEK0_LABEL,
  FIRST_LIVE_BUILD_NONE,
  FIRST_LIVE_BUILD_TOKEN,
  announcementInCohort,
  cohortCourseCopy,
  firstLiveBuildDay,
  ghlCohortValue,
  nextMeetingDay,
  programCourse,
  week0CohortLabel,
  weekModuleId,
  weekOfModuleIn,
} from '../src/cohort-learner';
import { courseFor, courseFromSnapshot, courseOutline, courseSessions } from '../src/course';
import { cohortOfViewer, progressOn, weekModuleOf } from '../src/learner';
import { accessibleSessions } from '../src/sessions';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const W = ACCELERATOR_MODULE_IDS;
const ctx = (now: number): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}` };
};

const prod = (): Db => planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;

/**
 * December's run, as Phase 3's data step writes it: every course week module of December, by its own week number,
 * opening and due date (PLAN.md, Phase notes: "built from its modules' `opens`, `due_at` and week numbers").
 */
function decemberRun(db: Db): CohortWeek[] {
  return db.modules
    .filter((m) => m.kind === 'week' && m.course !== undefined && isCourseWeek(m.id))
    .sort((a, b) => a.course!.week - b.course!.week)
    .map((m) => ({ moduleId: m.id, n: m.course!.week, opensAt: m.opens, dueAt: m.dueAt ?? null }));
}

const withDecemberRun = (db: Db): Db => {
  const next = structuredClone(db);
  const dec = next.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
  dec.run = decemberRun(db);
  return next;
};

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
const NOV25 = MT('2026-11-25T12:00:00');

/** Connor's January in December's database, made the way staff make it. */
function withJanuary(db: Db = prod(), args: Partial<typeof JAN> = {}): { db: Db; id: string } {
  const out = createCohortFromShape(db, OWNER, { ...JAN, ...args }, ctx(NOV25));
  expect(out.error).toBeUndefined();
  return { db: out.db, id: out.cohort!.cohortId };
}

/** A learner of a cohort, with progress on two weeks. */
const learner = (id: string, cohortId: string): Learner => ({
  id,
  name: id,
  email: `${id}@example.test`,
  tier: 'team',
  role: 'Team Owner',
  teamId: null,
  cohortId,
  joined: NOV25,
  last: null,
  status: 'active',
  progress: {
    [W[3]!]: { steps: ['a'], builtAt: null, deployedAt: null, runtime: null },
    [W[4]!]: { steps: ['b'], builtAt: null, deployedAt: null, runtime: null },
  },
});

const INSTANTS = [MT('2026-11-24T10:00:00'), MT('2026-12-02T12:30:00'), MT('2026-12-27T10:00:00'), MT('2027-02-10T12:00:00')];

describe('December reads the same, with no stored run and with the run Phase 3’s data step writes', () => {
  const plain = prod();
  const stored = withDecemberRun(plain);
  const dec = (db: Db) => db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;

  it('the run the data step writes is December’s nine weeks, numbered 0 to 8, on their own dates', () => {
    const run = dec(stored).run!;
    expect(run.map((w) => [w.moduleId, w.n])).toEqual(W.map((id, n) => [id, n]));
    expect(run[0]).toMatchObject({ opensAt: null, dueAt: MT('2026-11-30T12:00:00') });
    expect(run[1]!.opensAt).toBe(MT('2026-11-29T12:00:00'));
  });

  it('which module is week N, and which week a module is', () => {
    for (const db of [plain, stored]) {
      for (let n = 0; n <= 8; n++) expect(weekModuleId(dec(db), n), `week ${n}`).toBe(W[n]);
      for (const id of W) expect(weekOfModuleIn(dec(db), id), id).toBe(Number(id.split('-').pop()));
      expect(weekOfModuleIn(dec(db), 'sales')).toBeNull();
      expect(weekModuleOf(db, 3, dec(db))?.id).toBe(W[3]);
      expect(progressOn(learner('u', DEFAULT_COHORT_ID), 3, dec(db))?.steps).toEqual(['a']);
    }
    // With no cohort at all (staff previewing), the curriculum's ids, as today.
    expect(weekModuleId(undefined, 5)).toBe(W[5]);
  });

  it('the course’s words are December’s own row, the very same object, and nothing is filled in', () => {
    expect(cohortCourseCopy(plain, DEFAULT_COHORT_ID)).toBe(dec(plain).course);
    expect(cohortCourseCopy(stored, DEFAULT_COHORT_ID)).toBe(dec(stored).course);
    expect(JSON.stringify(dec(plain).course)).not.toContain(FIRST_LIVE_BUILD_TOKEN);
  });

  it('GET /api/course, the outline and the course’s sessions, for staff and a learner at every instant', () => {
    for (const t of INSTANTS) {
      for (const entry of ['staff', { open: true, preview: false }, { open: true, preview: true }] as const) {
        expect(courseFor(stored, t, entry, DEFAULT_COHORT_ID), `${t} ${JSON.stringify(entry)}`).toEqual(
          courseFor(plain, t, entry, DEFAULT_COHORT_ID),
        );
      }
    }
    expect(courseOutline(stored, DEFAULT_COHORT_ID)).toEqual(courseOutline(plain, DEFAULT_COHORT_ID));
    expect(courseSessions(stored, DEFAULT_COHORT_ID)).toEqual(courseSessions(plain, DEFAULT_COHORT_ID));
    expect(courseFromSnapshot(stored, DEFAULT_COHORT_ID)).toEqual(courseFromSnapshot(plain, DEFAULT_COHORT_ID));
  });

  it('the first live build, GoHighLevel’s Cohort field, the Week 0 subject and the digest’s day', () => {
    for (const db of [plain, stored]) {
      expect(firstLiveBuildDay(dec(db), db.sessions)).toBe('Wed, Dec 2');
      expect(ghlCohortValue(dec(db))).toBe('dec26');
      expect(nextMeetingDay(dec(db), db.sessions, NOV25)).toBe('Wednesday');
    }
    // December's id is what GoHighLevel holds, and it is December's own month and year too.
    expect(ghlCohortValue({ ...dec(plain), id: 'c_x' })).toBe('dec26');
    // Connor's approved line names December as December's own name says it, without the program or the year.
    expect(dec(plain).name).toBe('Amplified AI Accelerator · December 2026');
    expect(week0CohortLabel(dec(plain).name)).toBe(DEFAULT_WEEK0_LABEL);
    expect(week0CohortLabel('December 2026')).toBe(DEFAULT_WEEK0_LABEL);
  });

  it('a December learner’s snapshot and sessions', () => {
    for (const db of [plain, stored]) {
      const me = learner('u_dec', DEFAULT_COHORT_ID);
      const both = { ...db, users: [me] };
      expect(accessibleSessions(both, me).every((s) => s.cohortId === DEFAULT_COHORT_ID)).toBe(true);
      expect(accessibleSessions(both, me)).toHaveLength(16);
    }
    const snap = (db: Db) => scopeSnapshot({ ...db, users: [learner('u_dec', DEFAULT_COHORT_ID)] }, { kind: 'learner', userId: 'u_dec' }, { accelerator: true, at: INSTANTS[1]! });
    const a = snap(plain);
    const b = snap(stored);
    expect(b.modules).toEqual(a.modules);
    expect(b.sessions).toEqual(a.sessions);
    expect(b.announcements).toEqual(a.announcements);
  });
});

describe('a cohort with a run of its own (January)', () => {
  it('its weeks are numbered 1 to N in its own run, whatever their place in the curriculum', () => {
    const { db, id } = withJanuary(prod(), { name: 'Odd Weeks 2027', picks: [W[1]!, W[2]!, W[4]!, W[5]!, W[7]!, W[8]!] });
    const co = db.cohorts.find((c) => c.id === id)!;
    expect(weekModuleId(co, 0)).toBe(W[0]);
    expect(weekModuleId(co, 3)).toBe(W[4]);
    expect(weekModuleId(co, 6)).toBe(W[8]);
    expect(weekModuleId(co, 7)).toBeNull();
    expect(weekOfModuleIn(co, W[7]!)).toBe(5);
    expect(weekOfModuleIn(co, W[3]!)).toBeNull();
    // The learner portal's lookups by week number, through the run.
    const me = learner('u_odd', id);
    expect(weekModuleOf(db, 3, cohortOfViewer({ cohorts: db.cohorts }, me))?.id).toBe(W[4]);
    expect(progressOn(me, 3, co)?.steps).toEqual(['b']);
    expect(progressOn(me, 4, co)).toBeUndefined();
    // GET /api/course numbers them so: its third week is the curriculum's fourth.
    const course = courseFor(db, NOV25, 'staff', id)!;
    expect(course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const w4 = db.modules.find((m) => m.id === W[4])!;
    expect(course.weeks[3]!.title).toBe(w4.course!.title);
  });

  it('January’s course is no longer a 503: the program’s words, with its own three once it stores them', () => {
    const made = withJanuary();
    const db = structuredClone(made.db);
    const id = made.id;
    const program = programCourse(db)!;
    // A cohort that stores no words reads the program's (PLAN § 10.3: a new cohort's words start as December's).
    expect(cohortCourseCopy(db, id)).toBe(program);
    expect(courseFor(db, NOV25, 'staff', id)).not.toBeNull();

    const jan = db.cohorts.find((c) => c.id === id)!;
    jan.course = {
      intro: { sub: 'Six weeks. One hire a week.', how: ['A week opens on Sunday.'], holiday: '' },
    } as unknown as CohortCourse;
    const words = cohortCourseCopy(db, id)!;
    expect(words.intro.sub).toBe('Six weeks. One hire a week.');
    expect(words.intro.how).toEqual(['A week opens on Sunday.']);
    expect(words.intro.holiday).toBe('');
    // Everything else is the program's.
    expect({ ...words, intro: { ...words.intro, sub: '', how: [], holiday: '' } }).toEqual({
      ...program,
      intro: { ...program.intro, sub: '', how: [], holiday: '' },
    });
    // And December's are untouched.
    expect(cohortCourseCopy(db, DEFAULT_COHORT_ID)).toBe(program);
    expect(cohortCourseCopy(db, 'no-such-cohort')).toBeNull();
  });

  it('{first live build} is filled from each viewer’s own cohort, and is the only token', () => {
    const made = withJanuary();
    const db = structuredClone(made.db);
    const id = made.id;
    const program = programCourse(db)!;
    program.before.intake = [`Fill in the intake before ${FIRST_LIVE_BUILD_TOKEN}.`, ...program.before.intake.slice(1)];
    expect(cohortCourseCopy(db, DEFAULT_COHORT_ID)!.before.intake[0]).toBe('Fill in the intake before Wed, Dec 2.');
    expect(cohortCourseCopy(db, id)!.before.intake[0]).toBe('Fill in the intake before Tue, Jan 5.');
    // No other brace is touched.
    program.intro.scope = 'Bring {weeks of building} hires.';
    expect(cohortCourseCopy(db, id)!.intro.scope).toBe('Bring {weeks of building} hires.');
    // A cohort with no live build: its first session; with none at all, the mockup's words.
    expect(firstLiveBuildDay({ id: 'c_none', timezone: 'America/Denver' }, [])).toBe(FIRST_LIVE_BUILD_NONE);
    expect(firstLiveBuildDay({ id: 'c_oh', timezone: 'America/Denver' }, [{ cohortId: 'c_oh', start: MT('2027-01-07T12:00:00'), kind: 'office_hours' }])).toBe('Thu, Jan 7');
  });

  it('GoHighLevel’s Cohort field: its month and two-digit year, in its zone', () => {
    const { db, id } = withJanuary();
    const jan = db.cohorts.find((c) => c.id === id)!;
    expect(ghlCohortValue(jan)).toBe('jan27');
    // The start in the cohort's zone decides: 11:00 PM MT on Jan 31 is Feb 1 in UTC.
    expect(ghlCohortValue({ id: 'c_x', start: MT('2027-01-31T23:00:00'), timezone: 'America/Denver' })).toBe('jan27');
    expect(ghlCohortValue(null)).toBe('dec26');
  });

  it('the sidebar’s cohort line keeps a name’s noun once: “January 2027 Cohort”, December’s as before', () => {
    const { db, id } = withJanuary();
    setViewerZone('America/Denver');
    try {
      expect(cohortLine(db.cohorts.find((c) => c.id === id)!, NOV25, db.sessions)).toBe('January 2027 Cohort · Starts Jan 3');
      expect(cohortLine(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!, NOV25, db.sessions)).toBe(
        'Amplified AI Accelerator · December 2026 Cohort · Starts Dec 2',
      );
    } finally {
      setViewerZone(null);
    }
  });

  it('the Week 0 subject’s cohort, without its year', () => {
    expect(week0CohortLabel('January 2027 Cohort')).toBe('January Cohort');
    expect(week0CohortLabel('Amplified AI Accelerator · January 2027')).toBe('January Cohort');
    expect(week0CohortLabel('Spring Pilot')).toBe('Spring Pilot Cohort');
  });

  it('the weekly digest names its next meeting’s day, or none', () => {
    const { db, id } = withJanuary();
    const jan = db.cohorts.find((c) => c.id === id)!;
    expect(nextMeetingDay(jan, db.sessions, NOV25)).toBe('Tuesday');
    // After a Tuesday build, the next build is the next Tuesday.
    expect(nextMeetingDay(jan, db.sessions, MT('2027-01-05T14:00:00'))).toBe('Tuesday');
    // Office hours only: Thursday. After the last session: none.
    const oh = db.sessions.filter((s) => s.cohortId === id && s.kind === 'office_hours');
    expect(nextMeetingDay(jan, oh, NOV25)).toBe('Thursday');
    expect(nextMeetingDay(jan, db.sessions, MT('2027-02-12T12:00:00'))).toBeNull();
  });

  it('a session’s announcement is its cohort’s; one about no session is everyone’s, as today', () => {
    const { db, id } = withJanuary();
    const janSession = db.sessions.find((s) => s.cohortId === id)!;
    const a = (sessionId?: string): Announcement => ({
      id: `a_${sessionId ?? 'none'}`,
      ...(sessionId ? { sessionId } : {}),
      title: 'T',
      body: 'B',
      severity: 'info',
      action: null,
      actionLabel: '',
      audience: 'all',
      channels: ['inapp'],
      status: 'sent',
      at: NOV25,
      opens: null,
    });
    expect(announcementInCohort(a(janSession.id), db.sessions, id)).toBe(true);
    expect(announcementInCohort(a(janSession.id), db.sessions, DEFAULT_COHORT_ID)).toBe(false);
    expect(announcementInCohort(a('dec26-s1'), db.sessions, id)).toBe(false);
    expect(announcementInCohort(a('dec26-s1'), db.sessions, DEFAULT_COHORT_ID)).toBe(true);
    expect(announcementInCohort(a(), db.sessions, id)).toBe(true);
    expect(announcementInCohort(a('gone'), db.sessions, id)).toBe(true);

    // Through the snapshot: each learner reads their own cohort's.
    const both: Db = {
      ...db,
      users: [learner('u_dec', DEFAULT_COHORT_ID), learner('u_jan', id)],
      announcements: [a(janSession.id), a('dec26-s1'), a()],
    };
    const ids = (userId: string) =>
      scopeSnapshot(both, { kind: 'learner', userId }, { accelerator: true, at: NOV25 }).announcements.map((x) => x.id);
    expect(ids('u_dec')).toEqual(['a_dec26-s1', 'a_none']);
    expect(ids('u_jan')).toEqual([`a_${janSession.id}`, 'a_none']);
  });

  it('a learner’s sessions are their own cohort’s; no learner, none', () => {
    const { db, id } = withJanuary();
    const jan = learner('u_jan', id);
    const dec = learner('u_dec', DEFAULT_COHORT_ID);
    const all = { ...db, users: [jan, dec] };
    expect(accessibleSessions(all, jan).every((s) => s.cohortId === id)).toBe(true);
    expect(accessibleSessions(all, jan)).toHaveLength(12);
    expect(accessibleSessions(all, dec).every((s) => s.cohortId === DEFAULT_COHORT_ID)).toBe(true);
    expect(accessibleSessions(all, null)).toEqual([]);
  });
});
