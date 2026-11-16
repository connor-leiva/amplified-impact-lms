// The Admin Console's Billing, read-only (D-163, spec § 7.6, Console PR 4). Registered by
// `registerConsoleRoutes` in its scope, so its `private, no-store` hook covers every answer here,
// refusals and 429s included.
//
//   GET /api/console/billing/summary        § 7.6's summary: MRR, failed payments, refunds (30 days),
//                                           the plan lines, the AI Accelerator (D-154's count)
//   GET /api/console/billing/customers      `?cursor&limit` → { rows, nextCursor }: every account with a
//                                           Stripe customer, by name
//   GET /api/console/billing/subscriptions  `?cursor&limit`: Stripe's subscriptions, newest first
//   GET /api/console/billing/invoices       `?cursor&limit`: Stripe's invoices (draft, open, paid, void,
//                                           uncollectible), newest first, with `refundableCents`
//   GET /api/console/billing/failed         `?cursor&limit`: open invoices Stripe has tried to collect,
//                                           cross-referenced with the local orders and plans
//   GET /api/console/billing/refunds        `?cursor&limit`: Stripe's refunds, with the staff member
//                                           behind a Console refund (its metadata and audit row)
//   GET /api/console/billing/scopes         which Read permissions the key has, as presence only
//
// Every route is `billing.read` (Owner, Admin, Support: Support reads, D3) and a read: 60 a minute per
// session (the 5-a-minute billing limit is for PR 5's actions). Each row names its Stripe Dashboard page
// in the key's mode. No route writes anything (no GET handler writes); the only audit row is the guard's
// for a refused staff member. Stripe unset: 503 `stripe_not_connected`. A Read permission missing: 503
// `stripe_permission_missing` naming it. Stripe failing otherwise: 502 `stripe_unavailable`.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, inArray, ne } from 'drizzle-orm';
import {
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  CONSOLE_PLAN_LABELS,
  acceleratorFigures,
  billingLineLabel,
  buildBillingSummary,
  isPlanKind,
  planLine,
  primaryPlan,
  refundReasonOf,
  stripeDashboardUrl,
  stripeScopeMessage,
  subscriptionLine,
  subscriptionMrr,
} from '@ai/core';
import type {
  BillingCustomerRow,
  BillingFailedRow,
  BillingInvoiceRow,
  BillingRefundRow,
  BillingScopes,
  BillingSubscription,
  BillingSubscriptionRow,
  BillingSummary,
  BillingWorkspaceRef,
  ConsolePage,
  PriceBook,
  StripeMode,
} from '@ai/core';
import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import type { PlanKind, PlanStatus } from '@ai/core/offer';
import { requireSession } from '../auth';
import type { PriceCache } from '../billing/prices';
import { cohortSeatsSold } from '../billing/provision';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { accounts, auditLog, orders, plans, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { consoleError, requireConsole } from './guard';
import { decodeCursor, encodeCursor } from './records';
import { CONSOLE_STRIPE_TTL_MS, StripeReadError, StripeScopeError, probeStripeScopes } from './stripe-read';
import type { ConsoleStripe, ReadInvoice, StripePage } from './stripe-read';

export const BILLING_PATHS = {
  billingSummary: '/api/console/billing/summary',
  billingCustomers: '/api/console/billing/customers',
  billingSubscriptions: '/api/console/billing/subscriptions',
  billingInvoices: '/api/console/billing/invoices',
  billingFailed: '/api/console/billing/failed',
  billingRefunds: '/api/console/billing/refunds',
  billingScopes: '/api/console/billing/scopes',
} as const;

/** What the routes are handed (`app.ts`): the cached read client, the offer's price cache, the key's mode. */
export interface BillingDeps {
  stripe: ConsoleStripe | null;
  prices: PriceCache;
  mode: StripeMode;
}

/** A whole list, page by page, bounded: past the bound the figure would be partial, so it is an error. */
const MAX_PAGES = 50;
export async function readAll<T>(page: (after: string | undefined) => Promise<StripePage<T>>, idOf: (t: T) => string): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const p = await page(after);
    out.push(...p.data);
    if (!p.hasMore || !p.data.length) return out;
    after = idOf(p.data[p.data.length - 1]!);
  }
  throw new StripeReadError('too_many');
}

