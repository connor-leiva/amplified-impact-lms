// The offer's pure rules (D-072 to D-078), without a database or a network: the Stripe contract each
// cart is built to, the form's refusals, the access rule, the buyer tags and the page's tokens.

import { describe, expect, it } from 'vitest';
import { canOpenSkill, liveSessionsOpen, skillState } from './access';
import type { PlanAccess, SkillAccess } from './access';
import {
  AGENTS_FIRST_CHARGE_AT,
  CARTS,
  CART_IDS,
  DEFAULT_FOUNDING_CLOSES_AT,
  COHORT_ONE_LIVE_UNTIL,
  LOOKUP_KEYS,
  ORDER_OPTIONS,
  ORDER_STATUSES,
  PLAN_KINDS,
  PLAN_STATUSES,
  SKILL_SETS,
  addMonths,
  dollars,
  initialPlanDates,
  renewalText,
} from './catalog';
import { CHECKOUT_ERRORS, checkoutSessionParams, validateCheckout } from './checkout';
import { keyMode, readOfferConfig } from './config';
import type { PriceMap } from './prices';
import { crmOf, planStatusOf, teamSizeOfAgents } from './webhook';
import { buyerTags } from '../integrations/ghl';
import { cartStates, fillTokens, offerValues, welcomeValues } from '../routes/offer';
import { FREE_SKILLS, PAID_DOWNLOADS, SKILL_CATALOG } from './skills-catalog';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NOW = Date.parse('2026-11-14T15:00:00-06:00'); // Saturday at the Forum
const DAY = 86_400_000;
const DEFAULT_FOUNDING = Date.parse(DEFAULT_FOUNDING_CLOSES_AT);

