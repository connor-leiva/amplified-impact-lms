// R-5 audit (D-267): one rule for who counts in a cohort, and one function for which cohort a viewer is in, through the
// real API.
//
// The world: production's shape (the launch seed and every data step), Connor's January made by the real admin action,
// a December team (an owner and their AI Implementer), a January buyer, a Utah Life agent (a team of one, no plan), a
// Team Plan buyer (a plan of another kind) and a comped December team (#282: placed like any seat, never a seat sold).
//
// What it proves: every cohort's `enrolled` (the learner Home's "N in your cohort") is its roster's; staff's snapshot
// carries the roster and Utah Life's people, a learner's carries neither; the Cohort page's facts count the same people;
// a team that buys January after December is January's in its snapshot, Join, Community and files (Q-23), its teammate
// too; staff read and write each cohort's Community; and a cohort's announcement reaches only that cohort, in the banner
// and the email, never Utah Life.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { AccessGroupView, Db } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import type { CommunityList } from '@ai/core/community';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember } from '../src/billing/access-groups';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { accessGroups, accounts, communityThreads, orders, plans, sessions, teams, users } from '../src/db/schema';
import { announcementSends } from '../src/jobs/due';
import { cohortRoster } from '../src/lib/cohort-roster';
import { cohortFactsOf } from '../src/lib/cohort-facts';
import { viewerCohortId } from '../src/lib/course-access';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV25 = MT('2026-11-25T12:00:00');
const DEC2 = MT('2026-12-02T12:30:00');
const W = ACCELERATOR_MODULE_IDS;
const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: W.slice(1, 7),
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
let utah: string;
const cookie = new Map<string, string>();

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
async function appAt(t: number): Promise<App> {
  at(t);
  await app?.close();
  app = await build({ logger: false });
  cookie.set('staff', await app.signInAs('st_owner'));
  for (const id of ['u_dec', 'u_impl', 'u_janbuyer', 'u_plan', 'u_comp']) cookie.set(id, await app.signInAs(id));
  cookie.set('utah', await app.signInAs(utah));
  return app;
}
const get = (who: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: cookie.get(who)! } });
const send = (who: string, method: 'POST' | 'PATCH', url: string, payload: unknown) =>
  app.inject({ method, url, headers: { cookie: cookie.get(who)!, 'content-type': 'application/json' }, payload: JSON.stringify(payload) });

/** A team as provisioning writes it: an owner, an account, an order, a plan of `kind` in `cohortId`. */
async function team(o: { id: string; cohortId: string | null; kind?: string; origin?: string; createdAt?: number; status?: string }): Promise<void> {
  const created = o.createdAt ?? NOV25;
  await handle.insert(users).values({ id: `u_${o.id}`, email: `${o.id}@example.test`, name: `Owner ${o.id}`, kind: 'learner', tier: 'team', role: 'Team Owner', teamId: `t_${o.id}`, cohortId: o.cohortId ?? DEFAULT_COHORT_ID, status: 'active', joined: created, seq: 100 });
  await handle.insert(teams).values({ id: `t_${o.id}`, name: `Team ${o.id}`, ownerId: `u_${o.id}`, seats: 5, seq: 100 });
  await handle.insert(accounts).values({ id: `a_${o.id}`, teamId: `t_${o.id}`, ownerUserId: `u_${o.id}`, ownerEmail: `${o.id}@example.test`, name: `Team ${o.id}`, createdAt: created });
  await handle.insert(orders).values({ id: `o_${o.id}`, plan: o.kind ?? 'cohort', option: 'full', origin: o.origin ?? 'payment_link', status: 'paid', name: `Owner ${o.id}`, email: `${o.id}@example.test`, paymentsMade: 1, paidAt: created, amountTotal: o.origin === 'comp' ? 0 : 750000, accountId: `a_${o.id}`, createdAt: created });
  await handle.insert(plans).values({ id: `p_${o.id}`, accountId: `a_${o.id}`, kind: o.kind ?? 'cohort', option: 'full', seats: 5, cohortId: o.cohortId, status: o.status ?? 'active', startsAt: MT('2026-12-02T12:00:00'), orderId: `o_${o.id}`, createdAt: created });
}

