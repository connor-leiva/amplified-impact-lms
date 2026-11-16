// The Admin Console's email log and usage, PR 7 (D-166, spec §§ 7.7, 7.15). Registered by
// `registerConsoleRoutes` inside its scope, so its `private, no-store` hook covers every answer here,
// refusals and 429s included.
//
//   GET  /api/console/email          `?q&template&status&userId&from&to&cursor&limit` → a page, newest
//                                    first, with the filters' options. email.read (Owner, Admin, Support)
//   GET  /api/console/email/:id      one row. email.read
//   POST /api/console/email/export   the same filters (and `ids`, for "Export selected") → CSV, 10,000
//                                    rows at most (else 422 `export_too_large`). export (Owner, Admin);
//                                    audited (`email_log.export`, a refused one as `failed`); 5 a minute.
//   GET  /api/console/usage          `?from&to&teamId&planKind` (days, 400 at most) → a `UsageReport`.
//                                    usage.read (Owner, Admin, Support)
//
// Read-only but the export's audit row: no GET here writes anything. Every value is bound; LIKE's own
// characters in a search are escaped. Nothing here sends an email or estimates a figure: what was not
// counted is null, and the screens say "Unavailable".

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  AUDIT_EXPORT_MAX_ROWS,
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  EMAIL_IDS_MAX,
  EMAIL_STATUSES,
  USAGE_MAX_DAYS,
  addDays,
  containsPattern,
  daysIn,
  emailCsv,
  isDay,
  isEmailStatus,
  isPlanKind,
  lastDays,
  programDay,
  programDayStart,
} from '@ai/core';
import type { EmailLogFilters, EmailLogPage, EmailLogRow, UsageQuery, UsageReport, UsageWorkspaceRow } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { emailLog, users } from '../db/schema';
import { clock } from '../lib/clock';
import { bucketBytes } from '../storage';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { liveArray, priorityArray } from './records';
import { CONSOLE_RATE, int, limit, present } from './routes';

export const EMAIL_USAGE_PATHS = {
  email: '/api/console/email',
  emailOne: '/api/console/email/:id',
  emailExport: '/api/console/email/export',
  usage: '/api/console/usage',
} as const;

/** What the usage route is handed: the bucket's size, read at most once an hour. A test passes its own. */
export interface UsageDeps {
  storageBytes?: () => Promise<number>;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; field: string };

const Q_MAX = 100;
const ID = /^[A-Za-z0-9_.:@-]{1,128}$/;
const TEMPLATE = /^[a-z0-9-]{1,64}$/;
const ROW_ID = /^\d{1,16}$/;

const queryOf = (req: FastifyRequest): Record<string, unknown> => (req.query ?? {}) as Record<string, unknown>;
const bodyOf = (req: FastifyRequest): Record<string, unknown> => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {});

// --- the email log -------------------------------------------------------------------------------

/** The email log's filters from a query string or an export body. Anything malformed is refused. */
export function parseEmailFilters(input: Record<string, unknown>): Parsed<EmailLogFilters> {
  const out: EmailLogFilters = {};
  if (present(input.q)) {
    const q = typeof input.q === 'string' ? input.q.trim() : '';
    if (q === '' || q.length > Q_MAX) return { ok: false, field: 'q' };
    out.q = q;
  }
  if (present(input.template)) {
    if (typeof input.template !== 'string' || !TEMPLATE.test(input.template)) return { ok: false, field: 'template' };
    out.template = input.template;
  }
  if (present(input.status)) {
    if (!isEmailStatus(input.status)) return { ok: false, field: 'status' };
    out.status = input.status;
  }
  if (present(input.userId)) {
    if (typeof input.userId !== 'string' || !ID.test(input.userId)) return { ok: false, field: 'userId' };
    out.userId = input.userId;
  }
  for (const key of ['from', 'to'] as const) {
    if (!present(input[key])) continue;
    const n = int(input[key]);
    if (n === null) return { ok: false, field: key };
    out[key] = n;
  }
  if (out.from !== undefined && out.to !== undefined && out.from > out.to) return { ok: false, field: 'from' };
  if (present(input.ids)) {
    const ids = input.ids;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > EMAIL_IDS_MAX || !ids.every((v) => typeof v === 'string' && ROW_ID.test(v))) return { ok: false, field: 'ids' };
    out.ids = [...new Set(ids as string[])];
  }
  return { ok: true, value: out };
}

