// R-5 Phase 5 (D-262): the cohort a sale is in, read from its record (handoff/admin-mockup/PHASE5.md § 3).
//
// Everything that sells a seat (the offer page, the webhook, provisioning, the seat cap) reads a cohort's selling
// settings here, through core's `cohortSelling`: what its record holds, and for December alone, for a field its record
// does not hold yet, what the code held before Phase 5 (the constants and the environment, `sellingEnvOf(config)`).
// Small reads of the `cohorts` and `sessions` tables, not the whole snapshot: the webhook runs these on every event.
//
// Read-only.

import { and, eq, inArray } from 'drizzle-orm';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { cohortOnSale, cohortSaleOf, cohortSelling, sellingEnvOf } from '@ai/core/cohort-selling';
import type { CohortSelling, SellingEnv } from '@ai/core/cohort-selling';
import type { PlanCohort } from '@ai/core/offer';
import type { Cohort } from '@ai/core';
import type { Database } from '../db/client';
import { cohorts, sessions } from '../db/schema';
import type { OfferConfig } from './config';

type Reader = Pick<Database, 'select'>;

type CohortRow = typeof cohorts.$inferSelect;

/** A `cohorts` row as core's `Cohort` reads it for selling: an unset column is an absent key (D-173). */
export function sellingCohortOf(r: CohortRow): Cohort {
  const out: Cohort = {
    id: r.id,
    name: r.name,
    start: Number(r.start),
    end: Number(r.end),
    status: r.status as Cohort['status'],
    capacity: r.capacity,
    enrolled: 0,
    cadence: r.cadence,
  };
  const optional: Partial<Cohort> = {
    timezone: r.timezone ?? undefined,
    archivedAt: r.archivedAt ?? undefined,
    includedUntil: r.includedUntil ?? undefined,
    founding: r.founding ?? undefined,
    foundingClosesAt: r.foundingClosesAt ?? undefined,
    lookupKeyFull: r.lookupKeyFull ?? undefined,
    lookupKeyRollover: r.lookupKeyRollover ?? undefined,
    lookupKeyTwoPay: r.lookupKeyTwoPay ?? undefined,
    twoPay: r.twoPay ?? undefined,
    linkFull: r.linkFull ?? undefined,
    linkTwoPay: r.linkTwoPay ?? undefined,
    ghlValue: r.ghlValue ?? undefined,
  };
  for (const [k, v] of Object.entries(optional)) if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  return out;
}

/** Every cohort, as selling reads them. */
export async function sellingCohorts(db: Reader): Promise<Cohort[]> {
  return (await db.select().from(cohorts)).map(sellingCohortOf);
}

/** The environment's values the offer's configuration holds, as December read them before Phase 5. */
export const envOf = (config: Pick<OfferConfig, 'foundingClosesAt' | 'paymentLinks'>): SellingEnv => sellingEnvOf(config);

/** One cohort's selling settings (December's built-in values for a field its record does not hold). */
export async function sellingOf(db: Reader, cohortId: string, env: SellingEnv): Promise<CohortSelling> {
  const rows = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
  return cohortSelling({ cohorts: rows.map(sellingCohortOf) }, cohortId, env);
}

/** The cohort a seat is sold in: its id, its first live build and its included-time end (`initialPlanDates`). */
export async function planCohortOf(db: Reader, cohortId: string, env: SellingEnv): Promise<PlanCohort> {
  const [rows, builds] = await Promise.all([
    db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1),
    db
      .select({ cohortId: sessions.cohortId, start: sessions.start, kind: sessions.kind })
      .from(sessions)
      .where(and(eq(sessions.cohortId, cohortId), eq(sessions.kind, 'live_build'))),
  ]);
  return cohortSaleOf(
    { cohorts: rows.map(sellingCohortOf) },
    cohortId,
    builds.map((b) => ({ cohortId: b.cohortId, start: Number(b.start), kind: 'live_build' as const })),
    env,
  );
}

/** Whether the database holds this cohort. */
export async function cohortExists(db: Reader, cohortId: string): Promise<boolean> {
  return (await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, cohortId)).limit(1)).length > 0;
}

/**
 * The cohort an order is sold in: its `ai_cohort` (`orders.cohort_id`), else December, forever (a December link
 * already in an inbox carries none).
 */
export const orderCohortId = (order: { cohortId: string | null }): string => order.cohortId ?? DEFAULT_COHORT_ID;

/**
 * The cohort the offer sells at `now` (`cohortOnSale`: with two open, the next to start), with its settings; null when
 * no cohort's enrollment is open.
 */
export async function onSaleOf(db: Reader, env: SellingEnv, now: number): Promise<{ id: string; selling: CohortSelling } | null> {
  const all = await sellingCohorts(db);
  const id = cohortOnSale({ cohorts: all }, now);
  return id === null ? null : { id, selling: cohortSelling({ cohorts: all }, id, env) };
}

/** The selling settings of several cohorts at once. */
export async function sellingOfMany(db: Reader, ids: readonly string[], env: SellingEnv): Promise<Map<string, CohortSelling>> {
  const rows = ids.length ? (await db.select().from(cohorts).where(inArray(cohorts.id, [...ids]))).map(sellingCohortOf) : [];
  return new Map(ids.map((id) => [id, cohortSelling({ cohorts: rows }, id, env)]));
}
