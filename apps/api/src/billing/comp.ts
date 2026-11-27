// Comp an Accelerator team (staff): a $0 order with origin 'comp', then the same provisioning a
// paid order runs. No Stripe ids, no Insiders subscription, and no founding seat. The owner gets a
// 2-seat team (so they can invite an AI Implementer), the cohort plan, a cohort enrollment, and the
// set-password email when they have not signed in yet. The cohort welcome is the existing job's,
// from the enrollment row this writes.
//
// IDEMPOTENT. One paid comp order per email. Run twice and the second call provisions the same order
// again, which changes nothing. A person who already holds a paid Accelerator seat is refused: a
// comp must not sit beside a sale.
//
// AN ACCESS-GROUP LOGIN. A verified @liveutah.com address already owns a team of one (Agent tier,
// no account). Provisioning reuses that user and team, raises the seats to 2, applies the team name,
// and adds the cohort plan. The Utah Life grant stays: it opens agent skills, and the plan opens the
// course. They do not write the same rows.

import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { provisionOwner } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import type { Database } from '../db/client';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { accounts, cohorts, orders, plans } from '../db/schema';
import { randomIds } from '../lib/clock';
import { CARTS, COHORT_ONE, initialPlanDates } from './catalog';
import type { PlanDates } from './catalog';
import { provisionOrder } from './provision';
import type { BillingLog } from './provision';
import { upsertCohortEnrollments } from '../jobs/enrollments';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lock = (tx: { execute: Database['execute'] }) => tx.execute(sql`select pg_advisory_xact_lock(42)`);

export interface CompInput {
  email: string;
  name: string;
  teamName: string;
  /** Omitted: the platform cohort (December 2026). */
  cohortId?: string | null;
}

export interface CompOptions {
  db?: Database;
  log: BillingLog;
  now: number;
  invitesFrom: number;
  invitesEnabled?: boolean;
  inviteNow?: boolean;
}

export type CompResult =
  | {
      ok: true;
      already: boolean;
      orderId: string;
      accountId: string;
      planId: string;
      teamId: string;
      userId: string;
      cohortId: string;
      invite: 'sent' | 'held' | 'already';
    }
  | { ok: false; reason: 'invalid' | 'no-cohort' | 'staff-email' | 'member-of-another-team' | 'already-enrolled' | 'no-order' | 'not-paid' | 'unknown-cart' };

export interface CompCohortList {
  cohorts: { id: string; name: string }[];
  defaultCohortId: string;
}

/** Cohorts the form can offer. Archived ones are left out. The default is December 2026 when it is there. */
export async function listCompCohorts(db: Database = getDb()): Promise<CompCohortList> {
  const rows = await db
    .select({ id: cohorts.id, name: cohorts.name })
    .from(cohorts)
    .where(isNull(cohorts.archivedAt))
    .orderBy(asc(cohorts.start), asc(cohorts.id));
  const list = rows.map((r) => ({ id: r.id, name: r.name }));
  const defaultCohortId = list.some((c) => c.id === DEFAULT_COHORT_ID) ? DEFAULT_COHORT_ID : (list[0]?.id ?? DEFAULT_COHORT_ID);
  if (!list.some((c) => c.id === defaultCohortId)) list.unshift({ id: defaultCohortId, name: 'December 2026' });
  return { cohorts: list, defaultCohortId };
}

function cleaned(input: CompInput): { ok: true; email: string; name: string; teamName: string; cohortId: string | null } | { ok: false } {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const teamName = input.teamName.trim();
  const cohortId = (input.cohortId ?? '').trim();
  if (!EMAIL.test(email) || email.length > 200) return { ok: false };
  if (name.length < 1 || name.length > 80 || teamName.length < 1 || teamName.length > 80) return { ok: false };
  if (cohortId.length > 64) return { ok: false };
  return { ok: true, email, name, teamName, cohortId: cohortId || null };
}

