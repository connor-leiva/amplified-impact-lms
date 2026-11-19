// The deploy's test learner (D-200): one verified non-staff user, Utah Life the way a domain member
// gets it, a password the set-password route would store, and a second run that writes nothing.
// The address and the password are made in the test. Neither is a value anyone would set in Railway.
import { randomBytes } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { toggleChecklistItem, toggleStep } from '@ai/core/mutations';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, verifyPassword } from '../src/auth';
import { GROUP_FOREVER, groupAccessOf } from '../src/billing/access-groups';
import { cohortSeatsSold } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import { readSeedTestMember, seedTestMember, seedTestMemberLine, SEED_TEST_MEMBER_ACTOR } from '../src/db/seed-test-member';
import { accessGroups, accounts, auditLog, emailVerifications, orders, plans, userPasswords, users } from '../src/db/schema';
import { courseEntryFor } from '../src/lib/course-access';
import { enqueueLogins } from '../src/jobs/ghl-logins';
import { outboxFor, resetOutbox } from '../src/email/transport';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-19T12:00:00-07:00');
const VARS = ['SEED_TEST_MEMBER_EMAIL', 'SEED_TEST_MEMBER_PASSWORD', 'SEED_TEST_MEMBER_NAME', 'SEED_TEST_MEMBER_KIND'] as const;

let db: Database;
let app: App;

/** An address and a password that exist only for this test. Not written down anywhere else. */
function freshMember(): { email: string; password: string; stored: string } {
  const email = `Seed.${randomBytes(8).toString('hex')}@LiveUtah.com`;
  const password = randomBytes(24).toString('base64url');
  return { email, password, stored: email.toLowerCase() };
}

function clearVars(): void {
  for (const key of VARS) delete process.env[key];
}

/** Everything the step might print. Stop the watch before an assertion that could quote a value. */
function watchOutput(): { read: () => string; stop: () => void } {
  const chunks: string[] = [];
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  const saved = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const push = (value: unknown) => {
    chunks.push(typeof value === 'string' ? value : JSON.stringify(value));
  };
  process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
    push(chunk);
    return stdout(chunk as never, ...(rest as []));
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
    push(chunk);
    return stderr(chunk as never, ...(rest as []));
  }) as typeof process.stderr.write;
  console.log = (...args: unknown[]) => {
    push(args.map(String).join(' '));
    saved.log(...args);
  };
  console.info = (...args: unknown[]) => {
    push(args.map(String).join(' '));
    saved.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    push(args.map(String).join(' '));
    saved.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    push(args.map(String).join(' '));
    saved.error(...args);
  };
  console.debug = (...args: unknown[]) => {
    push(args.map(String).join(' '));
    saved.debug(...args);
  };
  return {
    read: () => chunks.join('\n'),
    stop: () => {
      process.stdout.write = stdout as typeof process.stdout.write;
      process.stderr.write = stderr as typeof process.stderr.write;
      console.log = saved.log;
      console.info = saved.info;
      console.warn = saved.warn;
      console.error = saved.error;
      console.debug = saved.debug;
    },
  };
}

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const table of ['users', 'teams', 'orders', 'accounts', 'plans', 'email_verifications', 'user_passwords', 'audit_log', 'ghl_logins', 'email_log']) {
    const rows = await db.execute(sql.raw(`select count(*)::int as n from ${table}`));
    out[table] = Number((rows as unknown as { n: number }[])[0]!.n);
  }
  return out;
}

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  db = await testDatabase();
  app = await build({ logger: false });
});

afterAll(async () => {
  clearVars();
  delete process.env.FIXED_NOW;
  await app?.close();
});

beforeEach(async () => {
  clearVars();
  resetOutbox();
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase();
  await db.insert(accessGroups).values({
    id: 'utah-life',
    name: 'Utah Life',
    plan: 'agent_plan',
    emailDomain: 'liveutah.com',
    expiresAt: null,
    createdAt: NOW - 86_400_000,
  });
});

afterEach(() => {
  clearVars();
});

