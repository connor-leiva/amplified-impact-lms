// The Admin Console's audit writer (D-157, spec § 7.8): one row in `audit_log` per Console write, and
// one per staff member a Console route refuses.
//
//   await audit(req, { action: 'audit.export', outcome: 'ok', actor: staffActor(viewer), target: { type: 'audit_log' }, after: { rows } });
//
// Every payload goes through `redactAuditPayload` first, so nothing secret is ever stored: keys that
// name a secret are dropped, values that look like a Stripe or Resend key are dropped, and what is
// left is cut to 2 KB. The request gives the row its IP (the visitor's own, `lib/client-ip.ts`), its
// user agent (300 characters at most) and its request id. The table is append-only (migration 0015's
// trigger), so a row, once written, is the record.

import type { FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { isAuditAction } from '@ai/core';
import type { AuditAction, AuditOutcome } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { auditLog } from '../db/schema';
import { clock } from '../lib/clock';

/** Spec § 7.8: the user agent is kept to 300 characters. */
export const AUDIT_USER_AGENT_MAX = 300;
/** Spec § 7.8: a payload (`before`, `after`) is 2 KB at most, as JSON. */
export const AUDIT_PAYLOAD_MAX_BYTES = 2048;
/** A reason is staff's own words: 500 characters, as the masquerade and billing reasons are capped. */
export const AUDIT_REASON_MAX = 500;
/** A target's label is a name or a title; 200 characters is plenty. */
export const AUDIT_LABEL_MAX = 200;

/** Spec § 7.8: a key matching this is dropped, value and all. */
export const SECRET_KEY = /secret|token|key|password|hash|authorization|cookie|signature/i;
/** Spec § 7.8: a value starting like a Stripe (`sk_`, `rk_`, `whsec_`) or Resend (`re_`) key is dropped. */
export const SECRET_VALUE = /^\s*(sk|rk|whsec|re)_/;

/** How deep a payload is walked. Deeper than this is dropped: no Console payload nests so far. */
const MAX_DEPTH = 8;

const DROP = Symbol('drop');

function scrub(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case 'string':
      return SECRET_VALUE.test(value) ? DROP : value;
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'object':
      break;
    default:
      // undefined, functions and symbols have no JSON form.
      return DROP;
  }
  if (depth >= MAX_DEPTH) return DROP;
  const obj = value as object;
  if (seen.has(obj)) return DROP;
  seen.add(obj);
  try {
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
    if (Array.isArray(obj)) return obj.map((v) => scrub(v, depth + 1, seen)).filter((v) => v !== DROP);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SECRET_KEY.test(k)) continue;
      const clean = scrub(v, depth + 1, seen);
      if (clean !== DROP) out[k] = clean;
    }
    return out;
  } finally {
    seen.delete(obj);
  }
}

/**
 * A payload as it may be stored: every key that names a secret dropped, every value that looks like a
 * key dropped, at any depth, then cut to 2 KB. Over 2 KB, the payload is replaced by a note of its
 * size, never by a prefix (a prefix could end in the middle of something). `undefined` and `null`
 * are stored as null.
 */
export function redactAuditPayload(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  const clean = scrub(value, 0, new WeakSet());
  if (clean === DROP) return null;
  const json = JSON.stringify(clean);
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > AUDIT_PAYLOAD_MAX_BYTES) return { truncated: true, bytes };
  return clean;
}

/** Who acted: a staff member (with their role at the time), or the system itself. */
export type AuditActor = { source: 'staff'; userId: string; role: string | null } | { source: 'system' };

export interface AuditInput {
  /**
   * The row's id, when it was reserved before the write it records (D-164: a refund's
   * `console_audit_id` goes to Stripe first, and this row is written once Stripe answers). Else the
   * table's own sequence picks it.
   */
  id?: number;
  action: AuditAction;
  outcome: AuditOutcome;
  actor: AuditActor;
  /** The masquerade session the action happened in (PR 3). */
  masqueradeSessionId?: string | null;
  target?: { type: string; id?: string | null; label?: string | null };
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Anything that can insert: the pool, or a transaction a write shares with its audit row. */
export type AuditWriter = Pick<Database, 'insert'>;

const clip = (v: string | null | undefined, max: number): string | null => (v === undefined || v === null ? null : v.slice(0, max));

/** The row's request half: the visitor's IP, the user agent (300 characters at most) and the request id. */
export function requestFacts(req: FastifyRequest | null): { ip: string | null; userAgent: string | null; requestId: string | null } {
  if (!req) return { ip: null, userAgent: null, requestId: null };
  const ua = req.headers['user-agent'];
  return {
    ip: req.clientIp || null,
    userAgent: typeof ua === 'string' && ua !== '' ? ua.slice(0, AUDIT_USER_AGENT_MAX) : null,
    requestId: req.id === undefined || req.id === null ? null : String(req.id),
  };
}

/** Take the next audit row id from the table's own sequence without writing a row (D-164). */
export async function reserveAuditId(db: Pick<Database, 'execute'> = getDb()): Promise<number> {
  const rows = (await db.execute(sql`select nextval(pg_get_serial_sequence('audit_log', 'id'))::text as id`)) as unknown as { id: string }[];
  return Number(rows[0]!.id);
}

/**
 * Write one audit row and return its id. `req` is null for the system (a sweep, a job). Throws on an
 * action outside `AUDIT_ACTIONS`, so a typo is a failing test rather than an unfilterable row.
 */
export async function audit(req: FastifyRequest | null, input: AuditInput, db: AuditWriter = getDb()): Promise<number> {
  if (!isAuditAction(input.action)) throw new Error(`Not an audit action: ${JSON.stringify(input.action)}`);
  const facts = requestFacts(req);
  const [row] = await db
    .insert(auditLog)
    .values({
      ...(input.id !== undefined ? { id: input.id } : {}),
      at: clock.now(),
      actorUserId: input.actor.source === 'staff' ? input.actor.userId : null,
      actorRole: input.actor.source === 'staff' ? input.actor.role : null,
      actorSource: input.actor.source,
      masqueradeSessionId: input.masqueradeSessionId ?? null,
      action: input.action,
      targetType: clip(input.target?.type, AUDIT_LABEL_MAX),
      targetId: clip(input.target?.id, AUDIT_LABEL_MAX),
      targetLabel: clip(input.target?.label, AUDIT_LABEL_MAX),
      reason: clip(input.reason, AUDIT_REASON_MAX),
      before: redactAuditPayload(input.before),
      after: redactAuditPayload(input.after),
      outcome: input.outcome,
      ...facts,
    })
    .returning({ id: auditLog.id });
  return row!.id;
}
