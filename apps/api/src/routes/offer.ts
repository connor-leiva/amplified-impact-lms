// The offer's routes (D-073 to D-077, D-104). Every one is public; what stands in for a session is
// named on each.
//
//   GET  /offer, /forum              → the offer page, filled per request (prices, dates, which carts
//                                      sell); /forum also records `src` = `forum` on a waitlist sign-up
//   GET  /pricing                    → Programs and Pricing (D-111), filled the same way, plus the
//                                      founding countdown and the Accelerator's seats left
//   GET  /offer/welcome              → after Stripe: the plan, when the login arrives, the intake form
//   GET  /api/offer                  → the same facts as JSON: carts, live prices, founding, seats
//   GET  /api/offer/order-status     → `{ status, plan }` for a `session_id`, nothing personal
//   POST /api/checkout               → 410: the site's own checkout is retired (D-104)
//   POST /api/offer/waitlist         → the cohort waitlist (registered with the other sign-up forms
//                                      in routes/ai101.ts)
//   POST /api/stripe/webhook         → billing/webhook.ts
//
// EVERY PLAN IS BOUGHT THROUGH ITS STRIPE PAYMENT LINK (D-104). Ampy made the links and sets their
// URLs in Railway (`paymentLinkEnv` on each cart); their terms checkbox is the agreement's acceptance,
// which the webhook records. The page shows a cart's link while it sells: not after founding closes
// (the AI Accelerator and the Team Plan, Nov 30 at 11:59 PM Mountain), not once the Accelerator's 15
// seats are sold (both of its links, counted together), and not while `OFFER_OPEN` is off.
//
// THE PAGES ARE BUILT ONCE AND FILLED PER REQUEST. The links are set in Railway and change without a
// deploy, founding closes at a configured instant and seats sell. The prices are words in the page
// itself (Spring's page, D-105); `GET /api/offer` still reports Stripe's live amounts. So `apps/web` builds the page with
// `%%token%%`s (`OFFER_TOKENS` in @ai/core/offer) and this file replaces each with an escaped value.
// The page is one response with no request to Stripe from the browser and no script.
//
// SERVED LIKE THE OTHER PUBLIC PAGES: exempt from the global limit (a room on one Wi-Fi address opens
// it in the same minute, D-028), `Referrer-Policy: same-origin` so a plain form post carries a real
// Origin, `noindex` in the page itself. Unlike them, `no-store`: the page holds live prices.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { orders } from '../db/schema';
import { clock } from '../lib/clock';
import {
  CARTS,
  CART_IDS,
  COHORT_SEATS,
  HELP_EMAIL,
  PLAN_NAMES,
  TOKEN_PATTERN,
  longDay,
  mountainDeadline,
} from '../billing/catalog';
import type { CartId, CartState, PlanKind } from '../billing/catalog';
import { foundingOpen } from '../billing/config';
import { foundingValues } from '@ai/core/founding';
import type { OfferConfig } from '../billing/config';
import type { PriceCache, PriceMap } from '../billing/prices';
import type { BillingStripe } from '../billing/stripe';
import { errorReason, handleStripeEvent, markEvent, recordEvent } from '../billing/webhook';
import type { BillingLog } from '../billing/provision';
import { cohortSeatsSold } from '../billing/provision';

export const OFFER_PATH = '/offer';
export const FORUM_PATH = '/forum';
export const WELCOME_PATH = '/offer/welcome';
export const CHECKOUT_PATH = '/api/checkout';
export const OFFER_API_PATH = '/api/offer';
export const ORDER_STATUS_PATH = '/api/offer/order-status';
export const WEBHOOK_PATH = '/api/stripe/webhook';

/** The welcome page polls this every few seconds while a payment is confirming, from a room of phones. */
export const ORDER_STATUS_RATE_MAX = 600;
/** Stripe's events are small; a Checkout Session with every field expanded is a few KB. */
export const WEBHOOK_BODY_LIMIT = 256 * 1024;

/**
 * The www sales pages filled per request like /offer (D-111): their path, and the name of their built
 * file (`apps/web/dist/<name>.html`, from `apps/web/src/site/vite-plugin.ts`'s `SITE_PAGES`).
 */
