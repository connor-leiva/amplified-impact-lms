// R-5 (D-254): a cohort owns its run and its shape, through the real API. The cohort writes run on
// `POST /api/admin/actions/:name` in one transaction with their one audit row; their run, shape and laid-out sessions
// survive the round trip through Postgres (migration 0043); a viewer is in the cohort of their newest live `cohort`
// plan; and December, which has no stored run, is refused by every one of them.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, auditLog, cohorts, plans, sessions, teams, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { viewerCohortId } from '../src/lib/course-access';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOW = MT('2026-11-25T12:00:00');

const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: [
    'accelerator-week-1',
    'accelerator-week-2',
    'accelerator-week-3',
    'accelerator-week-4',
    'accelerator-week-5',
    'accelerator-week-6',
  ],
  shape: {
    setupWeek: true,
    slots: [
      { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
      { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
    ],
    hosts: 'Connor Leiva and Spring',
  },
};

let handle: Database;
let app: App;

const act = async (who: string, name: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/admin/actions/${name}`,
    headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });

beforeAll(async () => {
  handle = await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  const db: Db = planReleaseV1(
    seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }),
  ).db;
  db.staff.push({
    id: 'st_editor',
    name: 'Erin Editor',
    email: 'erin@example.test',
    role: 'Content Editor',
    last: null,
  });
  await resetDatabase(db);
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('creating January through the admin action', () => {
  it('writes a draft with its run, shape and twelve laid-out sessions, one audit row, and warns of the five shared Thursdays', async () => {
    const res = await act('st_owner', 'createCohortFromShape', JANUARY);
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as {
      toast: { msg: string };
      cohort: { cohortId: string; warnings: { kind: string; sessionId?: string }[] };
    };
    expect(body.toast.msg).toBe('January 2027 Cohort created as a draft');
    const id = body.cohort.cohortId;
    expect(body.cohort.warnings.map((w) => `${w.kind}:${w.sessionId}`)).toEqual(
      ['dec26-oh4', 'dec26-oh5', 'dec26-oh6', 'dec26-oh7', 'dec26-oh8'].map((s) => `same_time:${s}`),
    );

    const db = await loadDb();
    const jan = db.cohorts.find((c) => c.id === id)!;
    expect(jan).toMatchObject({
      status: 'draft',
      capacity: 15,
      weeks: 6,
      timezone: 'America/Denver',
      defaultOpenTime: '12:00',
      cadence: 'Tue live build and Thu office hours',
    });
    expect(jan.run!.map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(jan.shape).toEqual({
      buildWeeks: 6,
      setupWeek: true,
      slots: JANUARY.shape.slots,
      hosts: 'Connor Leiva and Spring',
    });
    const mine = db.sessions.filter((s) => s.cohortId === id);
    expect(mine).toHaveLength(12);
    expect(mine.every((s) => s.slot && s.moduleId && s.kind && s.zoom === '')).toBe(true);

    const rows = await handle.select().from(auditLog).where(eq(auditLog.action, 'cohort.create'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ outcome: 'ok', targetId: id });
    // December's rows did not move.
    const [dec] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect(dec).toMatchObject({ run: null, shape: null, programId: null, archivedAt: null, status: 'enrolling' });
    expect(
      (await handle.select().from(sessions).where(eq(sessions.cohortId, DEFAULT_COHORT_ID))).every(
        (s) => s.slot === null,
      ),
    ).toBe(true);
  });

  it('is refused to a role without the cohorts permission, and writes nothing', async () => {
    const res = await act('st_editor', 'createCohortFromShape', JANUARY);
    expect(res.statusCode).toBe(403);
    expect((await loadDb()).cohorts.map((c) => c.id)).toEqual([DEFAULT_COHORT_ID]);
    expect(await handle.select().from(auditLog).where(eq(auditLog.action, 'cohort.create'))).toEqual([]);
  });

  it('refuses every cohort write on December, inline, and writes no row', async () => {
    for (const [name, payload] of [
      ['saveCohortShape', { cohortId: DEFAULT_COHORT_ID, picks: JANUARY.picks, shape: JANUARY.shape }],
      ['saveCohortRun', { cohortId: DEFAULT_COHORT_ID, weeks: [] }],
      ['addCohortSessions', { cohortId: DEFAULT_COHORT_ID }],
    ] as const) {
      const res = await act('st_owner', name, payload);
      expect(res.statusCode, name).toBe(422);
      expect((res.json() as { error: string }).error).toMatch(/still read from the curriculum/);
    }
    expect((await handle.select().from(auditLog)).filter((r) => r.action.startsWith('cohort.'))).toEqual([]);
  });

  it('a shape change later is audited and returns what it left alone', async () => {
    const id = ((await act('st_owner', 'createCohortFromShape', JANUARY)).json() as { cohort: { cohortId: string } })
      .cohort.cohortId;
    process.env.FIXED_NOW = new Date(MT('2027-01-08T12:00:00')).toISOString();
    const res = await act('st_owner', 'saveCohortShape', {
      cohortId: id,
      picks: JANUARY.picks,
      shape: { ...JANUARY.shape, slots: [{ day: 3, time: '12:00', kind: 'live_build', mins: 90 }] },
    });
    expect(res.statusCode, res.body).toBe(200);
    const left = (res.json() as { cohort: { left: { why: string }[] } }).cohort.left;
    expect(left.map((l) => l.why)).toEqual(['happened', 'happened']);
    expect(await handle.select().from(auditLog).where(eq(auditLog.action, 'cohort.shape_save'))).toHaveLength(1);
  });
});

describe('which cohort a viewer is in (viewerCohortId)', () => {
  async function owner(
    id: string,
    planRows: { cohortId: string | null; status: string; createdAt: number }[],
  ): Promise<void> {
    await handle
      .insert(users)
      .values({
        id,
        email: `${id}@example.test`,
        name: id,
        kind: 'learner',
        role: 'Team Owner',
        tier: 'team',
        teamId: `t_${id}`,
        cohortId: DEFAULT_COHORT_ID,
        status: 'active',
        joined: NOW,
      });
    await handle.insert(teams).values({ id: `t_${id}`, name: id, ownerId: id, seats: 2 });
    await handle
      .insert(accounts)
      .values({
        id: `a_${id}`,
        teamId: `t_${id}`,
        ownerUserId: id,
        ownerEmail: `${id}@example.test`,
        name: id,
        createdAt: NOW,
      });
    let i = 0;
    for (const p of planRows)
      await handle
        .insert(plans)
        .values({
          id: `p_${id}_${i++}`,
          accountId: `a_${id}`,
          kind: 'cohort',
          option: 'full',
          seats: 2,
          cohortId: p.cohortId,
          status: p.status,
          startsAt: NOW,
          orderId: `o_${id}_${i}`,
          createdAt: p.createdAt,
        });
  }

  it('the newest live cohort plan decides; none, or only ended ones, is the default; staff are the default', async () => {
    const jan = ((await act('st_owner', 'createCohortFromShape', JANUARY)).json() as { cohort: { cohortId: string } })
      .cohort.cohortId;
    await owner('u_none', []);
    await owner('u_dec', [{ cohortId: DEFAULT_COHORT_ID, status: 'active', createdAt: NOW }]);
    await owner('u_both', [
      { cohortId: DEFAULT_COHORT_ID, status: 'active', createdAt: NOW },
      { cohortId: jan, status: 'active', createdAt: NOW + 1 },
    ]);
    await owner('u_ended', [{ cohortId: jan, status: 'ended', createdAt: NOW }]);
    expect(await viewerCohortId(handle, 'u_none')).toBe(DEFAULT_COHORT_ID);
    expect(await viewerCohortId(handle, 'u_dec')).toBe(DEFAULT_COHORT_ID);
    expect(await viewerCohortId(handle, 'u_both')).toBe(jan);
    expect(await viewerCohortId(handle, 'u_ended')).toBe(DEFAULT_COHORT_ID);
    expect(await viewerCohortId(handle, 'st_owner')).toBe(DEFAULT_COHORT_ID);
    // The plan rows are read, not written: nobody's `users.cohort_id` moved.
    const rows = await handle
      .select({ id: users.id, cohortId: users.cohortId })
      .from(users)
      .where(and(eq(users.kind, 'learner')));
    expect(rows.every((r) => r.cohortId === DEFAULT_COHORT_ID)).toBe(true);
    expect((await handle.select().from(plans).orderBy(desc(plans.createdAt))).length).toBe(4);
  });
});
