// D-243, against Postgres: who is the course's cohort and who is outside it (Connor, Nov 24: "exclude the Utah Life
// members, but I don't want it 'hardcoded'... put them in a separate category altogether").
//
// No rule names a group: a learner is outside when their team's plans don't hold the course and they hold something
// else (an access group by address, another plan or the course refunded, a skill bought on its own). Staff's
// snapshot lists them with their groups and counts every cohort without them; a learner's snapshot, a Utah Life
// agent's above all, is the one they had but for the cohort's head count. Nothing is written.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { scopeSnapshot, seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import type { Database } from '../src/db/client';
import { loadDb } from '../src/db/io';
import { accessGroups, accounts, plans, skillPurchases, teams, users } from '../src/db/schema';
import { viewerAccessFor } from '../src/lib/course-access';
import { learnerRows, outsideOf } from '../src/lib/course-members';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-24T09:00:00-07:00');
const DAY = 86_400_000;

let db: Database;
let app: App;
let seq = 900;

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  db = await testDatabase();
  app = await build({ logger: false });
});
afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});
beforeEach(async () => {
  await resetDatabase(seedForDatabase('live'));
  // The migration seeds this group; the suite's reset empties every table, so it is put back here.
  await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - DAY });
});

type PlanSpec = { kind: string; option: string; status: string };
const COURSE: PlanSpec = { kind: 'cohort', option: 'full', status: 'active' };

/** A team in the cohort with its owner (and teammates), and the plans its account holds (none: no account). */
async function team(owner: string, held: PlanSpec[], mates: string[] = []): Promise<void> {
  seq += 1;
  const teamId = `team-${owner}`;
  await db.insert(teams).values({ id: teamId, name: `Team ${owner}`, ownerId: owner, seats: 5, seq });
  await db.insert(users).values(
    [owner, ...mates].map((id, i) => ({
      id, email: `${id}@example.test`, name: `Learner ${id}`, kind: 'learner' as const, tier: 'team' as const,
      role: i === 0 ? 'Team Owner' : 'Operations Lead', teamId, cohortId: 'dec26', status: 'active' as const, joined: NOW - DAY, seq: seq * 10 + i,
    })),
  );
  if (!held.length) return;
  await db.insert(accounts).values({ id: `acct-${owner}`, teamId, ownerUserId: owner, ownerEmail: `${owner}@example.test`, name: `Team ${owner}`, createdAt: NOW - DAY });
  await db.insert(plans).values(
    held.map((p, i) => ({ id: `plan-${owner}-${i}`, accountId: `acct-${owner}`, ...p, seats: 5, cohortId: 'dec26', startsAt: NOW - 20 * DAY, orderId: `ord-${owner}-${i}`, createdAt: NOW - DAY })),
  );
}

/** A Utah Life sign-up, made as the welcome page makes one; `followed` when they spent their link. */
async function utahLife(email: string, followed: boolean): Promise<string> {
  const id = await provisionGroupMember(db, email, NOW - DAY);
  expect(id).not.toBeNull();
  if (followed) {
    await recordVerified(db, email, NOW - DAY);
    await db.update(users).set({ status: 'active', last: NOW - DAY }).where(eq(users.id, id!));
  }
  return id!;
}

/** Everyone the course doesn't hold, in the shape a test can read. */
async function population() {
  await team('own-c', [COURSE], ['ops-c']); // the course, and their operator through its plan
  await team('own-p', [{ kind: 'cohort', option: 'two_pay', status: 'past_due' }]); // the course, paused for a payment
  await team('own-q', [{ kind: 'cohort', option: 'two_pay', status: 'canceled' }]); // the course, its two payments made
  await team('own-r', [{ kind: 'cohort', option: 'full', status: 'ended' }]); // the course, refunded
  await team('own-a', [{ kind: 'agent_plan', option: 'monthly', status: 'active' }]); // another plan
  await team('own-s', []); // a skill bought on its own
  await team('own-t', []); // a skill bought, then refunded: holds nothing
  await db.insert(skillPurchases).values([
    { id: 'sp-s', userId: 'own-s', skillId: 'perfect-week', stripeSessionId: 'cs_s', purchasedAt: NOW - DAY },
    { id: 'sp-t', userId: 'own-t', skillId: 'perfect-week', stripeSessionId: 'cs_t', purchasedAt: NOW - DAY, refundedAt: NOW - DAY / 2 },
  ]);
  const jane = await utahLife('jane@liveutah.com', true);
  const sam = await utahLife('sam@liveutah.com', false);
  // A Utah Life agent who bought the course too is the course's.
  const kim = await utahLife('kim@liveutah.com', true);
  const [kimRow] = await db.select({ teamId: users.teamId }).from(users).where(eq(users.id, kim));
  await db.insert(accounts).values({ id: 'acct-kim', teamId: kimRow!.teamId!, ownerUserId: kim, ownerEmail: 'kim@liveutah.com', name: 'Kim', createdAt: NOW - DAY });
  await db.insert(plans).values({ id: 'plan-kim', accountId: 'acct-kim', ...COURSE, seats: 1, cohortId: 'dec26', startsAt: NOW - 20 * DAY, orderId: 'ord-kim', createdAt: NOW - DAY });
  return { jane, sam, kim, outside: ['own-r', 'own-a', 'own-s', jane, sam].sort() };
}

