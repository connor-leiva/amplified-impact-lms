// The Admin Console's incidents, PR 8 (D-167, spec § 7.14, D3, D5), against a real Postgres: the
// routes (list, summary, detail, create, ack, resolve with a note, notes), each write one audit row
// and one timeline row; the four auto-open rules through their real sources, deduped by fingerprint,
// observe-only and silent; and the scheduler's one call, which never changes what a tick answers.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, sql } from 'drizzle-orm';
import { NO_SIGNALS, seedForDatabase } from '@ai/core';
import type { IncidentDetail, IncidentRow } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { CONSOLE_PATHS } from '../src/console/routes';
import { DB_SOURCES, evaluateIncidentRules } from '../src/console/incident-rules';
import type { IncidentSources } from '../src/console/incident-rules';
import { apiMetrics, auditLog, ghlLogins, incidentEvents, incidents, jobTicks, stripeEvents, users } from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { MAX_ATTEMPTS } from '../src/jobs/ghl-sync';
import { runScheduledJobs, startScheduler } from '../src/jobs/scheduler';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-08T13:00:00-06:00');
const MIN = 60_000;
const SEED = seedForDatabase('live');

let app: App;
const db = () => testDatabase();
const at = (t: number): void => void (process.env.FIXED_NOW = new Date(t).toISOString());
const audits = async () => (await db()).select().from(auditLog).orderBy(asc(auditLog.id));
const events = async () => (await db()).select().from(incidentEvents).orderBy(asc(incidentEvents.id));
const rows = async () => (await db()).select().from(incidents).orderBy(asc(incidents.id));

async function call(userId: string, method: 'GET' | 'POST', url: string, payload?: unknown) {
  const headers: Record<string, string> = { cookie: await app.signInAs(userId) };
  if (method === 'POST') headers['content-type'] = 'application/json';
  return app.inject({ method, url, headers, ...(method === 'POST' ? { payload: (payload ?? {}) as object } : {}) });
}

