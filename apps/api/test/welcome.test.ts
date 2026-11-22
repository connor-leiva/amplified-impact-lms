// The cohort welcome job: one send, the switch, no backfill, the test allowlist, and the GHL tag.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { WELCOME_SENT_TAG, WELCOME_TEST_ADDRESS, seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { accounts, auditLog, cohortEnrollments, consoleFlags, emailLog, plans, teams, users } from '../src/db/schema';
import { renderTemplate } from '../src/email/templates';
import { outboxFor, resetOutbox, resetRenderer, setRenderer } from '../src/email/transport';
import type { Fetch } from '../src/integrations/ghl';
import { runGhlWelcomeSync } from '../src/jobs/ghl-welcome';
import { sendDueWelcomes } from '../src/jobs/welcome';
import { settleObserved } from '../src/lib/observe';
import { resetDatabase, testDatabase } from './helpers';

const ENABLED = Date.parse('2026-12-09T15:00:00Z');
const ENROLLED_EARLY = Date.parse('2026-11-01T15:00:00Z');
const ENROLLED_LATE = Date.parse('2026-12-10T15:00:00Z');
const NOW = Date.parse('2026-12-10T18:00:00Z');

const log = { info() {}, warn() {}, error() {} };
const database = () => testDatabase();

async function seedOwner(id: string, email: string, enrolled: number, test = false): Promise<void> {
  const d = await database();
  await d.insert(users).values({
    id,
    email,
    name: 'Pat Buyer',
    kind: 'learner',
    role: 'Team Owner',
    tier: 'team',
    teamId: `t_${id}`,
    cohortId: 'dec26',
    status: 'invited',
    joined: enrolled,
    isTest: test,
  });
  await d.insert(teams).values({ id: `t_${id}`, name: 'Pat Group', ownerId: id, seats: 2 });
  await d.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: id, ownerEmail: email, name: 'Pat Group', createdAt: enrolled });
  await d.insert(plans).values({
    id: `plan_${id}`,
    accountId: `a_${id}`,
    kind: 'cohort',
    option: 'full',
    seats: 2,
    cohortId: 'dec26',
    status: 'active',
    startsAt: enrolled,
    orderId: `order_${id}`,
    createdAt: enrolled,
  });
}

async function flag(on: boolean, at: number): Promise<void> {
  await (await database()).insert(consoleFlags).values({ key: 'cohort_welcome_email', on, sensitive: false, updatedAt: at, updatedBy: 'st1' });
}

beforeAll(() => {
  process.env.APP_URL = 'https://learn.amplifiedimpact.test';
  setRenderer(renderTemplate);
});

beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  resetOutbox();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
  resetRenderer();
});

describe('sendDueWelcomes', () => {
  it('sends nothing while the switch is off, and writes no row', async () => {
    await seedOwner('u_off', 'off@example.com', ENROLLED_LATE);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out.held).toBe(true);
    expect(outboxFor({ template: 'cohort-welcome' })).toHaveLength(0);
    expect(await (await database()).select().from(cohortEnrollments)).toHaveLength(0);
  });

  it('sends once when the enrollment is due, and not again', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_new', 'new@example.com', ENROLLED_LATE);
    const first = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(first.sent).toBe(1);
    const mail = outboxFor({ to: 'new@example.com', template: 'cohort-welcome' });
    expect(mail).toHaveLength(1);
    expect(mail[0]?.subject).toBe('Your Access To The December 2026 Is Live');
    expect(mail[0]?.html).toContain('Welcome! Week 0 starts now.');
    expect(mail[0]?.html).toContain(' MT');
    expect(mail[0]?.html).not.toMatch(/[–—]/);
    const second = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(second.sent).toBe(0);
    expect(outboxFor({ to: 'new@example.com', template: 'cohort-welcome' })).toHaveLength(1);
    const [row] = await (await database()).select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, 'u_new'));
    expect(row?.welcomeStatus).toBe('sent');
    expect(row?.welcomeSentAt).toBe(NOW);
  });

  it('does not backfill someone already enrolled in a live cohort when the switch comes on', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_old', 'old@example.com', ENROLLED_EARLY);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out.skipped).toBe(1);
    expect(out.sent).toBe(0);
    expect(outboxFor({ template: 'cohort-welcome' })).toHaveLength(0);
    const [row] = await (await database()).select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, 'u_old'));
    expect(row?.welcomeStatus).toBe('skipped');
    const [logged] = await (await database()).select().from(emailLog).where(eq(emailLog.to, 'old@example.com'));
    expect(logged).toMatchObject({ status: 'skipped', template: 'cohort-welcome' });
  });

  it('leaves a test user unsent', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_tester', 'tester@example.com', ENROLLED_LATE, true);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out.sent).toBe(0);
    expect(outboxFor({ template: 'cohort-welcome' })).toHaveLength(0);
    const [row] = await (await database()).select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, 'u_tester'));
    expect(row?.welcomeStatus ?? null).toBeNull();
  });

  it('queues welcome-sent for a real send and skips a test user', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_new', 'new@example.com', ENROLLED_LATE);
    await seedOwner('u_tester', 'tester@example.com', ENROLLED_LATE, true);
    await sendDueWelcomes({ db: await database(), log, now: NOW });
    await (await database())
      .update(cohortEnrollments)
      .set({ welcomeStatus: 'sent', welcomeSentAt: NOW })
      .where(eq(cohortEnrollments.userId, 'u_tester'));
    const calls: { url: string; body: { tags?: string[]; email?: string } | null }[] = [];
    const fetch: Fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as { tags?: string[]; email?: string }) : null;
      calls.push({ url, body });
      if (url.endsWith('/contacts/upsert')) return Response.json({ contact: { id: 'c_new', tags: [] }, new: true });
      return Response.json({ tags: body?.tags ?? [] });
    };
    const d = await database();
    const sync = await runGhlWelcomeSync({ db: d, log, config: { token: 'pit-test', locationId: 'loc_test' }, fetch });
    expect(sync.synced).toBe(1);
    expect(calls.some((c) => c.body?.tags?.includes(WELCOME_SENT_TAG))).toBe(true);
    expect(calls.some((c) => c.body?.email === 'tester@example.com')).toBe(false);
    const [row] = await d.select().from(cohortEnrollments).where(and(eq(cohortEnrollments.userId, 'u_new'), eq(cohortEnrollments.cohortId, 'dec26')));
    expect(row?.ghlSyncedAt).not.toBeNull();
    expect(row?.ghlContactId).toBe('c_new');
  });
});

describe('the test send', () => {
  let app: App;

  beforeEach(async () => {
    await app?.close();
    app = await build({ logger: false });
  });

  afterAll(async () => {
    await settleEmails();
    await settleObserved();
    await app?.close();
  });

  const post = async (payload: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/console/welcome/test',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/json' },
      payload: payload as object,
    });

  it('sends only to the allowlist and writes an audit row', async () => {
    const refused = await post({ to: 'pat@example.com', cohortId: 'dec26' });
    expect(refused.statusCode).toBe(403);
    const ok = await post({ to: WELCOME_TEST_ADDRESS, cohortId: 'dec26' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().subject).toContain('December 2026');
    expect(outboxFor({ to: WELCOME_TEST_ADDRESS, template: 'cohort-welcome' })).toHaveLength(1);
    await settleObserved();
    const d = await database();
    const audits = await d.select().from(auditLog).where(eq(auditLog.action, 'welcome.test_send'));
    expect(audits.map((a) => a.outcome).sort()).toEqual(['denied', 'ok']);
  });
});
