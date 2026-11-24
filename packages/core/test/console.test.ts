// The Admin Console's rules (D-157): the capability matrix against spec § 5's table, the closed list
// of audit actions, the error codes and the export's CSV.
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  AUDIT_CSV_HEADER,
  CONSOLE_CAPS,
  CONSOLE_CAP_KEYS,
  CONSOLE_CAP_LABELS,
  CONSOLE_ERRORS,
  CONSOLE_ROLES,
  STAFF_ROLES,
  auditActionGroup,
  auditCsv,
  auditRedactsNetwork,
  consoleCan,
  consoleCaps,
  csvCell,
  isAuditAction,
  isAuditOutcome,
  isConsoleErrorCode,
  rolesMatrix,
  toCsv,
} from '../src/index';
import type { AuditRow, ConsoleCap } from '../src/index';

// Spec § 5, typed out independently of `CONSOLE_CAPS`, so a change to either side is a red test.
const EVERY_STAFF = ['console.view', 'workspaces.read', 'users.read', 'notes.write', 'user.password_reset', 'usage.read', 'api.read', 'jobs.read', 'incidents.read', 'email.read', 'incidents.ack', 'incidents.create', 'billing.read', 'audit.read'];
const OWNER_ADMIN = ['masquerade.start', 'masquerade.extend', 'billing.refund', 'billing.void', 'billing.seat_tier', 'export', 'incidents.resolve', 'jobs.run_now', 'webhooks.retry', 'ops.read', 'flags.write', 'integrations.probe'];
// D-160 R2-3b adds `roles.write` (editing Roles & Permissions), the Owner's alone.
const OWNER_ONLY = ['notes.delete', 'flags.write_sensitive', 'roles.write'];

describe('consoleCan (spec § 5) @console', () => {
  it('lists exactly the table’s capabilities', () => {
    expect([...CONSOLE_CAP_KEYS].sort()).toEqual([...EVERY_STAFF, ...OWNER_ADMIN, ...OWNER_ONLY].sort());
  });

  it('gives Owner, Admin and Support the shared rows', () => {
    for (const cap of EVERY_STAFF) for (const role of ['Owner', 'Admin', 'Support']) expect(consoleCan(role, cap), `${role} ${cap}`).toBe(true);
  });

  it('gives Owner and Admin, never Support, the operator rows', () => {
    for (const cap of OWNER_ADMIN) {
      expect(consoleCan('Owner', cap), cap).toBe(true);
      expect(consoleCan('Admin', cap), cap).toBe(true);
      expect(consoleCan('Support', cap), cap).toBe(false);
    }
  });

  it('keeps note deletes and sensitive flags for the Owner', () => {
    for (const cap of OWNER_ONLY) {
      expect(consoleCan('Owner', cap), cap).toBe(true);
      expect(consoleCan('Admin', cap), cap).toBe(false);
      expect(consoleCan('Support', cap), cap).toBe(false);
    }
  });

  it('the Owner always passes', () => {
    for (const cap of CONSOLE_CAP_KEYS) expect(consoleCan('Owner', cap)).toBe(true);
  });

  it('gives Instructor and Content Editor nothing', () => {
    for (const role of ['Instructor', 'Content Editor']) {
      expect(consoleCaps(role)).toEqual([]);
      for (const cap of CONSOLE_CAP_KEYS) expect(consoleCan(role, cap)).toBe(false);
    }
  });

  it('fails closed on an unknown or missing role', () => {
    for (const role of [null, undefined, '', 'owner', 'ADMIN', 'Team Owner', 'Agent', 'Superuser']) {
      expect(consoleCaps(role)).toEqual([]);
      expect(consoleCan(role, 'console.view')).toBe(false);
    }
  });

  it('fails closed on an unknown capability, even for the Owner', () => {
    for (const cap of ['', 'console', 'audit.write', 'constructor', 'toString', '__proto__']) {
      expect(consoleCan('Owner', cap), cap).toBe(false);
      expect(consoleCan('Admin', cap), cap).toBe(false);
    }
  });

  it('every role the matrix shows is a real staff role, and every capability has a label', () => {
    for (const r of CONSOLE_ROLES) expect(STAFF_ROLES).toContain(r);
    for (const cap of CONSOLE_CAP_KEYS) expect(CONSOLE_CAP_LABELS[cap]).toMatch(/^[A-Z]/);
  });

  it('consoleCaps lists a role’s capabilities in the table’s order', () => {
    expect(consoleCaps('Owner')).toEqual(CONSOLE_CAP_KEYS);
    expect(consoleCaps('Support')).toEqual(EVERY_STAFF);
    expect(consoleCaps('Admin')).toEqual(CONSOLE_CAP_KEYS.filter((c) => !OWNER_ONLY.includes(c)));
  });

  it('shows Support the audit log without IP and user agent', () => {
    expect(auditRedactsNetwork('Support')).toBe(true);
    expect(auditRedactsNetwork('Owner')).toBe(false);
    expect(auditRedactsNetwork('Admin')).toBe(false);
    for (const r of ['Instructor', null, 'anything']) expect(auditRedactsNetwork(r)).toBe(true);
  });

  it('builds the Roles matrix from CONSOLE_CAPS; with no stored change it is the ceiling', () => {
    const m = rolesMatrix();
    expect(m.grants).toEqual([]);
    for (const row of m.caps) expect(row.allowed).toEqual(row.ceiling);
    expect(m.roles).toEqual(['Owner', 'Admin', 'Support']);
    expect(m.noAccess).toEqual(['Instructor', 'Content Editor']);
    expect(m.staffPath).toBe('/admin/staff');
    expect(m.caps.map((c) => c.cap)).toEqual(CONSOLE_CAP_KEYS);
    for (const row of m.caps) {
      for (const role of CONSOLE_ROLES) expect(row.allowed[role]).toBe(consoleCan(role, row.cap));
      expect(row.label).toBe(CONSOLE_CAP_LABELS[row.cap]);
    }
    expect(m.caps.find((c) => c.cap === 'audit.read')!.notes).toEqual({ Support: 'Without IP or browser' });
    expect(m.caps.find((c) => c.cap === 'billing.read')!.notes).toEqual({ Support: 'Read-only' });
    // A copy: changing the answer cannot change the constant.
    m.caps[0]!.allowed.Support = false;
    expect(rolesMatrix().caps[0]!.allowed.Support).toBe(true);
  });

  it('every capability lists only Admin and Support (the Owner is implied)', () => {
    for (const roles of Object.values(CONSOLE_CAPS)) for (const r of roles as readonly string[]) expect(['Admin', 'Support']).toContain(r);
  });
});

