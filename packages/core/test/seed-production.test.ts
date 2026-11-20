// § 9.5's launch seed, carrying the Amplified AI Accelerator (D-110). The test the phase file names is
// "it contains no `u_*` demo users", but that one string is a weak version of the real requirement, so
// this suite checks the general property instead: nothing invented reaches a production database, and
// the curriculum it carries is the Accelerator, never the prototype.
//
// The failure being guarded against is not abstract. Every demo learner has a plausible address at a
// plausible domain, and `remindMembers` and `nudgeLearners` send real email to whatever is in the
// users table.
import { describe, it, expect } from 'vitest';
import courseV1 from './fixtures/curriculum-v1/course.json';
import modulesV1 from './fixtures/curriculum-v1/modules.json';
import sessionsV1 from './fixtures/curriculum-v1/sessions.json';
import cohortV1 from './fixtures/curriculum-v1/cohort.json';
import { PERMS, STAFF_ROLES, STEPS, ZERO_BASE, canAccess, moduleForSession, seed, seedForDatabase } from '../src/index';
import { courseFromSnapshot } from '../src/course';
import { SEED_COPY, curriculumSeed, ensureCurriculum, hasCurriculum, seedProduction } from '../seed/curriculum';
import { ACCELERATOR_INSTRUCTOR } from '../seed/accelerator-v1';
import type { Db } from '../src/index';
import { ACCELERATOR_COHORT_ID, ACCELERATOR_MODULE_IDS, isAcceleratorModule } from '../src/accelerator';

