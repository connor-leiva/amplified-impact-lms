// R-5 Phase 8 (D-269): Revenue › Summary's facts. `GET /api/console/billing/revenue?period=all|month` (registered with
// Billing's routes, `billing.ts`, `billing.read`) reads them here and answers core's `buildRevenueSummary`.
//
// WHAT IT READS: only what Billing already reads (ADMIN-RESTRUCTURE-SPEC.md, Phase 8). Stripe, through the Console's
// cached read client (`cachedConsoleStripe`, 10 minutes), four list reads and nothing else: every subscription, every
// paid invoice, every open invoice (Billing's own read, `openInvoices`, so the two share one cached answer) and every
// refund. Never a Stripe call per row, customer, order, refund or cohort (D-269): a refund finds the invoice it refunded
// by its payment in the paid invoices already read, and every per-row figure comes from those lists or the database. No
// new Stripe scope, no new kind of Stripe object, no write. The database: `orders`, `plans` (`countedCohortSeat`),
// `accounts`, `users`, `teams`, `skill_purchases`, `cohorts`.
//
// WHO IS LEFT OUT (D-269): a Stripe customer whose account's owner is a test account (D-202), or whose team is an access
// group's team of one (D-268's `groupTeamOfOne`: no plan row, one member, whose address is in a group); and those
// people's skill purchases. A Stripe failure is never a zero: the answer marks Stripe unreadable and core leaves every
// Stripe figure null, while the seats, read from the database, are still answered.

import { and, eq, ne, sql } from 'drizzle-orm';
import { buildRevenueSummary } from '@ai/core';
import type { BillingSubscription, RevenueCustomer, RevenueFacts, RevenueOrder, RevenuePeriod, RevenueStripeError, RevenueStripeFacts, RevenueSummary } from '@ai/core';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { NO_SELLING_ENV } from '@ai/core/cohort-selling';
import { sellingOfMany } from '../billing/cohort-sale';
import { countedCohortSeat } from '../billing/provision';
import type { Database } from '../db/client';
import { cohorts, orders, plans } from '../db/schema';
import { openInvoices, readAll } from './billing';
import { inGroupSql } from './records';
import { StripeReadError, StripeScopeError } from './stripe-read';
import type { ConsoleStripe, ReadInvoice } from './stripe-read';

/** Stripe's part: every subscription, the paid and open invoices, every refund. A failure says why, never a zero. */
async function stripeFacts(stripe: ConsoleStripe | null): Promise<RevenueStripeFacts | RevenueStripeError> {
  if (!stripe) return { reason: 'not_connected' };
  try {
    const [subscriptions, paid, open, refunds] = await Promise.all([
      readAll<BillingSubscription>((after) => stripe.listSubscriptions({ status: 'all', limit: 100, startingAfter: after }), (s) => s.id),
      readAll<ReadInvoice>((after) => stripe.listInvoices({ status: 'paid', limit: 100, startingAfter: after }), (i) => i.id),
      openInvoices(stripe),
      // No `withInvoice`: that asks Stripe once per refund. Core finds the invoice by the refund's payment instead.
      readAll((after) => stripe.listRefunds({ limit: 100, startingAfter: after }), (r) => r.id),
    ]);
    return { subscriptions, paid, open, refunds };
  } catch (e) {
    if (e instanceof StripeScopeError) return { reason: 'permission', scope: e.scope };
    if (e instanceof StripeReadError) return { reason: 'unavailable' };
    throw e;
  }
}

