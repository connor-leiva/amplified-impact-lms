// R-5 audit (D-267): the admin's view-models read one rule for who counts in a cohort (`Db.roster`, the API's), name the
// selected cohort, draw People's tab for each access group, and Team Hub reads its cohort's name. Pure.
import { describe, expect, it } from 'vitest';
import { ZERO_BASE, phaseNow, seed, setViewerZone } from '@ai/core';
import type { AccessGroupView, Db } from '@ai/core';
import { parityDb } from '../../data/parity-r2-db';
import { areaTabs, crumbsOf, groupOfTab, groupTabId, placeOf, tabPath } from '../../shell/admin/adminNav';
import { teamHubVM } from '../portal/TeamHub.vm';
import { areaCounts } from './areas/area.vm';
import { learnersR2VM } from './Learners.vm';
import { overviewR2VM, overviewVM } from './Overview.vm';
import { accessGroupVM, groupDescription } from './people/accessGroup.vm';

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const COUNTS = { drafts: 0, requests: 0, incidents: 0, waiting: 0 };

/** The ordinary fixture as the API serves it (ZERO_BASE), with a roster: two of its learners and one team count. */
function withRoster(): { db: Db; cohortId: string; counted: string[]; team: string } {
  const d: Db = { ...seed('live'), base: { ...ZERO_BASE } };
  const cohortId = d.cohorts[0]!.id;
  const owner = d.users.find((u) => u.teamId !== null)!;
  const mate = d.users.find((u) => u.teamId === owner.teamId && u.id !== owner.id && u.status !== 'invited') ?? owner;
  const counted = [...new Set([owner.id, mate.id])];
  return { db: { ...d, roster: { [cohortId]: { teams: [owner.teamId!], learners: counted } } }, cohortId, counted, team: owner.teamId! };
}

describe('the Overview: the selected cohort, by its roster (Connor)', () => {
  it('counts learners and Team Tier seats from the roster, and links the selected cohort', () => {
    const { db, cohortId, counted } = withRoster();
    const vm = overviewR2VM(db, NOW, cohortId);
    const people = db.users.filter((u) => counted.includes(u.id) && u.status !== 'invited' && u.test !== true);
    expect(vm.stats[0]).toMatchObject({ key: 'learners', value: String(people.length), to: `/admin/cohort/${cohortId}/people` });
    expect(vm.stats[0]!.subPhone).toBe(`${people.filter((u) => u.tier === 'team').length} on Team Tier`);
    expect(vm.stats.find((s) => s.key === 'completion')!.to).toBe('/admin/program');
    expect(vm.stats.find((s) => s.key === 'attendance')!.to).toBe(`/admin/cohort/${cohortId}/schedule`);
    // A cohort nobody is rostered in: no learners, whatever its rows say.
    expect(overviewR2VM({ ...db, roster: {} }, NOW, cohortId).stats[0]!.value).toBe('0');
  });

  it('a cohort whose run holds no Week 1 reads its own opening, in MT and CT, and how many are enrolled', () => {
    const { db, cohortId } = withRoster();
    const T = (local: string) => Date.parse(`${local}-07:00`);
    const co = { ...db.cohorts[0]!, name: 'December 2026', start: T('2026-12-02T12:00:00'), run: [] as NonNullable<Db['cohorts'][number]['run']> };
    // Its run holds no Week 1, so the header reads the cohort's own opening (`curriculum-week.vm.test.ts` reads Week 1's).
    const plain = overviewR2VM({ ...db, cohorts: [co] }, T('2026-11-27T12:00:00'), cohortId);
    expect(plain.subline).toMatch(/^December 2026 Cohort · Opens .* · \d+ learners enrolled$/);
    expect(plain.subline).toContain(' MT / ');
    expect(plain.subline).not.toContain('MST');
  });

  it('names the report after the cohort, not a typed one', () => {
    const { db, cohortId } = withRoster();
    expect(overviewVM(db, NOW, cohortId).report.name).toMatch(/^cohort-report-[a-z]{3}-20\d\d\.csv$/);
    expect(overviewVM(parityDb('/admin'), NOW, 'dec26').report.name).toBe('cohort-report-dec-2026.csv');
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
    expect(groupDescription({ emailDomain: null, plan: 'agent_plan' })).toMatch(/^Agents on its list get the Agent Plan’s skills/);
  });

  it('lists each person: their name or the group’s agent line over their address, and last active or Invite pending', () => {
    setViewerZone('America/Denver');
    const vm = accessGroupVM(db, 'utah-life')!;
    expect(vm.rows.map((r) => [r.name, r.email, r.last])).toEqual([
      ['Utah Life agent', 'a@liveutah.com', 'Dec 10, 8:02 AM'],
      ['Kim Lee', 'kim@liveutah.com', 'Invite pending'],
      ['Utah Life agent', 'z@liveutah.com', 'Never'],
    ]);
    expect(accessGroupVM(db, 'utah-life', 'KIM')!.rows.map((r) => r.id)).toEqual(['u2']);
    expect(accessGroupVM(db, 'nope')).toBeNull();
    expect(areaCounts({ ...seed('live'), groups: [group] }, 'people', '', COUNTS)).toEqual({ [groupTabId('utah-life')]: 3 });
  });

  it('is a People tab after Teams, named by the group, for the roles that read Users, at its own address', () => {
    const groups = [{ id: 'utah-life', name: 'Utah Life' }];
    expect(areaTabs('people', 'Owner', groups).map((t) => t.label)).toEqual(['Everyone', 'Teams', 'Utah Life', 'Masquerade']);
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

describe('Team Hub reads its cohort’s name', () => {
  it('names the viewer’s own cohort with its noun, not a typed one', () => {
    const db = seed('live');
    const alex = db.users.find((u) => u.id === 'u_alex')!;
    expect(teamHubVM(db, alex, phaseNow('live'))!.cohortName).toBe('December 2026 Cohort');
    const renamed = { ...db, cohorts: db.cohorts.map((c) => (c.id === alex.cohortId ? { ...c, name: 'January 2027 Cohort' } : c)) };
    expect(teamHubVM(renamed, alex, phaseNow('live'))!.cohortName).toBe('January 2027 Cohort');
  });
});