export const SALES_PAGES = { '/pricing': 'pricing' } as const;
export type SalesPath = keyof typeof SALES_PAGES;

export interface OfferPages {
  offer?: string | null;
  welcome?: string | null;
  /** The sales pages by path; one that is missing or null answers 404. */
  sales?: Partial<Record<SalesPath, string | null>>;
}

export interface OfferRouteOptions {
  pages?: OfferPages;
  config: OfferConfig;
  /** Null when `STRIPE_SECRET_KEY` is not set: no live prices, and no subscription follow-ups. */
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

/**
 * What every cart shows right now: nothing sells while `OFFER_OPEN` is off; a founding cart closes at
 * `FOUNDING_CLOSES_AT`; the AI Accelerator's two carts sell out together at 15 seats; a cart with no
 * Payment Link set "opens soon".
 */
export function cartStates(config: OfferConfig, now: number, seatsSold: number): Record<CartId, CartState> {
  const out = {} as Record<CartId, CartState>;
  for (const id of CART_IDS) {
    const cart = CARTS[id];
    if (!config.open) out[id] = 'soon';
    else if (cart.founding && !foundingOpen(config, now)) out[id] = 'closed';
    else if (cart.plan === 'cohort' && seatsSold >= COHORT_SEATS) out[id] = 'soldout';
    else if (config.paymentLinks[id]) out[id] = 'link';
    else out[id] = 'soon';
  }
  return out;
}

/** The page as a whole: `links` when any cart sells, else `soon`. */
const offerState = (states: Record<CartId, CartState>): 'links' | 'soon' => (Object.values(states).includes('link') ? 'links' : 'soon');

/** "Monday, November 16", the way the page says a date this year. */
const dayOfYear = (t: number): string => longDay(t).replace(/, \d{4}$/, '');

export interface OfferFill {
  config: OfferConfig;
  now: number;
  /** Where the visit came from: the link's `src`, or `forum` on /forum. */
  src: string | null;
  /** AI Accelerator seats sold so far. */
  seatsSold: number;
}

export function offerValues(f: OfferFill): Record<string, string> {
  const states = cartStates(f.config, f.now, f.seatsSold);
  const values: Record<string, string> = {
    'offer-state': offerState(states),
    founding: foundingOpen(f.config, f.now) ? 'open' : 'closed',
    'founding-closes': mountainDeadline(f.config.foundingClosesAt),
    invites: f.now < f.config.invitesFrom ? 'held' : 'sent',
    'login-day': dayOfYear(f.config.invitesFrom),
    'team-call': f.config.teamCallUrl ?? `mailto:${HELP_EMAIL}`,
    src: f.src ?? '',
  };
  for (const id of CART_IDS) {
    values[`state:${id}`] = states[id];
    // A link shows only while it sells: a closed, sold-out or unset one is an empty href the page hides.
    values[`link:${id}`] = states[id] === 'link' ? (f.config.paymentLinks[id] ?? '') : '';
  }
  return values;
}

/** A sales page's tokens (D-111): the offer's, plus the founding countdown and the seats left. */
export function salesValues(f: OfferFill): Record<string, string> {
  return { ...offerValues(f), ...foundingValues(f.now, f.config.foundingClosesAt, f.seatsSold) };
}

/** The welcome page's facts for one Checkout Session. */
export interface WelcomeFill {
  /** `confirmed` once the webhook has marked it paid; `pending` before; `unknown` for no such session. */
  state: 'confirmed' | 'pending' | 'unknown';
  /** True for a saved card with nothing charged yet. No cart sells that way since D-104. */
  trialing?: boolean;
  plan: PlanKind | null;
  sessionId: string | null;
  now: number;
  config: OfferConfig;
}

export function welcomeValues(w: WelcomeFill): Record<string, string> {
  const intake = w.plan ? w.config.intakeUrls[w.plan] : undefined;
  const held = w.now < w.config.invitesFrom;
  const { builds, officeHours } = w.config.calendarUrls;
  return {
    'welcome-state': w.state,
    // The thank-you section for the plan bought (D-105): only once the webhook has confirmed it.
    product: w.state === 'confirmed' && w.plan ? w.plan : '',
    invites: held ? 'held' : 'sent',
    'login-day': dayOfYear(w.config.invitesFrom),
    'calendar-builds': builds ?? '',
    'calendar-office-hours': officeHours ?? '',
    'calendar-state': builds || officeHours ? 'links' : 'email',
    'plan-name': w.plan ? PLAN_NAMES[w.plan] : '',
    login: held
      ? `Your login arrives by email on ${dayOfYear(w.config.invitesFrom)}, with your welcome email.`
      : 'Your login arrives by email within a few minutes.',
    'intake-url': intake ?? '',
    'intake-state': intake ? 'link' : 'email',
    'session-id': w.sessionId ?? '',
    'portal-url': w.config.portalLoginUrl ?? '',
    'paid-line': w.trialing ? 'Your card is saved, and Stripe has emailed your receipt.' : 'Your payment is in, and Stripe has emailed your receipt.',
  };
}

// --- helpers ---------------------------------------------------------------------------------------

const SRC = /^[a-z0-9_-]{1,32}$/i;
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

const queryOf = (req: FastifyRequest): Record<string, string | undefined> =>
  (req.query ?? {}) as Record<string, string | undefined>;

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

