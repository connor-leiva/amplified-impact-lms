// The offer, end to end against Postgres with a stubbed Stripe (D-073 to D-079, D-104): the spec's test
// plan, as far as it can run without Stripe's own test mode. Every purchase is a Payment Link's
// completed session (the site's own checkout is retired), signed exactly as Stripe signs webhooks
// (`generateTestHeaderString`); the subscription calls go to a stub that records them. No network.
//
// The scenarios are numbered as in the spec's "In test mode" table where they map onto one. "Every
// offer, end to end" (D-106) walks each of the eight carts through the same path: the account, the
// plan, the held invite, the welcome page, the skills by date, a failed payment, cancel and keep, and a
// refund. Its sessions are shaped from the links' metadata contract (D-104, D-106), not from Stripe
// sandbox fixtures, which the repository does not have.

import { buildsIcs, officeHoursIcs } from '../src/routes/offer-calendar';
import { curriculumSeed } from '@ai/core/seed/curriculum';
import { applyCurriculum } from '../src/db/seed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, orders, plans, skills, stripeEvents, users, teams } from '../src/db/schema';
import { AGREEMENT_VERSION } from '../src/billing/agreement';
import {
  AGENT_PLAN_FIRST_CHARGE_AT,
  AGENTS_FIRST_CHARGE_AT,
  AGENTS_SKILLS_FROM,
  CARTS,
  CART_IDS,
  COHORT_ONE,
  INSIDERS_FIRST_CHARGE_AT,
  PLAN_NAMES,
  addMonths,
} from '../src/billing/catalog';
import type { CartId, PlanKind } from '../src/billing/catalog';
import { handleStripeEvent } from '../src/billing/webhook';
import { buyerTags } from '../src/integrations/ghl';
import type { GhlConfig } from '../src/integrations/ghl';
import { runGhlTick } from '../src/jobs/ghl-sync';
import { fakeCrm } from './fake-ghl';
import type { OfferConfig } from '../src/billing/config';
import { createPriceCache } from '../src/billing/prices';
import { cohortSeatsSold, provisionOrder, sendHeldInvites } from '../src/billing/provision';
import { SOLD_OUT_MARK, SOLD_OUT_MESSAGE, reconcileAcceleratorSeats, resetSeatCapLogForTests, syncAcceleratorPaymentLinks } from '../src/billing/payment-links';
import { startBillingLoop } from '../src/jobs/billing';
import type { BillingStripe, PaymentLinkChange, PaymentLinkInfo, PriceInfo, SubscriptionInfo } from '../src/billing/stripe';
import { stripeVerifier } from '../src/billing/stripe';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { SESSION_COOKIE, settleEmails } from '../src/auth';
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
  { lookupKey: 'agent_plan_monthly', id: 'price_apm', unitAmount: 7900, currency: 'usd', interval: 'month', productName: 'Amplified Agent Plan' },
  { lookupKey: 'agent_plan_yearly', id: 'price_apy', unitAmount: 79000, currency: 'usd', interval: 'year', productName: 'Amplified Agent Plan' },
];

const OFFER_PAGE = [
  '<!doctype html><html lang="en"><head><title>Plans</title></head><body data-offer="%%offer-state%%" data-founding="%%founding%%">',
  '<li data-state="%%state:cohort-full%%"><a href="%%link:cohort-full%%">x</a><a href="%%link:cohort-two-pay%%">y</a></li>',
  '<p class="call">%%team-call%% %%invites%%</p><p class="closes">%%founding-closes%%</p>',
  '<form method="post" action="/api/offer/waitlist"><input type="hidden" name="src" value="%%src%%"></form></body></html>',
].join('');
/** /pricing's tokens (D-111): the offer's, plus the founding countdown and the Accelerator's seats. */
const PRICING_PAGE = [
  '<!doctype html><html lang="en"><head><title>Pricing</title></head><body data-founding="%%founding%%" data-seats="%%seats%%">',
  '<p class="countdown">%%countdown%%</p><p class="seats">%%seats-left%% of %%seats-total%%</p><p class="closes">%%founding-closes%%</p>',
  '<li id="accelerator" data-state="%%state:cohort-full%%"><a href="%%link:cohort-full%%">x</a><a href="%%link:cohort-two-pay%%">y</a></li>',
  '<li id="team-plan" data-state="%%state:agents-upto15%%"><a href="%%link:agents-upto15%%">z</a></li><p class="call">%%team-call%%</p></body></html>',
].join('');
const WELCOME_PAGE =
  '<!doctype html><html><body data-state="%%welcome-state%%" data-product="%%product%%"><h1>%%plan-name%%</h1><p class="paid">%%paid-line%%</p><p>%%login%%</p><a href="%%intake-url%%">i</a><a class="pw" href="%%set-password%%">p</a></body></html>';

interface Stub {
  client: BillingStripe;
  portals: { customer: string; returnUrl: string; configuration?: string }[];
  /** Customers who already hold an active or trialing membership. */
  members: Set<string>;
  updates: { id: string; params: Stripe.SubscriptionUpdateParams }[];
  creates: { params: Stripe.SubscriptionCreateParams; key: string }[];
  cancels: string[];
  subs: Map<string, SubscriptionInfo>;
  /** Which subscription a payment intent paid an invoice of, for a refund of a subscription charge. */
  intents: Map<string, string>;
  fail: boolean;
  /** D-154: the Payment Links in this Stripe account, and every change the seat cap made to one. */
  links: Map<string, PaymentLinkInfo & { inactiveMessage?: string }>;
  linkUpdates: { id: string; change: PaymentLinkChange; key: string }[];
  /** Ids whose next calls answer 403, as a key without Payment Links permission does. */
  linkForbidden: Set<string>;
}

/** The two Accelerator links (the cap's), and an Insiders link it must never touch. */
const seedLinks = (): Stub['links'] =>
  new Map([
    ['plink_full', { id: 'plink_full', active: true, metadata: { ai_plan: 'cohort', ai_option: 'full' } }],
    ['plink_two', { id: 'plink_two', active: true, metadata: { ai_plan: 'cohort', ai_option: 'two_pay' } }],
    ['plink_insiders', { id: 'plink_insiders', active: true, metadata: { ai_plan: 'membership', ai_option: 'year_upfront' } }],
  ]);

function stubStripe(): Stub {
  const stub: Stub = {
    portals: [],
    members: new Set(),
    updates: [],
    creates: [],
    cancels: [],
    subs: new Map(),
    intents: new Map(),
    fail: false,
    links: seedLinks(),
    linkUpdates: [],
    linkForbidden: new Set(),
    client: null as never,
  };
  const forbidden = (id: string) => {
    if (stub.linkForbidden.has(id)) throw Object.assign(new Error('forbidden'), { type: 'StripePermissionError', statusCode: 403 });
  };
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
    retrievePaymentLink: async (id) => {
      forbidden(id);
      const link = stub.links.get(id);
      if (!link) throw Object.assign(new Error('No such payment link'), { code: 'resource_missing', statusCode: 404 });
      return { id, active: link.active, metadata: { ...link.metadata } };
    },
    updatePaymentLink: async (id, change, key) => {
      forbidden(id);
      stub.linkUpdates.push({ id, change, key });
      const link = stub.links.get(id)!;
      const metadata = { ...link.metadata, ...change.metadata };
      for (const [k, v] of Object.entries(change.metadata)) if (v === '') delete metadata[k];
      stub.links.set(id, { id, active: change.active, metadata, inactiveMessage: change.inactive_message ?? link.inactiveMessage });
      return { id, active: change.active, metadata };
    },
    createCheckoutSession: async () => ({ id: 'cs_test_skill', url: 'https://checkout.stripe.com/c/pay/cs_test_skill' }),
    paymentMethodOfPaymentIntent: async () => 'pm_saved',
    subscriptionOfPaymentIntent: async (pi) => stub.intents.get(pi) ?? null,
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
  seatCapLinks: ['plink_full', 'plink_two'],
  skillPriceId: null,
};

let app: App;
let stub: Stub;

