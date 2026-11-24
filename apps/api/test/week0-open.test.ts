// The Week 0 Is Open email job: the switch (off writes nothing), once per owner (two ticks, two replicas), THE RULE (only
// enrollments that existed at the switch-on time; later ones are the welcome's), the course roster (invited buyers in;
// test accounts, paused and ended plans, Insiders, the Agent Plan, $37 skill buyers and Utah Life out), the preview's
// timing, the builder waits, a lost claim and a failed send, never both emails in any order, the test send and the flip.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { WEEK0_OPEN_FLAG, WELCOME_TEST_ADDRESS } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { SIX_TASK_BASELINE } from '@ai/core/seed/weeks-0-3-v2';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { accessGroupMembers, accessGroups, accounts, auditLog, cohortEnrollments, cohorts, consoleFlags, emailLog, modules, plans, sessions, skillPurchases, teams, users } from '../src/db/schema';
import { invalidateConsoleFlags } from '../src/console/flags';
import { renderTemplate } from '../src/email/templates';
import { outboxFor, resetOutbox, resetRenderer, setRenderer } from '../src/email/transport';
import { readWeeks } from '../src/jobs/enrollments';
import { sendWeek0Open } from '../src/jobs/week0-open';
import { sendDueWelcomes } from '../src/jobs/welcome';
import { settleObserved } from '../src/lib/observe';
import { resetDatabase, testDatabase } from './helpers';
import { liveWithCourse } from './accelerator-course';

const ENROLLED = Date.parse('2026-11-20T15:00:00Z');
const SWITCH_ON = Date.parse('2026-11-25T16:00:00Z');
const PREVIEW = Date.parse('2026-11-26T19:00:00Z');
const NOW = Date.parse('2026-11-26T20:00:00Z');

const database = () => testDatabase();

interface Logged {
  warn: { obj: Record<string, unknown>; msg: string }[];
}
const logged: Logged = { warn: [] };
const log = {
  info() {},
  warn(obj: Record<string, unknown>, msg: string) {
    logged.warn.push({ obj, msg });
  },
  error() {},
};

interface Owner {
  test?: boolean;
  status?: 'invited' | 'active';
  kind?: string;
  option?: string;
  planStatus?: string;
}

/** A team owner with one plan (an AI Accelerator plan bought in full, unless told otherwise). */
async function seedOwner(id: string, email: string, enrolled: number, o: Owner = {}): Promise<void> {
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
    status: o.status ?? 'invited',
    joined: enrolled,
    isTest: o.test ?? false,
  });
  await d.insert(teams).values({ id: `t_${id}`, name: 'Pat Group', ownerId: id, seats: 2 });
  await d.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: id, ownerEmail: email, name: 'Pat Group', createdAt: enrolled });
  if (o.kind === 'none') return;
  await d.insert(plans).values({
    id: `plan_${id}`,
    accountId: `a_${id}`,
    kind: o.kind ?? 'cohort',
    option: o.option ?? 'full',
    seats: 2,
    cohortId: (o.kind ?? 'cohort') === 'cohort' ? 'dec26' : null,
    status: o.planStatus ?? 'active',
    startsAt: enrolled,
    orderId: `order_${id}`,
    createdAt: enrolled,
  });
}

/** A Console flag as a flip leaves it: on, with the switch-on time recorded. */
async function flag(key: string, at: number): Promise<void> {
  await (await database()).insert(consoleFlags).values({ key, on: true, sensitive: false, updatedAt: at, updatedBy: 'st1', turnedOnAt: at });
}
const week0On = (at = SWITCH_ON) => flag(WEEK0_OPEN_FLAG, at);
const welcomeOn = (at: number) => flag('cohort_welcome_email', at);

async function previewOpensAt(at: number | null): Promise<void> {
  await (await database()).update(cohorts).set({ previewOpensAt: at }).where(eq(cohorts.id, 'dec26'));
}

const enrollment = async (userId: string) => (await (await database()).select().from(cohortEnrollments).where(eq(cohortEnrollments.userId, userId)))[0];
const tick = (now = NOW) => sendWeek0Open({ db: undefined, log, now });
const mailTo = (to: string) => outboxFor({ to, template: 'week0-open' });

beforeAll(() => {
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
  setRenderer(renderTemplate);
});

beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(liveWithCourse());
  // The demo seed's sessions survive the curriculum ensure; Week 1's live build is the cohort's first, Wed, Dec 2,
  // 12:00 to 1:30 PM MT, as Connor's schedule has it.
  await (await database()).update(sessions).set({ start: Date.parse('2026-12-02T19:00:00Z'), mins: 90 }).where(eq(sessions.id, 'dec26-s1'));
  await previewOpensAt(PREVIEW);
  resetOutbox();
  logged.warn = [];
});

afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
  resetRenderer();
});

describe('Week 0 from the stored course', () => {
  it('reads Week 0’s Due, title, steps and baseline count off the module, and the count matches the seeded table', async () => {
    const week0 = (await readWeeks(await database())).find((w) => w.week === 0)!;
    expect(week0.dueAt).toBe(Date.parse('2026-11-30T19:00:00Z'));
    expect(week0.title).toBe('Foundations');
    expect(week0.steps).toBe(8);
    expect(week0.baselineTasks).toBe(SIX_TASK_BASELINE.length);
    expect(SIX_TASK_BASELINE.length).toBe(6);
  });
});

describe('sendWeek0Open: the switch and once per owner', () => {
  it('sends nothing while the switch is off, and writes no row and no email_log line', async () => {
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    const out = await tick();
    expect(out.held).toBe(true);
    expect(mailTo('owner@example.com')).toHaveLength(0);
    const d = await database();
    expect(await d.select().from(cohortEnrollments)).toHaveLength(0);
    expect(await d.select().from(emailLog).where(eq(emailLog.template, 'week0-open'))).toHaveLength(0);
  });

  it('sends once to an owner enrolled at the switch-on time, after the preview opens, and never again', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    const first = await tick();
    expect(first).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
    const mail = mailTo('owner@example.com');
    expect(mail).toHaveLength(1);
    expect(mail[0]?.subject).toBe('🎉 Welcome to the December Cohort: Week 0 Is Open');
    expect(mail[0]?.html).toContain('Pat, We’re Officially Underway!');
    expect(mail[0]?.html).toContain('Mon, Nov 30, 2026 at 12:00 PM MT</span> / <span style="white-space:nowrap;">1:00 PM CT');
    expect(mail[0]?.html).toContain('Wed, Dec 2, 12:00 to 1:30 PM MT</span> / <span style="white-space:nowrap;">1:00 to 2:30 PM CT');
    expect(mail[0]?.html).toContain('src="https://learn.amplifiedimpact.io/brand/week0-confetti.gif"');
    expect(mail[0]?.html).toContain('href="https://learn.amplifiedimpact.io/learn/week/0"');
    expect(await enrollment('u_owner')).toMatchObject({ week0Status: 'sent', week0SentAt: NOW, week0Error: null });

    const second = await tick(NOW + 60_000);
    expect(second).toMatchObject({ sent: 0, skipped: 0 });
    expect(mailTo('owner@example.com')).toHaveLength(1);
  });

  it('sends exactly one email when two replicas tick at once', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    const [a, b] = await Promise.all([sendWeek0Open({ log, now: NOW }), sendWeek0Open({ log, now: NOW })]);
    expect(a.sent + b.sent).toBe(1);
    expect(mailTo('owner@example.com')).toHaveLength(1);
    await tick(NOW + 60_000);
    expect(mailTo('owner@example.com')).toHaveLength(1);
  });

  it('never mails an enrollment made after the switch-on time: that one is the welcome’s, marked skipped and logged', async () => {
    await week0On();
    await seedOwner('u_at', 'at@example.com', SWITCH_ON);
    await seedOwner('u_later', 'later@example.com', SWITCH_ON + 1);
    const out = await tick();
    expect(out).toMatchObject({ sent: 1, skipped: 1 });
    expect(mailTo('at@example.com')).toHaveLength(1);
    expect(mailTo('later@example.com')).toHaveLength(0);
    expect(await enrollment('u_later')).toMatchObject({ week0Status: 'skipped', week0Error: 'enrolled_after_switch' });
    const [line] = await (await database()).select().from(emailLog).where(eq(emailLog.to, 'later@example.com'));
    expect(line).toMatchObject({ template: 'week0-open', status: 'skipped', subject: '🎉 Welcome to the December Cohort: Week 0 Is Open' });
    expect((await tick(NOW + 86_400_000)).sent).toBe(0);
    expect(mailTo('later@example.com')).toHaveLength(0);
  });
});

