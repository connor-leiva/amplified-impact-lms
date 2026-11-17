// The Console's confirmed Billing actions, the pure rules (D-164, spec § 7.6): typing to confirm, what
// counts as a full refund, and the consequence sentences. `apps/api/test/console-billing-actions.test.ts`
// runs the real webhook against each sentence.
import { describe, expect, it } from 'vitest';
import {
  BILLING_ACTION_CAPS,
  BILLING_ACTION_PATHS,
  BILLING_CONFIRM_MESSAGES,
  CONFIRM_TTL_MS,
  CONSOLE_ERRORS,
  SEAT_TIER_GATED,
  STRIPE_WRITE_SCOPES,
  confirmTextOf,
  consoleCan,
  refundConsequences,
  refundEndsSeat,
  refundIsFull,
  seatTierOf,
  stripeWriteScopeMessage,
  typedAmountCents,
  typedConfirms,
  voidConsequences,
} from '../src';

describe('typing to confirm (D-164)', () => {
  it('reads an amount as cents, with or without $ and commas', () => {
    for (const [typed, cents] of [
      ['$1,234.50', 123_450],
      ['1234.5', 123_450],
      ['1234', 123_400],
      [' $497.00 ', 49_700],
      ['0.07', 7],
    ] as const)
      expect(typedAmountCents(typed), typed).toBe(cents);
    for (const typed of ['', '$', '12.345', '1,23', '-5', 'five', '$1 234', undefined, 497]) expect(typedAmountCents(typed), String(typed)).toBeNull();
  });

  it('a refund confirms by its amount; a void by the invoice id, exactly', () => {
    expect(typedConfirms('refund', '497', { amountCents: 49_700 })).toBe(true);
    expect(typedConfirms('refund', '497.01', { amountCents: 49_700 })).toBe(false);
    expect(typedConfirms('void', ' in_1QxN1hHm0279 ', { invoiceId: 'in_1QxN1hHm0279' })).toBe(true);
    expect(typedConfirms('void', 'IN_1QXN1HHM0279', { invoiceId: 'in_1QxN1hHm0279' })).toBe(false);
    expect(confirmTextOf('refund', { amountCents: 149_500, invoiceId: 'in_x' })).toBe('$1,495.00');
    expect(confirmTextOf('void', { amountCents: 1, invoiceId: 'in_x' })).toBe('in_x');
  });
});

describe('a refund’s consequences, from billing/webhook.ts (D-164)', () => {
  const team = { orderId: 'o_1', plan: { kind: 'agents' as const, seats: 16, status: 'active' as const }, subscriptions: ['sub_1'] };

  it('full only when nothing is left, which is when Stripe sets charge.refunded', () => {
    expect(refundIsFull({ amountCents: 49_700, chargeAmountCents: 49_700, refundedCents: 0 })).toBe(true);
    expect(refundIsFull({ amountCents: 39_700, chargeAmountCents: 49_700, refundedCents: 10_000 })).toBe(true);
    expect(refundIsFull({ amountCents: 39_699, chargeAmountCents: 49_700, refundedCents: 10_000 })).toBe(false);
  });

  it('partial: ignored:partial, nothing in the LMS changes', () => {
    expect(refundConsequences({ amountCents: 10_000, chargeAmountCents: 49_700, refundedCents: 0, match: team, seatsSold: null })).toEqual([
      'Stripe refunds $100.00 of the $497.00 payment; $397.00 stays paid.',
      'The LMS ignores a partial refund (webhook result ignored:partial): the order, the plan and access stay as they are.',
    ]);
  });

  it('full: the order, the plan and its access, the subscriptions; the last of a part-refunded payment says so', () => {
    expect(refundConsequences({ amountCents: 39_700, chargeAmountCents: 49_700, refundedCents: 10_000, match: { ...team, subscriptions: ['sub_1', 'sub_2'] }, seatsSold: null })).toEqual([
      'Stripe refunds the last $397.00 of the $497.00 payment, so it is fully refunded.',
      'Order o_1 is marked refunded, and its CRM record in GoHighLevel is resynced.',
      'The Team Plan · 16 seats plan ends and its access ends now.',
      'Subscriptions sub_1 and sub_2 are cancelled in Stripe (unless already cancelled), so nothing more is charged.',
    ]);
  });

  it('no order the webhook can find: ignored:unknown', () => {
    expect(refundConsequences({ amountCents: 9_900, chargeAmountCents: 9_900, refundedCents: 0, match: null, seatsSold: null })).toEqual([
      'Stripe refunds the whole $99.00 payment.',
      'The LMS finds no order for this payment (webhook result ignored:unknown), so no plan ends and no access changes.',
    ]);
  });

  it('an AI Accelerator seat not yet ended: D-154 frees it; one already ended, or a partial refund, frees nothing', () => {
    const seat = { orderId: 'o_2', plan: { kind: 'cohort' as const, seats: 2, status: 'active' as const }, subscriptions: [] };
    const full = { amountCents: 750_000, chargeAmountCents: 750_000, refundedCents: 0, match: seat, seatsSold: 15 };
    expect(refundEndsSeat(full)).toBe(true);
    expect(refundConsequences(full).at(-1)).toBe(
      'The AI Accelerator seat is freed (D-154): seats sold go from 15 to 14 of 15. The Payment Links check that runs after the refund turns both links back on if the cap had turned them off and founding seats still sell.',
    );
    expect(refundEndsSeat({ ...full, match: { ...seat, plan: { ...seat.plan, status: 'ended' as const } } })).toBe(false);
    expect(refundEndsSeat({ ...full, amountCents: 1 })).toBe(false);
    expect(refundConsequences({ ...full, seatsSold: null }).join(' ')).not.toContain('D-154');
  });
});

