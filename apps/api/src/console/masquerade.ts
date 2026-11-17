// The Admin Console's masquerade endpoints and its sweep, PR 3a (D-162, spec § 6). Registered by
// `registerConsoleRoutes` inside its scope, so its `private, no-store` hook covers every answer.
// What a masquerade does to a session (the write block, `requireSession`, Sign Out) is
// `auth/masquerade.ts`; the rules and shapes are `@ai/core/console-masquerade`.
//
//   POST /api/console/masquerade           { targetUserId, reason, startedFrom? } → 201 { session, serverNow, redirect }.
//                                          masquerade.start (Owner, Admin). A learner only (403
//                                          masquerade_target_staff), one live session per staff member
//                                          (409 masquerade_active). In ONE transaction: the learner's
//                                          impersonation session, the row and the audit row. `ai_sid`
//                                          becomes the impersonation session; `ai_msq` names the row.
//   GET  /api/console/masquerade/current   { session: MasqueradeView | null, serverNow }: this request's
//                                          session. Any signed-in viewer (the masquerading one is the learner).
//   POST /api/console/masquerade/extend    { reason } → { session, serverNow }. The STAFF member's
//                                          masquerade.extend, re-checked; +15 minutes, never past 60
//                                          (409 masquerade_max_reached). Audited with before and after.
//   POST /api/console/masquerade/exit      → { ok, redirect }: the row ended, the impersonation session
//                                          deleted, the staff session put back on `ai_sid` (or cleared
//                                          when it is gone), `ai_msq` cleared, audited.
//   GET  /api/console/masquerade/sessions  `?cursor&limit` → { rows, nextCursor }, newest first. masquerade.start
//
// Outside a session, Extend and Exit answer 409 `masquerade_ended` (Extend after the viewer's own
// capability, so a role without it is refused as anywhere else). Limits per session: reads 60 a
// minute, writes 20 (spec § 7).

import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  CONSOLE_PAGE_DEFAULT,
  CONSOLE_PAGE_MAX,
  MASQUERADE_DEFAULT_RETURN,
  MASQUERADE_ENABLED_DEFAULT,
  MASQUERADE_EXTEND_MS,
  MASQUERADE_PATHS,
  cleanMasqueradeReason,
  cleanStartedFrom,
  consoleCan,
  extendedExpiry,
  masqueradeCanExtend,
  masqueradeTimes,
} from '@ai/core';
import type { ConsolePage, MasqueradeCurrent, MasqueradeEndReason, MasqueradeHistoryRow, MasqueradeView } from '@ai/core';
import { mintSessionId, requireJsonSameOrigin, requireSameOrigin, requireSession, SESSION_COOKIE, sessionCookieOptions, viewerOrThrow } from '../auth';
import {
  MASQUERADE_COOKIE,
  endInTx,
  endMasquerade,
  masqueradeCookieOptions,
  masqueradeEnded,
  masqueradeTarget,
  restoreStaff,
  staffActorOf,
} from '../auth/masquerade';
import type { MasqueradeRow } from '../auth/masquerade';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { authSessions, masqueradeSessions, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { landingFor } from '../lib/landing';
import { audit, requestFacts } from './audit';
import type { AuditActor } from './audit';
import { consoleAllows, consoleError, requireConsole, staffActor } from './guard';

/** What the routes are handed: the flag (Console PR 9 reads `console_flags`; a test turns it off). */
export interface MasqueradeDeps {
  masqueradeEnabled?: () => Promise<boolean>;
}

/**
 * D8's `masquerade_enabled`, default on. The one seam Console PR 9 wires to `console_flags`
 * (migration 0021); until then it is the spec's default.
 */
export async function masqueradeEnabled(): Promise<boolean> {
  return MASQUERADE_ENABLED_DEFAULT;
}

const ID = /^[A-Za-z0-9_.:@-]{1,128}$/;
const CURSOR = /^(\d{1,16}):(mq_[A-Za-z0-9_-]{1,64})$/;
const rate = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const READ = rate(60);
const WRITE = rate(20);

const bodyOf = (req: FastifyRequest): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};

const isUniqueViolation = (e: unknown): boolean => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
};

/** Spec § 6's `MasqueradeView` for a row. */
export async function masqueradeView(db: Database, row: MasqueradeRow, now: number): Promise<MasqueradeView> {
  const [target] = await db
    .select({ name: users.name, teamName: teams.name })
    .from(users)
    .leftJoin(teams, eq(teams.id, users.teamId))
    .where(eq(users.id, row.targetUserId))
    .limit(1);
  const [staff] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.staffUserId)).limit(1);
  return {
    id: row.id,
    target: { id: row.targetUserId, name: target?.name ?? '', teamName: target?.teamName ?? null },
    staff: { id: row.staffUserId, name: staff?.name ?? '' },
    reason: row.reason,
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    hardExpiresAt: row.hardExpiresAt,
    extendCount: row.extendCount,
    canExtend: masqueradeCanExtend(row, now),
    startedFrom: row.startedFrom,
  };
}

