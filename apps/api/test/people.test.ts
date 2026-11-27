// R-5 Phase 7 (D-268): People through the real API.
//
// The world: production's shape (the launch seed and every data step), a December team (an owner and their AI
// Implementer), a Team Plan buyer, a comped December team, a skill buyer with no plan, and a Utah Life agent (a team of
// one, no plan, D-148).
//
// What it proves: "Got in through" is the team's primary plan, else a skill bought, else the access group, and its filter
// and People's counts agree, each person once; People › Teams leaves out the agent's team of one; Utah Life's tab
// answers its agents and what they opened; its two writes are Owner and Admin only, each audited once, and End access
// takes the group's grant away; Cohort › People's team rows and Cohort › Submissions' intake come from the roster.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { AccessGroupDetail, ConsolePage, ConsoleUserRow, PeopleAudiences, WorkspaceRow } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { groupAccessOf, provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { accessGroupMembers, accessGroups, accounts, auditLog, orders, plans, skillOpensDaily, skillPurchases, teamIntake, teams, usageDaily, users } from '../src/db/schema';
import { cohortFactsOf } from '../src/lib/cohort-facts';
import { resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV25 = MT('2026-11-25T12:00:00');
const DEC2 = MT('2026-12-02T12:30:00');

let handle: Database;
let app: App;
let utah: string;
const cookie = new Map<string, string>();

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const get = (who: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: cookie.get(who)! } });
const post = (who: string, url: string, payload: unknown) =>
  app.inject({ method: 'POST', url, headers: { cookie: cookie.get(who)!, 'content-type': 'application/json', origin: 'https://learn.amplifiedimpact.io' }, payload: JSON.stringify(payload) });

async function team(o: { id: string; cohortId: string | null; kind?: string; origin?: string; option?: string; paymentsMade?: number }): Promise<void> {
  await handle.insert(users).values({ id: `u_${o.id}`, email: `${o.id}@example.test`, name: `Owner ${o.id}`, kind: 'learner', tier: 'team', role: 'Team Owner', teamId: `t_${o.id}`, cohortId: o.cohortId ?? DEFAULT_COHORT_ID, status: 'active', joined: NOV25, last: NOV25, seq: 100 });
  await handle.insert(teams).values({ id: `t_${o.id}`, name: `Team ${o.id}`, ownerId: `u_${o.id}`, seats: 5, seq: 100 });
  await handle.insert(accounts).values({ id: `a_${o.id}`, teamId: `t_${o.id}`, ownerUserId: `u_${o.id}`, ownerEmail: `${o.id}@example.test`, name: `Team ${o.id}`, createdAt: NOV25 });
  await handle.insert(orders).values({ id: `o_${o.id}`, plan: o.kind ?? 'cohort', option: o.option ?? 'full', origin: o.origin ?? 'payment_link', status: 'paid', name: `Owner ${o.id}`, email: `${o.id}@example.test`, paymentsMade: o.paymentsMade ?? 1, paidAt: NOV25, amountTotal: o.origin === 'comp' ? 0 : o.kind === 'agents' ? 149500 : 750000, accountId: `a_${o.id}`, createdAt: NOV25 });
  await handle.insert(plans).values({ id: `p_${o.id}`, accountId: `a_${o.id}`, kind: o.kind ?? 'cohort', option: o.option ?? 'full', seats: 5, cohortId: o.cohortId, status: 'active', startsAt: MT('2026-12-02T12:00:00'), orderId: `o_${o.id}`, createdAt: NOV25 });
}

beforeAll(async () => {
  handle = await testDatabase();
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
});
beforeEach(async () => {
  at(DEC2);
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  await applyDataMigrations(handle, NOV25);
  await team({ id: 'dec', cohortId: DEFAULT_COHORT_ID, option: 'two_pay', paymentsMade: 1 });
  await handle.insert(users).values({ id: 'u_impl', email: 'impl@example.test', name: 'Ira Implementer', kind: 'learner', tier: 'team', role: 'Operations Lead', teamId: 't_dec', cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 101 });
  await team({ id: 'plan', cohortId: null, kind: 'agents' });
  await team({ id: 'comp', cohortId: DEFAULT_COHORT_ID, origin: 'comp' });
  // A $37 skill buyer with no plan (no team of their own).
  await handle.insert(users).values({ id: 'u_skill', email: 'skill@example.test', name: 'Sky Skill', kind: 'learner', tier: 'agent', role: 'Agent', teamId: null, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 102 });
  await handle.insert(skillPurchases).values({ id: 'sp_1', userId: 'u_skill', skillId: 'map-your-spend', stripeSessionId: 'cs_1', amount: 3700, purchasedAt: NOV25 });
  await handle.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOV25 });
  utah = (await provisionGroupMember(handle, 'agent@liveutah.com', NOV25, 'Uma Utah'))!;
  // Staff beside the seed's Owner: an Admin and a Support.
  await handle.insert(users).values([
    { id: 'st_admin', email: 'admin@example.test', name: 'Avery Admin', kind: 'staff', staffRole: 'Admin', seq: 98 },
    { id: 'st_support', email: 'support@example.test', name: 'Sam Support', kind: 'staff', staffRole: 'Support', seq: 99 },
  ]);
  app = await build({ logger: false });
  for (const id of ['st_owner', 'st_admin', 'st_support']) cookie.set(id, await app.signInAs(id));
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

