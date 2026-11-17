// The incidents' auto-open rules, PR 8 (D-167, spec § 7.14, D5): `evaluateIncidentRules`, once per
// scheduler tick (`jobs/scheduler.ts`, in its own try/catch). OBSERVE-ONLY: it reads the evidence
// tables and writes only `incidents`, `incident_events` and `audit_log` (as the system). It sends
// nothing, to anyone (D5: no notifications), and it never touches the jobs, the webhook or GHL.
//
// The rules themselves are pure (`observeIncidents`, `planIncidentWrites` in @ai/core). This file is
// their thin adapters, one per source, each read in its own try/catch so a source that fails (or a
// table that is not there) costs only its own rule:
//   - `job_ticks` (R2-5, D-165): each job's recent finished ticks;
//   - `stripe_events`: events with an error and no `processed_at`;
//   - `crmSyncReport()`: GHL rows that gave up, read-only;
//   - `api_metrics` (R2-5, D-165): requests and 5xx answers over the last 10 minutes.
// The plan and its writes run in one transaction under the numbering lock, so two replicas ticking
// at once open each incident once.

import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { INCIDENT_RULES, NO_SIGNALS, observeIncidents, planIncidentWrites } from '@ai/core';
import type { ApiWindowFact, GhlGaveUpFact, IncidentSignals, JobTickFact, StripeErrorFact, UnresolvedIncident } from '@ai/core';
import type { Database } from '../db/client';
import { apiMetrics, incidentEvents, incidents, jobTicks, stripeEvents } from '../db/schema';
import { crmSyncReport } from '../routes/crm-sync';
import { lockNumbering, openIncident, signalIncident } from './incidents';

/** Where the rules read their evidence. Each may be swapped (a test's), and each may fail alone. */
export interface IncidentSources {
  jobTicks(db: Reader, now: number): Promise<JobTickFact[]>;
  stripeErrors(db: Reader, now: number): Promise<StripeErrorFact[]>;
  ghl(db: Reader, now: number): Promise<GhlGaveUpFact | null>;
  api(db: Reader, now: number): Promise<ApiWindowFact | null>;
}

/** What a source reads with: a savepoint of the read transaction. */
export type Reader = Pick<Database, 'select' | 'execute'>;
type ReadTx = Reader & { transaction<T>(fn: (sp: Reader) => Promise<T>): Promise<T> };

/** How many of each job's newest finished ticks are read: enough for any streak a signal reports. */
const TICKS_PER_JOB = 50;

export const DB_SOURCES: IncidentSources = {
  // R2-5's `job_ticks` (D-165): each job's newest finished runs. `running` and `skipped` are not
  // finished runs that succeeded or failed, so they neither make nor break a streak.
  jobTicks: async (db) => {
    const rows = (await db.execute(sql`
      select job, status, finished_at from (
        select ${jobTicks.job} as job, ${jobTicks.status} as status, ${jobTicks.finishedAt} as finished_at,
               row_number() over (partition by ${jobTicks.job} order by ${jobTicks.startedAt} desc, ${jobTicks.id} desc) as rn
          from ${jobTicks}
         where ${jobTicks.status} in ('succeeded', 'failed') and ${jobTicks.finishedAt} is not null
      ) t where rn <= ${TICKS_PER_JOB}`)) as unknown as { job: string; status: 'succeeded' | 'failed'; finished_at: string | number }[];
    return rows.map((r) => ({ job: r.job, status: r.status, finishedAt: Number(r.finished_at) }));
  },
  stripeErrors: async (db) =>
    db
      .select({ id: stripeEvents.id, type: stripeEvents.type, receivedAt: stripeEvents.receivedAt })
      .from(stripeEvents)
      .where(and(sql`${stripeEvents.error} is not null`, isNull(stripeEvents.processedAt)))
      .limit(500),
  ghl: async () => {
    const report = await crmSyncReport();
    const count = Object.values(report.counts).reduce((n, c) => n + c.gaveUp, 0);
    const times = report.problems.filter((r) => r.state === 'gave-up' && r.lastAttemptAt !== null).map((r) => r.lastAttemptAt!);
    return { count, latestAt: times.length ? Math.max(...times) : null };
  },
  // R2-5's `api_metrics` (D-165): every route's answers in the minutes flushed over the last 10.
  api: async (db, now) => {
    const [row] = await db
      .select({ requests: sql<number>`coalesce(sum(${apiMetrics.count}), 0)::int`, errors5xx: sql<number>`coalesce(sum(${apiMetrics.errors5xx}), 0)::int` })
      .from(apiMetrics)
      .where(sql`${apiMetrics.minute} >= ${now - INCIDENT_RULES.apiWindowMs}`);
    return { requests: Number(row?.requests ?? 0), errors5xx: Number(row?.errors5xx ?? 0) };
  },
};

