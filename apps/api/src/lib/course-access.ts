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

import { and, eq, inArray } from 'drizzle-orm';
import { DEFAULT_COHORT_ID, acceleratorOpen, acceleratorPaused, acceleratorUpcoming, cohortOpensAt } from '@ai/core/accelerator';
import { cohortOfPlans } from '@ai/core/cohort-run';
import type { CohortPlan } from '@ai/core/cohort-run';
import type { AcceleratorPlan, CourseRoster } from '@ai/core/accelerator';
import { courseEntry, courseUpcoming, liveCoursePlan } from '@ai/core/release';
import type { CourseEntry } from '@ai/core/release';
import { week0Roster } from '@ai/core/week0-open';
import type { Week0Roster } from '@ai/core/week0-open';
import type { Cohort, ViewerAccess } from '@ai/core';
import type { Database } from '../db/client';
import { accounts, cohorts, plans, sessions, users } from '../db/schema';

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

/**
 * R-5 (D-254): which cohort this viewer is in: the cohort of their team's newest `cohort` plan that has not ended
 * (`cohortOfPlans`), else `DEFAULT_COHORT_ID`. Staff, and a learner with no team or no such plan, get the default,
 * where it is inert: their plan is the gate. `users.cohort_id` is kept in step with it for a cohort team.
 */
export async function viewerCohortId(db: Reader, userId: string): Promise<string> {
  const [user] = await db.select({ teamId: users.teamId, kind: users.kind }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.kind !== 'learner' || !user.teamId) return DEFAULT_COHORT_ID;
  const accts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, user.teamId));
  if (!accts.length) return DEFAULT_COHORT_ID;
  const rows = await db
    .select({ kind: plans.kind, status: plans.status, cohortId: plans.cohortId, createdAt: plans.createdAt })
    .from(plans)
    .where(inArray(plans.accountId, accts.map((a) => a.id)));
  return cohortOfPlans(rows.map((r): CohortPlan => ({ kind: r.kind, status: r.status, cohortId: r.cohortId, createdAt: Number(r.createdAt) })));
}

/** R-5 (D-254): when the course opens for a cohort's plans (`cohortOpensAt`): December's is D-153's instant. */
export async function opensAtOf(db: Reader, cohortId: string): Promise<number> {
  if (cohortId === DEFAULT_COHORT_ID) return cohortOpensAt(cohortId, []);
  const rows = await db
    .select({ cohortId: sessions.cohortId, start: sessions.start, kind: sessions.kind })
    .from(sessions)
    .where(and(eq(sessions.cohortId, cohortId), eq(sessions.kind, 'live_build')));
  return cohortOpensAt(
    cohortId,
    rows.map((r) => ({ cohortId: r.cohortId, start: Number(r.start), kind: 'live_build' as const })),
  );
}

/** The learner's plans and when the course opens for their cohort. */
async function plansAndOpening(db: Reader, userId: string): Promise<{ plans: AcceleratorPlan[]; cohortId: string; opensAt: number }> {
  const [found, cohortId] = await Promise.all([plansForLearner(db, userId), viewerCohortId(db, userId)]);
  return { plans: found, cohortId, opensAt: await opensAtOf(db, cohortId) };
}

/** Whether the course is closed to this learner only until a payment goes through (D-143). */
export async function acceleratorPausedFor(db: Reader, userId: string, now: number): Promise<boolean> {
  const { plans: found, opensAt } = await plansAndOpening(db, userId);
  return acceleratorPaused(found, now, opensAt);
}

/** D-153: when the course opens for a learner whose account bought it but cannot open it yet, or null. */
export async function acceleratorUpcomingFor(db: Reader, userId: string, now: number): Promise<number | null> {
  const { plans: found, opensAt } = await plansAndOpening(db, userId);
  const at = acceleratorUpcoming(found, now, opensAt);
  return at !== null && Number.isFinite(at) ? at : null;
}

/** Whether this learner's account holds a plan that opens the course right now. */
export async function acceleratorAccess(db: Reader, userId: string, now: number): Promise<boolean> {
  const { plans: found, opensAt } = await plansAndOpening(db, userId);
  return acceleratorOpen(found, now, opensAt);
}

/**
 * Who is in the course at a given instant, for the scheduler (D-110): the AI Accelerator's session emails go to them
 * only. H-14 (D-248): asked at the session (its start, for a reminder about one that hasn't begun), not at the tick, so
 * the reminders before the first live build reach the buyers whose course opens with it. Three reads, not one per
 * learner, because the scheduler asks about everyone at once.
 */
export async function acceleratorRoster(db: Reader): Promise<CourseRoster> {
  const { byTeam, teamOf, cohortOfTeam } = await rosterInputs(db);
  // R-5 (D-254): each learner's course opens when their own cohort's does (`cohortOpensAt`); December's is the
  // constant, so `courseRoster`'s single instant is what every team without another cohort still reads.
  const builds = await db.select({ cohortId: sessions.cohortId, start: sessions.start }).from(sessions).where(eq(sessions.kind, 'live_build'));
  const opensAt = new Map<string, number>();
  const openingOf = (cohortId: string): number => {
    let at = opensAt.get(cohortId);
    if (at === undefined) {
      at = cohortOpensAt(
        cohortId,
        builds.map((b) => ({ cohortId: b.cohortId, start: Number(b.start), kind: 'live_build' as const })),
      );
      opensAt.set(cohortId, at);
    }
    return at;
  };
  return {
    has: (userId, at) => {
      const team = teamOf.get(userId);
      const found = team ? byTeam.get(team) : undefined;
      return !!found && acceleratorOpen(found, at, openingOf(cohortOfTeam.get(team!) ?? DEFAULT_COHORT_ID));
    },
  };
}