const quiet = { info: () => {}, warn: () => {}, error: () => {} };

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  at(NOW);
  process.env.APP_URL = 'https://learn.example.com';
  resetOutbox();
  await resetDatabase(SEED);
  await (await db()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  app = await build({ logger: false });
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

describe('the routes (spec § 7.14) @console', () => {
  const create = (who = 'st4', title = 'Session 3 replay will not play', severity = 'sev3') => call(who, 'POST', CONSOLE_PATHS.incidents, { title, severity });

  it('creates INC-0001 upward: one row, one opened line, one audit row, and nothing sent', async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    const inc = res.json() as IncidentDetail;
    expect(inc).toMatchObject({ id: 'INC-0001', title: 'Session 3 replay will not play', severity: 'sev3', status: 'open', fingerprint: null, openedAt: NOW });
    expect(inc.owner).toEqual({ id: 'st4', name: SEED.staff.find((s) => s.id === 'st4')!.name });
    expect(inc.events).toEqual([{ id: expect.any(String), at: NOW, kind: 'opened', actor: inc.owner, body: null, link: null }]);
    expect((await create('st1', 'Second one', 'sev1')).json().id).toBe('INC-0002');
    const a = await audits();
    expect(a.map((r) => [r.action, r.actorUserId, r.targetType, r.targetId, r.outcome])).toEqual([
      ['incident.create', 'st4', 'incident', 'INC-0001', 'ok'],
      ['incident.create', 'st1', 'incident', 'INC-0002', 'ok'],
    ]);
    expect(await events()).toHaveLength(2);
    expect(outbox()).toEqual([]);
  });

  it('refuses a short title or an unknown severity, writing nothing', async () => {
    expect((await create('st4', 'ab')).statusCode).toBe(400);
    expect((await create('st4', 'Fine title', 'sev4')).statusCode).toBe(400);
    expect(await rows()).toEqual([]);
    expect(await audits()).toEqual([]);
  });

  it('acknowledges an open incident (Support may, D3) once; a second time is 409 and writes nothing', async () => {
    await create('st1');
    const res = await call('st4', 'POST', '/api/console/incidents/INC-0001/ack');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'acknowledged', acknowledgedAt: NOW, acknowledgedBy: { id: 'st4' }, owner: { id: 'st4' } });
    const again = await call('st1', 'POST', '/api/console/incidents/INC-0001/ack');
    expect(again.statusCode).toBe(409);
    expect(again.json().code).toBe('incident_state');
    expect((await audits()).map((r) => [r.action, r.before, r.after])).toEqual([
      ['incident.create', null, { severity: 'sev3', fingerprint: null }],
      ['incident.ack', { status: 'open' }, { status: 'acknowledged' }],
    ]);
    expect((await events()).map((e) => e.kind)).toEqual(['opened', 'acknowledged']);
  });

  it('resolves with a required note, Owner and Admin only; the audit row keeps its length, not its words', async () => {
    await create('st1');
    expect((await call('st_admin', 'POST', '/api/console/incidents/INC-0001/resolve', {})).statusCode).toBe(400);
    const support = await call('st4', 'POST', '/api/console/incidents/INC-0001/resolve', { note: 'Fixed it.' });
    expect(support.statusCode).toBe(403);
    expect(support.json().code).toBe('console_forbidden');
    const res = await call('st_admin', 'POST', '/api/console/incidents/INC-0001/resolve', { note: '  Token rotated; replays play.  ' });
    expect(res.statusCode).toBe(200);
    const inc = res.json() as IncidentDetail;
    expect(inc).toMatchObject({ status: 'resolved', resolvedAt: NOW, resolvedBy: { id: 'st_admin', name: 'Dana Reyes' }, owner: { id: 'st_admin' } });
    expect(inc.events.at(-1)).toMatchObject({ kind: 'resolved', body: 'Token rotated; replays play.', actor: { id: 'st_admin' } });
    expect((await call('st1', 'POST', '/api/console/incidents/INC-0001/resolve', { note: 'Again.' })).json().code).toBe('incident_state');
    const a = await audits();
    expect(a.map((r) => r.action)).toEqual(['incident.create', 'console.access_denied', 'incident.resolve']);
    expect(a[2]!.after).toEqual({ status: 'resolved', length: 'Token rotated; replays play.'.length });
    expect(JSON.stringify(a)).not.toContain('Token rotated');
  });

  it('adds a note at any status: one note line and one audit row', async () => {
    await create('st1');
    expect((await call('st4', 'POST', '/api/console/incidents/INC-0001/notes', { body: '' })).statusCode).toBe(400);
    const res = await call('st4', 'POST', '/api/console/incidents/INC-0001/notes', { body: 'Orders are saved locally.' });
    expect(res.statusCode).toBe(201);
    expect((res.json() as IncidentDetail).events.map((e) => [e.kind, e.body])).toEqual([
      ['opened', null],
      ['note', 'Orders are saved locally.'],
    ]);
    expect((await call('st4', 'POST', '/api/console/incidents/INC-0009/notes', { body: 'x' })).statusCode).toBe(404);
    expect((await audits()).map((r) => [r.action, r.after])).toEqual([
      ['incident.create', { severity: 'sev3', fingerprint: null }],
      ['incident.note', { length: 25 }],
    ]);
  });

  it('lists newest first, filters by status, pages by cursor, and counts the open ones', async () => {
    for (let i = 0; i < 3; i++) await create('st1', `Incident number ${i + 1}`);
    await call('st1', 'POST', '/api/console/incidents/INC-0002/ack');
    await call('st1', 'POST', '/api/console/incidents/INC-0003/resolve', { note: 'Done.' });
    const all = (await call('st4', 'GET', CONSOLE_PATHS.incidents)).json() as { rows: IncidentRow[]; nextCursor: string | null };
    expect(all.rows.map((r) => [r.id, r.status])).toEqual([
      ['INC-0003', 'resolved'],
      ['INC-0002', 'acknowledged'],
      ['INC-0001', 'open'],
    ]);
    expect(all.nextCursor).toBeNull();
    expect((await call('st4', 'GET', `${CONSOLE_PATHS.incidents}?status=open`)).json().rows.map((r: IncidentRow) => r.id)).toEqual(['INC-0001']);
    const first = (await call('st4', 'GET', `${CONSOLE_PATHS.incidents}?limit=2`)).json();
    expect(first.rows.map((r: IncidentRow) => r.id)).toEqual(['INC-0003', 'INC-0002']);
    expect(first.nextCursor).toBe('2');
    expect((await call('st4', 'GET', `${CONSOLE_PATHS.incidents}?limit=2&cursor=2`)).json()).toEqual({ rows: [expect.objectContaining({ id: 'INC-0001' })], nextCursor: null });
    expect((await call('st4', 'GET', `${CONSOLE_PATHS.incidents}?status=closed`)).statusCode).toBe(400);
    expect((await call('st4', 'GET', CONSOLE_PATHS.incidentSummary)).json()).toEqual({ open: 1 });
    expect((await call('st4', 'GET', '/api/console/incidents/INC-0404')).statusCode).toBe(404);
    expect((await call('st4', 'GET', '/api/console/incidents/nope')).statusCode).toBe(404);
  });
});

