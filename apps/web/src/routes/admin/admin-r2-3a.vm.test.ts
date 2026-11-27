import { describe, expect, it } from 'vitest';
import { ZERO_BASE, seed } from '@ai/core';
import type { Db } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { learnerR2Details, learnersR2VM, learnersVM, LEARNERS_UI } from './Learners.vm';
import { tiersR2VM } from './Tiers.vm';
import { staffR2VM } from './Staff.vm';

// D-160 R2-3a: Learners & Teams, Tiers & Upgrades and Staff & Roles view-models of the
// Admin redesign R2. On the parity snapshot they print the mockup's words and figures (its pixels are
// proved by `pnpm parity:admin-r2`); on the ordinary and the production-shaped snapshot (ZERO_BASE,
// what the API returns) they print only what the rows say.

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const zero = (db: Db): Db => ({ ...db, base: { ...ZERO_BASE } });

describe('learnersR2VM (D-160 R2-3a)', () => {
  const db = parityDb('/admin/learners');

  it('lists the mockup’s learners in its order, their builds of the builds open to their tier, MST stamps', () => {
    const vm = learnersR2VM(db, NOW, { tier: 'All tiers', q: '' }, 'dec26');
    expect([vm.learnersCount, vm.teamsCount, vm.started]).toEqual([148, 7, true]);
    expect(vm.rows.map((r) => [r.name, r.team, r.tier, `${r.deployed} of ${r.of}`, r.last])).toEqual([
      ['Elena Vargas', 'Northshore Group', 'Team', '4 of 5', 'Dec 10, 8:52 AM MT / 9:52 AM CT'],
      ['Marcus Oyelaran', 'Northshore Group', 'Team', '3 of 5', 'Dec 9, 4:31 PM MT / 5:31 PM CT'],
      ['Jordan Hale', 'Hale & Marlowe Realty', 'Team', '5 of 5', 'Dec 9, 6:10 PM MT / 7:10 PM CT'],
      ['Noor Haddad', 'Red Cliff Collective', 'Agent', '2 of 2', 'Dec 10, 12:41 AM MT / 1:41 AM CT'],
      ['Devon Achterberg', 'Copper Basin Realty', 'Team', '2 of 5', 'Dec 9, 2:15 PM MT / 3:15 PM CT'],
      ['Sam Whitlock', 'Tidewater Property Co.', 'Agent', '1 of 2', 'Dec 4, 9:03 AM MT / 10:03 AM CT'],
      ['Tessa Lindqvist', 'Lantern Street Partners', 'Team', '1 of 5', 'Dec 9, 11:27 AM MT / 12:27 PM CT'],
    ]);
    expect(vm.rows[0]!.initials).toBe('EV');
  });

  it('filters by tier, and by name, email or team', () => {
    expect(learnersR2VM(db, NOW, { tier: 'Agent', q: '' }, 'dec26').rows.map((r) => r.name)).toEqual([
      'Noor Haddad',
      'Sam Whitlock',
    ]);
    expect(learnersR2VM(db, NOW, { tier: 'All tiers', q: 'northshore' }, 'dec26').rows).toHaveLength(2);
    expect(learnersR2VM(db, NOW, { tier: 'All tiers', q: 'tessa@' }, 'dec26').rows.map((r) => r.name)).toEqual([
      'Tessa Lindqvist',
    ]);
  });

  it('lists the teams with their seats and pending invites', () => {
    const t = learnersR2VM(db, NOW, { tier: 'All tiers', q: '' }, 'dec26').teams;
    expect(t[0]).toEqual({
      id: 'ws_northshore',
      name: 'Northshore Group',
      owner: 'Elena Vargas',
      plan: '41 seats',
      used: 2,
      seats: 41,
      invites: 'None',
    });
    expect(t.find((x) => x.id === 'ws_fourthmeridian')!.owner).toBe('—');
  });

  it('a learner’s details: the facts in MST, and each AI Employee’s build and runtime', () => {
    const p = learnersVM(db, NOW, { ...LEARNERS_UI, sel: 'u_1077' }).drawer.person!;
    const d = learnerR2Details(db, p);
    expect(d.facts).toEqual([
      { label: 'Tier', value: 'Agent' },
      { label: 'Team', value: 'Red Cliff Collective' },
      { label: 'Joined', value: 'Nov 20, 2026' },
      { label: 'Last active', value: 'Dec 10, 12:41 AM MT / 1:41 AM CT' },
    ]);
    const m1 = d.mods.find((m) => m.id === 'm1')!;
    expect([m1.build, m1.buildTone, m1.runtime]).toEqual(['Built', 'ok', 'Deployed']);
    const team = d.mods.find((m) => !m.access)!;
    expect([team.build, team.runtime]).toEqual(['Team Tier', null]);
  });
});

