// R-5 Phase 5 (D-262): selling a seat in a cohort, through the real API, against a fake Stripe in test mode
// (ADMIN-RESTRUCTURE-SPEC.md Phase 5, PLAN.md § 10.5 and § 10.10, handoff/admin-mockup/PHASE5.md).
//
// The world: December as the launch seed and every data step make it (its selling values copied onto its record by
// Phase 5's own step), Connor's January made by the real admin action, and a fake Stripe that answers reads from a table
// and records every write. Nothing leaves this process, and every key is a test key (`rk_test_…`, `whsec_test_…`).
//
// "Done when" (the spec), as tests:
//   - a test-mode checkout through a January link provisions a January team that Phase 4 serves (its course, sessions
//     and Community are January's);
//   - a test-mode checkout through a December link provisions exactly what it does today;
//   - the seat after January's last behaves as December's 16th does today.
// Then: the four Enrollment actions over HTTP (the billing permission, one audit row each), what Stripe says on the
// facts route, Q-23's move both ways (Connor, Nov 26: the newest purchase decides), an unknown `ai_cohort`, the offer
// page selling the next cohort to start (Connor, Nov 26), and a source scan that nothing calls `prices.create` or
// `paymentLinks.create`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { and, asc, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { globSync } from 'node:fs';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import type { CohortWeek } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import { INSIDERS_FIRST_CHARGE_AT } from '@ai/core/offer';
import { build } from '../src/app';
import type { App } from '../src/app';
import { readOfferConfig } from '../src/billing/config';
import type { OfferConfig } from '../src/billing/config';
import { reconcileCohortSeats } from '../src/billing/payment-links';
import { createPriceCache } from '../src/billing/prices';
import { cohortSeatsSold } from '../src/billing/provision';
import { stripeVerifier } from '../src/billing/stripe';
import type { BillingStripe, PaymentLinkByUrl, PriceInfo, SubscriptionInfo } from '../src/billing/stripe';
import { handleStripeEvent } from '../src/billing/webhook';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { auditLog, cohorts, communityThreads, orders, plans, sessions, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOV27 = MT('2026-11-27T12:00:00');
const W = ACCELERATOR_MODULE_IDS;
const SECRET = 'whsec_test_cohort_selling';
const MAY10 = Date.parse('2027-05-10T00:00:00-05:00');

const JANUARY = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: DEFAULT_COHORT_ID,
  picks: W.slice(1, 7),
  shape: {
    setupWeek: true,
    slots: [
      { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
      { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
    ],
    hosts: 'Connor Leiva and Spring',
  },
};

/** Stripe's prices: December's keys, and the new keys Connor or Spring make by hand for January. */
const PRICES: PriceInfo[] = [
  { lookupKey: 'cohort_founding_full', id: 'price_dec_full', unitAmount: 750000, currency: 'usd', interval: null, productName: 'Amplified AI Accelerator' },
  { lookupKey: 'cohort_founding_two_pay', id: 'price_dec_two', unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1, productName: 'Amplified AI Accelerator' },
  { lookupKey: 'membership_monthly_team_leader', id: 'price_mtl', unitAmount: 16900, currency: 'usd', interval: 'month', intervalCount: 1, productName: 'Amplified Insiders' },
  { lookupKey: 'jan27_founding_full', id: 'price_jan_full', unitAmount: 800000, currency: 'usd', interval: null, productName: 'Amplified AI Accelerator' },
  { lookupKey: 'jan27_founding_two_pay', id: 'price_jan_two', unitAmount: 400000, currency: 'usd', interval: 'month', intervalCount: 1, productName: 'Amplified AI Accelerator' },
];
const JAN_LINKS = { full: 'https://buy.stripe.com/test_jan27_full', twoPay: 'https://buy.stripe.com/test_jan27_two' };
const DEC_LINKS = { full: 'https://buy.stripe.com/test_dec26_full', twoPay: 'https://buy.stripe.com/test_dec26_two' };

/** A fake Stripe in test mode. It answers reads from its tables and records every write; it can create nothing else. */
function fakeStripe(janCohort: () => string) {
  const writes: { call: string; id?: string; params: unknown; key?: string }[] = [];
  const links = new Map<string, PaymentLinkByUrl>([
    ['plink_dec_full', { id: 'plink_dec_full', url: DEC_LINKS.full, active: true, metadata: { ai_plan: 'cohort', ai_option: 'full' } }],
    ['plink_dec_two', { id: 'plink_dec_two', url: DEC_LINKS.twoPay, active: true, metadata: { ai_plan: 'cohort', ai_option: 'two_pay' } }],
  ]);
  const addJanuaryLinks = () => {
    links.set('plink_jan_full', { id: 'plink_jan_full', url: JAN_LINKS.full, active: true, metadata: { ai_plan: 'cohort', ai_option: 'full', ai_cohort: janCohort() } });
    links.set('plink_jan_two', { id: 'plink_jan_two', url: JAN_LINKS.twoPay, active: true, metadata: { ai_plan: 'cohort', ai_option: 'two_pay', ai_cohort: janCohort() } });
  };
  const sub = (id: string): SubscriptionInfo => ({
    id,
    status: id.endsWith('_full') ? 'trialing' : 'active',
    customer: `cus_${id}`,
    trialEnd: id.endsWith('_full') ? NOV27 + 90 * 86_400_000 : null,
    defaultPaymentMethod: 'pm_sub',
    metadata: {},
    cancelAt: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });
  const client: BillingStripe = {
    pricesByLookupKeys: async (keys) => PRICES.filter((p) => keys.includes(p.lookupKey)),
    retrievePaymentLink: async (id) => {
      const l = links.get(id);
      if (!l) throw Object.assign(new Error('No such payment link'), { statusCode: 404 });
      return { id, active: l.active, metadata: { ...l.metadata } };
    },
    updatePaymentLink: async (id, change, key) => {
      writes.push({ call: 'paymentLinks.update', id, params: change, key });
      const l = links.get(id)!;
      const metadata = { ...l.metadata, ...change.metadata };
      for (const [k, v] of Object.entries(change.metadata)) if (v === '') delete metadata[k];
      links.set(id, { ...l, active: change.active, metadata });
      return { id, active: change.active, metadata };
    },
    paymentLinksByUrl: async (urls) => new Map([...links.values()].filter((l) => urls.includes(l.url)).map((l) => [l.url, { ...l }])),
    retrieveSubscription: async (id) => sub(id),
    paidInvoiceIds: async () => [],
    updateSubscription: async (id, params, key) => {
      writes.push({ call: 'subscriptions.update', id, params, ...(key ? { key } : {}) });
      return sub(id);
    },
    createSubscription: async (params, key) => {
      writes.push({ call: 'subscriptions.create', params, key });
      return sub(`sub_insiders_${writes.length}`);
    },
    cancelSubscription: async (id) => {
      writes.push({ call: 'subscriptions.cancel', id, params: null });
      return sub(id);
    },
    activeSubscriptionWithPrice: async () => null,
    createPortalSession: async () => 'https://billing.stripe.com/p/session/test',
    paymentMethodOfPaymentIntent: async () => 'pm_saved',
    subscriptionOfPaymentIntent: async () => null,
    constructEvent: stripeVerifier(),
    createCheckoutSession: async () => {
      throw new Error('no checkout session in this test');
    },
    retrieveCheckoutSession: async () => {
      throw new Error('no checkout session in this test');
    },
  };
  return { client, writes, links, addJanuaryLinks };
}

let handle: Database;
let app: App;
let jan: string;
let fake: ReturnType<typeof fakeStripe>;
let config: OfferConfig;
const logs: string[] = [];
const log = { info: () => undefined, warn: () => undefined, error: (_o: unknown, msg?: string) => void logs.push(msg ?? '') };

const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
async function appAt(t: number): Promise<App> {
  at(t);
  await app?.close();
  app = await build({ logger: false, offer: { config, stripe: fake.client, verify: stripeVerifier(), prices: createPriceCache(() => fake.client) } });
  return app;
}
const act = async (who: string, name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/admin/actions/${name}`, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' }, payload: JSON.stringify(payload) });

let eventN = 0;
/** Stripe's event, signed with the test webhook secret, delivered to the webhook route. */
async function deliver(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_sell_${++eventN}`, object: 'event', type, api_version: '2025-10-29.clover', data: { object } });
  const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return app.inject({ method: 'POST', url: '/api/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } });
}
/** A completed Checkout Session from a Payment Link; `cohort` is its `ai_cohort` (none for December's links). */
const session = (who: string, option: 'full' | 'two_pay', cohort: string | null) => ({
  id: `cs_test_sell_${who.padEnd(12, '0')}`,
  object: 'checkout.session',
  client_reference_id: null,
  payment_link: 'plink_x',
  metadata: { ai_plan: 'cohort', ai_option: option, ...(cohort ? { ai_cohort: cohort } : {}) },
  payment_status: 'paid',
  customer: `cus_${who}`,
  payment_intent: `pi_${who}`,
  subscription: `sub_${who}_${option === 'full' ? 'full' : 'two'}`,
  amount_total: option === 'full' ? 750000 : 375000,
  currency: 'usd',
  customer_details: { email: `${who}@buyers.example.test`, name: who, phone: null },
  custom_fields: [{ key: 'company', text: { value: `${who} group` } }],
  consent: { terms_of_service: 'accepted' },
});
const event = (type: string, object: unknown) => ({ id: `evt_direct_${++eventN}`, object: 'event', type, data: { object } }) as unknown as Stripe.Event;
const deps = () => ({ stripe: fake.client, config, prices: createPriceCache(() => fake.client), log, now: () => Date.parse(process.env.FIXED_NOW!), db: handle });

/** December's `start` as production holds it (its first live build, Wed, Dec 2, 2026, 1:00 PM CT). */
const decemberStart = async (): Promise<number> =>
  Number((await handle.select({ start: cohorts.start }).from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID)))[0]!.start);

