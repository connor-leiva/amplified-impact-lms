// The Admin Console's support records, PR 2 (D-158, spec §§ 7.3-7.5 and § 11), against a real
// Postgres through the real router: workspaces and users (lists, pages, filters, one record each),
// staff notes (immutable, Owner-only delete, length-only audit rows, never in a snapshot), the staff
// password reset (once, through the test outbox), the users export, and search (exact ids, escaped
// LIKE, bound parameters).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { AUDIT_EXPORT_MAX_ROWS, CONSOLE_PLAN_LABELS, primaryPlan, seedForDatabase } from '@ai/core';
import type { ConsolePage, ConsoleUserDetail, ConsoleUserRow, SearchResults, StaffNote, WorkspaceDetail, WorkspaceRow } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { CONSOLE_PATHS } from '../src/console/routes';
import { decodeCursor, encodeCursor } from '../src/console/records';
import {
  accessGroups,
  accounts,
  auditLog,
  authTokens,
  emailVerifications,
  googleIdentities,
  orders,
  plans,
  staffNotes,
  teams,
  userPasswords,
  users,
} from '../src/db/schema';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const DAY = 86_400_000;
const ORIGIN = 'https://learn.example.com';

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  await testDatabase();
});

/** The seed, an Admin, and the billing rows the seed does not have (it is a `Db`; these are not). */
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  await db.insert(accounts).values([
    { id: 'a_north', teamId: 'northline', ownerUserId: 'u_alex', ownerEmail: 'alex@northlinerealty.com', name: 'Northline Realty Team', stripeCustomerId: 'cus_North123', createdAt: NOW - 30 * DAY, inviteSentAt: NOW - 29 * DAY },
    { id: 'a_harbor', teamId: 'harbor', ownerUserId: 'u_natasha', ownerEmail: 'natasha@harborpine.com', name: 'Harbor & Pine Group', stripeCustomerId: 'cus_Harbor9', createdAt: NOW - 60 * DAY, inviteSentAt: null },
  ]);
  const order = { origin: 'offer', currency: 'usd', paymentsMade: 1 } as const;
  await db.insert(orders).values([
    { ...order, id: 'o_north', plan: 'cohort', option: 'full', status: 'paid', email: 'alex@northlinerealty.com', accountId: 'a_north', stripeSessionId: 'cs_test_north', stripeCustomerId: 'cus_North123', stripeSubscriptionId: 'sub_North1', stripePaymentIntentId: 'pi_North1', amountTotal: 750000, paidAt: NOW - 30 * DAY, createdAt: NOW - 30 * DAY },
    // Started by the owner, never paid, so no account took it: still the workspace's.
    { ...order, id: 'o_north_pending', plan: 'agents', option: 'upto15', status: 'pending', email: 'ALEX@northlinerealty.com', accountId: null, createdAt: NOW - DAY, paymentsMade: 0 },
    { ...order, id: 'o_harbor', plan: 'agents', option: 'upto15', status: 'paid', email: 'natasha@harborpine.com', accountId: 'a_harbor', stripeSessionId: 'cs_test_harbor', stripeCustomerId: 'cus_Harbor9', stripeSubscriptionId: 'sub_Harbor1', paidAt: NOW - 60 * DAY, paymentFailedAt: NOW - 3 * DAY, createdAt: NOW - 60 * DAY },
    { ...order, id: 'o_harbor_ins', plan: 'membership', option: 'monthly', status: 'paid', email: 'natasha@harborpine.com', accountId: 'a_harbor', stripeSessionId: 'cs_test_harbor2', paidAt: NOW - 10 * DAY, createdAt: NOW - 10 * DAY },
  ]);
  await db.insert(plans).values([
    { id: 'p_north_cohort', accountId: 'a_north', kind: 'cohort', option: 'full', seats: 2, cohortId: 'dec26', status: 'active', startsAt: NOW - 30 * DAY, stripeSubscriptionId: 'sub_North1', orderId: 'o_north', createdAt: NOW - 30 * DAY },
    // Newer, and running, but the AI Accelerator names the workspace (PLAN_PRIORITY).
    { id: 'p_north_ins', accountId: 'a_north', kind: 'membership', option: 'year_upfront', seats: 2, status: 'trialing', startsAt: NOW - 29 * DAY, orderId: 'o_north_ins', createdAt: NOW - 29 * DAY },
    // A lapsed Team Plan and a running Insiders: the running one names it.
    { id: 'p_harbor_team', accountId: 'a_harbor', kind: 'agents', option: 'upto15', seats: 16, status: 'canceled', startsAt: NOW - 60 * DAY, stripeSubscriptionId: 'sub_Harbor1', orderId: 'o_harbor', createdAt: NOW - 60 * DAY },
    { id: 'p_harbor_ins', accountId: 'a_harbor', kind: 'membership', option: 'monthly', seats: 2, status: 'active', startsAt: NOW - 10 * DAY, orderId: 'o_harbor_ins', createdAt: NOW - 10 * DAY },
  ]);
  // An access group on Northline's domain: only its verified addresses count.
  await db.insert(accessGroups).values({ id: 'g_north', name: 'Northline Agents', plan: 'agents', emailDomain: 'northlinerealty.com', expiresAt: null, createdAt: NOW - 90 * DAY });
  await db.insert(emailVerifications).values([
    { email: 'alex@northlinerealty.com', verifiedAt: NOW - 20 * DAY },
    { email: 'priya@northlinerealty.com', verifiedAt: NOW - 19 * DAY },
  ]);
  await db.insert(userPasswords).values({ userId: 'u_alex', hash: '$argon2id$v=19$m=19456,t=2,p=1$SENTINELSALT$SENTINELDIGEST', updatedAt: new Date(NOW - 20 * DAY) });
  await db.insert(googleIdentities).values({ sub: 'google-sub-SENTINEL-1234', userId: 'u_alex', linkedAt: new Date(NOW - 20 * DAY) });
  app = await build({ logger: false });
  cookies = new Map();
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
/** One session per person per test: the rate limits key on the session (D-137). */
let cookies = new Map<string, string>();
const cookieOf = async (userId: string): Promise<string> => {
  const known = cookies.get(userId);
  if (known) return known;
  const fresh = await app.signInAs(userId);
  cookies.set(userId, fresh);
  return fresh;
};
const get = async (url: string, userId = 'st4') => app.inject({ method: 'GET', url, headers: { cookie: await cookieOf(userId) } });
const post = async (url: string, payload: unknown, userId = 'st4', origin = ORIGIN) =>
  app.inject({ method: 'POST', url, headers: { cookie: await cookieOf(userId), 'content-type': 'application/json', origin }, payload: payload as Record<string, unknown> });
