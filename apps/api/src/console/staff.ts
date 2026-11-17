// Roles & Permissions' "Invite staff" and "Change role…" (D-172 R2-gaps), through the Console instead of
// Staff & Roles' `/api/mutate` writes: the Owner's alone (`roles.write`), two steps with the confirm token
// Roles & Permissions' matrix uses (`confirm-token.ts`), one audit row each, and the guards in core's
// `checkStaffConsoleChange` at preview and again inside the change.
//
//   POST /api/console/staff/preview  { kind: 'invite', email, role } | { kind: 'role', staffId, role }
//                                    → { change, before, title, body, cta, confirmToken, expiresAt }.
//                                    The guards and core's own checks run here (core's mutation on the
//                                    loaded snapshot, never persisted), so the dialog shows a refusal at
//                                    once. Nothing is written.
//   POST /api/console/staff          { confirmToken } → { toast }. Inside one transaction, under
//                                    `/api/mutate`'s lock: re-read, re-run every guard, refuse a stale
//                                    `before` (409 `staff_stale`), run core's `inviteStaff` or
//                                    `setStaffRole` (unchanged), persist, and write ONE audit row
//                                    (`staff.invite` / `staff.role_change`: who, and the role before
//                                    and after; never an email address). The clients refetch.
//
// NO EMAIL IS SENT. Core's `inviteStaff` has no email effect (the `staff-invite` template exists, and
// nothing sends it), so this path sends nothing either; sending one would be a new production send.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { MutationError, STAFF_CONFIRM_TTL_MS, checkStaffConsoleChange, staffConfirmCopy } from '@ai/core';
import type { Db, StaffChangePreview, StaffConsoleChange, StaffRole } from '@ai/core';
import * as M from '@ai/core/mutations';
import { viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { clock, newIds } from '../lib/clock';
import { audit } from './audit';
import { signConfirm, verifyConfirm } from './confirm-token';
import type { ConfirmClaims } from './confirm-token';
import { consoleError, staffActor } from './guard';

const ACTIONS = { invite: 'staff.invite', role: 'staff.role_change' } as const;

interface StaffClaims extends ConfirmClaims {
  change: StaffConsoleChange;
  before: StaffRole | null;
}


/** Core's own mutation for a change, on `db`, as the actor; its refusal as a sentence, or its db. */
function run(db: Db, viewer: ReturnType<typeof viewerOrThrow>, change: StaffConsoleChange, now: number): { ok: true; db: Db } | { ok: false; error: string } {
  try {
    const ctx = { now, id: newIds() };
    const out =
      change.kind === 'invite'
        ? M.inviteStaff(db, viewer.actor, { email: change.email, role: change.role }, ctx)
        : M.setStaffRole(db, viewer.actor, { id: change.staffId, role: change.role }, ctx);
    return out.error ? { ok: false, error: out.error } : { ok: true, db: out.db };
  } catch (err) {
    if (err instanceof MutationError) return { ok: false, error: err.message };
    throw err;
  }
}

export async function previewStaffChange(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const viewer = viewerOrThrow(req);
  const actor = staffActor(viewer)!;
  const db = await loadDb(getDb());
  const check = checkStaffConsoleChange(db.staff, actor.userId, req.body);
  if (!check.ok) return check.code === 'invalid_query' ? consoleError(reply, 'invalid_query', 'That change isn’t valid.') : consoleError(reply, check.code);
  const dry = run(db, viewer, check.change, clock.now());
  if (!dry.ok) return consoleError(reply, 'staff_invalid', dry.error);
  const exp = clock.now() + STAFF_CONFIRM_TTL_MS;
  const claims: StaffClaims = { action: ACTIONS[check.change.kind], actor: actor.userId, exp, change: check.change, before: check.before };
  const preview: StaffChangePreview = {
    change: check.change,
    before: check.before,
    ...staffConfirmCopy(check.change, check.name, check.before),
    confirmToken: signConfirm(claims),
    expiresAt: exp,
  };
  return reply.send(preview);
}

/** Which action a token names, read before it is verified (each action verifies against its own name). */
const kindOf = (token: unknown): StaffConsoleChange['kind'] | null => {
  if (typeof token !== 'string') return null;
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8')) as { action?: unknown };
    return claims.action === ACTIONS.invite ? 'invite' : claims.action === ACTIONS.role ? 'role' : null;
  } catch {
    return null;
  }
};

export async function commitStaffChange(req: FastifyRequest, reply: FastifyReply, broadcast?: () => void): Promise<FastifyReply> {
  const viewer = viewerOrThrow(req);
  const actor = staffActor(viewer)!;
  const token = (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}).confirmToken;
  const kind = kindOf(token);
  if (!kind) return consoleError(reply, 'confirm_invalid');
  const v = verifyConfirm<StaffClaims>(token, { action: ACTIONS[kind], actor: actor.userId }, clock.now());
  if (!v.ok) return consoleError(reply, v.code);
  const { change, before } = v.claims;
  if (!change || change.kind !== kind) return consoleError(reply, 'confirm_invalid');

  const done = await getDb().transaction(async (tx): Promise<{ code: 'staff_stale' | 'staff_invalid' | 'confirm_invalid' | 'staff_self_change' | 'staff_last_owner'; error?: string } | { toast: string }> => {
    // `/api/mutate`'s lock: staff are in the snapshot every write there reads.
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const db = await loadDb(tx);
    const check = checkStaffConsoleChange(db.staff, actor.userId, change);
    if (!check.ok) return { code: check.code === 'invalid_query' ? 'confirm_invalid' : check.code === 'staff_unchanged' ? 'staff_stale' : check.code };
    if (check.before !== before) return { code: 'staff_stale' };
    const now = clock.now();
    const out = run(db, viewer, check.change, now);
    if (!out.ok) return { code: change.kind === 'invite' ? 'staff_stale' : 'staff_invalid', error: out.error };
    await persistDiff(tx, db, out.db);
    const who =
      change.kind === 'invite'
        ? out.db.staff.find((s) => !db.staff.some((b) => b.id === s.id))!
        : out.db.staff.find((s) => s.id === change.staffId)!;
    await audit(
      req,
      {
        action: ACTIONS[change.kind],
        outcome: 'ok',
        actor,
        target: { type: 'staff', id: who.id, label: who.name },
        before: { role: before },
        after: { role: change.role },
      },
      tx,
    );
    return { toast: change.kind === 'invite' ? `${change.email} added to staff as ${change.role}` : `${who.name} is now ${change.role}` };
  });
  if ('code' in done) return consoleError(reply, done.code, done.error);
  broadcast?.();
  return reply.send({ toast: done.toast });
}
