// Roles & Permissions' "Invite staff" and "Change role…" (D-172 R2-gaps), through the Console instead of
// Staff & Roles' `/api/mutate` writes: the Owner's alone (`roles.write`), two steps with the confirm token
// Roles & Permissions' matrix uses (`confirm-token.ts`), and D-171's rules, codes, actions and audit
// shape (#155): `checkStaffChange` and `leavesNoOwner` from core's `staff-guard.ts`, and the API's
// `staff-writes.ts` wrappers, which write one `denied` row for each refused write and ONE `ok` row
// (`staff.invite` / `staff.role_change`: the staff member by id and name, the role before and after,
// never an email address) for each change, in the change's transaction.
//
//   POST /api/console/staff/preview  { kind: 'invite', email, role } | { kind: 'role', id, role }
//                                    → { change, before, title, body, cta, confirmToken, expiresAt }.
//                                    The guards and core's own checks run here (core's mutation on the
//                                    loaded snapshot, never persisted), so the dialog shows a refusal at
//                                    once. Nothing is written: a preview is not a write.
//   POST /api/console/staff          { confirmToken } → { toast }. Inside one transaction, under
//                                    `/api/mutate`'s lock: re-read, `refuseStaffWrite` (the guards, a
//                                    `denied` row), a stale `before` is 409 `staff_stale`, core's
//                                    mutation, `refuseOwnerlessResult`, persist, `writeStaffChange`.
//
// NO EMAIL IS SENT. Core's `inviteStaff` has no email effect (the `staff-invite` template exists, and
// nothing sends it), so this path sends nothing either; sending one would be a new production send.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { MutationError, STAFF_AUDIT_ACTION, STAFF_CONFIRM_TTL_MS, STAFF_UNCHANGED, checkStaffChange, leavesNoOwner, readStaffConsoleRequest, staffConfirmCopy } from '@ai/core';
import type { Db, StaffChangePreview, StaffConsoleRequest, StaffRole } from '@ai/core';
import * as M from '@ai/core/mutations';
import { viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { clock, newIds } from '../lib/clock';
import { signConfirm, verifyConfirm } from './confirm-token';
import type { ConfirmClaims } from './confirm-token';
import { consoleError, staffActor } from './guard';
import { recordStaffRefusal, refuseOwnerlessResult, refuseStaffWrite, staffWriteContext, writeStaffChange } from './staff-writes';
import type { StaffRefusal } from './staff-writes';

interface StaffClaims extends ConfirmClaims {
  request: StaffConsoleRequest;
  before: StaffRole | null;
}

type Viewer = ReturnType<typeof viewerOrThrow>;
type Ran = { ok: true; db: Db } | { ok: false; error: string; forbidden: boolean };

/** Core's own mutation, as the actor, on `db`; its refusal as a sentence, or its db. */
function run(db: Db, viewer: Viewer, request: StaffConsoleRequest, now: number): Ran {
  try {
    const ctx = { now, id: newIds() };
    const out =
      request.kind === 'invite'
        ? M.inviteStaff(db, viewer.actor, { email: request.email, role: request.role }, ctx)
        : M.setStaffRole(db, viewer.actor, { id: request.id, role: request.role }, ctx);
    return out.error ? { ok: false, error: out.error, forbidden: false } : { ok: true, db: out.db };
  } catch (err) {
    if (err instanceof MutationError) return { ok: false, error: err.message, forbidden: err.code === 'forbidden' };
    throw err;
  }
}

/** The role the target holds now (null for an invite), or undefined when the target isn't on staff. */
const roleNow = (db: Db, request: StaffConsoleRequest): StaffRole | null | undefined =>
  request.kind === 'invite' ? null : db.staff.find((s) => s.id === request.id)?.role;

export async function previewStaffChange(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const viewer = viewerOrThrow(req);
  const actor = staffActor(viewer)!;
  const write = readStaffConsoleRequest(req.body);
  if (!write) return consoleError(reply, 'invalid_query', 'That change isn’t valid.');
  const db = await loadDb(getDb());
  const before = roleNow(db, write.request);
  if (before === undefined) return consoleError(reply, 'invalid_query', 'That change isn’t valid.');
  const check = checkStaffChange(db.staff, actor.userId, write.change);
  if (!check.ok) return consoleError(reply, check.code);
  if (write.request.kind === 'role' && before === write.request.role) return consoleError(reply, 'invalid_query', STAFF_UNCHANGED);
  const dry = run(db, viewer, write.request, clock.now());
  if (!dry.ok) return consoleError(reply, 'staff_invalid', dry.error);
  if (leavesNoOwner(db.staff, dry.db.staff)) return consoleError(reply, 'staff_last_owner');
  const exp = clock.now() + STAFF_CONFIRM_TTL_MS;
  const claims: StaffClaims = { action: STAFF_AUDIT_ACTION[write.name], actor: actor.userId, exp, request: write.request, before };
  const target = write.request.kind === 'role' ? write.request.id : null;
  const name = target === null ? null : (db.staff.find((s) => s.id === target)?.name ?? null);
  const preview: StaffChangePreview = { change: write.request, before, ...staffConfirmCopy(write.request, name, before), confirmToken: signConfirm(claims), expiresAt: exp };
  return reply.send(preview);
}

/** Which action a token names, read before it is verified (it is then verified against that name). */
function actionOf(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8')) as { action?: unknown };
    return claims.action === STAFF_AUDIT_ACTION.inviteStaff || claims.action === STAFF_AUDIT_ACTION.setStaffRole ? claims.action : null;
  } catch {
    return null;
  }
}

