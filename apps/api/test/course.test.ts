// The Amplified AI Accelerator over HTTP (D-110): who opens the course, end to end.
//
// Every buyer below is made by the real provisioning path (`provisionOrder`, the function the Stripe
// webhook calls) from a paid order row, so the plan rows the access rule reads are the ones a sale
// writes. Every paid buyer lands in cohort `dec26` as a Team-tier owner whatever they bought, which is
// exactly why the course is gated by plan: an Amplified Insiders or Team Plan buyer is in the same
// cohort, at the same tier, and must not open it.
//
// The clock is § 7.7's FIXED_NOW, set per case. Every instant is written with its Central offset.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
// What main served before the course moved into the database (D-173), written from main's code.
import courseV1 from '../../../packages/core/test/fixtures/curriculum-v1/course.json';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, isAcceleratorModule, libraryHref } from '@ai/core/accelerator';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import { applyCurriculum } from '../src/db/seed';
import { persistDiff } from '../src/db/io';
import { orders, plans, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { NOT_IN_PLAN, NOT_YET } from '../src/routes/course';
import { acceleratorLearnerIds } from '../src/lib/course-access';
import { loadDb, resetDatabase, testDatabase } from './helpers';

// D-153: bought tonight, at the Forum; the course opens at the first live build, Dec 2, 1:00 PM Central.
const BOUGHT = '2026-11-14T15:00:00-06:00';
const AFTER_HOLD = '2026-12-03T09:00:00-06:00';
const BEFORE_HOLD = '2026-11-20T09:00:00-06:00';
const OPENS = '2026-12-02T13:00:00-06:00';
/** Ten minutes before Week 1's build: its join window is open. */
const WEEK1_WINDOW = '2026-12-02T12:50:00-06:00';

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

/** Who bought what. `cohort` with `full` or `two_pay` is the AI Accelerator. */
const BUYERS = {
  full: { plan: 'cohort', option: 'full', email: 'full@example.test' },
  twoPay: { plan: 'cohort', option: 'two_pay', email: 'twopay@example.test' },
  insiders: { plan: 'membership', option: 'year_upfront', email: 'insider@example.test' },
  teamPlan: { plan: 'agents', option: 'upto15', email: 'teamplan@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

/** A learner with no account at all: an invite from before the offer existed. */
const NO_PLAN: Learner = {
  id: 'u_noplan',
  name: 'No Plan',
  email: 'noplan@example.test',
  tier: 'team',
  role: 'Team Owner',
  teamId: null,
  cohortId: 'dec26',
  joined: Date.parse('2026-11-12T09:00:00-06:00'),
  last: null,
  status: 'active',
  progress: {},
};

let handle: Database;
let app: App;
const ids = new Map<string, string>();
const cookies = new Map<string, string>();

const at = (iso: string): void => {
  process.env.FIXED_NOW = iso;
};
const get = (url: string, who: string) => app.inject({ method: 'GET', url, headers: { cookie: cookies.get(who)! } });

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

beforeAll(async () => {
  at(AFTER_HOLD);
  handle = await testDatabase();
  const db: Db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.users.push(NO_PLAN);
  await resetDatabase(db);
  for (const buyer of Object.keys(BUYERS) as Buyer[]) ids.set(buyer, await provision(buyer));
  ids.set('noPlan', NO_PLAN.id);

  // The full buyer's operator, invited onto the owner's team: same team, same account, same plan.
  const before = await loadDb();
  const after = structuredClone(before);
  const owner = after.users.find((u) => u.id === ids.get('full'))!;
  after.users.push({ ...NO_PLAN, id: 'u_operator', name: 'Operator', email: 'operator@example.test', role: 'Operations Lead', teamId: owner.teamId });
  await persistDiff(handle, before, after);
  ids.set('operator', 'u_operator');

  // Signed in and onboarded, so the join route's invite check is not what answers.
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));

  const minter = await build({ logger: false });
  for (const [who, id] of ids) cookies.set(who, await minter.signInAs(id));
  cookies.set('staff', await minter.signInAs('st_owner'));
  await minter.close();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

beforeEach(async () => {
  at(AFTER_HOLD);
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
});

describe('an AI Accelerator buyer opens Week 0 and all eight weeks', () => {
  it.each(['full', 'twoPay', 'operator'])('%s: the course, its sixteen sessions and every flagship’s guided setup', async (who) => {
    const res = await get('/api/course', who);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = res.json() as {
      open: boolean;
      preview: boolean;
      course: { weeks: { week: number; skills: { role: string; route: string }[]; setup: { route?: string }[] }[]; shared: { rubric: unknown[]; evidence: unknown[] } };
      sessions: { id: string; kind: string; week: number; start: number; mins: number }[];
    };
    expect(body.open).toBe(true);
    expect(body.preview).toBe(false);
    expect(body.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const w of body.course.weeks) {
      const flagships = w.skills.filter((s) => s.role === 'flagship');
      const leads = flagships.length ? flagships : w.skills;
      expect(leads.length, `week ${w.week}`).toBeGreaterThan(0);
      // Every flagship has a numbered setup step that opens its guided setup on the Library page.
      for (const s of leads) {
        expect(w.setup.some((step) => step.route === s.route), `week ${w.week} ${s.route}`).toBe(true);
        expect(libraryHref(s.route)).toMatch(/^https:\/\/www\.amplifiedimpact\.io\/[a-z0-9-]+$/);
      }
    }
    expect(body.course.shared.rubric).toHaveLength(5);
    expect(body.course.shared.evidence).toHaveLength(5);
    expect(body.sessions).toHaveLength(16);
    expect(body.sessions.filter((s) => s.kind === 'build').map((s) => s.mins)).toEqual(Array(8).fill(90));
    expect(body.sessions.filter((s) => s.kind === 'office_hours').map((s) => s.mins)).toEqual(Array(8).fill(60));
    // No Zoom URL ever leaves this route: the course says "Join in Sessions", and the join route hands
    // the URL out only inside its window.
    expect(res.body).not.toMatch(/"zoom"|zoom\.us|https?:\/\/[^"]*zoom/i);
  });

  it.each(['full', 'twoPay', 'operator'])('%s: the portal snapshot carries the nine weeks and their sessions', async (who) => {
    const snap = (await get('/api/snapshot', who)).json() as Db;
    expect(snap.modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    expect(snap.modules.every((m) => m.checklist.length === 6 && m.notes.length > 0)).toBe(true);
    expect(snap.sessions).toHaveLength(16);
    // D-173: the course's words reach a learner only through /api/course, never the snapshot.
    expect(snap.cohorts.filter((c) => 'course' in c)).toEqual([]);
    expect(snap.modules.filter((m) => 'course' in m)).toEqual([]);
  });

  it('can join Week 1’s build once the course opens at its start, with no invented Zoom link', async () => {
    // D-153, a known gap to close before Dec 2: the join window's first 15 minutes come before the
    // course opens, so the first build cannot be joined early.
    at(WEEK1_WINDOW);
    expect((await get('/api/sessions/dec26-s1/join', 'full')).statusCode).toBe(404);
    at(OPENS);
    const res = await get('/api/sessions/dec26-s1/join', 'full');
    expect(res.statusCode).toBe(200);
    // Staff have not set the real link yet; the client reads an empty URL as shut.
    expect(res.json()).toEqual({ url: '' });
  });
});

describe('anyone else cannot open the course', () => {
  it.each(['insiders', 'teamPlan', 'noPlan'])('%s: 403 from the course, and none of it in the snapshot', async (who) => {
    const res = await get('/api/course', who);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ open: false, error: NOT_IN_PLAN });
    expect(res.body).not.toContain('What are we paying for leads');

    const snap = (await get('/api/snapshot', who)).json() as Db;
    expect(snap.modules.filter((m) => isAcceleratorModule(m.id))).toEqual([]);
    expect(snap.sessions).toEqual([]);
    // D-173: the words every week shares are the cohort's data now, and stay out of the snapshot too.
    expect(snap.cohorts.filter((c) => 'course' in c)).toEqual([]);
  });

  it.each(['insiders', 'teamPlan', 'noPlan'])('%s: an Accelerator session is the same 404 as one that does not exist', async (who) => {
    at(WEEK1_WINDOW);
    const res = await get('/api/sessions/dec26-s1/join', who);
    const none = await get('/api/sessions/dec26-nope/join', who);
    expect(res.statusCode).toBe(404);
    expect([res.statusCode, res.body.replace('dec26-s1', 'X')]).toEqual([none.statusCode, none.body.replace('dec26-nope', 'X')]);
  });

  it('a buyer signs in at once but holds the course until the first live build, then opens all of it (D-153)', async () => {
    // Bought tonight: the plan starts at the build, not at purchase.
    const [plan] = await handle.select({ startsAt: plans.startsAt }).from(plans).where(eq(plans.orderId, 'ord_full'));
    expect(plan!.startsAt).toBe(Date.parse(OPENS));
    for (const when of [BOUGHT, '2026-11-16T08:00:00-06:00', BEFORE_HOLD, '2026-12-02T12:59:59-06:00']) {
      at(when);
      const res = await get('/api/course', 'full');
      expect(res.statusCode, when).toBe(403);
      // Not "not in your plan": when it opens, for the pre-launch welcome.
      expect(res.json(), when).toEqual({ open: false, upcoming: true, opensAt: Date.parse(OPENS), error: NOT_YET });
      expect(res.body).not.toContain('What are we paying for leads');
      const snap = (await get('/api/snapshot', 'full')).json() as Db;
      expect(snap.modules.filter((m) => isAcceleratorModule(m.id)), when).toEqual([]);
      expect(snap.sessions, when).toEqual([]);
    }
    at(OPENS);
    expect((await get('/api/course', 'full')).statusCode).toBe(200);
    expect(((await get('/api/snapshot', 'full')).json() as Db).modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
  });

  it('a refunded AI Accelerator (its plan ended) closes the course', async () => {
    const [u] = await handle.select({ email: users.email }).from(users).where(eq(users.id, ids.get('twoPay')!));
    const [o] = await handle.select({ accountId: orders.accountId }).from(orders).where(eq(orders.email, u!.email));
    await handle.update(plans).set({ status: 'ended' }).where(eq(plans.accountId, o!.accountId!));
    try {
      expect((await get('/api/course', 'twoPay')).statusCode).toBe(403);
    } finally {
      await handle.update(plans).set({ status: 'active' }).where(eq(plans.accountId, o!.accountId!));
    }
  });

  it('staff see the course as a preview', async () => {
    const res = await get('/api/course', 'staff');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ open: true, preview: true });
  });

  it('the scheduler’s list of who hears about the course is the same set: the two buyers and the operator', async () => {
    const ids_ = await acceleratorLearnerIds(handle, Date.parse(AFTER_HOLD));
    expect([...ids_].sort()).toEqual([ids.get('full'), ids.get('twoPay'), 'u_operator'].sort());
  });

  it('nobody signed in gets anything', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/course' });
    expect(res.statusCode).toBe(401);
  });
});

const OWNER = { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' };

describe('the curriculum on a database that is already live (db:curriculum:ensure, D-173)', () => {
  it('writes nothing to a database that already carries it, buyers and all', async () => {
    const before = await loadDb();
    expect(await applyCurriculum(handle)).toBe(0);
    expect(await loadDb()).toEqual(before);
  });

  it('serves the course main served, field for field, from the database the seed made', async () => {
    const res = await get('/api/course', 'full');
    expect((res.json() as { course: unknown }).course).toEqual(courseV1);
  });

  it('inserts the course into the old launch database, touching no learner and none of the prototype, then stops changing', { timeout: 180_000 }, async () => {
    // The demo database stands in for production after the old launch seed and some sales: learners,
    // teams, progress and the prototype's six modules on cohort dec26.
    await resetDatabase(seedForDatabase('live'));
    const before = await loadDb();
    expect(await applyCurriculum(handle)).toBeGreaterThan(0);
    const after = await loadDb();
    expect(after.users).toEqual(before.users);
    expect(after.teams).toEqual(before.teams);
    expect(after.staff).toEqual(before.staff);
    expect(after.modules.filter((m) => isAcceleratorModule(m.id)).map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    // Nothing that was already there is overwritten: the prototype's modules stay exactly as they were.
    expect(after.modules.filter((m) => !isAcceleratorModule(m.id))).toEqual(before.modules);
    expect(after.sessions.filter((s) => s.cohortId === 'dec26')).toHaveLength(16);
    expect(await applyCurriculum(handle, { ifMissing: true })).toBe(0);
    expect(await applyCurriculum(handle)).toBe(0);
  });

  it('keeps a builder edit to a module and a session through two runs (the brief’s acceptance)', { timeout: 180_000 }, async () => {
    await resetDatabase(seedProduction({ owner: OWNER }));
    // Staff move Week 3's build a day, give it a Zoom link and a new title, and edit Week 5's name and question.
    const live = await loadDb();
    const edited = structuredClone(live);
    const s3 = edited.sessions.find((s) => s.id === 'dec26-s3')!;
    s3.start += 24 * 3600e3;
    s3.zoom = 'https://example.test/j/123';
    s3.title = 'Monthly Numbers Live Build';
    const w5 = edited.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[5])!;
    w5.name = 'Edited by staff';
    w5.course = { ...w5.course!, question: 'Edited by staff?' };
    // And Week 8, unpublished and deleted as a draft (the builder's Delete Draft): it must not come back.
    edited.modules = edited.modules.filter((m) => m.id !== ACCELERATOR_MODULE_IDS[8]);
    await persistDiff(handle, live, edited);
    const staffEdited = await loadDb();
    expect(staffEdited.modules.some((m) => m.id === ACCELERATOR_MODULE_IDS[8])).toBe(false);

    expect(await applyCurriculum(handle, { ifMissing: true })).toBe(0);
    expect(await applyCurriculum(handle)).toBe(0);
    expect(await loadDb()).toEqual(staffEdited);
  });
});

describe('GET /api/health/curriculum (D-121, D-173): counts only, expected from the cohort’s own data', () => {
  const status = async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health/curriculum' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    return res.json() as Record<string, unknown>;
  };

  it('says ok on a database with the curriculum, and says nothing but counts', { timeout: 120_000 }, async () => {
    await resetDatabase(seedProduction({ owner: OWNER }));
    const body = await status();
    expect(body).toEqual({ ok: true, cohort: true, modules: 9, published: 9, sessions: 16, expected: { modules: 9, sessions: 16 } });
  });

  it('says not ok, with the counts that are short, before the curriculum and after staff draft a week', { timeout: 180_000 }, async () => {
    await resetDatabase(seedForDatabase('live'));
    expect(await status()).toMatchObject({ ok: false, modules: 0, published: 0 });
    await resetDatabase(seedProduction({ owner: OWNER }));
    const before = await loadDb();
    const after = structuredClone(before);
    after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[3])!.status = 'draft';
    await persistDiff(handle, before, after);
    expect(await status()).toMatchObject({ ok: false, modules: 9, published: 8, sessions: 16 });
  });

  it('expects what the cohort says: a cohort of nine weeks expects ten week modules', { timeout: 120_000 }, async () => {
    await resetDatabase(seedProduction({ owner: OWNER }));
    const before = await loadDb();
    const after = structuredClone(before);
    after.cohorts.find((c) => c.id === 'dec26')!.weeks = 9;
    await persistDiff(handle, before, after);
    expect(await status()).toMatchObject({ ok: false, modules: 9, expected: { modules: 10, sessions: 16 } });
  });
});

