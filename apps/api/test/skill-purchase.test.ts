// A skill bought on its own: the checkout route, the webhook, and the access that follows.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, storePassword } from '../src/auth';
import { SKILL_PURCHASE } from '../src/billing/catalog';
import { readOfferConfig } from '../src/billing/config';
import type { BillingStripe } from '../src/billing/stripe';
import { handleStripeEvent } from '../src/billing/webhook';
import type { Database } from '../src/db/client';
import { skillPurchases, skills, users } from '../src/db/schema';
import { outboxFor } from '../src/email/transport';
import { provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import { accessGroups } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-23T12:00:00-07:00');
const DAY = 86_400_000;
const APP_URL = 'https://learn.example.com';
const PRICE = 'price_testSkillSingle';

let app: App;
let db: Database;
let savedAppUrl: string | undefined;
const sessions: Parameters<BillingStripe['createCheckoutSession']>[0][] = [];
const retrieved = new Map<string, Stripe.Checkout.Session>();

const stripe = {
  async createCheckoutSession(input: Parameters<BillingStripe['createCheckoutSession']>[0]) {
    sessions.push(input);
    return { id: `cs_test_${sessions.length}`, url: `https://checkout.stripe.com/c/pay/cs_test_${sessions.length}` };
  },
  async retrieveCheckoutSession(id: string) {
    const found = retrieved.get(id);
    if (!found) throw new Error('missing-session');
    return found;
  },
} as unknown as BillingStripe;

const log = { info() {}, warn() {}, error() {} };

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  db = await testDatabase();
});
afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

async function boot(): Promise<void> {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  sessions.length = 0;
  retrieved.clear();
  await resetDatabase(seedForDatabase('live'));
  await db.insert(skills).values([
    { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW - 10 * DAY, files: { claude: 'team-pnl-review.zip' } },
    { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', releasedAt: NOW - 10 * DAY, files: { claude: 'appointment-follow-up.zip' } },
    { id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, releasedAt: NOW - 10 * DAY, files: { claude: 'perfect-week.zip' } },
    { id: 'listing-description-writer', title: 'Listing Description Writer', sets: 'agent', releasedAt: NOW + 30 * DAY, files: { claude: 'listing-description-writer.zip' } },
    { id: 'card-bank-feed-audit', title: 'Weekly Card & Bank Audit', sets: 'both', releasedAt: NOW - DAY, files: { grok: 'card-bank-feed-audit.zip' } },
  ]);
  const config = readOfferConfig();
  config.skillPriceId = PRICE;
  app = await build({ logger: false, waitlist: true, offer: { config, stripe } });
}
beforeEach(boot);
afterEach(async () => {
  await app?.close();
});

const post = (url: string, cookie?: string) =>
  app.inject({
    method: 'POST',
    url,
    payload: {},
    headers: { origin: APP_URL, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });

async function deliver(id: string, type: string, object: Record<string, unknown> | Stripe.Checkout.Session, guest = false): Promise<string> {
  const config = readOfferConfig();
  if (guest) config.skillGuestCheckout = true;
  return handleStripeEvent({ id, object: 'event', type, data: { object } } as unknown as Stripe.Event, {
    stripe: null,
    config,
    prices: { get: async () => null } as never,
    log,
    now: () => NOW,
    db,
  });
}

function paidSession(userId: string, skillId: string, sessionId: string, pi: string) {
  return {
    id: sessionId,
    object: 'checkout.session',
    payment_status: 'paid',
    amount_total: 3700,
    client_reference_id: userId,
    payment_intent: pi,
    metadata: { ai_plan: 'skill', ai_option: 'single', skill_id: skillId, user_id: userId },
  };
}

describe('POST /api/skills/:id/checkout', () => {
  it('creates a payment session for a locked skill and returns to its guide', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await post('/api/skills/team-pnl-review/checkout', cookie);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      priceId: PRICE,
      clientReferenceId: 'u_jamie',
      successUrl: `${APP_URL}/skill-library/team-pnl-review?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP_URL}/skill-library/team-pnl-review`,
      metadata: { skill_id: 'team-pnl-review', ai_plan: 'skill', ai_option: 'single', user_id: 'u_jamie' },
    });
    expect(sessions[0]!.customerEmail).toMatch(/@/);
  });

  it('sells a paid Grok Bot template the same way, because it is a paid catalog row', async () => {
    const cookie = await app.signInAs('u_jamie');
    const res = await post('/api/skills/card-bank-feed-audit/checkout', cookie);
    expect(res.statusCode).toBe(200);
    expect(sessions[0]!.metadata.skill_id).toBe('card-bank-feed-audit');
    expect(sessions[0]!.successUrl).toBe(`${APP_URL}/skill-library/card-bank-feed-audit?session_id={CHECKOUT_SESSION_ID}`);
  });

  it('refuses an access-group member, a free skill, an unreleased skill, and a missing price', async () => {
    await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - DAY });
    const memberId = await provisionGroupMember(db, 'lines@liveutah.com', NOW);
    await recordVerified(db, 'lines@liveutah.com', NOW);
    const member = await app.signInAs(memberId!);
    const refused = await post('/api/skills/team-pnl-review/checkout', member);
    expect(refused.statusCode).toBe(403);
    expect(sessions).toHaveLength(0);

    const cookie = await app.signInAs('u_jamie');
    expect((await post('/api/skills/perfect-week/checkout', cookie)).statusCode).toBe(400);
    expect((await post('/api/skills/listing-description-writer/checkout', cookie)).statusCode).toBe(400);
    expect((await post('/api/skills/not-a-skill/checkout', cookie)).statusCode).toBe(404);
    expect(sessions).toHaveLength(0);

    const bare = readOfferConfig();
    bare.skillPriceId = null;
    const quiet = await build({ logger: false, waitlist: true, offer: { config: bare, stripe } });
    try {
      const again = await quiet.signInAs('u_jamie');
      const res = await quiet.inject({
        method: 'POST',
        url: '/api/skills/team-pnl-review/checkout',
        payload: {},
        headers: { origin: APP_URL, 'content-type': 'application/json', cookie: again },
      });
      expect(res.statusCode).toBe(503);
    } finally {
      await quiet.close();
    }
  });
});

