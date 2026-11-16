// The Admin Console's email log and usage, PR 7 (D-166, spec §§ 7.7, 7.15), against a real Postgres:
// the log written after every send and never in its way, with no body; the list, the record and the
// export (CSV, 10,000 rows at most, audited); the usage report, counted and never estimated; and
// retention. Who may call each route is `console-authz.test.ts`'s matrix.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, getTableName, sql } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { seedForDatabase } from '@ai/core';
import type { EmailLogPage, EmailLogRow, UsageReport } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { emailLogEntry, logSend } from '../src/email/log';
import { outbox, resetOutbox, send, setSendObserver } from '../src/email/transport';
import type { SendObserver } from '../src/email/transport';
import { accounts, auditLog, emailLog, plans, usageDaily, users } from '../src/db/schema';
import { pruneEmailAndUsage } from '../src/jobs/prune-logs';
import { settleObserved } from '../src/lib/observe';
import { recordUsage } from '../src/lib/usage';
import { resetStorageCache } from '../src/console/email-usage';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z'); // 10:42 AM CT, Monday Dec 7
const DAY = 86_400_000;
const ORIGIN = 'https://learn.example.com';

let app: App;
let storageCalls = 0;
let storageAnswer: () => Promise<number> = async () => 41_200_000_000;

beforeAll(async () => {
  process.env.APP_URL = ORIGIN;
  await testDatabase();
});

beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  resetStorageCache();
  storageCalls = 0;
  storageAnswer = async () => 41_200_000_000;
  await resetDatabase(seedForDatabase('live'));
  app = await build({
    logger: false,
    console: {
      storageBytes: () => {
        storageCalls += 1;
        return storageAnswer();
      },
    },
  });
});
afterEach(async () => {
  await settleEmails();
  await settleObserved();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
});

const db = () => testDatabase();
const get = async (url: string, as = 'st1') => app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(as) } });
const post = async (url: string, payload: unknown, as = 'st1') =>
  app.inject({ method: 'POST', url, payload: payload as object, headers: { cookie: await app.signInAs(as), 'content-type': 'application/json', origin: ORIGIN } });
const emailRows = async () => (await db()).select().from(emailLog).orderBy(asc(emailLog.id));

/** Logged sends at these offsets before NOW (newest last), as the writer would have written them. */
async function logged(rows: Partial<typeof emailLog.$inferInsert>[]): Promise<void> {
  await (await db()).insert(emailLog).values(
    rows.map((r, i) => ({
      at: NOW - (rows.length - i) * 3600_000,
      to: 'jamie@ortizhomes.com',
      userId: 'u_jamie',
      template: 'sign-in',
      subject: 'Your sign-in link',
      provider: 'resend',
      providerId: `re_${i}`,
      status: 'sent',
      ...r,
    })),
  );
}

// ================================================================================================
// The writer
// ================================================================================================

