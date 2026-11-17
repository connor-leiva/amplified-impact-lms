// D-166 (spec § 7.7): the Usage screen's words and figures, from the API's report. The mockup's
// numbers come from the fixture; production prints what was counted, "Unavailable" for what has no
// source, and when counting starts before anything was counted.
import { describe, expect, it } from 'vitest';
import type { UsageReport } from '@ai/core';
import { fixtureUsage } from '../../data/console-fixture-email-usage';
import { DEFAULT_USAGE_FILTERS, RANGE_OPTIONS, rangeLabel, usageQueryFor, usageVM, workspaceUsageVM } from './usage.vm';

const NOW = Date.parse('2026-12-10T16:30:00Z');

const empty = (over: Partial<UsageReport> = {}): UsageReport => ({
  from: '2026-11-27',
  to: '2026-12-10',
  countingSince: '2026-12-10',
  hasData: false,
  totals: { signIns: 0, lessonPlays: null, guideViews: 0, sessionJoins: 0, activeUsers: 0 },
  seats: { used: 0, cap: 0 },
  emailsSent: 0,
  storage: null,
  signInsPerDay: [],
  workspaces: [],
  options: [],
  ...over,
});

describe('the Usage filters @console', () => {
  it('asks for the last 14 days by default, in the program zone', () => {
    expect(usageQueryFor(DEFAULT_USAGE_FILTERS, NOW)).toEqual({ from: '2026-11-27', to: '2026-12-10' });
    expect(usageQueryFor({ teamId: 'ws_1', plan: 'agents', days: '7' }, NOW)).toEqual({ from: '2026-12-04', to: '2026-12-10', teamId: 'ws_1', planKind: 'agents' });
    expect(usageQueryFor({ teamId: '', plan: 'gold', days: '99' }, NOW)).toEqual({ from: '2026-11-27', to: '2026-12-10' });
  });
  it('offers the mockup’s three ranges', () => {
    expect(RANGE_OPTIONS.map((o) => o.label)).toEqual(['Last 7 days', 'Last 14 days', 'Last 30 days']);
    expect(rangeLabel(DEFAULT_USAGE_FILTERS)).toBe('Last 14 days');
  });
});

describe('the Usage screen @console', () => {
  it('prints the mockup’s figures from the fixture', () => {
    const vm = usageVM(fixtureUsage({ from: '2026-11-27', to: '2026-12-10' }, NOW));
    expect(vm.state).toEqual({ kind: 'data' });
    expect(vm.stats.map((s) => [s.label, s.value, s.sub ?? null])).toEqual([
      ['Sign-ins', '1,648', null],
      ['Lesson plays', '4,429', null],
      ['Skill-guide views', '7,622', null],
      ['Seat utilization', '82%', null],
      ['Storage', '41.2 GB', 'of 100 GB bucket'],
      ['Emails sent', '2,987', null],
    ]);
    expect(vm.bars.map((b) => b.pct)).toEqual([62, 71, 68, 80, 77, 31, 28, 74, 85, 88, 92, 81, 36, 30]);
    expect(vm.bars.filter((b) => b.low).map((b) => b.pct)).toEqual([31, 28, 36, 30]);
    expect([vm.first, vm.last]).toEqual(['Nov 27', 'Dec 10']);
    expect(vm.rows.map((r) => [r.name, r.plan, r.signIns, r.lessonPlays, r.seatPct, r.seats.bar])).toEqual([
      ['Northshore Group', 'Team Plan · 41 seats', '528', '1,419', '80%', 'ok'],
      ['Hale & Marlowe Realty', 'Team Plan · 16 seats', '240', '645', '94%', 'hot'],
      ['Red Cliff Collective', 'Agent Plan', '736', '1,978', '92%', 'hot'],
      ['Copper Basin Realty', 'AI Accelerator', '32', '86', '100%', 'full'],
      ['Tidewater Property Co.', 'Insiders', '16', '43', '100%', 'full'],
      ['Lantern Street Partners', 'Team Plan · 16 seats', '96', '258', '38%', 'ok'],
    ]);
  });

  it('says “Unavailable” for what has no source, and never makes a number up', () => {
    const vm = usageVM(
      empty({
        hasData: true,
        countingSince: '2026-11-16',
        totals: { signIns: 12, lessonPlays: null, guideViews: 3, sessionJoins: 1, activeUsers: 4 },
        seats: { used: 5, cap: 16 },
        emailsSent: 9,
        signInsPerDay: [
          { day: '2026-12-09', count: 7 },
          { day: '2026-12-10', count: 5 },
        ],
        workspaces: [{ teamId: 't', name: 'Northline', planKind: 'agents', seatCap: 16, seatsUsed: 5, signIns: 12, lessonPlays: null }],
      }),
    );
    expect(vm.stats.map((s) => [s.value, s.sub ?? null])).toEqual([
      ['12', null],
      ['—', 'Unavailable'],
      ['3', null],
      ['31%', null],
      ['—', 'Unavailable'],
      ['9', null],
    ]);
    // A ceiling of 10 for a busiest day of 7.
    expect(vm.bars.map((b) => b.pct)).toEqual([70, 50]);
    expect(vm.rows[0]).toMatchObject({ lessonPlays: '—', seatPct: '31%' });
    expect(vm.chartLabel).toBe('Sign-ins per day, Dec 9 to Dec 10: 12 in all, 7 on the busiest day.');
  });

  it('says when counting starts before anything was counted, and when a range is empty', () => {
    expect(usageVM(empty({ countingSince: '2026-11-16' })).state).toEqual({ kind: 'starts', title: 'Usage starts counting on Nov 16, 2026' });
    expect(usageVM(empty({ hasData: true })).state).toEqual({ kind: 'empty', title: 'No usage in this range' });
    // Seat utilization with no running workspace has no source either.
    expect(usageVM(empty({ hasData: true })).stats[3]).toMatchObject({ value: '—', sub: 'Unavailable' });
  });

  it('draws a workspace’s Usage tab: 7 days, and storage only when the API has one', () => {
    const tab = workspaceUsageVM(fixtureUsage({ from: '2026-12-04', to: '2026-12-10', teamId: 'ws_northshore' }, NOW));
    expect(tab.stats.map((s) => [s.label, s.value])).toEqual([
      ['Sign-ins, 7d', '198'],
      ['Lesson plays, 7d', '132'],
      ['Guide views, 7d', '297'],
      ['Storage', '6.6 GB'],
    ]);
    const prod = workspaceUsageVM(empty({ hasData: true, totals: { signIns: 2, lessonPlays: null, guideViews: 1, sessionJoins: 0, activeUsers: 1 } }));
    expect(prod.stats.map((s) => s.value)).toEqual(['2', '—', '1', '—']);
    expect(workspaceUsageVM(empty({ countingSince: '2026-11-16' })).state).toMatchObject({ kind: 'starts' });
  });
});