/** The database's part. */
async function dbFacts(db: Database, now: number) {
  // Accounts left out: a test account's (D-202), and an access group's team of one (D-268).
  const left = (await db.execute(sql`
    select a.id, a.stripe_customer_id as customer from accounts a
    left join users o on o.id = a.owner_user_id
    where coalesce(o.is_test, false)
      or (
        not exists (select 1 from plans p join accounts x on x.id = p.account_id where x.team_id = a.team_id)
        and (select count(*) from users m where m.team_id = a.team_id) = 1
        and exists (select 1 from users m join access_groups g on ${inGroupSql(sql`m.email`, now)} where m.team_id = a.team_id)
      )
  `)) as unknown as { id: string; customer: string | null }[];
  const leftAccounts = new Set(left.map((a) => a.id));
  const excludedCustomers = new Set(left.map((a) => a.customer).filter((c): c is string => !!c));

  const orderRows = await db
    .select({ id: orders.id, plan: orders.plan, option: orders.option, cohortId: orders.cohortId, sub: orders.stripeSubscriptionId, customer: orders.stripeCustomerId, accountId: orders.accountId })
    .from(orders);
  for (const o of orderRows) if (o.customer && o.accountId && leftAccounts.has(o.accountId)) excludedCustomers.add(o.customer);
  const planRows = await db.select({ orderId: plans.orderId, sub: plans.stripeSubscriptionId, cohortId: plans.cohortId, kind: plans.kind, option: plans.option }).from(plans);
  const planOfOrder = new Map(planRows.map((p) => [p.orderId, p]));
  const bySub = new Map<string, RevenueOrder>();
  const cohortOf = (orderId: string, own: string | null) => planOfOrder.get(orderId)?.cohortId ?? own ?? DEFAULT_COHORT_ID;
  for (const o of orderRows) if (o.sub) bySub.set(o.sub, { plan: o.plan, option: o.option, cohortId: cohortOf(o.id, o.cohortId), subscriptionId: o.sub });
  for (const p of planRows) {
    if (!p.sub || bySub.has(p.sub)) continue;
    const o = orderRows.find((x) => x.id === p.orderId);
    bySub.set(p.sub, { plan: o?.plan ?? p.kind, option: o?.option ?? p.option, cohortId: p.cohortId ?? o?.cohortId ?? DEFAULT_COHORT_ID, subscriptionId: p.sub });
  }

  // Each Stripe customer's team and its people (a Team Plan row's "39 people"), as `localRefs` finds them.
  const accts = (await db.execute(sql`
    select a.id, a.team_id, coalesce(t.name, a.name) as name, a.stripe_customer_id as customer,
      (select count(*)::int from users m where m.team_id = a.team_id) as people
    from accounts a left join teams t on t.id = a.team_id
  `)) as unknown as { id: string; team_id: string; name: string | null; customer: string | null; people: number }[];
  const customers = new Map<string, RevenueCustomer>();
  const put = (customer: string | null, accountId: string | null) => {
    const a = accts.find((x) => x.id === accountId);
    if (!customer || !a || customers.has(customer)) return;
    customers.set(customer, { workspace: { teamId: a.team_id, name: a.name ?? a.team_id }, people: Number(a.people) });
  };
  for (const a of accts) put(a.customer, a.id);
  for (const o of orderRows) put(o.customer, o.accountId);

  // Skills bought on their own: the buyer not a test account, not an access group's member on a team of one.
  const skillRows = (await db.execute(sql`
    select s.amount, s.purchased_at, s.refunded_at, s.stripe_payment_intent_id as pi,
      (
        coalesce(u.is_test, false)
        or (s.account_id is not null and s.account_id in (select a.id from accounts a left join users o on o.id = a.owner_user_id where coalesce(o.is_test, false)))
        or (
          u.id is not null
          and exists (select 1 from access_groups g where ${inGroupSql(sql`u.email`, now)})
          and not exists (select 1 from plans p join accounts x on x.id = p.account_id where u.team_id is not null and x.team_id = u.team_id)
        )
      ) as excluded
    from skill_purchases s left join users u on u.id = s.user_id
  `)) as unknown as { amount: number | null; purchased_at: string | number; refunded_at: string | number | null; pi: string | null; excluded: boolean }[];
  const excludedSkillPayments = new Set(skillRows.filter((s) => s.excluded && s.pi).map((s) => s.pi!));
  const skills = skillRows
    .filter((s) => !s.excluded)
    .map((s) => ({ amountCents: s.amount, purchasedAt: Number(s.purchased_at), refundedAt: s.refunded_at === null ? null : Number(s.refunded_at), paymentIntentId: s.pi }));

  // The seats (`countedCohortSeat`: not ended, not a test account's, not a comp), every cohort's.
  const seatRows = await db
    .select({ cohortId: plans.cohortId, option: plans.option, paymentsMade: orders.paymentsMade, amountTotal: orders.amountTotal, orderSub: orders.stripeSubscriptionId, planSub: plans.stripeSubscriptionId })
    .from(plans)
    .leftJoin(orders, eq(orders.id, plans.orderId))
    .where(countedCohortSeat);
  const seats = seatRows.map((s) => ({
    cohortId: s.cohortId ?? DEFAULT_COHORT_ID,
    option: s.option,
    paymentsMade: s.paymentsMade ?? 0,
    amountTotal: s.amountTotal,
    subscriptionId: s.orderSub ?? s.planSub ?? null,
  }));
  // Refunded seats: a cohort order refunded, not a comp, not a test account's.
  const refundedRows = await db
    .select({ id: orders.id, cohortId: orders.cohortId, option: orders.option, paymentsMade: orders.paymentsMade, amountTotal: orders.amountTotal, accountId: orders.accountId })
    .from(orders)
    .where(and(eq(orders.plan, 'cohort'), eq(orders.status, 'refunded'), ne(orders.origin, 'comp')));
  const refundedSeats = refundedRows
    .filter((o) => !(o.accountId && leftAccounts.has(o.accountId)))
    .map((o) => ({ cohortId: cohortOf(o.id, o.cohortId), amountCents: (o.amountTotal ?? 0) * (o.option === 'two_pay' ? Math.max(1, o.paymentsMade) : 1) }));

  const ids = [...new Set([...(await db.select({ id: cohorts.id }).from(cohorts)).map((c) => c.id), ...seats.map((s) => s.cohortId), ...refundedSeats.map((s) => s.cohortId)])];
  const selling = await sellingOfMany(db, ids, NO_SELLING_ENV);
  return {
    orders: bySub,
    customers,
    excludedCustomers,
    excludedSkillPayments,
    skills,
    seats,
    refundedSeats,
    cohorts: ids.map((id) => ({ id, capacity: selling.get(id)!.capacity })),
  };
}

/** Revenue › Summary for a period, at `now`. */
export async function revenueSummary(db: Database, stripe: ConsoleStripe | null, now: number, period: RevenuePeriod): Promise<RevenueSummary> {
  const [s, d] = await Promise.all([stripeFacts(stripe), dbFacts(db, now)]);
  const facts: RevenueFacts = { now, period, stripe: s, ...d };
  return buildRevenueSummary(facts);
}
