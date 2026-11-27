// R-5 Phase 3 (D-255): what the Cohort page needs to know about a cohort that the snapshot does not hold.
//
//   testSends   whether each of the two test sends went out for this cohort: an `ok` row of `welcome.test_send` and of
//               `week0.test_send` in `audit_log`, targeting the cohort (PLAN.md § 10.3: no new table).
//   plans       cohort plans placed in it, any status, not a test account's (D-202): a seat sold. Once there is one,
//               its included time is frozen (Q-22).
//   teams       its Teams by the spec's rule 2: teams with a `cohort` plan for it that has not ended, test accounts left
//               out (`countedCohortSeat`'s filter).
//   learners    the people on those teams who are not test accounts.
//   intake      of those teams, how many have not started their intake (no `team_intake` row), and how many sent one
//               that did not reach GoHighLevel (`ghl_sync_status` is `failed`): the "Needs you" rows.
//   readiness   of those teams, how many have someone signed in, their intake submitted, and are paid in full.
//
// Read-only. "Before it opens" (`beforeItOpens` in `@ai/core`) reads these beside the snapshot, and so does Open
// enrollment's refusal, so the checklist and the refusal cannot drift. Two booleans and counts; no names.

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { CohortFacts } from '@ai/core';
import type { Database } from '../db/client';
import { accounts, auditLog, orders, plans, teamIntake, users } from '../db/schema';

type Reader = Pick<Database, 'select'>;

const notTest = sql`not exists (
  select 1 from ${accounts} a
  join ${users} u on u.id = a.owner_user_id
  where a.id = ${plans.accountId} and u.is_test
)`;

/** A comp is not a seat sold and not paid in full (the same counts a test account is left out of). */
const notComp = sql`not exists (
  select 1 from ${orders} o
  where o.id = ${plans.orderId} and o.origin = 'comp'
)`;

export async function cohortFactsOf(db: Reader, cohortId: string): Promise<CohortFacts> {
  const sends = await db
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(
      and(
        inArray(auditLog.action, ['welcome.test_send', 'week0.test_send']),
        eq(auditLog.outcome, 'ok'),
        eq(auditLog.targetType, 'cohort'),
        eq(auditLog.targetId, cohortId),
      ),
    );
  const sold = await db
    .select({ status: plans.status, option: plans.option, teamId: accounts.teamId })
    .from(plans)
    .innerJoin(accounts, eq(accounts.id, plans.accountId))
    .where(and(eq(plans.kind, 'cohort'), eq(plans.cohortId, cohortId), notTest, notComp));
  const live = [...new Set(sold.filter((p) => p.status !== 'ended').map((p) => p.teamId))];
  const people = live.length
    ? await db
        .select({ id: users.id, teamId: users.teamId, last: users.last })
        .from(users)
        .where(and(inArray(users.teamId, live), eq(users.kind, 'learner'), ne(users.isTest, true)))
    : [];
  const intake = live.length
    ? await db
        .select({ teamId: teamIntake.teamId, ghl: teamIntake.ghlSyncStatus, submittedAt: teamIntake.submittedAt })
        .from(teamIntake)
        .where(inArray(teamIntake.teamId, live))
    : [];
  return {
    testSends: {
      welcome: sends.some((s) => s.action === 'welcome.test_send'),
      week0: sends.some((s) => s.action === 'week0.test_send'),
    },
    plans: sold.length,
    teams: live.length,
    learners: people.length,
    intakeNotStarted: live.length - intake.length,
    intakeGhlFailed: intake.filter((r) => r.ghl === 'failed').length,
    signedIn: new Set(people.filter((u) => u.last !== null).map((u) => u.teamId)).size,
    intakeSubmitted: intake.filter((r) => r.submittedAt !== null).length,
    paidInFull: new Set(sold.filter((p) => p.status !== 'ended' && p.option === 'full').map((p) => p.teamId)).size,
  };
}
