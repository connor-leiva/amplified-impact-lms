import { describe, expect, it } from 'vitest';
import { ZERO_BASE, seed } from '@ai/core';
import type { Db } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { overviewR2VM } from './Overview.vm';
import { learnerR2Details, learnersR2VM, learnersVM, LEARNERS_UI } from './Learners.vm';
import { tiersR2VM } from './Tiers.vm';
import { staffR2VM } from './Staff.vm';

// D-160 R2-3a: the Overview, Learners & Teams, Tiers & Upgrades and Staff & Roles view-models of the
// Admin redesign R2. On the parity snapshot they print the mockup's words and figures (its pixels are
// proved by `pnpm parity:admin-r2`); on the ordinary and the production-shaped snapshot (ZERO_BASE,
// what the API returns) they print only what the rows say.

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const zero = (db: Db): Db => ({ ...db, base: { ...ZERO_BASE } });

describe('overviewR2VM (D-160 R2-3a)', () => {
  const vm = overviewR2VM(parityDb('/admin'), NOW);

  it('prints the mockup’s head and tiles, in its words', () => {
    expect(vm.subline).toBe('December 2026 Cohort · Week 2 of 6 · Updated live from learner activity');
    expect(vm.stats.map((s) => [s.label, s.value, s.sub, s.tone, s.to])).toEqual([
      // D-253: each tile opens its page at its new address.
      ['Active learners', '148', '104 Agent · 44 Team', null, '/admin/cohort/dec26/people'],
      ['AI Employees deployed', '190', '+6 in the last 24 hours', 'ok', '/admin/program'],
      // R-5 audit (D-267): every number opens the list it counts; Build completion opens the builds.
      ['Build completion', '33%', 'Of builds available', null, '/admin/program'],
      ['Live attendance', '74%', 'Session 2 · 109 attended', null, '/admin/cohort/dec26/schedule'],
      ['Upgrade pipeline', '$8,000', '2 open requests', 'warn', '/admin/revenue/plans'],
    ]);
    expect(vm.stats.map((s) => [s.labelPhone, s.subPhone])).toEqual([
      ['Active learners', '44 on Team Tier'],
      ['Deployed', '+6 in 24 hours'],
      ['Completion', 'Of open builds'],
      ['Attendance', 'Session 2'],
      ['Upgrade pipeline', '2 open requests'],
    ]);
  });

  it('charts the deployments from the first build, to the last day with one, on the old scale', () => {
    expect(vm.chart!.total).toBe('190 total');
    expect(vm.chart!.labels).toEqual(['Dec 2', 'Dec 3', 'Dec 4', 'Dec 5', 'Dec 6', 'Dec 7', 'Dec 8']);
    expect(vm.chart!.labelsPhone).toEqual(['Dec 2', 'Dec 4', 'Dec 6', 'Dec 8']);
    // The mockup's `i * 100, 200 - v * 0.95`.
    expect(vm.chart!.line.split(' ').map((p) => p.split(',').map(Number))).toEqual(
      [22, 58, 96, 121, 150, 178, 190].map((v, i) => [i * 100, expect.closeTo(200 - v * 0.95, 6)]),
    );
  });

  it('lists the five latest events, the five most deployed open builds, and each session held then the next', () => {
    expect(vm.feed.map((e) => [e.who, e.ago, e.tone])).toEqual([
      ['Sarah Collins', '38 min ago', 'ok'],
      ['Rosa Delgado', '2 hours ago', 'ok'],
      ['Natasha Reed', '2 hours ago', 'ok'],
      ['Devon Price', '14 hours ago', 'ok'],
      ['Kenji Watanabe', '18 hours ago', 'warn'],
    ]);
    expect(vm.funnel.map((f) => [f.name, f.pct, f.of])).toEqual([
      ['Marketing', '66%', '· 98 of 148'],
      ['Sales', '35%', '· 52 of 148'],
      ['Week 1 · Know the Business', '75%', '· 33 of 44'],
      ['Week 2 · Own the Day', '39%', '· 17 of 44'],
      ['Database', '0%', '· 0 of 148'],
    ]);
    expect(vm.attendance).toEqual([
      { key: 'dec26-s1', label: 'Session 1 · Dec 2', pct: 82 },
      { key: 'dec26-s2', label: 'Session 2 · Dec 9', pct: 74 },
      { key: 'dec26-s3', label: 'Session 3 · Dec 16', pct: null },
    ]);
  });

  it('before the cohort opens: no chart, no feed, "Not started" and the opening in MT and CT', () => {
    const before = overviewR2VM(parityDb('/admin'), Date.parse('2026-11-30T16:00:00Z'));
    expect(before.started).toBe(false);
    expect(before.chart).toBeNull();
    expect(before.feed).toEqual([]);
    // R-5 audit (D-267): times in MT with CT after (`fmt.mtCt`); this world's December has no run, so it reads its opening.
    expect(before.subline).toBe(
      'December 2026 Cohort · Opens Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · 148 learners enrolled',
    );
    expect(before.stats[1]!.sub).toBe('Counting starts Dec 2');
    expect(before.notStarted).toBe(
      'Deploys are counted from the first live build on Wed, Dec 2 at 12:00 PM MT / 1:00 PM CT.',
    );
  });

  it('with the API’s ZERO_BASE, every figure is the modelled rows’ own', () => {
    const db = zero(seed('live'));
    const z = overviewR2VM(db, Date.parse('2026-12-07T16:42:00Z'));
    const users = db.users.filter((u) => u.status !== 'invited');
    expect(z.stats[0]!.value).toBe(String(users.length));
    const deployed = users.reduce((a, u) => a + Object.values(u.progress).filter((p) => p.deployedAt).length, 0);
    expect(z.chart!.total).toBe(`${deployed} total`);
    expect(z.stats[1]!.value).toBe(String(deployed));
  });
});

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
