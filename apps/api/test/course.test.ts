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
import { moduleForSession, seedForDatabase } from '@ai/core';
import { canJoin } from '@ai/core/learner';
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
import { DATA_MIGRATIONS, applyDataMigrations } from '../src/db/data-migrations';
import { orders, plans, sessions, skillPurchases, users } from '../src/db/schema';
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
/** D-251: 11:44 AM MT, one minute before Week 1's join window opens. */
const BEFORE_WINDOW = '2026-12-02T12:44:00-06:00';
/** D-251: 11:45 AM MT, the first instant of Week 1's join window: 15 minutes before its start. */
const WINDOW_OPENS = '2026-12-02T12:45:00-06:00';

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
      course: { weeks: { week: number; skills: { role: string; route: string; use?: string }[]; setup?: unknown }[]; shared: { rubric: unknown[]; evidence: unknown[] } };
      sessions: { id: string; kind: string; week: number; start: number; mins: number }[];
    };
    expect(body.open).toBe(true);
    expect(body.preview).toBe(false);
    expect(body.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const w of body.course.weeks) {
      const flagships = w.skills.filter((s) => s.role === 'flagship');
      const leads = flagships.length ? flagships : w.skills;
      expect(leads.length, `week ${w.week}`).toBeGreaterThan(0);
      // Every flagship's kit row opens its guided setup on the Library page. D-221: the old setup order that
      // also listed it is retired, and neither it nor a skill's use line is sent.
      expect(w.setup, `week ${w.week}`).toBeUndefined();
      for (const s of leads) {
        expect(s.use, `week ${w.week} ${s.route}`).toBeUndefined();
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

  it.each(['full', 'twoPay', 'operator'])('%s: D-251, joins Week 1’s build from 15 minutes before it starts, as Join shows', async (who) => {
    // The first live build opens the course at its own start, 12:00 PM MT.
    const s1 = (await loadDb()).sessions.find((s) => s.id === 'dec26-s1')!;
    expect(s1.start).toBe(Date.parse(OPENS));

    // 11:44 AM MT: Join doesn't show yet, and the route answers as it did before D-251. The window is
    // shut and the course isn't open, so it is the pre-launch 404, the one an unknown id gets.
    at(BEFORE_WINDOW);
    expect(canJoin(s1, Date.parse(BEFORE_WINDOW))).toBe(false);
    const shut = await get('/api/sessions/dec26-s1/join', who);
    expect(shut.statusCode).toBe(404);
    expect(shut.json()).toEqual({ error: 'No session dec26-s1' });

    // 11:45 AM MT, the window's first instant, through the start: Join shows and the route answers it.
    for (const when of [WINDOW_OPENS, WEEK1_WINDOW, OPENS]) {
      at(when);
      expect(canJoin(s1, Date.parse(when)), when).toBe(true);
      const res = await get('/api/sessions/dec26-s1/join', who);
      expect(res.statusCode, when).toBe(200);
      expect(res.headers['cache-control'], when).toBe('no-store');
      // Staff have not set the real link yet; the client reads an empty URL as shut.
      expect(res.json(), when).toEqual({ url: '' });
    }
  });

  it('D-251: inside the window, the course itself and the next build stay shut until 12:00 PM MT', async () => {
    at(WINDOW_OPENS);
    const course = await get('/api/course', 'full');
    expect(course.statusCode).toBe(403);
    expect(course.json()).toEqual({ open: false, upcoming: true, opensAt: Date.parse(OPENS), error: NOT_YET });
    const snap = (await get('/api/snapshot', 'full')).json() as Db;
    expect(snap.modules.filter((m) => isAcceleratorModule(m.id))).toEqual([]);
    expect(snap.sessions).toEqual([]);
    // Only the session whose window is open reads the plan ahead: Week 2's build is the pre-launch 404.
    expect((await get('/api/sessions/dec26-s2/join', 'full')).statusCode).toBe(404);
  });

  it('D-251: an invited seat that never accepted is still refused, inside the window and at the start', async () => {
    await handle.update(users).set({ status: 'invited' }).where(eq(users.id, 'u_operator'));
    try {
      for (const when of [WINDOW_OPENS, OPENS]) {
        at(when);
        const res = await get('/api/sessions/dec26-s1/join', 'operator');
        expect(res.statusCode, when).toBe(403);
        expect(res.json(), when).toEqual({ error: 'Accept your invite before joining a session.' });
      }
    } finally {
      await handle.update(users).set({ status: 'active' }).where(eq(users.id, 'u_operator'));
    }
  });

  it('D-251: the plan is read ahead in time only, so a refunded plan stays shut inside the window', async () => {
    const [o] = await handle.select({ accountId: orders.accountId }).from(orders).where(eq(orders.id, 'ord_twoPay'));
    await handle.update(plans).set({ status: 'ended' }).where(eq(plans.accountId, o!.accountId!));
    try {
      at(WINDOW_OPENS);
      expect((await get('/api/sessions/dec26-s1/join', 'twoPay')).statusCode).toBe(404);
    } finally {
      await handle.update(plans).set({ status: 'active' }).where(eq(plans.accountId, o!.accountId!));
    }
  });

  it('D-251: a session with no course week behind it is unchanged, for a plan with the course and one without', async () => {
    // A cohort session no module claims (no week's `session` is 50): the route reads no plan for it,
    // before D-251 or after. It starts with the first live build, so the instants are the same.
    const zoom = 'https://zoom.us/j/5550001234';
    await handle.insert(sessions).values({ id: 'dec26-kickoff', cohortId: 'dec26', n: 50, title: 'Kickoff', start: Date.parse(OPENS), mins: 60, zoom, live: false, views: 0 });
    try {
      expect(moduleForSession(await loadDb(), { id: 'dec26-kickoff', n: 50 })).toBeNull();
      for (const who of ['full', 'insiders']) {
        at(BEFORE_WINDOW);
        const shut = await get('/api/sessions/dec26-kickoff/join', who);
        expect(shut.statusCode, who).toBe(409);
        expect(shut.json(), who).toEqual({ error: 'Join opens 15 min before' });
        for (const when of [WINDOW_OPENS, OPENS]) {
          at(when);
          const res = await get('/api/sessions/dec26-kickoff/join', who);
          expect(res.statusCode, `${who} ${when}`).toBe(200);
          expect(res.json(), `${who} ${when}`).toEqual({ url: zoom });
        }
      }
      // At the same instant, the course's own build is still the 404 for the plan without the course.
      at(WINDOW_OPENS);
      expect((await get('/api/sessions/dec26-s1/join', 'insiders')).statusCode).toBe(404);
    } finally {
      await handle.delete(sessions).where(eq(sessions.id, 'dec26-kickoff'));
    }
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

  it('D-241: a $37 skill buyer with no plan gets the course as the outline shows a locked week, and none of its content', async () => {
    await handle.insert(skillPurchases).values({ id: 'sp_course', userId: NO_PLAN.id, skillId: 'team-pnl-review', stripeSessionId: 'cs_course', amount: 3700, purchasedAt: Date.parse(BOUGHT) });
    try {
      const res = await get('/api/course', 'noPlan');
      expect(res.statusCode).toBe(403);
      const body = res.json() as { open: boolean; error: string; outline: { week: number; title: string; question: string; outcome: string; locked: true }[] };
      expect(body).toMatchObject({ open: false, error: NOT_IN_PLAN });
      const course = (await get('/api/course', 'staff')).json() as { course: { weeks: { week: number; title: string; question: string }[] } };
      expect(body.outline.map((w) => [w.week, w.title, w.question])).toEqual(course.course.weeks.map((w) => [w.week, w.title, w.question]));
      expect(body.outline.every((w) => w.locked && Object.keys(w).every((k) => ['week', 'title', 'question', 'outcome', 'opensAt', 'lockedCopy', 'locked'].includes(k)))).toBe(true);
      // No week's content: not a step, not the kit, not a session.
      expect(res.body).not.toContain('"steps"');
      expect(res.body).not.toContain('"kit"');
      // A plan's member with a $37 skill beside it gets no outline: only a buyer and nothing more does.
      expect((await get('/api/course', 'insiders')).json()).toEqual({ open: false, error: NOT_IN_PLAN });
    } finally {
      await handle.delete(skillPurchases).where(eq(skillPurchases.id, 'sp_course'));
    }
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

describe('the seat card and the playbook card (D-184): inside an open week of the gated answer, and nowhere else', () => {
  const SEAT = { seat: 'Spend Analyst', reportsTo: 'The owner', runs: 'Every Monday at seven', pulls: 'The books', applies: 'The chart', produces: 'A spend map', tookOver: 'The month-end tally', cantDo: 'Pay a bill or move money' };
  const PLAYBOOK = { number: '4', question: 'Where does the money go, line by line?', play: 'Map every dollar to the chart weekly.', signedOff: true };
  const LOCKED_SEAT = { ...SEAT, runs: 'Only on the locked week', cantDo: 'Leave the locked week' };
  const LOCKED_PLAYBOOK = { ...PLAYBOOK, play: 'A play only the locked week has.' };
  const words = [LOCKED_SEAT.runs, LOCKED_SEAT.cantDo, LOCKED_PLAYBOOK.play];
  const all = [SEAT.runs, PLAYBOOK.play, ...words];

  /** Week 1 with its cards, open; Week 2 with its own, scheduled to open long after the course does. */
  async function withCards<T>(run: () => Promise<T>): Promise<T> {
    const before = await loadDb();
    const after = structuredClone(before);
    const w1 = after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!;
    const w2 = after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    Object.assign(w1.course!, { seatCard: SEAT, playbookCard: PLAYBOOK });
    Object.assign(w2.course!, { seatCard: LOCKED_SEAT, playbookCard: LOCKED_PLAYBOOK });
    Object.assign(w2, { status: 'scheduled', opens: Date.parse('2027-03-01T12:00:00-06:00') });
    await persistDiff(handle, before, after);
    try {
      return await run();
    } finally {
      await persistDiff(handle, after, before);
    }
  }

  it('@parity:K-15 a buyer gets an open week’s cards, and none of a locked week’s', async () => {
    await withCards(async () => {
      for (const who of ['full', 'operator']) {
        const res = await get('/api/course', who);
        expect(res.statusCode).toBe(200);
        const weeks = (res.json() as { course: { weeks: { week: number; locked?: boolean; seatCard?: unknown; playbookCard?: unknown }[] } }).course.weeks;
        expect(weeks[1]).toMatchObject({ seatCard: SEAT, playbookCard: PLAYBOOK });
        expect(weeks[2]!.locked).toBe(true);
        expect('seatCard' in weeks[2]! || 'playbookCard' in weeks[2]!).toBe(false);
        for (const w of words) expect(res.body, who).not.toContain(w);
      }
    });
  });

  it('@parity:K-15 a plan without the course, a buyer before the course opens, and every snapshot get none of them', async () => {
    await withCards(async () => {
      for (const who of ['insiders', 'teamPlan', 'noPlan']) {
        const res = await get('/api/course', who);
        expect(res.statusCode).toBe(403);
        for (const w of all) expect(res.body, who).not.toContain(w);
      }
      at(BEFORE_HOLD);
      const held = await get('/api/course', 'full');
      expect(held.statusCode).toBe(403);
      for (const w of all) expect(held.body).not.toContain(w);
      at(AFTER_HOLD);
      for (const who of ['full', 'operator', 'insiders', 'noPlan']) {
        const snap = await get('/api/snapshot', who);
        for (const w of all) expect(snap.body, who).not.toContain(w);
      }
    });
  });

  it('@parity:K-15 staff (the builder’s preview) see every week’s cards', async () => {
    await withCards(async () => {
      const weeks = ((await get('/api/course', 'staff')).json() as { course: { weeks: { seatCard?: unknown; playbookCard?: unknown }[] } }).course.weeks;
      expect(weeks[1]).toMatchObject({ seatCard: SEAT, playbookCard: PLAYBOOK });
      expect(weeks[2]).toMatchObject({ seatCard: LOCKED_SEAT, playbookCard: LOCKED_PLAYBOOK });
    });
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
    // D-221: but for the old setup order and each kit skill's use line, which the seed no longer writes.
    const main = courseV1 as unknown as { weeks: { setup?: unknown; skills: { use?: unknown }[] }[] };
    const retired = { ...main, weeks: main.weeks.map(({ setup: _s, ...w }) => ({ ...w, skills: w.skills.map(({ use: _u, ...k }) => k) })) };
    expect((res.json() as { course: unknown }).course).toEqual(retired);
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
    expect(body).toEqual({ ok: true, cohort: true, modules: 9, published: 9, sessions: 16, expected: { modules: 9, sessions: 16 }, steps: 0, retired: 0 });
  });

  it('counts the weeks the course page shows: a copy made with Duplicate is not one of them', { timeout: 120_000 }, async () => {
    await resetDatabase(seedProduction({ owner: OWNER }));
    const before = await loadDb();
    const after = structuredClone(before);
    const week2 = after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    after.modules.push({ ...structuredClone(week2), id: 'm_copy', name: `${week2.name} (copy)`, status: 'published' });
    await persistDiff(handle, before, after);
    expect(await status()).toEqual({ ok: true, cohort: true, modules: 9, published: 9, sessions: 16, expected: { modules: 9, sessions: 16 }, steps: 0, retired: 0 });
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

  it('counts the data steps that ran and the weeks that still hold a retired field (D-221)', { timeout: 180_000 }, async () => {
    await resetDatabase(seedProduction({ owner: OWNER }));
    const before = await loadDb();
    const after = structuredClone(before);
    // As production held the weeks before the D-220 and D-221 steps: a promise, a setup order, a use line.
    after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!.course!.promise = 'A second copy of the outcome.';
    after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!.course!.setup = [{ text: 'Open the kit.' }];
    const w2 = after.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!.course!;
    w2.skills = w2.skills.map((k) => ({ ...k, use: 'What it does.' }));
    await persistDiff(handle, before, after);
    expect(await status()).toMatchObject({ ok: true, steps: 0, retired: 3 });
    const reports = await applyDataMigrations(handle, Date.now());
    // (The release plan among them schedules Weeks 1 to 8, so `published` and `ok` change too: not this test's.)
    expect(await status()).toMatchObject({ steps: DATA_MIGRATIONS.length, retired: 0 });
    expect(reports.map((r) => r.id)).toEqual(DATA_MIGRATIONS.map((m) => m.id));
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

