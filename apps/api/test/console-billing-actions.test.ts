// The Admin Console's confirmed Billing actions (D-164, spec § 7.6 "Actions (PR 5)", § 11.5): refund and
// void in two steps with a confirm token; the token's binding, expiry, tampering and replay; the amount
// re-read at execute; the audit row on ok and on failed; Stripe's refusals, a missing Write scope among
// them; the cached reads forgotten afterwards; and that every consequence a preview lists is what
// `billing/webhook.ts` then does, checked by running the real webhook on the same rows. Through the
// real router and a real Postgres. Stripe is a fake throughout (spec § 9: no live calls).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { Writable } from 'node:stream';
import { asc, eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { BILLING_ACTION_PATHS, CONFIRM_TTL_MS, seedForDatabase } from '@ai/core';
import type { BillingActionPreview, BillingActionResult, BillingInvoiceRow, BillingSummary, ConsolePage } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { readOfferConfig } from '../src/billing/config';
import { cohortSeatsSold } from '../src/billing/provision';
import type { BillingStripe, SubscriptionInfo } from '../src/billing/stripe';
import { handleStripeEvent } from '../src/billing/webhook';
import { BILLING_PATHS } from '../src/console/billing';
import { accounts, auditLog, cohorts, orders, plans, teams, users } from '../src/db/schema';
import type { ReadInvoice } from '../src/console/stripe-read';
import { fakeConsoleStripe, fakeConsoleStripeWrite } from './fake-console-stripe';
import type { FakeStripeData } from './fake-console-stripe';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const DAY = 86_400_000;
const P = BILLING_ACTION_PATHS;
/** A key-shaped sentinel: the fakes' refusals quote it, as Stripe's do. */
const SENTINEL = 'rk_live_QJX7ZVQ4WK9P2MRTb8';
const REASON = 'Customer canceled inside the trial window.';
const at = (t: number): void => void (process.env.FIXED_NOW = new Date(t).toISOString());

const inv = (id: string, over: Partial<ReadInvoice>): ReadInvoice => ({
  id,
  customerId: null,
  customerName: null,
  subscriptionId: null,
  status: 'paid',
  totalCents: 0,
  amountPaidCents: 0,
  amountRemainingCents: 0,
  attemptCount: 0,
  created: NOW - DAY,
  nextPaymentAttempt: null,
  paymentIntentId: null,
  chargeId: null,
  ...over,
});

/** Fresh each test: the write fake changes these as Stripe would. */
function stripeData(): Partial<FakeStripeData> {
  return {
    invoices: [
      // A Team Plan's paid invoice: its order is found by the payment intent.
      inv('in_Team', { customerId: 'cus_North', customerName: 'Northline Realty Team', subscriptionId: 'sub_Team', totalCents: 49_700, amountPaidCents: 49_700, paymentIntentId: 'pi_Team' }),
      // An AI Accelerator seat paid in full: its plan rides the Insiders subscription it rolls into.
      inv('in_Acc', { customerId: 'cus_North', subscriptionId: 'sub_AccIns', totalCents: 750_000, amountPaidCents: 750_000, paymentIntentId: 'pi_Acc', created: NOW - 2 * DAY }),
      // A charge with no payment intent: the webhook can find no order for it.
      inv('in_Legacy', { customerName: 'Legacy Buyer', totalCents: 9_900, amountPaidCents: 9_900, chargeId: 'ch_Legacy', created: NOW - 3 * DAY }),
      // Open and tried once: voidable.
      inv('in_Open', { customerId: 'cus_North', subscriptionId: 'sub_Team', status: 'open', totalCents: 49_700, amountRemainingCents: 49_700, attemptCount: 1, paymentIntentId: 'pi_Open', created: NOW - 4 * DAY }),
      inv('in_Uncoll', { customerName: 'Tidewater Property Co.', status: 'uncollectible', totalCents: 9_700, amountRemainingCents: 9_700, created: NOW - 5 * DAY }),
      inv('in_Draft', { status: 'draft', totalCents: 500, created: NOW - 6 * DAY }),
    ],
    charges: {
      'pi:pi_Team': { id: 'ch_Team', amountCents: 49_700, refundedCents: 0, paymentMethod: 'Visa ending 4242', failure: null },
      'pi:pi_Acc': { id: 'ch_Acc', amountCents: 750_000, refundedCents: 0, paymentMethod: 'Amex ending 1007', failure: null },
      ch_Legacy: { id: 'ch_Legacy', amountCents: 9_900, refundedCents: 0, paymentMethod: null, failure: null },
    },
  };
}

let app: App | null = null;
let read: ReturnType<typeof fakeConsoleStripe>;
let write: ReturnType<typeof fakeConsoleStripeWrite>;
let logs: string[];
const cookies = new Map<string, string>();

async function start(opts: { cache?: boolean; connected?: boolean } = {}): Promise<void> {
  await app?.close();
  logs = [];
  cookies.clear();
  const stream = new Writable({ write: (chunk, _e, done) => (logs.push(String(chunk)), done()) });
  const connected = opts.connected ?? true;
  app = await build({
    logger: { level: 'info', stream },
    consoleBilling: { stripe: connected ? read.stripe : null, write: connected ? write.write : null, mode: 'test', cache: opts.cache },
  });
}

const db = () => testDatabase();
const audits = async () => (await db()).select().from(auditLog).orderBy(asc(auditLog.id));

const post = async (url: string, payload: Record<string, unknown>, userId = 'st1') => {
  if (!app) throw new Error('no app');
  if (!cookies.has(userId)) cookies.set(userId, await app.signInAs(userId));
  return app.inject({ method: 'POST', url, headers: { cookie: cookies.get(userId)!, 'content-type': 'application/json' }, payload });
};
const get = async (url: string, userId = 'st1') => {
  if (!cookies.has(userId)) cookies.set(userId, await app!.signInAs(userId));
  return app!.inject({ method: 'GET', url, headers: { cookie: cookies.get(userId)! } });
};
const json = <T>(res: { body: string }) => JSON.parse(res.body) as T;

async function preview(action: 'refund' | 'void', body: Record<string, unknown>, userId = 'st1'): Promise<BillingActionPreview> {
  const res = await post(action === 'refund' ? P.refundPreview : P.voidPreview, body, userId);
  expect(res.statusCode, res.body).toBe(200);
  return json<BillingActionPreview>(res);
}
const execute = (action: 'refund' | 'void', body: Record<string, unknown>, userId = 'st1') => post(action === 'refund' ? P.refund : P.void, body, userId);

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  at(NOW);
  await resetDatabase(seedForDatabase('live'));
  const d = await db();
  // The seed has no Admin; refund and void are the Owner's and the Admins'.
  await d.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  await d.insert(teams).values({ id: 't_north', name: 'Northline Realty Team', ownerId: 'u_alex', seats: 16 });
  await d.insert(accounts).values({ id: 'a_north', teamId: 't_north', ownerUserId: 'u_alex', ownerEmail: 'alex@northlinerealty.com', name: 'Northline Realty Team', stripeCustomerId: 'cus_North', createdAt: NOW - 30 * DAY, inviteSentAt: NOW - 29 * DAY });
  await d.insert(orders).values([
    { id: 'o_team', plan: 'agents', option: 'upto15', origin: 'payment_link', status: 'paid', currency: 'usd', amountTotal: 49_700, paymentsMade: 1, stripePaymentIntentId: 'pi_Team', stripeSubscriptionId: 'sub_Team', ghlSyncedAt: NOW - DAY, createdAt: NOW - 10 * DAY },
    { id: 'o_acc', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', currency: 'usd', amountTotal: 750_000, paymentsMade: 1, stripePaymentIntentId: 'pi_Acc', stripeSubscriptionId: 'sub_AccIns', createdAt: NOW - 9 * DAY },
  ]);
  await d.insert(plans).values([
    { id: 'p_team', accountId: 'a_north', kind: 'agents', option: 'upto15', seats: 16, status: 'active', startsAt: NOW - 10 * DAY, stripeSubscriptionId: 'sub_Team', orderId: 'o_team', createdAt: NOW - 10 * DAY },
    { id: 'p_acc', accountId: 'a_north', kind: 'cohort', option: 'full', seats: 2, cohortId: 'dec26', status: 'active', startsAt: NOW - 9 * DAY, stripeSubscriptionId: 'sub_AccIns', orderId: 'o_acc', createdAt: NOW - 9 * DAY },
  ]);
  read = fakeConsoleStripe(stripeData(), SENTINEL);
  write = fakeConsoleStripeWrite(read, SENTINEL);
  await start();
});
afterEach(async () => {
  await app?.close();
  app = null;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('refund: preview, then execute (spec § 7.6) @console', () => {
  it('previews what will happen and binds a 5-minute token; executing makes one refund and one ok row', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    expect(Object.keys(p).sort()).toEqual(['action', 'confirmToken', 'consequences', 'expiresAt', 'summary']);
    expect(p.expiresAt).toBe(NOW + CONFIRM_TTL_MS);
    expect(p.summary).toEqual({
      invoiceId: 'in_Team',
      customerName: 'Northline Realty Team',
      amountCents: 49_700,
      paymentMethod: 'Visa ending 4242',
      refund: { kind: 'full', refundableCents: 49_700 },
      confirmText: '$497.00',
    });
    // A preview writes nothing, to Stripe or the audit log.
    expect(write.calls).toEqual([]);
    const before = (await audits()).length;
    expect(before).toBe(0);

    const res = await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497' });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const out = json<BillingActionResult>(res);
    expect(out).toMatchObject({ action: 'refund', invoiceId: 'in_Team', refund: { amountCents: 49_700, status: 'succeeded' }, invoice: null });

    // One Stripe write: by the payment intent, the metadata naming staff and the row, never the reason.
    expect(write.calls).toHaveLength(1);
    const call = write.calls[0]!;
    expect(call.method).toBe('createRefund');
    expect(call.params).toEqual({ paymentIntentId: 'pi_Team', chargeId: null, amountCents: 49_700, metadata: { console_actor: 'st1', console_audit_id: out.auditId } });
    expect(JSON.stringify(call.params)).not.toContain('trial');
    expect(call.key).toBe(`console-${createHash('sha256').update(p.confirmToken).digest('hex')}`);

    // One audit row, under the id the preview reserved, with before and after.
    const rows = await audits();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: Number(out.auditId),
      action: 'billing.refund',
      outcome: 'ok',
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'invoice',
      targetId: 'in_Team',
      targetLabel: 'Northline Realty Team',
      reason: REASON,
      before: { chargeId: 'ch_Team', amountCents: 49_700, refundedCents: 0, refundableCents: 49_700 },
      after: { amountCents: 49_700, status: 'succeeded', full: true },
      at: NOW,
    });
    // The refund names the row (its metadata); the row can't keep the refund's id, a `re_` value that
    // D-157's redactor drops as it would a Resend key.
    expect(JSON.stringify(rows[0]!.after)).not.toContain('re_fake');
    // Neither the token nor the idempotency key is kept anywhere.
    const kept = JSON.stringify(rows) + logs.join('');
    expect(kept).not.toContain(p.confirmToken.split('.')[2]!);
    expect(kept).not.toContain(call.key);
  });

  it('refunds part of a payment, and the Refunds list shows the staff member and their reason', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 10_000 });
    expect(p.summary.refund).toEqual({ kind: 'partial', refundableCents: 49_700 });
    expect(p.summary.confirmText).toBe('$100.00');
    expect((await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '$100.00' })).statusCode).toBe(200);
    const list = json<ConsolePage<{ id: string; byStaff: { userId: string; name: string } | null; reason: string | null }>>(await get(BILLING_PATHS.billingRefunds));
    expect(list.rows[0]).toMatchObject({ byStaff: { userId: 'st1', name: 'Casey Lin' }, reason: REASON });
  });

  it('refunds by charge when the payment has no intent', async () => {
    const p = await preview('refund', { invoiceId: 'in_Legacy' });
    expect((await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '99.00' })).statusCode).toBe(200);
    expect(write.calls[0]!.params).toMatchObject({ paymentIntentId: null, chargeId: 'ch_Legacy', amountCents: 9_900 });
  });

  it('never refunds more than is left: at the preview, and re-read from Stripe at the execute', async () => {
    const big = await post(P.refundPreview, { invoiceId: 'in_Team', amountCents: 49_701 });
    expect(big.statusCode).toBe(409);
    expect(json<{ code: string }>(big).code).toBe('refund_too_large');
    // Previewed in full; then $1 is refunded in the Dashboard before the execute.
    const p = await preview('refund', { invoiceId: 'in_Team' });
    read.data.charges['pi:pi_Team']!.refundedCents = 100;
    const res = await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497.00' });
    expect(res.statusCode).toBe(409);
    expect(json<{ code: string }>(res).code).toBe('refund_too_large');
    expect(write.calls).toEqual([]);
    expect(await audits()).toMatchObject([{ action: 'billing.refund', outcome: 'failed', after: { code: 'refund_too_large', amountCents: 49_700 }, before: { refundableCents: 49_600 } }]);
    // Nothing left at all, and an invoice that isn't paid: refused before any token.
    read.data.charges['pi:pi_Team']!.refundedCents = 49_700;
    expect(json<{ code: string }>(await post(P.refundPreview, { invoiceId: 'in_Team' })).code).toBe('refund_too_large');
    // (As the Admin: the Owner has used this route's 5 a minute.)
    for (const id of ['in_Open', 'in_Draft', 'in_Uncoll']) expect(json<{ code: string }>(await post(P.refundPreview, { invoiceId: id }, 'st_admin')).code, id).toBe('invoice_not_refundable');
  });

  it('asks for a reason of 10 to 500 characters and the amount typed exactly; neither is a write', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    for (const [body, code] of [
      [{ reason: 'too short', typed: '497' }, 'reason_required'],
      [{ reason: 'x'.repeat(501), typed: '497' }, 'reason_required'],
      [{ reason: REASON, typed: '496.99' }, 'confirm_mismatch'],
      [{ reason: REASON, typed: 'in_Team' }, 'confirm_mismatch'],
      [{ reason: REASON }, 'confirm_mismatch'],
    ] as const) {
      const res = await execute('refund', { confirmToken: p.confirmToken, ...body });
      expect(json<{ code: string }>(res).code, JSON.stringify(body)).toBe(code);
      expect(res.statusCode).toBe(422);
    }
    expect(write.calls).toEqual([]);
    expect(await audits()).toEqual([]);
  });
});

