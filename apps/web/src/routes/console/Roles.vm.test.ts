import { describe, expect, it } from 'vitest';
import { CONSOLE_CAP_KEYS, rolesMatrix } from '@ai/core';
import { ROLES_COPY, noAccessLine, rolesVM } from './Roles.vm';

describe('Roles.vm (D-157)', () => {
  const vm = rolesVM(rolesMatrix());

  it('shows Owner, Admin and Support, one row per capability, in the table’s order', () => {
    expect(vm.roles).toEqual(['Owner', 'Admin', 'Support']);
    expect(vm.rows.map((r) => r.key)).toEqual(CONSOLE_CAP_KEYS);
    expect(vm.staffPath).toBe('/admin/staff');
  });

  it('words every cell, with a glyph as well as a tone', () => {
    const exp = vm.rows.find((r) => r.key === 'export')!;
    expect(exp.label).toBe('Export Logs as CSV');
    expect(exp.cells).toEqual([
      { role: 'Owner', allowed: true, text: 'Yes', tone: 'success', icon: 'check' },
      { role: 'Admin', allowed: true, text: 'Yes', tone: 'success', icon: 'check' },
      { role: 'Support', allowed: false, text: 'No', tone: 'neutral', icon: 'minus' },
    ]);
    expect(vm.rows.find((r) => r.key === 'billing.read')!.cells[2]!.text).toBe('Yes, read-only');
    expect(vm.rows.find((r) => r.key === 'audit.read')!.cells[2]!.text).toBe('Yes, without IP or browser');
    expect(vm.rows.find((r) => r.key === 'notes.delete')!.cells.map((c) => c.text)).toEqual(['Yes', 'No', 'No']);
  });

  it('names the roles with no Console access', () => {
    expect(vm.noAccess).toBe('Instructor and Content Editor have no Console access.');
    expect(noAccessLine(['Instructor'])).toBe('Instructor has no Console access.');
    expect(noAccessLine(['A', 'B', 'C'])).toBe('A, B and C have no Console access.');
    expect(noAccessLine([])).toBe('');
  });

  it('is read-only: the copy offers a link to Staff & Roles and no control', () => {
    expect(ROLES_COPY.matrixNote).toBe('Set in code and read-only. The Owner always has every permission.');
    expect(ROLES_COPY.staffLink).toBe('Go to Staff & Roles');
  });
});
