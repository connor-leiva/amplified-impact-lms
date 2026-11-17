import { beforeEach, describe, expect, it } from 'vitest';
import { AUDIT_ACTION_GROUPS, setViewerZone } from '@ai/core';
import type { AuditRow } from '@ai/core';
import {
  AUDIT_COPY,
  DEFAULT_FILTERS,
  OUTCOME_BADGES,
  RANGES,
  actionOptions,
  actorOptions,
  auditFiltersFor,
  canExport,
  detailOf,
  detailVM,
  exportFailure,
  isDefaultFilters,
  rowVM,
} from './AuditLog.vm';

const NOW = Date.parse('2026-12-07T16:42:00Z');

const row = (over: Partial<AuditRow> = {}): AuditRow => ({
  id: '41',
  at: NOW - 3600_000,
  actor: { userId: 'st1', name: 'Casey Lin', role: 'Owner', source: 'staff' },
  masqueradeSessionId: null,
  action: 'audit.export',
  target: { type: 'audit_log', id: null, label: 'Audit log' },
  reason: null,
  before: null,
  after: { rows: 12, format: 'csv', filters: {} },
  outcome: 'ok',
  ip: '203.0.113.9',
  userAgent: 'Mozilla/5.0',
  requestId: 'req-1',
  ...over,
});