function emailWhere(f: EmailLogFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (f.q !== undefined) {
    const p = containsPattern(f.q);
    parts.push(or(sql`${emailLog.to} ilike ${p}`, sql`${emailLog.subject} ilike ${p}`));
  }
  if (f.template !== undefined) parts.push(eq(emailLog.template, f.template));
  if (f.status !== undefined) parts.push(eq(emailLog.status, f.status));
  // A person's emails: those logged with their id, or sent to their address before they had one.
  if (f.userId !== undefined) parts.push(or(eq(emailLog.userId, f.userId), sql`lower(${emailLog.to}) = (select u.email from ${users} u where u.id = ${f.userId})`));
  if (f.from !== undefined) parts.push(gte(emailLog.at, f.from));
  if (f.to !== undefined) parts.push(lte(emailLog.at, f.to));
  if (f.ids !== undefined) parts.push(inArray(emailLog.id, f.ids.map(Number)));
  const set = parts.filter((p): p is SQL => p !== undefined);
  return set.length ? and(...set) : undefined;
}

type EmailRaw = typeof emailLog.$inferSelect;
const toEmailRow = (r: EmailRaw): EmailLogRow => ({
  id: String(r.id),
  at: Number(r.at),
  to: r.to,
  userId: r.userId,
  template: r.template,
  subject: r.subject,
  provider: r.provider,
  providerId: r.providerId,
  status: r.status,
  errorKind: r.errorKind,
});

export async function readEmails(db: Database, f: EmailLogFilters, opts: { before?: number; limit: number }): Promise<EmailLogRow[]> {
  const where = and(emailWhere(f), opts.before !== undefined ? lt(emailLog.id, opts.before) : undefined);
  return (await db.select().from(emailLog).where(where).orderBy(desc(emailLog.id)).limit(opts.limit)).map(toEmailRow);
}

// --- usage ---------------------------------------------------------------------------------------

/** The usage query, or the field that is wrong. With no days it is the last 14 (the screen's default). */
export function parseUsageQuery(input: Record<string, unknown>, now: number): Parsed<UsageQuery> {
  const fallback = lastDays(14, now);
  const from = present(input.from) ? input.from : fallback.from;
  const to = present(input.to) ? input.to : present(input.from) ? programDay(now) : fallback.to;
  if (!isDay(from)) return { ok: false, field: 'from' };
  if (!isDay(to)) return { ok: false, field: 'to' };
  const days = daysIn(from, to);
  if (days < 1) return { ok: false, field: 'from' };
  if (days > USAGE_MAX_DAYS) return { ok: false, field: 'to' };
  const out: UsageQuery = { from, to };
  if (present(input.teamId)) {
    if (typeof input.teamId !== 'string' || !ID.test(input.teamId)) return { ok: false, field: 'teamId' };
    out.teamId = input.teamId;
  }
  if (present(input.planKind)) {
    if (!isPlanKind(input.planKind)) return { ok: false, field: 'planKind' };
    out.planKind = input.planKind;
  }
  return { ok: true, value: out };
}

const STORAGE_TTL_MS = 3600_000;
let storageCache: { at: number; value: number | null } | null = null;
let storageRead: Promise<number | null> | null = null;

/** Forgets the cached bucket size. For tests. */
export function resetStorageCache(): void {
  storageCache = null;
  storageRead = null;
}

/** The bucket's size, read at most once an hour (spec § 7.7); null when it can't be read. */
async function storageSize(read: () => Promise<number>, now: number): Promise<{ bytes: number; asOf: number } | null> {
  if (!storageCache || now - storageCache.at >= STORAGE_TTL_MS) {
    storageRead ??= read().then(
      (v) => (Number.isFinite(v) && v >= 0 ? v : null),
      () => null,
    );
    const value = await storageRead;
    storageRead = null;
    storageCache = { at: now, value };
  }
  return storageCache.value === null ? null : { bytes: storageCache.value, asOf: storageCache.at };
}

const idList = (ids: readonly string[]): SQL => (ids.length ? sql`(${sql.join(ids.map((i) => sql`${i}`), sql`, `)})` : sql`(null)`);
const num = (v: unknown): number => Number(v ?? 0);

