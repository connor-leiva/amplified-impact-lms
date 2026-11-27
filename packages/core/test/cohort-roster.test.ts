// R-5 audit (D-267): one rule for who counts in a cohort, and one for which cohort a viewer is in. Pure. The API reads
// the same rule from the database (apps/api/test/cohort-roster.test.ts).
import { describe, expect, it } from 'vitest';
import {
  rosterCount,
  rosterLearners,
  rosterLearnersAll,
  rosterOf,
  rosterTeams,
  rosterTeamsAll,
  scopeSnapshot,
  seed,
  teamCohortOf,
  viewerCohortOf,
} from '../src';
import type { Db, RosterAccount, RosterPlan, RosterUser } from '../src';
import { DEFAULT_COHORT_ID } from '../src/accelerator';
import { announcementReaches } from '../src/cohort-learner';

const plan = (accountId: string, cohortId: string | null, o: Partial<RosterPlan> = {}): RosterPlan => ({
  accountId,
  kind: 'cohort',
  status: 'active',
  cohortId,
  createdAt: 1,
  ...o,
});
const acct = (id: string, teamId: string, ownerUserId: string): RosterAccount => ({ id, teamId, ownerUserId });
const user = (id: string, teamId: string | null, o: Partial<RosterUser> = {}): RosterUser => ({ id, teamId, kind: 'learner', isTest: false, ...o });

describe('who counts in a cohort (one rule)', () => {
  // December: a team with a live cohort plan (owner and their AI Implementer), a Utah Life agent (a team of one with no
  // plan), a Team Plan buyer, a skill buyer with no team, a test team, a refunded seat. January: one team.
  const rows = {
    accounts: [
      acct('a_dec', 't_dec', 'u_owner'),
      acct('a_plan', 't_plan', 'u_agent'),
      acct('a_test', 't_test', 'u_test'),
      acct('a_refund', 't_refund', 'u_refund'),
      acct('a_jan', 't_jan', 'u_jan'),
    ],
    plans: [
      plan('a_dec', 'dec26'),
      plan('a_plan', null, { kind: 'agents' }),
      plan('a_test', 'dec26'),
      plan('a_refund', 'dec26', { status: 'ended' }),
      plan('a_jan', 'jan27'),
    ],
    users: [
      user('u_owner', 't_dec'),
      user('u_impl', 't_dec'),
      user('u_staff', null, { kind: 'staff' }),
      user('u_utah', 't_utah'),
      user('u_agent', 't_plan'),
      user('u_skill', null),
      user('u_test', 't_test', { isTest: true }),
      user('u_refund', 't_refund'),
      user('u_jan', 't_jan'),
    ],
  };

  it('counts a team with a live cohort plan, and its learners, and no one else', () => {
    expect(rosterOf(rows)).toEqual({
      dec26: { teams: ['t_dec'], learners: ['u_impl', 'u_owner'] },
      jan27: { teams: ['t_jan'], learners: ['u_jan'] },
    });
    expect(rosterCount(rosterOf(rows), 'dec26')).toBe(2);
    expect(rosterCount(rosterOf(rows), 'feb27')).toBe(0);
  });

  it('leaves out a test account’s team, and a test learner on a counted team', () => {
    const r = rosterOf({ ...rows, users: [...rows.users, user('u_tester', 't_dec', { isTest: true })] });
    expect(r.dec26!.learners).toEqual(['u_impl', 'u_owner']);
    expect(Object.values(r).some((e) => e.teams.includes('t_test'))).toBe(false);
  });

  it('counts an access group’s member who bought the course as that cohort’s, and never one who did not', () => {
    // A Utah Life agent invited onto a December team counts as December's; the one on a team of one never does.
    const r = rosterOf({ ...rows, users: [...rows.users, user('u_utah2', 't_dec')] });
    expect(r.dec26!.learners).toContain('u_utah2');
    expect(Object.values(r).flatMap((e) => e.learners)).not.toContain('u_utah');
  });

  it('puts a team in one cohort at a time: its newest live cohort plan decides (Q-23)', () => {
    const moved = { ...rows, plans: [...rows.plans, plan('a_dec', 'jan27', { createdAt: 5 })] };
    expect(rosterOf(moved)).toEqual({ jan27: { teams: ['t_dec', 't_jan'], learners: ['u_impl', 'u_jan', 'u_owner'] } });
    // And back: a December plan bought after the January one.
    const back = { ...moved, plans: [...moved.plans, plan('a_dec', 'dec26', { createdAt: 9 })] };
    expect(rosterOf(back).dec26).toEqual({ teams: ['t_dec'], learners: ['u_impl', 'u_owner'] });
  });

  it('reads a team’s cohort from its plans, null without a live cohort plan', () => {
    expect(teamCohortOf([plan('a', 'dec26', { status: 'ended' })])).toBeNull();
    expect(teamCohortOf([plan('a', null, { kind: 'agents' })])).toBeNull();
    expect(teamCohortOf([plan('a', 'dec26'), plan('a', 'jan27', { createdAt: 2 })])).toBe('jan27');
  });
});

