// D-247, the Week 0 launch audit's H-13 and H-14, over HTTP and through the scheduler against a real Postgres.
//
// H-13: a session added in the Week Builder gets the cohort's next `n`, which no week's `session` names. It belongs to
// the week the builder gave it (`moduleId`): `/api/course` lists it under that week for a course buyer, and an
// Amplified Insiders buyer in the same cohort neither sees it in the snapshot nor joins it.
//
// H-14: the first live build (Wed Dec 2, 12:00 PM MT) opens the course, so a roster read "open now" was empty for both
// of its reminders. Read at the session's start, the 24-hour reminder goes out on Dec 1 and the 1-hour on Dec 2.
//
// Every buyer is made by the real provisioning path (`provisionOrder`), as `course.test.ts` makes them.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import { persistDiff } from '../src/db/io';
import { jobRuns, orders, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { renderTemplate } from '../src/email/templates';
import { outbox, resetOutbox, resetRenderer, setRenderer } from '../src/email/transport';
import { runScheduledJobs } from '../src/jobs/scheduler';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const BOUGHT = '2026-11-14T15:00:00-06:00';
/** Thu Dec 3, 9:00 AM CT: the course is open. */
const AFTER_OPEN = '2026-12-03T09:00:00-06:00';
/** Tue Dec 1, 12:00 PM MT: the 24-hour reminder for Wed Dec 2's build (12:00 PM MT) is due. */
const DEC1_NOON_MT = '2026-12-01T12:00:00-07:00';
/** Wed Dec 2, 10:45 AM MT: still in the 24-hour reminder's window (it closes an hour before the build). */
const DEC2_1045_MT = '2026-12-02T10:45:00-07:00';
/** Wed Dec 2, 11:15 AM MT: in the 1-hour reminder's window (11:00 AM to the build). */
const DEC2_1115_MT = '2026-12-02T11:15:00-07:00';

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
const BUYERS = {
  full: { plan: 'cohort', option: 'full', email: 'full@example.test' },
  insiders: { plan: 'membership', option: 'year_upfront', email: 'insider@example.test' },
} as const;
type Buyer = keyof typeof BUYERS;

let handle: Database;
let app: App;
const ids = new Map<string, string>();
const cookies = new Map<string, string>();
let savedAppUrl: string | undefined;

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
  at(AFTER_OPEN);
  setRenderer(renderTemplate);
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  handle = await testDatabase();
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  for (const buyer of Object.keys(BUYERS) as Buyer[]) ids.set(buyer, await provision(buyer));
  // The full buyer's operator, on the owner's team.
  const before = await loadDb();
  const after = structuredClone(before);
  const owner = after.users.find((u) => u.id === ids.get('full'))!;
  const operator: Learner = { ...owner, id: 'u_operator', name: 'Operator', email: 'operator@example.test', role: 'Operations Lead', progress: {} };
  after.users.push(operator);
  await persistDiff(handle, before, after);
  ids.set('operator', 'u_operator');
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const minter = await build({ logger: false });
  for (const [who, id] of ids) cookies.set(who, await minter.signInAs(id));
  cookies.set('staff', await minter.signInAs('st_owner'));
  await minter.close();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
  resetRenderer();
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

beforeEach(async () => {
  at(AFTER_OPEN);
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
});

describe('H-13: a session added in the builder belongs to its week', () => {
  const W0 = ACCELERATOR_MODULE_IDS[0]!;
  const W1 = ACCELERATOR_MODULE_IDS[1]!;
  const add = async (payload: Record<string, unknown>) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/actions/saveSession',
      headers: { cookie: cookies.get('staff')!, 'content-type': 'application/json' },
      payload: JSON.stringify({ cohortId: 'dec26', replayVisibility: null, ...payload }),
    });
    expect(res.statusCode, res.body).toBe(200);
  };

  it('lists it under its week for a course buyer, keeps it from an Insiders buyer, and Join follows the course', async () => {
    // Five minutes after AFTER_OPEN, so its join window is open; and a Week 0 session later on.
    await add({ moduleId: W1, kind: 'other', title: 'Week 1 Q&A', date: '2026-12-03', time: '08:05', mins: 30, zoom: 'https://zoom.us/j/111' });
    // The ids the actions make read the clock, which FIXED_NOW holds still: a minute on for the second.
    at('2026-12-03T09:01:00-06:00');
    await add({ moduleId: W0, kind: 'setup', title: 'Week 0 Setup Session', date: '2026-12-04', time: '12:00', mins: 60, zoom: 'https://zoom.us/j/222' });
    at(AFTER_OPEN);
    const added = (await loadDb()).sessions.filter((s) => s.title === 'Week 1 Q&A' || s.title === 'Week 0 Setup Session');
    expect(added).toHaveLength(2);
    // The builder numbered them past every seeded session: no week's `session` names them.
    expect(added.every((s) => s.n > 16)).toBe(true);

    for (const who of ['full', 'operator']) {
      const res = await get('/api/course', who);
      expect(res.statusCode).toBe(200);
      const sessions = (res.json() as { sessions: { id: string; week: number; title: string }[] }).sessions;
      expect(sessions.find((s) => s.title === 'Week 1 Q&A')?.week, who).toBe(1);
      expect(sessions.find((s) => s.title === 'Week 0 Setup Session')?.week, who).toBe(0);
    }
    const q = added.find((s) => s.title === 'Week 1 Q&A')!;
    const join = await get(`/api/sessions/${q.id}/join`, 'full');
    expect(join.statusCode).toBe(200);
    expect(join.json()).toEqual({ url: 'https://zoom.us/j/111' });

    // An Insiders buyer is in the same cohort: before H-13 every builder session was in their snapshot and joinable.
    const snap = (await get('/api/snapshot', 'insiders')).json() as Db;
    expect(snap.sessions).toEqual([]);
    expect((await get(`/api/sessions/${q.id}/join`, 'insiders')).statusCode).toBe(404);
  });
});

