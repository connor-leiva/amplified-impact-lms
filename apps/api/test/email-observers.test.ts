// D-264: cohort observer emails, end to end. Connor and Spring get one copy of each cohort-wide email per cohort send,
// never a copy of anyone's sign-in, password, invite, nudge or receipt email, and nothing a learner, a roster or a
// seat cap counts moves.
//
//   1. The rules: the template map is total and matches core; the transport refuses a copy of a personal email; a
//      copy carries no one person (no first name, no progress, no live link).
//   2. One copy per cohort send: fourteen learners' reminder is one copy per observer; a digest is one per cohort; an
//      announcement is one whatever cohorts it reaches; a second tick sends nothing new.
//   3. Nothing else moves: the learners' mail, `job_runs`, the roster, the seats and the Usage screen's count are what
//      they are with no observers; the email log marks the copies.
//   4. Where the list comes from: the Console's saved list, else `COHORT_OBSERVER_EMAILS`, and a saved empty list
//      turns the copies off.
//   5. The other paths: Send now, Week 0 Is Open and the welcome (whose copy has an inert link and mints no token).
//   6. Never for one person: a sign-in link, a password reset, a team invite, a staff nudge and a resend invite reach
//      their learner and no observer.
//   7. The Console's route: save, audit, a no-op save, forget, refuse a bad address.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, asc, eq, sql } from 'drizzle-orm';
import {
  COHORT_OBSERVER_ENV,
  COHORT_OBSERVER_SETTING,
  OBSERVER_COPY_TEMPLATES,
  OBSERVER_NEVER_TEMPLATES,
  WEEK0_OPEN_FLAG,
  seedForDatabase,
} from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { hashToken } from '../src/auth/tokens';
import {
  accounts,
  auditLog,
  authTokens,
  cohortEnrollments,
  cohorts,
  consoleFlags,
  consoleSettings,
  emailLog,
  jobRuns,
  observerCopies,
  plans,
  sessions,
  teams,
  users,
} from '../src/db/schema';
import { usageReport } from '../src/console/email-usage';
import { invalidateConsoleFlags } from '../src/console/flags';
import { logSend } from '../src/email/log';
import { OBSERVER_COPY } from '../src/email/observer-templates';
import { OBSERVER_PLACEHOLDER_TOKEN, observerCopiesFor, observerData } from '../src/email/observers';
import { TEMPLATE_NAMES } from '../src/email/subjects';
import type { TemplateName } from '../src/email/subjects';
import { renderTemplate } from '../src/email/templates';
import { outbox, resetOutbox, resetRenderer, send, setRenderer, setSendObserver } from '../src/email/transport';
import type { OutboxEntry, SendRequest } from '../src/email/transport';
import type { Send } from '../src/jobs/due';
import { runScheduledJobs } from '../src/jobs/scheduler';
import { sendWeek0Open } from '../src/jobs/week0-open';
import { sendDueWelcomes } from '../src/jobs/welcome';
import { settleObserved } from '../src/lib/observe';
import { liveWithCourse } from './accelerator-course';
import { loadDb, resetDatabase, testDatabase } from './helpers';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Two observers, as Connor's and Spring's would be. Placeholder addresses: no real inbox is named in a test. */
const OBS = ['observer-one@example.com', 'observer-two@example.com'];
const APP = 'https://learn.example.com';
/** Gate 8's instant: Session 3's 24-hour reminder and the week's digest are both due. */
const GATE_NOW = '2026-12-08T13:00:00-06:00';
const SEED = seedForDatabase('live');
const quiet = { info: () => {}, warn: () => {}, error: () => {} };

const database = () => testDatabase();
const copies = (): OutboxEntry[] => outbox().filter((e) => e.observerCopy === true);
const learnerMail = (): OutboxEntry[] => outbox().filter((e) => e.observerCopy !== true);
const toObserver = (e: OutboxEntry): boolean => OBS.includes(e.to.toLowerCase());

