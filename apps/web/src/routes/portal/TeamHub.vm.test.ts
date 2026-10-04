import { describe, expect, it } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { TEAM_HUB_UI, teamHubVM } from './TeamHub.vm';
import type { TeamHubUi, TeamHubVM } from './TeamHub.vm';

// Phase 05 § 5.1 step 3: explicit expectations for Jamie (Agent tier) and Alex (Team Owner) at
// Week 0, Week 2 and After Cohort. Every expected string is written out, never recomputed from the
// seed — if the view-model drifts, the test must say what it now produces rather than agree with it.
//
// The program zone is pinned so `fmt.date`, `fmt.day` and `fmt.ago` are deterministic: a CT viewer
// sees a single zone, which is the state the goldens were captured in.

const CT = 'America/Chicago';

type Phase = 'week0' | 'live' | 'post';

const at = (phase: Phase, ui: TeamHubUi = TEAM_HUB_UI): { db: Db; now: number; alex: Learner; vm: TeamHubVM } => {
  setViewerZone(CT);
  const db = seed(phase);
  const now = phaseNow(phase);
  const alex = db.users.find((u) => u.id === 'u_alex')!;
  const vm = teamHubVM(db, alex, now, ui);
  expect(vm).not.toBeNull();
  return { db, now, alex, vm: vm! };
};

