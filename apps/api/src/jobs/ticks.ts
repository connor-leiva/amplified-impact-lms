// The scheduled loops' runs, as rows (D-165, spec § 7.10): `recordTick(job, fn)` wraps an existing job
// call and writes one `job_ticks` row around it, for the Console's Scheduled Jobs screen.
//
// OBSERVE-ONLY. The wrapper runs `fn` exactly once, whatever the table does, and hands back exactly
// what `fn` returned or rethrows exactly what it threw. Every write here is caught: a tick the database
// will not take is a warning (once in ten minutes, so an outage is one line, not one a minute), never a
// job that did not run. `scheduler.test.ts` is unchanged and passes.
//
// One row per run: `running` when it starts, then `succeeded`, `failed` (with a short kind from the
// error's code or name, never its message, which can carry data) or `skipped` (the run found the
// scheduler lock held, so it did nothing). The end is written only over a row still `running`.

import { and, eq, lt } from 'drizzle-orm';
import type { JobTickStatus, JobTrigger } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { jobTicks } from '../db/schema';
import { clock } from '../lib/clock';

/**
 * The scheduler's one tick runs all six `JOB_NAMES` jobs together (`dueWork`), so it is one row under
 * this name; each of the six reads it (`JOB_SCHEDULES`).
 */
export const SCHEDULER_TICK_JOB = 'scheduler';

export interface TickLog {
  warn(obj: Record<string, unknown>, msg: string): void;
}

/** Anything that can insert and update: the pool, or a transaction a write shares with its audit row. */
type TickWriter = Pick<Database, 'insert' | 'update'>;

const WARN_EVERY_MS = 10 * 60_000;
let lastWarn = -Infinity;

/** A short, safe name for what went wrong: a code (`57P01`, `ECONNRESET`) or the error's class. */
export function errorKindOf(err: unknown): string {
  const e = (err ?? {}) as { code?: unknown; name?: unknown };
  if (typeof e.code === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(e.code)) return e.code;
  if (typeof e.name === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(e.name)) return e.name;
  return 'error';
}

async function quietly<R>(write: () => Promise<R>, log: TickLog | undefined, job: string): Promise<R | null> {
  try {
    return await write();
  } catch (err) {
    const now = Date.now();
    if (log && now - lastWarn >= WARN_EVERY_MS) {
      lastWarn = now;
      log.warn({ job, reason: errorKindOf(err) }, 'job tick not recorded; the job itself ran as usual');
    }
    return null;
  }
}

/** The `running` row. Returns its id. Throws on a database error: callers wrap it. */
export async function startTick(db: TickWriter, job: string, trigger: JobTrigger, actorUserId: string | null, startedAt: number): Promise<number> {
  const [row] = await db
    .insert(jobTicks)
    .values({ job, startedAt, status: 'running', trigger, actorUserId: trigger === 'manual' ? actorUserId : null })
    .returning({ id: jobTicks.id });
  return row!.id;
}

/** The row's end, written only over one still running. */
export async function finishTick(db: TickWriter, id: number, status: Exclude<JobTickStatus, 'running'>, errorKind: string | null, finishedAt: number): Promise<void> {
  await db
    .update(jobTicks)
    .set({ status, errorKind, finishedAt })
    .where(and(eq(jobTicks.id, id), eq(jobTicks.status, 'running')));
}

export interface TickOptions<T> {
  /** A result that means the run did nothing because another runner held the lock. */
  skipped?: (result: T) => boolean;
  log?: TickLog;
  /** Defaults to the app's own database. */
  db?: () => TickWriter;
}

/**
 * Run a scheduled job's existing call and record it. Observe-only: see the header.
 */
export async function recordTick<T>(job: string, fn: () => Promise<T>, opts: TickOptions<T> = {}): Promise<T> {
  const db = opts.db ?? getDb;
  const id = await quietly(() => startTick(db(), job, 'schedule', null, clock.now()), opts.log, job);
  let result: T;
  try {
    result = await fn();
  } catch (err) {
    if (id !== null) await quietly(() => finishTick(db(), id, 'failed', errorKindOf(err), clock.now()), opts.log, job);
    throw err;
  }
  if (id !== null) {
    const status = opts.skipped?.(result) ? 'skipped' : 'succeeded';
    await quietly(() => finishTick(db(), id, status, null, clock.now()), opts.log, job);
  }
  return result;
}

/** D6: ticks are kept 90 days. */
export async function pruneJobTicks(db: Pick<Database, 'delete'>, before: number): Promise<void> {
  await db.delete(jobTicks).where(lt(jobTicks.startedAt, before));
}