/** December uses the paid plan's dates. Another cohort runs for its own start and end. */
async function datesFor(db: Database, cohortId: string | null, now: number): Promise<{ cohortId: string; dates: PlanDates } | null> {
  if (!cohortId || cohortId === DEFAULT_COHORT_ID) {
    return { cohortId: DEFAULT_COHORT_ID, dates: initialPlanDates(CARTS['cohort-full'], now, true) };
  }
  const [row] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
  if (!row || row.archivedAt !== null) return null;
  if (row.id === COHORT_ONE.id) return { cohortId: row.id, dates: initialPlanDates(CARTS['cohort-full'], now, true) };
  return {
    cohortId: row.id,
    dates: {
      startsAt: Math.max(now, Number(row.start)),
      paidThrough: Number(row.end),
      liveUntil: Number(row.end),
      minimumUntil: null,
      cohortId: row.id,
    },
  };
}

/**
 * Comp one owner into a cohort. Safe to run twice for the same email: the second call finds the
 * comp order and provisions it again.
 */
export async function compAcceleratorTeam(input: CompInput, options: CompOptions): Promise<CompResult> {
  const fields = cleaned(input);
  if (!fields.ok) return { ok: false, reason: 'invalid' };
  const db = options.db ?? getDb();
  const placed = await datesFor(db, fields.cohortId, options.now);
  if (!placed) return { ok: false, reason: 'no-cohort' };
  const { email, name, teamName } = fields;

  const held = await db.transaction(async (tx) => {
    await lock(tx);
    const [existing] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.origin, 'comp'), eq(orders.plan, 'cohort'), eq(orders.status, 'paid'), sql`lower(${orders.email}) = ${email}`))
      .limit(1);
    if (existing) return { kind: 'reuse' as const, orderId: existing.id };

    const live = await tx
      .select({ origin: orders.origin })
      .from(plans)
      .innerJoin(accounts, eq(accounts.id, plans.accountId))
      .leftJoin(orders, eq(orders.id, plans.orderId))
      .where(and(sql`lower(${accounts.ownerEmail}) = ${email}`, eq(plans.kind, 'cohort'), ne(plans.status, 'ended')));
    if (live.some((p) => p.origin !== 'comp')) return { kind: 'already-enrolled' as const };

    const before = await loadDb(tx);
    const probe = provisionOwner(
      before,
      { email, name, teamName, seats: CARTS['cohort-full'].seats, tier: 'team', cohortId: placed.cohortId, applyTeamName: true, applyOwnerName: true, placeInCohort: true },
      { now: options.now, id: () => 'probe' },
    );
    if (!probe.ok) return { kind: 'refuse' as const, reason: probe.reason };

    const [row] = await tx
      .insert(orders)
      .values({
        id: randomIds()('ord'),
        plan: 'cohort',
        option: 'full',
        origin: 'comp',
        status: 'paid',
        name,
        email,
        company: teamName,
        amountTotal: 0,
        currency: 'usd',
        paymentsMade: 1,
        paidAt: options.now,
        createdAt: options.now,
      })
      .returning({ id: orders.id });
    return { kind: 'new' as const, orderId: row!.id };
  });

  if (held.kind === 'already-enrolled') return { ok: false, reason: 'already-enrolled' };
  if (held.kind === 'refuse') return { ok: false, reason: held.reason };

  const provisioned = await provisionOrder(held.orderId, {
    db,
    log: options.log,
    now: options.now,
    invitesFrom: options.invitesFrom,
    invitesEnabled: options.invitesEnabled,
    inviteNow: options.inviteNow,
    cohortId: placed.cohortId,
    applyTeamName: true,
    applyOwnerName: true,
    placeInCohort: true,
    planDates: placed.dates,
  });
  // R-5 Phase 5 (D-262) added two refusals a comp never meets (it names no `ai_cohort` and hands in its own dates); either
  // would mean the cohort is not one a seat can be placed in.
  if (!provisioned.ok) return provisioned.reason === 'unknown-cohort' || provisioned.reason === 'cohort-not-ready' ? { ok: false, reason: 'no-cohort' } : provisioned;

  await upsertCohortEnrollments(db);
  const [owner] = await db
    .select({ teamId: accounts.teamId, userId: accounts.ownerUserId })
    .from(accounts)
    .where(eq(accounts.id, provisioned.accountId))
    .limit(1);

  return {
    ok: true,
    already: held.kind === 'reuse',
    orderId: held.orderId,
    accountId: provisioned.accountId,
    planId: provisioned.planId,
    teamId: owner?.teamId ?? '',
    userId: owner?.userId ?? '',
    cohortId: placed.cohortId,
    invite: provisioned.invite,
  };
}
