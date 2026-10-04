import { describe, expect, it } from 'vitest';
import { phaseNow, seed, setViewerZone, ZERO_BASE } from '@ai/core';
import { LEARNERS_UI, learnersVM } from './Learners.vm';
import type { LearnersUi, LearnersVM } from './Learners.vm';

// Phase 06 § 6.1 step 3: explicit expectations at Week 2. Every literal below was generated once
// from the reference's `renderVals()` and is now pinned — if the view-model drifts, the test must
// say what it now produces rather than agree with it.
//
// The program zone is pinned so `fmt.day` and `fmt.ago` are deterministic: a CT viewer sees a
// single zone, which is the state the goldens were captured in.
//
// The last block is the phase 06 § 6.2 rule under test: the identical arithmetic, run once over the
// fixture's `base` and once over `ZERO_BASE`, which is what the API returns in http mode. The VM
// never looks at the data source, so the only thing that changes is the numbers.

const CT = 'America/Chicago';

const at = (ui: Partial<LearnersUi> = {}): LearnersVM => {
  setViewerZone(CT);
  return learnersVM(seed('live'), phaseNow('live'), { ...LEARNERS_UI, ...ui });
};

describe('learnersVM @g6', () => {
  // ---- Stat cards: every figure adds `db.base` (phase 06 § 6.2) -------------------------------
  describe('stat cards', () => {
    it('adds the baseline aggregates to the modelled learners', () => {
      const vm = at();
      expect(vm.stats).toEqual([
        // 134 baseline + 14 modelled
        { label: 'Total Learners', value: '148', amber: false },
        // 99 baseline + 5 modelled on Agent tier
        { label: 'Agent Tier', value: '104', amber: false },
        // 35 baseline seats + 9 modelled on Team tier
        { label: 'Team Tier Seats', value: '44', amber: false },
        { label: 'Pending Invites', value: '0', amber: false },
      ]);
    });

    it('leaves Pending Invites un-ambered while the seed has no outstanding invite', () => {
      const db = seed('live');
      expect(db.users.filter((u) => u.status === 'invited')).toHaveLength(0);
      expect(at().stats[3]).toEqual({ label: 'Pending Invites', value: '0', amber: false });
    });

    it('ambers Pending Invites as soon as one invite is outstanding', () => {
      setViewerZone(CT);
      const db = seed('live');
      db.users.push({
        ...db.users[0]!,
        id: 'u_new',
        name: 'Robin Vale',
        email: 'robin@vale.com',
        status: 'invited',
        progress: {},
      });
      const vm = learnersVM(db, phaseNow('live'), LEARNERS_UI);
      expect(vm.stats[3]).toEqual({ label: 'Pending Invites', value: '1', amber: true });
      // An invited learner is not counted as a seat, so the other three figures do not move.
      expect(vm.stats.slice(0, 3).map((s) => s.value)).toEqual(['148', '104', '44']);
    });
  });

  // ---- Controls -------------------------------------------------------------------------------
  it('segments Learners | Teams and defaults to Learners', () => {
    const vm = at();
    expect(vm.tabs).toEqual([
      { key: 'learners', label: 'Learners', on: true },
      { key: 'teams', label: 'Teams', on: false },
    ]);
    expect(vm.isLearners).toBe(true);
    expect(vm.isTeams).toBe(false);
  });

  it('offers All Tiers | Agent | Team and marks the active one', () => {
    expect(at().tierFilters).toEqual([
      { key: '', label: 'All Tiers', on: true },
      { key: 'agent', label: 'Agent', on: false },
      { key: 'team', label: 'Team', on: false },
    ]);
    expect(at({ tier: 'team' }).tierFilters.map((t) => t.on)).toEqual([false, false, true]);
  });

  // ---- Learners table -------------------------------------------------------------------------
  describe('learners table', () => {
    it('sorts every learner newest-active first', () => {
      expect(at().rows.map((r) => r.name)).toEqual([
        'Alex Morgan',
        'Sarah Collins',
        'Jamie Ortiz',
        'Rosa Delgado',
        'Priya Shah',
        'Natasha Reed',
        'Devon Price',
        'Kenji Watanabe',
        'Claire Dubois',
        'Michael Grant',
        'Marcus Lee',
        'Ben Foster',
        'Lena Brooks',
        'Omar Haddad',
      ]);
    });

    it('prints the relative last-active for every row', () => {
      expect(at().rows.map((r) => r.last)).toEqual([
        '11 min ago',
        '38 min ago',
        '44 min ago',
        '2 hours ago',
        '2 hours ago',
        '2 hours ago',
        '14 hours ago',
        '18 hours ago',
        '20 hours ago',
        'Yesterday',
        '2 days ago',
        '2 days ago',
        '1 week ago',
        '1 week ago',
      ]);
    });

    it('marks the two learners with no build at all At Risk', () => {
      const vm = at();
      const risky = vm.rows.filter((r) => r.status === 'At Risk');
      expect(risky.map((r) => r.name)).toEqual(['Lena Brooks', 'Omar Haddad']);
      expect(risky.map((r) => r.statusTone)).toEqual(['locked', 'locked']);
      expect(vm.rows.filter((r) => r.status === 'Active')).toHaveLength(12);
      expect(vm.rows.every((r) => r.status !== 'Invited')).toBe(true);
      expect(vm.rows[0]!.statusTone).toBe('success');
    });

    it('counts deployments against the AI Employees in each learner’s own tier', () => {
      expect(at().rows.map((r) => `${r.name} ${r.count}`)).toEqual([
        'Alex Morgan 2/6',
        'Sarah Collins 2/6',
        'Jamie Ortiz 1/3',
        'Rosa Delgado 3/3',
        'Priya Shah 1/6',
        'Natasha Reed 4/6',
        'Devon Price 2/6',
        'Kenji Watanabe 1/3',
        'Claire Dubois 2/6',
        'Michael Grant 0/6',
        'Marcus Lee 1/6',
        'Ben Foster 0/3',
        'Lena Brooks 0/6',
        'Omar Haddad 0/3',
      ]);
    });

    it('labels the tier pill and the team column', () => {
      const vm = at();
      const jamie = vm.rows.find((r) => r.id === 'u_jamie')!;
      const alex = vm.rows.find((r) => r.id === 'u_alex')!;
      expect([jamie.tier, jamie.tierTone, jamie.team]).toEqual(['Agent', 'agent', 'Individual']);
      expect([alex.tier, alex.tierTone, alex.team]).toEqual(['Team', 'team', 'Northline Realty Team']);
      expect(vm.rows.find((r) => r.id === 'u_natasha')!.team).toBe('Harbor & Pine Group');
      expect(vm.rows.find((r) => r.id === 'u_marcus')!.team).toBe('Keystone Collective');
    });

    it('badges the two demo personas on their role line and nobody else', () => {
      const vm = at();
      expect(vm.rows.filter((r) => r.persona).map((r) => r.role)).toEqual([
        'Team Owner · Demo: Team Owner',
        'Agent · Demo: Agent Tier',
      ]);
      expect(vm.rows.find((r) => r.id === 'u_priya')!.role).toBe('Operations Lead');
      expect(vm.rows.filter((r) => r.persona)).toHaveLength(2);
    });

    it('draws six squares per row, locking the ones outside the learner’s tier', () => {
      const jamie = at().rows.find((r) => r.id === 'u_jamie')!;
      expect(jamie.dots.map((d) => d.tone)).toEqual(['deployed', 'progress', 'none', 'locked', 'locked', 'locked']);
      expect(jamie.dots.map((d) => d.title)).toEqual([
        'Marketing: Deployed',
        'Sales: In Progress',
        'Database: Not Started',
        'Meetings: Not in Tier',
        'Finance: Not in Tier',
        'Operations: Not in Tier',
      ]);
      // A Team-tier learner has all six, so nothing is locked.
      expect(
        at()
          .rows.find((r) => r.id === 'u_alex')!
          .dots.map((d) => d.tone),
      ).toEqual(['deployed', 'deployed', 'progress', 'none', 'none', 'none']);
    });

    it('counts the filtered rows against the baseline total in the footer', () => {
      expect(at().footNote).toBe('Showing 14 of 148 learners. Highlighted rows are the demo personas.');
    });
  });

  // ---- Filters --------------------------------------------------------------------------------
  describe('filters', () => {
    it('narrows to Agent tier and keeps the baseline in the footer total', () => {
      const vm = at({ tier: 'agent' });
      expect(vm.rows.map((r) => r.name)).toEqual([
        'Jamie Ortiz',
        'Rosa Delgado',
        'Kenji Watanabe',
        'Ben Foster',
        'Omar Haddad',
      ]);
      expect(vm.footNote).toBe('Showing 5 of 148 learners. Highlighted rows are the demo personas.');
    });

    it('narrows to Team tier', () => {
      expect(at({ tier: 'team' }).rows).toHaveLength(9);
    });

    it('searches name, email and team name together', () => {
      // Matches on the team name and on the @northlinerealty.com addresses alike.
      expect(at({ q: 'northline' }).rows.map((r) => r.name)).toEqual([
        'Alex Morgan',
        'Sarah Collins',
        'Priya Shah',
        'Devon Price',
        'Michael Grant',
        'Lena Brooks',
      ]);
      expect(at({ q: 'jamie' }).rows.map((r) => r.name)).toEqual(['Jamie Ortiz']);
      expect(at({ q: 'harborpine.com' }).rows.map((r) => r.name)).toEqual(['Natasha Reed', 'Claire Dubois']);
      expect(at({ q: 'nobody' }).rows).toEqual([]);
      expect(at({ q: 'nobody' }).footNote).toBe('Showing 0 of 148 learners. Highlighted rows are the demo personas.');
    });

    it('combines the tier filter with the search', () => {
      expect(at({ tier: 'agent', q: 'northline' }).rows).toEqual([]);
    });
  });

  // ---- Teams table ----------------------------------------------------------------------------
  describe('teams table', () => {
    it('reports seats, owner, deployments and pending invites per team', () => {
      expect(at({ tab: 'teams' }).teams).toEqual([
        {
          id: 'northline',
          name: 'Northline Realty Team',
          owner: 'Alex Morgan',
          seats: '6 of 7',
          fill: '86%',
          deployed: '7 deployed',
          invites: 'None',
          pending: false,
        },
        {
          id: 'harbor',
          name: 'Harbor & Pine Group',
          owner: 'Natasha Reed',
          seats: '2 of 7',
          fill: '29%',
          deployed: '6 deployed',
          invites: 'None',
          pending: false,
        },
        {
          id: 'keystone',
          name: 'Keystone Collective',
          owner: 'Marcus Lee',
          seats: '1 of 7',
          fill: '14%',
          deployed: '1 deployed',
          invites: 'None',
          pending: false,
        },
      ]);
    });

    it('counts the modelled teams against the baseline total', () => {
      const vm = at({ tab: 'teams' });
      expect(vm.isTeams).toBe(true);
      expect(vm.isLearners).toBe(false);
      // 4 baseline teams + 3 modelled
      expect(vm.teamsNote).toBe('Showing 3 of 7 teams.');
    });
  });

  // ---- Learner drawer -------------------------------------------------------------------------
  describe('learner drawer', () => {
    it('is closed with no person while nothing is selected', () => {
      expect(at().drawer).toEqual({ open: false, person: null });
    });

    it('opens on Jamie with the four facts and the Agent-tier build progress', () => {
      const dp = at({ sel: 'u_jamie' }).drawer.person!;
      expect(dp.name).toBe('Jamie Ortiz');
      expect(dp.email).toBe('jamie@ortizhomes.com');
      expect(dp.facts).toEqual([
        { k: 'Tier', v: 'Agent' },
        { k: 'Team', v: 'Individual' },
        { k: 'Joined', v: 'Wed, Nov 18' },
        // Sentence case on `active` is the reference's own, against SCREENS § 4.5.
        { k: 'Last active', v: '44 min ago' },
      ]);
      expect(dp.mods.map((m) => [m.name, m.access, m.build.state, m.build.n, m.runtime])).toEqual([
        ['Marketing AI Employee', true, 'verified', 6, 'deployed'],
        ['Sales AI Employee', true, 'in_progress', 3, 'not_deployed'],
        ['Database AI Employee', true, 'not_started', 0, 'not_deployed'],
        ['Meetings AI Employee', false, 'not_started', 0, 'not_deployed'],
        ['Finance AI Employee', false, 'not_started', 0, 'not_deployed'],
        ['Operations AI Employee', false, 'not_started', 0, 'not_deployed'],
      ]);
      expect(dp.mods.every((m) => m.build.total === 6)).toBe(true);
    });

    it('offers the amber upgrade for an Agent-tier learner', () => {
      const dp = at({ sel: 'u_jamie' }).drawer.person!;
      expect(dp.tierLabel).toBe('Upgrade to Team Tier');
      expect(dp.tierUpgrade).toBe(true);
      expect(dp.tierTarget).toBe('team');
      expect(dp.nudgeLabel).toBe('Send Nudge');
      expect(dp.invited).toBe(false);
    });

    it('offers the downgrade for a Team-tier learner, with every AI Employee unlocked', () => {
      const vm = at({ sel: 'u_alex' });
      const dp = vm.drawer.person!;
      expect(vm.drawer.open).toBe(true);
      expect(dp.facts).toEqual([
        { k: 'Tier', v: 'Team' },
        { k: 'Team', v: 'Northline Realty Team' },
        { k: 'Joined', v: 'Thu, Nov 12' },
        { k: 'Last active', v: '11 min ago' },
      ]);
      expect(dp.tierLabel).toBe('Move to Agent Tier');
      expect(dp.tierUpgrade).toBe(false);
      expect(dp.tierTarget).toBe('agent');
      expect(dp.mods.every((m) => m.access)).toBe(true);
      expect(dp.mods.map((m) => m.build.state)).toEqual([
        'verified',
        'verified',
        'in_progress',
        'not_started',
        'not_started',
        'not_started',
      ]);
      expect(dp.mods.map((m) => m.runtime)).toEqual([
        'deployed',
        'deployed',
        'not_deployed',
        'not_deployed',
        'not_deployed',
        'not_deployed',
      ]);
    });

    it('shows Invite pending and Resend Invite for someone who has not accepted', () => {
      setViewerZone(CT);
      const db = seed('live');
      const jamie = db.users.find((u) => u.id === 'u_jamie')!;
      jamie.status = 'invited';
      jamie.last = null;
      const dp = learnersVM(db, phaseNow('live'), { ...LEARNERS_UI, sel: 'u_jamie' }).drawer.person!;
      expect(dp.facts[2]).toEqual({ k: 'Joined', v: 'Invite pending' });
      expect(dp.facts[3]).toEqual({ k: 'Last active', v: '—' });
      expect(dp.nudgeLabel).toBe('Resend Invite');
      expect(dp.invited).toBe(true);
    });

    it('renders an invited learner’s row as Invited, dated from the invite', () => {
      setViewerZone(CT);
      const db = seed('live');
      const omar = db.users.find((u) => u.id === 'u_omar')!;
      omar.status = 'invited';
      const row = learnersVM(db, phaseNow('live'), LEARNERS_UI).rows.find((r) => r.id === 'u_omar')!;
      expect(row.status).toBe('Invited');
      expect(row.statusTone).toBe('locked');
      expect(row.invited).toBe(true);
      expect(row.last).toBe('Invited 1 week ago');
    });
  });

  // ---- Export ---------------------------------------------------------------------------------
  describe('Export Roster', () => {
    it('names the file and writes a header plus one row per filtered learner', () => {
      const vm = at({ tier: 'agent' });
      expect(vm.csvName).toBe('learners-dec-2026.csv');
      const lines = vm.csvText.split('\n');
      expect(lines).toHaveLength(6);
      expect(lines[0]).toBe('"Name","Email","Tier","Team","Role","Deployed","Status"');
      // The CSV carries the raw role, without the table's ` · Demo: …` badge.
      expect(lines[1]).toBe('"Jamie Ortiz","jamie@ortizhomes.com","Agent","Individual","Agent","1/3","Active"');
      expect(lines[5]).toBe('"Omar Haddad","omar@haddadhomes.com","Agent","Individual","Agent","0/3","At Risk"');
    });

    it('exports every learner when no filter is set', () => {
      expect(at().csvText.split('\n')).toHaveLength(15);
    });
  });

  // ---- phase 06 § 6.2: the same arithmetic over ZERO_BASE ------------------------------------
  describe('http mode (base is ZERO_BASE)', () => {
    const live = (): LearnersVM => {
      setViewerZone(CT);
      return learnersVM({ ...seed('live'), base: ZERO_BASE }, phaseNow('live'), LEARNERS_UI);
    };

    it('drops the aggregates and shows only the real rows, with no branch in the VM', () => {
      const vm = live();
      expect(vm.stats.map((s) => s.value)).toEqual(['14', '5', '9', '0']);
      expect(vm.footNote).toBe('Showing 14 of 14 learners. Highlighted rows are the demo personas.');
      expect(vm.teamsNote).toBe('Showing 3 of 3 teams.');
    });

    it('leaves every per-learner figure untouched, because none of them reads base', () => {
      expect(live().rows.map((r) => r.count)).toEqual(at().rows.map((r) => r.count));
      expect(live().teams).toEqual(at().teams);
    });
  });
});
