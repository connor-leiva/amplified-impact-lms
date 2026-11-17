// /admin/usage on R2 (D-166, spec § 7.7): the words, filters, six tiles, chart and By-workspace rows
// of the mockup's `Usage`, and the four tiles of a workspace's Usage tab, from what the API answers.
// Pure; Usage.tsx and Workspace.tsx only render it.
//
// NEVER AN ESTIMATE. A figure the API answers as null has no source (lesson plays: nothing counts one
// yet; storage for one workspace, or a bucket that can't be read) and reads "—" with "Unavailable"
// under it. Before anything has been counted at all, the tiles and chart give way to "Usage starts
// counting on {date}". Production shows real numbers only; the mockup's figures are the fixture's.

import { USAGE_RANGES, dayLabel, dayLabelLong, isPlanKind, lastDays, niceCeiling, planLine, seatUtilization, storageCapLabel, storageLabel } from '@ai/core';
import type { UsageQuery, UsageReport } from '@ai/core';
import { PLAN_OPTIONS, NONE, seatsOf } from './workspaces.vm';
import type { Option, Seats } from './workspaces.vm';

export const USAGE_COPY = {
  title: 'Usage',
  description: 'How much the product is being used, by workspace and plan.',
  workspace: 'Workspace',
  plan: 'Plan',
  range: 'Date range',
  allWorkspaces: 'All workspaces',
  stats: {
    signIns: 'Sign-ins',
    lessonPlays: 'Lesson plays',
    guideViews: 'Skill-guide views',
    seats: 'Seat utilization',
    storage: 'Storage',
    emails: 'Emails sent',
  },
  chart: 'Sign-ins per day',
  byWorkspace: 'By workspace',
  columns: { name: 'Workspace', plan: 'Plan', signIns: 'Sign-ins', lessonPlays: 'Lesson plays', seats: 'Seat use' },
  empty: 'No usage in this range',
  unavailable: 'Unavailable',
  startsOn: (day: string) => `Usage starts counting on ${dayLabelLong(day)}`,
  bucket: (bytes: number) => `of ${storageCapLabel(bytes)} bucket`,
  /** A workspace's Usage tab: the last 7 days. */
  tab: { signIns: 'Sign-ins, 7d', lessonPlays: 'Lesson plays, 7d', guideViews: 'Guide views, 7d', storage: 'Storage' },
} as const;

export { PLAN_OPTIONS };

/** The mockup's three ranges; "Last 14 days" first chosen. */
export const RANGE_OPTIONS: readonly Option[] = USAGE_RANGES.map((r) => ({ value: String(r.days), label: r.label }));

export interface UsageFilterState {
  teamId: string;
  plan: string;
  days: string;
}

export const DEFAULT_USAGE_FILTERS: UsageFilterState = { teamId: '', plan: '', days: '14' };

/** The filters as the API reads them: the days ending today (program zone), and what else is set. */
export function usageQueryFor(f: UsageFilterState, now: number): UsageQuery {
  const days = USAGE_RANGES.find((r) => String(r.days) === f.days)?.days ?? 14;
  const q: UsageQuery = lastDays(days, now);
  if (f.teamId) q.teamId = f.teamId;
  if (isPlanKind(f.plan)) q.planKind = f.plan;
  return q;
}

export const rangeLabel = (f: UsageFilterState): string => RANGE_OPTIONS.find((o) => o.value === f.days)?.label ?? RANGE_OPTIONS[1]!.label;

export interface StatVM {
  key: string;
  label: string;
  value: string;
  sub?: string;
}

const count = (n: number): string => n.toLocaleString('en-US');
const unavailable = (key: string, label: string): StatVM => ({ key, label, value: NONE, sub: USAGE_COPY.unavailable });
const figure = (key: string, label: string, n: number | null): StatVM => (n === null ? unavailable(key, label) : { key, label, value: count(n) });

export interface BarVM {
  key: string;
  /** Height, in percent of the chart. */
  pct: number;
  /** A quiet day (under 40% of the chart), drawn lighter, as the mockup draws its low days. */
  low: boolean;
}

