// R-5 Phase 3 (D-255): the Cohort page through the real API. Migration 0044's columns round-trip through Postgres; the
// Settings writes run on `POST /api/admin/actions/:name` with one audit row each; the facts route reads the test sends'
// audit rows and the cohort's plans; Open enrollment refuses with "Before it opens"'s first line; the staff preview
// reads a cohort's course; a staff member's last cohort is remembered in `users.prefs`; and December's run data step
// writes its run once.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { DECEMBER_RUN_V1 } from '@ai/core/seed/december-run-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { audit } from '../src/console/audit';
import { applyDataMigrations } from '../src/db/data-migrations';
import { accounts, auditLog, cohorts, dataMigrations, plans, teams, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOW = MT('2026-11-26T12:00:00');

const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: ['accelerator-week-1', 'accelerator-week-2', 'accelerator-week-3', 'accelerator-week-4', 'accelerator-week-5', 'accelerator-week-6'],
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
const get = async (who: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(who) } });
const january = async (): Promise<string> => {
  const res = await act('st_owner', 'createCohortFromShape', JANUARY);
  expect(res.statusCode, res.body).toBe(200);
  return (res.json() as { cohort: { cohortId: string } }).cohort.cohortId;
};

beforeAll(async () => {
  handle = await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  const db: Db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  await resetDatabase(db);
  // Every data step the deploy runs, December's run among them.
  await applyDataMigrations(handle, NOW);
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('December’s run data step', () => {
  it('ran once, wrote December’s run and nothing else, and is recorded', async () => {
    const [row] = await handle.select().from(dataMigrations).where(eq(dataMigrations.id, DECEMBER_RUN_V1));
    expect(row).toBeDefined();
    const [dec] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect((dec!.run as { n: number }[]).map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    // R-5 Phase 5 (D-262): its included time is written by Phase 5's own step (`2026-11-27-december-selling`), not this one.
    expect(dec).toMatchObject({ shape: null, words: null, hosts: null, wordsCheckedAt: null, overlapOkAt: null });
    const rows = (await handle.select().from(auditLog).where(eq(auditLog.targetId, DEFAULT_COHORT_ID))).filter((r) => r.reason?.includes('D-255'));
    expect(rows.map((r) => [r.action, r.before])).toEqual([['curriculum.migrate', { run: null }]]);
    expect(await applyDataMigrations(handle, NOW)).toEqual([]);
  });
});

describe('New cohort and the Settings writes, through the admin actions', () => {
  it('January’s words, included time and hosts round-trip through migration 0044', async () => {
    const id = await january();
    const jan = (await loadDb()).cohorts.find((c) => c.id === id)!;
    expect(jan.includedUntil).toBe('2027-05-10');
    expect(jan.words?.promise).toBe((await loadDb()).cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.course!.intro.sub);
    expect(jan.wordsCheckedAt).toBeUndefined();

    const words = await act('st_owner', 'saveCohortWords', { cohortId: id, name: 'January 2027 Cohort', promise: 'Six weeks of building.', how: ['A week opens on Sunday.'], holiday: '' });
    expect(words.statusCode, words.body).toBe(200);
    const hosts = await act('st_owner', 'saveCohortHosts', { cohortId: id, hosts: 'Spring' });
    expect(hosts.statusCode, hosts.body).toBe(200);
    const kept = await act('st_owner', 'keepCohortOverlap', { cohortId: id });
    expect(kept.statusCode, kept.body).toBe(200);
    const included = await act('st_owner', 'saveCohortIncluded', { cohortId: id, date: '2027-05-11' });
    expect(included.statusCode, included.body).toBe(200);

    const after = (await loadDb()).cohorts.find((c) => c.id === id)!;
    expect(after).toMatchObject({ words: { promise: 'Six weeks of building.', how: ['A week opens on Sunday.'], holiday: '' }, wordsCheckedAt: NOW, overlapOkAt: NOW, includedUntil: '2027-05-11' });
    expect(after.shape!.hosts).toBe('Spring');
    const actions = (await handle.select().from(auditLog).where(eq(auditLog.targetId, id)).orderBy(auditLog.id)).map((r) => r.action);
    expect(actions).toEqual(['cohort.create', 'cohort.words_save', 'cohort.hosts_save', 'cohort.overlap_keep', 'cohort.included_save']);
  });

  it('refuses a role without the cohorts permission', async () => {
    const id = await january();
    expect((await act('st_editor', 'saveCohortWords', { cohortId: id, name: 'x', promise: 'x', how: [], holiday: '' })).statusCode).toBe(403);
  });

  it('freezes the included time once a seat is sold in the cohort', async () => {
    const id = await january();
    const [owner] = await handle.select().from(users).where(eq(users.id, 'st_owner'));
    await handle.insert(teams).values({ id: 't_jan', name: 'Jan Team', ownerId: owner!.id });
    await handle.insert(accounts).values({ id: 'a_jan', teamId: 't_jan', ownerUserId: owner!.id, ownerEmail: owner!.email, name: 'Jan Team', createdAt: NOW });
    await handle.insert(plans).values({ id: 'p_jan', accountId: 'a_jan', kind: 'cohort', option: 'full', seats: 2, status: 'active', cohortId: id, startsAt: NOW, orderId: 'o_jan', createdAt: NOW });
    const res = await act('st_owner', 'saveCohortIncluded', { cohortId: id, date: '2027-05-11' });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: string }).error).toBe('A seat in this cohort is sold, so its included time stays as it is.');
  });

  it('never lays December out by a shape; its hosts are its own', async () => {
    const shape = await act('st_owner', 'saveCohortShape', { cohortId: DEFAULT_COHORT_ID, picks: JANUARY.picks, shape: JANUARY.shape });
    expect(shape.statusCode).toBe(422);
    const hosts = await act('st_owner', 'saveCohortHosts', { cohortId: DEFAULT_COHORT_ID, hosts: 'Connor Leiva' + ' and Spring' });
    expect(hosts.statusCode, hosts.body).toBe(200);
    const [dec] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect(dec).toMatchObject({ shape: null, hosts: 'Connor Leiva and Spring' });
  });
});