describe('People › Everyone: "Got in through"', () => {
  it('is the team’s primary plan, else a skill bought, else the access group', async () => {
    const res = await get('st_owner', '/api/console/users?kind=learner&limit=200');
    expect(res.statusCode, res.body).toBe(200);
    const by = new Map((res.json() as ConsolePage<ConsoleUserRow>).rows.map((u) => [u.id, u.gotIn?.label]));
    expect(by.get('u_dec')).toBe('AI Accelerator');
    expect(by.get('u_impl')).toBe('AI Accelerator');
    expect(by.get('u_plan')).toBe('Team Plan');
    expect(by.get('u_comp')).toBe('AI Accelerator');
    expect(by.get('u_skill')).toBe('Skill buyer');
    expect(by.get(utah)).toBe('Utah Life');
  });

  it('filters by it, and People’s counts agree, each person once', async () => {
    const only = async (key: string) => ((await get('st_owner', `/api/console/users?kind=learner&gotIn=${encodeURIComponent(key)}`)).json() as ConsolePage<ConsoleUserRow>).rows.map((u) => u.id);
    expect(await only('group:utah-life')).toEqual([utah]);
    expect(await only('skill')).toEqual(['u_skill']);
    expect((await only('plan:cohort')).sort()).toEqual(['u_comp', 'u_dec', 'u_impl']);
    expect((await get('st_owner', '/api/console/users?gotIn=plan:nope')).statusCode).toBe(400);
    const a = (await get('st_owner', '/api/console/users/audiences')).json() as PeopleAudiences;
    expect(a.chips.reduce((n, c) => n + c.count, 0)).toBe(a.total);
    expect(a.chips.map((c) => [c.key, c.count])).toEqual([
      ['plan:cohort', 3],
      ['plan:agents', 1],
      ['skill', 1],
      ['group:utah-life', 1],
    ]);
    expect(a.leftOut).toEqual([{ id: 'utah-life', name: 'Utah Life', count: 1 }]);
  });
});

describe('People › Teams: an access group’s team of one is left out', () => {
  it('lists every other team, with what it holds and pays', async () => {
    const rows = ((await get('st_owner', '/api/console/workspaces?limit=200')).json() as ConsolePage<WorkspaceRow>).rows;
    const ids = rows.map((w) => w.teamId);
    const utahTeam = (await handle.select({ teamId: users.teamId }).from(users).where(eq(users.id, utah)))[0]!.teamId!;
    expect(ids).not.toContain(utahTeam);
    expect(ids).toEqual(expect.arrayContaining(['t_dec', 't_plan', 't_comp']));
    const dec = rows.find((w) => w.teamId === 't_dec')!;
    expect([dec.holds, dec.paying]).toEqual([['AI Accelerator'], '1 of 2 payments']);
    expect(rows.find((w) => w.teamId === 't_plan')!.paying).toBe('$1,495 a month');
    expect(rows.find((w) => w.teamId === 't_comp')!.paying).toBe('Comped');
    const a = (await get('st_owner', '/api/console/users/audiences')).json() as PeopleAudiences;
    expect(a.teams).toBe(ids.length);
    expect(((await get('st_owner', '/api/console/workspaces?holds=agents')).json() as ConsolePage<WorkspaceRow>).rows.map((w) => w.teamId)).toEqual(['t_plan']);
  });
});

