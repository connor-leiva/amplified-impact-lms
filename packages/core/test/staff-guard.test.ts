// The guards on staff role assignment (D-171): never your own role, never yourself, never the last
// Owner, the Owner role only from an Owner; and what each write changed, for its audit row. Pure, so
// the rules are pinned here once; `apps/api/test/staff-writes.test.ts` runs them over HTTP.
import { describe, expect, it } from 'vitest';
import * as M from '../src/mutations';
import {
  AUDIT_ACTIONS,
  CONSOLE_ERRORS,
  STAFF_AUDIT_ACTION,
  STAFF_GUARD_ERRORS,
  STAFF_WRITES,
  checkStaffChange,
  isStaffWrite,
  leavesNoOwner,
  ownerCount,
  seedForDatabase,
  staffChangeFor,
  staffChangeOf,
} from '../src/index';
import type { Db, Staff, StaffRole } from '../src/index';

const member = (id: string, role: StaffRole, name = id.toUpperCase()): Staff => ({ id, name, email: `${id}@amplifiedimpact.com`, role, last: null });

/** One Owner (st1), an Admin (st_admin), an Instructor (st2) and Support (st4). */
const STAFF: Staff[] = [member('st1', 'Owner', 'Casey Lin'), member('st_admin', 'Admin', 'Dana Reyes'), member('st2', 'Instructor', 'Jordan Hale'), member('st4', 'Support', 'Luis Romero')];
/** The same, with a second Owner (st2). */
const TWO_OWNERS: Staff[] = STAFF.map((s) => (s.id === 'st2' ? { ...s, role: 'Owner' } : s));

describe('the staff writes and their words (D-171)', () => {
  it('covers exactly the three staff-assignment mutations, each a real mutation', () => {
    expect([...STAFF_WRITES]).toEqual(['inviteStaff', 'setStaffRole', 'removeStaff']);
    for (const name of STAFF_WRITES) expect(typeof (M as Record<string, unknown>)[name]).toBe('function');
    expect(isStaffWrite('setStaffRole')).toBe(true);
    expect(isStaffWrite('togglePermission')).toBe(false);
    expect(isStaffWrite('toString')).toBe(false);
  });

  it('each write has its audit action, and every one is in the closed list', () => {
    expect(STAFF_AUDIT_ACTION).toEqual({ setStaffRole: 'staff.role_change', removeStaff: 'staff.remove', inviteStaff: 'staff.invite' });
    for (const a of Object.values(STAFF_AUDIT_ACTION)) expect(AUDIT_ACTIONS).toContain(a);
  });

  it('each refusal is a 403 with one sentence, and a Console error code too', () => {
    expect(STAFF_GUARD_ERRORS).toEqual({
      staff_self_change: { status: 403, message: 'You can’t change your own role or remove yourself.' },
      staff_last_owner: { status: 403, message: 'There must always be at least one Owner.' },
      staff_owner_grant: { status: 403, message: 'Only the Owner can make someone an Owner.' },
    });
    for (const [code, def] of Object.entries(STAFF_GUARD_ERRORS)) expect(CONSOLE_ERRORS[code as keyof typeof CONSOLE_ERRORS]).toEqual(def);
  });

  it('reads a write’s arguments as a change', () => {
    expect(staffChangeFor('setStaffRole', { id: 'st2', role: 'Admin' })).toEqual({ kind: 'role', id: 'st2', role: 'Admin' });
    expect(staffChangeFor('removeStaff', { id: 'st4' })).toEqual({ kind: 'remove', id: 'st4' });
    expect(staffChangeFor('inviteStaff', { email: 'new@amplifiedimpact.com', role: 'Support' })).toEqual({ kind: 'invite', role: 'Support' });
  });
});

describe('checkStaffChange: nobody changes their own role or removes themselves', () => {
  it('refuses a role change to yourself, for every role and every role asked for (even the same one)', () => {
    for (const me of STAFF)
      for (const role of ['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support'] as StaffRole[])
        expect(checkStaffChange(STAFF, me.id, { kind: 'role', id: me.id, role }), `${me.id} → ${role}`).toEqual({ ok: false, code: 'staff_self_change' });
  });

  it('refuses removing yourself, the Owner included', () => {
    for (const me of STAFF) expect(checkStaffChange(STAFF, me.id, { kind: 'remove', id: me.id })).toEqual({ ok: false, code: 'staff_self_change' });
  });

  it('lets you change and remove someone else', () => {
    expect(checkStaffChange(STAFF, 'st1', { kind: 'role', id: 'st2', role: 'Admin' })).toEqual({ ok: true });
    expect(checkStaffChange(STAFF, 'st_admin', { kind: 'remove', id: 'st4' })).toEqual({ ok: true });
  });
});

