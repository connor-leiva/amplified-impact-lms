// The CRM sync log (D-134): what the GoHighLevel loops have copied, what is waiting, what failed, and a
// retry for a row that gave up. The Owner and Admins only, on /admin/crm-sync.
//
//   GET  /api/admin/crm-sync        counts per kind (sign-ups, buyers, first sign-ins) and the rows
//                                   that need a look, newest activity first
//   POST /api/admin/crm-sync/retry  { kind, id }: attempts back to 0 and the next-attempt lock cleared,
//                                   so the next tick takes the row again
//
// Staff already see learners' addresses in the console, so this page shows each row's email. What it
// never shows, and the server never logs, is anything from GHL itself: `ghl_error` is a step, a kind
// and a status code (integrations/ghl.ts), never a response body, a token or an id from Railway.
//
// A retry is safe at any moment: every call the loops make is idempotent, so a row retried while a
// tick still holds it is, at worst, written twice with the same values.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { ai101Waitlist, ghlLogins, orders, users } from '../db/schema';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { FIELD_ENV, STAGE_ENV, ghlSyncPaused, readGhlConfig, syncStamp } from '../integrations/ghl';
import type { FieldKey, StageKey } from '../integrations/ghl';
import { MAX_ATTEMPTS } from '../jobs/ghl-sync';

export const CRM_SYNC_PATH = '/api/admin/crm-sync';
export const CRM_SYNC_RETRY_PATH = '/api/admin/crm-sync/retry';

export type CrmKind = 'waitlist' | 'order' | 'login';
export type CrmState = 'synced' | 'waiting' | 'retrying' | 'gave-up';

export interface CrmRow {
  kind: CrmKind;
  id: string;
  email: string;
  state: CrmState;
  attempts: number;
  lastAttemptAt: number | null;
  nextAttemptAt: number | null;
  syncedAt: number | null;
  /** `step:kind:status`, e.g. `fields:rejected:422`. Never a body. */
  error: string | null;
}

export interface CrmCounts {
  total: number;
  synced: number;
  waiting: number;
  retrying: number;
  gaveUp: number;
}

export interface CrmSyncReport {
  sync: 'on' | 'paused' | 'off';
  /** Which custom fields and stages have ids set. Names only, never the ids. */
  fields: FieldKey[];
  pipeline: boolean;
  stages: StageKey[];
  counts: Record<CrmKind, CrmCounts>;
  /** Every row that is retrying or gave up (up to 200), then the latest activity (up to 30). */
  problems: CrmRow[];
  recent: CrmRow[];
}

interface RawRow {
  id: string;
  email: string;
  ghl_synced_at: string | number | null;
  ghl_sync_stamp: string | null;
  ghl_attempts: number;
  ghl_next_attempt_at: string | number | null;
  ghl_last_attempt_at: string | number | null;
  ghl_error: string | null;
  at: string | number;
}

const num = (v: string | number | null): number | null => (v === null ? null : Number(v));

/**
 * A row's state. Synced means today's sync completed for it (with no GHL configured there is no
 * "today", so any completed sync counts). Gave up: out of attempts and not synced. Retrying: an error
 * on record and attempts left. Waiting: everything else not yet synced, including the re-sync a new
 * stamp queues.
 */
export function crmState(r: Pick<RawRow, 'ghl_synced_at' | 'ghl_sync_stamp' | 'ghl_attempts' | 'ghl_error'>, stamp: string | null): CrmState {
  const done = r.ghl_synced_at !== null && r.ghl_error === null && (stamp === null || r.ghl_sync_stamp === stamp);
  if (done) return 'synced';
  if (r.ghl_attempts >= MAX_ATTEMPTS) return 'gave-up';
  if (r.ghl_error !== null) return 'retrying';
  return 'waiting';
}

const isAdmin = (v: ReturnType<typeof viewerOrThrow>): boolean =>
  v.user.kind === 'staff' && (v.user.staffRole === 'Owner' || v.user.staffRole === 'Admin');

const forbidden = (reply: FastifyReply) => reply.code(403).send({ error: 'The CRM sync log is for the Owner and Admins.' });