/** The Console's saved list, as a save leaves it. */
async function saveObservers(addresses: string[]): Promise<void> {
  await (await database()).insert(consoleSettings).values({ key: COHORT_OBSERVER_SETTING, value: { addresses }, updatedAt: 0, updatedBy: 'st1' });
}

/** The cohort sends `job_runs` holds, read as `email/observers.ts` reads them: job, scope and the learner's cohort. */
async function cohortSends(): Promise<Set<string>> {
  const d = await database();
  const rows = await d.select().from(jobRuns);
  const cohortOf = new Map((await d.select({ id: users.id, cohortId: users.cohortId }).from(users)).map((u) => [u.id, u.cohortId]));
  return new Set(
    rows.map((r) => {
      const [job, scope, user] = r.key.split(':') as [string, string, string];
      return job === 'announcement' ? `${job}|${scope}` : `${job}|${scope}|${cohortOf.get(user)}`;
    }),
  );
}

let savedAppUrl: string | undefined;
let savedEnv: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  savedEnv = process.env[COHORT_OBSERVER_ENV];
  process.env.APP_URL = APP;
  delete process.env[COHORT_OBSERVER_ENV];
  setRenderer(renderTemplate);
  await testDatabase();
});

beforeEach(() => {
  resetOutbox();
});

afterAll(() => {
  resetRenderer();
  setSendObserver(null);
  delete process.env.FIXED_NOW;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  if (savedEnv === undefined) delete process.env[COHORT_OBSERVER_ENV];
  else process.env[COHORT_OBSERVER_ENV] = savedEnv;
});

// ===========================================================================
// 1. The rules
// ===========================================================================

describe('which templates an observer may get @observers', () => {
  it('is a total map over the templates, and agrees with core on both sides', () => {
    expect(Object.keys(OBSERVER_COPY).sort()).toEqual([...TEMPLATE_NAMES].sort());
    const cohort = TEMPLATE_NAMES.filter((t) => OBSERVER_COPY[t] === 'cohort');
    const never = TEMPLATE_NAMES.filter((t) => OBSERVER_COPY[t] === 'never');
    expect(cohort.sort()).toEqual([...OBSERVER_COPY_TEMPLATES].sort());
    expect(never.sort()).toEqual([...OBSERVER_NEVER_TEMPLATES].sort());
  });

  it('the transport refuses an observer copy of every personal email, whatever the caller built', async () => {
    for (const template of OBSERVER_NEVER_TEMPLATES) {
      const result = await send({ template, to: OBS[0]!, data: { token: 'tok-live' }, observer: true } as unknown as SendRequest<TemplateName>);
      expect(result.ok, template).toBe(false);
      expect(result.error, template).toBe(`${template} is never sent to a cohort observer`);
      expect(observerData(template, { token: 'tok-live' } as never), template).toBeNull();
    }
    expect(outbox()).toEqual([]);
  });

  it('a copy names no one: no first name, no one learner’s progress, no live link', () => {
    expect(observerData('session-24h', { n: 3, title: 'Speed to Lead', start: 1, mins: 60, firstName: 'Dana' })).toEqual({ n: 3, title: 'Speed to Lead', start: 1, mins: 60 });
    expect(observerData('build-reminder', { employee: 'Sales AI Employee', moduleId: 'sales', steps: 4, total: 6 })).toEqual({ employee: 'Sales AI Employee', moduleId: 'sales', steps: 0, total: 6 });
    const welcome = observerData('cohort-welcome', {
      cohortName: 'December 2026 Cohort',
      firstName: 'Pat',
      week0DueAt: 1,
      week0Title: 'Foundations',
      week0Steps: 8,
      baselineTasks: 6,
      liveBuildAt: 2,
      liveBuildMins: 90,
      setPasswordUrl: `${APP}/set-password?token=tok-LIVE-SECRET`,
    })!;
    expect(welcome).not.toHaveProperty('firstName');
    expect(welcome.setPasswordUrl).toBe(`${APP}/set-password?token=${OBSERVER_PLACEHOLDER_TOKEN}`);
    expect(JSON.stringify(welcome)).not.toContain('tok-LIVE-SECRET');
  });
});

