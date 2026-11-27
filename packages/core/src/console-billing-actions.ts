// The Admin Console's confirmed Billing actions, PR 5 (D-164, spec § 7.6 "Actions (PR 5)"): refund and
// void, each in two steps. Pure, like the rest of @ai/core: the API decides with these
// (`apps/api/src/console/billing-actions.ts`) and the web shows the same words.
//
// TWO STEPS. `POST …/{action}/preview` answers what would happen (`BillingActionPreview`) and a confirm
// token, valid 5 minutes, bound to the action, its parameters and the staff member. `POST …/{action}`
// takes that token, a reason of 10 to 500 characters and what staff typed to confirm (the amount for a
// refund, the invoice id for a void), and only then writes to Stripe.
//
// THE CONSEQUENCES SAY WHAT `billing/webhook.ts` DOES, read from its code (`chargeRefunded`,
// `subscriptionChanged`, D-154's `SEAT_EVENTS`), never what a refund "usually" means:
//   - a refund that leaves part of the payment paid: Stripe has `charge.refunded` false, and the webhook
//     answers `ignored:partial`, so the order, the plan and access do not change;
//   - a refund of what is left: the webhook finds the order (by the payment intent, else the invoice's
//     subscription), marks it refunded and resyncs GoHighLevel, ends its plan with access ending now,
//     and cancels its subscriptions; with no payment intent, or no order, it answers `ignored:unknown`;
//   - an AI Accelerator seat's plan ending is D-154's counter going down by one, and the Payment Links
//     reconcile that follows every `charge.refunded` turns the links back on if the cap had turned them off;
//   - a void: the webhook has no `invoice.voided` handler, and `customer.subscription.updated` copies a
//     subscription's status onto its plan and nothing else.
// `apps/api/test/console-billing-actions.test.ts` runs the real webhook on the same rows and checks each.
//
// THE SEAT TIER (spec D4, § 7.6) has no action here: its gate failed (the webhook does not re-derive
// `plans.seats` or `teams.seats` on `customer.subscription.updated`), so the spec's answer is a control
// drawn disabled and a report, with no endpoint and no local seat write.

import { COHORT_SEATS } from './offer';
import type { PlanKind, PlanStatus } from './offer';
import { planLine, planStatusOf, usdCents } from './console-view';

export const BILLING_ACTIONS = ['refund', 'void'] as const;
export type BillingAction = (typeof BILLING_ACTIONS)[number];
export const isBillingAction = (v: unknown): v is BillingAction => v === 'refund' || v === 'void';

export const BILLING_ACTION_PATHS = {
  refundPreview: '/api/console/billing/refund/preview',
  refund: '/api/console/billing/refund',
  voidPreview: '/api/console/billing/void/preview',
  void: '/api/console/billing/void',
} as const;

/** Each action's capability (spec § 5): Owner and Admin. */
export const BILLING_ACTION_CAPS = { refund: 'billing.refund', void: 'billing.void' } as const satisfies Record<BillingAction, string>;

/** Spec § 7.6: a confirm token is good for 5 minutes. */
export const CONFIRM_TTL_MS = 5 * 60_000;

/** Spec § 7: billing actions, 5 a minute per session. */
export const BILLING_ACTION_RATE = 5;

/**
 * The two shared confirm codes (R2-3b's, `CONSOLE_ERRORS`), in Billing's words: its dialog offers
 * "Start again", which reads Stripe afresh, rather than Roles' "Close this and try again".
 */
export const BILLING_CONFIRM_MESSAGES = {
  confirm_invalid: 'This confirmation isn’t valid. Start again.',
  confirm_expired: 'This confirmation expired after 5 minutes. Start again to see the current figures.',
} as const;

/** What the preview says the action is, for the dialog's title, sentence and typed confirmation. */
export interface BillingActionSummary {
  invoiceId: string;
  customerName: string | null;
  /** A refund's amount; a void's invoice total. Cents. */
  amountCents: number;
  /** "Visa ending 4242", or null. */
  paymentMethod: string | null;
  /** A refund: whether it returns all that is left of the payment (`full`) or part of it. Null for a void. */
  refund: { kind: 'full' | 'partial'; refundableCents: number } | null;
  /** What staff type to confirm: the amount ("$695.00") or the invoice id. */
  confirmText: string;
}

/** `POST …/{action}/preview` (spec § 7.6). */
export interface BillingActionPreview {
  action: BillingAction;
  summary: BillingActionSummary;
  consequences: string[];
  confirmToken: string;
  expiresAt: number;
}

/** `POST …/{action}`: what Stripe did, and the audit row that records it. */
export interface BillingActionResult {
  action: BillingAction;
  invoiceId: string;
  auditId: string;
  refund: { id: string; amountCents: number; status: string | null } | null;
  invoice: { id: string; status: string } | null;
}

// ================================================================================================
// Typing to confirm
// ================================================================================================

const MONEY = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/** "$1,234.50", "1234.5" or "1234" as cents; null for anything else. */
export function typedAmountCents(typed: unknown): number | null {
  if (typeof typed !== 'string') return null;
  const m = MONEY.exec(typed.trim());
  if (!m) return null;
  const whole = Number(m[1]!.replace(/,/g, ''));
  const cents = Number((m[2] ?? '0').padEnd(2, '0'));
  const n = whole * 100 + cents;
  return Number.isSafeInteger(n) ? n : null;
}

/** Whether what staff typed confirms the action: the refund's amount, or the invoice's id exactly. */
export function typedConfirms(action: BillingAction, typed: unknown, expected: { amountCents?: number; invoiceId?: string }): boolean {
  if (action === 'refund') return expected.amountCents !== undefined && typedAmountCents(typed) === expected.amountCents;
  return typeof typed === 'string' && expected.invoiceId !== undefined && typed.trim() === expected.invoiceId;
}