type Done = { toast: string } | { refusal: StaffRefusal } | { code: 'staff_stale' | 'staff_invalid' | 'confirm_invalid'; error?: string; forbidden?: boolean; staff?: Db['staff'] };

export async function commitStaffChange(req: FastifyRequest, reply: FastifyReply, broadcast?: () => void): Promise<FastifyReply> {
  const viewer = viewerOrThrow(req);
  const actor = staffActor(viewer)!;
  const token = (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}).confirmToken;
  const action = actionOf(token);
  if (!action) return consoleError(reply, 'confirm_invalid');
  const v = verifyConfirm<StaffClaims>(token, { action, actor: actor.userId }, clock.now());
  if (!v.ok) return consoleError(reply, v.code);
  const write = readStaffConsoleRequest(v.claims.request);
  if (!write || STAFF_AUDIT_ACTION[write.name] !== action) return consoleError(reply, 'confirm_invalid');
  const ctx = staffWriteContext(write.name, write.args, viewer);
  if (!ctx) return consoleError(reply, 'confirm_invalid');

  const done = await getDb().transaction(async (tx): Promise<Done> => {
    // `/api/mutate`'s lock: staff are in the snapshot every write there reads.
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    const db = await loadDb(tx);
    // D-171's guards, with its `denied` row (committed with this transaction).
    const refused = await refuseStaffWrite(req, tx, ctx, db);
    if (refused) return { refusal: refused };
    if (roleNow(db, write.request) !== v.claims.before) return { code: 'staff_stale' };
    const out = run(db, viewer, write.request, clock.now());
    // An invite refused now (someone added that address since the preview) is stale; anything else
    // core refuses is its own sentence, and a `forbidden` one is D-171's `denied` row, after this.
    if (!out.ok) return write.name === 'inviteStaff' && !out.forbidden ? { code: 'staff_stale', error: out.error } : { code: 'staff_invalid', error: out.error, forbidden: out.forbidden, staff: db.staff };
    const ownerless = await refuseOwnerlessResult(req, tx, ctx, db, out.db);
    if (ownerless) return { refusal: ownerless };
    await persistDiff(tx, db, out.db);
    await writeStaffChange(req, tx, ctx, db, out.db);
    const r = write.request;
    if (r.kind === 'invite') return { toast: `${r.email} added to staff as ${r.role}` };
    const who = out.db.staff.find((s) => s.id === r.id)!;
    return { toast: `${who.name} is now ${r.role}` };
  });
  if ('refusal' in done) return reply.code(done.refusal.status).send(done.refusal.body);
  if ('code' in done) {
    if (done.forbidden) await recordStaffRefusal(req, ctx, done.staff ?? null, done.error ?? '');
    return consoleError(reply, done.code, done.error);
  }
  broadcast?.();
  return reply.send({ toast: done.toast });
}