const planOf = async (email: string) =>
  (
    await handle
      .select({ plan: plans, order: orders })
      .from(orders)
      .innerJoin(plans, eq(plans.orderId, orders.id))
      .where(eq(orders.email, email))
  )[0];

/** January, made ready to open: every Before It Opens line done, through the real actions where there is one. */
async function readyJanuary(): Promise<void> {
  // Its price and its links, as Connor or Spring enter them once they have made them in Stripe.
  expect((await act('st_owner', 'saveCohortPrice', { cohortId: jan, full: 'jan27_founding_full', rollover: 'membership_monthly_team_leader', twoPay: 'jan27_founding_two_pay', offerTwoPay: true })).statusCode).toBe(200);
  expect(
    (await act('st_owner', 'saveCohortEnrollment', { cohortId: jan, founding: true, foundingCloses: { date: '2026-12-31', time: '23:59' }, linkFull: JAN_LINKS.full, linkTwoPay: JAN_LINKS.twoPay, capacity: 15, ghlValue: 'jan27' }))
      .statusCode,
  ).toBe(200);
  fake.addJanuaryLinks();
  expect((await act('st_owner', 'keepCohortOverlap', { cohortId: jan })).statusCode).toBe(200);
  expect((await act('st_owner', 'saveCohortWords', { cohortId: jan, name: 'January 2027 Cohort', promise: 'Six weeks of building.', how: ['A week opens on Sunday.'], holiday: '' })).statusCode).toBe(200);
  // Week 0's due date, on its run (Settings › Dates and Release).
  const [row] = await handle.select({ run: cohorts.run }).from(cohorts).where(eq(cohorts.id, jan));
  const run = (row!.run as CohortWeek[]).map((w) => (w.n === 0 ? { ...w, dueAt: MT('2027-01-03T12:00:00') } : w));
  await handle.update(cohorts).set({ run }).where(eq(cohorts.id, jan));
  // The two test sends, as their audit rows record them.
  for (const action of ['welcome.test_send', 'week0.test_send'] as const)
    await handle.insert(auditLog).values({ at: NOV27, actorSource: 'system', action, outcome: 'ok', targetType: 'cohort', targetId: jan, targetLabel: 'January' });
}