async function fresh(config: Partial<OfferConfig> = {}): Promise<App> {
  stub = stubStripe();
  app = await build({
    logger: false,
    offer: {
      pages: { offer: OFFER_PAGE, welcome: WELCOME_PAGE, sales: { '/pricing': PRICING_PAGE } },
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
  courseLoaded = false;
});

/**
 * D-173: the course is data, so a test that opens it puts it in the database first, as production's
 * deploy does (ensure: insert-missing, idempotent). Once per test, before the first course request.
 */
let courseLoaded = false;
async function withCourse(): Promise<void> {
  if (courseLoaded) return;
  await applyCurriculum(await db());
  courseLoaded = true;
}
afterEach(async () => {
  await app?.close();
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

const db = () => testDatabase();
/** The `ai_sid=…` pair a sign-in response set. */
const sessionCookie = (setCookie: string | string[] | undefined): string => {
  const line = (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`));
  expect(line, 'the response set no ai_sid cookie').toBeTruthy();
  return line!.split(';')[0]!;
};
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
    expect(errors).toEqual(['AI Accelerator sold out: seat 15 of 15. The page shows the waitlist; both Accelerator Payment Links are being turned off']);

    body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.seats).toEqual({ total: 15, sold: 15, left: 0 });
    expect(body.carts.filter((c: { plan: string }) => c.plan === 'cohort').map((c: { state: string }) => c.state)).toEqual(['soldout', 'soldout']);
    expect(body.carts.find((c: { id: string }) => c.id === 'insiders-year').state).toBe('link');
    expect((await app.inject({ method: 'GET', url: '/offer' })).body).toContain('<li data-state="soldout"><a href="">x</a><a href="">y</a></li>');
  });

  it('fills /pricing like the offer page, with the founding countdown and the seats left (D-111)', async () => {
    // Sat, Nov 14, 3:00 PM Central: 16 days and some hours before Nov 30, 11:59 PM Mountain.
    const page = await app.inject({ method: 'GET', url: '/pricing' });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('data-founding="open" data-seats="left"');
    expect(page.body).toContain('<p class="countdown">16 days left</p><p class="seats">15 of 15</p>');
    expect(page.body).toContain('<p class="closes">Monday, November 30 at 11:59 PM Mountain</p>');
    expect(page.body).toContain('<li id="accelerator" data-state="link"><a href="https://buy.stripe.com/test_cohort_full">x</a><a href="https://buy.stripe.com/test_cohort_two">y</a></li>');
    // An unset Payment Link "opens soon", with no href to follow.
    expect(page.body).toContain('<li id="team-plan" data-state="soon"><a href="">z</a></li>');
    expect(page.body).toContain('<p class="call">mailto:support@amplifiedimpact.io</p>');
    expect(page.body).not.toContain('%%');
    expect(page.headers['cache-control']).toBe('no-store');

    // The last day counts hours; after the deadline the banner's words are gone and the page is closed.
    process.env.FIXED_NOW = '2026-11-30T20:30:00-07:00';
    expect((await app.inject({ method: 'GET', url: '/pricing' })).body).toContain('<p class="countdown">3 hours left</p>');
    process.env.FIXED_NOW = '2026-12-01T07:00:00Z';
    const closed = (await app.inject({ method: 'GET', url: '/pricing' })).body;
    expect(closed).toContain('data-founding="closed"');
    expect(closed).toContain('<p class="countdown"></p>');
    expect(closed).toContain('<li id="accelerator" data-state="closed"><a href="">x</a><a href="">y</a></li>');
  });

  it('counts /pricing\'s seats from the sales, and says sold out at 15', async () => {
    for (let i = 1; i <= 3; i += 1) await buy('cohort-full', { email: `seat${i}@example.com` }, { customer: `cus_s${i}` });
    expect((await app.inject({ method: 'GET', url: '/pricing' })).body).toContain('<p class="seats">12 of 15</p>');
    for (let i = 4; i <= 15; i += 1) await buy('cohort-two-pay', { email: `seat${i}@example.com` }, { customer: `cus_s${i}` });
    const soldOut = (await app.inject({ method: 'GET', url: '/pricing' })).body;
    expect(soldOut).toContain('data-seats="soldout"');
    expect(soldOut).toContain('<p class="seats">0 of 15</p>');
    expect(soldOut).toContain('<li id="accelerator" data-state="soldout">');
  });

  it('GET /api/offer lists the eight carts with live prices and their links', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.founding).toEqual({ open: true, closesAt: '2026-12-01T06:59:00.000Z' });
    expect(body.carts.map((c: { id: string }) => c.id)).toEqual([
      'cohort-full',
      'cohort-two-pay',
      'insiders-year',
      'insiders-monthly',
      'agents-upto15',
      'agents-16to40',
      'agent-monthly',
      'agent-yearly',
    ]);
    const agent = body.carts.find((c: { id: string }) => c.id === 'agent-yearly');
    expect(agent).toMatchObject({ plan: 'agent_plan', option: 'yearly', name: 'Amplified Agent Plan', founding: false, state: 'soon', paymentLink: null });
    expect(agent.prices).toEqual([{ lookupKey: 'agent_plan_yearly', amount: 79000, currency: 'usd', interval: 'year' }]);
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
    // D-132: the owner's first email is "Set your password" (in place of the invite), on the same timing.
    expect(outboxFor({ to: 'pat@example.com', template: 'set-password' }).length).toBe(1);
    expect(outboxFor({ to: 'pat@example.com', template: 'team-invite' })).toEqual([]);
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

  // D-143: what the buyer and their teammates can open, around a failed second payment.
  async function twoPayView(email = 'pat@example.com') {
    await withCourse();
    const [owner] = await (await db()).select().from(users).where(eq(users.email, email));
    const cookie = await app.signInAs(owner!.id);
    const course = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } });
    const lib = (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json();
    return {
      course: course.statusCode,
      coursePaused: course.statusCode === 403 && course.json().paused === true,
      skills: Object.fromEntries(lib.skills.map((sk: { id: string; state: string }) => [sk.id, sk.state])),
      libraryPaused: lib.paused,
    };
  }
  const OPEN = { course: 200, coursePaused: false, skills: { 'team-pnl-review': 'open', 'offer-strategy': 'open' }, libraryPaused: false };
  const PAUSED = { course: 403, coursePaused: true, skills: { 'team-pnl-review': 'locked', 'offer-strategy': 'locked' }, libraryPaused: true };

  it('6b: a failed second payment pauses the course and its skills, and paying it reopens them by itself (D-143)', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW_MS - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } },
    ]);
    // Dec 14, the second payment's day: the course has been open since Nov 16.
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    expect(await twoPayView()).toEqual(OPEN);

    await deliver('invoice.payment_failed', invoice('sub_two', 0, NOW_MS + 61 * DAY, { order_id: order.id }));
    expect((await (await db()).select().from(plans))[0]!.status).toBe('past_due');
    expect(await twoPayView()).toEqual(PAUSED);
    // The download route agrees with the list.
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    expect((await app.inject({ method: 'GET', url: '/api/skills/offer-strategy/download/claude', headers: { cookie } })).statusCode).toBe(403);

    // Stripe's retry goes through: the plan is active again, and so is everything it opens.
    process.env.FIXED_NOW = '2026-12-17T09:00:00-06:00';
    await deliver('invoice.paid', invoice('sub_two', 375000, NOW_MS + 61 * DAY, { order_id: order.id }));
    expect((await (await db()).select().from(plans))[0]!.status).toBe('active');
    expect(await twoPayView()).toEqual(OPEN);
  });

  it('6c: when Stripe gives up on the second payment, the course stays paused and Connor is told (D-143)', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW_MS - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } },
    ]);
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    await deliver('invoice.payment_failed', invoice('sub_two', 0, NOW_MS + 61 * DAY, { order_id: order.id }));
    const res = await deliver('customer.subscription.deleted', { id: 'sub_two', status: 'canceled', metadata: { order_id: order.id } });
    expect(res.statusCode).toBe(200);
    expect((await (await db()).select().from(plans))[0]!.status).toBe('past_due');
    expect(await twoPayView()).toEqual(PAUSED);
  });

  it('6d: only the two-pay AI Accelerator pauses: the AI Accelerator in full keeps its course while past due', async () => {
    const order = await buy('cohort-full', {}, { subscription: 'sub_full' });
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW_MS - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } },
    ]);
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    await deliver('invoice.payment_failed', invoice('sub_full', 0, NOW_MS + 61 * DAY, { order_id: order.id }));
    expect((await (await db()).select().from(plans))[0]!.status).toBe('past_due');
    expect(await twoPayView()).toEqual(OPEN);
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
    expect(states).toEqual({ 'offer-strategy': 'open', 'team-pnl-review': 'open' });
    // Insiders opens every set. A learner with no plan is still refused the file.
    await (await db()).insert(users).values({ id: 'u_none', email: 'none@example.com', name: 'None', kind: 'learner', role: 'Team Owner', tier: 'agent', status: 'active', joined: now });
    const locked = await app.inject({ method: 'GET', url: '/api/skills/offer-strategy/download/claude', headers: { cookie: await app.signInAs('u_none') } });
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
    expect(byId['listing-to-live']).toMatchObject({ state: 'open', files: ['grok'] });
    // A paid template opens with Insiders. A learner with no plan is still refused the file.
    await (await db()).insert(users).values({ id: 'u_none', email: 'none@example.com', name: 'None', kind: 'learner', role: 'Team Owner', tier: 'agent', status: 'active', joined: now });
    const locked = await app.inject({ method: 'GET', url: '/api/skills/listing-to-live/download/grok', headers: { cookie: await app.signInAs('u_none') } });
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
    const first = async () => {
      const s = (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().skills[0];
      return [s.state, s.opensAt];
    };
    // D-140: coming on Dec 14, not "not in your plan".
    expect(await first()).toEqual(['upcoming', AGENTS_SKILLS_FROM]);
    process.env.FIXED_NOW = '2026-12-14T08:00:00-06:00';
    expect(await first()).toEqual(['open', null]);
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
      offer: { pages: { offer: OFFER_PAGE, welcome: WELCOME_PAGE, sales: { '/pricing': PRICING_PAGE, '/team-build': PRICING_PAGE, '/teams': PRICING_PAGE, '/agents': PRICING_PAGE, '/free': PRICING_PAGE, '/about': PRICING_PAGE, '/insiders': PRICING_PAGE } }, config: CONFIG, stripe: stub.client, verify: stripeVerifier(), prices: createPriceCache(() => stub.client) },
    });
    const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'www.amplifiedimpact.io' } });
    for (const url of ['/offer', '/forum', '/offer?cart=library', '/offer/welcome?session_id=cs_test_session0001', '/agreement', '/pricing', '/pricing?ref=ig', '/team-build', '/team-build?src=ig', '/teams', '/agents', '/free', '/about', '/insiders']) {
      expect((await get(url)).statusCode, url).toBe(200);
    }
    for (const url of ['/offer/', '/Offer', '/offer.html', '/offer/welcome/x', '/forum/', '/FORUM', '/agreement/', '/pricing.html', '/pricing/x', '/Pricing', '/team-build.html', '/team-build/x', '/Team-Build', '/teams.html', '/teams/x', '/team', '/agents.html', '/agents/x', '/agent', '/free.html', '/about.html', '/About']) {
      const res = await get(url);
      expect([302, 404], url).toContain(res.statusCode);
      expect(res.body, url).not.toContain('data-offer');
      expect(res.body, url).not.toContain('data-seats');
    }
    // A sales page's trailing-slash spelling is the one other that reaches it: a redirect to it.
    for (const page of ['/pricing', '/team-build', '/teams', '/agents', '/free', '/about', '/insiders']) {
      const slash = await get(`${page}/`);
      expect([slash.statusCode, slash.headers.location], page).toEqual([302, page]);
    }
    // The welcome page's calendar files are real `text/calendar` responses on www; a lookalike is not.
    // They are the cohort's sessions as the database holds them (D-173), so the curriculum goes in first.
    await applyCurriculum(await db());
    const seeded = curriculumSeed();
    const instructor = new Map(seeded.modules.map((m) => [m.id, m.instructor]));
    for (const [url, body] of [
      ['/calendar/builds.ics', buildsIcs(seeded.sessions, (s) => instructor.get(s.moduleId!))],
      ['/calendar/office-hours.ics', officeHoursIcs(seeded.sessions)],
    ] as const) {
      const res = await get(url);
      expect([res.statusCode, res.headers['content-type'], res.body], url).toEqual([200, 'text/calendar; charset=utf-8', body]);
    }
    expect((await get('/calendar/other.ics')).statusCode).toBe(404);
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

  it('lets an Amplified Agent Plan member cancel anytime: never the locked configuration, trial or paid', async () => {
    stub.subs.set('sub_ap', { id: 'sub_ap', status: 'trialing', customer: 'cus_1', trialEnd: 1799042400 * 1000, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    await buy('agent-monthly', {}, { subscription: 'sub_ap', payment_status: 'no_payment_required', amount_total: 0 });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'agent_plan', minimumUntil: null });
    const res = await app.inject({ method: 'GET', url: '/api/billing/portal', headers: { cookie: await ownerCookie() } });
    expect(res.statusCode).toBe(303);
    expect(stub.portals.at(-1)?.configuration).toBeUndefined();
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

// --- every offer, end to end (D-106) ----------------------------------------------------------------

/** What one cart must deliver, from the purchase to its end. */
interface OfferCase {
  cart: CartId;
  /** What the completed session says was paid today: the Agent Plan sells a trial with nothing due. */
  paymentStatus: 'paid' | 'no_payment_required';
  plan: {
    kind: PlanKind;
    option: string;
    seats: number;
    status: 'active' | 'trialing';
    cohortId: string | null;
    startsAt: number;
    paidThrough: number | null;
    liveUntil: number | null;
    minimumUntil: number | null;
  };
  tier: 'team' | 'agent';
  /** The `trial_end` the webhook pins, in seconds, or null when it pins nothing. */
  pin: number | null;
  tags: string[];
  /** When the owner first opens a skill of each set (a skill released before the purchase): null for never. */
  opens: { owner_ops: number | null; agent: number | null };
  /** The plan's first charge after the checkout, when nothing was charged at it: the Agent Plan's Jan 4 invoice. */
  firstCharge?: { amount: number; periodEnd: number };
}

const JAN4 = AGENT_PLAN_FIRST_CHARGE_AT;
const after = (t: number) => t + 9 * 3_600_000;
const OFFER_CASES: OfferCase[] = [
  {
    cart: 'cohort-full',
    paymentStatus: 'paid',
    // D-153: bought tonight, the login works at once; its skills and course open at the first live build.
    plan: { kind: 'cohort', option: 'full', seats: 2, status: 'active', cohortId: 'dec26', startsAt: COHORT_ONE.firstBuildAt, paidThrough: INSIDERS_FIRST_CHARGE_AT, liveUntil: INSIDERS_FIRST_CHARGE_AT, minimumUntil: null },
    tier: 'team',
    pin: 1809406800,
    tags: ['offer-buyer', 'plan-cohort', 'pay-full', 'ai-buyer-accelerator'],
    opens: { owner_ops: COHORT_ONE.firstBuildAt, agent: COHORT_ONE.firstBuildAt },
  },
  {
    cart: 'cohort-two-pay',
    paymentStatus: 'paid',
    // D-153: bought tonight, the login works at once; its skills and course open at the first live build.
    plan: { kind: 'cohort', option: 'two_pay', seats: 2, status: 'active', cohortId: 'dec26', startsAt: COHORT_ONE.firstBuildAt, paidThrough: INSIDERS_FIRST_CHARGE_AT, liveUntil: INSIDERS_FIRST_CHARGE_AT, minimumUntil: null },
    tier: 'team',
    pin: null,
    tags: ['offer-buyer', 'plan-cohort', 'pay-two', 'ai-buyer-accelerator'],
    opens: { owner_ops: COHORT_ONE.firstBuildAt, agent: COHORT_ONE.firstBuildAt },
  },
  {
    cart: 'insiders-year',
    paymentStatus: 'paid',
    plan: { kind: 'membership', option: 'year_upfront', seats: 2, status: 'active', cohortId: null, startsAt: NOW_MS, paidThrough: NOW_MS + 365 * DAY, liveUntil: null, minimumUntil: null },
    tier: 'team',
    pin: null,
    tags: ['offer-buyer', 'plan-membership', 'pay-year', 'ai-buyer-insiders'],
    opens: { owner_ops: NOW_MS, agent: NOW_MS },
  },
  {
    cart: 'insiders-monthly',
    paymentStatus: 'paid',
    plan: { kind: 'membership', option: 'monthly', seats: 2, status: 'active', cohortId: null, startsAt: NOW_MS, paidThrough: addMonths(NOW_MS, 1), liveUntil: null, minimumUntil: addMonths(NOW_MS, 3) },
    tier: 'team',
    pin: null,
    tags: ['offer-buyer', 'plan-membership', 'pay-monthly', 'ai-buyer-insiders'],
    opens: { owner_ops: NOW_MS, agent: NOW_MS },
  },
  {
    cart: 'agents-upto15',
    paymentStatus: 'paid',
    plan: { kind: 'agents', option: 'upto15', seats: 16, status: 'active', cohortId: null, startsAt: AGENTS_SKILLS_FROM, paidThrough: AGENTS_FIRST_CHARGE_AT, liveUntil: null, minimumUntil: null },
    tier: 'team',
    pin: 1806814800,
    tags: ['offer-buyer', 'plan-agents', 'ai-buyer-team-plan'],
    opens: { owner_ops: null, agent: AGENTS_SKILLS_FROM },
  },
  {
    cart: 'agents-16to40',
    paymentStatus: 'paid',
    plan: { kind: 'agents', option: '16to40', seats: 41, status: 'active', cohortId: null, startsAt: AGENTS_SKILLS_FROM, paidThrough: AGENTS_FIRST_CHARGE_AT, liveUntil: null, minimumUntil: null },
    tier: 'team',
    pin: 1806814800,
    tags: ['offer-buyer', 'plan-agents', 'ai-buyer-team-plan'],
    opens: { owner_ops: null, agent: AGENTS_SKILLS_FROM },
  },
  {
    cart: 'agent-monthly',
    paymentStatus: 'no_payment_required',
    plan: { kind: 'agent_plan', option: 'monthly', seats: 1, status: 'trialing', cohortId: null, startsAt: JAN4, paidThrough: null, liveUntil: null, minimumUntil: null },
    tier: 'agent',
    pin: 1799042400,
    tags: ['offer-buyer', 'plan-agent-plan', 'pay-monthly', 'ai-buyer-agent-plan'],
    opens: { owner_ops: null, agent: JAN4 },
    firstCharge: { amount: 7900, periodEnd: addMonths(JAN4, 1) },
  },
  {
    cart: 'agent-yearly',
    paymentStatus: 'no_payment_required',
    plan: { kind: 'agent_plan', option: 'yearly', seats: 1, status: 'trialing', cohortId: null, startsAt: JAN4, paidThrough: null, liveUntil: null, minimumUntil: null },
    tier: 'agent',
    pin: 1799042400,
    tags: ['offer-buyer', 'plan-agent-plan', 'pay-yearly', 'ai-buyer-agent-plan'],
    opens: { owner_ops: null, agent: JAN4 },
    firstCharge: { amount: 79000, periodEnd: addMonths(JAN4, 12) },
  },
];

describe('every offer, end to end (D-106)', () => {
  beforeEach(async () => void (await fresh()));

  it('covers every cart the catalog sells', () => {
    expect(OFFER_CASES.map((c) => c.cart)).toEqual([...CART_IDS]);
  });

  const subOf = (c: OfferCase) => `sub_${c.cart.replace(/-/g, '_')}`;
  /** The subscription the plan is paid by: two payments' Insiders is its own (`ensureInsiders`). */
  const planSubOf = (c: OfferCase) => (c.cart === 'cohort-two-pay' ? 'sub_membership_1' : subOf(c));

  /** One purchase through the cart's link, with the subscription a Payment Link opens. */
  async function purchase(c: OfferCase, email = 'pat@example.com') {
    const sub = subOf(c);
    const trialing = c.pin !== null;
    stub.subs.set(sub, { id: sub, status: trialing ? 'trialing' : 'active', customer: 'cus_1', trialEnd: trialing ? c.pin! * 1000 + 3 * DAY : null, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    stub.intents.set(`pi_${sub}`, sub);
    return buy(c.cart, { email }, { subscription: sub, payment_status: c.paymentStatus, amount_total: c.paymentStatus === 'paid' ? 100 : 0 });
  }

  /** The Agent Plan's Jan 4 invoice, paid that morning. */
  async function payFirstCharge(c: OfferCase, orderId: string) {
    process.env.FIXED_NOW = new Date(JAN4 + 3_600_000).toISOString();
    const res = await deliver('invoice.paid', invoice(subOf(c), c.firstCharge!.amount, c.firstCharge!.periodEnd, { order_id: orderId, ai_plan: 'agent_plan', ai_option: c.plan.option }));
    expect(res.statusCode).toBe(200);
  }

  async function seedSkills() {
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW_MS - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } },
      { id: 'perfect-week', title: 'Perfect Week', sets: 'both', releasedAt: NOW_MS - DAY, files: { claude: 'perfect-week.zip' } },
    ]);
  }

  async function skillStates(email = 'pat@example.com'): Promise<Record<string, string>> {
    const [owner] = await (await db()).select().from(users).where(eq(users.email, email));
    const cookie = await app.signInAs(owner!.id);
    const res = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    return Object.fromEntries(res.json().skills.map((s: { id: string; state: string }) => [s.id, s.state]));
  }

  const expectOpen = (states: Record<string, string>, c: OfferCase, at: number) => {
    // Open from its day; before it, `upcoming` (D-140): the plan was paid for and opens it later.
    const open = (when: number | null) => (when === null ? 'locked' : at >= when ? 'open' : 'upcoming');
    expect(states, `${c.cart} at ${new Date(at).toISOString()}`).toEqual({
      'team-pnl-review': open(c.opens.owner_ops),
      'offer-strategy': open(c.opens.agent),
      'perfect-week': open([c.opens.owner_ops, c.opens.agent].filter((x): x is number => x !== null).sort((a, b) => a - b)[0] ?? null),
    });
  };

  for (const c of OFFER_CASES) {
    describe(`${c.cart} (${PLAN_NAMES[c.plan.kind]})`, () => {
      it('makes the account, the plan and a held invite, confirms the plan on the welcome page, and opens its skills on their day', async () => {
        const order = await purchase(c);
        expect(order).toMatchObject({ plan: c.plan.kind, option: c.plan.option, origin: 'payment_link', status: c.paymentStatus === 'paid' ? 'paid' : 'trialing', email: 'pat@example.com', agreementVersion: AGREEMENT_VERSION });
        expect(buyerTags(order)).toEqual(c.tags);

        // The account and its owner, matched by email.
        const accts = await (await db()).select().from(accounts);
        expect(accts).toHaveLength(1);
        expect(accts[0]).toMatchObject({ ownerEmail: 'pat@example.com', inviteSentAt: null, stripeCustomerId: 'cus_1' });
        const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
        expect(owner).toMatchObject({ role: 'Team Owner', tier: c.tier, status: 'invited', teamId: accts[0]!.teamId, cohortId: 'dec26' });
        // The skill library links the Team Hub exactly when the portal shows it: Team tier (D-119).
        const library = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie: await app.signInAs(owner!.id) } });
        expect(library.json().teamHub, c.cart).toBe(c.tier === 'team');
        const [team] = await (await db()).select().from(teams);
        expect(team).toMatchObject({ ownerId: owner!.id, seats: c.plan.seats });

        // The plan.
        const [plan] = await (await db()).select().from(plans);
        expect(plan).toMatchObject({ ...c.plan, accountId: accts[0]!.id, orderId: order.id, stripeSubscriptionId: planSubOf(c) });

        // The subscription: tagged with the order, and pinned when the cart has a fixed first charge.
        const own = stub.updates.filter((u) => u.id === subOf(c));
        expect(own.at(-1)?.params.metadata).toMatchObject({ order_id: order.id, ai_plan: c.plan.kind, ai_option: c.plan.option });
        expect(own.at(-1)?.params.trial_end).toBe(c.pin ?? undefined);

        // The invite waits for Monday morning, then goes once.
        expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
        const log = { info: () => {}, warn: () => {}, error: () => {} };
        expect(await sendHeldInvites({ log, now: CONFIG.invitesFrom, invitesFrom: CONFIG.invitesFrom })).toBe(1);
        expect(outboxFor({ to: 'pat@example.com', template: 'set-password' })).toHaveLength(1);

        // The welcome page confirms the plan by its session.
        const welcome = await app.inject({ method: 'GET', url: `/offer/welcome?session_id=${order.stripeSessionId}` });
        expect(welcome.body).toContain('data-state="confirmed"');
        expect(welcome.body).toContain(`<h1>${PLAN_NAMES[c.plan.kind]}</h1>`);
        expect(welcome.body).toContain(
          c.paymentStatus === 'paid'
            ? 'Your payment is in, and Stripe has emailed your receipt.'
            : 'Your card is saved. Nothing is charged until Monday, January 4, 2027, when your agent skills open.',
        );
        const status = await app.inject({ method: 'GET', url: `/api/offer/order-status?session_id=${order.stripeSessionId}` });
        expect(status.json()).toEqual({ status: order.status, plan: c.plan.kind, name: PLAN_NAMES[c.plan.kind] });

        // The skills, by date: today, the Team Plan's Dec 14, and Jan 4.
        await seedSkills();
        expectOpen(await skillStates(), c, NOW_MS);
        process.env.FIXED_NOW = new Date(after(AGENTS_SKILLS_FROM)).toISOString();
        expectOpen(await skillStates(), c, after(AGENTS_SKILLS_FROM));
        if (c.firstCharge) {
          // Jan 4, before its invoice is paid: nothing is paid for, so nothing opens.
          process.env.FIXED_NOW = new Date(JAN4 + 60_000).toISOString();
          expect(Object.values(await skillStates())).toEqual(['locked', 'locked', 'locked']);
          await payFirstCharge(c, order.id);
          const [paid] = await (await db()).select().from(plans);
          expect(paid).toMatchObject({ status: 'active', paidThrough: c.firstCharge.periodEnd, startsAt: JAN4 });
          expect(await one()).toMatchObject({ status: 'paid', paymentsMade: 1, paidAt: JAN4 + 3_600_000, ghlSyncedAt: null });
        }
        process.env.FIXED_NOW = new Date(after(JAN4)).toISOString();
        expectOpen(await skillStates(), c, after(JAN4));
      });

      it('signs the buyer in with a password: the welcome page’s Set Your Password, then the emailed link (D-132)', async () => {
        const order = await purchase(c);
        const welcomeHref = async () =>
          /<a class="pw" href="([^"]*)"/.exec((await app.inject({ method: 'GET', url: `/offer/welcome?session_id=${order.stripeSessionId}` })).body)![1];

        // During the hold the account can't be used yet, so the welcome page offers nothing.
        expect(await welcomeHref()).toBe('');

        // Monday morning: the held email goes out, and the welcome page offers a password for this new account.
        const monday = CONFIG.invitesFrom + 3_600_000;
        process.env.FIXED_NOW = new Date(monday).toISOString();
        const log = { info: () => {}, warn: () => {}, error: () => {} };
        expect(await sendHeldInvites({ log, now: CONFIG.invitesFrom, invitesFrom: CONFIG.invitesFrom })).toBe(1);
        expect(await welcomeHref()).toBe(`https://learn.amplifiedimpact.io/set-password?checkout=${order.stripeSessionId}`);

        // The emailed link sets the password and signs the buyer in.
        await settleEmails();
        const [mail] = outboxFor({ to: 'pat@example.com', template: 'set-password' });
        const token = /\/set-password\?token=([A-Za-z0-9_-]+)/.exec(mail!.html ?? '')![1]!;
        const set = await app.inject({ method: 'POST', url: '/api/auth/password/set', payload: { token, password: 'pats own password' } });
        expect(set.statusCode, set.body).toBe(200);
        const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: sessionCookie(set.headers['set-cookie']) } });
        expect(me.statusCode).toBe(200);
        const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
        expect(owner).toMatchObject({ status: 'active', tier: c.tier });

        // From then on: email and password at /login, and the welcome page's button is gone.
        const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'pat@example.com', password: 'pats own password' } });
        expect(login.statusCode, login.body).toBe(200);
        expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: sessionCookie(login.headers['set-cookie']) } })).statusCode).toBe(200);
        expect(await welcomeHref()).toBe('');
        const wrong = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'pat@example.com', password: 'not the password' } });
        expect(wrong.statusCode).toBe(400);
      });

      it('keeps Forgot Password and the email sign-in link working for the buyer, before and after a password (D-132)', async () => {
        await purchase(c);
        process.env.FIXED_NOW = new Date(CONFIG.invitesFrom + 3_600_000).toISOString();
        const log = { info: () => {}, warn: () => {}, error: () => {} };
        await sendHeldInvites({ log, now: CONFIG.invitesFrom, invitesFrom: CONFIG.invitesFrom });
        const post = (url: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url, payload });
        const tokenIn = async (template: 'set-password' | 'reset-password' | 'sign-in', path: string) => {
          await settleEmails();
          const mail = outboxFor({ to: 'pat@example.com', template }).at(-1);
          return new RegExp(`/${path}\\?token=([A-Za-z0-9_-]+)`).exec(mail?.html ?? '')?.[1];
        };

        // Forgot Password before any password is set: the same answer as for an address with no account,
        // and a fresh set-password link in the buyer's inbox.
        const forgot = await post('/api/auth/password/forgot', { email: 'pat@example.com' });
        const nobody = await post('/api/auth/password/forgot', { email: 'nobody@example.com' });
        expect([forgot.statusCode, forgot.body]).toEqual([nobody.statusCode, nobody.body]);
        // The route answers first and sends after, so the answer can't time an account.
        await settleEmails();
        expect(outboxFor({ to: 'pat@example.com', template: 'set-password' })).toHaveLength(2);
        expect(outboxFor({ to: 'nobody@example.com' })).toEqual([]);
        expect((await post('/api/auth/password/set', { token: (await tokenIn('set-password', 'set-password'))!, password: 'pats first password' })).statusCode).toBe(200);

        // With a password: Forgot Password sends a reset link, which replaces it.
        expect((await post('/api/auth/password/forgot', { email: 'pat@example.com' })).statusCode).toBe(200);
        const reset = await tokenIn('reset-password', 'set-password');
        expect(reset).toBeTruthy();
        expect((await post('/api/auth/password/set', { token: reset!, password: 'pats newer password' })).statusCode).toBe(200);
        expect((await post('/api/auth/login', { email: 'pat@example.com', password: 'pats newer password' })).statusCode).toBe(200);
        expect((await post('/api/auth/login', { email: 'pat@example.com', password: 'pats first password' })).statusCode).toBe(400);

        // The email sign-in link still works, exactly as before passwords.
        expect((await post('/api/auth/request', { email: 'pat@example.com' })).statusCode).toBe(200);
        const link = await tokenIn('sign-in', 'sign-in');
        expect(link).toBeTruthy();
        const verified = await post('/api/auth/verify', { token: link! });
        expect(verified.statusCode, verified.body).toBe(200);
        expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: sessionCookie(verified.headers['set-cookie']) } })).statusCode).toBe(200);
      });

      it('reaches GoHighLevel with its alias, its fields and a Purchased opportunity, then the buyer’s first sign-in (D-134)', async () => {
        await purchase(c);
        const crm = fakeCrm();
        const quiet = { info: () => {}, warn: () => {}, error: () => {} };
        const ghl: GhlConfig = {
          token: 'pit-test-token-123',
          locationId: 'loc-test',
          fields: { offer: 'f-offer', cohort: 'f-cohort', amount: 'f-amount', purchaseDate: 'f-date', lmsLogin: 'f-login' },
          pipeline: { id: 'p1', stages: { lead: 's-lead', purchased: 's-buy', refunded: 's-gone', canceled: 's-gone' } },
        };
        const tick = await runGhlTick({ db: await db(), config: ghl, fetch: crm.fetch, log: quiet });
        expect(tick.buyers).toMatchObject({ claimed: 1, synced: 1, failed: 0 });
        // The order's tags, its plan's alias among them, exactly as buyerTags says.
        expect(crm.tagsOf('pat@example.com')).toEqual(buyerTags(await one()));
        const alias: Record<string, string> = { cohort: 'ai-buyer-accelerator', membership: 'ai-buyer-insiders', agents: 'ai-buyer-team-plan', agent_plan: 'ai-buyer-agent-plan' };
        expect(crm.tagsOf('pat@example.com')).toContain(alias[c.plan.kind]);
        // The fields: the plan's name, the cohort for the Accelerator only, and what was paid and when, if anything was.
        const paid = c.paymentStatus === 'paid';
        expect(crm.fieldsOf('pat@example.com')).toEqual({
          'f-offer': PLAN_NAMES[c.plan.kind],
          ...(c.plan.kind === 'cohort' ? { 'f-cohort': 'dec26' } : {}),
          ...(paid ? { 'f-amount': 1, 'f-date': '2026-11-14' } : {}),
        });
        expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineStageId: 's-buy', status: 'won', name: PLAN_NAMES[c.plan.kind], ...(paid ? { monetaryValue: 1 } : {}) });
        expect(await one()).toMatchObject({ ghlError: null, ghlContactId: 'c-1' });

        // The buyer signs in: the next tick adds lms-logged-in and LMS Login, and moves nothing in the pipeline.
        const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
        await app.signInAs(owner!.id);
        const next = await runGhlTick({ db: await db(), config: ghl, fetch: crm.fetch, log: quiet });
        expect(next).toMatchObject({ queued: 1, logins: { claimed: 1, synced: 1 } });
        expect(crm.tagsOf('pat@example.com')).toContain('lms-logged-in');
        expect(crm.fieldsOf('pat@example.com')['f-login']).toBe('signed-in');
        expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineStageId: 's-buy' });
      });

      it('a failed payment makes the plan past_due and tags payment-failed', async () => {
        const order = await purchase(c);
        if (c.firstCharge) process.env.FIXED_NOW = new Date(JAN4 + 3_600_000).toISOString();
        const res = await deliver('invoice.payment_failed', invoice(subOf(c), 0, NOW_MS + 31 * DAY, { order_id: order.id }));
        expect(res.statusCode).toBe(200);
        const [plan] = await (await db()).select().from(plans);
        expect(plan!.status).toBe('past_due');
        const failed = await one();
        expect(failed.paymentFailedAt).not.toBeNull();
        expect(buyerTags(failed)).toContain('payment-failed');
        if (c.firstCharge) {
          // The Agent Plan's first charge failed: nothing was ever paid, so nothing opens.
          await seedSkills();
          process.env.FIXED_NOW = new Date(after(JAN4)).toISOString();
          expect(Object.values(await skillStates())).toEqual(['locked', 'locked', 'locked']);
        }
      });

      it('cancel and keep: paid_through stays, live sessions end, and the buyer is tagged membership-ended', async () => {
        const order = await purchase(c);
        let cancelAt = NOW_MS;
        if (c.firstCharge) {
          await payFirstCharge(c, order.id);
          // Cancelled in the portal at period end: Stripe ends the subscription when the paid period does.
          await deliver('customer.subscription.updated', { id: subOf(c), object: 'subscription', status: 'active', cancel_at_period_end: true, metadata: { order_id: order.id } });
          expect((await (await db()).select().from(plans))[0]!.status).toBe('active');
          cancelAt = c.firstCharge.periodEnd;
          process.env.FIXED_NOW = new Date(cancelAt).toISOString();
        }
        const [before] = await (await db()).select().from(plans);
        const res = await deliver('customer.subscription.deleted', { id: planSubOf(c), object: 'subscription', status: 'canceled', metadata: { order_id: order.id } });
        expect(res.statusCode).toBe(200);
        const [plan] = await (await db()).select().from(plans);
        const end = before!.paidThrough ?? cancelAt;
        expect(plan).toMatchObject({ status: 'canceled', paidThrough: before!.paidThrough, liveUntil: before!.liveUntil === null ? end : Math.min(before!.liveUntil, Math.max(end, cancelAt)) });
        expect((await one()).membershipEndedAt).toBe(cancelAt);
        expect(buyerTags(await one())).toEqual(expect.arrayContaining(['membership-ended', 'ai-canceled']));

        // What was released while it was paid stays open; a skill released after it does not.
        await seedSkills();
        await (await db()).insert(skills).values({ id: 'later-skill', title: 'Later', sets: 'both', releasedAt: before!.paidThrough! + DAY, files: { claude: 'later.zip' } });
        const at = Math.max(after(JAN4), before!.paidThrough! + 2 * DAY);
        process.env.FIXED_NOW = new Date(at).toISOString();
        const states = await skillStates();
        expect(states['later-skill']).toBe('locked');
        delete states['later-skill'];
        expectOpen(states, c, at);
      });

      it('a full refund ends the plan and its access, and stops later charges', async () => {
        const order = await purchase(c);
        let refundAt = NOW_MS;
        if (c.firstCharge) {
          await payFirstCharge(c, order.id);
          refundAt = JAN4 + DAY;
          process.env.FIXED_NOW = new Date(refundAt).toISOString();
        }
        const res = await deliver('charge.refunded', { id: `ch_${c.cart}`, object: 'charge', refunded: true, payment_intent: `pi_${subOf(c)}` });
        expect(res.statusCode).toBe(200);
        const [plan] = await (await db()).select().from(plans);
        expect(plan).toMatchObject({ status: 'ended', liveUntil: refundAt });
        expect(await one()).toMatchObject({ status: 'refunded', refundedAt: refundAt });
        expect(buyerTags(await one())).toEqual(expect.arrayContaining(['refunded', 'ai-refunded']));
        expect(stub.cancels.sort()).toEqual([...new Set([subOf(c), planSubOf(c)])].sort());
        await seedSkills();
        process.env.FIXED_NOW = new Date(after(JAN4) + DAY).toISOString();
        expect(Object.values(await skillStates())).toEqual(['locked', 'locked', 'locked']);
      });
    });
  }

  it('a second purchase, of any offer, lands on the same account, whatever the email\'s case', async () => {
    const order = ['agent-monthly', 'insiders-year', 'cohort-full', 'cohort-two-pay', 'insiders-monthly', 'agents-upto15', 'agents-16to40', 'agent-yearly'] as const;
    for (const [i, cart] of order.entries()) {
      const c = OFFER_CASES.find((x) => x.cart === cart)!;
      await purchase(c, i % 2 ? 'Pat@Example.com' : 'pat@example.com');
      const [owner] = await (await db()).select().from(users);
      // The Agent Plan alone is Agent tier; any Team tier plan raises it, and nothing lowers it again.
      expect(owner!.tier, cart).toBe(i === 0 ? 'agent' : 'team');
    }
    expect(await (await db()).select().from(accounts)).toHaveLength(1);
    expect(await (await db()).select().from(users)).toHaveLength(1);
    const allTeams = await (await db()).select().from(teams);
    expect(allTeams).toHaveLength(1);
    expect(allTeams[0]!.seats).toBe(41);
    const held = await (await db()).select().from(plans);
    expect(held.map((p) => `${p.kind}/${p.option}`).sort()).toEqual(OFFER_CASES.map((c) => `${c.plan.kind}/${c.plan.option}`).sort());
    expect(new Set(held.map((p) => p.accountId)).size).toBe(1);
    // Insiders opens every set today, so the agent skill is open with it. The Agent Plan adds
    // nothing until its Jan 4 charge is paid, and the Accelerator's own start is still the first build.
    await seedSkills();
    expect(await skillStates()).toEqual({ 'team-pnl-review': 'open', 'offer-strategy': 'open', 'perfect-week': 'open' });
  });

  it('after INVITES_FROM, every offer\'s owner invite goes at once', async () => {
    process.env.FIXED_NOW = '2026-11-17T10:00:00-06:00';
    for (const [i, c] of OFFER_CASES.entries()) await purchase(c, `buyer${i}@example.com`);
    for (const [i] of OFFER_CASES.entries()) expect(outboxFor({ to: `buyer${i}@example.com`, template: 'set-password' }), OFFER_CASES[i]!.cart).toHaveLength(1);
    expect((await (await db()).select().from(accounts)).every((a) => a.inviteSentAt === Date.parse('2026-11-17T10:00:00-06:00'))).toBe(true);
  });
});

