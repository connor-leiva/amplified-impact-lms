import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ZERO_BASE, phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import { tiersVM } from './Tiers.vm';

// Casey Lin's Tiers & Upgrades at Week 2. Every expectation is a LITERAL, generated once from
// design-reference/Admin Tiers.dc.html driven by design-reference/lms-data.js, then pinned
// (phase 06 § 6.1). Recomputing them here would only prove the port agrees with itself.
//
// The point of most of these numbers is `db.base` — the aggregate for the 134 learners the fixture
// does not model (phase 06 § 6.2). `104 Agent licenses` is `base.agent` (99) plus the 5 modelled
// agent-tier learners; `7 teams` is `base.teams` (4) plus the 3 modelled teams; and every revenue
// figure is one of those two counts times a tier price. The ZERO_BASE block at the bottom is the
// same code reading what the API returns in http mode, which is how we know the baseline is added
// rather than hard-coded.

const WEEK2 = phaseNow('live'); // Mon 2026-12-07 10:42 CT

/** The same snapshot the API hands back: no unmodelled learners at all. */
const zeroBase = (db: Db): Db => ({ ...db, base: ZERO_BASE });

describe('tiersVM @g6', () => {
  // `fmt.ago` reads the viewer zone, so pin it: `18 hours ago` must not depend on the machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Week 2 · the parity instant', () => {
    const vm = tiersVM(seed('live'), WEEK2);

    it('prices the cohort at 104 baseline-inclusive agent licenses and 7 teams', () => {
      // 104 × $995 + 7 × $4,995 = $138,445.
      expect(vm.summary).toBe('December 2026 Cohort revenue $138,445 · 104 Agent licenses · 7 teams');
    });

    it('builds the Agent card from base.agent + the modelled agent-tier learners', () => {
      expect(vm.tiers[0]).toEqual({
        id: 'agent',
        name: 'Agent',
        seatsLabel: '1 seat',
        licenses: '104 licenses',
        price: 995,
        per: 'per agent, per cohort',
        blurb: 'For individual agents building their own AI Employees.',
        features: [
          'Marketing, Sales and Database AI Employees',
          'Live sessions and replays',
          'System prompts, skill files and checklists',
          'Resource & Compliance Vault',
        ],
        revenue: '$103,480',
        team: false,
      });
    });

    it('builds the Team card from base.teams + the modelled teams, and flags its border', () => {
      expect(vm.tiers[1]).toEqual({
        id: 'team',
        name: 'Team',
        seatsLabel: '7 seats',
        licenses: '7 teams',
        price: 4995,
        per: 'per team, per cohort',
        blurb: 'For teams that want every seat building, plus the leadership AI Employees.',
        features: [
          'All 6 AI Employees',
          '7 seats: owner, ops lead and up to 5 agents',
          'Team Hub with progress tracking',
          'Executive Build Vault',
        ],
        revenue: '$34,965',
        team: true,
      });
    });

    it('lists the six published employees in curriculum order, then the five fixed features', () => {
      expect(vm.matrix).toEqual([
        {
          key: 'marketing',
          label: 'Marketing AI Employee',
          state: 'included',
          icon: 'check',
          title: 'Gate to Team only',
          toggle: { id: 'marketing', tier: 'team' },
        },
        {
          key: 'sales',
          label: 'Sales AI Employee',
          state: 'included',
          icon: 'check',
          title: 'Gate to Team only',
          toggle: { id: 'sales', tier: 'team' },
        },
        {
          key: 'database',
          label: 'Database AI Employee',
          state: 'included',
          icon: 'check',
          title: 'Gate to Team only',
          toggle: { id: 'database', tier: 'team' },
        },
        {
          key: 'meetings',
          label: 'Meetings AI Employee',
          state: 'gated',
          icon: 'lock',
          title: 'Include in Agent Tier',
          toggle: { id: 'meetings', tier: 'agent' },
        },
        {
          key: 'finance',
          label: 'Finance AI Employee',
          state: 'gated',
          icon: 'lock',
          title: 'Include in Agent Tier',
          toggle: { id: 'finance', tier: 'agent' },
        },
        {
          key: 'operations',
          label: 'Operations AI Employee',
          state: 'gated',
          icon: 'lock',
          title: 'Include in Agent Tier',
          toggle: { id: 'operations', tier: 'agent' },
        },
        {
          key: 'Live sessions, replays & transcripts',
          label: 'Live sessions, replays & transcripts',
          state: 'included',
          icon: 'check',
          title: '',
          toggle: null,
        },
        {
          key: 'Resource & Compliance Vault',
          label: 'Resource & Compliance Vault',
          state: 'included',
          icon: 'check',
          title: '',
          toggle: null,
        },
        {
          key: 'Team Hub & progress tracking',
          label: 'Team Hub & progress tracking',
          state: 'off',
          icon: 'x',
          title: '',
          toggle: null,
        },
        {
          key: 'Executive Build Vault',
          label: 'Executive Build Vault',
          state: 'off',
          icon: 'x',
          title: '',
          toggle: null,
        },
        {
          key: 'Team seats (up to 7)',
          label: 'Team seats (up to 7)',
          state: 'off',
          icon: 'x',
          title: '',
          toggle: null,
        },
      ]);
    });

    it('orders the requests new → contacted → converted, with the actions each status allows', () => {
      expect(vm.requests).toEqual([
        {
          id: 'ur1',
          name: 'Kenji Watanabe',
          email: 'kenji@watanaberealty.com',
          source: 'Team tier page',
          ago: '18 hours ago',
          avatarId: 'u_kenji',
          status: 'new',
          statusLabel: 'New',
          isNew: true,
          actions: [
            { status: 'contacted', label: 'Mark Contacted' },
            { status: 'converted', label: 'Convert to Team' },
            { status: 'closed', label: 'Close' },
          ],
        },
        {
          id: 'ur2',
          name: 'Rosa Delgado',
          email: 'rosa@delgadorealty.com',
          source: 'Executive Build Vault',
          ago: '2 days ago',
          avatarId: 'u_rosa',
          status: 'contacted',
          statusLabel: 'Contacted',
          isNew: false,
          actions: [
            { status: 'converted', label: 'Convert to Team' },
            { status: 'closed', label: 'Close' },
          ],
        },
        {
          // No learner account, so `Convert to Team` never appeared — and once converted there is
          // nothing left to do at all.
          id: 'ur3',
          name: 'Amara Okafor',
          email: 'amara@okaforhomegroup.com',
          source: 'Sales call',
          ago: '4 days ago',
          avatarId: 'ur3',
          status: 'converted',
          statusLabel: 'Converted',
          isNew: false,
          actions: [],
        },
      ]);
      expect(vm.noRequests).toBe(false);
    });

    it('prices the pipeline at the two open requests times the Agent → Team uplift', () => {
      // 2 × ($4,995 − $995) = $8,000.
      expect(vm.pipeline).toBe('2 open · $8,000 potential');
    });
  });

  describe('Week 0 · before anything has happened', () => {
    const vm = tiersVM(seed('week0'), phaseNow('week0'));

    it('keeps the baseline licence counts, which do not move with the timeline', () => {
      expect(vm.summary).toBe('December 2026 Cohort revenue $138,445 · 104 Agent licenses · 7 teams');
    });

    it('shows no pipeline, because Week 0 keeps only the converted request', () => {
      expect(vm.pipeline).toBe('');
      expect(vm.requests.map((q) => [q.id, q.status, q.actions.length])).toEqual([['ur3', 'converted', 0]]);
    });
  });

  describe('http mode · the API returns ZERO_BASE', () => {
    const vm = tiersVM(zeroBase(seed('live')), WEEK2);

    it('counts only the modelled 5 agents and 3 teams', () => {
      // 5 × $995 + 3 × $4,995 = $19,960. The same code, so the baseline is added, not hard-coded.
      expect(vm.summary).toBe('December 2026 Cohort revenue $19,960 · 5 Agent licenses · 3 teams');
    });

    it('rebases both licence counts and both revenue figures', () => {
      expect(vm.tiers.map((t) => [t.licenses, t.revenue])).toEqual([
        ['5 licenses', '$4,975'],
        ['3 teams', '$14,985'],
      ]);
    });

    it('leaves the pipeline alone: open requests are modelled, not baseline', () => {
      expect(vm.pipeline).toBe('2 open · $8,000 potential');
    });
  });

  describe('an empty pipeline', () => {
    const vm = tiersVM({ ...seed('live'), requests: [] }, WEEK2);

    it('reports the empty state and drops the pipeline figure', () => {
      expect(vm.noRequests).toBe(true);
      expect(vm.requests).toEqual([]);
      expect(vm.pipeline).toBe('');
    });
  });
});
