// R-5 Phase 7 (D-268): People. How a person got in, which team is an access group's team of one, and what a team pays.
// PURE: no clock, no I/O. The API's SQL picks the same plan by the same rule (`apps/api/src/console/records.ts`), and
// `apps/api/test/people.test.ts` holds the two equal.
//
// GOT IN THROUGH (spec Phase 7): the Console's label for the primary plan of the person's team (`primaryPlan`'s
// ranking: a live plan first, then `PLAN_PRIORITY`, then the newest; `CONSOLE_PLAN_LABELS`), else "Skill buyer" (a
// `skill_purchases` row of theirs and no plan), else the name of the access group their address is in (D-148's rule,
// `inGroup`), else "No plan". Each person is counted once, under the first of those that applies, so the chips add up
// to everyone. The chips are built from what exists: one per answer some learner has.
//
// AN ACCESS GROUP'S TEAM OF ONE (spec Phase 7: "A team of one made for an access-group member is left out"):
// `createGroupMember` gives each agent a team of one with no account plan (D-148), because the learner app expects a
// team. Such a team is left out of People › Teams. A group member who bought something is on a team with a plan row and
// is listed like any buyer, as D-267's roster rule counts them.

import { CONSOLE_PLAN_LABELS, PLAN_PRIORITY } from './console-support';
import type { PlanKind } from './offer';
import { usdWhole } from './console-view';

export const GOT_IN_COPY = {
  skill: 'Skill buyer',
  /** The chip's word, plural, as the mockup's `AUD` has it ("Skill buyers"). */
  skills: 'Skill buyers',
  none: 'No plan',
  everyone: 'Everyone',
} as const;

export type GotInKind = 'plan' | 'skill' | 'group' | 'none';

/** How a person got in: a stable key (`plan:cohort`, `skill`, `group:utah-life`, `none`), its label and its kind. */
export interface GotIn {
  key: string;
  kind: GotInKind;
  label: string;
}

export interface GotInInput {
  /** The kind of the team's primary plan (any status), or null for a team that never held one. */
  planKind: PlanKind | null;
  /** A `skill_purchases` row of theirs. */
  skillBuyer: boolean;
  /** The first access group (by name) their address is in, or null. */
  group: { id: string; name: string } | null;
}

/** How a person got in, the first of plan, skill, group that applies. */
export function gotInOf(i: GotInInput): GotIn {
  if (i.planKind) return { key: `plan:${i.planKind}`, kind: 'plan', label: CONSOLE_PLAN_LABELS[i.planKind] };
  if (i.skillBuyer) return { key: 'skill', kind: 'skill', label: GOT_IN_COPY.skill };
  if (i.group) return { key: `group:${i.group.id}`, kind: 'group', label: i.group.name };
  return { key: 'none', kind: 'none', label: GOT_IN_COPY.none };
}

/** What a filter key names, or null for a key that is none of the four shapes. */
export function parseGotIn(key: string): { kind: GotInKind; id?: string } | null {
  if (key === 'skill' || key === 'none') return { kind: key };
  const m = /^(plan|group):([a-z0-9_-]{1,64})$/.exec(key);
  if (!m) return null;
  if (m[1] === 'plan' && !(PLAN_PRIORITY as readonly string[]).includes(m[2]!)) return null;
  return { kind: m[1] as 'plan' | 'group', id: m[2]! };
}

/** One chip: an answer some learner has, and how many have it. */
export interface GotInCount {
  key: string;
  kind: GotInKind;
  label: string;
  count: number;
}

/** The chips' order: plans by `PLAN_PRIORITY`, then skill buyers, then each group by name, then no plan. */
export function sortGotIn<T extends { key: string; kind: GotInKind; label: string }>(xs: readonly T[]): T[] {
  const rank = (x: T): number => {
    if (x.kind === 'plan') return (PLAN_PRIORITY as readonly string[]).indexOf(x.key.slice(5));
    if (x.kind === 'skill') return 100;
    if (x.kind === 'group') return 200;
    return 300;
  };
  return [...xs].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
}