describe('a void’s consequences (D-164)', () => {
  it('the webhook ignores invoice.voided, and mirrors a subscription’s status only', () => {
    expect(voidConsequences({ subscriptionId: 'sub_1', plan: { kind: 'membership', seats: 1, status: 'past_due' } })).toEqual([
      'Stripe marks the invoice void and stops collecting it. A void invoice can’t be reopened.',
      'The LMS doesn’t act on a voided invoice (webhook result ignored:type): the Insiders plan stays Past due.',
      'If Stripe then changes subscription sub_1’s status, the webhook copies only that status onto its plan.',
    ]);
    expect(voidConsequences({ subscriptionId: null, plan: null })).toHaveLength(2);
  });
});

describe('the routes, codes and scopes (D-164)', () => {
  it('four routes, Owner and Admin, 5 minutes, and the codes with their sentences', () => {
    expect(BILLING_CONFIRM_MESSAGES).toEqual({
      confirm_invalid: 'This confirmation isn’t valid. Start again.',
      confirm_expired: 'This confirmation expired after 5 minutes. Start again to see the current figures.',
    });
    expect(Object.values(BILLING_ACTION_PATHS)).toEqual([
      '/api/console/billing/refund/preview',
      '/api/console/billing/refund',
      '/api/console/billing/void/preview',
      '/api/console/billing/void',
    ]);
    for (const cap of Object.values(BILLING_ACTION_CAPS)) {
      expect([consoleCan('Owner', cap), consoleCan('Admin', cap), consoleCan('Support', cap)]).toEqual([true, true, false]);
    }
    expect(CONFIRM_TTL_MS).toBe(300_000);
    expect(CONSOLE_ERRORS.confirm_invalid.status).toBe(403);
    expect(CONSOLE_ERRORS.confirm_expired.status).toBe(410);
    expect(CONSOLE_ERRORS.confirm_used.status).toBe(409);
    expect(CONSOLE_ERRORS.confirm_mismatch.status).toBe(422);
    expect(CONSOLE_ERRORS.invoice_not_voidable).toEqual({ status: 409, message: 'Only an open or uncollectible invoice can be voided.' });
    expect(CONSOLE_ERRORS.refund_too_large.status).toBe(409);
    expect(STRIPE_WRITE_SCOPES).toEqual(['Refunds', 'Invoices']);
    expect(stripeWriteScopeMessage('Refunds')).toBe('Stripe’s restricted key can’t change Refunds. Add Write on Refunds to the key.');
  });

  it('the seat tier is gated: drawn on Team Plan invoices only, with its reason in words', () => {
    expect(seatTierOf('agents', 'upto15')).toBe('upto15');
    expect(seatTierOf('agents', '16to40')).toBe('16to40');
    expect(seatTierOf('membership', 'monthly')).toBeNull();
    expect(seatTierOf(null, null)).toBeNull();
    expect(SEAT_TIER_GATED).toBe('Off until a tier change in Stripe also updates the workspace’s seats.');
  });
});
