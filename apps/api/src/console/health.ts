// System Health and the Build hub's API (D-169, spec §§ 7.1–7.2), registered by `routes.ts`:
//
//   GET /api/console/health  `{ asOf, tiles, attention, seatPressure, deploys }` (`@ai/core`
//                            console-health.ts). `console.view` (Owner, Admin, Support). `deploys` is
//                            null for a role without `ops.read` (Support sees no ops page, D3).
//   GET /api/console/skills  the `skills` table, read-only, by title: `{ rows, nextCursor }` (50 a page,
//                            200 at most). `console.view`. No file keys: they are bucket paths.
//
// THE COMPOSER. Each tile reads one SOURCE (two for Failed webhooks), injected (`HealthSources`) so a
// test, and a server where a source isn't set up, can stand in for it. Every source runs on its own,
// bounded by `SOURCE_TIMEOUT_MS`, and is settled: a throw, a timeout or a refusal becomes that tile's
// `unavailable` with its reason (`not_configured`, `failed`, Stripe's two), logged by the source's name
// and the error's class, never its message (Stripe's quotes a redacted key, D-163). The answer is
// never a 500 because a source broke.
//
// GET handlers that write: none. Nothing here writes to the database or to Stripe; the guard's audit
// row for a refused staff member is the only row either route can cause.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, count, desc, isNotNull, isNull, sql } from 'drizzle-orm';
import { CONSOLE_PAGE_DEFAULT, CONSOLE_PAGE_MAX, CONSOLE_PLAN_LABELS, HEALTH_SEAT_CAP, HEALTH_WINDOW_MS, composeHealth, consoleCan } from '@ai/core';
import type {
  ConsoleSkillRow,
  ConsolePage,
  HealthAttention,
  HealthBilling,
  HealthDeploys,
  HealthIncident,
  HealthInputs,
  HealthJobs,
  HealthUnavailable,
  HealthWorkspace,
  Settled,
  SkillStatus,
} from '@ai/core';
import type { SkillSet } from '@ai/core/offer';
import { requireSession, viewerOrThrow } from '../auth';
import { cohortSeatsSold } from '../billing/provision';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { skills, stripeEvents } from '../db/schema';
import { clock } from '../lib/clock';
import { crmSyncReport } from '../routes/crm-sync';
import { billingSummary, localRefs, openInvoices } from './billing';
import type { BillingDeps } from './billing';
import { consoleError, requireConsole } from './guard';
import { decodeCursor, encodeCursor, listWorkspaces } from './records';
import { StripeScopeError } from './stripe-read';

export const HEALTH_PATHS = {
  health: '/api/console/health',
  skills: '/api/console/skills',
} as const;

/** A source that this server has no way to read (yet, or by configuration): its tile's `not_configured`. */
export class HealthNotConfigured extends Error {
  constructor(readonly source: string) {
    super(`${source} is not configured`);
    this.name = 'HealthNotConfigured';
  }
}

/** Billing with no Stripe key (D-163's "Stripe isn't connected"). */
class StripeNotConnected extends Error {
  constructor() {
    super('stripe not connected');
    this.name = 'StripeNotConnected';
  }
}

/** Each tile's source. Every one may throw; `HealthNotConfigured` reads as "Not configured". */
export interface HealthSources {
  /** `EventHub.clients()`: browsers on THIS server's `/api/events`. */
  browsers(): number;
  /** Sign-ins since `since`, from `api_metrics` on the auth routes, 429s left out. */
  signIns(since: number): Promise<{ attempts: number; ok: number }>;
  billing(now: number): Promise<HealthBilling>;
  stripeWebhooks(): Promise<{ total: number; rows: Extract<HealthAttention, { kind: 'webhook' }>[] }>;
  ghl(): Promise<{ gaveUp: number; retrying: number }>;
  jobs(since: number): Promise<HealthJobs>;
  incidents(): Promise<HealthIncident[]>;
  seats(): Promise<{ sold: number; cap: number }>;
  workspaces(): Promise<HealthWorkspace[]>;
  deploys(): Promise<HealthDeploys>;
}

export interface HealthDeps {
  /** The SSE hub's client count; null where there is no hub (the fixture-only API never registers this). */
  events?: { clients(): number } | null;
  billing?: BillingDeps;
  /** A test's stand-ins, each replacing one real source. */
  sources?: Partial<HealthSources>;
  /** A test's shorter `SOURCE_TIMEOUT_MS`. */
  timeoutMs?: number;
}