describe('readSeedTestMember', () => {
  it('is absent unless both the email and the password are set', () => {
    const email = `person.${randomBytes(4).toString('hex')}@example.test`;
    const password = randomBytes(12).toString('hex');
    expect(readSeedTestMember({})).toBeNull();
    expect(readSeedTestMember({ SEED_TEST_MEMBER_EMAIL: '  ' })).toBeNull();
    expect(readSeedTestMember({ SEED_TEST_MEMBER_EMAIL: email })).toBeNull();
    expect(readSeedTestMember({ SEED_TEST_MEMBER_PASSWORD: password })).toBeNull();
    expect(readSeedTestMember({ SEED_TEST_MEMBER_EMAIL: email, SEED_TEST_MEMBER_PASSWORD: '' })).toBeNull();
    expect(readSeedTestMember({ SEED_TEST_MEMBER_EMAIL: ` ${email} `, SEED_TEST_MEMBER_PASSWORD: password })).toEqual({
      email,
      password,
      name: 'Connor Test',
      kind: 'utah',
    });
    const named = readSeedTestMember({
      SEED_TEST_MEMBER_EMAIL: email,
      SEED_TEST_MEMBER_PASSWORD: password,
      SEED_TEST_MEMBER_NAME: '  Ada  ',
    });
    expect(named?.name).toBe('Ada');
  });
});

