// R-5 Phase 9 (D-270): the Overview's read (`GET /api/admin/overview`) and Archive a cohort
// (`POST /api/admin/actions/archiveCohort`), through the real API.
//
// The world: production's shape (the launch seed and every data step), Connor's January made by the real admin action, a
// December team (an owner and their AI Implementer), a December test account (D-202) and Utah Life agents, each as
// provisioning makes them (December's `cohort_id`, Agent tier, a team of one, no plan row).
//
// What it proves: the Overview reads every cohort not archived in one request, without Stripe, by the D-267 roster: a
// Utah Life agent and a test account are in no cohort's Teams or Learners, with one agent or four; a learner is refused.
// Archive is refused before the last session, then sets `archived_at` and nothing else on the row, writes one audit row,
// and the cohort leaves the Overview's read.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { AdminOverviewFacts } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember } from '../src/billing/access-groups';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { accessGroups, accounts, auditLog, cohorts, orders, plans, sessions, teams, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV25 = MT('2026-11-25T12:00:00');
const W = ACCELERATOR_MODULE_IDS;
const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: W.slice(1, 3),
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
let jan: string;

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
async function appAt(t: number): Promise<App> {
  at(t);
  await app?.close();
  app = await build({ logger: false });
  return app;
}
const get = async (who: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(who) } });
const act = async (who: string, name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/admin/actions/${name}`, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' }, payload: JSON.stringify(payload) });

/** A December team as provisioning writes it: an owner, an account, an order and a live cohort plan. */
async function team(id: string, isTest = false): Promise<void> {
  await handle.insert(users).values({ id: `u_${id}`, email: `${id}@example.test`, name: `Owner ${id}`, kind: 'learner', tier: 'team', role: 'Team Owner', teamId: `t_${id}`, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 100, isTest });
  await handle.insert(teams).values({ id: `t_${id}`, name: `Team ${id}`, ownerId: `u_${id}`, seats: 5, seq: 100 });
  await handle.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: `u_${id}`, ownerEmail: `${id}@example.test`, name: `Team ${id}`, createdAt: NOV25 });
  await handle.insert(orders).values({ id: `o_${id}`, plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: `Owner ${id}`, email: `${id}@example.test`, paymentsMade: 1, paidAt: NOV25, amountTotal: 750000, accountId: `a_${id}`, createdAt: NOV25 });
  await handle.insert(plans).values({ id: `p_${id}`, accountId: `a_${id}`, kind: 'cohort', option: 'full', seats: 5, cohortId: DEFAULT_COHORT_ID, status: 'active', startsAt: MT('2026-12-02T12:00:00'), orderId: `o_${id}`, createdAt: NOV25 });
}

beforeAll(async () => {
  handle = await testDatabase();
});
beforeEach(async () => {
  at(NOV25);
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  await applyDataMigrations(handle, NOV25);
  app = await build({ logger: false });
  const made = await act('st_owner', 'createCohortFromShape', JANUARY);
  expect(made.statusCode, made.body).toBe(200);
  jan = (made.json() as { cohort: { cohortId: string } }).cohort.cohortId;
  await team('dec');
  await handle.insert(users).values({ id: 'u_impl', email: 'impl@example.test', name: 'Ira Implementer', kind: 'learner', tier: 'team', role: 'Operations Lead', teamId: 't_dec', cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 101 });
  await team('tester', true);
  await handle.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOV25 });
  expect(await provisionGroupMember(handle, 'agent0@liveutah.com', NOV25, 'Uma Utah')).toBeTruthy();
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const overview = async (): Promise<AdminOverviewFacts> => {
  const res = await get('st_owner', '/api/admin/overview');
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as AdminOverviewFacts;
};

describe('GET /api/admin/overview (D-270)', () => {
  it('answers every cohort not archived, by the roster, without Stripe or Cohort › People’s rows', async () => {
    const body = await overview();
    expect(Object.keys(body.cohorts).sort()).toEqual([DEFAULT_COHORT_ID, jan].sort());
    const dec = body.cohorts[DEFAULT_COHORT_ID]!;
    // The December team and its AI Implementer: not the test account, not the Utah Life agent.
    expect(dec).toMatchObject({ teams: 1, learners: 2 });
    expect(dec).not.toHaveProperty('stripe');
    expect(dec).not.toHaveProperty('teamRows');
    expect(body.cohorts[jan]).toMatchObject({ teams: 0, learners: 0, plans: 0 });
  });

  it('Utah Life agents are never December’s learners: one agent or four, the same answer (D-268)', async () => {
    const one = await overview();
    for (const i of [1, 2, 3]) expect(await provisionGroupMember(handle, `agent${i}@liveutah.com`, NOV25, `Agent ${i}`)).toBeTruthy();
    // They are provisioned as D-268 found them: December's `cohort_id`, Agent tier, a team of one, no plan row.
    const agents = await handle.select({ cohortId: users.cohortId, tier: users.tier }).from(users).where(eq(users.email, 'agent3@liveutah.com'));
    expect(agents).toEqual([{ cohortId: DEFAULT_COHORT_ID, tier: 'agent' }]);
    expect(await overview()).toEqual(one);
  });

  it('is staff’s: a learner is refused', async () => {
    expect((await get('u_dec', '/api/admin/overview')).statusCode).toBe(403);
  });
});

describe('Archive a cohort (D-270)', () => {
  it('is refused before the last session, then sets archived_at and nothing else, with one audit row', async () => {
    const last = (await handle.select({ start: sessions.start, mins: sessions.mins }).from(sessions).where(eq(sessions.cohortId, jan)))
      .map((s) => Number(s.start) + s.mins * 60_000)
      .reduce((a, b) => Math.max(a, b));
    const early = await act('st_owner', 'archiveCohort', { cohortId: jan });
    expect(early.statusCode).toBe(422);
    expect((early.json() as { error: string }).error).toMatch(/^A cohort can be archived after its last session, \w{3}, \w{3} \d{1,2}\.$/);

    const [before] = await handle.select().from(cohorts).where(eq(cohorts.id, jan));
    await appAt(last + 60_000);
    const done = await act('st_owner', 'archiveCohort', { cohortId: jan });
    expect(done.statusCode, done.body).toBe(200);
    const [after] = await handle.select().from(cohorts).where(eq(cohorts.id, jan));
    expect(after).toEqual({ ...before, archivedAt: last + 60_000 });
    const rows = await handle.select({ action: auditLog.action, before: auditLog.before, after: auditLog.after }).from(auditLog).where(eq(auditLog.action, 'cohort.archive'));
    expect(rows).toEqual([{ action: 'cohort.archive', before: { archivedAt: null }, after: { archivedAt: last + 60_000 } }]);
    // The Overview, and every picker that reads `archivedAt`, leaves it out.
    expect(Object.keys((await overview()).cohorts)).toEqual([DEFAULT_COHORT_ID]);
    // Again: refused, and nothing more is written.
    expect((await act('st_owner', 'archiveCohort', { cohortId: jan })).statusCode).toBe(422);
    expect(await handle.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.action, 'cohort.archive'))).toHaveLength(1);
  });

  it('is refused for December while it still sells (archive never closes enrollment)', async () => {
    const last = (await handle.select({ start: sessions.start, mins: sessions.mins }).from(sessions).where(eq(sessions.cohortId, DEFAULT_COHORT_ID)))
      .map((s) => Number(s.start) + s.mins * 60_000)
      .reduce((a, b) => Math.max(a, b));
    await appAt(last + 60_000);
    const out = await act('st_owner', 'archiveCohort', { cohortId: DEFAULT_COHORT_ID });
    expect(out.statusCode).toBe(422);
    expect((out.json() as { error: string }).error).toBe('Close enrollment first. An archived cohort sells no seats.');
    const [dec] = await handle.select({ archivedAt: cohorts.archivedAt }).from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect(dec!.archivedAt).toBeNull();
  });
});
