// D-175 over HTTP: the pre-launch preview and the weekly releases, every date from data, enforced by
// what the server answers (the course, the snapshot, the file routes), not by what a screen hides.
//
// The database is production after the deploy's one-time release plan (each week Scheduled at its live
// build, Week 0 due Nov 30) with a preview date set in Course settings. Buyers are made by the real
// provisioning path. The clock is FIXED_NOW, set per case, every instant with its offset.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, COURSE_OPENS_AT, isAcceleratorModule } from '@ai/core/accelerator';
import type { LearnerCourse } from '@ai/core/course';
import { SEED_COPY, seedProduction } from '@ai/core/seed/curriculum';
import { WEEK_OPENS_V1, planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import { provisionOrder } from '../src/billing/provision';
import { applyDataMigrations, DATA_MIGRATIONS } from '../src/db/data-migrations';
import { ACCELERATOR_WEEKS_CONTENT } from '@ai/core/seed/accelerator-v1';
import { WEEK0_STEPS } from '@ai/core/seed/weeks-0-3-v2';
import { persistDiff } from '../src/db/io';
import { accessGroups, auditLog, dataMigrations, orders, plans, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { acceleratorLearnerIds } from '../src/lib/course-access';
import { NOT_IN_PLAN, NOT_YET, PAUSED } from '../src/routes/course';
import { resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import type { FakeBucket } from './fake-bucket';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const MT = (iso: string): number => Date.parse(`${iso}-07:00`);
const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const BOUGHT = MT('2026-11-14T14:00:00');
const PREVIEW = MT('2026-11-18T12:00:00');
const IN_PREVIEW = MT('2026-11-20T09:00:00');
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

const BUYERS = {
  full: { plan: 'cohort', option: 'full', email: 'full@example.test' },
  twoPay: { plan: 'cohort', option: 'two_pay', email: 'twopay@example.test' },
  insiders: { plan: 'membership', option: 'year_upfront', email: 'insider@example.test' },
  teamPlan: { plan: 'agents', option: 'upto15', email: 'teamplan@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

const NO_PLAN: Learner = { id: 'u_noplan', name: 'No Plan', email: 'noplan@example.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'dec26', joined: BOUGHT, last: null, status: 'active', progress: {} };
/** D-188: the file routes stream from the bucket now, so they read from an in-memory one (`fake-bucket.ts`). */
let bucket: FakeBucket;
let S3_ENV: FakeBucket['env'];

let handle: Database;
let app: App;
const ids = new Map<string, string>();
const cookies = new Map<string, string>();
const get = (url: string, who: string) => app.inject({ method: 'GET', url, headers: { cookie: cookies.get(who)! } });
const course = async (who: string) => get('/api/course', who);

/** Production after the deploy's release plan, with a preview date, two kit items and the buyers. */
async function released(): Promise<void> {
  const db: Db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
  db.cohorts[0]!.previewOpensAt = PREVIEW;
  const kit = (id: string, module: string) => db.resources.push({ id, title: id, desc: '', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '1 KB', dl: 0, updated: 0, exec: false, status: 'published', module, visibility: 'hidden_until_open', kind: 'prompt', platform: 'claude' });
  kit('r_week0_prompt', ACCELERATOR_MODULE_IDS[0]!);
  kit('r_week1_prompt', ACCELERATOR_MODULE_IDS[1]!);
  db.users.push(NO_PLAN);
  await resetDatabase(db);
  for (const buyer of Object.keys(BUYERS) as Buyer[]) {
    const b = BUYERS[buyer];
    const id = `ord_${buyer}`;
    await handle.insert(orders).values({ id, plan: b.plan, option: b.option, origin: 'payment_link', status: 'paid', name: buyer, email: b.email, company: `${buyer} group`, crm: 'follow_up_boss', createdAt: BOUGHT });
    const out = await provisionOrder(id, { db: handle, log: silent, now: BOUGHT, invitesFrom: BOUGHT, invitesEnabled: false });
    if (!out.ok) throw new Error(`provisioning ${buyer} failed: ${out.reason}`);
    const [u] = await handle.select({ id: users.id }).from(users).where(eq(users.email, b.email));
    ids.set(buyer, u!.id);
  }
  ids.set('noPlan', NO_PLAN.id);
  // A Utah Life agent (D-148): Agent Plan skills by the group's domain, no plan, no course.
  await handle.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: BOUGHT });
  const utahLife = await provisionGroupMember(handle, 'agent@liveutah.com', BOUGHT);
  if (!utahLife) throw new Error('provisioning the Utah Life agent failed');
  await recordVerified(handle, 'agent@liveutah.com', BOUGHT);
  ids.set('utahLife', utahLife);
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const minter = await build({ logger: false });
  for (const [who, id] of ids) cookies.set(who, await minter.signInAs(id));
  cookies.set('staff', await minter.signInAs('st_owner'));
  await minter.close();
}

beforeAll(async () => {
  at(IN_PREVIEW);
  bucket = await startFakeBucket();
  bucket.anyKey = true;
  S3_ENV = bucket.env;
  handle = await testDatabase();
  await released();
});
afterAll(async () => {
  delete process.env.FIXED_NOW;
  for (const k of Object.keys(S3_ENV)) delete process.env[k];
  await bucket?.close();
});
beforeEach(async () => {
  at(IN_PREVIEW);
  Object.assign(process.env, S3_ENV);
  resetS3();
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
  resetS3();
});

const weeksOf = (body: { course: LearnerCourse }) => body.course.weeks.map((w) => ('locked' in w ? `${w.week}:locked` : `${w.week}:open`));

describe('the pre-launch preview, from the cohort’s date (D-175) @release', () => {
  it('holds the course for a buyer before the preview opens, with the preview’s date as when it opens', { timeout: 120_000 }, async () => {
    at(PREVIEW - 60_000);
    const res = await course('full');
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ open: false, upcoming: true, opensAt: PREVIEW, error: NOT_YET });
  });

  it.each(['full', 'twoPay'])('%s: in the preview, Week 0 whole and every other week locked with its opening, nothing of a locked week’s content', { timeout: 120_000 }, async (who) => {
    const res = await course(who);
    expect(res.statusCode).toBe(200);
    const body = res.json() as { prelaunch: boolean; preview: boolean; course: LearnerCourse; copy: Record<string, string> };
    expect([body.prelaunch, body.preview]).toEqual([true, false]);
    expect(weeksOf(body)).toEqual(['0:open', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${n}:locked`)]);
    expect(body.course.weeks[2]).toMatchObject({ week: 2, locked: true, opensAt: WEEK_OPENS_V1[2] });
    const db = await loadDb();
    for (const n of [1, 2, 8]) {
      const c = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])!.course!;
      for (const said of [c.liveBuild!.lesson, c.homework.useEvidence, c.why[0]!]) expect(res.body, `week ${n}`).not.toContain(said);
    }
    // The Week 0 kit comes with Week 0; Week 1's doesn't.
    expect(res.body).toContain('r_week0_prompt');
    expect(res.body).not.toContain('r_week1_prompt');
    expect(body.copy).toMatchObject({ 'locked.opens': SEED_COPY[1]!.value, 'course.prelaunch': SEED_COPY[2]!.value });
  });

  it('gives a preview learner’s snapshot Week 0 whole and each locked week as a stub, its sessions with no replay', { timeout: 120_000 }, async () => {
    const snap = (await get('/api/snapshot', 'full')).json() as Db;
    const w0 = snap.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    const w2 = snap.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    expect(w0.notes.length).toBeGreaterThan(0);
    expect(w2).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[2], notes: '', prompt: '', checklist: [], files: [] });
    expect(snap.sessions.find((s) => s.id === 'dec26-s2')).toMatchObject({ replay: null, zoom: '' });
    expect(snap.resources.map((r) => r.id)).toEqual(['r_week0_prompt']);
  });

  it.each(['insiders', 'teamPlan', 'utahLife', 'noPlan'])('%s: no preview, no course and none of it in the snapshot', { timeout: 120_000 }, async (who) => {
    const res = await course(who);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ open: false, error: NOT_IN_PLAN });
    const snap = (await get('/api/snapshot', who)).json() as Db;
    expect(snap.modules.filter((m) => isAcceleratorModule(m.id))).toEqual([]);
    expect(snap.resources.filter((r) => r.id.startsWith('r_week'))).toEqual([]);
  });

  it('serves the Week 0 kit to a preview learner and refuses Week 1’s, and every kit item to anyone else', { timeout: 120_000 }, async () => {
    expect((await get('/api/files/resource/r_week0_prompt', 'full')).statusCode).toBe(200);
    expect((await get('/api/files/resource/r_week1_prompt', 'full')).statusCode).toBe(404);
    for (const who of ['insiders', 'utahLife', 'noPlan']) expect((await get('/api/files/resource/r_week0_prompt', who)).statusCode, who).toBe(404);
  });

  it('leaves the scheduler’s list of who hears about the course exactly as it was: nobody before Dec 2', { timeout: 120_000 }, async () => {
    expect(await acceleratorLearnerIds(handle, IN_PREVIEW)).toEqual(new Set());
    expect((await acceleratorLearnerIds(handle, COURSE_OPENS_AT)).size).toBe(2);
  });

  it('shows staff every week whole, as before', { timeout: 120_000 }, async () => {
    const body = (await course('staff')).json() as { preview: boolean; prelaunch: boolean; course: LearnerCourse };
    expect([body.preview, body.prelaunch]).toEqual([true, false]);
    expect(weeksOf(body).every((w) => w.endsWith(':open'))).toBe(true);
  });
});

describe('the weekly releases (D-175) @release', () => {
  it('opens Week 1 at its live build: locked at 12:59 PM CT on Dec 2, open at 1:00 PM CT', { timeout: 120_000 }, async () => {
    at(WEEK_OPENS_V1[1]! - 60_000);
    expect(weeksOf((await course('full')).json()).slice(0, 2)).toEqual(['0:open', '1:locked']);
    at(WEEK_OPENS_V1[1]!);
    const body = (await course('full')).json() as { prelaunch: boolean; course: LearnerCourse };
    expect(body.prelaunch).toBe(false);
    expect(weeksOf(body).slice(0, 3)).toEqual(['0:open', '1:open', '2:locked']);
  });

  it('opens Week 4 on Jan 6, after the holiday, and not a minute before', { timeout: 120_000 }, async () => {
    // A session from November has expired by January: sign in again on the day.
    at(WEEK_OPENS_V1[4]! - 60_000);
    const cookie = await app.signInAs(ids.get('full')!);
    const week4 = async () => weeksOf((await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } })).json())[4];
    expect(await week4()).toBe('4:locked');
    at(WEEK_OPENS_V1[4]!);
    expect(await week4()).toBe('4:open');
  });

  it('pauses a two-pay buyer whose second payment failed, preview or not (D-143)', { timeout: 120_000 }, async () => {
    await handle.update(plans).set({ status: 'past_due' }).where(eq(plans.orderId, 'ord_twoPay'));
    try {
      const res = await course('twoPay');
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ open: false, paused: true, error: PAUSED });
    } finally {
      await handle.update(plans).set({ status: 'active' }).where(eq(plans.orderId, 'ord_twoPay'));
    }
  });

  it('opens Week 1 when the builder moves its opening, with no deploy (the brief’s acceptance)', { timeout: 180_000 }, async () => {
    const before = await loadDb();
    const w1 = before.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!;
    const opens = MT('2026-11-21T12:00:00');
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/actions/saveBuilderModule',
      headers: { cookie: cookies.get('staff')!, 'content-type': 'application/json' },
      payload: JSON.stringify({ draft: { ...structuredClone(w1), opens }, status: 'scheduled' }),
    });
    expect(res.statusCode, res.body).toBe(200);
    try {
      at(opens - 60_000);
      expect(weeksOf((await course('full')).json())[1]).toBe('1:locked');
      at(opens);
      expect(weeksOf((await course('full')).json())[1]).toBe('1:open');
      expect((await get('/api/files/resource/r_week1_prompt', 'full')).statusCode).toBe(200);
    } finally {
      const now = await loadDb();
      const restored = structuredClone(now);
      restored.modules = restored.modules.map((m) => (m.id === w1.id ? w1 : m));
      await persistDiff(handle, now, restored);
    }
  });
});

describe('the deploy’s one-time data steps (D-175) @release', () => {
  it('runs the release plan and the copy strings once, audited, and never again', { timeout: 180_000 }, async () => {
    // Production before them: the course as D-173 left it, with only Utah Life's copy string.
    const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    db.copy = [SEED_COPY[0]!];
    await resetDatabase(db);
    const reports = await applyDataMigrations(handle, IN_PREVIEW);
    expect(reports.map((r) => [r.id, r.changed, r.skipped.length])).toEqual([
      [DATA_MIGRATIONS[0]!.id, 9, 0],
      [DATA_MIGRATIONS[1]!.id, 2, 0],
      // D-176: Weeks 0 to 3, four session titles, two Friday office hours, the Before page, one copy string.
      [DATA_MIGRATIONS[2]!.id, 12, 0],
      // D-187: the Team Plan window's five copy strings.
      [DATA_MIGRATIONS[3]!.id, 5, 0],
      // D-189: the In Step label, one copy string.
      [DATA_MIGRATIONS[4]!.id, 1, 0],
      // D-193: the Accelerator glossary, one cohort course.
      [DATA_MIGRATIONS[5]!.id, 1, 0],
      // D-195: Week 0's Start Here card.
      [DATA_MIGRATIONS[6]!.id, 1, 0],
      // D-196: Week 0's intake.
      [DATA_MIGRATIONS[7]!.id, 1, 0],
      [DATA_MIGRATIONS[8]!.id, 1, 0],
      // D-220: today's content seed writes no promise, so there is none to clear here (production had four).
      [DATA_MIGRATIONS[9]!.id, 0, 0],
      // D-221: likewise no setup order or use line in today's seed (production had them on every week).
      [DATA_MIGRATIONS[10]!.id, 0, 0],
    ]);
    const after = await loadDb();
    expect(after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[3])).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[3] });
    expect(after.copy!.map((c) => c.key).sort()).toEqual(['course.prelaunch', 'locked.opens', 'locked.utah_life', 'plan.team.ask', 'plan.team.asked', 'plan.team.lead', 'plan.team.solo', 'plan.team.title', 'skill.coming', 'skill.in_step']);
    const rows = await handle.select().from(auditLog).orderBy(asc(auditLog.id));
    expect(rows.map((r) => r.action)).toEqual(Array(33).fill('curriculum.migrate'));
    expect(after.cohorts.find((c) => c.id === 'dec26')!.course!.glossary).toHaveLength(31);
    expect(after.modules.find((m) => m.id === 'accelerator-week-0')!.course!.startHere?.title).toBe('Start Here: Week 0');
    expect(rows[1]).toMatchObject({ actorSource: 'system', targetType: 'module', targetId: ACCELERATOR_MODULE_IDS[1], after: { status: 'scheduled', opens: WEEK_OPENS_V1[1] } });
    expect((await handle.select().from(dataMigrations)).map((r) => r.id)).toEqual(DATA_MIGRATIONS.map((s) => s.id));
    // Again: nothing to run, nothing written.
    expect(await applyDataMigrations(handle, IN_PREVIEW)).toEqual([]);
    expect(await loadDb()).toEqual(after);
    // Staff removed the new label after the step ran. The step's id is recorded, so it is not put back.
    const stripped = structuredClone(after);
    stripped.copy = after.copy!.filter((c) => c.key !== 'skill.in_step');
    await persistDiff(handle, after, stripped);
    expect(await applyDataMigrations(handle, IN_PREVIEW)).toEqual([]);
    expect((await loadDb()).copy!.some((c) => c.key === 'skill.in_step')).toBe(false);
    await persistDiff(handle, await loadDb(), after);
    expect(await loadDb()).toEqual(after);
    // Put the shared fixture back for anything after this file's last test.
    await released();
  });

  it('leaves a week staff already changed and names it', { timeout: 180_000 }, async () => {
    const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[6])!.status = 'draft';
    await resetDatabase(db);
    const [release] = await applyDataMigrations(handle, IN_PREVIEW);
    expect(release!.skipped).toEqual([{ id: ACCELERATOR_MODULE_IDS[6], reason: 'its status or opening was changed in the builder (draft)' }]);
    expect((await loadDb()).modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[6])!.status).toBe('draft');
    await released();
  });

  it('loads the new Weeks 0 to 3 field for field, and the builder changes them after with no deploy (D-176)', { timeout: 180_000 }, async () => {
    await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
    await applyDataMigrations(handle, IN_PREVIEW);
    // The reset dropped every sign-in, so staff signs in again.
    const staff = await app.signInAs('st_owner');
    const asStaff = () => app.inject({ method: 'GET', url: '/api/course', headers: { cookie: staff } });
    try {
      const body = (await asStaff()).json() as { course: LearnerCourse; sessions: { id: string; title: string; start: number }[]; copy: Record<string, string> };
      const weeks = body.course.weeks as unknown as { week: number; title: string; question: string; module: { checklist: { ch: string }[] } }[];
      expect(weeks.slice(0, 4).map((w) => w.title)).toEqual(['Foundations', 'Where the Money Goes', 'Leads That Pay', 'Numbers on the 5th']);
      expect(weeks[0]!.module.checklist.map((s) => s.ch)).toEqual(WEEK0_STEPS.map((s) => s.step));
      expect(weeks[4]!.title).toBe(ACCELERATOR_WEEKS_CONTENT[4]!.title);
      expect(body.copy['skill.coming']).toBe('Coming With Week 1');
      expect(body.copy['skill.in_step']).toBe('In Step {n}');
      expect(body.sessions.find((x) => x.id === 'dec26-fri-oh2')).toMatchObject({ title: 'Lead Source Review Office Hours', start: Date.parse('2026-12-11T19:00:00Z') });
      expect(body.sessions.find((x) => x.id === 'dec26-s1')!.title).toBe('Map Your Spend Live Build');

      // The brief's acceptance: the content can be changed afterward in the builder.
      const w1 = (await loadDb()).modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!;
      const draft = structuredClone(w1);
      draft.course!.question = 'Where does our money go this year?';
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/actions/saveBuilderModule',
        headers: { cookie: staff, 'content-type': 'application/json' },
        payload: JSON.stringify({ draft, status: w1.status }),
      });
      expect(res.statusCode, res.body).toBe(200);
      const again = (await asStaff()).json() as { course: { weeks: { week: number; question: string }[] } };
      expect(again.course.weeks[1]!.question).toBe('Where does our money go this year?');
    } finally {
      await released();
    }
  });
});
