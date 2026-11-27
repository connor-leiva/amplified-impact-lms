// R-5 audit (D-267): one rule for who counts in a cohort, and one for which cohort a viewer is in.
//
// WHO COUNTS (Connor, Nov 26, 2026): a team counts in a cohort when it holds a live cohort plan for that cohort (kind
// `cohort`, not ended), its account's owner is not a test account (D-202), and the cohort is the one the team is in
// (Q-23: the newest live cohort plan decides, so a team is in one cohort at a time). Its learners are the people on it
// of kind learner who are not test accounts. That is `apps/api/src/lib/cohort-facts.ts`'s rule, read once here.
//
// So an access group's member (Utah Life, D-148) is in no cohort, no team count, no learner count and no revenue figure:
// provisioning gives each a team of one with no plan row (`billing/access-groups.ts`). A group member who also bought
// the course is on a team with a live cohort plan and counts as that cohort's, as #255 had it. Nothing here names a
// group or a cohort.
//
// A comp (#282) is placed in its cohort like any seat, so its team counts here. It stays out of seats sold, paid in full
// and revenue, which read their own rules (`cohortSeatsSold`, `cohort-facts.ts`).
//
// WHERE IT IS READ. The API reads the rows (`apps/api/src/lib/cohort-roster.ts`), counts every cohort's `enrolled` from
// it (`db/codec.ts`), and hands staff the roster itself (`Db.roster`) and each access group's people outside every cohort
// (`Db.groups`, the People › Utah Life tab). A learner's snapshot carries neither. Without `Db.roster` (the fixture, the
// demo), `rosterLearners` and `rosterTeams` read the snapshot as every screen read it before, so nothing a fixture draws
// moves.
//
// Pure: no clock, no I/O.

import { DEFAULT_COHORT_ID } from './accelerator';
import { cohortOfPlans } from './cohort-run';
import type { CohortPlan } from './cohort-run';
import type { Db, Learner, Team } from './types';

// ================================================================================================
// The rows the rule reads
// ================================================================================================

/** A plan as the rule reads it: `plans.account_id`, `kind`, `status`, `cohort_id`, `created_at`. */
export interface RosterPlan extends CohortPlan {
  accountId: string;
}

/** An account: `accounts.id`, `team_id`, `owner_user_id`. */
export interface RosterAccount {
  id: string;
  teamId: string;
  ownerUserId: string | null;
}

/** A user: `users.id`, `team_id`, `kind`, `is_test`. */
export interface RosterUser {
  id: string;
  teamId: string | null;
  kind: string;
  isTest: boolean;
}

/** One cohort's roster: its teams and the learners on them, each in id order. */
export interface CohortRosterEntry {
  teams: string[];
  learners: string[];
}

/** Every cohort's roster, by cohort id. A cohort no team is in is absent. */
export type CohortRoster = Record<string, CohortRosterEntry>;

/** A plan that places a team in a cohort: kind `cohort`, not ended, naming its cohort. */
export const liveCohortPlan = (p: Pick<CohortPlan, 'kind' | 'status' | 'cohortId'>): boolean =>
  p.kind === 'cohort' && p.status !== 'ended' && !!p.cohortId;

/**
 * The cohort a team is in, by its plans: the newest live cohort plan's (Q-23), or null for a team that holds none (an
 * access group's member, a Team Plan or Agent Plan buyer, a skill buyer, a refunded seat).
 */
export function teamCohortOf(plans: readonly CohortPlan[]): string | null {
  return plans.some(liveCohortPlan) ? cohortOfPlans(plans) : null;
}

