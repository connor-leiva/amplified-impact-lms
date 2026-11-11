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
import { seedForDatabase, seedProduction } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS, isAcceleratorModule, libraryHref } from '@ai/core/accelerator';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import { applyCurriculum } from '../src/db/seed';
import { persistDiff } from '../src/db/io';
import { orders, plans, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { NOT_IN_PLAN } from '../src/routes/course';
import { acceleratorLearnerIds } from '../src/lib/course-access';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const AFTER_HOLD = '2026-11-20T09:00:00-06:00';
const BEFORE_HOLD = '2026-11-15T09:00:00-06:00';
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
  const now = Date.parse(AFTER_HOLD);
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
    // No Zoom URL ever leaves this route ("Zoom link TBA" is the course's own words).
    expect(res.body).not.toMatch(/"zoom"|zoom\.us|https?:\/\/[^"]*zoom/i);
  });

  it.each(['full', 'twoPay', 'operator'])('%s: the portal snapshot carries the nine weeks and their sessions', async (who) => {
    const snap = (await get('/api/snapshot', who)).json() as Db;
    expect(snap.modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    expect(snap.modules.every((m) => m.checklist.length === 6 && m.notes.length > 0)).toBe(true);
    expect(snap.sessions).toHaveLength(16);
  });

  it('can join Week 1’s build inside its window, with no invented Zoom link', async () => {
    at(WEEK1_WINDOW);
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
  });

  it.each(['insiders', 'teamPlan', 'noPlan'])('%s: an Accelerator session is the same 404 as one that does not exist', async (who) => {
    at(WEEK1_WINDOW);
    const res = await get('/api/sessions/dec26-s1/join', who);
    const none = await get('/api/sessions/dec26-nope/join', who);
    expect(res.statusCode).toBe(404);
    expect([res.statusCode, res.body.replace('dec26-s1', 'X')]).toEqual([none.statusCode, none.body.replace('dec26-nope', 'X')]);
  });

  it('a buyer holds it until the Nov 16 invite hold, then opens it', async () => {
    at(BEFORE_HOLD);
    expect((await get('/api/course', 'full')).statusCode).toBe(403);
    at(AFTER_HOLD);
    expect((await get('/api/course', 'full')).statusCode).toBe(200);
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

describe('the curriculum on a database that is already live (db:curriculum)', () => {
  it('writes nothing to a database that already carries it, buyers and all', async () => {
    const before = await loadDb();
    expect(await applyCurriculum(handle)).toBe(0);
    expect(await loadDb()).toEqual(before);
  });

  it('upserts the course into the old launch database without touching a single learner, then stops changing', async () => {
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
    expect(after.modules.filter((m) => !isAcceleratorModule(m.id)).every((m) => m.status === 'draft')).toBe(true);
    expect(after.sessions.filter((s) => s.cohortId === 'dec26')).toHaveLength(16);
    expect(await applyCurriculum(handle)).toBe(0);
  });
});
