import { describe, expect, it } from 'vitest';
import { fixtureAudiences, fixtureGroup, fixtureRecords, fixtureUserRows, fixtureWorkspaceRows } from '../../../data/console-fixture-records';
import { mockStamp } from '../../../data/parity-r2';
import { cohortPeopleVM, currentWeekOf } from '../cohort/people.vm';
import { asksVM, formOf, intakeVM } from '../cohort/submissions.vm';
import { parityDb } from '../../../data/parity-r2-db';
import { audChips, everyoneRow, everyoneShowing, groupVM, teamRow, PRODUCT_OPTIONS } from './people.vm';

// R-5 Phase 7 (D-268): People › Everyone, Teams and Utah Life, Cohort › People and Submissions, from the API's shapes
// (the fixture answers as the API does), in the mockup's words. Every time is MT / CT.

const NOW = mockStamp('Dec 10, 9:30 AM');

describe('People › Everyone', () => {
  const r = fixtureRecords();
  const a = fixtureAudiences(r);

  it('builds its chips from who is here, each person counted once', () => {
    expect(audChips(a).map((c) => [c.label, c.count, c.tone])).toEqual([
      ['Everyone', 16, null],
      ['AI Accelerator', 1, 'for'],
      ['Team Plan', 5, 'ok'],
      ['Agent Plan', 1, 'mint'],
      ['Insiders', 1, 'info'],
      ['Utah Life', 8, 'off'],
    ]);
    expect(audChips(null)).toEqual([]);
  });

  it('lists each person: how they got in, their team or none, their seat, last active in MT / CT', () => {
    const rows = fixtureUserRows(r, { kind: 'learner' }).map(everyoneRow);
    const elena = rows.find((x) => x.key === 'u_1042')!;
    expect([elena.gotIn?.label, elena.team, elena.seat, elena.last, elena.href]).toEqual(['Team Plan', 'Northshore Group', 'Team owner', 'Dec 10, 8:52 AM MT / 9:52 AM CT', '/admin/people/u_1042']);
    const agent = rows.find((x) => x.key === 'u_ul1')!;
    expect([agent.name, agent.gotIn?.label, agent.team, agent.href, agent.groupName]).toEqual(['Utah Life agent', 'Utah Life', null, '/admin/people/groups/utah-life', 'Utah Life']);
    const invited = rows.find((x) => x.key === 'u_ul4')!;
    expect([invited.last, invited.status.label]).toEqual(['Never', 'Invited']);
    expect(rows.find((x) => x.key === 'u_1090')!.inCohort).toBe(true);
    for (const x of rows) expect(x.last).not.toMatch(/MST/);
    expect(everyoneShowing(rows.length, a, '')).toBe('Showing 16 of 16.');
    expect(everyoneShowing(8, a, 'group:utah-life')).toBe('Showing 8 of 8.');
  });
});

describe('People › Teams', () => {
  it('lists what each team holds and pays; Utah Life’s agents are not teams', () => {
    const r = fixtureRecords();
    const rows = fixtureWorkspaceRows(r, {}).map(teamRow);
    expect(rows.map((t) => [t.name, t.holds.map((h) => h.label).join(', '), t.seats, t.paying])).toEqual([
      ['Northshore Group', 'Team Plan', '33 of 41', '$1,495 a month'],
      ['Hale & Marlowe Realty', 'Team Plan', '15 of 16', '$695 a month'],
      ['Red Cliff Collective', 'Agent Plan', '46 of 50', '$1,450 a month'],
      ['Copper Basin Realty', 'AI Accelerator', '2 of 2', 'Paid in full'],
      ['Tidewater Property Co.', 'Insiders', '1 of 1', '$97 a month'],
      ['Lantern Street Partners', 'Team Plan', '6 of 16', '$0'],
      ['Fourth Meridian', '', '0 of 16', '$0'],
    ]);
    expect(fixtureWorkspaceRows(r, { holds: 'cohort' }).map((w) => w.teamId)).toEqual(['ws_copperbasin']);
    expect(fixtureAudiences(r).leftOut).toEqual([{ id: 'utah-life', name: 'Utah Life', count: 8 }]);
    expect(PRODUCT_OPTIONS.map((o) => o.label)).toEqual(['All products', 'AI Accelerator', 'Team Plan', 'Agent Plan', 'Insiders', 'Insiders for Agents', 'Skill Library']);
  });
});