/** `fn` over `items`, at most `n` at a time, in order. */
async function mapLimit<T, U>(items: readonly T[], n: number, fn: (t: T) => Promise<U>): Promise<U[]> {
  const out = new Array<U>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

// --- local cross-references ----------------------------------------------------------------------

interface LocalRefs {
  /** A Stripe customer's workspace, by its account (or an order that names it). */
  workspaceOf: (customerId: string | null) => BillingWorkspaceRef | null;
  /** A subscription's local plan and order. */
  planOf: (subscriptionId: string | null) => { kind: PlanKind; orderId: string } | null;
  /** Every account with a Stripe customer: its workspace and its plans. */
  customers: { customerId: string; name: string; workspace: BillingWorkspaceRef; plans: { kind: PlanKind; status: PlanStatus; seats: number; createdAt: number }[] }[];
}

async function localRefs(db: Database): Promise<LocalRefs> {
  const accts = await db.select({ id: accounts.id, teamId: accounts.teamId, name: teams.name, own: accounts.name, customer: accounts.stripeCustomerId }).from(accounts).leftJoin(teams, eq(teams.id, accounts.teamId));
  const planRows = await db.select({ accountId: plans.accountId, kind: plans.kind, status: plans.status, seats: plans.seats, sub: plans.stripeSubscriptionId, orderId: plans.orderId, createdAt: plans.createdAt }).from(plans);
  const orderRows = await db.select({ id: orders.id, plan: orders.plan, accountId: orders.accountId, customer: orders.stripeCustomerId, sub: orders.stripeSubscriptionId }).from(orders);
  const ws = new Map(accts.map((a) => [a.id, { teamId: a.teamId, name: a.name ?? a.own }]));
  const byCustomer = new Map<string, string>();
  for (const a of accts) if (a.customer) byCustomer.set(a.customer, a.id);
  for (const o of orderRows) if (o.customer && o.accountId && !byCustomer.has(o.customer)) byCustomer.set(o.customer, o.accountId);
  const bySub = new Map<string, { kind: PlanKind; orderId: string }>();
  for (const o of orderRows) if (o.sub && isPlanKind(o.plan)) bySub.set(o.sub, { kind: o.plan, orderId: o.id });
  for (const p of planRows) if (p.sub && isPlanKind(p.kind)) bySub.set(p.sub, { kind: p.kind, orderId: p.orderId });
  return {
    workspaceOf: (c) => (c && byCustomer.has(c) ? (ws.get(byCustomer.get(c)!) ?? null) : null),
    planOf: (s) => (s ? (bySub.get(s) ?? null) : null),
    customers: [...byCustomer.entries()].flatMap(([customerId, accountId]) => {
      const workspace = ws.get(accountId);
      if (!workspace) return [];
      const mine = planRows
        .filter((p) => p.accountId === accountId && isPlanKind(p.kind))
        .map((p) => ({ kind: p.kind as PlanKind, status: p.status as PlanStatus, seats: p.seats, createdAt: Number(p.createdAt) }));
      return [{ customerId, name: workspace.name, workspace, plans: mine }];
    }),
  };
}

// --- the summary ----------------------------------------------------------------------------------

/** Every subscription MRR and the summary count: active, past due and trialing. */
const liveSubscriptions = async (stripe: ConsoleStripe): Promise<BillingSubscription[]> =>
  (
    await Promise.all(
      (['active', 'past_due', 'trialing'] as const).map((status) =>
        readAll((after) => stripe.listSubscriptions({ status, limit: 100, startingAfter: after }), (s) => s.id),
      ),
    )
  ).flat();

const openInvoices = (stripe: ConsoleStripe): Promise<ReadInvoice[]> =>
  readAll((after) => stripe.listInvoices({ status: 'open', limit: 100, startingAfter: after }), (i) => i.id);

/** The AI Accelerator from the database: D-154's own counter (imported, never copied) and its seats' orders. */
export async function acceleratorFromDb(db: Database, opensAt: number = COURSE_OPENS_AT) {
  const sold = await cohortSeatsSold(db);
  const seats = await db
    .select({ option: plans.option, paymentsMade: orders.paymentsMade, amountTotal: orders.amountTotal })
    .from(plans)
    .leftJoin(orders, eq(orders.id, plans.orderId))
    .where(and(eq(plans.kind, 'cohort'), ne(plans.status, 'ended')));
  return acceleratorFigures(
    seats.map((s) => ({ option: s.option, paymentsMade: s.paymentsMade ?? 0, amountTotal: s.amountTotal })),
    sold,
    opensAt,
  );
}

const DAY = 86_400_000;

export async function billingSummary(db: Database, stripe: ConsoleStripe, prices: PriceBook | null, now: number): Promise<BillingSummary> {
  const [subscriptions, open, refunds, accelerator] = await Promise.all([
    liveSubscriptions(stripe),
    openInvoices(stripe),
    readAll((after) => stripe.listRefunds({ limit: 100, startingAfter: after, createdGte: Math.floor((now - 30 * DAY) / 1000) }), (r) => r.id),
    acceleratorFromDb(db),
  ]);
  return buildBillingSummary({ asOf: now, subscriptions, openInvoices: open, refunds, prices, accelerator });
}

// --- paging ---------------------------------------------------------------------------------------

type Parsed<T> = { ok: true; value: T } | { ok: false; field: string };
const STRIPE_ID = /^[a-z]{2,4}_[A-Za-z0-9]{1,64}$/;

/** `limit` (1–200, 50) and a cursor that `valid` accepts, from the query string. */
function pageOf<C>(req: FastifyRequest, valid: (c: string) => C | null): Parsed<{ size: number; cursor: C | null }> {
  const q = (req.query ?? {}) as Record<string, unknown>;
  let size = CONSOLE_PAGE_DEFAULT;
  if (q.limit !== undefined && q.limit !== '') {
    const n = typeof q.limit === 'string' && /^\d{1,4}$/.test(q.limit) ? Number(q.limit) : NaN;
    if (!(n >= 1)) return { ok: false, field: 'limit' };
    size = Math.min(n, CONSOLE_PAGE_MAX);
  }
  if (q.cursor === undefined || q.cursor === '') return { ok: true, value: { size, cursor: null } };
  const cursor = typeof q.cursor === 'string' ? valid(q.cursor) : null;
  return cursor === null ? { ok: false, field: 'cursor' } : { ok: true, value: { size, cursor } };
}

/** `size` rows of a Stripe list after `cursor`, in pages of at most 100 (Stripe's own limit). */
async function stripeRows<T extends { id: string }>(read: (limit: number, after?: string) => Promise<StripePage<T>>, size: number, cursor: string | null) {
  const rows: T[] = [];
  let after = cursor ?? undefined;
  let more = true;
  while (rows.length < size && more) {
    const p = await read(Math.min(100, size - rows.length), after);
    rows.push(...p.data);
    more = p.hasMore && p.data.length > 0;
    after = rows[rows.length - 1]?.id;
  }
  return { rows, next: more && rows.length ? rows[rows.length - 1]!.id : null };
}

// --- the lists ------------------------------------------------------------------------------------

async function subscriptionRows(stripe: ConsoleStripe, refs: LocalRefs, mode: StripeMode, size: number, cursor: string | null): Promise<ConsolePage<BillingSubscriptionRow>> {
  const { rows, next } = await stripeRows((limit, after) => stripe.listSubscriptions({ status: 'all', limit, startingAfter: after }), size, cursor);
  return {
    rows: rows.map((s) => {
      const line = subscriptionLine(s);
      return {
        id: s.id,
        customerId: s.customerId,
        workspace: refs.workspaceOf(s.customerId),
        planLabel: line ? billingLineLabel(line) : null,
        status: s.status,
        mrrCents: line === 'cohort' ? null : Math.round(subscriptionMrr(s)),
        url: stripeDashboardUrl(mode, 'subscriptions', s.id),
      };
    }),
    nextCursor: next,
  };
}

async function invoiceRows(stripe: ConsoleStripe, refs: LocalRefs, mode: StripeMode, size: number, cursor: string | null): Promise<ConsolePage<BillingInvoiceRow>> {
  const { rows, next } = await stripeRows((limit, after) => stripe.listInvoices({ limit, startingAfter: after }), size, cursor);
  // A paid or tried invoice's card and refunds are on its charge (API 2025-10-29: through its payment).
  const charges = await mapLimit(rows, 6, (i) =>
    (i.status === 'paid' || i.attemptCount > 0) && (i.chargeId || i.paymentIntentId)
      ? stripe.retrieveCharge({ chargeId: i.chargeId, paymentIntentId: i.paymentIntentId })
      : Promise.resolve(null),
  );
  return {
    rows: rows.map((i, n) => {
      const c = charges[n] ?? null;
      const refunded = c?.refundedCents ?? 0;
      return {
        id: i.id,
        customerId: i.customerId,
        customerName: i.customerName ?? refs.workspaceOf(i.customerId)?.name ?? null,
        workspace: refs.workspaceOf(i.customerId),
        amountCents: i.totalCents,
        status: i.status,
        attemptCount: i.attemptCount,
        refundedCents: refunded,
        refundableCents: i.status === 'paid' ? Math.max(0, (c?.amountCents ?? i.amountPaidCents) - refunded) : 0,
        paymentMethod: c?.paymentMethod ?? null,
        created: i.created,
        url: stripeDashboardUrl(mode, 'invoices', i.id),
      };
    }),
    nextCursor: next,
  };
}

async function failedRows(stripe: ConsoleStripe, refs: LocalRefs, mode: StripeMode, size: number, start: number): Promise<ConsolePage<BillingFailedRow>> {
  const all = (await openInvoices(stripe)).filter((i) => i.attemptCount > 0).sort((a, b) => b.created - a.created || (a.id < b.id ? -1 : 1));
  const page = all.slice(start, start + size);
  const charges = await mapLimit(page, 6, (i) =>
    i.chargeId || i.paymentIntentId ? stripe.retrieveCharge({ chargeId: i.chargeId, paymentIntentId: i.paymentIntentId }) : Promise.resolve(null),
  );
  return {
    rows: page.map((i, n) => {
      const plan = refs.planOf(i.subscriptionId);
      return {
        invoiceId: i.id,
        customerName: i.customerName ?? refs.workspaceOf(i.customerId)?.name ?? null,
        workspace: refs.workspaceOf(i.customerId),
        planLabel: plan ? CONSOLE_PLAN_LABELS[plan.kind] : null,
        orderId: plan?.orderId ?? null,
        amountCents: i.amountRemainingCents,
        declineReason: charges[n]?.failure ?? null,
        attempts: i.attemptCount,
        nextRetryAt: i.nextPaymentAttempt,
        url: stripeDashboardUrl(mode, 'invoices', i.id),
      };
    }),
    nextCursor: start + size < all.length ? String(start + size) : null,
  };
}

async function refundRows(db: Database, stripe: ConsoleStripe, mode: StripeMode, size: number, cursor: string | null): Promise<ConsolePage<BillingRefundRow>> {
  const { rows, next } = await stripeRows((limit, after) => stripe.listRefunds({ limit, startingAfter: after, withInvoice: true }), size, cursor);
  // A Console refund (PR 5) carries `console_actor` and `console_audit_id`: the audit row has its staff
  // member and their reason (the reason is never sent to Stripe).
  const auditIds = rows.map((r) => Number(r.metadata.console_audit_id)).filter((n) => Number.isSafeInteger(n) && n > 0);
  const audits = auditIds.length
    ? await db.select({ id: auditLog.id, actor: auditLog.actorUserId, reason: auditLog.reason }).from(auditLog).where(and(inArray(auditLog.id, auditIds), eq(auditLog.action, 'billing.refund')))
    : [];
  const actorIds = [...new Set([...audits.map((a) => a.actor), ...rows.map((r) => r.metadata.console_actor)].filter((x): x is string => !!x))];
  const names = actorIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds)) : [];
  return {
    rows: rows.map((r) => {
      const a = audits.find((x) => String(x.id) === r.metadata.console_audit_id) ?? null;
      const who = a?.actor ?? r.metadata.console_actor ?? null;
      const payment = r.paymentIntentId ?? r.chargeId;
      return {
        id: r.id,
        invoiceId: r.invoiceId,
        amountCents: r.amountCents,
        reason: a?.reason ?? refundReasonOf(r.reason),
        byStaff: who ? { userId: who, name: names.find((u) => u.id === who)?.name ?? null } : null,
        status: r.status,
        created: r.created,
        url: payment ? stripeDashboardUrl(mode, 'payments', payment) : null,
      };
    }),
    nextCursor: next,
  };
}

