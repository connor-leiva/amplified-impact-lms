// The Admin Console, PR 6 (D-165, spec §§ 7.9-7.10): API & Webhooks and Scheduled Jobs. Pure, like the
// rest of @ai/core: the API answers in these shapes (`apps/api/src/console/ops.ts`) and the R2 screens'
// view-models (`routes/console/ops.vm.ts`) turn them into the mockup's words.
//
// WHERE THE NUMBERS COME FROM (spec § 13: never sample numbers). Latencies, request counts and error
// rates are `api_metrics` (an observe-only `onResponse` hook, one row per minute and route template).
// Webhook deliveries are `stripe_events` (view-only, D13) and the CRM sync log (`crmSyncReport()`).
// Job results are `job_ticks` (an observe-only wrapper around the scheduler's tick), and schedules are
// the loops' own intervals (`JOB_SCHEDULES` in the API).

export const OPS_PATHS = {
  apiEndpoints: '/api/console/api/endpoints',
  webhooks: '/api/console/webhooks',
  ghlRetry: '/api/console/webhooks/ghl/retry',
  jobs: '/api/console/jobs',
  jobRun: '/api/console/jobs/:job/run',
} as const;

export const jobRunPath = (job: string): string => `/api/console/jobs/${encodeURIComponent(job)}/run`;

// ================================================================================================
// API metrics (spec § 7.9)
// ================================================================================================

/** A latency histogram's upper bounds, in ms (spec: "buckets 10…5000,+inf"). */
export const API_METRIC_BOUNDS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const;
export const API_METRIC_INF = '+inf';
/** One minute's samples per bucket (not cumulative), keyed by bound: `{ "10": 3, "+inf": 0 }`. */
export type ApiHist = Record<string, number>;

/** The bucket a latency falls in: the first bound at or above it. */
export function bucketOf(ms: number): string {
  for (const b of API_METRIC_BOUNDS) if (ms <= b) return String(b);
  return API_METRIC_INF;
}

/** Two histograms added together. */
export function addHist(a: ApiHist, b: ApiHist): ApiHist {
  const out: ApiHist = { ...a };
  for (const [k, n] of Object.entries(b)) out[k] = (out[k] ?? 0) + n;
  return out;
}

/**
 * The q-quantile of a histogram, by linear interpolation inside its bucket (as Prometheus's
 * `histogram_quantile` does), rounded to a whole ms; the +inf bucket answers its lower bound. Null
 * with no samples.
 */
export function histQuantile(hist: ApiHist, q: number): number | null {
  const bounds: [string, number, number][] = [];
  let lower = 0;
  for (const b of API_METRIC_BOUNDS) {
    bounds.push([String(b), lower, b]);
    lower = b;
  }
  bounds.push([API_METRIC_INF, lower, lower]);
  const total = bounds.reduce((n, [k]) => n + (hist[k] ?? 0), 0);
  if (total <= 0) return null;
  const rank = q * total;
  let seen = 0;
  for (const [k, lo, hi] of bounds) {
    const n = hist[k] ?? 0;
    if (n > 0 && seen + n >= rank) return Math.round(lo + (hi - lo) * ((rank - seen) / n));
    seen += n;
  }
  return lower;
}

/** The window the API & Webhooks screen reads: the last 24 hours. */
export const API_WINDOW_MS = 24 * 3600_000;
/** D6: API metrics are kept 30 days, job ticks 90. */
export const API_METRICS_RETENTION_MS = 30 * 24 * 3600_000;
export const JOB_TICKS_RETENTION_MS = 90 * 24 * 3600_000;

/** One route template's last 24 hours. `errorRate` is 5xx answers as a percent of requests. */
export interface ApiEndpointRow {
  /** `GET /api/snapshot`: the method and the route as registered, never a raw URL. */
  route: string;
  requests: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  /** An event stream: its latency is the connection's life, so it reads "stream". */
  stream?: boolean;
}

export interface ApiEndpoints {
  windowMs: number;
  /** The last flush the numbers include. */
  asOf: number;
  summary: { requests: number; errorRate: number | null; p95Ms: number | null };
  /** Most requests first. */
  rows: ApiEndpointRow[];
}

// ================================================================================================
// Webhook deliveries (spec § 7.9, D13)
// ================================================================================================

export type WebhookSource = 'ghl' | 'stripe' | 'zoom';
export const WEBHOOK_SOURCE_LABELS: Readonly<Record<WebhookSource, string>> = {
  ghl: 'GoHighLevel',
  stripe: 'Stripe',
  zoom: 'Zoom',
};

export type DeliveryStatus = 'delivered' | 'queued' | 'retrying' | 'failed' | 'not_configured';
export const DELIVERY_STATUS_LABELS: Readonly<Record<DeliveryStatus, string>> = {
  delivered: 'Delivered',
  queued: 'Queued',
  retrying: 'Retrying',
  failed: 'Failed',
  not_configured: 'Not configured',
};

