// The Admin Console's incidents, PR 8 (D-167, spec § 7.14). Registered by `registerConsoleRoutes`
// inside its scope, so its `private, no-store` hook covers every answer here, refusals and 429s too.
//
//   GET  /api/console/incidents               `?status=open|acknowledged|resolved&cursor&limit` →
//                                             { rows, nextCursor }, newest first. incidents.read
//   GET  /api/console/incidents/summary       { open }: the sidebar's "1 incident". incidents.read
//   GET  /api/console/incidents/:id           the incident and its timeline, oldest first. incidents.read
//   POST /api/console/incidents               { title, severity } → 201 the incident. incidents.create
//   POST /api/console/incidents/:id/ack       an open one → acknowledged. incidents.ack (Owner, Admin, Support)
//   POST /api/console/incidents/:id/resolve   { note } (required) → resolved. incidents.resolve (Owner, Admin)
//   POST /api/console/incidents/:id/notes     { body } → 201 the incident. notes.write
//
// Every write is ONE audit row and ONE `incident_events` row, in one transaction with the incident's
// own change (`incident.create`, `incident.ack`, `incident.resolve`, `incident.note`). The audit row
// records a note's length, never its words, as staff notes do (D-158). Nothing here sends anything
// (D5: no notifications). Limits per session: reads 60 a minute, writes 20.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  cleanIncidentNote,
  cleanIncidentTitle,
  incidentIdOf,
  incidentNumberOf,
  incidentOwner,
  isIncidentSeverity,
  isIncidentStatus,
} from '@ai/core';
import type { AuditAction, ConsolePage, IncidentDetail, IncidentEventKind, IncidentFilters, IncidentPerson, IncidentRow, IncidentSeverity, IncidentStatus, IncidentSummary } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { incidentEvents, incidents, users } from '../db/schema';
import { clock } from '../lib/clock';
import { audit } from './audit';
import type { AuditActor } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { CONSOLE_RATE, int, limit, present } from './routes';

export const INCIDENT_PATHS = {
  incidents: '/api/console/incidents',
  incidentSummary: '/api/console/incidents/summary',
  incident: '/api/console/incidents/:id',
  incidentAck: '/api/console/incidents/:id/ack',
  incidentResolve: '/api/console/incidents/:id/resolve',
  incidentNotes: '/api/console/incidents/:id/notes',
} as const;

/**
 * Numbering is `max + 1` under this transaction-scoped advisory lock, so a staff create and the rules
 * on two replicas never take the same number. Not the scheduler's 4242 nor `/api/mutate`'s 42.
 */
export const INCIDENT_NUMBER_LOCK = 4167;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

// --- reading -------------------------------------------------------------------------------------

const NUMBER = sql<number>`(substring(${incidents.id} from 5))::int`;

async function people(db: Pick<Database, 'select'>, ids: (string | null)[]): Promise<Map<string, IncidentPerson>> {
  const want = [...new Set(ids.filter((x): x is string => x !== null))];
  const rows = want.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, want)) : [];
  const out = new Map<string, IncidentPerson>(want.map((id) => [id, { id, name: null }]));
  for (const r of rows) out.set(r.id, { id: r.id, name: r.name });
  return out;
}

type Raw = typeof incidents.$inferSelect;
const person = (m: Map<string, IncidentPerson>, id: string | null): IncidentPerson | null => (id === null ? null : (m.get(id) ?? { id, name: null }));

function rowOf(r: Raw, m: Map<string, IncidentPerson>): IncidentRow & Omit<IncidentDetail, 'events' | keyof IncidentRow> {
  const by = { openedBy: person(m, r.openedBy), acknowledgedBy: person(m, r.acknowledgedBy), resolvedBy: person(m, r.resolvedBy) };
  return {
    id: r.id,
    title: r.title,
    severity: r.severity as IncidentSeverity,
    status: r.status as IncidentStatus,
    owner: incidentOwner(by),
    openedAt: r.openedAt,
    fingerprint: r.fingerprint,
    ...by,
    acknowledgedAt: r.acknowledgedAt,
    resolvedAt: r.resolvedAt,
  };
}

export async function listIncidents(db: Database, f: IncidentFilters, opts: { before?: number; limit: number }): Promise<ConsolePage<IncidentRow>> {
  const parts: (SQL | undefined)[] = [f.status ? eq(incidents.status, f.status) : undefined, opts.before !== undefined ? lt(NUMBER, opts.before) : undefined];
  const raw = await db.select().from(incidents).where(and(...parts)).orderBy(desc(NUMBER)).limit(opts.limit + 1);
  const m = await people(db, raw.flatMap((r) => [r.openedBy, r.acknowledgedBy, r.resolvedBy]));
  const rows = raw.slice(0, opts.limit).map((r) => {
    const { id, title, severity, status, owner, openedAt } = rowOf(r, m);
    return { id, title, severity, status, owner, openedAt };
  });
  return { rows, nextCursor: raw.length > opts.limit ? String(incidentNumberOf(rows[rows.length - 1]!.id)) : null };
}