async function customerRows(stripe: ConsoleStripe, refs: LocalRefs, mode: StripeMode, size: number, after: { name: string; id: string } | null): Promise<ConsolePage<BillingCustomerRow>> {
  const all = refs.customers
    .map((c) => ({ ...c, key: c.name.toLowerCase() }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.customerId < b.customerId ? -1 : 1))
    .filter((c) => !after || c.key > after.name || (c.key === after.name && c.customerId > after.id));
  const page = all.slice(0, size);
  const mrr = new Map<string, number>();
  if (page.length) for (const s of await liveSubscriptions(stripe)) if (s.customerId) mrr.set(s.customerId, (mrr.get(s.customerId) ?? 0) + subscriptionMrr(s));
  const last = page[page.length - 1];
  return {
    rows: page.map((c) => {
      const p = primaryPlan(c.plans.map((x) => ({ ...x })));
      return {
        id: c.customerId,
        name: c.name,
        workspace: c.workspace,
        planKind: p?.kind ?? null,
        planLabel: p ? planLine(p.kind, p.seats) : null,
        planStatus: p?.status ?? null,
        mrrCents: p?.kind === 'cohort' ? null : Math.round(mrr.get(c.customerId) ?? 0),
        url: stripeDashboardUrl(mode, 'customers', c.customerId),
      };
    }),
    nextCursor: all.length > size && last ? encodeCursor({ name: last.key, id: last.customerId }) : null,
  };
}

