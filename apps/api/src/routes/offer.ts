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

import {
  BUILDS_ICS_PATH,
  BUILDS_ICS_URL,
  OFFICE_HOURS_ICS_PATH,
  OFFICE_HOURS_ICS_URL,
  SCHEDULE_ICS_PATH,
  calendarFiles,
  cohortCalendarFiles,
  cohortScheduleIcs,
} from './offer-calendar';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { cohortIcsPath } from '@ai/core/cohort-learner';
import { requireSession } from '../auth';
import { viewerCohortId } from '../lib/course-access';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { cohorts as cohortsTable, orders } from '../db/schema';
import { clock } from '../lib/clock';
import {
  AGENT_PLAN_FIRST_CHARGE_AT,
  CARTS,
  CART_IDS,
  HELP_EMAIL,
  LOOKUP_KEYS,
  PLAN_NAMES,
  TOKEN_PATTERN,
  cartFor,
  longDay,
  mountainDeadline,
} from '../billing/catalog';
import { cohortCartItems, cohortCartLink, cohortSelling, foundingOpenFor, sellingEnvOf } from '@ai/core/cohort-selling';
import type { CohortSelling } from '@ai/core/cohort-selling';
import { onSaleOf, orderCohortId, sellingOf } from '../billing/cohort-sale';
import type { CartId, CartState, PlanKind } from '../billing/catalog';
import { cartItemName } from '../lib/analytics';
import { foundingOpen } from '../billing/config';
import { foundingValues } from '@ai/core/founding';
import type { OfferConfig } from '../billing/config';
import type { PriceCache, PriceMap } from '../billing/prices';
import type { BillingStripe } from '../billing/stripe';
import { errorReason, handleStripeEvent, markEvent, recordEvent } from '../billing/webhook';
import type { BillingLog } from '../billing/provision';
import { cohortSeatsSold } from '../billing/provision';
import { absolute } from '../email/templates/links';
import { checkoutPasswordUser } from './password';

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
 * The www site's pages served from here (D-111): their path, and the name of their built file
 * (`apps/web/dist/<name>.html`, from `apps/web/src/site/vite-plugin.ts`'s `SITE_PAGES`). The sales pages
 * are filled per request like /offer; a page with no token, like /free (D-116), passes through the
 * same fill unchanged.
 */
export const SALES_PAGES = { '/pricing': 'pricing', '/team-build': 'team-build', '/teams': 'teams', '/agents': 'agents', '/free': 'free', '/about': 'about', '/insiders': 'insiders' } as const;
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
 * R-5 Phase 5 (D-262, PLAN § 10.10): the cohort the AI Accelerator's two carts sell (`cohortOnSale`: the cohort whose
 * enrollment is open), with its settings, and whether its enrollment is open. With none open, the carts read "closed"
 * and the page's other cohort facts are December's.
 */
export interface OfferSale {
  selling: CohortSelling;
  open: boolean;
}

/** December, as the code sold it before R-5: its built-in values and the configuration's (a database with no cohort). */
export const builtInSale = (config: Pick<OfferConfig, 'foundingClosesAt' | 'paymentLinks'>): OfferSale => ({
  selling: cohortSelling({ cohorts: [] }, DEFAULT_COHORT_ID, sellingEnvOf(config)),
  open: true,
});

/**
 * What every cart shows right now: nothing sells while `OFFER_OPEN` is off; a founding cart closes at its close (the
 * AI Accelerator's at its cohort's, R-5 Phase 5; the Team Plan's at `FOUNDING_CLOSES_AT`); the AI Accelerator's two
 * carts sell out together at its cohort's cap (December's 15), and read "closed" while no cohort's enrollment is open;
 * a cart with no Payment Link set "opens soon".
 */
export function cartStates(config: OfferConfig, now: number, seatsSold: number, sale: OfferSale = builtInSale(config)): Record<CartId, CartState> {
  const out = {} as Record<CartId, CartState>;
  for (const id of CART_IDS) {
    const cart = CARTS[id];
    if (!config.open) out[id] = 'soon';
    else if (cart.plan === 'cohort') {
      const link = cohortCartLink(id as 'cohort-full' | 'cohort-two-pay', sale.selling);
      if (!sale.open) out[id] = 'closed';
      else if (sale.selling.founding && !foundingOpenFor(sale.selling, now)) out[id] = 'closed';
      else if (seatsSold >= sale.selling.capacity) out[id] = 'soldout';
      else if (link) out[id] = 'link';
      else out[id] = 'soon';
    } else if (cart.founding && !foundingOpen(config, now)) out[id] = 'closed';
    else if (config.paymentLinks[id]) out[id] = 'link';
    else out[id] = 'soon';
  }
  return out;
}