export async function incidentDetail(db: Pick<Database, 'select'>, id: string): Promise<IncidentDetail | null> {
  const [r] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!r) return null;
  const events = await db.select().from(incidentEvents).where(eq(incidentEvents.incidentId, id)).orderBy(asc(incidentEvents.at), asc(incidentEvents.id));
  const m = await people(db, [r.openedBy, r.acknowledgedBy, r.resolvedBy, ...events.map((e) => e.actorUserId)]);
  return {
    ...rowOf(r, m),
    events: events.map((e) => ({ id: String(e.id), at: e.at, kind: e.kind as IncidentEventKind, actor: person(m, e.actorUserId), body: e.body, link: e.link })),
  };
}

export async function incidentSummary(db: Database): Promise<IncidentSummary> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(incidents).where(eq(incidents.status, 'open'));
  return { open: Number(row?.n ?? 0) };
}

// --- writing -------------------------------------------------------------------------------------

/** One timeline row and its audit row, in the caller's transaction. */
async function record(
  tx: Tx,
  req: FastifyRequest | null,
  e: { incidentId: string; title: string; kind: IncidentEventKind; action: AuditAction; actor: AuditActor; body?: string | null; link?: string | null; before?: unknown; after?: unknown; now: number },
): Promise<void> {
  await tx.insert(incidentEvents).values({
    incidentId: e.incidentId,
    at: e.now,
    kind: e.kind,
    actorUserId: e.actor.source === 'staff' ? e.actor.userId : null,
    body: e.body ?? null,
    link: e.link ?? null,
  });
  await audit(req, { action: e.action, outcome: 'ok', actor: e.actor, target: { type: 'incident', id: e.incidentId, label: e.title }, before: e.before, after: e.after }, tx);
}

/** The id the next incident takes. Hold `INCIDENT_NUMBER_LOCK` first. */
async function nextId(tx: Tx): Promise<string> {
  const [row] = await tx.select({ n: sql<number>`coalesce(max(${NUMBER}), 0)::int` }).from(incidents);
  return incidentIdOf(Number(row?.n ?? 0) + 1);
}

export const lockNumbering = (tx: Tx) => tx.execute(sql.raw(`select pg_advisory_xact_lock(${INCIDENT_NUMBER_LOCK})`));

/**
 * Open an incident: the row, its `opened` event and its `incident.create` audit row, in `tx`, which
 * must hold the numbering lock. The system's (a rule's) carries a fingerprint, its sentence and link.
 */
export async function openIncident(
  tx: Tx,
  req: FastifyRequest | null,
  o: { title: string; severity: IncidentSeverity; fingerprint: string | null; actor: AuditActor; body?: string | null; link?: string | null; now: number },
): Promise<string> {
  const id = await nextId(tx);
  const staff = o.actor.source === 'staff' ? o.actor.userId : null;
  await tx.insert(incidents).values({ id, title: o.title, severity: o.severity, status: 'open', fingerprint: o.fingerprint, openedAt: o.now, openedBy: staff });
  await record(tx, req, {
    incidentId: id,
    title: o.title,
    kind: 'opened',
    action: 'incident.create',
    actor: o.actor,
    body: o.body,
    link: o.link,
    after: { severity: o.severity, fingerprint: o.fingerprint },
    now: o.now,
  });
  return id;
}

/** A rule repeating on an unresolved incident: one `signal` event and its `incident.signal` audit row. */
export async function signalIncident(tx: Tx, o: { incidentId: string; title: string; body: string; link: string; fingerprint: string; now: number }): Promise<void> {
  await record(tx, null, { ...o, kind: 'signal', action: 'incident.signal', actor: { source: 'system' }, after: { fingerprint: o.fingerprint } });
}

type Change = { ok: true } | { ok: false; code: 'not_found' | 'incident_state' };