describe('the confirm token (spec § 7.6) @console', () => {
  it('a tampered, forged or missing token is 403 confirm_invalid, one denied row, and Stripe is never asked', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 100 });
    // The Console's one confirm token (R2-3b's `confirm-token.ts`): base64url claims, a dot, the HMAC.
    const [body, sig] = p.confirmToken.split('.') as [string, string];
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { action: string; p: { amt: number } };
    expect(claims.action).toBe('billing.refund');
    claims.p.amt = 49_700;
    const tampered = `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${sig}`;
    // A character in the middle: the last one carries padding bits a decoder ignores.
    const flipped = `${body}.${sig.slice(0, 10)}${sig[10] === 'A' ? 'B' : 'A'}${sig.slice(11)}`;
    // Five, the route's limit a minute (spec § 7).
    for (const token of [tampered, flipped, 'e30.x', undefined, 42]) {
      const n = (await audits()).length;
      const res = await execute('refund', { confirmToken: token, reason: REASON, typed: token === tampered ? '497' : '1' });
      expect(res.statusCode, String(token)).toBe(403);
      expect(json<{ code: string; error: string }>(res)).toEqual({ code: 'confirm_invalid', error: 'This confirmation isn’t valid. Start again.' });
      const rows = await audits();
      expect(rows).toHaveLength(n + 1);
      // The invoice in a token that isn't genuine is not believed.
      expect(rows.at(-1)).toMatchObject({ action: 'billing.refund', outcome: 'denied', actorUserId: 'st1', targetType: 'invoice', targetId: null, after: { code: 'confirm_invalid' } });
    }
    expect(write.calls).toEqual([]);
  });

  it('is bound to its staff member and its action: another Admin, or the void route, is 403', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    const other = await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497' }, 'st_admin');
    expect(other.statusCode).toBe(403);
    expect(json<{ code: string }>(other).code).toBe('confirm_invalid');
    const v = await preview('void', { invoiceId: 'in_Open' });
    const crossed = await execute('refund', { confirmToken: v.confirmToken, reason: REASON, typed: 'in_Open' });
    expect(json<{ code: string }>(crossed).code).toBe('confirm_invalid');
    const back = await execute('void', { confirmToken: p.confirmToken, reason: REASON, typed: 'in_Team' });
    expect(json<{ code: string }>(back).code).toBe('confirm_invalid');
    expect(write.calls).toEqual([]);
    // And the right person still can.
    expect((await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497' })).statusCode).toBe(200);
  });

  it('expires after 5 minutes: 410 confirm_expired, a denied row naming the invoice', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    at(NOW + CONFIRM_TTL_MS + 1);
    const res = await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497' });
    expect(res.statusCode).toBe(410);
    expect(json<{ code: string; error: string }>(res)).toEqual({ code: 'confirm_expired', error: 'This confirmation expired after 5 minutes. Start again to see the current figures.' });
    expect(await audits()).toMatchObject([{ action: 'billing.refund', outcome: 'denied', targetId: 'in_Team', after: { code: 'confirm_expired' } }]);
    expect(write.calls).toEqual([]);
    // Good through its last millisecond (the shared token's rule, as Roles has it).
    const q = await preview('refund', { invoiceId: 'in_Team' });
    at(NOW + 2 * CONFIRM_TTL_MS + 1);
    expect((await execute('refund', { confirmToken: q.confirmToken, reason: REASON, typed: '497' })).statusCode).toBe(200);
  });

  it('a Roles & Permissions token is not a Billing one, and the other way round', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    const roles = await post('/api/console/roles', { confirmToken: p.confirmToken });
    expect(roles.statusCode).toBe(403);
    expect(json<{ code: string }>(roles).code).toBe('confirm_invalid');
    expect(write.calls).toEqual([]);
  });

  it('replay: a used token is 409 confirm_used and never reaches Stripe again', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 1_000 });
    const body = { confirmToken: p.confirmToken, reason: REASON, typed: '10' };
    expect((await execute('refund', body)).statusCode).toBe(200);
    const again = await execute('refund', body);
    expect(again.statusCode).toBe(409);
    expect(json<{ code: string }>(again).code).toBe('confirm_used');
    expect(write.calls).toHaveLength(1);
    expect(read.data.refunds).toHaveLength(1);
    expect((await audits()).map((a) => a.outcome)).toEqual(['ok', 'denied']);
  });

  it('replay: the same confirmation at the same moment, or after Stripe didn’t answer, is one refund (the idempotency key)', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 2_000 });
    const body = { confirmToken: p.confirmToken, reason: REASON, typed: '20' };
    const [a, b] = await Promise.all([execute('refund', body), execute('refund', body)]);
    const ok = [a, b].filter((r) => r.statusCode === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of [a, b]) expect([200, 409]).toContain(r.statusCode);
    expect(new Set(ok.map((r) => json<BillingActionResult>(r).refund!.id)).size).toBe(1);
    expect(read.data.refunds).toHaveLength(1);
    expect(new Set(write.calls.map((c) => c.key)).size).toBe(1);
    expect((await audits()).filter((r) => r.outcome === 'ok')).toHaveLength(1);

    // Stripe doesn't answer: the outcome is unknown, so the token stays good, and the retry is one refund.
    const q = await preview('refund', { invoiceId: 'in_Team', amountCents: 3_000 });
    write.fail.createRefund = 'network';
    const lost = await execute('refund', { confirmToken: q.confirmToken, reason: REASON, typed: '30' });
    expect(lost.statusCode).toBe(502);
    expect(json<{ code: string; error: string }>(lost)).toMatchObject({ code: 'stripe_unavailable' });
    expect(json<{ error: string }>(lost).error).toMatch(/Try again: this confirmation can’t make the change twice\./);
    delete write.fail.createRefund;
    expect((await execute('refund', { confirmToken: q.confirmToken, reason: REASON, typed: '30' })).statusCode).toBe(200);
    const keys = write.calls.slice(-2).map((c) => c.key);
    expect(keys[0]).toBe(keys[1]);
    expect(read.data.refunds).toHaveLength(2);
    // The failed attempt is its own row; the ok row is under the id the preview reserved, so it sorts
    // before the failure written in between (D-164's one ordering quirk).
    const tail = (await audits()).filter((r) => r.after && (r.after as { amountCents?: number }).amountCents === 3_000);
    expect(tail.map((r) => [r.outcome, (r.after as { code?: string }).code ?? null]).sort()).toEqual([
      ['failed', 'StripeConnectionError'],
      ['ok', null],
    ]);
    const [ok3, failed3] = [tail.find((r) => r.outcome === 'ok')!, tail.find((r) => r.outcome === 'failed')!];
    expect(ok3.id).toBeLessThan(failed3.id);
  });
});