describe('the email log is written after each send, and never in its way (spec § 7.15) @console', () => {
  it('logs a send through the app’s observer: the recipient’s user, the subject, no body', async () => {
    const res = await send({ template: 'sign-in', to: 'Jamie@OrtizHomes.com', data: { token: 'tok-SECRET-123', next: null } as never });
    expect(res.ok).toBe(true);
    await settleObserved();
    const [row] = await emailRows();
    expect(row).toMatchObject({ to: 'Jamie@OrtizHomes.com', userId: 'u_jamie', template: 'sign-in', provider: 'outbox', providerId: null, status: 'skipped', errorKind: null, at: NOW });
    expect(row!.subject).toBe(res.subject);
    // No column for a body, and nothing of it in the row: the token is in the body only.
    expect(getTableConfig(emailLog).columns.map((c) => c.name).sort()).toEqual(['at', 'error_kind', 'id', 'provider', 'provider_id', 'status', 'subject', 'template', 'to', 'user_id']);
    expect(JSON.stringify(row)).not.toContain('tok-SECRET-123');
    expect(getTableName(emailLog)).toBe('email_log');
  });

  it('logs a failure by its kind, never its words, and with no user for an unknown address', async () => {
    const res = await send({ template: 'sign-in', to: 'not an address', data: { token: 't', next: null } as never });
    expect(res.ok).toBe(false);
    await settleObserved();
    expect(await emailRows()).toEqual([expect.objectContaining({ to: 'not an address', userId: null, status: 'failed', errorKind: 'invalid_recipient', provider: 'outbox' })]);
  });

  it('leaves the send exactly as it was when the log throws, fails or hangs', async () => {
    const before = await send({ template: 'sign-in', to: 'jamie@ortizhomes.com', data: { token: 'a', next: null } as never });
    for (const broken of [
      (() => {
        throw new Error('log down');
      }) as SendObserver,
      (() => void Promise.reject(new Error('log down')).catch(() => {})) as SendObserver,
      (() => void new Promise(() => {})) as SendObserver,
    ]) {
      setSendObserver(broken);
      const res = await send({ template: 'sign-in', to: 'jamie@ortizhomes.com', data: { token: 'a', next: null } as never });
      expect(res).toEqual(before);
    }
    setSendObserver(logSend);
    expect(outbox()).toHaveLength(4);
  });

  it('answers the same when the table is gone: the write fails in the background, the send stands', async () => {
    const d = await db();
    await settleObserved();
    await d.execute(sql`alter table email_log rename to email_log_gone`);
    try {
      const res = await send({ template: 'sign-in', to: 'jamie@ortizhomes.com', data: { token: 'a', next: null } as never });
      expect(res).toMatchObject({ ok: true, mode: 'test' });
      await settleObserved();
    } finally {
      await d.execute(sql`alter table email_log_gone rename to email_log`);
    }
    expect(outbox()).toHaveLength(1);
    expect(await emailRows()).toEqual([]);
  });

  it('marks production sends sent, with Resend’s id, and keeps nothing it was not told', () => {
    const base = { mode: 'production' as const, template: 'sign-in' as const, to: 'a@b.co', subject: 'Your sign-in link' };
    expect(emailLogEntry({ result: { ...base, ok: true }, providerId: 're_1' }, NOW)).toEqual({ at: NOW, to: 'a@b.co', template: 'sign-in', subject: 'Your sign-in link', provider: 'resend', providerId: 're_1', status: 'sent', errorKind: null });
    expect(emailLogEntry({ result: { ...base, ok: false, error: 'validation_error: no' }, providerId: null }, NOW)).toMatchObject({ provider: 'resend', status: 'failed', errorKind: 'provider', providerId: null });
    expect(emailLogEntry({ result: { ...base, mode: 'development', ok: true }, providerId: null }, NOW)).toMatchObject({ provider: 'log', status: 'skipped' });
  });
});

// ================================================================================================
// The list, the record, the export
// ================================================================================================

