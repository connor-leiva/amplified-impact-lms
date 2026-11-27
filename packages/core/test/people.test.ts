import { describe, expect, it } from 'vitest';
import {
  ACCESS_GROUP_PATHS,
  CONSOLE_PLAN_LABELS,
  GOT_IN_COPY,
  consoleCan,
  gotInChipLabel,
  gotInOf,
  groupTeamOfOne,
  parseGotIn,
  payingOf,
  sortGotIn,
  adminStamp,
} from '../src';

// R-5 Phase 7 (D-268): People's rules. How a person got in (the first of plan, skill, group), the chips' order, an access
// group's team of one, what a team pays, the access group's writes (Owner and Admin) and the MT / CT stamp.

describe('how a person got in (spec Phase 7: "Got in through")', () => {
  it('is the team’s primary plan, else a skill bought, else the access group, else no plan', () => {
    const group = { id: 'utah-life', name: 'Utah Life' };
    expect(gotInOf({ planKind: 'cohort', skillBuyer: true, group })).toEqual({ key: 'plan:cohort', kind: 'plan', label: CONSOLE_PLAN_LABELS.cohort });
    expect(gotInOf({ planKind: null, skillBuyer: true, group })).toEqual({ key: 'skill', kind: 'skill', label: 'Skill buyer' });
    expect(gotInOf({ planKind: null, skillBuyer: false, group })).toEqual({ key: 'group:utah-life', kind: 'group', label: 'Utah Life' });
    expect(gotInOf({ planKind: null, skillBuyer: false, group: null })).toEqual({ key: 'none', kind: 'none', label: GOT_IN_COPY.none });
  });

  it('a group member who bought a plan counts under the plan, once (each person counted once)', () => {
    expect(gotInOf({ planKind: 'agent_plan', skillBuyer: false, group: { id: 'utah-life', name: 'Utah Life' } }).key).toBe('plan:agent_plan');
  });

  it('reads its filter keys, and refuses any other', () => {
    expect(parseGotIn('plan:agents')).toEqual({ kind: 'plan', id: 'agents' });
    expect(parseGotIn('group:utah-life')).toEqual({ kind: 'group', id: 'utah-life' });
    expect(parseGotIn('skill')).toEqual({ kind: 'skill' });
    expect(parseGotIn('none')).toEqual({ kind: 'none' });
    for (const bad of ['plan:nope', 'group:', 'plan:cohort;drop', 'everyone', '', 'group:Utah Life']) expect(parseGotIn(bad), bad).toBeNull();
  });

  it('draws the chips plans first (by the Console’s priority), then skill buyers, groups and no plan', () => {
    const chips = sortGotIn([
      { key: 'none', kind: 'none' as const, label: 'No plan' },
      { key: 'group:utah-life', kind: 'group' as const, label: 'Utah Life' },
      { key: 'skill', kind: 'skill' as const, label: 'Skill buyer' },
      { key: 'plan:agent_plan', kind: 'plan' as const, label: 'Agent Plan' },
      { key: 'plan:cohort', kind: 'plan' as const, label: 'AI Accelerator' },
    ]);
    expect(chips.map((c) => c.key)).toEqual(['plan:cohort', 'plan:agent_plan', 'skill', 'group:utah-life', 'none']);
    expect(gotInChipLabel({ kind: 'skill', label: 'Skill buyer' })).toBe('Skill buyers');
    expect(gotInChipLabel({ kind: 'plan', label: 'Team Plan' })).toBe('Team Plan');
  });
});

describe('an access group’s team of one (spec Phase 7: left out of Teams)', () => {
  it('is a team with no plan row and one member whose address is in a group', () => {
    expect(groupTeamOfOne({ plans: 0, members: 1, memberInGroup: true })).toBe(true);
    // A member who bought something is on a team with a plan row: listed like any buyer.
    expect(groupTeamOfOne({ plans: 1, members: 1, memberInGroup: true })).toBe(false);
    // Someone on their own outside every group (a skill buyer's team), and a team of two, stay.
    expect(groupTeamOfOne({ plans: 0, members: 1, memberInGroup: false })).toBe(false);
    expect(groupTeamOfOne({ plans: 0, members: 2, memberInGroup: true })).toBe(false);
  });
});

describe('what a team pays (People › Teams’ Paying)', () => {
  const base = { status: 'active', option: null, origin: 'payment_link', paymentsMade: null, amountTotal: null };
  it('says it from the primary plan and its order', () => {
    expect(payingOf({ ...base, kind: 'cohort', option: 'full' })).toBe('Paid in full');
    expect(payingOf({ ...base, kind: 'cohort', option: 'two_pay', paymentsMade: 1 })).toBe('1 of 2 payments');
    expect(payingOf({ ...base, kind: 'cohort', option: 'two_pay', paymentsMade: 2 })).toBe('Paid in full');
    expect(payingOf({ ...base, kind: 'cohort', origin: 'comp' })).toBe('Comped');
    expect(payingOf({ ...base, kind: 'agents', amountTotal: 149500 })).toBe('$1,495 a month');
    expect(payingOf({ ...base, kind: 'agents', status: 'trialing', amountTotal: 149500 })).toBe('$0');
    expect(payingOf({ ...base, kind: null })).toBe('Nothing');
  });
});

describe('the access group’s writes and stamps', () => {
  it('are Owner and Admin only (PLAN § 10.7)', () => {
    expect(consoleCan('Owner', 'access_group.write')).toBe(true);
    expect(consoleCan('Admin', 'access_group.write')).toBe(true);
    expect(consoleCan('Support', 'access_group.write')).toBe(false);
    expect(ACCESS_GROUP_PATHS.end).toBe('/api/console/groups/:groupId/end');
  });

  it('prints a stamp as "Dec 10, 8:52 AM MT / 9:52 AM CT"', () => {
    expect(adminStamp(Date.parse('2026-12-10T15:52:00Z'))).toBe('Dec 10, 8:52 AM MT / 9:52 AM CT');
    expect(adminStamp(Date.parse('2026-12-10T15:52:00Z'))).not.toMatch(/MST/);
  });
});
