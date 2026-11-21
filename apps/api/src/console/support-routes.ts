// The Admin Console's API, PR 2 (D-158, spec §§ 7.3-7.5): workspaces, users, staff notes, a staff
// password reset, the users export and search. Registered by `registerConsoleRoutes` inside its own
// scope, so its `private, no-store` hook covers every answer here too, refusals and 429s included.
//
//   GET  /api/console/workspaces                    `?q&plan&status&cursor&limit` → { rows, nextCursor }. workspaces.read
//   GET  /api/console/workspaces/:teamId            one workspace: team, account, plans, members,
//                                                   entitlements, billing (local tables), activity. workspaces.read
//   GET  /api/console/users                         `?q&role&kind&cursor&limit` → { rows, nextCursor }. users.read
//   GET  /api/console/users/:userId                 one user: identity as existence only. users.read
//   POST /api/console/users/:userId/password-reset  the existing "Forgot password?" email, `issuePasswordLink`.
//                                                   user.password_reset; a STAFF user's is the Owner's alone.
//   POST /api/console/users/export                  the list's filters → CSV, 10,000 rows at most. export
//   GET  /api/console/notes                         `?targetType=workspace|user&targetId` → { rows }. The target's read capability.
//   POST /api/console/notes                         { targetType, targetId, body } → the note. notes.write
//   POST /api/console/notes/:id/delete              { reason } → soft delete. notes.delete (the Owner)
//   GET  /api/console/search                        `?q=` (2-100 characters) → four groups, 5 each. console.view
//
// Every write is one audit row (spec § 7): `note.create`, `note.delete`, `user.password_reset` (a
// refused staff reset too, as `denied`) and `user.export` (a refused export too, as `failed`).
// Limits per session (D-137's limiter): reads 60 a minute, writes 20, exports 5, search 30. No GET
// here writes anything but the audit row for a staff member a capability refuses.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AUDIT_EXPORT_MAX_ROWS,
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  LEARNER_ROLES,
  USER_IDS_MAX,
  STAFF_ROLES,
  cleanNoteBody,
  cleanReason,
  cleanSearch,
  isPlanKind,
  isPlanStatus,
  isStaffNoteTarget,
  isUserKind,
  usersCsv,
} from '@ai/core';
import type { ConsoleCap, ConsolePage, ConsoleUserRow, StaffNoteTarget, UserFilters, WorkspaceFilters, WorkspaceRow } from '@ai/core';
import { eq } from 'drizzle-orm';
import { passwordHashOf, requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { issuePasswordLink } from '../routes/password';
import { readTeamIntake, requeueTeamIntake, sendPdf, teamIntakePdf } from '../routes/intake';
import { readTeamStack } from '../routes/stack';
import { audit } from './audit';
import { consoleAllows, consoleError, requireConsole, staffActor } from './guard';
import { createNote, deleteNote, listNotes, noteTargetLabel } from './notes';
import { countUsers, decodeCursor, encodeCursor, exportUsers, listUsers, listWorkspaces, userDetail, workspaceDetail } from './records';
import type { NameCursor } from './records';
import { CONSOLE_RATE, int, limit, present } from './routes';
import { searchConsole } from './search';

export const SUPPORT_PATHS = {
  workspaces: '/api/console/workspaces',
  workspace: '/api/console/workspaces/:teamId',
  workspaceIntake: '/api/console/workspaces/:teamId/intake',
  /** D-229 (B-18): the team's intake as a PDF, audited as `intake.pdf`. No console screen yet (C-14). */
  workspaceIntakePdf: '/api/console/workspaces/:teamId/intake/pdf',
  /** D-229: re-queue the team's submitted intake for GHL. No console screen yet (C-14). */
  workspaceIntakeSync: '/api/console/workspaces/:teamId/intake/sync',
  workspaceStack: '/api/console/workspaces/:teamId/stack',
  users: '/api/console/users',
  user: '/api/console/users/:userId',
  passwordReset: '/api/console/users/:userId/password-reset',
  usersExport: '/api/console/users/export',
  notes: '/api/console/notes',
  noteDelete: '/api/console/notes/:id/delete',
  search: '/api/console/search',
} as const;

const Q_MAX = 100;
const ID = /^[A-Za-z0-9_.:@-]{1,128}$/;

type Parsed<T> = { ok: true; value: T } | { ok: false; field: string };

const words = (v: unknown): string | null | undefined => {
  if (!present(v)) return undefined;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' || t.length > Q_MAX ? null : t;
};

export function parseWorkspaceFilters(input: Record<string, unknown>): Parsed<WorkspaceFilters> {
  const out: WorkspaceFilters = {};
  const q = words(input.q);
  if (q === null) return { ok: false, field: 'q' };
  if (q !== undefined) out.q = q;
  if (present(input.plan)) {
    if (!isPlanKind(input.plan)) return { ok: false, field: 'plan' };
    out.plan = input.plan;
  }
  if (present(input.status)) {
    if (!isPlanStatus(input.status)) return { ok: false, field: 'status' };
    out.status = input.status;
  }
  return { ok: true, value: out };
}

const ROLES: readonly string[] = [...LEARNER_ROLES, ...STAFF_ROLES];

export function parseUserFilters(input: Record<string, unknown>): Parsed<UserFilters> {
  const out: UserFilters = {};
  const q = words(input.q);
  if (q === null) return { ok: false, field: 'q' };
  if (q !== undefined) out.q = q;
  if (present(input.role)) {
    if (typeof input.role !== 'string' || !ROLES.includes(input.role)) return { ok: false, field: 'role' };
    out.role = input.role;
  }
  if (present(input.kind)) {
    if (!isUserKind(input.kind)) return { ok: false, field: 'kind' };
    out.kind = input.kind;
  }
  // The list's selection, for "Export selected" (D-160 R2-1c): 1 to 500 user ids, each a bound value.
  if (present(input.ids)) {
    const ids = input.ids;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > USER_IDS_MAX || !ids.every((v) => typeof v === 'string' && ID.test(v))) return { ok: false, field: 'ids' };
    out.ids = [...new Set(ids as string[])];
  }
  return { ok: true, value: out };
}