const body = <T>(res: { body: string }) => JSON.parse(res.body) as T;

// ================================================================================================

describe('workspaces (spec § 7.3) @console', () => {
  it('lists every team by name, with its plan, seats, near-cap and last activity', async () => {
    const res = await get(CONSOLE_PATHS.workspaces);
    expect(res.statusCode).toBe(200);
    const page = body<ConsolePage<WorkspaceRow>>(res);
    expect(page.nextCursor).toBeNull();
    expect(page.rows.map((r) => r.teamId)).toEqual(['harbor', 'keystone', 'northline']);
    const north = page.rows.find((r) => r.teamId === 'northline')!;
    expect(north).toEqual({
      teamId: 'northline',
      name: 'Northline Realty Team',
      ownerId: 'u_alex',
      ownerName: 'Alex Morgan',
      ownerEmail: 'alex@northlinerealty.com',
      planKind: 'cohort',
      planLabel: 'AI Accelerator',
      planStatus: 'active',
      seatsUsed: 6,
      seatCap: 7,
      nearCap: false,
      lastActivity: 1796661060000,
    });
    // A lapsed Team Plan loses to a running Insiders; a team with no account has no plan.
    expect(page.rows.find((r) => r.teamId === 'harbor')).toMatchObject({ planKind: 'membership', planLabel: 'Insiders', planStatus: 'active' });
    expect(page.rows.find((r) => r.teamId === 'keystone')).toMatchObject({ planKind: null, planLabel: null, planStatus: null, seatsUsed: 1 });
  });

  it('picks the same plan in the list as `primaryPlan` does on the record', async () => {
    const db = await testDatabase();
    for (const teamId of ['northline', 'harbor']) {
      const row = body<ConsolePage<WorkspaceRow>>(await get(`${CONSOLE_PATHS.workspaces}?q=${teamId}`)).rows.find((r) => r.teamId === teamId)!;
      const detail = body<WorkspaceDetail>(await get(`/api/console/workspaces/${teamId}`));
      const acct = await db.select().from(accounts).where(eq(accounts.teamId, teamId));
      const rows = await db.select().from(plans).where(eq(plans.accountId, acct[0]!.id));
      expect(row.planKind).toBe(primaryPlan(rows)!.kind);
      expect(detail.primaryPlan?.kind).toBe(row.planKind);
    }
  });

  it('flags near cap at 90% of more than two seats', async () => {
    await (await testDatabase()).update(teams).set({ seats: 6 }).where(eq(teams.id, 'northline'));
    await (await testDatabase()).update(teams).set({ seats: 2 }).where(eq(teams.id, 'harbor'));
    const rows = body<ConsolePage<WorkspaceRow>>(await get(CONSOLE_PATHS.workspaces)).rows;
    expect(rows.find((r) => r.teamId === 'northline')!.nearCap).toBe(true);
    // Two of two is full by design, never "near cap".
    expect(rows.find((r) => r.teamId === 'harbor')).toMatchObject({ seatsUsed: 2, seatCap: 2, nearCap: false });
  });

  it('filters by words, plan and status, and refuses a malformed filter', async () => {
    const ids = async (q: string) => body<ConsolePage<WorkspaceRow>>(await get(`${CONSOLE_PATHS.workspaces}${q}`)).rows.map((r) => r.teamId);
    expect(await ids('?q=harbor')).toEqual(['harbor']);
    expect(await ids('?q=natasha%40harborpine')).toEqual(['harbor']);
    expect(await ids('?plan=cohort')).toEqual(['northline']);
    expect(await ids('?plan=membership&status=active')).toEqual(['harbor']);
    expect(await ids('?status=canceled')).toEqual([]);
    // `%` and `_` are characters, not wildcards.
    expect(await ids('?q=%25')).toEqual([]);
    expect(await ids('?q=Harbor%20_%20Pine')).toEqual([]);
    for (const q of ['?plan=gold', '?status=lapsed', `?q=${'x'.repeat(101)}`, '?limit=0', '?cursor=not-a-cursor!']) {
      const res = await get(`${CONSOLE_PATHS.workspaces}${q}`);
      expect(res.statusCode, q).toBe(400);
      expect(body<{ code: string }>(res).code).toBe('invalid_query');
    }
  });

  it('pages by name with a cursor that neither repeats nor skips', async () => {
    const first = body<ConsolePage<WorkspaceRow>>(await get(`${CONSOLE_PATHS.workspaces}?limit=2`));
    expect(first.rows.map((r) => r.teamId)).toEqual(['harbor', 'keystone']);
    expect(decodeCursor(first.nextCursor)).toEqual({ name: 'keystone collective', id: 'keystone' });
    const second = body<ConsolePage<WorkspaceRow>>(await get(`${CONSOLE_PATHS.workspaces}?limit=2&cursor=${first.nextCursor}`));
    expect(second).toEqual({ rows: [expect.objectContaining({ teamId: 'northline' })], nextCursor: null });
    expect(decodeCursor(encodeCursor({ name: 'a', id: 'b' }))).toEqual({ name: 'a', id: 'b' });
  });

  it('answers one workspace: members, plans, entitlements, local billing and merged activity', async () => {
    const res = await get('/api/console/workspaces/northline');
    expect(res.statusCode).toBe(200);
    const d = body<WorkspaceDetail>(res);
    expect(d.team).toEqual({ id: 'northline', name: 'Northline Realty Team', seats: 7, ownerId: 'u_alex', ownerName: 'Alex Morgan', ownerEmail: 'alex@northlinerealty.com' });
    expect(d.account).toMatchObject({ id: 'a_north', stripeCustomerId: 'cus_North123', inviteSentAt: NOW - 29 * DAY });
    expect(d.plans.map((p) => [p.id, p.label, p.status])).toEqual([
      ['p_north_ins', 'Insiders', 'trialing'],
      ['p_north_cohort', 'AI Accelerator', 'active'],
    ]);
    expect(d.primaryPlan).toEqual({ kind: 'cohort', label: 'AI Accelerator', status: 'active' });
    expect(d.seatsUsed).toBe(6);
    expect(d.members.map((m) => m.id)).toEqual(['u_alex', 'u_priya', 'u_sarah', 'u_michael', 'u_devon', 'u_lena']);
    expect(d.members[0]).toEqual({ id: 'u_alex', name: 'Alex Morgan', email: 'alex@northlinerealty.com', role: 'Team Owner', status: 'active', joined: expect.any(Number), last: 1796661060000 });
    // Running plans' sets, the course, and the group with its two VERIFIED members only.
    expect(d.entitlements).toEqual({
      sets: ['owner_ops', 'agent'],
      course: true,
      groups: [{ id: 'g_north', name: 'Northline Agents', planKind: 'agents', planLabel: 'Team Plan', members: 2 }],
    });
    // Local billing: the account's orders, and the owner's unprovisioned one (by address, any case).
    expect(d.billing.orders.map((o) => o.id)).toEqual(['o_north_pending', 'o_north']);
    expect(d.billing).toMatchObject({ stripeCustomerId: 'cus_North123', subscriptionIds: ['sub_North1'], lastPaidAt: NOW - 30 * DAY, lastFailedAt: null });
    // Activity: newest first, merged across orders, plans, members and the invite, 50 at most.
    expect(d.activity.length).toBeLessThanOrEqual(50);
    expect(d.activity[0]).toEqual({ at: NOW - DAY, kind: 'order_created', subject: 'o_north_pending', label: 'Team Plan' });
    expect(d.activity.map((a) => a.at)).toEqual([...d.activity.map((a) => a.at)].sort((a, b) => b - a));
    expect(d.activity.some((a) => a.kind === 'invite_sent')).toBe(true);
    expect(d.activity.some((a) => a.kind === 'plan_started' && a.subject === 'p_north_cohort')).toBe(true);
  });

  it('caps activity at 50', async () => {
    const db = await testDatabase();
    await db.insert(orders).values(
      Array.from({ length: 60 }, (_, i) => ({ id: `o_bulk_${i}`, plan: 'cohort', option: 'full', origin: 'offer', status: 'expired', email: 'alex@northlinerealty.com', accountId: 'a_north', createdAt: NOW - i * 1000 })),
    );
    const d = body<WorkspaceDetail>(await get('/api/console/workspaces/northline'));
    expect(d.activity).toHaveLength(50);
    expect(d.activity[0]!.subject).toBe('o_bulk_0');
  });

  it('is a 404 for an unknown or malformed team id', async () => {
    for (const id of ['nope', '..%2F..', 'a%20b']) {
      const res = await get(`/api/console/workspaces/${id}`);
      expect(res.statusCode, id).toBe(404);
      expect(body<{ code: string }>(res).code).toBe('not_found');
    }
  });

  it('offers no delete: there is no DELETE route, and no POST under a workspace', async () => {
    const cookie = await app.signInAs('st1');
    expect((await app.inject({ method: 'DELETE', url: '/api/console/workspaces/northline', headers: { cookie } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/console/workspaces/northline/delete', headers: { cookie, 'content-type': 'application/json', origin: ORIGIN }, payload: {} })).statusCode).toBe(404);
  });
});

// ================================================================================================

describe('users (spec § 7.4) @console', () => {
  it('lists people by name: a learner with no team is Individual, staff have no workspace', async () => {
    const rows = body<ConsolePage<ConsoleUserRow>>(await get(`${CONSOLE_PATHS.users}?limit=200`)).rows;
    expect(rows.map((r) => r.name)).toEqual([...rows.map((r) => r.name)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
    expect(rows.find((r) => r.id === 'u_jamie')).toEqual({
      id: 'u_jamie',
      name: 'Jamie Ortiz',
      email: 'jamie@ortizhomes.com',
      kind: 'learner',
      role: 'Agent',
      teamId: null,
      workspace: 'Individual',
      status: 'active',
      lastActive: 1796659080000,
    });
    expect(rows.find((r) => r.id === 'u_sarah')).toMatchObject({ workspace: 'Northline Realty Team', role: 'Sales Agent' });
    expect(rows.find((r) => r.id === 'st4')).toMatchObject({ kind: 'staff', role: 'Support', workspace: null });
  });

  it('filters by words (name, email, workspace or exact id), role and kind', async () => {
    const ids = async (q: string) => body<ConsolePage<ConsoleUserRow>>(await get(`${CONSOLE_PATHS.users}${q}`)).rows.map((r) => r.id);
    expect(await ids('?q=ortizhomes')).toEqual(['u_jamie']);
    expect(await ids('?q=u_kenji')).toEqual(['u_kenji']);
    expect((await ids('?q=Harbor')).sort()).toEqual(['u_claire', 'u_natasha']);
    expect(await ids('?role=Team%20Owner')).toEqual(['u_alex', 'u_marcus', 'u_natasha']);
    expect(await ids('?role=Support')).toEqual(['st4']);
    expect((await ids('?kind=staff')).sort()).toEqual(['st1', 'st2', 'st3', 'st4', 'st_admin']);
    expect(await ids('?q=%25')).toEqual([]);
    for (const q of ['?role=Wizard', '?kind=robot', '?cursor=e30']) expect((await get(`${CONSOLE_PATHS.users}${q}`)).statusCode, q).toBe(400);
  });

  it('pages with a cursor over every user, once each', async () => {
    const seen: string[] = [];
    let cursor: string | null = '';
    let pages = 0;
    while (cursor !== null) {
      const page: ConsolePage<ConsoleUserRow> = body(await get(`${CONSOLE_PATHS.users}?limit=4${cursor ? `&cursor=${cursor}` : ''}`));
      seen.push(...page.rows.map((r) => r.id));
      cursor = page.nextCursor;
      pages += 1;
    }
    const all = await (await testDatabase()).select({ id: users.id }).from(users);
    expect(seen.sort()).toEqual(all.map((u) => u.id).sort());
    expect(pages).toBe(Math.ceil(all.length / 4));
  });

  it('answers one user, with identity as existence only: never a hash or a Google subject', async () => {
    const res = await get('/api/console/users/u_alex');
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('SENTINEL');
    expect(res.body).not.toContain('argon2');
    const d = body<ConsoleUserDetail>(res);
    expect(d.identity).toEqual({ emailVerifiedAt: NOW - 20 * DAY, hasPassword: true, hasGoogle: true });
    expect(Object.keys(d.identity).sort()).toEqual(['emailVerifiedAt', 'hasGoogle', 'hasPassword']);
    expect(d.user).toMatchObject({ id: 'u_alex', kind: 'learner', role: 'Team Owner', workspace: 'Northline Realty Team', lastActive: 1796661060000 });
    expect(d.orders.map((o) => o.id)).toEqual(['o_north_pending', 'o_north']);
    expect(d.entitlements).toMatchObject({ sets: ['owner_ops', 'agent'], course: true });
    const jamie = body<ConsoleUserDetail>(await get('/api/console/users/u_jamie'));
    expect(jamie.identity).toEqual({ emailVerifiedAt: null, hasPassword: false, hasGoogle: false });
    expect(jamie.user.workspace).toBe('Individual');
    // The learner's progress, by AI Employee, from the seed.
    expect(jamie.progress.length).toBeGreaterThan(0);
    expect(jamie.progress[0]).toEqual({ moduleId: expect.any(String), moduleName: expect.any(String), steps: expect.any(Number), builtAt: expect.toBeOneOf([null, expect.any(Number)]), deployedAt: expect.toBeOneOf([null, expect.any(Number)]) });
    const staff = body<ConsoleUserDetail>(await get('/api/console/users/st2'));
    expect(staff.user).toMatchObject({ kind: 'staff', role: 'Instructor', staffRole: 'Instructor', workspace: null });
    expect((await get('/api/console/users/nobody')).statusCode).toBe(404);
  });

  it('has no email change: no route takes one', async () => {
    const cookie = await app.signInAs('st1');
    for (const url of ['/api/console/users/u_jamie', '/api/console/users/u_jamie/email']) {
      const res = await app.inject({ method: 'POST', url, headers: { cookie, 'content-type': 'application/json', origin: ORIGIN }, payload: { email: 'x@example.com' } });
      expect(res.statusCode, url).toBe(404);
    }
    expect((await (await testDatabase()).select({ email: users.email }).from(users).where(eq(users.id, 'u_jamie')))[0]!.email).toBe('jamie@ortizhomes.com');
  });
});

// ================================================================================================

describe('the staff password reset (spec § 7.4) @console', () => {
  it('sends the existing reset email exactly once, through the test outbox, and audits it', async () => {
    const res = await post('/api/console/users/u_alex/password-reset', {});
    expect(res.statusCode).toBe(200);
    expect(body(res)).toEqual({ ok: true, link: 'reset' });
    await settleEmails();
    expect(outboxFor({ to: 'alex@northlinerealty.com' })).toHaveLength(1);
    expect(outboxFor({ to: 'alex@northlinerealty.com', template: 'reset-password' })).toHaveLength(1);
    const tokens = await (await testDatabase()).select().from(authTokens).where(eq(authTokens.email, 'alex@northlinerealty.com'));
    expect(tokens.map((t) => t.purpose)).toEqual(['reset_password']);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'user.password_reset', outcome: 'ok', actorUserId: 'st4', actorRole: 'Support', targetType: 'user', targetId: 'u_alex', targetLabel: 'Alex Morgan', after: { link: 'reset', staff: false } });
    // Nothing about the link reaches the audit row.
    expect(JSON.stringify(rows[0])).not.toMatch(/token|SENTINEL/i);
  });

  it('sends the set-password email to someone with no password yet, the existing function’s rule', async () => {
    const res = await post('/api/console/users/u_jamie/password-reset', {}, 'st_admin');
    expect(body(res)).toEqual({ ok: true, link: 'set' });
    await settleEmails();
    expect(outboxFor({ to: 'jamie@ortizhomes.com', template: 'set-password' })).toHaveLength(1);
    expect(outboxFor({ to: 'jamie@ortizhomes.com' })).toHaveLength(1);
  });

  it('lets only the Owner reset a staff member’s password, and audits a refusal', async () => {
    for (const who of ['st4', 'st_admin']) {
      const res = await post('/api/console/users/st2/password-reset', {}, who);
      expect(res.statusCode, who).toBe(403);
      expect(body<{ code: string }>(res).code).toBe('console_forbidden');
    }
    await settleEmails();
    expect(outboxFor({ to: 'jordan@amplifiedimpact.com' })).toEqual([]);
    expect((await auditRows()).map((r) => [r.actorUserId, r.action, r.outcome, r.targetId])).toEqual([
      ['st4', 'user.password_reset', 'denied', 'st2'],
      ['st_admin', 'user.password_reset', 'denied', 'st2'],
    ]);
    const owner = await post('/api/console/users/st2/password-reset', {}, 'st1');
    expect(owner.statusCode).toBe(200);
    await settleEmails();
    expect(outboxFor({ to: 'jordan@amplifiedimpact.com' })).toHaveLength(1);
    expect((await auditRows()).at(-1)).toMatchObject({ actorUserId: 'st1', outcome: 'ok', after: { staff: true } });
  });

  it('refuses a foreign origin before anything is read or sent, and 404s an unknown user unaudited', async () => {
    expect((await post('/api/console/users/u_alex/password-reset', {}, 'st1', 'https://evil.example')).statusCode).toBe(403);
    expect((await post('/api/console/users/nobody/password-reset', {}, 'st1')).statusCode).toBe(404);
    await settleEmails();
    expect(outboxFor({})).toEqual([]);
    expect(await auditRows()).toEqual([]);
  });
});

// ================================================================================================

describe('the users export (spec § 7.4, D6) @console', () => {
  it('answers a CSV of the filtered list, injection-safe, and audits it', async () => {
    await (await testDatabase()).update(users).set({ name: '=HYPERLINK("http://x")' }).where(eq(users.id, 'u_kenji'));
    const res = await post(CONSOLE_PATHS.usersExport, { kind: 'learner' }, 'st_admin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="users-2026-12-07.csv"');
    const lines = res.body.trimEnd().split('\r\n');
    expect(lines[0]).toBe('"id","name","email","kind","role","team_id","workspace","status","joined","last_active"');
    expect(lines).toHaveLength(1 + 14);
    expect(res.body).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(res.body).not.toMatch(/argon2|SENTINEL/);
    expect((await auditRows()).at(-1)).toMatchObject({ action: 'user.export', outcome: 'ok', actorUserId: 'st_admin', targetType: 'users', after: { rows: 14, format: 'csv', filters: { kind: 'learner' } } });
  });

  it('exports exactly the selected users, and audits the selection (D-160 R2-1c: "Export selected")', async () => {
    const res = await post(CONSOLE_PATHS.usersExport, { ids: ['u_kenji', 'st1', 'u_kenji', 'no_such_user'] }, 'st_admin');
    expect(res.statusCode).toBe(200);
    const ids = res.body.trimEnd().split('\r\n').slice(1).map((l) => l.split(',')[0]);
    expect(ids.sort()).toEqual(['"st1"', '"u_kenji"']);
    expect((await auditRows()).at(-1)).toMatchObject({ action: 'user.export', outcome: 'ok', after: { rows: 2, filters: { ids: ['u_kenji', 'st1', 'no_such_user'] } } });
    for (const ids of [[], 'u_kenji', ['bad id'], Array.from({ length: 501 }, (_, i) => `u${i}`)]) {
      const bad = await post(CONSOLE_PATHS.usersExport, { ids }, 'st_admin');
      expect(bad.statusCode, JSON.stringify(ids).slice(0, 40)).toBe(400);
    }
  });

  it('refuses more than 10,000 rows with 422 and audits the refusal', async () => {
    await (await testDatabase()).execute(sql`insert into users (id, email, name, kind) select 'bulk_' || g, 'bulk' || g || '@example.com', 'Bulk ' || g, 'learner' from generate_series(1, ${AUDIT_EXPORT_MAX_ROWS}) g`);
    const res = await post(CONSOLE_PATHS.usersExport, {}, 'st1');
    expect(res.statusCode).toBe(422);
    expect(body<{ code: string }>(res).code).toBe('export_too_large');
    expect((await auditRows()).at(-1)).toMatchObject({ action: 'user.export', outcome: 'failed', reason: 'export_too_large' });
  });

  it('allows 5 exports a minute; the 6th is 429 and private, no-store', async () => {
    for (let i = 0; i < 5; i++) expect((await post(CONSOLE_PATHS.usersExport, {}, 'st1')).statusCode).toBe(200);
    const limited = await post(CONSOLE_PATHS.usersExport, {}, 'st1');
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['cache-control']).toBe('private, no-store');
  });
});

// ================================================================================================

describe('staff notes (spec § 7.3, migration 0016) @console', () => {
  const create = (targetType: string, targetId: string, text: string, who = 'st4') => post(CONSOLE_PATHS.notes, { targetType, targetId, body: text }, who);
  const list = async (targetType: string, targetId: string, who = 'st4') => body<{ rows: StaffNote[] }>(await get(`${CONSOLE_PATHS.notes}?targetType=${targetType}&targetId=${targetId}`, who)).rows;

  it('writes a note and one audit row holding its length, never its words', async () => {
    const res = await create('workspace', 'northline', '  Owner asked how seats work when an agent leaves.  ');
    expect(res.statusCode).toBe(201);
    const note = body<StaffNote>(res);
    expect(note).toEqual({ id: '1', targetType: 'workspace', targetId: 'northline', author: { id: 'st4', name: 'Luis Romero' }, body: 'Owner asked how seats work when an agent leaves.', createdAt: NOW });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'note.create', outcome: 'ok', actorUserId: 'st4', targetType: 'workspace', targetId: 'northline', targetLabel: 'Northline Realty Team', after: { noteId: '1', length: 48 } });
    expect(JSON.stringify(rows[0])).not.toContain('seats work');
  });

  it('lists a target’s notes newest first, and only its own', async () => {
    await create('user', 'u_jamie', 'Prefers email over calls.');
    await create('user', 'u_jamie', 'Mornings MST.', 'st1');
    await create('workspace', 'northline', 'Onboarding call done.');
    expect((await list('user', 'u_jamie')).map((n) => [n.body, n.author.name])).toEqual([
      ['Mornings MST.', 'Casey Lin'],
      ['Prefers email over calls.', 'Luis Romero'],
    ]);
    expect((await list('workspace', 'northline')).map((n) => n.body)).toEqual(['Onboarding call done.']);
  });

  it('refuses an empty or too long note, an unknown target type, and a missing target', async () => {
    expect((await create('workspace', 'northline', '   ')).statusCode).toBe(400);
    expect((await create('workspace', 'northline', 'x'.repeat(2001))).statusCode).toBe(400);
    expect((await create('workspace', 'northline', 'x'.repeat(2000))).statusCode).toBe(201);
    expect((await create('team', 'northline', 'Hello')).statusCode).toBe(400);
    const missing = await create('user', 'nobody', 'Hello');
    expect(missing.statusCode).toBe(404);
    expect((await get(`${CONSOLE_PATHS.notes}?targetType=team&targetId=northline`)).statusCode).toBe(400);
    expect((await auditRows()).map((r) => r.action)).toEqual(['note.create']);
  });

  it('lets only the Owner delete, with a reason, as a soft delete audited without the words', async () => {
    const id = body<StaffNote>(await create('workspace', 'northline', 'Wrong workspace, sorry.')).id;
    const admin = await post(`/api/console/notes/${id}/delete`, { reason: 'Written on the wrong workspace.' }, 'st_admin');
    expect(admin.statusCode).toBe(403);
    expect((await auditRows()).at(-1)).toMatchObject({ action: 'console.access_denied', actorUserId: 'st_admin', after: { capability: 'notes.delete' } });
    for (const reason of [undefined, '', 'too short', 'x'.repeat(501)]) {
      const res = await post(`/api/console/notes/${id}/delete`, reason === undefined ? {} : { reason }, 'st1');
      expect(res.statusCode, String(reason)).toBe(422);
      expect(body<{ code: string; error: string }>(res)).toEqual({ code: 'reason_required', error: 'Give a reason of 10 to 500 characters.' });
    }
    const ok = await post(`/api/console/notes/${id}/delete`, { reason: 'Written on the wrong workspace.' }, 'st1');
    expect(ok.statusCode).toBe(200);
    expect(await list('workspace', 'northline')).toEqual([]);
    const [row] = await (await testDatabase()).select().from(staffNotes).where(eq(staffNotes.id, Number(id)));
    // Soft: the row is kept, words and all, with when, who and why.
    expect(row).toMatchObject({ body: 'Wrong workspace, sorry.', deletedAt: NOW, deletedBy: 'st1', deleteReason: 'Written on the wrong workspace.' });
    const last = (await auditRows()).at(-1)!;
    expect(last).toMatchObject({ action: 'note.delete', outcome: 'ok', actorUserId: 'st1', reason: 'Written on the wrong workspace.', targetType: 'workspace', targetId: 'northline', after: { noteId: id, length: 23 } });
    expect(JSON.stringify(last)).not.toContain('sorry');
    // Twice is a 404, and a note that never was too.
    expect((await post(`/api/console/notes/${id}/delete`, { reason: 'Written on the wrong workspace.' }, 'st1')).statusCode).toBe(404);
    expect((await post('/api/console/notes/999/delete', { reason: 'Written on the wrong workspace.' }, 'st1')).statusCode).toBe(404);
    expect((await post('/api/console/notes/abc/delete', { reason: 'Written on the wrong workspace.' }, 'st1')).statusCode).toBe(404);
  });

  it('is immutable in the database: no edit, no hard delete, one soft delete', async () => {
    const db = await testDatabase();
    const id = Number(body<StaffNote>(await create('user', 'u_jamie', 'Original words.')).id);
    const refusal = (p: Promise<unknown>) =>
      p.then(
        () => 'no error',
        (e: { cause?: { message?: string }; message: string }) => e.cause?.message ?? e.message,
      );
    expect(await refusal(db.execute(sql`update staff_notes set body = 'Edited.' where id = ${id}`))).toMatch(/immutable/);
    expect(await refusal(db.execute(sql`update staff_notes set target_id = 'u_rosa' where id = ${id}`))).toMatch(/immutable/);
    expect(await refusal(db.execute(sql`delete from staff_notes where id = ${id}`))).toMatch(/immutable/);
    // A deletion is all of when, who and why (10 to 500 characters), or the CHECK refuses it.
    expect(await refusal(db.execute(sql`update staff_notes set deleted_at = ${NOW} where id = ${id}`))).not.toBe('no error');
    expect(await refusal(db.execute(sql`update staff_notes set deleted_at = ${NOW}, deleted_by = 'st1', delete_reason = 'short' where id = ${id}`))).not.toBe('no error');
    expect(await refusal(db.execute(sql`update staff_notes set deleted_at = ${NOW}, deleted_by = 'st1', delete_reason = 'A good enough reason.' where id = ${id}`))).toBe('no error');
    expect(await refusal(db.execute(sql`update staff_notes set delete_reason = 'Another good reason.' where id = ${id}`))).toMatch(/immutable/);
    const [row] = await db.select().from(staffNotes).where(eq(staffNotes.id, id));
    expect(row).toMatchObject({ body: 'Original words.', targetId: 'u_jamie', deleteReason: 'A good enough reason.' });
    // The body's own bounds are the database's too.
    expect(await refusal(db.insert(staffNotes).values({ targetType: 'user', targetId: 'u_jamie', authorUserId: 'st1', body: '', createdAt: NOW }))).not.toBe('no error');
    expect(await refusal(db.insert(staffNotes).values({ targetType: 'team', targetId: 'u_jamie', authorUserId: 'st1', body: 'x', createdAt: NOW }))).not.toBe('no error');
  });

  it('never appears in /api/snapshot, for staff or for the learner it is about', async () => {
    await create('user', 'u_alex', 'SNAPSHOT-SENTINEL-user-note');
    await create('workspace', 'northline', 'SNAPSHOT-SENTINEL-workspace-note');
    for (const who of ['st1', 'st4', 'u_alex', 'u_jamie']) {
      const res = await get('/api/snapshot', who);
      expect(res.statusCode, who).toBe(200);
      expect(res.body, who).not.toContain('SNAPSHOT-SENTINEL');
      expect(res.body, who).not.toContain('staff_note');
    }
  });

  it('allows 20 writes a minute; the 21st is 429', async () => {
    for (let i = 0; i < 20; i++) expect((await create('user', 'u_jamie', `Note ${i}`)).statusCode).toBe(201);
    expect((await create('user', 'u_jamie', 'One too many')).statusCode).toBe(429);
  });
});

// ================================================================================================

describe('search (spec § 7.5) @console', () => {
  const search = async (q: string, who = 'st4') => {
    const res = await get(`${CONSOLE_PATHS.search}?q=${encodeURIComponent(q)}`, who);
    return { res, groups: res.statusCode === 200 ? body<{ q: string; groups: SearchResults }>(res).groups : null };
  };

  it('answers four groups: users, workspaces, orders and skills', async () => {
    const { groups } = await search('northline');
    expect(Object.keys(groups!)).toEqual(['users', 'workspaces', 'orders', 'skills']);
    expect(groups!.workspaces).toEqual([{ id: 'northline', label: 'Northline Realty Team', detail: 'alex@northlinerealty.com', href: '/admin/workspaces/northline' }]);
    expect(groups!.users.length).toBe(5);
    expect(groups!.orders.map((o) => o.id)).toEqual(['o_north_pending', 'o_north']);
    expect(groups!.orders[1]).toEqual({ id: 'o_north', label: 'o_north', detail: `${CONSOLE_PLAN_LABELS.cohort}, Paid`, href: '/admin/workspaces/northline' });
  });

  it('matches ids and Stripe ids exactly, never a part of one', async () => {
    expect((await search('cus_North123')).groups!.workspaces.map((w) => w.id)).toEqual(['northline']);
    expect((await search('cus_North123')).groups!.orders.map((o) => o.id)).toEqual(['o_north']);
    expect((await search('pi_North1')).groups!.orders.map((o) => o.id)).toEqual(['o_north']);
    expect((await search('sub_North1')).groups!.orders.map((o) => o.id)).toEqual(['o_north']);
    expect((await search('cs_test_harbor2')).groups!.orders.map((o) => o.id)).toEqual(['o_harbor_ins']);
    expect((await search('cus_North12')).groups!.orders).toEqual([]);
    expect((await search('cus_North12')).groups!.workspaces).toEqual([]);
    expect((await search('u_kenji')).groups!.users.map((u) => u.id)).toEqual(['u_kenji']);
    expect((await search('u_kenj')).groups!.users).toEqual([]);
  });

  it('matches an email anywhere in it, in any case, and a name', async () => {
    expect((await search('ORTIZHOMES')).groups!.users.map((u) => u.id)).toEqual(['u_jamie']);
    expect((await search('Jamie')).groups!.users.map((u) => u.id)).toEqual(['u_jamie']);
    expect((await search('harborpine')).groups!.orders.map((o) => o.id).sort()).toEqual(['o_harbor', 'o_harbor_ins']);
  });

  it('escapes % and _ so they match only themselves', async () => {
    await (await testDatabase()).insert(users).values([
      { id: 'u_pct', email: 'fifty%off@example.com', name: 'Percent Person', kind: 'learner' },
      { id: 'u_under', email: 'first_last@example.com', name: 'Under Score', kind: 'learner' },
      { id: 'u_plain', email: 'firstxlast@example.com', name: 'Plain Person', kind: 'learner' },
    ]);
    expect((await search('%%')).groups!.users).toEqual([]);
    expect((await search('y%o')).groups!.users.map((u) => u.id)).toEqual(['u_pct']);
    expect((await search('t_l')).groups!.users.map((u) => u.id)).toEqual(['u_under']);
    expect((await search('__')).groups!.users).toEqual([]);
    expect((await search('\\%')).groups!.users).toEqual([]);
  });

  it('binds every value: a query that looks like SQL is only words', async () => {
    const { res, groups } = await search("'; drop table users; --");
    expect(res.statusCode).toBe(200);
    expect(groups).toEqual({ users: [], workspaces: [], orders: [], skills: [] });
    expect((await (await testDatabase()).select({ id: users.id }).from(users)).length).toBeGreaterThan(10);
  });

  it('caps every group at 5', async () => {
    const { groups } = await search('@');
    // One character is too short; a domain fragment that most share.
    expect(groups).toBeNull();
    const many = await search('.com');
    for (const g of Object.values(many.groups!)) expect(g.length).toBeLessThanOrEqual(5);
    expect(many.groups!.users).toHaveLength(5);
  });

  it('wants 2 to 100 characters', async () => {
    for (const q of ['', 'a', ' a ', 'x'.repeat(101)]) {
      const { res } = await search(q);
      expect(res.statusCode, JSON.stringify(q)).toBe(400);
      expect(body<{ code: string }>(res).code).toBe('invalid_query');
    }
    expect((await search('x'.repeat(100))).res.statusCode).toBe(200);
    expect((await search(' ab ')).res.statusCode).toBe(200);
  });

  it('allows 30 searches a minute; the 31st is 429', async () => {
    for (let i = 0; i < 30; i++) expect((await search('jamie')).res.statusCode).toBe(200);
    expect((await search('jamie')).res.statusCode).toBe(429);
  });

  it('writes nothing', async () => {
    await search('northline');
    await get(CONSOLE_PATHS.workspaces);
    await get('/api/console/users/u_alex');
    expect(await auditRows()).toEqual([]);
  });
});
