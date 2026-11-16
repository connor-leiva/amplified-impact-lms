// The Admin Console's support records, PR 2 (D-158, spec §§ 7.3-7.5): workspaces, users, staff notes
// and search. Pure, like the rest of @ai/core: the API answers with these shapes and rules, and the
// web renders them, so the two cannot disagree on a label, a limit or the "near cap" line.
//
// A WORKSPACE is a `teams` row (D16): the route id is `teams.id`, joined to `accounts` by `team_id`,
// plus that account's plans and orders. A learner with no team is "Individual".
//
// PLAN LABELS. Spec § 7.3 inferred them; they are read here from the plans' own names in
// `offer.ts` (`PLAN_NAMES`, Connor's names of Nov 10, 2026), with the "Amplified " in front of every
// one of them dropped, so a renamed plan is renamed here too. The test pins the result to the spec's
// list: cohort → AI Accelerator, agents → Team Plan, agent_plan → Agent Plan, membership → Insiders,
// library → Skill Library.

import { PLAN_KINDS, PLAN_NAMES, PLAN_SETS, PLAN_STATUSES } from './offer';
import type { OrderOption, OrderStatus, PlanKind, PlanStatus } from './offer';
import type { StaffRole } from './types';
import { toCsv } from './console';

// ================================================================================================
// Plans
// ================================================================================================

/** A plan's short name in the Console: its name without "Amplified ". */
export const CONSOLE_PLAN_LABELS: Readonly<Record<PlanKind, string>> = Object.fromEntries(
  PLAN_KINDS.map((k) => [k, PLAN_NAMES[k].replace(/^Amplified /, '')]),
) as Record<PlanKind, string>;

export const isPlanKind = (v: unknown): v is PlanKind => typeof v === 'string' && (PLAN_KINDS as readonly string[]).includes(v);
export const isPlanStatus = (v: unknown): v is PlanStatus => typeof v === 'string' && (PLAN_STATUSES as readonly string[]).includes(v);

/** A plan's status as the Console prints it. */
export const PLAN_STATUS_LABELS: Readonly<Record<PlanStatus, string>> = {
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  ended: 'Ended',
};

/** An order's status as the Console prints it. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending: 'Pending',
  paid: 'Paid',
  trialing: 'Trialing',
  expired: 'Expired',
  failed: 'Failed',
  refunded: 'Refunded',
};

/** The statuses a plan is still running in. */
export const LIVE_PLAN_STATUSES: readonly PlanStatus[] = ['trialing', 'active', 'past_due'];

/**
 * Which plan names a workspace when its accounts hold more than one: a running plan before a lapsed
 * one, then the AI Accelerator, the Team Plan, the Agent Plan, Insiders and the retired library, then
 * the newest. An AI Accelerator buyer also holds Insiders (it rolls into it), and is an Accelerator
 * workspace; a lapsed Team Plan with a running Insiders is an Insiders one.
 */
export const PLAN_PRIORITY: readonly PlanKind[] = ['cohort', 'agents', 'agent_plan', 'membership', 'library'];

export interface PlanLike {
  kind: string;
  status: string;
  createdAt: number;
}

/** The plan that names a workspace (see `PLAN_PRIORITY`), or null when there is none. */
export function primaryPlan<T extends PlanLike>(plans: readonly T[]): T | null {
  const rank = (p: T): [number, number, number] => [
    (LIVE_PLAN_STATUSES as readonly string[]).includes(p.status) ? 0 : 1,
    (() => {
      const i = (PLAN_PRIORITY as readonly string[]).indexOf(p.kind);
      return i < 0 ? PLAN_PRIORITY.length : i;
    })(),
    -p.createdAt,
  ];
  let best: T | null = null;
  let bestRank: [number, number, number] | null = null;
  for (const p of plans) {
    const r = rank(p);
    if (!bestRank || r[0] < bestRank[0] || (r[0] === bestRank[0] && (r[1] < bestRank[1] || (r[1] === bestRank[1] && r[2] < bestRank[2])))) {
      best = p;
      bestRank = r;
    }
  }
  return best;
}

/** The skill sets a plan opens (D-079), as the Console names them: the Skill Library's own headings. */
export const SKILL_SET_LABELS: Readonly<Record<'owner_ops' | 'agent', string>> = {
  owner_ops: 'Owner and Operations Skills',
  agent: 'Agent Skills',
};

/** The sets a plan kind opens. */
export const planSets = (kind: PlanKind): readonly ('owner_ops' | 'agent')[] => PLAN_SETS[kind];

/**
 * Spec § 7.3: a workspace is "near cap" at 90% of its seats or more, when it has more than two. A
 * plan with two seats (the owner and one operator) is full by design, never "near cap".
 */
export const nearCap = (used: number, cap: number): boolean => cap > 2 && used / cap >= 0.9;

/** A learner with no team (D16). */
export const INDIVIDUAL_LABEL = 'Individual';

// ================================================================================================
// Workspaces (spec § 7.3)
// ================================================================================================