// --- the routes -----------------------------------------------------------------------------------

/** A Stripe failure as the Console's answer; anything else is not ours to name and goes on up. */
function stripeRefusal(req: FastifyRequest, reply: FastifyReply, e: unknown): FastifyReply {
  if (e instanceof StripeScopeError) {
    req.log.warn({ scope: e.scope }, 'console billing: the Stripe key lacks a Read permission');
    return reply.code(503).send({ error: stripeScopeMessage(e.scope), code: 'stripe_permission_missing', scope: e.scope });
  }
  if (e instanceof StripeReadError) {
    req.log.warn({ reason: e.reason }, 'console billing: a Stripe read failed');
    return consoleError(reply, 'stripe_unavailable');
  }
  throw e;
}

export function registerBillingRoutes(scope: FastifyInstance, deps: BillingDeps, rate: { config: { rateLimit: { max: number; timeWindow: string } } }): void {
  const opts = { ...rate, preHandler: [requireSession, requireConsole('billing.read')] };
  // The summary itself is kept 10 minutes too, so its `asOf` says when it was read.
  let summary: { at: number; value: Promise<BillingSummary> } | null = null;
  let scopes: { at: number; value: Promise<BillingScopes> } | null = null;

  const route = <T>(path: string, read: (stripe: ConsoleStripe, req: FastifyRequest, reply: FastifyReply) => Promise<T | FastifyReply>) =>
    scope.get(path, opts, async (req, reply): Promise<FastifyReply> => {
      if (!deps.stripe) return consoleError(reply, 'stripe_not_connected');
      try {
        const out = await read(deps.stripe, req, reply);
        return reply.sent ? reply : reply.send(out);
      } catch (e) {
        return stripeRefusal(req, reply, e);
      }
    });
  const invalid = (reply: FastifyReply, field: string) => consoleError(reply, 'invalid_query', `That ${field} isn’t valid.`);
  const stripeCursor = (c: string) => (STRIPE_ID.test(c) ? c : null);

  route(BILLING_PATHS.billingSummary, async (stripe) => {
    const now = clock.now();
    if (!summary || now - summary.at >= CONSOLE_STRIPE_TTL_MS) {
      const value = (async () => billingSummary(getDb(), stripe, await deps.prices.get(now), now))();
      summary = { at: now, value };
      value.catch(() => summary?.value === value && (summary = null));
    }
    return summary.value;
  });

  route(BILLING_PATHS.billingCustomers, async (stripe, req, reply) => {
    const page = pageOf(req, (c) => decodeCursor(c));
    if (!page.ok) return invalid(reply, page.field);
    return customerRows(stripe, await localRefs(getDb()), deps.mode, page.value.size, page.value.cursor);
  });

  route(BILLING_PATHS.billingSubscriptions, async (stripe, req, reply) => {
    const page = pageOf(req, stripeCursor);
    if (!page.ok) return invalid(reply, page.field);
    return subscriptionRows(stripe, await localRefs(getDb()), deps.mode, page.value.size, page.value.cursor);
  });

  route(BILLING_PATHS.billingInvoices, async (stripe, req, reply) => {
    const page = pageOf(req, stripeCursor);
    if (!page.ok) return invalid(reply, page.field);
    return invoiceRows(stripe, await localRefs(getDb()), deps.mode, page.value.size, page.value.cursor);
  });

  route(BILLING_PATHS.billingFailed, async (stripe, req, reply) => {
    const page = pageOf(req, (c) => (/^\d{1,6}$/.test(c) ? Number(c) : null));
    if (!page.ok) return invalid(reply, page.field);
    return failedRows(stripe, await localRefs(getDb()), deps.mode, page.value.size, page.value.cursor ?? 0);
  });

  route(BILLING_PATHS.billingRefunds, async (stripe, req, reply) => {
    const page = pageOf(req, stripeCursor);
    if (!page.ok) return invalid(reply, page.field);
    return refundRows(getDb(), stripe, deps.mode, page.value.size, page.value.cursor);
  });

  route(BILLING_PATHS.billingScopes, async (stripe) => {
    const now = clock.now();
    if (!scopes || now - scopes.at >= CONSOLE_STRIPE_TTL_MS) {
      const value = probeStripeScopes(stripe).then((s): BillingScopes => ({ asOf: now, mode: deps.mode, scopes: s }));
      scopes = { at: now, value };
    }
    return scopes.value;
  });
}