describe('sendWeek0Open: the Accelerator course roster', () => {
  it('mails an invited owner who has never signed in, and an active one, and an owner who paid in two payments', async () => {
    await week0On();
    await seedOwner('u_invited', 'invited@example.com', ENROLLED, { status: 'invited' });
    await seedOwner('u_active', 'active@example.com', ENROLLED, { status: 'active' });
    await seedOwner('u_two', 'two@example.com', ENROLLED, { option: 'two_pay' });
    expect((await tick()).sent).toBe(3);
    for (const to of ['invited@example.com', 'active@example.com', 'two@example.com']) expect(mailTo(to), to).toHaveLength(1);
  });

  it('never mails a test account, a paused or ended plan, Insiders, the Agent Plan, a $37 skill buyer or Utah Life', async () => {
    await week0On();
    const d = await database();
    await seedOwner('u_test', 'test@example.com', ENROLLED, { test: true });
    await seedOwner('u_paused', 'paused@example.com', ENROLLED, { option: 'two_pay', planStatus: 'past_due' });
    await seedOwner('u_ended', 'ended@example.com', ENROLLED, { planStatus: 'ended' });
    await seedOwner('u_insiders', 'insiders@example.com', ENROLLED, { kind: 'membership', option: 'monthly' });
    await seedOwner('u_agent', 'agent@example.com', ENROLLED, { kind: 'agent_plan', option: 'monthly' });
    await seedOwner('u_skill', 'skill@example.com', ENROLLED, { kind: 'none' });
    await d.insert(skillPurchases).values({ id: 'sp_1', userId: 'u_skill', accountId: 'a_u_skill', skillId: 'team-pnl-review', stripeSessionId: 'cs_1', amount: 3700, purchasedAt: ENROLLED });
    await seedOwner('u_utah', 'utah@example.com', ENROLLED, { kind: 'none' });
    await d.insert(accessGroups).values({ id: 'utah_life', name: 'Utah Life', plan: 'cohort', createdAt: ENROLLED });
    await d.insert(accessGroupMembers).values({ groupId: 'utah_life', email: 'utah@example.com', addedAt: ENROLLED });
    await seedOwner('u_buyer', 'buyer@example.com', ENROLLED);

    const out = await tick();
    expect(out.sent).toBe(1);
    expect(outboxFor({ template: 'week0-open' }).map((m) => m.to)).toEqual(['buyer@example.com']);
    // The test account and the paused plan keep their rows pending (a paused buyer who pays is on the roster again).
    expect((await enrollment('u_test'))?.week0Status ?? null).toBeNull();
    expect((await enrollment('u_paused'))?.week0Status ?? null).toBeNull();
    // Every other plan and no plan at all have no enrollment row to send from.
    for (const id of ['u_ended', 'u_insiders', 'u_agent', 'u_skill', 'u_utah']) expect(await enrollment(id), id).toBeUndefined();
  });

  it('mails only the owner, not the teammates on the owner’s team', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    await (await database()).insert(users).values({ id: 'u_mate', email: 'mate@example.com', name: 'Sam Mate', kind: 'learner', role: 'AI Implementer', tier: 'team', teamId: 't_u_owner', cohortId: 'dec26', status: 'invited', joined: ENROLLED });
    await tick();
    expect(mailTo('owner@example.com')).toHaveLength(1);
    expect(mailTo('mate@example.com')).toHaveLength(0);
  });
});

describe('sendWeek0Open: when it goes', () => {
  it('waits for the preview to open, then sends on the first tick after it', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    expect((await tick(PREVIEW - 60_000)).sent).toBe(0);
    expect((await enrollment('u_owner'))?.week0Status ?? null).toBeNull();
    expect((await tick(PREVIEW)).sent).toBe(1);
  });

  it('waits while the cohort has no preview date', async () => {
    await week0On();
    await previewOpensAt(null);
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    expect((await tick(NOW + 7 * 86_400_000)).sent).toBe(0);
    expect(mailTo('owner@example.com')).toHaveLength(0);
  });

  it('sends on the first tick after the switch when the preview opened before it', async () => {
    const late = PREVIEW + 3_600_000;
    await week0On(late);
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    expect((await tick(late + 60_000)).sent).toBe(1);
  });

  it('waits on the builder while Week 0 has no Due, and never guesses a date', async () => {
    await week0On();
    await (await database()).update(modules).set({ dueAt: null }).where(eq(modules.id, acceleratorModuleId(0)));
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    const out = await tick();
    expect(out).toMatchObject({ sent: 0, waiting: 1 });
    expect(mailTo('owner@example.com')).toHaveLength(0);
    expect(logged.warn).toContainEqual({ obj: { cohort: 'dec26', reason: 'no-week0-due' }, msg: 'week 0 email is waiting on the builder' });
  });

  it('reads a Due the builder changed', async () => {
    await week0On();
    await (await database()).update(modules).set({ dueAt: Date.parse('2026-12-01T17:30:00Z') }).where(eq(modules.id, acceleratorModuleId(0)));
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    await tick();
    expect(mailTo('owner@example.com')[0]?.text).toContain('Week 0 is due Tue, Dec 1, 2026 at 10:30 AM MT / 11:30 AM CT.');
  });
});

