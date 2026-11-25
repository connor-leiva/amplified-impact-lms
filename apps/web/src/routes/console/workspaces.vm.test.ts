import { describe, expect, it } from 'vitest';
import { fixtureRecords, fixtureWorkspace, fixtureWorkspaceRows } from '../../data/console-fixture-records';
import { SUPPORT_WS } from '../../data/parity-r2';
import {
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  isDefaultWorkspaceFilters,
  workspaceFiltersFor,
  workspaceRowVM,
  workspaceTabOf,
  workspaceVM,
} from './workspaces.vm';

// D-160 R2-1c: from what the API answers (here the fixture's, AdminRedesign.jsx's own `WS` and `USERS`
// in the API's shapes), the view-models print exactly the mockup's words.

describe('the Workspaces list (spec § 7.3) on R2', () => {
  const rows = fixtureWorkspaceRows(fixtureRecords(), {}).map(workspaceRowVM);

  it('prints every row as the mockup does: name and id, owner, plan, seats, status, last activity', () => {
    expect(rows.map((r) => [r.name, r.id, r.owner, r.plan, r.seats.text, r.status.label, r.last])).toEqual(
      SUPPORT_WS.map((w) => [w.n, w.id, w.owner, w.plan, `${w.used} of ${w.cap}`, w.st, w.last]),
    );
    expect(rows[0]!.href).toBe('/admin/people/teams/ws_northshore');
  });

  it('colours each seat bar as BUILD-SPEC § 7 says: amber near the cap, grey when a fixed-seat plan is full', () => {
    expect(Object.fromEntries(rows.map((r) => [r.id, r.seats.bar]))).toEqual({
      ws_northshore: 'ok',
      ws_halemarlowe: 'hot',
      ws_redcliff: 'hot',
      ws_copperbasin: 'full',
      ws_tidewater: 'full',
      ws_lantern: 'ok',
      ws_fourthmeridian: 'ok',
    });
    expect(rows.find((r) => r.id === 'ws_northshore')!.seats.pct).toBeCloseTo(80.49, 1);
  });

  it('gives the status its tone: never colour alone', () => {
    expect(rows.map((r) => r.status.tone)).toEqual(['ok', 'ok', 'ok', 'ok', 'bad', 'info', 'off']);
  });

  it('offers the mockup’s filters and sends the API only what is set', () => {
    expect(PLAN_OPTIONS.map((o) => o.label)).toEqual([
      'All plans',
      'Team Plan',
      'Agent Plan',
      'Insiders',
      'AI Accelerator',
    ]);
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(['Any status', 'Active', 'Trialing', 'Past due', 'Canceled']);
    expect(workspaceFiltersFor({ q: '  north  ', plan: 'agents', status: 'past_due' })).toEqual({
      q: 'north',
      plan: 'agents',
      status: 'past_due',
    });
    expect(workspaceFiltersFor({ q: '', plan: 'nope', status: '' })).toEqual({});
    expect(isDefaultWorkspaceFilters({ q: ' ', plan: '', status: '' })).toBe(true);
  });
});

describe('one workspace (spec § 7.3) on R2', () => {
  const vm = workspaceVM(fixtureWorkspace(fixtureRecords(), 'ws_northshore')!);

  it('has the mockup’s key facts, its MRR from local orders', () => {
    expect(vm.title).toBe('Northshore Group');
    expect(vm.status).toEqual({ label: 'Active', tone: 'ok' });
    expect(vm.facts).toEqual({
      id: 'ws_northshore',
      plan: 'Team Plan · 41 seats',
      seats: '33 of 41',
      owner: 'Elena Vargas',
      mrr: '$1,495',
      last: 'Dec 10, 8:52 AM',
      welcome: null,
    });
  });

  it('lists its members with avatars, roles and statuses, each opening the person', () => {
    expect(vm.members.map((m) => [m.initials, m.name, m.email, m.role, m.status.label, m.href])).toEqual([
      ['EV', 'Elena Vargas', 'elena@northshoregroup.example', 'Team owner', 'Active', '/admin/people/u_1042'],
      ['MO', 'Marcus Oyelaran', 'marcus@northshoregroup.example', 'Agent', 'Active', '/admin/people/u_1043'],
    ]);
  });

  it('reads plan, seat tier, groups, renewal and billing as the mockup’s other tabs do', () => {
    expect(vm.plan.plan).toBe('Team Plan · 41 seats');
    expect(vm.plan.tier).toEqual({
      text: 'Team Plan is sold in two sizes, 16 or 41 seats. Changing size is an upgrade request in Tiers & Upgrades.',
      locked: true,
    });
    expect(vm.plan.groups).toEqual(['library', 'agent', 'team']);
    expect(vm.plan.renews).toBe('Jan 8, 2027');
    expect(vm.billing).toEqual({
      customer: 'cus_Rk3NshoreA1',
      subscription: 'sub_1Qn7NshoreT41',
      mrr: '$1,495',
      invoice: { id: 'in_1QxT4mNs0291', status: { label: 'Paid', tone: 'ok' } },
    });
    expect(vm.activity[0]).toMatchObject({ text: 'Team Plan order started', when: 'Dec 8, 9:00 AM' });
  });

  it('MRR: One-time for the AI Accelerator, $0 while trialing, the latest order while past due', () => {
    const r = fixtureRecords();
    const mrr = (id: string) => workspaceVM(fixtureWorkspace(r, id)!).facts.mrr;
    expect(SUPPORT_WS.map((w) => mrr(w.id))).toEqual(SUPPORT_WS.map((w) => w.mrr));
    expect(workspaceVM(fixtureWorkspace(r, 'ws_copperbasin')!).plan.tier.text).toBe(
      'Cohort cap is a product rule. View only.',
    );
    expect(workspaceVM(fixtureWorkspace(r, 'ws_copperbasin')!).plan.renews).toBe('One-time purchase');
  });

  it('opens Members unless the address names another tab', () => {
    expect(workspaceTabOf(null)).toBe('members');
    expect(workspaceTabOf('billing')).toBe('billing');
    expect(workspaceTabOf('notes')).toBe('members');
  });
});
