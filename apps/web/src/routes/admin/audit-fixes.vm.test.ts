// R-5 audit (D-267): the admin's view-models read one rule for who counts in a cohort (`Db.roster`, the API's), name the
// selected cohort, draw People's tab for each access group, and Team Hub reads its cohort's name. Pure.
import { describe, expect, it } from 'vitest';
import { ZERO_BASE, phaseNow, rosterOf, seed, setViewerZone } from '@ai/core';
import type { AccessGroupView, Db } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { areaTabs, crumbsOf, groupOfTab, groupTabId, placeOf, tabPath } from '../../shell/admin/adminNav';
import { teamHubVM } from '../portal/TeamHub.vm';
import { areaCounts } from './areas/area.vm';
import { cohortPeopleVM } from './cohort/people.vm';
import { learnersR2VM } from './Learners.vm';
import { homeVM } from './Overview.vm';
import type { HomeInput } from './Overview.vm';
import { accessGroupVM, groupDescription } from './people/accessGroup.vm';

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const COUNTS = { drafts: 0, requests: 0, incidents: 0, waiting: 0, failed: 0 };

/** The ordinary fixture as the API serves it (ZERO_BASE), with a roster: two of its learners and one team count. */
function withRoster(): { db: Db; cohortId: string; counted: string[]; team: string } {
  const d: Db = { ...seed('live'), base: { ...ZERO_BASE } };
  const cohortId = d.cohorts[0]!.id;
  const owner = d.users.find((u) => u.teamId !== null)!;
  const mate = d.users.find((u) => u.teamId === owner.teamId && u.id !== owner.id && u.status !== 'invited') ?? owner;
  const counted = [...new Set([owner.id, mate.id])];
  return {
    db: { ...d, roster: { [cohortId]: { teams: [owner.teamId!], learners: counted } } },
    cohortId,
    counted,
    team: owner.teamId!,
  };
}

/** The Overview's inputs for a cohort, as the page hands them over (R-5 Phase 9, D-270): every page open, nothing read yet. */
function home(db: Db, cohortId: string, over: Partial<HomeInput> = {}): HomeInput {
  return {
    db,
    now: NOW,
    cohortId,
    open: { program: true, cohort: true, people: true, revenue: true },
    facts: null,
    waiting: {},
    audiences: null,
    revenue: null,
    counts: COUNTS,
    canBilling: true,
    canPlans: true,
    ...over,
  };
}

describe('the Overview: the selected cohort, by its roster (Connor; R-5 Phase 9, D-270)', () => {
  it('counts the cohort’s Teams and Learners from the roster, and links the selected cohort', () => {
    const { db, cohortId, counted } = withRoster();
    const audiences = { total: 40, chips: [], teams: 3, leftOut: [] };
    const vm = homeVM(home(db, cohortId, { audiences }));
    const cohort = vm.tiles.find((t) => t.key === 'cohort')!;
    expect(cohort.to).toBe(`/admin/cohort/${cohortId}`);
    expect(cohort.line).toContain(`1 of ${db.cohorts[0]!.capacity} seats`);
    expect(vm.tiles.find((t) => t.key === 'people')!.line).toBe(`${counted.length} in the cohort`);
    // A cohort nobody is rostered in: no teams and no learners, whatever its rows say.
    const empty = homeVM(home({ ...db, roster: {} }, cohortId, { audiences }));
    expect(empty.tiles.find((t) => t.key === 'cohort')!.line).toContain(`0 of ${db.cohorts[0]!.capacity} seats`);
    expect(empty.tiles.find((t) => t.key === 'people')!.line).toBe('0 in the cohort');
  });

  it('prints every time in MT and CT, never MST', () => {
    const vm = homeVM(home(parityDb('/admin'), 'dec26'));
    const lines = vm.coming.map((c) => c.line);
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(l).toMatch(/\d{1,2}:\d{2} [AP]M MT \/ \d{1,2}:\d{2} [AP]M CT/);
      expect(l).not.toContain('MST');
    }
  });
});