describe('the AI Accelerator rolls into Amplified Insiders on May 4, 2027 (D-104, D-106)', () => {
  beforeEach(async () => void (await fresh()));
  const MAY4 = INSIDERS_FIRST_CHARGE_AT;

  it('paid in full: the first $197 on May 4 carries the plan, both sets and its live sessions a month on', async () => {
    stub.subs.set('sub_full', { id: 'sub_full', status: 'trialing', customer: 'cus_1', trialEnd: MAY4, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const order = await buy('cohort-full', {}, { subscription: 'sub_full' });
    process.env.FIXED_NOW = '2027-05-04T09:00:00-05:00';
    await deliver('invoice.paid', invoice('sub_full', 19700, addMonths(MAY4, 1), { order_id: order.id, ai_plan: 'cohort', ai_option: 'full' }));
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'cohort', status: 'active', paidThrough: addMonths(MAY4, 1), liveUntil: addMonths(MAY4, 1) });
    expect(stub.creates).toEqual([]);
  });

  it('two payments: the separate Insiders subscription\'s first $197 carries the plan, and never counts as an installment', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    expect(stub.creates[0]!.params.trial_end).toBe(MAY4 / 1000);
    process.env.FIXED_NOW = '2027-05-04T09:00:00-05:00';
    await deliver('invoice.paid', invoice('sub_membership_1', 19700, addMonths(MAY4, 1), { order_id: order.id, ai_plan: 'membership', ai_option: 'monthly' }));
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'cohort', status: 'active', paidThrough: addMonths(MAY4, 1), liveUntil: addMonths(MAY4, 1), stripeSubscriptionId: 'sub_membership_1' });
    expect((await one()).paymentsMade).toBe(0);
  });

  it('cancelling Insiders before May 4 keeps the AI Accelerator: its skills and builds to May 4', async () => {
    const order = await buy('cohort-two-pay', {}, { subscription: 'sub_two' });
    await deliver('customer.subscription.deleted', { id: 'sub_membership_1', object: 'subscription', status: 'canceled', metadata: { order_id: order.id } });
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'canceled', paidThrough: MAY4, liveUntil: MAY4 });
  });
});

