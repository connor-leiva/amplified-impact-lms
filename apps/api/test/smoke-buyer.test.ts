// The smoke-test buyer (D-248, the Week 0 launch audit's H-2): a regular AI Accelerator buyer made by
// the webhook's own provisioning, active with a known password, never a test account and never early,
// refused on the deployed database, and a second run that writes nothing. The address and the password
// are made in the test.
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { COHORT_ONE } from '@ai/core/offer';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, verifyPassword } from '../src/auth';
import { cohortSeatsSold } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import {
  DEPLOYED_DATABASE,
  SMOKE_BUYER_ACTOR,
  parseSmokeBuyerArgs,
  readSmokeBuyerPassword,
  runSmokeBuyer,
  seedSmokeBuyer,
  smokeBuyerLine,
  smokeBuyerRefusal,
} from '../src/db/smoke-buyer';
import { accounts, auditLog, cohorts, orders, plans, teams, userPasswords, users } from '../src/db/schema';
import { courseEntryFor } from '../src/lib/course-access';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { resetDatabase, testDatabase, TEST_DATABASE_URL } from './helpers';

/** Thanksgiving week: after the buyer could have paid, before the preview opens. */
const NOW = Date.parse('2026-11-24T12:00:00-07:00');
const PREVIEW = Date.parse('2026-11-25T12:00:00-07:00');

let db: Database;
let app: App;

function fresh(): { email: string; password: string } {
  return { email: `smoke.${randomBytes(6).toString('hex')}@example.test`, password: randomBytes(18).toString('base64url') };
}

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of ['users', 'teams', 'orders', 'accounts', 'plans', 'user_passwords', 'audit_log', 'email_verifications', 'ghl_logins', 'email_log']) {
    const rows = await db.execute(sql.raw(`select count(*)::int as n from ${table}`));
    out[table] = Number((rows as unknown as { n: number }[])[0]!.n);
  }
  return out;
}

function cookieOf(setCookie: string | string[] | undefined): string {
  return (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((line) => line.startsWith(`${SESSION_COOKIE}=`))!.split(';')[0]!;
}

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  db = await testDatabase();
  app = await build({ logger: false });
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});

beforeEach(async () => {
  resetOutbox();
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  // The launch seed: cohort dec26 and its course, and one Owner (a staff address to refuse).
  await resetDatabase(seedProduction({ owner: { name: 'Owner Person', email: 'owner@example.test' } }));
});

describe('the arguments, the password and the guard', () => {
  it('needs an address, defaults the name, and never takes the password as a flag', () => {
    expect(parseSmokeBuyerArgs(['--email', '  Buyer@Example.TEST '])).toEqual({ email: 'buyer@example.test', name: 'Smoke Buyer' });
    expect(parseSmokeBuyerArgs(['--email', 'b@example.test', '--name', '  Dana Reyes '])).toEqual({ email: 'b@example.test', name: 'Dana Reyes' });
    expect(() => parseSmokeBuyerArgs([])).toThrow(/--email is required/);
    expect(() => parseSmokeBuyerArgs(['--email', '--name', 'x'])).toThrow(/--email needs a value/);
    expect(() => parseSmokeBuyerArgs(['--email', 'not-an-address'])).toThrow(/--email needs an email address/);
    expect(() => parseSmokeBuyerArgs(['--email', 'b@example.test', '--password', 'hunter2hunter2'])).toThrow(/SMOKE_BUYER_PASSWORD, never a flag/);
  });

  it('reads the password from SMOKE_BUYER_PASSWORD only, and never repeats it', () => {
    expect(readSmokeBuyerPassword({})).toEqual({ ok: false, error: expect.stringContaining('Set SMOKE_BUYER_PASSWORD') });
    const short = readSmokeBuyerPassword({ SMOKE_BUYER_PASSWORD: 'abc123' });
    expect(short.ok).toBe(false);
    expect(JSON.stringify(short)).not.toContain('abc123');
    const { password } = fresh();
    expect(readSmokeBuyerPassword({ SMOKE_BUYER_PASSWORD: password })).toEqual({ ok: true, password });
  });

  it('is `db:smoke-buyer`, and bare it is a usage error: the address has to be typed', async () => {
    const pkg = (await import('../package.json', { with: { type: 'json' } })).default as { scripts: Record<string, string> };
    expect(pkg.scripts['db:smoke-buyer']).toBe('tsx src/db/smoke-buyer.ts');
    expect(() => parseSmokeBuyerArgs(pkg.scripts['db:smoke-buyer']!.split(/\s+/).slice(2))).toThrow(/--email is required/);
  });

  it('refuses production by Railway’s variable, and the deployed database’s name unless Railway names another environment', () => {
    expect(DEPLOYED_DATABASE).toBe('railway');
    expect(smokeBuyerRefusal('ai_lms_dev', {})).toBeNull();
    expect(smokeBuyerRefusal('railway', {})).toMatch(/points at 'railway'.*D-019/);
    expect(smokeBuyerRefusal('railway', { RAILWAY_ENVIRONMENT_NAME: '  ' })).toMatch(/points at 'railway'/);
    expect(smokeBuyerRefusal('railway', { RAILWAY_ENVIRONMENT_NAME: 'staging' })).toBeNull();
    expect(smokeBuyerRefusal('railway', { RAILWAY_ENVIRONMENT_NAME: 'production' })).toMatch(/RAILWAY_ENVIRONMENT_NAME is production/);
    expect(smokeBuyerRefusal('ai_lms_dev', { RAILWAY_ENVIRONMENT_NAME: 'Production' })).toMatch(/RAILWAY_ENVIRONMENT_NAME is production/);
  });

  it('the CLI stops before it connects: a usage error, a missing password, the deployed database', async () => {
    const run = async (argv: string[], env: NodeJS.ProcessEnv) => {
      const out: string[] = [];
      let connected = 0;
      const code = await runSmokeBuyer(argv, {
        env,
        db: () => {
          connected += 1;
          return db;
        },
        close: async () => {},
        write: (line) => out.push(line),
        now: () => NOW,
      });
      return { code, out: out.join(''), connected };
    };
    const { email, password } = fresh();
    const start = await counts();
    const deployed = 'postgres://u:p@db.example.test:5432/railway';
    expect(await run([], { SMOKE_BUYER_PASSWORD: password, DATABASE_URL: deployed })).toMatchObject({ code: 2, connected: 0 });
    expect(await run(['--email', email], { DATABASE_URL: deployed })).toMatchObject({ code: 2, connected: 0 });
    const refused = await run(['--email', email], { SMOKE_BUYER_PASSWORD: password, DATABASE_URL: deployed });
    expect(refused).toMatchObject({ code: 1, connected: 0 });
    expect(refused.out).toMatch(/Refusing: DATABASE_URL points at 'railway'/);
    expect(refused.out).not.toContain(password);
    const prod = await run(['--email', email], { SMOKE_BUYER_PASSWORD: password, DATABASE_URL: TEST_DATABASE_URL, RAILWAY_ENVIRONMENT_NAME: 'production' });
    expect(prod).toMatchObject({ code: 1, connected: 0 });
    expect(await counts()).toEqual(start);

    // Pointed at a development database, it writes, and says so without the password.
    const ok = await run(['--email', email, '--name', 'Dana Reyes'], { SMOKE_BUYER_PASSWORD: password, DATABASE_URL: TEST_DATABASE_URL });
    expect(ok).toMatchObject({ code: 0, connected: 1 });
    expect(ok.out).toContain(`Created the regular AI Accelerator buyer ${email}`);
    expect(ok.out).not.toContain(password);
  });
});

