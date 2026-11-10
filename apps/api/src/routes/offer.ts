// The offer's routes (D-073 to D-077). Every one is public; what stands in for a session is named on
// each.
//
//   GET  /offer, /forum              → the offer page, filled per request (prices, dates, which carts
//                                      are open); /forum also records `campaign` = `forum`
//   GET  /offer/welcome              → after Stripe: the plan, when the login arrives, the intake form
//   GET  /api/offer                  → the same facts as JSON: carts, live prices, founding open or not
//   GET  /api/offer/order-status     → `{ status, plan }` for a `session_id`, nothing personal
//   POST /api/checkout               → billing/checkout.ts: validate, write the order, open Checkout
//   POST /api/offer/waitlist         → the cohort waitlist, for teams not on Follow Up Boss
//                                      (registered with the other sign-up forms in routes/ai101.ts)
//   POST /api/stripe/webhook         → billing/webhook.ts
//
// THE PAGES ARE BUILT ONCE AND FILLED PER REQUEST. Prices live in Stripe and change without a deploy,
// founding closes at a configured instant, and the renewal sentence names a date counted from today.
// So `apps/web` builds the page with `%%token%%`s (`OFFER_TOKENS` in @ai/core/offer) and this file
// replaces each with an escaped value. The page is one response with no request to Stripe from the
// browser, it works with JavaScript off, and the inline script's CSP hash is unaffected because no
// token sits inside it.
//
// SERVED LIKE THE OTHER PUBLIC PAGES: exempt from the global limit (a room on one Wi-Fi address opens
// it in the same minute, D-028), `Referrer-Policy: same-origin` so a plain form post carries a real
// Origin, `noindex` in the page itself. Unlike them, `no-store`: the page holds live prices.
//
// FORM-ACTION. Helmet's CSP sets `form-action 'self'`, and browsers apply that to the redirect after a
// form is sent: the no-JS form's 303 to checkout.stripe.com would be blocked. This page's own response
// adds `https://checkout.stripe.com` to `form-action`, and no other response does.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { requireSameOrigin } from '../auth';
import { getDb } from '../db/client';
import { accounts, orders } from '../db/schema';
import { clock, randomIds } from '../lib/clock';
import {
  AGREEMENT_VERSION,
  CHECKOUT_ERRORS,
  ERROR_FIELD,
  OFFER_SMS_CONSENT_TEXT,
  checkoutBody,
  checkoutSessionParams,
  renewalAmounts,
  renewalSentence,
  validateCheckout,
} from '../billing/checkout';
import type { CheckoutErrorCode } from '../billing/checkout';
import {
  AGENTS_FIRST_CHARGE_AT,
  CARDS,
  CARTS,
  CART_IDS,
  LOOKUP_KEYS,
  PLAN_NAMES,
  TOKEN_PATTERN,
  dollars,
  longDay,
  priceWords,
  renewalText,
} from '../billing/catalog';
import type { Cart, CartId, CartState, PlanKind } from '../billing/catalog';
import { foundingOpen } from '../billing/config';
import type { OfferConfig } from '../billing/config';
import { hasPrices } from '../billing/prices';
import type { PriceCache, PriceMap } from '../billing/prices';
import type { BillingStripe } from '../billing/stripe';
import { errorReason, handleStripeEvent, markEvent, recordEvent } from '../billing/webhook';
import type { BillingLog } from '../billing/provision';
import { FORM_CONTENT_TYPE } from './ai101';
import { isJsonContentType, JSON_CONTENT_TYPE } from '../auth';

export const OFFER_PATH = '/offer';
export const FORUM_PATH = '/forum';
export const WELCOME_PATH = '/offer/welcome';
export const CHECKOUT_PATH = '/api/checkout';
export const OFFER_API_PATH = '/api/offer';
export const ORDER_STATUS_PATH = '/api/offer/order-status';
export const WEBHOOK_PATH = '/api/stripe/webhook';

