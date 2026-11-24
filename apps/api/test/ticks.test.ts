// `recordTick` and the scheduler's observe-only wrapper (D-165, spec § 7.10, § 9): a run is recorded
// around the existing call, and the call does, returns and throws exactly what it did before, whether
// or not the table takes the row. Plus the CRM sync's extracted reset and JOB_SCHEDULES' allowlist.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { RUN_NOW_JOBS, REMINDER_JOBS, seedForDatabase } from '@ai/core';
import { ai101Waitlist, ghlLogins, jobTicks, orders } from '../src/db/schema';
import { resetOutbox } from '../src/email/transport';
import { MAX_ATTEMPTS } from '../src/jobs/ghl-sync';
import { JOB_NAMES } from '../src/jobs/keys';
import { JOB_SCHEDULES } from '../src/jobs/schedules';
import { startScheduler } from '../src/jobs/scheduler';
import { SCHEDULER_TICK_JOB, errorKindOf, recordTick } from '../src/jobs/ticks';
import { resetCrmSyncRow } from '../src/routes/crm-sync';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const quiet = { info: () => {}, warn: () => {}, error: () => {} };

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const ticks = async () => (await testDatabase()).select().from(jobTicks).orderBy(asc(jobTicks.id));

describe('recordTick is observe-only (D-165) @g8', () => {
  it('records a run that succeeds, and hands back exactly what it returned', async () => {
    const value = { ran: true, n: 3 };
    let calls = 0;
    const out = await recordTick('scheduler', async () => {
      calls += 1;
      expect((await ticks()).map((t) => t.status)).toEqual(['running']);
      return value;
    });
    expect(out).toBe(value);
    expect(calls).toBe(1);
    expect((await ticks()).map((t) => [t.job, t.status, t.trigger, t.actorUserId, t.errorKind, t.startedAt, t.finishedAt])).toEqual([
      ['scheduler', 'succeeded', 'schedule', null, null, NOW, NOW],
    ]);
  });

  it('rethrows the very error a run throws, and records only its kind', async () => {
    const boom = Object.assign(new Error('relation "x" has an email jamie@example.com'), { code: '42P01' });
    await expect(recordTick('scheduler', async () => Promise.reject(boom))).rejects.toBe(boom);
    const [t] = await ticks();
    expect(t).toMatchObject({ status: 'failed', errorKind: '42P01' });
    expect(errorKindOf(new TypeError('x'))).toBe('TypeError');
    expect(errorKindOf('a string')).toBe('error');
    expect(errorKindOf({ code: 'has spaces and an @' })).toBe('error');
  });

  it('records a run that found the lock held as skipped', async () => {
    await recordTick('scheduler', async () => ({ ran: false }), { skipped: (r) => !r.ran });
    expect((await ticks()).map((t) => t.status)).toEqual(['skipped']);
  });

  it('runs the job once, unchanged, when the table refuses every write', async () => {
    const warnings: string[] = [];
    const broken = () => {
      throw Object.assign(new Error('gone'), { code: 'ECONNRESET' });
    };
    let calls = 0;
    const out = await recordTick('scheduler', async () => (calls += 1), { db: broken, log: { warn: (_o, m) => void warnings.push(m) } });
    expect(out).toBe(1);
    expect(calls).toBe(1);
    const err = new Error('the job’s own');
    await expect(recordTick('scheduler', async () => Promise.reject(err), { db: broken, log: { warn: () => {} } })).rejects.toBe(err);
    expect(await ticks()).toEqual([]);
    expect(warnings.length).toBeLessThanOrEqual(1);
  });
});

