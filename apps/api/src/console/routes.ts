// The Admin Console's API, PR 1 (D-157, spec §§ 5, 7.8, 7.16). Registered in `app.ts` inside the
// `!fixtureOnly` block, next to the CRM sync log.
//
//   GET  /api/console/me            the viewer's staff role and Console capabilities. Any staff
//                                   member (Instructor and Content Editor get an empty list); a
//                                   learner is refused.
//   GET  /api/console/audit         the audit log, newest first: `?actor&action&target&outcome&from&to
//                                   &cursor&limit` → `{ rows, nextCursor }` (50 a page, 200 at most).
//                                   `audit.read`. Support gets `ip` and `userAgent` as null (D3).
//   POST /api/console/audit/export  the same filters as JSON → a CSV of every matching row, 10,000 at
//                                   most (else 422 `export_too_large`). `export` (Owner, Admin). The
//                                   export is itself audited, as is a refused one.
//   GET  /api/console/roles         the capability matrix: `CONSOLE_CAPS` (the ceiling), what each role
//                                   holds now and the Owner's stored changes, with the path of the
//                                   Staff & Roles screen. `ops.read` (Owner, Admin).
//   POST /api/console/roles/preview { role, capability, allowed } → the change and its confirm token.
//   POST /api/console/roles         { confirmToken } → makes it, with one audit row. Both `roles.write`
//                                   (the Owner), D-160 R2-3b; see `roles.ts`.
//
// PR 2 (D-158) adds workspaces, users, staff notes and search (`support-routes.ts`); PR 3a (D-162)
// adds masquerade (`masquerade.ts`): Start, current, Extend, Exit and the history. During a
// masquerade every Console route but current, Extend and Exit answers 403 `masquerade_blocked` (D2,
// `requireSession`).
//
// Every response carries `Cache-Control: private, no-store`, refusals and 429s included (an onSend
// hook in this plugin's scope, so it reaches what the rate limiter answers too). Errors are JSON
// `{ error, code }`. Limits (spec § 7, D-137's limiter): reads 60 a minute, writes 20, exports 5, per
// session. No GET here writes anything except the audit row for a staff member it refuses.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, gte, like, lt, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  AUDIT_EXPORT_MAX_ROWS,
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  MASQUERADE_PATHS,
  auditCsv,
  auditRedactsNetwork,
  consoleCapsWith,
  isAuditOutcome,
  rolesMatrix,
} from '@ai/core';
import type { AuditAction, AuditActorSource, AuditFilters, AuditOutcome, AuditRow, ConsoleMe, ConsolePage, StaffRole } from '@ai/core';
import { getDb } from '../db/client';
import { auditLog, users } from '../db/schema';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { commitRoleChange, invalidateRoleGrants, previewRoleChange, roleGrants } from './roles';
import { SUPPORT_PATHS, registerSupportRoutes } from './support-routes';
import { BILLING_PATHS, registerBillingRoutes } from './billing';
import type { BillingDeps } from './billing';
import { masqueradeEnabled, registerMasqueradeRoutes } from './masquerade';
import type { MasqueradeDeps } from './masquerade';

export const CONSOLE_PATHS = {
  me: '/api/console/me',
  audit: '/api/console/audit',
  auditExport: '/api/console/audit/export',
  roles: '/api/console/roles',
  // D-160 R2-3b: the two-step matrix change. The change itself is a POST to `roles`.
  rolesPreview: '/api/console/roles/preview',
  // PR 2 (D-158): workspaces, users, staff notes, the password reset, the users export and search.
  ...SUPPORT_PATHS,
  // PR 3a (D-162): masquerade.
  masqueradeStart: MASQUERADE_PATHS.start,
  masqueradeCurrent: MASQUERADE_PATHS.current,
  masqueradeExtend: MASQUERADE_PATHS.extend,
  masqueradeExit: MASQUERADE_PATHS.exit,
  masqueradeSessions: MASQUERADE_PATHS.sessions,
  // PR 4 (D-163): Billing, read-only.
  ...BILLING_PATHS,
} as const;

/** Spec § 7: per minute, per session (the global limiter's key, `rateLimitKey`). */
export const CONSOLE_RATE = { read: 60, write: 20, export: 5, search: 30 } as const;
/** A route's per-minute limit, per session (D-137's limiter). */
export const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

/**
 * What the app hands the Console routes. PR 3a (D-162): masquerade's flag. D-160 R2-3b: the event hub's
 * `broadcast`, so a Roles change to the `PermKey` matrix wakes every client as a `/api/mutate` write
 * does. PR 4 (D-163): Billing's cached Stripe read client (null with no key), the offer's price cache and
 * the key's mode; without them, Billing answers "Stripe isn't connected".
 */
export interface ConsoleDeps extends Readonly<MasqueradeDeps> {
  readonly broadcast?: () => void;
  readonly billing?: BillingDeps;
}

// --- filters -------------------------------------------------------------------------------------

const ACTOR = /^[A-Za-z0-9_.:@-]{1,64}$/;
const TARGET_MAX = 100;

