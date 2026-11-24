// D-247 (H-9): Resend Invite, Send Nudge and Announcements' Send now with Email, through the real router
// and a real Postgres. Each sends a real email (the test outbox), writes what it says, and its toast says
// what happened: the email went, this server has no email set up, or it failed. The rules and the words
// are unit-tested in packages/core/test/builder-save-safety.test.ts.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { settleEmails } from '../src/auth';
import { build } from '../src/app';
import type { App } from '../src/app';
import { auditLog, authTokens, jobRuns } from '../src/db/schema';
import { forceEmailReady } from '../src/email/ready';
import { outbox, outboxFor, resetOutbox } from '../src/email/transport';
import { runScheduledJobs } from '../src/jobs/scheduler';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const APP = 'https://learn.example.com';
let app: App;
let savedAppUrl: string | undefined;

const invited = (id: string, teamId: string, over: Partial<Learner> = {}): Learner => ({
  id,
  name: 'Nina Park',
  email: `${id}@example.test`,
  tier: 'team',
  role: 'Sales Agent',
  teamId,
  cohortId: 'dec26',
  joined: 0,
  last: null,
  status: 'invited',
  progress: {},
  ...over,
});

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP;
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  const db: Db = seedForDatabase('live');
  db.users.push(invited('u_nina', 'northline'), invited('u_omar2', 'harbor', { name: 'Omar Two' }));
  await resetDatabase(db);
  app = await build({ logger: false });
});
afterEach(async () => {
  forceEmailReady(null);
  await settleEmails();
  await app?.close();
  sessions.clear();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

const sessions = new Map<string, string>();
const post = async (who: string, url: string, payload: unknown = {}) => {
  const cookie = sessions.get(who) ?? (await app.signInAs(who));
  sessions.set(who, cookie);
  return app.inject({ method: 'POST', url, headers: { cookie, 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
};
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const tokensFor = async (email: string) => (await testDatabase()).select().from(authTokens).where(eq(authTokens.email, email));

describe('Resend Invite sends a fresh set-password link @learner-email', () => {
  it('staff: one learner-invite email, a working 72-hour link, one audit row, and an honest toast', async () => {
    const res = await post('st1', '/api/learners/u_nina/resend-invite');
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ toast: { msg: 'Invite resent to u_nina@example.test', tone: 'success' } });
    const mail = outboxFor({ to: 'u_nina@example.test' });
    expect(mail).toHaveLength(1);
    expect(mail[0]).toMatchObject({ template: 'learner-invite', subject: 'Set your Amplified Impact password' });
    // The purchase email's design, with their address and the link.
    expect(mail[0]!.html).toContain('<title>Welcome, Nina.</title>');
    expect(mail[0]!.html).toContain('>u_nina@example.test</span></div>');
    const token = /set-password\?token=([^"&]+)/.exec(mail[0]!.html ?? '')![1]!;
    const check = await app.inject({ method: 'POST', url: '/api/auth/password/token', payload: { token: decodeURIComponent(token) } });
    expect(check.json()).toEqual({ ok: true, purpose: 'set' });
    const [row] = await tokensFor('u_nina@example.test');
    expect(row!.purpose).toBe('set_password');
    expect(row!.expiresAt.getTime()).toBe(NOW + 72 * 3_600_000);
    const audit = await auditRows();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: 'user.invite_resend', outcome: 'ok', actorUserId: 'st1', targetId: 'u_nina', targetLabel: 'Nina Park', after: { sent: true } });
    expect(JSON.stringify(audit[0])).not.toContain('u_nina@example.test');
  });

  it('a Team Owner or Operations Lead may resend their own team’s invite; nobody else may', async () => {
    const owner = await post('u_alex', '/api/learners/u_nina/resend-invite');
    expect(owner.statusCode, owner.body).toBe(200);
    expect(owner.json().toast.msg).toBe('Invite resent to u_nina@example.test');
    expect((await post('u_priya', '/api/learners/u_nina/resend-invite')).statusCode).toBe(200);
    const agent = await post('u_sarah', '/api/learners/u_nina/resend-invite');
    expect(agent.statusCode).toBe(403);
    expect(agent.json()).toEqual({ error: 'Only the team owner or operations lead can resend an invite.' });
    expect((await post('u_alex', '/api/learners/u_omar2/resend-invite')).statusCode).toBe(403);
    expect(outboxFor({ template: 'learner-invite' })).toHaveLength(2);
    // A learner's resend is not a staff action, so it writes no audit row.
    expect(await auditRows()).toEqual([]);
  });

  it('refuses someone who has joined, and an unknown learner, sending nothing', async () => {
    const joined = await post('st1', '/api/learners/u_jamie/resend-invite');
    expect(joined.statusCode).toBe(422);
    expect(joined.json()).toEqual({ error: 'They’ve already joined, so there’s no invite to resend.' });
    expect((await post('st1', '/api/learners/u_nobody/resend-invite')).statusCode).toBe(404);
    expect(outbox()).toEqual([]);
  });

  it('with no email set up, it mints nothing, sends nothing and says so', async () => {
    forceEmailReady(false);
    const res = await post('st1', '/api/learners/u_nina/resend-invite');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ toast: { msg: 'Email isn’t set up on this server, so nothing was sent.', tone: 'warn' } });
    expect(outbox()).toEqual([]);
    expect(await tokensFor('u_nina@example.test')).toEqual([]);
    expect((await auditRows())[0]).toMatchObject({ action: 'user.invite_resend', outcome: 'failed', reason: 'email_not_configured', after: { sent: false } });
  });

  it('a failed send says it failed', async () => {
    const saved = process.env.APP_URL;
    delete process.env.APP_URL; // the template can't make the link absolute, so the transport refuses
    try {
      const res = await post('st1', '/api/learners/u_nina/resend-invite');
      expect(res.json()).toEqual({ toast: { msg: 'The email didn’t send. Try again.', tone: 'warn' } });
      expect((await auditRows())[0]).toMatchObject({ outcome: 'failed', reason: 'send_failed' });
    } finally {
      process.env.APP_URL = saved;
    }
  });

  it('five an hour per recipient, then a 429', async () => {
    for (let i = 0; i < 5; i++) expect((await post('st1', '/api/learners/u_nina/resend-invite')).statusCode).toBe(200);
    const sixth = await post('st1', '/api/learners/u_nina/resend-invite');
    expect(sixth.statusCode).toBe(429);
    expect(sixth.json()).toEqual({ error: 'Too many requests. Try again later.' });
    expect(outboxFor({ to: 'u_nina@example.test' })).toHaveLength(5);
  });
});

describe('Send Nudge sends a short email @learner-email', () => {
  it('one learner-nudge email, the nudged stamp, one audit row, and the toast', async () => {
    const res = await post('st1', '/api/learners/u_jamie/nudge');
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ toast: { msg: 'Nudge sent to Jamie Ortiz', tone: 'success' } });
    const mail = outboxFor({ template: 'learner-nudge' });
    expect(mail).toHaveLength(1);
    expect(mail[0]).toMatchObject({ to: 'jamie@ortizhomes.com', subject: 'Pick up where you left off' });
    expect(mail[0]!.html).toContain('<title>Hi, Jamie.</title>');
    expect(mail[0]!.html).toContain(`href="${APP}/sign-in"`);
    expect((await loadDb()).users.find((u) => u.id === 'u_jamie')!.nudged).toBe(NOW);
    expect((await auditRows())[0]).toMatchObject({ action: 'user.nudge', outcome: 'ok', targetId: 'u_jamie', after: { sent: true } });
  });

  it('refuses someone who hasn’t joined, a learner, and Support stays allowed (View learners)', async () => {
    const res = await post('st1', '/api/learners/u_nina/nudge');
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'They haven’t joined yet. Resend the invite instead.' });
    expect((await post('u_alex', '/api/learners/u_jamie/nudge')).statusCode).toBe(403);
    expect((await post('st4', '/api/learners/u_jamie/nudge')).statusCode).toBe(200);
  });

  it('with no email set up, it sends nothing, stamps nothing and says so', async () => {
    forceEmailReady(false);
    const res = await post('st1', '/api/learners/u_jamie/nudge');
    expect(res.json()).toEqual({ toast: { msg: 'Email isn’t set up on this server, so nothing was sent.', tone: 'warn' } });
    expect(outbox()).toEqual([]);
    expect((await loadDb()).users.find((u) => u.id === 'u_jamie')!.nudged).toBeUndefined();
  });
});