/**
 * The Week 0 Is Open email's audience test (`week0Roster`): `courseRoster`'s own lookup and plan rule, read from the
 * same three tables, without the course's opening date, which comes after the preview the email marks.
 */
export async function week0RosterOf(db: Reader): Promise<Week0Roster> {
  const { byTeam, teamOf } = await rosterInputs(db);
  return week0Roster(byTeam, teamOf);
}

/** What `courseRoster` reads: every team's plans (through its accounts), and each learner's team. */
async function rosterInputs(
  db: Reader,
): Promise<{ byTeam: Map<string, AcceleratorPlan[]>; teamOf: Map<string, string | null>; cohortOfTeam: Map<string, string> }> {
  const accts = await db.select({ id: accounts.id, teamId: accounts.teamId }).from(accounts);
  const rows = accts.length
    ? await db
        .select({ accountId: plans.accountId, kind: plans.kind, option: plans.option, status: plans.status, startsAt: plans.startsAt, cohortId: plans.cohortId, createdAt: plans.createdAt })
        .from(plans)
    : [];
  const byTeam = new Map<string, AcceleratorPlan[]>();
  const cohortPlans = new Map<string, CohortPlan[]>();
  for (const a of accts) {
    const list = byTeam.get(a.teamId) ?? [];
    const mine = cohortPlans.get(a.teamId) ?? [];
    for (const p of rows) {
      if (p.accountId !== a.id) continue;
      list.push({ kind: p.kind, option: p.option, status: p.status, startsAt: p.startsAt === null ? null : Number(p.startsAt) });
      mine.push({ kind: p.kind, status: p.status, cohortId: p.cohortId, createdAt: Number(p.createdAt) });
    }
    byTeam.set(a.teamId, list);
    cohortPlans.set(a.teamId, mine);
  }
  const learners = byTeam.size ? await db.select({ id: users.id, teamId: users.teamId }).from(users).where(eq(users.kind, 'learner')) : [];
  const cohortOfTeam = new Map([...cohortPlans].map(([team, list]) => [team, cohortOfPlans(list)]));
  return { byTeam, teamOf: new Map(learners.map((u) => [u.id, u.teamId])), cohortOfTeam };
}

/** Every learner whose account's plans open the course at `now`: the roster, read at one instant. */
export async function acceleratorLearnerIds(db: Reader, now: number): Promise<Set<string>> {
  const roster = await acceleratorRoster(db);
  const learners = await db.select({ id: users.id }).from(users).where(eq(users.kind, 'learner'));
  return new Set(learners.filter((u) => roster.has(u.id, now)).map((u) => u.id));
}

// --- D-175: the course's release plan, from data -------------------------------------------------

/** A cohort's release plan as gating reads it: when the pre-launch preview opens, or nothing (none). */
export async function releaseOf(db: Reader, cohortId: string = DEFAULT_COHORT_ID): Promise<Pick<Cohort, 'previewOpensAt'>> {
  const [row] = await db.select({ previewOpensAt: cohorts.previewOpensAt }).from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
  return row?.previewOpensAt === null || row?.previewOpensAt === undefined ? {} : { previewOpensAt: Number(row.previewOpensAt) };
}

/**
 * D-202: early access is a test account's own flag. It does nothing unless `is_test` is set too,
 * and nothing a learner can write sets either column.
 */
export async function earlyAccessOf(db: Reader, userId: string): Promise<boolean> {
  const [row] = await db.select({ isTest: users.isTest, earlyAccess: users.earlyAccess }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.isTest === true && row.earlyAccess === true;
}

/** Whether this learner may enter the course at `now`, and whether that is the pre-launch preview. */
export async function courseEntryFor(db: Reader, userId: string, now: number): Promise<CourseEntry> {
  const { plans: found, cohortId, opensAt } = await plansAndOpening(db, userId);
  const release = await releaseOf(db, cohortId);
  // Before the preview and before the course's own opening, a test account with early access is
  // already in, on the same live plan a buyer holds. Everyone else keeps the dates.
  if ((await earlyAccessOf(db, userId)) && liveCoursePlan(found)) return { open: true, preview: false, early: true };
  return courseEntry(found, now, release, opensAt);
}

/** When the course (or its preview) opens for a buyer who can't enter it yet, or null. */
export async function courseUpcomingFor(db: Reader, userId: string, now: number): Promise<number | null> {
  const { plans: found, cohortId, opensAt } = await plansAndOpening(db, userId);
  return courseUpcoming(found, now, await releaseOf(db, cohortId), opensAt);
}

/** What `scopeSnapshot` needs to know about this learner and the course at `now`. */
export async function viewerAccessFor(db: Reader, userId: string, now: number): Promise<ViewerAccess> {
  const entry = await courseEntryFor(db, userId, now);
  return { accelerator: entry.open, at: now, preview: entry.preview, ...(entry.early ? { early: true } : {}) };
}