describe('the auto-open rules (D5) @console', () => {
  const tick = (job: string, status: 'succeeded' | 'failed', t: number) => ({ job, status, startedAt: t - 1000, finishedAt: t, trigger: 'schedule' as const });

  it('opens a sev2 on three failed ticks of a job, as the system, and repeats only on a new failure', async () => {
    const d = await db();
    await d.insert(jobTicks).values([tick('scheduler', 'succeeded', NOW - 9 * MIN), tick('scheduler', 'failed', NOW - 3 * MIN), tick('scheduler', 'failed', NOW - 2 * MIN)]);
    expect(await evaluateIncidentRules(d, NOW)).toEqual({ opened: [], signaled: [], failed: [] });
    await d.insert(jobTicks).values(tick('scheduler', 'failed', NOW - MIN));
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual(['INC-0001']);
    expect(await rows()).toEqual([
      expect.objectContaining({ id: 'INC-0001', title: 'Job scheduler is failing', severity: 'sev2', status: 'open', fingerprint: 'job:scheduler', openedBy: null }),
    ]);
    expect(await events()).toEqual([
      expect.objectContaining({ kind: 'opened', actorUserId: null, body: 'Opened automatically after 3 failed runs of scheduler.', link: '/admin/jobs?job=scheduler', at: NOW }),
    ]);
    expect((await audits()).map((r) => [r.action, r.actorSource, r.actorUserId, r.ip])).toEqual([['incident.create', 'system', null, null]]);
    // The same evidence again: nothing.
    at(NOW + MIN);
    expect(await evaluateIncidentRules(d, NOW + MIN)).toEqual({ opened: [], signaled: [], failed: [] });
    // A fourth failure: one signal line and its audit row, on the same incident.
    await d.insert(jobTicks).values(tick('scheduler', 'failed', NOW + 2 * MIN));
    at(NOW + 3 * MIN);
    expect(await evaluateIncidentRules(d, NOW + 3 * MIN)).toEqual({ opened: [], signaled: ['INC-0001'], failed: [] });
    expect((await events()).at(-1)).toMatchObject({ kind: 'signal', body: 'scheduler failed again: 4 failed runs in a row.', incidentId: 'INC-0001' });
    expect((await audits()).map((r) => r.action)).toEqual(['incident.create', 'incident.signal']);
    expect(outbox()).toEqual([]);
  });

  it('never reopens on evidence older than the resolution, and opens anew on newer', async () => {
    const d = await db();
    await d.insert(jobTicks).values([tick('ghl-orders', 'failed', NOW - 3 * MIN), tick('ghl-orders', 'failed', NOW - 2 * MIN), tick('ghl-orders', 'failed', NOW - MIN)]);
    await evaluateIncidentRules(d, NOW);
    at(NOW + MIN);
    expect((await call('st1', 'POST', '/api/console/incidents/INC-0001/resolve', { note: 'Rotated the token.' })).statusCode).toBe(200);
    expect(await evaluateIncidentRules(d, NOW + 2 * MIN)).toEqual({ opened: [], signaled: [], failed: [] });
    await d.insert(jobTicks).values(tick('ghl-orders', 'failed', NOW + 3 * MIN));
    expect((await evaluateIncidentRules(d, NOW + 4 * MIN)).opened).toEqual(['INC-0002']);
  });

  it('opens a sev2 for a Stripe event errored and unprocessed past 15 minutes, by type', async () => {
    const d = await db();
    await d.insert(stripeEvents).values([
      { id: 'evt_old', type: 'invoice.paid', receivedAt: NOW - 16 * MIN, error: 'StripeConnectionError' },
      { id: 'evt_new', type: 'invoice.paid', receivedAt: NOW - 14 * MIN, error: 'StripeConnectionError' },
      { id: 'evt_done', type: 'checkout.session.completed', receivedAt: NOW - 60 * MIN, processedAt: NOW - 59 * MIN },
    ]);
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual(['INC-0001']);
    expect(await rows()).toEqual([expect.objectContaining({ fingerprint: 'stripe:invoice.paid', severity: 'sev2' })]);
    // Two minutes on, the second is past 15 minutes too: one signal.
    expect((await evaluateIncidentRules(d, NOW + 2 * MIN)).signaled).toEqual(['INC-0001']);
    expect((await events()).map((e) => e.link)).toEqual(['/admin/api/webhooks?type=invoice.paid&n=1', '/admin/api/webhooks?type=invoice.paid&n=2']);
  });

  it('opens a sev3 when more than five GHL rows gave up, and not at five', async () => {
    const d = await db();
    const gaveUp = (userId: string, i: number) => ({ userId, firstLoginAt: NOW - 9000, ghlAttempts: MAX_ATTEMPTS, ghlError: 'contact:rejected:422', ghlLastAttemptAt: NOW - i * 1000 });
    const ids = SEED.users.slice(0, 6).map((u) => u.id);
    await d.insert(ghlLogins).values(ids.slice(0, 5).map(gaveUp));
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual([]);
    await d.insert(ghlLogins).values(gaveUp(ids[5]!, 5));
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual(['INC-0001']);
    expect(await rows()).toEqual([expect.objectContaining({ fingerprint: 'ghl:gave_up', severity: 'sev3', title: 'GHL sync gave up on 6 rows' })]);
  });

  it('opens a sev1 when 5xx pass 5% of at least 50 requests over 10 minutes', async () => {
    const d = await db();
    const m = (minute: number, count: number, e5: number) => ({ minute, route: 'GET /api/me', count, errors4xx: 0, errors5xx: e5, hist: {} });
    await d.insert(apiMetrics).values([m(NOW - 11 * MIN, 500, 500), m(NOW - 5 * MIN, 60, 3)]);
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual([]);
    await d.insert(apiMetrics).values(m(NOW - 4 * MIN, 40, 4));
    expect((await evaluateIncidentRules(d, NOW)).opened).toEqual(['INC-0001']);
    expect(await rows()).toEqual([expect.objectContaining({ fingerprint: 'api:5xx', severity: 'sev1' })]);
    expect((await events())[0]!.body).toBe('Opened automatically: 7.0% of 100 API requests answered 5xx over 10 minutes.');
  });

  it('skips only the rule whose source fails, and two evaluations at once open each incident once', async () => {
    const d = await db();
    const sources: IncidentSources = {
      ...DB_SOURCES,
      jobTicks: async () => {
        throw new Error('relation "job_ticks" does not exist');
      },
      stripeErrors: async () => [{ id: 'evt_1', type: 'invoice.paid', receivedAt: NOW - 20 * MIN }],
      ghl: async () => NO_SIGNALS.ghl,
    };
    const [a, b] = await Promise.all([evaluateIncidentRules(d, NOW, sources), evaluateIncidentRules(d, NOW, sources)]);
    expect([...a.opened, ...b.opened]).toEqual(['INC-0001']);
    expect(a.failed).toEqual(['jobTicks']);
    expect(await rows()).toHaveLength(1);
    expect(await events()).toHaveLength(1);
  });
});

