// The Admin Console's fixture for API & Webhooks and Scheduled Jobs (D-165). FIXTURE ONLY: only
// `console-fixture.ts` imports this, and `console.ts` loads that behind `VITE_DATA_SOURCE`, so the http
// build has none of it (`console-build.test.ts`).
//
// The records are AdminRedesign.jsx's own (`parity-r2.ts`: `ENDPOINTS`, `HOOKS`, `JOBS`), turned into the
// API's shapes (`@ai/core` console-ops.ts) so the view-models print the mockup's words from what the API
// answers. A GHL error is stored as the API stores it (`contact:unauthorized:401`) and printed back as
// the mockup's "401 Unauthorized from GHL API". Run Now's policy is the code's (`RUN_NOW_JOBS`), not the
// mockup's menus: billing never, and the jobs D-165 keeps off, off.

import { API_WINDOW_MS, REMINDER_JOBS, isRunNowJob, stripeEventUrl } from '@ai/core';
import type {
  ApiEndpoints,
  ConsoleJobs,
  ConsoleWebhooks,
  DeliveryStatus,
  GhlRetryKind,
  JobRow,
  JobTickStatus,
  RunNowPolicy,
  WebhookDelivery,
  WebhookSource,
} from '@ai/core';
import { ENDPOINTS, ENDPOINT_STATS, HOOKS, JOBS, mockStamp } from './parity-r2';

const count = (s: string): number => Number(s.replace(/,/g, ''));
const ms = (s: string): number | null => (/ ms$/.test(s) ? count(s.slice(0, -3)) : null);

export function fixtureEndpoints(now: number): ApiEndpoints {
  const rows = ENDPOINTS.map((e) => ({
    route: e.p,
    requests: count(e.req),
    errorRate: e.er,
    p50Ms: ms(e.p50),
    p95Ms: ms(e.p95),
    ...(e.p50 === 'stream' ? { stream: true } : {}),
  }));
  return {
    windowMs: API_WINDOW_MS,
    asOf: now,
    summary: { requests: rows.reduce((n, r) => n + r.requests, 0), errorRate: ENDPOINT_STATS.errorRate, p95Ms: ms(ENDPOINT_STATS.p95) },
    rows,
  };
}

const SOURCE: Record<string, WebhookSource> = { GoHighLevel: 'ghl', Stripe: 'stripe', Zoom: 'zoom' };
const STATUS: Record<string, DeliveryStatus> = {
  Delivered: 'delivered',
  Queued: 'queued',
  Retrying: 'retrying',
  Failed: 'failed',
  'Not configured': 'not_configured',
};

/** The mockup's GHL sentence as the API's `step:kind:status`. */
const ghlError = (s: string): string | null => {
  const m = /^(\d{3}) /.exec(s);
  return m ? `contact:${m[1] === '401' ? 'unauthorized' : 'rejected'}:${m[1]}` : null;
};

export function fixtureWebhookRows(): WebhookDelivery[] {
  return HOOKS.map((h) => {
    const source = SOURCE[h.src]!;
    const status = STATUS[h.st]!;
    const id = h.id === '—' ? null : h.id;
    const att = /^(\d+) of (\d+)$/.exec(h.att);
    const open = status === 'failed' || status === 'retrying';
    return {
      source,
      event: h.ev,
      id,
      status,
      attempts: att ? { n: Number(att[1]), of: Number(att[2]) } : null,
      nextAttemptAt: /^[A-Z][a-z]{2} \d/.test(h.next) ? mockStamp(h.next) : null,
      attemptsUsed: h.next === 'None, attempts used',
      error: source === 'zoom' || h.err === '—' ? null : source === 'ghl' ? ghlError(h.err) : h.err,
      at: null,
      retry: source === 'ghl' && open && id ? { kind: h.ev.split('.')[0] as GhlRetryKind, id } : null,
      stripeUrl: source === 'stripe' && id ? stripeEventUrl(id, 'test') : null,
    };
  });
}

export const fixtureWebhooks = (rows: readonly WebhookDelivery[]): ConsoleWebhooks => {
  const failing = (s: WebhookSource) => rows.filter((r) => r.source === s && (r.status === 'failed' || r.status === 'retrying')).length;
  return { rows: [...rows], failed: { ghl: failing('ghl'), stripe: failing('stripe') } };
};

const TICK: Record<string, JobTickStatus> = { Succeeded: 'succeeded', Running: 'running', Failed: 'failed', Waiting: 'skipped' };

/** "0.4 s", "48 s" as ms. */
const seconds = (s: string): number => Math.round(Number(s.replace(/ s$/, '')) * 1000);

/** "9:25 AM" (the mockup's today, Dec 10) or "Dec 14, 7:00 AM". */
const when = (s: string): number => mockStamp(/^\d/.test(s) ? `Dec 10, ${s}` : s);

const policy = (job: string): RunNowPolicy => (job === 'billing' ? 'schedule_only' : isRunNowJob(job) ? 'allowed' : 'off');

export function fixtureJobRows(): JobRow[] {
  return JOBS.map((j) => ({
    job: j.j,
    schedule: j.sch,
    note: null,
    last: { status: TICK[j.st]!, startedAt: mockStamp(j.last), trigger: 'schedule' as const },
    durationMs: seconds(j.dur),
    nextRunAt: when(j.next),
    runNow: policy(j.j),
  }));
}

export const fixtureJobs = (rows: readonly JobRow[], now: number): ConsoleJobs => ({ rows: [...rows], asOf: now });

/** Run Now in the fixture: the scheduler's one tick ran, so all six of its jobs show it (as the API does). */
export const fixtureRunJob = (rows: readonly JobRow[], now: number): JobRow[] =>
  rows.map((r) => ((REMINDER_JOBS as readonly string[]).includes(r.job) ? { ...r, last: { status: 'succeeded', startedAt: now, trigger: 'manual' } } : r));