export interface UsageRowVM {
  key: string;
  name: string;
  plan: string;
  signIns: string;
  signInsN: number;
  lessonPlays: string;
  lessonPlaysN: number;
  seats: Seats;
  seatPct: string;
}

export type UsageState = { kind: 'starts'; title: string } | { kind: 'empty'; title: string } | { kind: 'data' };

export interface UsageVM {
  state: UsageState;
  stats: StatVM[];
  bars: BarVM[];
  first: string;
  last: string;
  chartLabel: string;
  rows: UsageRowVM[];
  workspaces: Option[];
}

function stateOf(r: UsageReport): UsageState {
  if (!r.hasData) return { kind: 'starts', title: USAGE_COPY.startsOn(r.countingSince) };
  const any = r.totals.signIns + r.totals.guideViews + r.totals.sessionJoins + (r.totals.lessonPlays ?? 0) > 0;
  return any ? { kind: 'data' } : { kind: 'empty', title: USAGE_COPY.empty };
}

export function usageVM(r: UsageReport): UsageVM {
  const S = USAGE_COPY.stats;
  const pct = seatUtilization(r.seats.used, r.seats.cap);
  const stats: StatVM[] = [
    figure('signIns', S.signIns, r.totals.signIns),
    figure('lessonPlays', S.lessonPlays, r.totals.lessonPlays),
    figure('guideViews', S.guideViews, r.totals.guideViews),
    pct === null ? unavailable('seats', S.seats) : { key: 'seats', label: S.seats, value: `${pct}%` },
    r.storage === null
      ? unavailable('storage', S.storage)
      : { key: 'storage', label: S.storage, value: storageLabel(r.storage.bytes), ...(r.storage.capBytes ? { sub: USAGE_COPY.bucket(r.storage.capBytes) } : {}) },
    figure('emails', S.emails, r.emailsSent),
  ];
  const max = Math.max(0, ...r.signInsPerDay.map((d) => d.count));
  const ceiling = niceCeiling(max);
  const bars = r.signInsPerDay.map((d) => {
    const p = (d.count * 100) / ceiling;
    return { key: d.day, pct: p, low: p < 40 };
  });
  const first = r.signInsPerDay[0] ? dayLabel(r.signInsPerDay[0].day) : '';
  const last = r.signInsPerDay.length ? dayLabel(r.signInsPerDay[r.signInsPerDay.length - 1]!.day) : '';
  const total = r.signInsPerDay.reduce((a, d) => a + d.count, 0);
  return {
    state: stateOf(r),
    stats,
    bars,
    first,
    last,
    chartLabel: `Sign-ins per day, ${first} to ${last}: ${count(total)} in all, ${count(max)} on the busiest day.`,
    rows: r.workspaces.map((w) => {
      const seats = seatsOf(w.seatsUsed, w.seatCap, w.planKind);
      return {
        key: w.teamId,
        name: w.name,
        plan: planLine(w.planKind, w.seatCap),
        signIns: count(w.signIns),
        signInsN: w.signIns,
        lessonPlays: w.lessonPlays === null ? NONE : count(w.lessonPlays),
        lessonPlaysN: w.lessonPlays ?? -1,
        seats,
        seatPct: `${Math.round(w.seatCap > 0 ? (w.seatsUsed / w.seatCap) * 100 : 0)}%`,
      };
    }),
    workspaces: [{ value: '', label: USAGE_COPY.allWorkspaces }, ...r.options.map((o) => ({ value: o.teamId, label: o.name }))],
  };
}

/** A workspace's Usage tab: the last 7 days, four tiles; storage is the bucket's, never one workspace's. */
export function workspaceUsageVM(r: UsageReport): { state: UsageState; stats: StatVM[] } {
  const T = USAGE_COPY.tab;
  return {
    state: r.hasData ? { kind: 'data' } : { kind: 'starts', title: USAGE_COPY.startsOn(r.countingSince) },
    stats: [
      figure('signIns', T.signIns, r.totals.signIns),
      figure('lessonPlays', T.lessonPlays, r.totals.lessonPlays),
      figure('guideViews', T.guideViews, r.totals.guideViews),
      r.storage === null ? unavailable('storage', T.storage) : { key: 'storage', label: T.storage, value: storageLabel(r.storage.bytes) },
    ],
  };
}
