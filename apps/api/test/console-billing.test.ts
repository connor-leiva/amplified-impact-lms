// The Admin Console's Billing, read-only (D-163, spec § 7.6, § 11.5): the summary's shape and MRR, the
// D-154 seat count, the lists and their Dashboard links, the scope probe, Stripe's refusals, and that
// nothing here writes, to Stripe or anywhere. Stripe is a fake throughout (spec § 9: no live calls).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { asc, eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { BillingSubscription, BillingSummary, ConsolePage, StripeMode } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import type { PriceCache, PriceMap } from '../src/billing/prices';
import { cohortSeatsSold } from '../src/billing/provision';
import { BILLING_PATHS } from '../src/console/billing';
import { cachedConsoleStripe, scopedConsoleStripe } from '../src/console/stripe-read';
import type { ConsoleStripe, ReadInvoice } from '../src/console/stripe-read';
import { accounts, auditLog, cohorts, orders, plans } from '../src/db/schema';
import { fakeConsoleStripe, stripeError } from './fake-console-stripe';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const DAY = 86_400_000;
const P = BILLING_PATHS;
/** A key-shaped sentinel: the fake's refusals quote it, as Stripe's do. */
const SENTINEL = 'rk_live_QJX7ZVQ4WK9P2MRTb8';

const item = (lookupKey: string | null, unitAmount: number, interval: 'day' | 'week' | 'month' | 'year' = 'month', quantity = 1) => ({
  lookupKey,
  unitAmount,
  interval,
  intervalCount: 1,
  quantity,
});
const sub = (id: string, status: string, items: BillingSubscription['items'], customerId: string | null = null, metadata: Record<string, string> = {}, ago = 1): BillingSubscription => ({
  id,
  customerId,
  status,
  created: NOW - ago * DAY,
  metadata,
  items,
});
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

const SUBS: BillingSubscription[] = [
  sub('sub_Team16', 'active', [item('agents_upto15_founding', 49_700)], 'cus_North123', {}, 1),
  sub('sub_Team41', 'past_due', [item('agents_16to40_founding', 99_700)], 'cus_Harbor9', {}, 2),
  // $790 a year is $65.83 a month.
  sub('sub_AgentY', 'active', [item('agent_plan_yearly', 79_000, 'year')], 'cus_Solo1', {}, 3),
  sub('sub_Ins', 'active', [item('membership_monthly', 19_700)], 'cus_Harbor9', {}, 4),
  // Trialing: counted, never in MRR.
  sub('sub_Trial', 'trialing', [item('agents_upto15_founding', 49_700)], 'cus_North123', {}, 5),
  // The Accelerator's second installment: one-time revenue, not MRR.
  sub('sub_TwoPay', 'active', [item('cohort_founding_two_pay', 375_000)], 'cus_North123', {}, 6),
  // An older price no line names: still recurring, so still in the total. $10 a week.
  sub('sub_Weekly', 'active', [item(null, 1_000, 'week')], null, {}, 7),
  // The smoke test, ignored; a canceled one, not counted.
  sub('sub_Smoke', 'active', [item('smoke_test', 100)], null, { ai_plan: 'test' }, 8),
  sub('sub_Gone', 'canceled', [item('membership_monthly', 19_700)], 'cus_Harbor9', {}, 9),
];

const INVOICES: ReadInvoice[] = [
  inv('in_Paid1', { customerId: 'cus_North123', customerName: null, status: 'paid', totalCents: 49_700, amountPaidCents: 49_700, paymentIntentId: 'pi_Paid1', created: NOW - DAY }),
  inv('in_Open1', { customerId: 'cus_Harbor9', customerName: 'Natasha Brooks', subscriptionId: 'sub_Harbor1', status: 'open', totalCents: 99_700, amountRemainingCents: 99_700, attemptCount: 2, nextPaymentAttempt: NOW + DAY, paymentIntentId: 'pi_Open1', created: NOW - 2 * DAY }),
  inv('in_Open2', { status: 'open', totalCents: 1_000, amountRemainingCents: 1_000, created: NOW - 3 * DAY }),
  inv('in_Draft', { status: 'draft', totalCents: 500, created: NOW - 4 * DAY }),
  inv('in_Refunded', { customerId: 'cus_North123', status: 'paid', totalCents: 19_700, amountPaidCents: 19_700, chargeId: 'ch_Ref', created: NOW - 5 * DAY }),
];