describe('which cohort a viewer is in (one function)', () => {
  it('is their team’s newest live cohort plan’s, else their row’s, else the default', () => {
    expect(viewerCohortOf([plan('a', 'jan27')], DEFAULT_COHORT_ID)).toBe('jan27');
    expect(viewerCohortOf([plan('a', 'jan27', { status: 'ended' })], 'jan27')).toBe('jan27');
    expect(viewerCohortOf([], 'dec26')).toBe('dec26');
    expect(viewerCohortOf([], null)).toBe(DEFAULT_COHORT_ID);
    expect(viewerCohortOf([plan('a', 'dec26'), plan('a', 'jan27', { createdAt: 3 })], 'dec26')).toBe('jan27');
  });
});

describe('the screens’ reads of the roster', () => {
  const db = (): Db => seed('live');

  it('reads the snapshot as before without a roster (the fixture)', () => {
    const d = db();
    const c = d.cohorts[0]!.id;
    expect(rosterLearners(d, c)).toEqual(d.users.filter((u) => u.cohortId === c));
    expect(rosterTeams(d, c).length).toBe(d.teams.length);
    expect(rosterLearnersAll(d)).toBe(d.users);
    expect(rosterTeamsAll(d)).toBe(d.teams);
  });

  it('reads the roster when the server sent one', () => {
    const d = db();
    const c = d.cohorts[0]!.id;
    const u1 = d.users.find((u) => u.teamId !== null)!;
    const u2 = d.users.find((u) => u.id !== u1.id)!;
    const roster = { [c]: { teams: [u1.teamId!], learners: [u1.id] }, other: { teams: [], learners: [u2.id] } };
    const withRoster: Db = { ...d, roster };
    expect(rosterLearners(withRoster, c).map((u) => u.id)).toEqual([u1.id]);
    expect(rosterTeams(withRoster, c).map((t) => t.id)).toEqual([u1.teamId]);
    expect(rosterLearnersAll(withRoster).map((u) => u.id).sort()).toEqual([u1.id, u2.id].sort());
  });

  it('hands the roster and the access groups to staff with viewLearners only, and to no learner', () => {
    const d = db();
    const groups = [{ id: 'utah-life', name: 'Utah Life', emailDomain: 'liveutah.com', plan: 'agent', members: [] }];
    const full: Db = { ...d, roster: { [d.cohorts[0]!.id]: { teams: [], learners: [] } }, groups };
    const staff = d.staff.find((s) => s.role === 'Owner')!;
    const out = scopeSnapshot(full, { kind: 'staff', staffId: staff.id });
    expect(out.roster).toEqual(full.roster);
    expect(out.groups).toEqual(groups);
    const learner = scopeSnapshot(full, { kind: 'learner', userId: d.users[0]!.id });
    expect(learner.roster).toBeUndefined();
    expect(learner.groups).toBeUndefined();
  });
});

describe('a cohort’s announcement reaches only that cohort', () => {
  const sessions = [
    { id: 'dec26-s1', cohortId: 'dec26' },
    { id: 'jan27-s1', cohortId: 'jan27' },
  ];
  it('one sent from a cohort’s tab reaches the people who count in it, never an access group’s member', () => {
    const a = { cohortId: 'jan27' };
    expect(announcementReaches(a, sessions, 'jan27', true)).toBe(true);
    expect(announcementReaches(a, sessions, 'dec26', true)).toBe(false);
    // A Utah Life agent is in the default cohort by their row, and counts in none.
    expect(announcementReaches({ cohortId: 'dec26' }, sessions, 'dec26', false)).toBe(false);
  });
  it('one that names no cohort reaches whom it always has', () => {
    expect(announcementReaches({}, sessions, 'dec26', false)).toBe(true);
    expect(announcementReaches({ sessionId: 'jan27-s1' }, sessions, 'dec26', true)).toBe(false);
    expect(announcementReaches({ sessionId: 'dec26-s1' }, sessions, 'dec26', false)).toBe(true);
  });
  it('scopes a learner’s snapshot by it', () => {
    const d = seed('live');
    const me = d.users[0]!;
    const base = { id: 'a1', title: 'T', body: 'B', severity: 'info' as const, action: null, actionLabel: '', audience: 'all' as const, channels: ['inapp' as const], status: 'sent' as const, at: 0, opens: null };
    const full: Db = { ...d, announcements: [{ ...base, id: 'mine', cohortId: me.cohortId }, { ...base, id: 'other', cohortId: 'elsewhere' }, { ...base, id: 'old' }] };
    const ids = (rostered: boolean) =>
      scopeSnapshot(full, { kind: 'learner', userId: me.id }, { accelerator: true, rostered }).announcements.map((a) => a.id);
    expect(ids(true)).toEqual(['mine', 'old']);
    expect(ids(false)).toEqual(['old']);
  });
});
