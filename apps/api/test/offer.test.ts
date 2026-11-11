// The offer, end to end against Postgres with a stubbed Stripe (D-073 to D-079, D-104): the spec's test
// plan, as far as it can run without Stripe's own test mode. Every purchase is a Payment Link's
// completed session (the site's own checkout is retired), signed exactly as Stripe signs webhooks
// (`generateTestHeaderString`); the subscription calls go to a stub that records them. No network.
//
// The scenarios are numbered as in the spec's "In test mode" table where they map onto one.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, orders, plans, skills, stripeEvents, users, teams } from '../src/db/schema';
import { AGREEMENT_VERSION } from '../src/billing/agreement';
import { AGENTS_FIRST_CHARGE_AT, AGENTS_SKILLS_FROM, CARTS, INSIDERS_FIRST_CHARGE_AT } from '../src/billing/catalog';
import type { CartId } from '../src/billing/catalog';
import type { OfferConfig } from '../src/billing/config';
import { createPriceCache } from '../src/billing/prices';
import { provisionOrder, sendHeldInvites } from '../src/billing/provision';
import type { BillingStripe, PriceInfo, SubscriptionInfo } from '../src/billing/stripe';
import { stripeVerifier } from '../src/billing/stripe';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { resetDatabase, testDatabase } from './helpers';

const NOW = '2026-11-14T15:00:00-06:00';
const NOW_MS = Date.parse(NOW);
const DAY = 86_400_000;
const SECRET = 'whsec_test_offer_suite';
const ORIGIN = 'http://localhost';

