// A skill bought on its own: the checkout route, the webhook, and the access that follows.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { readOfferConfig } from '../src/billing/config';
import type { BillingStripe } from '../src/billing/stripe';
import { handleStripeEvent } from '../src/billing/webhook';
import type { Database } from '../src/db/client';
import { skillPurchases, skills } from '../src/db/schema';
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

const stripe = {
  async createCheckoutSession(input: Parameters<BillingStripe['createCheckoutSession']>[0]) {
    sessions.push(input);
    return { id: `cs_test_${sessions.length}`, url: `https://checkout.stripe.com/c/pay/cs_test_${sessions.length}` };
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

async function deliver(id: string, type: string, object: Record<string, unknown>): Promise<string> {
  return handleStripeEvent({ id, object: 'event', type, data: { object } } as unknown as Stripe.Event, {
    stripe: null,
    config: readOfferConfig(),
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

    expect(await deliver('evt_refund', 'charge.refunded', { id: 'ch_skill', object: 'charge', refunded: true, payment_intent: 'pi_skill' })).toBe('skill-refunded');
    expect((await db.select().from(skillPurchases))[0]!.refundedAt).toBe(NOW);
    expect((await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().skills.find((s: { id: string }) => s.id === 'team-pnl-review').state).toBe('locked');

    // A later purchase of the same skill reopens it. The $37 is not turned into Insiders.
    expect(await deliver('evt_rebuy', 'checkout.session.completed', paidSession('u_jamie', 'team-pnl-review', 'cs_test_again', 'pi_skill2'))).toBe('repurchased');
    const [again] = await db.select().from(skillPurchases).where(eq(skillPurchases.userId, 'u_jamie'));
    expect(again).toMatchObject({ stripeSessionId: 'cs_test_again', refundedAt: null });
    expect(await db.select().from(skillPurchases)).toHaveLength(1);
    expect((await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json().plans).toEqual([]);
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

  it('does not open a skill that is not released yet, even after payment', async () => {
    expect(await deliver('evt_soon', 'checkout.session.completed', paidSession('u_jamie', 'listing-description-writer', 'cs_test_soon', 'pi_soon'))).toBe('purchased');
    const cookie = await app.signInAs('u_jamie');
    const list = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
    expect(list.json().skills.find((s: { id: string }) => s.id === 'listing-description-writer').state).toBe('upcoming');
  });
});
