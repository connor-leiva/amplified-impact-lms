import { describe, expect, it } from 'vitest';
import { ICONS } from '@ai/core';
import { GROUP_ICON, R2_GROUPS, R2_NAV, activeRowId, adminNav, badgeText, crumbTrail, groupHub, hubPages, peekAfterClick } from './adminNav';
import type { AdminNavInput } from './adminNav';

// D-160 R2-1b: the R2 admin sidebar's model (BUILD-SPEC § 4, `NAV` in AdminRedesign.jsx).

const COUNTS = { drafts: 6, requests: 2, incidents: 1, waiting: 0 };
const nav = (over: Partial<AdminNavInput> = {}) =>
  adminNav({ pathname: '/admin/no-such-page', role: 'Owner', fullNav: true, counts: COUNTS, peek: undefined, ...over });
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
    // R2-1c turns on Workspaces (part 1) and Users (part 2); D-162 3b Masquerade; R2-4a (D-163) Billing; D-165 API & Webhooks and Scheduled Jobs; D-166 Usage and the Email Log; D-167 Incidents; D-168 the four infrastructure pages; D-169 System Health.
    // D-238: Community, off the R2 mockup (the handoff mockup's row), after Learners & Teams.
    expect(labels(nav({ fullNav: false }))).toEqual([
      ['Health', 'Overview', 'System Health'],
      ['Build', 'Curriculum', 'Module Builder', 'Resource Vault', 'Cohorts & Sessions', 'Announcements'],
      ['Support', 'Learners & Teams', 'Community', 'Workspaces', 'Users', 'Masquerade'],
      ['Revenue', 'Tiers & Upgrades', 'Billing', 'Usage'],
      ['Operations', 'Incidents', 'Audit Log', 'API & Webhooks', 'Scheduled Jobs', 'Email Log', 'Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags'],
      ['Access', 'Roles & Permissions', 'Staff & Roles'],
    ]);
  });

  it('makes an incident’s page the Incidents row’s, with its id in the crumb (D-167)', () => {
    expect(activeRowId('/admin/incidents/INC-0007')).toBe('incidents');
    expect(crumbTrail('/admin/incidents/INC-0007')).toEqual({ group: 'Operations', page: 'Incidents', parent: '/admin/incidents' });
    expect(crumbTrail('/admin/incidents')).toEqual({ group: 'Operations', page: 'Incidents' });
  });

  it('D-168: turns the four Operations pages on by ops.read: Owner and Admin, never Support (D3)', () => {
    const OPS = ['Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags'];
    for (const role of ['Owner', 'Admin']) {
      const ops = labels(nav({ role, fullNav: false })).find((g) => g[0] === 'Operations')!;
      expect(ops.slice(-4), role).toEqual(OPS);
    }
    for (const role of ['Support', 'Instructor', 'Content Editor']) for (const x of OPS) expect(labels(nav({ role, fullNav: false })).flat(), `${role} ${x}`).not.toContain(x);
    expect(activeRowId('/admin/db')).toBe('db');
    expect(crumbTrail('/admin/flags')).toEqual({ group: 'Operations', page: 'Environment Flags' });
  });

  it('filters Console rows by capability, and leaves out a group with none', () => {
    const support = labels(nav({ role: 'Support' }));
    for (const ops of ['Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags', 'Roles & Permissions'])
      expect(support.flat()).not.toContain(ops);
    expect(support.map((g) => g[0])).not.toContain('Access');
    expect(support.flat()).toContain('Audit Log');
    // D-165 (D3): Support sees API & Webhooks and Scheduled Jobs, in production too; D-166 the Email Log; D-167 Incidents.
    expect(labels(nav({ role: 'Support', fullNav: false })).find((g) => g[0] === 'Operations')).toEqual([
      'Operations',
      'Incidents',
      'Audit Log',
      'API & Webhooks',
      'Scheduled Jobs',
      'Email Log',
    ]);
    const instructor = labels(nav({ role: 'Instructor', fullNav: false }));
    expect(instructor.map((g) => g[0])).toEqual(['Health', 'Build', 'Support', 'Revenue', 'Access']);
    // Workspaces and Users read `workspaces.read` and `users.read`, and Community `console.view` (D-238), which an
    // Instructor lacks.
    expect(instructor.find((g) => g[0] === 'Support')).toEqual(['Support', 'Learners & Teams']);
    expect(instructor.at(-1)).toEqual(['Access', 'Staff & Roles']);
    // D-162 3b: Masquerade is the Owner's and Admin's (`masquerade.start`); Support reaches its lock card by address.
    expect(labels(nav({ role: 'Admin', fullNav: false })).find((g) => g[0] === 'Support')).toContain('Masquerade');
    expect(labels(nav({ role: 'Support', fullNav: false })).find((g) => g[0] === 'Support')).toEqual(['Support', 'Learners & Teams', 'Community', 'Workspaces', 'Users']);
    expect(support.flat()).not.toContain('Masquerade');
    // Billing reads `billing.read`: Support has it (read-only, D3); an Instructor does not.
    expect(instructor.find((g) => g[0] === 'Revenue')).toEqual(['Revenue', 'Tiers & Upgrades']);
    expect(labels(nav({ role: 'Support', fullNav: false })).find((g) => g[0] === 'Revenue')).toEqual([
      'Revenue',
      'Tiers & Upgrades',
      'Billing',
      'Usage',
    ]);
    // D-166: Usage and the Email Log read `usage.read` and `email.read`: Support has both (D3); an Instructor neither.
    expect(labels(nav({ role: 'Support', fullNav: false })).find((g) => g[0] === 'Operations')).toContain('Email Log');
  });

  it('badges real work and alerts only, each saying what it counts, and hides each at zero (D-239)', () => {
    const rows = nav().flatMap((g) => g.rows);
    expect(rows.find((r) => r.id === 'curriculum')?.badge).toBe('6 draft');
    expect(rows.find((r) => r.id === 'tiers')?.badge).toBe('2 requests');
    expect(rows.find((r) => r.id === 'incidents')).toMatchObject({ badge: '1 incident', alert: true });
    expect(rows.find((r) => r.id === 'tiers')?.alert).toBeUndefined();
    expect(rows.filter((r) => r.badge).map((r) => r.id)).toEqual(['curriculum', 'tiers', 'incidents']);
    const none = nav({ counts: { drafts: 0, requests: 0, incidents: 0, waiting: 0 } }).flatMap((g) => g.rows);
    expect(none.filter((r) => r.badge)).toEqual([]);
    expect([badgeText('requests', { ...COUNTS, requests: 1 }), badgeText('incidents', { ...COUNTS, incidents: 3 })]).toEqual(['1 request', '3 incidents']);
    // `waiting` (R-3's Community): "3 waiting", and nothing at 0.
    expect(badgeText('waiting', { ...COUNTS, waiting: 3 })).toBe('3 waiting');
    expect(badgeText('waiting', COUNTS)).toBeUndefined();
  });

  it('opens one group: the one holding the page, or none on a page no group holds (D-239)', () => {
    expect(nav().filter((x) => x.open)).toEqual([]);
    const g = nav({ pathname: '/admin/audit' });
    expect(g.filter((x) => x.open).map((x) => x.label)).toEqual(['Operations']);
    const ops = g.find((x) => x.label === 'Operations')!;
    expect(ops.active).toBe(true);
    expect(ops.rows.find((r) => r.active)?.id).toBe('audit');
  });

  it('peeks: a group opens and the other closes; the same group again closes it; null shuts all (D-239)', () => {
    const page = { pathname: '/admin/audit' };
    expect(nav({ ...page, peek: 'Support' }).filter((x) => x.open).map((x) => x.label)).toEqual(['Support']);
    // The group holding the page closes when another is peeked, and is still the active one.
    expect(nav({ ...page, peek: 'Support' }).find((x) => x.label === 'Operations')).toMatchObject({ active: true, open: false });
    expect(peekAfterClick('Support', true)).toBeNull();
    expect(peekAfterClick('Support', false)).toBe('Support');
    expect(nav({ ...page, peek: null }).filter((x) => x.open)).toEqual([]);
    // A role that can't open a group doesn't get it, peeked or not.
    expect(nav({ fullNav: false, role: 'Instructor', peek: 'Operations' }).find((x) => x.label === 'Operations')).toBeUndefined();
  });

  it('rolls up what waits in a closed group: its first count, in order; an open group shows none (D-239)', () => {
    const closed = (label: string, over: Partial<AdminNavInput> = {}) => nav(over).find((x) => x.label === label)?.roll;
    expect(closed('Build')).toEqual({ text: '6 draft', alert: false });
    expect(closed('Revenue')).toEqual({ text: '2 requests', alert: false });
    expect(closed('Operations')).toEqual({ text: '1 incident', alert: true });
    expect(closed('Operations', { counts: { ...COUNTS, incidents: 3 } })).toEqual({ text: '3 incidents', alert: true });
    expect(closed('Operations', { counts: { ...COUNTS, incidents: 0 } })).toBeUndefined();
    expect(closed('Health')).toBeUndefined();
    // Open, its rows carry their own.
    expect(closed('Operations', { peek: 'Operations' })).toBeUndefined();
    expect(closed('Build', { pathname: '/admin/curriculum' })).toBeUndefined();
    // Production (D-167): the Incidents row is on, so a closed Operations shows the real count.
    expect(closed('Operations', { fullNav: false })).toEqual({ text: '1 incident', alert: true });
  });

  it('knows the page by its address, Module Builder holding every AI Employee it edits', () => {
    expect(activeRowId('/admin')).toBe('overview');
    expect(activeRowId('/admin/')).toBe('overview');
    expect(activeRowId('/admin/curriculum')).toBe('curriculum');
    expect(activeRowId('/admin/curriculum/new')).toBe('builder');
    expect(activeRowId('/admin/curriculum/marketing')).toBe('builder');
    expect(activeRowId('/admin/staff')).toBe('staff');
    expect(activeRowId('/admin/usage')).toBe('usage');
    expect(activeRowId('/admin/email')).toBe('email');
    // D-169: System Health is built. The Build hub has no row (the mockup's NAV draws none).
    expect(activeRowId('/admin/health')).toBe('health');
    expect(activeRowId('/admin/build')).toBeNull();
    // The Console 404, with no row lit.
    expect(activeRowId('/admin/no-such-page')).toBeNull();
    expect(activeRowId('/admin/denied')).toBeNull();
  });

  it('D-169: the Build hub has no row; its crumb and the palette reach it, for a role that may open it', () => {
    expect(R2_NAV.flatMap(([, rows]) => rows).some((r) => r.path === '/admin/build')).toBe(false);
    expect(groupHub('Build', 'Owner', false)).toBe('/admin/build');
    expect(groupHub('Build', 'Support', false)).toBe('/admin/build');
    // `console.view`: Instructor and Content Editor build, but have no Console screen.
    expect(groupHub('Build', 'Instructor', false)).toBeNull();
    // The parity fixture draws the mockup's crumbs exactly.
    expect(groupHub('Build', 'Owner', true)).toBeNull();
    expect(groupHub('Support', 'Owner', false)).toBeNull();
    expect(hubPages('Owner', false)).toEqual([{ id: 'build', label: 'Build', icon: 'r2Curriculum', to: '/admin/build' }]);
    expect(hubPages('Content Editor', false)).toEqual([]);
  });

  it('builds the breadcrumb trail Admin / {group} / {page}', () => {
    expect(crumbTrail('/admin/roles')).toEqual({ group: 'Access', page: 'Roles & Permissions' });
    expect(crumbTrail('/admin/curriculum/new')).toEqual({ group: 'Build', page: 'Module Builder' });
    expect(crumbTrail('/admin')).toEqual({ group: 'Health', page: 'Overview' });
    expect(crumbTrail('/admin/no-such-page')).toBeNull();
    // D-162 3b: Masquerade, and the mockup's learner view under it, its parent crumb bold, not a link.
    expect(crumbTrail('/admin/masquerade')).toEqual({ group: 'Support', page: 'Masquerade' });
    expect(activeRowId('/admin/masquerade/learner-view')).toBe('masquerade');
    expect(crumbTrail('/admin/masquerade/learner-view')).toEqual({ group: 'Support', page: 'Masquerade', parent: '/admin/masquerade', parentLink: false });
    // D-169: System Health, and the Build hub's own trail, `Admin / Build`.
    expect(crumbTrail('/admin/health')).toEqual({ group: 'Health', page: 'System Health' });
    expect(crumbTrail('/admin/build')).toEqual({ group: 'Build', page: 'Build', hub: true });
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

  it('keeps API & Webhooks active on its deliveries tab, a page and not a record (D-165)', () => {
    expect(activeRowId('/admin/api')).toBe('api');
    expect(activeRowId('/admin/api/hooks')).toBe('api');
    expect(activeRowId('/admin/jobs')).toBe('jobs');
    expect(crumbTrail('/admin/api/hooks')).toEqual({ group: 'Operations', page: 'API & Webhooks' });
    expect(crumbTrail('/admin/jobs')).toEqual({ group: 'Operations', page: 'Scheduled Jobs' });
  });
});