describe('the Amplified Agent Plan, edges (D-106)', () => {
  beforeEach(async () => void (await fresh()));

  it('bought after Jan 4 and charged at checkout: no pin into the past, paid through one period, skills open at once', async () => {
    process.env.FIXED_NOW = '2027-01-10T10:00:00-06:00';
    const now = Date.parse('2027-01-10T10:00:00-06:00');
    stub.subs.set('sub_late', { id: 'sub_late', status: 'trialing', customer: 'cus_1', trialEnd: now + 7 * DAY, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const order = await buy('agent-monthly', {}, { subscription: 'sub_late', payment_status: 'paid' });
    expect(order.status).toBe('paid');
    expect(stub.updates.every((u) => u.params.trial_end === undefined)).toBe(true);
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'agent_plan', status: 'active', startsAt: now, paidThrough: addMonths(now, 1) });
  });

  it('an Agent Plan link that charged before Jan 4 is provisioned and logged for Connor, by ids only', async () => {
    const errors: { obj: Record<string, unknown>; msg: string }[] = [];
    const log = { info: () => {}, warn: () => {}, error: (obj: Record<string, unknown>, msg: string) => void errors.push({ obj, msg }) };
    const session = { ...linkSession('agent-yearly'), subscription: 'sub_paid_now', payment_status: 'paid' };
    const result = await handleStripeEvent(
      { id: 'evt_agent_paid', object: 'event', type: 'checkout.session.completed', data: { object: session } } as unknown as Stripe.Event,
      { stripe: stub.client, config: CONFIG, prices: createPriceCache(() => stub.client), log, now: () => NOW_MS, db: await db() },
    );
    expect(result).toBe('paid');
    expect(errors.map((e) => e.msg)).toEqual(['an Agent Plan checkout charged before Jan 4: its Payment Link has no trial. Connor follows up']);
    expect(JSON.stringify(errors)).not.toContain('pat@example.com');
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ status: 'active', startsAt: AGENT_PLAN_FIRST_CHARGE_AT, paidThrough: addMonths(NOW_MS, 12) });
  });

  it('a solo agent who already holds a Team Plan seat on someone else\'s team is recorded and paid, not provisioned', async () => {
    await buy('agents-upto15', { email: 'owner@example.com' }, { subscription: 'sub_team' });
    const [acct] = await (await db()).select().from(accounts);
    await (await db()).insert(users).values({ id: 'u_agent', email: 'agent@example.com', name: 'Agent', kind: 'learner', role: 'Sales Agent', tier: 'team', teamId: acct!.teamId, cohortId: 'dec26', status: 'active', joined: NOW_MS });
    const order = await buy('agent-monthly', { email: 'agent@example.com' }, { subscription: 'sub_solo', payment_status: 'no_payment_required' });
    expect(order.status).toBe('trialing');
    expect(await (await db()).select().from(accounts)).toHaveLength(1);
    expect((await (await db()).select().from(plans)).map((p) => p.kind)).toEqual(['agents']);
  });
});