describe('seedSmokeBuyer', () => {
  it('makes the buyer a paid purchase provisions: active, its own team and seats, not a test account, not early', async () => {
    const { email, password } = fresh();
    const out = await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, password, NOW);
    expect(out).toEqual({ status: 'created' });

    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toMatchObject({ name: 'Dana Reyes', kind: 'learner', tier: 'team', role: 'Team Owner', status: 'active', staffRole: null, isTest: false, earlyAccess: false, cohortId: COHORT_ONE.id });
    const [team] = await db.select().from(teams).where(eq(teams.id, user!.teamId!));
    expect(team).toMatchObject({ ownerId: user!.id, seats: 2, name: 'Dana Reyes' });
    const [account] = await db.select().from(accounts).where(eq(accounts.ownerEmail, email));
    expect(account).toMatchObject({ teamId: user!.teamId, ownerUserId: user!.id, stripeCustomerId: null });
    expect(account!.inviteSentAt).not.toBeNull();
    const [order] = await db.select().from(orders);
    expect(order).toMatchObject({ plan: 'cohort', option: 'full', status: 'paid', email, accountId: account!.id, stripeSessionId: null, stripeCustomerId: null, stripeSubscriptionId: null, amountTotal: null });
    const [plan] = await db.select().from(plans);
    // The plan a buyer gets: active, opening with the first live build (D-153), as `initialPlanDates` sets it.
    expect(plan).toMatchObject({ accountId: account!.id, kind: 'cohort', option: 'full', status: 'active', seats: 2, cohortId: COHORT_ONE.id, orderId: order!.id, stripeSubscriptionId: null });
    expect(Number(plan!.startsAt)).toBe(COHORT_ONE.firstBuildAt);
    const [stored] = await db.select().from(userPasswords).where(eq(userPasswords.userId, user!.id));
    expect(await verifyPassword(stored!.hash, password)).toBe(true);

    // A real seat, and no email: nothing was sent, and the held-invite loop has nothing to send.
    expect(await cohortSeatsSold(db)).toBe(1);
    expect(outboxFor({})).toEqual([]);
    const audits = await db.select().from(auditLog);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'user.seed', actorSource: 'system', actorRole: SMOKE_BUYER_ACTOR, targetId: user!.id, after: { email, kind: 'smoke-buyer' } });
    expect(JSON.stringify(audits)).not.toContain(password);
    expect(smokeBuyerLine(out, email)).not.toContain(password);
  });

  it('keeps every date a buyer keeps: shut before the Preview opens date, the preview after it, never early', async () => {
    const { email, password } = fresh();
    await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, password, NOW);
    const [user] = await db.select().from(users).where(eq(users.email, email));

    // No preview date (the audit's B-1): nothing opens until the first live build.
    expect(await courseEntryFor(db, user!.id, NOW)).toEqual({ open: false, preview: false });
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
    expect(login.statusCode).toBe(200);
    const before = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie: cookieOf(login.headers['set-cookie']) } });
    expect(before.statusCode).toBe(403);
    expect(before.json()).toMatchObject({ upcoming: true, opensAt: COHORT_ONE.firstBuildAt });

    // With the cohort's Preview opens date: the countdown names it, and once it passes, the preview.
    await db.update(cohorts).set({ previewOpensAt: PREVIEW }).where(eq(cohorts.id, COHORT_ONE.id));
    expect((await app.inject({ method: 'GET', url: '/api/course', headers: { cookie: cookieOf(login.headers['set-cookie']) } })).json()).toMatchObject({ upcoming: true, opensAt: PREVIEW });
    expect(await courseEntryFor(db, user!.id, PREVIEW)).toEqual({ open: true, preview: true });
  });

  it('a second run writes nothing', async () => {
    const { email, password } = fresh();
    await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, password, NOW);
    const once = await counts();
    const hash = (await db.select().from(userPasswords))[0]!.hash;
    expect(await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, password, NOW + 60_000)).toEqual({ status: 'unchanged' });
    expect(await counts()).toEqual(once);
    expect((await db.select().from(userPasswords))[0]!.hash).toBe(hash);
  });

  it('refreshes an existing learner into a regular buyer: a plan, the password, active', async () => {
    const { email, password } = fresh();
    await db.insert(users).values({ id: 'u_old', email, name: 'Old Name', kind: 'learner', tier: 'agent', role: 'Agent', status: 'invited', earlyAccess: true, seq: 0 });
    const out = await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, password, NOW);
    expect(out).toEqual({ status: 'refreshed', changed: ['early-access', 'plan', 'password', 'active'] });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toMatchObject({ id: 'u_old', name: 'Old Name', tier: 'team', role: 'Team Owner', status: 'active', isTest: false, earlyAccess: false });
    expect(await db.select().from(plans)).toHaveLength(1);
    expect(await courseEntryFor(db, 'u_old', NOW)).toEqual({ open: false, preview: false });

    // A new password is a refresh of the password alone; the plan is not bought twice.
    const next = fresh().password;
    expect(await seedSmokeBuyer(db, { email, name: 'Dana Reyes' }, next, NOW)).toEqual({ status: 'refreshed', changed: ['password'] });
    expect(await db.select().from(plans)).toHaveLength(1);
    expect(await db.select().from(orders)).toHaveLength(1);
    const [stored] = await db.select().from(userPasswords);
    expect(await verifyPassword(stored!.hash, next)).toBe(true);
    expect(JSON.stringify(await db.select().from(auditLog))).not.toContain(next);
  });

  it('refuses a staff address, the seeded test learner and someone on another owner’s team, writing nothing', async () => {
    const { password } = fresh();
    const before = await counts();
    expect(await seedSmokeBuyer(db, { email: 'owner@example.test', name: 'X' }, password, NOW)).toEqual({ status: 'refused', reason: 'staff' });

    await db.insert(users).values({ id: 'u_test', email: 'test@example.test', name: 'Test', kind: 'learner', tier: 'team', role: 'Team Owner', status: 'active', isTest: true, earlyAccess: true, seq: 1 });
    await db.insert(users).values({ id: 'u_boss', email: 'boss@example.test', name: 'Boss', kind: 'learner', tier: 'team', role: 'Team Owner', status: 'active', teamId: 't_boss', seq: 2 });
    await db.insert(teams).values({ id: 't_boss', name: 'Boss Team', ownerId: 'u_boss', seats: 2 });
    await db.insert(users).values({ id: 'u_ops', email: 'ops@example.test', name: 'Ops', kind: 'learner', tier: 'team', role: 'Operations Lead', status: 'active', teamId: 't_boss', seq: 3 });
    const seeded = await counts();
    expect(seeded.users).toBe(before.users! + 3);

    expect(await seedSmokeBuyer(db, { email: 'test@example.test', name: 'X' }, password, NOW)).toEqual({ status: 'refused', reason: 'test-account' });
    // Provisioning refuses the operator; the paid order written before it is rolled back with it.
    const other = await seedSmokeBuyer(db, { email: 'ops@example.test', name: 'X' }, password, NOW);
    expect(other).toEqual({ status: 'refused', reason: 'other-team' });
    expect(smokeBuyerLine(other, 'ops@example.test')).toMatch(/^Refused: .*Nothing was written\.\n$/);
    expect(await counts()).toEqual(seeded);
    const [test] = await db.select().from(users).where(eq(users.id, 'u_test'));
    expect(test).toMatchObject({ isTest: true, earlyAccess: true });
  });
});
