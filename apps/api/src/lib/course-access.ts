// Whether a signed-in learner's plan opens the Amplified AI Accelerator (D-110).
//
// PLAN-BASED, NOT COHORT-BASED. Provisioning puts every paid buyer, whatever they bought, in cohort
// `dec26` as a Team-tier owner (billing/provision.ts), so neither the cohort nor the tier can tell an
// AI Accelerator buyer from an Amplified Insiders or Team Plan buyer. The plan can. The rule itself is
// `acceleratorOpen` in `@ai/core/accelerator`; this file only reads the rows it needs: the learner's
// team, the team's account, the account's plans. A teammate the owner invited (the operator) is on
// the same team, so they open what the owner's plan opens.
//
// Read-only. Every check that hands out the course goes through here: the snapshot, the join route
// and `GET /api/course`.

import { eq, inArray } from 'drizzle-orm';
import { acceleratorOpen } from '@ai/core/accelerator';
import type { AcceleratorPlan } from '@ai/core/accelerator';
import type { Database } from '../db/client';
import { accounts, plans, users } from '../db/schema';

type Reader = Pick<Database, 'select'>;

/** The plans on the account of this learner's team. Empty for a learner with no team or no account. */
export async function plansForLearner(db: Reader, userId: string): Promise<AcceleratorPlan[]> {
  const [user] = await db.select({ teamId: users.teamId, kind: users.kind }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.kind !== 'learner' || !user.teamId) return [];
  const accts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, user.teamId));
  if (!accts.length) return [];
  const rows = await db
    .select({ kind: plans.kind, option: plans.option, status: plans.status, startsAt: plans.startsAt })
    .from(plans)
    .where(inArray(plans.accountId, accts.map((a) => a.id)));
  return rows.map((r) => ({ kind: r.kind, option: r.option, status: r.status, startsAt: r.startsAt === null ? null : Number(r.startsAt) }));
}

/** Whether this learner's account holds a plan that opens the course right now. */
export async function acceleratorAccess(db: Reader, userId: string, now: number): Promise<boolean> {
  return acceleratorOpen(await plansForLearner(db, userId), now);
}