describe('GET /api/console/email (spec § 7.15) @console', () => {
  it('lists newest first with the filters’ options, and reads nothing but the log', async () => {
    await logged([
      { template: 'team-invite', subject: 'Join Northline on Amplified', to: 'priya@northlinerealty.com', userId: null },
      { template: 'sign-in', status: 'failed', errorKind: 'provider', providerId: null },
      { template: 'session-24h', subject: 'Tomorrow at 1:00 PM CT: Session 3' },
    ]);
    const res = await get('/api/console/email', 'st4');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const page = res.json() as EmailLogPage;
    expect(page.rows.map((r) => r.template)).toEqual(['session-24h', 'sign-in', 'team-invite']);
    expect(page.templates).toEqual(['session-24h', 'sign-in', 'team-invite']);
    expect(page.statuses).toEqual(['sent', 'failed', 'skipped']);
    expect(page.nextCursor).toBeNull();
    expect(page.rows[1]).toMatchObject({ status: 'failed', errorKind: 'provider', providerId: null });
    expect(Object.keys(page.rows[0]!).sort()).toEqual(['at', 'errorKind', 'id', 'provider', 'providerId', 'status', 'subject', 'template', 'to', 'userId']);
    expect((await (await db()).select().from(auditLog)).length).toBe(0);
  });

  it('filters by words, template, status and person, and pages by cursor', async () => {
    await logged([
      { template: 'team-invite', subject: 'Join Northline', to: 'priya@northlinerealty.com', userId: null },
      { template: 'sign-in', status: 'failed', errorKind: 'provider', providerId: null },
      { template: 'session-24h', subject: 'Tomorrow: Session 3' },
      { template: 'sign-in', to: 'alex@northlinerealty.com', userId: 'u_alex' },
    ]);
    const rows = async (q: string) => ((await get(`/api/console/email${q}`)).json() as EmailLogPage).rows.map((r) => r.to + ' ' + r.template);
    expect(await rows('?q=northline')).toEqual(['alex@northlinerealty.com sign-in', 'priya@northlinerealty.com team-invite']);
    expect(await rows('?q=SESSION')).toEqual(['jamie@ortizhomes.com session-24h']);
    expect(await rows('?template=sign-in&status=failed')).toEqual(['jamie@ortizhomes.com sign-in']);
    expect(await rows('?userId=u_jamie')).toEqual(['jamie@ortizhomes.com session-24h', 'jamie@ortizhomes.com sign-in']);
    // A send logged with no user (the address was nobody's yet) is that person's too, by address.
    await logged([{ template: 'team-invite', subject: 'Invite', to: 'Alex@NorthlineRealty.com', userId: null }]);
    expect(await rows('?userId=u_alex')).toEqual(['Alex@NorthlineRealty.com team-invite', 'alex@northlinerealty.com sign-in']);
    await (await db()).execute(sql`delete from email_log where subject = 'Invite'`);
    // A workspace's: to any of its people (Billing's "Open email log").
    const northline = (await (await db()).select({ id: users.id }).from(users).where(sql`team_id = 'northline'`)).map((u) => u.id);
    expect(northline).toContain('u_alex');
    expect(northline).not.toContain('u_jamie');
    // Priya is an invited Northline member: her invite (logged with no user) is the workspace's too.
    expect(await rows('?teamId=northline')).toEqual(['alex@northlinerealty.com sign-in', 'priya@northlinerealty.com team-invite']);
    expect((await get('/api/console/email?teamId=a%20b')).statusCode).toBe(400);
    expect(await rows('?q=%25')).toEqual([]);
    const first = (await get('/api/console/email?limit=3')).json() as EmailLogPage;
    expect(first.rows).toHaveLength(3);
    const second = (await get(`/api/console/email?limit=3&cursor=${first.nextCursor}`)).json() as EmailLogPage;
    expect(second.rows.map((r) => r.subject)).toEqual(['Join Northline']);
    expect(second.nextCursor).toBeNull();
    for (const bad of ['?status=delivered', '?template=Bad%20One', '?limit=0', '?cursor=x', '?from=9&to=1', `?q=${'x'.repeat(101)}`]) {
      const res = await get(`/api/console/email${bad}`);
      expect(res.statusCode, bad).toBe(400);
      expect(res.json().code).toBe('invalid_query');
    }
  });

  it('opens one row, and answers 404 for one that is not there', async () => {
    await logged([{ template: 'team-invite' }]);
    const [row] = await emailRows();
    const one = await get(`/api/console/email/${row!.id}`, 'st4');
    expect(one.statusCode).toBe(200);
    expect(one.json()).toMatchObject({ id: String(row!.id), template: 'team-invite', to: 'jamie@ortizhomes.com' } satisfies Partial<EmailLogRow>);
    for (const id of ['999', 'abc']) {
      const res = await get(`/api/console/email/${id}`);
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe('not_found');
    }
  });
});