/** A cart's Payment Link: a cohort cart's is its cohort's (stored, or December's from the configuration). */
const linkOf = (config: OfferConfig, sale: OfferSale, id: CartId): string | null =>
  CARTS[id].plan === 'cohort' ? cohortCartLink(id as 'cohort-full' | 'cohort-two-pay', sale.selling) : (config.paymentLinks[id] ?? null);

/** When the page's founding facts close: the cohort on sale's, when it is founding, else the configuration's. */
const closesOf = (config: OfferConfig, sale: OfferSale): number =>
  sale.selling.founding && sale.selling.foundingClosesAt !== null ? sale.selling.foundingClosesAt : config.foundingClosesAt;

/** The page as a whole: `links` when any cart sells, else `soon`. */
const offerState = (states: Record<CartId, CartState>): 'links' | 'soon' => (Object.values(states).includes('link') ? 'links' : 'soon');

/** "Monday, November 16", the way the page says a date this year. */
const dayOfYear = (t: number): string => longDay(t).replace(/, \d{4}$/, '');

export interface OfferFill {
  config: OfferConfig;
  now: number;
  /** Where the visit came from: the link's `src`, or `forum` on /forum. */
  src: string | null;
  /** AI Accelerator seats sold so far, in the cohort on sale. */
  seatsSold: number;
  /** R-5 Phase 5 (D-262): the cohort on sale. Absent: December as before R-5 (`builtInSale`). */
  sale?: OfferSale;
}

export function offerValues(f: OfferFill): Record<string, string> {
  const sale = f.sale ?? builtInSale(f.config);
  const states = cartStates(f.config, f.now, f.seatsSold, sale);
  const closes = closesOf(f.config, sale);
  const values: Record<string, string> = {
    'offer-state': offerState(states),
    founding: f.now < closes ? 'open' : 'closed',
    'founding-closes': mountainDeadline(closes),
    invites: f.now < f.config.invitesFrom ? 'held' : 'sent',
    'login-day': dayOfYear(f.config.invitesFrom),
    'team-call': f.config.teamCallUrl ?? `mailto:${HELP_EMAIL}`,
    src: f.src ?? '',
  };
  for (const id of CART_IDS) {
    values[`state:${id}`] = states[id];
    // A link shows only while it sells: a closed, sold-out or unset one is an empty href the page hides.
    values[`link:${id}`] = states[id] === 'link' ? (linkOf(f.config, sale, id) ?? '') : '';
  }
  return values;
}

/** A sales page's tokens (D-111): the offer's, plus the founding countdown and the seats left (the cohort on sale's). */
export function salesValues(f: OfferFill): Record<string, string> {
  const sale = f.sale ?? builtInSale(f.config);
  return { ...offerValues(f), ...foundingValues(f.now, closesOf(f.config, sale), f.seatsSold, sale.selling.capacity) };
}

/** The welcome page's facts for one Checkout Session. */
export interface WelcomeFill {
  /** `confirmed` once the webhook has marked it paid; `pending` before; `unknown` for no such session. */
  state: 'confirmed' | 'pending' | 'unknown';
  /** True for a saved card with nothing charged yet: the Amplified Agent Plan before Jan 4, 2027 (D-106). */
  trialing?: boolean;
  plan: PlanKind | null;
  sessionId: string | null;
  now: number;
  config: OfferConfig;
  /** D-132: where this buyer sets a password, when `checkoutPasswordUser` allows it; else absent. */
  setPasswordUrl?: string;
  /**
   * D-155: what the order says was bought and paid, for the analytics `purchase` event: its cart, and
   * Stripe's `amount_total` (cents) and currency. Absent, or a null amount, reports 0.
   */
  purchase?: { cart: CartId | null; amountTotal: number | null; currency: string | null };
  /**
   * R-5 Phase 5 (D-262): the cohort whose calendar the buttons download: the order's (`ai_cohort`), else the cohort on
   * sale while the order is still confirming. December's are the bare files, as before (`cohortIcsPath`); absent or
   * December's, `CALENDAR_URL_*` still names another file when it is set.
   */
  calendarCohort?: string | null;
}