export interface IncidentRun {
  opened: string[];
  signaled: string[];
  /** The sources that failed this tick (their rules were skipped). */
  failed: (keyof IncidentSources)[];
}

/**
 * Read every source, each on its own savepoint: a failure (a missing table, a bad row) rolls back to
 * it, leaves that source empty and is reported, and the others still read.
 */
export async function readSignals(db: ReadTx, now: number, sources: IncidentSources): Promise<{ signals: IncidentSignals; failed: (keyof IncidentSources)[] }> {
  const failed: (keyof IncidentSources)[] = [];
  const safe = async <K extends keyof IncidentSources>(k: K, empty: Awaited<ReturnType<IncidentSources[K]>>) => {
    try {
      const read = sources[k] as (r: Reader, n: number) => Promise<unknown>;
      return (await db.transaction((sp) => read(sp, now))) as Awaited<ReturnType<IncidentSources[K]>>;
    } catch {
      failed.push(k);
      return empty;
    }
  };
  const signals: IncidentSignals = {
    jobTicks: await safe('jobTicks', []),
    stripeErrors: await safe('stripeErrors', []),
    ghl: await safe('ghl', NO_SIGNALS.ghl),
    api: await safe('api', NO_SIGNALS.api),
  };
  return { signals, failed };
}

/**
 * Evaluate the rules once: open what fires with nothing unresolved, signal what repeats with new
 * evidence, and write nothing else. Every write is the system's, with its own audit row.
 */
export async function evaluateIncidentRules(db: Pick<Database, 'transaction'>, now: number, sources: IncidentSources = DB_SOURCES): Promise<IncidentRun> {
  const { signals, failed } = await db.transaction((tx) => readSignals(tx as unknown as ReadTx, now, sources));
  const observations = observeIncidents(signals, now);
  const run: IncidentRun = { opened: [], signaled: [], failed };
  if (!observations.length) return run;
  await db.transaction(async (tx) => {
    await lockNumbering(tx);
    const prints = observations.map((o) => o.fingerprint);
    const live = await tx
      .select({ id: incidents.id, fingerprint: incidents.fingerprint })
      .from(incidents)
      .where(and(inArray(incidents.fingerprint, prints), ne(incidents.status, 'resolved')));
    const last = live.length
      ? await tx
          .select({ id: incidentEvents.incidentId, at: sql<number>`max(${incidentEvents.at})` })
          .from(incidentEvents)
          .where(and(inArray(incidentEvents.incidentId, live.map((l) => l.id)), isNull(incidentEvents.actorUserId), inArray(incidentEvents.kind, ['opened', 'signal'])))
          .groupBy(incidentEvents.incidentId)
      : [];
    const unresolved: UnresolvedIncident[] = live.map((l) => ({ id: l.id, fingerprint: l.fingerprint!, lastSystemAt: Number(last.find((x) => x.id === l.id)?.at ?? 0) }));
    const resolvedRows = await tx
      .select({ fingerprint: incidents.fingerprint, at: sql<number>`max(${incidents.resolvedAt})` })
      .from(incidents)
      .where(and(inArray(incidents.fingerprint, prints), eq(incidents.status, 'resolved')))
      .groupBy(incidents.fingerprint);
    const lastResolvedAt = Object.fromEntries(resolvedRows.map((r) => [r.fingerprint!, Number(r.at)]));
    for (const w of planIncidentWrites(observations, { unresolved, lastResolvedAt })) {
      const o = w.observation;
      if (w.kind === 'open') {
        run.opened.push(
          await openIncident(tx, null, { title: o.title, severity: o.severity, fingerprint: o.fingerprint, actor: { source: 'system' }, body: o.opened, link: o.link, now }),
        );
      } else {
        const title = (await tx.select({ title: incidents.title }).from(incidents).where(eq(incidents.id, w.incidentId)))[0]?.title ?? o.title;
        await signalIncident(tx, { incidentId: w.incidentId, title, body: o.signal, link: o.link, fingerprint: o.fingerprint, now });
        run.signaled.push(w.incidentId);
      }
    }
  });
  return run;
}
