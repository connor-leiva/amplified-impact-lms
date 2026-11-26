// R-5 Phase 4 (D-261): the learner side reads its own cohort, through the real API (ADMIN-RESTRUCTURE-SPEC.md Phase
// 4, PLAN.md § 10.4).
//
// The world: December as the launch seed and the release plan make it, a December team that bought it, Connor's
// January made by the real admin action (six weeks, Tuesday build and Thursday office hours, Week 1 Sun, Jan 3), and
// the test team placed in January by hand: the deploy's own `seedTestMember` with `SEED_TEST_MEMBER_COHORT` (a test
// account, D-202, which never counts as a seat).
//
// "Done when" (the spec): the test team sees only January, a December team sees only December, and neither can reach
// the other's sessions, threads, files or replays by address. Then the emails, GoHighLevel's Cohort field and the
// weekly digest, each read from the cohort.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { Db } from '@ai/core';
import { zonedInputs } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import type { LearnerCourse } from '@ai/core/course';
import type { CommunityList } from '@ai/core/community';
import type { VideoBlock } from '@ai/core/course-types';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { cohortSeatsSold } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { seedTestMember } from '../src/db/seed-test-member';
import { accounts, announcements, auditLog, cohorts, communityThreads, modules, orders, plans, sessions, teams, users } from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { renderEmail } from '../src/email/templates';
import { dueWork } from '../src/jobs/due';
import { readWeeks, weeksOf } from '../src/jobs/enrollments';
import { contactState } from '../src/jobs/ghl-extras';
import { calendarFiles } from '../src/routes/offer-calendar';
import { resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import type { FakeBucket } from './fake-bucket';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV25 = MT('2026-11-25T12:00:00');
/** The first December live build, under way: December's course is open. */
const DEC2 = MT('2026-12-02T12:30:00');
/** Ten minutes before January's first live build (Tue, Jan 5, 12:00 PM MT): its join window. */
const JAN5_WINDOW = MT('2027-01-05T11:50:00');
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
const TEST_TEAM = 'test-team@january.example.test';
const TEST_ACCOUNT = 'accelerator-test@amplifiedimpact.io';

let handle: Database;
let app: App;
let jan: string;
const cookie = new Map<string, string>();

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
/** A fresh app at an instant, with everyone signed in at that instant. */
async function appAt(t: number): Promise<App> {
  at(t);
  await app?.close();
  app = await build({ logger: false });
  const ids = await handle.select({ id: users.id, email: users.email }).from(users);
  cookie.set('staff', await app.signInAs('st_owner'));
  cookie.set('dec', await app.signInAs('u_dec'));
  cookie.set('jan', await app.signInAs(ids.find((u) => u.email === TEST_TEAM)!.id));
  return app;
}
const get = (who: string, url: string) => app.inject({ method: 'GET', url, headers: cookie.has(who) ? { cookie: cookie.get(who)! } : {} });
const post = (who: string, url: string, payload: unknown) =>
  app.inject({ method: 'POST', url, headers: { cookie: cookie.get(who)!, 'content-type': 'application/json' }, payload: JSON.stringify(payload) });

/** A team that bought December, as provisioning writes it. */
async function decemberTeam(): Promise<void> {
  await handle.insert(users).values({ id: 'u_dec', email: 'dec@example.test', name: 'Dana December', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 't_dec', cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOV25, seq: 90 });
  await handle.insert(teams).values({ id: 't_dec', name: 'December Realty', ownerId: 'u_dec', seats: 5, seq: 90 });
  await handle.insert(accounts).values({ id: 'a_dec', teamId: 't_dec', ownerUserId: 'u_dec', ownerEmail: 'dec@example.test', name: 'December Realty', createdAt: NOV25, inviteSentAt: NOV25 });
  await handle.insert(orders).values({ id: 'o_dec', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: 'Dana December', email: 'dec@example.test', paymentsMade: 1, paidAt: NOV25, amountTotal: 750000, accountId: 'a_dec', createdAt: NOV25 });
  await handle.insert(plans).values({ id: 'p_dec', accountId: 'a_dec', kind: 'cohort', option: 'full', seats: 5, cohortId: DEFAULT_COHORT_ID, status: 'active', startsAt: MT('2026-12-02T12:00:00'), orderId: 'o_dec', createdAt: NOV25 });
}

const placeTestTeam = (over: Record<string, string> = {}) =>
  seedTestMember(handle, {
    SEED_TEST_MEMBER_EMAIL: TEST_TEAM,
    SEED_TEST_MEMBER_PASSWORD: 'a-long-test-password-1',
    SEED_TEST_MEMBER_NAME: 'January Test Team',
    SEED_TEST_MEMBER_KIND: 'accelerator',
    SEED_TEST_MEMBER_COHORT: jan,
    ...over,
  });

beforeAll(async () => {
  handle = await testDatabase();
  // The address every email link is made absolute against (production's learn host).
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
});
beforeEach(async () => {
  at(NOV25);
  // Production's shape: the launch seed, then every one-time data step the deploy runs (as the December test does).
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
  await decemberTeam();
  expect(await placeTestTeam()).toEqual({ status: 'created', kind: 'accelerator' });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

const sessionIds = async (cohortId: string): Promise<string[]> =>
  (await handle.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, cohortId))).map((s) => s.id).sort();

// =====================================================================================================================

describe('the test team is placed in January by hand (`SEED_TEST_MEMBER_COHORT`)', () => {
  it('is January’s: its owner, its plan, a test account with early access, and no seat', async () => {
    const [u] = await handle.select().from(users).where(eq(users.email, TEST_TEAM));
    expect(u).toMatchObject({ cohortId: jan, isTest: true, earlyAccess: true, kind: 'learner', role: 'Team Owner' });
    const [p] = await handle.select().from(plans).innerJoin(accounts, eq(plans.accountId, accounts.id)).where(eq(accounts.ownerEmail, TEST_TEAM));
    expect(p!.plans).toMatchObject({ kind: 'cohort', cohortId: jan, status: 'active' });
    // December's buyer is the one seat; the test team is none.
    expect(await cohortSeatsSold(handle)).toBe(1);
    const [row] = await handle.select().from(auditLog).where(and(eq(auditLog.action, 'user.seed'), eq(auditLog.targetId, u!.id)));
    expect(row!.after).toMatchObject({ email: TEST_TEAM, kind: 'accelerator', cohortId: jan });
    // A second deploy changes nothing.
    expect(await placeTestTeam()).toEqual({ status: 'unchanged' });
  });

  it('moves no one: an address in December, an unknown cohort and a Utah Life agent are skipped, with nothing written', async () => {
    const before = JSON.stringify(await loadDb());
    expect(await placeTestTeam({ SEED_TEST_MEMBER_EMAIL: 'dec@example.test' })).toEqual({ status: 'skipped', reason: 'cohort' });
    expect(await placeTestTeam({ SEED_TEST_MEMBER_EMAIL: 'new@january.example.test', SEED_TEST_MEMBER_COHORT: 'c_nope' })).toEqual({ status: 'skipped', reason: 'cohort' });
    expect(await placeTestTeam({ SEED_TEST_MEMBER_EMAIL: 'utah@january.example.test', SEED_TEST_MEMBER_KIND: '' })).toEqual({ status: 'skipped', reason: 'cohort' });
    expect(JSON.stringify(await loadDb())).toBe(before);
  });
});

describe('the test team sees only January; a December team sees only December', () => {
  it('GET /api/course: January’s weeks numbered 0 to 6, January’s sessions, and the program’s words', async () => {
    await appAt(DEC2);
    const res = await get('jan', '/api/course');
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { course: LearnerCourse; sessions: { id: string; week: number; start: number }[] };
    expect(body.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const titles = (await loadDb()).modules.filter((m) => W.slice(0, 7).includes(m.id)).sort((a, b) => a.course!.week - b.course!.week).map((m) => m.course!.title);
    expect(body.course.weeks.map((w) => w.title)).toEqual(titles);
    expect(body.sessions.map((s) => s.id).sort()).toEqual(await sessionIds(jan));
    expect(body.sessions.every((s) => s.week >= 1 && s.week <= 6)).toBe(true);
    expect(zonedInputs(Math.min(...body.sessions.map((s) => s.start)), 'America/Denver')).toEqual({ date: '2027-01-05', time: '12:00' });

    const dec = await get('dec', '/api/course');
    expect(dec.statusCode, dec.body).toBe(200);
    const decBody = dec.json() as { course: LearnerCourse; sessions: { id: string }[] };
    expect(decBody.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(decBody.sessions.map((s) => s.id).sort()).toEqual(await sessionIds(DEFAULT_COHORT_ID));
    // January stores no words of its own yet, so it reads the program's: December's row, as Phase 3 drafts them.
    expect(body.course.intro).toEqual(decBody.course.intro);
  });

  it('its own promise, how it works and holiday note, once January stores them; December’s are untouched', async () => {
    const [dec] = await handle.select({ course: cohorts.course }).from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    const decWords = dec!.course as LearnerCourse;
    await handle
      .update(cohorts)
      .set({ course: { intro: { sub: 'Six weeks. One hire a week.', how: ['A week opens on Sunday.', 'We build its hire together on Tuesday.'], holiday: '' } } })
      .where(eq(cohorts.id, jan));
    await appAt(DEC2);
    const mine = ((await get('jan', '/api/course')).json() as { course: LearnerCourse }).course;
    expect(mine.intro.sub).toBe('Six weeks. One hire a week.');
    expect(mine.intro.how).toEqual(['A week opens on Sunday.', 'We build its hire together on Tuesday.']);
    expect(mine.intro.holiday).toBe('');
    expect(mine.intro.title).toBe(decWords.intro.title);
    expect(mine.shared).toEqual(decWords.shared);
    expect(mine.before).toEqual(decWords.before);
    const theirs = ((await get('dec', '/api/course')).json() as { course: LearnerCourse }).course;
    expect(theirs.intro.sub).toBe(decWords.intro.sub);
    expect(theirs.intro.how).toEqual(decWords.intro.how);
    expect(theirs.intro.holiday).toBe(decWords.intro.holiday);
  });

  it('the snapshot: their own cohort, its sessions and its weeks, and none of the other’s', async () => {
    await appAt(DEC2);
    const mine = (await get('jan', '/api/snapshot')).json() as Db;
    expect(mine.cohorts.map((c) => c.id)).toEqual([jan]);
    expect(mine.sessions.map((s) => s.id).sort()).toEqual(await sessionIds(jan));
    expect(mine.modules.filter((m) => m.kind === 'week').map((m) => m.id).sort()).toEqual(W.slice(0, 7));
    // None of December's sessions, nor its cohort, anywhere but in the program's own lesson words (Week 1's "Save the
    // live build" names December's first build: content, which this work does not rewrite, spec § 8).
    const { modules: _m, ...rest } = mine;
    expect(JSON.stringify(rest)).not.toContain('dec26');
    const opens = mine.modules.find((m) => m.id === W[1])!.opens!;
    expect(zonedInputs(opens, 'America/Denver')).toEqual({ date: '2027-01-03', time: '12:00' });

    const theirs = (await get('dec', '/api/snapshot')).json() as Db;
    expect(theirs.cohorts.map((c) => c.id)).toEqual([DEFAULT_COHORT_ID]);
    expect(theirs.sessions.every((s) => s.cohortId === DEFAULT_COHORT_ID)).toBe(true);
    for (const id of await sessionIds(jan)) expect(JSON.stringify(theirs)).not.toContain(id);
  });
});

describe('neither can reach the other’s sessions, threads, files or replays by address', () => {
  it('sessions: every one of the other cohort’s answers exactly as an id that does not exist', async () => {
    await appAt(JAN5_WINDOW);
    const missing = await get('jan', '/api/sessions/no-such-session/join');
    expect(missing.statusCode).toBe(404);
    for (const id of await sessionIds(DEFAULT_COHORT_ID)) {
      const res = await get('jan', `/api/sessions/${id}/join`);
      expect([res.statusCode, res.json()], id).toEqual([404, { error: `No session ${id}` }]);
    }
    const janIds = await sessionIds(jan);
    for (const id of janIds) {
      const res = await get('dec', `/api/sessions/${id}/join`);
      expect([res.statusCode, res.json()], id).toEqual([404, { error: `No session ${id}` }]);
    }
    // Their own: January's first live build, inside its window.
    const [first] = await handle.select().from(sessions).where(and(eq(sessions.cohortId, jan), eq(sessions.kind, 'live_build'))).orderBy(sessions.start).limit(1);
    const own = await get('jan', `/api/sessions/${first!.id}/join`);
    expect([own.statusCode, own.json()]).toEqual([200, { url: `https://zoom.example/j/${first!.id}` }]);
  });

  it('threads: each cohort’s Community is its own, and the other’s thread is missing', async () => {
    await appAt(DEC2);
    const janList = (await get('jan', '/api/community')).json() as CommunityList;
    expect(janList.spaces.map((s) => s.id)).toEqual(['general', 'week-0', 'week-1', 'week-2', 'week-3', 'week-4', 'week-5', 'week-6', 'wins']);
    const janThread = await post('jan', '/api/community', { space: 'week-1', title: 'Our January question', body: 'Which export?' });
    expect(janThread.statusCode, janThread.body).toBe(201);
    const decThread = await post('dec', '/api/community', { space: 'week-1', title: 'Our December question', body: 'Which report?' });
    expect(decThread.statusCode, decThread.body).toBe(201);
    const janId = (janThread.json() as { id: number }).id;
    const decId = (decThread.json() as { id: number }).id;
    expect((await handle.select({ id: communityThreads.id, cohortId: communityThreads.cohortId }).from(communityThreads)).sort((a, b) => a.id - b.id)).toEqual(
      [
        { id: janId, cohortId: jan },
        { id: decId, cohortId: DEFAULT_COHORT_ID },
      ].sort((a, b) => a.id - b.id),
    );
    expect(((await get('jan', '/api/community')).json() as CommunityList).threads.map((t) => t.id)).toEqual([janId]);
    expect(((await get('dec', '/api/community')).json() as CommunityList).threads.map((t) => t.id)).toEqual([decId]);
    for (const [who, id] of [
      ['jan', decId],
      ['dec', janId],
    ] as const) {
      expect((await get(who, `/api/community/${id}`)).statusCode, `${who} reads ${id}`).toBe(404);
      expect((await post(who, `/api/community/${id}/replies`, { body: 'Hello' })).statusCode, `${who} replies to ${id}`).toBe(404);
    }
  });

  describe('files', () => {
    let bucket: FakeBucket;
    const KEY = { w1: 'uploads/2026/11/eeeeeeee-0000-4000-8000-000000000001.mp4', w7: 'uploads/2026/11/eeeeeeee-0000-4000-8000-000000000007.mp4' };
    const VIDEO = Buffer.from(Array.from({ length: 400 }, (_, i) => i % 256));
    const video = (key: string): VideoBlock => ({ type: 'video', source: { upload: key, name: 'Build.mp4', size: VIDEO.length, type: 'video/mp4' }, title: 'Watch this first' });
    beforeEach(async () => {
      bucket = await startFakeBucket();
      Object.assign(process.env, bucket.env);
      resetS3();
      bucket.put(KEY.w1, VIDEO, 'video/mp4');
      bucket.put(KEY.w7, VIDEO, 'video/mp4');
      for (const [id, key] of [
        [W[1]!, KEY.w1],
        [W[7]!, KEY.w7],
      ] as const) {
        const [m] = await handle.select({ course: modules.course }).from(modules).where(eq(modules.id, id));
        const course = m!.course as { media: unknown[] };
        await handle.update(modules).set({ course: { ...course, media: [...course.media, video(key)] } }).where(eq(modules.id, id));
      }
    });
    afterEach(async () => {
      for (const k of Object.keys(bucket.env)) delete process.env[k];
      resetS3();
      await bucket.close();
    });

    it('a course week’s video follows the viewer’s own cohort: a week January doesn’t take is not the test team’s', async () => {
      await appAt(DEC2);
      expect((await get('jan', `/api/files/course/${KEY.w1}`)).statusCode).toBe(200);
      expect((await get('jan', `/api/files/course/${KEY.w7}`)).statusCode).toBe(404);
      // Week 1 is open for December; Week 7 opens Jan 27.
      expect((await get('dec', `/api/files/course/${KEY.w1}`)).statusCode).toBe(200);
      expect((await get('dec', `/api/files/course/${KEY.w7}`)).statusCode).toBe(404);
      // Staff see every week, as the builder's preview does.
      expect((await get('staff', `/api/files/course/${KEY.w7}`)).statusCode).toBe(200);
    });
  });

  it('the calendar file: each cohort’s own, and the other’s is missing', async () => {
    await appAt(DEC2);
    const url = `/calendar/schedule.ics?cohort=${encodeURIComponent(jan)}`;
    const mine = await get('jan', url);
    expect(mine.statusCode).toBe(200);
    expect(mine.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(mine.headers['cache-control']).toBe('private, no-store');
    expect(mine.body).toContain('SUMMARY:Amplified AI Accelerator Live Build\\, Week 1: ');
    expect(mine.body).not.toContain('dec26');
    for (const id of await sessionIds(jan)) expect(mine.body).toContain(id);
    expect((await get('dec', url)).statusCode).toBe(404);
    expect((await get('nobody', url)).statusCode).toBe(401);
    expect((await get('staff', url)).statusCode).toBe(200);
    // December's own file, the one every other address gets, is exactly as before.
    const dec = await get('dec', '/calendar/schedule.ics');
    expect(dec.headers['cache-control']).toBe('public, max-age=3600');
    expect(dec.body).toBe((await calendarFiles()).schedule);
    expect((await get('nobody', `/calendar/schedule.ics?cohort=${DEFAULT_COHORT_ID}`)).body).toBe(dec.body);
  });

  it('replays: a published replay reaches its own cohort’s snapshot only', async () => {
    const [janFirst] = await handle.select().from(sessions).where(and(eq(sessions.cohortId, jan), eq(sessions.kind, 'live_build'))).orderBy(sessions.start).limit(1);
    for (const id of ['dec26-s1', janFirst!.id])
      await handle.update(sessions).set({ replay: 'ready', replayUrl: `https://replay.example/${id}`, replayVisibility: 'published' }).where(eq(sessions.id, id));
    await appAt(MT('2027-01-06T12:00:00'));
    const mine = JSON.stringify((await get('jan', '/api/snapshot')).json());
    const theirs = JSON.stringify((await get('dec', '/api/snapshot')).json());
    expect(mine).toContain(`https://replay.example/${janFirst!.id}`);
    expect(mine).not.toContain('https://replay.example/dec26-s1');
    expect(theirs).toContain('https://replay.example/dec26-s1');
    expect(theirs).not.toContain(`https://replay.example/${janFirst!.id}`);
  });

  it('announcements: one about a session is that session’s cohort’s; one about none is everyone’s', async () => {
    const [janFirst] = await handle.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, jan)).limit(1);
    const row = (id: string, sessionId: string | null) => ({ id, sessionId, title: id, body: 'B', severity: 'info', action: null, actionLabel: '', audience: 'all', channels: ['inapp'], status: 'sent', at: NOV25, opens: null });
    await handle.insert(announcements).values([row('a_dec', 'dec26-s1'), row('a_jan', janFirst!.id), row('a_all', null)]);
    await appAt(DEC2);
    const ids = async (who: string) => ((await get(who, '/api/snapshot')).json() as Db).announcements.map((a) => a.id).sort();
    expect(await ids('jan')).toEqual(['a_all', 'a_jan']);
    expect(await ids('dec')).toEqual(['a_all', 'a_dec']);
  });
});

describe('the emails, GoHighLevel and the digest read the cohort', () => {
  /** January's Week 0 due date, set the way Cohort › Settings › Dates and release sets it. */
  async function setJanuaryWeek0Due(): Promise<void> {
    const [row] = await handle.select({ run: cohorts.run }).from(cohorts).where(eq(cohorts.id, jan));
    const run = row!.run as { moduleId: string; n: number; opensAt: number | null }[];
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/actions/saveCohortRun',
      headers: { cookie: await app.signInAs('st_owner'), 'content-type': 'application/json' },
      payload: JSON.stringify({
        cohortId: jan,
        weeks: run.map((w) => ({
          moduleId: w.moduleId,
          opens: w.opensAt === null ? null : zonedInputs(w.opensAt, 'America/Denver'),
          due: w.n === 0 ? { date: '2027-01-02', time: '12:00' } : null,
        })),
      }),
    });
    expect(res.statusCode, res.body).toBe(200);
  }

  it('readWeeks: January’s Week 0 due date and Week 1 sessions are its own; December reads its modules as before', async () => {
    await setJanuaryWeek0Due();
    const weeks = await readWeeks(handle, jan);
    expect(weeks.filter((w) => w.week !== null).map((w) => w.week).sort((a, b) => a! - b!)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const w0 = weeks.find((w) => w.week === 0)!;
    expect(w0.dueAt).toBe(MT('2027-01-02T12:00:00'));
    const w1 = weeks.find((w) => w.week === 1)!;
    expect(await sessionIds(jan)).toContain(w1.liveSessionId);
    expect(await sessionIds(jan)).toContain(w1.officeSessionId);
    // December: the modules exactly as they are.
    const rows = await handle.select({ status: modules.status, opens: modules.opens, dueAt: modules.dueAt, checklist: modules.checklist, course: modules.course }).from(modules);
    expect(await readWeeks(handle, DEFAULT_COHORT_ID)).toEqual(weeksOf(rows));
  });

  it('the Week 0 and welcome test sends: January’s name, Week 0 due date and first live build; December’s as before', async () => {
    await setJanuaryWeek0Due();
    await appAt(NOV25);
    resetOutbox();
    const send = (path: string, cohortId: string) => post('staff', path, { to: TEST_ACCOUNT, cohortId });
    const week0Jan = await send('/api/console/week0/test', jan);
    expect(week0Jan.statusCode, week0Jan.body).toBe(200);
    expect((week0Jan.json() as { subject: string }).subject).toBe('🎉 Welcome to the January Cohort: Week 0 Is Open');
    const week0Dec = await send('/api/console/week0/test', DEFAULT_COHORT_ID);
    expect((week0Dec.json() as { subject: string }).subject).toBe('🎉 Welcome to the December Cohort: Week 0 Is Open');
    const welcomeJan = await send('/api/console/welcome/test', jan);
    expect(welcomeJan.statusCode, welcomeJan.body).toBe(200);
    expect((welcomeJan.json() as { subject: string }).subject).toBe('🎉 Welcome to the January 2027 Cohort: You’re In');
    const [jw0, dw0, jwel] = outbox();
    const firstBuild = MT('2027-01-05T12:00:00');
    expect(jw0!.data).toMatchObject({ week0DueAt: MT('2027-01-02T12:00:00'), liveBuildAt: firstBuild, liveBuildMins: 90, cohortName: 'January 2027 Cohort' });
    expect(dw0!.data).not.toHaveProperty('cohortName');
    expect(dw0!.data).toMatchObject({ week0DueAt: MT('2026-11-30T12:00:00'), liveBuildAt: MT('2026-12-02T12:00:00') });
    expect(jwel!.data).toMatchObject({ cohortName: 'January 2027 Cohort', week0DueAt: MT('2027-01-02T12:00:00'), liveBuildAt: firstBuild });
    // The body names January where Connor's copy names December.
    expect(jw0!.html).toContain('Amplified AI Accelerator · January 2027 Cohort');
    expect(jw0!.html).not.toContain('December');
  });

  it('GoHighLevel’s Cohort field: "jan27" for a January plan, "dec26" for December’s', async () => {
    // A January buyer, as Phase 5 will provision one (a plan in January). Not a test account, so the field is written.
    await handle.insert(users).values({ id: 'u_janbuyer', email: 'buyer@january.example.test', name: 'Jan Buyer', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 't_janbuyer', cohortId: jan, status: 'active', joined: NOV25, seq: 95 });
    await handle.insert(teams).values({ id: 't_janbuyer', name: 'January Realty', ownerId: 'u_janbuyer', seats: 5, seq: 95 });
    await handle.insert(accounts).values({ id: 'a_janbuyer', teamId: 't_janbuyer', ownerUserId: 'u_janbuyer', ownerEmail: 'buyer@january.example.test', name: 'January Realty', createdAt: NOV25 });
    await handle.insert(orders).values({ id: 'o_janbuyer', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: 'Jan Buyer', email: 'buyer@january.example.test', paymentsMade: 1, paidAt: NOV25, amountTotal: 750000, accountId: 'a_janbuyer', createdAt: NOV25 });
    await handle.insert(plans).values({ id: 'p_janbuyer', accountId: 'a_janbuyer', kind: 'cohort', option: 'full', seats: 5, cohortId: jan, status: 'active', startsAt: NOV25, orderId: 'o_janbuyer', createdAt: NOV25 });
    expect((await contactState(handle, 'buyer@january.example.test')).fields.cohort).toBe('jan27');
    expect((await contactState(handle, 'dec@example.test')).fields.cohort).toBe('dec26');
  });

  it('the weekly digest: a January owner’s names January’s next meeting day, or none once it meets no more', async () => {
    // January enrolling (Phase 5 opens it), so its reminders run.
    await handle.update(cohorts).set({ status: 'enrolling' }).where(eq(cohorts.id, jan));
    const db = await loadDb();
    // Automated Reminders › the weekly digest, on (`rm5`).
    db.reminders = db.reminders.map((r) => ({ ...r, on: true }));
    if (!db.reminders.some((r) => r.id === 'rm5')) db.reminders.push({ id: 'rm5', label: 'Weekly digest', channel: 'email', on: true });
    const owner = db.users.find((u) => u.email === TEST_TEAM)!;
    const digestOf = (t: number) => dueWork(db, t, new Set(), new Set([owner.id])).sends.find((s) => s.job === 'weekly-digest' && s.to === TEST_TEAM);
    const monday = Date.parse('2027-01-04T08:00:00-06:00');
    expect(digestOf(monday)?.data).toEqual({ before: 'Tuesday' });
    const after = Date.parse('2027-02-15T08:00:00-06:00');
    expect(digestOf(after)?.data).toEqual({ before: null });
    const rendered = await renderEmail('weekly-digest', { before: null });
    expect(rendered.html).toContain('Who has built and who is stuck.');
    // December's owner keeps D-110's rule: the next build's weekday.
    const dec = db.users.find((u) => u.id === 'u_dec')!;
    const decDigest = dueWork(db, monday, new Set(), new Set([dec.id])).sends.find((s) => s.job === 'weekly-digest' && s.to === dec.email);
    expect(decDigest?.data).toEqual({ before: 'Wednesday' });
  });
});
