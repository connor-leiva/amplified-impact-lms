// The API's own numbers (D-165, spec § 7.9): an observe-only `onResponse` hook that counts each answer
// under `/api/` by its ROUTE TEMPLATE, in memory, and adds each minute's counts to `api_metrics` once a
// minute. The Console's API & Webhooks screen reads them.
//
// IT NEVER ALTERS A RESPONSE. `onResponse` runs after the answer has gone; `record` only adds to a map,
// in a `try`, and never awaits. The write happens on a timer, never on a request's path, and every
// failure there is caught and logged (once in ten minutes): a database that refuses the flush costs a
// minute of numbers, never a request. `test/api-metrics.test.ts` answers the same requests with the
// hook on and off and compares them byte for byte.
//
// KEYED BY `routeOptions.url`, NEVER THE RAW URL: `GET /api/sessions/:id/join`, not the session id; an
// address no route matched (a 404) is not counted at all, so a key is only ever a registered route.
// Not counted: `/api/health` (Railway's healthcheck, every few seconds) and `/api/events` (the event
// stream, whose "latency" is a connection's life).
//
// Two replicas add to the same row (`on conflict ... do update`, histogram buckets summed). Pruned once
// an hour, with the job ticks: metrics after 30 days, ticks after 90 (D6).

import type { FastifyReply, FastifyRequest } from 'fastify';
import { lt, sql } from 'drizzle-orm';
import { API_METRICS_RETENTION_MS, JOB_TICKS_RETENTION_MS, bucketOf } from '@ai/core';
import type { ApiHist } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { apiMetrics } from '../db/schema';
import { pruneJobTicks } from '../jobs/ticks';
import { clock } from './clock';

export const METRICS_FLUSH_MS = 60_000;
export const METRICS_PRUNE_MS = 3600_000;
/** Minutes × routes held while the database is away; past this a minute's counts are dropped. */
export const METRICS_MAX_PENDING = 10_000;
export const METRICS_SKIPPED: ReadonlySet<string> = new Set(['/api/health', '/api/events']);

const MINUTE = 60_000;
const WARN_EVERY_MS = 10 * 60_000;

interface Pending {
  minute: number;
  route: string;
  count: number;
  e4: number;
  e5: number;
  hist: ApiHist;
}

export interface ApiMetrics {
  /** The `onResponse` hook's body. Never throws. */
  record(req: FastifyRequest, reply: FastifyReply): void;
  /** Write what is waiting (and prune, once an hour). Never rejects. */
  flush(): Promise<void>;
  /** Stop the timer and write what is left. */
  close(): Promise<void>;
  /** How many minute-and-route counts are waiting: for a test. */
  pending(): number;
}

export interface ApiMetricsOptions {
  db?: () => Pick<Database, 'insert' | 'delete'>;
  log?: { warn(obj: Record<string, unknown>, msg: string): void };
  /** 0 arms no timer (a test flushes by hand). */
  flushMs?: number;
  now?: () => number;
}

/** `GET /api/sessions/:id/join`, or null for anything not counted. */
export function routeKey(req: FastifyRequest): string | null {
  const url = req.routeOptions?.url;
  if (typeof url !== 'string' || !(url === '/api' || url.startsWith('/api/'))) return null;
  if (METRICS_SKIPPED.has(url)) return null;
  return `${req.method} ${url}`;
}

export function createApiMetrics(opts: ApiMetricsOptions = {}): ApiMetrics {
  const db = opts.db ?? getDb;
  const now = opts.now ?? (() => clock.now());
  const pending = new Map<string, Pending>();
  let lastPrune = -Infinity;
  let lastWarn = -Infinity;
  let chain: Promise<void> = Promise.resolve();

  const warn = (reason: unknown, msg: string) => {
    const t = Date.now();
    if (!opts.log || t - lastWarn < WARN_EVERY_MS) return;
    lastWarn = t;
    const e = (reason ?? {}) as { code?: unknown; name?: unknown };
    opts.log.warn({ reason: typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : 'error' }, msg);
  };

  const add = (p: Pending) => {
    const key = `${p.minute} ${p.route}`;
    const have = pending.get(key);
    if (have) {
      have.count += p.count;
      have.e4 += p.e4;
      have.e5 += p.e5;
      for (const [b, n] of Object.entries(p.hist)) have.hist[b] = (have.hist[b] ?? 0) + n;
    } else if (pending.size < METRICS_MAX_PENDING) pending.set(key, p);
  };

  const record = (req: FastifyRequest, reply: FastifyReply): void => {
    try {
      const route = routeKey(req);
      if (!route) return;
      const t = now();
      const status = reply.statusCode;
      add({
        minute: t - (t % MINUTE),
        route,
        count: 1,
        e4: status >= 400 && status < 500 ? 1 : 0,
        e5: status >= 500 ? 1 : 0,
        hist: { [bucketOf(reply.elapsedTime)]: 1 },
      });
    } catch {
      // Observe-only: nothing here may reach the request.
    }
  };

  const write = async (rows: Pending[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      await db()
        .insert(apiMetrics)
        .values(rows.slice(i, i + 500).map((p) => ({ minute: p.minute, route: p.route, count: p.count, errors4xx: p.e4, errors5xx: p.e5, hist: p.hist })))
        .onConflictDoUpdate({
          target: [apiMetrics.minute, apiMetrics.route],
          set: {
            count: sql`${apiMetrics.count} + excluded.count`,
            errors4xx: sql`${apiMetrics.errors4xx} + excluded.errors_4xx`,
            errors5xx: sql`${apiMetrics.errors5xx} + excluded.errors_5xx`,
            hist: sql`(select jsonb_object_agg(b.k, coalesce((${apiMetrics.hist} ->> b.k)::bigint, 0) + coalesce((excluded.hist ->> b.k)::bigint, 0)) from jsonb_object_keys(${apiMetrics.hist} || excluded.hist) as b(k))`,
          },
        });
    }
  };

  const flushOnce = async (): Promise<void> => {
    const rows = [...pending.values()];
    pending.clear();
    if (rows.length) {
      try {
        await write(rows);
      } catch (err) {
        // Back in the queue for the next minute (up to the cap). Never a request's problem.
        for (const p of rows) add(p);
        warn(err, 'API metrics not written; kept for the next minute');
      }
    }
    const t = now();
    if (t - lastPrune >= METRICS_PRUNE_MS) {
      lastPrune = t;
      try {
        await db().delete(apiMetrics).where(lt(apiMetrics.minute, t - API_METRICS_RETENTION_MS));
        await pruneJobTicks(db(), t - JOB_TICKS_RETENTION_MS);
      } catch (err) {
        warn(err, 'ops telemetry not pruned; the next hour retries');
      }
    }
  };

  const flush = (): Promise<void> => (chain = chain.then(flushOnce, flushOnce));

  const flushMs = opts.flushMs ?? METRICS_FLUSH_MS;
  let timer: NodeJS.Timeout | null = flushMs > 0 ? setInterval(() => void flush(), flushMs) : null;
  timer?.unref();

  return {
    record,
    flush,
    async close() {
      if (timer) clearInterval(timer);
      timer = null;
      await flush();
    },
    pending: () => pending.size,
  };
}
