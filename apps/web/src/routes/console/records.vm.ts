// What the Console's support records share (D-158): status badges, the plan filter's options, the
// order and activity lines, the entitlement pairs, and the two record screens' common words. Pure;
// every time goes through `fmt.*` (the viewer's zone, then the program zone), and every state is a
// word and a glyph on a status token, never a colour alone.

import { CONSOLE_PLAN_LABELS, ORDER_STATUS_LABELS, PLAN_PRIORITY, PLAN_STATUS_LABELS, SKILL_SET_LABELS, fmt } from '@ai/core';
import type { ConsoleEntitlements, ConsoleOrder, ConsolePlan, WorkspaceActivity } from '@ai/core';
import type { PlanStatus } from '@ai/core/offer';
import type { TokenGlyph, TokenTone } from '../../components/StatusToken';
import type { ConsoleFailure } from '../../data/console';

export interface Badge {
  label: string;
  tone: TokenTone;
  icon: TokenGlyph;
}

export interface Option {
  value: string;
  label: string;
}

export const RECORD_COPY = {
  none: 'None',
  never: 'Never',
  noPlan: 'No Plan',
  nearCap: 'Near Cap',
  loadMore: 'Load More',
  loadingMore: 'Loading…',
  emptyFiltered: 'Nothing matches these filters.',
  clear: 'Clear Filters',
  yes: 'Yes',
  no: 'No',
  unrecorded: 'Not recorded',
  audited: 'This action is audit-logged.',
} as const;

const PLAN_STATUS_BADGES: Record<PlanStatus, Omit<Badge, 'label'>> = {
  active: { tone: 'success', icon: 'check' },
  trialing: { tone: 'progress', icon: 'ring' },
  past_due: { tone: 'attention', icon: 'alert' },
  canceled: { tone: 'neutral', icon: 'minus' },
  ended: { tone: 'neutral', icon: 'pause' },
};

/** A plan's status as a badge; no plan at all is its own. */
export function planStatusBadge(status: PlanStatus | null): Badge {
  if (status === null) return { label: RECORD_COPY.noPlan, tone: 'neutral', icon: 'minus' };
  return { label: PLAN_STATUS_LABELS[status], ...PLAN_STATUS_BADGES[status] };
}

const ORDER_BADGES: Record<string, Omit<Badge, 'label'>> = {
  paid: { tone: 'success', icon: 'check' },
  trialing: { tone: 'progress', icon: 'ring' },
  pending: { tone: 'neutral', icon: 'clock' },
  expired: { tone: 'neutral', icon: 'minus' },
  failed: { tone: 'attention', icon: 'alert' },
  refunded: { tone: 'neutral', icon: 'pause' },
};

export function orderStatusBadge(status: string): Badge {
  const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status;
  return { label, ...(ORDER_BADGES[status] ?? { tone: 'neutral', icon: 'dot' }) };
}

/** A learner's account status: active, or invited and not yet signed in. */
export function memberStatusBadge(status: string | null): Badge {
  if (status === 'active') return { label: 'Active', tone: 'success', icon: 'check' };
  if (status === 'invited') return { label: 'Invited', tone: 'progress', icon: 'clock' };
  return { label: RECORD_COPY.none, tone: 'neutral', icon: 'minus' };
}

export const NEAR_CAP_BADGE: Badge = { label: RECORD_COPY.nearCap, tone: 'attention', icon: 'alert' };

/** The plan filter: any, then each plan by its Console label. */
export const PLAN_OPTIONS: Option[] = [{ value: '', label: 'Any Plan' }, ...PLAN_PRIORITY.map((k) => ({ value: k, label: CONSOLE_PLAN_LABELS[k] }))];

export const STATUS_OPTIONS: Option[] = [
  { value: '', label: 'Any Status' },
  ...(Object.keys(PLAN_STATUS_LABELS) as PlanStatus[]).map((k) => ({ value: k, label: PLAN_STATUS_LABELS[k] })),
];

/** "Last active" and other daily dates (D-145): the day only, or "Never". */
export const dayOf = (t: number | null): string => (t === null ? RECORD_COPY.never : fmt.date(t));
/** A moment: the viewer's day and time, then the program zone. */
export const whenOf = (t: number | null): string => (t === null ? RECORD_COPY.never : fmt.when(t));

/** An order's amount, from the order's own row: cents in its currency, or "Not recorded". */
export function amountOf(o: Pick<ConsoleOrder, 'amountTotal' | 'currency'>): string {
  if (o.amountTotal === null) return RECORD_COPY.unrecorded;
  const usd = !o.currency || o.currency.toLowerCase() === 'usd';
  return usd ? fmt.money(o.amountTotal / 100) : `${(o.amountTotal / 100).toFixed(2)} ${o.currency!.toUpperCase()}`;
}

export interface OrderRowVM {
  key: string;
  id: string;
  plan: string;
  status: Badge;
  amount: string;
  created: string;
}

export const orderRowVM = (o: ConsoleOrder): OrderRowVM => ({
  key: o.id,
  id: o.id,
  plan: o.planLabel,
  status: orderStatusBadge(o.status),
  amount: amountOf(o),
  created: whenOf(o.createdAt),
});

export const ORDER_COLUMNS = { id: 'Order', plan: 'Plan', status: 'Status', amount: 'Amount', created: 'Created' } as const;

export interface PlanRowVM {
  key: string;
  plan: string;
  option: string;
  seats: string;
  status: Badge;
  started: string;
  paidThrough: string;
}

export const planRowVM = (p: ConsolePlan): PlanRowVM => ({
  key: p.id,
  plan: p.label,
  option: p.option,
  seats: String(p.seats),
  status: planStatusBadge(p.status),
  started: dayOf(p.startsAt),
  paidThrough: p.paidThrough === null ? RECORD_COPY.none : dayOf(p.paidThrough),
});

export const PLAN_COLUMNS = { plan: 'Plan', option: 'Option', seats: 'Seats', status: 'Status', started: 'Starts', paidThrough: 'Paid Through' } as const;

/** One activity line, in words. */
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
  }
}

export interface ActivityVM {
  key: string;
  when: string;
  text: string;
}

export const activityVM = (items: WorkspaceActivity[]): ActivityVM[] =>
  items.map((a, i) => ({ key: `${a.kind}:${a.subject}:${i}`, when: whenOf(a.at), text: activityLine(a) }));

export interface Pair {
  label: string;
  value: string;
  mono?: boolean;
}

/** What a workspace or a learner is entitled to, as label and value pairs. */
export function entitlementPairs(e: ConsoleEntitlements): Pair[] {
  return [
    { label: 'Skill Sets', value: e.sets.length ? e.sets.map((s) => SKILL_SET_LABELS[s]).join(', ') : RECORD_COPY.none },
    { label: 'AI Accelerator Plan', value: e.course ? RECORD_COPY.yes : RECORD_COPY.no },
    {
      label: 'Access Groups',
      value: e.groups.length ? e.groups.map((g) => `${g.name} (${g.planLabel}, ${g.members} ${g.members === 1 ? 'member' : 'members'})`).join('; ') : RECORD_COPY.none,
    },
  ];
}

/** A record that didn't load: the Console 404 for a missing one, the shared error otherwise. */
export const isMissing = (kind: ConsoleFailure): boolean => kind === 'not_found';