/** `limit` and `cursor` from a list's query string, or the field that is wrong. */
function pageOf(q: Record<string, unknown>): Parsed<{ size: number; after: NameCursor | null }> {
  let size = CONSOLE_PAGE_DEFAULT;
  if (present(q.limit)) {
    const n = int(q.limit);
    if (n === null || n < 1) return { ok: false, field: 'limit' };
    size = Math.min(n, CONSOLE_PAGE_MAX);
  }
  let after: NameCursor | null = null;
  if (present(q.cursor)) {
    after = decodeCursor(q.cursor);
    if (!after) return { ok: false, field: 'cursor' };
  }
  return { ok: true, value: { size, after } };
}

const queryOf = (req: FastifyRequest): Record<string, unknown> => (req.query ?? {}) as Record<string, unknown>;
const bodyOf = (req: FastifyRequest): Record<string, unknown> => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {});
const paramOf = (req: FastifyRequest, key: string): string => String((req.params as Record<string, unknown>)[key] ?? '');

/**
 * A capability decided by the request itself (a note's target), with `requireConsole`'s rule and its
 * audit row for a refused staff member. True when the handler may go on.
 */
const allow = (req: FastifyRequest, reply: FastifyReply, cap: ConsoleCap): Promise<boolean> => consoleAllows(req, reply, viewerOrThrow(req), cap);

const readCapOf = (type: StaffNoteTarget): ConsoleCap => (type === 'workspace' ? 'workspaces.read' : 'users.read');