describe('seedTestMember', () => {
  it('writes nothing when the variables are unset', async () => {
    const before = await counts();
    const watch = watchOutput();
    const out = await seedTestMember(db);
    const logged = watch.read();
    watch.stop();
    expect(out).toEqual({ status: 'absent' });
    expect(seedTestMemberLine(out)).toBeNull();
    expect(await counts()).toEqual(before);
    expect(logged).toBe('');
    expect(outboxFor({})).toEqual([]);
  });

  it('creates a verified non-staff learner with Utah Life access who can sign in, and a second run writes nothing', async () => {
    const { email, password, stored } = freshMember();
    process.env.SEED_TEST_MEMBER_EMAIL = email;
    process.env.SEED_TEST_MEMBER_PASSWORD = password;

    const watch = watchOutput();
    const out = await seedTestMember(db);
    const logged = watch.read() + (seedTestMemberLine(out) ?? '');
    watch.stop();

    expect(out).toEqual({ status: 'created' });
    expect(logged).not.toContain(password);
    expect(logged).not.toContain(email);
    expect(logged).not.toContain(stored);

    const [user] = await db.select().from(users).where(eq(users.email, stored));
    expect(user).toMatchObject({
      email: stored,
      name: 'Connor Test',
      kind: 'learner',
      tier: 'agent',
      role: 'Team Owner',
      status: 'active',
      staffRole: null,
    });
    expect((await loadDb()).staff).toEqual([]);
    const [verified] = await db.select().from(emailVerifications).where(eq(emailVerifications.email, stored));
    expect(verified?.email).toBe(stored);
    expect(await groupAccessOf(db, stored, NOW)).toEqual({
      plans: [{ kind: 'agent_plan', status: 'active', paidThrough: GROUP_FOREVER, liveUntil: null }],
      groups: [{ id: 'utah-life', name: 'Utah Life' }],
    });

    const [secret] = await db.select().from(userPasswords).where(eq(userPasswords.userId, user!.id));
    expect(secret!.hash.startsWith('$argon2id$')).toBe(true);
    expect(secret!.hash).not.toContain(password);
    expect(await verifyPassword(secret!.hash, password)).toBe(true);

    const audits = await db.select().from(auditLog);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorSource: 'system',
      actorRole: SEED_TEST_MEMBER_ACTOR,
      actorUserId: null,
      action: 'user.seed',
      outcome: 'ok',
      targetType: 'user',
      targetId: user!.id,
      after: { email: stored },
    });
    const auditJson = JSON.stringify(audits);
    expect(auditJson).not.toContain(password);
    expect(auditJson).not.toContain('Connor Test');
    expect(auditJson).toContain(stored);

    const money = await counts();
    expect(money.orders).toBe(0);
    expect(money.accounts).toBe(0);
    expect(money.plans).toBe(0);
    expect(money.ghl_logins).toBe(0);
    expect(money.email_log).toBe(0);
    expect(outboxFor({})).toEqual([]);

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((line) => line.startsWith(`${SESSION_COOKIE}=`))!.split(';')[0]!;
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ viewer: { actor: { kind: 'learner' }, role: 'owner' } });
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: `${password}no` } })).statusCode).toBe(400);

    const once = await counts();
    const kept = await db.select().from(users).where(eq(users.email, stored));
    const againWatch = watchOutput();
    const again = await seedTestMember(db);
    const againLogged = againWatch.read() + (seedTestMemberLine(again) ?? '');
    againWatch.stop();
    expect(again).toEqual({ status: 'skipped', reason: 'exists' });
    expect(againLogged).toContain('skipped');
    expect(againLogged).not.toContain(password);
    expect(againLogged).not.toContain(stored);
    expect(await counts()).toEqual(once);
    expect(await db.select().from(users).where(eq(users.email, stored))).toEqual(kept);
    expect((await db.select().from(userPasswords)).map((r) => r.hash)).toEqual([secret!.hash]);
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });

  it('leaves an existing user exactly as it is', async () => {
    const { email, password, stored } = freshMember();
    await db.insert(users).values({ id: 'u_keep', email: stored, name: 'Kept Name', kind: 'learner', tier: 'team', role: 'Agent', status: 'active', seq: 0 });
    const before = await db.select().from(users);
    process.env.SEED_TEST_MEMBER_EMAIL = email;
    process.env.SEED_TEST_MEMBER_PASSWORD = password;
    const out = await seedTestMember(db);
    expect(out).toEqual({ status: 'skipped', reason: 'exists' });
    expect(seedTestMemberLine(out)).toContain('skipped');
    expect(seedTestMemberLine(out)).not.toContain(stored);
    expect(seedTestMemberLine(out)).not.toContain(password);
    expect(await db.select().from(users)).toEqual(before);
    expect(await db.select().from(userPasswords)).toEqual([]);
    expect(await db.select().from(emailVerifications)).toEqual([]);
    expect(await db.select().from(auditLog)).toEqual([]);
  });

  it('writes nothing when the password will not sign in', async () => {
    const { email } = freshMember();
    const tooShort = randomBytes(2).toString('hex');
    process.env.SEED_TEST_MEMBER_EMAIL = email;
    process.env.SEED_TEST_MEMBER_PASSWORD = tooShort;
    const before = await counts();
    const out = await seedTestMember(db);
    expect(out).toEqual({ status: 'skipped', reason: 'password' });
    expect(seedTestMemberLine(out)).not.toContain(tooShort);
    expect(await counts()).toEqual(before);
  });

  it('an Accelerator learner is enrolled like a buyer, holds early access, and is not a seat', async () => {
    const email = `accel.${randomBytes(8).toString('hex')}@example.test`;
    const password = randomBytes(24).toString('base64url');
    process.env.SEED_TEST_MEMBER_EMAIL = email;
    process.env.SEED_TEST_MEMBER_PASSWORD = password;
    process.env.SEED_TEST_MEMBER_KIND = 'accelerator';

    const watch = watchOutput();
    const out = await seedTestMember(db);
    const logged = watch.read() + (seedTestMemberLine(out) ?? '');
    watch.stop();

    expect(out).toEqual({ status: 'created', kind: 'accelerator' });
    expect(logged).not.toContain(password);
    expect(logged).not.toContain(email);
    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toMatchObject({ kind: 'learner', tier: 'team', role: 'Team Owner', status: 'active', staffRole: null, isTest: true, earlyAccess: true, cohortId: 'dec26' });
    expect((await loadDb()).staff).toEqual([]);
    const [plan] = await db.select().from(plans);
    expect(plan).toMatchObject({ kind: 'cohort', option: 'full', status: 'active' });
    const [order] = await db.select().from(orders);
    expect(order).toMatchObject({ status: 'paid', plan: 'cohort', option: 'full', stripeSessionId: null, stripeCustomerId: null, amountTotal: null });
    const [account] = await db.select().from(accounts);
    expect(account?.inviteSentAt).not.toBeNull();
    expect(account?.stripeCustomerId).toBeNull();
    expect(await db.select().from(emailVerifications)).toEqual([expect.objectContaining({ email })]);
    expect(await cohortSeatsSold(db)).toBe(0);
    expect(await enqueueLogins(db, NOW)).toBe(0);
    expect(outboxFor({})).toEqual([]);
    const audits = await db.select().from(auditLog);
    expect(JSON.stringify(audits)).not.toContain(password);
    expect(audits[0]?.after).toEqual({ email, kind: 'accelerator' });
    expect(await courseEntryFor(db, user!.id, NOW)).toEqual({ open: true, preview: false, early: true });

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
    expect(login.statusCode).toBe(200);
    const course = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie: cookieOf(login.headers['set-cookie']) } });
    expect(course.statusCode).not.toBe(403);

    const once = await counts();
    const hash = (await db.select().from(userPasswords))[0]!.hash;
    const againWatch = watchOutput();
    const again = await seedTestMember(db);
    const againLogged = againWatch.read() + (seedTestMemberLine(again) ?? '');
    againWatch.stop();
    expect(again).toEqual({ status: 'unchanged' });
    expect(againLogged).not.toContain(password);
    expect(againLogged).not.toContain(email);
    expect(await counts()).toEqual(once);
    expect((await db.select().from(userPasswords))[0]!.hash).toBe(hash);
    expect(await db.select().from(auditLog)).toHaveLength(1);

    // A real buyer beside them still counts.
    await db.insert(users).values({ id: 'u_buyer', email: 'buyer@example.test', name: 'Buyer', kind: 'learner', tier: 'team', role: 'Team Owner', status: 'active', seq: 1 });
    await db.insert(accounts).values({ id: 'acct_buyer', teamId: 't_buyer', ownerUserId: 'u_buyer', ownerEmail: 'buyer@example.test', name: 'Buyer', createdAt: NOW });
    await db.insert(orders).values({ id: 'ord_buyer', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', email: 'buyer@example.test', paymentsMade: 1, amountTotal: 750000, accountId: 'acct_buyer', createdAt: NOW });
    await db.insert(plans).values({ id: 'plan_buyer', accountId: 'acct_buyer', kind: 'cohort', option: 'full', seats: 2, status: 'active', startsAt: NOW, orderId: 'ord_buyer', createdAt: NOW });
    expect(await cohortSeatsSold(db)).toBe(1);
  });

  it('an address that already has a user gains the Accelerator flag and enrollment, and not a new password', async () => {
    const email = `kept.${randomBytes(6).toString('hex')}@example.test`;
    const password = randomBytes(18).toString('base64url');
    await db.insert(users).values({ id: 'u_kept', email, name: 'Kept Name', kind: 'learner', tier: 'agent', role: 'Agent', status: 'invited', seq: 0 });
    process.env.SEED_TEST_MEMBER_EMAIL = email;
    process.env.SEED_TEST_MEMBER_PASSWORD = password;
    process.env.SEED_TEST_MEMBER_KIND = 'accelerator';
    const out = await seedTestMember(db);
    expect(out).toEqual({ status: 'ensured' });
    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toMatchObject({ name: 'Kept Name', status: 'invited', isTest: true, earlyAccess: true });
    expect(await db.select().from(userPasswords)).toEqual([]);
    expect(await db.select().from(plans)).toHaveLength(1);
    expect(await cohortSeatsSold(db)).toBe(0);
    expect(JSON.stringify(await db.select().from(auditLog))).not.toContain(password);
  });
});