const CHARGES = {
  'pi:pi_Paid1': { id: 'ch_Paid1', amountCents: 49_700, refundedCents: 10_000, paymentMethod: 'Visa ending 4242', failure: null },
  'pi:pi_Open1': { id: 'ch_Open1', amountCents: 99_700, refundedCents: 0, paymentMethod: 'Mastercard ending 5521', failure: 'card_declined: insufficient_funds' },
  ch_Ref: { id: 'ch_Ref', amountCents: 19_700, refundedCents: 19_700, paymentMethod: 'Amex ending 1007', failure: null },
};

const PRICES: PriceMap = Object.fromEntries(
  (
    [
      ['agents_upto15_founding', 49_700, 'month'],
      ['agents_16to40_founding', 99_700, 'month'],
      ['agent_plan_monthly', 7_900, 'month'],
      ['agent_plan_monthly_117', 11_700, 'month'],
      ['agent_plan_yearly', 79_000, 'year'],
      ['membership_monthly', 19_700, 'month'],
      ['membership_monthly_team_leader', 16_900, 'month'],
      ['membership_year_upfront', 199_700, null],
      ['insiders_agent_monthly', 7_900, 'month'],
      ['cohort_founding_full', 750_000, null],
      ['cohort_founding_two_pay', 375_000, 'month'],
    ] as const
  ).map(([k, a, i]) => [k, { lookupKey: k, id: `price_${k}`, unitAmount: a, currency: 'usd', interval: i, productName: null }]),
);
const prices = (map: PriceMap | null = PRICES): PriceCache => ({ get: async () => map, reset: () => {} });

let app: App | null = null;
let fake: ReturnType<typeof fakeConsoleStripe>;
let logs: string[];
let cookies: Map<string, string>;