describe('People › Utah Life', () => {
  it('answers its agents, what they opened and what they open most', async () => {
    await recordVerified(handle, 'agent@liveutah.com', NOV25);
    await handle.insert(usageDaily).values([
      { day: '2026-12-01', userId: utah, teamId: null, kind: 'guide_view', count: 3 },
      { day: '2026-12-02', userId: utah, teamId: null, kind: 'guide_view', count: 2 },
    ]);
    await handle.insert(skillOpensDaily).values([
      { day: '2026-12-01', userId: utah, skillId: 'speed-to-lead', count: 1 },
      { day: '2026-12-02', userId: utah, skillId: 'listing-writer', count: 4 },
      // Outside the last 30 days: not counted.
      { day: '2026-10-01', userId: utah, skillId: 'speed-to-lead', count: 9 },
    ]);
    const res = await get('st_support', '/api/console/groups/utah-life');
    expect(res.statusCode, res.body).toBe(200);
    const g = res.json() as AccessGroupDetail;
    expect(g.agents.map((x) => [x.userId, x.firstSignIn, x.skillsOpened])).toEqual([[utah, NOV25, 5]]);
    expect(g.mostOpened.map((m) => [m.skillId, m.count])).toEqual([
      ['listing-writer', 4],
      ['speed-to-lead', 1],
    ]);
    expect((await get('st_owner', '/api/console/groups/nope')).statusCode).toBe(404);
  });

  it('lets Owner and Admin add an address outside the domain, audited once; never Support', async () => {
    const refused = await post('st_support', '/api/console/groups/utah-life/addresses', { email: 'friend@gmail.com' });
    expect(refused.statusCode).toBe(403);
    const ok = await post('st_admin', '/api/console/groups/utah-life/addresses', { email: ' Friend@Gmail.com ' });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(await handle.select({ email: accessGroupMembers.email }).from(accessGroupMembers)).toEqual([{ email: 'friend@gmail.com' }]);
    expect((await post('st_admin', '/api/console/groups/utah-life/addresses', { email: 'friend@gmail.com' })).statusCode).not.toBe(200);
    expect((await post('st_admin', '/api/console/groups/utah-life/addresses', { email: 'someone@liveutah.com' })).statusCode).not.toBe(200);
    expect((await post('st_admin', '/api/console/groups/utah-life/addresses', { email: 'not an address' })).statusCode).toBe(400);
    const rows = await handle.select().from(auditLog).where(and(eq(auditLog.action, 'access_group.address_add'), eq(auditLog.outcome, 'ok')));
    expect(rows.map((r) => [r.targetType, r.targetId])).toEqual([['access_group', 'utah-life']]);
  });

  it('ends access with a reason, audited once, and the group then grants nothing', async () => {
    await recordVerified(handle, 'agent@liveutah.com', NOV25);
    expect((await groupAccessOf(handle, 'agent@liveutah.com', DEC2)).plans).toHaveLength(1);
    expect((await post('st_support', '/api/console/groups/utah-life/end', { reason: 'The partnership ended today.' })).statusCode).toBe(403);
    expect((await post('st_owner', '/api/console/groups/utah-life/end', { reason: 'short' })).statusCode).toBe(422);
    const ok = await post('st_owner', '/api/console/groups/utah-life/end', { reason: 'The partnership ended today.' });
    expect(ok.statusCode, ok.body).toBe(200);
    const [g] = await handle.select({ expiresAt: accessGroups.expiresAt }).from(accessGroups);
    expect(g!.expiresAt).toBe(DEC2);
    expect((await groupAccessOf(handle, 'agent@liveutah.com', DEC2 + 1)).plans).toEqual([]);
    expect((await post('st_owner', '/api/console/groups/utah-life/end', { reason: 'The partnership ended today.' })).statusCode).not.toBe(200);
    const rows = await handle.select().from(auditLog).where(and(eq(auditLog.action, 'access_group.end'), eq(auditLog.outcome, 'ok')));
    expect(rows.map((r) => r.reason)).toEqual(['The partnership ended today.']);
  });
});

describe('Cohort › People and Submissions read the roster', () => {
  it('hands each roster team its payment and intake', async () => {
    await handle.insert(teamIntake).values({ teamId: 't_dec', answers: { operator: 'A teammate' }, updatedAt: NOV25, updatedBy: 'u_dec', submittedAt: NOV25, ghlSyncStatus: 'synced' });
    const f = await cohortFactsOf(handle, DEFAULT_COHORT_ID);
    expect(f.teamRows).toEqual({
      t_comp: { pay: 'comp', paymentsMade: 1, intake: 'not_started' },
      t_dec: { pay: 'two_pay', paymentsMade: 1, intake: 'submitted' },
    });
  });

  it('answers every roster team’s intake once, audited, and never Utah Life’s', async () => {
    await handle.insert(teamIntake).values({ teamId: 't_dec', answers: { operator: 'A teammate', stray: 'x' }, updatedAt: NOV25, updatedBy: 'u_dec', submittedAt: null });
    const res = await get('st_owner', `/api/admin/cohorts/${DEFAULT_COHORT_ID}/intake`);
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { teams: { teamId: string; status: string; answers: Record<string, unknown> }[] };
    expect(body.teams.map((t) => [t.teamId, t.status])).toEqual([
      ['t_comp', 'not_started'],
      ['t_dec', 'draft'],
    ]);
    expect(body.teams[1]!.answers).toEqual({ operator: 'A teammate' });
    expect((await handle.select().from(auditLog).where(eq(auditLog.action, 'intake.read'))).map((r) => r.targetId)).toEqual([DEFAULT_COHORT_ID]);
    expect((await get('st_owner', '/api/admin/cohorts/nope/intake')).statusCode).toBe(404);
  });
});