/**
 * The line under the welcome heading: what was charged. A trial charged nothing, so it says when the
 * first charge is instead of a receipt that was never sent: for the Agent Plan, Jan 4, 2027, the day
 * its agent skills open.
 */
function paidLine(w: Pick<WelcomeFill, 'trialing' | 'plan' | 'now'>): string {
  if (!w.trialing) return 'Your payment is in, and Stripe has emailed your receipt.';
  if (w.plan === 'agent_plan' && w.now < AGENT_PLAN_FIRST_CHARGE_AT) {
    return `Your card is saved. Nothing is charged until ${longDay(AGENT_PLAN_FIRST_CHARGE_AT)}, when your agent skills open.`;
  }
  return 'Your card is saved. Stripe emails your receipt with your first charge.';
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
    // The served files (offer-calendar.ts) unless a CALENDAR_URL_* variable names another, so the
    // welcome page's add-to-calendar buttons always download something.
    'calendar-builds': w.calendarCohort ? cohortIcsPath(BUILDS_ICS_URL, w.calendarCohort) : (builds ?? BUILDS_ICS_URL),
    'calendar-office-hours': w.calendarCohort ? cohortIcsPath(OFFICE_HOURS_ICS_URL, w.calendarCohort) : (officeHours ?? OFFICE_HOURS_ICS_URL),
    'calendar-state': 'links',
    'plan-name': w.plan ? PLAN_NAMES[w.plan] : '',
    login: held
      ? `Your login arrives by email on ${dayOfYear(w.config.invitesFrom)}, with your welcome email.`
      : 'Your login arrives by email within a few minutes.',
    'intake-url': intake ?? '',
    'intake-state': intake ? 'link' : 'email',
    'session-id': w.sessionId ?? '',
    'portal-url': w.config.portalLoginUrl ?? '',
    'paid-line': paidLine(w),
    'set-password': w.setPasswordUrl ?? '',
    ...purchaseValues(w),
  };
}

/**
 * D-155: the confirmed order, for the `purchase` event `/analytics.js` sends once per Checkout Session:
 * the session id (its transaction id), the amount Stripe charged (0 for a trial, and 0 rather than a
 * guess when the order has none), the currency and the product. Empty until the order is confirmed,
 * so a pending or unknown page reports nothing.
 */
function purchaseValues(w: WelcomeFill): Record<string, string> {
  const cart = w.purchase?.cart ?? null;
  if (w.state !== 'confirmed' || !w.sessionId || !cart) {
    return { 'purchase-id': '', 'purchase-value': '', 'purchase-currency': '', 'purchase-item': '', 'purchase-name': '' };
  }
  const cents = w.purchase?.amountTotal ?? 0;
  return {
    'purchase-id': w.sessionId,
    'purchase-value': (Math.max(0, cents) / 100).toFixed(2),
    'purchase-currency': (w.purchase?.currency ?? 'usd').toUpperCase(),
    'purchase-item': cart,
    'purchase-name': cartItemName(cart),
  };
}

// --- helpers ---------------------------------------------------------------------------------------