type Parsed<T> = { ok: true; value: T } | { ok: false; field: string };

export const int = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,16}$/.test(v.trim()) ? Number(v.trim()) : NaN;
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};
export const present = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

/** The audit filters from a query string or an export body. Anything malformed is refused, never guessed. */
export function parseAuditFilters(input: Record<string, unknown>): Parsed<AuditFilters> {
  const out: AuditFilters = {};
  if (present(input.actor)) {
    if (typeof input.actor !== 'string' || !ACTOR.test(input.actor)) return { ok: false, field: 'actor' };
    out.actor = input.actor;
  }
  if (present(input.action)) {
    const a = input.action;
    if (typeof a !== 'string' || !((AUDIT_ACTIONS as readonly string[]).includes(a) || AUDIT_ACTION_GROUPS.includes(a))) return { ok: false, field: 'action' };
    out.action = a;
  }
  if (present(input.target)) {
    const t = typeof input.target === 'string' ? input.target.trim() : '';
    if (t === '' || t.length > TARGET_MAX) return { ok: false, field: 'target' };
    out.target = t;
  }
  if (present(input.outcome)) {
    if (!isAuditOutcome(input.outcome)) return { ok: false, field: 'outcome' };
    out.outcome = input.outcome;
  }
  for (const key of ['from', 'to'] as const) {
    if (!present(input[key])) continue;
    const n = int(input[key]);
    if (n === null) return { ok: false, field: key };
    out[key] = n;
  }
  if (out.from !== undefined && out.to !== undefined && out.from > out.to) return { ok: false, field: 'from' };
  return { ok: true, value: out };
}

/** `%`, `_` and `\` are LIKE's own characters; a search for them means the characters. */
const likeEscape = (s: string): string => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function whereOf(f: AuditFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (f.actor === 'system') parts.push(eq(auditLog.actorSource, 'system'));
  else if (f.actor !== undefined) parts.push(eq(auditLog.actorUserId, f.actor));
  if (f.action !== undefined) {
    parts.push((AUDIT_ACTIONS as readonly string[]).includes(f.action) ? eq(auditLog.action, f.action) : like(auditLog.action, `${likeEscape(f.action)}.%`));
  }
  if (f.target !== undefined) {
    const pattern = `%${likeEscape(f.target)}%`;
    parts.push(or(sql`${auditLog.targetId} ilike ${pattern}`, sql`${auditLog.targetLabel} ilike ${pattern}`, sql`${auditLog.targetType} ilike ${pattern}`));
  }
  if (f.outcome !== undefined) parts.push(eq(auditLog.outcome, f.outcome));
  if (f.from !== undefined) parts.push(gte(auditLog.at, f.from));
  if (f.to !== undefined) parts.push(lte(auditLog.at, f.to));
  const set = parts.filter((p): p is SQL => p !== undefined);
  return set.length ? and(...set) : undefined;
}

// --- reading -------------------------------------------------------------------------------------

const ROW = {
  id: auditLog.id,
  at: auditLog.at,
  actorUserId: auditLog.actorUserId,
  actorName: users.name,
  actorRole: auditLog.actorRole,
  actorSource: auditLog.actorSource,
  masqueradeSessionId: auditLog.masqueradeSessionId,
  action: auditLog.action,
  targetType: auditLog.targetType,
  targetId: auditLog.targetId,
  targetLabel: auditLog.targetLabel,
  reason: auditLog.reason,
  before: auditLog.before,
  after: auditLog.after,
  outcome: auditLog.outcome,
  ip: auditLog.ip,
  userAgent: auditLog.userAgent,
  requestId: auditLog.requestId,
};

async function readAudit(f: AuditFilters, opts: { before?: number; limit: number }) {
  const where = and(whereOf(f), opts.before !== undefined ? lt(auditLog.id, opts.before) : undefined);
  return getDb().select(ROW).from(auditLog).leftJoin(users, eq(users.id, auditLog.actorUserId)).where(where).orderBy(desc(auditLog.id)).limit(opts.limit);
}
type Raw = Awaited<ReturnType<typeof readAudit>>[number];

function toRow(r: Raw, redactNetwork: boolean): AuditRow {
  return {
    id: String(r.id),
    at: Number(r.at),
    actor: { userId: r.actorUserId, name: r.actorName, role: r.actorRole, source: r.actorSource as AuditActorSource },
    masqueradeSessionId: r.masqueradeSessionId,
    action: r.action as AuditAction,
    target: { type: r.targetType, id: r.targetId, label: r.targetLabel },
    reason: r.reason,
    before: r.before ?? null,
    after: r.after ?? null,
    outcome: r.outcome as AuditOutcome,
    ip: redactNetwork ? null : r.ip,
    userAgent: redactNetwork ? null : r.userAgent,
    requestId: r.requestId,
  };
}


const roleOfViewer = (req: FastifyRequest): string | null => {
  const v = viewerOrThrow(req);
  return v.user.kind === 'staff' ? (v.user.staffRole ?? null) : null;
};

