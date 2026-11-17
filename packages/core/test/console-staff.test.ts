// D-172: Roles & Permissions' Invite staff and Change role… guards (`checkStaffConsoleChange`). Typed
// out by hand, so a change to a rule or a sentence is a red test.
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  AUDIT_IDS_MAX,
  CONSOLE_ERRORS,
  STAFF_CONFIRM_TTL_MS,
  STAFF_INVITE_ROLES,
  checkStaffConsoleChange,
  ownersOf,
  staffConfirmCopy,
} from '../src';
import type { Staff } from '../src';

const STAFF: Pick<Staff, 'id' | 'name' | 'role'>[] = [
  { id: 'st1', name: 'Casey Lin', role: 'Owner' },
  { id: 'st2', name: 'Jordan Hale', role: 'Instructor' },
  { id: 'st4', name: 'Luis Romero', role: 'Support' },
];

describe('Invite staff and Change role… (D-172) @console', () => {
  it('an invite offers every role but Owner, and passes with an address and a role', () => {
    expect(STAFF_INVITE_ROLES).toEqual(['Admin', 'Instructor', 'Content Editor', 'Support']);
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'invite', email: ' new@x.co ', role: 'Support' })).toEqual({
      ok: true,
      change: { kind: 'invite', email: 'new@x.co', role: 'Support' },
      before: null,
      name: null,
    });
    for (const bad of [
      { kind: 'invite', email: 'new@x.co', role: 'Owner' },
      { kind: 'invite', email: '', role: 'Support' },
      { kind: 'invite', email: 'a'.repeat(255), role: 'Support' },
      { kind: 'invite', role: 'Support' },
      { kind: 'nope' },
      null,
    ]) {
      expect(checkStaffConsoleChange(STAFF, 'st1', bad)).toEqual({ ok: false, code: 'invalid_query' });
    }
  });

  it('a role change names who it changes, from what', () => {
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'role', staffId: 'st2', role: 'Admin' })).toEqual({
      ok: true,
      change: { kind: 'role', staffId: 'st2', role: 'Admin' },
      before: 'Instructor',
      name: 'Jordan Hale',
    });
    // Core lets a role change make someone an Owner today, so this path does too (listed in D-172).
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'role', staffId: 'st4', role: 'Owner' }).ok).toBe(true);
  });

  it('refuses your own role, the last Owner, no change, and a stranger', () => {
    expect(checkStaffConsoleChange(STAFF, 'st2', { kind: 'role', staffId: 'st2', role: 'Admin' })).toEqual({ ok: false, code: 'staff_self_change' });
    expect(checkStaffConsoleChange(STAFF, 'st2', { kind: 'role', staffId: 'st1', role: 'Admin' })).toEqual({ ok: false, code: 'staff_last_owner' });
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'role', staffId: 'st4', role: 'Support' })).toEqual({ ok: false, code: 'staff_unchanged' });
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'role', staffId: 'nope', role: 'Admin' })).toEqual({ ok: false, code: 'invalid_query' });
    expect(checkStaffConsoleChange(STAFF, 'st1', { kind: 'role', staffId: 'st2', role: 'Boss' })).toEqual({ ok: false, code: 'invalid_query' });
    // With a second Owner, the guard lets it through; core's setStaffRole still fixes every Owner's role.
    const two = [...STAFF, { id: 'st9', name: 'Kai Moreno', role: 'Owner' as const }];
    expect(ownersOf(two)).toBe(2);
    expect(checkStaffConsoleChange(two, 'st1', { kind: 'role', staffId: 'st9', role: 'Admin' }).ok).toBe(true);
  });

  it('has its words, its errors and its audit actions', () => {
    expect(staffConfirmCopy({ kind: 'invite', email: 'new@x.co', role: 'Support' }, null, null)).toEqual({
      title: 'Invite new@x.co as Support?',
      body: 'They join staff as Support right away. No email is sent.',
      cta: 'Invite staff',
    });
    expect(staffConfirmCopy({ kind: 'role', staffId: 'st2', role: 'Admin' }, 'Jordan Hale', 'Instructor')).toEqual({
      title: 'Change Jordan Hale to Admin?',
      body: 'Instructor to Admin. It applies right away.',
      cta: 'Change role',
    });
    expect(staffConfirmCopy({ kind: 'role', staffId: 'st2', role: 'Owner' }, null, null).body).toBe('Their role to Owner. An Owner’s role can’t be changed again here.');
    expect(staffConfirmCopy({ kind: 'role', staffId: 'st2', role: 'Owner' }, null, null).title).toBe('Change this staff member to Owner?');
    expect(CONSOLE_ERRORS.staff_self_change.message).toBe('You can’t change your own role or remove yourself.');
    expect(CONSOLE_ERRORS.staff_last_owner.message).toBe('There must always be at least one Owner.');
    expect(CONSOLE_ERRORS.staff_unchanged).toEqual({ status: 409, message: 'They already have that role.' });
    expect(CONSOLE_ERRORS.staff_invalid.status).toBe(422);
    expect(AUDIT_ACTIONS).toEqual(expect.arrayContaining(['staff.invite', 'staff.role_change']));
    expect(STAFF_CONFIRM_TTL_MS).toBe(300_000);
    expect(AUDIT_IDS_MAX).toBe(500);
  });
});
