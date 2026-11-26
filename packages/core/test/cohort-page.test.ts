// R-5 Phase 3 (D-255): the Cohort page's logic and its writes, pure, over the production seed. December's run data step
// is here too; its before-and-after equality test over every December output is `apps/api/test/december.test.ts`.
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACTIONS,
  AUDIT_ACTIONS,
  DERIVED_SHAPE,
  INCLUDED_FROZEN,
  beforeItOpens,
  cohortRun,
  cohortShapeOf,
  cohortStatusWord,
  cohortView,
  cohortWordsOf,
  createCohortFromShape,
  fmt,
  includedDefault,
  includedUntilAt,
  keepCohortOverlap,
  openEnrollmentRefusal,
  previewDb,
  saveCohortHosts,
  saveCohortIncluded,
  saveCohortRun,
  saveCohortShape,
  saveCohortWords,
  scopeSnapshot,
  shapeLine,
  slotLine,
  weekOpensLine,
  zonedInputs,
} from '../src';
import type { Actor, CohortSlot, Ctx, Db } from '../src';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '../src/accelerator';
import { courseFor } from '../src/course';
import { seedProduction } from '../seed/curriculum';
import { planContentV2 } from '../seed/content-v2';
import { DECEMBER_RUN_V1, decemberRunOf, planDecemberRunV1, undoDecemberRunV1 } from '../seed/december-run-v1';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const mkCtx = (now = MT('2026-11-25T12:00:00')): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };
const W = ACCELERATOR_MODULE_IDS;

