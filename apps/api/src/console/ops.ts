// The Admin Console, PR 6 (D-165, spec §§ 7.9-7.10): API & Webhooks and Scheduled Jobs. Registered by
// `registerConsoleRoutes` in its own scope, so its `private, no-store` hook and the masquerade pause (D2)
// cover every answer here.
//
//   GET  /api/console/api/endpoints       the last 24 hours of `api_metrics`, by route template. api.read
//   GET  /api/console/webhooks            deliveries: GHL (the CRM sync log, `crmSyncReport()`), Stripe
//                                         (`stripe_events`, view-only with its Dashboard link, D13) and
//                                         Zoom ("not configured": there is no Zoom webhook route). api.read
//   POST /api/console/webhooks/ghl/retry  { kind, id }: the CRM sync's own reset (`resetCrmSyncRow`).
//                                         webhooks.retry (Owner, Admin); audited
//   GET  /api/console/jobs                every scheduled job (`JOB_SCHEDULES`) and its latest tick. jobs.read
//   POST /api/console/jobs/:job/run       Run Now, the allowlist only (D14, `RUN_NOW_JOBS`): one
//                                         `runScheduledJobs()` under the scheduler's own lock 4242. Not on
//                                         the list: 403 `job_not_runnable`; the lock held: 409
//                                         `scheduler_busy`. jobs.run_now (Owner, Admin); audited
//
// Every write is one audit row, refusals included (`webhook.ghl_retry`, `job.run_now`). Limits per
// session: reads 60 a minute, writes 20. No GET here writes anything but the guard's row for a staff
// member a capability refuses.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { API_WINDOW_MS, OPS_PATHS, addHist, histQuantile, isGhlRetryKind, isRunNowJob, scheduleLabel, stripeEventUrl } from '@ai/core';
import type {
  ApiEndpointRow,
  ApiEndpoints,
  ApiHist,
  ConsoleJobs,
  ConsoleWebhooks,
  DeliveryStatus,
  JobRow,
  JobRunResult,
  JobTickStatus,
  JobTrigger,
  WebhookDelivery,
} from '@ai/core';
import { queueMailTask, requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { keyMode, readOfferConfig } from '../billing/config';
import { getDb } from '../db/client';
import { apiMetrics, jobTicks, stripeEvents } from '../db/schema';
import { MAX_ATTEMPTS } from '../jobs/ghl-sync';
import { runScheduledJobs } from '../jobs/scheduler';
import type { SchedulerLog } from '../jobs/scheduler';
import { JOB_SCHEDULES, jobSchedule } from '../jobs/schedules';
import { SCHEDULER_TICK_JOB, errorKindOf, finishTick, startTick } from '../jobs/ticks';
import { clock } from '../lib/clock';
import { crmSyncReport, resetCrmSyncRow } from '../routes/crm-sync';
import type { CrmRow, CrmState } from '../routes/crm-sync';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';

/** Spring's GHL location (spec § 1, D-134): the Console never queues a write there. */
export const SPRING_GHL_LOCATION = '4l4e5c7LuLR87EdUv2QK';

/** Whether GHL writes go to Spring's location right now. A boolean; the id itself never leaves. */
export const ghlPointsAtSpring = (env: NodeJS.ProcessEnv = process.env): boolean => (env.GHL_LOCATION_ID ?? '').trim() === SPRING_GHL_LOCATION;

/** No Zoom webhook route exists (spec § 7.9: "not configured unless a route exists"). */
export const ZOOM_WEBHOOK_ROUTE: string | null = null;

const STRIPE_ROWS = 50;
const TICKS_READ = 20;
const ID = /^[A-Za-z0-9_.:@-]{1,128}$/;

export interface OpsDeps {
  /** The Stripe key's mode, for the Dashboard links. Left out, read from the key. */
  stripeMode?: ReturnType<typeof keyMode>;
}

// --- API endpoints ---------------------------------------------------------------------------------

const n = (v: unknown): number => Number(v ?? 0);

export async function readEndpoints(now: number): Promise<ApiEndpoints> {
  const since = now - API_WINDOW_MS;
  const db = getDb();
  const totals = await db
    .select({
      route: apiMetrics.route,
      count: sql<string>`sum(${apiMetrics.count})`,
      e5: sql<string>`sum(${apiMetrics.errors5xx})`,
    })
    .from(apiMetrics)
    .where(gte(apiMetrics.minute, since))
    .groupBy(apiMetrics.route);
  const buckets = (await db.execute(sql`
    select m.route, h.key as bucket, sum(h.value::bigint) as n
      from ${apiMetrics} m cross join lateral jsonb_each_text(m.hist) h
     where m.minute >= ${since}
     group by m.route, h.key`)) as unknown as { route: string; bucket: string; n: string }[];
  const hists = new Map<string, ApiHist>();
  for (const b of buckets) hists.set(b.route, { ...(hists.get(b.route) ?? {}), [b.bucket]: n(b.n) });

  let all: ApiHist = {};
  let requests = 0;
  let errors = 0;
  const rows: ApiEndpointRow[] = totals.map((t) => {
    const hist = hists.get(t.route) ?? {};
    const count = n(t.count);
    const e5 = n(t.e5);
    all = addHist(all, hist);
    requests += count;
    errors += e5;
    return { route: t.route, requests: count, errorRate: count > 0 ? (100 * e5) / count : 0, p50Ms: histQuantile(hist, 0.5), p95Ms: histQuantile(hist, 0.95) };
  });
  rows.sort((a, b) => b.requests - a.requests || (a.route < b.route ? -1 : 1));
  return {
    windowMs: API_WINDOW_MS,
    asOf: now,
    summary: { requests, errorRate: requests > 0 ? (100 * errors) / requests : null, p95Ms: histQuantile(all, 0.95) },
    rows,
  };
}

// --- webhook deliveries ----------------------------------------------------------------------------

const GHL_STATUS: Record<CrmState, DeliveryStatus> = { synced: 'delivered', waiting: 'queued', retrying: 'retrying', 'gave-up': 'failed' };

export function ghlDelivery(r: CrmRow): WebhookDelivery {
  const status = GHL_STATUS[r.state];
  const open = status === 'failed' || status === 'retrying';
  return {
    source: 'ghl',
    event: `${r.kind}.sync`,
    id: r.id,
    status,
    attempts: { n: r.attempts, of: MAX_ATTEMPTS },
    nextAttemptAt: status === 'failed' || status === 'delivered' ? null : r.nextAttemptAt,
    attemptsUsed: status === 'failed',
    error: status === 'delivered' ? null : r.error,
    at: r.lastAttemptAt ?? r.syncedAt,
    retry: open ? { kind: r.kind, id: r.id } : null,
    stripeUrl: null,
  };
}

type StripeEventRow = { id: string; type: string; receivedAt: number; processedAt: number | null; error: string | null };

export function stripeDelivery(e: StripeEventRow, mode: ReturnType<typeof keyMode>): WebhookDelivery {
  const status: DeliveryStatus = e.processedAt !== null ? 'delivered' : e.error !== null ? 'failed' : 'queued';
  return {
    source: 'stripe',
    event: e.type,
    id: e.id,
    status,
    attempts: null,
    nextAttemptAt: null,
    attemptsUsed: false,
    error: status === 'failed' ? e.error : null,
    at: e.receivedAt,
    retry: null,
    stripeUrl: mode === 'live' || mode === 'test' ? stripeEventUrl(e.id, mode) : null,
  };
}

export const ZOOM_DELIVERY: WebhookDelivery = {
  source: 'zoom',
  event: 'recording.completed',
  id: null,
  status: 'not_configured',
  attempts: null,
  nextAttemptAt: null,
  attemptsUsed: false,
  error: null,
  at: null,
  retry: null,
  stripeUrl: null,
};

export async function readWebhooks(mode: ReturnType<typeof keyMode>): Promise<ConsoleWebhooks> {
  const report = await crmSyncReport();
  const seen = new Set<string>();
  const ghl: WebhookDelivery[] = [];
  for (const r of [...report.problems, ...report.recent]) {
    const key = `${r.kind}:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ghl.push(ghlDelivery(r));
  }
  ghl.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  const ghlFailed = Object.values(report.counts).reduce((s, c) => s + c.retrying + c.gaveUp, 0);

  const db = getDb();
  const failing = and(isNotNull(stripeEvents.error), isNull(stripeEvents.processedAt));
  const latest = await db.select().from(stripeEvents).orderBy(desc(stripeEvents.receivedAt)).limit(STRIPE_ROWS);
  const failed = await db.select().from(stripeEvents).where(failing).orderBy(desc(stripeEvents.receivedAt)).limit(STRIPE_ROWS);
  const [counted] = await db.select({ n: sql<number>`count(*)::int` }).from(stripeEvents).where(failing);
  const byId = new Map<string, StripeEventRow>();
  for (const e of [...latest, ...failed]) byId.set(e.id, { ...e, receivedAt: Number(e.receivedAt), processedAt: e.processedAt === null ? null : Number(e.processedAt) });
  const stripe = [...byId.values()].sort((a, b) => b.receivedAt - a.receivedAt).map((e) => stripeDelivery(e, mode));

  return {
    rows: [...ghl, ...stripe, ...(ZOOM_WEBHOOK_ROUTE === null ? [ZOOM_DELIVERY] : [])],
    failed: { ghl: ghlFailed, stripe: Number(counted?.n ?? 0) },
  };
}

// --- jobs ------------------------------------------------------------------------------------------

type TickRow = typeof jobTicks.$inferSelect;

export async function readJobs(now: number): Promise<ConsoleJobs> {
  const db = getDb();
  const byTick = new Map<string, TickRow[]>();
  for (const tickJob of new Set(JOB_SCHEDULES.map((s) => s.tickJob))) {
    byTick.set(tickJob, await db.select().from(jobTicks).where(eq(jobTicks.job, tickJob)).orderBy(desc(jobTicks.startedAt), desc(jobTicks.id)).limit(TICKS_READ));
  }
  const rows = JOB_SCHEDULES.map((s): JobRow => {
    const ticks = byTick.get(s.tickJob) ?? [];
    const latest = ticks[0];
    const done = ticks.find((t) => t.finishedAt !== null && t.status !== 'skipped');
    const scheduled = ticks.find((t) => t.trigger === 'schedule');
    return {
      job: s.job,
      schedule: scheduleLabel(s.intervalMs),
      note: s.note,
      last: latest ? { status: latest.status as JobTickStatus, startedAt: Number(latest.startedAt), trigger: latest.trigger as JobTrigger } : null,
      durationMs: done ? Number(done.finishedAt) - Number(done.startedAt) : null,
      nextRunAt: scheduled ? Number(scheduled.startedAt) + s.intervalMs : null,
      runNow: s.runNow,
    };
  });
  return { rows, asOf: now };
}

/** The request's logger, as the scheduler's. */
const schedulerLog = (req: FastifyRequest): SchedulerLog => ({
  info: (obj, msg) => req.log.info(obj, msg),
  warn: (obj, msg) => req.log.warn(obj, msg),
  error: (obj, msg) => req.log.error(obj, msg),
});

// --- the routes ------------------------------------------------------------------------------------

export function registerOpsRoutes(scope: FastifyInstance, deps: OpsDeps, limits: { read: object; write: object }): void {
  const mode = deps.stripeMode ?? keyMode(readOfferConfig().stripeSecretKey);

  scope.get(OPS_PATHS.apiEndpoints, { preHandler: [requireSession, requireConsole('api.read')], config: limits.read }, async (_req, reply): Promise<FastifyReply> =>
    reply.send(await readEndpoints(clock.now())),
  );

  scope.get(OPS_PATHS.webhooks, { preHandler: [requireSession, requireConsole('api.read')], config: limits.read }, async (_req, reply): Promise<FastifyReply> =>
    reply.send(await readWebhooks(mode)),
  );

  scope.post(
    OPS_PATHS.ghlRetry,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('webhooks.retry')], config: limits.write },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { kind?: unknown; id?: unknown };
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!isGhlRetryKind(body.kind) || !ID.test(id)) return consoleError(reply, 'invalid_body', 'Say which row: kind and id.');
      const kind = body.kind;
      const target = { type: `ghl_${kind}`, id };
      if (ghlPointsAtSpring()) {
        await audit(req, { action: 'webhook.ghl_retry', outcome: 'denied', actor, target, reason: 'ghl_location_guarded' });
        return consoleError(reply, 'ghl_location_guarded');
      }
      if (!(await resetCrmSyncRow(kind, id))) {
        await audit(req, { action: 'webhook.ghl_retry', outcome: 'failed', actor, target, reason: 'not_found' });
        return consoleError(reply, 'not_found');
      }
      await audit(req, { action: 'webhook.ghl_retry', outcome: 'ok', actor, target, after: { kind, attempts: 0 } });
      return reply.send({ ok: true });
    },
  );

  scope.get(OPS_PATHS.jobs, { preHandler: [requireSession, requireConsole('jobs.read')], config: limits.read }, async (_req, reply): Promise<FastifyReply> =>
    reply.send(await readJobs(clock.now())),
  );

  scope.post(
    OPS_PATHS.jobRun,
    { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('jobs.run_now')], config: limits.write },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const job = (req.params as { job?: string }).job ?? '';
      const known = jobSchedule(job);
      const target = { type: 'job', id: known ? job : null, label: known ? job : null };
      if (!known || known.runNow !== 'allowed' || !isRunNowJob(job)) {
        await audit(req, { action: 'job.run_now', outcome: 'denied', actor, target, reason: 'job_not_runnable' });
        return consoleError(reply, 'job_not_runnable');
      }
      const db = getDb();
      const startedAt = clock.now();
      const tick = await startTick(db, SCHEDULER_TICK_JOB, 'manual', actor.userId, startedAt);
      // The scheduler's own tick, under its own lock (4242): exactly what a scheduled tick would do now.
      // Its mail is sent after its commit; the shutdown drain waits for it, as it does the loop's.
      const run = runScheduledJobs({ log: schedulerLog(req) });
      queueMailTask('run now', () => run.then(() => undefined, () => undefined));
      let status: Exclude<JobTickStatus, 'running'>;
      let errorKind: string | null = null;
      try {
        status = (await run).ran ? 'succeeded' : 'skipped';
      } catch (err) {
        status = 'failed';
        errorKind = errorKindOf(err);
        req.log.error({ err, job }, 'Run Now failed');
      }
      const finishedAt = clock.now();
      await db.transaction(async (tx) => {
        await finishTick(tx, tick, status, errorKind, finishedAt);
        await audit(
          req,
          {
            action: 'job.run_now',
            outcome: status === 'succeeded' ? 'ok' : 'failed',
            actor,
            target,
            reason: status === 'skipped' ? 'scheduler_busy' : errorKind,
            after: { tick, status },
          },
          tx,
        );
      });
      if (status === 'skipped') return consoleError(reply, 'scheduler_busy');
      const result: JobRunResult = { job, status, startedAt, finishedAt };
      return reply.send(result);
    },
  );
}