  /**
   * AI Accelerator seats sold, from the plans provisioning wrote; 0 with no database. A failed count
   * must not take the page down in a room of buyers: it is logged and counted as 0, and each Stripe
   * link's own limit of 15 sales still holds.
   */
  const seatsSold = async (): Promise<number> => {
    if (!options.database) return 0;
    try {
      return await cohortSeatsSold(getDb());
    } catch (err) {
      log.error({ reason: errorReason(err) }, 'offer: the seat count failed; showing the AI Accelerator links');
      return 0;
    }
  };

  // The offer page, at both of its addresses.
  for (const path of [OFFER_PATH, FORUM_PATH]) {
    // The QR code's address: a waitlist sign-up from it says so, unless the link carries its own `src`.
    const campaign = path === FORUM_PATH ? 'forum' : null;
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (offerPage === null) return reply.code(404).send({ error: 'Not found' });
      const q = queryOf(req);
      const values = offerValues({
        config,
        now: now(),
        src: q.src && SRC.test(q.src) ? q.src : campaign,
        seatsSold: await seatsSold(),
      });
      return sendPage(reply, fillTokens(offerPage, values));
    });
  }

  // The sales pages (D-111): filled like the offer page, with the countdown and seats left besides.
  for (const path of Object.keys(SALES_PAGES) as SalesPath[]) {
    const page = options.pages?.sales?.[path] ?? null;
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (page === null) return reply.code(404).send({ error: 'Not found' });
      const q = queryOf(req);
      const values = salesValues({
        config,
        now: now(),
        src: q.src && SRC.test(q.src) ? q.src : null,
        seatsSold: await seatsSold(),
      });
      return sendPage(reply, fillTokens(page, values));
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
        // A Payment Link's session has no order until its webhook lands, usually seconds later.
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
    const sold = await seatsSold();
    const states = cartStates(config, now(), sold);
    return {
      open: config.open,
      founding: { open: foundingOpen(config, now()), closesAt: new Date(config.foundingClosesAt).toISOString() },
      seats: { total: COHORT_SEATS, sold, left: Math.max(0, COHORT_SEATS - sold) },
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
          paymentLink: config.paymentLinks[id] ?? null,
        };
      }),
    };
  });

  // The site's own checkout, retired (D-104): every plan is bought through its Payment Link. Any body
  // is accepted and ignored, so a page cached from before (a plain form post) gets the same answer.
  await app.register(async (scope) => {
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser('*', { parseAs: 'string', bodyLimit: 8 * 1024 }, (_req, _body, done) => done(null, null));
    scope.post(CHECKOUT_PATH, async (_req, reply): Promise<FastifyReply> =>
      reply.code(410).send({ error: 'The site checkout is retired. Every plan is bought through its Stripe Payment Link on /offer.' }),
    );
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

  await registerWebhook(app, options, log);
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