// ===========================================================================
// 2. One copy per cohort send (pure)
// ===========================================================================

describe('one copy per cohort send @observers', () => {
  const reminder = (user: string): Send => ({
    job: 'session-24h',
    key: `session-24h:dec26-s3:${user}`,
    template: 'session-24h',
    to: `${user}@example.test`,
    data: { n: 3, title: 'Speed to Lead', start: 1, mins: 60, firstName: user },
  });
  const digest = (user: string, before: string): Send => ({ job: 'weekly-digest', key: `weekly-digest:2026-12-07:${user}`, template: 'weekly-digest', to: `${user}@example.test`, data: { before } });
  const announce = (user: string): Send => ({ job: 'announcement', key: `announcement:a9:${user}`, template: 'announcement', to: `${user}@example.test`, data: { title: 'Hi', body: 'All cohorts.' } });
  const cohortOf = (u: string): string => (u.startsWith('jan') ? 'jan27' : 'dec26');

  it('fourteen learners’ reminder is one copy for each observer', () => {
    const sends = Array.from({ length: 14 }, (_, i) => reminder(`u${i}`));
    const out = observerCopiesFor(sends, cohortOf, OBS);
    expect(out.map((c) => c.to)).toEqual(OBS);
    for (const c of out) {
      expect(c).toMatchObject({ kind: 'session-24h', unit: 'dec26-s3@dec26', cohortId: 'dec26', template: 'session-24h' });
      expect(c.data).not.toHaveProperty('firstName');
    }
  });

  it('a week’s digest is one copy per cohort; an announcement is one copy whatever cohorts it reaches', () => {
    const out = observerCopiesFor(
      [digest('u1', 'Wednesday'), digest('u2', 'Wednesday'), digest('jan1', 'Tuesday'), announce('u1'), announce('jan1'), announce('u2')],
      cohortOf,
      OBS,
    );
    const units = out.filter((c) => c.to === OBS[0]).map((c) => `${c.kind} ${c.unit}`);
    expect(units).toEqual(['weekly-digest 2026-12-07@dec26', 'weekly-digest 2026-12-07@jan27', 'announcement a9']);
    // Each cohort's digest is its own cohort's (its day), not the first one's.
    expect(out.filter((c) => c.kind === 'weekly-digest').map((c) => c.data)).toEqual([{ before: 'Wednesday' }, { before: 'Wednesday' }, { before: 'Tuesday' }, { before: 'Tuesday' }]);
  });

  it('copies nothing with no observers, and nothing for a personal email', () => {
    expect(observerCopiesFor([reminder('u1')], cohortOf, [])).toEqual([]);
    const signIn = { job: 'session-24h', key: 'session-24h:x:u1', template: 'sign-in', to: 'u1@example.test', data: { token: 't' } } as unknown as Send;
    expect(observerCopiesFor([signIn], cohortOf, OBS)).toEqual([]);
  });
});

// ===========================================================================
// 3. The scheduler: one copy per cohort send, and nothing else moves
// ===========================================================================