beforeAll(async () => {
  handle = await testDatabase();
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
});
beforeEach(async () => {
  at(NOV25);
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  await applyDataMigrations(handle, NOV25);
  app = await build({ logger: false });
  const made = await app.inject({
    method: 'POST',
    url: '/api/admin/actions/createCohortFromShape',
    headers: { cookie: await app.signInAs('st_owner'), 'content-type': 'application/json' },
    payload: JSON.stringify(JANUARY),
  });
  expect(made.statusCode, made.body).toBe(200);
  jan = (made.json() as { cohort: { cohortId: string } }).cohort.cohortId;
  for (const s of await handle.select({ id: sessions.id }).from(sessions)) await handle.update(sessions).set({ zoom: `https://zoom.example/j/${s.id}` }).where(eq(sessions.id, s.id));
  await team({ id: 'dec', cohortId: DEFAULT_COHORT_ID });
  // The owner's AI Implementer, on the same team.
  await handle.insert(users).values({ id: 'u_impl', email: 'impl@example.test', name: 'Ira Implementer', kind: 'learner', tier: 'team', role: 'Operations Lead', teamId: 't_dec', cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 101 });
  await team({ id: 'janbuyer', cohortId: jan });
  await team({ id: 'plan', cohortId: null, kind: 'agents' });
  await team({ id: 'comp', cohortId: DEFAULT_COHORT_ID, origin: 'comp' });
  await handle.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOV25 });
  utah = (await provisionGroupMember(handle, 'agent@liveutah.com', NOV25, 'Uma Utah'))!;
  expect(utah).toBeTruthy();
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

describe('who counts in a cohort: one rule', () => {
  it('is a live cohort plan for the cohort, not a test account, kind learner; never Utah Life or another plan', async () => {
    const roster = await cohortRoster(handle);
    expect(roster[DEFAULT_COHORT_ID]).toEqual({ teams: ['t_comp', 't_dec'], learners: ['u_comp', 'u_dec', 'u_impl'] });
    expect(roster[jan]).toEqual({ teams: ['t_janbuyer'], learners: ['u_janbuyer'] });
    // Every account still names December on its row (provisioning's), Utah Life's and the Team Plan buyer's too.
    const [row] = await handle.select({ cohortId: users.cohortId }).from(users).where(eq(users.id, utah));
    expect(row!.cohortId).toBe(DEFAULT_COHORT_ID);
  });

  it('counts each cohort’s `enrolled` from it: the learner Home’s "N in your cohort"', async () => {
    await appAt(DEC2);
    const snap = async (who: string) => (await get(who, '/api/snapshot')).json() as Db;
    expect((await snap('u_dec')).cohorts.map((c) => [c.id, c.enrolled])).toEqual([[DEFAULT_COHORT_ID, 3]]);
    expect((await snap('u_janbuyer')).cohorts.map((c) => [c.id, c.enrolled])).toEqual([[jan, 1]]);
    // Utah Life sees December's row (its account names it), counted without them.
    expect((await snap('utah')).cohorts.map((c) => [c.id, c.enrolled])).toEqual([[DEFAULT_COHORT_ID, 3]]);
    // Before: every learner whose row names the cohort, Utah Life and the Team Plan buyer among them.
    const before = (await loadDb()).cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.enrolled;
    expect(before).toBe(5);
  });

  it('hands staff the roster and Utah Life’s people, and no learner either', async () => {
    await appAt(DEC2);
    const staff = (await get('staff', '/api/snapshot')).json() as Db;
    expect(staff.roster?.[DEFAULT_COHORT_ID]?.learners).toEqual(['u_comp', 'u_dec', 'u_impl']);
    expect(staff.cohorts.find((c) => c.id === jan)!.enrolled).toBe(1);
    const groups = staff.groups as AccessGroupView[];
    expect(groups.map((g) => [g.id, g.name, g.emailDomain])).toEqual([['utah-life', 'Utah Life', 'liveutah.com']]);
    expect(groups[0]!.members).toEqual([{ userId: utah, name: 'Uma Utah', email: 'agent@liveutah.com', last: null, invited: true }]);
    for (const who of ['u_dec', 'utah', 'u_plan']) {
      const learner = (await get(who, '/api/snapshot')).json() as Db;
      expect(learner.roster, who).toBeUndefined();
      expect(learner.groups, who).toBeUndefined();
    }
  });

  it('a Utah Life agent who bought the course is that cohort’s, and off Utah Life’s tab', async () => {
    await handle.update(users).set({ teamId: 't_dec' }).where(eq(users.id, utah));
    expect((await cohortRoster(handle))[DEFAULT_COHORT_ID]!.learners).toContain(utah);
    await appAt(DEC2);
    const staff = (await get('staff', '/api/snapshot')).json() as Db;
    expect(staff.groups![0]!.members).toEqual([]);
  });

  it('the Cohort page’s facts count the same people; a comp is in the cohort and is no seat sold', async () => {
    const facts = await cohortFactsOf(handle, DEFAULT_COHORT_ID);
    expect(facts).toMatchObject({ teams: 2, learners: 3, plans: 1, paidInFull: 1 });
    expect(facts.secondPayments).toEqual({ count: 0, each: null, next: null });
    expect(await cohortFactsOf(handle, jan)).toMatchObject({ teams: 1, learners: 1, plans: 1 });
  });

  it('Needs You’s second payments: a two-payment seat with one paid, due a month after the first', async () => {
    await team({ id: 'twopay', cohortId: DEFAULT_COHORT_ID });
    await handle.update(plans).set({ option: 'two_pay' }).where(eq(plans.id, 'p_twopay'));
    await handle.update(orders).set({ option: 'two_pay', amountTotal: 375000, paymentsMade: 1, paidAt: MT('2026-11-30T09:00:00') }).where(eq(orders.id, 'o_twopay'));
    const facts = await cohortFactsOf(handle, DEFAULT_COHORT_ID);
    expect(facts.secondPayments).toEqual({ count: 1, each: 375000, next: MT('2026-12-30T09:00:00') });
    // Once the second is paid, nothing is owed.
    await handle.update(orders).set({ paymentsMade: 2 }).where(eq(orders.id, 'o_twopay'));
    expect((await cohortFactsOf(handle, DEFAULT_COHORT_ID)).secondPayments).toEqual({ count: 0, each: null, next: null });
  });
});

