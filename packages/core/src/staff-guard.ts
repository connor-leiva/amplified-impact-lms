// The server's guards on staff role assignment (D-171). Pure, so the API runs them around the
// reference-ported mutations (`inviteStaff`, `setStaffRole`, `removeStaff`, unchanged) on
// `POST /api/mutate/:name`, and a later Console path can run the same rules before its own write:
//
//   1. Nobody changes their own role or removes themselves (`staff_self_change`).
//   2. No change leaves zero Owners (`staff_last_owner`). Core's mutations already refuse any change
//      to an Owner; this holds the rule on its own, so it stays true if core ever changes.
//   3. Only an Owner makes someone an Owner (`staff_owner_grant`). Core lets any holder of the
//      `staff` permission set or invite the Owner role; the Owner still may.
//
// Each refusal has a status and a sentence (`STAFF_GUARD_ERRORS`, also in `CONSOLE_ERRORS`). Who may
// call these at all is unchanged: core's `requirePerm(…, 'staff')` decides that, after these.
//
// `staffChangeOf` reads what a mutation actually changed, for the audit row: the action, the staff
// member it changed (id and name, never the email) and the role before and after.

import type { Staff, StaffRole } from './types';

/** The three staff writes these guards cover, by their mutation names. */
export const STAFF_WRITES = ['inviteStaff', 'setStaffRole', 'removeStaff'] as const;
export type StaffWrite = (typeof STAFF_WRITES)[number];
export const isStaffWrite = (name: string): name is StaffWrite => (STAFF_WRITES as readonly string[]).includes(name);

/** Each refusal: its status and its sentence. */
export const STAFF_GUARD_ERRORS = {
  staff_self_change: { status: 403, message: 'You can’t change your own role or remove yourself.' },
  staff_last_owner: { status: 403, message: 'There must always be at least one Owner.' },
  staff_owner_grant: { status: 403, message: 'Only the Owner can make someone an Owner.' },
} as const satisfies Record<string, { status: number; message: string }>;

export type StaffGuardCode = keyof typeof STAFF_GUARD_ERRORS;

/** The audit action for each write (all three are in `AUDIT_ACTIONS`). */
export const STAFF_AUDIT_ACTION = {
  setStaffRole: 'staff.role_change',
  removeStaff: 'staff.remove',
  inviteStaff: 'staff.invite',
} as const satisfies Record<StaffWrite, string>;

export type StaffAuditAction = (typeof STAFF_AUDIT_ACTION)[StaffWrite];

/** One staff write, as the guards read it. An invite names no one yet, so it has no `id`. */
export type StaffChange =
  | { kind: 'role'; id: string; role: StaffRole }
  | { kind: 'remove'; id: string }
  | { kind: 'invite'; role: StaffRole };

/** A write's arguments (already validated by its schema) as a `StaffChange`. */
export function staffChangeFor(name: StaffWrite, args: unknown): StaffChange {
  const a = (args ?? {}) as { id?: unknown; role?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const role = a.role as StaffRole;
  if (name === 'setStaffRole') return { kind: 'role', id, role };
  if (name === 'removeStaff') return { kind: 'remove', id };
  return { kind: 'invite', role };
}

type StaffLike = Pick<Staff, 'id' | 'role'>;

/** How many Owners a staff list holds. */
export const ownerCount = (staff: readonly StaffLike[]): number => staff.filter((s) => s.role === 'Owner').length;

/** Whether going from `before` to `after` leaves no Owner where there was one. */
export const leavesNoOwner = (before: readonly StaffLike[], after: readonly StaffLike[]): boolean =>
  ownerCount(before) > 0 && ownerCount(after) === 0;

/**
 * The guards, in order, for `actorId` (a staff id) making `change` to `staff` (the list as it is now).
 * A target that does not exist passes here; core answers it (404).
 */
export function checkStaffChange(staff: readonly StaffLike[], actorId: string, change: StaffChange): { ok: true } | { ok: false; code: StaffGuardCode } {
  if (change.kind !== 'invite' && change.id === actorId) return { ok: false, code: 'staff_self_change' };
  if (change.kind !== 'invite') {
    const target = staff.find((s) => s.id === change.id);
    const losesOwner = target?.role === 'Owner' && (change.kind === 'remove' || change.role !== 'Owner');
    if (losesOwner && ownerCount(staff) <= 1) return { ok: false, code: 'staff_last_owner' };
  }
  if (change.kind !== 'remove' && change.role === 'Owner') {
    const actor = staff.find((s) => s.id === actorId);
    if (actor?.role !== 'Owner') return { ok: false, code: 'staff_owner_grant' };
  }
  return { ok: true };
}

/** What one write changed, for its audit row: who, and the role before and after (null: none). */
export interface StaffChangeRecord {
  action: StaffAuditAction;
  target: { id: string; label: string };
  before: { role: StaffRole | null };
  after: { role: StaffRole | null };
}

type StaffNamed = Pick<Staff, 'id' | 'name' | 'role'>;

/**
 * What a write changed between two staff lists, or null when it changed nothing (a role set to the
 * one it was, core's "The owner can’t be removed"). An invite is the one row `after` has and
 * `before` does not.
 */
export function staffChangeOf(change: StaffChange, before: readonly StaffNamed[], after: readonly StaffNamed[]): StaffChangeRecord | null {
  if (change.kind === 'invite') {
    const added = after.find((s) => !before.some((b) => b.id === s.id));
    return added
      ? { action: 'staff.invite', target: { id: added.id, label: added.name }, before: { role: null }, after: { role: added.role } }
      : null;
  }
  const was = before.find((s) => s.id === change.id);
  if (!was) return null;
  const now = after.find((s) => s.id === change.id);
  if (change.kind === 'remove') {
    return now ? null : { action: 'staff.remove', target: { id: was.id, label: was.name }, before: { role: was.role }, after: { role: null } };
  }
  return now && now.role !== was.role
    ? { action: 'staff.role_change', target: { id: was.id, label: was.name }, before: { role: was.role }, after: { role: now.role } }
    : null;
}