describe('the Team Plan\'s owner adds agents from the Team Hub (D-081, D-106)', () => {
  beforeEach(async () => void (await fresh()));

  it('an invited Sales Agent opens the agent set from Dec 14 and never the owner set', async () => {
    await buy('agents-upto15', {}, { subscription: 'sub_team' });
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    const res = await app.inject({ method: 'POST', url: '/api/mutate/inviteMember', headers: { cookie }, payload: { email: 'agent@example.com', role: 'Sales Agent' } });
    expect(res.statusCode, res.body).toBe(200);
    const [agent] = await (await db()).select().from(users).where(eq(users.email, 'agent@example.com'));
    expect(agent).toMatchObject({ role: 'Sales Agent', teamId: owner!.teamId, status: 'invited' });
    await (await db()).insert(skills).values([
      { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW_MS - DAY, files: { claude: 'team-pnl-review.zip' } },
      { id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } },
    ]);
    const agentCookie = await app.signInAs(agent!.id);
    const states = async () =>
      Object.fromEntries((await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie: agentCookie } })).json().skills.map((s: { id: string; state: string }) => [s.id, s.state]));
    // Before Dec 14 the agent skill is coming (D-140); the owner set is never theirs.
    expect(await states()).toEqual({ 'team-pnl-review': 'locked', 'offer-strategy': 'upcoming' });
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    expect(await states()).toEqual({ 'team-pnl-review': 'locked', 'offer-strategy': 'open' });
  });

  // D-081, built in D-120: the owner adds agents up to the plan's seats, then the seat count stops it.
  it.each([
    ['agents-upto15', 15, 16],
    ['agents-16to40', 40, 41],
  ] as const)('%s: the owner adds the plan\'s %i Sales Agents from the Team Hub, and no more (D-120)', async (cart, agents, seats) => {
    await buy(cart, {}, { subscription: 'sub_team' });
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    const cookie = await app.signInAs(owner!.id);
    // A second apart: under FIXED_NOW each request's ids come from the clock (lib/clock.ts).
    const invite = (i: number) => {
      process.env.FIXED_NOW = new Date(NOW_MS + i * 1000).toISOString();
      return app.inject({ method: 'POST', url: '/api/mutate/inviteMember', headers: { cookie }, payload: { email: `agent${i}@example.com`, role: 'Sales Agent' } });
    };
    for (let i = 1; i <= agents; i += 1) expect((await invite(i)).statusCode, `agent ${i}`).toBe(200);
    expect((await (await db()).select().from(users)).filter((u) => u.role === 'Sales Agent')).toHaveLength(agents);
    const over = await invite(agents + 1);
    expect(over.body).toContain('All seats are assigned.');
    expect((await (await db()).select().from(users)).filter((u) => u.role === 'Sales Agent')).toHaveLength(agents);
    const [team] = await (await db()).select().from(teams);
    expect(team!.seats).toBe(seats);
  });
});

