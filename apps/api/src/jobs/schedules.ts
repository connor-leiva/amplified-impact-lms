// Every scheduled job the Console's Scheduled Jobs screen lists (D-165, spec § 7.10, D14), from code:
// each loop's own interval, the `job_ticks` name its runs are recorded under, and what Run Now may do.
//
//   - The six `JOB_NAMES` jobs: one scheduler tick runs all six (`dueWork`), every `TICK_MS`, so each
//     reads the `scheduler` tick. Run Now: allowed (D14). A manual run IS `runScheduledJobs()`, the
//     scheduler's own tick under its own lock, so it sends only what a scheduled tick at that moment
//     would, minus everything `job_runs` already holds.
//   - `billing`: held invites and the D-154 seat-cap reconcile, every `BILLING_TICK_MS`. Never by hand
//     (D14), and its row says so.
//   - The four GHL jobs (`ghl-sync` the waitlist, `ghl-orders` the buyers, `ghl-logins` first sign-ins,
//     `ghl-extras` the fields and opportunity inside each row's sync), one loop every `GHL_TICK_MS`.
//     Run Now: off. Each writes to the location in `GHL_LOCATION_ID`, which D-134 records as Spring's
//     until Connor moves it (D-135), and a Run Now must never write there (spec § 1, D-165).
//
// There is no `accelerator-reminders` job: the AI Accelerator's reminders are the six jobs above, sent
// only to the learners whose plan opens the course (D-110), keyed in `job_runs` under those six names.

import { BILLING_JOB_NOTE, isRunNowJob } from '@ai/core';
import type { RunNowPolicy } from '@ai/core';
import { BILLING_TICK_MS } from './billing';
import { GHL_TICK_MS } from './ghl-sync';
import { JOB_NAMES } from './keys';
import { TICK_MS } from './scheduler';
import { SCHEDULER_TICK_JOB } from './ticks';

export interface JobSchedule {
  job: string;
  /** The `job_ticks.job` its runs are recorded under. */
  tickJob: string;
  intervalMs: number;
  runNow: RunNowPolicy;
  note: string | null;
}

export const GHL_JOBS = ['ghl-sync', 'ghl-logins', 'ghl-orders', 'ghl-extras', 'ghl-welcome'] as const;

export const JOB_SCHEDULES: readonly JobSchedule[] = [
  ...JOB_NAMES.map(
    (job): JobSchedule => ({ job, tickJob: SCHEDULER_TICK_JOB, intervalMs: TICK_MS, runNow: isRunNowJob(job) ? 'allowed' : 'off', note: null }),
  ),
  { job: 'billing', tickJob: 'billing', intervalMs: BILLING_TICK_MS, runNow: 'schedule_only', note: BILLING_JOB_NOTE },
  {
    job: 'cohort-welcome',
    tickJob: 'billing',
    intervalMs: BILLING_TICK_MS,
    runNow: 'schedule_only',
    note: 'Runs on the billing loop. Off until Send the cohort welcome email is on. Never emails anyone enrolled before it was turned on.',
  },
  ...GHL_JOBS.map((job): JobSchedule => ({ job, tickJob: job, intervalMs: GHL_TICK_MS, runNow: 'off', note: null })),
];

export const jobSchedule = (job: string): JobSchedule | undefined => JOB_SCHEDULES.find((s) => s.job === job);
