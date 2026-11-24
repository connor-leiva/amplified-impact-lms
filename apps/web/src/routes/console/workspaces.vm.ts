// /admin/workspaces and /admin/workspaces/:teamId on R2 (D-160 R2-1c; spec § 7.3, D-158's API): the
// words, filters, rows, facts and tabs of the mockup's `Workspaces` and `Workspace`, from what the API
// answers. Pure; Workspaces.tsx and Workspace.tsx only render it. Ported from #127's view-models
// (filters, the plan and status options, activity lines), redrawn as the mockup draws them.

import {
  CONSOLE_PLAN_LABELS,
  adminDate,
  adminStamp,
  initialsOf,
  isPlanKind,
  isPlanStatus,
  mrrOf,
  orderStatusOf,
  planLine,
  planStatusOf,
  seatBar,
  seatPct,
  userPath,
  userStatusOf,
  workspacePath,
} from '@ai/core';
import type {
  AdminStatus,
  SeatBar,
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceRow,
} from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';

export const NEVER = 'Never';
export const NONE = '—';

/** "Dec 10, 8:52 AM", or "Never". */
export const stampOrNever = (t: number | null): string => (t === null ? NEVER : adminStamp(t));

export interface Option {
  value: string;
  label: string;
}

export const WORKSPACES_COPY = {
  title: 'Workspaces',
  description: 'Every team and solo account. Open one for members, plan, usage, billing, and staff notes.',
  filter: 'Filter workspace or owner',
  plan: 'Plan',
  status: 'Status',
  columns: { name: 'Workspace', owner: 'Owner', plan: 'Plan', seats: 'Seats', status: 'Status', last: 'Last activity' },
  empty: { title: 'No workspaces yet', body: 'A workspace is created at checkout.' },
  open: 'Open workspace',
  masquerade: 'Masquerade as owner…',
} as const;

/** The plan filter, in the mockup's order. */
export const PLAN_OPTIONS: readonly Option[] = [
  { value: '', label: 'All plans' },
  ...(['agents', 'agent_plan', 'membership', 'cohort'] as const).map((k) => ({
    value: k,
    label: CONSOLE_PLAN_LABELS[k],
  })),
];

/** The status filter, in the mockup's order and words. */
export const STATUS_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any status' },
  ...(
    [
      ['active', 'Active'],
      ['trialing', 'Trialing'],
      ['past_due', 'Past due'],
      ['canceled', 'Canceled'],
    ] as const
  ).map(([value, label]) => ({ value, label })),
];

export interface WorkspaceFilterState {
  q: string;
  plan: string;
  status: string;
}

export const DEFAULT_WORKSPACE_FILTERS: WorkspaceFilterState = { q: '', plan: '', status: '' };

export const isDefaultWorkspaceFilters = (f: WorkspaceFilterState): boolean =>
  f.q.trim() === '' && f.plan === '' && f.status === '';

/** The filters as the API reads them: only what is set, the words trimmed to 100 characters. */
export function workspaceFiltersFor(f: WorkspaceFilterState): WorkspaceFilters {
  const out: WorkspaceFilters = {};
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if (isPlanKind(f.plan)) out.plan = f.plan;
  if (isPlanStatus(f.status)) out.status = f.status;
  return out;
}

export interface Seats {
  used: number;
  cap: number;
  text: string;
  pct: number;
  bar: SeatBar;
}

export const seatsOf = (used: number, cap: number, kind: PlanKind | null): Seats => ({
  used,
  cap,
  text: `${used} of ${cap}`,
  pct: seatPct(used, cap),
  bar: seatBar(used, cap, kind),
});

export interface WorkspaceRowVM {
  key: string;
  id: string;
  name: string;
  owner: string;
  plan: string;
  seats: Seats;
  status: AdminStatus;
  last: string;
  lastAt: number;
  href: string;
}

export const workspaceRowVM = (w: WorkspaceRow): WorkspaceRowVM => ({
  key: w.teamId,
  id: w.teamId,
  name: w.name,
  owner: w.ownerName ?? NONE,
  plan: planLine(w.planKind, w.seatCap),
  seats: seatsOf(w.seatsUsed, w.seatCap, w.planKind),
  status: planStatusOf(w.planStatus),
  last: stampOrNever(w.lastActivity),
  lastAt: w.lastActivity ?? 0,
  href: workspacePath(w.teamId),
});

// --- one workspace -------------------------------------------------------------------------------

export const WORKSPACE_TABS = ['members', 'plan', 'usage', 'billing', 'activity'] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export const WORKSPACE_COPY = {
  back: 'Workspaces',
  /** D-246: beside View intake, the team's intake as a PDF. */
  intakePdf: 'Download PDF',
  intakePdfFailed: 'Could not download the intake PDF.',
  masquerade: 'Masquerade as owner',
  masqueradeLater: 'Masquerade arrives with the Masquerade screen.',
  sections: 'Section',
  tabs: {
    members: 'Members',
    plan: 'Plan & entitlements',
    usage: 'Usage',
    billing: 'Billing',
    activity: 'Activity',
  } as Record<WorkspaceTab, string>,
  facts: { id: 'Workspace ID', plan: 'Plan', seats: 'Seats', owner: 'Owner', mrr: 'MRR', last: 'Last activity', welcome: 'Welcome' },
  members: {
    label: 'Members',
    name: 'Member',
    role: 'Role',
    status: 'Status',
    empty: 'No members in this workspace',
    open: 'Open user',
    masquerade: 'Masquerade…',
  },
  plan: {
    plan: 'Plan',
    status: 'Status',
    seats: 'Seats used',
    tier: 'Seat tier',
    groups: 'Access groups',
    renews: 'Renews',
  },
  tier: {
    team: 'Team Plan is sold in two sizes, 16 or 41 seats. Changing size is an upgrade request in Tiers & Upgrades.',
    cohort: 'Cohort cap is a product rule. View only.',
    other: 'Per agent',
  },
  oneTime: 'One-time purchase',
  billing: {
    customer: 'Stripe customer',
    subscription: 'Subscription',
    mrr: 'MRR',
    invoice: 'Last invoice',
    // D-163: Billing exists, so the mockup's way there is drawn (its Invoices tab).
    open: 'Open in Billing',
    to: '/admin/billing/invoices',
  },
  noActivity: 'No activity yet',
  notes: {
    title: 'Staff notes',
    sub: 'Internal. Never shown to the workspace.',
    field: 'Add a note',
    placeholder: 'What happened, what you told them',
    save: 'Save note',
    saved: 'Note saved',
  },
} as const;