describe('the audit vocabulary @console', () => {
  it('is a closed list with PR 1’s two actions first', () => {
    expect(AUDIT_ACTIONS.slice(0, 2)).toEqual(['console.access_denied', 'audit.export']);
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
    // Lowercase `group.verb`. A group may carry a digit after its first letter (`week0.test_send`, the Week 0 email's).
    for (const a of AUDIT_ACTIONS) expect(a).toMatch(/^[a-z][a-z0-9_]*\.[a-z_]+$/);
    expect(isAuditAction('audit.export')).toBe(true);
    expect(isAuditAction('audit.delete')).toBe(false);
    expect(isAuditAction(7)).toBe(false);
  });

  it('groups actions by their prefix, in order', () => {
    expect(auditActionGroup('masquerade.blocked_action')).toBe('masquerade');
    expect(AUDIT_ACTION_GROUPS[0]).toBe('console');
    expect(AUDIT_ACTION_GROUPS).toContain('masquerade');
    expect(new Set(AUDIT_ACTION_GROUPS).size).toBe(AUDIT_ACTION_GROUPS.length);
  });

  it('knows the four outcomes', () => {
    for (const o of ['ok', 'denied', 'blocked', 'failed']) expect(isAuditOutcome(o)).toBe(true);
    expect(isAuditOutcome('OK')).toBe(false);
  });

  it('carries the spec’s error codes and statuses', () => {
    expect(CONSOLE_ERRORS.console_forbidden.status).toBe(403);
    expect(CONSOLE_ERRORS.export_too_large.status).toBe(422);
    expect(CONSOLE_ERRORS.masquerade_blocked).toEqual({ status: 403, message: 'Blocked while masquerading. Exit to continue.' });
    expect(CONSOLE_ERRORS.masquerade_ended.status).toBe(409);
    expect(CONSOLE_ERRORS.confirm_expired.status).toBe(410);
    expect(isConsoleErrorCode('console_forbidden')).toBe(true);
    expect(isConsoleErrorCode('toString')).toBe(false);
  });
});

describe('the export CSV @console', () => {
  it('neutralizes every formula prefix', () => {
    for (const lead of ['=', '+', '-', '@', '\t', '\r']) expect(csvCell(`${lead}cmd|' /C calc'!A0`)).toBe(`"'${lead}cmd|' /C calc'!A0"`);
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
  });

  it('quotes everything and doubles quotes; empty for null', () => {
    expect(csvCell('plain')).toBe('"plain"');
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(-1)).toBe(`"'-1"`);
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(toCsv([['a', 'b'], [1, 2]])).toBe('"a","b"\r\n"1","2"\r\n');
  });

  it('writes one header and one line per row, every injected field neutralized', () => {
    const row: AuditRow = {
      id: '7',
      at: Date.parse('2026-12-07T16:42:00Z'),
      actor: { userId: 'st1', name: '=Casey', role: 'Owner', source: 'staff' },
      masqueradeSessionId: null,
      action: 'audit.export',
      target: { type: 'audit_log', id: null, label: '+Audit log' },
      reason: '@reason',
      before: null,
      after: { rows: 3 },
      outcome: 'ok',
      ip: '203.0.113.9',
      userAgent: '-ua',
      requestId: 'req-1',
    };
    const lines = auditCsv([row]).trimEnd().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(AUDIT_CSV_HEADER.map((h) => `"${h}"`).join(','));
    expect(lines[1]).toContain('"\'=Casey"');
    expect(lines[1]).toContain('"\'+Audit log"');
    expect(lines[1]).toContain('"\'@reason"');
    expect(lines[1]).toContain('"\'-ua"');
    expect(lines[1]).toContain('"2026-12-07T16:42:00.000Z"');
    expect(lines[1]).toContain('"{""rows"":3}"');
  });

  it('types: a capability is a key of the table', () => {
    const cap: ConsoleCap = 'audit.read';
    expect(CONSOLE_CAPS[cap]).toEqual(['Admin', 'Support']);
  });
});