describe('void (spec § 7.6) @console', () => {
  it('voids an open or uncollectible invoice, the invoice id typed to confirm; one ok row', async () => {
    const p = await preview('void', { invoiceId: 'in_Open' });
    expect(p.summary).toEqual({ invoiceId: 'in_Open', customerName: 'Northline Realty Team', amountCents: 49_700, paymentMethod: null, refund: null, confirmText: 'in_Open' });
    expect((await execute('void', { confirmToken: p.confirmToken, reason: REASON, typed: 'in_open' })).statusCode).toBe(422);
    const res = await execute('void', { confirmToken: p.confirmToken, reason: REASON, typed: ' in_Open ' });
    expect(res.statusCode, res.body).toBe(200);
    const out = json<BillingActionResult>(res);
    expect(out).toMatchObject({ action: 'void', invoiceId: 'in_Open', refund: null, invoice: { id: 'in_Open', status: 'void' } });
    expect(write.calls).toEqual([{ method: 'voidInvoice', key: `console-${createHash('sha256').update(p.confirmToken).digest('hex')}`, params: { id: 'in_Open' } }]);
    expect(await audits()).toMatchObject([
      { id: Number(out.auditId), action: 'billing.void', outcome: 'ok', actorUserId: 'st1', targetId: 'in_Open', reason: REASON, before: { status: 'open', amountCents: 49_700 }, after: { status: 'void' } },
    ]);
    const u = await preview('void', { invoiceId: 'in_Uncoll' });
    expect((await execute('void', { confirmToken: u.confirmToken, reason: REASON, typed: 'in_Uncoll' }, 'st1')).statusCode).toBe(200);
  });

  it('refuses a paid, draft or already void invoice: 409 invoice_not_voidable, at the preview and re-read at the execute', async () => {
    for (const id of ['in_Team', 'in_Draft']) {
      const res = await post(P.voidPreview, { invoiceId: id });
      expect(res.statusCode, id).toBe(409);
      expect(json<{ code: string; error: string }>(res)).toEqual({ code: 'invoice_not_voidable', error: 'Only an open or uncollectible invoice can be voided.' });
    }
    const p = await preview('void', { invoiceId: 'in_Open' });
    read.data.invoices.find((i) => i.id === 'in_Open')!.status = 'paid';
    const res = await execute('void', { confirmToken: p.confirmToken, reason: REASON, typed: 'in_Open' });
    expect(res.statusCode).toBe(409);
    expect(json<{ code: string }>(res).code).toBe('invoice_not_voidable');
    expect(write.calls).toEqual([]);
    expect(await audits()).toMatchObject([{ action: 'billing.void', outcome: 'failed', before: { status: 'paid' }, after: { code: 'invoice_not_voidable' } }]);
  });
});