/** December as production has it: the launch seed, the release plan, and Weeks 0 to 3's sessions (D-176). */
const prod = (): Db => {
  const db = planContentV2(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db;
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  return db;
};
/** And its run, written by the data step. */
const withRun = (): Db => planDecemberRunV1(prod()).db;

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
const withJanuary = (db: Db = withRun()): { db: Db; id: string } => {
  const out = createCohortFromShape(db, OWNER, JAN, mkCtx());
  expect(out.error).toBeUndefined();
  return { db: out.db, id: out.cohort!.cohortId };
};
const day = (t: number): string => zonedInputs(t, 'America/Denver').date;

describe('December’s run, written once by a data step (the one December rewrite)', () => {
  it('writes the run from its modules, and the cohort’s view is every week module exactly as it was', () => {
    const before = prod();
    const out = planDecemberRunV1(before);
    expect(DECEMBER_RUN_V1).toBe('2026-11-26-december-run');
    expect(out.skipped).toEqual([]);
    expect(out.changes).toHaveLength(1);
    const run = out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.run!;
    expect(run.map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(run[0]).toMatchObject({ moduleId: W[0], opensAt: null });
    expect(run[0]!.dueAt).toBe(before.modules.find((m) => m.id === W[0])!.dueAt);
    expect(run[1]!.opensAt).toBe(MT('2026-11-29T12:00:00'));
    // Nothing December reads moves: the view is the modules, field for field and key for key.
    const view = cohortView(out.db, DEFAULT_COHORT_ID);
    expect(view).not.toBe(out.db);
    for (const m of before.modules) expect(JSON.stringify(view.modules.find((x) => x.id === m.id))).toBe(JSON.stringify(m));
    expect(cohortRun(out.db, DEFAULT_COHORT_ID)).toEqual(cohortRun(before, DEFAULT_COHORT_ID));
    expect(courseFor(out.db, MT('2026-12-02T12:30:00'), 'staff')).toEqual(courseFor(before, MT('2026-12-02T12:30:00'), 'staff'));
    // The modules keep their own dates; nothing else on the cohort moves.
    expect(out.db.modules).toBe(before.modules);
    expect(out.db.sessions).toBe(before.sessions);
  });

  it('reads Weeks 2 and 3’s office hours page as Friday’s office hours, not Thursday’s goal planning', () => {
    const db = withRun();
    const week2 = cohortView(db, DEFAULT_COHORT_ID).modules.find((m) => m.id === W[2])!;
    expect(week2.course!.officeHours!.sessionId).toBe('dec26-fri-oh2');
    expect(week2.course!.liveBuild!.sessionId).toBe('dec26-s2');
  });

  it('runs once: a cohort with a run is left alone', () => {
    const once = withRun();
    const twice = planDecemberRunV1(once);
    expect(twice.changes).toEqual([]);
    expect(twice.skipped).toEqual([{ id: DEFAULT_COHORT_ID, reason: 'its run is already written' }]);
    expect(twice.db).toBe(once);
  });

  it('writes nothing where the run would move a week (a staff edit it can’t reproduce), and names the week', () => {
    const db = prod();
    const m = db.modules.find((x) => x.id === W[3])!;
    m.status = 'published';
    m.opens = MT('2026-12-16T12:00:00'); // published, yet dated: the run can't say both
    const out = planDecemberRunV1(db);
    expect(out.changes).toEqual([]);
    expect(out.skipped[0]!.reason).toMatch(/accelerator-week-3 would read differently through the run/);
    expect(out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.run).toBeUndefined();
  });

  it('rolls back: clearing the run restores every read', () => {
    const before = prod();
    const undone = undoDecemberRunV1(withRun());
    expect(undone.changes).toHaveLength(1);
    expect(undone.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.run).toBeUndefined();
    expect(cohortView(undone.db, DEFAULT_COHORT_ID)).toBe(undone.db);
    expect(undone.db.cohorts).toEqual(before.cohorts);
  });

  it('keeps the run out of a learner’s snapshot (December’s learners read the same snapshot)', () => {
    const db = withRun();
    const learner = { ...db.staff[0]!, id: 'u1' };
    db.users.push({ id: learner.id, name: 'A', email: 'a@example.test', tier: 'team', role: 'Owner', teamId: null, cohortId: DEFAULT_COHORT_ID, joined: 0, last: null, status: 'active', progress: {} } as Db['users'][number]);
    const snap = scopeSnapshot(db, { kind: 'learner', userId: learner.id }, { accelerator: true, at: MT('2026-12-02T12:30:00'), preview: false });
    expect(snap.cohorts[0]!.run).toBeUndefined();
    expect(decemberRunOf(db)).toHaveLength(9);
  });
});

describe('status words: Draft, Scheduled, Active, Finished (never written to cohorts.status)', () => {
  it('a new cohort is a draft; December is Scheduled, then Active from its preview, then Finished', () => {
    const { db, id } = withJanuary();
    expect(cohortStatusWord(db, id, MT('2027-01-05T12:00:00'))).toBe('Draft');
    const dec = { ...db, cohorts: db.cohorts.map((c) => (c.id === DEFAULT_COHORT_ID ? { ...c, previewOpensAt: MT('2026-11-23T09:00:00') } : c)) };
    expect(cohortStatusWord(dec, DEFAULT_COHORT_ID, MT('2026-11-20T09:00:00'))).toBe('Scheduled');
    expect(cohortStatusWord(dec, DEFAULT_COHORT_ID, MT('2026-11-24T09:00:00'))).toBe('Active');
    expect(cohortStatusWord(dec, DEFAULT_COHORT_ID, MT('2027-02-04T12:30:00'))).toBe('Active');
    expect(cohortStatusWord(dec, DEFAULT_COHORT_ID, MT('2027-02-04T14:00:00'))).toBe('Finished');
    expect(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.status).toBe('enrolling');
  });
});

describe('the shape: January’s stored, December’s derived for display (Q-28)', () => {
  it('January’s is what New cohort stored', () => {
    const { db, id } = withJanuary();
    const v = cohortShapeOf(db, id)!;
    expect(v.stored).toBe(true);
    expect(shapeLine(v.shape)).toBe('6 weeks of building · twice a week');
    expect(slotLine(v.shape.slots[0]!)).toBe('Tuesday · 12:00 PM MT / 1:00 PM CT · Live build · 1 hr 30 min');
  });

  it('December’s is read off its run and sessions: 8 weeks after a setup week, Wednesday build and Thursday office hours', () => {
    const v = cohortShapeOf(withRun(), DEFAULT_COHORT_ID)!;
    expect(v.stored).toBe(false);
    expect(v.shape.buildWeeks).toBe(8);
    expect(v.shape.setupWeek).toBe(true);
    expect(v.shape.slots).toEqual([
      { day: 3, time: '12:00', kind: 'live_build', mins: 90 },
      { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
    ]);
    expect(v.shape.hosts).toBe('Connor Leiva');
  });

  it('December’s shape is never saved or laid out; its hosts are', () => {
    const db = withRun();
    expect(saveCohortShape(db, OWNER, { cohortId: DEFAULT_COHORT_ID, picks: [W[1]!], shape: { setupWeek: true, slots: JAN_SLOTS, hosts: '' } }, mkCtx()).error).toBe(DERIVED_SHAPE);
    const out = saveCohortHosts(db, OWNER, { cohortId: DEFAULT_COHORT_ID, hosts: 'Connor Leiva and Spring' }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.audit?.action).toBe('cohort.hosts_save');
    const co = out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(co.shape).toBeUndefined();
    expect(co.hosts).toBe('Connor Leiva and Spring');
    expect(cohortShapeOf(out.db, DEFAULT_COHORT_ID)!.shape.hosts).toBe('Connor Leiva and Spring');
    expect(out.db.sessions).toBe(db.sessions);
  });
});

describe('the "A week opens" line (Q-27): computed from the run', () => {
  it('December’s weeks after Week 1 open Wednesdays; January’s Sundays', () => {
    expect(weekOpensLine(withRun(), DEFAULT_COHORT_ID)).toBe('Every Wednesday · 12:00 PM MT / 1:00 PM CT');
    const { db, id } = withJanuary();
    expect(weekOpensLine(db, id)).toBe('Every Sunday · 12:00 PM MT / 1:00 PM CT');
  });
});

describe('New cohort: Connor’s January, as the Done-when says', () => {
  it('lays out a setup week on Sun, Dec 27, 12 sessions, the first Tue, Jan 5 and the last Thu, Feb 11', () => {
    const { db, id } = withJanuary();
    const co = db.cohorts.find((c) => c.id === id)!;
    expect(co.status).toBe('draft');
    expect(day(co.previewOpensAt!)).toBe('2026-12-27');
    const ses = db.sessions.filter((s) => s.cohortId === id).sort((a, b) => a.start - b.start);
    expect(ses).toHaveLength(12);
    expect(fmt.mtWhen(ses[0]!.start)).toBe('Tue, Jan 5 · 12:00 PM MT / 1:00 PM CT');
    expect(fmt.mtDay(ses[11]!.start)).toBe('Thu, Feb 11');
  });

  it('starts with December’s words, flagged "Read them once", and its included time 90 days after the last build', () => {
    const { db, id } = withJanuary();
    const co = db.cohorts.find((c) => c.id === id)!;
    const dec = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(co.words).toEqual({ promise: dec.course!.intro.sub, how: dec.course!.intro.how, holiday: dec.course!.intro.holiday });
    expect(cohortWordsOf(db, id)!.unread).toBe(true);
    expect(cohortWordsOf(db, DEFAULT_COHORT_ID)!.unread).toBe(false);
    expect(co.includedUntil).toBe('2027-05-10');
    expect(includedDefault(db.sessions.filter((s) => s.cohortId === id))).toBe('2027-05-10');
    expect(includedUntilAt('2027-05-10')).toBe(Date.parse('2027-05-10T00:00:00-05:00'));
    // December's included time is Phase 5's data step's.
    expect(dec.includedUntil).toBeUndefined();
  });

  it('a blank cohort starts with no words, and the included time can be given', () => {
    const out = createCohortFromShape(withRun(), OWNER, { ...JAN, name: 'Blank', words: null, includedUntil: '2027-06-01' }, mkCtx());
    const co = out.db.cohorts.find((c) => c.id === out.cohort!.cohortId)!;
    expect(co.words).toBeUndefined();
    expect(co.includedUntil).toBe('2027-06-01');
    expect(createCohortFromShape(withRun(), OWNER, { ...JAN, name: 'Bad', includedUntil: 'May 10' }, mkCtx()).error).toBe('Pick the day its included time ends.');
  });
});

describe('Before it opens: Open enrollment’s refusals, in order, one function for both', () => {
  it('January, just created: the lines in order, and the refusal is the first not done', () => {
    const { db, id } = withJanuary();
    const b = beforeItOpens(db, id);
    expect(b.lines.map((l) => l.label)).toEqual([
      'Shape',
      'Its weeks',
      'Sessions',
      'Zoom links',
      'Week 0 due date',
      'Stripe price found for each lookup key',
      'Payment Links entered',
      'Included time ends',
      'Words learners see',
      'Test emails sent',
      'Open enrollment',
    ]);
    const line = (k: string) => b.lines.find((l) => l.key === k)!;
    expect(line('shape')).toMatchObject({ done: true, detail: '6 weeks of building · twice a week, after a setup week' });
    expect(line('weeks')).toMatchObject({ done: true, detail: '6 of 6 are published' });
    // Five of January's Thursday office hours are at the same instant as December's.
    expect(line('sessions')).toMatchObject({ done: false, detail: '12 on the calendar. 5 are at the same time as December’s office hours.' });
    expect(line('zoom')).toMatchObject({ done: false, detail: '0 of 12 sessions have one' });
    expect(line('week0')).toMatchObject({ done: false, detail: 'Not set' });
    expect(line('stripe').done).toBe(false);
    expect(line('links').done).toBe(false);
    expect(line('included')).toMatchObject({ done: true, detail: 'Mon, May 10, 2027' });
    expect(line('words').done).toBe(false);
    expect(line('tests')).toMatchObject({ done: false, detail: 'Not yet: the welcome and Week 0 Is Open' });
    expect(line('open')).toMatchObject({ done: false, detail: 'Off. Turn it on when the rest is done.' });
    expect(b.done).toBe(3);
    expect(b.refusal).toBe('Sessions: 12 on the calendar. 5 are at the same time as December’s office hours.');
    expect(openEnrollmentRefusal(db, id, { testSends: { welcome: true, week0: true }, plans: 0 })).toBe(b.refusal);
  });

  it('every line but Stripe and the links can be done in Phase 3, so Open enrollment still refuses (§ 10.2)', () => {
    let { db, id } = withJanuary();
    db = keepCohortOverlap(db, OWNER, { cohortId: id }, mkCtx()).db;
    db = { ...db, sessions: db.sessions.map((s) => (s.cohortId === id ? { ...s, zoom: 'https://zoom.example/j/1' } : s)) };
    const run = db.cohorts.find((c) => c.id === id)!.run!;
    const weeks = run.map((w) => ({
      moduleId: w.moduleId,
      opens: w.opensAt === null ? null : zonedInputs(w.opensAt, 'America/Denver'),
      due: w.n === 0 ? { date: '2027-01-04', time: '12:00' } : null,
    }));
    db = saveCohortRun(db, OWNER, { cohortId: id, weeks }, mkCtx()).db;
    const words = cohortWordsOf(db, id)!;
    db = saveCohortWords(db, OWNER, { cohortId: id, name: words.name, promise: words.promise, how: words.how, holiday: words.holiday }, mkCtx()).db;
    const b = beforeItOpens(db, id, { testSends: { welcome: true, week0: true }, plans: 0 });
    expect(b.lines.filter((l) => !l.done).map((l) => l.key)).toEqual(['stripe', 'links', 'open']);
    expect(b.lines.find((l) => l.key === 'sessions')!.detail).toBe('12 on the calendar. 5 at the same time as December’s office hours, kept on purpose.');
    expect(b.refusal).toBe('Stripe price found for each lookup key: None yet. Prices and Payment Links are made in Stripe.');
  });

  it('with no setup week it warns, and does not hold the cohort back for it', () => {
    const out = createCohortFromShape(withRun(), OWNER, { ...JAN, name: 'No setup', shape: { ...JAN.shape, setupWeek: false } }, mkCtx());
    const line = beforeItOpens(out.db, out.cohort!.cohortId).lines.find((l) => l.key === 'week0')!;
    expect(line).toEqual({ key: 'week0', label: 'Week 0 due date', detail: 'No setup week: no LMS Tour, no welcome email, no intake.', done: true, warn: true });
  });
});

describe('the Settings writes', () => {
  it('Edit words: a new cohort’s are its own and clear "Read them once"; December’s stay in its course', () => {
    const { db, id } = withJanuary();
    const out = saveCohortWords(db, OWNER, { cohortId: id, name: 'January 2027 Cohort', promise: 'Six weeks of building.', how: ['A week opens on Sunday.', ' '], holiday: '' }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.audit?.action).toBe('cohort.words_save');
    expect(cohortWordsOf(out.db, id)).toEqual({ name: 'January 2027 Cohort', promise: 'Six weeks of building.', how: ['A week opens on Sunday.'], holiday: '', unread: false });
    const dec = saveCohortWords(db, OWNER, { cohortId: DEFAULT_COHORT_ID, name: db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.name, promise: 'Nine weeks.', how: ['One.'], holiday: 'None.' }, mkCtx());
    const co = dec.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(co.words).toBeUndefined();
    expect(co.course!.intro.sub).toBe('Nine weeks.');
    expect(saveCohortWords(db, OWNER, { cohortId: id, name: '', promise: 'x', how: [], holiday: '' }, mkCtx()).error).toBe('Give the cohort a name.');
    expect(() => saveCohortWords(db, EDITOR, { cohortId: id, name: 'x', promise: 'x', how: [], holiday: '' }, mkCtx())).toThrow();
  });

  it('included time: editable until the cohort has a cohort plan, then refused', () => {
    const { db, id } = withJanuary();
    const ok = saveCohortIncluded(db, OWNER, { cohortId: id, date: '2027-05-11' }, mkCtx());
    expect(ok.db.cohorts.find((c) => c.id === id)!.includedUntil).toBe('2027-05-11');
    expect(ok.audit?.action).toBe('cohort.included_save');
    const frozen = saveCohortIncluded(db, OWNER, { cohortId: id, date: '2027-05-11' }, { ...mkCtx(), cohortFacts: { [id]: { testSends: { welcome: false, week0: false }, plans: 1 } } });
    expect(frozen.error).toBe(INCLUDED_FROZEN);
  });

  it('Dates and Release on December: its run and its week modules move together (one editor at a time)', () => {
    const db = withRun();
    const run = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.run!;
    const weeks = run.map((w) => ({
      moduleId: w.moduleId,
      opens: w.opensAt === null ? null : zonedInputs(w.opensAt, 'America/Denver'),
      due: w.dueAt === null ? null : zonedInputs(w.dueAt, 'America/Denver'),
    }));
    weeks[8] = { ...weeks[8]!, opens: { date: '2027-02-04', time: '12:00' } };
    const out = saveCohortRun(db, OWNER, { cohortId: DEFAULT_COHORT_ID, weeks }, mkCtx());
    expect(out.error).toBeUndefined();
    const m = out.db.modules.find((x) => x.id === W[8])!;
    expect(m.opens).toBe(MT('2027-02-04T12:00:00'));
    expect(m.status).toBe('scheduled');
    // The view still reads every module exactly as it is stored.
    for (const mod of out.db.modules) expect(JSON.stringify(cohortView(out.db, DEFAULT_COHORT_ID).modules.find((x) => x.id === mod.id))).toBe(JSON.stringify(mod));
  });

  it('the four new actions are admin actions with audit actions of their own', () => {
    for (const name of ['saveCohortWords', 'saveCohortIncluded', 'saveCohortHosts', 'keepCohortOverlap'] as const) expect(typeof ADMIN_ACTIONS[name]).toBe('function');
    for (const a of ['cohort.words_save', 'cohort.included_save', 'cohort.hosts_save', 'cohort.overlap_keep']) expect(AUDIT_ACTIONS).toContain(a);
  });
});

describe('Preview: the staff preview of a cohort’s course', () => {
  it('January reads December’s course with its own words in their places; December reads its own', () => {
    const { db, id } = withJanuary();
    expect(courseFor(db, MT('2027-01-05T12:00:00'), 'staff', id)).toBeNull();
    const words = saveCohortWords(db, OWNER, { cohortId: id, name: 'January 2027 Cohort', promise: 'Six weeks.', how: ['Sundays.'], holiday: '' }, mkCtx()).db;
    const course = courseFor(previewDb(words, id), MT('2027-01-05T12:00:00'), 'staff', id)!;
    expect(course.intro.sub).toBe('Six weeks.');
    expect(course.intro.how).toEqual(['Sundays.']);
    expect(course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(previewDb(db, DEFAULT_COHORT_ID)).toBe(db);
  });
});

describe('fmt: MT first, CT after it, on one line (PLAN.md § 10.8)', () => {
  it('prints a winter and a summer instant in each zone’s own time', () => {
    expect(fmt.mtCt(MT('2027-01-05T12:00:00'))).toBe('12:00 PM MT / 1:00 PM CT');
    expect(fmt.mtCt(Date.parse('2027-06-01T12:00:00-06:00'))).toBe('12:00 PM MT / 1:00 PM CT');
    expect(fmt.mtCt(MT('2027-01-05T23:30:00'))).toBe('11:30 PM MT / Wed, Jan 6, 12:30 AM CT');
    expect(fmt.mtDate(MT('2027-05-10T12:00:00'))).toBe('Mon, May 10, 2027');
  });
});