const PRICE_LIST: PriceInfo[] = [
  { lookupKey: 'cohort_founding_full', id: 'price_cff', unitAmount: 750000, currency: 'usd', interval: null, productName: 'Core Cohort' },
  { lookupKey: 'cohort_founding_two_pay', id: 'price_c2', unitAmount: 375000, currency: 'usd', interval: 'month', productName: 'Core Cohort' },
  { lookupKey: 'membership_year_upfront', id: 'price_my', unitAmount: 199700, currency: 'usd', interval: null, productName: 'Amplified Insiders' },
  { lookupKey: 'membership_monthly', id: 'price_mm', unitAmount: 19700, currency: 'usd', interval: 'month', productName: 'Membership' },
  { lookupKey: 'agents_upto15_prepay3', id: 'price_p15', unitAmount: 149100, currency: 'usd', interval: null, productName: 'Amplified Team Plan' },
  { lookupKey: 'agents_16to40_prepay3', id: 'price_p40', unitAmount: 239100, currency: 'usd', interval: null, productName: 'Amplified Team Plan' },
  { lookupKey: 'agents_upto15_founding', id: 'price_a15', unitAmount: 49700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
  { lookupKey: 'agents_16to40_founding', id: 'price_a40', unitAmount: 79700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
];

const OFFER_PAGE = [
  '<!doctype html><html lang="en"><head><title>Plans</title></head><body data-offer="%%offer-state%%" data-founding="%%founding%%">',
  '<li data-state="%%state:cohort-full%%"><a href="%%link:cohort-full%%">x</a><a href="%%link:cohort-two-pay%%">y</a></li>',
  '<p class="call">%%team-call%% %%invites%%</p><p class="closes">%%founding-closes%%</p>',
  '<form method="post" action="/api/offer/waitlist"><input type="hidden" name="src" value="%%src%%"></form></body></html>',
].join('');
const WELCOME_PAGE =
  '<!doctype html><html><body data-state="%%welcome-state%%" data-product="%%product%%"><h1>%%plan-name%%</h1><p>%%login%%</p><a href="%%intake-url%%">i</a></body></html>';

interface Stub {
  client: BillingStripe;
  portals: { customer: string; returnUrl: string; configuration?: string }[];
  /** Customers who already hold an active or trialing membership. */
  members: Set<string>;
  updates: { id: string; params: Stripe.SubscriptionUpdateParams }[];
  creates: { params: Stripe.SubscriptionCreateParams; key: string }[];
  cancels: string[];
  subs: Map<string, SubscriptionInfo>;
  fail: boolean;
}

function stubStripe(): Stub {
  const stub: Stub = { portals: [], members: new Set(), updates: [], creates: [], cancels: [], subs: new Map(), fail: false, client: null as never };
  const sub = (id: string, over: Partial<SubscriptionInfo> = {}): SubscriptionInfo => ({
    id,
    status: 'active',
    customer: 'cus_1',
    trialEnd: null,
    defaultPaymentMethod: 'pm_sub',
    metadata: {},
    cancelAt: null,
    currentPeriodEnd: null,
    ...stub.subs.get(id),
    ...over,
  });
  stub.client = {
    pricesByLookupKeys: async () => PRICE_LIST,
    retrieveSubscription: async (id) => sub(id),
    updateSubscription: async (id, params) => {
      stub.updates.push({ id, params });
      return sub(id);
    },
    createSubscription: async (params, key) => {
      stub.creates.push({ params, key });
      return sub(`sub_membership_${stub.creates.length}`, { status: 'trialing' });
    },
    cancelSubscription: async (id) => {
      stub.cancels.push(id);
      return sub(id, { status: 'canceled' });
    },
    activeSubscriptionWithPrice: async (customer) => (stub.members.has(customer) ? 'sub_existing_member' : null),
    createPortalSession: async (customer, returnUrl, configuration) => {
      stub.portals.push({ customer, returnUrl, ...(configuration ? { configuration } : {}) });
      return 'https://billing.stripe.com/p/session/test_portal';
    },
    paymentMethodOfPaymentIntent: async () => 'pm_saved',
    subscriptionOfPaymentIntent: async () => null,
    constructEvent: stripeVerifier(),
  };
  return stub;
}

const CONFIG: OfferConfig = {
  stripeSecretKey: 'rk_test_offer',
  stripeWebhookSecret: SECRET,
  open: true,
  foundingClosesAt: Date.parse('2026-11-30T23:59:00-07:00'),
  invitesFrom: Date.parse('2026-11-16T08:00:00-06:00'),
  invitesEnabled: true,
  paymentLinks: {
    'cohort-full': 'https://buy.stripe.com/test_cohort_full',
    'cohort-two-pay': 'https://buy.stripe.com/test_cohort_two',
    'insiders-year': 'https://buy.stripe.com/test_insiders_year',
  },
  intakeUrls: { membership: 'https://forms.example.com/insiders' },
  portalLoginUrl: 'https://billing.stripe.com/p/login/test_portal',
  portalLockedConfig: 'bpc_locked',
  calendarUrls: { builds: null, officeHours: null },
  teamCallUrl: null,
};

let app: App;
let stub: Stub;

async function fresh(config: Partial<OfferConfig> = {}): Promise<App> {
  stub = stubStripe();
  app = await build({
    logger: false,
    offer: {
      pages: { offer: OFFER_PAGE, welcome: WELCOME_PAGE },
      config: { ...CONFIG, ...config },
      stripe: stub.client,
      verify: stripeVerifier(),
      prices: createPriceCache(() => stub.client),
    },
  });
  return app;
}

beforeEach(async () => {
  process.env.FIXED_NOW = NOW;
  // The invite's link is absolute (email/templates/links.ts).
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
  resetOutbox();
  await resetDatabase();
});
afterEach(async () => {
  await app?.close();
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

const db = () => testDatabase();
const orderRows = async () => (await db()).select().from(orders);
const one = async () => (await orderRows())[0]!;

let eventN = 0;
async function deliver(type: string, object: Record<string, unknown>, id = `evt_${++eventN}`) {
  const payload = JSON.stringify({ id, object: 'event', type, api_version: '2025-10-29.clover', data: { object } });
  const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return app.inject({ method: 'POST', url: '/api/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } });
}

let sessionN = 0;
/** A cart's Payment Link session, completed: its metadata, the buyer's details and the terms box. */
const linkSession = (cartId: CartId, email = 'pat@example.com') => {
  const cart = CARTS[cartId];
  return {
    id: `cs_test_link${String(++sessionN).padStart(8, '0')}`,
    object: 'checkout.session',
    client_reference_id: null,
    payment_link: `plink_${cartId}`,
    metadata: { ai_plan: cart.plan, ai_option: cart.option, ...(cart.billing ? { billing: cart.billing } : {}) },
    payment_status: 'paid',
    customer: 'cus_1',
    payment_intent: null,
    subscription: null,
    amount_total: 0,
    currency: 'usd',
    customer_details: { email, name: 'Pat Buyer', phone: null },
    custom_fields: [{ key: 'company', text: { value: 'Pat Group' } }],
    consent: { terms_of_service: 'accepted' },
  };
};

/** A purchase through a cart's Payment Link: Stripe's completed session, delivered to the webhook. */
async function buy(cartId: CartId, extra: { email?: string } = {}, session: Record<string, unknown> = {}) {
  const base = linkSession(cartId, extra.email);
  const done = await deliver('checkout.session.completed', { ...base, ...session });
  expect(done.statusCode, done.body).toBe(200);
  return (await db()).select().from(orders).where(eq(orders.stripeSessionId, base.id)).then((r) => r[0]!);
}

const invoice = (sub: string, amount: number, periodEnd: number, meta: Record<string, string> = {}) => ({
  id: `in_${++eventN}`,
  object: 'invoice',
  amount_paid: amount,
  parent: { type: 'subscription_details', subscription_details: { subscription: sub, metadata: meta } },
  lines: { data: [{ period: { start: Math.floor(NOW_MS / 1000), end: Math.floor(periodEnd / 1000) } }] },
});

describe('POST /api/checkout, retired (D-104)', () => {
  beforeEach(async () => void (await fresh()));

  it('answers 410 to the old form and its JSON, and writes nothing', async () => {
    const json = await app.inject({ method: 'POST', url: '/api/checkout', payload: JSON.stringify({ cart: 'cohort-full' }), headers: { 'content-type': 'application/json', origin: ORIGIN } });
    const form = await app.inject({ method: 'POST', url: '/api/checkout', payload: 'cart=cohort-full', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN } });
    expect([json.statusCode, form.statusCode]).toEqual([410, 410]);
    expect(json.json().error).toMatch(/Payment Link/);
    expect(await orderRows()).toEqual([]);
  });
});

describe('the offer pages (D-075, D-104)', () => {
  beforeEach(async () => void (await fresh()));

  it('fills each cart\'s link and state, the Mountain deadline and the 40+ call, with no form-action exception', async () => {
    const offer = await app.inject({ method: 'GET', url: '/offer' });
    expect(offer.statusCode).toBe(200);
    expect(offer.body).toContain('data-offer="links" data-founding="open"');
    expect(offer.body).toContain('<li data-state="link"><a href="https://buy.stripe.com/test_cohort_full">x</a><a href="https://buy.stripe.com/test_cohort_two">y</a></li>');
    expect(offer.body).toContain('<p class="call">mailto:support@amplifiedimpact.io held</p>');
    expect(offer.body).toContain('<p class="closes">Monday, November 30 at 11:59 PM Mountain</p>');
    expect(offer.body).not.toContain('%%');
    expect(offer.headers['cache-control']).toBe('no-store');
    expect(String(offer.headers['content-security-policy'])).not.toContain('checkout.stripe.com');
    // The QR code's address marks a waitlist sign-up, unless the link names its own source.
    expect((await app.inject({ method: 'GET', url: '/offer' })).body).toContain('name="src" value=""');
    expect((await app.inject({ method: 'GET', url: '/forum' })).body).toContain('name="src" value="forum"');
    expect((await app.inject({ method: 'GET', url: '/forum?src=qr2' })).body).toContain('name="src" value="qr2"');
  });

  it('closes the founding links after Nov 30, 11:59 PM Mountain', async () => {
    process.env.FIXED_NOW = '2026-12-01T07:00:00Z';
    const offer = await app.inject({ method: 'GET', url: '/offer' });
    expect(offer.body).toContain('data-founding="closed"');
    expect(offer.body).toContain('<li data-state="closed"><a href="">x</a><a href="">y</a></li>');
  });

  it('sells the 15th AI Accelerator seat, then hides both links and reports the seats, and alerts on the last one', async () => {
    for (let i = 1; i <= 14; i += 1) await buy(i % 2 ? 'cohort-full' : 'cohort-two-pay', { email: `owner${i}@example.com` }, { customer: `cus_${i}` });
    let body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.seats).toEqual({ total: 15, sold: 14, left: 1 });
    expect((await app.inject({ method: 'GET', url: '/offer' })).body).toContain('<li data-state="link">');

    // The 15th, provisioned by hand here so its alert can be read.
    const last = linkSession('cohort-two-pay', 'owner15@example.com');
    await deliver('checkout.session.completed', { ...last, payment_status: 'unpaid', customer: 'cus_15' });
    const [order] = await (await db()).select().from(orders).where(eq(orders.stripeSessionId, last.id));
    await (await db()).update(orders).set({ status: 'paid' }).where(eq(orders.id, order!.id));
    const errors: string[] = [];
    const log = { info: () => {}, warn: () => {}, error: (_o: Record<string, unknown>, msg: string) => void errors.push(msg) };
    await provisionOrder(order!.id, { log, now: NOW_MS, invitesFrom: CONFIG.invitesFrom });
    expect(errors).toEqual(['AI Accelerator sold out: seat 15 of 15. The page shows the waitlist; turn off both Accelerator Payment Links in Stripe']);

    body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.seats).toEqual({ total: 15, sold: 15, left: 0 });
    expect(body.carts.filter((c: { plan: string }) => c.plan === 'cohort').map((c: { state: string }) => c.state)).toEqual(['soldout', 'soldout']);
    expect(body.carts.find((c: { id: string }) => c.id === 'insiders-year').state).toBe('link');
    expect((await app.inject({ method: 'GET', url: '/offer' })).body).toContain('<li data-state="soldout"><a href="">x</a><a href="">y</a></li>');
  });

  it('GET /api/offer lists the six carts with live prices and their links', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.founding).toEqual({ open: true, closesAt: '2026-12-01T06:59:00.000Z' });
    expect(body.carts.map((c: { id: string }) => c.id)).toEqual(['cohort-full', 'cohort-two-pay', 'insiders-year', 'insiders-monthly', 'agents-upto15', 'agents-16to40']);
    const year = body.carts.find((c: { id: string }) => c.id === 'insiders-year');
    expect(year).toMatchObject({ plan: 'membership', option: 'year_upfront', name: 'Amplified Insiders', state: 'link', paymentLink: 'https://buy.stripe.com/test_insiders_year' });
    expect(year.prices[0]).toEqual({ lookupKey: 'membership_year_upfront', amount: 199700, currency: 'usd', interval: null });
    expect(body.carts.find((c: { id: string }) => c.id === 'agents-upto15').state).toBe('soon');
  });

  it('the welcome page waits for the webhook, then confirms the plan and links the intake form', async () => {
    const session = linkSession('insiders-year');
    const pending = await app.inject({ method: 'GET', url: `/offer/welcome?session_id=${session.id}` });
    expect(pending.body).toContain('data-state="pending"');
    await deliver('checkout.session.completed', { ...session, subscription: 'sub_ins' });
    const done = await app.inject({ method: 'GET', url: `/offer/welcome?session_id=${session.id}` });
    expect(done.body).toContain('data-state="confirmed" data-product="membership"');
    expect(done.body).toContain('<h1>Amplified Insiders</h1>');
    expect(done.body).toContain('Monday, November 16');
    expect(done.body).toContain('href="https://forms.example.com/insiders"');
    const status = await app.inject({ method: 'GET', url: `/api/offer/order-status?session_id=${session.id}` });
    expect(status.json()).toEqual({ status: 'paid', plan: 'membership', name: 'Amplified Insiders' });
    const unknown = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=nope' });
    expect(unknown.body).toContain('data-state="unknown"');
  });
});

describe('POST /api/stripe/webhook (D-075, D-077, D-078)', () => {
  beforeEach(async () => void (await fresh()));

  it('16: refuses a bad signature, and counts a repeated event once', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/api/stripe/webhook',
      payload: '{"id":"evt_x","type":"invoice.paid","data":{"object":{}}}',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
    });
    expect(bad.statusCode).toBe(400);

    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two', payment_status: 'paid' });
    const first = await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 31 * DAY, { order_id: order.id }), 'evt_same');
    const again = await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 31 * DAY, { order_id: order.id }), 'evt_same');
    expect([first.statusCode, again.statusCode]).toEqual([200, 200]);
    expect(again.json().duplicate).toBe(true);
    expect((await one()).paymentsMade).toBe(1);
    expect((await (await db()).select().from(stripeEvents)).find((e) => e.id === 'evt_same')?.processedAt).toBe(NOW_MS);
  });

  it('1 and 12: Amplified Insiders for a year makes one account, one plan and one held invite, however often it runs', async () => {
    const order = await buy('insiders-year', {}, { subscription: 'sub_ins' });
    expect(order).toMatchObject({ status: 'paid', plan: 'membership', option: 'year_upfront', origin: 'payment_link', agreementVersion: AGREEMENT_VERSION });
    const [acct] = await (await db()).select().from(accounts);
    expect(acct).toMatchObject({ ownerEmail: 'pat@example.com', name: 'Pat Group', inviteSentAt: null });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'membership', option: 'year_upfront', status: 'active', seats: 2, paidThrough: NOW_MS + 365 * DAY, minimumUntil: null, stripeSubscriptionId: 'sub_ins' });
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    expect(owner).toMatchObject({ role: 'Team Owner', status: 'invited', tier: 'team', teamId: acct!.teamId });
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
    // Insiders by the year keeps its link's 365-day trial: no pin, no second membership.
    expect(stub.updates.every((u) => u.params.trial_end === undefined)).toBe(true);
    expect(stub.creates).toEqual([]);

    const log = { info: () => {}, warn: () => {}, error: () => {} };
    const again = await provisionOrder(order.id, { log, now: NOW_MS, invitesFrom: CONFIG.invitesFrom });
    expect(again).toMatchObject({ ok: true, createdAccount: false, createdPlan: false });
    expect((await (await db()).select().from(accounts)).length).toBe(1);
    expect((await (await db()).select().from(teams)).length).toBe(1);

    // Monday morning: the held invite goes out once.
    expect(await sendHeldInvites({ log, now: CONFIG.invitesFrom, invitesFrom: CONFIG.invitesFrom })).toBe(1);
    expect(await sendHeldInvites({ log, now: CONFIG.invitesFrom + 60_000, invitesFrom: CONFIG.invitesFrom })).toBe(0);
    expect(outboxFor({ to: 'pat@example.com', template: 'team-invite' }).length).toBe(1);
  });

  it('holds every invite while the platform is in fixture mode, even after INVITES_FROM', async () => {
    await app.close();
    await fresh({ invitesEnabled: false });
    process.env.FIXED_NOW = '2026-11-17T10:00:00-06:00';
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    const [acct] = await (await db()).select().from(accounts);
    expect(acct!.inviteSentAt).toBeNull();
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
  });

  it('2: Amplified Insiders by the month: each $197 counts and moves paid_through a month, with a 3-month minimum', async () => {
    const order = await buy('insiders-monthly', {}, { subscription: 'sub_mo' });
    const meta = { order_id: order.id, ai_plan: 'membership', ai_option: 'monthly' };
    const [before] = await (await db()).select().from(plans);
    expect(before).toMatchObject({ kind: 'membership', option: 'monthly', minimumUntil: Date.UTC(2027, 1, 14, 21) });
    const month1 = NOW_MS + 31 * DAY;
    await deliver('invoice.paid', invoice('sub_mo', 19700, month1, meta));
    const month2 = NOW_MS + 61 * DAY;
    await deliver('invoice.paid', invoice('sub_mo', 19700, month2, meta));
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.paidThrough).toBe(Math.floor(month2 / 1000) * 1000);
    expect((await one()).paymentsMade).toBe(2);
  });

  it('3: cancel and keep: paid_through stays, live sessions end, and the buyer is tagged membership-ended', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    await deliver('customer.subscription.deleted', { id: 'sub_ins', object: 'subscription', status: 'canceled', metadata: {} });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'canceled', paidThrough: NOW_MS + 365 * DAY, liveUntil: NOW_MS + 365 * DAY });
    const order = await one();
    expect(order.membershipEndedAt).toBe(NOW_MS);
    expect(order.ghlSyncedAt).toBeNull();
  });

  it('4: the AI Accelerator in full opens both sets, and its own subscription carries Insiders from May 4, 2027', async () => {
    // A Payment Link's relative trial lands on the wrong day for a later buyer: the webhook pins it.
    stub.subs.set('sub_full', { id: 'sub_full', status: 'trialing', customer: 'cus_1', trialEnd: INSIDERS_FIRST_CHARGE_AT + 2 * DAY, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const order = await buy('cohort-full', {}, { subscription: 'sub_full' });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'cohort', cohortId: 'dec26', paidThrough: INSIDERS_FIRST_CHARGE_AT, stripeSubscriptionId: 'sub_full' });
    expect(stub.updates).toEqual([
      {
        id: 'sub_full',
        params: { metadata: { order_id: order.id, ai_plan: 'cohort', ai_option: 'full' }, trial_end: 1809406800, proration_behavior: 'none' },
      },
    ]);
    // No second membership: the purchase's own subscription is it.
    expect(stub.creates).toEqual([]);
    // The $7,500 invoice counts as the one payment.
    // The $7,500 invoice counts as the one payment; its trial line, which ends past the pin, does not
    // carry the plan past May 4.
    await deliver('invoice.paid', invoice('sub_full', 750000, INSIDERS_FIRST_CHARGE_AT + 2 * DAY, { order_id: order.id }));
    expect((await one()).paymentsMade).toBe(1);
    const [after] = await (await db()).select().from(plans);
    expect(after!.paidThrough).toBe(INSIDERS_FIRST_CHARGE_AT);
  });

  it('two payments: every buyer rolls into a separate Insiders subscription on May 4, 2027, never twice', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    expect(stub.creates).toHaveLength(1);
    expect(stub.creates[0]!.key).toBe(`membership-autoroll-${order.stripeSessionId}`);
    expect(stub.creates[0]!.params).toMatchObject({
      customer: 'cus_1',
      items: [{ price: 'price_mm' }],
      trial_end: 1809406800,
      default_payment_method: 'pm_sub',
      metadata: { ai_plan: 'membership', ai_option: 'monthly', origin: 'payment_link', source_plan: 'cohort', source_option: 'two_pay', source_session: order.stripeSessionId },
    });
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.stripeSubscriptionId).toBe('sub_membership_1');
    // The installments are not dated at checkout: the second paid invoice ends them (section B).
    expect(stub.updates.filter((u) => u.params.cancel_at || u.params.cancel_at_period_end)).toEqual([]);

    // A buyer who already holds a membership is not enrolled again.
    stub.members.add('cus_1');
    await buy('cohort-two-pay', { email: 'sam@example.com' }, { subscription: 'sub_two_b' });
    expect(stub.creates).toHaveLength(1);
  });

  it('a two-pay Payment Link buyer rolls into Insiders too, with the company from company_or_team_name', async () => {
    const res = await deliver('checkout.session.completed', {
      id: 'cs_test_linktwopay001',
      object: 'checkout.session',
      client_reference_id: null,
      payment_link: 'plink_two',
      metadata: { ai_plan: 'cohort', ai_option: 'two_pay', origin: 'payment_link', campaign: 'forum' },
      payment_status: 'paid',
      customer: 'cus_9',
      subscription: 'sub_link_two',
      customer_details: { email: 'Kim@Example.com', name: 'Kim Owner', phone: null },
      custom_fields: [
        { key: 'company_or_team_name', label: { type: 'custom', custom: 'Company or team name' }, text: { value: 'Kim Group' } },
        { key: 'crm', label: { type: 'custom', custom: 'Which CRM does your team use?' }, dropdown: { value: 'followupboss' } },
      ],
      consent: { terms_of_service: 'accepted' },
    });
    expect(res.statusCode).toBe(200);
    expect(await one()).toMatchObject({ origin: 'payment_link', company: 'Kim Group', crm: 'follow_up_boss', campaign: 'forum', renewalConsentAt: null });
    expect(stub.creates).toHaveLength(1);
    expect(stub.creates[0]!.key).toBe('membership-autoroll-cs_test_linktwopay001');
    expect(stub.creates[0]!.params.metadata).toMatchObject({ origin: 'payment_link', campaign: 'forum', source_session: 'cs_test_linktwopay001' });
  });

  it('5: two-pay ends itself at the second paid invoice, and its end is complete, not cancelled', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 31 * DAY, { order_id: order.id }));
    expect(stub.updates.filter((u) => u.params.cancel_at_period_end)).toEqual([]);
    await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 61 * DAY, { order_id: order.id }));
    expect(stub.updates.filter((u) => u.params.cancel_at_period_end)).toEqual([{ id: 'sub_two', params: { cancel_at_period_end: true } }]);
    const ended = await deliver('customer.subscription.deleted', { id: 'sub_two', status: 'canceled', metadata: { order_id: order.id } });
    expect(ended.statusCode).toBe(200);
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.status).toBe('active');
  });

  it('6: a failed second payment makes the plan past_due and tags payment-failed', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    await deliver('invoice.payment_failed', invoice('sub_two', 0, NOW_MS + 61 * DAY, { order_id: order.id }));
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.status).toBe('past_due');
    expect((await one()).paymentFailedAt).toBe(NOW_MS);
  });

  it('7: a Team Plan pays its first 3 months today, holds 41 logins, and bills monthly from Apr 4, 2027', async () => {
    stub.subs.set('sub_agents', { id: 'sub_agents', status: 'trialing', customer: 'cus_1', trialEnd: AGENTS_FIRST_CHARGE_AT + 9 * DAY, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const order = await buy('agents-16to40', {}, { subscription: 'sub_agents' });
    expect(order.status).toBe('paid');
    const [plan] = await (await db()).select().from(plans);
    // Logins now; agent skills from Dec 14; paid through Apr 3; the minimum is already paid.
    expect(plan).toMatchObject({ kind: 'agents', status: 'active', seats: 41, startsAt: AGENTS_SKILLS_FROM, paidThrough: AGENTS_FIRST_CHARGE_AT, minimumUntil: null });
    const [team] = await (await db()).select().from(teams);
    expect(team!.seats).toBe(41);
    expect(stub.updates.at(-1)?.params).toMatchObject({ trial_end: 1806814800, proration_behavior: 'none' });
    // The $2,391 invoice: one payment, and its trial line does not carry the plan past Apr 4.
    await deliver('invoice.paid', invoice('sub_agents', 239100, AGENTS_FIRST_CHARGE_AT + 9 * DAY, { order_id: order.id }));
    expect((await one()).paymentsMade).toBe(1);
    expect((await (await db()).select().from(plans))[0]!.paidThrough).toBe(AGENTS_FIRST_CHARGE_AT);
    // Apr 4: the first $797 moves it a month.
    process.env.FIXED_NOW = '2027-04-04T09:00:00-05:00';
    await deliver('invoice.paid', invoice('sub_agents', 79700, AGENTS_FIRST_CHARGE_AT + 30 * DAY, { order_id: order.id }));
    expect((await (await db()).select().from(plans))[0]!.paidThrough).toBe(AGENTS_FIRST_CHARGE_AT + 30 * DAY);
    expect((await one()).paymentsMade).toBe(2);
  });

  it('8: a Team Plan link with billing=forum_prepay becomes an order with its trial moved to exactly Apr 4; an older link does not', async () => {
    stub.subs.set('sub_link', { id: 'sub_link', status: 'trialing', customer: 'cus_7', trialEnd: AGENTS_FIRST_CHARGE_AT - 2 * DAY, defaultPaymentMethod: 'pm_7', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const res = await deliver('checkout.session.completed', {
      id: 'cs_test_linksession01',
      object: 'checkout.session',
      client_reference_id: null,
      payment_link: 'plink_1',
      metadata: { ai_plan: 'agents', ai_option: 'upto15', billing: 'forum_prepay', origin: 'payment_link', campaign: 'forum' },
      payment_status: 'paid',
      customer: 'cus_7',
      subscription: 'sub_link',
      customer_details: { email: 'Lee@Example.com', name: 'Lee Owner', phone: '+18015550000' },
      custom_fields: [
        { key: 'company', text: { value: 'Lee Team' } },
        { key: 'agents', numeric: { value: '12' } },
      ],
      consent: { terms_of_service: 'accepted' },
    });
    expect(res.statusCode).toBe(200);
    const order = await one();
    expect(order).toMatchObject({ origin: 'payment_link', plan: 'agents', option: 'upto15', status: 'paid', email: 'lee@example.com', company: 'Lee Team', teamSize: '11-25', campaign: 'forum', agreementVersion: AGREEMENT_VERSION });
    expect(stub.updates).toEqual([
      {
        id: 'sub_link',
        params: { metadata: { order_id: order.id, ai_plan: 'agents', ai_option: 'upto15', campaign: 'forum' }, trial_end: Math.floor(AGENTS_FIRST_CHARGE_AT / 1000), proration_behavior: 'none' },
      },
    ]);
    // The welcome page finds the link's session too.
    const welcome = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_linksession01' });
    expect(welcome.body).toContain('Amplified Team Plan');

    // A Team Plan session without `billing=forum_prepay` is from an older link: recorded, not provisioned.
    const older = await deliver('checkout.session.completed', { ...linkSession('agents-upto15', 'old@example.com'), metadata: { ai_plan: 'agents', ai_option: 'upto15' } });
    expect(older.statusCode).toBe(200);
    expect((await orderRows()).length).toBe(1);
  });

  it('13: a second plan for the same buyer lands on one account', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    await buy('agents-upto15', {}, { subscription: 'sub_a' });
    expect((await (await db()).select().from(accounts)).length).toBe(1);
    expect((await (await db()).select().from(plans)).map((p) => p.kind).sort()).toEqual(['agents', 'membership']);
    const [team] = await (await db()).select().from(teams);
    expect(team!.seats).toBe(16);
  });

  it('17: a full refund ends the plan, stops later charges and tags refunded', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins', payment_intent: 'pi_ins' });
    await deliver('charge.refunded', { id: 'ch_1', object: 'charge', refunded: true, payment_intent: 'pi_ins' });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'ended', liveUntil: NOW_MS });
    expect(await one()).toMatchObject({ status: 'refunded', refundedAt: NOW_MS, ghlSyncedAt: null });
    expect(stub.cancels).toEqual(['sub_ins']);
    // A partial refund changes nothing.
    const partial = await deliver('charge.refunded', { id: 'ch_2', refunded: false, payment_intent: 'pi_ins' });
    expect(partial.statusCode).toBe(200);
  });

  it('records and ignores the $1 smoke test and events it does not handle', async () => {
    const smoke = await deliver('checkout.session.completed', { id: 'cs_test_smoke000001', metadata: { ai_plan: 'test', ai_option: 'test' }, payment_status: 'paid' });
    const other = await deliver('customer.created', { id: 'cus_1' });
    expect([smoke.statusCode, other.statusCode]).toEqual([200, 200]);
    expect(await orderRows()).toEqual([]);
    expect((await (await db()).select().from(stripeEvents)).every((e) => e.processedAt !== null)).toBe(true);
  });

  it('an expired Payment Link session, which never became an order, is recorded and ignored', async () => {
    const res = await deliver('checkout.session.expired', { id: 'cs_test_expired00001', client_reference_id: null, metadata: { ai_plan: 'membership', ai_option: 'monthly' } });
    expect(res.statusCode).toBe(200);
    expect(await orderRows()).toEqual([]);
  });

  it('answers 503 with no signing secret, so Stripe keeps retrying', async () => {
    await app.close();
    await fresh({ stripeWebhookSecret: null });
    const res = await deliver('invoice.paid', invoice('sub_x', 1, NOW_MS));
    expect(res.statusCode).toBe(503);
  });
});