describe('Stripe refusals on a write @console', () => {
  it('a missing Write scope is 503 stripe_permission_missing naming it, and never any of the key', async () => {
    write.fail.createRefund = 'permission';
    write.fail.voidInvoice = 'permission';
    const r = await preview('refund', { invoiceId: 'in_Team' });
    const res = await execute('refund', { confirmToken: r.confirmToken, reason: REASON, typed: '497' });
    expect(res.statusCode).toBe(503);
    expect(json(res)).toEqual({ code: 'stripe_permission_missing', scope: 'Refunds', error: 'Stripe’s restricted key can’t change Refunds. Add Write on Refunds to the key.' });
    const v = await preview('void', { invoiceId: 'in_Open' });
    const res2 = await execute('void', { confirmToken: v.confirmToken, reason: REASON, typed: 'in_Open' });
    expect(json(res2)).toEqual({ code: 'stripe_permission_missing', scope: 'Invoices', error: 'Stripe’s restricted key can’t change Invoices. Add Write on Invoices to the key.' });
    const rows = await audits();
    expect(rows.map((a) => [a.action, a.outcome, a.after])).toEqual([
      ['billing.refund', 'failed', { code: 'stripe_permission_missing', scope: 'Refunds', access: 'Write', amountCents: 49_700 }],
      ['billing.void', 'failed', { code: 'stripe_permission_missing', scope: 'Invoices', access: 'Write' }],
    ]);
    const everything = res.body + res2.body + JSON.stringify(rows) + logs.join('');
    const secret = SENTINEL.slice('rk_live_'.length);
    for (let i = 0; i + 4 <= secret.length; i++) expect(everything).not.toContain(secret.slice(i, i + 4));
  });

  it('a refusal Stripe made is 409 stripe_refused with its code; nothing changed', async () => {
    write.fail.createRefund = 'refused';
    const p = await preview('refund', { invoiceId: 'in_Team' });
    const res = await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '497' });
    expect(res.statusCode).toBe(409);
    expect(json(res)).toEqual({ code: 'stripe_refused', error: 'Stripe refused this change (charge_already_refunded). Nothing was changed.' });
    expect(await audits()).toMatchObject([{ outcome: 'failed', after: { code: 'charge_already_refunded', answered: true } }]);
  });

  it('no Stripe key: 503 stripe_not_connected on all four', async () => {
    await start({ connected: false });
    for (const url of Object.values(P)) {
      const res = await post(url, { invoiceId: 'in_Team', confirmToken: 'x', reason: REASON, typed: '1' });
      expect([503, 403], url).toContain(res.statusCode);
      if (url.endsWith('preview')) expect(json<{ code: string }>(res).code).toBe('stripe_not_connected');
    }
  });

  it('an invoice Stripe doesn’t have is 404; a malformed one 400', async () => {
    expect((await post(P.refundPreview, { invoiceId: 'in_Nope' })).statusCode).toBe(404);
    expect((await post(P.voidPreview, { invoiceId: 'ch_Team' })).statusCode).toBe(400);
    expect((await post(P.refundPreview, { invoiceId: 'in_Team', amountCents: 1.5 })).statusCode).toBe(400);
  });
});

