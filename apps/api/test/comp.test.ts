// Comp an Accelerator team: a $0 order (origin 'comp') through the same provisioning a purchase uses,
// without a Stripe subscription, an Insiders rollover, a founding seat, or paid-buyer GHL tags.
// An existing @liveutah.com access-group login is reused: same user and team, seats raised to 2,
// the supplied team name applied, and the Utah Life grant left in place beside the cohort plan.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { groupAccessOf, provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import { compAcceleratorTeam } from '../src/billing/comp';
import type { CompOptions } from '../src/billing/comp';
import { cohortSeatsSold, provisionOrder } from '../src/billing/provision';
import { acceleratorFromDb } from '../src/console/billing';
import { orderStage } from '../src/jobs/ghl-extras';
import { runGhlOrderSync } from '../src/jobs/ghl-orders';
import { acceleratorAccess } from '../src/lib/course-access';
import { cohortFactsOf } from '../src/lib/cohort-facts';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { fakeCrm } from './fake-ghl';
import { accessGroups, accounts, auditLog, cohortEnrollments, orders, plans, teams, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

const NOW = Date.parse('2026-12-10T16:00:00-07:00');
const ORIGIN = 'https://learn.example.com';
const silent = { info: () => {}, warn: () => {}, error: () => {} };
const opts = (over: Partial<CompOptions> = {}): CompOptions => ({ log: silent, now: NOW, invitesFrom: 0, invitesEnabled: true, ...over });

let db: Database;

beforeAll(async () => {
  process.env.APP_URL = ORIGIN;
  db = await testDatabase();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
});

const orderOf = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;
const planOf = async (orderId: string) => (await db.select().from(plans).where(eq(plans.orderId, orderId)))[0]!;

describe('compAcceleratorTeam', () => {
  it('provisions a 2-seat Accelerator, the welcome enrollment, and the set-password email, and counts as neither a seat nor revenue', async () => {
    const out = await compAcceleratorTeam({ email: 'Dana@Example.com', name: 'Dana Reyes', teamName: 'Northwind' }, opts());
    expect(out.ok, JSON.stringify(out)).toBe(true);
    if (!out.ok) return;
    expect(out.already).toBe(false);
    expect(out.cohortId).toBe('dec26');
    expect(out.invite).toBe('sent');

    const order = await orderOf(out.orderId);
    expect(order).toMatchObject({
      origin: 'comp',
      plan: 'cohort',
      option: 'full',
      status: 'paid',
      email: 'dana@example.com',
      company: 'Northwind',
      amountTotal: 0,
      paymentsMade: 1,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
    });
    const plan = await planOf(out.orderId);
    expect(plan).toMatchObject({ kind: 'cohort', option: 'full', seats: 2, status: 'active', cohortId: 'dec26', stripeSubscriptionId: null, accountId: out.accountId });
    const kinds = await db.select({ kind: plans.kind }).from(plans).where(eq(plans.accountId, out.accountId));
    expect(kinds.map((k) => k.kind)).toEqual(['cohort']);

    const team = (await db.select().from(teams).where(eq(teams.id, out.teamId)))[0]!;
    expect(team).toMatchObject({ name: 'Northwind', seats: 2, ownerId: out.userId });
    const user = (await db.select().from(users).where(eq(users.id, out.userId)))[0]!;
    expect(user).toMatchObject({ email: 'dana@example.com', name: 'Dana Reyes', tier: 'team', role: 'Team Owner', status: 'invited', cohortId: 'dec26', isTest: false });

    const [enrollment] = await db.select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, out.userId));
    expect(enrollment).toMatchObject({ cohortId: 'dec26', accountId: out.accountId, welcomeStatus: null });
    await settleEmails();
    expect(outboxFor({ to: 'dana@example.com', template: 'set-password' })).toHaveLength(1);

    expect(await cohortSeatsSold(db)).toBe(0);
    expect(await acceleratorFromDb(db)).toMatchObject({ sold: 0, collectedCents: 0, scheduledCents: 0, paidInFull: 0 });
    // R-5 audit (D-267): a comp is placed in its cohort like any seat, so its team is in the cohort's roster (Teams, and its
    // people), and it is still no seat sold (`plans`) and not paid in full.
    expect(await cohortFactsOf(db, 'dec26')).toMatchObject({ plans: 0, teams: 1, learners: 1, paidInFull: 0 });
    expect(await acceleratorAccess(db, out.userId, NOW)).toBe(true);

    const again = await compAcceleratorTeam({ email: 'dana@example.com', name: 'Dana Reyes', teamName: 'Northwind' }, opts());
    expect(again).toMatchObject({ ok: true, already: true, orderId: out.orderId, teamId: out.teamId, userId: out.userId });
    expect(await db.select().from(orders).where(eq(orders.origin, 'comp'))).toHaveLength(1);
    expect(await db.select().from(plans).where(eq(plans.orderId, out.orderId))).toHaveLength(1);
  });

  it('reuses a @liveutah.com access-group login, raises the team to 2 seats, and keeps Utah Life access', async () => {
    await db.insert(accessGroups).values({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW });
    const userId = await provisionGroupMember(db, 'doo@liveutah.com', NOW);
    expect(userId).toBeTruthy();
    await recordVerified(db, 'doo@liveutah.com', NOW);
    const before = (await db.select().from(users).where(eq(users.id, userId!)))[0]!;
    expect(before).toMatchObject({ tier: 'agent', role: 'Team Owner', status: 'invited' });
    const beforeTeam = (await db.select().from(teams).where(eq(teams.id, before.teamId!)))[0]!;
    expect(beforeTeam.seats).toBe(1);
    expect(await db.select().from(accounts).where(eq(accounts.ownerEmail, 'doo@liveutah.com'))).toHaveLength(0);

    const out = await compAcceleratorTeam({ email: 'DOO@liveutah.com', name: 'Dana DOO', teamName: 'Utah Life' }, opts());
    expect(out.ok, JSON.stringify(out)).toBe(true);
    if (!out.ok) return;
    expect(out.userId).toBe(userId);
    expect(out.teamId).toBe(before.teamId);
    expect((await db.select().from(teams).where(eq(teams.id, out.teamId)))[0]).toMatchObject({ name: 'Utah Life', seats: 2, ownerId: userId });
    expect((await db.select().from(users).where(eq(users.id, userId!)))[0]).toMatchObject({ name: 'Dana DOO', tier: 'team', role: 'Team Owner', cohortId: 'dec26' });
    expect((await db.select().from(accounts).where(eq(accounts.ownerUserId, userId!)))[0]).toMatchObject({ name: 'Utah Life', stripeCustomerId: null });

    const access = await groupAccessOf(db, 'doo@liveutah.com', NOW);
    expect(access.groups.map((g) => g.id)).toEqual(['utah-life']);
    expect(access.plans.map((p) => p.kind)).toEqual(['agent_plan']);
    expect(await acceleratorAccess(db, userId!, NOW)).toBe(true);
    expect(await cohortSeatsSold(db)).toBe(0);
    const plan = await planOf(out.orderId);
    expect(plan.kind).toBe('cohort');
    expect(await db.select({ kind: plans.kind }).from(plans).where(eq(plans.accountId, out.accountId))).toEqual([{ kind: 'cohort' }]);
  });

  it('leaves a paid seat’s count and collected revenue alone, and refuses to comp someone who already bought', async () => {
    await db.insert(orders).values({
      id: 'ord_paid',
      plan: 'cohort',
      option: 'full',
      origin: 'payment_link',
      status: 'paid',
      name: 'Pat Buyer',
      email: 'pat@example.com',
      company: 'Pat Group',
      amountTotal: 750_000,
      paymentsMade: 1,
      paidAt: NOW,
      createdAt: NOW,
    });
    expect((await provisionOrder('ord_paid', { db, log: silent, now: NOW, invitesFrom: NOW, invitesEnabled: false })).ok).toBe(true);
    const before = await acceleratorFromDb(db);
    expect(before.sold).toBe(1);
    expect(before.collectedCents).toBe(750_000);

    const comp = await compAcceleratorTeam({ email: 'other@example.com', name: 'Other Owner', teamName: 'Other Group' }, opts());
    expect(comp.ok).toBe(true);
    expect(await cohortSeatsSold(db)).toBe(1);
    expect(await acceleratorFromDb(db)).toMatchObject({ sold: 1, collectedCents: 750_000, paidInFull: 1 });
    expect((await cohortFactsOf(db, 'dec26')).plans).toBe(1);
    expect((await cohortFactsOf(db, 'dec26')).paidInFull).toBe(1);

    const refused = await compAcceleratorTeam({ email: 'pat@example.com', name: 'Pat Buyer', teamName: 'Pat Group' }, opts());
    expect(refused).toEqual({ ok: false, reason: 'already-enrolled' });
    expect(await db.select().from(orders).where(and(eq(orders.origin, 'comp'), sql`lower(${orders.email}) = 'pat@example.com'`))).toHaveLength(0);
  });

  it('refuses a staff email and someone already on another owner’s team', async () => {
    const [staff] = await db.select({ email: users.email }).from(users).where(eq(users.kind, 'staff')).limit(1);
    expect(await compAcceleratorTeam({ email: staff!.email, name: 'Staff', teamName: 'Staff Team' }, opts())).toEqual({ ok: false, reason: 'staff-email' });

    const made = await compAcceleratorTeam({ email: 'owner@example.com', name: 'Owner', teamName: 'Owner Team' }, opts());
    if (!made.ok) throw new Error(made.reason);
    await db.insert(users).values({ id: 'u_guest', email: 'guest@example.com', name: 'Guest', kind: 'learner', tier: 'agent', role: 'Agent', status: 'active', teamId: made.teamId, cohortId: 'dec26' });
    expect(await compAcceleratorTeam({ email: 'guest@example.com', name: 'Guest', teamName: 'Guest Team' }, opts())).toEqual({ ok: false, reason: 'member-of-another-team' });
  });

  it('tags GoHighLevel with ai-comp and does not move the pipeline to Purchased', async () => {
    expect(orderStage({ status: 'paid', paid_at: NOW, payment_failed_at: null, membership_ended_at: null, refunded_at: null, plan_status: 'active', origin: 'comp' })).toBeNull();
    expect(orderStage({ status: 'paid', paid_at: NOW, payment_failed_at: null, membership_ended_at: null, refunded_at: null, plan_status: 'active', origin: 'payment_link' })).toBe('purchased');

    const out = await compAcceleratorTeam({ email: 'crm@example.com', name: 'Crm Owner', teamName: 'Crm Team' }, opts({ invitesEnabled: false }));
    expect(out.ok).toBe(true);
    const crm = fakeCrm();
    const pipeline = { id: 'p1', stages: { lead: 's-lead', freeSkills: 's-free', checkoutStarted: 's-checkout', purchased: 's-buy', canceled: 's-gone', refunded: 's-gone', paymentFailed: 's-fail' } };
    const run = await runGhlOrderSync({
      db,
      log: silent,
      config: { token: 'pit-test', locationId: 'loc', fields: { offer: 'f-offer', cohort: 'f-cohort', amount: 'f-amount', purchaseDate: 'f-date', lmsLogin: 'f-login' }, pipeline },
      fetch: crm.fetch,
    });
    expect(run.synced).toBeGreaterThan(0);
    expect(crm.tagsOf('crm@example.com').sort()).toEqual(['ai-comp']);
    for (const tag of ['offer-buyer', 'ai-buyer-accelerator', 'pay-full', 'plan-cohort']) expect(crm.tagsOf('crm@example.com')).not.toContain(tag);
    expect(crm.oppOf('crm@example.com')).toBeUndefined();
    expect(crm.calls.some((c) => c.path.startsWith('/opportunities'))).toBe(false);
  });
});

