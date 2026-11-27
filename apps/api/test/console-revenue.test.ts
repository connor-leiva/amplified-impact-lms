// R-5 Phase 8 (D-269): Revenue › Summary's route against the fake Stripe (spec § 9: no live calls). Each figure as the
// spec defines it, test accounts and access groups' members left out, Stripe unreadable as "Unavailable" (null, never a
// zero) with the seats still answered, the period, and the sidebar's "N failed" read from memory only.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedForDatabase } from '@ai/core';
import type { BillingSubscription, RevenueSummary } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember } from '../src/billing/access-groups';
import { BILLING_PATHS } from '../src/console/billing';
import type { ConsoleStripe, ReadInvoice } from '../src/console/stripe-read';
import { accessGroups, accounts, orders, plans, skillPurchases, teams, users } from '../src/db/schema';
import { fakeConsoleStripe } from './fake-console-stripe';
import { resetDatabase, testDatabase } from './helpers';

// Thu, Dec 10, 2026, 9:30 AM MT.
const NOW = Date.parse('2026-12-10T16:30:00Z');
const DAY = 86_400_000;
const P = BILLING_PATHS;

const item = (lookupKey: string, unitAmount: number, interval: 'month' | 'year' = 'month') => ({ lookupKey, unitAmount, interval, intervalCount: 1, quantity: 1 });
const sub = (id: string, customerId: string, items: BillingSubscription['items'], over: Partial<BillingSubscription> = {}): BillingSubscription => ({
  id,
  customerId,
  status: 'active',
  created: NOW - 60 * DAY,
  metadata: {},
  items,
  currentPeriodEnd: NOW + 10 * DAY,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  ...over,
});
const inv = (id: string, customerId: string, subscriptionId: string | null, cents: number, at: number, over: Partial<ReadInvoice> = {}): ReadInvoice => ({
  id,
  customerId,
  customerName: null,
  subscriptionId,
  status: 'paid',
  totalCents: cents,
  amountPaidCents: cents,
  amountRemainingCents: 0,
  attemptCount: 0,
  created: at,
  nextPaymentAttempt: null,
  paymentIntentId: null,
  chargeId: null,
  paidAt: at,
  billingReason: 'subscription_cycle',
  ...over,
});

let app: App | null = null;
let fake: ReturnType<typeof fakeConsoleStripe>;
let cookie: string;