/** How long one source may take before its tile reads unavailable. */
export const SOURCE_TIMEOUT_MS = 5000;

/** The newest errored Stripe events the attention list may show. */
const STRIPE_ROWS = 6;

// --- the real sources ----------------------------------------------------------------------------

const notYet = (source: string) => async (): Promise<never> => {
  throw new HealthNotConfigured(source);
};

async function billingSource(deps: BillingDeps | undefined, db: Database, now: number): Promise<HealthBilling> {
  const stripe = deps?.stripe;
  if (!deps || !stripe) throw new StripeNotConnected();
  const [summary, open, refs] = await Promise.all([billingSummary(db, stripe, await deps.prices.get(now), now), openInvoices(stripe), localRefs(db)]);
  const failed = open
    .filter((i) => i.attemptCount > 0)
    .sort((a, b) => b.created - a.created || (a.id < b.id ? -1 : 1))
    .map((i): Extract<HealthAttention, { kind: 'payment' }> => {
      const ws = refs.workspaceOf(i.customerId);
      const plan = refs.planOf(i.subscriptionId);
      return {
        kind: 'payment',
        invoiceId: i.id,
        customer: i.customerName ?? ws?.name ?? null,
        teamId: ws?.teamId ?? null,
        plan: plan ? CONSOLE_PLAN_LABELS[plan.kind] : null,
        amountCents: i.amountRemainingCents,
        attempts: i.attemptCount,
        // Stripe's retry schedule isn't readable with Billing's scopes (D-163): never guessed.
        retriesLeft: null,
      };
    });
  return { failedPayments: summary.failedPayments, mrrCents: summary.mrr.cents, activeSubscriptions: summary.mrr.activeSubscriptions, failed };
}

async function stripeWebhookSource(db: Database) {
  const failed = and(isNotNull(stripeEvents.error), isNull(stripeEvents.processedAt));
  const [[total], rows] = await Promise.all([
    db.select({ n: count() }).from(stripeEvents).where(failed),
    db
      .select({ id: stripeEvents.id, type: stripeEvents.type, receivedAt: stripeEvents.receivedAt, error: stripeEvents.error })
      .from(stripeEvents)
      .where(failed)
      .orderBy(desc(stripeEvents.receivedAt))
      .limit(STRIPE_ROWS),
  ]);
  return {
    total: Number(total?.n ?? 0),
    rows: rows.map((r) => ({ kind: 'webhook' as const, eventId: r.id, eventType: r.type, receivedAt: Number(r.receivedAt), error: r.error, attempts: null })),
  };
}

async function ghlSource() {
  const report = await crmSyncReport();
  let gaveUp = 0;
  let retrying = 0;
  for (const c of Object.values(report.counts)) {
    gaveUp += c.gaveUp;
    retrying += c.retrying;
  }
  return { gaveUp, retrying };
}

/** Every workspace, for seat pressure (a few hundred teams at most; `listWorkspaces` pages them). */
async function workspaceSource(db: Database): Promise<HealthWorkspace[]> {
  const out: HealthWorkspace[] = [];
  let after: Parameters<typeof listWorkspaces>[2]['after'] = null;
  for (let i = 0; i < 20; i++) {
    const page = await listWorkspaces(db, {}, { after, limit: CONSOLE_PAGE_MAX });
    out.push(...page.rows);
    if (!page.next) return out;
    after = page.next;
  }
  throw new Error('too many workspaces');
}

export function realHealthSources(deps: HealthDeps): HealthSources {
  const db = () => getDb();
  return {
    browsers: () => {
      if (!deps.events) throw new HealthNotConfigured('events');
      return deps.events.clients();
    },
    signIns: notYet('api_metrics'),
    billing: (now) => billingSource(deps.billing, db(), now),
    stripeWebhooks: () => stripeWebhookSource(db()),
    ghl: ghlSource,
    jobs: notYet('job_ticks'),
    incidents: notYet('incidents'),
    seats: async () => ({ sold: await cohortSeatsSold(db()), cap: HEALTH_SEAT_CAP }),
    workspaces: () => workspaceSource(db()),
    deploys: notYet('deploys'),
  };
}

// --- settling ------------------------------------------------------------------------------------

function reasonOf(e: unknown): HealthUnavailable {
  if (e instanceof HealthNotConfigured) return 'not_configured';
  if (e instanceof StripeNotConnected) return 'stripe_not_connected';
  if (e instanceof StripeScopeError) return 'stripe_permission_missing';
  return 'failed';
}