describe('the skill library (D-079)', () => {
  beforeEach(async () => void (await fresh()));

  it('15: a locked skill is 403 and an open one is listed open', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    const now = NOW_MS;
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: now - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: now - DAY, files: { claude: 'offer-strategy.zip' } },
    ]);
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(list.statusCode).toBe(200);
    const states = Object.fromEntries(list.json().skills.map((s: { id: string; state: string }) => [s.id, s.state]));
    expect(states).toEqual({ 'offer-strategy': 'locked', 'team-pnl-review': 'open' });
    const locked = await app.inject({ method: 'GET', url: '/api/skills/offer-strategy/download/claude', headers: { cookie } });
    expect(locked.statusCode).toBe(403);
    const missingKind = await app.inject({ method: 'GET', url: '/api/skills/team-pnl-review/download/chatgpt', headers: { cookie } });
    expect(missingKind.statusCode).toBe(404);
  });

  it('lists a Grok Bot template with its one file kind, `grok`, by the same access rule (D-100)', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    const now = NOW_MS;
    await (await db()).insert(skills).values([
      { id: 'month-end-close', title: 'Month-End Close Packet', sets: 'both', releasedAt: now - DAY, files: { grok: 'month-end-close.zip' } },
      { id: 'listing-to-live', title: 'Listing-to-Live Launch Checklist', sets: 'agent', releasedAt: now - DAY, files: { grok: 'listing-to-live.zip' } },
    ]);
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    const byId = Object.fromEntries(list.json().skills.map((s: { id: string; state: string; files: string[] }) => [s.id, s]));
    expect(byId['month-end-close']).toMatchObject({ state: 'open', files: ['grok'] });
    expect(byId['listing-to-live']).toMatchObject({ state: 'locked', files: ['grok'] });
    const locked = await app.inject({ method: 'GET', url: '/api/skills/listing-to-live/download/grok', headers: { cookie } });
    expect(locked.statusCode).toBe(403);
    // A template has no Claude file.
    const wrongKind = await app.inject({ method: 'GET', url: '/api/skills/month-end-close/download/claude', headers: { cookie } });
    expect(wrongKind.statusCode).toBe(404);
  });

  it('opens a Team Plan\'s agent skills on Dec 14, with the starter path, and not before', async () => {
    await buy('agents-upto15', {}, { subscription: 'sub_a' });
    await (await db()).insert(skills).values([{ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } }]);
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    const state = async () => (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().skills[0].state;
    expect(await state()).toBe('locked');
    process.env.FIXED_NOW = '2026-12-14T08:00:00-06:00';
    expect(await state()).toBe('open');
  });
});

