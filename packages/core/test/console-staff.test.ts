// D-172: Roles & Permissions' Invite staff and Change role… read their request and word their confirm
// here; the guards are D-171's (`staff-guard.ts`, tested in `staff-guard.test.ts`), and this checks they
// are the ones the Console's path reads. Typed out by hand, so a change to a word is a red test.
import { describe, expect, it } from 'vitest';
import {
  AUDIT_IDS_MAX,
  CONSOLE_ERRORS,
  STAFF_CONFIRM_TTL_MS,
  STAFF_INVITE_ROLES,
  STAFF_UNCHANGED,
  checkStaffChange,
  readStaffConsoleRequest,
  staffConfirmCopy,
} from '../src';

describe('Invite staff and Change role… (D-172) @console', () => {
  it('an invite offers every role but Owner, and reads as core’s inviteStaff', () => {
    expect(STAFF_INVITE_ROLES).toEqual(['Admin', 'Instructor', 'Content Editor', 'Support']);
    expect(readStaffConsoleRequest({ kind: 'invite', email: ' new@x.co ', role: 'Support' })).toEqual({
      request: { kind: 'invite', email: 'new@x.co', role: 'Support' },
      name: 'inviteStaff',
      args: { email: 'new@x.co', role: 'Support' },
      change: { kind: 'invite', role: 'Support' },
    });
    for (const bad of [
      { kind: 'invite', email: 'new@x.co', role: 'Owner' },
      { kind: 'invite', email: '', role: 'Support' },
      { kind: 'invite', email: 'a'.repeat(255), role: 'Support' },
      { kind: 'invite', role: 'Support' },
      { kind: 'role', id: '', role: 'Admin' },
      { kind: 'role', id: 'st2', role: 'Boss' },
      { kind: 'role', staffId: 'st2', role: 'Admin' },
      { kind: 'nope' },
      null,
    ]) {
      expect(readStaffConsoleRequest(bad)).toBeNull();
    }
  });

  it('a role change reads as core’s setStaffRole, and D-171’s guards decide it', () => {
    const w = readStaffConsoleRequest({ kind: 'role', id: 'st2', role: 'Owner' })!;
    expect(w).toEqual({ request: { kind: 'role', id: 'st2', role: 'Owner' }, name: 'setStaffRole', args: { id: 'st2', role: 'Owner' }, change: { kind: 'role', id: 'st2', role: 'Owner' } });
    const staff = [
      { id: 'st1', name: 'Casey Lin', role: 'Owner' as const },
      { id: 'st2', name: 'Jordan Hale', role: 'Instructor' as const },
    ];
    // The Owner may make someone an Owner (core allows it; listed in D-172), never change their own role.
    expect(checkStaffChange(staff, 'st1', w.change)).toEqual({ ok: true });
    expect(checkStaffChange(staff, 'st1', readStaffConsoleRequest({ kind: 'role', id: 'st1', role: 'Admin' })!.change)).toEqual({ ok: false, code: 'staff_self_change' });
    expect(checkStaffChange(staff, 'st2', readStaffConsoleRequest({ kind: 'role', id: 'st1', role: 'Admin' })!.change)).toEqual({ ok: false, code: 'staff_last_owner' });
  });

  it('has its words, its two refusals of its own, and the export’s id limit', () => {
    expect(staffConfirmCopy({ kind: 'invite', email: 'new@x.co', role: 'Support' }, null, null)).toEqual({
      title: 'Invite new@x.co as Support?',
      body: 'They join staff as Support right away. No email is sent.',
      cta: 'Invite staff',
    });
    expect(staffConfirmCopy({ kind: 'role', id: 'st2', role: 'Admin' }, 'Jordan Hale', 'Instructor')).toEqual({
      title: 'Change Jordan Hale to Admin?',
      body: 'Instructor to Admin. It applies right away.',
      cta: 'Change role',
    });
    expect(staffConfirmCopy({ kind: 'role', id: 'st2', role: 'Owner' }, null, null)).toEqual({
      title: 'Change this staff member to Owner?',
      body: 'Their role to Owner. An Owner’s role can’t be changed again here.',
      cta: 'Change role',
    });
    expect(STAFF_UNCHANGED).toBe('They already have that role.');
    expect(CONSOLE_ERRORS.staff_stale).toEqual({ status: 409, message: 'Someone changed staff since you opened this. Close this and try again.' });
    expect(CONSOLE_ERRORS.staff_invalid).toEqual({ status: 422, message: null });
    // D-171's, reused, not repeated.
    expect(CONSOLE_ERRORS.staff_self_change.message).toBe('You can’t change your own role or remove yourself.');
    expect(STAFF_CONFIRM_TTL_MS).toBe(300_000);
    expect(AUDIT_IDS_MAX).toBe(500);
  });
});