async function settleOne<T>(req: FastifyRequest, name: string, read: () => T | Promise<T>, timeoutMs: number): Promise<Settled<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      Promise.resolve().then(read),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    return { ok: true, value };
  } catch (e) {
    const reason = reasonOf(e);
    // The class only: an error's message may quote what it read (Stripe's quotes a redacted key).
    if (reason === 'failed') req.log.warn({ source: name, err: e instanceof Error ? e.name : typeof e }, 'console health: a source failed');
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/** Every source at once, each settled on its own. */
export async function readHealth(req: FastifyRequest, s: HealthSources, now: number, opsRead: boolean, timeoutMs: number = SOURCE_TIMEOUT_MS): Promise<HealthInputs> {
  const since = now - HEALTH_WINDOW_MS;
  const settle = <T>(name: string, read: () => T | Promise<T>) => settleOne(req, name, read, timeoutMs);
  const [browsers, signIns, billing, stripeWebhooks, ghl, jobs, incidents, seats, workspaces, deploys] = await Promise.all([
    settle('browsers', () => s.browsers()),
    settle('signIns', () => s.signIns(since)),
    settle('billing', () => s.billing(now)),
    settle('stripeWebhooks', () => s.stripeWebhooks()),
    settle('ghl', () => s.ghl()),
    settle('jobs', () => s.jobs(since)),
    settle('incidents', () => s.incidents()),
    settle('seats', () => s.seats()),
    settle('workspaces', () => s.workspaces()),
    opsRead ? settle('deploys', () => s.deploys()) : Promise.resolve(null),
  ]);
  return { browsers, signIns, billing, stripeWebhooks, ghl, jobs, incidents, seats, workspaces, deploys };
}

// --- the routes ----------------------------------------------------------------------------------

const roleOf = (req: FastifyRequest): string | null => {
  const v = viewerOrThrow(req);
  return v.user.kind === 'staff' ? (v.user.staffRole ?? null) : null;
};

const pageSize = (raw: unknown): number | null => {
  if (raw === undefined || raw === '') return CONSOLE_PAGE_DEFAULT;
  const n = typeof raw === 'string' && /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  return n >= 1 ? Math.min(n, CONSOLE_PAGE_MAX) : null;
};

export function registerHealthRoutes(scope: FastifyInstance, deps: HealthDeps, rate: { config: { rateLimit: { max: number; timeWindow: string } } }): void {
  const sources: HealthSources = { ...realHealthSources(deps), ...(deps.sources ?? {}) };
  const opts = { ...rate, preHandler: [requireSession, requireConsole('console.view')] };

  scope.get(HEALTH_PATHS.health, opts, async (req, reply): Promise<FastifyReply> => {
    const now = clock.now();
    const inputs = await readHealth(req, sources, now, consoleCan(roleOf(req), 'ops.read'), deps.timeoutMs);
    return reply.send(composeHealth(inputs, now));
  });

  scope.get(HEALTH_PATHS.skills, opts, async (req, reply): Promise<FastifyReply> => {
    const q = (req.query ?? {}) as Record<string, unknown>;
    const size = pageSize(q.limit);
    if (size === null) return consoleError(reply, 'invalid_query', 'That limit isn’t valid.');
    const after = q.cursor === undefined || q.cursor === '' ? null : decodeCursor(q.cursor);
    if (q.cursor !== undefined && q.cursor !== '' && !after) return consoleError(reply, 'invalid_query', 'That cursor isn’t valid.');
    const rows = await getDb()
      .select({ id: skills.id, title: skills.title, sets: skills.sets, free: skills.free, status: skills.status, releasedAt: skills.releasedAt })
      .from(skills)
      .where(after ? sql`(lower(${skills.title}), ${skills.id}) > (${after.name}, ${after.id})` : undefined)
      .orderBy(sql`lower(${skills.title})`, skills.id)
      .limit(size + 1);
    const page: ConsolePage<ConsoleSkillRow> = {
      rows: rows.slice(0, size).map((r) => ({
        id: r.id,
        title: r.title,
        sets: r.sets as SkillSet,
        free: r.free,
        status: r.status as SkillStatus,
        releasedAt: Number(r.releasedAt),
      })),
      nextCursor: null,
    };
    const last = page.rows[page.rows.length - 1];
    if (rows.length > size && last) page.nextCursor = encodeCursor({ name: last.title.toLowerCase(), id: last.id });
    return reply.send(page);
  });
}