describe('www routing (D-075, D-051)', () => {
  afterEach(() => {
    delete process.env.MARKETING_HOST;
  });

  it('serves the offer pages on www at their exact paths, and no lookalike', async () => {
    process.env.MARKETING_HOST = 'www.amplifiedimpact.io';
    stub = stubStripe();
    app = await build({
      logger: false,
      marketingPage: '<!doctype html><title>Holding</title>',
      legalPages: { agreement: '<!doctype html><title>Agreement</title>' },
      offer: { pages: { offer: OFFER_PAGE, welcome: WELCOME_PAGE }, config: CONFIG, stripe: stub.client, verify: stripeVerifier(), prices: createPriceCache(() => stub.client) },
    });
    const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'www.amplifiedimpact.io' } });
    for (const url of ['/offer', '/forum', '/offer?cart=library', '/offer/welcome?session_id=cs_test_session0001', '/agreement']) {
      expect((await get(url)).statusCode, url).toBe(200);
    }
    for (const url of ['/offer/', '/Offer', '/offer.html', '/offer/welcome/x', '/forum/', '/FORUM', '/agreement/']) {
      const res = await get(url);
      expect([302, 404], url).toContain(res.statusCode);
      expect(res.body, url).not.toContain('data-offer');
    }
  });
});

describe('Manage Billing (D-077, Connor 2026-11-10)', () => {
  beforeEach(async () => void (await fresh()));

  const ownerCookie = async () => {
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    return app.signInAs(owner!.id);
  };

  it('opens the billing portal for the owner, with cancelling on outside any commitment', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    const res = await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await ownerCookie() } });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('https://billing.stripe.com/p/session/test_portal');
    expect(stub.portals).toEqual([{ customer: 'cus_1', returnUrl: 'https://learn.amplifiedimpact.io/skill-library' }]);
  });

  it('uses the locked configuration inside Insiders\' 3-month minimum, and not for the prepaid Team Plan', async () => {
    await buy('agents-upto15', {}, { subscription: 'sub_a' });
    await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await ownerCookie() } });
    expect(stub.portals.at(-1)?.configuration).toBeUndefined();
    await buy('insiders-monthly', {}, { subscription: 'sub_mo' });
    await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await ownerCookie() } });
    expect(stub.portals.at(-1)?.configuration).toBe('bpc_locked');
  });

  it('sends a team member who is not the owner away, and anyone without a session to sign in', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/billing/portal' })).statusCode).toBe(401);
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    const [acct] = await (await db()).select().from(accounts);
    await (await db()).insert(users).values({ id: 'u_agent', email: 'agent@example.com', name: 'Agent', kind: 'learner', role: 'Sales Agent', tier: 'team', teamId: acct!.teamId, cohortId: 'dec26', status: 'active', joined: NOW_MS });
    const res = await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await app.signInAs('u_agent') } });
    expect(res.statusCode).toBe(403);
  });

  it('falls back to the portal login when Stripe cannot open a session', async () => {
    await buy('insiders-year', {}, { subscription: 'sub_ins' });
    stub.client.createPortalSession = async () => {
      throw Object.assign(new Error('down'), { type: 'StripeConnectionError' });
    };
    const res = await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await ownerCookie() } });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('https://billing.stripe.com/p/login/test_portal');
  });
});