async function rowsOf(kind: CrmKind): Promise<RawRow[]> {
  const db = getDb();
  const cols = sql`ghl_synced_at, ghl_sync_stamp, ghl_attempts, ghl_next_attempt_at, ghl_last_attempt_at, ghl_error`;
  if (kind === 'waitlist') return (await db.execute(sql`select id, email, ${cols}, created_at as at from ${ai101Waitlist}`)) as unknown as RawRow[];
  // A pending order is never copied (ghl-orders.ts), so it is not part of the log.
  if (kind === 'order') return (await db.execute(sql`select id, email, ${cols}, created_at as at from ${orders} where status <> 'pending' and email is not null`)) as unknown as RawRow[];
  return (await db.execute(sql`
    select l.user_id as id, u.email, l.ghl_synced_at, l.ghl_sync_stamp, l.ghl_attempts, l.ghl_next_attempt_at,
           l.ghl_last_attempt_at, l.ghl_error, l.first_login_at as at
      from ${ghlLogins} l join ${users} u on u.id = l.user_id`)) as unknown as RawRow[];
}

export async function crmSyncReport(env: NodeJS.ProcessEnv = process.env): Promise<CrmSyncReport> {
  const config = readGhlConfig(env);
  const stamp = config ? syncStamp(config) : null;
  const kinds: CrmKind[] = ['waitlist', 'order', 'login'];
  const all: { row: CrmRow; activity: number }[] = [];
  const counts = {} as Record<CrmKind, CrmCounts>;
  for (const kind of kinds) {
    const c: CrmCounts = { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 };
    for (const r of await rowsOf(kind)) {
      const state = crmState(r, stamp);
      c.total += 1;
      if (state === 'synced') c.synced += 1;
      else if (state === 'waiting') c.waiting += 1;
      else if (state === 'retrying') c.retrying += 1;
      else c.gaveUp += 1;
      const row: CrmRow = {
        kind,
        id: r.id,
        email: r.email,
        state,
        attempts: r.ghl_attempts,
        lastAttemptAt: num(r.ghl_last_attempt_at),
        nextAttemptAt: num(r.ghl_next_attempt_at),
        syncedAt: num(r.ghl_synced_at),
        error: r.ghl_error,
      };
      all.push({ row, activity: row.lastAttemptAt ?? row.syncedAt ?? Number(r.at) });
    }
    counts[kind] = c;
  }
  all.sort((a, b) => b.activity - a.activity || (a.row.id < b.row.id ? -1 : 1));
  const rows = all.map((x) => x.row);
  return {
    sync: !config ? 'off' : ghlSyncPaused(env) ? 'paused' : 'on',
    fields: config ? (Object.keys(FIELD_ENV) as FieldKey[]).filter((k) => config.fields?.[k]) : [],
    pipeline: Boolean(config?.pipeline),
    stages: config?.pipeline ? (Object.keys(STAGE_ENV) as StageKey[]).filter((k) => config.pipeline!.stages[k]) : [],
    counts,
    problems: rows.filter((r) => r.state === 'retrying' || r.state === 'gave-up').slice(0, 200),
    recent: rows.slice(0, 30),
  };
}

const TABLES = { waitlist: ai101Waitlist, order: orders, login: ghlLogins } as const;

export function registerCrmSyncRoutes(app: FastifyInstance): void {
  app.get(CRM_SYNC_PATH, { preHandler: requireSession }, async (req, reply) => {
    if (!isAdmin(viewerOrThrow(req))) return forbidden(reply);
    return reply.header('cache-control', 'no-store').send(await crmSyncReport());
  });

  app.post(CRM_SYNC_RETRY_PATH, { preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply) => {
    const viewer = viewerOrThrow(req);
    if (!isAdmin(viewer)) return forbidden(reply);
    const body = (req.body ?? {}) as { kind?: unknown; id?: unknown };
    const kind = body.kind;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if ((kind !== 'waitlist' && kind !== 'order' && kind !== 'login') || id === '') return reply.code(400).send({ error: 'Say which row: kind and id.' });
    const db = getDb();
    const reset = { ghlAttempts: 0, ghlNextAttemptAt: null } as const;
    const updated =
      kind === 'login'
        ? await db.update(ghlLogins).set(reset).where(eq(ghlLogins.userId, id)).returning({ id: ghlLogins.userId })
        : await db.update(TABLES[kind]).set(reset).where(eq(TABLES[kind].id, id)).returning({ id: TABLES[kind].id });
    if (updated.length === 0) return reply.code(404).send({ error: 'No such row.' });
    // Ids only: never the row's email.
    req.log.info({ kind, row: id, by: viewer.user.id }, 'CRM sync: row retried by staff');
    return reply.send({ ok: true });
  });
}