describe('the webhook and access', () => {
  it('opens the skill on payment, ignores a repeat, and closes it on a full refund', async () => {
    const cookie = await app.signInAs('u_jamie');
    const before = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(before.json().skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('locked');

    const first = await deliver('evt_buy', 'checkout.session.completed', paidSession('u_jamie', 'team-pnl-review', 'cs_test_paid', 'pi_skill'));
    expect(first).toBe('purchased');
    const rows = await db.select().from(skillPurchases);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: 'u_jamie', skillId: 'team-pnl-review', amount: 3700, stripeSessionId: 'cs_test_paid', refundedAt: null, orderId: null });

    expect(await deliver('evt_buy_again', 'checkout.session.completed', paidSession('u_jamie', 'team-pnl-review', 'cs_test_paid', 'pi_skill'))).toBe('duplicate');
    expect(await db.select().from(skillPurchases)).toHaveLength(1);

    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(list.json().skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('open');
    // The other paid skill stays locked: a purchase is one skill, not a plan.
    expect(list.json().skills.find((s: { id: string }) => s.id === 'appointment-follow-up').state).toBe('locked');
    // D-241: the bought skill is named, so a buyer with no plan gets the LMS with it first.
    expect(before.json().purchased).toEqual([]);
    expect(list.json().purchased).toEqual(['team-pnl-review']);

    expect(await deliver('evt_refund', 'charge.refunded', { id: 'ch_skill', object: 'charge', refunded: true, payment_intent: 'pi_skill' })).toBe('skill-refunded');
    expect((await db.select().from(skillPurchases))[0]!.refundedAt).toBe(NOW);
    const refunded = (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json();
    expect(refunded.skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('locked');
    expect(refunded.purchased).toEqual([]);

    // A later purchase of the same skill reopens it. The $37 is not turned into Insiders.
    expect(await deliver('evt_rebuy', 'checkout.session.completed', paidSession('u_jamie', 'team-pnl-review', 'cs_test_again', 'pi_skill2'))).toBe('repurchased');
    const [again] = await db.select().from(skillPurchases).where(eq(skillPurchases.userId, 'u_jamie'));
    expect(again).toMatchObject({ stripeSessionId: 'cs_test_again', refundedAt: null });
    expect(await db.select().from(skillPurchases)).toHaveLength(1);
    expect((await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().plans).toEqual([]);
  });

  it('names the skills a learner holds, the latest purchase first (D-241)', async () => {
    const cookie = await app.signInAs('u_jamie');
    await db.insert(skillPurchases).values([
      { id: 'sp_old', userId: 'u_jamie', skillId: 'team-pnl-review', stripeSessionId: 'cs_old', amount: 3700, purchasedAt: NOW - DAY },
      { id: 'sp_new', userId: 'u_jamie', skillId: 'appointment-follow-up', stripeSessionId: 'cs_new', amount: 3700, purchasedAt: NOW },
    ]);
    const body = (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json();
    expect(body.purchased).toEqual(['appointment-follow-up', 'team-pnl-review']);
    expect(body.plans).toEqual([]);
    expect(body.accessGroups).toEqual([]);
  });

  it('ignores a Payment Link session that carries no ai_plan, even when it names a skill', async () => {
    // The stopgap link sells the $37 price with a `skill` dropdown and no ai_plan metadata.
    // Those sessions must not grant access and must not write a purchase. Backfill is by hand.
    const result = await deliver('evt_stopgap', 'checkout.session.completed', {
      id: 'cs_test_stopgap',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 3700,
      payment_intent: 'pi_stopgap',
      metadata: {},
      custom_fields: [{ key: 'skill', type: 'dropdown', dropdown: { value: 'teampnlreview' } }],
    });
    expect(result).toBe('ignored:unknown-plan');
    expect(await db.select().from(skillPurchases)).toEqual([]);
    const cookie = await app.signInAs('u_jamie');
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(list.json().skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('locked');
  });

  it('sends a signed-out visitor to the stopgap link while guest checkout is off', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/skills/team-pnl-review/guest-checkout' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(SKILL_PURCHASE.stopgapHref);
    expect(sessions).toHaveLength(0);
  });

  it('starts a checkout with no account when guest checkout is on', async () => {
    await app.close();
    const config = readOfferConfig();
    config.skillPriceId = PRICE;
    config.skillGuestCheckout = true;
    app = await build({ logger: false, waitlist: true, offer: { config, stripe } });
    const res = await app.inject({ method: 'GET', url: '/api/skills/team-pnl-review/guest-checkout' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      customerEmail: null,
      metadata: { skill_id: 'team-pnl-review', ai_plan: 'skill', ai_option: 'single', offer: 'single_skill_37' },
    });
    expect(sessions[0]!.metadata).not.toHaveProperty('user_id');
    expect(sessions[0]!.collectName).toBe(true);
    expect(sessions[0]!.successUrl).toBe(`${APP_URL}/api/skills/guest-return?session_id={CHECKOUT_SESSION_ID}`);
  });

  it('stores a signed-out purchase by email, and sends nothing, while guest checkout is off', async () => {
    const session = {
      id: 'cs_test_guest',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 3700,
      payment_intent: 'pi_guest',
      customer_details: { email: 'Buyer@Example.com', name: 'Buyer Example' },
      metadata: { offer: 'single_skill_37' },
      custom_fields: [{ key: 'skill', type: 'dropdown', dropdown: { value: 'teampnlreview' } }],
    };
    expect(await deliver('evt_guest', 'checkout.session.completed', session)).toBe('purchased');
    expect(await db.select().from(users).where(eq(users.email, 'buyer@example.com'))).toEqual([]);
    const [row] = await db.select().from(skillPurchases);
    expect(row).toMatchObject({ userId: null, email: 'buyer@example.com', skillId: 'team-pnl-review', stripeSessionId: 'cs_test_guest' });
    expect(outboxFor({ to: 'buyer@example.com' })).toEqual([]);
  });

  it('creates the learner and sends the branded email only when guest checkout is on', async () => {
    const session = {
      id: 'cs_test_guest',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 3700,
      payment_intent: 'pi_guest',
      customer_details: { email: 'Buyer@Example.com', name: 'Buyer Example' },
      metadata: { ai_plan: 'skill', ai_option: 'single', skill_id: 'team-pnl-review', offer: 'single_skill_37' },
    };
    expect(await deliver('evt_guest', 'checkout.session.completed', session, true)).toBe('purchased:new');
    const [buyer] = await db.select().from(users).where(eq(users.email, 'buyer@example.com'));
    expect(buyer).toMatchObject({ kind: 'learner', status: 'invited' });
    const rows = await db.select().from(skillPurchases).where(eq(skillPurchases.userId, buyer!.id));
    expect(rows).toHaveLength(1);
    const [mail] = outboxFor({ to: 'buyer@example.com', template: 'skill-purchase' });
    expect(mail?.subject).toBe('Thank You for Buying Team P&L Review');
    expect(mail?.html).toContain('Thank you, Buyer.');
    expect(mail?.html).toContain('Set Your Password');
    expect(mail?.html).toContain('next=%2Fskill-library%2Fteam-pnl-review');
    expect(outboxFor({ to: 'buyer@example.com', template: 'set-password' })).toEqual([]);
    expect(await deliver('evt_guest_again', 'checkout.session.completed', session, true)).toBe('duplicate');
    expect(outboxFor({ to: 'buyer@example.com', template: 'skill-purchase' })).toHaveLength(1);

    const again = {
      ...session,
      id: 'cs_test_guest_2',
      payment_intent: 'pi_guest_2',
      metadata: { ...session.metadata, skill_id: 'appointment-follow-up' },
    };
    expect(await deliver('evt_guest_ready', 'checkout.session.completed', again, true)).toBe('purchased:ready');
    const [ready] = outboxFor({ to: 'buyer@example.com', template: 'skill-purchase' }).slice(-1);
    expect(ready?.subject).toBe('Your New Skill Is Ready');
    expect(ready?.html).toContain('>Sign In<');
  });

  it('does not grant a skill or create an account when the email is an access group', async () => {
    await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - DAY });
    const result = await deliver('evt_guest_utah', 'checkout.session.completed', {
      id: 'cs_test_utah',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 3700,
      payment_intent: 'pi_utah',
      customer_details: { email: 'lines@liveutah.com', name: 'Lines' },
      metadata: { ai_plan: 'skill', ai_option: 'single', skill_id: 'team-pnl-review', offer: 'single_skill_37' },
    });
    expect(result).toBe('ignored:skill-group');
    expect(await db.select().from(skillPurchases)).toEqual([]);
    expect(await db.select().from(users).where(eq(users.email, 'lines@liveutah.com'))).toEqual([]);
  });

  it('signs a new guest in on the way back from Stripe and leaves an existing password at sign-in', async () => {
    await app.close();
    const config = readOfferConfig();
    config.skillPriceId = PRICE;
    config.skillGuestCheckout = true;
    app = await build({ logger: false, waitlist: true, offer: { config, stripe } });

    const fresh = {
      id: 'cs_test_freshguest1',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 3700,
      payment_intent: 'pi_fresh',
      created: Math.floor(NOW / 1000),
      customer_details: { email: 'New.Buyer@Example.com', name: 'New Buyer' },
      metadata: { ai_plan: 'skill', ai_option: 'single', skill_id: 'team-pnl-review', offer: 'single_skill_37' },
    } as unknown as Stripe.Checkout.Session;
    retrieved.set(fresh.id, fresh);

    const back = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${fresh.id}` });
    expect(back.statusCode).toBe(302);
    expect(back.headers.location).toBe('/skill-library/team-pnl-review');
    const setCookie = back.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((line) => line.startsWith(`${SESSION_COOKIE}=`))?.split(';')[0];
    expect(cookie).toBeTruthy();
    const [buyer] = await db.select().from(users).where(eq(users.email, 'new.buyer@example.com'));
    expect(buyer).toMatchObject({ kind: 'learner', status: 'invited' });
    expect(await db.select().from(skillPurchases).where(eq(skillPurchases.userId, buyer!.id))).toHaveLength(1);
    const [mail] = outboxFor({ to: 'new.buyer@example.com', template: 'skill-purchase' });
    expect(mail?.html).toContain('Set Your Password');
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie: cookie! } });
    expect(list.statusCode).toBe(200);
    expect(list.json().skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('open');

    // The same return does not send the email again, and (H-1) does not sign anyone in a second time.
    const again = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${fresh.id}` });
    expect(again.statusCode).toBe(302);
    expect(again.headers.location).toBe(`/sign-in?next=${encodeURIComponent('/skill-library/team-pnl-review')}`);
    expect(String(again.headers['set-cookie'] ?? '')).not.toContain(`${SESSION_COOKIE}=`);
    expect(outboxFor({ to: 'new.buyer@example.com', template: 'skill-purchase' })).toHaveLength(1);

    await storePassword(db, buyer!.id, 'a long enough password', NOW);
    const owned = {
      ...fresh,
      id: 'cs_test_ownedguest1',
      payment_intent: 'pi_owned',
      metadata: { ...fresh.metadata, skill_id: 'appointment-follow-up' },
    } as unknown as Stripe.Checkout.Session;
    retrieved.set(owned.id, owned);
    const existing = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${owned.id}` });
    expect(existing.statusCode).toBe(302);
    expect(existing.headers.location).toBe(`/sign-in?next=${encodeURIComponent('/skill-library/appointment-follow-up')}`);
    const existingCookie = existing.headers['set-cookie'];
    expect(String(existingCookie ?? '')).not.toContain(`${SESSION_COOKIE}=`);
    const [ready] = outboxFor({ to: 'new.buyer@example.com', template: 'skill-purchase' }).slice(-1);
    expect(ready?.subject).toBe('Your New Skill Is Ready');
    expect(ready?.html).toContain('>Sign In<');

    retrieved.set('cs_test_unpaidguest', { ...fresh, id: 'cs_test_unpaidguest', payment_status: 'unpaid' } as unknown as Stripe.Checkout.Session);
    const unpaid = await app.inject({ method: 'GET', url: '/api/skills/guest-return?session_id=cs_test_unpaidguest' });
    expect(unpaid.headers.location).toBe(`/sign-in?next=${encodeURIComponent('/skill-library/team-pnl-review')}`);

    const stale = { ...fresh, id: 'cs_test_staleguests', created: Math.floor((NOW - 73 * 60 * 60 * 1000) / 1000) } as unknown as Stripe.Checkout.Session;
    retrieved.set(stale.id, stale);
    const old = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${stale.id}` });
    expect(old.headers.location).toBe(`/sign-in?next=${encodeURIComponent('/skill-library/team-pnl-review')}`);
    expect(String(old.headers['set-cookie'] ?? '')).not.toContain(`${SESSION_COOKIE}=`);

    const missing = await app.inject({ method: 'GET', url: '/api/skills/guest-return?session_id=cs_test_notreally1' });
    expect(missing.headers.location).toBe(`/sign-in?next=${encodeURIComponent('/skill-library')}`);
  });

  // H-1: Stripe does not verify the email typed at checkout. Only the account this checkout created
  // may be signed in by the return, only while it is invited with no password and no session, once.
  describe('the guest return signs in only the account its own checkout created (H-1)', () => {
    async function guestApp(): Promise<void> {
      await app.close();
      const config = readOfferConfig();
      config.skillPriceId = PRICE;
      config.skillGuestCheckout = true;
      app = await build({ logger: false, waitlist: true, offer: { config, stripe } });
    }
    const guest = (id: string, email: string, skillId = 'team-pnl-review') =>
      ({
        id,
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 3700,
        payment_intent: `pi_${id}`,
        created: Math.floor(NOW / 1000),
        customer_details: { email, name: 'Some Buyer' },
        metadata: { ai_plan: 'skill', ai_option: 'single', skill_id: skillId, offer: 'single_skill_37' },
      }) as unknown as Stripe.Checkout.Session;
    const cookieOf = (res: { headers: Record<string, unknown> }) => String(res.headers['set-cookie'] ?? '').includes(`${SESSION_COOKIE}=`);
    const signInTo = (skill: string) => `/sign-in?next=${encodeURIComponent(`/skill-library/${skill}`)}`;

    it('sends a checkout typed with an existing passwordless account\'s email to sign-in, with no session', async () => {
      await guestApp();
      // The owner of victim@example.com bought a skill last week and never set a password.
      expect(await deliver('evt_victim', 'checkout.session.completed', guest('cs_test_victimfirst', 'victim@example.com'), true)).toBe('purchased:new');
      const [victim] = await db.select().from(users).where(eq(users.email, 'victim@example.com'));
      expect(victim).toMatchObject({ status: 'invited' });

      // Someone else pays $37 and types the same address at Stripe.
      const attack = guest('cs_test_attackerpay', 'Victim@Example.com', 'appointment-follow-up');
      retrieved.set(attack.id, attack);
      const res = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${attack.id}` });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(signInTo('appointment-follow-up'));
      expect(cookieOf(res)).toBe(false);
      const [row] = await db.select().from(skillPurchases).where(eq(skillPurchases.stripeSessionId, attack.id));
      expect(row).toMatchObject({ userId: victim!.id, createdUserId: null, guestEnteredAt: null });
    });

    it('signs in the account the webhook created for this checkout once, and never after it has had a session', async () => {
      await guestApp();
      const first = guest('cs_test_webhookfirst', 'webhook.first@example.com');
      retrieved.set(first.id, first);
      // The webhook beats the buyer back from Stripe and creates the account.
      expect(await deliver('evt_webhook_first', 'checkout.session.completed', first, true)).toBe('purchased:new');
      const [buyer] = await db.select().from(users).where(eq(users.email, 'webhook.first@example.com'));
      expect((await db.select().from(skillPurchases).where(eq(skillPurchases.stripeSessionId, first.id)))[0]).toMatchObject({ createdUserId: buyer!.id, guestEnteredAt: null });

      const back = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${first.id}` });
      expect(back.headers.location).toBe('/skill-library/team-pnl-review');
      expect(cookieOf(back)).toBe(true);
      expect((await db.select().from(skillPurchases).where(eq(skillPurchases.stripeSessionId, first.id)))[0]!.guestEnteredAt).toBe(NOW);

      // Signed out, the same address in the history bar is spent.
      const replay = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${first.id}` });
      expect(replay.headers.location).toBe(signInTo('team-pnl-review'));
      expect(cookieOf(replay)).toBe(false);
    });

    it('does not sign in a new account that already had a session or is no longer invited', async () => {
      await guestApp();
      const withSession = guest('cs_test_hadasession', 'had.session@example.com');
      retrieved.set(withSession.id, withSession);
      await deliver('evt_had_session', 'checkout.session.completed', withSession, true);
      const [a] = await db.select().from(users).where(eq(users.email, 'had.session@example.com'));
      // They opened the Set Your Password email on another device first.
      await app.signInAs(a!.id);
      const res = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${withSession.id}` });
      expect(res.headers.location).toBe(signInTo('team-pnl-review'));
      expect(cookieOf(res)).toBe(false);

      const active = guest('cs_test_nowactive01', 'now.active@example.com');
      retrieved.set(active.id, active);
      await deliver('evt_now_active', 'checkout.session.completed', active, true);
      await db.update(users).set({ status: 'active' }).where(eq(users.email, 'now.active@example.com'));
      const res2 = await app.inject({ method: 'GET', url: `/api/skills/guest-return?session_id=${active.id}` });
      expect(res2.headers.location).toBe(signInTo('team-pnl-review'));
      expect(cookieOf(res2)).toBe(false);
    });
  });

  it('does not open a skill that is not released yet, even after payment', async () => {
    expect(await deliver('evt_soon', 'checkout.session.completed', paidSession('u_jamie', 'listing-description-writer', 'cs_test_soon', 'pi_soon'))).toBe('purchased');
    const cookie = await app.signInAs('u_jamie');
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(list.json().skills.find((s: { id: string }) => s.id === 'listing-description-writer').state).toBe('upcoming');
  });
});