export function registerSupportRoutes(scope: FastifyInstance): void {
  const read = { config: limit(CONSOLE_RATE.read) };
  const write = { config: limit(CONSOLE_RATE.write) };

  // --- workspaces ------------------------------------------------------------------------------

  scope.get(SUPPORT_PATHS.workspaces, { ...read, preHandler: [requireSession, requireConsole('workspaces.read')] }, async (req, reply): Promise<FastifyReply> => {
    const q = queryOf(req);
    const filters = parseWorkspaceFilters(q);
    if (!filters.ok) return consoleError(reply, 'invalid_query', `That ${filters.field} filter isn’t valid.`);
    const page = pageOf(q);
    if (!page.ok) return consoleError(reply, 'invalid_query', `That ${page.field} isn’t valid.`);
    const { rows, next } = await listWorkspaces(getDb(), filters.value, { after: page.value.after, limit: page.value.size });
    const out: ConsolePage<WorkspaceRow> = { rows, nextCursor: next ? encodeCursor(next) : null };
    return reply.send(out);
  });

  scope.get(SUPPORT_PATHS.workspace, { ...read, preHandler: [requireSession, requireConsole('workspaces.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'teamId');
    const detail = ID.test(id) ? await workspaceDetail(getDb(), id, clock.now()) : null;
    if (!detail) return consoleError(reply, 'not_found');
    return reply.send(detail);
  });

  scope.get(SUPPORT_PATHS.workspaceIntake, { ...read, preHandler: [requireSession, requireConsole('workspaces.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'teamId');
    const actor = staffActor(viewerOrThrow(req));
    if (!ID.test(id) || !actor) return consoleError(reply, 'not_found');
    const row = await readTeamIntake(req, id, actor);
    if (!row) return consoleError(reply, 'not_found');
    return reply.send(row);
  });

  scope.get(SUPPORT_PATHS.workspaceIntakePdf, { ...read, preHandler: [requireSession, requireConsole('workspaces.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'teamId');
    const actor = staffActor(viewerOrThrow(req));
    if (!ID.test(id) || !actor) return consoleError(reply, 'not_found');
    const [team] = await getDb().select({ id: teams.id }).from(teams).where(eq(teams.id, id));
    if (!team) return consoleError(reply, 'not_found');
    const file = await teamIntakePdf(id);
    if (!file) return consoleError(reply, 'not_found');
    await audit(req, { action: 'intake.pdf', outcome: 'ok', actor, target: { type: 'team', id, label: 'Intake PDF' } });
    return sendPdf(reply, file);
  });

  scope.post(
    SUPPORT_PATHS.workspaceIntakeSync,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('workspaces.read'), requireConsole('webhooks.retry')] },
    async (req, reply): Promise<FastifyReply> => {
      const id = paramOf(req, 'teamId');
      const actor = staffActor(viewerOrThrow(req));
      if (!ID.test(id) || !actor) return consoleError(reply, 'not_found');
      const state = await requeueTeamIntake(req, id, actor, clock.now());
      if (!state) return consoleError(reply, 'not_found');
      return reply.send({ ghl: state });
    },
  );

  scope.get(SUPPORT_PATHS.workspaceStack, { ...read, preHandler: [requireSession, requireConsole('workspaces.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'teamId');
    const actor = staffActor(viewerOrThrow(req));
    if (!ID.test(id) || !actor) return consoleError(reply, 'not_found');
    const row = await readTeamStack(req, id, actor);
    if (!row) return consoleError(reply, 'not_found');
    return reply.send(row);
  });

  // --- users -----------------------------------------------------------------------------------

  scope.get(SUPPORT_PATHS.users, { ...read, preHandler: [requireSession, requireConsole('users.read')] }, async (req, reply): Promise<FastifyReply> => {
    const q = queryOf(req);
    const filters = parseUserFilters(q);
    if (!filters.ok) return consoleError(reply, 'invalid_query', `That ${filters.field} filter isn’t valid.`);
    const page = pageOf(q);
    if (!page.ok) return consoleError(reply, 'invalid_query', `That ${page.field} isn’t valid.`);
    const { rows, next } = await listUsers(getDb(), filters.value, { after: page.value.after, limit: page.value.size });
    const out: ConsolePage<ConsoleUserRow> = { rows, nextCursor: next ? encodeCursor(next) : null };
    return reply.send(out);
  });

  scope.get(SUPPORT_PATHS.user, { ...read, preHandler: [requireSession, requireConsole('users.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'userId');
    const detail = ID.test(id) ? await userDetail(getDb(), id, clock.now()) : null;
    if (!detail) return consoleError(reply, 'not_found');
    return reply.send(detail);
  });

  scope.post(
    SUPPORT_PATHS.passwordReset,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('user.password_reset')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = paramOf(req, 'userId');
      const db = getDb();
      const [target] = ID.test(id) ? await db.select({ id: users.id, name: users.name, email: users.email, kind: users.kind }).from(users).where(eq(users.id, id)).limit(1) : [];
      if (!target) return consoleError(reply, 'not_found');
      const auditTarget = { type: 'user', id: target.id, label: target.name };
      // Spec § 7.4: a staff member's password is the Owner's to reset, and nobody else's.
      if (target.kind === 'staff' && actor.role !== 'Owner') {
        await audit(req, { action: 'user.password_reset', outcome: 'denied', actor, target: auditTarget, after: { staff: true } });
        return consoleError(reply, 'console_forbidden', 'Only the Owner can reset a staff member’s password.');
      }
      // The existing "Forgot password?" path, unchanged: a reset link for an account with a password,
      // a set-password link for one without. It mints the token and queues the one email.
      const link = (await passwordHashOf(db, target.id)) !== null ? 'reset' : 'set';
      try {
        await issuePasswordLink(target.email);
      } catch (e) {
        await audit(req, { action: 'user.password_reset', outcome: 'failed', actor, target: auditTarget, after: { link } });
        throw e;
      }
      await audit(req, { action: 'user.password_reset', outcome: 'ok', actor, target: auditTarget, after: { link, staff: target.kind === 'staff' } });
      return reply.send({ ok: true, link });
    },
  );

  scope.post(
    SUPPORT_PATHS.usersExport,
    { config: limit(CONSOLE_RATE.export), preHandler: [requireSession, requireJsonSameOrigin, requireConsole('export')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const parsed = parseUserFilters(bodyOf(req));
      if (!parsed.ok) return consoleError(reply, 'invalid_query', `That ${parsed.field} filter isn’t valid.`);
      const filters = parsed.value;
      const db = getDb();
      const total = await countUsers(db, filters);
      const target = { type: 'users', label: 'Users' };
      if (total > AUDIT_EXPORT_MAX_ROWS) {
        await audit(req, { action: 'user.export', outcome: 'failed', actor, target, reason: 'export_too_large', after: { rows: total, filters } });
        return consoleError(reply, 'export_too_large');
      }
      const rows = await exportUsers(db, filters, AUDIT_EXPORT_MAX_ROWS);
      await audit(req, { action: 'user.export', outcome: 'ok', actor, target, after: { rows: rows.length, format: 'csv', filters } });
      const day = new Date(clock.now()).toISOString().slice(0, 10);
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="users-${day}.csv"`)
        .send(usersCsv(rows));
    },
  );

  // --- staff notes -----------------------------------------------------------------------------

  scope.get(SUPPORT_PATHS.notes, { ...read, preHandler: [requireSession, requireConsole('console.view')] }, async (req, reply): Promise<FastifyReply> => {
    const q = queryOf(req);
    if (!isStaffNoteTarget(q.targetType)) return consoleError(reply, 'invalid_query', 'That targetType isn’t valid.');
    if (typeof q.targetId !== 'string' || !ID.test(q.targetId)) return consoleError(reply, 'invalid_query', 'That targetId isn’t valid.');
    if (!(await allow(req, reply, readCapOf(q.targetType)))) return reply;
    return reply.send({ rows: await listNotes(getDb(), q.targetType, q.targetId) });
  });

  scope.post(
    SUPPORT_PATHS.notes,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('notes.write')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const b = bodyOf(req);
      if (!isStaffNoteTarget(b.targetType)) return consoleError(reply, 'invalid_body', 'That targetType isn’t valid.');
      if (typeof b.targetId !== 'string' || !ID.test(b.targetId)) return consoleError(reply, 'invalid_body', 'That targetId isn’t valid.');
      const body = cleanNoteBody(b.body);
      if (body === null) return consoleError(reply, 'invalid_body', 'A note is 1 to 2,000 characters.');
      if (!(await allow(req, reply, readCapOf(b.targetType)))) return reply;
      const db = getDb();
      const label = await noteTargetLabel(db, b.targetType, b.targetId);
      if (label === null) return consoleError(reply, 'not_found');
      const note = await createNote(db, req, { type: b.targetType, id: b.targetId, label, body, actor, now: clock.now() });
      return reply.code(201).send(note);
    },
  );

  scope.post(
    SUPPORT_PATHS.noteDelete,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('notes.delete')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = int(paramOf(req, 'id'));
      const reason = cleanReason(bodyOf(req).reason);
      if (reason === null) return consoleError(reply, 'reason_required');
      const done = id !== null && id > 0 ? await deleteNote(getDb(), req, { noteId: id, reason, actor, now: clock.now() }) : null;
      if (!done) return consoleError(reply, 'not_found');
      return reply.send({ ok: true, id: done.id });
    },
  );

  // --- search ----------------------------------------------------------------------------------

  scope.get(
    SUPPORT_PATHS.search,
    { config: limit(CONSOLE_RATE.search), preHandler: [requireSession, requireConsole('console.view')] },
    async (req, reply): Promise<FastifyReply> => {
      const q = cleanSearch(queryOf(req).q);
      if (q === null) return consoleError(reply, 'invalid_query', 'Search for 2 to 100 characters.');
      const viewer = viewerOrThrow(req);
      return reply.send({ q, groups: await searchConsole(getDb(), q, viewer.user.staffRole ?? null) });
    },
  );
}