/** A CRM sync row's kind, as the CRM sync log names it (`routes/crm-sync.ts`). */
export type GhlRetryKind = 'waitlist' | 'order' | 'login';
export const GHL_RETRY_KINDS: readonly GhlRetryKind[] = ['waitlist', 'order', 'login'];
export const isGhlRetryKind = (v: unknown): v is GhlRetryKind => typeof v === 'string' && (GHL_RETRY_KINDS as readonly string[]).includes(v);

export interface WebhookDelivery {
  source: WebhookSource;
  /** `order.sync`, `invoice.paid`, `recording.completed`. */
  event: string;
  /** The order, user or Stripe event it is about; null when there is none. */
  id: string | null;
  status: DeliveryStatus;
  /** Attempts made of those allowed; null where the sender keeps count (Stripe). */
  attempts: { n: number; of: number } | null;
  nextAttemptAt: number | null;
  /** A failure with no attempts left: "None, attempts used". */
  attemptsUsed: boolean;
  /** A short, safe reason: GHL's `step:kind:status`, a Stripe error code. Never a body. */
  error: string | null;
  /** When it last happened, for the order. */
  at: number | null;
  /** A GHL row a retry can reset (D13: the CRM sync's own reset). */
  retry: { kind: GhlRetryKind; id: string } | null;
  /** The event in the Stripe Dashboard (D13: Stripe is view-only). */
  stripeUrl: string | null;
}

export interface ConsoleWebhooks {
  rows: WebhookDelivery[];
  /** Deliveries failing or retrying, by source, beyond the rows listed. */
  failed: { ghl: number; stripe: number };
}

/** The Stripe Dashboard's page for an event, in the key's mode (D13). */
export const stripeEventUrl = (id: string, mode: 'live' | 'test'): string =>
  `https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}events/${encodeURIComponent(id)}`;

// ================================================================================================
// Scheduled jobs (spec § 7.10, D14)
// ================================================================================================

export type JobTickStatus = 'running' | 'succeeded' | 'failed' | 'skipped';
export const JOB_TICK_STATUSES: readonly JobTickStatus[] = ['running', 'succeeded', 'failed', 'skipped'];
export type JobTrigger = 'schedule' | 'manual';

/**
 * A tick's status in the mockup's words. `skipped` (the lock was another runner's, so this one did
 * nothing) reads "Waiting", the mockup's word for a job that did not get its turn.
 */
export const JOB_STATUS_LABELS: Readonly<Record<JobTickStatus, string>> = {
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  skipped: 'Waiting',
};

/**
 * What Run Now may do with a job (D14): `allowed`, `schedule_only` (billing, the D-154 reconcile:
 * never by hand), or `off` (on D14's list, but kept off for the reason D-165 records).
 */
export type RunNowPolicy = 'allowed' | 'schedule_only' | 'off';

/** The scheduler's six jobs (`JOB_NAMES`), which one tick runs together. */
export const REMINDER_JOBS = ['session-24h', 'session-1h', 'replay-ready', 'build-48h', 'weekly-digest', 'announcement'] as const;

/** Run Now's allowlist (D14, D-165). Nothing else is runnable by hand. */
export const RUN_NOW_JOBS: readonly string[] = REMINDER_JOBS;
export const isRunNowJob = (job: string): boolean => RUN_NOW_JOBS.includes(job);

/** Spec § 7.10's words for the billing row. */
export const BILLING_JOB_NOTE = 'Runs on schedule only · keeps the AI Accelerator seat cap in sync with Stripe';

export interface JobRow {
  job: string;
  /** "Every minute", from the loop's own interval. */
  schedule: string;
  /** A line under the job's name (the billing row's). */
  note: string | null;
  /** The latest tick, scheduled or manual. */
  last: { status: JobTickStatus; startedAt: number; trigger: JobTrigger } | null;
  /** The latest finished tick's duration. */
  durationMs: number | null;
  /** The latest scheduled tick plus the interval. */
  nextRunAt: number | null;
  runNow: RunNowPolicy;
}

export interface ConsoleJobs {
  rows: JobRow[];
  asOf: number;
}

/** What Run Now answers: the manual tick it recorded. */
export interface JobRunResult {
  job: string;
  status: JobTickStatus;
  startedAt: number;
  finishedAt: number | null;
}

/** An interval as the Schedule column says it: "Every minute", "Every 5 min", "Hourly". */
export function scheduleLabel(intervalMs: number): string {
  const min = Math.round(intervalMs / 60_000);
  if (min <= 1) return 'Every minute';
  if (min === 60) return 'Hourly';
  return `Every ${min} min`;
}
