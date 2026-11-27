// R-5 Phase 8 (D-269): the http build of Revenue › Summary against a fake Stripe in test mode, for the screenshots in
// this folder. The real API (`build()`, every route, the real Revenue route and its rules) over a database seeded with
// the demo seed and a handful of teams, with the Console's Stripe read client replaced by the test suite's fake
// (`apps/api/test/fake-console-stripe.ts`): no Stripe call is made, and nothing is written anywhere but this scratch
// database. A test account and a Utah Life agent are in it, each with a payment, to show they are in none of the figures.
//
//   pnpm --filter @ai/web build                 # the http build, apps/web/dist
//   cd apps/api && NODE_ENV=test FIXED_NOW=2026-12-10T16:30:00.000Z npx tsx ../../handoff/admin-mockup/compare/r5-phase8/serve-http.ts
//
// Its database is a fresh one made the deploy's way, the demo seed in it:
//
//   psql postgres://postgres:postgres@localhost:5432/postgres -c 'drop database if exists ai_lms_p8_shots' -c 'create database ai_lms_p8_shots'
//   export DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_lms_p8_shots
//   pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api db:seed
//
// It writes the Owner's session cookie to compliance/test-results/r5-phase8-cookie.txt and serves on :4391.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Relative, not the packages' names: this file sits outside every workspace package, so a bare import has nowhere to
// resolve from. Type imports are erased.
import type { BillingSubscription } from '@ai/core';
import { DEFAULT_COHORT_ID } from '../../../../packages/core/src/accelerator';
import { build, cspScriptHashes } from '../../../../apps/api/src/app';
import { provisionGroupMember } from '../../../../apps/api/src/billing/access-groups';
import type { ReadInvoice, ReadRefund } from '../../../../apps/api/src/console/stripe-read';
import { accessGroups, accounts, cohorts, orders, plans, skillPurchases, teams, users } from '../../../../apps/api/src/db/schema';
import { registerStaticFiles } from '../../../../apps/api/src/static';
import { getDb } from '../../../../apps/api/src/db/client';
import { fakeConsoleStripe } from '../../../../apps/api/test/fake-console-stripe';

const NOW = Date.parse(process.env.FIXED_NOW ?? '2026-12-10T16:30:00.000Z');
const DAY = 86_400_000;
const at = (iso: string) => Date.parse(iso);

const db = getDb();
// Production's seat cap (the demo seed's December, its one cohort, holds 200).
await db.update(cohorts).set({ capacity: 15 });