/** The Usage screen's report: every figure counted, none estimated. */
export async function usageReport(db: Database, q: UsageQuery, now: number, readStorage: () => Promise<number>): Promise<UsageReport> {
  // The running workspaces (a trialing, active or past-due plan, as the mockup leaves out a canceled
  // one), their plan picked by `PLAN_PRIORITY` as the Workspaces list picks it.
  const live = (await db.execute(sql`
    select t.id, t.name, t.seats, pp.kind, (select count(*)::int from users m where m.team_id = t.id) as used
    from teams t
    join lateral (
      select p.kind, p.status from plans p join accounts a on a.id = p.account_id
      where a.team_id = t.id
      order by (p.status = any(${liveArray})) desc, array_position(${priorityArray}, p.kind) nulls last, p.created_at desc
      limit 1
    ) pp on true
    where pp.status = any(${liveArray})
    order by lower(t.name), t.id
  `)) as unknown as { id: string; name: string; seats: number; kind: string | null; used: number }[];
  const scoped = live.filter((t) => (q.teamId === undefined || t.id === q.teamId) && (q.planKind === undefined || t.kind === q.planKind));

  // What the totals count: one workspace, one plan's workspaces, or everyone.
  const teamScope: SQL | null = q.teamId !== undefined ? sql`team_id = ${q.teamId}` : q.planKind !== undefined ? sql`team_id in ${idList(scoped.map((t) => t.id))}` : null;
  const inRange = sql`day between ${q.from} and ${q.to}`;
  const where = teamScope ? sql`${inRange} and ${teamScope}` : inRange;
  const start = programDayStart(q.from);
  const end = programDayStart(addDays(q.to, 1));
  const userScope: SQL | null = q.teamId !== undefined ? sql`user_id in (select id from users where team_id = ${q.teamId})` : q.planKind !== undefined ? sql`user_id in (select id from users where team_id in ${idList(scoped.map((t) => t.id))})` : null;

  const [byKind, active, perDay, byTeam, first, sent, storage] = await Promise.all([
    db.execute(sql`select kind, sum(count)::int as n from usage_daily where ${where} group by kind`) as unknown as Promise<{ kind: string; n: number }[]>,
    db.execute(sql`select count(distinct user_id)::int as n from usage_daily where ${where}`) as unknown as Promise<{ n: number }[]>,
    db.execute(sql`select day, sum(count)::int as n from usage_daily where ${where} and kind = 'sign_in' group by day`) as unknown as Promise<{ day: string; n: number }[]>,
    db.execute(sql`select team_id, sum(count)::int as n from usage_daily where ${inRange} and kind = 'sign_in' and team_id is not null group by team_id`) as unknown as Promise<{ team_id: string; n: number }[]>,
    db.execute(sql`select min(day) as day from usage_daily`) as unknown as Promise<{ day: string | null }[]>,
    db.execute(sql`select count(*)::int as n from email_log where status = 'sent' and at >= ${start} and at < ${end}${userScope ? sql` and ${userScope}` : sql``}`) as unknown as Promise<{ n: number }[]>,
    q.teamId === undefined && q.planKind === undefined ? storageSize(readStorage, now) : Promise.resolve(null),
  ]);

  const kindTotal = (k: string) => num(byKind.find((r) => r.kind === k)?.n);
  const daily = new Map(perDay.map((r) => [r.day, num(r.n)]));
  const teamSignIns = new Map(byTeam.map((r) => [r.team_id, num(r.n)]));
  const firstDay = first[0]?.day ?? null;
  const workspaces: UsageWorkspaceRow[] = scoped.map((t) => ({
    teamId: t.id,
    name: t.name,
    planKind: isPlanKind(t.kind) ? t.kind : null,
    seatCap: num(t.seats),
    seatsUsed: num(t.used),
    signIns: teamSignIns.get(t.id) ?? 0,
    lessonPlays: null,
  }));

  return {
    from: q.from,
    to: q.to,
    countingSince: firstDay ?? programDay(now),
    hasData: firstDay !== null,
    totals: {
      signIns: kindTotal('sign_in'),
      // No request counts a lesson play yet (D-166): unavailable, never estimated.
      lessonPlays: null,
      guideViews: kindTotal('guide_view'),
      sessionJoins: kindTotal('session_join'),
      activeUsers: num(active[0]?.n),
    },
    seats: { used: workspaces.reduce((a, w) => a + w.seatsUsed, 0), cap: workspaces.reduce((a, w) => a + w.seatCap, 0) },
    emailsSent: num(sent[0]?.n),
    storage: storage ? { bytes: storage.bytes, capBytes: null, asOf: storage.asOf } : null,
    signInsPerDay: Array.from({ length: daysIn(q.from, q.to) }, (_, i) => {
      const day = addDays(q.from, i);
      return { day, count: daily.get(day) ?? 0 };
    }),
    workspaces,
    options: live.map((t) => ({ teamId: t.id, name: t.name })),
  };
}

