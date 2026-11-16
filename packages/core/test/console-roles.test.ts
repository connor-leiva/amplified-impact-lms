// Roles & Permissions, editable (D-160 R2-3b, Connor, Nov 16, 2026, 8:27 AM MST): `CONSOLE_CAPS` is the
// ceiling, the Owner's stored changes only take rows away (or give them back), and the guards in
// `checkRoleChange` refuse everything else. Typed out by hand, so a change to the rules is a red test.
import { describe, expect, it } from 'vitest';
import {
  CONSOLE_CAP_KEYS,
  CONSOLE_ERRORS,
  EDITABLE_ROLES,
  ROLES_R2_ROWS,
  ROLE_ROW_KEYS,
  checkRoleChange,
  consoleCan,
  consoleCanWith,
  consoleCaps,
  consoleCapsWith,
  permissionChangeSummary,
  permissionConfirmCopy,
  roleRowAllowed,
  roleRowCeiling,
  rolesMatrix,
} from '../src/index';
import type { RoleGrant } from '../src/index';

const row = (k: string) => ROLES_R2_ROWS.find((r) => r.key === k)!;
const off = (role: 'Admin' | 'Support', capability: RoleGrant['capability']): RoleGrant => ({ role, capability, allowed: false });

describe('the matrix rows (the mockup’s PERMS0) @console', () => {
  it('are the nine rows, in order, each Console capability in one row at most', () => {
    expect(ROLES_R2_ROWS.map((r) => r.key)).toEqual([...ROLE_ROW_KEYS]);
    const caps = ROLES_R2_ROWS.flatMap((r) => r.caps ?? []);
    expect(new Set(caps).size).toBe(caps.length);
    for (const c of caps) expect(CONSOLE_CAP_KEYS).toContain(c);
    expect(row('staff').caps).toEqual(['roles.write']);
    expect(row('build').caps).toBeUndefined();
  });

  it('the ceiling: Admin may hold every row but the last; Support the two it shares and build', () => {
    const ceiling = (role: string) => ROLES_R2_ROWS.map((r) => roleRowCeiling(r, role));
    expect(ceiling('Owner')).toEqual([true, true, true, true, true, true, true, true, true]);
    // `build` is the PermKey matrix's (Staff & Roles), which has no ceiling.
    expect(ceiling('Admin')).toEqual([true, true, true, true, true, true, true, true, false]);
    // Support: no masquerade, refund, jobs, export or ops (D1/D2, D3, D6), never this matrix.
    expect(ceiling('Support')).toEqual([true, false, true, true, false, false, false, false, false]);
  });
});

