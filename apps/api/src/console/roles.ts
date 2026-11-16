// Roles & Permissions, editable (D-160 R2-3b; Connor, Nov 16, 2026, 8:27 AM MST, superseding the
// Console spec's D11). `CONSOLE_CAPS` (@ai/core) stays the ceiling and the server stays authoritative:
// `console_role_grants` holds only the Owner's changes within it, and every check reads the effective
// matrix (the ceiling AND NOT removed) through the small cache below. The `build` row stands for four
// `PermKey`s, the matrix Staff & Roles edits; its change sets them through core's own
// `togglePermission`, in the transaction shape `/api/mutate` uses (`pg_advisory_xact_lock(42)`,
// `loadDb`, `persistDiff`), and the connected clients refetch.
//
//   POST /api/console/roles/preview  { role, capability, allowed } → { role, capability, before, after,
//                                    summary, confirmToken, expiresAt }. The guards run here, so the
//                                    confirm dialog shows a refusal as soon as it opens.
//   POST /api/console/roles          { confirmToken } → the matrix. The change and its ONE audit row
//                                    (`permission.change`, before and after) in one transaction.
//
// Both: `roles.write` (the Owner), `requireJsonSameOrigin`, 20 a minute, `private, no-store`.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { ROLE_CONFIRM_TTL_MS, checkRoleChange, fixedByProductMessage, isEditableRole, isRoleRowKey, permissionChangeSummary, roleRowOf } from '@ai/core';
import type { Db, EditableRole, PermMatrix, RoleChangePreview, RoleGrant, RoleRowKey } from '@ai/core';
import * as M from '@ai/core/mutations';
import { getDb } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import { consoleRoleGrants, permissions } from '../db/schema';
import { viewerOrThrow } from '../auth';
import { clock, newIds } from '../lib/clock';
import { audit } from './audit';
import { signConfirm, verifyConfirm } from './confirm-token';
import type { ConfirmClaims } from './confirm-token';
import { consoleError, staffActor } from './guard';

// --- the effective matrix, cached -----------------------------------------------------------------

/**
 * How long a read of the stored changes is reused. A write here clears it at once; the five seconds
 * only bound how long another API process could lag behind one (Railway runs one).
 */
const GRANTS_TTL_MS = 5_000;
let cached: { until: number; grants: Promise<RoleGrant[]> } | null = null;

async function readGrants(): Promise<RoleGrant[]> {
  const rows = await getDb().select({ role: consoleRoleGrants.role, capability: consoleRoleGrants.capability, allowed: consoleRoleGrants.allowed }).from(consoleRoleGrants);
  // The table's CHECKs keep both lists closed; a row outside them is ignored rather than trusted.
  return rows.filter((r): r is RoleGrant => isEditableRole(r.role) && isRoleRowKey(r.capability));
}

/** The Owner's stored changes. An empty table is the ceiling exactly. Wall-clock TTL, never `clock`. */
export function roleGrants(): Promise<RoleGrant[]> {
  const now = Date.now();
  if (!cached || cached.until < now) {
    const grants = readGrants();
    cached = { until: now + GRANTS_TTL_MS, grants };
    // A failed read is not kept: the next request asks the database again.
    grants.catch(() => {
      if (cached?.grants === grants) cached = null;
    });
  }
  return cached.grants;
}

/** After a write, and when an app is built (each test builds its own against a fresh database). */
export function invalidateRoleGrants(): void {
  cached = null;
}

// --- the two-step change --------------------------------------------------------------------------

const ACTION = 'permission.change';

interface RoleClaims extends ConfirmClaims {
  role: EditableRole;
  capability: RoleRowKey;
  before: boolean;
  after: boolean;
}

const actorOf = (req: FastifyRequest) => staffActor(viewerOrThrow(req))!;

/** One role's `PermKey`s, as the `permissions` table holds them: what a preview of the `build` row reads. */
async function permsOf(role: unknown): Promise<PermMatrix> {
  if (!isEditableRole(role)) return {};
  const rows = await getDb().select({ perm: permissions.perm, allowed: permissions.allowed }).from(permissions).where(eq(permissions.role, role));
  return { [role]: Object.fromEntries(rows.map((r) => [r.perm, r.allowed])) };
}