describe('People › Utah Life', () => {
  it('has its facts, its agents and what they open most, from the group’s record', () => {
    const vm = groupVM(fixtureGroup(fixtureRecords(), 'utah-life', null)!, NOW);
    expect(vm.facts).toEqual({ signedIn: 7, active: 7, gets: 'Agent Plan skills, free', qualifies: 'A verified @liveutah.com address', since: 'Thu, Nov 12, 2026', ends: 'No end date' });
    expect(vm.rows.slice(0, 4).map((x) => [x.name, x.first, x.last, x.opened])).toEqual([
      ['Utah Life agent', 'Nov 12', 'Dec 10, 8:02 AM MT / 9:02 AM CT', 9],
      ['Utah Life agent', 'Nov 12', 'Dec 9, 5:47 PM MT / 6:47 PM CT', 14],
      ['Utah Life agent', 'Nov 12', 'Dec 8, 11:20 AM MT / 12:20 PM CT', 4],
      ['Utah Life agent', 'Never', 'Invite pending', 0],
    ]);
    expect(vm.open).toEqual({ title: 'The Agent Plan’s skills', sub: 'Every agent skill, and each new one as it is released', not: 'Not the Accelerator, not team skills' });
    expect(vm.most[0]).toEqual({ title: 'Appointment Follow-Up', count: 22 });
    expect(vm.ended).toBe(false);
    expect(groupVM(fixtureGroup(fixtureRecords(), 'utah-life', NOW - 1)!, NOW).ended).toBe(true);
    expect(groupVM(fixtureGroup(fixtureRecords(), 'utah-life', null)!, NOW, 'c•••').rows).toHaveLength(1);
  });
});

describe('Cohort › People and Submissions', () => {
  it('is the cohort’s roster with Paid, Intake and the week it is on, and no week column without a run week', () => {
    const db = parityDb('/admin/cohort/dec26/people');
    const facts = { testSends: { welcome: false, week0: false }, plans: 0, teamRows: { ws_northshore: { pay: 'two_pay' as const, paymentsMade: 1, intake: 'draft' as const } } };
    const vm = cohortPeopleVM(db, 'dec26', NOW, facts);
    expect(vm.week).toBeNull();
    expect([vm.teamsCount, vm.learnersCount]).toEqual([7, 7]);
    const north = vm.teams[0]!;
    expect([north.name, north.people, north.pay, north.intake.label, north.last]).toEqual([
      'Northshore Group',
      '2 of 41 signed in',
      { label: '1 of 2 payments', tone: 'info', pill: true },
      'Draft',
      'Dec 10, 8:52 AM MT / 9:52 AM CT',
    ]);
    expect(vm.teams.find((t) => t.id === 'ws_fourthmeridian')!.last).toBe('Never signed in');
    expect(vm.csv.text.split('\n')[0]).toBe('"Team","Learner","Email","Seat","Progress","Last active"');
  });

  it('reads the week a cohort is on from its run: the last that has opened, else its first', () => {
    const db = parityDb('/admin/cohort/jan27/settings');
    expect(currentWeekOf(db, 'jan27', NOW)?.label).toBe('Week 0');
  });

  it('adds the intake up and lists what each week asks for', () => {
    const db = parityDb('/admin/cohort/dec26/schedule');
    const form = formOf(db);
    const vm = intakeVM(form, [
      { teamId: 't1', name: 'One', owner: 'O', status: 'submitted', updatedAt: NOW, submittedAt: NOW, ghl: 'synced', answers: {} },
      { teamId: 't2', name: 'Two', owner: 'T', status: 'draft', updatedAt: NOW, submittedAt: null, ghl: 'none', answers: {} },
      { teamId: 't3', name: 'Three', owner: 'H', status: 'not_started', updatedAt: null, submittedAt: null, ghl: 'none', answers: {} },
    ]);
    expect([vm.teams, vm.submitted, vm.draft, vm.notStarted, vm.synced, vm.failed]).toEqual([3, 1, 1, 1, 1, 0]);
    expect(vm.rows.map((x) => x.when)).toEqual(['Dec 10, 9:30 AM MT / 10:30 AM CT', 'Saved Dec 10, 9:30 AM MT / 10:30 AM CT', null]);
    expect(asksVM(db, 'dec26', ['One'], {})).toEqual([]);
  });
});