/**
 * The sweep (spec § 6): end every session past its expiry, delete its impersonation session, and
 * audit each as the system. One transaction; the UPDATE only takes rows still live, so two replicas
 * (or a request ending the same row) end each one once. Run once per scheduler tick.
 */
export async function sweepMasquerades(db: Pick<Database, 'transaction'>, now: number): Promise<number> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select({ id: masqueradeSessions.id })
      .from(masqueradeSessions)
      .where(and(isNull(masqueradeSessions.endedAt), lte(masqueradeSessions.expiresAt, now)));
    let ended = 0;
    for (const { id } of due) {
      if (await endInTx(tx, null, id, { reason: 'expired', action: 'masquerade.expire', actor: { source: 'system' }, now, after: { by: 'sweep' } })) ended += 1;
    }
    return ended;
  });
}

/** Audit a refused Start or Extend (not a validation error: those write nothing, as elsewhere). */
const refused = (req: FastifyRequest, action: 'masquerade.start' | 'masquerade.extend', outcome: 'denied' | 'failed', actor: AuditActor, code: string, extra: { masqueradeSessionId?: string; target?: { type: string; id?: string | null; label?: string | null }; reason?: string }) =>
  audit(req, { action, outcome, actor, masqueradeSessionId: extra.masqueradeSessionId ?? null, target: extra.target, reason: extra.reason ?? null, after: { code } });

