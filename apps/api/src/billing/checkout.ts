// `POST /api/checkout`: the offer page's buy buttons (D-072, D-073, D-076).
//
//   JSON (the page's script)  → 200 { url } to send the browser to Stripe, or 400/409/503 { error, field }
//   a plain form (no script)  → 303 to Stripe's hosted Checkout, or 303 back to the plan on the page
//                               with `?error=<code>` (the page renders that code's sentence)
//
// ONE ORDER, THEN ONE SESSION. The form is validated, a `pending` order is written with the buyer's
// details and the consent proof, and only then is Stripe asked for a Checkout Session, with the order
// id as its idempotency key, its `client_reference_id` and its metadata. Nothing here marks an order
// paid: only the webhook does (D-074).
//
// WHAT IS REFUSED, AND IN WHICH WORDS. Every refusal names a field and says what to do, in the
// page's own voice (`CHECKOUT_ERRORS`, which the page holds a copy of and a test holds equal). The
// agreement box is always required; the renewal box whenever the cart charges again; the CRM question
// on the cohort, where anything but Follow Up Boss is refused with the library and the waitlist
// offered instead. Founding carts are refused after `FOUNDING_CLOSES_AT`; a session already started
// before it can still finish within its 60 minutes.
//
// NEVER LOGGED: the name, the email, the phone and the company. The order id, the cart and the
// Stripe session id are enough to follow a purchase through the log.

import type Stripe from 'stripe';
import { z } from 'zod';
import { normalizePhone, TEAM_SIZES } from '../routes/ai101';
import { AGENTS_FIRST_CHARGE_AT, CARTS, CART_IDS, LIBRARY_TRIAL_DAYS, renewalText } from './catalog';
import type { Cart, CartId, RenewalAmounts } from './catalog';
import type { PriceMap } from './prices';

/** Bumped when /agreement changes in substance; recorded on every order. Beside `TERMS_VERSION`. */
export const AGREEMENT_VERSION = '2026-11-12-draft';

/** The SMS box on the offer form, word for word, stored as the proof when it is ticked (D-034's rule). */
export const OFFER_SMS_CONSENT_TEXT =
  "Text me about my plan, sessions and other programs from Amplified Impact, LLC at the number above. Messages may be sent using automated technology. Consent isn't required to buy. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.";

/** The attribution campaigns a form may claim. `/forum` renders `forum`; nothing else does. */
export const CAMPAIGNS = ['forum'] as const;

export const CHECKOUT_ERRORS = {
  cart: 'Choose a plan.',
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  phone: 'Enter a valid mobile number.',
  company: 'Enter a team name under 120 characters.',
  teamSize: 'Choose your team size.',
  crm: 'The cohort is built on Follow Up Boss. The Skill Library works with any CRM, or join the cohort waitlist.',
  crmMissing: 'Tell us which CRM your team uses.',
  sms: 'Add your mobile number to get texts.',
  agree: 'Tick the box to accept the subscription agreement.',
  renew: 'Tick the box to agree to the later charge.',
  founding: 'Founding prices closed on Sunday, November 15.',
  closed: "The carts aren't open yet.",
  stripe: "Checkout didn't open. Try again, or use the backup payment link.",
} as const;
export type CheckoutErrorCode = keyof typeof CHECKOUT_ERRORS;