describe('the scheduler’s tick, recorded (D-165, spec § 9) @g8', () => {
  it('writes one schedule row per tick on the app’s database, and skipped while 4242 is held', async () => {
    const scheduler = startScheduler({ intervalMs: 3_600_000, signals: [], log: quiet });
    try {
      expect((await scheduler.tick()).ran).toBe(true);
      const db = await testDatabase();
      let acquired!: () => void;
      let release!: () => void;
      const held = new Promise<void>((r) => void (acquired = r));
      const finish = new Promise<void>((r) => void (release = r));
      const holder = db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
        acquired();
        await finish;
      });
      await held;
      try {
        expect((await scheduler.tick()).ran).toBe(false);
      } finally {
        release();
        await holder;
      }
    } finally {
      await scheduler.stop();
    }
    expect((await ticks()).map((t) => [t.job, t.status, t.trigger])).toEqual([
      [SCHEDULER_TICK_JOB, 'succeeded', 'schedule'],
      [SCHEDULER_TICK_JOB, 'skipped', 'schedule'],
    ]);
  });
});

describe('the CRM sync’s reset, extracted (D-165, D13) @g9', () => {
  it('resets each kind’s attempts and lock, leaves the rest of the row, and says when there is no row', async () => {
    const db = await testDatabase();
    await db.insert(ai101Waitlist).values({ id: 'wl-1', firstName: 'Wl', email: 'wl@example.com', source: 'voice-profile', createdAt: NOW, ghlAttempts: MAX_ATTEMPTS, ghlError: 'upsert:rejected:400', ghlNextAttemptAt: NOW + 1 });
    await db.insert(orders).values({ id: 'o-1', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', email: 'o@example.com', createdAt: NOW, ghlAttempts: 3, ghlError: 'fields:rejected:422', ghlNextAttemptAt: NOW + 1 });
    await db.insert(ghlLogins).values({ userId: 'u_jamie', firstLoginAt: NOW, ghlAttempts: MAX_ATTEMPTS, ghlError: 'contact:unauthorized:401', ghlNextAttemptAt: NOW + 1 });
    expect(await resetCrmSyncRow('waitlist', 'wl-1')).toBe(true);
    expect(await resetCrmSyncRow('order', 'o-1')).toBe(true);
    expect(await resetCrmSyncRow('login', 'u_jamie')).toBe(true);
    expect(await resetCrmSyncRow('order', 'o-missing')).toBe(false);
    expect(await resetCrmSyncRow('login', 'u_nobody')).toBe(false);
    const [w] = await db.select().from(ai101Waitlist).where(eq(ai101Waitlist.id, 'wl-1'));
    const [o] = await db.select().from(orders).where(eq(orders.id, 'o-1'));
    const [l] = await db.select().from(ghlLogins).where(eq(ghlLogins.userId, 'u_jamie'));
    expect([w, o, l].map((r) => [r!.ghlAttempts, r!.ghlNextAttemptAt, r!.ghlError])).toEqual([
      [0, null, 'upsert:rejected:400'],
      [0, null, 'fields:rejected:422'],
      [0, null, 'contact:unauthorized:401'],
    ]);
  });
});

describe('JOB_SCHEDULES (D-165, D14) @g8', () => {
  it('lists the scheduler’s six jobs as REMINDER_JOBS, and Run Now allows those six alone', () => {
    expect([...JOB_NAMES]).toEqual([...REMINDER_JOBS]);
    expect([...RUN_NOW_JOBS]).toEqual([...JOB_NAMES]);
    expect(JOB_SCHEDULES.map((s) => [s.job, s.runNow])).toEqual([
      ...JOB_NAMES.map((j) => [j, 'allowed']),
      ['billing', 'schedule_only'],
      ['cohort-welcome', 'schedule_only'],
      ['ghl-sync', 'off'],
      ['ghl-logins', 'off'],
      ['ghl-orders', 'off'],
      ['ghl-extras', 'off'],
      ['ghl-welcome', 'off'],
    ]);
    expect(JOB_SCHEDULES.filter((s) => s.tickJob === SCHEDULER_TICK_JOB).map((s) => s.job)).toEqual([...JOB_NAMES]);
  });
});