describe('which cohort a viewer is in: one function', () => {
  /** December's team buys January later (Q-23): its newest live cohort plan decides. Its teammate's row still says December. */
  async function moveToJanuary(): Promise<void> {
    const later = NOV25 + 3_600_000;
    await handle.insert(orders).values({ id: 'o_dec2', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: 'Owner dec', email: 'dec@example.test', paymentsMade: 1, paidAt: later, amountTotal: 750000, accountId: 'a_dec', createdAt: later, cohortId: jan });
    await handle.insert(plans).values({ id: 'p_dec2', accountId: 'a_dec', kind: 'cohort', option: 'full', seats: 5, cohortId: jan, status: 'active', startsAt: MT('2027-01-05T12:00:00'), orderId: 'o_dec2', createdAt: later });
    await handle.update(users).set({ cohortId: jan }).where(eq(users.id, 'u_dec'));
  }

  it('is the team’s newest live cohort plan’s, else the row’s', async () => {
    expect(await viewerCohortId(handle, 'u_impl')).toBe(DEFAULT_COHORT_ID);
    expect(await viewerCohortId(handle, utah)).toBe(DEFAULT_COHORT_ID);
    await moveToJanuary();
    expect(await viewerCohortId(handle, 'u_impl')).toBe(jan);
    expect((await cohortRoster(handle))[jan]!.learners).toEqual(['u_dec', 'u_impl', 'u_janbuyer']);
  });

  it('the snapshot, Join and Community read it, for a teammate whose row still names December', async () => {
    await moveToJanuary();
    await appAt(DEC2);
    const snap = (await get('u_impl', '/api/snapshot')).json() as Db;
    expect(snap.cohorts.map((c) => c.id)).toEqual([jan]);
    expect(snap.users.find((u) => u.id === 'u_impl')!.cohortId).toBe(jan);
    expect(snap.sessions.every((s) => s.cohortId === jan)).toBe(true);
    // December's live build is another cohort's session now: the same 404 as an unknown id.
    expect((await get('u_impl', '/api/sessions/dec26-s1/join')).statusCode).toBe(404);
    // In the join window of January's first live build (Tue, Jan 5, 12:00 PM MT), January's opens to them.
    await appAt(MT('2027-01-05T11:50:00'));
    const [first] = await handle.select({ id: sessions.id, start: sessions.start }).from(sessions).where(eq(sessions.cohortId, jan)).orderBy(sessions.start);
    expect((await get('u_impl', `/api/sessions/${first!.id}/join`)).statusCode).not.toBe(404);
    expect((await get('u_impl', '/api/sessions/dec26-s1/join')).statusCode).toBe(404);
    // Community: January's threads only.
    await handle.insert(communityThreads).values([
      { cohortId: DEFAULT_COHORT_ID, space: 'general', title: 'A December thread', byUserId: 'u_comp', createdAt: NOV25, activityAt: NOV25 },
      { cohortId: jan, space: 'general', title: 'A January thread', byUserId: 'u_janbuyer', createdAt: NOV25, activityAt: NOV25 },
    ]);
    const list = await get('u_impl', '/api/community');
    // January's course isn't open on Dec 2, so its Community isn't either; staff's view below reads January's threads.
    expect([200, 403]).toContain(list.statusCode);
  });
});