beforeAll(async () => {
  handle = await testDatabase();
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
});
beforeEach(async () => {
  logs.length = 0;
  at(NOV27);
  config = {
    ...readOfferConfig({}),
    stripeSecretKey: 'rk_test_cohort_selling',
    stripeWebhookSecret: SECRET,
    open: true,
    invitesEnabled: false,
    paymentLinks: { 'cohort-full': DEC_LINKS.full, 'cohort-two-pay': DEC_LINKS.twoPay },
    seatCapLinks: ['plink_dec_full', 'plink_dec_two'],
  };
  fake = fakeStripe(() => jan);
  // Production's shape: the launch seed and every one-time data step, Phase 5's own among them.
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  await applyDataMigrations(handle, NOV27);
  await appAt(NOV27);
  const made = await act('st_owner', 'createCohortFromShape', JANUARY);
  expect(made.statusCode, made.body).toBe(200);
  jan = (made.json() as { cohort: { cohortId: string } }).cohort.cohortId;
  for (const s of await handle.select({ id: sessions.id }).from(sessions)) await handle.update(sessions).set({ zoom: `https://zoom.example/j/${s.id}` }).where(eq(sessions.id, s.id));
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

describe('Done when: a checkout names its cohort', () => {
  it('a test-mode checkout through a January link provisions a January team that Phase 4 serves', async () => {
    await readyJanuary();
    const opened = await act('st_owner', 'openCohortEnrollment', { cohortId: jan });
    expect(opened.statusCode, opened.body).toBe(200);
    const res = await deliver('checkout.session.completed', session('janbuyer', 'full', jan));
    expect(res.statusCode, res.body).toBe(200);

    const { plan, order } = (await planOf('janbuyer@buyers.example.test'))!;
    expect(order.cohortId).toBe(jan);
    expect(plan).toMatchObject({ kind: 'cohort', option: 'full', cohortId: jan, startsAt: MT('2027-01-05T12:00:00'), paidThrough: MAY10, liveUntil: MAY10 });
    const [owner] = await handle.select().from(users).where(eq(users.email, 'janbuyer@buyers.example.test'));
    expect(owner!.cohortId).toBe(jan);
    // Write 1: the full cart's trial pinned to January's included-time end, not December's.
    expect(fake.writes.find((w) => w.call === 'subscriptions.update' && w.id === 'sub_janbuyer_full')!.params).toMatchObject({ trial_end: Math.floor(MAY10 / 1000), proration_behavior: 'none' });

    // Phase 4 serves it January: its course, its sessions, its Community.
    await appAt(MT('2027-01-05T12:30:00'));
    const cookie = await app.signInAs(owner!.id);
    const course = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } });
    expect(course.statusCode, course.body).toBe(200);
    const body = course.json() as { course: { weeks: { week: number }[] }; sessions: { id: string }[] };
    expect(body.course.weeks.map((w) => w.week)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const janSessions = (await handle.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, jan))).map((s) => s.id).sort();
    expect(body.sessions.map((s) => s.id).sort()).toEqual(janSessions);
    const posted = await app.inject({ method: 'POST', url: '/api/community', headers: { cookie, 'content-type': 'application/json' }, payload: JSON.stringify({ space: 'week-1', title: 'Our first question', body: 'Which export?' }) });
    expect(posted.statusCode, posted.body).toBe(201);
    expect((await handle.select({ cohortId: communityThreads.cohortId }).from(communityThreads)).map((t) => t.cohortId)).toEqual([jan]);
  });

  it('a test-mode checkout through a December link provisions exactly what it does today', async () => {
    const res = await deliver('checkout.session.completed', session('decbuyer', 'full', null));
    expect(res.statusCode, res.body).toBe(200);
    const { plan, order } = (await planOf('decbuyer@buyers.example.test'))!;
    expect(order.cohortId).toBeNull();
    expect(plan).toMatchObject({ cohortId: DEFAULT_COHORT_ID, startsAt: Date.parse('2026-12-02T13:00:00-06:00'), paidThrough: INSIDERS_FIRST_CHARGE_AT, liveUntil: INSIDERS_FIRST_CHARGE_AT });
    expect(fake.writes.find((w) => w.id === 'sub_decbuyer_full')!.params).toMatchObject({ trial_end: Math.floor(INSIDERS_FIRST_CHARGE_AT / 1000) });
    const [owner] = await handle.select().from(users).where(eq(users.email, 'decbuyer@buyers.example.test'));
    expect(owner!.cohortId).toBe(DEFAULT_COHORT_ID);
  });

  it('the seat after January’s last behaves as December’s 16th: logged, January’s links off, December’s untouched', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    expect(
      (await act('st_owner', 'saveCohortEnrollment', { cohortId: jan, founding: true, foundingCloses: { date: '2026-12-31', time: '23:59' }, linkFull: JAN_LINKS.full, linkTwoPay: JAN_LINKS.twoPay, capacity: 2, ghlValue: 'jan27' })).statusCode,
    ).toBe(200);
    const results: string[] = [];
    for (const [i, who] of ['jan1', 'jan2', 'jan3'].entries()) {
      at(NOV27 + (i + 1) * 60_000);
      results.push(await handleStripeEvent(event('checkout.session.completed', session(who, i % 2 ? 'two_pay' : 'full', jan)), deps()));
    }
    expect(results).toEqual(['paid', 'paid', 'paid']);
    expect(await cohortSeatsSold(handle, jan)).toBe(3);
    expect(await cohortSeatsSold(handle, DEFAULT_COHORT_ID)).toBe(0);
    // What provisioning logs, as for December's 15th and 16th.
    expect(logs.filter((m) => m.startsWith('AI Accelerator'))).toEqual([
      'AI Accelerator sold out: seat 2 of 2. The page shows the waitlist; both Accelerator Payment Links are being turned off',
      'AI Accelerator sold out (2 of 2): its Payment Link is turned off',
      'AI Accelerator sold out (2 of 2): its Payment Link is turned off',
      'AI Accelerator seat 3 sold, past the 2 seats: Connor follows up',
    ]);
    // Write 5 acts on January's two links only, with its own sold-out line.
    const linkWrites = fake.writes.filter((w) => w.call === 'paymentLinks.update');
    expect(linkWrites.map((w) => w.id)).toEqual(['plink_jan_full', 'plink_jan_two']);
    expect(linkWrites[0]!.params).toEqual({
      active: false,
      inactive_message: 'All 2 founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.',
      metadata: { ai_soldout: '1' },
    });
    expect(fake.links.get('plink_dec_full')!.active).toBe(true);
    // Once December has started, January is the next to start, so the offer sells it, sold out.
    const offer = (await (await appAt(await decemberStart())).inject({ method: 'GET', url: '/api/offer' })).json() as { seats: unknown; carts: { id: string; state: string }[] };
    expect(offer.seats).toEqual({ total: 2, sold: 3, left: 0 });
    expect(offer.carts.filter((c) => c.id.startsWith('cohort')).map((c) => c.state)).toEqual(['soldout', 'soldout']);
    // A refund frees a January seat: its links come back on (founding open, enrollment open); December's stay as they were.
    const [one] = await handle.select({ id: plans.id }).from(plans).where(and(eq(plans.cohortId, jan))).orderBy(asc(plans.createdAt));
    await handle.update(plans).set({ status: 'ended' }).where(eq(plans.id, one!.id));
    await handle.update(plans).set({ status: 'ended' }).where(eq(plans.id, (await handle.select({ id: plans.id }).from(plans).where(eq(plans.cohortId, jan)).orderBy(asc(plans.createdAt)))[1]!.id));
    const again = await reconcileCohortSeats({ stripe: fake.client, config, now: NOV27 + 10 * 60_000, log, db: handle });
    expect(again.map((r) => [r.cohortId === jan ? 'jan' : r.cohortId, r.outcome?.links.map((l) => l.action)])).toEqual([
      [DEFAULT_COHORT_ID, ['on', 'on']],
      ['jan', ['turned-on', 'turned-on']],
    ]);
  });

  it('closing enrollment stops new sales and touches no one already in; a link that names no cohort is never January’s', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    await deliver('checkout.session.completed', session('janin', 'full', jan));
    const before = await planOf('janin@buyers.example.test');
    const closed = await act('st_owner', 'closeCohortEnrollment', { cohortId: jan });
    expect(closed.statusCode, closed.body).toBe(200);
    expect((await handle.select({ status: cohorts.status }).from(cohorts).where(eq(cohorts.id, jan)))[0]!.status).toBe('live');
    expect(await planOf('janin@buyers.example.test')).toEqual(before);
    // The offer sells December again (the only cohort open).
    const offer = (await (await appAt(NOV27)).inject({ method: 'GET', url: '/api/offer' })).json() as { seats: { total: number }; carts: { id: string; paymentLink: string | null }[] };
    expect(offer.seats.total).toBe(15);
    expect(offer.carts.find((c) => c.id === 'cohort-full')!.paymentLink).toBe(DEC_LINKS.full);
    // A checkout through January's link, still live in Stripe after Close: paid, placed in January, and reported.
    logs.length = 0;
    expect(await handleStripeEvent(event('checkout.session.completed', session('janlate', 'full', jan)), deps())).toBe('paid');
    expect((await planOf('janlate@buyers.example.test'))!.plan.cohortId).toBe(jan);
    expect(logs).toContain('a seat was sold in a cohort whose enrollment is closed: placed in it. Connor follows up');
  });

  it('Close enrollment writes nothing to Stripe: a live link stays on, and a link the cap turned off is not turned back on', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    // A cap of 1: the first sale fills it, and the cap turns January's links off (D-154's switch, before any Close).
    expect(
      (await act('st_owner', 'saveCohortEnrollment', { cohortId: jan, founding: true, foundingCloses: { date: '2026-12-31', time: '23:59' }, linkFull: JAN_LINKS.full, linkTwoPay: JAN_LINKS.twoPay, capacity: 1, ghlValue: 'jan27' })).statusCode,
    ).toBe(200);
    expect(await handleStripeEvent(event('checkout.session.completed', session('capped', 'full', jan)), deps())).toBe('paid');
    expect(fake.links.get('plink_jan_full')!.active).toBe(false);
    const linkWrites = () => fake.writes.filter((w) => w.call === 'paymentLinks.update').length;
    const before = { all: fake.writes.length, links: linkWrites() };

    // Close: a status change on the cohort, and not one call to Stripe.
    const closed = await act('st_owner', 'closeCohortEnrollment', { cohortId: jan });
    expect(closed.statusCode, closed.body).toBe(200);
    expect(fake.writes.length).toBe(before.all);

    // A refund frees the seat after Close: the cap holds January's links off, as Close left them.
    const [seat] = await handle.select({ id: plans.id }).from(plans).where(eq(plans.cohortId, jan));
    await handle.update(plans).set({ status: 'ended' }).where(eq(plans.id, seat!.id));
    const after = await reconcileCohortSeats({ stripe: fake.client, config, now: NOV27 + 10 * 60_000, log, db: handle });
    expect(after.find((r) => r.cohortId === jan)!.outcome!.links.map((l) => l.action)).toEqual(['held-off', 'held-off']);
    expect(linkWrites()).toBe(before.links);
    expect(fake.links.get('plink_jan_full')!.active).toBe(false);

    // A link someone turned back on by hand in Stripe stays on: Close and the cap leave it as it is.
    fake.links.set('plink_jan_full', { ...fake.links.get('plink_jan_full')!, active: true, metadata: { ai_plan: 'cohort', ai_option: 'full', ai_cohort: jan } });
    const later = await reconcileCohortSeats({ stripe: fake.client, config, now: NOV27 + 20 * 60_000, log, db: handle });
    expect(later.find((r) => r.cohortId === jan)!.outcome!.links.map((l) => l.action)).toEqual(['on', 'held-off']);
    expect(linkWrites()).toBe(before.links);
  });

  it('an ai_cohort the database does not hold is recorded and paid, not provisioned, for Connor', async () => {
    const res = await deliver('checkout.session.completed', session('lost', 'full', 'c_nope'));
    expect(res.statusCode).toBe(200);
    const [order] = await handle.select().from(orders).where(eq(orders.email, 'lost@buyers.example.test'));
    expect(order).toMatchObject({ status: 'paid', cohortId: 'c_nope' });
    expect(await handle.select().from(plans).where(eq(plans.orderId, order!.id))).toEqual([]);
  });

  it('with two cohorts open, the offer sells the next to start (Connor, Nov 26): December until it starts, then January', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    expect((await handle.select({ status: cohorts.status }).from(cohorts)).map((c) => c.status).sort()).toEqual(['enrolling', 'enrolling']);
    type Offer = { seats: { total: number }; carts: { id: string; state: string; paymentLink: string | null }[] };
    const offerAt = async (t: number) => (await (await appAt(t)).inject({ method: 'GET', url: '/api/offer' })).json() as Offer;
    const link = (o: Offer) => o.carts.find((c) => c.id === 'cohort-full')!.paymentLink;
    const decStart = await decemberStart();
    expect(decStart).toBe(Date.parse('2026-12-02T13:00:00-06:00'));
    // Both open and both ahead: December, the next to start, with its own links and 15 seats.
    const before = await offerAt(NOV27);
    expect(link(before)).toBe(DEC_LINKS.full);
    expect(before.carts.find((c) => c.id === 'cohort-two-pay')!.paymentLink).toBe(DEC_LINKS.twoPay);
    expect(before.seats.total).toBe(15);
    expect(JSON.stringify(before)).not.toContain(JAN_LINKS.full);
    // December has started: January is the next to start.
    const after = await offerAt(decStart);
    expect(link(after)).toBe(JAN_LINKS.full);
    expect(after.carts.find((c) => c.id === 'cohort-two-pay')!.paymentLink).toBe(JAN_LINKS.twoPay);
    expect(after.seats.total).toBe(15);
    expect(JSON.stringify(after)).not.toContain(DEC_LINKS.full);
  });

  it('Q-23 (Connor, Nov 26): a December team that buys January is moved to it, logged; its December plan stays', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    await deliver('checkout.session.completed', session('both', 'full', null));
    const [owner] = await handle.select().from(users).where(eq(users.email, 'both@buyers.example.test'));
    expect(owner!.cohortId).toBe(DEFAULT_COHORT_ID);
    at(NOV27 + 60_000);
    const res = await deliver('checkout.session.completed', { ...session('both', 'full', jan), id: 'cs_test_sell_both_january0' });
    expect(res.statusCode, res.body).toBe(200);
    const [moved] = await handle.select().from(users).where(eq(users.id, owner!.id));
    expect(moved!.cohortId).toBe(jan);
    const held = await handle.select({ cohortId: plans.cohortId, status: plans.status }).from(plans).orderBy(asc(plans.createdAt));
    expect(held.filter((p) => p.cohortId !== null).map((p) => p.cohortId)).toEqual([DEFAULT_COHORT_ID, jan]);
    const rows = await handle.select().from(auditLog).where(eq(auditLog.action, 'cohort.team_moved'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorSource: 'system', targetType: 'team', before: { cohortId: DEFAULT_COHORT_ID }, after: { cohortId: jan } });
  });

  it('Q-23 (Connor, Nov 26): the newest purchase decides, back to December too; a team is in one cohort at a time', async () => {
    await readyJanuary();
    expect((await act('st_owner', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(200);
    await deliver('checkout.session.completed', session('back', 'full', jan));
    const [owner] = await handle.select().from(users).where(eq(users.email, 'back@buyers.example.test'));
    expect(owner!.cohortId).toBe(jan);
    // Later, the same team buys a seat through a December link (no ai_cohort): the newest purchase is December's.
    at(NOV27 + 60_000);
    const res = await deliver('checkout.session.completed', { ...session('back', 'two_pay', null), id: 'cs_test_sell_back_december0' });
    expect(res.statusCode, res.body).toBe(200);
    const [moved] = await handle.select().from(users).where(eq(users.id, owner!.id));
    expect(moved!.cohortId).toBe(DEFAULT_COHORT_ID);
    // Both plans stay; the team is in one cohort, the newest purchase's.
    const held = await handle.select({ cohortId: plans.cohortId }).from(plans).orderBy(asc(plans.createdAt));
    expect(held.filter((p) => p.cohortId !== null).map((p) => p.cohortId)).toEqual([jan, DEFAULT_COHORT_ID]);
    const rows = await handle.select().from(auditLog).where(eq(auditLog.action, 'cohort.team_moved'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ before: { cohortId: jan }, after: { cohortId: DEFAULT_COHORT_ID } });
  });
});

describe('Settings › Enrollment: four admin actions on the billing permission, one audit row each', () => {
  it('refuses staff without billing, and writes one audit row for each save', async () => {
    await handle.insert(users).values({ id: 'st_ed', email: 'ed@example.test', name: 'Ed Itor', kind: 'staff', staffRole: 'Content Editor', joined: NOV27, seq: 900 });
    await appAt(NOV27);
    expect((await act('st_ed', 'saveCohortPrice', { cohortId: jan, full: 'k', rollover: null, twoPay: null, offerTwoPay: false })).statusCode).toBe(403);
    expect((await act('st_ed', 'openCohortEnrollment', { cohortId: jan })).statusCode).toBe(403);
    expect((await act('st_owner', 'saveCohortPrice', { cohortId: jan, full: 'jan27_founding_full', rollover: 'membership_monthly_team_leader', twoPay: null, offerTwoPay: false, extra: 1 })).statusCode).toBe(400);
    const saved = await act('st_owner', 'saveCohortPrice', { cohortId: jan, full: 'jan27_founding_full', rollover: 'membership_monthly_team_leader', twoPay: null, offerTwoPay: false });
    expect(saved.statusCode, saved.body).toBe(200);
    const enrollment = await act('st_owner', 'saveCohortEnrollment', { cohortId: jan, founding: false, foundingCloses: null, linkFull: JAN_LINKS.full, linkTwoPay: null, capacity: 20, ghlValue: 'jan27' });
    expect(enrollment.statusCode, enrollment.body).toBe(200);
    const refused = await act('st_owner', 'openCohortEnrollment', { cohortId: jan });
    expect(refused.statusCode).toBe(422);
    expect((refused.json() as { error: string }).error).toMatch(/^Sessions: /);
    const rows = await handle.select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.targetId, jan));
    expect(rows.map((r) => r.action).filter((a) => a.startsWith('cohort.price') || a.startsWith('cohort.enrollment'))).toEqual(['cohort.price_save', 'cohort.enrollment_save']);
  });

  it('the facts route says what Stripe has under the keys, and whether each link names the cohort', async () => {
    await readyJanuary();
    const facts = (await app.inject({ method: 'GET', url: `/api/admin/cohorts/${jan}/facts`, headers: { cookie: await app.signInAs('st_owner') } })).json() as { stripe: unknown };
    expect(facts.stripe).toEqual({
      prices: 'ok',
      price: {
        jan27_founding_full: { unitAmount: 800000, currency: 'usd', interval: null, intervalCount: null },
        membership_monthly_team_leader: { unitAmount: 16900, currency: 'usd', interval: 'month', intervalCount: 1 },
        jan27_founding_two_pay: { unitAmount: 400000, currency: 'usd', interval: 'month', intervalCount: 1 },
      },
      links: 'ok',
      link: { [JAN_LINKS.full]: { active: true, aiCohort: jan }, [JAN_LINKS.twoPay]: { active: true, aiCohort: jan } },
    });
    // Ready: Open moves draft to enrolling, one audit row.
    const opened = await act('st_owner', 'openCohortEnrollment', { cohortId: jan });
    expect(opened.statusCode, opened.body).toBe(200);
    expect((await handle.select({ status: cohorts.status }).from(cohorts).where(eq(cohorts.id, jan)))[0]!.status).toBe('enrolling');
    expect(await handle.select({ action: auditLog.action }).from(auditLog).where(and(eq(auditLog.targetId, jan), eq(auditLog.action, 'cohort.enrollment_open')))).toHaveLength(1);
  });

  it('December keeps its answer on the reference’s Open enrollment, word for word', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/mutate/openEnrollment', headers: { cookie: await app.signInAs('st_owner'), 'content-type': 'application/json' }, payload: JSON.stringify({ cohortId: DEFAULT_COHORT_ID }) });
    expect(res.json()).toEqual({ error: 'Only a draft cohort can open for enrollment.' });
  });
});