describe('H-14: the first live build’s reminders go to the course’s buyers', () => {
  beforeEach(async () => {
    await handle.delete(jobRuns);
    resetOutbox();
  });

  const run = async (iso: string) => {
    at(iso);
    resetOutbox();
    await runScheduledJobs({ log: silent });
    return outbox().map((e) => ({ to: e.to, template: e.template, subject: e.subject }));
  };
  const emails = { full: BUYERS.full.email, operator: 'operator@example.test', insiders: BUYERS.insiders.email };
  /** Week 1's build's reminders only (the sessions H-13's case added have reminders of their own). */
  const build1 = (sent: { to: string; template: string; subject: string }[], template: string) =>
    sent.filter((e) => e.template === template && / Session 1 · /.test(e.subject));

  it('the toggles the launch seed writes are on for both reminders', async () => {
    const reminders = (await loadDb()).reminders;
    expect(reminders.filter((r) => r.id === 'rm1' || r.id === 'rm2').map((r) => [r.id, r.on])).toEqual([
      ['rm1', true],
      ['rm2', true],
    ]);
  });

  it('Dec 1, 12:00 PM MT: “Tomorrow” to the buyer and their operator, not the Insiders buyer', async () => {
    const sent = await run(DEC1_NOON_MT);
    const s1 = build1(sent, 'session-24h');
    expect(s1.map((e) => e.to).sort()).toEqual([emails.full, emails.operator].sort());
    expect(s1.every((e) => e.subject.startsWith('Tomorrow: Session 1 · '))).toBe(true);
    expect(sent.some((e) => e.to === emails.insiders)).toBe(false);
    // The ledger holds them: a second tick sends nothing new.
    expect(await run(DEC1_NOON_MT)).toEqual([]);
  });

  it('Dec 2, 10:45 AM MT: a missed “Tomorrow” still goes out; the 1-hour one waits for 11:00 AM MT and then goes out', async () => {
    const early = await run(DEC2_1045_MT);
    expect(build1(early, 'session-24h').map((e) => e.to).sort()).toEqual([emails.full, emails.operator].sort());
    expect(build1(early, 'session-1h')).toEqual([]);
    const hour = await run(DEC2_1115_MT);
    const s1 = build1(hour, 'session-1h');
    expect(s1.map((e) => e.to).sort()).toEqual([emails.full, emails.operator].sort());
    expect(s1.every((e) => e.subject.startsWith('Starting in 1 hour: Session 1 · '))).toBe(true);
    expect(hour.some((e) => e.to === emails.insiders)).toBe(false);
  });
});
