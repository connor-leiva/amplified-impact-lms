// The cohort welcome job: one send, the switch, no backfill, the test allowlist, and the GHL tag. And THE
// RULE: no one whose enrollment existed when the switch came on is ever mailed, whatever the cohort's send time
// or live state; the flip records that switch-on time.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { WELCOME_SENT_TAG, WELCOME_TEST_ADDRESS, seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { accounts, auditLog, cohortEnrollments, cohorts, consoleFlags, emailLog, plans, sessions, teams, users } from '../src/db/schema';
import { invalidateConsoleFlags } from '../src/console/flags';
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

async function seedOwner(id: string, email: string, enrolled: number, test = false, planStatus: 'active' | 'ended' = 'active'): Promise<void> {
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
    status: planStatus,
    startsAt: enrolled,
    orderId: `order_${id}`,
    createdAt: enrolled,
  });
}

/** A second cohort plan for an owner `seedOwner` made: someone who buys again. */
async function seedPlan(id: string, owner: string, created: number): Promise<void> {
  await (await database()).insert(plans).values({
    id,
    accountId: `a_${owner}`,
    kind: 'cohort',
    option: 'full',
    seats: 2,
    cohortId: 'dec26',
    status: 'active',
    startsAt: created,
    orderId: `order_${id}`,
    createdAt: created,
  });
}

/** The switch as a flip leaves it: on, with the switch-on time recorded. */
async function flag(on: boolean, at: number): Promise<void> {
  await (await database()).insert(consoleFlags).values({ key: 'cohort_welcome_email', on, sensitive: false, updatedAt: at, updatedBy: 'st1', turnedOnAt: on ? at : null });
}

const enrollment = async (userId: string) =>
  (await (await database()).select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, userId)))[0];

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

describe('the switch-on rule: an enrollment that existed when the switch came on is never mailed', () => {
  const SENDS_AT = Date.parse('2026-12-12T15:00:00Z'); // after the switch, after NOW: the cohort is not live yet
  const AFTER_SEND = Date.parse('2026-12-13T15:00:00Z');

  it('skips an earlier enrollment even when the cohort goes live after the switch, and never sends it later', async () => {
    await flag(true, ENABLED);
    await (await database()).update(cohorts).set({ welcomeSendsAt: SENDS_AT }).where(eq(cohorts.id, 'dec26'));
    await seedOwner('u_old', 'old@example.com', ENROLLED_EARLY);
    await seedOwner('u_new', 'new@example.com', ENROLLED_LATE);

    // Before the send time: the earlier enrollment is skipped at once, not left waiting; the new one waits.
    const first = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(first).toMatchObject({ sent: 0, skipped: 1, waiting: 1 });
    expect((await enrollment('u_old'))).toMatchObject({ welcomeStatus: 'skipped', welcomeError: 'enrolled_before_switch' });
    expect((await enrollment('u_new'))?.welcomeStatus ?? null).toBeNull();

    // After the send time: only the enrollment made after the switch is mailed.
    process.env.FIXED_NOW = new Date(AFTER_SEND).toISOString();
    const second = await sendDueWelcomes({ db: await database(), log, now: AFTER_SEND });
    expect(second).toMatchObject({ sent: 1, skipped: 0 });
    expect(outboxFor({ to: 'new@example.com', template: 'cohort-welcome' })).toHaveLength(1);
    expect(outboxFor({ to: 'old@example.com', template: 'cohort-welcome' })).toHaveLength(0);
    expect((await enrollment('u_old'))?.welcomeStatus).toBe('skipped');

    // And never on any later tick.
    const third = await sendDueWelcomes({ db: await database(), log, now: AFTER_SEND + 86_400_000 });
    expect(third).toMatchObject({ sent: 0, skipped: 0 });
    expect(outboxFor({ to: 'old@example.com', template: 'cohort-welcome' })).toHaveLength(0);
  });

  it('skips an enrollment made at the switch-on instant: only one made after it qualifies', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_same', 'same@example.com', ENABLED);
    await seedOwner('u_after', 'after@example.com', ENABLED + 1);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out).toMatchObject({ sent: 1, skipped: 1 });
    expect((await enrollment('u_same'))?.welcomeStatus).toBe('skipped');
    expect((await enrollment('u_after'))?.welcomeStatus).toBe('sent');
    expect(outboxFor({ to: 'same@example.com', template: 'cohort-welcome' })).toHaveLength(0);
  });

  it('skips an earlier enrollment while the cohort is still waiting on the builder', async () => {
    await flag(true, ENABLED);
    await (await database()).delete(sessions).where(eq(sessions.cohortId, 'dec26'));
    await seedOwner('u_old', 'old@example.com', ENROLLED_EARLY);
    await seedOwner('u_new', 'new@example.com', ENROLLED_LATE);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out).toMatchObject({ sent: 0, skipped: 1, waiting: 1 });
    expect((await enrollment('u_old'))?.welcomeStatus).toBe('skipped');
    expect((await enrollment('u_new'))?.welcomeStatus ?? null).toBeNull();
  });

  it('treats someone who was enrolled before the switch and buys again after it as enrolled before', async () => {
    await flag(true, ENABLED);
    await seedOwner('u_back', 'back@example.com', ENROLLED_EARLY, false, 'ended');
    await seedPlan('plan_u_back_2', 'u_back', ENROLLED_LATE);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out).toMatchObject({ sent: 0, skipped: 1 });
    expect((await enrollment('u_back'))).toMatchObject({ welcomeStatus: 'skipped', enrolledAt: ENROLLED_EARLY });
    expect(outboxFor({ to: 'back@example.com', template: 'cohort-welcome' })).toHaveLength(0);
  });

  it('records the switch-on time on an on row that has none, and keeps it', async () => {
    await (await database()).insert(consoleFlags).values({ key: 'cohort_welcome_email', on: true, sensitive: false, updatedAt: ENABLED, updatedBy: 'st1' });
    await seedOwner('u_old', 'old@example.com', ENROLLED_EARLY);
    await seedOwner('u_new', 'new@example.com', ENROLLED_LATE);
    const out = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(out).toMatchObject({ sent: 1, skipped: 1 });
    const [row] = await (await database()).select().from(consoleFlags).where(eq(consoleFlags.key, 'cohort_welcome_email'));
    expect(row?.turnedOnAt).toBe(ENABLED);
  });
});

