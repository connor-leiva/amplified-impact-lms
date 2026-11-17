// The Admin redesign R2's support records, as the mockup prints them (D-160 R2-1c). Pure: the
// Workspaces, Workspace, Users and User screens' view-models read the API's shapes (console-support.ts)
// and turn them into these words, so a screen never formats a time, a price or a status itself.
//
// ONE ZONE. BUILD-SPEC § 7: "One time-zone label: MST (America/Phoenix) everywhere." The R2 admin's
// stamps are the program's Arizona time with no zone suffix, as the mockup's tables print them
// ("Dec 10, 8:52 AM", "Dec 8, 2026").
//
// THE MOCKUP'S WORDS. Plan statuses are sentence case ("Past due"), as AdminRedesign.jsx writes them;
// the Console's older labels (`PLAN_STATUS_LABELS`, "Past Due") stay for the API's CSV and audit.

import { CONSOLE_PLAN_LABELS, ORDER_STATUS_LABELS, nearCap } from './console-support';
import type { ConsoleOrder } from './console-support';
import type { PlanKind, PlanStatus } from './offer';

export const ADMIN_TZ = 'America/Phoenix';

const part = (t: number, o: Intl.DateTimeFormatOptions): string =>
  // Some ICU builds put a narrow no-break space before AM/PM; the mockup has a plain one.
  new Intl.DateTimeFormat('en-US', { timeZone: ADMIN_TZ, ...o }).format(new Date(t)).replace(/\u202f/g, ' ');

/** "Dec 10, 8:52 AM": a moment, in the admin's zone. */
export const adminStamp = (t: number): string =>
  `${part(t, { month: 'short', day: 'numeric' })}, ${part(t, { hour: 'numeric', minute: '2-digit' })}`;

/** "Dec 8, 2026": a day, in the admin's zone. */
export const adminDate = (t: number): string => part(t, { month: 'short', day: 'numeric', year: 'numeric' });

/** "$1,495.00" from cents. */
export const usdCents = (cents: number): string =>
  `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "$1,495" from cents (MRR). */
export const usdWhole = (cents: number): string => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/** Two initials, as the mockup's `ini`: "Elena Vargas" → "EV". */
export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

// ================================================================================================
// Statuses: a word and a tone (the mockup's `TONE`), never a colour alone
// ================================================================================================

export type AdminTone = 'ok' | 'info' | 'bad' | 'warn' | 'run' | 'off' | 'neutral';

export const ADMIN_PLAN_STATUS: Readonly<Record<PlanStatus, string>> = {
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  ended: 'Ended',
};

/** The mockup's `TONE`, for every word these screens print. */
const TONES: Readonly<Record<string, AdminTone>> = {
  Active: 'ok',
  Paid: 'ok',
  Deployed: 'ok',
  Trialing: 'info',
  Invited: 'info',
  'In progress': 'info',
  'Past due': 'bad',
  Failed: 'bad',
  Pending: 'warn',
  Open: 'warn',
  Refunded: 'warn',
  Expired: 'off',
  Canceled: 'off',
  Ended: 'off',
};

export interface AdminStatus {
  label: string;
  tone: AdminTone;
}

const status = (label: string): AdminStatus => ({ label, tone: TONES[label] ?? 'neutral' });

/** A plan's status; no plan is "No plan". */
export const planStatusOf = (s: PlanStatus | string | null): AdminStatus =>
  s === null ? { label: 'No plan', tone: 'neutral' } : status(ADMIN_PLAN_STATUS[s as PlanStatus] ?? s);

/**
 * A person's status, as the Users list prints it: their account's (`users.status`: active, invited),
 * or, where the record carries one, their workspace plan's.
 */
export const userStatusOf = (s: string | null): AdminStatus => {
  if (s === null) return { label: '—', tone: 'neutral' };
  if (s === 'invited') return status('Invited');
  return planStatusOf(s);
};

/** An order's status, in the Console's order words ("Paid", "Failed", "Pending"). */
export const orderStatusOf = (s: string): AdminStatus =>
  status(ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS] ?? s);

// ================================================================================================
// Plans and seats
// ================================================================================================

/** "Team Plan · 41 seats" for the Team Plan, which is sold by size; any other plan by its name. */
export const planLine = (kind: PlanKind | null, seats: number): string =>
  kind === null
    ? 'No plan'
    : kind === 'agents'
      ? `${CONSOLE_PLAN_LABELS[kind]} · ${seats} seats`
      : CONSOLE_PLAN_LABELS[kind];

/** Plans with a fixed number of seats: the AI Accelerator's cohort pair and Insiders' one. */
export const FIXED_SEAT_PLANS: readonly PlanKind[] = ['cohort', 'membership'];

export type SeatBar = 'ok' | 'hot' | 'full';

/**
 * The seat bar's colour (BUILD-SPEC § 7): grey when a fixed-seat plan is full, amber when nearly full
 * (`nearCap`, spec § 7.3), green otherwise. Never red.
 */
export function seatBar(used: number, cap: number, kind: PlanKind | null): SeatBar {
  if (kind !== null && FIXED_SEAT_PLANS.includes(kind) && cap > 0 && used >= cap) return 'full';
  return nearCap(used, cap) ? 'hot' : 'ok';
}

/** How full, 0 to 100. */
export const seatPct = (used: number, cap: number): number => (cap > 0 ? Math.min(100, (used / cap) * 100) : 0);

/**
 * MRR, from local orders only (Stripe's own reads are the Billing PR): "One-time" for the AI
 * Accelerator, "$0" for a plan that is trialing or over, else the latest order's amount for the
 * workspace, in whole dollars; "—" when there is no plan or no amount.
 */
export function mrrOf(
  plan: { kind: PlanKind; status: PlanStatus } | null,
  orders: readonly Pick<ConsoleOrder, 'amountTotal' | 'createdAt'>[],
): string {
  if (!plan) return '—';
  if (plan.kind === 'cohort') return 'One-time';
  if (plan.status !== 'active' && plan.status !== 'past_due') return '$0';
  const latest = [...orders].filter((o) => o.amountTotal !== null).sort((a, b) => b.createdAt - a.createdAt)[0];
  return latest ? usdWhole(latest.amountTotal!) : '—';
}

/** A learner's tier as the mockup prints it: "Team", "Agent". */
export const tierLabel = (tier: string | null): string => (tier ? tier[0]!.toUpperCase() + tier.slice(1) : '—');
