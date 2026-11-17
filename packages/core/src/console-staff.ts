// Roles & Permissions' "Invite staff" and "Change role…" through the Console (D-172 R2-gaps). The rules
// are D-171's (`staff-guard.ts`, #155): `checkStaffChange` (never your own role, never the last Owner,
// the Owner role only from an Owner), `leavesNoOwner`, `STAFF_AUDIT_ACTION` and `staffChangeOf` for the
// audit row; the API wraps them as `/api/mutate` does (`console/staff-writes.ts`). Core's own
// `inviteStaff` and `setStaffRole` (reference-ported, unchanged) still make the change. This file holds
// only what the Console's two-step path adds: reading the request, the token's lifetime, and the words.
//
// An invite never offers the Owner role (the list is Staff & Roles' invite list). A role change may
// make someone an Owner: core allows it today (Staff & Roles offers it), the path is the Owner's alone
// (so `staff_owner_grant` cannot trip here), and core then fixes that role as it fixes every Owner's.

import { STAFF_ROLES } from './constants';
import { staffChangeFor } from './staff-guard';
import type { StaffChange } from './staff-guard';
import type { StaffRole } from './types';

/** How long a staff change's confirm token lasts: Roles & Permissions' five minutes. */
export const STAFF_CONFIRM_TTL_MS = 5 * 60_000;

/** The roles an invite offers: every role but Owner, as Staff & Roles' invite. */
export const STAFF_INVITE_ROLES: readonly StaffRole[] = STAFF_ROLES.filter((r) => r !== 'Owner');

/** What the Owner asks for: an invite (with its address), or a staff member's new role. */
export type StaffConsoleRequest = { kind: 'invite'; email: string; role: StaffRole } | { kind: 'role'; id: string; role: StaffRole };

/** A request, read: core's mutation and its arguments, and the change as D-171's guards read it. */
export type StaffConsoleWrite =
  | { request: Extract<StaffConsoleRequest, { kind: 'invite' }>; name: 'inviteStaff'; args: { email: string; role: StaffRole }; change: StaffChange }
  | { request: Extract<StaffConsoleRequest, { kind: 'role' }>; name: 'setStaffRole'; args: { id: string; role: StaffRole }; change: StaffChange };

const isRole = (v: unknown, list: readonly StaffRole[]): v is StaffRole => typeof v === 'string' && (list as readonly string[]).includes(v);

/** A request body as a write, or null when it is malformed (the API's 400 `invalid_query`). */
export function readStaffConsoleRequest(input: unknown): StaffConsoleWrite | null {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (b.kind === 'invite') {
    if (typeof b.email !== 'string' || b.email.trim() === '' || b.email.length > 254 || !isRole(b.role, STAFF_INVITE_ROLES)) return null;
    const args = { email: b.email.trim(), role: b.role };
    return { request: { kind: 'invite', ...args }, name: 'inviteStaff', args, change: staffChangeFor('inviteStaff', args) };
  }
  if (b.kind !== 'role' || typeof b.id !== 'string' || b.id === '' || b.id.length > 200 || !isRole(b.role, STAFF_ROLES)) return null;
  const args = { id: b.id, role: b.role };
  return { request: { kind: 'role', ...args }, name: 'setStaffRole', args, change: staffChangeFor('setStaffRole', args) };
}

/** What `POST /api/console/staff/preview` answers: the change, its words, and the token that confirms it. */
export interface StaffChangePreview {
  change: StaffConsoleRequest;
  before: StaffRole | null;
  title: string;
  body: string;
  cta: string;
  confirmToken: string;
  expiresAt: number;
}

/** The sentence for a role change that changes nothing (the API's 400). */
export const STAFF_UNCHANGED = 'They already have that role.';

/** The confirm's words for a change (new strings, D-172; the mockup draws neither dialog). */
export function staffConfirmCopy(request: StaffConsoleRequest, name: string | null, before: StaffRole | null): { title: string; body: string; cta: string } {
  if (request.kind === 'invite') {
    return {
      title: `Invite ${request.email} as ${request.role}?`,
      body: `They join staff as ${request.role} right away. No email is sent.`,
      cta: 'Invite staff',
    };
  }
  return {
    title: `Change ${name ?? 'this staff member'} to ${request.role}?`,
    body:
      request.role === 'Owner'
        ? `${before ?? 'Their role'} to Owner. An Owner’s role can’t be changed again here.`
        : `${before ?? 'Their role'} to ${request.role}. It applies right away.`,
    cta: 'Change role',
  };
}