/** Acknowledge, resolve or note one incident, with its row locked for the change. */
async function change(
  db: Database,
  req: FastifyRequest,
  id: string,
  actor: Extract<AuditActor, { source: 'staff' }>,
  what: { kind: 'acknowledged' | 'resolved' | 'note'; body?: string },
): Promise<Change> {
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(incidents).where(eq(incidents.id, id)).for('update').limit(1);
    if (!r) return { ok: false, code: 'not_found' } as const;
    const now = clock.now();
    const base = { incidentId: id, title: r.title, actor, now };
    if (what.kind === 'note') {
      await record(tx, req, { ...base, kind: 'note', action: 'incident.note', body: what.body, after: { length: what.body!.length } });
      return { ok: true } as const;
    }
    if (what.kind === 'acknowledged') {
      if (r.status !== 'open') return { ok: false, code: 'incident_state' } as const;
      await tx.update(incidents).set({ status: 'acknowledged', acknowledgedAt: now, acknowledgedBy: actor.userId }).where(eq(incidents.id, id));
      await record(tx, req, { ...base, kind: 'acknowledged', action: 'incident.ack', before: { status: r.status }, after: { status: 'acknowledged' } });
      return { ok: true } as const;
    }
    if (r.status === 'resolved') return { ok: false, code: 'incident_state' } as const;
    await tx.update(incidents).set({ status: 'resolved', resolvedAt: now, resolvedBy: actor.userId }).where(eq(incidents.id, id));
    await record(tx, req, { ...base, kind: 'resolved', action: 'incident.resolve', body: what.body, before: { status: r.status }, after: { status: 'resolved', length: what.body!.length } });
    return { ok: true } as const;
  });
}

// --- the routes ----------------------------------------------------------------------------------

const queryOf = (req: FastifyRequest): Record<string, unknown> => (req.query ?? {}) as Record<string, unknown>;
const bodyOf = (req: FastifyRequest): Record<string, unknown> => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {});
const idOf = (req: FastifyRequest): string | null => {
  const id = String((req.params as Record<string, unknown>).id ?? '');
  return incidentNumberOf(id) === null ? null : id;
};

export function registerIncidentRoutes(scope: FastifyInstance): void {
  const read = { config: limit(CONSOLE_RATE.read) };
  const write = { config: limit(CONSOLE_RATE.write) };
  const reader = [requireSession, requireConsole('incidents.read')];

  scope.get(INCIDENT_PATHS.incidents, { ...read, preHandler: reader }, async (req, reply): Promise<FastifyReply> => {
    const q = queryOf(req);
    const f: IncidentFilters = {};
    if (present(q.status)) {
      if (!isIncidentStatus(q.status)) return consoleError(reply, 'invalid_query', 'That status filter isn’t valid.');
      f.status = q.status;
    }
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
    return reply.send(await listIncidents(getDb(), f, { before, limit: size }));
  });

  scope.get(INCIDENT_PATHS.incidentSummary, { ...read, preHandler: reader }, async (_req, reply): Promise<FastifyReply> => reply.send(await incidentSummary(getDb())));

  scope.get(INCIDENT_PATHS.incident, { ...read, preHandler: reader }, async (req, reply): Promise<FastifyReply> => {
    const id = idOf(req);
    const detail = id ? await incidentDetail(getDb(), id) : null;
    return detail ? reply.send(detail) : consoleError(reply, 'not_found');
  });

  scope.post(
    INCIDENT_PATHS.incidents,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('incidents.create')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const b = bodyOf(req);
      const title = cleanIncidentTitle(b.title);
      if (title === null) return consoleError(reply, 'invalid_body', 'A title is 3 to 200 characters.');
      if (!isIncidentSeverity(b.severity)) return consoleError(reply, 'invalid_body', 'Severity is sev1, sev2 or sev3.');
      const severity = b.severity;
      const db = getDb();
      const id = await db.transaction(async (tx) => {
        await lockNumbering(tx);
        return openIncident(tx, req, { title, severity, fingerprint: null, actor, now: clock.now() });
      });
      return reply.code(201).send(await incidentDetail(db, id));
    },
  );

  const act = (kind: 'acknowledged' | 'resolved' | 'note') =>
    async (req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = idOf(req);
      if (!id) return consoleError(reply, 'not_found');
      let body: string | undefined;
      if (kind !== 'acknowledged') {
        const b = bodyOf(req);
        const text = cleanIncidentNote(kind === 'note' ? b.body : b.note);
        if (text === null) return consoleError(reply, 'invalid_body', kind === 'note' ? 'A note is 1 to 2,000 characters.' : 'Resolving needs a note of 1 to 2,000 characters.');
        body = text;
      }
      const db = getDb();
      const done = await change(db, req, id, actor, { kind, body });
      if (!done.ok) return consoleError(reply, done.code);
      return reply.code(kind === 'note' ? 201 : 200).send(await incidentDetail(db, id));
    };
  const writer = (cap: 'incidents.ack' | 'incidents.resolve' | 'notes.write') => ({ ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole(cap)] });
  scope.post(INCIDENT_PATHS.incidentAck, writer('incidents.ack'), act('acknowledged'));
  scope.post(INCIDENT_PATHS.incidentResolve, writer('incidents.resolve'), act('resolved'));
  scope.post(INCIDENT_PATHS.incidentNotes, writer('notes.write'), act('note'));
}