const OWNER = { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' };
const prod = (): Db => seedProduction({ owner: OWNER });

describe('§9.5 seedProduction @g9', () => {
  it('carries the curriculum, the cohort, the toggles, the permissions and one Owner, and nothing more @g9', () => {
    const db = prod();
    // Content: present.
    expect(db.modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    expect(db.reminders.length).toBeGreaterThan(0);
    expect(Object.keys(db.perms).sort()).toEqual([...STAFF_ROLES].sort());
    expect(db.staff).toHaveLength(1);
    expect(db.cohorts.map((c) => c.id)).toEqual([ACCELERATOR_COHORT_ID]);
    expect(db.sessions).toHaveLength(16);

    // Data: absent. Each of these is either demo fiction or something an admin creates.
    expect(db.users).toEqual([]);
    expect(db.teams).toEqual([]);
    expect(db.resources).toEqual([]);
    expect(db.announcements).toEqual([]);
    expect(db.requests).toEqual([]);
    expect(db.activity).toEqual([]);
    expect(db.dismissed).toEqual({});
    expect(db.base).toEqual(ZERO_BASE);
    // The prototype's tier rows carry invented prices; the real ones are in Stripe (D-074).
    expect(db.tiers).toEqual([]);
  });

  it('contains no trace of any demo person, found by comparison rather than by pattern @g9', () => {
    const demo = seedForDatabase('live');
    const forbidden = new Set<string>();
    for (const u of demo.users) {
      forbidden.add(u.id);
      forbidden.add(u.name);
      forbidden.add(u.email);
    }
    for (const t of demo.teams) {
      forbidden.add(t.id);
      forbidden.add(t.name);
    }
    for (const s of demo.staff) {
      forbidden.add(s.id);
      forbidden.add(s.name);
      forbidden.add(s.email);
    }
    for (const q of demo.requests) forbidden.add(q.email);
    expect(forbidden.size).toBeGreaterThan(30);
    // Jordan Hale, the prototype's invented instructor, is one of them (a demo staff member).
    expect(forbidden.has('Jordan Hale')).toBe(true);

    const json = JSON.stringify(prod());
    const leaked = [...forbidden].filter((v) => v.length > 2 && json.includes(v));
    expect(leaked).toEqual([]);
  });

  it('carries no invented price, Zoom link or prototype module @g9', () => {
    const json = JSON.stringify(prod());
    expect(json).not.toMatch(/\$?\b(995|4,?995)\b/);
    expect(json).not.toContain('zoom.us');
    for (const m of seed('live').modules) expect(json).not.toContain(`"${m.id}"`);
    for (const s of prod().sessions) expect(s.zoom).toBe('');
  });

  it('the one account can actually sign in @g9', () => {
    const db = prod();
    const owner = db.staff[0]!;
    expect(owner.role).toBe('Owner');
    expect(owner.email).toBe(OWNER.email);
    expect(owner.name).toBe(OWNER.name);
    expect(owner.last).toBeNull();
    for (const [perm] of PERMS) expect(db.perms.Owner[perm]).toBe(1);
  });

  it('refuses an owner it cannot mail, rather than seeding a database nobody can enter @g9', () => {
    expect(() => seedProduction({ owner: { name: '', email: 'a@b.co' } })).toThrow(/needs a name/);
    expect(() => seedProduction({ owner: { name: 'A', email: 'not-an-email' } })).toThrow(/usable email/);
    expect(() => seedProduction({ owner: { name: 'A', email: '' } })).toThrow(/usable email/);
    expect(seedProduction({ owner: { name: ' A B ', email: '  Mixed@Case.IO ' } }).staff[0]).toMatchObject({
      name: 'A B',
      email: 'mixed@case.io',
    });
  });

  it('knows only cohort one: the prototype\'s feb27 and apr27 are not real schedules @g9', () => {
    expect(seedProduction({ owner: OWNER, cohortId: 'dec26' }).cohorts[0]!.id).toBe('dec26');
    expect(() => seedProduction({ owner: OWNER, cohortId: 'feb27' })).toThrow(/no cohort with id feb27/);
    expect(() => seedProduction({ owner: OWNER, cohortId: 'apr27' })).toThrow(/no cohort with id apr27/);
  });

  it('starts the cohort empty and never-run @g9', () => {
    const db = prod();
    const cohort = db.cohorts[0]!;
    expect(cohort.enrolled).toBe(0);
    expect(db.sessions.every((s) => s.cohortId === cohort.id)).toBe(true);
    for (const s of db.sessions) {
      expect(s.live).toBe(false);
      expect(s.attended).toBeNull();
      expect(s.replay).toBeNull();
      expect(s.views).toBe(0);
      expect('movedFrom' in s).toBe(false);
    }
    // In date order, which is what the session rail and the calendar file read.
    expect(db.sessions.map((s) => s.start)).toEqual([...db.sessions.map((s) => s.start)].sort((a, b) => a - b));
  });

  it('is the Accelerator: every build has its week, and a Team-tier owner opens all nine @g9', () => {
    const db = prod();
    for (const m of db.modules) {
      expect(m.checklist).toHaveLength(STEPS);
      expect(m.status).toBe('published');
    }
    for (const s of db.sessions) expect(isAcceleratorModule(moduleForSession(db, s)!.id)).toBe(true);
    // Every buyer's account is Team tier (billing/provision.ts). Plan-level access is acceleratorOpen.
    const team = { tier: 'team' } as Parameters<typeof canAccess>[0];
    expect(db.modules.filter((m) => canAccess(team, m))).toHaveLength(9);
  });

  it('is pure, so two runs are deep-equal and neither shares state @g9', () => {
    const a = prod();
    const b = prod();
    expect(a).toEqual(b);
    a.modules[0]!.name = 'MUTATED';
    a.base.learners = 99;
    expect(prod().modules[0]!.name).not.toBe('MUTATED');
    expect(ZERO_BASE.learners).toBe(0);
  });

  it('leaves every field that describes a recording empty, and names the real instructor @g9', () => {
    const db = prod();
    for (const m of db.modules) {
      expect(m.instructor).toBe(ACCELERATOR_INSTRUCTOR);
      expect(m.transcript).toEqual([]);
      expect(m.dur).toBe(0);
    }
    for (const s of db.sessions) expect(s.replay).toBeNull();
    const taught = seedProduction({ owner: OWNER, instructor: 'Spring Bengtzen' });
    expect(new Set(taught.modules.map((m) => m.instructor))).toEqual(new Set(['Spring Bengtzen']));
  });

  it('names no phase, so the dashboard reads it as live @g9', () => {
    expect('phase' in prod()).toBe(false);
  });
});


// --- D-173: the curriculum is data, and the seed never overwrites it -------------------------------

const FIXTURES: Record<string, unknown> = { 'course.json': courseV1, 'modules.json': modulesV1, 'sessions.json': sessionsV1, 'cohort.json': cohortV1 };
const fixture = (name: string): unknown => FIXTURES[name];
/** A record without D-173's new columns: what main's code produced. */
const without = <T extends object>(o: T, keys: readonly string[]): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as Partial<T>;

describe('a fresh database and the seed are what main served (D-173)', () => {
  // The fixtures were written from main's code (courseContent, acceleratorModules, acceleratorSessions,
  // acceleratorCohort) before the words moved into the seed, so this is the move's proof of no change.
  it('serves the same course, week for week, field for field', () => {
    // D-221: the seed no longer writes the old setup order or a kit skill's use line, which no learner page
    // draws. Every other field is main's, word for word.
    const main = fixture('course.json') as { weeks: { setup?: unknown; skills: { use?: unknown }[] }[] };
    const retired = { ...main, weeks: main.weeks.map(({ setup: _s, ...w }) => ({ ...w, skills: w.skills.map(({ use: _u, ...k }) => k) })) };
    expect(courseFromSnapshot(prod())).toEqual(retired);
  });

  it('holds the same nine modules, sixteen sessions and cohort, plus only the new columns', () => {
    const db = prod();
    expect(db.modules.map((m) => without(m, ['kind', 'dueAt', 'course']))).toEqual(fixture('modules.json'));
    expect(db.sessions.map((s) => without(s, ['kind', 'moduleId']))).toEqual(fixture('sessions.json'));
    expect(without(db.cohorts[0]!, ['timezone', 'defaultOpenTime', 'course'])).toEqual(fixture('cohort.json'));
  });

  it('marks the nine as weeks, ties each session to its week, and starts the release plan in Mountain time at noon', () => {
    const db = prod();
    expect(db.modules.every((m) => m.kind === 'week' && m.course?.week === Number(m.id.replace('accelerator-week-', '')))).toBe(true);
    expect(db.modules.find((m) => m.id === 'accelerator-week-0')!.dueAt).toBe(Date.parse('2026-12-02T13:00:00-06:00'));
    expect(db.sessions.filter((s) => s.kind === 'live_build')).toHaveLength(8);
    expect(db.sessions.filter((s) => s.kind === 'goal_planning').map((s) => s.id)).toEqual(['dec26-oh2', 'dec26-oh3']);
    expect(db.sessions.find((s) => s.id === 'dec26-oh5')).toMatchObject({ kind: 'office_hours', moduleId: 'accelerator-week-5' });
    expect(db.cohorts[0]).toMatchObject({ timezone: 'America/Denver', defaultOpenTime: '12:00' });
    // D-175 adds what a locked week says and the preview line to D-173's Utah Life line.
    expect(db.copy).toEqual(SEED_COPY);
    expect(db.copy![0]).toEqual({ key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' });
  });
});

describe('ensureCurriculum: insert what is missing, never overwrite (D-173)', () => {
  // The demo database stands in for a live one: learners, teams, progress, staff, resources and the
  // prototype's six modules on the same `dec26` cohort.
  const live = (): Db => seed('live');

  it('leaves every learner, team, progress row, staff member and resource exactly as it was', () => {
    const before = live();
    const after = ensureCurriculum(before);
    for (const k of ['users', 'teams', 'staff', 'resources', 'announcements', 'requests', 'activity', 'dismissed', 'reminders', 'perms', 'tiers'] as const) {
      expect(after[k], k).toEqual(before[k]);
    }
  });

  it('is idempotent and never mutates its input', () => {
    const before = live();
    const copy = structuredClone(before);
    const once = ensureCurriculum(before);
    expect(before).toEqual(copy);
    expect(ensureCurriculum(once)).toEqual(once);
  });

  it('keeps an existing cohort, session and module exactly, adding only the new columns where empty', () => {
    const before = live();
    const after = ensureCurriculum(before);
    const co = after.cohorts.find((c) => c.id === 'dec26')!;
    expect(without(co, ['timezone', 'defaultOpenTime', 'course'])).toEqual(before.cohorts.find((c) => c.id === 'dec26'));
    for (const s of before.sessions) {
      expect(without(after.sessions.find((x) => x.id === s.id)!, ['kind', 'moduleId']), s.id).toEqual(s);
    }
    // The prototype's modules are left alone: no longer drafted, no session taken away.
    for (const m of before.modules) expect(after.modules.find((x) => x.id === m.id), m.id).toEqual(m);
    // The nine weeks were missing, so they are inserted.
    expect(after.modules.filter((m) => isAcceleratorModule(m.id))).toHaveLength(9);
  });

  it('keeps a builder edit to a module and a session through two runs (the brief\'s acceptance)', () => {
    const db = prod();
    const wk2 = db.modules.find((m) => m.id === 'accelerator-week-2')!;
    wk2.headline = 'Which lead sources pay, and is every lead worked?';
    wk2.course = { ...wk2.course!, question: 'Which lead sources pay, and is every lead worked?' };
    wk2.checklist = wk2.checklist.slice(0, 4);
    const s3 = db.sessions.find((s) => s.id === 'dec26-s3')!;
    s3.start += 86_400_000;
    s3.title = 'Monthly Numbers Live Build';
    s3.kind = 'other';
    const edited = structuredClone(db);
    expect(ensureCurriculum(ensureCurriculum(db))).toEqual(edited);
  });

  it('never brings back a week or session staff deleted: the course is here, so it adds no course row', () => {
    const db = prod();
    // Week 8 unpublished, then deleted as a draft in the builder; an office hour gone with it.
    db.modules = db.modules.filter((m) => m.id !== 'accelerator-week-8');
    db.sessions = db.sessions.filter((s) => s.id !== 'dec26-oh8');
    const edited = structuredClone(db);
    expect(ensureCurriculum(ensureCurriculum(db))).toEqual(edited);
    expect(hasCurriculum(db)).toBe(true);
  });

  it('gives a database that has never had the course every seed row it lacks, whole', () => {
    const before = live();
    expect(hasCurriculum(before)).toBe(false);
    const after = ensureCurriculum(before);
    const seeded = curriculumSeed();
    for (const m of seeded.modules) expect(after.modules.find((x) => x.id === m.id), m.id).toEqual(m);
    const had = new Set(before.sessions.map((s) => s.id));
    for (const s of seeded.sessions.filter((x) => !had.has(x.id))) expect(after.sessions.find((x) => x.id === s.id), s.id).toEqual(s);
    expect(hasCurriculum(after)).toBe(true);
  });

  it('gives a row from before the builder its words, and keeps the edit it already had', () => {
    const db = prod();
    const wk1 = db.modules.find((m) => m.id === 'accelerator-week-1')!;
    delete wk1.kind;
    delete wk1.course;
    wk1.headline = 'An edit made in the old Module Builder.';
    const s1 = db.sessions.find((s) => s.id === 'dec26-s1')!;
    delete s1.kind;
    delete s1.moduleId;
    delete db.cohorts[0]!.course;
    const after = ensureCurriculum(db);
    const filled = after.modules.find((m) => m.id === 'accelerator-week-1')!;
    expect(filled.headline).toBe('An edit made in the old Module Builder.');
    expect(filled.kind).toBe('week');
    expect(filled.course).toEqual(prod().modules.find((m) => m.id === 'accelerator-week-1')!.course);
    expect(after.sessions.find((s) => s.id === 'dec26-s1')).toMatchObject({ kind: 'live_build', moduleId: 'accelerator-week-1' });
    expect(after.cohorts[0]!.course).toEqual(prod().cohorts[0]!.course);
  });

  it('keeps a copy string staff changed', () => {
    const db = prod();
    db.copy = [{ key: 'locked.utah_life', value: 'Edited.', audience: 'learner' }];
    expect(ensureCurriculum(db).copy).toEqual([{ key: 'locked.utah_life', value: 'Edited.', audience: 'learner' }]);
  });

  it('puts the copy strings into an empty table only, so one staff removed stays removed', () => {
    const db = prod();
    db.copy = [{ key: 'home.countdown', value: 'Starts in {days} days', audience: 'learner' }];
    expect(ensureCurriculum(db).copy).toEqual(db.copy);
    delete db.copy;
    expect(ensureCurriculum(db).copy).toEqual(SEED_COPY);
  });
});
