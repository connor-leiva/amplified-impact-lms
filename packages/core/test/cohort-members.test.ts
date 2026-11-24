// D-243: the cohort's own learners, and the ones outside the course (Utah Life above all), with no rule naming a
// group. What the server hands staff (`Db.outside`), how every cohort number counts with it, and the proof that a
// learner's own snapshot is the same as before apart from the cohort's head count.
import { describe, expect, it } from 'vitest';
import * as core from '../src';
import type { AcceleratorPlan } from '../src/accelerator';
import type { Actor, Db, Outside } from '../src';

const live = (): Db => core.seed('live');
const learner = (userId: string): Actor => ({ kind: 'learner', userId });
const staff = (staffId: string): Actor => ({ kind: 'staff', staffId });
const OWNER = 'st1';
const SUPPORT = 'st4';

// Jamie (Agent tier, no team) stands in for a Utah Life member; Kenji for another plan's buyer, in no group.
const OUTSIDE: Outside = { ids: ['u_jamie', 'u_kenji'], groups: [{ id: 'utah-life', name: 'Utah Life', ids: ['u_jamie'] }] };

const plan = (p: Partial<AcceleratorPlan>): AcceleratorPlan => ({ kind: 'cohort', option: 'full', status: 'active', ...p });

describe('holdsCourse: a plan with the course, open yet or not', () => {
  it('holds it bought in full or in two payments, trialing, canceled at the end, or paused for a payment', () => {
    for (const p of [plan({}), plan({ option: 'two_pay' }), plan({ status: 'trialing' }), plan({ status: 'canceled' }), plan({ option: 'two_pay', status: 'past_due' })]) {
      expect(core.holdsCourse([p])).toBe(true);
    }
  });

  it('a refund ends it, and no other plan or option holds it', () => {
    expect(core.holdsCourse([plan({ status: 'ended' })])).toBe(false);
    expect(core.holdsCourse([plan({ kind: 'agent_plan', option: 'monthly' })])).toBe(false);
    expect(core.holdsCourse([plan({ kind: 'membership', option: 'monthly' })])).toBe(false);
    expect(core.holdsCourse([plan({ option: null })])).toBe(false);
    expect(core.holdsCourse([])).toBe(false);
  });

  it('dates play no part: before the course opens, a buyer is already the cohort’s', () => {
    expect(core.holdsCourse([plan({ startsAt: Date.UTC(2027, 0, 1) })])).toBe(true);
  });
});

describe('without `outside` (the fixture, every learner’s snapshot), everyone is the cohort’s', () => {
  it('the same learners and teams, the same arrays', () => {
    const db = live();
    expect(core.courseUsers(db)).toBe(db.users);
    expect(core.courseTeams(db)).toBe(db.teams);
    expect(db.users.every(core.inCourse(db))).toBe(true);
  });
});

describe('with `outside`', () => {
  it('the cohort’s learners are everyone else', () => {
    const db = { ...live(), outside: OUTSIDE };
    expect(core.courseUsers(db).map((u) => u.id)).toEqual(db.users.filter((u) => u.id !== 'u_jamie' && u.id !== 'u_kenji').map((u) => u.id));
    expect(core.inCourse(db)({ id: 'u_jamie' })).toBe(false);
    expect(core.inCourse(db)({ id: 'u_alex' })).toBe(true);
  });

  it('a team whose people are all outside the course leaves the cohort’s teams; one with a learner in it stays', () => {
    const db = live();
    const solo = { id: 't_solo', name: '', ownerId: 'u_jamie', seats: 1 } as Db['teams'][number];
    const jamie = db.users.find((u) => u.id === 'u_jamie')!;
    const withSolo: Db = { ...db, teams: [...db.teams, solo], users: db.users.map((u) => (u.id === jamie.id ? { ...u, teamId: 't_solo' } : u)), outside: OUTSIDE };
    expect(core.courseTeams(withSolo).map((t) => t.id)).toEqual(db.teams.map((t) => t.id));
    // Kenji outside alone on a team with Alex: the team stays.
    const mixed: Db = { ...withSolo, users: withSolo.users.map((u) => (u.id === 'u_kenji' ? { ...u, teamId: 't_solo' } : u)), outside: { ids: ['u_kenji'], groups: [] } };
    expect(core.courseTeams(mixed).map((t) => t.id)).toContain('t_solo');
  });

  it('a cohort holds its people, not a test account, not anyone outside the course', () => {
    const db = live();
    const inDec = db.users.filter((u) => u.cohortId === 'dec26');
    expect(core.enrolledIn(db.users, 'dec26')).toBe(inDec.length);
    expect(core.enrolledIn(db.users, 'dec26', OUTSIDE)).toBe(inDec.filter((u) => !OUTSIDE.ids.includes(u.id)).length);
    const tested = db.users.map((u) => (u.id === 'u_alex' ? { ...u, test: true as const } : u));
    expect(core.enrolledIn(tested, 'dec26')).toBe(inDec.length - 1);
  });

  it('`withOutside` counts every cohort again and keeps the list, and leaves its input alone', () => {
    const db = live();
    const before = structuredClone(db);
    const out = core.withOutside(db, OUTSIDE);
    expect(db).toEqual(before);
    expect(out.outside).toEqual(OUTSIDE);
    for (const c of out.cohorts) expect(c.enrolled).toBe(core.enrolledIn(db.users, c.id, OUTSIDE));
    expect(out.users).toBe(db.users);
  });

  it('with nobody outside, `withOutside` is the snapshot as it was: no field added, no count moved', () => {
    const db = live();
    expect(core.withOutside(db, { ids: [], groups: [] })).toBe(db);
  });
});

describe('scopeSnapshot: the list is staff’s alone', () => {
  const db = core.withOutside(live(), OUTSIDE);

  it('staff who may view learners get it', () => {
    expect(core.scopeSnapshot(db, staff(OWNER)).outside).toEqual(OUTSIDE);
    expect(core.scopeSnapshot(db, staff(SUPPORT)).outside).toEqual(OUTSIDE);
  });

  it('staff who may not view learners get neither the learners nor the list', () => {
    const d = structuredClone(db);
    d.perms.Support.viewLearners = 0;
    const s = core.scopeSnapshot(d, staff(SUPPORT));
    expect(s.users).toEqual([]);
    expect('outside' in s).toBe(false);
  });

  it('no learner gets it, inside the course or outside it', () => {
    for (const id of db.users.map((u) => u.id)) expect('outside' in core.scopeSnapshot(db, learner(id))).toBe(false);
  });

  it('an outside learner’s own snapshot is the one they had, but for the cohorts’ head count', () => {
    const plain = live();
    for (const id of OUTSIDE.ids) {
      for (const access of [undefined, { accelerator: false, at: Date.UTC(2026, 10, 24) }]) {
        const before = core.scopeSnapshot(plain, learner(id), access);
        const after = core.scopeSnapshot(core.withOutside(plain, OUTSIDE), learner(id), access);
        const noCount = (d: Db) => ({ ...d, cohorts: d.cohorts.map(({ enrolled: _n, ...c }) => c) });
        expect(noCount(after)).toEqual(noCount(before));
      }
    }
  });
});
