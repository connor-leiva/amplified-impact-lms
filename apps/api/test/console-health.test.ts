// System Health and the Skills list (D-169, spec §§ 7.1–7.2), through the real router, guard and a
// real Postgres: the answer's shape, every tile's real source, each tile degrading on its own (a throw,
// a hang, Stripe's refusals) without a 500, deploys hidden from a role without ops.read, nothing
// written, and the Skills list's order, pages and refusals. Stripe is a fake (spec § 9).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { HEALTH_TILE_KEYS, seedForDatabase } from '@ai/core';
import type { BillingSubscription, ConsolePage, ConsoleSkillRow, HealthResponse } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { cohortSeatsSold } from '../src/billing/provision';
import { HEALTH_PATHS } from '../src/console/health';
import type { HealthSources } from '../src/console/health';
import type { ReadInvoice } from '../src/console/stripe-read';
import { accounts, ai101Waitlist, auditLog, orders, plans, skills, stripeEvents, users } from '../src/db/schema';
import { MAX_ATTEMPTS } from '../src/jobs/ghl-sync';
import { settleEmails } from '../src/auth';
import { fakeConsoleStripe } from './fake-console-stripe';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const DAY = 86_400_000;
const SENTINEL = 'rk_live_HEALTHSENTINEL4Q9Z';

const sub = (id: string, status: string, unitAmount: number, customerId: string | null = null): BillingSubscription => ({
  id,
  customerId,
  status,
  created: NOW - DAY,
  metadata: {},
  items: [{ lookupKey: 'agents_upto15_monthly', unitAmount, interval: 'month', intervalCount: 1, quantity: 1 }],
});
const inv = (id: string, attemptCount: number, over: Partial<ReadInvoice> = {}): ReadInvoice => ({
  id,
  customerId: 'cus_Harbor9',
  customerName: null,
  subscriptionId: 'sub_Harbor1',
  status: 'open',
  totalCents: 69500,
  amountPaidCents: 0,
  amountRemainingCents: 69500,
  attemptCount,
  created: NOW - 2 * DAY,
  nextPaymentAttempt: null,
  paymentIntentId: null,
  chargeId: null,
  ...over,
});

let app: App;
let fake: ReturnType<typeof fakeConsoleStripe>;

const boot = async (opts: { sources?: Partial<HealthSources>; stripe?: boolean; timeoutMs?: number } = {}) => {
  await app?.close();
  app = await build({
    logger: false,
    consoleBilling: { stripe: opts.stripe === false ? null : fake.stripe, mode: 'test' },
    console: { health: { sources: opts.sources, timeoutMs: opts.timeoutMs } },
  });
};

const get = async (path: string, userId: string | null = 'st1') =>
  app.inject({ method: 'GET', url: path, headers: userId ? { cookie: await app.signInAs(userId) } : {} });