/** A path on the LMS host (`APP_URL`), or undefined when it is not configured: no link beats a dead one. */
function learnUrl(path: string): string | undefined {
  try {
    return absolute(path);
  } catch {
    return undefined;
  }
}

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
  const seatsSold = async (cohortId: string = DEFAULT_COHORT_ID): Promise<number> => {
    if (!options.database) return 0;
    try {
      return await cohortSeatsSold(getDb(), cohortId);
    } catch (err) {
      log.error({ reason: errorReason(err) }, 'offer: the seat count failed; showing the AI Accelerator links');
      return 0;
    }
  };

  /**
   * R-5 Phase 5 (D-262): the cohort on sale and its seats sold. With no database, or a read that fails, December as
   * before R-5 (`builtInSale`). With no cohort open, its carts read "closed" and the page's facts are December's.
   */
  const saleNow = async (): Promise<{ sale: OfferSale; sold: number }> => {
    if (!options.database) return { sale: builtInSale(config), sold: 0 };
    let sale: OfferSale;
    try {
      const env = sellingEnvOf(config);
      const on = await onSaleOf(getDb(), env);
      sale = on ? { selling: on.selling, open: true } : { selling: await sellingOf(getDb(), DEFAULT_COHORT_ID, env), open: false };
    } catch (err) {
      log.error({ reason: errorReason(err) }, 'offer: the cohort on sale could not be read; selling December as before');
      sale = builtInSale(config);
    }
    return { sale, sold: await seatsSold(sale.selling.cohortId) };
  };

  // The offer page, at both of its addresses.
  for (const path of [OFFER_PATH, FORUM_PATH]) {
    // The QR code's address: a waitlist sign-up from it says so, unless the link carries its own `src`.
    const campaign = path === FORUM_PATH ? 'forum' : null;
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (offerPage === null) return reply.code(404).send({ error: 'Not found' });
      const q = queryOf(req);
      const { sale, sold } = await saleNow();
      const values = offerValues({
        config,
        now: now(),
        src: q.src && SRC.test(q.src) ? q.src : campaign,
        seatsSold: sold,
        sale,
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
      const { sale, sold } = await saleNow();
      const values = salesValues({
        config,
        now: now(),
        src: q.src && SRC.test(q.src) ? q.src : null,
        seatsSold: sold,
        sale,
      });
      return sendPage(reply, fillTokens(page, values));
    });
  }

  // The welcome page's calendar files (Ampy's offer-pages brief): the Accelerator's builds and the
  // office hours every plan is invited to, built from the cohort's sessions as the database holds
  // them (D-173). One small read, cached an hour by the browser, so, like the sprint's file, no rate
  // limit. Without a database there is no calendar to serve.
  for (const [path, pick] of [
    [BUILDS_ICS_PATH, 'builds'],
    [OFFICE_HOURS_ICS_PATH, 'officeHours'],
    [SCHEDULE_ICS_PATH, 'schedule'],
  ] as const) {
    app.get(path, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
      if (!options.database) return reply.code(404).send({ error: 'Not found' });
      // R-5 Phase 4 (D-261): the learner portal's "Add all to calendar" for a cohort other than December names it
      // (`?cohort=`, `scheduleIcsPath`). That file is its learners' alone (staff may read it): signed in, and never
      // kept by anything between. Without one, December's file, exactly as before: the bare paths stay December's, as
      // a changed UID duplicates every event in a calendar subscribed to them (PLAN § 5.3).
      const named = queryOf(req).cohort;
      const cohort = named && named !== DEFAULT_COHORT_ID ? named : undefined;
      // R-5 Phase 5 (D-262): another cohort's builds and office hours, the welcome page's buttons for a buyer of it,
      // public as December's are, once it is past its draft.
      if (cohort && pick !== 'schedule') {
        const [row] = await getDb().select({ status: cohortsTable.status }).from(cohortsTable).where(eq(cohortsTable.id, cohort)).limit(1);
        const files = row && row.status !== 'draft' ? await cohortCalendarFiles(cohort) : null;
        if (!files) return reply.code(404).send({ error: 'Not found' });
        return reply.code(200).type('text/calendar; charset=utf-8').header('cache-control', 'public, max-age=3600').send(files[pick]);
      }
      if (cohort) {
        await requireSession.call(app, req, reply);
        if (reply.sent) return reply;
        const viewer = req.viewer;
        const mine =
          !!viewer &&
          (viewer.user.kind === 'staff' || viewer.user.cohortId === cohort || (await viewerCohortId(getDb(), viewer.user.id)) === cohort);
        const file = mine ? await cohortScheduleIcs(cohort) : null;
        if (!file) return reply.code(404).send({ error: 'Not found' });
        return reply.code(200).type('text/calendar; charset=utf-8').header('cache-control', 'private, no-store').send(file);
      }
      const files = await calendarFiles();
      return reply.code(200).type('text/calendar; charset=utf-8').header('cache-control', 'public, max-age=3600').send(files[pick]);
    });
  }

  /**
   * R-5 Phase 5 (D-262): whose calendar the welcome page's buttons download: the order's cohort, or, while the order is
   * still confirming, the cohort on sale. December's is the bare files (null), as before.
   */
  const welcomeCalendar = async (known: string | null | undefined): Promise<string | null> => {
    if (!options.database) return null;
    try {
      const id = known === undefined ? ((await onSaleOf(getDb(), sellingEnvOf(config)))?.id ?? null) : known;
      // December's files are the bare addresses, so its buttons keep `CALENDAR_URL_*` when it is set.
      return id && cohortIcsPath(BUILDS_ICS_URL, id) !== BUILDS_ICS_URL ? id : null;
    } catch {
      return null;
    }
  };

  app.get(WELCOME_PATH, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (welcomePage === null) return reply.code(404).send({ error: 'Not found' });
    const raw = queryOf(req).session_id;
    const sessionId = raw && SESSION_ID.test(raw) ? raw : null;
    let state: WelcomeFill['state'] = 'unknown';
    let plan: PlanKind | null = null;
    let trialing = false;
    let purchase: WelcomeFill['purchase'];
    let calendarCohort: string | null | undefined;
    if (sessionId && options.database) {
      const [order] = await getDb()
        .select({
          status: orders.status,
          plan: orders.plan,
          option: orders.option,
          amountTotal: orders.amountTotal,
          currency: orders.currency,
          cohortId: orders.cohortId,
        })
        .from(orders)
        .where(eq(orders.stripeSessionId, sessionId))
        .limit(1);
      if (order) {
        calendarCohort = order.plan === 'cohort' ? orderCohortId(order) : null;
        plan = order.plan as PlanKind;
        trialing = order.status === 'trialing';
        purchase = { cart: cartFor(order.plan, order.option ?? '')?.id ?? null, amountTotal: order.amountTotal, currency: order.currency };
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
    // D-132: the "Set Your Password" button, only for a session whose brand-new account may set one.
    let setPasswordUrl: string | undefined;
    if (state === 'confirmed' && sessionId && options.database) {
      const user = await checkoutPasswordUser(getDb(), sessionId, now(), config.invitesFrom);
      if (user) setPasswordUrl = learnUrl(`/set-password?checkout=${encodeURIComponent(sessionId)}`);
    }
    return sendPage(
      reply,
      fillTokens(
        welcomePage,
        welcomeValues({
          state,
          plan,
          sessionId,
          now: now(),
          config,
          trialing,
          setPasswordUrl,
          purchase,
          calendarCohort: await welcomeCalendar(calendarCohort),
        }),
      ),
    );
  });

  app.get(OFFER_API_PATH, { config: { rateLimit: false } }, async (): Promise<unknown> => {
    const p = await currentPrices();
    // R-5 Phase 5 (D-262, PLAN § 10.10): the AI Accelerator's facts are the cohort on sale's: its founding, its seats,
    // its lookup keys and its links. The answer keeps its shape, so the marketing pages read them as they always have.
    const { sale, sold } = await saleNow();
    const states = cartStates(config, now(), sold, sale);
    const closes = closesOf(config, sale);
    const cap = sale.selling.capacity;
    const own = (key: string) => !(LOOKUP_KEYS as readonly string[]).includes(key);
    const cohortKeys = [...cohortCartItems('cohort-full', sale.selling), ...cohortCartItems('cohort-two-pay', sale.selling)].filter(own);
    const extra = options.stripe && cohortKeys.length ? await prices.lookup?.(cohortKeys, now()) : null;
    const priceOf = (key: string) => (own(key) ? (extra?.[key] ?? null) : (p?.[key as (typeof LOOKUP_KEYS)[number]] ?? null));
    return {
      open: config.open,
      founding: { open: now() < closes, closesAt: new Date(closes).toISOString() },
      seats: { total: cap, sold, left: Math.max(0, cap - sold) },
      carts: CART_IDS.map((id) => {
        const cart = CARTS[id];
        const cohortCart = cart.plan === 'cohort';
        const items = cohortCart ? cohortCartItems(id as 'cohort-full' | 'cohort-two-pay', sale.selling) : cart.items;
        return {
          id,
          plan: cart.plan,
          option: cart.option,
          name: PLAN_NAMES[cart.plan],
          state: states[id],
          founding: cohortCart ? sale.selling.founding : cart.founding,
          prices: items.map((key) => ({
            lookupKey: key,
            amount: priceOf(key)?.unitAmount ?? null,
            currency: priceOf(key)?.currency ?? null,
            interval: priceOf(key)?.interval ?? null,
          })),
          paymentLink: linkOf(config, sale, id),
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