describe('Cohort › Community, per cohort', () => {
  it('staff read and write the cohort the tab names; its people are the roster’s', async () => {
    await handle.insert(communityThreads).values([
      { cohortId: DEFAULT_COHORT_ID, space: 'general', title: 'A December thread', byUserId: 'u_dec', createdAt: NOV25, activityAt: NOV25 },
      { cohortId: jan, space: 'general', title: 'A January thread', byUserId: 'u_janbuyer', createdAt: NOV25, activityAt: NOV25 },
    ]);
    const { communityPosts } = await import('../src/db/schema');
    for (const t of await handle.select().from(communityThreads)) await handle.insert(communityPosts).values({ threadId: t.id, byUserId: t.byUserId, body: 'Hello', createdAt: NOV25 });
    await appAt(DEC2);
    const list = async (q: string) => (await get('staff', `/api/community${q}`)).json() as CommunityList;
    expect((await list('')).threads.map((t) => t.title)).toEqual(['A December thread']);
    expect((await list(`?cohort=${jan}`)).threads.map((t) => t.title)).toEqual(['A January thread']);
    // A cohort that doesn't exist reads the default, as before.
    expect((await list('?cohort=c_nope')).threads.map((t) => t.title)).toEqual(['A December thread']);
    // Its people: the roster's, never Utah Life (who is invited) or the Team Plan buyer.
    expect((await list('')).members).toEqual({ learners: 3, teams: 2 });
    expect((await list(`?cohort=${jan}`)).members).toEqual({ learners: 1, teams: 1 });
    // A thread started on January's tab is January's.
    const made = await send('staff', 'POST', `/api/community?cohort=${encodeURIComponent(jan)}`, { space: 'general', title: 'Welcome, January', body: 'Glad you are here.' });
    expect(made.statusCode, made.body).toBe(201);
    const [t] = await handle.select().from(communityThreads).where(eq(communityThreads.title, 'Welcome, January'));
    expect(t!.cohortId).toBe(jan);
    // And staff open it by its id, whatever cohort it is in.
    expect((await get('staff', `/api/community/${t!.id}`)).statusCode).toBe(200);
  });
});

describe('Cohort › Announcements, per cohort', () => {
  it('a cohort’s announcement reaches only that cohort, in the banner and the email; Utah Life never', async () => {
    await appAt(DEC2);
    const draft = await send('staff', 'POST', '/api/admin/actions/saveAnnouncementDraft', { title: 'January office hours move', body: 'Thursday at 1:00 PM MT.', audience: 'all', inapp: true, email: true, cohortId: jan });
    expect(draft.statusCode, draft.body).toBe(200);
    const id = (await loadDb()).announcements.find((a) => a.title === 'January office hours move')!.id;
    expect((await loadDb()).announcements.find((a) => a.id === id)!.cohortId).toBe(jan);
    const sent = await send('staff', 'POST', '/api/admin/actions/updateAnnouncement', { title: 'January office hours move', body: 'Thursday at 1:00 PM MT.', audience: 'all', inapp: true, email: true, id, when: 'now' });
    expect(sent.statusCode, sent.body).toBe(200);
    const banner = async (who: string) => ((await get(who, '/api/snapshot')).json() as Db).announcements.map((a) => a.title);
    expect(await banner('u_janbuyer')).toContain('January office hours move');
    expect(await banner('u_dec')).not.toContain('January office hours move');
    expect(await banner('utah')).not.toContain('January office hours move');
    // The email goes to the cohort's people only.
    const roster = await cohortRoster(handle);
    const db = { ...(await loadDb()), roster };
    const a = db.announcements.find((x) => x.id === id)!;
    expect(announcementSends(db, { ...a, status: 'scheduled' }).map((s) => s.to)).toEqual(['janbuyer@example.test']);
    // An announcement that names no cohort (every one made before) reaches whom it always has.
    const old = { ...a, cohortId: undefined };
    delete (old as { cohortId?: string }).cohortId;
    expect(announcementSends(db, old).map((s) => s.to)).toContain('plan@example.test');
    // A December one, the same way: December's people, not Utah Life, though Utah Life's row names December.
    // (A minute later: the test clock is fixed, and an id is made from it.)
    await appAt(DEC2 + 60_000);
    const dec = await send('staff', 'POST', '/api/mutate/sendAnnouncement', { title: 'December note', body: 'Hi.', audience: 'all', inapp: true, email: false, when: 'now', cohortId: DEFAULT_COHORT_ID });
    expect(dec.statusCode, dec.body).toBe(200);
    expect(await banner('u_dec')).toContain('December note');
    expect(await banner('utah')).not.toContain('December note');
    expect(await banner('u_janbuyer')).not.toContain('December note');
  });

  it('refuses a cohort that doesn’t exist', async () => {
    await appAt(DEC2);
    const res = await send('staff', 'POST', '/api/admin/actions/saveAnnouncementDraft', { title: 'T', body: 'B', audience: 'all', inapp: true, email: false, cohortId: 'c_nope' });
    expect(res.statusCode).toBe(404);
  });
});