describe('AuditLog.vm (D-157)', () => {
  // A viewer outside the program zone, so both halves of fmt's rule show. test-setup.ts restores CT.
  beforeEach(() => setViewerZone('America/Phoenix'));

  it('starts on the last 7 days with nothing else set', () => {
    expect(DEFAULT_FILTERS).toEqual({ q: '', actor: '', action: '', outcome: '', range: '7d' });
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, q: '  ' })).toBe(true);
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, range: '30d' })).toBe(false);
    expect(RANGES.map((r) => r.label)).toEqual(['Last 24 Hours', 'Last 7 Days', 'Last 30 Days']);
  });

  it('turns the filters into the API’s query, measured back from now', () => {
    expect(auditFiltersFor(DEFAULT_FILTERS, NOW)).toEqual({ from: NOW - 7 * 24 * 3600_000 });
    expect(auditFiltersFor({ q: '  roles ', actor: 'st4', action: 'console', outcome: 'denied', range: '24h' }, NOW)).toEqual({
      from: NOW - 24 * 3600_000,
      target: 'roles',
      actor: 'st4',
      action: 'console',
      outcome: 'denied',
    });
    expect(auditFiltersFor({ ...DEFAULT_FILTERS, q: 'x'.repeat(300) }, NOW).target).toHaveLength(100);
  });

  it('lists Any Actor, System, then staff by name', () => {
    const opts = actorOptions([
      { id: 'st4', name: 'Luis Romero' },
      { id: 'st1', name: 'Casey Lin' },
    ]);
    expect(opts).toEqual([
      { value: '', label: 'Any Actor' },
      { value: 'system', label: 'System' },
      { value: 'st1', label: 'Casey Lin' },
      { value: 'st4', label: 'Luis Romero' },
    ]);
  });

  it('offers every action group, each with a Title Case label', () => {
    const opts = actionOptions();
    expect(opts[0]).toEqual({ value: '', label: 'Any Action' });
    expect(opts.slice(1).map((o) => o.value)).toEqual([...AUDIT_ACTION_GROUPS]);
    for (const o of opts.slice(1)) expect(o.label).toMatch(/^[A-Z]/);
    expect(opts.find((o) => o.value === 'console')!.label).toBe('Console Access');
  });

  it('renders a row with fmt’s time, the actor, the action, the target and a worded outcome', () => {
    const vm = rowVM(row());
    expect(vm).toEqual({ key: '41', time: 'Mon, Dec 7 · 8:42 AM MST (9:42 AM CT)', actor: 'Casey Lin', action: 'audit.export', target: 'Audit log', outcome: OUTCOME_BADGES.ok });
    expect(rowVM(row({ actor: { userId: null, name: null, role: null, source: 'system' } })).actor).toBe('System');
    expect(rowVM(row({ actor: { userId: 'gone', name: null, role: 'Admin', source: 'staff' } })).actor).toBe('A former staff member');
    expect(rowVM(row({ target: { type: 'route', id: 'GET /api/console/roles', label: null } })).target).toBe('GET /api/console/roles');
  });

  it('gives every outcome its own word and glyph, never colour alone', () => {
    const glyphs = Object.values(OUTCOME_BADGES).map((b) => b.icon);
    expect(new Set(glyphs).size).toBe(4);
    expect(Object.values(OUTCOME_BADGES).map((b) => b.label)).toEqual(['OK', 'Denied', 'Blocked', 'Failed']);
  });

  it('describes a refusal and an export from the row’s own payload', () => {
    expect(detailOf(row({ action: 'console.access_denied', outcome: 'denied', after: { capability: 'ops.read' } }))).toBe('Needed “View Operations Pages”.');
    expect(detailOf(row({ action: 'console.access_denied', outcome: 'denied', after: { capability: 'nonsense' } }))).toBe('Refused by role.');
    // D-172: a publish's Detail is the mockup's "Draft to Published.".
    expect(detailOf(row({ action: 'module.publish', before: { status: 'draft' }, after: { status: 'published' } }))).toBe('Draft to Published.');
    expect(detailOf(row({ action: 'module.unpublish', before: { status: 'scheduled' }, after: { status: 'draft' } }))).toBe('Scheduled to Draft.');
    expect(detailOf(row())).toBe('CSV, 12 rows.');
    expect(detailOf(row({ after: { rows: 1 } }))).toBe('CSV, 1 row.');
    expect(detailOf(row({ outcome: 'failed', reason: 'export_too_large', after: { rows: 10412 } }))).toBe('Refused: 10,412 rows is over 10,000.');
    expect(detailOf(row({ action: 'masquerade.expire', reason: null, after: null }))).toBe('None');
  });

  it('shows the Owner the IP and browser, and tells Support they are hidden', () => {
    const owner = Object.fromEntries(detailVM(row(), 'Owner').map((p) => [p.label, p.value]));
    expect(owner['IP Address']).toBe('203.0.113.9');
    expect(owner['Browser']).toBe('Mozilla/5.0');
    expect(owner['Time']).toBe('Dec 7, 2026, 8:42 AM MST (9:42 AM CT)');
    expect(owner['Actor']).toBe('Casey Lin (Owner)');
    expect(owner['After']).toBe(JSON.stringify({ rows: 12, format: 'csv', filters: {} }, null, 2));
    expect(owner['Before']).toBe('None');
    const support = Object.fromEntries(detailVM(row({ ip: null, userAgent: null }), 'Support').map((p) => [p.label, p.value]));
    expect(support['IP Address']).toBe(AUDIT_COPY.hidden);
    expect(support['Browser']).toBe(AUDIT_COPY.hidden);
    const unrecorded = Object.fromEntries(detailVM(row({ ip: null }), 'Admin').map((p) => [p.label, p.value]));
    expect(unrecorded['IP Address']).toBe(AUDIT_COPY.notRecorded);
  });

  it('shows Export CSV to the Owner and Admin only', () => {
    expect(canExport('Owner')).toBe(true);
    expect(canExport('Admin')).toBe(true);
    expect(canExport('Support')).toBe(false);
    expect(canExport(null)).toBe(false);
  });

  it('words each export failure', () => {
    expect(exportFailure('too_large', 'This export is over 10,000 rows. Narrow the filters and try again.')).toBe('This export is over 10,000 rows. Narrow the filters and try again.');
    expect(exportFailure('rate_limited', 'x')).toBe('Too many requests. Wait a minute, then try again.');
    expect(exportFailure('forbidden', 'x')).toBe('Your role can’t export the audit log.');
    expect(exportFailure('failed', 'x')).toBe('The export failed. Nothing was changed.');
  });
});