describe('Cohort › People: the cohort’s roster', () => {
  it('lists the roster’s learners and teams, and counts them', () => {
    const { db, cohortId, counted, team } = withRoster();
    const vm = learnersR2VM(db, NOW, { tier: 'All tiers', q: '' }, cohortId);
    expect(vm.rows.map((r) => r.id).sort()).toEqual([...counted].sort());
    expect(vm.teams.map((t) => t.id)).toEqual([team]);
    expect(vm.teamsCount).toBe(1);
    expect(areaCounts(db, 'cohort', cohortId, COUNTS).people).toBe(1);
  });

  it('without a roster (the fixture) reads as before: every learner of the cohort and every team', () => {
    const d = parityDb('/admin/cohort/dec26/people');
    const vm = learnersR2VM(d, NOW, { tier: 'All tiers', q: '' }, 'dec26');
    expect(vm.rows).toHaveLength(d.users.length);
    expect(vm.teams).toHaveLength(d.teams.length);
    expect(areaCounts(d, 'cohort', 'dec26', COUNTS).people).toBe(d.teams.length);
  });
});

describe('People › an access group’s tab (Utah Life)', () => {
  const group: AccessGroupView = {
    id: 'utah-life',
    name: 'Utah Life',
    emailDomain: 'liveutah.com',
    plan: 'agent_plan',
    members: [
      { userId: 'u1', name: '', email: 'a@liveutah.com', last: Date.parse('2026-12-10T15:02:00Z'), invited: false },
      { userId: 'u2', name: 'Kim Lee', email: 'kim@liveutah.com', last: null, invited: true },
      { userId: 'u3', name: '', email: 'z@liveutah.com', last: null, invited: false },
    ],
  };
  const db = { groups: [group] } as Pick<Db, 'groups'>;

  it('says who is in it and what it grants, from its record, and that they are counted nowhere else', () => {
    expect(groupDescription(group)).toBe(
      'Agents with a liveutah.com address get the Agent Plan’s skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue.',
    );
    expect(groupDescription({ emailDomain: null, plan: 'agent_plan' })).toMatch(
      /^Agents on its list get the Agent Plan’s skills/,
    );
  });

  it('lists each person: their name or the group’s agent line over their address, and last active or Invite pending', () => {
    setViewerZone('America/Denver');
    const vm = accessGroupVM(db, 'utah-life')!;
    expect(vm.rows.map((r) => [r.name, r.email, r.last])).toEqual([
      ['Utah Life agent', 'a@liveutah.com', 'Dec 10, 8:02 AM MT / 9:02 AM CT'],
      ['Kim Lee', 'kim@liveutah.com', 'Invite pending'],
      ['Utah Life agent', 'z@liveutah.com', 'Never'],
    ]);
    expect(accessGroupVM(db, 'utah-life', 'KIM')!.rows.map((r) => r.id)).toEqual(['u2']);
    expect(accessGroupVM(db, 'nope')).toBeNull();
    expect(areaCounts({ ...seed('live'), groups: [group] }, 'people', '', COUNTS)).toEqual({
      [groupTabId('utah-life')]: 3,
    });
  });

  it('is a People tab after Teams, named by the group, for the roles that read Users, at its own address', () => {
    const groups = [{ id: 'utah-life', name: 'Utah Life' }];
    expect(areaTabs('people', 'Owner', groups).map((t) => t.label)).toEqual([
      'Everyone',
      'Teams',
      'Utah Life',
      'Masquerade',
    ]);
    expect(areaTabs('people', 'Support', groups).map((t) => t.label)).toContain('Utah Life');
    expect(areaTabs('people', 'Instructor', groups).map((t) => t.label)).not.toContain('Utah Life');
    expect(areaTabs('people', 'Owner').map((t) => t.label)).toEqual(['Everyone', 'Teams', 'Masquerade']);
    expect(tabPath('people', groupTabId('utah-life'), '')).toBe('/admin/people/groups/utah-life');
    const place = placeOf('/admin/people/groups/utah-life');
    expect(place).toMatchObject({ area: 'people', tab: 'group:utah-life' });
    expect(groupOfTab(place!.tab)).toBe('utah-life');
    expect(crumbsOf(place, { cohortId: 'dec26', groups })).toEqual([
      { kind: 'link', label: 'People', to: '/admin/people' },
      { kind: 'here', label: 'Utah Life' },
    ]);
  });

  it('the parity fixture holds the mockup’s Utah Life', () => {
    const vm = accessGroupVM(parityDb('/admin/people/groups/utah-life'), 'utah-life')!;
    expect(vm.total).toBe(8);
    expect(vm.rows[3]).toMatchObject({ email: 'k••••@liveutah.com', last: 'Invite pending' });
  });
});

