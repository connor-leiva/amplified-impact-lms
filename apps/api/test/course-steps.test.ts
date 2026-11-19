// D-186 over HTTP: a course week's steps follow course access (the plan, D-110), not the tier.
//
// The deployed seed makes every week Team tier. An Agent Plan buyer is provisioned Agent tier
// (`billing/provision.ts` `ownerTier`), so one who also bought the course used to get "Team tier required"
// on Mark step done, and a snapshot with every week blanked. The same core function (`toggleStep`, with
// `canOpenModule`) runs here as in the browser; the route now hands it the learner's course access, read
// from the plan exactly as the snapshot reads it. A plan without the course stays shut out.
//
// Every buyer is made by the real provisioning path from a paid order row, as `course.test.ts` does.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { NOT_IN_PLAN, acceleratorModuleId, isAcceleratorModule } from '@ai/core/accelerator';
import type { Db } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import { accounts, orders, plans, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const BOUGHT = '2026-11-14T15:00:00-06:00';
/** Dec 3: the course is open and Week 1 (its build Dec 2) with it. */
const AFTER_HOLD = '2026-12-03T09:00:00-06:00';
/** Week 1's build starts: the course is open and the join window too. */
const OPENS = '2026-12-02T13:00:00-06:00';
const ORIGIN = 'http://localhost';
const WEEK1 = acceleratorModuleId(1);
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

/** `agentBuyer` holds the Agent Plan and the course; `agentPlan` the Agent Plan alone; `teamBuyer` the course alone. */
const BUYERS = {
  agentBuyer: { plan: 'agent_plan', option: 'monthly', email: 'agent-buyer@example.test' },
  agentPlan: { plan: 'agent_plan', option: 'monthly', email: 'agent-plan@example.test' },
  teamBuyer: { plan: 'cohort', option: 'full', email: 'team-buyer@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

let handle: Database;
let app: App;
let savedAppUrl: string | undefined;
const ids = new Map<Buyer, string>();
const cookies = new Map<Buyer, string>();

async function provision(buyer: Buyer): Promise<string> {
  const b = BUYERS[buyer];
  const id = `ord_${buyer}`;
  const now = Date.parse(BOUGHT);
  await handle.insert(orders).values({ id, plan: b.plan, option: b.option, origin: 'payment_link', status: 'paid', name: buyer, email: b.email, company: `${buyer} group`, crm: 'follow_up_boss', createdAt: now });
  const out = await provisionOrder(id, { db: handle, log: silent, now, invitesFrom: now, invitesEnabled: false });
  if (!out.ok) throw new Error(`provisioning ${buyer} failed: ${out.reason}`);
  const [u] = await handle.select({ id: users.id }).from(users).where(eq(users.email, b.email));
  return u!.id;
}

/** The course bought in full on the same account: a second plan, as a second checkout writes one. */
async function addCourse(userId: string): Promise<void> {
  const [u] = await handle.select({ teamId: users.teamId }).from(users).where(eq(users.id, userId));
  const [a] = await handle.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, u!.teamId!));
  const now = Date.parse(BOUGHT);
  await handle.insert(plans).values({ id: 'plan_agent_course', accountId: a!.id, kind: 'cohort', option: 'full', seats: 1, cohortId: 'dec26', status: 'active', startsAt: now, orderId: 'ord_agent_course', createdAt: now });
}

const mutate = (who: Buyer, name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/mutate/${name}`, payload: payload as object, headers: { cookie: cookies.get(who)!, origin: ORIGIN, 'content-type': 'application/json' } });
const snapshot = async (who: Buyer): Promise<Db> => (await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: cookies.get(who)! } })).json() as Db;

let firstStep = '';

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  process.env.FIXED_NOW = AFTER_HOLD;
  handle = await testDatabase();
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  firstStep = db.modules.find((m) => m.id === WEEK1)!.checklist[0]!.id;
  await resetDatabase(db);
  for (const buyer of Object.keys(BUYERS) as Buyer[]) ids.set(buyer, await provision(buyer));
  await addCourse(ids.get('agentBuyer')!);
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const minter = await build({ logger: false });
  for (const [who, id] of ids) cookies.set(who, await minter.signInAs(id));
  await minter.close();
});

afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

beforeEach(async () => {
  process.env.FIXED_NOW = AFTER_HOLD;
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
});

describe('a course week’s steps follow course access, not the tier (D-186)', () => {
  it('the seed’s weeks are Team tier, and the Agent Plan buyers are Agent tier', async () => {
    const db = await loadDb();
    expect(db.modules.find((m) => m.id === WEEK1)!.tier).toBe('team');
    expect(db.users.find((u) => u.id === ids.get('agentBuyer'))!.tier).toBe('agent');
    expect(db.users.find((u) => u.id === ids.get('agentPlan'))!.tier).toBe('agent');
  });

  it('an Agent tier course buyer sees each open week whole and marks a step done, then undoes it @parity:E-16', async () => {
    const snap = await snapshot('agentBuyer');
    const week = snap.modules.find((m) => m.id === WEEK1)!;
    expect(week.checklist.map((s) => s.id)).toContain(firstStep);

    const res = await mutate('agentBuyer', 'toggleStep', { moduleId: WEEK1, stepId: firstStep });
    expect(res.statusCode).toBe(200);
    let db = await loadDb();
    expect(db.users.find((u) => u.id === ids.get('agentBuyer'))!.progress[WEEK1]!.steps).toEqual([firstStep]);

    expect((await mutate('agentBuyer', 'toggleStep', { moduleId: WEEK1, stepId: firstStep })).statusCode).toBe(200);
    db = await loadDb();
    expect(db.users.find((u) => u.id === ids.get('agentBuyer'))!.progress[WEEK1]!.steps).toEqual([]);
  });

  it('a Team tier course buyer still marks a step done', async () => {
    expect((await mutate('teamBuyer', 'toggleStep', { moduleId: WEEK1, stepId: firstStep })).statusCode).toBe(200);
  });

  it('an Agent tier course buyer joins a week’s live build; the Agent Plan alone gets the same 404 as no session', async () => {
    process.env.FIXED_NOW = OPENS;
    const join = (who: Buyer, id: string) => app.inject({ method: 'GET', url: `/api/sessions/${id}/join`, headers: { cookie: cookies.get(who)! } });
    expect((await join('agentBuyer', 'dec26-s1')).statusCode).toBe(200);
    expect((await join('agentPlan', 'dec26-s1')).statusCode).toBe(404);
    expect((await join('agentPlan', 'dec26-nope')).statusCode).toBe(404);
  });

  it('a checklist check follows course access, and a staff session cannot write one (D-190)', async () => {
    const ok = await mutate('agentBuyer', 'toggleChecklistItem', { moduleId: WEEK1, stepId: firstStep, itemId: 'item-1' });
    expect(ok.statusCode).toBe(200);
    const buyer = (await loadDb()).users.find((u) => u.id === ids.get('agentBuyer'));
    expect(buyer?.checks).toEqual([expect.objectContaining({ moduleId: WEEK1, stepId: firstStep, itemId: 'item-1', checked: true, auto: false })]);
    const snap = await snapshot('agentBuyer');
    expect(snap.users.find((u) => u.id === ids.get('agentBuyer'))?.checks?.[0]?.itemId).toBe('item-1');

    const shut = await mutate('agentPlan', 'toggleChecklistItem', { moduleId: WEEK1, stepId: firstStep, itemId: 'item-1' });
    expect(shut.statusCode).toBe(403);

    const staff = await app.signInAs('st_owner');
    const preview = await app.inject({
      method: 'POST',
      url: '/api/mutate/toggleChecklistItem',
      payload: { moduleId: WEEK1, stepId: firstStep, itemId: 'item-1' },
      headers: { cookie: staff, origin: ORIGIN, 'content-type': 'application/json' },
    });
    expect(preview.statusCode).toBe(403);
    expect(preview.json()).toMatchObject({ error: 'That action is for learners.' });
  });

  it('saves video progress without ever lowering the watched share (D-191)', async () => {
    const first = await mutate('agentBuyer', 'saveVideoProgress', { moduleId: WEEK1, videoId: 'w0-02', maxPct: 0.5, lastPositionS: 12 });
    expect(first.statusCode).toBe(200);
    const lower = await mutate('agentBuyer', 'saveVideoProgress', { moduleId: WEEK1, videoId: 'w0-02', maxPct: 0.25, lastPositionS: 30 });
    expect(lower.statusCode).toBe(200);
    const row = (await loadDb()).users.find((u) => u.id === ids.get('agentBuyer'))!.videoProgress;
    expect(row).toEqual([expect.objectContaining({ moduleId: WEEK1, videoId: 'w0-02', maxPct: 0.5, lastPositionS: 30 })]);
    const seen = await snapshot('agentBuyer');
    expect(seen.users.find((u) => u.id === ids.get('agentBuyer'))?.videoProgress?.[0]?.maxPct).toBe(0.5);
    expect((await mutate('agentPlan', 'saveVideoProgress', { moduleId: WEEK1, videoId: 'w0-02', maxPct: 0.5, lastPositionS: 1 })).statusCode).toBe(403);
    const staff = await app.signInAs('st_owner');
    const refused = await app.inject({
      method: 'POST',
      url: '/api/mutate/saveVideoProgress',
      payload: { moduleId: WEEK1, videoId: 'w0-02', maxPct: 1, lastPositionS: 1 },
      headers: { cookie: staff, origin: ORIGIN, 'content-type': 'application/json' },
    });
    expect(refused.statusCode).toBe(403);
  });

  it('an Agent Plan learner without the course can neither see a week nor mark its step', async () => {
    const snap = await snapshot('agentPlan');
    expect(snap.modules.filter((m) => isAcceleratorModule(m.id))).toEqual([]);

    const res = await mutate('agentPlan', 'toggleStep', { moduleId: WEEK1, stepId: firstStep });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: NOT_IN_PLAN });
    const db = await loadDb();
    expect(db.users.find((u) => u.id === ids.get('agentPlan'))!.progress[WEEK1]).toBeUndefined();
  });
});
