// API & Webhooks and Scheduled Jobs' view-models (D-165): the mockup's words from the API's shapes, and
// "—" for anything with no data (spec § 13: never a sample number).
import { describe, expect, it } from 'vitest';
import { BILLING_JOB_NOTE } from '@ai/core';
import type { ApiEndpoints, ConsoleWebhooks, JobRow, WebhookDelivery } from '@ai/core';
import { fixtureEndpoints, fixtureJobRows, fixtureWebhookRows, fixtureWebhooks } from '../../data/console-fixture-ops';
import { ENDPOINTS, HOOKS, JOBS, mockCt } from '../../data/parity-r2';
import {
  API_COPY,
  JOBS_COPY,
  apiStatsVM,
  apiTabPath,
  deliveriesFor,
  deliveryVM,
  durationText,
  endpointVM,
  ghlErrorText,
  isApiTab,
  jobVM,
  jobsVM,
  nextText,
  runningVM,
} from './ops.vm';

const NOW = Date.parse('2026-12-10T16:30:00Z');

describe('API & Webhooks (D-165)', () => {
  it('prints the mockup’s stats, endpoints and deliveries from the fixture’s API shapes', () => {
    const e = fixtureEndpoints(NOW);
    const w = fixtureWebhooks(fixtureWebhookRows());
    expect(apiStatsVM(e, w).map((s) => [s.label, s.value, s.sub ?? null, s.tone ?? null])).toEqual([
      ['p95 latency', '212 ms', 'Healthy', 'ok'],
      ['Error rate', '0.4%', 'Healthy', 'ok'],
      ['Requests, 24h', '76,320', null, null],
      ['Failed deliveries', '4', '3 GHL, 1 Stripe', 'bad'],
    ]);
    expect(
      e.rows.map(endpointVM).map((r) => [r.route, r.requests, r.p50, r.p95, r.errorRate, r.pill?.label ?? null]),
    ).toEqual(
      ENDPOINTS.map((x) => [
        x.p,
        x.req,
        x.p50,
        x.p95,
        `${x.er.toFixed(1)}%`,
        x.er >= 5 ? 'High' : x.er >= 2 ? 'Elevated' : null,
      ]),
    );
    expect(w.rows.map(deliveryVM).map((d) => [d.event, d.line, d.status.label, d.attempts, d.next, d.error])).toEqual(
      HOOKS.map((h) => [h.ev, h.src + (h.id !== '—' ? ` · ${h.id}` : ''), h.st, h.att, mockCt(h.next), h.err]),
    );
  });

  it('reads "—" with no data, and no tone or failure line with nothing failing', () => {
    const empty: ApiEndpoints = {
      windowMs: 1,
      asOf: NOW,
      summary: { requests: 0, errorRate: null, p95Ms: null },
      rows: [],
    };
    const none: ConsoleWebhooks = { rows: [], failed: { ghl: 0, stripe: 0 } };
    expect(apiStatsVM(empty, none).map((s) => [s.value, s.sub ?? null])).toEqual([
      ['—', null],
      ['—', null],
      ['0', null],
      ['0', null],
    ]);
    expect(apiStatsVM(empty, null)[3]!.value).toBe('—');
  });

  it('words health at the pills’ thresholds, for the error rate and p95', () => {
    const at = (p95Ms: number, errorRate: number) =>
      apiStatsVM({ windowMs: 1, asOf: NOW, summary: { requests: 10, errorRate, p95Ms }, rows: [] }, null)
        .slice(0, 2)
        .map((s) => s.sub);
    expect(at(499, 1.9)).toEqual(['Healthy', 'Healthy']);
    expect(at(500, 2)).toEqual(['Elevated', 'Elevated']);
    expect(at(1000, 5)).toEqual(['High', 'High']);
  });

  it('words a GHL error as the mockup does, never a body', () => {
    expect(ghlErrorText('contact:unauthorized:401')).toBe('401 Unauthorized from GHL API');
    expect(ghlErrorText('fields:rejected:422')).toBe('422 Unprocessable Entity from GHL API');
    expect(ghlErrorText('upsert:timeout')).toBe('GHL API timeout');
    expect(ghlErrorText('upsert:rate-limited')).toBe('GHL API rate limited');
  });

  it('retries a GHL row failing or retrying, never a Stripe one (D13), and filters by source', () => {
    const rows = fixtureWebhookRows().map(deliveryVM);
    expect(rows.filter((r) => r.canRetry).map((r) => r.id)).toEqual(['ord_2291', 'ord_2288', 'u_1077']);
    expect(rows.find((r) => r.source === 'stripe' && r.status.label === 'Failed')).toMatchObject({
      canRetry: false,
      stripeUrl: 'https://dashboard.stripe.com/test/events/evt_1QxN1hHm79',
    });
    expect(deliveriesFor(rows, 'Stripe').map((r) => r.sourceLabel)).toEqual(['Stripe', 'Stripe', 'Stripe']);
    expect(deliveriesFor(rows, 'All sources')).toHaveLength(7);
    const synced: WebhookDelivery = {
      source: 'ghl',
      event: 'order.sync',
      id: 'o1',
      status: 'delivered',
      attempts: { n: 1, of: 8 },
      nextAttemptAt: null,
      attemptsUsed: false,
      error: null,
      at: NOW,
      retry: null,
      stripeUrl: null,
    };
    expect(deliveryVM(synced, 0)).toMatchObject({ next: '—', error: '—', canRetry: false, attempts: '1 of 8' });
    expect(
      deliveryVM(
        {
          ...synced,
          status: 'failed',
          attempts: { n: 8, of: 8 },
          attemptsUsed: true,
          error: 'contact:unauthorized:401',
          retry: { kind: 'order', id: 'o1' },
        },
        0,
      ),
    ).toMatchObject({
      next: 'None, attempts used',
      canRetry: true,
    });
    expect(API_COPY.retry.title('order.sync', 'ord_2291')).toBe('Retry order.sync for ord_2291?');
    expect(API_COPY.retry.body('GoHighLevel')).toBe(
      'Sends this GoHighLevel delivery again now. Handlers are idempotent, so a repeat is safe.',
    );
  });

  it('gives the deliveries tab its own address', () => {
    expect(apiTabPath('endpoints')).toBe('/admin/api');
    expect(apiTabPath('hooks')).toBe('/admin/api/hooks');
    expect(isApiTab('hooks')).toBe(true);
    expect(isApiTab('nope')).toBe(false);
  });
});