const PRICES: PriceMap = {
  cohort_founding_full: { lookupKey: 'cohort_founding_full', id: 'price_cff', unitAmount: 750000, currency: 'usd', interval: null, productName: 'Core Cohort' },
  cohort_founding_two_pay: { lookupKey: 'cohort_founding_two_pay', id: 'price_c2', unitAmount: 375000, currency: 'usd', interval: 'month', productName: 'Core Cohort' },
  library_upfront: { lookupKey: 'library_upfront', id: 'price_lu', unitAmount: 200000, currency: 'usd', interval: null, productName: 'Skill Library' },
  membership_monthly: { lookupKey: 'membership_monthly', id: 'price_mm', unitAmount: 19700, currency: 'usd', interval: 'month', productName: 'Membership' },
  agents_upto15_founding: { lookupKey: 'agents_upto15_founding', id: 'price_a15', unitAmount: 49700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
  agents_16to40_founding: { lookupKey: 'agents_16to40_founding', id: 'price_a40', unitAmount: 79700, currency: 'usd', interval: 'month', productName: 'Agent Team Plan' },
};

const session = (cart: (typeof CART_IDS)[number], extra: Partial<Parameters<typeof checkoutSessionParams>[0]> = {}) =>
  checkoutSessionParams({
    cart: CARTS[cart],
    orderId: 'ord_1',
    email: 'pat@example.com',
    customerId: null,
    campaign: null,
    prices: PRICES,
    baseUrl: 'https://www.amplifiedimpact.io',
    cancelPath: '/offer?cart=library#checkout',
    now: NOW,
    renewal: 'words',
    ...extra,
  });

describe('the Stripe contract (D-072, D-073, D-076)', () => {
  it('holds the CHECK constraints and the catalog to the same lists', () => {
    const sql = readFileSync(fileURLToPath(new URL('../../drizzle/0006_offer_billing.sql', import.meta.url)), 'utf8');
    const listIn = (name: string) => sql.match(new RegExp(`"${name}" CHECK \\(.*? in \\(([^)]*)\\)`))?.[1]?.match(/'[^']*'/g)?.map((s) => s.slice(1, -1));
    expect(listIn('orders_plan')).toEqual([...PLAN_KINDS]);
    expect(listIn('orders_option')).toEqual([...ORDER_OPTIONS]);
    expect(listIn('orders_status')).toEqual([...ORDER_STATUSES]);
    expect(listIn('plans_status')).toEqual([...PLAN_STATUSES]);
    expect(listIn('skills_sets')).toEqual([...SKILL_SETS]);
  });

  it('asks Stripe only for the six lookup keys the handoff creates', () => {
    expect([...LOOKUP_KEYS].sort()).toEqual(
      ['agents_16to40_founding', 'agents_upto15_founding', 'cohort_founding_full', 'cohort_founding_two_pay', 'library_upfront', 'membership_monthly'].sort(),
    );
  });

  it('builds the cohort in full as a payment that saves the card, with an invoice', () => {
    const p = session('cohort-full');
    expect(p.mode).toBe('payment');
    expect(p.line_items).toEqual([{ price: 'price_cff', quantity: 1 }]);
    expect(p.customer_creation).toBe('always');
    expect(p.payment_intent_data?.setup_future_usage).toBe('off_session');
    expect(p.invoice_creation?.enabled).toBe(true);
    expect(p.payment_intent_data?.metadata).toMatchObject({ order_id: 'ord_1', ai_plan: 'cohort', ai_option: 'full' });
  });

  it('builds the library as $2,000 today and the $197 on a 30-day trial', () => {
    const p = session('library');
    expect(p.mode).toBe('subscription');
    expect(p.line_items).toEqual([
      { price: 'price_lu', quantity: 1 },
      { price: 'price_mm', quantity: 1 },
    ]);
    expect(p.subscription_data?.trial_period_days).toBe(30);
    expect(p.subscription_data?.metadata).toMatchObject({ order_id: 'ord_1', ai_plan: 'library', ai_option: 'upfront' });
  });

  it('builds an agent plan with nothing charged until Jan 26 and the card saved', () => {
    for (const id of ['agents-upto15', 'agents-16to40'] as const) {
      const p = session(id);
      expect(p.subscription_data?.trial_end).toBe(Math.floor(AGENTS_FIRST_CHARGE_AT / 1000));
      expect(new Date(AGENTS_FIRST_CHARGE_AT).toISOString().slice(0, 10)).toBe('2027-01-26');
      expect(p.payment_method_collection).toBe('always');
    }
  });

  it('builds two-pay as a plain monthly subscription the webhook ends', () => {
    const p = session('cohort-two-pay');
    expect(p.mode).toBe('subscription');
    expect(p.line_items).toEqual([{ price: 'price_c2', quantity: 1 }]);
    expect(p.subscription_data?.trial_end).toBeUndefined();
    expect(CARTS['cohort-two-pay'].installments).toBe(2);
  });

  it('gives every session the order id, the metadata, the welcome page and an hour', () => {
    for (const id of CART_IDS) {
      const p = session(id, { campaign: 'forum' });
      expect(p.client_reference_id).toBe('ord_1');
      expect(p.metadata).toEqual({ order_id: 'ord_1', ai_plan: CARTS[id].plan, ai_option: CARTS[id].option, origin: 'offer', campaign: 'forum' });
      expect(p.success_url).toBe('https://www.amplifiedimpact.io/offer/welcome?session_id={CHECKOUT_SESSION_ID}');
      expect(p.expires_at).toBe(Math.floor(NOW / 1000) + 3600);
      expect(p.customer_email).toBe('pat@example.com');
      expect(p.phone_number_collection?.enabled).toBe(true);
    }
  });

  it('reuses an existing customer instead of the email', () => {
    const p = session('library', { customerId: 'cus_9' });
    expect(p.customer).toBe('cus_9');
    expect(p.customer_email).toBeUndefined();
  });

  it('dates the cohort and the agent plan as the offer says', () => {
    expect(new Date(COHORT_ONE_LIVE_UNTIL).toISOString().slice(0, 10)).toBe('2027-05-03');
    expect(initialPlanDates('library', NOW).paidThrough).toBe(NOW + 30 * DAY);
    expect(initialPlanDates('agents', NOW)).toMatchObject({ paidThrough: null, minimumUntil: addMonths(AGENTS_FIRST_CHARGE_AT, 3) });
  });

  it('words each later charge with its amount, its start and how to cancel', () => {
    const amounts = { membership: 19700, recurring: 49700 };
    expect(renewalText(CARTS.library, amounts, NOW)).toContain('$197 a month');
    expect(renewalText(CARTS.library, amounts, NOW)).toContain('December 14, 2026');
    expect(renewalText(CARTS['agents-upto15'], amounts, NOW)).toContain('$497 a month');
    expect(renewalText(CARTS['agents-upto15'], amounts, NOW)).toContain('Tuesday, January 26, 2027');
    expect(renewalText(CARTS['agents-upto15'], amounts, NOW)).toContain('3-month minimum');
    expect(renewalText(CARTS['cohort-two-pay'], { membership: 19700, recurring: 375000 }, NOW)).toContain('$3,750 on December 14, 2026');
    for (const id of CART_IDS) expect(renewalText(CARTS[id], amounts, NOW)).not.toMatch(/[—!]/);
    expect(dollars(19700)).toBe('$197');
    expect(dollars(200000)).toBe('$2,000');
  });
});

describe('the checkout form (D-076)', () => {
  const ok = { cart: 'library', name: 'Pat Buyer', email: 'Pat@Example.com', agree: 'on', renew: 'on' };

  it('accepts a complete form and normalizes it', () => {
    const v = validateCheckout(ok);
    expect(v.kind).toBe('valid');
    if (v.kind === 'valid') expect(v.entry).toMatchObject({ email: 'pat@example.com', renew: true, sms: false, campaign: null });
  });

  it('refuses an unticked agreement or renewal box', () => {
    expect(validateCheckout({ ...ok, agree: undefined })).toEqual({ kind: 'invalid', code: 'agree', cart: 'library' });
    expect(validateCheckout({ ...ok, renew: undefined })).toEqual({ kind: 'invalid', code: 'renew', cart: 'library' });
  });

  it('keeps the cohort to Follow Up Boss teams', () => {
    expect(validateCheckout({ ...ok, cart: 'cohort-full' })).toMatchObject({ code: 'crmMissing' });
    expect(validateCheckout({ ...ok, cart: 'cohort-full', crm: 'other' })).toMatchObject({ code: 'crm' });
    expect(validateCheckout({ ...ok, cart: 'cohort-full', crm: 'follow_up_boss' }).kind).toBe('valid');
    expect(CHECKOUT_ERRORS.crm).toContain('Skill Library');
  });

  it('makes the cohort-in-full renewal box optional while Spring decides', () => {
    const v = validateCheckout({ ...ok, cart: 'cohort-full', crm: 'follow_up_boss', renew: undefined });
    expect(v.kind).toBe('valid');
  });

  it('needs a number for texts, and only records the forum campaign', () => {
    expect(validateCheckout({ ...ok, sms: 'on' })).toMatchObject({ code: 'sms' });
    const v = validateCheckout({ ...ok, campaign: 'anything', src: 'qr' });
    if (v.kind !== 'valid') throw new Error('expected valid');
    expect([v.entry.campaign, v.entry.src]).toEqual([null, 'qr']);
  });

  it('treats a filled honeypot as spam', () => {
    expect(validateCheckout({ ...ok, website: 'x' })).toEqual({ kind: 'spam' });
  });

  it('writes every refusal without an em dash or an exclamation mark', () => {
    for (const msg of Object.values(CHECKOUT_ERRORS)) expect(msg).not.toMatch(/[—!]/);
  });
});

describe('the access rule (D-078)', () => {
  const skill = (over: Partial<SkillAccess> = {}): SkillAccess => ({ sets: 'owner_ops', free: false, releasedAt: NOW - 10 * DAY, status: 'published', ...over });
  const library = (over: Partial<PlanAccess> = {}): PlanAccess => ({ kind: 'library', status: 'active', paidThrough: NOW + 20 * DAY, liveUntil: NOW + 20 * DAY, ...over });

  it('opens the library set to a library buyer and locks the agent set', () => {
    expect(canOpenSkill([library()], skill(), NOW)).toBe(true);
    expect(canOpenSkill([library()], skill({ sets: 'agent' }), NOW)).toBe(false);
    expect(canOpenSkill([library()], skill({ sets: 'both' }), NOW)).toBe(true);
  });

  it('opens both sets to a cohort buyer, and the agent set alone to an agent plan', () => {
    const cohort: PlanAccess = { kind: 'cohort', status: 'active', paidThrough: COHORT_ONE_LIVE_UNTIL, liveUntil: COHORT_ONE_LIVE_UNTIL };
    expect(canOpenSkill([cohort], skill(), NOW) && canOpenSkill([cohort], skill({ sets: 'agent' }), NOW)).toBe(true);
    const agents: PlanAccess = { kind: 'agents', status: 'active', paidThrough: NOW + DAY, liveUntil: null };
    expect([canOpenSkill([agents], skill(), NOW), canOpenSkill([agents], skill({ sets: 'agent' }), NOW)]).toEqual([false, true]);
  });

  it('cancel and keep: a skill released before the paid-through date opens, one after does not', () => {
    const lapsed = library({ status: 'canceled', paidThrough: NOW - 5 * DAY, liveUntil: NOW - 5 * DAY });
    expect(canOpenSkill([lapsed], skill({ releasedAt: NOW - 10 * DAY }), NOW)).toBe(true);
    expect(canOpenSkill([lapsed], skill({ releasedAt: NOW - 2 * DAY }), NOW)).toBe(false);
    expect(liveSessionsOpen(lapsed, NOW)).toBe(false);
  });

  it('a refund ends everything; a free skill opens for anyone; an unreleased one for no one', () => {
    expect(canOpenSkill([library({ status: 'ended' })], skill(), NOW)).toBe(false);
    expect(canOpenSkill([], skill({ free: true }), NOW)).toBe(true);
    expect(skillState([library()], skill({ releasedAt: NOW + DAY }), NOW)).toBe('upcoming');
    expect(canOpenSkill([library()], skill({ status: 'hidden' }), NOW)).toBe(false);
  });

  it('opens an agent plan to nothing until its first charge', () => {
    const trial: PlanAccess = { kind: 'agents', status: 'trialing', paidThrough: null, liveUntil: null };
    expect(canOpenSkill([trial], skill({ sets: 'agent' }), NOW)).toBe(false);
  });
});

describe('the skill catalog (D-081)', () => {
  it('fails closed: only the named skills are free, and every other ZIP is paid', () => {
    expect(FREE_SKILLS.every((id) => SKILL_CATALOG.some((s) => s.id === id))).toBe(true);
    const free = SKILL_CATALOG.filter((s) => FREE_SKILLS.includes(s.id)).flatMap((s) => Object.values(s.files));
    expect(PAID_DOWNLOADS.some((f) => free.includes(f))).toBe(false);
    expect(new Set(SKILL_CATALOG.map((s) => s.id)).size).toBe(18);
  });

  it('names only files that exist in /downloads', () => {
    const dir = fileURLToPath(new URL('../../../web/public/downloads/', import.meta.url));
    const missing = SKILL_CATALOG.flatMap((s) => Object.values(s.files)).filter((f) => {
      try {
        readFileSync(`${dir}${f}`);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
});

describe('buyer tags (D-075)', () => {
  const base = { plan: 'cohort', option: 'two_pay', status: 'paid', paidAt: NOW, paymentFailedAt: null, membershipEndedAt: null, refundedAt: null, campaign: null, smsConsent: false, phone: null };

  it('tags a buyer by plan and payment, and the forum when it came through /forum', () => {
    expect(buyerTags(base)).toEqual(['offer-buyer', 'plan-cohort', 'pay-two']);
    expect(buyerTags({ ...base, option: 'full', campaign: 'forum' })).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'event-forum-nov-2026']);
    expect(buyerTags({ ...base, plan: 'agents', option: 'upto15', status: 'trialing', paidAt: null })).toEqual(['offer-buyer', 'plan-agents']);
  });

  it('adds the follow-up tags as things happen, and never tags a pending order', () => {
    expect(buyerTags({ ...base, status: 'expired', paidAt: null })).toEqual(['checkout-abandoned-cohort']);
    expect(buyerTags({ ...base, paymentFailedAt: NOW })).toContain('payment-failed');
    expect(buyerTags({ ...base, status: 'refunded', refundedAt: NOW })).toContain('refunded');
    expect(buyerTags({ ...base, membershipEndedAt: NOW })).toContain('membership-ended');
    expect(buyerTags({ ...base, status: 'pending', paidAt: null })).toEqual([]);
    expect(buyerTags({ ...base, smsConsent: true, phone: '+18015551234' })).toContain('sms-consent');
  });
});

describe('webhook helpers', () => {
  it('reads a Payment Link custom field the way Grokbok sets it up', () => {
    expect(crmOf('follow_up_boss')).toBe('follow_up_boss');
    expect(crmOf('Follow Up Boss')).toBe('follow_up_boss');
    expect(crmOf('other')).toBe('other');
    expect(teamSizeOfAgents('12')).toBe('11-25');
    expect(teamSizeOfAgents('nope')).toBeNull();
    expect(planStatusOf('unpaid')).toBe('past_due');
    expect(planStatusOf('incomplete_expired')).toBe('ended');
  });
});

describe('the offer page values (D-074)', () => {
  const config = readOfferConfig({ OFFER_OPEN: 'true', PAYMENT_LINK_COHORT_FULL: 'https://buy.stripe.com/test_x' });

  it('opens every cart with prices and Stripe, and closes founding carts after the close', () => {
    expect(Object.values(cartStates(config, PRICES, true, NOW))).toEqual(['checkout', 'checkout', 'checkout', 'checkout', 'checkout']);
    const after = cartStates(config, PRICES, true, DEFAULT_FOUNDING + 1);
    expect(after.library).toBe('checkout');
    expect([after['cohort-full'], after['cohort-two-pay'], after['agents-upto15']]).toEqual(['closed', 'closed', 'closed']);
  });

  it('falls back to the Payment Links with no Stripe, and to "soon" with neither', () => {
    const states = cartStates(config, null, false, NOW);
    expect(states['cohort-full']).toBe('link');
    expect(states.library).toBe('soon');
    expect(Object.values(cartStates(readOfferConfig({}), PRICES, true, NOW)).every((s) => s === 'soon')).toBe(true);
  });

  it('fills tokens escaped, and empties the ones it does not know', () => {
    expect(fillTokens('<p>%%v-name%%</p><a href="%%link:library%%">%%nope%%</a>', { 'v-name': '<b>"x"</b>', 'link:library': 'https://a.b/?q=1&r=2' })).toBe(
      '<p>&lt;b&gt;&quot;x&quot;&lt;/b&gt;</p><a href="https://a.b/?q=1&amp;r=2"></a>',
    );
    const values = offerValues({ config, prices: PRICES, stripeReady: true, now: NOW, campaign: 'forum', src: 'qr', selected: 'agents-16to40', error: null });
    expect(values['price:library_upfront']).toBe('$2,000');
    expect(values['checked:agents-16to40']).toBe('checked');
    expect(values['checked:library']).toBe('');
    expect(values['page-path']).toBe('/forum');
    expect(values['founding-closes']).toBe('Sunday, November 15');
  });

  it('says when the login arrives: Monday before it, minutes after', () => {
    expect(welcomeValues({ state: 'confirmed', plan: 'library', sessionId: null, now: NOW, config }).login).toContain('Monday, November 16');
    expect(welcomeValues({ state: 'confirmed', plan: 'library', sessionId: null, now: config.invitesFrom + 1, config }).login).toContain('within a few minutes');
  });

  it('reports a key only by its mode', () => {
    expect([keyMode('rk_test_abc'), keyMode('rk_live_abc'), keyMode(null), keyMode('nope')]).toEqual(['test', 'live', 'unset', 'unknown']);
  });
});
