import { beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import type { WorkspaceDetail, WorkspaceRow } from '@ai/core';
import { DEFAULT_WORKSPACE_FILTERS, WORKSPACE_TABS, isDefaultWorkspaceFilters, workspaceFiltersFor, workspaceRowVM, workspaceTabOf, workspaceVM } from './Workspaces.vm';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const DAY = 86_400_000;

const row = (over: Partial<WorkspaceRow> = {}): WorkspaceRow => ({
  teamId: 'northline',
  name: 'Northline Realty Team',
  ownerName: 'Alex Morgan',
  ownerEmail: 'alex@example.com',
  planKind: 'agents',
  planLabel: 'Team Plan',
  planStatus: 'active',
  seatsUsed: 15,
  seatCap: 16,
  nearCap: true,
  lastActivity: NOW,
  ...over,
});

const detail = (): WorkspaceDetail => ({
  team: { id: 'northline', name: 'Northline Realty Team', seats: 7, ownerId: 'u_alex', ownerName: 'Alex Morgan', ownerEmail: 'alex@example.com' },
  account: { id: 'a1', name: 'Northline', ownerEmail: 'alex@example.com', crm: null, stripeCustomerId: 'cus_X', createdAt: NOW - 30 * DAY, inviteSentAt: null },
  plans: [],
  primaryPlan: null,
  seatsUsed: 6,
  nearCap: false,
  members: [{ id: 'u_alex', name: 'Alex Morgan', email: 'alex@example.com', role: 'Team Owner', status: 'invited', joined: null, last: null }],
  entitlements: { sets: [], course: false, groups: [] },
  billing: { stripeCustomerId: 'cus_X', subscriptionIds: ['sub_1', 'sub_2'], orders: [], lastPaidAt: null, lastFailedAt: NOW - DAY },
  activity: [{ at: NOW, kind: 'member_joined', subject: 'u_alex', label: 'Alex Morgan' }],
});

describe('Workspaces.vm (D-158)', () => {
  beforeEach(() => setViewerZone('America/Phoenix'));

  it('sends only the filters that are set', () => {
    expect(isDefaultWorkspaceFilters(DEFAULT_WORKSPACE_FILTERS)).toBe(true);
    expect(workspaceFiltersFor(DEFAULT_WORKSPACE_FILTERS)).toEqual({});
    expect(workspaceFiltersFor({ q: '  harbor ', plan: 'agents', status: 'past_due' })).toEqual({ q: 'harbor', plan: 'agents', status: 'past_due' });
    expect(workspaceFiltersFor({ q: 'x'.repeat(150), plan: 'gold', status: 'lapsed' })).toEqual({ q: 'x'.repeat(100) });
  });

  it('makes a row: seats as used/cap, near cap as its own badge, a missing plan said', () => {
    expect(workspaceRowVM(row())).toMatchObject({ seats: '15/16', plan: 'Team Plan', nearCap: { label: 'Near Cap' }, status: { label: 'Active' }, last: 'Dec 7' });
    expect(workspaceRowVM(row({ planKind: null, planLabel: null, planStatus: null, nearCap: false, lastActivity: null, ownerName: null }))).toMatchObject({
      plan: 'No Plan',
      nearCap: null,
      status: { label: 'No Plan' },
      last: 'Never',
      owner: 'None',
    });
  });

  it('has the five tabs PR 2 fills, Members first, read from the address', () => {
    expect(WORKSPACE_TABS.map((t) => t.label)).toEqual(['Members', 'Plan & Entitlements', 'Billing', 'Activity', 'Staff Notes']);
    expect(workspaceTabOf(null)).toBe('members');
    expect(workspaceTabOf('notes')).toBe('notes');
    expect(workspaceTabOf('usage')).toBe('members');
  });

  it('makes the record: header, members, billing from local records, activity', () => {
    const vm = workspaceVM(detail());
    expect(vm).toMatchObject({ title: 'Northline Realty Team', id: 'northline', plan: 'No Plan', seats: '6/7 seats', nearCap: null });
    expect(vm.members[0]).toMatchObject({ name: 'Alex Morgan', role: 'Team Owner', last: 'Never', status: { label: 'Invited' } });
    const billing = Object.fromEntries(vm.billingPairs.map((p) => [p.label, p.value]));
    expect(billing).toMatchObject({ 'Stripe Customer': 'cus_X', Subscriptions: 'sub_1, sub_2', 'Last Paid': 'Never' });
    expect(billing['Last Failed Payment']).toMatch(/Dec 6/);
    expect(vm.planPairs.map((p) => p.label)).toEqual(['Plan', 'Owner', 'Seats Used', 'Skill Sets', 'AI Accelerator Plan', 'Access Groups']);
    expect(vm.activity).toEqual([{ key: 'member_joined:u_alex:0', when: expect.stringMatching(/Dec 7/), text: 'Alex Morgan joined' }]);
  });
});