describe('the cohort facts route and Open enrollment', () => {
  it('reads the two test sends from the audit log, for staff with the cohorts permission only', async () => {
    const id = await january();
    const url = `/api/admin/cohorts/${id}/facts`;
    expect((await get('st_owner', url)).json()).toEqual({
      testSends: { welcome: false, week0: false },
      plans: 0,
      teams: 0,
      learners: 0,
      intakeNotStarted: 0,
      intakeGhlFailed: 0,
      signedIn: 0,
      intakeSubmitted: 0,
      paidInFull: 0,
      // R-5 audit (D-267): the second payments still to come on its two-payment seats (Needs You).
      secondPayments: { count: 0, each: null, next: null },
      // R-5 Phase 5 (D-262): what Stripe says about its keys and links; this test has no Stripe key.
      stripe: { prices: 'unavailable', price: {}, links: 'unavailable', link: {} },
    });
    await audit(null, { action: 'welcome.test_send', outcome: 'ok', actor: { source: 'system' }, target: { type: 'cohort', id, label: 'January' } }, handle);
    await audit(null, { action: 'week0.test_send', outcome: 'failed', actor: { source: 'system' }, target: { type: 'cohort', id, label: 'January' } }, handle);
    expect((await get('st_owner', url)).json()).toMatchObject({ testSends: { welcome: true, week0: false }, plans: 0 });
    expect((await get('st_editor', url)).statusCode).toBe(403);
    expect((await get('st_owner', '/api/admin/cohorts/nope/facts')).statusCode).toBe(404);
  });

  it('refuses Open enrollment for January with the first line not done, and opens nothing', async () => {
    const id = await january();
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/openEnrollment',
      headers: { cookie: await app.signInAs('st_owner'), 'content-type': 'application/json' },
      payload: JSON.stringify({ cohortId: id }),
    });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: string }).error).toBe('Sessions: 12 on the calendar. 5 are at the same time as December’s office hours.');
    const [jan] = await handle.select().from(cohorts).where(eq(cohorts.id, id));
    expect(jan!.status).toBe('draft');
  });

  it('answers Open enrollment on December as before, though the data step wrote its run', async () => {
    const [before] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect(before!.run, 'the data step wrote December’s run').not.toBeNull();
    const res = await app.inject({
      method: 'POST',
      url: '/api/mutate/openEnrollment',
      headers: { cookie: await app.signInAs('st_owner'), 'content-type': 'application/json' },
      payload: JSON.stringify({ cohortId: DEFAULT_COHORT_ID }),
    });
    expect((res.json() as { error: string }).error).toBe('Only a draft cohort can open for enrollment.');
    const [after] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    expect(after!.status).toBe(before!.status);
  });
});

describe('Preview, and the last cohort looked at', () => {
  it('the staff preview reads the cohort its ?cohort= names; a learner’s ?cohort= changes nothing', async () => {
    const id = await january();
    const res = await get('st_owner', `/api/course?cohort=${id}`);
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { preview: boolean; course: { weeks: { week: number }[] }; sessions: { id: string }[] };
    expect(body.preview).toBe(true);
    expect(body.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(body.sessions).toHaveLength(12);
    const dec = (await get('st_owner', '/api/course')).json() as { course: { weeks: unknown[] } };
    expect(dec.course.weeks).toHaveLength(9);
  });

  it('PATCH /api/me/prefs keeps a staff member’s cohort, beside the other keys', async () => {
    const cookie = await app.signInAs('st_owner');
    const res = await app.inject({ method: 'PATCH', url: '/api/me/prefs', headers: { cookie, 'content-type': 'application/json' }, payload: JSON.stringify({ cohort: 'c_jan' }) });
    expect(res.statusCode, res.body).toBe(200);
    expect((res.json() as { prefs: unknown }).prefs).toEqual({ cohort: 'c_jan' });
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect((me.json() as { prefs: unknown }).prefs).toEqual({ cohort: 'c_jan' });
    const bad = await app.inject({ method: 'PATCH', url: '/api/me/prefs', headers: { cookie, 'content-type': 'application/json' }, payload: JSON.stringify({ cohort: '' }) });
    expect(bad.statusCode).toBe(400);
  });
});
