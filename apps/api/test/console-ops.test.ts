// The Admin Console, PR 6 (D-165, spec §§ 7.9-7.10), against a real Postgres: API & Webhooks' reads,
// the GHL retry (the CRM sync's own reset, audited, never queued for Spring's location), the Jobs list
// and Run Now (the allowlist, the scheduler's own lock, exactly a scheduled tick's sends).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { BILLING_JOB_NOTE, REMINDER_JOBS, seedForDatabase } from '@ai/core';
import type { ApiEndpoints, ConsoleJobs, ConsoleWebhooks } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { SPRING_GHL_LOCATION } from '../src/console/ops';
import { apiMetrics, auditLog, ghlLogins, jobRuns, jobTicks, orders, stripeEvents, users } from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { MAX_ATTEMPTS } from '../src/jobs/ghl-sync';
import { JOB_NAMES } from '../src/jobs/keys';
import { JOB_SCHEDULES } from '../src/jobs/schedules';
import { runScheduledJobs, startScheduler } from '../src/jobs/scheduler';
import { resetDatabase, testDatabase } from './helpers';

/** Gate 8's instant: Session 3's session-24h is due for every learner. */
const NOW = Date.parse('2026-12-08T13:00:00-06:00');
const MIN = 60_000;
const SEED = seedForDatabase('live');
const EVERYONE = SEED.users.map((u) => u.id);
const ORIGIN = { 'content-type': 'application/json' };

let app: App;
const saved: Record<string, string | undefined> = {};
const setEnv = (k: string, v: string | undefined) => {
  if (!(k in saved)) saved[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
};

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  setEnv('APP_URL', 'https://learn.example.com');
  setEnv('GHL_LOCATION_ID', undefined);
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(SEED);
  const db = await testDatabase();
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  app = await build({ logger: false, console: { ops: { stripeMode: 'test' } } });
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
    delete saved[k];
  }
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const get = async (url: string, as = 'st1') => app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(as) } });
const post = async (url: string, payload: object, as = 'st1') => app.inject({ method: 'POST', url, headers: { ...ORIGIN, cookie: await app.signInAs(as) }, payload });
const audits = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const ticks = async () => (await testDatabase()).select().from(jobTicks).orderBy(asc(jobTicks.id));

describe('GET /api/console/api/endpoints (D-165) @console', () => {
  it('reads the last 24 hours by route template, busiest first, with p50, p95 and the 5xx rate', async () => {
    const db = await testDatabase();
    const minute = NOW - (NOW % MIN);
    await db.insert(apiMetrics).values([
      { minute, route: 'GET /api/snapshot', count: 90, errors4xx: 3, errors5xx: 1, hist: { '25': 40, '50': 40, '250': 10 } },
      { minute: minute - 60 * MIN, route: 'GET /api/snapshot', count: 10, errors4xx: 0, errors5xx: 1, hist: { '50': 10 } },
      { minute, route: 'POST /api/mutate/:name', count: 20, errors4xx: 0, errors5xx: 0, hist: { '100': 20 } },
      // Older than a day: not in the window.
      { minute: minute - 25 * 60 * MIN, route: 'GET /api/course', count: 500, errors4xx: 0, errors5xx: 500, hist: { '5000': 500 } },
    ]);
    const res = await get('/api/console/api/endpoints', 'st4');
    expect(res.statusCode).toBe(200);
    const body = res.json<ApiEndpoints>();
    expect(body.rows.map((r) => [r.route, r.requests])).toEqual([
      ['GET /api/snapshot', 100],
      ['POST /api/mutate/:name', 20],
    ]);
    const snap = body.rows[0]!;
    expect(snap.errorRate).toBeCloseTo(2, 5);
    // 100 samples: 40 at ≤25 ms, 50 at ≤50, 10 at ≤250. The 50th is 10 into the ≤50 bucket of 50.
    expect(snap.p50Ms).toBe(30);
    expect(snap.p95Ms).toBe(175);
    expect(body.summary).toEqual({ requests: 120, errorRate: (100 * 2) / 120, p95Ms: 160 });
    expect(body.windowMs).toBe(24 * 60 * MIN);
  });

  it('answers an empty window with no rows and no figures', async () => {
    const body = (await get('/api/console/api/endpoints')).json<ApiEndpoints>();
    expect(body.rows).toEqual([]);
    expect(body.summary).toEqual({ requests: 0, errorRate: null, p95Ms: null });
  });
});