describe('POST /api/console/comp', () => {
  let app: App;
  beforeEach(async () => {
    app = await build({ logger: false });
  });

  it('lets an Owner comp a team and writes one audit row, and refuses Support', async () => {
    const owner = await app.signInAs('st1');
    const res = await app.inject({
      method: 'POST',
      url: '/api/console/comp',
      headers: { cookie: owner, 'content-type': 'application/json', origin: ORIGIN },
      payload: { email: 'audit@example.com', name: 'Audit Owner', teamName: 'Audit Team' },
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json() as { ok: true; orderId: string; teamId: string; cohortId: string };
    expect(body).toMatchObject({ ok: true, already: false, cohortId: 'dec26' });
    const [row] = await db.select().from(auditLog).where(eq(auditLog.action, 'billing.comp'));
    expect(row).toMatchObject({ outcome: 'ok', actorSource: 'staff', actorUserId: 'st1', targetType: 'order', targetId: body.orderId, targetLabel: 'Audit Team' });
    expect(row!.after).toMatchObject({ origin: 'comp', seats: 2, cohortId: 'dec26', teamId: body.teamId });
    expect(JSON.stringify(row!.after)).not.toContain('audit@example.com');

    const support = await app.signInAs('st4');
    const denied = await app.inject({
      method: 'POST',
      url: '/api/console/comp',
      headers: { cookie: support, 'content-type': 'application/json', origin: ORIGIN },
      payload: { email: 'nope@example.com', name: 'Nope', teamName: 'Nope Team' },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ code: 'console_forbidden' });
  });
});