/** A chip's label: the column's, with "Skill buyers" for the skill chip (the mockup's `AUD`). */
export const gotInChipLabel = (g: Pick<GotIn, 'kind' | 'label'>): string => (g.kind === 'skill' ? GOT_IN_COPY.skills : g.label);

/**
 * An access group's team of one: no plan row on any of its accounts, one member, and that member's address in an access
 * group. Left out of People › Teams.
 */
export function groupTeamOfOne(t: { plans: number; members: number; memberInGroup: boolean }): boolean {
  return t.plans === 0 && t.members === 1 && t.memberInGroup;
}

/** What a team pays, as People › Teams' Paying column says it (the mockup's `TEAMS2.money`). */
export interface PayingInput {
  kind: PlanKind | null;
  status: string | null;
  option: string | null;
  /** The plan's order: a comp, and how many of a two-payment order's payments are made. */
  origin: string | null;
  paymentsMade: number | null;
  /** A subscription's latest order's amount, in cents. */
  amountTotal: number | null;
}

export const PAYING_COPY = {
  full: 'Paid in full',
  comp: 'Comped',
  twoOf: (n: number) => `${n} of 2 payments`,
  month: (usd: string) => `${usd} a month`,
  zero: '$0',
  none: 'Nothing',
} as const;

/**
 * "Paid in full", "1 of 2 payments", "Comped" for a cohort seat; "$1,495 a month" for a subscription that is billing
 * (active or past due), from its latest order's amount; "$0" for one that is not; "Nothing" for a team with no plan.
 */
export function payingOf(p: PayingInput): string {
  if (!p.kind) return PAYING_COPY.none;
  if (p.origin === 'comp') return PAYING_COPY.comp;
  if (p.kind === 'cohort') {
    if (p.option === 'two_pay' && (p.paymentsMade ?? 0) < 2) return PAYING_COPY.twoOf(p.paymentsMade ?? 0);
    return PAYING_COPY.full;
  }
  if (p.status !== 'active' && p.status !== 'past_due') return PAYING_COPY.zero;
  return p.amountTotal !== null ? PAYING_COPY.month(usdWhole(p.amountTotal)) : PAYING_COPY.zero;
}

// ================================================================================================
// People › an access group's tab (Utah Life): what the API answers
// ================================================================================================

/** One of the group's agents, as the Agents table lists them. Times are epoch ms. */
export interface AccessGroupAgent {
  userId: string;
  /** Their name, or empty for a self-serve sign-up who has given none. */
  name: string;
  email: string;
  /** When they first proved their address (`email_verifications`), their first sign-in; null for never. */
  firstSignIn: number | null;
  last: number | null;
  /** Still `invited`: they haven't followed their link. */
  invited: boolean;
  /** Their guide views (`usage_daily` `guide_view`), the skills they opened. */
  skillsOpened: number;
}

/**
 * R-5 Phase 7 (D-268): People › an access group's tab (`GET /api/console/groups/:groupId`): its record, its agents (the
 * learners in it by their address who are in no cohort, D-267's rule) and what they opened most in the last 30 days.
 */
export interface AccessGroupDetail {
  id: string;
  name: string;
  /** The plan it grants, as `access_groups.plan` holds it. */
  plan: string;
  emailDomain: string | null;
  createdAt: number;
  expiresAt: number | null;
  agents: AccessGroupAgent[];
  /** The skills its agents opened most in the last 30 days, most first, four at most (`skill_opens_daily`). */
  mostOpened: { skillId: string; title: string; count: number }[];
}

/** The tab's routes: its record, its two writes (Owner and Admin: `access_group.write`) and its export. */
export const ACCESS_GROUP_PATHS = {
  detail: '/api/console/groups/:groupId',
  addAddress: '/api/console/groups/:groupId/addresses',
  end: '/api/console/groups/:groupId/end',
  export: '/api/console/groups/:groupId/export',
} as const;
