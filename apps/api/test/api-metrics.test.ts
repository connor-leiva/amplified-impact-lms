// The API metrics hook (D-165, spec § 7.9) against a real Postgres: observe-only (the same requests
// answered byte for byte with it on and off), keyed by route template, a failed flush that never
// reaches a request, the minute's upsert, and the D6 prunes.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import type { InjectOptions } from 'fastify';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { apiMetrics, jobTicks } from '../src/db/schema';
import { createApiMetrics } from '../src/lib/api-metrics';
import type { ApiMetrics } from '../src/lib/api-metrics';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:30Z');
const MINUTE = NOW - (NOW % 60_000);
const DAY = 24 * 3600_000;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
});
afterEach(async () => {
  await settleEmails();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const rows = async () => (await testDatabase()).select().from(apiMetrics).orderBy(asc(apiMetrics.route));

/** The requests both apps answer: reads, a refusal, a 404, a write, the healthcheck and a bad body. */
async function answers(app: App) {
  const learner = await app.signInAs('u_jamie');
  const owner = await app.signInAs('st1');
  const probes: InjectOptions[] = [
    { method: 'GET', url: '/api/health' },
    { method: 'GET', url: '/api/snapshot', headers: { cookie: learner } },
    { method: 'GET', url: '/api/me', headers: { cookie: learner } },
    { method: 'GET', url: '/api/console/me', headers: { cookie: learner } },
    { method: 'GET', url: '/api/console/audit', headers: { cookie: owner } },
    { method: 'GET', url: '/api/no-such-route' },
    { method: 'GET', url: '/api/sessions/dec26-s3/join', headers: { cookie: learner } },
    { method: 'POST', url: '/api/mutate/toggleStep', headers: { cookie: learner, 'content-type': 'application/json' }, payload: { moduleId: 'sales', stepId: 'c4' } },
    { method: 'POST', url: '/api/mutate/toggleStep', headers: { cookie: learner, 'content-type': 'application/json' }, payload: { nope: true } },
  ];
  const out: { status: number; headers: Record<string, unknown>; body: string }[] = [];
  for (const p of probes) {
    const res = await app.inject(p);
    const headers: Record<string, unknown> = { ...res.headers };
    // The two a clock moves between the runs; neither is the hook's.
    delete headers.date;
    delete headers['x-ratelimit-reset'];
    out.push({ status: res.statusCode, headers, body: res.body });
  }
  return out;
}

describe('the metrics hook is observe-only (D-165) @console', () => {
  it('answers the same requests byte for byte with it on and off', async () => {
    const metrics = createApiMetrics({ flushMs: 0 });
    const on = await build({ logger: false, metrics });
    const withHook = await answers(on);
    // It counted (and the close then wrote what it counted).
    expect(metrics.pending()).toBeGreaterThan(0);
    await on.close();
    expect(metrics.pending()).toBe(0);
    expect((await rows()).length).toBeGreaterThan(0);

    await resetDatabase(seedForDatabase('live'));
    const off = await build({ logger: false, metrics: null });
    const without = await answers(off);
    await off.close();
    expect(withHook).toEqual(without);
  });

  it('is off under test unless a suite passes one, and off in fixture mode whatever is passed', async () => {
    const metrics = createApiMetrics({ flushMs: 0 });
    const fixture = await build({ logger: false, fixtureOnly: true, metrics });
    await fixture.inject({ method: 'GET', url: '/api/health' });
    await fixture.inject({ method: 'GET', url: '/api/no-such-route' });
    await fixture.close();
    expect(metrics.pending()).toBe(0);
  });
});

describe('what it counts (D-165) @console', () => {
  let metrics: ApiMetrics;
  let app: App;
  beforeEach(async () => {
    metrics = createApiMetrics({ flushMs: 0 });
    app = await build({ logger: false, metrics });
  });
  afterEach(async () => {
    await app.close();
  });

  it('keys by route template, never the URL, and skips health, events and unmatched addresses', async () => {
    const cookie = await app.signInAs('u_jamie');
    await app.inject({ method: 'GET', url: '/api/sessions/dec26-s3/join', headers: { cookie } });
    await app.inject({ method: 'GET', url: '/api/sessions/dec26-s4/join?x=jamie@example.com', headers: { cookie } });
    await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
    await app.inject({ method: 'GET', url: '/api/snapshot' });
    await app.inject({ method: 'GET', url: '/api/health' });
    await app.inject({ method: 'GET', url: '/api/no-such-route' });
    await metrics.flush();
    const got = await rows();
    expect(got.map((r) => [r.minute, r.route, r.count, r.errors4xx, r.errors5xx])).toEqual([
      [MINUTE, 'GET /api/sessions/:id/join', 2, expect.any(Number), 0],
      [MINUTE, 'GET /api/snapshot', 2, 1, 0],
    ]);
    expect(JSON.stringify(got)).not.toMatch(/dec26-s3|jamie|example\.com/);
    for (const r of got) expect(Object.values(r.hist).reduce((a, b) => a + b, 0)).toBe(r.count);
  });

  it('adds a later flush of the same minute to its row, buckets summed', async () => {
    const cookie = await app.signInAs('u_jamie');
    await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
    await metrics.flush();
    await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
    await app.inject({ method: 'GET', url: '/api/snapshot' });
    await metrics.flush();
    const [row] = await rows();
    expect(row).toMatchObject({ route: 'GET /api/snapshot', count: 3, errors4xx: 1, errors5xx: 0 });
    expect(Object.values(row!.hist).reduce((a, b) => a + b, 0)).toBe(3);
    expect(metrics.pending()).toBe(0);
  });

  it('flushes what is left when the app closes', async () => {
    await app.inject({ method: 'GET', url: '/api/snapshot' });
    await app.close();
    expect((await rows()).map((r) => r.count)).toEqual([1]);
  });
});

describe('a flush that fails never reaches a request (D-165) @console', () => {
  it('keeps answering, keeps the counts and writes them once the database is back', async () => {
    let broken = true;
    const warnings: string[] = [];
    const real = await testDatabase();
    const metrics = createApiMetrics({
      flushMs: 0,
      log: { warn: (_o, m) => void warnings.push(m) },
      db: () => {
        if (broken) throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
        return real;
      },
    });
    const app = await build({ logger: false, metrics });
    try {
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({ method: 'GET', url: '/api/snapshot' });
        expect(res.statusCode).toBe(401);
        await metrics.flush();
      }
      expect(await rows()).toEqual([]);
      expect(metrics.pending()).toBe(1);
      // Once in ten minutes, however often it fails.
      expect(warnings).toEqual(['API metrics not written; kept for the next minute']);
      broken = false;
      await metrics.flush();
      expect((await rows()).map((r) => [r.route, r.count, r.errors4xx])).toEqual([['GET /api/snapshot', 3, 3]]);
    } finally {
      broken = false;
      await app.close();
    }
  });
});

describe('the D6 prunes (D-165) @console', () => {
  it('drops metrics older than 30 days and ticks older than 90, once an hour', async () => {
    const db = await testDatabase();
    await db.insert(apiMetrics).values([
      { minute: MINUTE - 31 * DAY, route: 'GET /api/snapshot', count: 1, errors4xx: 0, errors5xx: 0, hist: { '10': 1 } },
      { minute: MINUTE - 29 * DAY, route: 'GET /api/snapshot', count: 1, errors4xx: 0, errors5xx: 0, hist: { '10': 1 } },
    ]);
    await db.insert(jobTicks).values([
      { job: 'scheduler', startedAt: NOW - 91 * DAY, finishedAt: NOW - 91 * DAY, status: 'succeeded', trigger: 'schedule' },
      { job: 'scheduler', startedAt: NOW - 89 * DAY, finishedAt: NOW - 89 * DAY, status: 'succeeded', trigger: 'schedule' },
    ]);
    const metrics = createApiMetrics({ flushMs: 0 });
    await metrics.flush();
    expect((await rows()).map((r) => r.minute)).toEqual([MINUTE - 29 * DAY]);
    expect((await db.select().from(jobTicks)).map((t) => t.startedAt)).toEqual([NOW - 89 * DAY]);
    await metrics.close();
  });
});