describe('the scheduler’s tick with observers @observers', () => {
  beforeEach(() => {
    process.env.FIXED_NOW = GATE_NOW;
  });
  afterEach(async () => {
    setSendObserver(null);
    await settleObserved();
  });

  /** One tick on a fresh database, with or without observers: what it mailed, and what it left behind. */
  async function tickOn(observers: string[] | null) {
    await resetDatabase(SEED);
    if (observers) await saveObservers(observers);
    resetOutbox();
    const before = await loadDb();
    const run = await runScheduledJobs({ log: quiet });
    return { run, before, after: await loadDb(), learners: learnerMail().map((e) => `${e.template} ${e.to} ${e.subject}`), copies: copies() };
  }

  it('sends each observer one copy per cohort send, and the learners exactly what they get with no observers', async () => {
    const without = await tickOn(null);
    expect(without.copies).toEqual([]);
    expect(without.run.observers).toBeUndefined();
    expect(without.run.sent).toBeGreaterThan(OBS.length * 2);

    const withObs = await tickOn(OBS);
    // The learners' side, byte for byte: same emails, same people, same subjects, same counts.
    expect(withObs.learners).toEqual(without.learners);
    expect(withObs.run).toMatchObject({ candidates: without.run.candidates, sent: without.run.sent, failed: 0, recorded: without.run.recorded });

    const units = await cohortSends();
    expect(units.size).toBeGreaterThanOrEqual(1);
    for (const to of OBS) expect(withObs.copies.filter((c) => c.to === to)).toHaveLength(units.size);
    expect(withObs.copies).toHaveLength(units.size * OBS.length);
    expect(withObs.copies.length).toBeLessThan(withObs.learners.length);
    expect(withObs.run.observers).toEqual({ claimed: units.size * OBS.length, sent: units.size * OBS.length, failed: 0 });

    // Session 3's reminder to every eligible learner: one copy each, with the learners' subject and no one's name.
    const s3 = withObs.copies.filter((c) => c.template === 'session-24h');
    expect(s3.map((c) => c.to).sort()).toEqual([...OBS].sort());
    const learnerS3 = outbox().find((e) => e.template === 'session-24h' && !e.observerCopy)!;
    expect(s3[0]!.subject).toBe(learnerS3.subject);
    expect(s3[0]!.data).not.toHaveProperty('firstName');
    expect(s3[0]!.html).toContain('Hi,');

    // The ledgers: the learners' holds no observer; the observers' holds one row per cohort send per observer.
    const d = await database();
    const keys = (await d.select().from(jobRuns)).map((r) => r.key);
    expect(keys.filter((k) => OBS.some((o) => k.includes(o)))).toEqual([]);
    expect(keys).toEqual(expect.arrayContaining(without.run.recorded));
    expect(await d.select().from(observerCopies)).toHaveLength(units.size * OBS.length);
  });

  it('a second tick, or a second replica’s, sends no new copy', async () => {
    await resetDatabase(SEED);
    await saveObservers(OBS);
    const [a, b] = await Promise.all([runScheduledJobs({ log: quiet }), runScheduledJobs({ log: quiet })]);
    const first = copies().length;
    expect(first).toBeGreaterThan(0);
    expect((a.observers?.sent ?? 0) + (b.observers?.sent ?? 0)).toBe(first);
    const again = await runScheduledJobs({ log: quiet });
    expect(again.observers).toBeUndefined();
    expect(copies()).toHaveLength(first);
    // No observer was ever sent two copies of one email.
    const seen = copies().map((c) => `${c.to} ${c.template} ${c.subject} ${JSON.stringify(c.data)}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('a broken observer ledger never costs a learner their reminder: the copies roll back to a savepoint, the tick commits', async () => {
    const without = await tickOn(null);
    await resetDatabase(SEED);
    await saveObservers(OBS);
    resetOutbox();
    const d = await database();
    // A deploy whose migration has not run yet: the ledger table is not there.
    await d.execute(sql`alter table observer_copies rename to observer_copies_away`);
    const errors: string[] = [];
    try {
      const run = await runScheduledJobs({ log: { ...quiet, error: (_o, msg) => void errors.push(msg) } });
      expect(run).toMatchObject({ sent: without.run.sent, failed: 0, recorded: without.run.recorded });
      expect(run.observers).toBeUndefined();
    } finally {
      await d.execute(sql`alter table observer_copies_away rename to observer_copies`);
    }
    expect(learnerMail().map((e) => `${e.template} ${e.to} ${e.subject}`)).toEqual(without.learners);
    expect(copies()).toEqual([]);
    expect(errors).toContain('cohort observer copies were not claimed; the learners’ emails go out regardless');
    expect((await d.select().from(jobRuns)).map((r) => r.key).sort()).toEqual([...without.run.recorded].sort());
  });

  it('touches no roster, seat, team, cohort or progress: an observer is an address, never a user', async () => {
    const { before, after } = await tickOn(OBS);
    expect(copies().length).toBeGreaterThan(0);
    expect(after.users).toEqual(before.users);
    expect(after.teams).toEqual(before.teams);
    expect(after.cohorts).toEqual(before.cohorts);
    const d = await database();
    const people = await d.select({ email: users.email }).from(users);
    expect(people.filter((u) => OBS.includes(u.email))).toEqual([]);
    expect(await d.select().from(cohortEnrollments)).toEqual([]);
    // Roster and seat counts as the Console reads them: every team's people against its cap.
    const seatsOf = (db: Db) => db.teams.map((t) => ({ team: t.id, cap: t.seats, used: db.users.filter((u) => u.teamId === t.id).length }));
    expect(seatsOf(after)).toEqual(seatsOf(before));
    const learnersIn = (db: Db, cohort: string) => db.users.filter((u) => u.cohortId === cohort && u.status !== 'invited').length;
    for (const c of before.cohorts) expect(learnersIn(after, c.id)).toBe(learnersIn(before, c.id));
  });

  it('logs each copy marked as an observer’s, with no user, and the Usage screen counts only learners’ emails', async () => {
    await resetDatabase(SEED);
    await saveObservers(OBS);
    setSendObserver(logSend);
    await runScheduledJobs({ log: quiet });
    await settleObserved();
    const d = await database();
    const rows = await d.select().from(emailLog).orderBy(asc(emailLog.id));
    const observerRows = rows.filter((r) => r.observerCopy);
    expect(observerRows).toHaveLength(copies().length);
    for (const r of observerRows) {
      expect(OBS).toContain(r.to);
      expect(r.userId).toBeNull();
    }
    expect(rows.filter((r) => !r.observerCopy)).toHaveLength(learnerMail().length);
    expect(rows.filter((r) => !r.observerCopy && OBS.includes(r.to))).toEqual([]);

    // The Usage screen's "emails sent" counts Resend-accepted sends: one learner's and one observer's copy, here.
    const now = Date.parse(GATE_NOW);
    await d.delete(emailLog);
    await d.insert(emailLog).values([
      { at: now, to: 'jamie@ortizhomes.com', userId: 'u_jamie', template: 'session-24h', subject: 's', provider: 'resend', providerId: 're_1', status: 'sent' },
      { at: now, to: OBS[0]!, userId: null, template: 'session-24h', subject: 's', provider: 'resend', providerId: 're_2', status: 'sent', observerCopy: true },
    ]);
    const report = await usageReport(d, { from: '2026-12-08', to: '2026-12-08' }, now, async () => 0);
    expect(report.emailsSent).toBe(1);
  });
});

// ===========================================================================
// 4. Where the list comes from
// ===========================================================================

describe('the observer list in force @observers', () => {
  beforeEach(async () => {
    process.env.FIXED_NOW = GATE_NOW;
    await resetDatabase(SEED);
    resetOutbox();
  });
  afterEach(() => {
    delete process.env[COHORT_OBSERVER_ENV];
  });

  it('falls back to COHORT_OBSERVER_EMAILS when nothing is saved, dropping a typo', async () => {
    process.env[COHORT_OBSERVER_ENV] = 'Observer-One@Example.com, not-an-address';
    await runScheduledJobs({ log: quiet });
    expect(copies().length).toBeGreaterThan(0);
    expect(new Set(copies().map((c) => c.to))).toEqual(new Set(['observer-one@example.com']));
  });

  it('a saved empty list sends no copies, even with the env var set', async () => {
    process.env[COHORT_OBSERVER_ENV] = OBS.join(',');
    await saveObservers([]);
    const run = await runScheduledJobs({ log: quiet });
    expect(run.sent).toBeGreaterThan(0);
    expect(copies()).toEqual([]);
    expect(await (await database()).select().from(observerCopies)).toEqual([]);
  });

  it('a saved list wins over the env var', async () => {
    process.env[COHORT_OBSERVER_ENV] = 'observer-two@example.com';
    await saveObservers(['observer-one@example.com']);
    await runScheduledJobs({ log: quiet });
    expect(new Set(copies().map((c) => c.to))).toEqual(new Set(['observer-one@example.com']));
  });
});

// ===========================================================================
// 5 and 6. Through the app: Send now, and never a personal email
// ===========================================================================

describe('through the app @observers', () => {
  const NOW = Date.parse('2026-12-07T16:42:00Z');
  let app: App;
  const cookies = new Map<string, string>();
  const post = async (who: string | null, url: string, payload: unknown = {}) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (who) {
      const cookie = cookies.get(who) ?? (await app.signInAs(who));
      cookies.set(who, cookie);
      headers.cookie = cookie;
    }
    return app.inject({ method: 'POST', url, headers, payload: JSON.stringify(payload) });
  };

  beforeEach(async () => {
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    const db: Db = structuredClone(SEED);
    db.users.push({
      id: 'u_nina',
      name: 'Nina Park',
      email: 'u_nina@example.test',
      tier: 'team',
      role: 'Sales Agent',
      teamId: 'northline',
      cohortId: 'dec26',
      joined: 0,
      last: null,
      status: 'invited',
      progress: {},
    });
    // Room for one more seat, so the owner's invite below is the team-invite email and not a full-team refusal.
    db.teams.find((t) => t.id === 'northline')!.seats += 2;
    await resetDatabase(db);
    await saveObservers(OBS);
    app = await build({ logger: false });
    resetOutbox();
  });
  afterEach(async () => {
    await settleEmails();
    await settleObserved();
    await app?.close();
    cookies.clear();
  });

  it('Send now: the learners get it, each observer one copy, the toast counts learners only, and the scheduler adds nothing', async () => {
    const reached = (await loadDb()).users.filter((u) => u.status !== 'invited' && !!u.email).length;
    const res = await post('st1', '/api/mutate/sendAnnouncement', { title: 'Session 4 moved', body: 'Thursday at 1:00 PM MT.', audience: 'all', inapp: true, email: true, when: 'now' });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().toast.msg).toBe(`Sent to ${reached} learners. The banner is live on their dashboards. Email sent to ${reached} learners.`);
    expect(learnerMail().filter((e) => e.template === 'announcement')).toHaveLength(reached);
    expect(copies().map((c) => c.to).sort()).toEqual([...OBS].sort());
    expect(copies()[0]!.subject).toBe('Session 4 moved');
    // The announcement's flip is the scheduler's too: it must not copy the announcement a second time.
    await runScheduledJobs({ log: quiet });
    expect(copies().filter((c) => c.template === 'announcement')).toHaveLength(OBS.length);
  });

  it('a sign-in link, a password reset, a team invite, a staff nudge and a resend invite reach their person, and no observer', async () => {
    expect((await post(null, '/api/auth/request', { email: 'jamie@ortizhomes.com' })).statusCode).toBe(200);
    expect((await post(null, '/api/auth/password/forgot', { email: 'jamie@ortizhomes.com' })).statusCode).toBe(200);
    const invite = await post('u_alex', '/api/mutate/inviteMember', { email: 'new.agent@example.test', role: 'Sales Agent' });
    expect(invite.statusCode, invite.body).toBe(200);
    expect((await post('st1', '/api/learners/u_jamie/nudge')).statusCode).toBe(200);
    expect((await post('st1', '/api/learners/u_nina/resend-invite')).statusCode).toBe(200);
    await settleEmails();

    const sent = new Set(outbox().map((e) => e.template));
    // Jamie has no password yet, so "forgot password" sends the set-password link (D-132), a live token like a reset's.
    for (const t of ['sign-in', 'set-password', 'team-invite', 'learner-nudge', 'learner-invite']) expect(sent, t).toContain(t);
    expect(outbox().filter(toObserver)).toEqual([]);
    expect(copies()).toEqual([]);
    expect(await (await database()).select().from(observerCopies)).toEqual([]);
    // No token was ever minted for an observer's address.
    const tokens = await (await database()).select({ email: authTokens.email }).from(authTokens);
    expect(tokens.filter((t) => OBS.includes(t.email))).toEqual([]);
  });
});

// ===========================================================================
// 5. Week 0 Is Open and the welcome
// ===========================================================================

describe('the billing loop’s cohort emails @observers', () => {
  /** A team owner with an AI Accelerator plan in December, as `week0-open.test.ts` and `welcome.test.ts` seed one. */
  async function seedOwner(id: string, email: string, enrolled: number): Promise<void> {
    const d = await database();
    await d.insert(users).values({ id, email, name: 'Pat Buyer', kind: 'learner', role: 'Team Owner', tier: 'team', teamId: `t_${id}`, cohortId: 'dec26', status: 'invited', joined: enrolled, isTest: false });
    await d.insert(teams).values({ id: `t_${id}`, name: 'Pat Group', ownerId: id, seats: 2 });
    await d.insert(accounts).values({ id: `a_${id}`, teamId: `t_${id}`, ownerUserId: id, ownerEmail: email, name: 'Pat Group', createdAt: enrolled });
    await d.insert(plans).values({ id: `plan_${id}`, accountId: `a_${id}`, kind: 'cohort', option: 'full', seats: 2, cohortId: 'dec26', status: 'active', startsAt: enrolled, orderId: `order_${id}`, createdAt: enrolled });
  }
  const flagOn = async (key: string, at: number) =>
    (await database()).insert(consoleFlags).values({ key, on: true, sensitive: false, updatedAt: at, updatedBy: 'st1', turnedOnAt: at });

  beforeEach(async () => {
    await resetDatabase(liveWithCourse());
    invalidateConsoleFlags();
    resetOutbox();
  });

  it('Week 0 Is Open: two owners mailed, one copy for each observer with no one’s name, and a second tick sends none', async () => {
    const NOW = Date.parse('2026-11-26T20:00:00Z');
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    const d = await database();
    await d.update(sessions).set({ start: Date.parse('2026-12-02T19:00:00Z'), mins: 90 }).where(eq(sessions.id, 'dec26-s1'));
    await d.update(cohorts).set({ previewOpensAt: Date.parse('2026-11-26T19:00:00Z') }).where(eq(cohorts.id, 'dec26'));
    await flagOn(WEEK0_OPEN_FLAG, Date.parse('2026-11-25T16:00:00Z'));
    await seedOwner('u_o1', 'owner1@example.test', Date.parse('2026-11-20T15:00:00Z'));
    await seedOwner('u_o2', 'owner2@example.test', Date.parse('2026-11-20T15:00:00Z'));
    await saveObservers(OBS);

    const first = await sendWeek0Open({ log: quiet, now: NOW });
    expect(first).toMatchObject({ sent: 2, failed: 0 });
    expect(learnerMail().filter((e) => e.template === 'week0-open')).toHaveLength(2);
    expect(copies().map((c) => c.to).sort()).toEqual([...OBS].sort());
    expect(copies()[0]!.subject).toBe(learnerMail()[0]!.subject);
    expect(copies()[0]!.html).not.toContain('Pat,');
    expect(learnerMail()[0]!.html).toContain('Pat, We’re Officially Underway!');
    // The learners' rows only: an observer has no enrollment.
    expect((await d.select().from(cohortEnrollments)).map((r) => r.userId).sort()).toEqual(['u_o1', 'u_o2']);

    await sendWeek0Open({ log: quiet, now: NOW + 60_000 });
    expect(copies()).toHaveLength(OBS.length);
  });

  it('the welcome: the owners get their own set-password links; the copy has an inert placeholder and mints no token', async () => {
    const NOW = Date.parse('2026-12-10T18:00:00Z');
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    await flagOn('cohort_welcome_email', Date.parse('2026-12-09T15:00:00Z'));
    await seedOwner('u_w1', 'welcome1@example.test', Date.parse('2026-12-10T15:00:00Z'));
    await seedOwner('u_w2', 'welcome2@example.test', Date.parse('2026-12-10T15:00:00Z'));
    await saveObservers(OBS);

    const run = await sendDueWelcomes({ log: quiet, now: NOW });
    expect(run.sent).toBe(2);
    const d = await database();
    // One live token per owner, and none for anyone else.
    const tokens = await d.select().from(authTokens).where(eq(authTokens.purpose, 'set_password'));
    expect(tokens.map((t) => t.email).sort()).toEqual(['welcome1@example.test', 'welcome2@example.test']);
    expect(tokens.some((t) => t.tokenHash === hashToken(OBSERVER_PLACEHOLDER_TOKEN))).toBe(false);

    expect(copies().map((c) => c.to).sort()).toEqual([...OBS].sort());
    for (const c of copies()) {
      expect(c.template).toBe('cohort-welcome');
      expect(c.data.setPasswordUrl).toBe(`https://learn.example.com/set-password?token=${OBSERVER_PLACEHOLDER_TOKEN}`);
      expect(c.html).toContain(OBSERVER_PLACEHOLDER_TOKEN);
      // No owner's live link reached an observer.
      for (const owner of learnerMail()) {
        const live = String(owner.data.setPasswordUrl);
        expect(live).toMatch(/token=/);
        expect(c.html).not.toContain(live);
      }
    }
    await sendDueWelcomes({ log: quiet, now: NOW + 60_000 });
    expect(copies()).toHaveLength(OBS.length);
  });
});