function cookieOf(setCookie: string | string[] | undefined): string {
  return (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((line) => line.startsWith(`${SESSION_COOKIE}=`))!.split(';')[0]!;
}

describe('early access opens a week before its date and a check saves', () => {
  it('Mark step done and a checklist tick write for an early learner and not for anyone else', () => {
    const snap = seedProduction({ owner: { name: 'Owner', email: 'owner@example.test' } });
    const week = snap.modules.find((m) => m.id === 'accelerator-week-1')!;
    week.status = 'scheduled';
    week.opens = NOW + 86_400_000;
    snap.users.push({ id: 'u_early', name: 'Early', email: 'early@example.test', tier: 'team', role: 'Team Owner', teamId: 't1', cohortId: 'dec26', joined: NOW, last: null, status: 'active', progress: {} });
    const learner = snap.users[0]!;
    const stepId = week.checklist[0]!.id;
    const args = { moduleId: week.id, stepId };
    const blocked = toggleStep(snap, { kind: 'learner', userId: learner.id }, args, { now: NOW, id: () => 'n', course: true });
    expect(blocked.db).toBe(snap);
    const done = toggleStep(snap, { kind: 'learner', userId: learner.id }, args, { now: NOW, id: () => 'n', course: true, early: true });
    expect(done.db).not.toBe(snap);
    expect(done.db.users.find((u) => u.id === learner.id)?.progress[week.id]?.steps).toContain(stepId);
    const ticked = toggleChecklistItem(snap, { kind: 'learner', userId: learner.id }, { ...args, itemId: 'box' }, { now: NOW, id: () => 'n', course: true, early: true });
    expect(ticked.db.users.find((u) => u.id === learner.id)?.checks?.some((c) => c.itemId === 'box' && c.checked)).toBe(true);
  });
});
