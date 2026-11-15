// /admin/workspaces and /admin/workspaces/:teamId (D-158, spec § 7.3): the words, filters, rows and
// tabs of the workspace list and one workspace. Pure; Workspaces.tsx and Workspace.tsx only render it.
//
// The record's tabs are the spec's five that PR 2 can fill from local data: Members, Plan &
// Entitlements, Billing, Activity and Staff Notes. The prototype's Usage tab is PR 7, and its
// "Masquerade as owner" and "Delete workspace" are PR 3 and never (D12).

import { isPlanKind, isPlanStatus } from '@ai/core';
import type { WorkspaceDetail, WorkspaceFilters, WorkspaceRow } from '@ai/core';
import {
  NEAR_CAP_BADGE,
  RECORD_COPY,
  activityVM,
  dayOf,
  entitlementPairs,
  memberStatusBadge,
  orderRowVM,
  planRowVM,
  planStatusBadge,
  whenOf,
} from './records.vm';
import type { Badge, Pair } from './records.vm';

export const WORKSPACES_COPY = {
  title: 'Workspaces',
  description: 'Every team and solo account. Open one for members, plan, billing, activity, and staff notes.',
  search: 'Search Workspace or Owner',
  caption: 'Workspaces',
  empty: 'No workspaces yet.',
  columns: { name: 'Workspace', owner: 'Owner', plan: 'Plan', seats: 'Seats', status: 'Status', last: 'Last Activity' },
  open: (name: string) => `Open ${name}`,
} as const;

// --- the list ------------------------------------------------------------------------------------

export interface WorkspaceFilterState {
  q: string;
  plan: string;
  status: string;
}

export const DEFAULT_WORKSPACE_FILTERS: WorkspaceFilterState = { q: '', plan: '', status: '' };

export const isDefaultWorkspaceFilters = (f: WorkspaceFilterState): boolean => f.q.trim() === '' && f.plan === '' && f.status === '';

/** The filters as the API reads them: only what is set, the words trimmed to 100 characters. */
export function workspaceFiltersFor(f: WorkspaceFilterState): WorkspaceFilters {
  const out: WorkspaceFilters = {};
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if (isPlanKind(f.plan)) out.plan = f.plan;
  if (isPlanStatus(f.status)) out.status = f.status;
  return out;
}

export interface WorkspaceRowVM {
  key: string;
  name: string;
  owner: string;
  ownerEmail: string;
  plan: string;
  seats: string;
  nearCap: Badge | null;
  status: Badge;
  last: string;
}

export const workspaceRowVM = (w: WorkspaceRow): WorkspaceRowVM => ({
  key: w.teamId,
  name: w.name,
  owner: w.ownerName ?? RECORD_COPY.none,
  ownerEmail: w.ownerEmail ?? '',
  plan: w.planLabel ?? RECORD_COPY.noPlan,
  seats: `${w.seatsUsed}/${w.seatCap}`,
  nearCap: w.nearCap ? NEAR_CAP_BADGE : null,
  status: planStatusBadge(w.planStatus),
  last: dayOf(w.lastActivity),
});

// --- one workspace -------------------------------------------------------------------------------

export const WORKSPACE_TABS = [
  { id: 'members', label: 'Members' },
  { id: 'plan', label: 'Plan & Entitlements' },
  { id: 'billing', label: 'Billing' },
  { id: 'activity', label: 'Activity' },
  { id: 'notes', label: 'Staff Notes' },
] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]['id'];

/** The tab named in the address (`?tab=`), or Members. */
export const workspaceTabOf = (raw: string | null): WorkspaceTab => (WORKSPACE_TABS.find((t) => t.id === raw)?.id ?? 'members');

export const WORKSPACE_COPY = {
  tabsLabel: 'Workspace sections',
  members: { caption: 'Members', empty: 'No members in this workspace.', columns: { name: 'Member', role: 'Role', last: 'Last Active', status: 'Status' } },
  plansCaption: 'Plans',
  noPlans: 'No plans on this workspace.',
  billingNote: 'From this app’s own order records, not a live read of Stripe.',
  ordersCaption: 'Orders',
  noOrders: 'No orders for this workspace.',
  noActivity: 'No activity yet.',
  activityCaption: 'Activity',
  notesInternal: 'Internal. Never shown to the workspace.',
  openMember: (name: string) => `Open ${name}`,
} as const;

export interface WorkspaceVM {
  title: string;
  id: string;
  status: Badge;
  plan: string;
  seats: string;
  nearCap: Badge | null;
  members: { key: string; name: string; role: string; last: string; status: Badge }[];
  planPairs: Pair[];
  plans: ReturnType<typeof planRowVM>[];
  billingPairs: Pair[];
  orders: ReturnType<typeof orderRowVM>[];
  activity: ReturnType<typeof activityVM>;
}

export function workspaceVM(d: WorkspaceDetail): WorkspaceVM {
  const seats = `${d.seatsUsed}/${d.team.seats} seats`;
  return {
    title: d.team.name,
    id: d.team.id,
    status: planStatusBadge(d.primaryPlan?.status ?? null),
    plan: d.primaryPlan?.label ?? RECORD_COPY.noPlan,
    seats,
    nearCap: d.nearCap ? NEAR_CAP_BADGE : null,
    members: d.members.map((m) => ({ key: m.id, name: m.name, role: m.role ?? RECORD_COPY.none, last: dayOf(m.last), status: memberStatusBadge(m.status) })),
    planPairs: [
      { label: 'Plan', value: d.primaryPlan?.label ?? RECORD_COPY.noPlan },
      { label: 'Owner', value: d.team.ownerName ? `${d.team.ownerName}${d.team.ownerEmail ? ` (${d.team.ownerEmail})` : ''}` : RECORD_COPY.none },
      { label: 'Seats Used', value: `${d.seatsUsed} of ${d.team.seats}` },
      ...entitlementPairs(d.entitlements),
    ],
    plans: d.plans.map(planRowVM),
    billingPairs: [
      { label: 'Stripe Customer', value: d.billing.stripeCustomerId ?? RECORD_COPY.none, mono: d.billing.stripeCustomerId !== null },
      { label: 'Subscriptions', value: d.billing.subscriptionIds.length ? d.billing.subscriptionIds.join(', ') : RECORD_COPY.none, mono: d.billing.subscriptionIds.length > 0 },
      { label: 'Last Paid', value: whenOf(d.billing.lastPaidAt) },
      { label: 'Last Failed Payment', value: whenOf(d.billing.lastFailedAt) },
      { label: 'Account Created', value: d.account ? whenOf(d.account.createdAt) : RECORD_COPY.none },
    ],
    orders: d.billing.orders.map(orderRowVM),
    activity: activityVM(d.activity),
  };
}
