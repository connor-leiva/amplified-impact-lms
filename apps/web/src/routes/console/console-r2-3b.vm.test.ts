import { describe, expect, it } from 'vitest';
import { CONSOLE_CAP_KEYS, FIXED_BY_PRODUCT, ROLES_R2_ROWS, consoleCan, rolesMatrix, seed } from '@ai/core';
import type { AuditRow } from '@ai/core';
import { parityAuditRows, parityDb } from '../../data/parity-r2-db';
import { AUDIT0 } from '../../data/parity-r2';
import { RANGE_OPTIONS_R2, OUTCOME_OPTIONS_R2, actionOptionsR2, actorOptionsR2, detailOf, detailR2, rowR2 } from './AuditLog.vm';
import { ROLES_R2_COPY, rolesMatrixR2, rolesStaffR2 } from './Roles.vm';

// D-160 R2-3b: the Audit Log and Roles & Permissions view-models of the Admin redesign R2. On the
// parity data they print the mockup's words (its pixels are proved by `pnpm parity:admin-r2`); the
// matrix is read from `CONSOLE_CAPS` and the snapshot's `PermKey`s, never the mockup's `PERMS0`.

describe('the R2 Audit Log (D-160 R2-3b)', () => {
  it('prints the mockup’s rows: MST times, the actor, the action, the target and the detail', () => {
    expect(parityAuditRows().map(rowR2).map((r) => [r.time, r.actor, r.action, r.target, r.detail])).toEqual(
      AUDIT0.map((a) => [...a]),
    );
  });

  it('words an export from what it covered: its range and its rows', () => {
    const at = Date.parse('2026-12-09T17:02:00-07:00');
    const base: AuditRow = parityAuditRows()[4]!;
    expect(detailOf({ ...base, at, after: { rows: 212, filters: { from: at - 7 * 864e5 } } })).toBe('CSV, last 7 days, 212 rows.');
    expect(detailOf({ ...base, at, after: { rows: 1, filters: { from: at - 864e5 } } })).toBe('CSV, last 24 hours, 1 row.');
    expect(detailOf({ ...base, at, after: { rows: 12, filters: {} } })).toBe('CSV, 12 rows.');
    expect(detailOf({ ...base, at, after: { rows: 12, filters: { from: at - 3 * 864e5 } } })).toBe('CSV, 12 rows.');
  });

  it('has the mockup’s select words over the API’s values; Outcome stays, in the "…"', () => {
    expect(actorOptionsR2(parityDb().staff).map((o) => o.label)).toEqual(['Any actor', 'System', 'Avery Stone', 'Connor Leiva', 'Imani Brooks']);
    expect(actionOptionsR2()[0]).toEqual({ value: '', label: 'Any action' });
    expect(actionOptionsR2().slice(1).every((o) => o.value === o.label)).toBe(true);
    expect(RANGE_OPTIONS_R2.map((o) => o.label)).toEqual(['Last 24 hours', 'Last 7 days', 'Last 30 days']);
    expect(OUTCOME_OPTIONS_R2.map((o) => o.label)).toEqual(['Any outcome', 'OK', 'Denied', 'Blocked', 'Failed']);
  });

  it('dates the drawer’s entry in MST, with its year; Support still sees no IP', () => {
    const r = parityAuditRows()[2]!;
    const pairs = detailR2(r, 'Owner');
    expect(pairs.find((p) => p.label === 'Time')!.value).toBe('Dec 9, 2026, 9:27 PM MST');
    // The API sends Support no IP (D3); the drawer says why.
    expect(detailR2({ ...r, ip: null }, 'Support').find((p) => p.label === 'IP Address')!.value).toBe('Hidden for your role');
  });
});

