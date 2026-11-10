// The offer, end to end against Postgres with a stubbed Stripe (D-072 to D-078): the spec's test plan,
// as far as it can run without Stripe's own test mode. Webhook events are signed exactly as Stripe signs
// them (`generateTestHeaderString`); Checkout Sessions are created against a stub that records what it
// was asked for. No network.
//
// The scenarios are numbered as in the spec's "In test mode" table where they map onto one.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, orders, plans, skills, stripeEvents, users, teams } from '../src/db/schema';
import { AGREEMENT_VERSION } from '../src/billing/checkout';
import { AGENTS_FIRST_CHARGE_AT, COHORT_ONE_LIVE_UNTIL } from '../src/billing/catalog';
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
  { lookupKey: 'library_upfront', id: 'price_lu', unitAmount: 200000, currency: 'usd', interval: null, productName: 'Skill Library' },
  { lookupKey: 'membership_monthly', id: 'price_mm', unitAmount: 19700, currency: 'usd', interval: 'month', productName: 'Membership' },
  { lookupKey: 'agents_upto15_founding', id: 'price_a15', unitAmount: 49700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
  { lookupKey: 'agents_16to40_founding', id: 'price_a40', unitAmount: 79700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
];

const OFFER_PAGE = [
  '<!doctype html><html lang="en"><head><title>Plans</title></head><body data-offer="%%offer-state%%" data-founding="%%founding%%">',
  '<form method="post" action="/api/checkout"><input type="hidden" name="campaign" value="%%campaign%%">',
  '<p class="price">%%price:library_upfront%%</p><p class="err">%%error%%</p><a href="%%link:cohort-full%%">x</a>',
  '<input type="radio" name="cart" value="library" %%checked:library%%></form>',
  '<script type="module">document.body.dataset.js = "1";</script></body></html>',
].join('');
const WELCOME_PAGE = '<!doctype html><html><body data-state="%%welcome-state%%"><h1>%%plan-name%%</h1><p>%%login%%</p><a href="%%intake-url%%">i</a></body></html>';

interface Stub {
  client: BillingStripe;
  sessions: { params: Stripe.Checkout.SessionCreateParams; key: string }[];
  updates: { id: string; params: Stripe.SubscriptionUpdateParams }[];
  creates: { params: Stripe.SubscriptionCreateParams; key: string }[];
  cancels: string[];
  subs: Map<string, SubscriptionInfo>;
  fail: boolean;
}

function stubStripe(): Stub {
  const stub: Stub = { sessions: [], updates: [], creates: [], cancels: [], subs: new Map(), fail: false, client: null as never };
  const sub = (id: string, over: Partial<SubscriptionInfo> = {}): SubscriptionInfo => ({
    id,
    status: 'active',
    customer: 'cus_1',
    trialEnd: null,
    defaultPaymentMethod: 'pm_sub',
    metadata: {},
    ...stub.subs.get(id),
    ...over,
  });
  stub.client = {
    pricesByLookupKeys: async () => PRICE_LIST,
    createCheckoutSession: async (params, key) => {
      if (stub.fail) throw Object.assign(new Error('boom'), { type: 'StripeConnectionError' });
      stub.sessions.push({ params, key });
      const n = stub.sessions.length;
      return { id: `cs_test_session${String(n).padStart(4, '0')}`, url: `https://checkout.stripe.com/c/pay/cs_test_session${n}` };
    },
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
  foundingClosesAt: Date.parse('2026-11-15T23:59:00-06:00'),
  invitesFrom: Date.parse('2026-11-16T08:00:00-06:00'),
  paymentLinks: { 'cohort-full': 'https://buy.stripe.com/test_cohort_full' },
  intakeUrls: { library: 'https://forms.example.com/library' },
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

const BUYER = { name: 'Pat Buyer', email: 'pat@example.com', company: 'Pat Group', agree: true, renew: true };

const checkout = (payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/api/checkout', payload: JSON.stringify(payload), headers: { 'content-type': 'application/json', origin: ORIGIN } });

const checkoutForm = (fields: Record<string, string>) =>
  app.inject({
    method: 'POST',
    url: '/api/checkout',
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
  });

let eventN = 0;
async function deliver(type: string, object: Record<string, unknown>, id = `evt_${++eventN}`) {
  const payload = JSON.stringify({ id, object: 'event', type, api_version: '2025-10-29.clover', data: { object } });
  const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return app.inject({ method: 'POST', url: '/api/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } });
}

/** A checkout on the site, then Stripe's completion for it. */
async function buy(cart: string, extra: Record<string, unknown> = {}, session: Record<string, unknown> = {}) {
  const res = await checkout({ cart, ...BUYER, ...extra });
  expect(res.statusCode, res.body).toBe(200);
  const rows = await orderRows();
  const order = rows.find((o) => o.stripeSessionId === `cs_test_session${String(stub.sessions.length).padStart(4, '0')}`)!;
  const done = await deliver('checkout.session.completed', {
    id: order.stripeSessionId,
    object: 'checkout.session',
    client_reference_id: order.id,
    metadata: { order_id: order.id, ai_plan: order.plan, ai_option: order.option },
    payment_status: 'paid',
    customer: 'cus_1',
    payment_intent: null,
    subscription: null,
    amount_total: 0,
    currency: 'usd',
    customer_details: { email: order.email, name: order.name, phone: null },
    ...session,
  });
  expect(done.statusCode, done.body).toBe(200);
  return (await db()).select().from(orders).where(eq(orders.id, order.id)).then((r) => r[0]!);
}

const invoice = (sub: string, amount: number, periodEnd: number, meta: Record<string, string> = {}) => ({
  id: `in_${++eventN}`,
  object: 'invoice',
  amount_paid: amount,
  parent: { type: 'subscription_details', subscription_details: { subscription: sub, metadata: meta } },
  lines: { data: [{ period: { start: Math.floor(NOW_MS / 1000), end: Math.floor(periodEnd / 1000) } }] },
});

describe('POST /api/checkout (D-072, D-076)', () => {
  beforeEach(async () => void (await fresh()));

  it('writes a pending order with the consent proof, then opens a session for it', async () => {
    const res = await checkout({ cart: 'library', ...BUYER, src: 'qr', campaign: 'forum', sms: true, phone: '801-555-1234' });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const order = await one();
    expect(order).toMatchObject({
      plan: 'library',
      option: 'upfront',
      origin: 'offer',
      status: 'pending',
      email: 'pat@example.com',
      campaign: 'forum',
      src: 'qr',
      agreementVersion: AGREEMENT_VERSION,
      agreementAcceptedAt: NOW_MS,
      renewalConsentAt: NOW_MS,
      smsConsent: true,
      phone: '+18015551234',
      stripeSessionId: 'cs_test_session0001',
    });
    expect(order.renewalConsentText).toContain('$197 a month');
    expect(stub.sessions[0]!.key).toBe(order.id);
    expect(stub.sessions[0]!.params.metadata).toMatchObject({ order_id: order.id, campaign: 'forum' });
    expect(stub.sessions[0]!.params.cancel_url).toMatch(/^http:\/\/localhost(:80)?\/forum\?cart=library#checkout$/);
  });

  it('11: refuses an unticked agreement or renewal box, with no order and no session', async () => {
    for (const over of [{ agree: false }, { renew: false }]) {
      const res = await checkout({ cart: 'library', ...BUYER, ...over });
      expect(res.statusCode).toBe(400);
      expect(res.json().field).toBe('agree' in over ? 'agree' : 'renew');
    }
    expect(await orderRows()).toEqual([]);
    expect(stub.sessions).toEqual([]);
  });

  it('10: refuses the cohort to a team not on Follow Up Boss, offering the library and the waitlist', async () => {
    const res = await checkout({ cart: 'cohort-full', ...BUYER, crm: 'other' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ field: 'crm' });
    expect(res.json().error).toContain('Skill Library');
    expect(res.json().error).toContain('waitlist');
  });

  it('a no-JS form gets a 303 to Stripe, and a 303 back to the plan with the error', async () => {
    const ok = await checkoutForm({ cart: 'library', name: 'Pat', email: 'pat@example.com', agree: 'on', 'renew-library': 'on' });
    expect(ok.statusCode).toBe(303);
    expect(ok.headers.location).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const bad = await checkoutForm({ cart: 'library', name: 'Pat', email: 'pat@example.com', agree: 'on', campaign: 'forum' });
    expect(bad.statusCode).toBe(303);
    expect(bad.headers.location).toBe('/forum?error=renew&cart=library#checkout');
  });

  it('9: refuses founding prices after the close, and keeps selling the library', async () => {
    process.env.FIXED_NOW = '2026-11-16T00:00:00-06:00';
    const res = await checkout({ cart: 'cohort-full', ...BUYER, crm: 'follow_up_boss' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Founding prices closed on Sunday, November 15.');
    expect(res.json().fallback).toBe('https://buy.stripe.com/test_cohort_full');
    expect((await checkout({ cart: 'library', ...BUYER })).statusCode).toBe(200);
  });

  it('refuses everything while OFFER_OPEN is off, and answers with the fallback when Stripe fails', async () => {
    await app.close();
    await fresh({ open: false });
    expect((await checkout({ cart: 'library', ...BUYER })).statusCode).toBe(409);
    await app.close();
    await fresh();
    stub.fail = true;
    const res = await checkout({ cart: 'cohort-full', ...BUYER, crm: 'follow_up_boss' });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ code: 'stripe', fallback: 'https://buy.stripe.com/test_cohort_full' });
  });

  it('refuses a post from another site', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout',
      payload: JSON.stringify({ cart: 'library', ...BUYER }),
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('the offer pages (D-074)', () => {
  beforeEach(async () => void (await fresh()));

  it('fills prices and state, records the forum campaign on /forum only, and lets the form reach Stripe', async () => {
    const offer = await app.inject({ method: 'GET', url: '/offer' });
    expect(offer.statusCode).toBe(200);
    expect(offer.body).toContain('<p class="price">$2,000</p>');
    expect(offer.body).toContain('data-offer="checkout"');
    expect(offer.body).toContain('name="campaign" value=""');
    expect(offer.body).toContain('value="library" checked');
    expect(offer.headers['cache-control']).toBe('no-store');
    expect(String(offer.headers['content-security-policy'])).toContain("form-action 'self' https://checkout.stripe.com");
    const forum = await app.inject({ method: 'GET', url: '/forum?src=qr&error=renew' });
    expect(forum.body).toContain('name="campaign" value="forum"');
    expect(forum.body).toContain('Tick the box to agree to the later charge.');
    // Every other response keeps the plain policy.
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(String(health.headers['content-security-policy'])).not.toContain('checkout.stripe.com');
  });

  it('GET /api/offer lists the carts with live prices', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/offer' });
    const body = res.json();
    expect(body.founding.open).toBe(true);
    expect(body.carts.map((c: { id: string }) => c.id)).toEqual(['library', 'cohort-full', 'cohort-two-pay', 'agents-upto15', 'agents-16to40']);
    expect(body.carts[0].prices[0]).toEqual({ lookupKey: 'library_upfront', amount: 200000, currency: 'usd', interval: null });
  });

  it('the welcome page waits for the webhook, then confirms the plan and links the intake form', async () => {
    await checkout({ cart: 'library', ...BUYER });
    const pending = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_session0001' });
    expect(pending.body).toContain('data-state="pending"');
    await deliver('checkout.session.completed', {
      id: 'cs_test_session0001',
      client_reference_id: (await one()).id,
      metadata: { ai_plan: 'library', ai_option: 'upfront' },
      payment_status: 'paid',
      customer: 'cus_1',
      subscription: 'sub_lib',
    });
    const done = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_session0001' });
    expect(done.body).toContain('data-state="confirmed"');
    expect(done.body).toContain('<h1>Skill Library</h1>');
    expect(done.body).toContain('Monday, November 16');
    expect(done.body).toContain('href="https://forms.example.com/library"');
    const status = await app.inject({ method: 'GET', url: '/api/offer/order-status?session_id=cs_test_session0001' });
    expect(status.json()).toEqual({ status: 'paid', plan: 'library', name: 'Skill Library' });
    const unknown = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=nope' });
    expect(unknown.body).toContain('data-state="unknown"');
  });
});

describe('POST /api/stripe/webhook (D-074, D-076, D-077)', () => {
  beforeEach(async () => void (await fresh()));

  it('16: refuses a bad signature, and counts a repeated event once', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/api/stripe/webhook',
      payload: '{"id":"evt_x","type":"invoice.paid","data":{"object":{}}}',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
    });
    expect(bad.statusCode).toBe(400);

    const order = await buy('cohort-two-pay', { crm: 'follow_up_boss' }, { subscription: 'sub_two', payment_status: 'paid' });
    const first = await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 31 * DAY, { order_id: order.id }), 'evt_same');
    const again = await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 31 * DAY, { order_id: order.id }), 'evt_same');
    expect([first.statusCode, again.statusCode]).toEqual([200, 200]);
    expect(again.json().duplicate).toBe(true);
    expect((await one()).paymentsMade).toBe(1);
    expect((await (await db()).select().from(stripeEvents)).find((e) => e.id === 'evt_same')?.processedAt).toBe(NOW_MS);
  });

  it('1 and 12: a paid library order makes one account, one plan and one held invite, however often it runs', async () => {
    const order = await buy('library', {}, { subscription: 'sub_lib' });
    expect(order.status).toBe('paid');
    const [acct] = await (await db()).select().from(accounts);
    expect(acct).toMatchObject({ ownerEmail: 'pat@example.com', name: 'Pat Group', inviteSentAt: null });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'library', status: 'active', seats: 2, paidThrough: NOW_MS + 30 * DAY, stripeSubscriptionId: 'sub_lib' });
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    expect(owner).toMatchObject({ role: 'Team Owner', status: 'invited', tier: 'team', teamId: acct!.teamId });
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);

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

  it('2: the library\'s $197 on day 31 moves paid_through a month', async () => {
    const order = await buy('library', {}, { subscription: 'sub_lib' });
    await deliver('invoice.paid', invoice('sub_lib', 200000, NOW_MS + 30 * DAY, { order_id: order.id }));
    const day31 = NOW_MS + 61 * DAY;
    await deliver('invoice.paid', invoice('sub_lib', 19700, day31, { order_id: order.id }));
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.paidThrough).toBe(Math.floor(day31 / 1000) * 1000);
    expect((await one()).paymentsMade).toBe(2);
  });

  it('3: cancel and keep: paid_through stays, live sessions end, and the buyer is tagged membership-ended', async () => {
    await buy('library', {}, { subscription: 'sub_lib' });
    await deliver('customer.subscription.deleted', { id: 'sub_lib', object: 'subscription', status: 'canceled', metadata: {} });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'canceled', paidThrough: NOW_MS + 30 * DAY });
    expect(plan!.liveUntil).toBe(NOW_MS + 30 * DAY);
    const order = await one();
    expect(order.membershipEndedAt).toBe(NOW_MS);
    expect(order.ghlSyncedAt).toBeNull();
  });

  it('4: the cohort in full opens both sets in cohort one, and schedules the $197 only when its box was ticked', async () => {
    await buy('cohort-full', { crm: 'follow_up_boss', renew: false }, { payment_intent: 'pi_1', amount_total: 750000 });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'cohort', cohortId: 'dec26', paidThrough: COHORT_ONE_LIVE_UNTIL });
    expect((await one()).paymentsMade).toBe(1);
    expect(stub.creates).toEqual([]);

    await buy('cohort-full', { crm: 'follow_up_boss', renew: true, email: 'sam@example.com' }, { payment_intent: 'pi_2' });
    expect(stub.creates).toHaveLength(1);
    expect(stub.creates[0]!.params).toMatchObject({
      customer: 'cus_1',
      items: [{ price: 'price_mm' }],
      trial_end: Math.floor(COHORT_ONE_LIVE_UNTIL / 1000),
      default_payment_method: 'pm_saved',
    });
  });

  it('5: two-pay ends itself after the second payment, and its end is complete, not cancelled', async () => {
    const order = await buy('cohort-two-pay', { crm: 'follow_up_boss' }, { subscription: 'sub_two' });
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
    const order = await buy('cohort-two-pay', { crm: 'follow_up_boss' }, { subscription: 'sub_two' });
    await deliver('invoice.payment_failed', invoice('sub_two', 0, NOW_MS + 61 * DAY, { order_id: order.id }));
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.status).toBe('past_due');
    expect((await one()).paymentFailedAt).toBe(NOW_MS);
  });

  it('7: an agent plan charges nothing today, holds 41 logins, and opens on its Jan 26 charge', async () => {
    const order = await buy('agents-16to40', {}, { subscription: 'sub_agents', payment_status: 'no_payment_required' });
    expect(order.status).toBe('trialing');
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'agents', status: 'trialing', seats: 41, paidThrough: null });
    const [team] = await (await db()).select().from(teams);
    expect(team!.seats).toBe(41);
    await deliver('invoice.paid', invoice('sub_agents', 79700, AGENTS_FIRST_CHARGE_AT + 31 * DAY, { order_id: order.id }));
    const [after] = await (await db()).select().from(plans);
    expect(after!.status).toBe('active');
    expect((await one()).status).toBe('paid');
  });

  it('8: a fallback Payment Link becomes an order, and its agent trial moves to exactly Jan 26', async () => {
    stub.subs.set('sub_link', { id: 'sub_link', status: 'trialing', customer: 'cus_7', trialEnd: AGENTS_FIRST_CHARGE_AT - 2 * DAY, defaultPaymentMethod: 'pm_7', metadata: {} });
    const res = await deliver('checkout.session.completed', {
      id: 'cs_test_linksession01',
      object: 'checkout.session',
      client_reference_id: null,
      payment_link: 'plink_1',
      metadata: { ai_plan: 'agents', ai_option: 'upto15', origin: 'payment_link', campaign: 'forum' },
      payment_status: 'no_payment_required',
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
    expect(order).toMatchObject({ origin: 'payment_link', plan: 'agents', option: 'upto15', status: 'trialing', email: 'lee@example.com', company: 'Lee Team', teamSize: '11-25', campaign: 'forum', agreementVersion: AGREEMENT_VERSION });
    expect(stub.updates).toEqual([
      {
        id: 'sub_link',
        params: { metadata: { order_id: order.id, ai_plan: 'agents', ai_option: 'upto15', campaign: 'forum' }, trial_end: Math.floor(AGENTS_FIRST_CHARGE_AT / 1000), proration_behavior: 'none' },
      },
    ]);
    // The welcome page finds the link's session too.
    const welcome = await app.inject({ method: 'GET', url: '/offer/welcome?session_id=cs_test_linksession01' });
    expect(welcome.body).toContain('Agent Team Plan');
  });

  it('13: a second plan for the same buyer lands on one account', async () => {
    await buy('library', {}, { subscription: 'sub_lib' });
    await buy('agents-upto15', {}, { subscription: 'sub_a', payment_status: 'no_payment_required' });
    expect((await (await db()).select().from(accounts)).length).toBe(1);
    expect((await (await db()).select().from(plans)).map((p) => p.kind).sort()).toEqual(['agents', 'library']);
    const [team] = await (await db()).select().from(teams);
    expect(team!.seats).toBe(16);
  });

  it('17: a full refund ends the plan, stops later charges and tags refunded', async () => {
    await buy('library', {}, { subscription: 'sub_lib', payment_intent: 'pi_lib' });
    await deliver('charge.refunded', { id: 'ch_1', object: 'charge', refunded: true, payment_intent: 'pi_lib' });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'ended', liveUntil: NOW_MS });
    expect(await one()).toMatchObject({ status: 'refunded', refundedAt: NOW_MS, ghlSyncedAt: null });
    expect(stub.cancels).toEqual(['sub_lib']);
    // A partial refund changes nothing.
    const partial = await deliver('charge.refunded', { id: 'ch_2', refunded: false, payment_intent: 'pi_lib' });
    expect(partial.statusCode).toBe(200);
  });

  it('records and ignores the $1 smoke test and events it does not handle', async () => {
    const smoke = await deliver('checkout.session.completed', { id: 'cs_test_smoke000001', metadata: { ai_plan: 'test', ai_option: 'test' }, payment_status: 'paid' });
    const other = await deliver('customer.created', { id: 'cus_1' });
    expect([smoke.statusCode, other.statusCode]).toEqual([200, 200]);
    expect(await orderRows()).toEqual([]);
    expect((await (await db()).select().from(stripeEvents)).every((e) => e.processedAt !== null)).toBe(true);
  });

  it('an expired checkout is tagged abandoned', async () => {
    await checkout({ cart: 'library', ...BUYER });
    const order = await one();
    await deliver('checkout.session.expired', { id: order.stripeSessionId, client_reference_id: order.id });
    expect(await one()).toMatchObject({ status: 'expired', ghlSyncedAt: null });
  });

  it('answers 503 with no signing secret, so Stripe keeps retrying', async () => {
    await app.close();
    await fresh({ stripeWebhookSecret: null });
    const res = await deliver('invoice.paid', invoice('sub_x', 1, NOW_MS));
    expect(res.statusCode).toBe(503);
  });
});

describe('the skill library (D-078)', () => {
  beforeEach(async () => void (await fresh()));

  it('15: a locked skill is 403 and an open one is listed open', async () => {
    await buy('library', {}, { subscription: 'sub_lib' });
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
});
