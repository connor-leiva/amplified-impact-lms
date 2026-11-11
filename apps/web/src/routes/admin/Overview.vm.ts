// The Admin Overview view-model: a pure port of `renderVals()` in
// design-reference/Admin Overview.dc.html. Contract: SCREENS § 4.1, phase 06 § 6.1.
//
// PURE. No React, no hooks, no router, no `Date.now()`: `now` arrives as an argument, and each
// `onClick="{{ … }}"` thunk in the reference becomes data the component carries out — a list of
// learner ids to pass to `nudgeLearners`, a file to hand the browser, a route to navigate to.
//
// EVERY figure adds `db.base`, the aggregate for the ~134 learners the fixture does not model
// individually (phase 06 § 6.2). The arithmetic below is the reference's, line for line. In http
// mode the API returns `ZERO_BASE`, so the same code shows live numbers — nothing here branches on
// where the data came from.

import { canAccess, cohortLine, csv, fmt, sortedModules, statusOf } from '@ai/core';
import type { Baseline, Db, IconName, Learner, Tier } from '@ai/core';

// ---------------------------------------------------------------------------------------------
// View-model shape
// ---------------------------------------------------------------------------------------------

/** Which token paints a KPI's sub line. The reference sets the colour inline; the CSS keys off this. */
export type SubTone = 'tertiary' | 'success' | 'locked';

export interface OverviewKpi {
  key: string;
  label: string;
  value: string;
  sub: string;
  subTone: SubTone;
}

export interface OverviewChart {
  /** `{n} total`, beside the card title. */
  delta: string;
  /** The `d` of the 2px line, in the SVG's own 600×200 user space. */
  line: string;
  /** The same path closed along the baseline, for the tint fill. */
  area: string;
  /** Grid line `y` positions: 25 %, 50 % and 75 % of the plot height. */
  grid: number[];
  /** One day label per point, under the chart. */
  labels: string[];
}

export interface OverviewFeedRow {
  key: string;
  who: string;
  what: string;
  ago: string;
  tone: 'success' | 'warn' | 'info';
}

export interface OverviewFunnelRow {
  key: string;
  name: string;
  icon: IconName;
  /** Team-tier employees carry a `Team` tag beside the name. */
  team: boolean;
  d: string;
  n: string;
  pct: string;
  /** Deployed and in-progress segment widths. Per-instance values, so they stay inline. */
  wd: string;
  wp: string;
}

export interface OverviewAttBar {
  key: string;
  n: number;
  /** Attendance percentage once held, otherwise the scheduled date. */
  label: string;
  title: string;
  /** Bar height as a percentage string; 18 % for a session that has not happened. */
  h: string;
  held: boolean;
}

export interface OverviewRiskRow {
  id: string;
  name: string;
  sub: string;
  reason: string;
  /** The first row has no top border; the rest are separated by `--line-subtle`. */
  first: boolean;
  /** `Send nudge`, or `Nudged {relative}` once it has been sent. */
  btn: string;
  nudged: boolean;
}

/** A file the screen hands the browser, with the toast the reference shows alongside it. */
export interface OverviewReport {
  name: string;
  content: string;
  mime: string;
  toast: string;
}

export interface OverviewVM {
  subline: string;
  kpis: OverviewKpi[];
  chart: OverviewChart;
  feed: OverviewFeedRow[];
  funnel: OverviewFunnelRow[];
  att: OverviewAttBar[];
  replayViews: string;
  risk: OverviewRiskRow[];
  noRisk: boolean;
  /** What `Nudge All` passes to `nudgeLearners`. */
  nudgeAllIds: string[];
  report: OverviewReport;
  newEmployeeTo: string;
}

// ---------------------------------------------------------------------------------------------
// Constants, ported verbatim
// ---------------------------------------------------------------------------------------------

const DAY = 86400000;
/** The cohort the admin console reports on. Hard-coded in the reference, so hard-coded here. */
const COHORT_ID = 'dec26';
/** Day 1 of the deployment chart: Dec 1 2026, midnight Central. A literal, not a clock read. */
const DAY0 = Date.parse('2026-12-01T00:00:00-06:00');
/** The plot is 190 of the SVG's 200 user units tall, leaving 10 for the top label overhang. */
const PLOT = 190;
const REPORT_NAME = 'cohort-report-dec-2026.csv';