describe('consoleCanWith: the ceiling AND NOT removed @console', () => {
  it('with nothing stored is consoleCan exactly, for every role and capability', () => {
    for (const role of ['Owner', 'Admin', 'Support', 'Instructor', 'Content Editor', null, 'Superuser'])
      for (const cap of [...CONSOLE_CAP_KEYS, 'nope']) expect(consoleCanWith([], role, cap), `${role} ${cap}`).toBe(consoleCan(role, cap));
  });

  it('a removal takes every capability of the row from that role only', () => {
    const g = [off('Admin', 'masq')];
    expect(consoleCanWith(g, 'Admin', 'masquerade.start')).toBe(false);
    expect(consoleCanWith(g, 'Admin', 'masquerade.extend')).toBe(false);
    expect(consoleCanWith(g, 'Admin', 'billing.refund')).toBe(true);
    expect(consoleCanWith(g, 'Owner', 'masquerade.start')).toBe(true);
    expect(consoleCapsWith(g, 'Admin')).toEqual(consoleCaps('Admin').filter((c) => !c.startsWith('masquerade.')));
  });

  it('a stored "allowed" never lifts a role past the ceiling', () => {
    const g: RoleGrant[] = [
      { role: 'Support', capability: 'export', allowed: true },
      { role: 'Support', capability: 'refund', allowed: true },
      { role: 'Admin', capability: 'staff', allowed: true },
    ];
    expect(consoleCanWith(g, 'Support', 'export')).toBe(false);
    expect(consoleCanWith(g, 'Support', 'billing.refund')).toBe(false);
    expect(consoleCanWith(g, 'Admin', 'roles.write')).toBe(false);
    expect(consoleCapsWith(g, 'Support')).toEqual(consoleCaps('Support'));
  });

  it('a capability in no row is never removable', () => {
    const g = ROLE_ROW_KEYS.flatMap((k) => EDITABLE_ROLES.map((r) => off(r, k)));
    for (const cap of ['console.view', 'audit.read', 'users.read', 'notes.write', 'flags.write'])
      expect(consoleCanWith(g, 'Admin', cap), cap).toBe(consoleCan('Admin', cap));
  });

  it('unknown roles still fail closed; the Owner always passes', () => {
    const g = ROLE_ROW_KEYS.flatMap((k) => EDITABLE_ROLES.map((r) => off(r, k)));
    for (const role of ['Instructor', 'Superuser', null]) expect(consoleCapsWith(g, role)).toEqual([]);
    expect(consoleCapsWith(g, 'Owner')).toEqual(CONSOLE_CAP_KEYS);
  });

  it('a row’s answer is every capability and every PermKey in it', () => {
    const perms = { Admin: { curriculum: 1, publish: 1, cohorts: 1, announce: 1, staff: 1 }, Support: { curriculum: 1, publish: 0, cohorts: 1, announce: 1 } };
    expect(roleRowAllowed([off('Support', 'account')], perms, row('account'), 'Support')).toBe(false);
    expect(roleRowAllowed([], perms, row('account'), 'Support')).toBe(true);
    expect(roleRowAllowed([], perms, row('build'), 'Admin')).toBe(true);
    expect(roleRowAllowed([], perms, row('build'), 'Support')).toBe(false);
    // The last row needs `roles.write`, which only the Owner has, whatever the PermKey matrix says.
    expect(roleRowAllowed([], perms, row('staff'), 'Admin')).toBe(false);
    expect(roleRowAllowed([], {}, row('build'), 'Owner')).toBe(true);
  });

  it('the matrix the API answers carries the effective answer, the ceiling and the stored changes', () => {
    const m = rolesMatrix([off('Admin', 'export')]);
    const exp = m.caps.find((c) => c.cap === 'export')!;
    expect(exp.allowed).toEqual({ Owner: true, Admin: false, Support: false });
    expect(exp.ceiling).toEqual({ Owner: true, Admin: true, Support: false });
    expect(m.grants).toEqual([{ role: 'Admin', capability: 'export', allowed: false }]);
  });
});