describe('after a write, Billing reads Stripe again (the 10-minute cache) @console', () => {
  it('forgets the acted-on invoice’s rows and the summary', async () => {
    await start({ cache: true });
    const invoices = async () => json<ConsolePage<BillingInvoiceRow>>(await get(BILLING_PATHS.billingInvoices)).rows;
    const summary = async () => json<BillingSummary>(await get(BILLING_PATHS.billingSummary));
    expect((await invoices()).find((i) => i.id === 'in_Team')).toMatchObject({ refundedCents: 0, refundableCents: 49_700 });
    expect((await summary()).refunds30d).toBe(0);
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 5_000 });
    expect((await execute('refund', { confirmToken: p.confirmToken, reason: REASON, typed: '50' })).statusCode).toBe(200);
    expect((await invoices()).find((i) => i.id === 'in_Team')).toMatchObject({ refundedCents: 5_000, refundableCents: 44_700 });
    expect((await summary()).refunds30d).toBe(5_000);
    const v = await preview('void', { invoiceId: 'in_Open' });
    expect((await execute('void', { confirmToken: v.confirmToken, reason: REASON, typed: 'in_Open' })).statusCode).toBe(200);
    expect((await invoices()).find((i) => i.id === 'in_Open')).toMatchObject({ status: 'void' });
  });
});