describe('the scheduler’s one call (spec § 9: observe-only) @console', () => {
  it('opens from this tick’s evidence and answers exactly what the jobs answered, even when the rules fail', async () => {
    const d = await db();
    const failing = () => d.insert(jobTicks).values([1, 2, 3].map((i) => ({ job: 'ghl-orders', status: 'failed', startedAt: NOW - i * MIN - 1000, finishedAt: NOW - i * MIN, trigger: 'schedule' })));
    await failing();
    const lines: string[] = [];
    const log = { info: (_: unknown, msg: string) => void lines.push(msg), warn: () => {}, error: (_: unknown, msg: string) => void lines.push(`error: ${msg}`) };
    const scheduler = startScheduler({ intervalMs: 3_600_000, signals: [], log });
    let healthy;
    try {
      healthy = await scheduler.tick();
    } finally {
      await scheduler.stop();
    }
    expect(lines).toContain('incident rules');
    expect((await rows()).map((r) => r.fingerprint)).toEqual(['job:ghl-orders']);

    // The same tick on the same seed, with the incidents table gone: the rules fail, the tick does not.
    await resetDatabase(SEED);
    resetOutbox();
    await failing();
    await d.execute(sql`alter table incidents rename to incidents_away`);
    const broken = startScheduler({ intervalMs: 3_600_000, signals: [], log });
    try {
      const run = await broken.tick();
      expect(run).toEqual(healthy);
    } finally {
      await broken.stop();
      await d.execute(sql`alter table incidents_away rename to incidents`);
    }
    expect(lines).toContain('error: incident rules failed; the next tick retries');
    // And what the jobs did is what a direct run does.
    await resetDatabase(SEED);
    resetOutbox();
    expect(await runScheduledJobs({ log: quiet })).toEqual(healthy);
  });
});
