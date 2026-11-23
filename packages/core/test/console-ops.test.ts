// @ai/core/console-ops (D-165): the histogram's buckets and quantiles, the schedule words, the
// Stripe Dashboard link and Run Now's allowlist.
import { describe, expect, it } from 'vitest';
import {
  API_METRIC_BOUNDS,
  BILLING_JOB_NOTE,
  CONSOLE_ERRORS,
  JOB_STATUS_LABELS,
  OPS_PATHS,
  RUN_NOW_JOBS,
  addHist,
  bucketOf,
  histQuantile,
  isGhlRetryKind,
  isRunNowJob,
  jobRunPath,
  scheduleLabel,
  stripeEventUrl,
} from '../src';

describe('the latency histogram (D-165)', () => {
  it('buckets by the first bound at or above, then +inf', () => {
    expect(API_METRIC_BOUNDS).toEqual([10, 25, 50, 100, 250, 500, 1000, 2500, 5000]);
    expect([0, 10, 10.4, 25, 26, 4999, 5000, 5001, 60_000].map(bucketOf)).toEqual(['10', '10', '25', '25', '50', '5000', '5000', '+inf', '+inf']);
  });

  it('interpolates a quantile inside its bucket, and answers null with no samples', () => {
    expect(histQuantile({}, 0.5)).toBeNull();
    expect(histQuantile({ '10': 0 }, 0.5)).toBeNull();
    expect(histQuantile({ '50': 10 }, 0.5)).toBe(38);
    expect(histQuantile({ '25': 40, '50': 50, '250': 10 }, 0.5)).toBe(30);
    expect(histQuantile({ '25': 40, '50': 50, '250': 10 }, 0.95)).toBe(175);
    // The +inf bucket has no upper bound: its lower one.
    expect(histQuantile({ '+inf': 4 }, 0.95)).toBe(5000);
  });

  it('adds histograms bucket by bucket', () => {
    expect(addHist({ '10': 1, '50': 2 }, { '50': 3, '+inf': 1 })).toEqual({ '10': 1, '50': 5, '+inf': 1 });
  });
});

describe('scheduled jobs (D-165, D14)', () => {
  it('says an interval as the Schedule column does', () => {
    expect(scheduleLabel(60_000)).toBe('Every minute');
    expect(scheduleLabel(5 * 60_000)).toBe('Every 5 min');
    expect(scheduleLabel(3600_000)).toBe('Hourly');
  });

  it('runs only the scheduler’s six by hand, never billing or the GHL loops', () => {
    expect(RUN_NOW_JOBS).toEqual(['session-24h', 'session-1h', 'replay-ready', 'build-48h', 'weekly-digest', 'announcement']);
    for (const job of ['billing', 'accelerator-reminders', 'ghl-sync', 'ghl-logins', 'ghl-orders', 'ghl-extras', '']) expect(isRunNowJob(job), job).toBe(false);
    expect(BILLING_JOB_NOTE).toBe('Runs on schedule only · keeps the AI Accelerator seat cap in sync with Stripe');
    expect(JOB_STATUS_LABELS).toEqual({ running: 'Running', succeeded: 'Succeeded', failed: 'Failed', skipped: 'Waiting' });
    expect(jobRunPath('session-24h')).toBe('/api/console/jobs/session-24h/run');
    expect(OPS_PATHS.jobRun).toBe('/api/console/jobs/:job/run');
    expect(CONSOLE_ERRORS.job_not_runnable).toEqual({ status: 403, message: 'This job only runs on its schedule. It cannot be started by hand.' });
    expect(CONSOLE_ERRORS.scheduler_busy.status).toBe(409);
  });
});

describe('webhooks (D-165, D13)', () => {
  it('links a Stripe event in the key’s mode', () => {
    expect(stripeEventUrl('evt_1', 'live')).toBe('https://dashboard.stripe.com/events/evt_1');
    expect(stripeEventUrl('evt_1', 'test')).toBe('https://dashboard.stripe.com/test/events/evt_1');
  });

  it('retries the CRM sync log’s three kinds only', () => {
    expect(['waitlist', 'order', 'login', 'skill'].every(isGhlRetryKind)).toBe(true);
    expect([undefined, 'invoice', 'Order', 1].some(isGhlRetryKind)).toBe(false);
  });
});
