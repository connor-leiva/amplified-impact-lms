// D-243 (Connor, Nov 24): "exclude the Utah Life members, but I don't want it 'hardcoded'... put them in a separate
// category altogether." The admin's cohort numbers and lists count the learners in the course only; the server
// names the ones outside it (`db.outside`), and each access group with people in it gets a tab on Learners & Teams.
// Without `db.outside` (the fixture, the mockup's parity snapshot) every figure is the one it was.
import { describe, expect, it } from 'vitest';
import { canAccess, courseUsers, fmt, seed, statusOf, ZERO_BASE } from '@ai/core';
import type { Db, Learner, Outside } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { cohortsVM } from './Cohorts.vm';
import { curriculumR2VM } from './Curriculum.vm';
import { learnersR2VM, learnersVM, LEARNERS_UI } from './Learners.vm';
import { overviewR2VM } from './Overview.vm';
import { tiersR2VM } from './Tiers.vm';

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const ALL = { tier: 'All tiers' as const, q: '' };

/** The production shape (ZERO_BASE), plus a Utah Life agent the way provisioning makes one: a team of one, no name. */
function withUtahLife(): Db {
  const db: Db = { ...seed('live'), base: { ...ZERO_BASE } };
  const jane: Learner = {
    ...db.users.find((u) => u.id === 'u_jamie')!,
    id: 'u_ul',
    name: '',
    email: 'jane@liveutah.com',
    teamId: 't_ul',
    role: 'Team Owner',
    tier: 'agent',
    status: 'active',
    last: Date.parse('2026-12-09T15:00:00.000Z'),
    progress: {},
  };
  return { ...db, users: [...db.users, jane], teams: [...db.teams, { ...db.teams[0]!, id: 't_ul', name: '', ownerId: 'u_ul', seats: 1 }] };
}

// Jane is Utah Life's; Kenji stands in for another plan's buyer, in no group.
const OUTSIDE: Outside = { ids: ['u_ul', 'u_kenji'], groups: [{ id: 'utah-life', name: 'Utah Life', ids: ['u_ul'] }] };

describe('without `db.outside`, every figure is the one it was', () => {
  it('the parity snapshot: the mockup’s counts and no group tab', () => {
    const vm = learnersR2VM(parityDb('/admin/learners'), NOW, ALL);
    expect([vm.learnersCount, vm.teamsCount, vm.groups]).toEqual([148, 7, []]);
  });

  it('the production shape: everyone is the cohort’s', () => {
    const db = withUtahLife();
    const vm = learnersR2VM(db, NOW, ALL);
    expect(vm.rows.map((r) => r.id)).toContain('u_ul');
    expect(vm.groups).toEqual([]);
  });
});

describe('Learners & Teams', () => {
  const db: Db = { ...withUtahLife(), outside: OUTSIDE };
  const plain = withUtahLife();

  it('lists and counts the cohort’s learners and teams only', () => {
    const vm = learnersR2VM(db, NOW, ALL);
    const before = learnersR2VM(plain, NOW, ALL);
    expect(vm.rows.map((r) => r.id)).toEqual(before.rows.map((r) => r.id).filter((id) => !OUTSIDE.ids.includes(id)));
    expect(vm.teams.map((t) => t.id)).toEqual(before.teams.map((t) => t.id).filter((id) => id !== 't_ul'));
    expect(vm.learnersCount).toBe(before.learnersCount - 2);
    expect(vm.teamsCount).toBe(before.teamsCount - 1);
  });

  it('gives Utah Life a tab of its own, named from the data: the address stands in for a missing name', () => {
    expect(learnersR2VM(db, NOW, ALL).groups).toEqual([
      {
        key: 'group:utah-life',
        name: 'Utah Life',
        rows: [{ id: 'u_ul', name: 'jane@liveutah.com', email: '', initials: 'J', last: 'Dec 9, 8:00 AM', lastAt: Date.parse('2026-12-09T15:00:00.000Z') }],
      },
    ]);
  });

  it('shows a sign-up who hasn’t followed their link as pending', () => {
    const pending: Db = { ...db, users: db.users.map((u) => (u.id === 'u_ul' ? { ...u, status: 'invited' as const } : u)) };
    expect(learnersR2VM(pending, NOW, ALL).groups[0]!.rows[0]!.last).toBe('Invite pending');
  });

  it('has no tab for a group whose people are all in the course', () => {
    const joined: Db = { ...db, outside: { ids: ['u_kenji'], groups: [{ id: 'utah-life', name: 'Utah Life', ids: ['u_ul'] }] } };
    expect(learnersR2VM(joined, NOW, ALL).groups).toEqual([]);
  });

  it('the old view-model counts the same way', () => {
    const vm = learnersVM(db, NOW, LEARNERS_UI);
    expect(vm.rows.map((r) => r.id)).not.toContain('u_ul');
    expect(vm.teams.map((t) => t.id)).not.toContain('t_ul');
    expect(vm.stats[0]!.value).toBe(fmt.num(courseUsers(db).filter((u) => u.status !== 'invited').length));
  });
});

describe('every other cohort number', () => {
  const db: Db = { ...withUtahLife(), outside: OUTSIDE };
  const inCourse = courseUsers(db).filter((u) => u.status !== 'invited' && u.test !== true);

  it('the Overview’s active learners', () => {
    expect(overviewR2VM(db, NOW).stats[0]!.value).toBe(fmt.num(inCourse.length));
  });

  it('the Cohorts page’s learners', () => {
    expect(cohortsVM(db, NOW, 'dec26').learners).toBe(inCourse.length);
  });

  it('Tiers: the Agent licenses and the teams, so a group’s free seats add no revenue', () => {
    const cards = tiersR2VM(db).cards;
    const before = tiersR2VM(withUtahLife()).cards;
    expect(cards.find((c) => c.id === 'agent')!.count).toBe(`${inCourse.filter((u) => u.tier === 'agent').length} licenses`);
    const teams = (cs: typeof cards) => cs.filter((c) => c.id === 'team').map((c) => Number.parseInt(c.count, 10));
    expect(teams(cards).reduce((a, n) => a + n, 0)).toBe(teams(before).reduce((a, n) => a + n, 0) - 1);
  });

  it('Curriculum: each AI Employee’s deployed share, of the cohort’s learners', () => {
    const vm = curriculumR2VM(db, NOW);
    const people = courseUsers(db).filter((u) => u.status !== 'invited');
    for (const row of vm.rows.filter((r) => r.deployed !== null)) {
      const m = db.modules.find((x) => x.id === row.id)!;
      const pool = people.filter((u) => canAccess(u, m));
      const d = pool.filter((u) => statusOf(u, m) === 'deployed').length;
      expect(row.deployed).toBe(pool.length ? Math.round((d / pool.length) * 100) : 0);
    }
  });
});