const TEAMS: [id: string, name: string, people: number, test?: boolean][] = [
  ['northline', 'Northline Realty', 9],
  ['harbor', 'Harbor & Pine Group', 14],
  ['copper', 'Copper Basin Realty', 2],
  ['lantern', 'Lantern Street Partners', 3],
  ['redcliff', 'Red Cliff Collective', 1],
  ['tidewater', 'Tidewater Property Co.', 1],
  ['fourth', 'Fourth Meridian', 1],
  ['tester', 'QA Test Team', 1, true],
];
let seq = 200;
for (const [id, name, people, test] of TEAMS) {
  for (let i = 0; i < people; i++)
    await db.insert(users).values({ id: `u_${id}${i}`, email: `${id}${i}@example.test`, name: `${name} ${i ? `Agent ${i}` : 'Owner'}`, kind: 'learner', tier: 'team', role: i ? 'Agent' : 'Team Owner', teamId: `t_${id}`, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOW - 60 * DAY, seq: seq++, isTest: !!test && i === 0 });
  await db.insert(teams).values({ id: `t_${id}`, name, ownerId: `u_${id}0`, seats: 16, seq: seq++ });
  await db.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: `u_${id}0`, ownerEmail: `${id}0@example.test`, name, stripeCustomerId: `cus_${id}`, createdAt: NOW - 90 * DAY });
}
const order = (id: string, plan: string, option: string, amount: number, made: number, sub: string, created: number) => ({
  id: `o_${id}`, plan, option, origin: 'payment_link', status: 'paid', currency: 'usd', amountTotal: amount, paymentsMade: made, accountId: `a_${id}`, stripeCustomerId: `cus_${id}`, stripeSubscriptionId: sub, createdAt: created,
});
await db.insert(orders).values([
  order('northline', 'agents', 'upto15', 69_500, 1, 'sub_northline', at('2026-09-18T17:00:00Z')),
  order('harbor', 'agents', '16to40', 149_500, 1, 'sub_harbor', at('2026-10-04T17:00:00Z')),
  order('copper', 'cohort', 'full', 750_000, 1, 'sub_copper', at('2026-11-24T17:00:00Z')),
  order('lantern', 'cohort', 'two_pay', 375_000, 1, 'sub_lantern', at('2026-11-28T17:00:00Z')),
  order('redcliff', 'agent_plan', 'monthly', 11_700, 1, 'sub_redcliff', at('2026-10-20T17:00:00Z')),
  order('tidewater', 'membership', 'monthly', 16_900, 1, 'sub_tidewater', at('2026-10-06T17:00:00Z')),
  order('fourth', 'agents', 'upto15', 69_500, 1, 'sub_fourth', at('2026-09-02T17:00:00Z')),
  order('tester', 'cohort', 'full', 750_000, 1, 'sub_tester', at('2026-12-01T17:00:00Z')),
]);
const plan = (id: string, kind: string, option: string, status = 'active', cohortId: string | null = null) => ({
  id: `p_${id}`, accountId: `a_${id}`, kind, option, seats: 16, status, cohortId, startsAt: NOW - 30 * DAY, orderId: `o_${id}`, createdAt: NOW - 30 * DAY,
});
await db.insert(plans).values([
  plan('northline', 'agents', 'upto15'),
  plan('harbor', 'agents', '16to40'),
  plan('copper', 'cohort', 'full', 'active', DEFAULT_COHORT_ID),
  plan('lantern', 'cohort', 'two_pay', 'active', DEFAULT_COHORT_ID),
  plan('redcliff', 'agent_plan', 'monthly'),
  plan('tidewater', 'membership', 'monthly', 'past_due'),
  plan('fourth', 'agents', 'upto15', 'ended'),
  plan('tester', 'cohort', 'full', 'active', DEFAULT_COHORT_ID),
]);
// Skills bought on their own, and a Utah Life agent's (left out).
await db.insert(users).values({ id: 'u_skill', email: 'sky@example.test', name: 'Sky Skill', kind: 'learner', tier: 'agent', role: 'Agent', teamId: null, cohortId: DEFAULT_COHORT_ID, status: 'active', joined: NOW - 20 * DAY, seq: seq++ });
// The demo seed's Utah Life group, made here when a database has none.
await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - 30 * DAY }).onConflictDoNothing();
const utah = (await provisionGroupMember(db, 'agent@liveutah.com', NOW - 10 * DAY, 'Uma Utah'))!;
await db.insert(skillPurchases).values([
  { id: 'sp_1', userId: 'u_skill', skillId: 'map-your-spend', stripeSessionId: 'cs_1', stripePaymentIntentId: 'pi_sk1', amount: 3_700, purchasedAt: at('2026-11-15T18:00:00Z') },
  { id: 'sp_2', userId: 'u_skill', skillId: 'lead-source-review', stripeSessionId: 'cs_2', stripePaymentIntentId: 'pi_sk2', amount: 3_700, purchasedAt: at('2026-12-03T18:00:00Z') },
  { id: 'sp_utah', userId: utah, skillId: 'map-your-spend', stripeSessionId: 'cs_3', stripePaymentIntentId: 'pi_sk3', amount: 3_700, purchasedAt: at('2026-12-04T18:00:00Z') },
]);