export async function previewRoleChange(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const actor = actorOf(req);
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  if (typeof body.allowed !== 'boolean') return consoleError(reply, 'invalid_query', 'That change isn’t valid.');
  const check = checkRoleChange({
    viewerRole: actor.role,
    role: body.role,
    capability: body.capability,
    allowed: body.allowed,
    grants: await roleGrants(),
    perms: await permsOf(body.role),
  });
  if (!check.ok) {
    if (check.code === 'invalid_query') return consoleError(reply, 'invalid_query', 'That change isn’t valid.');
    // Past the ceiling: the reason in words, which the confirm shows (D-160 R2-3b).
    if (check.code === 'fixed_by_product' && isRoleRowKey(body.capability)) return consoleError(reply, 'fixed_by_product', fixedByProductMessage(body.capability));
    return consoleError(reply, check.code);
  }
  const exp = clock.now() + ROLE_CONFIRM_TTL_MS;
  const claims: RoleClaims = { action: ACTION, actor: actor.userId, exp, role: check.role, capability: check.row.key, before: check.before, after: check.after };
  const preview: RoleChangePreview = {
    role: check.role,
    capability: check.row.key,
    before: check.before,
    after: check.after,
    summary: permissionChangeSummary(check.row.label, check.before, check.after),
    confirmToken: signConfirm(claims),
    expiresAt: exp,
  };
  return reply.send(preview);
}

/** What a change records, before and after: the row, its words, and what it stands for. */
const side = (capability: RoleRowKey, allowed: boolean) => {
  const row = roleRowOf(capability);
  return { permission: capability, label: row.label, allowed, ...(row.caps ? { capabilities: row.caps } : {}), ...(row.perms ? { perms: row.perms } : {}) };
};

/**
 * The change, if the token is this Owner's, unexpired, and its `before` is still true. Inside one
 * transaction: lock, re-read, re-run every guard on what is there now, write, and write the audit row.
 * Returns null when it wrote, or the refusal. `broadcast` wakes the clients after a `PermKey` change.
 */
export async function commitRoleChange(req: FastifyRequest, reply: FastifyReply, broadcast?: () => void): Promise<FastifyReply | null> {
  const viewer = viewerOrThrow(req);
  const actor = actorOf(req);
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const v = verifyConfirm<RoleClaims>(body.confirmToken, { action: ACTION, actor: actor.userId }, clock.now());
  if (!v.ok) return consoleError(reply, v.code);
  const { role, capability, before, after } = v.claims;
  if (!isEditableRole(role) || !isRoleRowKey(capability) || typeof before !== 'boolean' || typeof after !== 'boolean' || before === after)
    return consoleError(reply, 'confirm_invalid');
  const row = roleRowOf(capability);
  const byPerm = !row.caps?.length;

  const refused = await getDb().transaction(async (tx) => {
    // One change at a time: a second Owner's confirm waits here, then finds its `before` stale. The
    // `build` row's PermKeys take the lock every `/api/mutate` write takes, since they share that table.
    if (byPerm) await tx.execute(sql`select pg_advisory_xact_lock(42)`);
    else await tx.execute(sql`lock table ${consoleRoleGrants} in share row exclusive mode`);
    const current = await tx.select({ role: consoleRoleGrants.role, capability: consoleRoleGrants.capability, allowed: consoleRoleGrants.allowed }).from(consoleRoleGrants);
    const grants = current.filter((r): r is RoleGrant => isEditableRole(r.role) && isRoleRowKey(r.capability));
    const db: Db | null = byPerm ? await loadDb(tx) : null;
    const check = checkRoleChange({ viewerRole: actor.role, role, capability, allowed: after, grants, perms: db?.perms ?? {} });
    if (!check.ok) return check.code === 'no_change' ? 'grant_stale' : check.code === 'invalid_query' ? 'confirm_invalid' : check.code;
    if (check.before !== before) return 'grant_stale';
    const now = clock.now();
    if (db) {
      // Core's own mutation, once for each PermKey not yet at the new value, as Staff & Roles does it.
      const ctx = { now, id: newIds() };
      let next = db;
      for (const perm of row.perms ?? []) if (!!next.perms[role]?.[perm] !== after) next = M.togglePermission(next, viewer.actor, { role, perm }, ctx).db;
      await persistDiff(tx, db, next);
    } else {
      await tx
        .insert(consoleRoleGrants)
        .values({ role, capability, allowed: after, updatedBy: actor.userId, updatedAt: now })
        .onConflictDoUpdate({ target: [consoleRoleGrants.role, consoleRoleGrants.capability], set: { allowed: after, updatedBy: actor.userId, updatedAt: now } });
    }
    await audit(req, { action: ACTION, outcome: 'ok', actor, target: { type: 'role', id: role, label: role }, before: side(capability, before), after: side(capability, after) }, tx);
    return null;
  });
  invalidateRoleGrants();
  if (refused) return consoleError(reply, refused);
  if (byPerm) broadcast?.();
  return null;
}