/** What the dialog asks staff to type. */
export const confirmTextOf = (action: BillingAction, s: { amountCents: number; invoiceId: string }): string =>
  action === 'refund' ? usdCents(s.amountCents) : s.invoiceId;

// ================================================================================================
// What a refund does (from `billing/webhook.ts`'s `chargeRefunded`)
// ================================================================================================

/** The order the webhook's `chargeRefunded` would find for this payment, and what hangs off it. */
export interface RefundMatch {
  orderId: string;
  plan: { kind: PlanKind; seats: number; status: PlanStatus } | null;
  /** The plan's and the order's subscriptions, as the webhook collects them (each cancelled unless already). */
  subscriptions: string[];
}

export interface RefundFacts {
  amountCents: number;
  /** The payment's own amount and what was already refunded from it. */
  chargeAmountCents: number;
  refundedCents: number;
  /** Null: the webhook finds no order (no payment intent, or none it knows). */
  match: RefundMatch | null;
  /** D-154's counter (`cohortSeatsSold`) now; read only when this refund would end a seat. */
  seatsSold: number | null;
  /** R-5 Phase 5 (D-262): the cap of the plan's cohort (`capacity`); absent, December's 15. */
  seatCap?: number | null;
}

/** What is left to refund on a payment. */
export const refundableOf = (chargeAmountCents: number, refundedCents: number): number => Math.max(0, chargeAmountCents - refundedCents);

/** Stripe sets `charge.refunded` once nothing is left, and only then does the webhook act. */
export const refundIsFull = (f: Pick<RefundFacts, 'amountCents' | 'chargeAmountCents' | 'refundedCents'>): boolean =>
  f.amountCents >= refundableOf(f.chargeAmountCents, f.refundedCents);

/** Whether this refund would end an AI Accelerator seat that D-154 counts. */
export const refundEndsSeat = (f: Pick<RefundFacts, 'amountCents' | 'chargeAmountCents' | 'refundedCents' | 'match'>): boolean =>
  refundIsFull(f) && f.match?.plan?.kind === 'cohort' && f.match.plan.status !== 'ended';

const list = (ids: readonly string[]): string => (ids.length < 3 ? ids.join(' and ') : `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}`);

/** The preview's consequences for a refund, in the order they happen. */
export function refundConsequences(f: RefundFacts): string[] {
  const amount = usdCents(f.amountCents);
  const left = refundableOf(f.chargeAmountCents, f.refundedCents) - f.amountCents;
  if (!refundIsFull(f)) {
    return [
      `Stripe refunds ${amount} of the ${usdCents(f.chargeAmountCents)} payment; ${usdCents(left)} stays paid.`,
      'The LMS ignores a partial refund (webhook result ignored:partial): the order, the plan and access stay as they are.',
    ];
  }
  const out = [
    f.refundedCents > 0
      ? `Stripe refunds the last ${amount} of the ${usdCents(f.chargeAmountCents)} payment, so it is fully refunded.`
      : `Stripe refunds the whole ${amount} payment.`,
  ];
  const m = f.match;
  if (!m) {
    out.push('The LMS finds no order for this payment (webhook result ignored:unknown), so no plan ends and no access changes.');
    return out;
  }
  out.push(`Order ${m.orderId} is marked refunded, and its CRM record in GoHighLevel is resynced.`);
  if (m.plan) out.push(`The ${planLine(m.plan.kind, m.plan.seats)} plan ends and its access ends now.`);
  if (m.subscriptions.length) {
    const one = m.subscriptions.length === 1;
    out.push(
      `Subscription${one ? '' : 's'} ${list(m.subscriptions)} ${one ? 'is' : 'are'} cancelled in Stripe (unless already cancelled), so nothing more is charged.`,
    );
  }
  if (refundEndsSeat(f) && f.seatsSold !== null) {
    const after = Math.max(0, f.seatsSold - 1);
    out.push(
      `The AI Accelerator seat is freed (D-154): seats sold go from ${f.seatsSold} to ${after} of ${f.seatCap ?? COHORT_SEATS}. ` +
        'The Payment Links check that runs after the refund turns both links back on if the cap had turned them off and founding seats still sell.',
    );
  }
  return out;
}

// ================================================================================================
// What a void does (the webhook has no `invoice.voided` handler)
// ================================================================================================

export interface VoidFacts {
  /** The invoice's subscription, if it has one, and the local plan the webhook ties to it. */
  subscriptionId: string | null;
  plan: { kind: PlanKind; seats: number; status: PlanStatus } | null;
}

export function voidConsequences(f: VoidFacts): string[] {
  const out = [
    'Stripe marks the invoice void and stops collecting it. A void invoice can’t be reopened.',
    f.plan
      ? `The LMS doesn’t act on a voided invoice (webhook result ignored:type): the ${planLine(f.plan.kind, f.plan.seats)} plan stays ${planStatusOf(f.plan.status).label}.`
      : 'The LMS doesn’t act on a voided invoice (webhook result ignored:type): no order or plan changes.',
  ];
  if (f.subscriptionId)
    out.push(`If Stripe then changes subscription ${f.subscriptionId}’s status, the webhook copies only that status onto its plan.`);
  return out;
}

// ================================================================================================
// The seat tier (spec D4, § 7.6, § 15): gated, drawn disabled
// ================================================================================================

/**
 * Why "Change seat tier…" is drawn and disabled: the gate's own finding, in words. The webhook mirrors
 * a subscription's status only, so a tier change in Stripe would leave the workspace's seats where they
 * were; the spec's answer is a disabled control and a report, never a local seat write.
 */
export const SEAT_TIER_GATED = 'Off until a tier change in Stripe also updates the workspace’s seats.';