describe('Utah Life agents are never December’s learners (D-268)', () => {
  /**
   * December as production holds it: the seed's teams each own an account with a live cohort plan in December, and
   * Utah Life's agents are provisioned the way `createGroupMember` writes them: active, Agent tier, `users.cohort_id`
   * naming December, each the owner of a team of one with an account and no plan row. The roster is the one rule's
   * (`rosterOf`), as the API reads it for the snapshot.
   */
  function december(agents: number): { db: Db; ids: string[] } {
    const d: Db = { ...seed('live'), base: { ...ZERO_BASE } };
    const cohortId = d.cohorts[0]!.id;
    const like = d.users.find((u) => u.teamId !== null && u.status !== 'invited')!;
    const team = d.teams.find((t) => t.id === like.teamId)!;
    const ids = Array.from({ length: agents }, (_, i) => `u_utah${i}`);
    const users = [
      ...d.users.map((u) => ({ ...u, cohortId })),
      ...ids.map((id, i) => ({ ...like, id, name: '', email: `agent${i}@liveutah.com`, teamId: `t_${id}`, tier: 'agent' as const, status: 'active' as const, cohortId, last: NOW - DAY, progress: {} })),
    ];
    const teams = [...d.teams, ...ids.map((id) => ({ ...team, id: `t_${id}`, name: '', ownerId: id, seats: 1 }))];
    const roster = rosterOf({
      accounts: teams.map((t) => ({ id: `a_${t.id}`, teamId: t.id, ownerUserId: t.ownerId })),
      plans: d.teams.map((t) => ({ accountId: `a_${t.id}`, kind: 'cohort', status: 'active', cohortId, createdAt: NOW - 30 * DAY })),
      users: users.map((u) => ({ id: u.id, teamId: u.teamId, kind: 'learner', isTest: u.test === true })),
    });
    const groups: AccessGroupView[] = [
      { id: 'utah-life', name: 'Utah Life', emailDomain: 'liveutah.com', plan: 'agent_plan', members: ids.map((userId, i) => ({ userId, name: '', email: `agent${i}@liveutah.com`, last: NOW - DAY, invited: false })) },
    ];
    return { db: { ...d, users, teams, roster, groups }, ids };
  }
  const DAY = 86_400_000;

  it('the roster leaves them out of December, its learners and its teams', () => {
    const { db, ids } = december(8);
    const dec = db.roster![db.cohorts[0]!.id]!;
    expect(dec.learners.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(dec.learners).not.toContain(id);
      expect(dec.teams).not.toContain(`t_${id}`);
    }
  });

  it('every Overview and Cohort › People figure reads the same with eight active agents as with none (D-268, D-270)', () => {
    const none = december(0).db;
    const { db } = december(8);
    const cohortId = db.cohorts[0]!.id;
    // R-5 Phase 9 (D-270): the Overview's tiles, Needs You, Cohorts and Coming Up; People's own count is below.
    expect(homeVM(home(db, cohortId))).toEqual(homeVM(home(none, cohortId)));
    expect(cohortPeopleVM(db, cohortId, NOW, null)).toEqual(cohortPeopleVM(none, cohortId, NOW, null));
    expect(learnersR2VM(db, NOW, { tier: 'All tiers', q: '' }, cohortId)).toEqual(learnersR2VM(none, NOW, { tier: 'All tiers', q: '' }, cohortId));
    expect(areaCounts(db, 'cohort', cohortId, COUNTS)).toEqual(areaCounts(none, 'cohort', cohortId, COUNTS));
  });

  it('People counts them once, under Utah Life', () => {
    const { db } = december(8);
    expect(areaCounts(db, 'people', db.cohorts[0]!.id, COUNTS)).toEqual({ [groupTabId('utah-life')]: 8 });
  });
});

describe('Team Hub reads its cohort’s name', () => {
  it('names the viewer’s own cohort with its noun, not a typed one', () => {
    const db = seed('live');
    const alex = db.users.find((u) => u.id === 'u_alex')!;
    expect(teamHubVM(db, alex, phaseNow('live'))!.cohortName).toBe('December 2026 Cohort');
    const renamed = {
      ...db,
      cohorts: db.cohorts.map((c) => (c.id === alex.cohortId ? { ...c, name: 'January 2027 Cohort' } : c)),
    };
    expect(teamHubVM(renamed, alex, phaseNow('live'))!.cohortName).toBe('January 2027 Cohort');
  });
});