describe('checkStaffChange: no change leaves zero Owners', () => {
  it('refuses demoting the only Owner, to every other role, whoever asks', () => {
    for (const role of ['Admin', 'Instructor', 'Content Editor', 'Support'] as StaffRole[])
      expect(checkStaffChange(STAFF, 'st_admin', { kind: 'role', id: 'st1', role })).toEqual({ ok: false, code: 'staff_last_owner' });
  });

  it('refuses removing the only Owner', () => {
    expect(checkStaffChange(STAFF, 'st_admin', { kind: 'remove', id: 'st1' })).toEqual({ ok: false, code: 'staff_last_owner' });
  });

  it('with a second Owner, the guard lets it through (core’s own refusal of any Owner change still applies)', () => {
    expect(checkStaffChange(TWO_OWNERS, 'st1', { kind: 'role', id: 'st2', role: 'Admin' })).toEqual({ ok: true });
    expect(checkStaffChange(TWO_OWNERS, 'st1', { kind: 'remove', id: 'st2' })).toEqual({ ok: true });
  });

  it('setting an Owner to Owner, or naming someone who is not there, is not its business', () => {
    expect(checkStaffChange(STAFF, 'st1', { kind: 'role', id: 'st_gone', role: 'Admin' })).toEqual({ ok: true });
    expect(checkStaffChange(TWO_OWNERS, 'st1', { kind: 'role', id: 'st2', role: 'Owner' })).toEqual({ ok: true });
  });

  it('counts Owners, and sees a result with none left, whatever produced it', () => {
    expect(ownerCount(STAFF)).toBe(1);
    expect(ownerCount(TWO_OWNERS)).toBe(2);
    const demoted = STAFF.map((s) => (s.role === 'Owner' ? { ...s, role: 'Admin' as const } : s));
    expect(leavesNoOwner(STAFF, demoted)).toBe(true);
    expect(leavesNoOwner(STAFF, STAFF.filter((s) => s.role !== 'Owner'))).toBe(true);
    expect(leavesNoOwner(TWO_OWNERS, STAFF)).toBe(false);
    expect(leavesNoOwner(STAFF, STAFF)).toBe(false);
    // A list that had no Owner to begin with is not made worse by a change.
    expect(leavesNoOwner(demoted, demoted)).toBe(false);
  });
});

describe('checkStaffChange: only an Owner makes someone an Owner', () => {
  it('refuses a non-Owner setting or inviting the Owner role', () => {
    for (const me of ['st_admin', 'st2', 'st4']) {
      expect(checkStaffChange(STAFF, me, { kind: 'role', id: 'st4' === me ? 'st2' : 'st4', role: 'Owner' })).toEqual({ ok: false, code: 'staff_owner_grant' });
      expect(checkStaffChange(STAFF, me, { kind: 'invite', role: 'Owner' })).toEqual({ ok: false, code: 'staff_owner_grant' });
    }
    // An actor not on the list is not an Owner.
    expect(checkStaffChange(STAFF, 'st_unknown', { kind: 'invite', role: 'Owner' })).toEqual({ ok: false, code: 'staff_owner_grant' });
  });

  it('lets the Owner grant and invite the Owner role (core allows it; D-171 audits it)', () => {
    expect(checkStaffChange(STAFF, 'st1', { kind: 'role', id: 'st2', role: 'Owner' })).toEqual({ ok: true });
    expect(checkStaffChange(STAFF, 'st1', { kind: 'invite', role: 'Owner' })).toEqual({ ok: true });
  });

  it('lets anyone invite to any other role (who may call it at all is core’s `staff` check)', () => {
    expect(checkStaffChange(STAFF, 'st4', { kind: 'invite', role: 'Admin' })).toEqual({ ok: true });
  });

  it('checks in order: yourself first, then the last Owner, then the grant', () => {
    expect(checkStaffChange(STAFF, 'st1', { kind: 'role', id: 'st1', role: 'Admin' })).toEqual({ ok: false, code: 'staff_self_change' });
    expect(checkStaffChange(STAFF, 'st_admin', { kind: 'role', id: 'st_admin', role: 'Owner' })).toEqual({ ok: false, code: 'staff_self_change' });
    expect(checkStaffChange(STAFF, 'st_admin', { kind: 'remove', id: 'st1' })).toEqual({ ok: false, code: 'staff_last_owner' });
  });
});

