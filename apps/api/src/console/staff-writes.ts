// D-171: the guards and audit rows around the three staff writes `POST /api/mutate/:name` runs
// (`inviteStaff`, `setStaffRole`, `removeStaff`). The mutations are @ai/core's, ported from the
// reference and unchanged; the rules are core's too (`checkStaffChange` in `staff-guard.ts`). This file
// is where the route meets them: one `denied` row for each refusal, one `ok` row for each change.
//
//   - `refuseStaffWrite`, inside the mutation's transaction, before the mutation runs: the guards.
//   - `refuseOwnerlessResult`, in the same transaction, after the mutation and before its write: a
//     result with no Owner left is refused, whatever core decided.
//   - `writeStaffChange`, in the same transaction, after the write: the change's ONE row, so the
//     change and its row commit together or not at all.
//   - `recordStaffRefusal`, after core itself refused (`MutationError('forbidden')`): the transaction
//     has rolled back, so its row is written on its own.
//
// A learner calling a staff write gets core's 403 and no row, as `requireConsole` writes none for a
// learner. An invite's row names the new staff member by id and name; the email is never stored.

import type { FastifyRequest } from 'fastify';
import { STAFF_AUDIT_ACTION, STAFF_GUARD_ERRORS, checkStaffChange, isStaffWrite, leavesNoOwner, staffChangeFor, staffChangeOf } from '@ai/core';
import type { Db, StaffChange, StaffGuardCode, StaffWrite } from '@ai/core';
import type { SessionViewer } from '../auth';
import { getDb } from '../db/client';
import { audit } from './audit';
import type { AuditActor, AuditWriter } from './audit';
import { staffActor } from './guard';

/** A staff write by a staff member: what the guards and the audit rows need. */
export interface StaffWriteContext {
  name: StaffWrite;
  change: StaffChange;
  actor: Extract<AuditActor, { source: 'staff' }>;
  staffId: string;
}

/** The context for a staff write by a staff member; null for any other mutation, or a learner. */
export function staffWriteContext(name: string, args: unknown, viewer: SessionViewer): StaffWriteContext | null {
  if (!isStaffWrite(name) || viewer.actor.kind !== 'staff') return null;
  const actor = staffActor(viewer);
  if (!actor) return null;
  return { name, change: staffChangeFor(name, args), actor, staffId: viewer.actor.staffId };
}

/** A refusal as the route answers it: the guard's status, `{ error, code }`. */
export interface StaffRefusal {
  status: number;
  body: { error: string; code: StaffGuardCode };
}

const refusal = (code: StaffGuardCode): StaffRefusal => ({ status: STAFF_GUARD_ERRORS[code].status, body: { error: STAFF_GUARD_ERRORS[code].message, code } });

/** The row's target: the staff member by id and name. An invite that was refused names no one. */
function targetOf(change: StaffChange, staff: Db['staff']) {
  if (change.kind === 'invite') return { type: 'staff' };
  return { type: 'staff', id: change.id, label: staff.find((s) => s.id === change.id)?.name ?? null };
}

/** The role before and the role asked for, as a refused row records them. */
function asked(change: StaffChange, staff: Db['staff']) {
  const before = change.kind === 'invite' ? null : (staff.find((s) => s.id === change.id)?.role ?? null);
  const after = change.kind === 'remove' ? null : change.role;
  return { before: { role: before }, after: { role: after } };
}

async function writeDenied(req: FastifyRequest, ctx: StaffWriteContext, staff: Db['staff'], refused: string, db: AuditWriter, message?: string): Promise<void> {
  const { before, after } = asked(ctx.change, staff);
  await audit(
    req,
    {
      action: STAFF_AUDIT_ACTION[ctx.name],
      outcome: 'denied',
      actor: ctx.actor,
      target: targetOf(ctx.change, staff),
      before,
      after: { ...after, refused, ...(message ? { message } : {}) },
    },
    db,
  );
}

/** The guards, before the mutation. A refusal writes its `denied` row on `tx` and is returned. */
export async function refuseStaffWrite(req: FastifyRequest, tx: AuditWriter, ctx: StaffWriteContext, before: Db): Promise<StaffRefusal | null> {
  const check = checkStaffChange(before.staff, ctx.staffId, ctx.change);
  if (check.ok) return null;
  await writeDenied(req, ctx, before.staff, check.code, tx);
  return refusal(check.code);
}

/**
 * After the mutation, before anything is persisted: a result with no Owner left is refused (its
 * `denied` row is written on `tx`, and nothing else is). Otherwise null, and `writeStaffChange` writes
 * the change's row once the change itself is persisted.
 */
export async function refuseOwnerlessResult(req: FastifyRequest, tx: AuditWriter, ctx: StaffWriteContext, before: Db, after: Db): Promise<StaffRefusal | null> {
  if (!leavesNoOwner(before.staff, after.staff)) return null;
  await writeDenied(req, ctx, before.staff, 'staff_last_owner', tx);
  return refusal('staff_last_owner');
}

/** The change's ONE `ok` row, on `tx`, after the change is persisted. Nothing changed, no row. */
export async function writeStaffChange(req: FastifyRequest, tx: AuditWriter, ctx: StaffWriteContext, before: Db, after: Db): Promise<void> {
  const record = staffChangeOf(ctx.change, before.staff, after.staff);
  if (!record) return;
  await audit(
    req,
    {
      action: record.action,
      outcome: 'ok',
      actor: ctx.actor,
      target: { type: 'staff', id: record.target.id, label: record.target.label },
      before: record.before,
      after: record.after,
    },
    tx,
  );
}

/**
 * Core refused (`MutationError('forbidden')`: no `staff` permission, or the Owner's role is fixed).
 * The transaction has rolled back, so the `denied` row is written on its own. A failure to write it
 * is logged and does not change the answer core already gave.
 */
export async function recordStaffRefusal(req: FastifyRequest, ctx: StaffWriteContext, staff: Db['staff'] | null, message: string): Promise<void> {
  try {
    await writeDenied(req, ctx, staff ?? [], 'forbidden', getDb(), message);
  } catch (err) {
    req.log.error({ err, mutation: ctx.name }, 'could not write the audit row for a refused staff write');
  }
}