describe('teamHubVM @g5', () => {
  it('is null for Jamie, who is Agent tier and has no team', () => {
    setViewerZone(CT);
    const db = seed('live');
    const jamie = db.users.find((u) => u.id === 'u_jamie')!;
    expect(jamie.tier).toBe('agent');
    expect(jamie.teamId).toBeNull();
    expect(teamHubVM(db, jamie, phaseNow('live'), TEAM_HUB_UI)).toBeNull();
  });

  it('is null when there is no viewer at all', () => {
    setViewerZone(CT);
    expect(teamHubVM(seed('live'), null, phaseNow('live'), TEAM_HUB_UI)).toBeNull();
  });

  // ---- Week 0 --------------------------------------------------------------------------------
  describe('Week 0 · Alex Morgan (Team Owner)', () => {
    it('seats six of seven, one open slot, and the role breakdown', () => {
      const { vm } = at('week0');
      expect(vm.teamName).toBe('Northline Realty Team');
      expect(vm.seats.used).toBe(6);
      expect(vm.seats.total).toBe(7);
      expect(vm.seats.breakdown).toBe('Owner 1 · Operations Lead 1 · Agents 4 of 5');
      expect(vm.seats.slots.map((s) => s.kind)).toEqual([
        'member',
        'member',
        'member',
        'member',
        'member',
        'member',
        'open',
      ]);
      expect(vm.seats.slots[0]!.title).toBe('Alex Morgan · Team Owner');
      expect(vm.seats.slots[6]!.initials).toBe('+');
      expect(vm.seats.slots[6]!.title).toBe('Open seat · invite someone');
      expect(vm.seats.slots[6]!.id).toBeNull();
    });

    it('has nothing deployed', () => {
      const { vm } = at('week0');
      expect(vm.dep.total).toBe(0);
      expect(vm.dep.rows.map((r) => [r.label, r.value, r.width])).toEqual([
        ['Marketing', '0/6', '0%'],
        ['Sales', '0/6', '0%'],
        ['Database', '0/6', '0%'],
        ['Meetings', '0/6', '0%'],
        ['Finance', '0/6', '0%'],
        ['Operations', '0/6', '0%'],
      ]);
    });

    it('says everyone is caught up, because no session has been held yet', () => {
      const { vm } = at('week0');
      expect(vm.rem.session).toBe('Session 1 · Tue, Dec 1');
      expect(vm.rem.headline).toBe('Everyone is caught up on earlier builds');
      expect(vm.rem.any).toBe(false);
      expect(vm.rem.people).toEqual([]);
      expect(vm.rem.behindIds).toEqual([]);
      expect(vm.rem.locked).toBe(false);
      expect(vm.rem.btn).toBe('Remind 0 Members');
    });

    it('shows every member as Not Started', () => {
      const { vm } = at('week0');
      expect(vm.members.map((m) => [m.name, m.joined, m.count, m.status, m.tone, m.last])).toEqual([
        ['Alex Morgan', 'Nov 12', '0/6', 'Not Started', 'none', '2 weeks ago'],
        ['Priya Shah', 'Nov 13', '0/6', 'Not Started', 'none', '2 weeks ago'],
        ['Sarah Collins', 'Nov 14', '0/6', 'Not Started', 'none', '1 week ago'],
        ['Michael Grant', 'Nov 14', '0/6', 'Not Started', 'none', '1 week ago'],
        ['Devon Price', 'Nov 16', '0/6', 'Not Started', 'none', '1 week ago'],
        ['Lena Brooks', 'Nov 20', '0/6', 'Not Started', 'none', '1 week ago'],
      ]);
      expect(vm.members[0]!.isMe).toBe(true);
      expect(vm.members[1]!.isMe).toBe(false);
    });
  });

  // ---- Week 2 (the `live` phase every parity scenario captures) ------------------------------
  describe('Week 2 · Alex Morgan (Team Owner)', () => {
    it('orders members by role then join date', () => {
      const { vm } = at('live');
      expect(vm.members.map((m) => [m.name, m.role])).toEqual([
        ['Alex Morgan', 'Team Owner'],
        ['Priya Shah', 'Operations Lead'],
        ['Sarah Collins', 'Sales Agent'],
        ['Michael Grant', 'Sales Agent'],
        ['Devon Price', 'Sales Agent'],
        ['Lena Brooks', 'Sales Agent'],
      ]);
    });

    it('renders the Deployment Status sentence forms with their tones', () => {
      const { vm } = at('live');
      expect(vm.members.map((m) => [m.status, m.tone])).toEqual([
        ['Marketing, Sales Deployed · Database In Progress', 'success'],
        ['Marketing Deployed · Meetings In Progress', 'success'],
        ['Marketing, Database Deployed · Sales In Progress', 'success'],
        ['In Progress: Marketing', 'progress'],
        ['Sales Needs Attention', 'attention'],
        ['Not Started', 'none'],
      ]);
    });

    it('counts built AI Employees and titles each square', () => {
      const { vm } = at('live');
      expect(vm.members.map((m) => m.count)).toEqual(['2/6', '1/6', '2/6', '0/6', '2/6', '0/6']);
      expect(vm.members[0]!.dots.map((d) => [d.state, d.title])).toEqual([
        ['verified', 'Marketing: Built'],
        ['verified', 'Sales: Built'],
        ['in_progress', 'Database: 2 of 6 steps'],
        ['not_started', 'Meetings: Not started'],
        ['not_started', 'Finance: Not started'],
        ['not_started', 'Operations: Not started'],
      ]);
    });

    it('formats Date Joined and Last Active', () => {
      const { vm } = at('live');
      expect(vm.members.map((m) => [m.joined, m.last])).toEqual([
        ['Nov 12', '11 min ago'],
        ['Nov 13', '2 hours ago'],
        ['Nov 14', '38 min ago'],
        ['Nov 14', 'Yesterday'],
        ['Nov 16', '14 hours ago'],
        ['Nov 20', '1 week ago'],
      ]);
    });

    it('totals team deployments and sizes each bar', () => {
      const { vm } = at('live');
      expect(vm.dep.total).toBe(7);
      expect(vm.dep.rows.map((r) => [r.label, r.value, r.width])).toEqual([
        ['Marketing', '4/6', '67%'],
        ['Sales', '2/6', '33%'],
        ['Database', '1/6', '17%'],
        ['Meetings', '0/6', '0%'],
        ['Finance', '0/6', '0%'],
        ['Operations', '0/6', '0%'],
      ]);
    });

    it('names the four members behind on Sessions 1 and 2', () => {
      const { vm } = at('live');
      expect(vm.rem.session).toBe('Session 3 · Wed, Dec 9');
      expect(vm.rem.headline).toBe('4 members haven’t finished earlier builds');
      expect(vm.rem.btn).toBe('Remind 4 Members');
      expect(vm.rem.any).toBe(true);
      expect(vm.rem.locked).toBe(true);
      expect(vm.rem.behindIds).toEqual(['u_priya', 'u_sarah', 'u_michael', 'u_lena']);
      expect(vm.rem.people.map((p) => [p.name, p.initials, p.gap])).toEqual([
        ['Priya Shah', 'PS', 'Sales not deployed'],
        ['Sarah Collins', 'SC', 'Sales not deployed'],
        ['Michael Grant', 'MG', 'Marketing, Sales not deployed'],
        ['Lena Brooks', 'LB', 'Marketing, Sales not deployed'],
      ]);
    });

    it('shows at most four people and prefers a reminder stamp over the gap', () => {
      setViewerZone(CT);
      const db = seed('live');
      const now = phaseNow('live');
      db.users.find((u) => u.id === 'u_priya')!.reminded = now - 25 * 60000;
      // Devon is up to date; un-deploy his Sales build so a fifth member falls behind.
      db.users.find((u) => u.id === 'u_devon')!.progress.sales!.deployedAt = null;
      const vm = teamHubVM(db, db.users.find((u) => u.id === 'u_alex')!, now, TEAM_HUB_UI)!;
      expect(vm.rem.headline).toBe('5 members haven’t finished earlier builds');
      expect(vm.rem.btn).toBe('Remind 5 Members');
      expect(vm.rem.people).toHaveLength(4);
      expect(vm.rem.behindIds).toHaveLength(5);
      expect(vm.rem.people[0]!.gap).toBe('Reminded 25 min ago');
    });

    it('appends " (you)" when the viewer is the one behind', () => {
      setViewerZone(CT);
      const db = seed('live');
      const now = phaseNow('live');
      db.users.find((u) => u.id === 'u_alex')!.progress.sales!.deployedAt = null;
      const vm = teamHubVM(db, db.users.find((u) => u.id === 'u_alex')!, now, TEAM_HUB_UI)!;
      expect(vm.rem.people[0]!.name).toBe('Alex Morgan (you)');
      // The avatar reads `plainName`, so the suffix never reaches `fmt.initials`.
      expect(vm.rem.people[0]!.plainName).toBe('Alex Morgan');
      expect(vm.rem.people[0]!.initials).toBe('AM');
      expect(vm.rem.people[0]!.gap).toBe('Sales not deployed');
    });

    it('offers the last seat, with the Operations Lead and Team Owner caps spent', () => {
      const { vm } = at('live');
      expect(vm.inv.open).toBe(false);
      expect(vm.inv.seatsNote).toBe('1 of 7 seats available');
      expect(vm.inv.full).toBe(false);
      expect(vm.inv.roles.map((r) => [r.label, r.sub, r.cap, r.capFull, r.on])).toEqual([
        ['Operations Lead', 'Runs the build schedule and the executive modules', '1 of 1 used', true, false],
        ['Sales Agent', 'Builds Marketing, Sales and Database AI Employees', '4 of 5 used', false, true],
        ['Team Owner', 'Full access, billing and seat management', '1 of 1 used', true, false],
      ]);
    });

    it('passes the invite form state through, error and all', () => {
      const { vm } = at('live', {
        ...TEAM_HUB_UI,
        invite: true,
        email: 'nope',
        name: 'Jordan Smith',
        role: 'Team Owner',
        err: 'Enter a valid email address.',
      });
      expect(vm.inv.open).toBe(true);
      expect(vm.inv.email).toBe('nope');
      expect(vm.inv.name).toBe('Jordan Smith');
      expect(vm.inv.err).toBe('Enter a valid email address.');
      expect(vm.inv.roles.map((r) => r.on)).toEqual([false, false, true]);
    });

    it('closes the drawer when nothing is selected', () => {
      const { vm } = at('live');
      expect(vm.drawer.open).toBe(false);
      expect(vm.drawer.member).toBeNull();
    });

    it('opens the member drawer on Devon, whose Sales runtime needs attention', () => {
      const { vm } = at('live', { ...TEAM_HUB_UI, sel: 'u_devon' });
      const d = vm.drawer.member!;
      expect(vm.drawer.open).toBe(true);
      expect(d.name).toBe('Devon Price');
      expect(d.email).toBe('devon@northlinerealty.com');
      expect(d.initials).toBe('DP');
      expect(d.role).toBe('Sales Agent');
      expect(d.isOwner).toBe(false);
      expect(d.canRemove).toBe(true);
      expect(d.joined).toBe('Mon, Nov 16');
      expect(d.last).toBe('14 hours ago');
      expect(d.nudgeLabel).toBe('Send Reminder');
      expect(d.nudgeIcon).toBe('bell');
      expect(d.mods.map((m) => [m.name, m.icon, m.build.state, m.runtime])).toEqual([
        ['Marketing AI Employee', 'megaphone', 'verified', 'deployed'],
        ['Sales AI Employee', 'zap', 'verified', 'needs_attention'],
        ['Database AI Employee', 'database', 'not_started', 'not_deployed'],
        ['Meetings AI Employee', 'mic', 'not_started', 'not_deployed'],
        ['Finance AI Employee', 'dollar', 'not_started', 'not_deployed'],
        ['Operations AI Employee', 'workflow', 'not_started', 'not_deployed'],
      ]);
    });

    it('locks the owner’s own role select and hides Remove Seat for yourself', () => {
      const { vm } = at('live', { ...TEAM_HUB_UI, sel: 'u_alex' });
      const d = vm.drawer.member!;
      expect(d.name).toBe('Alex Morgan');
      expect(d.isOwner).toBe(true);
      expect(d.canRemove).toBe(false);
    });

    it('exports the table as CSV under the team’s slug', () => {
      const { vm } = at('live');
      expect(vm.csvName).toBe('northline-realty-team-progress.csv');
      expect(vm.csvText.split('\n')).toEqual([
        '"Name","Email","Role","Date Joined","AI Employees Built","Deployment Status","Last Active"',
        '"Alex Morgan","alex@northlinerealty.com","Team Owner","Nov 12","2/6","Marketing, Sales Deployed · Database In Progress","11 min ago"',
        '"Priya Shah","priya@northlinerealty.com","Operations Lead","Nov 13","1/6","Marketing Deployed · Meetings In Progress","2 hours ago"',
        '"Sarah Collins","sarah@northlinerealty.com","Sales Agent","Nov 14","2/6","Marketing, Database Deployed · Sales In Progress","38 min ago"',
        '"Michael Grant","michael@northlinerealty.com","Sales Agent","Nov 14","0/6","In Progress: Marketing","Yesterday"',
        '"Devon Price","devon@northlinerealty.com","Sales Agent","Nov 16","2/6","Sales Needs Attention","14 hours ago"',
        '"Lena Brooks","lena@northlinerealty.com","Sales Agent","Nov 20","0/6","Not Started","1 week ago"',
      ]);
    });
  });

  // ---- After Cohort --------------------------------------------------------------------------
  describe('After Cohort · Alex Morgan (Team Owner)', () => {
    it('has every member but Lena fully deployed', () => {
      const { vm } = at('post');
      const all = 'Marketing, Sales, Database, Meetings, Finance, Operations Deployed';
      expect(vm.members.map((m) => [m.name, m.count, m.status, m.last])).toEqual([
        ['Alex Morgan', '6/6', all, '19 hours ago'],
        ['Priya Shah', '6/6', all, '19 hours ago'],
        ['Sarah Collins', '6/6', all, '19 hours ago'],
        ['Michael Grant', '6/6', all, '19 hours ago'],
        ['Devon Price', '6/6', all, '19 hours ago'],
        ['Lena Brooks', '0/6', 'In Progress: Marketing', 'Nov 29'],
      ]);
    });

    it('counts thirty deployments across the team', () => {
      const { vm } = at('post');
      expect(vm.dep.total).toBe(30);
      expect(vm.dep.rows.map((r) => [r.label, r.value, r.width])).toEqual([
        ['Marketing', '5/6', '83%'],
        ['Sales', '5/6', '83%'],
        ['Database', '5/6', '83%'],
        ['Meetings', '5/6', '83%'],
        ['Finance', '5/6', '83%'],
        ['Operations', '5/6', '83%'],
      ]);
    });

    it('falls back to "the next session" and leaves only Lena behind', () => {
      const { vm } = at('post');
      expect(vm.rem.session).toBe('the next session');
      expect(vm.rem.headline).toBe('1 member hasn’t finished earlier builds');
      expect(vm.rem.btn).toBe('Remind 1 Member');
      expect(vm.rem.locked).toBe(true);
      expect(vm.rem.behindIds).toEqual(['u_lena']);
      expect(vm.rem.people.map((p) => [p.name, p.gap])).toEqual([
        ['Lena Brooks', 'Marketing, Sales, Database not deployed'],
      ]);
    });
  });

  // ---- An invited seat -----------------------------------------------------------------------
  describe('an invited seat fills the last slot', () => {
    const invited = (): { now: number; vm: TeamHubVM } => {
      setViewerZone(CT);
      const db = seed('live');
      const now = phaseNow('live');
      db.users.push({
        id: 'u_new',
        name: 'Jordan Smith',
        email: 'jordan@northlinerealty.com',
        tier: 'team',
        role: 'Sales Agent',
        teamId: 'northline',
        cohortId: 'dec26',
        joined: now - 90 * 60000,
        last: null,
        status: 'invited',
        progress: {},
      });
      const alex = db.users.find((u) => u.id === 'u_alex')!;
      return { now, vm: teamHubVM(db, alex, now, { ...TEAM_HUB_UI, sel: 'u_new' })! };
    };

    it('marks the seat dashed amber and reports no seats left', () => {
      const { vm } = invited();
      expect(vm.seats.used).toBe(7);
      expect(vm.seats.slots[6]!.kind).toBe('invited');
      expect(vm.seats.slots[6]!.initials).toBe('JS');
      expect(vm.seats.slots[6]!.title).toBe('Jordan Smith · Sales Agent (invited)');
      expect(vm.seats.slots[6]!.fill).toBeNull();
      expect(vm.inv.seatsNote).toBe('All seats are assigned');
      expect(vm.inv.full).toBe(true);
      expect(vm.inv.roles.map((r) => [r.cap, r.capFull])).toEqual([
        ['1 of 1 used', true],
        ['5 of 5 used', true],
        ['1 of 1 used', true],
      ]);
    });

    it('renders the Invite Sent row and the Resend Invite drawer', () => {
      const { vm } = invited();
      const row = vm.members.find((m) => m.id === 'u_new')!;
      expect(row.status).toBe('Invite Sent · Awaiting Acceptance');
      expect(row.tone).toBe('locked');
      expect(row.invited).toBe(true);
      expect(row.fill).toBeNull();
      expect(row.joined).toBe('—');
      expect(row.last).toBe('Invited 1 hour ago');
      expect(row.count).toBe('0/6');

      const d = vm.drawer.member!;
      expect(d.invited).toBe(true);
      expect(d.joined).toBe('Invite pending');
      expect(d.last).toBe('—');
      expect(d.nudgeLabel).toBe('Resend Invite');
      expect(d.nudgeIcon).toBe('send');
    });

    it('leaves an invited seat out of the deployment denominators', () => {
      const { vm } = invited();
      // Still six ACTIVE members, so every row keeps its Week 2 value.
      expect(vm.dep.rows.map((r) => r.value)).toEqual(['4/6', '2/6', '1/6', '0/6', '0/6', '0/6']);
      expect(vm.rem.behindIds).not.toContain('u_new');
    });
  });
});