export interface WorkspaceRow {
  teamId: string;
  name: string;
  /** The team owner's user id: "Masquerade as owner…" starts from it (D-162 3b). */
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  planKind: PlanKind | null;
  planLabel: string | null;
  planStatus: PlanStatus | null;
  seatsUsed: number;
  seatCap: number;
  nearCap: boolean;
  /** The latest `users.last` among its members: daily (D-145). Epoch ms. */
  lastActivity: number | null;
}

export interface WorkspaceFilters {
  /** Words to find in the workspace's name or its owner's name or email. */
  q?: string;
  plan?: PlanKind;
  status?: PlanStatus;
}

export interface ConsolePlan {
  id: string;
  accountId: string;
  kind: PlanKind;
  label: string;
  option: string;
  seats: number;
  status: PlanStatus;
  cohortId: string | null;
  startsAt: number;
  paidThrough: number | null;
  liveUntil: number | null;
  minimumUntil: number | null;
  stripeSubscriptionId: string | null;
  orderId: string;
  createdAt: number;
}

export interface ConsoleOrder {
  id: string;
  plan: PlanKind;
  planLabel: string;
  option: OrderOption | string;
  origin: string;
  status: OrderStatus | string;
  email: string | null;
  accountId: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentsMade: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: number;
  paidAt: number | null;
  paymentFailedAt: number | null;
  refundedAt: number | null;
  membershipEndedAt: number | null;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string | null;
  status: string | null;
  joined: number | null;
  /** `users.last`, "Last active": daily (D-145). */
  last: number | null;
}

/** What a workspace or a user is entitled to: the plans' sets, the course, and access groups. */
export interface ConsoleEntitlements {
  /** The skill sets the running plans open. */
  sets: ('owner_ops' | 'agent')[];
  /** Whether a running plan is the AI Accelerator (whose course opens by D-153's rule, not this flag). */
  course: boolean;
  /** Access groups (D-148) a member is in, with how many of the members. */
  groups: { id: string; name: string; planKind: PlanKind; planLabel: string; members: number }[];
}

export type WorkspaceActivityKind =
  | 'order_created'
  | 'order_paid'
  | 'payment_failed'
  | 'order_refunded'
  | 'membership_ended'
  | 'plan_started'
  | 'member_joined'
  | 'invite_sent';

export interface WorkspaceActivity {
  at: number;
  kind: WorkspaceActivityKind;
  /** The order, plan or member it is about. */
  subject: string;
  /** The order's or plan's plan label, or the member's name. */
  label: string;
}

/** Spec § 7.3: activity is merged across its sources and capped at 50 items. */
export const WORKSPACE_ACTIVITY_MAX = 50;

export interface WorkspaceDetail {
  team: { id: string; name: string; seats: number; ownerId: string; ownerName: string | null; ownerEmail: string | null };
  account: {
    id: string;
    name: string;
    ownerEmail: string;
    crm: string | null;
    stripeCustomerId: string | null;
    createdAt: number;
    inviteSentAt: number | null;
  } | null;
  plans: ConsolePlan[];
  primaryPlan: { kind: PlanKind; label: string; status: PlanStatus } | null;
  seatsUsed: number;
  nearCap: boolean;
  members: WorkspaceMember[];
  entitlements: ConsoleEntitlements;
  /** From local tables only (`orders`, `plans`, `accounts`); Stripe's own reads are PR 4. */
  billing: {
    stripeCustomerId: string | null;
    subscriptionIds: string[];
    orders: ConsoleOrder[];
    lastPaidAt: number | null;
    lastFailedAt: number | null;
  };
  activity: WorkspaceActivity[];
}

/** Merge activity from every source, newest first, capped at 50. */
export function mergeActivity(items: readonly WorkspaceActivity[]): WorkspaceActivity[] {
  return [...items].sort((a, b) => b.at - a.at || a.kind.localeCompare(b.kind) || a.subject.localeCompare(b.subject)).slice(0, WORKSPACE_ACTIVITY_MAX);
}

// ================================================================================================
// Users (spec § 7.4)
// ================================================================================================

export const USER_KINDS = ['learner', 'staff'] as const;
export type UserKind = (typeof USER_KINDS)[number];
export const isUserKind = (v: unknown): v is UserKind => typeof v === 'string' && (USER_KINDS as readonly string[]).includes(v);

/** The learner roles a user can hold (`users.role`), as the Users filter offers them. */
export const LEARNER_ROLES = ['Team Owner', 'Operations Lead', 'Sales Agent', 'Agent'] as const;

export interface ConsoleUserRow {
  id: string;
  name: string;
  email: string;
  kind: UserKind;
  /** The learner's role, or the staff member's. */
  role: string | null;
  teamId: string | null;
  /** The team's name, or "Individual" for a learner with no team; null for staff. */
  workspace: string | null;
  status: string | null;
  /** `users.last`, "Last active": daily (D-145). */
  lastActive: number | null;
}