// --- the routes ----------------------------------------------------------------------------------

/** A price cache with nothing in it, for a Console registered without Billing's deps. */
const NO_PRICES = { get: async () => null, reset: () => {} };

export async function registerConsoleRoutes(app: FastifyInstance, deps: ConsoleDeps): Promise<void> {
  // A new app reads the stored matrix changes afresh (each test builds one against a fresh database).
  invalidateRoleGrants();
  await app.register(async (scope) => {
    // Every Console answer is the viewer's alone, refusals and 429s included (`requireSession` sets the
    // same header, but only once it has run, which a rate-limited request never reaches).
    scope.addHook('onSend', async (_req, reply, payload) => {
      reply.header('cache-control', 'private, no-store');
      return payload;
    });

    scope.get(CONSOLE_PATHS.me, { preHandler: requireSession, config: limit(CONSOLE_RATE.read) }, async (req, reply): Promise<FastifyReply> => {
      const viewer = viewerOrThrow(req);
      const staff = staffActor(viewer);
      if (!staff) return consoleError(reply, 'console_forbidden');
      // D-162 3b: and whether a masquerade may start (D8's flag), for the entry points.
      const me: ConsoleMe = { role: staff.role as StaffRole, caps: consoleCapsWith(staff.role === 'Owner' ? [] : await roleGrants(), staff.role), masqueradeEnabled: await (deps.masqueradeEnabled ?? masqueradeEnabled)() };
      return reply.send(me);
    });

    scope.get(
      CONSOLE_PATHS.audit,
      { preHandler: [requireSession, requireConsole('audit.read')], config: limit(CONSOLE_RATE.read) },
      async (req, reply): Promise<FastifyReply> => {
        const q = (req.query ?? {}) as Record<string, unknown>;
        const parsed = parseAuditFilters(q);
        if (!parsed.ok) return consoleError(reply, 'invalid_query', `That ${parsed.field} filter isn’t valid.`);
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
        const raw = await readAudit(parsed.value, { before, limit: size + 1 });
        const redact = auditRedactsNetwork(roleOfViewer(req));
        const rows = raw.slice(0, size).map((r) => toRow(r, redact));
        const page: ConsolePage<AuditRow> = { rows, nextCursor: raw.length > size ? rows[rows.length - 1]!.id : null };
        return reply.send(page);
      },
    );

    scope.post(
      CONSOLE_PATHS.auditExport,
      { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('export')], config: limit(CONSOLE_RATE.export) },
      async (req, reply): Promise<FastifyReply> => {
        const viewer = viewerOrThrow(req);
        const actor = staffActor(viewer)!;
        const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
        const parsed = parseAuditFilters(body);
        if (!parsed.ok) return consoleError(reply, 'invalid_query', `That ${parsed.field} filter isn’t valid.`);
        const filters = parsed.value;
        const where = whereOf(filters);
        const [counted] = await getDb().select({ n: sql<number>`count(*)::int` }).from(auditLog).where(where);
        const total = Number(counted?.n ?? 0);
        const target = { type: 'audit_log', label: 'Audit log' };
        if (total > AUDIT_EXPORT_MAX_ROWS) {
          await audit(req, { action: 'audit.export', outcome: 'failed', actor, target, reason: 'export_too_large', after: { rows: total, filters } });
          return consoleError(reply, 'export_too_large');
        }
        const rows = (await readAudit(filters, { limit: AUDIT_EXPORT_MAX_ROWS })).map((r) => toRow(r, false));
        const csv = auditCsv(rows);
        // After the read, so the export never lists itself; its own row is the next one written.
        await audit(req, { action: 'audit.export', outcome: 'ok', actor, target, after: { rows: rows.length, format: 'csv', filters } });
        const day = new Date(clock.now()).toISOString().slice(0, 10);
        return reply
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', `attachment; filename="audit-log-${day}.csv"`)
          .send(csv);
      },
    );

    scope.get(
      CONSOLE_PATHS.roles,
      { preHandler: [requireSession, requireConsole('ops.read')], config: limit(CONSOLE_RATE.read) },
      async (_req, reply): Promise<FastifyReply> => reply.send(rolesMatrix(await roleGrants())),
    );

    // D-160 R2-3b: the Owner's two-step change to the matrix (`roles.ts`).
    const write = { preHandler: [requireSession, requireJsonSameOrigin, requireConsole('roles.write')], config: limit(CONSOLE_RATE.write) };
    scope.post(CONSOLE_PATHS.rolesPreview, write, previewRoleChange);
    scope.post(CONSOLE_PATHS.roles, write, async (req, reply): Promise<FastifyReply> => {
      const refused = await commitRoleChange(req, reply, deps.broadcast);
      return refused ?? reply.send(rolesMatrix(await roleGrants()));
    });

    registerSupportRoutes(scope);
    registerMasqueradeRoutes(scope, deps);
    registerBillingRoutes(scope, deps.billing ?? { stripe: null, prices: NO_PRICES, mode: 'unset' }, { config: limit(CONSOLE_RATE.read) });
  });
}