describe('the R2 Roles & Permissions (D-160 R2-3b)', () => {
  const db = parityDb('/admin/roles');
  const m = rolesMatrixR2(rolesMatrix(), db);
  const cell = (key: string, role: string) => m.rows.find((r) => r.key === key)!.cells.find((c) => c.role === role)!;

  it('draws the mockup’s nine rows, each from CONSOLE_CAPS or the PermKey matrix; the Owner always on', () => {
    expect(m.roles).toEqual(['Owner', 'Admin', 'Support']);
    expect(m.rows.map((r) => r.label)).toEqual(ROLES_R2_ROWS.map((r) => r.label));
    expect(m.rows.every((r) => r.cells[0]!.on)).toBe(true);
    expect(m.rows.map((r) => r.cells.map((c) => (c.on ? 1 : 0)))).toEqual([
      [1, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [1, 1, 0],
      // Export: Admin only in CONSOLE_CAPS (the mockup's PERMS0 shows Support "Yes"; the code wins).
      [1, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ]);
    expect(cell('export', 'Support')).toMatchObject({ on: false, word: 'No', wordPhone: 'Not allowed' });
    expect(cell('account', 'Support')).toMatchObject({ on: true, word: 'Yes', wordPhone: 'Allowed' });
  });

  it('every capability a row stands for is a real one, and a Console row agrees with consoleCan', () => {
    for (const r of ROLES_R2_ROWS) for (const c of r.caps ?? []) expect(CONSOLE_CAP_KEYS).toContain(c);
    for (const r of ROLES_R2_ROWS.filter((x) => x.caps))
      for (const role of ['Admin', 'Support'] as const)
        expect(cell(r.key, role).on, `${r.key} ${role}`).toBe(r.caps!.every((c) => consoleCan(role, c)));
  });

  it('locks Support’s refund and masquerade, fixed by product rules, and nothing else', () => {
    expect(FIXED_BY_PRODUCT).toEqual({ Support: ['masq', 'refund'] });
    const locked = m.rows.flatMap((r) => r.cells.filter((c) => c.locked).map((c) => `${r.key} ${c.role}`));
    expect(locked).toEqual(['masq Support', 'refund Support']);
  });

  it('says the matrix is read-only, not "confirmed and audit-logged"', () => {
    expect(ROLES_R2_COPY.matrixSub).toBe('Owner always has every permission. Locked boxes are fixed by product rules. This matrix is read-only.');
  });

  it('lists the staff, the viewer’s row marked; only a staff manager may invite', () => {
    const s = rolesStaffR2(db, 'st1');
    expect(s.staff.map((x) => [x.name, x.role, x.last])).toEqual([
      ['Connor Leiva (you)', 'Owner', 'Dec 10, 9:22 AM'],
      ['Avery Stone', 'Admin', 'Dec 9, 5:48 PM'],
      ['Imani Brooks', 'Support', 'Dec 9, 9:30 PM'],
    ]);
    expect(s.canManageStaff).toBe(true);
    expect(rolesStaffR2(db, 'st2').canManageStaff).toBe(false);
    expect(rolesStaffR2(seed('live'), null).canManageStaff).toBe(false);
  });
});

describe('the console fixture for the R2 parity fixture (D-160 R2-3b)', () => {
  it('serves the mockup’s ten rows for ?parity=r2, whatever the date range; every other filter applies', async () => {
    const { createConsoleFixture } = await import('../../data/console-fixture');
    window.history.pushState({}, '', '/admin/audit?as=admin&parity=r2');
    try {
      const api = createConsoleFixture({ role: 'Owner', state: null, staff: true, now: () => Date.parse('2026-12-10T16:30:00Z') });
      const all = await api.audit({ from: Date.parse('2026-12-03T16:30:00Z') });
      expect(all.rows.map((r) => r.action)).toEqual(AUDIT0.map((a) => a[2]));
      expect((await api.audit({ actor: 'st3' })).rows.map((r) => r.actor.name)).toEqual(['Imani Brooks', 'Imani Brooks']);
      expect((await api.audit({ action: 'masquerade' })).rows).toHaveLength(3);
    } finally {
      window.history.pushState({}, '', '/');
    }
    // Without it, the ordinary fixture's rows.
    const plain = createConsoleFixture({ role: 'Owner', state: null, staff: true, now: () => Date.parse('2026-12-10T16:30:00Z') });
    expect((await plain.audit({})).rows[0]!.actor.name).toBe('Casey Lin');
  });
});
