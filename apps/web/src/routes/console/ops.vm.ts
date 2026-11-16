// /admin/api[/:tab] and /admin/jobs on R2 (D-165, spec §§ 7.9-7.10): the words, stats and rows of the
// mockup's `Api()` and `Jobs()`. Pure; Api.tsx and Jobs.tsx only render it. Every figure is the API's
// (`api_metrics`, `stripe_events`, the CRM sync log, `job_ticks`): none is a sample (spec § 13), and a
// figure with no data reads "—".

import {
  DELIVERY_STATUS_LABELS,
  JOB_STATUS_LABELS,
  WEBHOOK_SOURCE_LABELS,
  adminDate,
  adminStamp,
  adminTime,
} from '@ai/core';
import type {
  AdminStatus,
  AdminTone,
  ApiEndpointRow,
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

export const NONE = '—';

// ================================================================================================
// API & Webhooks
// ================================================================================================

export const API_TABS = ['endpoints', 'hooks'] as const;
export type ApiTab = (typeof API_TABS)[number];
export const isApiTab = (v: string | undefined): v is ApiTab => (API_TABS as readonly string[]).includes(v ?? '');
export const apiTabPath = (t: ApiTab): string => (t === 'endpoints' ? '/admin/api' : `/admin/api/${t}`);

export const SOURCE_OPTIONS = ['All sources', 'Stripe', 'GoHighLevel', 'Zoom'] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

export const API_COPY = {
  title: 'API & Webhooks',
  description: 'Endpoint latency and error rates over the last 24 hours, and every webhook delivery in and out.',
  sections: 'Section',
  tabs: { endpoints: 'Endpoints', hooks: 'Webhook deliveries' } as Record<ApiTab, string>,
  stats: { p95: 'p95 latency', errorRate: 'Error rate', requests: 'Requests, 24h', failed: 'Failed deliveries' },
  endpoints: {
    endpoint: 'Endpoint',
    requests: 'Requests',
    p50: 'p50',
    p95: 'p95',
    errorRate: 'Error rate',
    empty: 'No requests in this window',
    stream: 'stream',
  },
  hooks: {
    source: 'Source',
    event: 'Event',
    status: 'Status',
    attempts: 'Attempts',
    next: 'Next attempt',
    error: 'Last error',
    empty: 'No webhook deliveries yet',
    foot: 'Payloads and signing secrets are not shown. Event IDs link a delivery to its order or user.',
    attemptsUsed: 'None, attempts used',
    zoom: 'Recording webhook is not live',
  },
  menu: {
    retry: 'Retry now…',
    related: 'Related incidents',
    stripe: 'View in Stripe',
    /** Why "Retry now…" is off on a Stripe row (D13: Stripe deliveries are view-only). */
    stripeViewOnly: 'Stripe deliveries are view-only. Stripe retries them itself.',
    incidentsLater: 'Incidents arrive with the Incidents screen.',
  },
  retry: {
    title: (event: string, id: string) => `Retry ${event} for ${id}?`,
    body: (source: string) => `Sends this ${source} delivery again now. Handlers are idempotent, so a repeat is safe.`,
    cta: 'Retry delivery',
    done: 'Retry queued',
  },
} as const;

/** A health word for a figure (the endpoint pills' thresholds: 2% Elevated, 5% High). */
export interface Health {
  label: string;
  tone: 'ok' | 'warn' | 'bad';
}

export const ERROR_RATE_ELEVATED = 2;
export const ERROR_RATE_HIGH = 5;
export const P95_ELEVATED_MS = 500;
export const P95_HIGH_MS = 1000;

const health = (v: number, elevated: number, high: number): Health =>
  v >= high ? { label: 'High', tone: 'bad' } : v >= elevated ? { label: 'Elevated', tone: 'warn' } : { label: 'Healthy', tone: 'ok' };

/** A latency, "N ms" with a thousands comma; "—" with none. */
export const msText = (v: number | null): string => (v === null ? NONE : `${v.toLocaleString('en-US')} ms`);
/** A percent, to one decimal place. */
export const pctText = (v: number): string => `${v.toFixed(1)}%`;

export interface StatVM {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn' | 'bad' | null;
  to?: string;
}

export function apiStatsVM(e: ApiEndpoints, w: ConsoleWebhooks | null): StatVM[] {
  const { p95Ms, errorRate, requests } = e.summary;
  const p95 = p95Ms === null ? null : health(p95Ms, P95_ELEVATED_MS, P95_HIGH_MS);
  const err = errorRate === null ? null : health(errorRate, ERROR_RATE_ELEVATED, ERROR_RATE_HIGH);
  const failed = w ? w.failed.ghl + w.failed.stripe : null;
  const parts = w ? [w.failed.ghl ? `${w.failed.ghl} GHL` : '', w.failed.stripe ? `${w.failed.stripe} Stripe` : ''].filter(Boolean) : [];
  return [
    { key: 'p95', label: API_COPY.stats.p95, value: msText(p95Ms), ...(p95 ? { sub: p95.label, tone: p95.tone } : {}) },
    { key: 'err', label: API_COPY.stats.errorRate, value: errorRate === null ? NONE : pctText(errorRate), ...(err ? { sub: err.label, tone: err.tone } : {}) },
    { key: 'req', label: API_COPY.stats.requests, value: requests.toLocaleString('en-US') },
    {
      key: 'failed',
      label: API_COPY.stats.failed,
      value: failed === null ? NONE : String(failed),
      ...(parts.length ? { sub: parts.join(', '), tone: 'bad' as const } : {}),
      to: apiTabPath('hooks'),
    },
  ];
}

export interface EndpointVM {
  key: string;
  route: string;
  requests: string;
  requestsN: number;
  p50: string;
  p95: string;
  errorRate: string;
  errorRateN: number;
  /** The pill after the rate: Elevated at 2%, High at 5%. */
  pill: { label: string; tone: 'warn' | 'bad' } | null;
}

export function endpointVM(r: ApiEndpointRow): EndpointVM {
  const h = health(r.errorRate, ERROR_RATE_ELEVATED, ERROR_RATE_HIGH);
  return {
    key: r.route,
    route: r.route,
    requests: r.requests.toLocaleString('en-US'),
    requestsN: r.requests,
    p50: r.stream ? API_COPY.endpoints.stream : msText(r.p50Ms),
    p95: r.stream ? API_COPY.endpoints.stream : msText(r.p95Ms),
    errorRate: pctText(r.errorRate),
    errorRateN: r.errorRate,
    pill: h.tone === 'ok' ? null : { label: h.label, tone: h.tone },
  };
}

/** The mockup's `TONE` for a delivery's status. */
const DELIVERY_TONE: Record<DeliveryStatus, AdminTone> = {
  delivered: 'ok',
  queued: 'info',
  retrying: 'run',
  failed: 'bad',
  not_configured: 'warn',
};

const HTTP_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/** GHL's `step:kind:status` as the mockup words it: "401 Unauthorized from GHL API". Never a body. */
export function ghlErrorText(e: string): string {
  const [, kind = 'error', status] = e.split(':');
  const code = Number(status);
  if (status && Number.isInteger(code)) return `${code} ${HTTP_TEXT[code] ?? 'error'} from GHL API`;
  return `GHL API ${kind.replace(/-/g, ' ')}`;
}

export interface DeliveryVM {
  key: string;
  source: WebhookSource;
  sourceLabel: string;
  event: string;
  /** The source, then the id: "GoHighLevel · {id}". */
  line: string;
  id: string | null;
  status: AdminStatus;
  attempts: string;
  next: string;
  error: string;
  /** "Retry now…" works: a GHL row failing or retrying (D13). */
  canRetry: boolean;
  retry: { kind: GhlRetryKind; id: string } | null;
  stripeUrl: string | null;
}

export function deliveryVM(d: WebhookDelivery, i: number): DeliveryVM {
  const sourceLabel = WEBHOOK_SOURCE_LABELS[d.source];
  const error =
    d.status === 'not_configured' && d.source === 'zoom'
      ? API_COPY.hooks.zoom
      : d.error === null
        ? NONE
        : d.source === 'ghl'
          ? ghlErrorText(d.error)
          : d.error;
  return {
    key: `${d.source}:${d.id ?? d.event}:${i}`,
    source: d.source,
    sourceLabel,
    event: d.event,
    line: sourceLabel + (d.id ? ` · ${d.id}` : ''),
    id: d.id,
    status: { label: DELIVERY_STATUS_LABELS[d.status], tone: DELIVERY_TONE[d.status] },
    attempts: d.attempts ? `${d.attempts.n} of ${d.attempts.of}` : NONE,
    next: d.nextAttemptAt !== null ? adminStamp(d.nextAttemptAt) : d.attemptsUsed ? API_COPY.hooks.attemptsUsed : NONE,
    error,
    canRetry: d.retry !== null && (d.status === 'failed' || d.status === 'retrying'),
    retry: d.retry,
    stripeUrl: d.stripeUrl,
  };
}

export const deliveriesFor = (rows: readonly DeliveryVM[], source: SourceOption): DeliveryVM[] =>
  source === 'All sources' ? [...rows] : rows.filter((r) => r.sourceLabel === source);

// ================================================================================================
// Scheduled Jobs
// ================================================================================================

export const JOBS_COPY = {
  title: 'Scheduled Jobs',
  description: 'Runs are keyed in job_runs, so running a job again skips anything it already sent. One scheduler holds the lock at a time.',
  columns: { job: 'Job', schedule: 'Schedule', result: 'Last result', last: 'Last run', duration: 'Duration', next: 'Next run' },
  empty: 'No jobs registered',
  foot: 'The billing job only runs on its schedule. It cannot be started by hand.',
  runNow: 'Run now…',
  off: (job: string) => `Run now is off for ${job}`,
  openIncident: 'Open incident',
  incidentsLater: 'Incidents arrive with the Incidents screen.',
  confirm: {
    title: (job: string) => `Run ${job} now?`,
    body: (schedule: string) => `Starts one extra run outside the schedule (${schedule.toLowerCase()}). Anything already sent is skipped.`,
    cta: (job: string) => `Run ${job}`,
  },
  started: (job: string) => `${job} started`,
} as const;

const JOB_TONE: Record<JobTickStatus, AdminTone> = { succeeded: 'ok', running: 'run', failed: 'bad', skipped: 'warn' };

/** Seconds to one place under 10, whole seconds under a minute, then "Nm SSs"; "—" with none. */
export function durationText(v: number | null): string {
  if (v === null) return NONE;
  const s = v / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  if (s < 60) return `${Math.round(s)} s`;
  const whole = Math.round(s);
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, '0')}s`;
}

/** The next run: its time alone when it is today (MST), else its day too. */
export const nextText = (t: number | null, now: number): string =>
  t === null ? NONE : adminDate(t) === adminDate(now) ? adminTime(t) : adminStamp(t);

export interface JobVM {
  key: string;
  job: string;
  note: string | null;
  schedule: string;
  status: AdminStatus | null;
  last: string;
  lastAt: number;
  duration: string;
  durationMs: number;
  next: string;
  nextAt: number;
  runNow: RunNowPolicy;
  failed: boolean;
}

export function jobVM(j: JobRow, now: number): JobVM {
  return {
    key: j.job,
    job: j.job,
    note: j.note,
    schedule: j.schedule,
    status: j.last ? { label: JOB_STATUS_LABELS[j.last.status], tone: JOB_TONE[j.last.status] } : null,
    last: j.last ? adminStamp(j.last.startedAt) : NONE,
    lastAt: j.last?.startedAt ?? 0,
    duration: durationText(j.durationMs),
    durationMs: j.durationMs ?? 0,
    next: nextText(j.nextRunAt, now),
    nextAt: j.nextRunAt ?? 0,
    runNow: j.runNow,
    failed: j.last?.status === 'failed',
  };
}

export const jobsVM = (j: ConsoleJobs, now: number): JobVM[] => j.rows.map((r) => jobVM(r, now));

/** The job shows Running from Run Now's confirm until the answer comes back (the mockup's `run`). */
export const runningVM = (v: JobVM): JobVM => ({ ...v, status: { label: JOB_STATUS_LABELS.running, tone: JOB_TONE.running } });