const health = async (userId = 'st1') => {
  const res = await get(HEALTH_PATHS.health, userId);
  expect(res.statusCode, res.body.slice(0, 300)).toBe(200);
  return JSON.parse(res.body) as HealthResponse;
};

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  await db.insert(accounts).values([
    { id: 'a_harbor', teamId: 'harbor', ownerUserId: 'u_natasha', ownerEmail: 'natasha@harborpine.com', name: 'Harbor & Pine Group', stripeCustomerId: 'cus_Harbor9', createdAt: NOW - 60 * DAY, inviteSentAt: null },
    { id: 'a_north', teamId: 'northline', ownerUserId: 'u_alex', ownerEmail: 'alex@northlinerealty.com', name: 'Northline Realty Team', stripeCustomerId: 'cus_North1', createdAt: NOW - 30 * DAY, inviteSentAt: null },
  ]);
  const order = { origin: 'offer', currency: 'usd', paymentsMade: 1, status: 'paid' } as const;
  await db.insert(orders).values([
    { ...order, id: 'o_harbor', plan: 'agents', option: 'upto15', email: 'natasha@harborpine.com', accountId: 'a_harbor', stripeSubscriptionId: 'sub_Harbor1', createdAt: NOW - 60 * DAY },
    { ...order, id: 'o_north', plan: 'cohort', option: 'full', email: 'alex@northlinerealty.com', accountId: 'a_north', createdAt: NOW - 30 * DAY },
  ]);
  await db.insert(plans).values([
    // Harbor & Pine: a Team Plan of 7 seats (the team's), nearly full once the seed's members count.
    { id: 'p_harbor', accountId: 'a_harbor', kind: 'agents', option: 'upto15', seats: 16, status: 'active', startsAt: NOW - 60 * DAY, stripeSubscriptionId: 'sub_Harbor1', orderId: 'o_harbor', createdAt: NOW - 60 * DAY },
    // One AI Accelerator seat sold (D-154's counter).
    { id: 'p_north', accountId: 'a_north', kind: 'cohort', option: 'full', seats: 2, cohortId: 'dec26', status: 'active', startsAt: NOW - 30 * DAY, orderId: 'o_north', createdAt: NOW - 30 * DAY },
  ]);
  // Stripe deliveries: one errored and unprocessed (counts), one that failed then succeeded (the
  // webhook clears its error), one fine, one still waiting with no error.
  await db.insert(stripeEvents).values([
    { id: 'evt_bad', type: 'customer.subscription.updated', receivedAt: NOW - 3600_000, processedAt: null, error: 'provision:timeout' },
    { id: 'evt_retried', type: 'invoice.paid', receivedAt: NOW - 7200_000, processedAt: NOW - 7000_000, error: null },
    { id: 'evt_ok', type: 'checkout.session.completed', receivedAt: NOW - DAY, processedAt: NOW - DAY, error: null },
    { id: 'evt_waiting', type: 'invoice.created', receivedAt: NOW - 60_000, processedAt: null, error: null },
  ]);
  // A GHL row that gave up (out of attempts, never synced).
  await db.insert(ai101Waitlist).values({ id: 'w_1', firstName: 'Sam', email: 'sam@example.com', source: 'ai101', createdAt: NOW - DAY, ghlAttempts: MAX_ATTEMPTS, ghlError: 'contact:rejected:422' });
  await db.insert(skills).values([
    { id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, releasedAt: NOW - 40 * DAY, status: 'published' },
    { id: 'fub-pipeline-review', title: 'FUB Pipeline Review', sets: 'owner_ops', releasedAt: NOW - 40 * DAY, status: 'published' },
    { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', releasedAt: NOW - 10 * DAY, status: 'draft' },
  ]);
  fake = fakeConsoleStripe({ subscriptions: [sub('sub_Harbor1', 'active', 69500, 'cus_Harbor9'), sub('sub_T', 'trialing', 69500)], invoices: [inv('in_failed', 2), inv('in_fresh', 0)] }, SENTINEL);
  await boot();
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('GET /api/console/health (D-169)', () => {
  it('answers § 7.1’s shape from the real sources, with no-store', async () => {
    const res = await get(HEALTH_PATHS.health);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const r = JSON.parse(res.body) as HealthResponse;
    expect(Object.keys(r).sort()).toEqual(['asOf', 'attention', 'deploys', 'seatPressure', 'tiles']);
    expect(Object.keys(r.tiles)).toEqual([...HEALTH_TILE_KEYS]);
    expect(r.asOf).toBe(NOW);
    // This server's /api/events: nobody is connected in a test.
    expect(r.tiles.connectedBrowsers).toEqual({ value: 0, status: 'ok' });
    // Billing (the fake): one failed payment, MRR from the active subscription only.
    expect(r.tiles.failedPayments).toEqual({ value: 1, status: 'attention' });
    expect(r.tiles.mrr).toEqual({ value: 69500, status: 'ok', detail: { activeSubscriptions: 1 } });
    // stripe_events errored and unprocessed (1), plus GHL's gave-up row (1).
    expect(r.tiles.failedWebhooks).toEqual({ value: 2, status: 'attention', detail: { stripe: 1, ghl: 1 } });
    // D-154's own counter.
    expect(r.tiles.acceleratorSeats).toEqual({ value: await cohortSeatsSold(await testDatabase()), status: 'ok', detail: { cap: 15 } });
    expect(r.tiles.acceleratorSeats.value).toBe(1);
    expect(r.attention.map((a) => a.kind)).toEqual(['payment', 'webhook', 'ghl']);
    expect(r.attention[0]).toMatchObject({ kind: 'payment', invoiceId: 'in_failed', customer: 'Harbor & Pine Group', teamId: 'harbor', plan: 'Team Plan', amountCents: 69500, attempts: 2, retriesLeft: null });
    expect(r.attention[1]).toMatchObject({ kind: 'webhook', eventId: 'evt_bad', eventType: 'customer.subscription.updated', error: 'provision:timeout', attempts: null });
    // Seat pressure: the AI Accelerator and every workspace with a live plan, fullest first.
    expect(r.seatPressure!.map((s) => s.key)).toContain('accelerator');
    expect(r.seatPressure!.map((s) => s.key)).toContain('harbor');
  });

  it('a source this server can’t read yet reads "not configured", never a 500', async () => {
    const r = await health();
    // Wired by the stack's later merges (api_metrics, job_ticks, incidents, deploys).
    for (const k of ['signInSuccess', 'jobFailures', 'openIncidents'] as const) expect(r.tiles[k], k).toEqual({ value: null, status: 'unavailable', reason: 'not_configured' });
    expect(r.deploys).toEqual({ state: 'unavailable' });
  });

  it('each tile degrades on its own: a throw, a hang, a missing Stripe key, a missing scope', async () => {
    await boot({
      sources: {
        ghl: async () => {
          throw new Error(`boom ${SENTINEL}`);
        },
        seats: () => new Promise(() => {}),
      },
      timeoutMs: 50,
    });
    const r = await health();
    expect(r.tiles.failedWebhooks).toEqual({ value: null, status: 'unavailable', reason: 'failed' });
    expect(r.tiles.acceleratorSeats).toEqual({ value: null, status: 'unavailable', reason: 'failed' });
    expect(r.tiles.failedPayments.status).toBe('attention');
    expect(JSON.stringify(r)).not.toContain(SENTINEL);

    await boot({ stripe: false });
    const off = await health();
    expect(off.tiles.mrr).toEqual({ value: null, status: 'unavailable', reason: 'stripe_not_connected' });
    expect(off.tiles.failedPayments.reason).toBe('stripe_not_connected');
    expect(off.tiles.acceleratorSeats.value).toBe(1);

    fake.fail.listInvoices = 'permission';
    await boot();
    const scope = await health();
    expect(scope.tiles.mrr).toEqual({ value: null, status: 'unavailable', reason: 'stripe_permission_missing' });
    expect(JSON.stringify(scope)).not.toContain(SENTINEL);
  });

  it('composes injected sources: incidents lead, a covered job is not repeated, six at most', async () => {
    await boot({
      sources: {
        signIns: async () => ({ attempts: 40, ok: 30 }),
        jobs: async () => ({ jobs: ['ghl-orders', 'session-24h'], failures: [{ job: 'ghl-orders', failures: 3, lastAt: NOW - 60_000, error: 'http_401' }] }),
        incidents: async () => [{ id: 'INC-0001', title: 'GHL order sync failing with 401', severity: 'sev2', status: 'open', openedAt: NOW - 3600_000, fingerprint: 'job:ghl-orders' }],
        deploys: async () => ({ state: 'ok', rows: [1, 2, 3, 4].map((n) => ({ sha: `${n}aaaaaa`, message: `m${n}`, author: null, at: NOW - n, status: 'succeeded' as const })) }),
      },
    });
    const r = await health();
    expect(r.tiles.signInSuccess).toEqual({ value: 75, status: 'attention', detail: { attempts: 40 } });
    expect(r.tiles.jobFailures).toEqual({ value: 1, status: 'attention', detail: { failedJobs: ['ghl-orders'], jobs: 2 } });
    expect(r.tiles.openIncidents).toEqual({ value: 1, status: 'attention', detail: { top: { id: 'INC-0001', severity: 'sev2' } } });
    expect(r.attention.map((a) => a.kind)).toEqual(['incident', 'payment', 'webhook', 'ghl']);
    expect(r.deploys!.state === 'ok' && r.deploys!.rows.map((d) => d.sha)).toEqual(['1aaaaaa', '2aaaaaa', '3aaaaaa']);
  });

  it('Support reads Health but no deploys (D3: no ops page); the Owner and Admin read them', async () => {
    expect((await health('st4')).deploys).toBeNull();
    expect((await health('st_admin')).deploys).not.toBeNull();
  });

  it('writes nothing', async () => {
    const db = await testDatabase();
    const before = await db.select().from(auditLog).orderBy(asc(auditLog.id));
    const events = await db.select().from(stripeEvents);
    for (const who of ['st1', 'st_admin', 'st4']) await health(who);
    expect(await db.select().from(auditLog).orderBy(asc(auditLog.id))).toEqual(before);
    expect(await db.select().from(stripeEvents)).toEqual(events);
  });
});

describe('GET /api/console/skills (D-169)', () => {
  const page = async (q = '', userId = 'st4') => {
    const res = await get(`${HEALTH_PATHS.skills}${q}`, userId);
    return { status: res.statusCode, body: JSON.parse(res.body) as ConsolePage<ConsoleSkillRow> & { code?: string } };
  };

  it('lists every skill by title, drafts included, with no file keys', async () => {
    const { status, body } = await page();
    expect(status).toBe(200);
    expect(body.rows).toEqual([
      { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', free: false, status: 'draft', releasedAt: NOW - 10 * DAY },
      { id: 'fub-pipeline-review', title: 'FUB Pipeline Review', sets: 'owner_ops', free: false, status: 'published', releasedAt: NOW - 40 * DAY },
      { id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, status: 'published', releasedAt: NOW - 40 * DAY },
    ]);
    expect(body.nextCursor).toBeNull();
  });

  it('pages by cursor, and refuses a bad cursor or limit', async () => {
    const first = await page('?limit=2');
    expect(first.body.rows.map((r) => r.id)).toEqual(['appointment-follow-up', 'fub-pipeline-review']);
    const second = await page(`?limit=2&cursor=${first.body.nextCursor}`);
    expect(second.body.rows.map((r) => r.id)).toEqual(['perfect-week']);
    expect(second.body.nextCursor).toBeNull();
    expect((await page('?cursor=nope!')).status).toBe(400);
    expect((await page('?limit=0')).status).toBe(400);
  });
});