async function start(stripe: ConsoleStripe | null = fake.stripe): Promise<void> {
  await app?.close();
  app = await build({ logger: false, consoleBilling: { stripe, mode: 'test' } });
  cookie = await app.signInAs('st1');
}
const get = async (url: string) => app!.inject({ method: 'GET', url, headers: { cookie } });
const revenue = async (period?: string) => JSON.parse((await get(`${P.billingRevenue}${period ? `?period=${period}` : ''}`)).body) as RevenueSummary;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  const team = async (id: string, test = false) => {
    await db.insert(users).values({ id: `u_${id}`, email: `${id}@example.test`, name: `Owner ${id}`, kind: 'learner', tier: 'team', role: 'Team Owner', teamId: `t_${id}`, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOW - 30 * DAY, seq: 100, isTest: test });
    await db.insert(teams).values({ id: `t_${id}`, name: `Team ${id}`, ownerId: `u_${id}`, seats: 5, seq: 100 });
    await db.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: `u_${id}`, ownerEmail: `${id}@example.test`, name: `Team ${id}`, stripeCustomerId: `cus_${id}`, createdAt: NOW - 30 * DAY });
  };
  await team('full');
  await team('two');
  await team('jan');
  await team('plan');
  await team('tester', true);
  const order = { origin: 'payment_link', currency: 'usd', status: 'paid', createdAt: NOW - 20 * DAY } as const;
  await db.insert(orders).values([
    { ...order, id: 'o_full', plan: 'cohort', option: 'full', amountTotal: 750_000, paymentsMade: 1, accountId: 'a_full', stripeCustomerId: 'cus_full', stripeSubscriptionId: 'sub_full' },
    { ...order, id: 'o_two', plan: 'cohort', option: 'two_pay', amountTotal: 375_000, paymentsMade: 1, accountId: 'a_two', stripeCustomerId: 'cus_two', stripeSubscriptionId: 'sub_two' },
    { ...order, id: 'o_jan', plan: 'cohort', option: 'full', amountTotal: 750_000, paymentsMade: 1, accountId: 'a_jan', stripeCustomerId: 'cus_jan', stripeSubscriptionId: 'sub_jan', cohortId: 'jan27' },
    { ...order, id: 'o_plan', plan: 'agents', option: 'upto15', amountTotal: 69_500, paymentsMade: 1, accountId: 'a_plan', stripeCustomerId: 'cus_plan', stripeSubscriptionId: 'sub_plan' },
    { ...order, id: 'o_tester', plan: 'cohort', option: 'full', amountTotal: 750_000, paymentsMade: 1, accountId: 'a_tester', stripeCustomerId: 'cus_tester', stripeSubscriptionId: 'sub_tester' },
  ]);
  const plan = { seats: 5, status: 'active', startsAt: NOW, createdAt: NOW - 20 * DAY } as const;
  await db.insert(plans).values([
    { ...plan, id: 'p_full', accountId: 'a_full', kind: 'cohort', option: 'full', cohortId: DEFAULT_COHORT_ID, orderId: 'o_full' },
    { ...plan, id: 'p_two', accountId: 'a_two', kind: 'cohort', option: 'two_pay', cohortId: DEFAULT_COHORT_ID, orderId: 'o_two' },
    { ...plan, id: 'p_jan', accountId: 'a_jan', kind: 'cohort', option: 'full', cohortId: 'jan27', orderId: 'o_jan' },
    { ...plan, id: 'p_plan', accountId: 'a_plan', kind: 'agents', option: 'upto15', orderId: 'o_plan' },
    { ...plan, id: 'p_tester', accountId: 'a_tester', kind: 'cohort', option: 'full', cohortId: DEFAULT_COHORT_ID, orderId: 'o_tester' },
  ]);
  // A skill buyer, and a Utah Life agent (a team of one, no plan) who bought one too: the agent's is left out.
  await db.insert(users).values({ id: 'u_skill', email: 'skill@example.test', name: 'Sky Skill', kind: 'learner', tier: 'agent', role: 'Agent', teamId: null, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOW - 5 * DAY, seq: 102 });
  await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - 30 * DAY });
  const utah = (await provisionGroupMember(db, 'agent@liveutah.com', NOW - 10 * DAY, 'Uma Utah'))!;
  await db.insert(skillPurchases).values([
    { id: 'sp_1', userId: 'u_skill', skillId: 'map-your-spend', stripeSessionId: 'cs_1', stripePaymentIntentId: 'pi_sk1', amount: 3_700, purchasedAt: NOW - 2 * DAY },
    { id: 'sp_utah', userId: utah, skillId: 'map-your-spend', stripeSessionId: 'cs_2', stripePaymentIntentId: 'pi_sk2', amount: 3_700, purchasedAt: NOW - 2 * DAY },
  ]);
  fake = fakeConsoleStripe({
    subscriptions: [
      sub('sub_full', 'cus_full', [item('membership_monthly_team_leader', 16_900)], { status: 'trialing', trialEnd: NOW + 145 * DAY, currentPeriodEnd: NOW + 145 * DAY }),
      sub('sub_two', 'cus_two', [item('cohort_founding_two_pay', 375_000)], { currentPeriodEnd: NOW + 20 * DAY }),
      sub('sub_jan', 'cus_jan', [item('membership_monthly_team_leader', 16_900)], { status: 'trialing', trialEnd: NOW + 200 * DAY }),
      sub('sub_plan', 'cus_plan', [item('agents_upto15_founding', 69_500)], { currentPeriodEnd: NOW + 5 * DAY }),
      sub('sub_tester', 'cus_tester', [item('membership_monthly', 9_700)], { currentPeriodEnd: NOW + 3 * DAY }),
    ],
    invoices: [
      inv('in_full', 'cus_full', 'sub_full', 750_000, NOW - 15 * DAY, { billingReason: 'subscription_create' }),
      inv('in_two', 'cus_two', 'sub_two', 375_000, NOW - 9 * DAY, { billingReason: 'subscription_create' }),
      inv('in_jan', 'cus_jan', 'sub_jan', 750_000, NOW - 3 * DAY, { billingReason: 'subscription_create' }),
      inv('in_plan', 'cus_plan', 'sub_plan', 69_500, NOW - 25 * DAY, { billingReason: 'subscription_create' }),
      inv('in_tester', 'cus_tester', 'sub_tester', 750_000, NOW - 4 * DAY, { billingReason: 'subscription_create' }),
      inv('in_failed', 'cus_plan', 'sub_plan', 0, NOW - 2 * DAY, { status: 'open', amountPaidCents: 0, amountRemainingCents: 69_500, attemptCount: 1, nextPaymentAttempt: NOW + DAY, paidAt: null }),
    ],
    refunds: [{ id: 're_tester', amountCents: 750_000, chargeId: null, paymentIntentId: null, invoiceId: 'in_tester', created: NOW - DAY, status: 'succeeded', reason: null, metadata: {} }],
  });
  await start();
});
afterEach(async () => {
  await app?.close();
  app = null;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('Revenue › Summary (D-269) @console', () => {
  it('answers each figure by the spec’s definition, test accounts and the Utah Life agent left out', async () => {
    const s = await revenue();
    expect(s.stripeError).toBeNull();
    // 7,500 + 3,750 + 7,500 (January's) + 695 + 37. Not the test account's seat, its refund, or the Utah Life agent's skill.
    expect(s.cash).toEqual({ collectedCents: 750_000 + 375_000 + 750_000 + 69_500 + 3_700 });
    expect(s.stillToCollect).toEqual({ cents: 375_000, payments: 1, nextAt: NOW + 20 * DAY });
    expect(s.mrr).toEqual({ cents: 69_500, subscriptions: 1 });
    expect(s.failed).toBe(1);
    const dec = s.cohorts.find((c) => c.cohortId === DEFAULT_COHORT_ID)!;
    expect(dec).toMatchObject({ sold: 2, paidInFull: 1, paidInFullCents: 750_000, twoPay: 1, twoPayInCents: 375_000, scheduledCents: 375_000, collectedCents: 1_125_000, refunds: 0 });
    expect(s.cohorts.find((c) => c.cohortId === 'jan27')).toMatchObject({ sold: 1, collectedCents: 750_000 });
    expect(s.lines.find((l) => l.line === 'agents16')).toMatchObject({ active: 1, people: 1, collectedCents: 69_500, mrrCents: 69_500 });
    expect(s.skills).toEqual({ bought: 1, collectedCents: 3_700 });
    expect(s.coming!.map((c) => [c.kind, c.at - NOW, c.name])).toEqual([
      ['retry', DAY, 'Team plan'],
      ['renewal', 5 * DAY, 'Team plan'],
      ['second', 20 * DAY, 'Team two'],
    ]);
    expect(s.refunds30d).toEqual({ cents: 0, count: 0, latest: null });
  });

  it('This month is December from its first day in MT; a period it doesn’t know is refused', async () => {
    const s = await revenue('month');
    expect(s.period).toBe('month');
    expect(s.periodStart).toBe(Date.parse('2026-12-01T07:00:00Z'));
    // November's two seats are out of it.
    expect(s.cash).toEqual({ collectedCents: 375_000 + 750_000 + 3_700 });
    expect((await get(`${P.billingRevenue}?period=year`)).statusCode).toBe(400);
  });

  it('Stripe unreadable is "Unavailable", never a zero, and the seats are still answered', async () => {
    fake.fail.listInvoices = 'permission';
    const s = await revenue();
    expect(s.stripeError).toEqual({ reason: 'permission', scope: 'Invoices' });
    expect([s.cash, s.mrr, s.failed, s.months, s.coming]).toEqual([null, null, null, null, null]);
    expect(s.stillToCollect).toEqual({ cents: 375_000, payments: 1, nextAt: null });
    // An answer with Stripe unreadable is not kept: the next read asks again.
    delete fake.fail.listInvoices;
    expect((await revenue()).stripeError).toBeNull();
    await start(null);
    expect((await revenue()).stripeError).toEqual({ reason: 'not_connected' });
  });

  it('Utah Life agents are in no card and no row: the same with and without them (D-267’s rule, never users.cohort_id)', async () => {
    const db = await testDatabase();
    const without = await revenue();
    // More agents, each as provisioning makes them: December's `cohort_id`, Agent tier, a team of one, no plan row.
    for (const n of [1, 2, 3]) await provisionGroupMember(db, `agent${n}@liveutah.com`, NOW - DAY, `Agent ${n}`);
    const rows = (await db.select({ cohortId: users.cohortId, tier: users.tier, email: users.email }).from(users)).filter((u) => u.email.endsWith('@liveutah.com'));
    expect(rows).toHaveLength(4);
    expect(rows.every((u) => u.cohortId === DEFAULT_COHORT_ID && u.tier === 'agent')).toBe(true);
    await start();
    const withAgents = await revenue();
    expect(withAgents.cohorts).toEqual(without.cohorts);
    expect(withAgents.lines).toEqual(without.lines);
    expect(withAgents.skills).toEqual(without.skills);
    expect(withAgents.cash).toEqual(without.cash);
    expect(withAgents.stillToCollect).toEqual(without.stillToCollect);
  });

  it('the sidebar’s "N failed" is memory only: null until a summary or Revenue is read, then its count', async () => {
    const before = fake.calls.length;
    expect(JSON.parse((await get(P.billingFailedCount)).body)).toEqual({ failed: null, asOf: null });
    expect(fake.calls.length).toBe(before);
    await revenue();
    expect(JSON.parse((await get(P.billingFailedCount)).body)).toEqual({ failed: 1, asOf: NOW });
    // Reading it again asks Stripe nothing.
    const after = fake.calls.length;
    await get(P.billingFailedCount);
    expect(fake.calls.length).toBe(after);
  });
});
