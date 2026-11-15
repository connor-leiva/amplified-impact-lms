import { describe, expect, it } from 'vitest';
import { ADMIN_NOT_FOUND, crumbsFor, recordNameFor } from './Breadcrumbs';
import { seed } from '@ai/core';

// SCREENS § 2.2's table, plus the Admin Console's screens (D-157).
describe('crumbsFor', () => {
  it('keeps every existing screen’s crumbs', () => {
    expect(crumbsFor('/')).toEqual([{ label: 'Dashboard' }]);
    expect(crumbsFor('/sessions/')).toEqual([{ label: 'Sessions' }]);
    expect(crumbsFor('/employees/sales', 'Sales AI Employee')).toEqual([{ label: 'AI Employees', to: '/' }, { label: 'Sales AI Employee' }]);
    expect(crumbsFor('/admin')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Overview' }]);
    expect(crumbsFor('/admin/staff')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Staff & Roles' }]);
    expect(crumbsFor('/admin/curriculum/new')).toEqual([
      { label: 'Admin', to: '/admin' },
      { label: 'Curriculum', to: '/admin/curriculum' },
      { label: 'New AI Employee' },
    ]);
    expect(crumbsFor('/nowhere')).toEqual([{ label: 'Dashboard' }]);
  });

  it('names the Console’s screens and its 404', () => {
    expect(crumbsFor('/admin/audit')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Audit Log' }]);
    expect(crumbsFor('/admin/roles')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Roles & Permissions' }]);
    expect(crumbsFor('/admin/no-such-page')).toEqual([{ label: 'Admin', to: '/admin' }, { label: ADMIN_NOT_FOUND }]);
    expect(ADMIN_NOT_FOUND).toBe('Page Not Found');
  });

  it('names the Console’s records under their lists (D-158)', () => {
    expect(crumbsFor('/admin/workspaces')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Workspaces' }]);
    expect(crumbsFor('/admin/users')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Users' }]);
    expect(crumbsFor('/admin/workspaces/northline', '', 'Northline Realty Team')).toEqual([
      { label: 'Admin', to: '/admin' },
      { label: 'Workspaces', to: '/admin/workspaces' },
      { label: 'Northline Realty Team' },
    ]);
    expect(crumbsFor('/admin/users/nobody/')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Users', to: '/admin/users' }, { label: 'User' }]);
    // Deeper than a record is no screen: the Console 404.
    expect(crumbsFor('/admin/users/u_alex/email')).toEqual([{ label: 'Admin', to: '/admin' }, { label: ADMIN_NOT_FOUND }]);
  });

  it('reads a record’s name from the snapshot', () => {
    const db = seed('live');
    expect(recordNameFor(db, '/admin/workspaces/northline')).toBe('Northline Realty Team');
    expect(recordNameFor(db, '/admin/users/u_jamie')).toBe('Jamie Ortiz');
    expect(recordNameFor(db, '/admin/users/st4')).toBe('Luis Romero');
    expect(recordNameFor(db, '/admin/users/nobody')).toBe('');
    expect(recordNameFor(db, '/admin/users/%E0')).toBe('');
    expect(recordNameFor(db, '/admin/audit')).toBe('');
  });
});