describe('the consequences are what billing/webhook.ts does (spec § 7.6) @console', () => {
  /** A BillingStripe for the webhook: subscriptions are live until it cancels them. */
  function webhookStripe(intents: Record<string, string>) {
    const cancels: string[] = [];
    const sub = (id: string): SubscriptionInfo => ({ id, status: cancels.includes(id) ? 'canceled' : 'active', customer: 'cus_North', trialEnd: null, defaultPaymentMethod: null, metadata: {}, cancelAt: null, cancelAtPeriodEnd: false, currentPeriodEnd: null });
    const stripe = {
      retrieveSubscription: async (id: string) => sub(id),
      cancelSubscription: async (id: string) => (cancels.push(id), sub(id)),
      subscriptionOfPaymentIntent: async (pi: string) => intents[pi] ?? null,
    } as unknown as BillingStripe;
    return { stripe, cancels };
  }
  const run = async (type: string, object: Record<string, unknown>, intents: Record<string, string> = {}) => {
    const w = webhookStripe(intents);
    const result = await handleStripeEvent({ id: `evt_${Math.random()}`, object: 'event', type, data: { object } } as unknown as Stripe.Event, {
      stripe: w.stripe,
      // No Payment Links here, so D-154's reconcile counts and changes nothing in Stripe.
      config: { ...readOfferConfig(), seatCapLinks: [] },
      prices: { get: async () => null, reset: () => {} },
      log: { info: () => {}, warn: () => {}, error: () => {} },
      now: () => NOW,
      db: await db(),
    });
    return { result, cancels: w.cancels };
  };
  const charged = (id: string, pi: string | null, amount: number, refunded: number) => ({ id, object: 'charge', payment_intent: pi, amount, amount_refunded: refunded, refunded: refunded >= amount });
  const state = async () => ({
    orders: await (await db()).select({ id: orders.id, status: orders.status, refundedAt: orders.refundedAt, ghl: orders.ghlSyncedAt }).from(orders).orderBy(asc(orders.id)),
    plans: await (await db()).select({ id: plans.id, status: plans.status, liveUntil: plans.liveUntil, seats: plans.seats }).from(plans).orderBy(asc(plans.id)),
    sold: await cohortSeatsSold(await db()),
  });

  it('partial: Stripe refunds part, the webhook answers ignored:partial, and nothing in the LMS changes', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team', amountCents: 10_000 });
    expect(p.consequences).toEqual([
      'Stripe refunds $100.00 of the $497.00 payment; $397.00 stays paid.',
      'The LMS ignores a partial refund (webhook result ignored:partial): the order, the plan and access stay as they are.',
    ]);
    const before = await state();
    const { result, cancels } = await run('charge.refunded', charged('ch_Team', 'pi_Team', 49_700, 10_000));
    expect(result).toBe('ignored:partial');
    expect(cancels).toEqual([]);
    expect(await state()).toEqual(before);
  });

  it('full: the order is refunded and resynced, the plan and its access end now, its subscription is cancelled', async () => {
    const p = await preview('refund', { invoiceId: 'in_Team' });
    expect(p.consequences).toEqual([
      'Stripe refunds the whole $497.00 payment.',
      'Order o_team is marked refunded, and its CRM record in GoHighLevel is resynced.',
      'The Team Plan · 16 seats plan ends and its access ends now.',
      'Subscription sub_Team is cancelled in Stripe (unless already cancelled), so nothing more is charged.',
    ]);
    const { result, cancels } = await run('charge.refunded', charged('ch_Team', 'pi_Team', 49_700, 49_700));
    expect(result).toBe('refunded');
    const after = await state();
    expect(after.orders.find((o) => o.id === 'o_team')).toMatchObject({ status: 'refunded', refundedAt: NOW, ghl: null });
    expect(after.plans.find((x) => x.id === 'p_team')).toMatchObject({ status: 'ended', liveUntil: NOW });
    expect(cancels).toEqual(['sub_Team']);
  });

  it('an AI Accelerator seat: D-154 frees it (sold goes down by one), with its roll-on subscription cancelled', async () => {
    const sold = await cohortSeatsSold(await db());
    // R-5 Phase 5 (D-262): the plan's cohort's cap (`capacity`): December's 15 in production, this demo database's 200.
    const cap = (await (await db()).select({ capacity: cohorts.capacity }).from(cohorts).where(eq(cohorts.id, 'dec26')))[0]!.capacity;
    const p = await preview('refund', { invoiceId: 'in_Acc' });
    expect(p.consequences).toContain(
      `The AI Accelerator seat is freed (D-154): seats sold go from ${sold} to ${sold - 1} of ${cap}. The Payment Links check that runs after the refund turns both links back on if the cap had turned them off and founding seats still sell.`,
    );
    expect(p.consequences).toContain('Subscription sub_AccIns is cancelled in Stripe (unless already cancelled), so nothing more is charged.');
    expect(p.consequences).toContain('The AI Accelerator plan ends and its access ends now.');
    const { result, cancels } = await run('charge.refunded', charged('ch_Acc', 'pi_Acc', 750_000, 750_000));
    expect(result).toBe('refunded');
    expect((await state()).sold).toBe(sold - 1);
    expect(cancels).toEqual(['sub_AccIns']);
  });

  it('found by the invoice’s subscription when no order holds the payment intent, as the webhook finds it', async () => {
    await (await db()).update(orders).set({ stripePaymentIntentId: null }).where(eq(orders.id, 'o_team'));
    const p = await preview('refund', { invoiceId: 'in_Team' });
    expect(p.consequences[1]).toBe('Order o_team is marked refunded, and its CRM record in GoHighLevel is resynced.');
    const { result } = await run('charge.refunded', charged('ch_Team', 'pi_Team', 49_700, 49_700), { pi_Team: 'sub_Team' });
    expect(result).toBe('refunded');
  });

  it('no payment intent: the webhook finds no order (ignored:unknown), and nothing in the LMS changes', async () => {
    const p = await preview('refund', { invoiceId: 'in_Legacy' });
    expect(p.consequences).toEqual([
      'Stripe refunds the whole $99.00 payment.',
      'The LMS finds no order for this payment (webhook result ignored:unknown), so no plan ends and no access changes.',
    ]);
    const before = await state();
    expect((await run('charge.refunded', charged('ch_Legacy', null, 9_900, 9_900))).result).toBe('ignored:unknown');
    expect(await state()).toEqual(before);
  });

  it('void: the webhook has no invoice.voided handler (ignored:type); a status change is mirrored, status only', async () => {
    await (await db()).update(plans).set({ status: 'past_due' }).where(eq(plans.id, 'p_team'));
    const p = await preview('void', { invoiceId: 'in_Open' });
    expect(p.consequences).toEqual([
      'Stripe marks the invoice void and stops collecting it. A void invoice can’t be reopened.',
      'The LMS doesn’t act on a voided invoice (webhook result ignored:type): the Team Plan · 16 seats plan stays Past due.',
      'If Stripe then changes subscription sub_Team’s status, the webhook copies only that status onto its plan.',
    ]);
    const before = await state();
    expect((await run('invoice.voided', { id: 'in_Open', object: 'invoice', status: 'void' })).result).toBe('ignored:type');
    expect(await state()).toEqual(before);
    const u = await preview('void', { invoiceId: 'in_Uncoll' });
    expect(u.consequences).toEqual([
      'Stripe marks the invoice void and stops collecting it. A void invoice can’t be reopened.',
      'The LMS doesn’t act on a voided invoice (webhook result ignored:type): no order or plan changes.',
    ]);
  });

  it('the seat-tier gate (spec § 7.6, § 15): customer.subscription.updated copies the status and never the seats', async () => {
    const before = await state();
    // Stripe moves sub_Team to the 41-seat price: the webhook keeps the plan's 16 seats (and the team's).
    const { result } = await run('customer.subscription.updated', {
      id: 'sub_Team',
      object: 'subscription',
      status: 'active',
      metadata: { order_id: 'o_team', ai_plan: 'agents', ai_option: '16to40' },
      items: { data: [{ price: { lookup_key: 'agents_16to40_founding' }, quantity: 1 }] },
    });
    expect(result).toBe('status:active');
    expect((await state()).plans).toEqual(before.plans);
    expect((await (await db()).select({ seats: teams.seats }).from(teams).where(eq(teams.id, 't_north')))[0]!.seats).toBe(16);
    // The control is drawn on a Team Plan's invoices (their local plan's tier), disabled.
    const listed = json<ConsolePage<BillingInvoiceRow>>(await get(BILLING_PATHS.billingInvoices)).rows;
    expect(Object.fromEntries(listed.map((i) => [i.id, i.seatTier]))).toMatchObject({ in_Team: 'upto15', in_Open: 'upto15', in_Acc: null, in_Legacy: null });
    // So there is no seat-tier route, and no Console file changes a subscription.
    expect((await post('/api/console/billing/seat-tier', { subscriptionId: 'sub_Team', tier: '16to40' })).statusCode).toBe(404);
    for (const f of readdirSync(new URL('../src/console/', import.meta.url))) {
      const src = readFileSync(new URL(`../src/console/${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/subscriptions\.(update|cancel|del|create)\(|updateSubscription|cancelSubscription/);
    }
  });
});

describe('the write client (D-164) @console', () => {
  it('makes a refund create and an invoice void, and nothing else', () => {
    const src = readFileSync(new URL('../src/console/stripe-write.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    const calls = [...src.matchAll(/stripe\.([a-zA-Z]+)\.([a-zA-Z]+)\(/g)].map((m) => `${m[1]}.${m[2]}`);
    expect(calls.sort()).toEqual(['invoices.voidInvoice', 'refunds.create']);
    expect(src).not.toMatch(/billing\/stripe'/);
    // And the Console's read client still has reads only.
    const readSrc = readFileSync(new URL('../src/console/stripe-read.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    expect(readSrc).not.toMatch(/\.(create|update|del|cancel|voidInvoice|finalizeInvoice|pay|markUncollectible|sendInvoice|resume)\(/);
  });

  it('5 a minute per session (spec § 7)', async () => {
    for (let i = 0; i < 5; i++) expect((await post(P.voidPreview, { invoiceId: 'in_Open' })).statusCode).toBe(200);
    const res = await post(P.voidPreview, { invoiceId: 'in_Open' });
    expect(res.statusCode).toBe(429);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
});