describe('sendWeek0Open: a lost claim and a failed send are final', () => {
  it('marks a claim older than the lease failed / lost and never sends it', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    await tick(PREVIEW - 60_000); // inserts the row, still waiting
    await (await database()).update(cohortEnrollments).set({ week0Status: 'claimed', week0ClaimedAt: NOW - 16 * 60_000 }).where(eq(cohortEnrollments.userId, 'u_owner'));
    expect((await tick()).sent).toBe(0);
    expect(await enrollment('u_owner')).toMatchObject({ week0Status: 'failed', week0Error: 'lost', week0SentAt: NOW - 16 * 60_000 });
    expect((await tick(NOW + 3_600_000)).sent).toBe(0);
    expect(mailTo('owner@example.com')).toHaveLength(0);
  });

  it('marks a transport failure failed, with the time set, and does not retry it', async () => {
    await week0On();
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    setRenderer(async () => {
      throw new Error('render down');
    });
    try {
      expect((await tick()).failed).toBe(1);
    } finally {
      setRenderer(renderTemplate);
    }
    expect(await enrollment('u_owner')).toMatchObject({ week0Status: 'failed', week0Error: 'send', week0SentAt: NOW });
    expect((await tick(NOW + 60_000)).sent).toBe(0);
  });
});

describe('never both: the welcome and the Week 0 email', () => {
  // An owner who qualifies for both: enrolled after the welcome's switch-on and before the Week 0 email's.
  const WELCOME_ON = Date.parse('2026-11-18T15:00:00Z');
  const BOTH = Date.parse('2026-11-19T15:00:00Z');
  const both = async () => {
    await welcomeOn(WELCOME_ON);
    await week0On();
    await seedOwner('u_both', 'both@example.com', BOTH);
  };
  const total = () => outboxFor({ to: 'both@example.com' }).filter((m) => m.template === 'week0-open' || m.template === 'cohort-welcome');
  const welcome = (now = NOW) => sendDueWelcomes({ log, now });

  it('the Week 0 email first: the welcome then skips the owner (week0_sent)', async () => {
    await both();
    expect((await tick()).sent).toBe(1);
    expect((await welcome()).skipped).toBe(1);
    expect(total().map((m) => m.template)).toEqual(['week0-open']);
    expect(await enrollment('u_both')).toMatchObject({ week0Status: 'sent', welcomeStatus: 'skipped', welcomeError: 'week0_sent' });
  });

  it('the welcome first: the Week 0 email then skips the owner (welcome_sent)', async () => {
    await both();
    expect((await welcome()).sent).toBe(1);
    expect((await tick()).skipped).toBe(1);
    expect(total().map((m) => m.template)).toEqual(['cohort-welcome']);
    expect(await enrollment('u_both')).toMatchObject({ welcomeStatus: 'sent', week0Status: 'skipped', week0Error: 'welcome_sent' });
    const [line] = await (await database()).select().from(emailLog).where(and(eq(emailLog.to, 'both@example.com'), eq(emailLog.template, 'week0-open')));
    expect(line).toMatchObject({ status: 'skipped' });
  });

  it('both at once, on two replicas: exactly one of the two emails', async () => {
    await both();
    for (let i = 0; i < 3; i++) await Promise.all([tick(NOW + i * 60_000), welcome(NOW + i * 60_000), tick(NOW + i * 60_000), welcome(NOW + i * 60_000)]);
    expect(total()).toHaveLength(1);
  });

  it('treats a lost claim on the other side as maybe sent', async () => {
    await both();
    await tick(PREVIEW - 60_000);
    await (await database()).update(cohortEnrollments).set({ welcomeStatus: 'failed', welcomeError: 'lost' }).where(eq(cohortEnrollments.userId, 'u_both'));
    expect((await tick()).skipped).toBe(1);
    expect(total()).toHaveLength(0);
  });

  it('in Connor’s order (Week 0 on, then the welcome): today’s owners get Week 0 only, later buyers the welcome only', async () => {
    await seedOwner('u_today', 'today@example.com', ENROLLED);
    await week0On();
    expect((await tick()).sent).toBe(1);
    const WELCOME_LATER = NOW + 3_600_000;
    await welcomeOn(WELCOME_LATER);
    await seedOwner('u_later', 'later@example.com', WELCOME_LATER + 60_000);
    process.env.FIXED_NOW = new Date(WELCOME_LATER + 120_000).toISOString();
    await welcome(WELCOME_LATER + 120_000);
    await tick(WELCOME_LATER + 120_000);
    expect(outboxFor({ to: 'today@example.com' }).map((m) => m.template)).toEqual(['week0-open']);
    expect(outboxFor({ to: 'later@example.com' }).map((m) => m.template)).toEqual(['cohort-welcome']);
    expect(await enrollment('u_today')).toMatchObject({ week0Status: 'sent', welcomeStatus: 'skipped', welcomeError: 'enrolled_before_switch' });
    expect(await enrollment('u_later')).toMatchObject({ welcomeStatus: 'sent', week0Status: 'skipped', week0Error: 'enrolled_after_switch' });
  });
});