describe('staffChangeOf: what a write changed, from core’s own result', () => {
  const ctx = { now: 0, id: (p: string) => `${p}_new` };
  const db = (): Db => {
    const d = seedForDatabase('live');
    d.staff = structuredClone(STAFF);
    return d;
  };
  const owner = { kind: 'staff' as const, staffId: 'st1' };

  it('a role change: the member by id and name, the role before and after', () => {
    const before = db();
    const out = M.setStaffRole(before, owner, { id: 'st2', role: 'Admin' }, ctx);
    expect(staffChangeOf({ kind: 'role', id: 'st2', role: 'Admin' }, before.staff, out.db.staff)).toEqual({
      action: 'staff.role_change',
      target: { id: 'st2', label: 'Jordan Hale' },
      before: { role: 'Instructor' },
      after: { role: 'Admin' },
    });
  });

  it('a removal: the role before, none after', () => {
    const before = db();
    const out = M.removeStaff(before, owner, { id: 'st4' }, ctx);
    expect(staffChangeOf({ kind: 'remove', id: 'st4' }, before.staff, out.db.staff)).toEqual({
      action: 'staff.remove',
      target: { id: 'st4', label: 'Luis Romero' },
      before: { role: 'Support' },
      after: { role: null },
    });
  });

  it('an invite: the new member by id and name (never the email), no role before', () => {
    const before = db();
    const out = M.inviteStaff(before, owner, { email: 'pat.quinn@amplifiedimpact.com', role: 'Support' }, ctx);
    const record = staffChangeOf({ kind: 'invite', role: 'Support' }, before.staff, out.db.staff);
    expect(record).toEqual({ action: 'staff.invite', target: { id: 'st_new', label: 'Pat Quinn' }, before: { role: null }, after: { role: 'Support' } });
    expect(JSON.stringify(record)).not.toContain('@');
  });

  it('nothing changed, nothing to record: the same role, core’s “The owner can’t be removed”, a refused invite', () => {
    const before = db();
    const same = M.setStaffRole(before, owner, { id: 'st2', role: 'Instructor' }, ctx);
    expect(staffChangeOf({ kind: 'role', id: 'st2', role: 'Instructor' }, before.staff, same.db.staff)).toBeNull();
    const two = db();
    two.staff = structuredClone(TWO_OWNERS);
    const kept = M.removeStaff(two, owner, { id: 'st2' }, ctx);
    expect(kept.toast).toEqual({ msg: 'The owner can’t be removed', tone: 'info' });
    expect(staffChangeOf({ kind: 'remove', id: 'st2' }, two.staff, kept.db.staff)).toBeNull();
    const dup = M.inviteStaff(before, owner, { email: 'st2@amplifiedimpact.com', role: 'Support' }, ctx);
    expect(dup.error).toBe('That person is already on staff.');
    expect(staffChangeOf({ kind: 'invite', role: 'Support' }, before.staff, dup.db.staff)).toBeNull();
    expect(staffChangeOf({ kind: 'remove', id: 'st_gone' }, before.staff, before.staff)).toBeNull();
  });
});

describe('what core allows today, which these guards sit in front of (D-171, unchanged)', () => {
  const ctx = { now: 0, id: (p: string) => `${p}_new` };
  const withStaffPerm = (): Db => {
    const d = seedForDatabase('live');
    d.staff = structuredClone(STAFF);
    d.perms.Admin.staff = 1;
    return d;
  };
  const admin = { kind: 'staff' as const, staffId: 'st_admin' };

  it('a non-Owner holding `staff` may change their own role, and set or invite the Owner role', () => {
    const d = withStaffPerm();
    expect(M.setStaffRole(d, admin, { id: 'st_admin', role: 'Owner' }, ctx).db.staff.find((s) => s.id === 'st_admin')!.role).toBe('Owner');
    expect(M.setStaffRole(d, admin, { id: 'st2', role: 'Owner' }, ctx).db.staff.find((s) => s.id === 'st2')!.role).toBe('Owner');
    expect(M.inviteStaff(d, admin, { email: 'new@amplifiedimpact.com', role: 'Owner' }, ctx).db.staff.at(-1)!.role).toBe('Owner');
    expect(M.removeStaff(d, admin, { id: 'st_admin' }, ctx).db.staff.some((s) => s.id === 'st_admin')).toBe(false);
  });

  it('core refuses any change to an Owner, by anyone: a 403 for a role, an info toast for a removal', () => {
    const d = withStaffPerm();
    expect(() => M.setStaffRole(d, admin, { id: 'st1', role: 'Admin' }, ctx)).toThrow('The owner’s role is fixed.');
    const out = M.removeStaff(d, admin, { id: 'st1' }, ctx);
    expect(out.db).toBe(d);
    expect(out.toast).toEqual({ msg: 'The owner can’t be removed', tone: 'info' });
  });
});