describe('Announcements › Send now with Email sends the email at once @learner-email', () => {
  const announce = (email: boolean, inapp = true) =>
    post('st1', '/api/mutate/sendAnnouncement', { title: 'Session 4 moved', body: 'Thursday at 1:00 PM MT.', audience: 'all', inapp, email, when: 'now' });
  const reached = (db: Db) => db.users.filter((u) => u.status !== 'invited' && !!u.email).length;

  it('emails everyone the banner reaches, records the keys, says how many, and the scheduler sends nothing more', async () => {
    const n = reached(await loadDb());
    const res = await announce(true);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().toast.msg).toBe(`Sent to ${n} learners. The banner is live on their dashboards. Email sent to ${n} learners.`);
    const mail = outboxFor({ template: 'announcement' });
    expect(mail).toHaveLength(n);
    expect(mail[0]!.subject).toBe('Session 4 moved');
    expect(outboxFor({ to: 'u_nina@example.test' })).toEqual([]);
    const keys = await (await testDatabase()).select().from(jobRuns).where(eq(jobRuns.job, 'announcement'));
    expect(keys).toHaveLength(n);
    await runScheduledJobs({ log: { info: () => {}, warn: () => {}, error: () => {} } });
    expect(outboxFor({ template: 'announcement' })).toHaveLength(n);
  });

  it('in-app alone sends no email and keeps core’s toast', async () => {
    const res = await announce(false);
    expect(res.json().toast.msg).toMatch(/^Sent to \d+ learners\. The banner is live on their dashboards\.$/);
    expect(outbox()).toEqual([]);
  });

  it('with no email set up, the toast says no email went out', async () => {
    forceEmailReady(false);
    const both = await announce(true);
    expect(both.json().toast).toEqual({ msg: expect.stringMatching(/The banner is live on their dashboards\. Email isn’t set up on this server, so no email went out\.$/), tone: 'warn' });
    // A minute on, so the test clock's ids (`lib/clock.ts`, deterministic per instant) mint a new announcement.
    process.env.FIXED_NOW = new Date(NOW + 60_000).toISOString();
    const emailOnly = await announce(true, false);
    expect(emailOnly.json().toast).toEqual({ msg: 'Email isn’t set up on this server, so nothing was sent.', tone: 'warn' });
    expect(outbox()).toEqual([]);
  });

  it('an edited draft’s Send now sends its email too, once', async () => {
    const draft = await post('st1', '/api/admin/actions/saveAnnouncementDraft', { title: 'Office hours', body: 'Friday at noon MT.', audience: 'owners', inapp: false, email: true });
    expect(draft.statusCode, draft.body).toBe(200);
    const id = (await loadDb()).announcements.find((a) => a.title === 'Office hours')!.id;
    const owners = (await loadDb()).users.filter((u) => u.role === 'Team Owner' && u.status !== 'invited').length;
    const res = await post('st1', '/api/admin/actions/updateAnnouncement', { id, title: 'Office hours', body: 'Friday at noon MT.', audience: 'owners', inapp: false, email: true, when: 'now' });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().toast).toEqual({ msg: `Email sent to ${owners} team owners.`, tone: 'success' });
    expect(outboxFor({ template: 'announcement' })).toHaveLength(owners);
  });
});