/** Every cohort's roster, from the rows. */
export function rosterOf(input: { plans: readonly RosterPlan[]; accounts: readonly RosterAccount[]; users: readonly RosterUser[] }): CohortRoster {
  const test = new Set(input.users.filter((u) => u.isTest).map((u) => u.id));
  const plansOf = new Map<string, RosterPlan[]>();
  for (const p of input.plans) plansOf.set(p.accountId, [...(plansOf.get(p.accountId) ?? []), p]);
  // A team's plans are those of its accounts whose owner is not a test account (`cohort-facts.ts`'s `notTest`).
  const byTeam = new Map<string, CohortPlan[]>();
  for (const a of input.accounts) {
    if (a.ownerUserId !== null && test.has(a.ownerUserId)) continue;
    byTeam.set(a.teamId, [...(byTeam.get(a.teamId) ?? []), ...(plansOf.get(a.id) ?? [])]);
  }
  const cohortOfTeam = new Map<string, string>();
  for (const [team, plans] of byTeam) {
    const c = teamCohortOf(plans);
    if (c !== null) cohortOfTeam.set(team, c);
  }
  const out: CohortRoster = {};
  const entry = (c: string): CohortRosterEntry => (out[c] ??= { teams: [], learners: [] });
  for (const [team, c] of cohortOfTeam) entry(c).teams.push(team);
  for (const u of input.users) {
    if (u.kind !== 'learner' || u.isTest || u.teamId === null) continue;
    const c = cohortOfTeam.get(u.teamId);
    if (c !== undefined) entry(c).learners.push(u.id);
  }
  for (const e of Object.values(out)) {
    e.teams.sort();
    e.learners.sort();
  }
  return out;
}

/** How many learners a cohort holds by the rule: `Cohort.enrolled`, and the learner Home's "N in your cohort". */
export const rosterCount = (roster: CohortRoster, cohortId: string): number => roster[cohortId]?.learners.length ?? 0;

// ================================================================================================
// Which cohort a viewer is in
// ================================================================================================

/**
 * The cohort a learner is in: their team's (`teamCohortOf`), else the cohort their row names (`users.cohort_id`), else
 * the default. The API reads it once (`viewerCohortId`) for the snapshot, the course, Join, Community and files.
 */
export function viewerCohortOf(plans: readonly CohortPlan[], stored: string | null | undefined): string {
  return teamCohortOf(plans) ?? (stored || DEFAULT_COHORT_ID);
}

// ================================================================================================
// The screens' reads of it
// ================================================================================================

/** A cohort's learners by the rule. Without `db.roster` (the fixture): its learners' rows, as before. */
export function rosterLearners(db: Pick<Db, 'users' | 'roster'>, cohortId: string): Learner[] {
  if (db.roster) {
    const ids = new Set(db.roster[cohortId]?.learners ?? []);
    return db.users.filter((u) => ids.has(u.id));
  }
  return db.users.filter((u) => u.cohortId === cohortId);
}

/**
 * A cohort's teams by the rule. Without `db.roster` (the fixture): every team with someone in the cohort, and every team
 * with no one modelled (the fixture's sample teams), as before.
 */
export function rosterTeams(db: Pick<Db, 'users' | 'teams' | 'roster'>, cohortId: string): Team[] {
  if (db.roster) {
    const ids = new Set(db.roster[cohortId]?.teams ?? []);
    return db.teams.filter((t) => ids.has(t.id));
  }
  return db.teams.filter((t) => {
    const people = db.users.filter((u) => u.teamId === t.id);
    return !people.length || people.some((u) => u.cohortId === cohortId);
  });
}

/** Every cohort's learners together, for a figure across cohorts (Plans & Upgrades). Without `db.roster`: everyone. */
export function rosterLearnersAll(db: Pick<Db, 'users' | 'roster'>): Learner[] {
  if (!db.roster) return db.users;
  const ids = new Set(Object.values(db.roster).flatMap((e) => e.learners));
  return db.users.filter((u) => ids.has(u.id));
}

/** Every cohort's teams together. Without `db.roster`: every team. */
export function rosterTeamsAll(db: Pick<Db, 'teams' | 'roster'>): Team[] {
  if (!db.roster) return db.teams;
  const ids = new Set(Object.values(db.roster).flatMap((e) => e.teams));
  return db.teams.filter((t) => ids.has(t.id));
}
