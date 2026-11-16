import { describe, expect, it } from 'vitest';
import { fixtureRecords, fixtureUser, fixtureUserRows } from '../../data/console-fixture-records';
import { SUPPORT_USERS } from '../../data/parity-r2';
import { ROLE_OPTIONS, canReset, isDefaultUserFilters, signInOf, userFiltersFor, userRowVM, userVM } from './users.vm';

// D-160 R2-1c: the Users list and one user, from the API's shapes, in the mockup's words.

describe('the Users list (spec § 7.4) on R2', () => {
  const rows = fixtureUserRows(fixtureRecords(), userFiltersFor({ q: '', role: '' })).map(userRowVM);

  it('lists learners as the mockup does: name, email, workspace, role, status, last sign-in', () => {
    expect(rows.map((r) => [r.initials, r.name, r.email, r.workspace, r.role, r.status.label, r.last])).toEqual(
      SUPPORT_USERS.map((u) => [
        u.n
          .split(' ')
          .map((w) => w[0])
          .join(''),
        u.n,
        u.e,
        u.ws,
        u.role,
        u.st,
        u.last,
      ]),
    );
  });

  it('asks the API for learners, by words and the mockup’s two roles', () => {
    expect(userFiltersFor({ q: ' elena ', role: 'Team Owner' })).toEqual({
      kind: 'learner',
      q: 'elena',
      role: 'Team Owner',
    });
    expect(userFiltersFor({ q: '', role: 'Owner' })).toEqual({ kind: 'learner' });
    expect(ROLE_OPTIONS.map((o) => o.label)).toEqual(['Any role', 'Team owner', 'Agent']);
    expect(isDefaultUserFilters({ q: '', role: '' })).toBe(true);
    expect(fixtureUserRows(fixtureRecords(), userFiltersFor({ q: '', role: 'Agent' })).map((u) => u.id)).toEqual([
      'u_1043',
      'u_1104',
    ]);
  });
});

describe('one user (spec § 7.4) on R2', () => {
  const detail = fixtureUser(fixtureRecords(), 'u_1042')!;
  const vm = userVM(detail);

  it('has the mockup’s key facts, the workspace a link', () => {
    expect(vm.title).toBe('Elena Vargas');
    expect(vm.facts).toEqual({
      id: 'u_1042',
      email: 'elena@northshoregroup.example',
      workspace: 'Northshore Group',
      workspaceHref: '/admin/workspaces/ws_northshore',
      role: 'Team owner',
      tier: 'Team',
      last: 'Dec 10, 8:52 AM',
    });
  });

  it('lists the orders as the mockup does', () => {
    expect(vm.orders.map((o) => [o.id, o.amount, o.status.label, o.date])).toEqual([
      ['in_1QxT4mNs0291', '$1,495.00', 'Paid', 'Dec 8, 2026'],
    ]);
  });

  it('reads identity as existence only: verified, how they sign in, staff role, groups', () => {
    expect(vm.identity).toEqual({
      verified: 'Yes, Nov 24, 2026',
      signIn: 'Password, Google',
      staff: 'None',
      groups: ['library', 'agent', 'team'],
    });
    expect(signInOf({ emailVerifiedAt: null, hasPassword: false, hasGoogle: false })).toBe('Email link');
  });

  it('prints progress and activity', () => {
    expect(vm.progress.map((p) => p.status.label)).toEqual([
      'Deployed',
      'Deployed',
      'Deployed',
      'Deployed',
      'In progress',
    ]);
    expect(vm.activity[0]).toEqual({ key: expect.any(String), text: 'Signed in', when: 'Dec 10, 8:52 AM' });
    expect(vm.activity.at(-1)!.text).toBe('Account created');
  });

  it('lets the reset go out by capability, a staff member’s by the Owner alone (spec § 7.4)', () => {
    expect(canReset('Support', detail.user)).toBe(true);
    expect(canReset('Instructor', detail.user)).toBe(false);
    const staff = fixtureUser(fixtureRecords(), 'u_0002')!.user;
    expect(canReset('Admin', staff)).toBe(false);
    expect(canReset('Owner', staff)).toBe(true);
  });
});