export function registerMasqueradeRoutes(scope: FastifyInstance, deps: MasqueradeDeps = {}): void {
  const enabled = deps.masqueradeEnabled ?? masqueradeEnabled;

  // --- Start -------------------------------------------------------------------------------------

  scope.post(
    MASQUERADE_PATHS.start,
    { config: WRITE, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('masquerade.start')] },
    async (req, reply): Promise<FastifyReply> => {
      const viewer = viewerOrThrow(req);
      const actor = staffActor(viewer)!;
      const b = bodyOf(req);
      if (typeof b.targetUserId !== 'string' || !ID.test(b.targetUserId)) return consoleError(reply, 'invalid_body', 'That targetUserId isn’t valid.');
      const reason = cleanMasqueradeReason(b.reason);
      if (reason === null) return consoleError(reply, 'reason_required');
      const startedFrom = cleanStartedFrom(b.startedFrom);
      if (startedFrom === null) return consoleError(reply, 'invalid_body', 'That startedFrom isn’t valid.');

      const db = getDb();
      const now = clock.now();
      const [target] = await db.select({ id: users.id, name: users.name, kind: users.kind }).from(users).where(eq(users.id, b.targetUserId)).limit(1);
      if (!target) return consoleError(reply, 'not_found');
      const auditTarget = { type: 'user', id: target.id, label: target.name };
      if (!(await enabled())) {
        await refused(req, 'masquerade.start', 'denied', actor, 'masquerade_disabled', { target: auditTarget, reason });
        return consoleError(reply, 'masquerade_disabled');
      }
      // Spec § 6 rule 4: a learner, never staff (and so never oneself).
      if (target.kind !== 'learner') {
        await refused(req, 'masquerade.start', 'denied', actor, 'masquerade_target_staff', { target: auditTarget, reason });
        return consoleError(reply, 'masquerade_target_staff');
      }

      const id = `mq_${randomBytes(18).toString('base64url')}`;
      const authSessionId = mintSessionId();
      const { expiresAt, hardExpiresAt } = masqueradeTimes(now);
      const facts = requestFacts(req);
      const busy = async (): Promise<FastifyReply> => {
        const [live] = await db.select({ id: masqueradeSessions.id }).from(masqueradeSessions).where(and(eq(masqueradeSessions.staffUserId, actor.userId), isNull(masqueradeSessions.endedAt))).limit(1);
        await refused(req, 'masquerade.start', 'failed', actor, 'masquerade_active', { target: auditTarget, reason, masqueradeSessionId: live?.id });
        return consoleError(reply, 'masquerade_active');
      };
      let conflict = false;
      try {
        conflict = await db.transaction(async (tx) => {
          // One of this staff member's past its expiry and not swept yet is ended now, as the sweep would.
          const stale = await tx
            .select({ id: masqueradeSessions.id })
            .from(masqueradeSessions)
            .where(and(eq(masqueradeSessions.staffUserId, actor.userId), isNull(masqueradeSessions.endedAt), lte(masqueradeSessions.expiresAt, now)));
          for (const s of stale) await endInTx(tx, req, s.id, { reason: 'expired', action: 'masquerade.expire', actor: { source: 'system' }, now, after: { by: 'start' } });
          // Spec § 6 rule 5: one live session per staff member (the partial unique index is the backstop).
          const [live] = await tx.select({ id: masqueradeSessions.id }).from(masqueradeSessions).where(and(eq(masqueradeSessions.staffUserId, actor.userId), isNull(masqueradeSessions.endedAt))).limit(1);
          if (live) return true;
          await tx.insert(authSessions).values({ id: authSessionId, userId: target.id, expiresAt: new Date(hardExpiresAt), impersonating: actor.userId, remember: false });
          await tx.insert(masqueradeSessions).values({
            id,
            staffUserId: actor.userId,
            targetUserId: target.id,
            reason,
            startedAt: now,
            expiresAt,
            hardExpiresAt,
            authSessionId,
            staffAuthSessionId: viewer.sessionId,
            startedFrom: startedFrom ?? null,
            ip: facts.ip,
            userAgent: facts.userAgent,
          });
          await audit(req, { action: 'masquerade.start', outcome: 'ok', actor, masqueradeSessionId: id, target: auditTarget, reason, after: { expiresAt, hardExpiresAt, startedFrom: startedFrom ?? null } }, tx);
          return false;
        });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        conflict = true;
      }
      if (conflict) return busy();

      const [row] = await db.select().from(masqueradeSessions).where(eq(masqueradeSessions.id, id)).limit(1);
      reply.setCookie(SESSION_COOKIE, authSessionId, { ...sessionCookieOptions(process.env, { remember: false }), expires: new Date(hardExpiresAt) });
      reply.setCookie(MASQUERADE_COOKIE, id, masqueradeCookieOptions(hardExpiresAt));
      return reply.code(201).send({ session: await masqueradeView(db, row!, now), serverNow: now, redirect: await landingFor(db, { id: target.id, kind: 'learner' }, now) });
    },
  );

  // --- Current -----------------------------------------------------------------------------------

  scope.get(MASQUERADE_PATHS.current, { config: READ, preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const now = clock.now();
    const out: MasqueradeCurrent = { session: req.masquerade ? await masqueradeView(getDb(), req.masquerade, now) : null, serverNow: now };
    return reply.send(out);
  });

  // --- Extend ------------------------------------------------------------------------------------

  scope.post(MASQUERADE_PATHS.extend, { config: WRITE, preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply): Promise<FastifyReply> => {
    const viewer = viewerOrThrow(req);
    const row = req.masquerade;
    if (!row) {
      if (!(await consoleAllows(req, reply, viewer, 'masquerade.extend'))) return reply;
      return masqueradeEnded(reply, MASQUERADE_DEFAULT_RETURN);
    }
    const db = getDb();
    const now = clock.now();
    // The STAFF member's capability, read now: the viewer here is the learner.
    const [staff] = await db.select({ kind: users.kind, role: users.staffRole }).from(users).where(eq(users.id, row.staffUserId)).limit(1);
    const actor: AuditActor = { source: 'staff', userId: row.staffUserId, role: staff?.role ?? null };
    if (staff?.kind !== 'staff' || !consoleCan(staff.role, 'masquerade.extend')) {
      await audit(req, { action: 'console.access_denied', outcome: 'denied', actor, masqueradeSessionId: row.id, target: { type: 'route', id: `POST ${MASQUERADE_PATHS.extend}` }, after: { capability: 'masquerade.extend' } });
      return consoleError(reply, 'console_forbidden');
    }
    const reason = cleanMasqueradeReason(bodyOf(req).reason);
    if (reason === null) return consoleError(reply, 'reason_required');
    const target = await masqueradeTarget(db, row);
    if (!(await enabled())) {
      await refused(req, 'masquerade.extend', 'denied', actor, 'masquerade_disabled', { masqueradeSessionId: row.id, target, reason });
      return consoleError(reply, 'masquerade_disabled');
    }
    const atCap = async (): Promise<FastifyReply> => {
      // Spec § 6 rule 3.
      await refused(req, 'masquerade.extend', 'failed', actor, 'masquerade_max_reached', { masqueradeSessionId: row.id, target, reason });
      return consoleError(reply, 'masquerade_max_reached');
    };
    if (extendedExpiry(row.expiresAt, row.hardExpiresAt) === null) return atCap();
    const updated = await db.transaction(async (tx) => {
      // `min(expires + 15m, start + 60m)`, in the statement, so two Extends at once add 15 each.
      const [u] = await tx
        .update(masqueradeSessions)
        .set({
          expiresAt: sql`least(${masqueradeSessions.expiresAt} + ${MASQUERADE_EXTEND_MS}, ${masqueradeSessions.hardExpiresAt})`,
          extendCount: sql`${masqueradeSessions.extendCount} + 1`,
          reason,
        })
        .where(and(eq(masqueradeSessions.id, row.id), isNull(masqueradeSessions.endedAt), lt(masqueradeSessions.expiresAt, masqueradeSessions.hardExpiresAt)))
        .returning();
      if (!u) return null;
      await audit(
        req,
        { action: 'masquerade.extend', outcome: 'ok', actor, masqueradeSessionId: row.id, target, reason, before: { expiresAt: row.expiresAt, extendCount: row.extendCount }, after: { expiresAt: u.expiresAt, extendCount: u.extendCount } },
        tx,
      );
      return u;
    });
    if (!updated) {
      // Another tab got there first: it ended the session, or its Extend reached the cap.
      const [fresh] = await db.select().from(masqueradeSessions).where(eq(masqueradeSessions.id, row.id)).limit(1);
      if (!fresh || fresh.endedAt !== null) return masqueradeEnded(reply, await restoreStaff(reply, db, row, now));
      return atCap();
    }
    const out: MasqueradeCurrent = { session: await masqueradeView(db, updated, now), serverNow: now };
    return reply.send(out);
  });

  // --- Exit --------------------------------------------------------------------------------------

  scope.post(MASQUERADE_PATHS.exit, { config: WRITE, preHandler: [requireSession, requireSameOrigin] }, async (req, reply): Promise<FastifyReply> => {
    const row = req.masquerade;
    if (!row) return masqueradeEnded(reply, viewerOrThrow(req).user.kind === 'staff' ? MASQUERADE_DEFAULT_RETURN : '/');
    const db = getDb();
    const now = clock.now();
    await endMasquerade(db, req, row.id, { reason: 'exit', action: 'masquerade.exit', actor: await staffActorOf(db, row.staffUserId), now });
    return reply.send({ ok: true, redirect: await restoreStaff(reply, db, row, now) });
  });

  // --- History -----------------------------------------------------------------------------------

  scope.get(MASQUERADE_PATHS.sessions, { config: READ, preHandler: [requireSession, requireConsole('masquerade.start')] }, async (req, reply): Promise<FastifyReply> => {
    const q = (req.query ?? {}) as Record<string, unknown>;
    let size = CONSOLE_PAGE_DEFAULT;
    if (q.limit !== undefined && q.limit !== '') {
      const n = typeof q.limit === 'string' && /^\d{1,4}$/.test(q.limit) ? Number(q.limit) : 0;
      if (n < 1) return consoleError(reply, 'invalid_query', 'That limit isn’t valid.');
      size = Math.min(n, CONSOLE_PAGE_MAX);
    }
    let after: { at: number; id: string } | null = null;
    if (q.cursor !== undefined && q.cursor !== '') {
      const m = typeof q.cursor === 'string' ? CURSOR.exec(q.cursor) : null;
      if (!m) return consoleError(reply, 'invalid_query', 'That cursor isn’t valid.');
      after = { at: Number(m[1]), id: m[2]! };
    }
    const staff = alias(users, 'staff');
    const target = alias(users, 'target');
    const ms = masqueradeSessions;
    const raw = await getDb()
      .select({ row: ms, staffName: staff.name, targetName: target.name })
      .from(ms)
      .leftJoin(staff, eq(staff.id, ms.staffUserId))
      .leftJoin(target, eq(target.id, ms.targetUserId))
      .where(after ? or(lt(ms.startedAt, after.at), and(eq(ms.startedAt, after.at), lt(ms.id, after.id))) : undefined)
      .orderBy(desc(ms.startedAt), desc(ms.id))
      .limit(size + 1);
    const rows: MasqueradeHistoryRow[] = raw.slice(0, size).map(({ row: r, staffName, targetName }) => ({
      id: r.id,
      target: { id: r.targetUserId, name: targetName },
      staff: { id: r.staffUserId, name: staffName },
      reason: r.reason,
      startedAt: r.startedAt,
      expiresAt: r.expiresAt,
      endedAt: r.endedAt,
      endReason: r.endReason as MasqueradeEndReason | null,
      extendCount: r.extendCount,
      startedFrom: r.startedFrom,
    }));
    const last = rows[rows.length - 1];
    const page: ConsolePage<MasqueradeHistoryRow> = { rows, nextCursor: raw.length > size && last ? `${last.startedAt}:${last.id}` : null };
    return reply.send(page);
  });
}