async function seedDeliveries() {
  const db = await testDatabase();
  await db.insert(orders).values([
    { id: 'o-gone', plan: 'membership', option: 'monthly', origin: 'payment_link', status: 'paid', email: 'gone@example.com', createdAt: NOW - 9000, ghlAttempts: MAX_ATTEMPTS, ghlError: 'contact:unauthorized:401', ghlLastAttemptAt: NOW - 3000, ghlNextAttemptAt: NOW + 5 * MIN },
  ]);
  await db.insert(ghlLogins).values({ userId: 'u_jamie', firstLoginAt: NOW - 7000, ghlAttempts: 2, ghlError: 'contact:rate-limited:429', ghlNextAttemptAt: NOW + 15 * MIN, ghlLastAttemptAt: NOW - 2000 });
  await db.insert(stripeEvents).values([
    { id: 'evt_ok', type: 'invoice.paid', receivedAt: NOW - 5 * MIN, processedAt: NOW - 5 * MIN },
    { id: 'evt_bad', type: 'customer.subscription.updated', receivedAt: NOW - 4 * MIN, error: 'StripeConnectionError' },
    { id: 'evt_new', type: 'checkout.session.completed', receivedAt: NOW - MIN },
  ]);
}

describe('GET /api/console/webhooks (D-165, D13) @console', () => {
  it('lists GHL from the CRM sync log, Stripe from stripe_events with its Dashboard link, and Zoom as not configured', async () => {
    await seedDeliveries();
    const res = await get('/api/console/webhooks', 'st4');
    expect(res.statusCode).toBe(200);
    const body = res.json<ConsoleWebhooks>();
    expect(body.failed).toEqual({ ghl: 2, stripe: 1 });
    expect(body.rows.map((r) => [r.source, r.event, r.id, r.status])).toEqual([
      ['ghl', 'login.sync', 'u_jamie', 'retrying'],
      ['ghl', 'order.sync', 'o-gone', 'failed'],
      ['stripe', 'checkout.session.completed', 'evt_new', 'queued'],
      ['stripe', 'customer.subscription.updated', 'evt_bad', 'failed'],
      ['stripe', 'invoice.paid', 'evt_ok', 'delivered'],
      ['zoom', 'recording.completed', null, 'not_configured'],
    ]);
    const [login, order, , bad] = body.rows;
    expect(login).toMatchObject({ attempts: { n: 2, of: MAX_ATTEMPTS }, nextAttemptAt: NOW + 15 * MIN, attemptsUsed: false, retry: { kind: 'login', id: 'u_jamie' } });
    expect(order).toMatchObject({ attempts: { n: MAX_ATTEMPTS, of: MAX_ATTEMPTS }, nextAttemptAt: null, attemptsUsed: true, error: 'contact:unauthorized:401' });
    // View-only (D13): no retry, a link to the event in the key's mode.
    expect(bad).toMatchObject({ retry: null, attempts: null, error: 'StripeConnectionError', stripeUrl: 'https://dashboard.stripe.com/test/events/evt_bad' });
    // Never an address: the deliveries name rows by id.
    expect(res.body).not.toMatch(/@example\.com/);
  });
});

