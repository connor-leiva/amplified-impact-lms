// Roles & Permissions' "Invite staff" and "Change role…" through the Console (D-172 R2-gaps): the
// rules the two-step write runs, at preview and again inside the change. Core's own `inviteStaff` and
// `setStaffRole` (reference-ported, unchanged) still make the change; these guards run first:
//
//   1. Nobody changes their own role (`staff_self_change`). The path is the Owner's alone
//      (`roles.write`), and the Owner's own role is fixed, so this is the rule for the day it isn't.
//   2. No change leaves zero Owners (`staff_last_owner`). Core already refuses any change to an Owner;
//      this holds on its own, so it stays true if core ever changes.
//   3. A change must change something (`staff_unchanged`).
//   4. An invite is never for the Owner role (the role list is Staff & Roles' invite list). A role
//      change MAY make someone an Owner, because core allows it today (Staff & Roles offers it);
//      core then fixes that role, as it fixes every Owner's. Listed in D-172 for Connor's call.
//
// The codes and the first two sentences are D-171's (#155, `staff-guard.ts`, not on this branch's
// base); whichever lands second should share one module.

import { STAFF_ROLES } from './constants';
import type { Staff, StaffRole } from './types';

/** How long a staff change's confirm token lasts: Roles & Permissions' five minutes. */
export const STAFF_CONFIRM_TTL_MS = 5 * 60_000;

/** The roles an invite offers: every role but Owner, as Staff & Roles' invite. */
export const STAFF_INVITE_ROLES: readonly StaffRole[] = STAFF_ROLES.filter((r) => r !== 'Owner');

/** A change the Owner asks for: an invite, or a staff member's new role. */
export type StaffConsoleChange = { kind: 'invite'; email: string; role: StaffRole } | { kind: 'role'; staffId: string; role: StaffRole };

export type StaffConsoleRefusal = 'invalid_query' | 'staff_self_change' | 'staff_last_owner' | 'staff_unchanged';

export type StaffConsoleCheck =
  | { ok: true; change: StaffConsoleChange; before: StaffRole | null; name: string | null }
  | { ok: false; code: StaffConsoleRefusal };

const isRole = (v: unknown, list: readonly StaffRole[]): v is StaffRole => typeof v === 'string' && (list as readonly string[]).includes(v);

/** How many Owners a staff list holds. */
export const ownersOf = (staff: readonly Pick<Staff, 'role'>[]): number => staff.filter((s) => s.role === 'Owner').length;

/**
 * The guards, in order, for the staff member `actorId` asking for `input` against `staff` (the list as
 * it is now). Anything malformed, or a staff member who isn't there, is `invalid_query`. Core's own
 * checks (a valid address, not already on staff, an Owner's role fixed) run after these, on the write.
 */
export function checkStaffConsoleChange(staff: readonly Pick<Staff, 'id' | 'name' | 'role'>[], actorId: string, input: unknown): StaffConsoleCheck {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (b.kind === 'invite') {
    if (typeof b.email !== 'string' || b.email.trim() === '' || b.email.length > 254 || !isRole(b.role, STAFF_INVITE_ROLES)) return { ok: false, code: 'invalid_query' };
    return { ok: true, change: { kind: 'invite', email: b.email.trim(), role: b.role }, before: null, name: null };
  }
  if (b.kind !== 'role' || typeof b.staffId !== 'string' || !isRole(b.role, STAFF_ROLES)) return { ok: false, code: 'invalid_query' };
  const target = staff.find((s) => s.id === b.staffId);
  if (!target) return { ok: false, code: 'invalid_query' };
  if (target.id === actorId) return { ok: false, code: 'staff_self_change' };
  if (target.role === b.role) return { ok: false, code: 'staff_unchanged' };
  if (target.role === 'Owner' && ownersOf(staff) <= 1) return { ok: false, code: 'staff_last_owner' };
  return { ok: true, change: { kind: 'role', staffId: target.id, role: b.role }, before: target.role, name: target.name };
}

/** What `POST /api/console/staff/preview` answers: the change, its words, and the token that confirms it. */
export interface StaffChangePreview {
  change: StaffConsoleChange;
  before: StaffRole | null;
  title: string;
  body: string;
  cta: string;
  confirmToken: string;
  expiresAt: number;
}

/** The confirm's words for a change (new strings, D-172; the mockup draws neither dialog). */
export function staffConfirmCopy(change: StaffConsoleChange, name: string | null, before: StaffRole | null): { title: string; body: string; cta: string } {
  if (change.kind === 'invite') {
    return {
      title: `Invite ${change.email} as ${change.role}?`,
      body: `They join staff as ${change.role} right away. No email is sent.`,
      cta: 'Invite staff',
    };
  }
  return {
    title: `Change ${name ?? 'this staff member'} to ${change.role}?`,
    body:
      change.role === 'Owner'
        ? `${before ?? 'Their role'} to Owner. An Owner’s role can’t be changed again here.`
        : `${before ?? 'Their role'} to ${change.role}. It applies right away.`,
    cta: 'Change role',
  };
}