export const workspaceTabOf = (raw: string | null): WorkspaceTab =>
  (WORKSPACE_TABS as readonly string[]).includes(raw ?? '') ? (raw as WorkspaceTab) : 'members';

/** One activity line, in words (#127's). */
/** A welcome line for the facts row, or null when this workspace is not in a cohort. */
export function welcomeWords(w: { status: string; at: number | null; cohortName: string } | null): string | null {
  if (!w) return null;
  if (w.status === 'sent' && w.at !== null) return `Sent ${adminStamp(w.at)}`;
  if (w.status === 'failed') return 'Failed';
  if (w.status === 'skipped') return 'Skipped';
  if (w.status === 'claimed') return 'Sending';
  return 'Not sent yet';
}

export function activityLine(a: WorkspaceActivity): string {
  switch (a.kind) {
    case 'order_created':
      return `${a.label} order started`;
    case 'order_paid':
      return `${a.label} order paid`;
    case 'payment_failed':
      return `${a.label} payment failed`;
    case 'order_refunded':
      return `${a.label} order refunded`;
    case 'membership_ended':
      return `${a.label} membership ended`;
    case 'plan_started':
      return `${a.label} plan added`;
    case 'member_joined':
      return `${a.label} joined`;
    case 'invite_sent':
      return `Owner invite sent to ${a.label}`;
    case 'welcome_sent':
      return `Cohort welcome sent for ${a.label}`;
  }
}

export interface MemberVM {
  key: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  status: AdminStatus;
  href: string;
}

export interface WorkspaceVM {
  title: string;
  status: AdminStatus;
  facts: { id: string; plan: string; seats: string; owner: string; mrr: string; last: string; welcome: string | null };
  members: MemberVM[];
  plan: {
    plan: string;
    status: AdminStatus;
    seats: Seats;
    tier: { text: string; locked: boolean };
    groups: string[];
    renews: string;
  };
  billing: { customer: string; subscription: string; mrr: string; invoice: { id: string; status: AdminStatus } | null };
  activity: { key: string; text: string; when: string }[];
}

export function workspaceVM(d: WorkspaceDetail): WorkspaceVM {
  const p = d.primaryPlan;
  const kind = p?.kind ?? null;
  const live = p ? (d.plans.find((x) => x.kind === p.kind && x.status === p.status) ?? null) : null;
  const lastActive = d.members.reduce<number | null>(
    (a, m) => (m.last !== null && (a === null || m.last > a) ? m.last : a),
    null,
  );
  const mrr = mrrOf(p ? { kind: p.kind, status: p.status as PlanStatus } : null, d.billing.orders);
  const latest = d.billing.orders[0] ?? null;
  const seats = seatsOf(d.seatsUsed, d.team.seats, kind);
  return {
    title: d.team.name,
    status: planStatusOf(p?.status ?? null),
    facts: {
      id: d.team.id,
      plan: planLine(kind, d.team.seats),
      seats: seats.text,
      owner: d.team.ownerName ?? NONE,
      mrr,
      last: stampOrNever(lastActive),
      welcome: welcomeWords(d.welcome),
    },
    members: d.members.map((m) => ({
      key: m.id,
      name: m.name,
      email: m.email,
      initials: initialsOf(m.name),
      role: m.role ?? NONE,
      status: userStatusOf(m.status),
      href: userPath(m.id),
    })),
    plan: {
      plan: planLine(kind, d.team.seats),
      status: planStatusOf(p?.status ?? null),
      seats,
      tier:
        kind === 'agents'
          ? { text: WORKSPACE_COPY.tier.team, locked: true }
          : kind === 'cohort'
            ? { text: WORKSPACE_COPY.tier.cohort, locked: true }
            : { text: WORKSPACE_COPY.tier.other, locked: false },
      groups: d.entitlements.groups.map((g) => g.name),
      renews: kind === 'cohort' ? WORKSPACE_COPY.oneTime : live?.paidThrough ? adminDate(live.paidThrough) : NONE,
    },
    billing: {
      customer: d.billing.stripeCustomerId ?? NONE,
      subscription: d.billing.subscriptionIds[0] ?? NONE,
      mrr,
      invoice: latest ? { id: latest.id, status: orderStatusOf(latest.status) } : null,
    },
    activity: d.activity.map((a, i) => ({
      key: `${a.kind}:${a.subject}:${i}`,
      text: activityLine(a),
      when: adminStamp(a.at),
    })),
  };
}