/** A room's worth of buyers on one address in a minute, with room to spare; one host cannot flood it. */
export const CHECKOUT_RATE_MAX = 120;
/** The welcome page polls this every few seconds while a payment is confirming, from a room of phones. */
export const ORDER_STATUS_RATE_MAX = 600;
export const CHECKOUT_BODY_LIMIT = 8 * 1024;
/** Stripe's events are small; a Checkout Session with every field expanded is a few KB. */
export const WEBHOOK_BODY_LIMIT = 256 * 1024;

export interface OfferPages {
  offer?: string | null;
  welcome?: string | null;
}

export interface OfferRouteOptions {
  pages?: OfferPages;
  config: OfferConfig;
  /** Null when `STRIPE_SECRET_KEY` is not set: the page shows the fallback links. */
  stripe: BillingStripe | null;
  /** Verifies a webhook signature; separate from `stripe` so verifying needs no API key. */
  verify: BillingStripe['constructEvent'] | null;
  prices: PriceCache;
  /** Whether a database is configured: the order, status, waitlist and webhook routes need one. */
  database: boolean;
}

// --- filling a page --------------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value: string): string => value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);

/** Replace every `%%token%%` with its escaped value; a token with no value becomes empty. */
export function fillTokens(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(TOKEN_PATTERN, (_m, name: string) => esc(values[name] ?? ''));
}

/** What every cart shows right now. */
export function cartStates(
  config: OfferConfig,
  prices: PriceMap | null,
  stripeReady: boolean,
  now: number,
): Record<CartId, CartState> {
  const out = {} as Record<CartId, CartState>;
  for (const id of CART_IDS) {
    const cart = CARTS[id];
    if (!config.open) out[id] = 'soon';
    else if (cart.founding && !foundingOpen(config, now)) out[id] = 'closed';
    else if (stripeReady && hasPrices(prices, cart.items)) out[id] = 'checkout';
    else if (config.paymentLinks[id]) out[id] = 'link';
    else out[id] = 'soon';
  }
  return out;
}

/** The page as a whole: any cart with a form, else any with a link, else "opens soon". */
const offerState = (states: Record<CartId, CartState>): 'checkout' | 'links' | 'soon' =>
  Object.values(states).includes('checkout') ? 'checkout' : Object.values(states).includes('link') ? 'links' : 'soon';

/** "Sunday, November 15", the way the page says a date this year. */
const dayOfYear = (t: number): string => longDay(t).replace(/, \d{4}$/, '');

export interface OfferFill {
  config: OfferConfig;
  prices: PriceMap | null;
  stripeReady: boolean;
  now: number;
  campaign: 'forum' | null;
  src: string | null;
  /** The cart a `?cart=` link chose. */
  selected: CartId | null;
  /** A refused no-JS post, echoed back as `?error=`. */
  error: CheckoutErrorCode | null;
}

export function offerValues(f: OfferFill): Record<string, string> {
  const states = cartStates(f.config, f.prices, f.stripeReady, f.now);
  const values: Record<string, string> = {
    'offer-state': offerState(states),
    founding: foundingOpen(f.config, f.now) ? 'open' : 'closed',
    'founding-closes': dayOfYear(f.config.foundingClosesAt),
    'login-day': dayOfYear(f.config.invitesFrom),
    campaign: f.campaign ?? '',
    src: f.src ?? '',
    'page-path': f.campaign === 'forum' ? FORUM_PATH : OFFER_PATH,
    error: f.error ? CHECKOUT_ERRORS[f.error] : '',
    'error-field': f.error ? ERROR_FIELD[f.error] : '',
  };
  for (const key of LOOKUP_KEYS) {
    const p = f.prices?.[key];
    values[`price:${key}`] = p ? dollars(p.unitAmount) : '';
  }
  const words = priceWords(
    Object.fromEntries(LOOKUP_KEYS.flatMap((k) => (f.prices?.[k] ? [[k, f.prices[k]!.unitAmount]] : []))),
  );
  for (const card of CARDS) {
    values[`headline:${card}`] = words.headline[card];
    values[`unit:${card}`] = words.unit[card];
    values[`terms:${card}`] = words.terms[card];
  }
  for (const id of CART_IDS) values[`cartline:${id}`] = words.cartline[id];
  // The first open cart is chosen when no link chose one, so the form never posts without a plan.
  const firstOpen = CART_IDS.find((id) => states[id] === 'checkout') ?? null;
  const chosen = f.selected && states[f.selected] === 'checkout' ? f.selected : firstOpen;
  for (const id of CART_IDS) {
    const cart = CARTS[id];
    values[`state:${id}`] = states[id];
    values[`link:${id}`] = f.config.paymentLinks[id] ?? '';
    values[`checked:${id}`] = id === chosen ? 'checked' : '';
    values[`renewal:${id}`] =
      f.prices && hasPrices(f.prices, cart.items) ? renewalText(cart, renewalAmounts(cart, f.prices), f.now) : '';
  }
  return values;
}