describe('POST /api/console/webhooks/ghl/retry (D-165, D13) @console', () => {
  it('is the CRM sync’s own reset: attempts to 0, the lock cleared, one audit row', async () => {
    await seedDeliveries();
    const res = await post('/api/console/webhooks/ghl/retry', { kind: 'order', id: 'o-gone' }, 'st_admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    const db = await testDatabase();
    const [row] = await db.select().from(orders).where(eq(orders.id, 'o-gone'));
    expect(row).toMatchObject({ ghlAttempts: 0, ghlNextAttemptAt: null, ghlError: 'contact:unauthorized:401' });
    expect((await audits()).map((a) => [a.action, a.outcome, a.actorUserId, a.targetType, a.targetId, a.after])).toEqual([
      ['webhook.ghl_retry', 'ok', 'st_admin', 'ghl_order', 'o-gone', { kind: 'order', attempts: 0 }],
    ]);

    // The same reset the CRM sync log's Retry makes, through its own route.
    await db.update(ghlLogins).set({ ghlAttempts: MAX_ATTEMPTS }).where(eq(ghlLogins.userId, 'u_jamie'));
    const legacy = await post('/api/admin/crm-sync/retry', { kind: 'login', id: 'u_jamie' });
    expect(legacy.statusCode).toBe(200);
    const [login] = await db.select().from(ghlLogins).where(eq(ghlLogins.userId, 'u_jamie'));
    expect(login).toMatchObject({ ghlAttempts: 0, ghlNextAttemptAt: null });
  });

  it('audits a row that is not there, and refuses a body that names none', async () => {
    const missing = await post('/api/console/webhooks/ghl/retry', { kind: 'order', id: 'o-nope' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('not_found');
    expect((await audits()).map((a) => [a.action, a.outcome, a.reason])).toEqual([['webhook.ghl_retry', 'failed', 'not_found']]);
    for (const body of [{}, { kind: 'invoice', id: 'x' }, { kind: 'order', id: '' }, { kind: 'order', id: 'a b' }]) {
      const res = await post('/api/console/webhooks/ghl/retry', body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.json().code).toBe('invalid_body');
    }
    expect(await audits()).toHaveLength(1);
  });

  it('never queues a retry for Spring’s location (spec § 1): 409, audited, the row untouched', async () => {
    await seedDeliveries();
    setEnv('GHL_LOCATION_ID', ` ${SPRING_GHL_LOCATION} `);
    const res = await post('/api/console/webhooks/ghl/retry', { kind: 'order', id: 'o-gone' });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('ghl_location_guarded');
    expect(res.body).not.toContain(SPRING_GHL_LOCATION);
    const [row] = await (await testDatabase()).select().from(orders).where(eq(orders.id, 'o-gone'));
    expect(row!.ghlAttempts).toBe(MAX_ATTEMPTS);
    expect((await audits()).map((a) => [a.action, a.outcome, a.reason])).toEqual([['webhook.ghl_retry', 'denied', 'ghl_location_guarded']]);
  });
});

describe('GET /api/console/jobs (D-165, spec § 7.10) @console', () => {
  it('lists every scheduled job from code, the billing row in the spec’s words, and no accelerator-reminders', async () => {
    const body = (await get('/api/console/jobs', 'st4')).json<ConsoleJobs>();
    expect(body.rows.map((r) => r.job)).toEqual([...JOB_NAMES, 'billing', 'cohort-welcome', 'ghl-sync', 'ghl-logins', 'ghl-orders', 'ghl-extras', 'ghl-welcome']);
    expect(body.rows.every((r) => r.schedule === 'Every minute' && r.last === null && r.durationMs === null && r.nextRunAt === null)).toBe(true);
    const billing = body.rows.find((r) => r.job === 'billing')!;
    expect(billing).toMatchObject({ note: BILLING_JOB_NOTE, runNow: 'schedule_only' });
    expect(BILLING_JOB_NOTE).toBe('Runs on schedule only · keeps the AI Accelerator seat cap in sync with Stripe');
    expect(body.rows.filter((r) => r.runNow === 'allowed').map((r) => r.job)).toEqual([...REMINDER_JOBS]);
    expect(body.rows.filter((r) => r.job.startsWith('ghl-')).every((r) => r.runNow === 'off')).toBe(true);
  });

  it('reads the scheduler’s own tick: its result, when, how long, and the next one', async () => {
    const scheduler = startScheduler({ intervalMs: 3_600_000, signals: [], log: { info: () => {}, warn: () => {}, error: () => {} } });
    try {
      const run = await scheduler.tick();
      expect(run.ran).toBe(true);
    } finally {
      await scheduler.stop();
    }
    expect((await ticks()).map((t) => [t.job, t.status, t.trigger, t.actorUserId, t.startedAt, t.finishedAt])).toEqual([['scheduler', 'succeeded', 'schedule', null, NOW, NOW]]);
    const body = (await get('/api/console/jobs')).json<ConsoleJobs>();
    for (const job of JOB_NAMES) {
      expect(body.rows.find((r) => r.job === job)).toMatchObject({ last: { status: 'succeeded', startedAt: NOW, trigger: 'schedule' }, durationMs: 0, nextRunAt: NOW + MIN });
    }
    expect(body.rows.find((r) => r.job === 'billing')!.last).toBeNull();
  });
});

describe('POST /api/console/jobs/:job/run (D-165, D14) @console', () => {
  it('runs the scheduler’s tick: exactly the sends a scheduled tick would make now, once', async () => {
    const res = await post('/api/console/jobs/session-24h/run', {}, 'st_admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ job: 'session-24h', status: 'succeeded', startedAt: NOW, finishedAt: NOW });
    await settleEmails();
    const sent = outbox();
    expect(sent.map((e) => e.to).sort()).toEqual(SEED.users.map((u) => u.email).sort());
    const db = await testDatabase();
    const ledger = (await db.select().from(jobRuns)).map((r) => r.key).sort();
    expect(ledger).toEqual(EVERYONE.map((id) => `session-24h:dec26-s3:${id}`).sort());
    expect((await ticks()).map((t) => [t.job, t.status, t.trigger, t.actorUserId])).toEqual([['scheduler', 'succeeded', 'manual', 'st_admin']]);
    expect((await audits()).map((a) => [a.action, a.outcome, a.actorUserId, a.targetType, a.targetId])).toEqual([['job.run_now', 'ok', 'st_admin', 'job', 'session-24h']]);

    // A scheduled tick after it owes nothing: job_runs holds every key. Neither sends twice.
    resetOutbox();
    const after = await runScheduledJobs();
    expect(after.ran).toBe(true);
    expect(after.sent).toBe(0);
    expect(outbox()).toEqual([]);
    const again = await post('/api/console/jobs/weekly-digest/run', {});
    expect(again.statusCode).toBe(200);
    await settleEmails();
    expect(outbox()).toEqual([]);
  });

  it('sends what a scheduled tick would have sent in its place', async () => {
    const scheduled = await runScheduledJobs();
    const byTick = outbox().map((e) => [e.to, e.subject]);
    resetOutbox();
    await resetDatabase(SEED);
    const res = await post('/api/console/jobs/announcement/run', {});
    expect(res.statusCode).toBe(200);
    await settleEmails();
    expect(outbox().map((e) => [e.to, e.subject])).toEqual(byTick);
    expect(scheduled.sent).toBe(EVERYONE.length);
  });

  it('refuses every job off the allowlist with 403 job_not_runnable, audited, running nothing', async () => {
    for (const job of ['billing', 'ghl-sync', 'ghl-logins', 'ghl-orders', 'ghl-extras', 'accelerator-reminders', 'nope']) {
      const res = await post(`/api/console/jobs/${job}/run`, {});
      expect(res.statusCode, job).toBe(403);
      expect(res.json(), job).toEqual({ error: 'This job only runs on its schedule. It cannot be started by hand.', code: 'job_not_runnable' });
    }
    const rows = await audits();
    expect(rows.map((a) => [a.action, a.outcome, a.reason, a.targetId])).toEqual([
      ['job.run_now', 'denied', 'job_not_runnable', 'billing'],
      ['job.run_now', 'denied', 'job_not_runnable', 'ghl-sync'],
      ['job.run_now', 'denied', 'job_not_runnable', 'ghl-logins'],
      ['job.run_now', 'denied', 'job_not_runnable', 'ghl-orders'],
      ['job.run_now', 'denied', 'job_not_runnable', 'ghl-extras'],
      // Not a job: no name from the address is written.
      ['job.run_now', 'denied', 'job_not_runnable', null],
      ['job.run_now', 'denied', 'job_not_runnable', null],
    ]);
    expect(await ticks()).toEqual([]);
    expect(outbox()).toEqual([]);
    expect(JOB_SCHEDULES.filter((s) => s.runNow === 'allowed').map((s) => s.job)).toEqual([...REMINDER_JOBS]);
  });

  it('answers 409 scheduler_busy while lock 4242 is held, sending nothing', async () => {
    const db = await testDatabase();
    let acquired!: () => void;
    let release!: () => void;
    const held = new Promise<void>((resolve) => void (acquired = resolve));
    const finish = new Promise<void>((resolve) => void (release = resolve));
    const holder = db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
      acquired();
      await finish;
    });
    try {
      await held;
      const res = await post('/api/console/jobs/session-1h/run', {});
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('scheduler_busy');
    } finally {
      release();
      await holder;
    }
    await settleEmails();
    expect(outbox()).toEqual([]);
    expect((await ticks()).map((t) => [t.status, t.trigger])).toEqual([['skipped', 'manual']]);
    expect((await audits()).map((a) => [a.action, a.outcome, a.reason])).toEqual([['job.run_now', 'failed', 'scheduler_busy']]);
  });
});
