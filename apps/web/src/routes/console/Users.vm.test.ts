import { beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import type { ConsoleUserDetail, ConsoleUserRow } from '@ai/core';
import { KIND_OPTIONS, ROLE_OPTIONS, USER_TABS, canReset, resetFailure, signInMethods, userFiltersFor, userRowVM, userTabOf, userVM, usersExportFailure } from './Users.vm';

const NOW = Date.parse('2026-12-07T16:42:00Z');

const u = (over: Partial<ConsoleUserRow> = {}): ConsoleUserRow => ({
  id: 'u_jamie',
  name: 'Jamie Ortiz',
  email: 'jamie@example.com',
  kind: 'learner',
  role: 'Agent',
  teamId: null,
  workspace: 'Individual',
  status: 'active',
  lastActive: NOW,
  ...over,
});

const detail = (over: Partial<ConsoleUserDetail['user']> = {}, identity: Partial<ConsoleUserDetail['identity']> = {}): ConsoleUserDetail => ({
  user: { id: 'u_alex', name: 'Alex Morgan', email: 'alex@example.com', kind: 'learner', role: 'Team Owner', staffRole: null, tier: 'team', teamId: 'northline', workspace: 'Northline Realty Team', cohortId: 'dec26', status: 'active', joined: NOW, lastActive: NOW, ...over },
  identity: { emailVerifiedAt: NOW, hasPassword: true, hasGoogle: false, ...identity },
  orders: [],
  progress: [{ moduleId: 'marketing', moduleName: 'Marketing', steps: 3, builtAt: null, deployedAt: null }],
  entitlements: { sets: ['agent'], course: false, groups: [] },
});

describe('Users.vm (D-158)', () => {
  beforeEach(() => setViewerZone('America/Phoenix'));

  it('filters by words, a learner or staff role, and kind', () => {
    expect(ROLE_OPTIONS.map((o) => o.label)).toEqual(['Any Role', 'Team Owner', 'Operations Lead', 'Sales Agent', 'Agent', 'Owner', 'Admin', 'Instructor', 'Content Editor', 'Support']);
    expect(KIND_OPTIONS.map((o) => o.label)).toEqual(['Learners and Staff', 'Learners', 'Staff']);
    expect(userFiltersFor({ q: ' jamie ', role: 'Support', kind: 'staff' })).toEqual({ q: 'jamie', role: 'Support', kind: 'staff' });
    expect(userFiltersFor({ q: '', role: 'Wizard', kind: 'robot' })).toEqual({});
  });

  it('shows Last Active as a day (D-145), Individual for no team, and Staff for staff', () => {
    expect(userRowVM(u())).toMatchObject({ workspace: 'Individual', last: 'Dec 7', status: { label: 'Active' } });
    expect(userRowVM(u({ kind: 'staff', role: 'Support', workspace: null, status: null, lastActive: null }))).toMatchObject({ workspace: 'None', status: { label: 'Staff' }, last: 'Never' });
  });

  it('has four tabs, Profile first', () => {
    expect(USER_TABS.map((t) => t.label)).toEqual(['Profile', 'Orders', 'Progress', 'Notes']);
    expect(userTabOf('emails')).toBe('profile');
  });

  it('shows identity as existence only', () => {
    const vm = userVM(detail({}, { hasGoogle: true }));
    const id = Object.fromEntries(vm.identity.map((p) => [p.label, p.value]));
    expect(id).toMatchObject({ 'Email Verified': 'Yes, Dec 7', 'Sign-In Methods': 'Email Link, Password, Google', 'Last Active': 'Dec 7', 'Staff Role': 'None' });
    expect(signInMethods({ emailVerifiedAt: null, hasPassword: false, hasGoogle: false })).toBe('Email Link');
    expect(userVM(detail({}, { emailVerifiedAt: null })).identity.find((p) => p.label === 'Email Verified')!.value).toBe('No');
    expect(vm.workspace).toEqual({ teamId: 'northline', name: 'Northline Realty Team' });
    expect(vm.progress).toEqual([{ key: 'marketing', name: 'Marketing', steps: '3', built: 'No', deployed: 'No' }]);
  });

  it('offers the reset to Console roles, and a staff member’s to the Owner alone', () => {
    expect(canReset('Support', { kind: 'learner' })).toBe(true);
    expect(canReset('Admin', { kind: 'staff' })).toBe(false);
    expect(canReset('Owner', { kind: 'staff' })).toBe(true);
    expect(canReset('Instructor', { kind: 'learner' })).toBe(false);
    expect(resetFailure('forbidden', 'Only the Owner can reset a staff member’s password.')).toBe('Only the Owner can reset a staff member’s password.');
    expect(resetFailure('rate_limited', '')).toMatch(/Too many requests/);
    expect(usersExportFailure('too_large', 'This export is over 10,000 rows.')).toBe('This export is over 10,000 rows.');
  });
});