describe('Scheduled Jobs (D-165)', () => {
  it('prints the mockup’s rows from the fixture’s API shapes', () => {
    expect(
      jobsVM({ rows: fixtureJobRows(), asOf: NOW }, NOW).map((j) => [
        j.job,
        j.schedule,
        j.status?.label,
        j.last,
        j.duration,
        j.next,
      ]),
    ).toEqual(JOBS.map((j) => [j.j, j.sch, j.st, mockCt(j.last), j.dur, mockCt(j.next)]));
  });

  it('offers Run Now to the allowlist only: billing says it is off, as do the jobs D-165 keeps off', () => {
    const byJob = Object.fromEntries(fixtureJobRows().map((r) => [r.job, r.runNow]));
    expect(byJob).toMatchObject({
      'session-24h': 'allowed',
      announcement: 'allowed',
      billing: 'schedule_only',
      'accelerator-reminders': 'off',
      'ghl-sync': 'off',
      'ghl-extras': 'off',
    });
    expect(JOBS_COPY.off('billing')).toBe('Run now is off for billing');
    expect(JOBS_COPY.confirm.title('session-24h')).toBe('Run session-24h now?');
    expect(JOBS_COPY.confirm.body('Every 5 min')).toBe(
      'Starts one extra run outside the schedule (every 5 min). Anything already sent is skipped.',
    );
    expect(JOBS_COPY.confirm.cta('session-24h')).toBe('Run session-24h');
    expect(JOBS_COPY.started('session-24h')).toBe('session-24h started');
  });

  it('reads a job that never ran as "—", and carries the billing row’s note', () => {
    const never: JobRow = {
      job: 'billing',
      schedule: 'Every minute',
      note: BILLING_JOB_NOTE,
      last: null,
      durationMs: null,
      nextRunAt: null,
      runNow: 'schedule_only',
    };
    expect(jobVM(never, NOW)).toMatchObject({
      status: null,
      last: '—',
      duration: '—',
      next: '—',
      note: BILLING_JOB_NOTE,
      failed: false,
    });
    expect(runningVM(jobVM(never, NOW)).status).toEqual({ label: 'Running', tone: 'run' });
  });

  it('says durations and the next run as the mockup does', () => {
    expect([0, 400, 3800, 9999, 48_000, 59_400, 108_000, 123_000].map(durationText)).toEqual([
      '0.0 s',
      '0.4 s',
      '3.8 s',
      '10.0 s',
      '48 s',
      '59 s',
      '1m 48s',
      '2m 03s',
    ]);
    expect(nextText(Date.parse('2026-12-10T16:25:00Z'), NOW)).toBe('9:25 AM MT / 10:25 AM CT');
    expect(nextText(Date.parse('2026-12-14T14:00:00Z'), NOW)).toBe('Dec 14, 7:00 AM MT / 8:00 AM CT');
    expect(nextText(null, NOW)).toBe('—');
  });
});