/** Deployments across every modelled learner that landed before `before`. */
const deployedBefore = (users: Learner[], before: number): number =>
  users.reduce(
    (a, u) => a + Object.values(u.progress ?? {}).filter((p) => p.deployedAt && p.deployedAt < before).length,
    0,
  );

// ---------------------------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------------------------

export function overviewVM(db: Db, now: number): OverviewVM {
  const B: Baseline = db.base;
  const users = db.users.filter((u) => u.status !== 'invited');
  const mods = sortedModules(db).filter((m) => m.status !== 'draft');

  const teamSeats = B.teamSeats + users.filter((u) => u.tier === 'team').length;
  const learners = B.learners + users.length;

  // ---- the funnel, which every other aggregate is derived from ---------------------------------
  // `b` is [deployed, in progress, not started] for the unmodelled learners. An employee with no
  // baseline row counts its whole eligible pool as not started.
  const funnelRaw = mods.map((m) => {
    const b: [number, number, number] = B.mod[m.id] ?? [0, 0, m.tier === 'team' ? B.teamSeats : B.learners];
    const pool = users.filter((u) => canAccess(u, m));
    const d = b[0] + pool.filter((u) => statusOf(u, m) === 'deployed').length;
    const p = b[1] + pool.filter((u) => statusOf(u, m) === 'progress').length;
    const n = b[0] + b[1] + b[2] + pool.length;
    return { m, d, p, n };
  });

  const deployed = funnelRaw.reduce((a, f) => a + f.d, 0);
  const possible = funnelRaw.reduce((a, f) => a + f.n, 0);

  const funnel: OverviewFunnelRow[] = funnelRaw.map((f) => ({
    key: f.m.id,
    name: f.m.short,
    icon: f.m.icon,
    team: f.m.tier === 'team',
    d: fmt.num(f.d),
    n: fmt.num(f.n),
    pct: fmt.pct(f.n ? f.d / f.n : 0),
    wd: `${f.n ? (f.d / f.n) * 100 : 0}%`,
    wp: `${f.n ? (f.p / f.n) * 100 : 0}%`,
  }));

  // ---- the five KPI cards ----------------------------------------------------------------------
  const sess = db.sessions.filter((s) => s.cohortId === COHORT_ID).sort((a, b) => a.start - b.start);
  const lastHeld = sess.filter((s) => s.attended).pop();
  const pipe = db.requests.filter((q) => q.status === 'new' || q.status === 'contacted');

  // `tiers.team.price - tiers.agent.price` in the reference, reached by id rather than by building
  // a lookup object, so the index is checked.
  const priceOf = (id: Tier): number => db.tiers.find((t) => t.id === id)?.price ?? 0;
  const upliftEach = priceOf('team') - priceOf('agent');

  const deployedToday = users.reduce(
    (a, u) => a + Object.values(u.progress ?? {}).filter((p) => p.deployedAt && now - p.deployedAt < DAY).length,
    0,
  );

  const kpis: OverviewKpi[] = [
    {
      key: 'learners',
      label: 'Active Learners',
      value: fmt.num(learners),
      sub: `${B.agent + users.filter((u) => u.tier === 'agent').length} Agent · ${teamSeats} Team seats`,
      subTone: 'tertiary',
    },
    {
      key: 'deployed',
      label: 'AI Employees Deployed',
      value: fmt.num(deployed),
      sub: `+${deployedToday} in the last 24 hours`,
      subTone: 'success',
    },
    {
      key: 'completion',
      label: 'Build Completion',
      value: fmt.pct(possible ? deployed / possible : 0),
      sub: 'Deployed ÷ builds available',
      subTone: 'tertiary',
    },
    {
      key: 'attendance',
      label: 'Live Attendance',
      value: lastHeld ? fmt.pct((lastHeld.attended ?? 0) / learners) : '—',
      sub: lastHeld ? `Session ${lastHeld.n} · ${lastHeld.attended} attended` : 'No sessions yet',
      subTone: 'tertiary',
    },
    {
      key: 'pipeline',
      label: 'Upgrade Pipeline',
      value: fmt.money(pipe.length * upliftEach),
      sub: `${pipe.length} open request${pipe.length === 1 ? '' : 's'} · Agent → Team`,
      subTone: pipe.length ? 'locked' : 'tertiary',
    },
  ];

  // ---- cumulative deployments, Dec 1 → today ---------------------------------------------------
  // Each point is the baseline for that day (clamped to the last baseline entry) plus every
  // modelled deployment up to the end of the day, never past `now`.
  const days = Math.max(7, Math.floor((now - DAY0) / DAY) + 1);
  const pts = Array.from({ length: days }, (_, i) => {
    const end = DAY0 + (i + 1) * DAY;
    const baseV = B.daily[Math.min(i, B.daily.length - 1)] ?? 0;
    return baseV + deployedBefore(users, Math.min(end, now + 1));
  });
  const max = Math.ceil(Math.max(...pts, 10) / 50) * 50;
  const X = (i: number): number => (i / (days - 1)) * 600;
  const Y = (v: number): number => 200 - (v / max) * PLOT;
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');

  const chart: OverviewChart = {
    delta: `${fmt.num(pts[pts.length - 1] ?? 0)} total`,
    line,
    area: `${line} L600 200 L0 200 Z`,
    grid: [0.25, 0.5, 0.75].map((f) => 200 - f * PLOT),
    // Noon of each day, so the label never slips a day in another zone.
    labels: Array.from({ length: days }, (_, i) => fmt.date(DAY0 + i * DAY + DAY / 2)),
  };

  // ---- the Live Activity feed -------------------------------------------------------------------
  const feed: OverviewFeedRow[] = db.activity.slice(0, 14).map((e) => ({
    key: e.id,
    who: e.who,
    what: e.what,
    ago: fmt.ago(e.t, now),
    tone: e.tone,
  }));

  // ---- Live Attendance -------------------------------------------------------------------------
  const att: OverviewAttBar[] = sess.map((s) => {
    const held = !!s.attended;
    return {
      key: s.id,
      n: s.n,
      label: held ? fmt.pct((s.attended ?? 0) / learners) : fmt.date(s.start),
      title: `Session ${s.n} · ${s.title}`,
      h: held ? `${Math.round(((s.attended ?? 0) / learners) * 100)}%` : '18%',
      held,
    };
  });
  const replayViews =
    sess
      .filter((s) => s.views)
      .map((s) => `S${s.n} ${fmt.num(s.views)}`)
      .join(' · ') || '—';

  // ---- Needs Attention -------------------------------------------------------------------------
  // Nothing started, or five days since the last sign of life.
  const risk: OverviewRiskRow[] = users
    .filter((u) => {
      const any = Object.values(u.progress ?? {}).some((p) => p.steps.length);
      return !any || now - (u.last || 0) > 5 * DAY;
    })
    .map((u, i) => {
      const any = Object.values(u.progress ?? {}).some((p) => p.steps.length);
      const team = u.teamId ? (db.teams.find((t) => t.id === u.teamId) ?? null) : null;
      return {
        id: u.id,
        name: u.name,
        sub: `${u.tier === 'team' ? 'Team' : 'Agent'} Tier${team ? ' · ' + team.name : ''} · last active ${
          u.last ? fmt.ago(u.last, now) : 'never'
        }`,
        reason: any ? 'Inactive 5+ days' : 'No build started',
        first: i === 0,
        btn: u.nudged ? 'Nudged ' + fmt.ago(u.nudged, now) : 'Send nudge',
        nudged: !!u.nudged,
      };
    });

  return {
    subline: `${cohortLine(db.cohorts[0]!, now, db.sessions)} · Updated Live from Learner Activity`,
    kpis,
    chart,
    feed,
    funnel,
    att,
    replayViews,
    risk,
    noRisk: !risk.length,
    nudgeAllIds: risk.map((r) => r.id),
    report: {
      name: REPORT_NAME,
      content: csv([
        ['AI Employee', 'Deployed', 'In progress', 'Eligible learners'],
        ...funnelRaw.map((f) => [f.m.name, f.d, f.p, f.n]),
      ]),
      mime: 'text/csv',
      toast: 'Cohort report exported',
    },
    newEmployeeTo: '/admin/curriculum/new',
  };
}