describe('checkRoleChange: the guards (D-160 R2-3b) @console', () => {
  const SEED_PERMS = { Admin: { curriculum: 1, publish: 1, cohorts: 1, announce: 1 }, Support: { curriculum: 0, publish: 0, cohorts: 0, announce: 0 } };
  const ok = { viewerRole: 'Owner', grants: [] as RoleGrant[], perms: SEED_PERMS };

  it('takes a row from Admin, and gives it back', () => {
    expect(checkRoleChange({ ...ok, role: 'Admin', capability: 'masq', allowed: false })).toMatchObject({ ok: true, role: 'Admin', before: true, after: false });
    expect(checkRoleChange({ ...ok, grants: [off('Admin', 'masq')], role: 'Admin', capability: 'masq', allowed: true })).toMatchObject({
      ok: true,
      before: false,
      after: true,
    });
    expect(checkRoleChange({ ...ok, role: 'Support', capability: 'billview', allowed: false })).toMatchObject({ ok: true, before: true, after: false });
  });

  it('the Owner’s column never changes, nor does a role outside the matrix', () => {
    for (const role of ['Owner', 'Instructor', 'Content Editor', 'admin', '', null, 7])
      for (const allowed of [true, false]) expect(checkRoleChange({ ...ok, role, capability: 'masq', allowed })).toEqual({ ok: false, code: 'role_fixed' });
  });

  it('refuses a permission that is no row of the matrix', () => {
    for (const capability of ['masquerade.start', 'roles', '', null, 'constructor'])
      expect(checkRoleChange({ ...ok, role: 'Admin', capability, allowed: false })).toEqual({ ok: false, code: 'invalid_query' });
  });

  it('the build row is the PermKey matrix’s: on only when all four are, either way for Admin and Support', () => {
    expect(checkRoleChange({ ...ok, role: 'Admin', capability: 'build', allowed: false })).toMatchObject({ ok: true, before: true, after: false });
    expect(checkRoleChange({ ...ok, role: 'Support', capability: 'build', allowed: true })).toMatchObject({ ok: true, before: false, after: true });
    const some = { ...SEED_PERMS, Admin: { curriculum: 1, publish: 0, cohorts: 1, announce: 1 } };
    expect(checkRoleChange({ ...ok, perms: some, role: 'Admin', capability: 'build', allowed: true })).toMatchObject({ ok: true, before: false });
    expect(checkRoleChange({ ...ok, role: 'Admin', capability: 'build', allowed: true })).toEqual({ ok: false, code: 'no_change' });
  });

  it('never grants past the ceiling: fixed by product rules, either way', () => {
    for (const capability of ['masq', 'refund', 'jobs', 'export', 'ops', 'staff'])
      for (const allowed of [true, false])
        expect(checkRoleChange({ ...ok, role: 'Support', capability, allowed }), `${capability} ${allowed}`).toEqual({ ok: false, code: 'fixed_by_product' });
    expect(checkRoleChange({ ...ok, role: 'Admin', capability: 'staff', allowed: true })).toEqual({ ok: false, code: 'fixed_by_product' });
  });

  it('nobody removes their own access to this screen', () => {
    // Only the Owner may write, and the Owner's column is fixed; if `roles.write` ever reached Admin,
    // an Admin still could not take the rows that reach or edit Roles from Admin.
    expect(checkRoleChange({ ...ok, viewerRole: 'Admin', role: 'Admin', capability: 'ops', allowed: false })).toEqual({ ok: false, code: 'self_lockout' });
    expect(checkRoleChange({ ...ok, viewerRole: 'Admin', role: 'Admin', capability: 'masq', allowed: false })).toMatchObject({ ok: true });
    expect(checkRoleChange({ ...ok, viewerRole: 'Admin', role: 'Admin', capability: 'ops', allowed: true, grants: [off('Admin', 'ops')] })).toMatchObject({ ok: true });
    expect(checkRoleChange({ ...ok, viewerRole: 'Owner', role: 'Admin', capability: 'ops', allowed: false })).toMatchObject({ ok: true });
  });

  it('a change must change something', () => {
    expect(checkRoleChange({ ...ok, role: 'Admin', capability: 'masq', allowed: true })).toEqual({ ok: false, code: 'no_change' });
    expect(checkRoleChange({ ...ok, grants: [off('Admin', 'masq')], role: 'Admin', capability: 'masq', allowed: false })).toEqual({ ok: false, code: 'no_change' });
  });

  it('every refusal is a Console error code with a sentence', () => {
    for (const code of ['role_fixed', 'invalid_query', 'fixed_by_product', 'self_lockout', 'no_change', 'grant_stale', 'confirm_invalid', 'confirm_expired'] as const)
      expect(CONSOLE_ERRORS[code].message, code).toMatch(/\.$/);
    expect(CONSOLE_ERRORS.confirm_invalid.status).toBe(403);
    expect(CONSOLE_ERRORS.confirm_expired.status).toBe(410);
    expect(CONSOLE_ERRORS.grant_stale.status).toBe(409);
  });
});

describe('the mockup’s words @console', () => {
  it('the confirm, both ways', () => {
    expect(permissionConfirmCopy('Start and extend masquerade', 'Admin', true)).toEqual({
      title: 'Remove this permission from Admin?',
      body: 'Start and extend masquerade. Applies to every Admin on staff right away.',
      cta: 'Remove permission',
    });
    expect(permissionConfirmCopy('View billing', 'Support', false)).toEqual({
      title: 'Give this permission to Support?',
      body: 'View billing. Applies to every Support on staff right away.',
      cta: 'Allow',
    });
  });

  it('the audit detail', () => {
    expect(permissionChangeSummary('Refund or void an invoice', true, false)).toBe('Refund or void an invoice: allowed to not allowed.');
    expect(permissionChangeSummary('View billing', false, true)).toBe('View billing: not allowed to allowed.');
  });
});
