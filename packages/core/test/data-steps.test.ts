// D-175: the one-time data steps, pure. Each changes only what is still as the seed left it, and names
// what it leaves for the PM. The deploy runs them once (apps/api/test/data-migrations.test.ts).
import { describe, expect, it } from 'vitest';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import type { Db } from '../src/types';
import { WEEK0_DUE_AT } from '../seed/accelerator-v1';
import { COPY_V1_KEYS, planCopyV1 } from '../seed/copy-v1';
import { COPY_V2, TEAM_PLAN_COPY, planCopyV2 } from '../seed/copy-v2';
import { copyIssues } from '../src/course-rules';
import { SEED_COPY, seedProduction } from '../seed/curriculum';
import { WEEK0_DUE_V1, WEEK_OPENS_V1, planReleaseV1 } from '../seed/release-plan-v1';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
const MT = (iso: string): number => Date.parse(`${iso}T12:00:00-07:00`);

describe('the Nov 17 release plan (D-175)', () => {
  it('holds Connor’s dates: Week 0 due Mon, Nov 30, each week at its live build, 12:00 PM MT', () => {
    expect(WEEK0_DUE_V1).toBe(Date.parse('2026-11-30T19:00:00Z'));
    expect(WEEK_OPENS_V1).toEqual({
      1: MT('2026-12-02'),
      2: MT('2026-12-09'),
      3: MT('2026-12-16'),
      4: MT('2027-01-06'),
      5: MT('2027-01-13'),
      6: MT('2027-01-20'),
      7: MT('2027-01-27'),
      8: MT('2027-02-03'),
    });
  });

  it('schedules each week as the seed left it, moves Week 0’s due date, and touches nothing else', () => {
    const before = prod();
    const out = planReleaseV1(before);
    expect(out.skipped).toEqual([]);
    expect(out.changes.map((c) => c.target.id)).toEqual([...ACCELERATOR_MODULE_IDS]);
    const w0 = out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    expect(w0).toMatchObject({ status: 'published', dueAt: WEEK0_DUE_V1 });
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[n] });
    }
    // Only those fields moved.
    const strip = (db: Db) => db.modules.map(({ status: _s, opens: _o, dueAt: _d, ...m }) => m);
    expect(strip(out.db)).toEqual(strip(before));
    expect({ ...out.db, modules: [] }).toEqual({ ...before, modules: [] });
    expect(out.changes[1]).toEqual({ target: { type: 'module', id: ACCELERATOR_MODULE_IDS[1], label: before.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!.name }, before: { status: 'published', opens: null, dueAt: null }, after: { status: 'scheduled', opens: WEEK_OPENS_V1[1], dueAt: null } });
  });

  it('leaves every row staff already changed, and names it for the PM', () => {
    const db = prod();
    db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!.dueAt = WEEK0_DUE_AT + 86_400_000; // moved by staff
    db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[3])!.status = 'draft';
    const w5 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[5])!;
    w5.status = 'scheduled';
    w5.opens = MT('2027-01-14');
    const out = planReleaseV1(db);
    expect(out.skipped.map((s) => s.id)).toEqual([ACCELERATOR_MODULE_IDS[0], ACCELERATOR_MODULE_IDS[3], ACCELERATOR_MODULE_IDS[5]]);
    expect(out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[5])!.opens).toBe(MT('2027-01-14'));
    expect(out.changes).toHaveLength(6);
  });

  it('is a no-op the second time: everything already is the plan', () => {
    const once = planReleaseV1(prod()).db;
    const twice = planReleaseV1(once);
    expect(twice.changes).toEqual([]);
    expect(twice.skipped).toEqual([]);
    expect(twice.db).toBe(once);
  });
});

describe('the copy strings D-175 adds', () => {
  it('seeds a new database with all three: Utah Life’s line, a locked week’s opening, the preview line', () => {
    expect(prod().copy).toEqual(SEED_COPY);
    expect(SEED_COPY.map((c) => c.key)).toEqual(['locked.utah_life', 'locked.opens', 'course.prelaunch']);
    expect(SEED_COPY.find((c) => c.key === 'locked.opens')!.value).toContain('{date}');
  });

  it('adds the missing ones to a database that already had its strings, and never changes one that is there', () => {
    const db = prod();
    db.copy = [
      { key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' },
      { key: 'locked.opens', value: 'Opening {date}', audience: 'learner' },
    ];
    const out = planCopyV1(db);
    expect(out.db.copy).toEqual([...db.copy, SEED_COPY.find((c) => c.key === 'course.prelaunch')]);
    expect(out.changes).toEqual([{ target: { type: 'copy', id: 'course.prelaunch', label: 'course.prelaunch' }, before: null, after: { audience: 'learner', length: SEED_COPY[2]!.value.length } }]);
    expect(planCopyV1(out.db).changes).toEqual([]);
    expect(COPY_V1_KEYS).toEqual(['locked.opens', 'course.prelaunch']);
  });
});

// D-187: the Team Plan window's words, as copy strings the builder edits.
describe('the Team Plan window’s copy strings (D-187)', () => {
  it('adds each missing key, keeps one staff changed, and runs once @parity:SH-8 @parity:P-1', () => {
    const db = prod();
    db.copy = [...(db.copy ?? []), { key: 'plan.team.ask', value: 'Ask Us', audience: 'learner' }];
    const out = planCopyV2(db);
    expect(out.db.copy!.find((c) => c.key === 'plan.team.ask')!.value).toBe('Ask Us');
    expect(out.changes.map((c) => c.target.id)).toEqual(['plan.team.title', 'plan.team.lead', 'plan.team.solo', 'plan.team.asked']);
    expect(planCopyV2(out.db).changes).toEqual([]);
    expect(planCopyV2(out.db).db).toBe(out.db);
    expect(COPY_V2).toBe('2026-11-18-team-plan-copy');
  });

  it('says what Connor asked for, every key a learner string under plan.team., and passes the copy rules', () => {
    const v = Object.fromEntries(TEAM_PLAN_COPY.map((c) => [c.key, c.value]));
    expect(v['plan.team.title']).toMatch(/comes with the Team Plan/);
    expect(v['plan.team.lead']).toMatch(/team lead can add/);
    expect(v['plan.team.solo']).toMatch(/Solo agent\? Ask us/);
    for (const c of TEAM_PLAN_COPY) {
      expect(c.key.startsWith('plan.team.')).toBe(true);
      expect(c.audience).toBe('learner');
      expect(copyIssues([{ path: c.key, label: c.key, text: c.value }])).toEqual([]);
    }
  });
});
