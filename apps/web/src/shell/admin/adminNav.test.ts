import { describe, expect, it } from 'vitest';
import { ICONS } from '@ai/core';
import {
  DEFAULT_OPEN,
  GROUP_ICON,
  R2_GROUPS,
  R2_NAV,
  activeRowId,
  adminNav,
  crumbTrail,
  isGroupOpen,
  toggleGroup,
} from './adminNav';
import type { AdminNavInput } from './adminNav';

// D-160 R2-1b: the R2 admin sidebar's model (BUILD-SPEC § 4, `NAV` in AdminRedesign.jsx).

const COUNTS = { drafts: 6, requests: 2, incidents: 1 };
const nav = (over: Partial<AdminNavInput> = {}) =>
  adminNav({ pathname: '/admin/no-such-page', role: 'Owner', fullNav: true, counts: COUNTS, open: {}, ...over });
const labels = (groups: ReturnType<typeof adminNav>) => groups.map((g) => [g.label, ...g.rows.map((r) => r.label)]);

describe('the R2 admin nav (D-160 R2-1b)', () => {
  it('is the mockup’s NAV, in its order, with its icons', () => {
    expect(labels(nav())).toEqual([
      ['Health', 'Overview', 'System Health'],
      ['Build', 'Curriculum', 'Module Builder', 'Resource Vault', 'Cohorts & Sessions', 'Announcements'],
      ['Support', 'Learners & Teams', 'Workspaces', 'Users', 'Masquerade'],
      ['Revenue', 'Tiers & Upgrades', 'Billing', 'Usage'],
      [
        'Operations',
        'Incidents',
        'Audit Log',
        'API & Webhooks',
        'Scheduled Jobs',
        'Email Log',
        'Integrations',
        'Deploys & Commits',
        'DB Health',
        'Environment Flags',
      ],
      ['Access', 'Roles & Permissions'],
    ]);
    expect([...R2_GROUPS]).toEqual(R2_NAV.map(([g]) => g));
    for (const [, rows] of R2_NAV) for (const r of rows) expect(ICONS[r.icon], r.id).toBeTruthy();
    for (const g of R2_GROUPS) expect(ICONS[GROUP_ICON[g]], g).toBeTruthy();
  });

  it('shows only built screens outside the parity fixture, and keeps Staff & Roles under Access (D11)', () => {
    // R2-1c turns on Workspaces (part 1) and Users (part 2); R2-4a (D-163) Billing.
    expect(labels(nav({ fullNav: false }))).toEqual([
      ['Health', 'Overview'],
      ['Build', 'Curriculum', 'Module Builder', 'Resource Vault', 'Cohorts & Sessions', 'Announcements'],
      ['Support', 'Learners & Teams', 'Workspaces', 'Users'],
      ['Revenue', 'Tiers & Upgrades', 'Billing'],
      ['Operations', 'Audit Log'],
      ['Access', 'Roles & Permissions', 'Staff & Roles'],
    ]);
  });

  it('filters Console rows by capability, and leaves out a group with none', () => {
    const support = labels(nav({ role: 'Support' }));
    for (const ops of ['Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags', 'Roles & Permissions'])
      expect(support.flat()).not.toContain(ops);
    expect(support.map((g) => g[0])).not.toContain('Access');
    expect(support.flat()).toContain('Audit Log');
    const instructor = labels(nav({ role: 'Instructor', fullNav: false }));
    expect(instructor.map((g) => g[0])).toEqual(['Health', 'Build', 'Support', 'Revenue', 'Access']);
    // Workspaces and Users read `workspaces.read` and `users.read`, which an Instructor lacks.
    expect(instructor.find((g) => g[0] === 'Support')).toEqual(['Support', 'Learners & Teams']);
    expect(instructor.at(-1)).toEqual(['Access', 'Staff & Roles']);
    // Billing reads `billing.read`: Support has it (read-only, D3); an Instructor does not.
    expect(instructor.find((g) => g[0] === 'Revenue')).toEqual(['Revenue', 'Tiers & Upgrades']);
    expect(labels(nav({ role: 'Support', fullNav: false })).find((g) => g[0] === 'Revenue')).toEqual([
      'Revenue',
      'Tiers & Upgrades',
      'Billing',
    ]);
  });

  it('badges real work and alerts only, and hides each at zero', () => {
    const rows = nav().flatMap((g) => g.rows);
    expect(rows.find((r) => r.id === 'curriculum')?.badge).toBe('6 draft');
    expect(rows.find((r) => r.id === 'tiers')?.badge).toBe('2');
    expect(rows.find((r) => r.id === 'incidents')?.badge).toBe('1');
    expect(rows.filter((r) => r.badge).map((r) => r.id)).toEqual(['curriculum', 'tiers', 'incidents']);
    const none = nav({ counts: { drafts: 0, requests: 0, incidents: 0 } }).flatMap((g) => g.rows);
    expect(none.filter((r) => r.badge)).toEqual([]);
  });

  it('opens Health and Build by default, and a closed Operations shows its open incident', () => {
    const g = nav();
    expect(g.filter((x) => x.open).map((x) => x.label)).toEqual(['Health', 'Build']);
    expect(DEFAULT_OPEN).toEqual({ Health: true, Build: true });
    expect(g.find((x) => x.label === 'Operations')?.alert).toBe('1 incident');
    expect(nav({ counts: { ...COUNTS, incidents: 3 } }).find((x) => x.label === 'Operations')?.alert).toBe(
      '3 incidents',
    );
    expect(nav({ counts: { ...COUNTS, incidents: 0 } }).find((x) => x.label === 'Operations')?.alert).toBeUndefined();
    // Open, the count is on the row instead.
    expect(nav({ open: { Operations: true } }).find((x) => x.label === 'Operations')?.alert).toBeUndefined();
    // Without the Incidents row (production, before Console PR 8), no alert.
    expect(nav({ fullNav: false }).find((x) => x.label === 'Operations')?.alert).toBeUndefined();
  });

  it('keeps the group holding the page open, whatever was remembered', () => {
    const g = nav({ pathname: '/admin/audit', open: { Operations: false, Build: false } });
    const ops = g.find((x) => x.label === 'Operations')!;
    expect(ops.active).toBe(true);
    expect(ops.open).toBe(true);
    expect(ops.rows.find((r) => r.active)?.id).toBe('audit');
    expect(g.find((x) => x.label === 'Build')!.open).toBe(false);
    expect(isGroupOpen('Support', false, {})).toBe(false);
    expect(isGroupOpen('Support', false, { Support: true })).toBe(true);
  });

  it('toggles: the active group only remembers itself open; any other flips', () => {
    expect(toggleGroup('Operations', true, { Operations: false })).toEqual({ Operations: true });
    expect(toggleGroup('Build', false, {})).toEqual({ Build: false });
    expect(toggleGroup('Support', false, {})).toEqual({ Support: true });
    expect(toggleGroup('Support', false, { Support: true, Build: false })).toEqual({ Support: false, Build: false });
  });

  it('knows the page by its address, Module Builder holding every AI Employee it edits', () => {
    expect(activeRowId('/admin')).toBe('overview');
    expect(activeRowId('/admin/')).toBe('overview');
    expect(activeRowId('/admin/curriculum')).toBe('curriculum');
    expect(activeRowId('/admin/curriculum/new')).toBe('builder');
    expect(activeRowId('/admin/curriculum/marketing')).toBe('builder');
    expect(activeRowId('/admin/staff')).toBe('staff');
    // Not built yet: the Console 404, with no row lit.
    expect(activeRowId('/admin/health')).toBeNull();
    expect(activeRowId('/admin/no-such-page')).toBeNull();
    expect(activeRowId('/admin/denied')).toBeNull();
  });

  it('builds the breadcrumb trail Admin / {group} / {page}', () => {
    expect(crumbTrail('/admin/roles')).toEqual({ group: 'Access', page: 'Roles & Permissions' });
    expect(crumbTrail('/admin/curriculum/new')).toEqual({ group: 'Build', page: 'Module Builder' });
    expect(crumbTrail('/admin')).toEqual({ group: 'Health', page: 'Overview' });
    expect(crumbTrail('/admin/no-such-page')).toBeNull();
    // D-160 R2-1c: a record's page belongs to its row (the mockup's PARENT), and its crumb links back.
    expect(activeRowId('/admin/workspaces/ws_northshore')).toBe('workspaces');
    expect(activeRowId('/admin/users/u_1042')).toBe('users');
    expect(activeRowId('/admin/users/u_1042/more')).toBeNull();
    expect(crumbTrail('/admin/workspaces')).toEqual({ group: 'Support', page: 'Workspaces' });
    expect(crumbTrail('/admin/workspaces/ws_northshore')).toEqual({
      group: 'Support',
      page: 'Workspaces',
      parent: '/admin/workspaces',
    });
    expect(crumbTrail('/admin/users/u_1042')).toEqual({ group: 'Support', page: 'Users', parent: '/admin/users' });
    // D-163: Billing's tabs are one page with its own addresses, not records: no record crumb.
    expect(activeRowId('/admin/billing')).toBe('billing');
    expect(activeRowId('/admin/billing/invoices')).toBe('billing');
    expect(crumbTrail('/admin/billing/failed')).toEqual({ group: 'Revenue', page: 'Billing' });
    expect(nav({ pathname: '/admin/users/u_1042' }).find((g) => g.label === 'Support')).toMatchObject({
      active: true,
      open: true,
    });
  });
});