describe('Course settings’ place (D-174)', () => {
  it('is a page of Curriculum’s, with no row of its own, so the sidebar every cell draws is unchanged', () => {
    expect(crumbTrail('/admin/curriculum/course')).toEqual({ group: 'Build', page: 'Curriculum', parent: '/admin/curriculum' });
    expect(R2_NAV.flatMap(([, rows]) => rows).some((r) => r.path === '/admin/curriculum/course')).toBe(false);
    // Every AI Employee and week the builder edits keeps its own trail.
    expect(crumbTrail('/admin/curriculum/accelerator-week-2')).toEqual(crumbTrail('/admin/curriculum/m1'));
  });

  // D-238: the Community row carries "N waiting"; a thread's page keeps it current and Support open.
  it('puts "3 waiting" on the Community row and keeps it current on a thread’s page (D-238)', () => {
    const groups = adminNav({ pathname: '/admin/community/2', role: 'Owner', fullNav: false, counts: { ...COUNTS, waiting: 3 }, peek: undefined });
    const support = groups.find((g) => g.label === 'Support')!;
    expect(support.open).toBe(true);
    expect(support.rows.find((r) => r.id === 'community')).toMatchObject({ label: 'Community', badge: '3 waiting', active: true, to: '/admin/community' });
    expect(crumbTrail('/admin/community/2')).toEqual({ group: 'Support', page: 'Community', parent: '/admin/community' });
    // The parity fixture's sidebar is the R2 reference's: no Community row.
    expect(labels(nav({ counts: { ...COUNTS, waiting: 3 } })).flat()).not.toContain('Community');
  });
});