/** Which form field each refusal points at, so the page can put the message under it. */
export const ERROR_FIELD: Record<CheckoutErrorCode, string> = {
  cart: 'cart',
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  teamSize: 'teamSize',
  crm: 'crm',
  crmMissing: 'crm',
  sms: 'phone',
  agree: 'agree',
  renew: 'renew',
  founding: 'cart',
  closed: 'cart',
  stripe: 'cart',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SRC = /^[a-z0-9_-]{1,32}$/i;
const NAME_MAX = 120;
const EMAIL_MAX = 254;
const COMPANY_MAX = 120;
const PHONE_MAX = 24;

const text = z.string().nullish();
const box = z.union([z.boolean(), z.string()]).nullish();

/** The body, loose on purpose (as the waitlist's is): a plain form posts whatever the browser built. */
export const checkoutBody = z.object({
  cart: text,
  name: text,
  email: text,
  phone: text,
  company: text,
  teamSize: text,
  crm: text,
  agree: box,
  renew: box,
  sms: box,
  website: text,
  src: text,
  campaign: text,
});
export type CheckoutInput = z.infer<typeof checkoutBody>;

export interface CheckoutEntry {
  cart: Cart;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  teamSize: string | null;
  crm: 'follow_up_boss' | 'other' | null;
  renew: boolean;
  sms: boolean;
  src: string | null;
  campaign: (typeof CAMPAIGNS)[number] | null;
}

export type CheckoutVerdict =
  | { kind: 'valid'; entry: CheckoutEntry }
  | { kind: 'invalid'; code: CheckoutErrorCode; cart: CartId | null }
  | { kind: 'spam' };

const ticked = (value: boolean | string | null | undefined): boolean =>
  value === true || (typeof value === 'string' && ['on', 'true', 'yes'].includes(value.trim().toLowerCase()));

/**
 * Normalize and check one purchase. Pure: the open/closed and founding rules are the route's, since
 * they depend on the configuration and the clock. The first failing field in form order wins.
 */
export function validateCheckout(input: CheckoutInput): CheckoutVerdict {
  if ((input.website ?? '').trim() !== '') return { kind: 'spam' };
  const cartId = (input.cart ?? '').trim();
  const cart = (CART_IDS as readonly string[]).includes(cartId) ? CARTS[cartId as CartId] : null;
  if (!cart) return { kind: 'invalid', code: 'cart', cart: null };
  const fail = (code: CheckoutErrorCode): CheckoutVerdict => ({ kind: 'invalid', code, cart: cart.id });

  const name = (input.name ?? '').trim();
  if (name === '' || name.length > NAME_MAX) return fail('name');
  const email = (input.email ?? '').trim().toLowerCase();
  if (email.length > EMAIL_MAX || !EMAIL.test(email)) return fail('email');

  const rawPhone = (input.phone ?? '').trim();
  const phone = rawPhone === '' || rawPhone.length > PHONE_MAX ? null : normalizePhone(rawPhone);
  if (rawPhone !== '' && phone === null) return fail('phone');

  const company = (input.company ?? '').trim();
  if (company.length > COMPANY_MAX) return fail('company');

  const rawSize = (input.teamSize ?? '').trim();
  const teamSize = TEAM_SIZES.find((s) => s === rawSize) ?? null;
  if (rawSize !== '' && teamSize === null) return fail('teamSize');

  const rawCrm = (input.crm ?? '').trim();
  const crm = rawCrm === 'follow_up_boss' || rawCrm === 'other' ? rawCrm : null;
  if (cart.requiresFollowUpBoss) {
    if (crm === null) return fail('crmMissing');
    if (crm !== 'follow_up_boss') return fail('crm');
  }

  const sms = ticked(input.sms);
  if (sms && phone === null) return fail('sms');
  if (!ticked(input.agree)) return fail('agree');
  const renew = ticked(input.renew);
  if (cart.renewal === 'required' && !renew) return fail('renew');

  const src = (input.src ?? '').trim();
  const campaign = CAMPAIGNS.find((c) => c === (input.campaign ?? '').trim()) ?? null;
  return {
    kind: 'valid',
    entry: {
      cart,
      name,
      email,
      phone,
      company: company === '' ? null : company,
      teamSize,
      crm,
      renew,
      sms,
      src: SRC.test(src) ? src : null,
      campaign,
    },
  };
}

/** The amounts a cart's renewal sentence names, from the live prices. */
export function renewalAmounts(cart: Cart, prices: PriceMap): RenewalAmounts {
  const recurringKey = cart.items.find((k) => k !== 'membership_monthly' && prices[k]?.interval !== null);
  return {
    membership: prices.membership_monthly?.unitAmount ?? 0,
    ...(recurringKey ? { recurring: prices[recurringKey]?.unitAmount ?? 0 } : {}),
  };
}

export interface SessionInput {
  cart: Cart;
  orderId: string;
  email: string;
  /** An existing Stripe customer for this buyer, so a second plan lands on the same customer. */
  customerId: string | null;
  campaign: string | null;
  prices: PriceMap;
  /** `https://www.amplifiedimpact.io`, no trailing slash. */
  baseUrl: string;
  /** Where Cancel returns: the plan on the page the buyer came from. */
  cancelPath: string;
  now: number;
  /** The renewal sentence the buyer agreed to, repeated on Stripe's page above the Pay button. */
  renewal: string | null;
}

/**
 * The Checkout Session for one cart, exactly as the spec's "How each cart is built" says. Pure, so the
 * contract is unit-tested without Stripe.
 */
export function checkoutSessionParams(input: SessionInput): Stripe.Checkout.SessionCreateParams {
  const { cart, prices } = input;
  const metadata: Record<string, string> = {
    order_id: input.orderId,
    ai_plan: cart.plan,
    ai_option: cart.option,
    origin: 'offer',
    ...(input.campaign ? { campaign: input.campaign } : {}),
  };
  const lineItems = cart.items.map((key) => {
    const price = prices[key];
    if (!price) throw new Error(`No price for lookup key ${key}`);
    return { price: price.id, quantity: 1 };
  });

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: cart.mode,
    line_items: lineItems,
    client_reference_id: input.orderId,
    metadata,
    phone_number_collection: { enabled: true },
    // Stripe's minimum is 30 minutes; the spec asks for 60.
    expires_at: Math.floor(input.now / 1000) + 60 * 60,
    success_url: `${input.baseUrl}/offer/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}${input.cancelPath}`,
    allow_promotion_codes: false,
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    ...(input.renewal ? { custom_text: { submit: { message: input.renewal.slice(0, 1200) } } } : {}),
  };

  if (cart.mode === 'payment') {
    // A customer is always created and the card saved, so the cohort's $197 can start after its 90
    // days without asking for a card again. An invoice as well as the receipt.
    if (!input.customerId) params.customer_creation = 'always';
    params.payment_intent_data = { setup_future_usage: 'off_session', metadata };
    params.invoice_creation = { enabled: true, invoice_data: { metadata } };
    return params;
  }

  const subscription: Stripe.Checkout.SessionCreateParams.SubscriptionData = { metadata };
  if (cart.plan === 'library') subscription.trial_period_days = LIBRARY_TRIAL_DAYS;
  if (cart.plan === 'agents') subscription.trial_end = Math.floor(AGENTS_FIRST_CHARGE_AT / 1000);
  params.subscription_data = subscription;
  // A card is saved even when nothing is charged today (the agent plan's trial).
  params.payment_method_collection = 'always';
  return params;
}

/** The sentence beside the renewal box, or null for a cart with no box ticked. */
export function renewalSentence(entry: Pick<CheckoutEntry, 'cart' | 'renew'>, prices: PriceMap, now: number): string | null {
  if (!entry.renew) return null;
  return renewalText(entry.cart, renewalAmounts(entry.cart, prices), now);
}