// --- the routes ----------------------------------------------------------------------------------

export function registerEmailUsageRoutes(scope: FastifyInstance, deps: UsageDeps = {}): void {
  const read = { config: limit(CONSOLE_RATE.read) };
  const readStorage = deps.storageBytes ?? bucketBytes;

  scope.get(EMAIL_USAGE_PATHS.email, { ...read, preHandler: [requireSession, requireConsole('email.read')] }, async (req, reply): Promise<FastifyReply> => {
    const q = queryOf(req);
    const parsed = parseEmailFilters(q);
    if (!parsed.ok || parsed.value.ids) return consoleError(reply, 'invalid_query', `That ${parsed.ok ? 'ids' : parsed.field} filter isn’t valid.`);
    let size = CONSOLE_PAGE_DEFAULT;
    if (present(q.limit)) {
      const n = int(q.limit);
      if (n === null || n < 1) return consoleError(reply, 'invalid_query', 'That limit isn’t valid.');
      size = Math.min(n, CONSOLE_PAGE_MAX);
    }
    let before: number | undefined;
    if (present(q.cursor)) {
      const n = int(q.cursor);
      if (n === null || n < 1) return consoleError(reply, 'invalid_query', 'That cursor isn’t valid.');
      before = n;
    }
    const db = getDb();
    const [raw, templates] = await Promise.all([
      readEmails(db, parsed.value, { before, limit: size + 1 }),
      db.selectDistinct({ template: emailLog.template }).from(emailLog).orderBy(emailLog.template),
    ]);
    const rows = raw.slice(0, size);
    const page: EmailLogPage = {
      rows,
      nextCursor: raw.length > size ? rows[rows.length - 1]!.id : null,
      templates: templates.map((t) => t.template),
      statuses: [...EMAIL_STATUSES],
    };
    return reply.send(page);
  });

  scope.get(EMAIL_USAGE_PATHS.emailOne, { ...read, preHandler: [requireSession, requireConsole('email.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = String((req.params as Record<string, unknown>).id ?? '');
    if (!ROW_ID.test(id)) return consoleError(reply, 'not_found');
    const [row] = await getDb().select().from(emailLog).where(eq(emailLog.id, Number(id))).limit(1);
    if (!row) return consoleError(reply, 'not_found');
    return reply.send(toEmailRow(row));
  });

  scope.post(
    EMAIL_USAGE_PATHS.emailExport,
    { config: limit(CONSOLE_RATE.export), preHandler: [requireSession, requireJsonSameOrigin, requireConsole('export')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const parsed = parseEmailFilters(bodyOf(req));
      if (!parsed.ok) return consoleError(reply, 'invalid_query', `That ${parsed.field} filter isn’t valid.`);
      const filters = parsed.value;
      const db = getDb();
      const [counted] = await db.select({ n: sql<number>`count(*)::int` }).from(emailLog).where(emailWhere(filters));
      const total = Number(counted?.n ?? 0);
      const target = { type: 'email_log', label: 'Email log' };
      // The filters as the audit row keeps them: the selection by its size, not 500 ids.
      const kept = { ...filters, ids: filters.ids ? filters.ids.length : undefined };
      if (total > AUDIT_EXPORT_MAX_ROWS) {
        await audit(req, { action: 'email_log.export', outcome: 'failed', actor, target, reason: 'export_too_large', after: { rows: total, filters: kept } });
        return consoleError(reply, 'export_too_large');
      }
      const rows = await readEmails(db, filters, { limit: AUDIT_EXPORT_MAX_ROWS });
      await audit(req, { action: 'email_log.export', outcome: 'ok', actor, target, after: { rows: rows.length, format: 'csv', filters: kept } });
      const day = new Date(clock.now()).toISOString().slice(0, 10);
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="email-log-${day}.csv"`)
        .send(emailCsv(rows));
    },
  );

  scope.get(EMAIL_USAGE_PATHS.usage, { ...read, preHandler: [requireSession, requireConsole('usage.read')] }, async (req, reply): Promise<FastifyReply> => {
    const now = clock.now();
    const parsed = parseUsageQuery(queryOf(req), now);
    if (!parsed.ok) return consoleError(reply, 'invalid_query', `That ${parsed.field} isn’t valid.`);
    return reply.send(await usageReport(getDb(), parsed.value, now, readStorage));
  });
}