describe('December’s data step against production’s shape, with production’s variables', () => {
  it('copies the links the deploy reads, and every read stays as it was', async () => {
    const [dec] = await handle.select().from(cohorts).where(eq(cohorts.id, DEFAULT_COHORT_ID));
    // This database ran the step with no link variables: the links are left unset and named.
    expect(dec).toMatchObject({ founding: true, lookupKeyFull: 'cohort_founding_full', lookupKeyRollover: 'membership_monthly_team_leader', lookupKeyTwoPay: 'cohort_founding_two_pay', twoPay: true, includedUntil: '2027-05-04', ghlValue: 'dec26', linkFull: null, linkTwoPay: null });
    expect(dec!.foundingClosesAt).toBe(Date.parse('2026-11-30T23:59:00-07:00'));
  });
});

describe('nothing creates a Stripe price, a Payment Link or a product', () => {
  it('no source file calls prices.create, paymentLinks.create or products.create', () => {
    const root = fileURLToPath(new URL('../../..', import.meta.url));
    const files = ['apps/api/src', 'apps/web/src', 'packages/core/src'].flatMap((d) => globSync(`${d}/**/*.{ts,tsx}`, { cwd: root }));
    expect(files.length).toBeGreaterThan(100);
    const hits = files.filter((f) => /\b(prices|paymentLinks|products)\s*\.\s*create\s*\(/.test(readFileSync(`${root}/${f}`, 'utf8')));
    expect(hits).toEqual([]);
  });
});