async function start(opts: { stripe?: ConsoleStripe | null; mode?: StripeMode; price?: PriceCache } = {}): Promise<App> {
  await app?.close();
  app = null;
  logs = [];
  const stream = new Writable({ write: (chunk, _e, done) => (logs.push(String(chunk)), done()) });
  app = await build({
    logger: { level: 'info', stream },
    consoleBilling: { stripe: opts.stripe === undefined ? fake.stripe : opts.stripe, mode: opts.mode ?? 'test' },
    offer: { prices: opts.price ?? prices() },
  });
  cookies = new Map();
  return app;
}

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  await db.insert(accounts).values([
    { id: 'a_north', teamId: 'northline', ownerUserId: 'u_alex', ownerEmail: 'alex@northlinerealty.com', name: 'Northline Realty Team', stripeCustomerId: 'cus_North123', createdAt: NOW - 30 * DAY, inviteSentAt: NOW - 29 * DAY },
    { id: 'a_harbor', teamId: 'harbor', ownerUserId: 'u_natasha', ownerEmail: 'natasha@harborpine.com', name: 'Harbor & Pine Group', stripeCustomerId: 'cus_Harbor9', createdAt: NOW - 60 * DAY, inviteSentAt: null },
  ]);
  // Five AI Accelerator seats: two paid in full (one refunded, so ended), three on two payments (two
  // owing the second, one paid both). D-154 counts the four not ended.
  const order = { origin: 'payment_link', currency: 'usd', status: 'paid', createdAt: NOW - 20 * DAY } as const;
  const seats = [
    ['full', 750_000, 1, 'active', 'a_north'],
    ['full', 750_000, 1, 'ended', 'a_harbor'],
    ['two_pay', 375_000, 1, 'active', 'a_harbor'],
    ['two_pay', 375_000, 1, 'past_due', 'a_harbor'],
    ['two_pay', 375_000, 2, 'active', 'a_north'],
  ] as const;
  await db.insert(orders).values(
    seats.map(([option, amountTotal, paymentsMade, , accountId], i) => ({ ...order, id: `o_seat${i}`, plan: 'cohort', option, amountTotal, paymentsMade, accountId, stripeSubscriptionId: i === 3 ? 'sub_Harbor1' : null })),
  );
  await db.insert(plans).values(
    seats.map(([option, , , status, accountId], i) => ({ id: `p_seat${i}`, accountId, kind: 'cohort', option, seats: 2, cohortId: 'dec26', status, startsAt: NOW, orderId: `o_seat${i}`, createdAt: NOW - (20 - i) * DAY })),
  );
  fake = fakeConsoleStripe(
    {
      subscriptions: SUBS,
      invoices: INVOICES,
      refunds: [
        { id: 're_Console', amountCents: 5_000, chargeId: 'ch_Paid1', paymentIntentId: 'pi_Paid1', invoiceId: 'in_Paid1', created: NOW - 2 * DAY, status: 'succeeded', reason: null, metadata: { console_actor: 'st1', console_audit_id: '1' } },
        { id: 're_Failed', amountCents: 3_000, chargeId: 'ch_Ref', paymentIntentId: null, invoiceId: null, created: NOW - 3 * DAY, status: 'failed', reason: 'duplicate', metadata: {} },
        { id: 're_Dash', amountCents: 19_700, chargeId: 'ch_Ref', paymentIntentId: null, invoiceId: 'in_Refunded', created: NOW - 4 * DAY, status: 'succeeded', reason: 'requested_by_customer', metadata: {} },
        { id: 're_Old', amountCents: 9_900, chargeId: 'ch_Old', paymentIntentId: null, invoiceId: null, created: NOW - 45 * DAY, status: 'succeeded', reason: null, metadata: {} },
      ],
      charges: CHARGES,
    },
    SENTINEL,
  );
  await start();
});
afterEach(async () => {
  await app?.close();
  app = null;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const get = async (url: string, userId = 'st1') => {
  if (!app) throw new Error('no app');
  if (!cookies.has(userId)) cookies.set(userId, await app.signInAs(userId));
  return app.inject({ method: 'GET', url, headers: { cookie: cookies.get(userId)! } });
};
const body = <T>(res: { body: string }) => JSON.parse(res.body) as T;
const auditCount = async () => (await (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id))).length;

describe('the billing summary (spec § 7.6) @console', () => {
  it('answers § 7.6’s shape exactly', async () => {
    const res = await get(P.billingSummary);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const s = body<BillingSummary>(res);
    expect(Object.keys(s).sort()).toEqual(['accelerator', 'asOf', 'failedPayments', 'mrr', 'plans', 'refunds30d', 'skillPurchases']);
    expect(s.skillPurchases).toEqual([]);
    expect(Object.keys(s.mrr).sort()).toEqual(['activeSubscriptions', 'cents', 'pastDue', 'trialing']);
    expect(Object.keys(s.accelerator).sort()).toEqual(['cap', 'collectedCents', 'opensAt', 'paidInFull', 'scheduledCents', 'sold', 'twoPay']);
    for (const p of s.plans) expect(Object.keys(p).sort()).toEqual(['active', 'kind', 'label', 'mrrCents', 'priceLabel', 'seats']);
    expect(s.asOf).toBe(NOW);
  });

  it('MRR: active and past due, a month each, no tax, no trials, no installments, no smoke test', async () => {
    const s = body<BillingSummary>(await get(P.billingSummary));
    // 497 + 997 + 790/12 + 197 + 10 × 52/12 = 1,800.17
    expect(s.mrr).toEqual({ cents: 180_017, activeSubscriptions: 5, trialing: 1, pastDue: 1 });
    expect(s.plans.map((p) => [p.label, p.active, p.mrrCents, p.priceLabel])).toEqual([
      ['Team Plan · 16 seats', 1, 49_700, '$497 monthly'],
      ['Team Plan · 41 seats', 1, 99_700, '$997 monthly'],
      ['Agent Plan', 1, 6_583, '$117 per agent, monthly or $790 yearly'],
      ['Insiders', 1, 19_700, '$169 monthly or $1,997 yearly'],
      ['Insiders for Agents', 0, 0, '$79 monthly'],
      ['AI Accelerator', 4, null, '$7,500 or 2 × $3,750'],
    ]);
    expect(s.plans.map((p) => p.seats)).toEqual([16, 41, 1, 2, 1, 2]);
  });

  it('counts failed payments and the last 30 days’ refunds', async () => {
    const s = body<BillingSummary>(await get(P.billingSummary));
    expect(s.failedPayments).toBe(1);
    // The console refund and the Dashboard one; not the failed one, not the one 45 days ago.
    expect(s.refunds30d).toBe(24_700);
  });

  it('prices come from the price cache, or read "Unavailable"; no amount is typed in', async () => {
    await start({ price: prices(null) });
    const s = body<BillingSummary>(await get(P.billingSummary));
    expect(s.plans.map((p) => p.priceLabel)).toEqual(Array(6).fill('Unavailable'));
    const code = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    const src = code('../src/console/billing.ts') + code('../../../packages/core/src/console-billing.ts');
    expect(src).not.toMatch(/\$\s?\d|\b(497|997|1997|7500|3750|750000|375000)\b/);
  });

  it('accelerator.sold is D-154’s own counter, before and after a refund ends a seat', async () => {
    const db = await testDatabase();
    let s = body<BillingSummary>(await get(P.billingSummary));
    expect(s.accelerator.sold).toBe(await cohortSeatsSold(db));
    // R-5 Phase 5 (D-262): the cap is December's own (`capacity`): 15 in production, this demo database's 200.
    const cap = (await db.select({ capacity: cohorts.capacity }).from(cohorts).where(eq(cohorts.id, 'dec26')))[0]!.capacity;
    expect(s.accelerator).toMatchObject({ sold: 4, cap, paidInFull: 2, twoPay: 2, collectedCents: 2_250_000, scheduledCents: 750_000 });
    expect(s.accelerator.paidInFull + s.accelerator.twoPay).toBe(s.accelerator.sold);
    await db.update(plans).set({ status: 'ended' }).where(eq(plans.id, 'p_seat0'));
    process.env.FIXED_NOW = new Date(NOW + 11 * 60_000).toISOString();
    s = body<BillingSummary>(await get(P.billingSummary));
    expect(s.accelerator.sold).toBe(await cohortSeatsSold(db));
    expect(s.accelerator.sold).toBe(3);
  });

  it('keeps the summary 10 minutes, and says when it was read', async () => {
    await get(P.billingSummary);
    const calls = fake.calls.length;
    process.env.FIXED_NOW = new Date(NOW + 9 * 60_000).toISOString();
    expect(body<BillingSummary>(await get(P.billingSummary)).asOf).toBe(NOW);
    expect(fake.calls.length).toBe(calls);
    process.env.FIXED_NOW = new Date(NOW + 10 * 60_000).toISOString();
    expect(body<BillingSummary>(await get(P.billingSummary)).asOf).toBe(NOW + 10 * 60_000);
    expect(fake.calls.length).toBeGreaterThan(calls);
  });
});

describe('Stripe refusals (spec § 7.6) @console', () => {
  it('no key: 503 stripe_not_connected, on every billing route', async () => {
    await start({ stripe: null });
    // R-5 Phase 8 (D-269): Revenue › Summary answers without Stripe (its seats are the database's, every Stripe figure
    // null: "Unavailable"), and the sidebar's count is memory only (`console-revenue.test.ts`).
    for (const path of Object.values(P).filter((x) => x !== P.billingRevenue && x !== P.billingFailedCount)) {
      const res = await get(path);
      expect(res.statusCode, path).toBe(503);
      expect(body<{ code: string }>(res).code).toBe('stripe_not_connected');
    }
  });

  it('a missing Read permission: 503 naming the scope, and never any of the key', async () => {
    const cases = [
      ['listSubscriptions', P.billingSubscriptions, 'Subscriptions'],
      ['listInvoices', P.billingInvoices, 'Invoices'],
      ['listRefunds', P.billingRefunds, 'Refunds'],
      ['retrieveCharge', P.billingInvoices, 'Charges'],
    ] as const;
    for (const [method, path, scope] of cases) {
      for (const k of Object.keys(fake.fail)) delete fake.fail[k as keyof typeof fake.fail];
      fake.fail[method] = 'permission';
      const res = await get(path);
      expect(res.statusCode, method).toBe(503);
      expect(body(res)).toEqual({ error: `Stripe’s restricted key can’t read ${scope}. Add Read on ${scope} to the key.`, code: 'stripe_permission_missing', scope });
    }
    fake.fail.listSubscriptions = 'permission';
    expect((await get(P.billingSummary)).statusCode).toBe(503);
    // The sentinel, any 4-character slice of its secret part, or its length: in no answer or log line.
    const bodies = (await Promise.all(Object.values(P).map(async (p) => (await get(p)).body))).join('\n');
    const out = `${JSON.stringify(logs)}\n${bodies}`;
    expect(out).not.toContain(SENTINEL);
    const secret = SENTINEL.slice('rk_live_'.length);
    for (let i = 0; i + 4 <= secret.length; i++) expect(out, secret.slice(i, i + 4)).not.toContain(secret.slice(i, i + 4));
    expect(bodies).not.toMatch(new RegExp(`\\b${SENTINEL.length}\\b`));
  });

  it('any other failure: 502 stripe_unavailable, its reason logged by code only', async () => {
    fake.fail.listInvoices = 'network';
    const res = await get(P.billingInvoices);
    expect(res.statusCode).toBe(502);
    expect(body(res)).toEqual({ error: 'Stripe didn’t answer. Nothing was changed.', code: 'stripe_unavailable' });
    expect(logs.join('')).toContain('StripeConnectionError');
    expect(logs.join('')).not.toContain(SENTINEL);
  });
});

describe('the billing lists (spec § 7.6, § 7’s conventions) @console', () => {
  it('subscriptions: every status, newest first, with the workspace, plan, MRR and a test-mode Dashboard link', async () => {
    const page = body<ConsolePage<Record<string, unknown>>>(await get(`${P.billingSubscriptions}?limit=3`));
    expect(page.rows.map((r) => r.id)).toEqual(['sub_Team16', 'sub_Team41', 'sub_AgentY']);
    expect(page.rows[0]).toEqual({
      id: 'sub_Team16',
      customerId: 'cus_North123',
      workspace: { teamId: 'northline', name: expect.any(String) },
      planLabel: 'Team Plan · 16 seats',
      status: 'active',
      mrrCents: 49_700,
      url: 'https://dashboard.stripe.com/test/subscriptions/sub_Team16',
    });
    expect(page.nextCursor).toBe('sub_AgentY');
    const next = body<ConsolePage<{ id: string; mrrCents: number | null }>>(await get(`${P.billingSubscriptions}?limit=3&cursor=sub_AgentY`));
    expect(next.rows.map((r) => r.id)).toEqual(['sub_Ins', 'sub_Trial', 'sub_TwoPay']);
    expect(next.rows.find((r) => r.id === 'sub_TwoPay')!.mrrCents).toBeNull();
    expect((await get(`${P.billingSubscriptions}?cursor=nope'`)).statusCode).toBe(400);
  });

  it('live mode links to the live Dashboard', async () => {
    await start({ mode: 'live' });
    const page = body<ConsolePage<{ url: string }>>(await get(`${P.billingSubscriptions}?limit=1`));
    expect(page.rows[0]!.url).toBe('https://dashboard.stripe.com/subscriptions/sub_Team16');
  });

  it('invoices: each status, the card, what is refunded and what is still refundable', async () => {
    const rows = body<ConsolePage<Record<string, unknown>>>(await get(P.billingInvoices)).rows;
    expect(rows.map((r) => [r.id, r.status, r.attemptCount, r.refundedCents, r.refundableCents, r.paymentMethod])).toEqual([
      ['in_Paid1', 'paid', 0, 10_000, 39_700, 'Visa ending 4242'],
      ['in_Open1', 'open', 2, 0, 0, 'Mastercard ending 5521'],
      ['in_Open2', 'open', 0, 0, 0, null],
      ['in_Draft', 'draft', 0, 0, 0, null],
      ['in_Refunded', 'paid', 0, 19_700, 0, 'Amex ending 1007'],
    ]);
    expect(rows[1]).toMatchObject({ customerName: 'Natasha Brooks', workspace: { teamId: 'harbor' }, url: 'https://dashboard.stripe.com/test/invoices/in_Open1' });
    // No name on the invoice: the workspace's.
    expect(rows[0]!.customerName).toBe((rows[0]!.workspace as { name: string }).name);
  });

  it('failed: open invoices Stripe tried, cross-referenced with the order and plan', async () => {
    const page = body<ConsolePage<Record<string, unknown>>>(await get(P.billingFailed));
    expect(page).toEqual({
      rows: [
        {
          invoiceId: 'in_Open1',
          customerName: 'Natasha Brooks',
          workspace: { teamId: 'harbor', name: expect.any(String) },
          planLabel: 'AI Accelerator',
          orderId: 'o_seat3',
          amountCents: 99_700,
          declineReason: 'card_declined: insufficient_funds',
          attempts: 2,
          nextRetryAt: NOW + DAY,
          url: 'https://dashboard.stripe.com/test/invoices/in_Open1',
        },
      ],
      nextCursor: null,
    });
  });

  it('refunds: who on staff refunded from the metadata and the audit log, else Stripe’s reason', async () => {
    const db = await testDatabase();
    await db.insert(auditLog).values({ at: NOW - 2 * DAY, actorUserId: 'st1', actorRole: 'Owner', actorSource: 'staff', action: 'billing.refund', targetType: 'invoice', targetId: 'in_Paid1', reason: 'Canceled inside trial window', outcome: 'ok' });
    const rows = body<ConsolePage<Record<string, unknown>>>(await get(P.billingRefunds)).rows;
    expect(rows[0]).toEqual({
      id: 're_Console',
      invoiceId: 'in_Paid1',
      amountCents: 5_000,
      reason: 'Canceled inside trial window',
      byStaff: { userId: 'st1', name: expect.any(String) },
      status: 'succeeded',
      created: NOW - 2 * DAY,
      url: 'https://dashboard.stripe.com/test/payments/pi_Paid1',
    });
    expect(rows.find((r) => r.id === 're_Dash')).toMatchObject({ reason: 'Requested by customer', byStaff: null, invoiceId: 'in_Refunded', url: 'https://dashboard.stripe.com/test/payments/ch_Ref' });
  });

  it('customers: every account with a Stripe customer, by name, a page at a time, with its plan and MRR', async () => {
    const first = body<ConsolePage<Record<string, unknown>>>(await get(`${P.billingCustomers}?limit=1`));
    expect(first.rows.length).toBe(1);
    expect(first.nextCursor).toEqual(expect.any(String));
    const second = body<ConsolePage<Record<string, unknown>>>(await get(`${P.billingCustomers}?limit=1&cursor=${first.nextCursor}`));
    const all = [...first.rows, ...second.rows];
    expect(second.nextCursor).toBeNull();
    expect(all.map((r) => r.id).sort()).toEqual(['cus_Harbor9', 'cus_North123']);
    const harbor = all.find((r) => r.id === 'cus_Harbor9')!;
    // Its running plan is the Accelerator (two-pay), so its MRR reads one-time.
    expect(harbor).toMatchObject({ workspace: { teamId: 'harbor' }, planKind: 'cohort', mrrCents: null, url: 'https://dashboard.stripe.com/test/customers/cus_Harbor9' });
    expect((await get(`${P.billingCustomers}?cursor=%%%`)).statusCode).toBe(400);
  });

  it('the scope probe: presence only, by asking the smallest allowed question', async () => {
    fake.fail.listRefunds = 'permission';
    const s = body<{ mode: string; scopes: Record<string, boolean | null> }>(await get(P.billingScopes));
    expect(s.mode).toBe('test');
    expect(s.scopes).toEqual({ Subscriptions: true, Invoices: true, Charges: true, Refunds: false, Customers: true });
    expect(JSON.stringify(s)).not.toContain(SENTINEL);
  });

  it('writes nothing: no audit row, and Support reads it too (read-only, D3)', async () => {
    const before = await auditCount();
    for (const p of Object.values(P)) expect((await get(p, 'st4')).statusCode, p).toBe(200);
    for (const p of Object.values(P)) expect((await get(p, 'st1')).statusCode, p).toBe(200);
    expect(await auditCount()).toBe(before);
  });
});

describe('the read client (D-163) @console', () => {
  it('has read calls only: nothing in it can create, update, refund, void or cancel', () => {
    const src = readFileSync(new URL('../src/console/stripe-read.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\.(create|update|del|cancel|voidInvoice|finalizeInvoice|pay|markUncollectible|sendInvoice|resume|search)\(/);
    expect(src).toMatch(/subscriptions\.list\(/);
    // `billing/stripe.ts` is untouched by this PR; the Console never imports it.
    for (const f of ['billing.ts', 'stripe-read.ts']) expect(readFileSync(new URL(`../src/console/${f}`, import.meta.url), 'utf8')).not.toMatch(/billing\/stripe'/);
  });

  it('caches each read 10 minutes, one call in flight, and never keeps a failure', async () => {
    let t = 0;
    const f = fakeConsoleStripe({ subscriptions: SUBS });
    const c = cachedConsoleStripe(f.stripe, () => t);
    await Promise.all([c.listSubscriptions({ limit: 2 }), c.listSubscriptions({ limit: 2 })]);
    expect(f.calls).toEqual(['listSubscriptions']);
    t = 9 * 60_000;
    await c.listSubscriptions({ limit: 2 });
    await c.listSubscriptions({ limit: 3 });
    expect(f.calls.length).toBe(2);
    t = 10 * 60_000;
    await c.listSubscriptions({ limit: 2 });
    expect(f.calls.length).toBe(3);
    f.fail.listInvoices = 'network';
    await expect(c.listInvoices({ limit: 1 })).rejects.toThrow();
    delete f.fail.listInvoices;
    await expect(c.listInvoices({ limit: 1 })).resolves.toEqual({ data: [], hasMore: false });
  });

  it('turns Stripe’s errors into ours, keeping only the scope or the code', async () => {
    const f = fakeConsoleStripe({}, SENTINEL);
    const s = scopedConsoleStripe(f.stripe);
    f.fail.retrieveCustomer = 'permission';
    const e1 = await s.retrieveCustomer('cus_x').catch((e: Error) => e);
    expect(e1).toMatchObject({ name: 'StripeScopeError', scope: 'Customers' });
    f.fail.listRefunds = 'missing';
    const e2 = await s.listRefunds({ limit: 1 }).catch((e: Error) => e);
    expect(e2).toMatchObject({ name: 'StripeReadError', reason: 'resource_missing' });
    for (const e of [e1, e2]) expect(`${(e as Error).message}${(e as Error).stack}`).not.toContain(SENTINEL);
    expect(stripeError('permission', SENTINEL).message).toContain(SENTINEL);
  });
});
