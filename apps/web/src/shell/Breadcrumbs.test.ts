import { describe, expect, it } from 'vitest';
import { ADMIN_NOT_FOUND, crumbsFor } from './Breadcrumbs';

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
    expect(crumbsFor('/admin/roles')).toEqual([{ label: 'Admin', to: '/admin' }, { label: 'Roles & Permissions' }]);
    expect(crumbsFor('/admin/no-such-page')).toEqual([{ label: 'Admin', to: '/admin' }, { label: ADMIN_NOT_FOUND }]);
    expect(ADMIN_NOT_FOUND).toBe('Page Not Found');
  });
});