/** The welcome page's facts for one Checkout Session. */
export interface WelcomeFill {
  /** `confirmed` once the webhook has marked it paid; `pending` before; `unknown` for no such session. */
  state: 'confirmed' | 'pending' | 'unknown';
  /** True for an agent plan's saved card with nothing charged yet. */
  trialing?: boolean;
  plan: PlanKind | null;
  sessionId: string | null;
  now: number;
  config: OfferConfig;
}

export function welcomeValues(w: WelcomeFill): Record<string, string> {
  const intake = w.plan ? w.config.intakeUrls[w.plan] : undefined;
  const held = w.now < w.config.invitesFrom;
  return {
    'welcome-state': w.state,
    'plan-name': w.plan ? PLAN_NAMES[w.plan] : '',
    login: held
      ? `Your login arrives by email on ${dayOfYear(w.config.invitesFrom)}, with your welcome email.`
      : 'Your login arrives by email within a few minutes.',
    'intake-url': intake ?? '',
    'intake-state': intake ? 'link' : 'email',
    'session-id': w.sessionId ?? '',
    'portal-url': w.config.portalLoginUrl ?? '',
    'paid-line': w.trialing
      ? `Your card is saved, and nothing is charged until ${dayOfYear(AGENTS_FIRST_CHARGE_AT)}.`
      : 'Your payment is in, and Stripe has emailed your receipt.',
  };
}

// --- helpers ---------------------------------------------------------------------------------------

const SRC = /^[a-z0-9_-]{1,32}$/i;
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

const queryOf = (req: FastifyRequest): Record<string, string | undefined> =>
  (req.query ?? {}) as Record<string, string | undefined>;

function cartParam(raw: string | undefined): CartId | null {
  return raw !== undefined && (CART_IDS as readonly string[]).includes(raw) ? (raw as CartId) : null;
}

function errorParam(raw: string | undefined): CheckoutErrorCode | null {
  return raw !== undefined && Object.hasOwn(CHECKOUT_ERRORS, raw) ? (raw as CheckoutErrorCode) : null;
}

/** Adds Stripe's hosted Checkout to `form-action` on this response alone. See the header. */
function allowCheckoutFormAction(reply: FastifyReply): void {
  const csp = reply.getHeader('content-security-policy');
  if (typeof csp !== 'string') return;
  reply.header(
    'content-security-policy',
    csp.replace(/form-action 'self'/, "form-action 'self' https://checkout.stripe.com"),
  );
}

