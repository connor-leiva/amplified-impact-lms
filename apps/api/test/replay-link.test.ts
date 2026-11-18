// D-183 over HTTP: a learner's snapshot carries the recording staff attach to a session (D-172's Attach
// replay) only once it is published to them, never for another cohort, never for a locked week unless
// staff set it Published (D-187); the Zoom link stays blank and staff see every link. Against a real Postgres seeded as production is, after the
// deploy's release plan; the buyer is made by the real provisioning path; the clock is FIXED_NOW.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { Db, Learner, Session } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionOrder } from '../src/billing/provision';
import { orders, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { resetDatabase, testDatabase } from './helpers';

const MT = (iso: string): number => Date.parse(`${iso}-07:00`);
const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const BOUGHT = MT('2026-11-14T14:00:00');
/** Dec 5: Week 1's build (Dec 2) is over and its week open; Week 2 (Dec 9) is still locked. */
const DEC5 = MT('2026-12-05T10:00:00');
const URL = 'https://zoom.us/rec/share/week-one-build';
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
const OTHER: Learner = { id: 'u_other', name: 'Other Cohort', email: 'other@example.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'feb27', joined: BOUGHT, last: null, status: 'active', progress: {} };

let handle: Database;
let app: App;
const cookies = new Map<string, string>();

async function seeded(): Promise<void> {
  const db: Db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
  db.users.push(OTHER);
  if (!db.cohorts.some((c) => c.id === 'feb27')) db.cohorts.push({ ...db.cohorts[0]!, id: 'feb27', name: 'February 2027' });
  db.sessions.push({ ...db.sessions.find((s) => s.id === 'dec26-s1')!, id: 'feb27-s1', cohortId: 'feb27' });
  await resetDatabase(db);
  await handle.insert(orders).values({ id: 'ord_full', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: 'Full', email: 'full@example.test', company: 'Full group', crm: 'follow_up_boss', createdAt: BOUGHT });
  const out = await provisionOrder('ord_full', { db: handle, log: silent, now: BOUGHT, invitesFrom: BOUGHT, invitesEnabled: false });
  if (!out.ok) throw new Error(`provisioning failed: ${out.reason}`);
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  const [buyer] = await handle.select({ id: users.id }).from(users).where(eq(users.email, 'full@example.test'));
  const minter = await build({ logger: false });
  cookies.set('buyer', await minter.signInAs(buyer!.id));
  cookies.set('other', await minter.signInAs(OTHER.id));
  cookies.set('staff', await minter.signInAs('st_owner'));
  await minter.close();
}

beforeAll(async () => {
  handle = await testDatabase();
});
beforeEach(async () => {
  at(DEC5);
  await seeded();
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const sessions = async (who: string): Promise<Session[]> => {
  const res = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: cookies.get(who)! } });
  expect(res.statusCode).toBe(200);
  return (res.json() as Db).sessions;
};
const act = (name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/admin/actions/${name}`, headers: { cookie: cookies.get('staff')!, 'content-type': 'application/json' }, payload: JSON.stringify(payload) });

describe('the replay link a learner receives (D-183) @replay-link', () => {
  it('a learner sees the attached recording after publish and not before; the Zoom link stays blank @parity:C-3 @parity:M-3 @parity:E-1', async () => {
    const before = (await sessions('buyer')).find((s) => s.id === 'dec26-s1')!;
    expect(before).not.toHaveProperty('replayUrl');
    expect((await act('attachReplay', { sessionId: 'dec26-s1', url: URL })).statusCode).toBe(200);
    const after = (await sessions('buyer')).find((s) => s.id === 'dec26-s1')!;
    expect(after).toMatchObject({ replay: 'ready', replayUrl: URL, zoom: '' });
    // Staff see it, as before.
    expect((await sessions('staff')).find((s) => s.id === 'dec26-s1')!.replayUrl).toBe(URL);
  });

  it('never when staff set the replay Hidden', async () => {
    expect((await act('attachReplay', { sessionId: 'dec26-s1', url: URL })).statusCode).toBe(200);
    await handle.execute(sql.raw(`update sessions set replay_visibility = 'hidden' where id = 'dec26-s1'`));
    expect((await sessions('staff')).find((x) => x.id === 'dec26-s1')!.replayUrl).toBe(URL);
    expect((await sessions('buyer')).find((x) => x.id === 'dec26-s1')).not.toHaveProperty('replayUrl');
  });

  it('never for another cohort: that session isn’t in their snapshot, and their own carries only theirs', async () => {
    expect((await act('attachReplay', { sessionId: 'dec26-s1', url: URL })).statusCode).toBe(200);
    const theirs = await sessions('other');
    expect(theirs.find((s) => s.id === 'dec26-s1')).toBeUndefined();
    expect(JSON.stringify(theirs)).not.toContain(URL);
  });

  it('never for a locked week while its replay waits for the week: After the week opens, or not set @parity:C-3', async () => {
    // Week 2's build is Dec 9; on Dec 5 the week is locked. A ready replay with a link, put straight in.
    for (const v of [null, 'after_open'] as const) {
      await handle.execute(sql.raw(`update sessions set replay = 'ready', replay_url = '${URL}', replay_visibility = ${v === null ? 'null' : `'${v}'`} where id = 'dec26-s2'`));
      expect((await sessions('staff')).find((s) => s.id === 'dec26-s2')!.replayUrl).toBe(URL);
      const s = (await sessions('buyer')).find((x) => x.id === 'dec26-s2')!;
      expect(s).not.toHaveProperty('replayUrl');
      expect(s.replay).toBeNull();
    }
  });

  it('D-187: a Published replay shows as soon as it is ready, even while its week is locked @parity:C-3 @parity:E-1', async () => {
    await handle.execute(sql.raw(`update sessions set replay = 'ready', replay_url = '${URL}', replay_visibility = 'published' where id = 'dec26-s2'`));
    const s = (await sessions('buyer')).find((x) => x.id === 'dec26-s2')!;
    expect(s).toMatchObject({ replay: 'ready', replayUrl: URL, zoom: '' });
    // Another cohort still gets nothing of it.
    expect(JSON.stringify(await sessions('other'))).not.toContain(URL);
  });

  it('D-187: After the week opens shows once the week opens', async () => {
    await handle.execute(sql.raw(`update sessions set replay = 'ready', replay_url = '${URL}', replay_visibility = 'after_open' where id = 'dec26-s2'`));
    expect((await sessions('buyer')).find((x) => x.id === 'dec26-s2')).not.toHaveProperty('replayUrl');
    // Dec 10: Week 2 opened at its build, Dec 9 at 12:00 PM MT.
    await app.close();
    at(MT('2026-12-10T10:00:00'));
    app = await build({ logger: false });
    expect((await sessions('buyer')).find((x) => x.id === 'dec26-s2')).toMatchObject({ replay: 'ready', replayUrl: URL });
  });
});
