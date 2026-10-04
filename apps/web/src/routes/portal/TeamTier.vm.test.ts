import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db, Learner, Phase } from '@ai/core';
import { teamTierVM } from './TeamTier.vm';
import type { TeamTierAdd, TeamTierCompareRow, TeamTierCta } from './TeamTier.vm';

// Every expectation is a hard-coded string, not a recomputation: the fingerprint test compares the
// rendered copy exactly, so the VM's output is pinned here the same way.

const learner = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;

const PHASES: { phase: Phase; label: string }[] = [
  { phase: 'week0', label: 'Week 0' },
  { phase: 'live', label: 'Week 2' },
  { phase: 'post', label: 'After Cohort' },
];

const ADDS: TeamTierAdd[] = [
  {
    id: 'meetings',
    name: 'Meetings AI Employee',
    icon: 'mic',
    headline: 'Every leadership meeting ends with decisions, owners and next week’s agenda.',
    outputs: [
      'Decisions, risks and open questions from any transcript',
      'Action items with an owner and due date',
      'Next week’s agenda, built from open items',
    ],
    sessLine: 'Session 4 · Thu, Dec 10',
  },
  {
    id: 'finance',
    name: 'Finance AI Employee',
    icon: 'dollar',
    headline: 'Know your net commission and margin on every deal.',
    outputs: [
      'Gross and net commission by agent, month to date',
      'Expenses mapped to your P&L categories',
      'Flags on any deal under your margin threshold',
    ],
    sessLine: 'Session 5 · Tue, Dec 15',
  },
  {
    id: 'operations',
    name: 'Operations AI Employee',
    icon: 'workflow',
    headline: 'Nothing slips between contract and close.',
    outputs: [
      'Contract-to-close timeline with every contingency',
      'Milestone emails for lender, title and client',
      '30-day onboarding plan for new agents',
    ],
    sessLine: 'Session 6 · Thu, Dec 17',
  },
];

const COMPARE: TeamTierCompareRow[] = [
  { label: 'AI Employees', a: '3', t: '6', aMuted: false },
  { label: 'Seats', a: '1', t: '7', aMuted: false },
  { label: 'Live Sessions and Replays', a: '✓', t: '✓', aMuted: false },
  { label: 'Resource & Compliance Vault', a: '✓', t: '✓', aMuted: false },
  { label: 'Team Hub with Progress Tracking', a: '—', t: '✓', aMuted: true },
  { label: 'Executive Build Vault', a: '—', t: '✓', aMuted: true },
];

const FEATURES = [
  'All 6 AI Employees',
  '7 seats: owner, ops lead and up to 5 agents',
  'Team Hub with progress tracking',
  'Executive Build Vault',
];

const AVAILABLE: TeamTierCta = {
  state: 'available',
  label: 'Book Upgrade Consultation',
  icon: 'calendar',
  note: '15-minute call · Your Agent tier progress carries over',
};

describe('teamTierVM @g5', () => {
  // `fmt.day` reads the viewer zone, so pin it: `Thu, Dec 10` must not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  for (const { phase, label } of PHASES) {
    describe(`${label} · Jamie Ortiz (Agent tier)`, () => {
      const db = seed(phase);
      const vm = teamTierVM(db, learner(db, 'u_jamie'), phaseNow(phase));

      it('adds the three Team-tier AI Employees, in curriculum order', () => {
        expect(vm.adds).toEqual(ADDS);
      });

      it('compares the two tiers in six rows', () => {
        expect(vm.compare).toEqual(COMPARE);
      });

      it('prices the Team tier at $4,995 for 7 seats', () => {
        expect(vm.price).toBe('$4,995');
        expect(vm.seats).toBe(7);
        expect(vm.features).toEqual(FEATURES);
      });

      it('offers the consultation, because Jamie has no open request', () => {
        expect(vm.up).toEqual(AVAILABLE);
      });
    });

    describe(`${label} · Alex Morgan (Team owner)`, () => {
      const db = seed(phase);
      const vm = teamTierVM(db, learner(db, 'u_alex'), phaseNow(phase));

      // The shell redirects a Team-tier viewer to `/`, but the page sells the same three AI
      // Employees whoever reaches it: the reference asks `canAccess` about a synthetic Agent viewer.
      it('still lists what Agent tier is missing', () => {
        expect(vm.adds).toEqual(ADDS);
        expect(vm.compare).toEqual(COMPARE);
      });

      it('offers the consultation, because Alex has no open request', () => {
        expect(vm.up).toEqual(AVAILABLE);
      });
    });
  }

  describe('Week 2 · an open request', () => {
    const NOW = phaseNow('live');

    const withRequest = (status: 'new' | 'contacted' | 'converted' | 'closed', userId: string | null, at: number): Db => {
      const db = seed('live');
      db.requests.unshift({
        id: 'ur-test',
        userId,
        name: 'Jamie Ortiz',
        email: 'jamie@ortizhomes.com',
        source: 'Team tier page',
        at,
        status,
      });
      return db;
    };

    it('turns the CTA into Consultation Requested, with the relative note', () => {
      const db = withRequest('new', 'u_jamie', NOW - 2 * 3600e3);
      expect(teamTierVM(db, learner(db, 'u_jamie'), NOW).up).toEqual({
        state: 'requested',
        label: 'Consultation Requested',
        icon: 'check',
        note: 'Requested 2 hours ago · we’ll reach out within 1 business day',
      });
    });

    it('counts a contacted request as open too', () => {
      const db = withRequest('contacted', 'u_jamie', NOW - 36 * 3600e3);
      expect(teamTierVM(db, learner(db, 'u_jamie'), NOW).up).toEqual({
        state: 'requested',
        label: 'Consultation Requested',
        icon: 'check',
        note: 'Requested yesterday · we’ll reach out within 1 business day',
      });
    });

    it('ignores a converted request and another learner’s request', () => {
      const converted = withRequest('converted', 'u_jamie', NOW - 2 * 3600e3);
      expect(teamTierVM(converted, learner(converted, 'u_jamie'), NOW).up).toEqual(AVAILABLE);

      const other = withRequest('new', 'u_alex', NOW - 2 * 3600e3);
      expect(teamTierVM(other, learner(other, 'u_jamie'), NOW).up).toEqual(AVAILABLE);
    });
  });
});