/** Where Stripe sends the buyer back to: the site the page is served on. */
export function offerBaseUrl(req: FastifyRequest, env: NodeJS.ProcessEnv = process.env): string {
  const configured = (env.OFFER_BASE_URL ?? '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const marketing = (env.MARKETING_HOST ?? '').trim();
  if (marketing) return `https://${marketing}`;
  return `${req.protocol}://${req.headers.host ?? 'localhost'}`;
}

const sendPage = (reply: FastifyReply, html: string): FastifyReply =>
  reply
    .code(200)
    .type('text/html; charset=utf-8')
    .header('cache-control', 'no-store')
    .header('referrer-policy', 'same-origin')
    .send(html);

// --- registration ----------------------------------------------------------------------------------

export async function registerOfferRoutes(app: FastifyInstance, options: OfferRouteOptions): Promise<void> {
  const { config, prices } = options;
  const offerPage = options.pages?.offer ?? null;
  const welcomePage = options.pages?.welcome ?? null;
  const log = app.log as unknown as BillingLog;
  const now = (): number => clock.now();

  const currentPrices = async (): Promise<PriceMap | null> => (options.stripe ? prices.get(now()) : null);

  // The offer page, at both of its addresses.
  for (const path of [OFFER_PATH, FORUM_PATH]) {
    const campaign = path === FORUM_PATH ? 'forum' : null;
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (offerPage === null) return reply.code(404).send({ error: 'Not found' });
      const q = queryOf(req);
      const values = offerValues({
        config,
        prices: await currentPrices(),
        stripeReady: options.stripe !== null && options.database,
        now: now(),
        campaign,
        src: q.src && SRC.test(q.src) ? q.src : null,
        selected: cartParam(q.cart),
        error: errorParam(q.error),
      });
      allowCheckoutFormAction(reply);
      return sendPage(reply, fillTokens(offerPage, values));
    });
  }

  app.get(WELCOME_PATH, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (welcomePage === null) return reply.code(404).send({ error: 'Not found' });
    const raw = queryOf(req).session_id;
    const sessionId = raw && SESSION_ID.test(raw) ? raw : null;
    let state: WelcomeFill['state'] = 'unknown';
    let plan: PlanKind | null = null;
    let trialing = false;
    if (sessionId && options.database) {
      const [order] = await getDb()
        .select({ status: orders.status, plan: orders.plan })
        .from(orders)
        .where(eq(orders.stripeSessionId, sessionId))
        .limit(1);
      if (order) {
        plan = order.plan as PlanKind;
        trialing = order.status === 'trialing';
        state =
          order.status === 'paid' || order.status === 'trialing'
            ? 'confirmed'
            : order.status === 'pending'
              ? 'pending'
              : 'unknown';
      } else {
        // A fallback Payment Link's session has no order until its webhook lands, usually seconds later.
        state = 'pending';
      }
    }
    return sendPage(
      reply,
      fillTokens(welcomePage, welcomeValues({ state, plan, sessionId, now: now(), config, trialing })),
    );
  });

  app.get(OFFER_API_PATH, { config: { rateLimit: false } }, async (): Promise<unknown> => {
    const p = await currentPrices();
    const states = cartStates(config, p, options.stripe !== null && options.database, now());
    return {
      open: config.open,
      founding: { open: foundingOpen(config, now()), closesAt: new Date(config.foundingClosesAt).toISOString() },
      carts: CART_IDS.map((id) => {
        const cart = CARTS[id];
        return {
          id,
          plan: cart.plan,
          option: cart.option,
          name: PLAN_NAMES[cart.plan],
          state: states[id],
          founding: cart.founding,
          prices: cart.items.map((key) => ({
            lookupKey: key,
            amount: p?.[key]?.unitAmount ?? null,
            currency: p?.[key]?.currency ?? null,
            interval: p?.[key]?.interval ?? null,
          })),
          renewal: p && hasPrices(p, cart.items) ? renewalText(cart, renewalAmounts(cart, p), now()) : null,
          paymentLink: config.paymentLinks[id] ?? null,
        };
      }),
    };
  });

  if (!options.database) return;

  app.get(
    ORDER_STATUS_PATH,
    { config: { rateLimit: { max: ORDER_STATUS_RATE_MAX, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const raw = queryOf(req).session_id;
      if (!raw || !SESSION_ID.test(raw)) return reply.code(400).send({ error: 'Expected a session_id.' });
      const [order] = await getDb()
        .select({ status: orders.status, plan: orders.plan })
        .from(orders)
        .where(eq(orders.stripeSessionId, raw))
        .limit(1);
      if (!order) return reply.code(404).send({ status: 'unknown' });
      return { status: order.status, plan: order.plan, name: PLAN_NAMES[order.plan as PlanKind] };
    },
  );

  await registerCheckout(app, options, log);
  await registerWebhook(app, options, log);
}

// --- checkout --------------------------------------------------------------------------------------

async function registerCheckout(app: FastifyInstance, options: OfferRouteOptions, log: BillingLog): Promise<void> {
  const { config } = options;
  await app.register(async (scope) => {
    // The no-JS form's body, parsed here and nowhere else (routes/ai101.ts gives the reason).
    scope.addContentTypeParser(
      FORM_CONTENT_TYPE,
      { parseAs: 'string', bodyLimit: CHECKOUT_BODY_LIMIT },
      (_req, body, done) => {
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      },
    );

    scope.post(
      CHECKOUT_PATH,
      {
        bodyLimit: CHECKOUT_BODY_LIMIT,
        preHandler: requireSameOrigin,
        config: { rateLimit: { max: CHECKOUT_RATE_MAX, timeWindow: '1 minute' } },
      },
      async (req, reply): Promise<FastifyReply> => {
        const ct = req.headers['content-type'];
        const kind = isJsonContentType(ct)
          ? 'json'
          : ct?.split(';')[0]?.trim().toLowerCase() === FORM_CONTENT_TYPE
            ? 'form'
            : null;
        if (kind === null)
          return reply.code(415).send({ error: `Checkout takes ${JSON_CONTENT_TYPE} or ${FORM_CONTENT_TYPE}.` });

        const raw = (req.body ?? {}) as Record<string, unknown>;
        // The no-JS form has one renewal box per cart (`renew-<cart>`); only the chosen cart's counts.
        const cartId = typeof raw.cart === 'string' ? raw.cart : '';
        const body = { ...raw, renew: raw.renew ?? raw[`renew-${cartId}`] };
        const parsed = checkoutBody.safeParse(body);
        if (!parsed.success) return reply.code(400).send({ error: 'Expected the offer form.' });

        const page = parsed.data.campaign === 'forum' ? FORUM_PATH : OFFER_PATH;
        const refuse = (code: CheckoutErrorCode, cart: CartId | null, status = 400): FastifyReply => {
          const fallback = cart ? (config.paymentLinks[cart] ?? null) : null;
          if (kind === 'form') {
            const q = new URLSearchParams({ error: code, ...(cart ? { cart } : {}) });
            return reply.redirect(`${page}?${q.toString()}#checkout`, 303);
          }
          return reply
            .code(status)
            .send({ error: CHECKOUT_ERRORS[code], field: ERROR_FIELD[code], code, ...(fallback ? { fallback } : {}) });
        };

        const verdict = validateCheckout(parsed.data);
        if (verdict.kind === 'spam') {
          log.info({}, 'checkout: honeypot filled; nothing stored');
          return kind === 'form'
            ? reply.redirect(page, 303)
            : reply.code(400).send({ error: CHECKOUT_ERRORS.cart, field: 'cart' });
        }
        if (verdict.kind === 'invalid') return refuse(verdict.code, verdict.cart);
        const entry = verdict.entry;
        const cart: Cart = entry.cart;
        const t = clock.now();

        if (!config.open) return refuse('closed', cart.id, 409);
        // A session started before the close can still be paid within its hour; a new one cannot start.
        if (cart.founding && !foundingOpen(config, t)) return refuse('founding', cart.id, 409);
        const p = options.stripe ? await options.prices.get(t) : null;
        if (!options.stripe || !hasPrices(p, cart.items)) return refuse('stripe', cart.id, 503);

        const renewal = renewalSentence(entry, p, t);
        const orderId = randomIds()('ord');
        const db = getDb();
        // A failed write is caught here, never handed to app.ts's error handler: drizzle's message
        // carries every bound value, which here is the buyer's name, email and phone (routes/ai101.ts).
        const dbFailed = (err: unknown): FastifyReply => {
          log.error({ order: orderId, cart: cart.id, reason: errorReason(err) }, 'checkout: database write failed');
          return refuse('stripe', cart.id, 500);
        };
        try {
          await db.insert(orders).values({
            id: orderId,
            plan: cart.plan,
            option: cart.option,
            origin: 'offer',
            status: 'pending',
            name: entry.name,
            email: entry.email,
            phone: entry.phone,
            company: entry.company,
            crm: entry.crm,
            teamSize: entry.teamSize,
            src: entry.src,
            campaign: entry.campaign,
            agreementVersion: AGREEMENT_VERSION,
            agreementAcceptedAt: t,
            renewalConsentAt: renewal ? t : null,
            renewalConsentText: renewal,
            smsConsent: entry.sms,
            smsConsentAt: entry.sms ? t : null,
            smsConsentText: entry.sms ? OFFER_SMS_CONSENT_TEXT : null,
            createdAt: t,
          });
        } catch (err) {
          return dbFailed(err);
        }

        // A buyer who already has an account pays as the same Stripe customer.
        const [existing] = await db
          .select({ customer: accounts.stripeCustomerId })
          .from(accounts)
          .where(and(eq(accounts.ownerEmail, entry.email)))
          .limit(1);

        let session: { id: string; url: string };
        try {
          session = await options.stripe.createCheckoutSession(
            checkoutSessionParams({
              cart,
              orderId,
              email: entry.email,
              customerId: existing?.customer ?? null,
              campaign: entry.campaign,
              prices: p,
              baseUrl: offerBaseUrl(req),
              cancelPath: `${page}?cart=${cart.id}#checkout`,
              now: t,
              renewal,
            }),
            orderId,
          );
        } catch (err) {
          log.error(
            { order: orderId, cart: cart.id, reason: errorReason(err) },
            'checkout: Stripe did not open a session',
          );
          return refuse('stripe', cart.id, 502);
        }
        try {
          await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, orderId));
        } catch (err) {
          return dbFailed(err);
        }
        log.info(
          { order: orderId, cart: cart.id, session: session.id, campaign: entry.campaign, src: entry.src },
          'checkout: session opened',
        );
        return kind === 'form' ? reply.redirect(session.url, 303) : reply.code(200).send({ url: session.url });
      },
    );
  });
}