describe('POST /api/console/email/export (D6) @console', () => {
  it('exports the filtered rows as CSV, audited, with no body', async () => {
    await logged([{ template: 'team-invite', subject: '=cmd' }, { template: 'sign-in' }, { template: 'sign-in' }]);
    const res = await post('/api/console/email/export', { template: 'sign-in' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="email-log-2026-12-07.csv"');
    const lines = res.body.trim().split('\r\n');
    expect(lines[0]).toBe('"id","sent_at","to","user_id","template","subject","provider","provider_id","status","error_kind"');
    expect(lines).toHaveLength(3);
    const [audit] = await (await db()).select().from(auditLog);
    expect(audit).toMatchObject({ action: 'email_log.export', outcome: 'ok', actorUserId: 'st1', targetType: 'email_log', targetLabel: 'Email log', after: { rows: 2, format: 'csv', filters: { template: 'sign-in' } } });
  });

  it('exports exactly the selected rows, and keeps only how many in the audit row', async () => {
    await logged([{ subject: 'One' }, { subject: 'Two' }, { subject: '=Three' }]);
    const ids = (await emailRows()).map((r) => String(r.id));
    const res = await post('/api/console/email/export', { ids: [ids[0], ids[2]] });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('"One"');
    expect(res.body).toContain(`"'=Three"`);
    expect(res.body).not.toContain('"Two"');
    const [audit] = await (await db()).select().from(auditLog);
    expect(audit!.after).toEqual({ rows: 2, format: 'csv', filters: { ids: 2 } });
    expect((await post('/api/console/email/export', { ids: ['x'] })).statusCode).toBe(400);
  });

  it('refuses more than 10,000 rows with 422, and audits the refusal', async () => {
    await (await db()).execute(sql`insert into email_log (at, "to", template, subject, provider, status) select ${NOW}::bigint - g, 'a@b.co', 'sign-in', 'S', 'outbox', 'skipped' from generate_series(1, 10001) g`);
    const res = await post('/api/console/email/export', {});
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('export_too_large');
    const [audit] = await (await db()).select().from(auditLog);
    expect(audit).toMatchObject({ action: 'email_log.export', outcome: 'failed', reason: 'export_too_large', after: { rows: 10001 } });
  });
});

// ================================================================================================
// Usage
// ================================================================================================

/** Northline on a running Team Plan (16 seats), Harbor on a canceled one: only Northline is in scope. */
async function workspaces(): Promise<void> {
  const d = await db();
  await d.execute(sql`update teams set seats = 16 where id = 'northline'`);
  await d.insert(accounts).values([
    { id: 'a_north', teamId: 'northline', ownerUserId: 'u_alex', ownerEmail: 'alex@northlinerealty.com', name: 'Northline', createdAt: NOW - 30 * DAY },
    { id: 'a_harbor', teamId: 'harbor', ownerUserId: 'u_natasha', ownerEmail: 'natasha@harborpine.com', name: 'Harbor', createdAt: NOW - 30 * DAY },
  ]);
  await d.insert(plans).values([
    { id: 'p_north', accountId: 'a_north', kind: 'agents', option: 'upto15', seats: 16, status: 'active', startsAt: NOW - 30 * DAY, orderId: 'o1', createdAt: NOW - 30 * DAY },
    { id: 'p_harbor', accountId: 'a_harbor', kind: 'agents', option: 'upto15', seats: 16, status: 'canceled', startsAt: NOW - 30 * DAY, orderId: 'o2', createdAt: NOW - 30 * DAY },
  ]);
}

const counted = (day: string, userId: string, teamId: string | null, kind: string, count: number) => ({ day, userId, teamId, kind, count });

describe('GET /api/console/usage (spec § 7.7) @console', () => {
  it('says when counting starts before anything is counted, and estimates nothing', async () => {
    const res = await get('/api/console/usage', 'st4');
    expect(res.statusCode).toBe(200);
    const r = res.json() as UsageReport;
    expect(r).toMatchObject({ from: '2026-11-24', to: '2026-12-07', countingSince: '2026-12-07', hasData: false, emailsSent: 0 });
    expect(r.totals).toEqual({ signIns: 0, lessonPlays: null, guideViews: 0, sessionJoins: 0, activeUsers: 0 });
    expect(r.signInsPerDay).toHaveLength(14);
    expect(r.signInsPerDay.every((d) => d.count === 0)).toBe(true);
  });

  it('counts sign-ins, guide views, joins, active learners, seats and sent emails in the range', async () => {
    await workspaces();
    const members = (await (await db()).select({ id: users.id }).from(users).where(sql`team_id = 'northline'`)).length;
    await (await db()).insert(usageDaily).values([
      counted('2026-12-07', 'u_alex', 'northline', 'sign_in', 3),
      counted('2026-12-06', 'u_alex', 'northline', 'sign_in', 2),
      counted('2026-12-06', 'u_alex', 'northline', 'guide_view', 5),
      counted('2026-12-01', 'u_natasha', 'harbor', 'sign_in', 4),
      counted('2026-12-01', 'u_jamie', null, 'session_join', 1),
      // Outside the range.
      counted('2026-11-23', 'u_alex', 'northline', 'sign_in', 9),
    ]);
    await logged([{ status: 'sent' }, { status: 'failed', errorKind: 'provider', providerId: null }, { status: 'skipped', providerId: null, provider: 'outbox' }]);
    await (await db()).insert(emailLog).values({ at: NOW - 40 * DAY, to: 'x@y.co', template: 'sign-in', subject: 'S', provider: 'resend', status: 'sent' });

    const r = (await get('/api/console/usage?from=2026-11-24&to=2026-12-07')).json() as UsageReport;
    expect(r.hasData).toBe(true);
    expect(r.countingSince).toBe('2026-11-23');
    expect(r.totals).toEqual({ signIns: 9, lessonPlays: null, guideViews: 5, sessionJoins: 1, activeUsers: 3 });
    expect(r.emailsSent).toBe(1);
    expect(r.signInsPerDay.find((d) => d.day === '2026-12-06')).toEqual({ day: '2026-12-06', count: 2 });
    expect(r.signInsPerDay.find((d) => d.day === '2026-12-01')).toEqual({ day: '2026-12-01', count: 4 });
    // Only the running workspace, with its members against its seats.
    expect(r.workspaces).toEqual([{ teamId: 'northline', name: expect.any(String), planKind: 'agents', seatCap: 16, seatsUsed: members, signIns: 5, lessonPlays: null }]);
    expect(r.seats).toEqual({ used: members, cap: 16 });
    expect(r.options.map((o) => o.teamId)).toEqual(['northline']);
    expect(r.storage).toEqual({ bytes: 41_200_000_000, capBytes: null, asOf: NOW });

    // One workspace: its own counts, and no storage (the bucket is not per workspace).
    const one = (await get('/api/console/usage?from=2026-11-24&to=2026-12-07&teamId=northline')).json() as UsageReport;
    expect(one.totals).toMatchObject({ signIns: 5, guideViews: 5, sessionJoins: 0, activeUsers: 1 });
    expect(one.storage).toBeNull();
    // One plan: its running workspaces.
    const team = (await get('/api/console/usage?from=2026-11-24&to=2026-12-07&planKind=agents')).json() as UsageReport;
    expect(team.totals.signIns).toBe(5);
    const insiders = (await get('/api/console/usage?from=2026-11-24&to=2026-12-07&planKind=membership')).json() as UsageReport;
    expect(insiders.totals).toMatchObject({ signIns: 0, activeUsers: 0 });
    expect(insiders.workspaces).toEqual([]);
  });

  it('reads the bucket at most once an hour, and says Unavailable when it can’t', async () => {
    await get('/api/console/usage');
    await get('/api/console/usage');
    expect(storageCalls).toBe(1);
    resetStorageCache();
    storageAnswer = async () => {
      throw new Error('StorageConfigError: S3_BUCKET is not set');
    };
    const r = (await get('/api/console/usage')).json() as UsageReport;
    expect(r.storage).toBeNull();
    expect(JSON.stringify(r)).not.toContain('S3_BUCKET');
  });

  it('refuses a range it cannot answer: a bad day, backwards, or over 400 days', async () => {
    for (const q of ['?from=2026-02-30', '?from=2026-12-07&to=2026-12-01', '?from=2025-01-01&to=2026-12-07', '?teamId=a%20b', '?planKind=gold']) {
      const res = await get(`/api/console/usage${q}`);
      expect(res.statusCode, q).toBe(400);
      expect(res.json().code).toBe('invalid_query');
    }
    expect((await get('/api/console/usage?from=2025-11-03&to=2026-12-07')).statusCode).toBe(200);
  });
});

describe('a usage count (spec §§ 6, 7.7) @console', () => {
  it('upserts one row per learner, day and kind, with the team, and skips a masquerade’s request', async () => {
    const req = (masquerade: unknown) => ({ masquerade }) as never;
    recordUsage(req(null), 'u_alex', 'guide_view');
    recordUsage(req(null), 'u_alex', 'guide_view');
    recordUsage(req({ id: 'msq_1' }), 'u_alex', 'guide_view');
    recordUsage(req(null), 'st1', 'sign_in');
    await settleObserved();
    const [alex] = await (await db()).select({ teamId: users.teamId }).from(users).where(sql`id = 'u_alex'`);
    expect(await (await db()).select().from(usageDaily)).toEqual([counted('2026-12-07', 'u_alex', alex!.teamId, 'guide_view', 2)]);
  });
});

// ================================================================================================
// Retention (D6)
// ================================================================================================

describe('retention: 180 days of email, 400 of usage (D6) @console', () => {
  it('deletes what is past retention and keeps the rest', async () => {
    const d = await db();
    await d.insert(emailLog).values([
      { at: NOW - 181 * DAY, to: 'a@b.co', template: 'sign-in', subject: 'old', provider: 'outbox', status: 'skipped' },
      { at: NOW - 179 * DAY, to: 'a@b.co', template: 'sign-in', subject: 'kept', provider: 'outbox', status: 'skipped' },
    ]);
    await d.insert(usageDaily).values([counted('2025-11-01', 'u_jamie', null, 'sign_in', 1), counted('2025-11-03', 'u_jamie', null, 'sign_in', 1)]);
    expect(await pruneEmailAndUsage(d, NOW)).toEqual({ emails: 1, usage: 1 });
    expect((await emailRows()).map((r) => r.subject)).toEqual(['kept']);
    expect((await d.select().from(usageDaily)).map((r) => r.day)).toEqual(['2025-11-03']);
    // The audit log is never pruned.
    expect(await pruneEmailAndUsage(d, NOW)).toEqual({ emails: 0, usage: 0 });
  });
});