export interface UserFilters {
  /** Words to find in the name or email, or a user id exactly. */
  q?: string;
  /** A learner role or a staff role. */
  role?: string;
  kind?: UserKind;
  /**
   * Exactly these users: the list's selection, for the export's "Export selected" (D-160 R2-1c). 1 to
   * 500 ids; the list itself never sends it.
   */
  ids?: string[];
}

/** The most users "Export selected" sends. */
export const USER_IDS_MAX = 500;

/** Existence only (spec § 7.4): never the hash, never the Google subject. */
export interface ConsoleIdentity {
  emailVerifiedAt: number | null;
  hasPassword: boolean;
  hasGoogle: boolean;
}

export interface ConsoleProgress {
  moduleId: string;
  moduleName: string;
  steps: number;
  builtAt: number | null;
  deployedAt: number | null;
}

export interface ConsoleUserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    kind: UserKind;
    role: string | null;
    staffRole: StaffRole | null;
    tier: string | null;
    teamId: string | null;
    workspace: string | null;
    cohortId: string | null;
    status: string | null;
    joined: number | null;
    lastActive: number | null;
  };
  identity: ConsoleIdentity;
  orders: ConsoleOrder[];
  progress: ConsoleProgress[];
  entitlements: ConsoleEntitlements;
}

/** The users export's columns. No hash, no token: existence flags only. Times are ISO 8601 UTC. */
export const USERS_CSV_HEADER = [
  'id',
  'name',
  'email',
  'kind',
  'role',
  'team_id',
  'workspace',
  'status',
  'joined',
  'last_active',
] as const;

const iso = (t: number | null): string | null => (t === null ? null : new Date(t).toISOString());

export interface UserExportRow extends ConsoleUserRow {
  joined: number | null;
}

export const userCsvCells = (r: UserExportRow): unknown[] => [r.id, r.name, r.email, r.kind, r.role, r.teamId, r.workspace, r.status, iso(r.joined), iso(r.lastActive)];

export const usersCsv = (rows: readonly UserExportRow[]): string => toCsv([[...USERS_CSV_HEADER], ...rows.map(userCsvCells)]);

// ================================================================================================
// Staff notes (spec § 7.3, migration 0016)
// ================================================================================================

export const STAFF_NOTE_TARGETS = ['workspace', 'user'] as const;
export type StaffNoteTarget = (typeof STAFF_NOTE_TARGETS)[number];
export const isStaffNoteTarget = (v: unknown): v is StaffNoteTarget =>
  typeof v === 'string' && (STAFF_NOTE_TARGETS as readonly string[]).includes(v);

/** Spec § 7.3: a note is 1 to 2,000 characters. */
export const NOTE_BODY_MAX = 2000;

/**
 * A reason staff give for a change (deleting a note): 10 to 500 characters, the same bounds spec § 6
 * and § 7.6 give masquerade and billing reasons.
 */
export const CONSOLE_REASON_MIN = 10;
export const CONSOLE_REASON_MAX = 500;

/** The note's text with its ends trimmed, or null when it is empty or too long. */
export function cleanNoteBody(body: unknown): string | null {
  if (typeof body !== 'string') return null;
  const t = body.trim();
  return t.length >= 1 && t.length <= NOTE_BODY_MAX ? t : null;
}

/** The reason trimmed, or null when it is under 10 or over 500 characters. */
export function cleanReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const t = reason.trim();
  return t.length >= CONSOLE_REASON_MIN && t.length <= CONSOLE_REASON_MAX ? t : null;
}

export interface StaffNote {
  id: string;
  targetType: StaffNoteTarget;
  targetId: string;
  author: { id: string; name: string | null };
  body: string;
  createdAt: number;
}

// ================================================================================================
// Search (spec § 7.5)
// ================================================================================================

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 100;
/** Each group shows five at most. */
export const SEARCH_GROUP_MAX = 5;

/** The query trimmed, or null when it is under 2 or over 100 characters. */
export function cleanSearch(q: unknown): string | null {
  if (typeof q !== 'string') return null;
  const t = q.trim();
  return t.length >= SEARCH_MIN && t.length <= SEARCH_MAX ? t : null;
}

/**
 * A LIKE pattern that finds `s` anywhere, with LIKE's own characters (`%`, `_` and the escape `\`)
 * taken literally. The query stays a bound parameter; this only makes its wildcards plain text.
 */
export const containsPattern = (s: string): string => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const SEARCH_GROUPS = ['users', 'workspaces', 'orders', 'skills'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export interface SearchHit {
  id: string;
  label: string;
  detail: string;
  /** Where it opens in the Console, or null when nothing there shows it yet. */
  href: string | null;
}

export type SearchResults = Record<SearchGroup, SearchHit[]>;

/** The Console paths a record opens at. */
export const workspacePath = (teamId: string): string => `/admin/workspaces/${encodeURIComponent(teamId)}`;
export const userPath = (userId: string): string => `/admin/users/${encodeURIComponent(userId)}`;