// --- the webhook -----------------------------------------------------------------------------------

async function registerWebhook(app: FastifyInstance, options: OfferRouteOptions, log: BillingLog): Promise<void> {
  await app.register(async (scope) => {
    // The signature is over the exact bytes Stripe sent, so this route keeps them: no JSON parse first.
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: WEBHOOK_BODY_LIMIT }, (_req, body, done) =>
      done(null, body),
    );

    scope.post(
      WEBHOOK_PATH,
      { bodyLimit: WEBHOOK_BODY_LIMIT, config: { rateLimit: false } },
      async (req, reply): Promise<FastifyReply> => {
        const secret = options.config.stripeWebhookSecret;
        if (!secret || !options.verify) {
          log.error({}, 'stripe webhook: STRIPE_WEBHOOK_SECRET is not set; answering 503 so Stripe retries');
          return reply.code(503).send({ error: 'Not configured.' });
        }
        const signature = req.headers['stripe-signature'];
        if (typeof signature !== 'string' || !Buffer.isBuffer(req.body))
          return reply.code(400).send({ error: 'Missing signature.' });

        let event;
        try {
          event = options.verify(req.body, signature, secret);
        } catch {
          log.warn({}, 'stripe webhook: bad signature');
          return reply.code(400).send({ error: 'Bad signature.' });
        }

        const db = getDb();
        const t = clock.now();
        const seen = await recordEvent(db, event, t);
        if (seen === 'done') return reply.code(200).send({ received: true, duplicate: true });

        try {
          const result = await handleStripeEvent(event, {
            stripe: options.stripe,
            config: options.config,
            prices: options.prices,
            log,
            now: () => clock.now(),
            db,
          });
          await markEvent(db, event.id, clock.now(), null);
          log.info({ event: event.id, type: event.type, result, retry: seen === 'retry' }, 'stripe webhook: handled');
          return reply.code(200).send({ received: true });
        } catch (err) {
          const reason = errorReason(err);
          await markEvent(db, event.id, clock.now(), reason);
          log.error({ event: event.id, type: event.type, reason }, 'stripe webhook: failed; Stripe will retry');
          return reply.code(500).send({ error: 'Failed; retry.' });
        }
      },
    );
  });
}
