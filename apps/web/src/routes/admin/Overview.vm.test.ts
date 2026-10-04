import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ZERO_BASE, phaseNow, seed, setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import { overviewVM } from './Overview.vm';

// Casey Lin's Overview at the demo instants. Every expectation is a LITERAL, generated once from
// design-reference/Admin Overview.dc.html driven by design-reference/lms-data.js, then pinned
// (phase 06 § 6.1). Recomputing them here would only prove the port agrees with itself.
//
// The point of most of these numbers is `db.base` — the aggregate for the 134 learners the fixture
// does not model (phase 06 § 6.2). `148` is `134 + 14`, `98` deployed Marketing builds is `88 + 10`,
// and the chart's `190` is `base.daily[6] = 171` plus the 19 modelled deployments. The ZERO_BASE
// block at the bottom is the same code reading what the API returns in http mode, which is how we
// know the baseline is added rather than hard-coded.

const WEEK0 = phaseNow('week0'); // Fri 2026-11-27 10:42 CT
const WEEK2 = phaseNow('live'); // Mon 2026-12-07 10:42 CT

/** The same snapshot the API hands back: no unmodelled learners at all. */
const zeroBase = (db: Db): Db => ({ ...db, base: ZERO_BASE });

describe('overviewVM @g6', () => {
  // `fmt.date` and `fmt.ago` read the viewer zone, so pin it: `Dec 9` must not depend on the
  // machine running the test.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Week 2 · the parity instant', () => {
    const vm = overviewVM(seed('live'), WEEK2);

    it('reads the cohort line and the live-activity note', () => {
      expect(vm.subline).toBe('December 2026 Cohort · Week 2 of 6 · Updated Live from Learner Activity');
    });

    it('counts 148 learners: the 134 in the baseline plus the 14 modelled seats', () => {
      expect(vm.kpis[0]).toEqual({
        key: 'learners',
        label: 'Active Learners',
        value: '148',
        sub: '104 Agent · 44 Team seats',
        subTone: 'tertiary',
      });
    });

    it('counts 190 deployments and the 6 from the last 24 hours, in the success colour', () => {
      expect(vm.kpis[1]).toEqual({
        key: 'deployed',
        label: 'AI Employees Deployed',
        value: '190',
        sub: '+6 in the last 24 hours',
        subTone: 'success',
      });
    });

    it('divides the 190 deployments by the 576 builds available', () => {
      expect(vm.kpis[2]).toEqual({
        key: 'completion',
        label: 'Build Completion',
        value: '33%',
        sub: 'Deployed ÷ builds available',
        subTone: 'tertiary',
      });
    });

    it('reads attendance off the last held session, against all 148 learners', () => {
      expect(vm.kpis[3]).toEqual({
        key: 'attendance',
        label: 'Live Attendance',
        value: '74%',
        sub: 'Session 2 · 109 attended',
        subTone: 'tertiary',
      });
    });

    it('prices the two open upgrade requests at the uplift each, and turns the sub amber', () => {
      expect(vm.kpis[4]).toEqual({
        key: 'pipeline',
        label: 'Upgrade Pipeline',
        value: '$8,000',
        sub: '2 open requests · Agent → Team',
        subTone: 'locked',
      });
    });

    it('adds base.mod to every funnel row, in curriculum order', () => {
      expect(vm.funnel).toEqual([
        {
          key: 'marketing',
          name: 'Marketing',
          icon: 'megaphone',
          team: false,
          d: '98',
          n: '148',
          pct: '66%',
          wd: '66.21621621621621%',
          wp: '19.594594594594593%',
        },
        {
          key: 'sales',
          name: 'Sales',
          icon: 'zap',
          team: false,
          d: '58',
          n: '148',
          pct: '39%',
          wd: '39.189189189189186%',
          wp: '28.37837837837838%',
        },
        {
          key: 'database',
          name: 'Database',
          icon: 'database',
          team: false,
          d: '24',
          n: '148',
          pct: '16%',
          wd: '16.216216216216218%',
          wp: '20.945945945945947%',
        },
        {
          key: 'meetings',
          name: 'Meetings',
          icon: 'mic',
          team: true,
          d: '8',
          n: '44',
          pct: '18%',
          wd: '18.181818181818183%',
          wp: '22.727272727272727%',
        },
        {
          key: 'finance',
          name: 'Finance',
          icon: 'dollar',
          team: true,
          d: '2',
          n: '44',
          pct: '5%',
          wd: '4.545454545454546%',
          wp: '11.363636363636363%',
        },
        {
          key: 'operations',
          name: 'Operations',
          icon: 'workflow',
          team: true,
          d: '0',
          n: '44',
          pct: '0%',
          wd: '0%',
          wp: '0%',
        },
      ]);
    });

    it('sizes a team-tier funnel row against the 44 team seats, not the 148 learners', () => {
      expect(vm.funnel.filter((f) => f.team).map((f) => f.n)).toEqual(['44', '44', '44']);
    });

    it('plots one point per day from Dec 1, each base.daily plus the deployments by that evening', () => {
      // base.daily = [0, 41, 78, 102, 131, 158, 171]; modelled cumulative = [4, 9, 12, 13, 13, 16, 19].
      expect(vm.chart.delta).toBe('190 total');
      expect(vm.chart.labels).toEqual(['Dec 1', 'Dec 2', 'Dec 3', 'Dec 4', 'Dec 5', 'Dec 6', 'Dec 7']);
      expect(vm.chart.line).toBe(
        'M0.0 196.2 L100.0 152.5 L200.0 114.5 L300.0 90.8 L400.0 63.2 L500.0 34.7 L600.0 19.5',
      );
    });

    it('closes the area down the baseline and puts the grid at 25, 50 and 75 percent', () => {
      expect(vm.chart.area).toBe(`${vm.chart.line} L600 200 L0 200 Z`);
      expect(vm.chart.grid).toEqual([152.5, 105, 57.5]);
    });

    it('lists the six activity events newest first, with their tones and relative times', () => {
      expect(vm.feed).toEqual([
        { key: 'e1', who: 'Sarah Collins', what: 'deployed Database AI Employee', ago: '38 min ago', tone: 'success' },
        { key: 'e2', who: 'Rosa Delgado', what: 'deployed Database AI Employee', ago: '2 hours ago', tone: 'success' },
        { key: 'e3', who: 'Natasha Reed', what: 'deployed Meetings AI Employee', ago: '2 hours ago', tone: 'success' },
        { key: 'e4', who: 'Devon Price', what: 'deployed Sales AI Employee', ago: '14 hours ago', tone: 'success' },
        { key: 'e5', who: 'Kenji Watanabe', what: 'requested a Team tier upgrade', ago: '18 hours ago', tone: 'warn' },
        { key: 'e6', who: 'Casey Lin', what: 'moved Session 3 to Wed Dec 9', ago: '19 hours ago', tone: 'info' },
      ]);
    });

    it('bars the two held sessions against all 148 learners and dashes the four to come', () => {
      expect(vm.att).toEqual([
        { key: 'dec26-s1', n: 1, label: '82%', title: 'Session 1 · The Autonomous Agent', h: '82%', held: true },
        { key: 'dec26-s2', n: 2, label: '74%', title: 'Session 2 · Speed to Lead', h: '74%', held: true },
        { key: 'dec26-s3', n: 3, label: 'Dec 9', title: 'Session 3 · The Living Database', h: '18%', held: false },
        {
          key: 'dec26-s4',
          n: 4,
          label: 'Dec 10',
          title: 'Session 4 · The Meeting That Runs Itself',
          h: '18%',
          held: false,
        },
        { key: 'dec26-s5', n: 5, label: 'Dec 15', title: 'Session 5 · Numbers on Autopilot', h: '18%', held: false },
        { key: 'dec26-s6', n: 6, label: 'Dec 17', title: 'Session 6 · Contract to Close', h: '18%', held: false },
      ]);
    });

    it('footnotes only the sessions with replay views', () => {
      expect(vm.replayViews).toBe('S1 312 · S2 188');
    });

    it('flags the two learners who have started nothing, and only those two', () => {
      expect(vm.noRisk).toBe(false);
      expect(vm.risk).toEqual([
        {
          id: 'u_lena',
          name: 'Lena Brooks',
          sub: 'Team Tier · Northline Realty Team · last active 1 week ago',
          reason: 'No build started',
          first: true,
          btn: 'Send nudge',
          nudged: false,
        },
        {
          id: 'u_omar',
          name: 'Omar Haddad',
          sub: 'Agent Tier · last active 1 week ago',
          reason: 'No build started',
          first: false,
          btn: 'Send nudge',
          nudged: false,
        },
      ]);
      expect(vm.nudgeAllIds).toEqual(['u_lena', 'u_omar']);
    });

    it('reports a learner who has built something but gone quiet as inactive instead', () => {
      const db = seed('live');
      db.users.find((u) => u.id === 'u_ben')!.last = WEEK2 - 6 * 86400000;
      const row = overviewVM(db, WEEK2).risk.find((r) => r.id === 'u_ben');
      expect(row?.reason).toBe('Inactive 5+ days');
      expect(row?.sub).toBe('Agent Tier · last active 6 days ago');
    });

    it('turns a nudged row into its relative time', () => {
      const db = seed('live');
      db.users.find((u) => u.id === 'u_lena')!.nudged = WEEK2 - 3600000;
      const row = overviewVM(db, WEEK2).risk[0]!;
      expect(row.btn).toBe('Nudged 1 hour ago');
      expect(row.nudged).toBe(true);
    });

    it('says everyone is moving when nothing is at risk', () => {
      const db = seed('live');
      db.users = db.users.filter((u) => u.id !== 'u_lena' && u.id !== 'u_omar');
      const quiet = overviewVM(db, WEEK2);
      expect(quiet.risk).toEqual([]);
      expect(quiet.noRisk).toBe(true);
      expect(quiet.nudgeAllIds).toEqual([]);
    });

    it('exports the funnel with the baseline folded in, one row per AI Employee', () => {
      expect(vm.report.name).toBe('cohort-report-dec-2026.csv');
      expect(vm.report.mime).toBe('text/csv');
      expect(vm.report.toast).toBe('Cohort report exported');
      expect(vm.report.content.split('\n')).toEqual([
        '"AI Employee","Deployed","In progress","Eligible learners"',
        '"Marketing AI Employee","98","29","148"',
        '"Sales AI Employee","58","42","148"',
        '"Database AI Employee","24","31","148"',
        '"Meetings AI Employee","8","10","44"',
        '"Finance AI Employee","2","5","44"',
        '"Operations AI Employee","0","0","44"',
      ]);
    });

    it('sends New AI Employee to the builder', () => {
      expect(vm.newEmployeeTo).toBe('/admin/curriculum/new');
    });
  });

  describe('Week 0 · nothing held, nothing built', () => {
    const vm = overviewVM(seed('week0'), WEEK0);

    it('says the cohort has not started, and still counts the 148 enrolled seats', () => {
      expect(vm.subline).toBe('December 2026 Cohort · Starts Dec 1 · Updated Live from Learner Activity');
      expect(vm.kpis.map((k) => [k.label, k.value, k.sub])).toEqual([
        ['Active Learners', '148', '104 Agent · 44 Team seats'],
        ['AI Employees Deployed', '0', '+0 in the last 24 hours'],
        ['Build Completion', '0%', 'Deployed ÷ builds available'],
        ['Live Attendance', '—', 'No sessions yet'],
        ['Upgrade Pipeline', '$0', '0 open requests · Agent → Team'],
      ]);
      expect(vm.kpis[4]!.subTone).toBe('tertiary');
    });

    it('keeps the eligible pools at 148 and 44 while every build sits at zero', () => {
      expect(vm.funnel.map((f) => [f.n, f.pct, f.wd])).toEqual([
        ['148', '0%', '0%'],
        ['148', '0%', '0%'],
        ['148', '0%', '0%'],
        ['44', '0%', '0%'],
        ['44', '0%', '0%'],
        ['44', '0%', '0%'],
      ]);
    });

    it('still draws seven days, flat on the baseline, before the cohort opens', () => {
      expect(vm.chart.delta).toBe('0 total');
      expect(vm.chart.labels).toHaveLength(7);
      expect(vm.chart.line).toBe(
        'M0.0 200.0 L100.0 200.0 L200.0 200.0 L300.0 200.0 L400.0 200.0 L500.0 200.0 L600.0 200.0',
      );
    });

    it('dashes all six sessions and has no replay views', () => {
      expect(vm.att.map((a) => [a.label, a.held])).toEqual([
        ['Dec 1', false],
        ['Dec 3', false],
        ['Dec 8', false],
        ['Dec 10', false],
        ['Dec 15', false],
        ['Dec 17', false],
      ]);
      expect(vm.replayViews).toBe('—');
    });

    it('flags every learner, because nobody has started', () => {
      expect(vm.risk).toHaveLength(14);
      expect(vm.risk.every((r) => r.reason === 'No build started')).toBe(true);
      expect(vm.risk.filter((r) => r.first)).toHaveLength(1);
    });
  });

  describe('http mode · the API returns ZERO_BASE', () => {
    const vm = overviewVM(zeroBase(seed('live')), WEEK2);

    it('falls back to the modelled learners alone, with no branch in the model', () => {
      expect(vm.kpis.map((k) => [k.label, k.value, k.sub])).toEqual([
        ['Active Learners', '14', '5 Agent · 9 Team seats'],
        ['AI Employees Deployed', '19', '+6 in the last 24 hours'],
        ['Build Completion', '28%', 'Deployed ÷ builds available'],
        ['Live Attendance', '779%', 'Session 2 · 109 attended'],
        ['Upgrade Pipeline', '$8,000', '2 open requests · Agent → Team'],
      ]);
    });

    it('sizes each funnel row by its eligible pool once base.mod is empty', () => {
      expect(vm.funnel.map((f) => [f.name, f.d, f.n, f.pct])).toEqual([
        ['Marketing', '10', '14', '71%'],
        ['Sales', '4', '14', '29%'],
        ['Database', '3', '14', '21%'],
        ['Meetings', '2', '9', '22%'],
        ['Finance', '0', '9', '0%'],
        ['Operations', '0', '9', '0%'],
      ]);
    });

    it('rescales the chart to the 19 modelled deployments', () => {
      expect(vm.chart.delta).toBe('19 total');
      expect(vm.chart.line).toBe(
        'M0.0 184.8 L100.0 165.8 L200.0 154.4 L300.0 150.6 L400.0 150.6 L500.0 139.2 L600.0 127.8',
      );
    });

    it('leaves the parts that never involved the baseline untouched', () => {
      expect(vm.replayViews).toBe('S1 312 · S2 188');
      expect(vm.nudgeAllIds).toEqual(['u_lena', 'u_omar']);
      expect(vm.feed).toHaveLength(6);
    });
  });
});