describe('tiersR2VM (D-160 R2-3a)', () => {
  it('counts each Team Tier size’s own teams, and the revenue they make', () => {
    const vm = tiersR2VM(parityDb('/admin/tiers'));
    // D-269: no revenue line (it named December by id; revenue is Revenue › Summary's).
    expect(vm).not.toHaveProperty('summary');
    expect(vm.cards.map((c) => [c.title, c.seats, c.count, c.price, c.per, c.revenue])).toEqual([
      ['Agent Tier', '1 seat', '104 licenses', 995, 'per agent, per cohort', '$103,480'],
      ['Team Tier', '16 seats', '5 teams', 4995, 'per team, per cohort', '$24,975'],
      ['Team Tier', '41 seats', '2 teams', 9995, 'per team, per cohort', '$19,990'],
    ]);
  });

  it('lists open requests first, oldest first, with the old actions; then the rest', () => {
    const vm = tiersR2VM(parityDb('/admin/tiers'));
    expect(vm.requests.map((r) => [r.name, r.ask, r.value, r.received, r.status.label])).toEqual([
      ['Kenji Watanabe', 'Agent → Team · 16 seats', '$4,000', 'Dec 9, 3:02 PM MT / 4:02 PM CT', 'Pending'],
      ['Jordan Hale', 'Team · 16 seats → 41 seats', '$4,000', 'Dec 9, 6:12 PM MT / 7:12 PM CT', 'Pending'],
      ['Rosa Delgado', 'Agent → Team · 16 seats', '$4,000', 'Dec 4, 1:30 PM MT / 2:30 PM CT', 'Approved'],
    ]);
    expect(vm.requests[0]!.actions.map((a) => a.label)).toEqual(['Mark Contacted', 'Decline']);
    expect(vm.requests[1]!.actions.map((a) => a.label)).toEqual(['Mark Contacted', 'Convert to Team', 'Decline']);
    expect(vm.requests[2]!.actions).toEqual([]);
  });

  it('draws every AI Employee in the access matrix, in curriculum order', () => {
    const vm = tiersR2VM(parityDb('/admin/tiers'));
    expect(vm.matrix).toHaveLength(15);
    expect(vm.matrix.filter((m) => m.agent).map((m) => m.name)).toEqual([
      'Marketing AI Employee',
      'Sales AI Employee',
      'Database AI Employee',
    ]);
    expect(vm.matrix[0]!.toggle).toEqual({ id: 'm1', tier: 'team' });
  });

  it('with no tier rows (production: prices live in Stripe), shows no cards and no revenue', () => {
    const db = { ...zero(seed('live')), tiers: [] };
    const vm = tiersR2VM(db);
    expect(vm.cards).toEqual([]);
    expect(vm.requests.every((r) => r.value === '—')).toBe(true);
    // A request with no recorded ask reads "Agent → Team".
    expect(vm.requests[0]!.ask).toBe('Agent → Team');
  });
});

describe('staffR2VM (D-160 R2-3a)', () => {
  it('marks the viewer’s own row, prints MST stamps, and keeps the old matrix', () => {
    const vm = staffR2VM(parityDb('/admin/staff'), 'st1');
    expect(vm.rows.map((r) => [r.name, r.role, r.last, r.isOwner])).toEqual([
      ['Connor Leiva (you)', 'Owner', 'Dec 10, 9:22 AM MT / 10:22 AM CT', true],
      ['Avery Stone', 'Admin', 'Dec 9, 5:48 PM MT / 6:48 PM CT', false],
      ['Imani Brooks', 'Support', 'Dec 9, 9:30 PM MT / 10:30 PM CT', false],
    ]);
    expect(staffR2VM(parityDb('/admin/staff'), 'st2').rows[1]!.name).toBe('Avery Stone (you)');
    expect(vm.perms).toHaveLength(8);
    expect(vm.perms[0]!.cells.find((c) => c.role === 'Owner')).toEqual({ role: 'Owner', on: true, fixed: true });
    expect(vm.inviteRoles).not.toContain('Owner');
  });
});