// ===========================================================================
// 7. The Console's route
// ===========================================================================

describe('POST /api/console/email-observers @observers', () => {
  let app: App;
  let cookie: string;
  const NOW = Date.parse('2026-12-07T16:42:00Z');
  const call = (method: 'GET' | 'POST', payload?: unknown) =>
    app.inject({ method, url: '/api/console/email-observers', headers: { cookie, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });
  const audits = async () => (await (await database()).select().from(auditLog).where(eq(auditLog.action, 'email_observers.save'))).map((r) => ({ outcome: r.outcome, before: r.before, after: r.after, actor: r.actorUserId }));

  beforeEach(async () => {
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    await resetDatabase(SEED);
    app = await build({ logger: false, console: { infra: { env: { [COHORT_OBSERVER_ENV]: 'observer-two@example.com' } } } });
    // `st1` is the seed's Owner.
    cookie = await app.signInAs('st1');
  });
  afterEach(async () => {
    await app?.close();
  });

  it('reads the env var’s list until one is saved, then the saved one; each change is one audit row', async () => {
    expect((await call('GET')).json()).toEqual({ observers: { addresses: ['observer-two@example.com'], source: 'env', envAddresses: ['observer-two@example.com'], updatedAt: null, updatedBy: null } });

    const saved = await call('POST', { addresses: ['Observer-One@Example.com', 'observer-two@example.com'] });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().observers).toMatchObject({ addresses: OBS, source: 'console', updatedAt: NOW });
    expect(await audits()).toEqual([{ outcome: 'ok', before: { addresses: null }, after: { addresses: OBS }, actor: 'st1' }]);

    // The same list again changes nothing and writes nothing.
    expect((await call('POST', { addresses: OBS })).statusCode).toBe(200);
    expect(await audits()).toHaveLength(1);

    // An empty list turns the copies off, over the env var.
    expect((await call('POST', { addresses: [] })).json().observers).toMatchObject({ addresses: [], source: 'none' });
    // null forgets the saved list: the env var applies again.
    expect((await call('POST', { addresses: null })).json().observers).toMatchObject({ addresses: ['observer-two@example.com'], source: 'env' });
    expect(await (await database()).select().from(consoleSettings)).toEqual([]);
    expect((await audits()).map((a) => a.after)).toEqual([{ addresses: OBS }, { addresses: [] }, { addresses: null }]);
  });

  it('refuses anything that is not a list of mailboxes, and writes nothing', async () => {
    for (const body of [{}, { addresses: 'not-an-address' }, { addresses: ['Connor <x@example.com>'] }, { addresses: [42] }]) {
      const res = await call('POST', body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.json().code).toBe('invalid_body');
    }
    const d = await database();
    expect(await d.select().from(consoleSettings)).toEqual([]);
    expect(await d.select().from(auditLog).where(and(eq(auditLog.action, 'email_observers.save')))).toEqual([]);
  });
});