describe('the Console flip records the switch-on time', () => {
  let app: App;
  const T_ON = Date.parse('2026-12-09T15:00:00Z');
  const T_OFF = Date.parse('2026-12-09T20:00:00Z');
  const T_ON_AGAIN = Date.parse('2026-12-10T12:00:00Z');

  beforeEach(async () => {
    await app?.close();
    invalidateConsoleFlags();
    app = await build({ logger: false });
  });

  afterAll(async () => {
    await settleEmails();
    await settleObserved();
    await app?.close();
  });

  const flip = async (on: boolean, at: number) => {
    process.env.FIXED_NOW = new Date(at).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/console/flags/cohort_welcome_email',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/json' },
      payload: { on },
    });
    expect(res.statusCode).toBe(200);
    const [row] = await (await database()).select().from(consoleFlags).where(eq(consoleFlags.key, 'cohort_welcome_email'));
    return row;
  };

  it('stamps turned_on_at on, clears it off, re-stamps it on again, and mails only enrollments after the latest', async () => {
    expect(await flip(true, T_ON)).toMatchObject({ on: true, turnedOnAt: T_ON });
    // A flip to the state the flag already has changes nothing, so the switch-on time stays put.
    expect(await flip(true, T_ON + 60_000)).toMatchObject({ on: true, turnedOnAt: T_ON });

    await seedOwner('u_before', 'before@example.com', T_ON - 60_000);
    await seedOwner('u_after', 'after@example.com', T_ON + 60_000);
    const first = await sendDueWelcomes({ db: await database(), log, now: T_ON + 120_000 });
    expect(first).toMatchObject({ sent: 1, skipped: 1 });
    expect(outboxFor({ to: 'after@example.com', template: 'cohort-welcome' })).toHaveLength(1);
    expect(outboxFor({ to: 'before@example.com', template: 'cohort-welcome' })).toHaveLength(0);

    expect(await flip(false, T_OFF)).toMatchObject({ on: false, turnedOnAt: null });
    // Enrolled while the switch was off: it existed when the switch came back on, so it is never mailed.
    await seedOwner('u_while_off', 'off@example.com', T_OFF + 60_000);
    expect((await sendDueWelcomes({ db: await database(), log, now: T_OFF + 120_000 })).held).toBe(true);

    expect(await flip(true, T_ON_AGAIN)).toMatchObject({ on: true, turnedOnAt: T_ON_AGAIN });
    await seedOwner('u_new', 'new@example.com', T_ON_AGAIN + 60_000);
    const second = await sendDueWelcomes({ db: await database(), log, now: NOW });
    expect(second).toMatchObject({ sent: 1, skipped: 1 });
    expect((await enrollment('u_while_off'))).toMatchObject({ welcomeStatus: 'skipped', welcomeError: 'enrolled_before_switch' });
    expect(outboxFor({ to: 'off@example.com', template: 'cohort-welcome' })).toHaveLength(0);
    expect(outboxFor({ to: 'new@example.com', template: 'cohort-welcome' })).toHaveLength(1);
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