describe('the Console: the flip and the test send', () => {
  let app: App;

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

  it('the flip stamps the switch-on time, and the default is off with no row', async () => {
    const d = await database();
    expect(await d.select().from(consoleFlags).where(eq(consoleFlags.key, WEEK0_OPEN_FLAG))).toHaveLength(0);
    process.env.FIXED_NOW = new Date(SWITCH_ON).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/console/flags/week0_open_email',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/json' },
      payload: { on: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().flag).toMatchObject({ key: 'week0_open_email', on: true, label: 'Send the Week 0 Is Open email to current Accelerator owners' });
    const [row] = await d.select().from(consoleFlags).where(eq(consoleFlags.key, WEEK0_OPEN_FLAG));
    expect(row).toMatchObject({ on: true, turnedOnAt: SWITCH_ON });
  });

  const post = async (payload: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/console/week0/test',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/json' },
      payload: payload as object,
    });

  it('sends only to the allowlist, writes an audit row each time, and never touches an enrollment', async () => {
    await seedOwner('u_owner', 'owner@example.com', ENROLLED);
    const refused = await post({ to: 'owner@example.com', cohortId: 'dec26' });
    expect(refused.statusCode).toBe(403);
    const ok = await post({ to: WELCOME_TEST_ADDRESS, cohortId: 'dec26' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true, subject: '🎉 Welcome to the December Cohort: Week 0 Is Open' });
    expect(mailTo(WELCOME_TEST_ADDRESS)).toHaveLength(1);
    expect(mailTo('owner@example.com')).toHaveLength(0);
    await settleObserved();
    const d = await database();
    const audits = await d.select().from(auditLog).where(eq(auditLog.action, 'week0.test_send'));
    expect(audits.map((a) => a.outcome).sort()).toEqual(['denied', 'ok']);
    expect(await d.select().from(cohortEnrollments)).toHaveLength(0);
  });

  it('accepts an address WELCOME_TEST_ALLOWLIST adds, and no other', async () => {
    process.env.WELCOME_TEST_ALLOWLIST = 'connor-test@example.com';
    try {
      expect((await post({ to: 'connor-test@example.com', cohortId: 'dec26' })).statusCode).toBe(200);
      expect((await post({ to: 'someone@example.com', cohortId: 'dec26' })).statusCode).toBe(403);
    } finally {
      delete process.env.WELCOME_TEST_ALLOWLIST;
    }
  });

  it('refuses while Week 0 has no Due', async () => {
    await (await database()).update(modules).set({ dueAt: null }).where(eq(modules.id, acceleratorModuleId(0)));
    const res = await post({ to: WELCOME_TEST_ADDRESS, cohortId: 'dec26' });
    expect(res.statusCode).toBe(400);
    expect(mailTo(WELCOME_TEST_ADDRESS)).toHaveLength(0);
  });

  it('is append-only in the audit log', async () => {
    await post({ to: WELCOME_TEST_ADDRESS, cohortId: 'dec26' });
    await settleObserved();
    const d = await database();
    await expect(d.execute(sql`delete from ${auditLog} where action = 'week0.test_send'`)).rejects.toThrow();
  });
});