const item = (lookupKey: string, unitAmount: number, interval: 'month' | 'year' = 'month') => ({ lookupKey, unitAmount, interval, intervalCount: 1, quantity: 1 });
const sub = (id: string, status: string, items: BillingSubscription['items'], over: Partial<BillingSubscription> = {}): BillingSubscription => ({
  id: `sub_${id}`, customerId: `cus_${id}`, status, created: NOW - 60 * DAY, metadata: {}, items, currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false, ...over,
});
const paid = (id: string, n: number, cents: number, when: string, reason = 'subscription_cycle'): ReadInvoice => ({
  id: `in_${id}${n}`, customerId: `cus_${id}`, customerName: null, subscriptionId: `sub_${id}`, status: 'paid', totalCents: cents, amountPaidCents: cents, amountRemainingCents: 0, attemptCount: 0, created: at(when), paidAt: at(when), nextPaymentAttempt: null, billingReason: reason, paymentIntentId: `pi_${id}${n}`, chargeId: null,
});
const refund = (id: string, cents: number, invoiceId: string, when: string): ReadRefund => ({
  id, amountCents: cents, chargeId: null, paymentIntentId: null, invoiceId, created: at(when), status: 'succeeded', reason: 'requested_by_customer', metadata: {},
});
const fake = fakeConsoleStripe({
  subscriptions: [
    sub('northline', 'active', [item('agents_upto15_founding', 69_500)], { currentPeriodEnd: at('2026-12-18T17:00:00Z') }),
    sub('harbor', 'active', [item('agents_16to40_founding', 149_500)], { currentPeriodEnd: at('2027-01-04T17:00:00Z') }),
    sub('copper', 'trialing', [item('membership_monthly_team_leader', 16_900)], { trialEnd: at('2027-05-04T05:00:00Z') }),
    sub('lantern', 'active', [item('cohort_founding_two_pay', 375_000)], { currentPeriodEnd: at('2026-12-28T17:00:00Z') }),
    sub('redcliff', 'active', [item('agent_plan_monthly_117', 11_700)], { currentPeriodEnd: at('2026-12-20T17:00:00Z') }),
    sub('tidewater', 'past_due', [item('membership_monthly_team_leader', 16_900)], { currentPeriodEnd: at('2027-01-06T17:00:00Z') }),
    sub('fourth', 'canceled', [item('agents_upto15_founding', 69_500)]),
    sub('tester', 'trialing', [item('membership_monthly_team_leader', 16_900)], { trialEnd: at('2027-05-04T05:00:00Z') }),
  ],
  invoices: [
    paid('northline', 1, 69_500, '2026-09-18T17:00:00Z', 'subscription_create'),
    paid('northline', 2, 69_500, '2026-10-18T17:00:00Z'),
    paid('northline', 3, 69_500, '2026-11-18T17:00:00Z'),
    paid('harbor', 1, 149_500, '2026-10-04T17:00:00Z', 'subscription_create'),
    paid('harbor', 2, 149_500, '2026-11-04T17:00:00Z'),
    paid('harbor', 3, 149_500, '2026-12-04T17:00:00Z'),
    paid('copper', 1, 750_000, '2026-11-24T17:00:00Z', 'subscription_create'),
    paid('lantern', 1, 375_000, '2026-11-28T17:00:00Z', 'subscription_create'),
    paid('redcliff', 1, 11_700, '2026-10-20T17:00:00Z', 'subscription_create'),
    paid('redcliff', 2, 11_700, '2026-11-20T17:00:00Z'),
    paid('tidewater', 1, 16_900, '2026-10-06T17:00:00Z', 'subscription_create'),
    paid('tidewater', 2, 16_900, '2026-11-06T17:00:00Z'),
    paid('fourth', 1, 69_500, '2026-09-02T17:00:00Z', 'subscription_create'),
    paid('fourth', 2, 69_500, '2026-10-02T17:00:00Z'),
    paid('fourth', 3, 69_500, '2026-11-02T17:00:00Z'),
    paid('tester', 1, 750_000, '2026-12-01T17:00:00Z', 'subscription_create'),
    {
      ...paid('tidewater', 3, 0, '2026-12-06T17:00:00Z'),
      status: 'open', amountPaidCents: 0, amountRemainingCents: 16_900, attemptCount: 1, paidAt: null, nextPaymentAttempt: at('2026-12-12T16:00:00Z'),
    },
  ],
  refunds: [refund('re_fourth', 69_500, 'in_fourth3', '2026-11-25T23:44:00Z'), refund('re_tester', 750_000, 'in_tester1', '2026-12-02T17:00:00Z')],
});

const webDist = fileURLToPath(new URL('../../../../apps/web/dist', import.meta.url));
const app = await build({
  logger: false,
  inlineScriptHashes: cspScriptHashes([readFileSync(`${webDist}/index.html`, 'utf8')]),
  consoleBilling: { stripe: fake.stripe, mode: 'test' },
});
await registerStaticFiles(app, webDist);
const cookie = await app.signInAs('st1');
writeFileSync(fileURLToPath(new URL('../../../../compliance/test-results/r5-phase8-cookie.txt', import.meta.url)), cookie);
console.log(`COOKIE ${cookie}`);
await app.listen({ port: 4391, host: '127.0.0.1' });