const snapshot = async (cookie: string): Promise<Db> => {
  const res = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Db;
};
const noCount = (d: Db) => ({ ...d, cohorts: d.cohorts.map(({ enrolled: _n, ...c }) => c) });

describe('who is outside the course (D-243)', () => {
  it('nobody, in the demo database, which has no plan rows: it counts as it did', async () => {
    expect(await outsideOf(db, await learnerRows(db), NOW, { groups: true })).toEqual({ ids: [], groups: [] });
  });

  it('an access group’s members, another plan’s buyer, a refunded buyer and a skill’s; never the course’s', async () => {
    const p = await population();
    const out = await outsideOf(db, await learnerRows(db), NOW, { groups: true });
    expect([...out.ids].sort()).toEqual(p.outside);
    // Utah Life by address: the agent who followed their link and the one who hasn't yet. Not Kim, who bought the course.
    expect(out.groups.map((g) => ({ ...g, ids: [...g.ids].sort() }))).toEqual([{ id: 'utah-life', name: 'Utah Life', ids: [p.jane, p.sam].sort() }]);
    // A caller that only counts can leave the groups.
    expect((await outsideOf(db, await learnerRows(db), NOW, { groups: false })).groups).toEqual([]);
  });

  it('a group past its end date names nobody, so its people hold nothing and stay as they were', async () => {
    const p = await population();
    await db.update(accessGroups).set({ expiresAt: NOW - 1 }).where(eq(accessGroups.id, 'utah-life'));
    const out = await outsideOf(db, await learnerRows(db), NOW, { groups: true });
    expect(out.groups).toEqual([]);
    expect(out.ids).not.toContain(p.jane);
  });
});

describe('the snapshot (D-243)', () => {
  it('gives staff the list and their groups, and counts the cohort without them', async () => {
    const p = await population();
    const staff = await snapshot(await app.signInAs('st1'));
    expect([...(staff.outside?.ids ?? [])].sort()).toEqual(p.outside);
    expect(staff.outside?.groups.map((g) => g.name)).toEqual(['Utah Life']);
    const all = await loadDb(db);
    const dec = all.users.filter((u) => u.cohortId === 'dec26' && u.test !== true);
    expect(staff.cohorts.find((c) => c.id === 'dec26')?.enrolled).toBe(dec.filter((u) => !p.outside.includes(u.id)).length);
    expect(dec.length - p.outside.length).toBeGreaterThan(0);
  });

  it('gives a course learner the true head count and never the list', async () => {
    const p = await population();
    const own = await snapshot(await app.signInAs('own-c'));
    expect(own).not.toHaveProperty('outside');
    const all = await loadDb(db);
    expect(own.cohorts.find((c) => c.id === 'dec26')?.enrolled).toBe(all.users.filter((u) => u.cohortId === 'dec26' && u.test !== true && !p.outside.includes(u.id)).length);
  });

  it('gives a Utah Life agent the snapshot they had, but for the cohort’s head count', async () => {
    const p = await population();
    for (const id of [p.jane, p.sam]) {
      if (id === p.sam) await db.update(users).set({ status: 'active' }).where(eq(users.id, id));
      const seen = await snapshot(await app.signInAs(id));
      expect(seen).not.toHaveProperty('outside');
      // What the route served before D-243: every row, scoped, with their own access.
      const before = scopeSnapshot(await loadDb(db), { kind: 'learner', userId: id }, await viewerAccessFor(db, id, NOW));
      expect(noCount(seen)).toEqual(noCount(JSON.parse(JSON.stringify(before)) as Db));
    }
  });
});