// The payment paths the per-offer block doesn't reach (the audit of Nov 12): a bank payment that
// fails or clears, a link session that expires, a cancel inside the 3-month minimum, an Agent Plan
// trial cancelled before Jan 4, and who the course is shut to (and stays open for) over HTTP.
describe('payment paths outside the per-offer block', () => {
  beforeEach(async () => void (await fresh()));

  const capture = () => {
    const errors: { obj: Record<string, unknown>; msg: string }[] = [];
    return { errors, log: { info: () => {}, warn: () => {}, error: (obj: Record<string, unknown>, msg: string) => void errors.push({ obj, msg }) } };
  };
  const event = async (type: string, object: Record<string, unknown>, log: ReturnType<typeof capture>['log']) =>
    handleStripeEvent({ id: `evt_${++eventN}`, object: 'event', type, data: { object } } as unknown as Stripe.Event, {
      stripe: stub.client,
      config: CONFIG,
      prices: createPriceCache(() => stub.client),
      log,
      now: () => Date.parse(process.env.FIXED_NOW ?? NOW),
      db: await db(),
    });
  const courseFor = async (email = 'pat@example.com') => {
    await withCourse();
    const [owner] = await (await db()).select().from(users).where(eq(users.email, email));
    const cookie = await app.signInAs(owner!.id);
    return app.inject({ method: 'GET', url: '/api/course', headers: { cookie } });
  };

  it('a bank payment that fails after checkout records the order as failed and provisions nothing', async () => {
    const session = { ...linkSession('insiders-year'), payment_status: 'unpaid', subscription: 'sub_bank' };
    const { log } = capture();
    expect(await event('checkout.session.completed', session, log)).toBe('awaiting-payment');
    expect(await (await db()).select().from(plans)).toEqual([]);
    expect(await event('checkout.session.async_payment_failed', session, log)).toBe('failed');
    const [order] = await (await db()).select().from(orders);
    expect(order).toMatchObject({ status: 'failed', paymentFailedAt: NOW_MS });
    expect(await (await db()).select().from(plans)).toEqual([]);
    expect(await (await db()).select().from(users)).toEqual([]);
    await settleEmails();
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
  });

  it('a bank payment that clears provisions the plan then, once', async () => {
    const session = { ...linkSession('insiders-year'), payment_status: 'unpaid', subscription: 'sub_bank' };
    const { log } = capture();
    expect(await event('checkout.session.completed', session, log)).toBe('awaiting-payment');
    expect(await event('checkout.session.async_payment_succeeded', { ...session, payment_status: 'paid' }, log)).toBe('paid');
    expect(await event('checkout.session.async_payment_succeeded', { ...session, payment_status: 'paid' }, log)).not.toBe('failed');
    const all = await (await db()).select().from(plans);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ kind: 'membership', status: 'active' });
  });

  it('an expired Payment Link session writes nothing: no order was made for it', async () => {
    const { log } = capture();
    expect(await event('checkout.session.expired', { ...linkSession('cohort-full'), status: 'expired', payment_status: 'unpaid' }, log)).toBe('ignored');
    expect(await (await db()).select().from(orders)).toEqual([]);
  });

  it('a cancel inside Amplified Insiders\' 3-month minimum is logged for Connor, by ids only, and the plan is cancelled', async () => {
    const order = await buy('insiders-monthly', {}, { subscription: 'sub_mo' });
    const [plan] = await (await db()).select().from(plans);
    expect(plan!.minimumUntil).not.toBeNull();
    const { errors, log } = capture();
    expect(await event('customer.subscription.deleted', { id: 'sub_mo', object: 'subscription', status: 'canceled', metadata: { order_id: order.id } }, log)).toBe('canceled');
    expect(errors.map((e) => e.msg)).toEqual(['a plan was cancelled inside its 3-month minimum: Connor follows up']);
    expect(errors[0]!.obj).toMatchObject({ plan: plan!.id, order: order.id, subscription: 'sub_mo', kind: 'membership' });
    expect(JSON.stringify(errors)).not.toContain('pat@example.com');
    expect((await (await db()).select().from(plans))[0]!.status).toBe('canceled');
  });

  it('a cancel after the minimum is not an alert', async () => {
    const order = await buy('insiders-monthly', {}, { subscription: 'sub_mo' });
    const [plan] = await (await db()).select().from(plans);
    process.env.FIXED_NOW = new Date(plan!.minimumUntil! + DAY).toISOString();
    const { errors, log } = capture();
    expect(await event('customer.subscription.deleted', { id: 'sub_mo', object: 'subscription', status: 'canceled', metadata: { order_id: order.id } }, log)).toBe('canceled');
    expect(errors).toEqual([]);
  });

  it('an Agent Plan trial cancelled before Jan 4 is never charged and never opens anything', async () => {
    stub.subs.set('sub_ap', { id: 'sub_ap', status: 'trialing', customer: 'cus_1', trialEnd: AGENT_PLAN_FIRST_CHARGE_AT + 3 * DAY, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    const order = await buy('agent-monthly', {}, { subscription: 'sub_ap', payment_status: 'no_payment_required' });
    expect(order.status).toBe('trialing');
    await (await db()).insert(skills).values([{ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', releasedAt: NOW_MS - DAY, files: { claude: 'offer-strategy.zip' } }]);
    const [owner] = await (await db()).select().from(users).where(eq(users.email, 'pat@example.com'));
    // Signed in afresh at each date: the clock jumps further than a session lasts.
    const state = async () => {
      const cookie = await app.signInAs(owner!.id);
      return (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().skills[0].state;
    };
    expect(await state()).toBe('upcoming');

    process.env.FIXED_NOW = '2026-12-20T09:00:00-06:00';
    const res = await deliver('customer.subscription.deleted', { id: 'sub_ap', object: 'subscription', status: 'canceled', metadata: { order_id: order.id } });
    expect(res.statusCode).toBe(200);
    const [plan] = await (await db()).select().from(plans);
    expect(plan).toMatchObject({ kind: 'agent_plan', status: 'canceled', paidThrough: null });
    expect((await one()).paymentsMade).toBe(0);
    // Not "coming" any more, and nothing opens on Jan 4 or after.
    expect(await state()).toBe('locked');
    process.env.FIXED_NOW = new Date(AGENT_PLAN_FIRST_CHARGE_AT + 10 * DAY).toISOString();
    expect(await state()).toBe('locked');
  });

  it.each(['agent-monthly', 'insiders-monthly', 'agents-16to40'] as const)('%s: the course stays shut over HTTP, "not in your plan", never "paused"', async (cart) => {
    const sub = `sub_${cart.replace(/-/g, '_')}`;
    stub.subs.set(sub, { id: sub, status: 'trialing', customer: 'cus_1', trialEnd: AGENT_PLAN_FIRST_CHARGE_AT + 3 * DAY, defaultPaymentMethod: 'pm_1', metadata: {}, cancelAt: null, currentPeriodEnd: null });
    await buy(cart, {}, { subscription: sub, ...(cart === 'agent-monthly' ? { payment_status: 'no_payment_required' } : {}) });
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    const res = await courseFor();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ open: false, error: 'The AI Accelerator isn’t in your plan.' });
  });

  it('cancel and keep: the AI Accelerator in full stays open after its roll-on is cancelled', async () => {
    const order = await buy('cohort-full', {}, { subscription: 'sub_full' });
    process.env.FIXED_NOW = '2026-12-14T09:00:00-06:00';
    expect((await courseFor()).statusCode).toBe(200);
    await deliver('customer.subscription.deleted', { id: 'sub_full', object: 'subscription', status: 'canceled', metadata: { order_id: order.id } });
    expect((await (await db()).select().from(plans))[0]!.status).toBe('canceled');
    expect((await courseFor()).statusCode).toBe(200);
  });
});

// ------------------------------------------------------------------------------------------------
// D-154: the combined 15-seat cap, kept on Stripe's two AI Accelerator Payment Links
// ------------------------------------------------------------------------------------------------

describe('the combined 15-seat cap on the Payment Links (D-154)', () => {
  const quiet = { info: () => {}, warn: () => {}, error: () => {} };
  /** Seats `from` to `from + n - 1`, alternating the two links, each with its own payment for a refund. */
  const sell = async (n: number, from = 1) => {
    for (let i = from; i < from + n; i += 1) {
      await buy(i % 2 ? 'cohort-full' : 'cohort-two-pay', { email: `seat${i}@example.com` }, { customer: `cus_s${i}`, payment_intent: `pi_seat${i}` });
    }
  };
  const refund = (i: number) => deliver('charge.refunded', { id: `ch_seat${i}`, object: 'charge', refunded: true, payment_intent: `pi_seat${i}` });
  const linkStates = () => Object.fromEntries([...stub.links].map(([id, l]) => [id, [l.active, l.metadata[SOLD_OUT_MARK] ?? null]]));
  const sold = async () => cohortSeatsSold(await db());

  beforeEach(async () => {
    resetSeatCapLogForTests();
    await fresh();
  });

  it('leaves both links on through 14 seats, then turns both off at the 15th, with the waitlist line and its mark', async () => {
    await sell(14);
    expect(stub.linkUpdates).toEqual([]);
    expect(linkStates()).toEqual({ plink_full: [true, null], plink_two: [true, null], plink_insiders: [true, null] });

    // The 15th, on the paid-in-full link: both links go off, not only the one that sold it.
    const last = linkSession('cohort-full', 'seat15@example.com');
    const done = await deliver('checkout.session.completed', { ...last, customer: 'cus_s15', payment_intent: 'pi_seat15' }, 'evt_seat15');
    expect(done.statusCode).toBe(200);
    expect(await sold()).toBe(15);
    expect(linkStates()).toEqual({ plink_full: [false, '1'], plink_two: [false, '1'], plink_insiders: [true, null] });
    expect(stub.linkUpdates.map((u) => [u.id, u.change])).toEqual([
      ['plink_full', { active: false, inactive_message: SOLD_OUT_MESSAGE, metadata: { ai_soldout: '1' } }],
      ['plink_two', { active: false, inactive_message: SOLD_OUT_MESSAGE, metadata: { ai_soldout: '1' } }],
    ]);
    expect(stub.linkUpdates.map((u) => u.key)).toEqual([expect.stringMatching(/^accel-cap-plink_full-off-15-\d+$/), expect.stringMatching(/^accel-cap-plink_two-off-15-\d+$/)]);
    expect(stub.links.get('plink_full')!.inactiveMessage).toBe('All 15 founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.');
    expect(SOLD_OUT_MESSAGE).not.toMatch(/\$|30|homes/);

    // Stripe redelivers the same event: recorded once, and nothing changes.
    const again = await deliver('checkout.session.completed', { ...last, customer: 'cus_s15', payment_intent: 'pi_seat15' }, 'evt_seat15');
    expect(again.json()).toEqual({ received: true, duplicate: true });
    expect(stub.linkUpdates).toHaveLength(2);

    // The page agrees: both carts sold out.
    const body = (await app.inject({ method: 'GET', url: '/api/offer' })).json();
    expect(body.carts.filter((c: { plan: string }) => c.plan === 'cohort').map((c: { state: string }) => c.state)).toEqual(['soldout', 'soldout']);
  });

  it('changes nothing the second time it runs at the same count', async () => {
    await sell(15);
    const before = stub.linkUpdates.length;
    const out = await reconcileAcceleratorSeats({ stripe: stub.client, config: CONFIG, now: NOW_MS, log: quiet });
    expect(out).toEqual({ sold: 15, links: [{ id: 'plink_full', action: 'already-off' }, { id: 'plink_two', action: 'already-off' }] });
    expect(stub.linkUpdates).toHaveLength(before);
    // Below the cap, with both on: nothing either.
    await refund(15);
    const updates = stub.linkUpdates.length;
    expect((await reconcileAcceleratorSeats({ stripe: stub.client, config: CONFIG, now: NOW_MS, log: quiet }))!.links.map((l) => l.action)).toEqual(['on', 'on']);
    expect(stub.linkUpdates).toHaveLength(updates);
  });

  it('counts both options together, never an ended plan, and never another plan', async () => {
    await sell(3);
    await buy('insiders-year', { email: 'insider@example.com' }, { customer: 'cus_ins' });
    expect(await sold()).toBe(3);
    await refund(2);
    expect(await sold()).toBe(2);
  });

  it('still provisions a 16th paid seat from a checkout that was already open, keeps both links off, and says so', async () => {
    await sell(15);
    const updates = stub.linkUpdates.length;
    const late = linkSession('cohort-two-pay', 'seat16@example.com');
    await deliver('checkout.session.completed', { ...late, payment_status: 'unpaid', customer: 'cus_s16' });
    const [order] = await (await db()).select().from(orders).where(eq(orders.stripeSessionId, late.id));
    await (await db()).update(orders).set({ status: 'paid' }).where(eq(orders.id, order!.id));
    const errors: string[] = [];
    const log = { info: () => {}, warn: () => {}, error: (_o: Record<string, unknown>, msg: string) => void errors.push(msg) };
    expect((await provisionOrder(order!.id, { log, now: NOW_MS, invitesFrom: CONFIG.invitesFrom })).ok).toBe(true);
    expect(errors).toEqual(['AI Accelerator seat 16 sold, past the 15 seats: Connor follows up']);
    expect(await sold()).toBe(16);
    await reconcileAcceleratorSeats({ stripe: stub.client, config: CONFIG, now: NOW_MS, log: quiet });
    expect(stub.linkUpdates).toHaveLength(updates);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, '1'] });
  });

  it('turns back on, after a refund from 15 to 14, only a link the cap turned off', async () => {
    await sell(14);
    // Connor turned the two-payment link off by hand: not the cap's to reopen.
    stub.links.set('plink_two', { ...stub.links.get('plink_two')!, active: false });
    await sell(1, 15);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, null] });

    expect((await refund(15)).statusCode).toBe(200);
    expect(await sold()).toBe(14);
    expect(linkStates()).toEqual({ plink_full: [true, null], plink_two: [false, null], plink_insiders: [true, null] });
    expect(stub.linkUpdates.at(-1)).toEqual({ id: 'plink_full', change: { active: true, metadata: { ai_soldout: '' } }, key: expect.stringMatching(/^accel-cap-plink_full-on-14-\d+$/) });
  });

  it('leaves them off after a refund once founding prices have closed, or while the offer is closed', async () => {
    await sell(15);
    process.env.FIXED_NOW = '2026-12-01T07:00:00Z'; // after Nov 30, 11:59 PM Mountain
    expect((await refund(15)).statusCode).toBe(200);
    expect(await sold()).toBe(14);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, '1'] });
    // `OFFER_OPEN` off, before the close: the same.
    const out = await reconcileAcceleratorSeats({ stripe: stub.client, config: { ...CONFIG, open: false }, now: NOW_MS, log: quiet });
    expect(out!.links.map((l) => l.action)).toEqual(['held-off', 'held-off']);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, '1'] });
  });

  it('turns the other link off when one fails, retries the failed one each tick, and logs a 403 once an hour', async () => {
    await sell(14);
    stub.linkForbidden.add('plink_two');
    await sell(1, 15);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [true, null] });

    resetSeatCapLogForTests();
    const errors: string[] = [];
    const log = { info: () => {}, warn: () => {}, error: (_o: Record<string, unknown>, msg: string) => void errors.push(msg) };
    const tick = (t: number) => reconcileAcceleratorSeats({ stripe: stub.client, config: CONFIG, now: t, log });
    expect((await tick(NOW_MS))!.links).toEqual([{ id: 'plink_full', action: 'already-off' }, { id: 'plink_two', action: 'failed' }]);
    await tick(NOW_MS + 60_000);
    expect(errors).toEqual(['seat cap: Stripe refused (403). Add Payment Links: Read and Write to the website-checkout restricted key; the next tick retries']);
    await tick(NOW_MS + 61 * 60_000);
    expect(errors).toHaveLength(2);

    // Connor adds the permission: the next tick turns it off.
    stub.linkForbidden.clear();
    await tick(NOW_MS + 62 * 60_000);
    expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, '1'] });
  });

  it('never touches a link that is not an AI Accelerator link, and does nothing without a key or link ids', async () => {
    await sell(15);
    const errors: string[] = [];
    const log = { info: () => {}, warn: () => {}, error: (_o: Record<string, unknown>, msg: string) => void errors.push(msg) };
    const out = await syncAcceleratorPaymentLinks({ sold: 15, stripe: stub.client, ids: ['plink_insiders'], mayReopen: true, now: NOW_MS, log });
    expect(out.links).toEqual([{ id: 'plink_insiders', action: 'skipped:not-accelerator' }]);
    expect(errors).toEqual(['seat cap: this Payment Link is not an AI Accelerator link; left alone']);
    expect(stub.links.get('plink_insiders')!.active).toBe(true);
    expect(stub.linkUpdates.some((u) => u.id === 'plink_insiders')).toBe(false);
    expect(await reconcileAcceleratorSeats({ stripe: null, config: CONFIG, now: NOW_MS, log: quiet })).toBeNull();
    expect(await reconcileAcceleratorSeats({ stripe: stub.client, config: { ...CONFIG, seatCapLinks: [] }, now: NOW_MS, log: quiet })).toBeNull();
  });

  it('runs on the billing loop’s tick too, so a missed webhook cannot leave the links on at 15', async () => {
    await sell(15);
    // As if the webhook's own reconcile never happened.
    for (const id of ['plink_full', 'plink_two']) stub.links.set(id, { id, active: true, metadata: { ai_plan: 'cohort' } });
    const loop = startBillingLoop({ database: true, invitesFrom: CONFIG.invitesFrom, log: quiet, intervalMs: 20, seatCap: { stripe: stub.client, config: CONFIG } });
    try {
      await vi.waitFor(() => expect(linkStates()).toMatchObject({ plink_full: [false, '1'], plink_two: [false, '1'] }), { timeout: 3000 });
    } finally {
      await loop.stop();
    }
  });
});
