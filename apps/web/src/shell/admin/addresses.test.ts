import { describe, expect, it } from 'vitest';
import { currentAdminHref, movedAdminPath, personPath, teamPath, weekPath } from './addresses';
import { placeOf } from './adminNav';

// D-253 (spec § 3): every old admin address lands on its new one.

const MOVED: [string, string][] = [
  // Build
  ['/admin/curriculum', '/admin/program'],
  ['/admin/curriculum/', '/admin/program'],
  ['/admin/curriculum/new', '/admin/program/weeks/new'],
  ['/admin/curriculum/m1', '/admin/program/weeks/m1'],
  ['/admin/curriculum/accelerator-week-2', '/admin/program/weeks/accelerator-week-2'],
  ['/admin/curriculum/course', '/admin/program/course'],
  ['/admin/vault', '/admin/program/vault'],
  ['/admin/build', '/admin/program'],
  ['/admin/cohorts', '/admin/cohort/dec26/schedule'],
  ['/admin/announcements', '/admin/cohort/dec26/announcements'],
  // Support
  ['/admin/learners', '/admin/cohort/dec26/people'],
  ['/admin/community', '/admin/cohort/dec26/community'],
  ['/admin/community/12', '/admin/cohort/dec26/community/12'],
  ['/admin/workspaces', '/admin/people/teams'],
  ['/admin/workspaces/ws_northshore', '/admin/people/teams/ws_northshore'],
  ['/admin/users', '/admin/people'],
  ['/admin/users/u_1042', '/admin/people/u_1042'],
  ['/admin/masquerade', '/admin/people/masquerade'],
  // Revenue
  ['/admin/tiers', '/admin/revenue/plans'],
  ['/admin/billing', '/admin/revenue'],
  ['/admin/billing/customers', '/admin/revenue/payments/customers'],
  ['/admin/billing/subscriptions', '/admin/revenue/payments/subscriptions'],
  ['/admin/billing/invoices', '/admin/revenue/payments/invoices'],
  ['/admin/billing/failed', '/admin/revenue/payments/failed'],
  ['/admin/billing/refunds', '/admin/revenue/payments/refunds'],
  ['/admin/usage', '/admin/revenue/usage'],
];

const STAY = [
  '/admin',
  '/admin/health',
  '/admin/incidents',
  '/admin/incidents/INC-0007',
  '/admin/audit',
  '/admin/api',
  '/admin/api/hooks',
  '/admin/jobs',
  '/admin/email',
  '/admin/integrations',
  '/admin/deploys',
  '/admin/db',
  '/admin/flags',
  '/admin/roles',
  '/admin/staff',
  '/admin/search',
  // The learner view keeps its address (spec § 3).
  '/admin/masquerade/learner-view',
  // Already new.
  '/admin/program',
  '/admin/cohort/dec26',
  '/admin/people/teams',
  '/admin/revenue/payments',
];

describe('old admin addresses (D-253)', () => {
  it('each lands on its new one', () => {
    for (const [from, to] of MOVED) expect(movedAdminPath(from, 'dec26'), from).toBe(to);
  });

  it('every new address is a page the admin draws', () => {
    for (const [from, to] of MOVED) {
      // `/admin/revenue/payments/customers` is Payments' Customers by its tab's name, as `/admin/billing/customers` was.
      expect(placeOf(to), `${from} → ${to}`).not.toBeNull();
    }
  });

  it('a cohort’s page lands in the cohort the admin is on', () => {
    expect(movedAdminPath('/admin/cohorts', 'jan27')).toBe('/admin/cohort/jan27/schedule');
    expect(movedAdminPath('/admin/learners', 'jan27')).toBe('/admin/cohort/jan27/people');
  });

  it('leaves alone what did not move, and an address that was never a page', () => {
    for (const p of STAY) expect(movedAdminPath(p, 'dec26'), p).toBeNull();
    for (const p of ['/admin/users/u_1/orders', '/admin/curriculum/m1/x', '/admin/vault/x', '/admin/tiers/x', '/sessions']) expect(movedAdminPath(p, 'dec26'), p).toBeNull();
  });

  it('rewrites a link the API still writes the old way, keeping its query and hash', () => {
    expect(currentAdminHref('/admin/users/u_1', 'dec26')).toBe('/admin/people/u_1');
    expect(currentAdminHref('/admin/workspaces/ws_1?tab=billing#top', 'dec26')).toBe('/admin/people/teams/ws_1?tab=billing#top');
    expect(currentAdminHref('/admin/incidents/INC-1', 'dec26')).toBe('/admin/incidents/INC-1');
  });

  it('writes a person’s, a team’s and a week’s address', () => {
    expect([personPath('u 1'), teamPath('ws_1'), weekPath('new')]).toEqual(['/admin/people/u%201', '/admin/people/teams/ws_1', '/admin/program/weeks/new']);
  });
});
