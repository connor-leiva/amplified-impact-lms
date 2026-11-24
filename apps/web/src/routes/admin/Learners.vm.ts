// Admin Learners & Teams view-model — ported from `renderVals()` in
// design-reference/Admin Learners.dc.html. Contract: SCREENS § 4.5, phase 06 § 6.1.
//
// Pure: `(db, now, ui) => LearnersVM`. No React, no hooks, no Date.now(). Every rule it needs comes
// from @ai/core — `visibleModules`, `canAccess`, `statusOf`, `buildOf`, `runtimeOf`, `avatarColor`,
// `STATUS`, `fmt` and `csv` — so the screen above it is markup only.
//
// phase 06 § 6.2: every figure on this screen adds `db.base`, the aggregate for the ~134 learners
// the demo does not model one by one — `base.learners`, `base.agent`, `base.teamSeats`,
// `base.teams`. In http mode the API returns ZERO_BASE, so the identical arithmetic prints live
// numbers. Nothing here branches on the data source.
//
// The reference's inline colours become semantic tones the stylesheet keys off. Only the seeded
// avatar fill and the seat bar's width are genuinely per-instance, and they travel as values.

import { adminDate, adminStamp, buildOf, canAccess, courseTeams, courseUsers, csv, fmt, isOpen, runtimeOf, statusOf, STATUS, visibleModules } from '@ai/core';
import type { BuildState, Db, Learner, RuntimeState, Tier } from '@ai/core';

export type LearnersTab = 'learners' | 'teams';
/** `''` is `All Tiers`. */
export type TierFilter = '' | Tier;

/** Everything the screen's own React state contributes. The VM reads it; it never writes it. */
export interface LearnersUi {
  tab: LearnersTab;
  tier: TierFilter;
  q: string;
  /** The learner whose drawer is open, or null. */
  sel: string | null;
}

export const LEARNERS_UI: LearnersUi = { tab: 'learners', tier: '', q: '', sel: null };

export interface StatCard {
  label: string;
  value: string;
  /** `Pending Invites` is non-zero, so the number renders in `--access-locked-text`. */
  amber: boolean;
}

export interface SegOption<T> {
  key: T;
  label: string;
  on: boolean;
}

/** One of the six squares in the `AI Employees` column. `locked` means "not in this learner's tier". */
export type DotTone = 'locked' | 'deployed' | 'progress' | 'none';

export interface LearnerDot {
  id: string;
  /** `{short}: {status label}`, or `{short}: Not in Tier`. */
  title: string;
  tone: DotTone;
}

export interface LearnerRow {
  id: string;
  name: string;
  email: string;
  /** The invite has not been accepted: dashed avatar, `Invited {relative}` instead of a last-active. */
  invited: boolean;
  /** `Agent` or `Team`. */
  tier: string;
  tierTone: Tier;
  /** The team's name, or `Individual`. */
  team: string;
  /** The learner's role, with ` · Demo: …` appended for the two demo personas. */
  role: string;
  dots: LearnerDot[];
  /** `n/m` — deployed over the AI Employees this learner's tier includes. */
  count: string;
  last: string;
  status: string;
  statusTone: 'locked' | 'success';
  /** A demo persona row, highlighted with `--action-primary-tint`. */
  persona: boolean;
}

export interface TeamRow {
  id: string;
  name: string;
  owner: string;
  /** `{n} of {seats}`. */
  seats: string;
  /** The seat bar's width, `0%`–`100%`. */
  fill: string;
  /** `{n} deployed`. */
  deployed: string;
  /** `{n} pending`, or `None`. */
  invites: string;
  /** Someone on this team has not accepted yet, so the count renders amber. */
  pending: boolean;
}

export interface DrawerModRow {
  id: string;
  name: string;
  /** This AI Employee is in the learner's tier: build plus runtime tokens. Otherwise an access token. */
  access: boolean;
  build: { state: BuildState; n: number; total: number };
  runtime: RuntimeState;
}

export interface DrawerFact {
  k: string;
  v: string;
}

export interface DrawerPerson {
  id: string;
  name: string;
  email: string;
  facts: DrawerFact[];
  mods: DrawerModRow[];
  /** `Upgrade to Team Tier` or `Move to Agent Tier`. */
  tierLabel: string;
  /** The upgrade is the amber primary; the downgrade is a secondary. */
  tierUpgrade: boolean;
  /** What `setLearnerTier` is given. */
  tierTarget: Tier;
  /** `Send Nudge` or `Resend Invite`. */
  nudgeLabel: string;
  invited: boolean;
}

export interface LearnersVM {
  stats: StatCard[];
  tabs: SegOption<LearnersTab>[];
  tierFilters: SegOption<TierFilter>[];
  q: string;
  isLearners: boolean;
  isTeams: boolean;
  rows: LearnerRow[];
  teams: TeamRow[];
  /** `Showing {n} of {total} learners. Highlighted rows are the demo personas.` */
  footNote: string;
  /** `Showing {n} of {total} teams.` */
  teamsNote: string;
  drawer: { open: boolean; person: DrawerPerson | null };
  csvName: string;
  csvText: string;
}

/** The two seeded personas the demo highlights, and the badge each one's role line carries. */
const PERSONAS: Record<string, string> = {
  u_jamie: 'Demo: Agent Tier',
  u_alex: 'Demo: Team Owner',
};

/** The reference's At Risk window: no last-active inside five days. */
const RISK_MS = 5 * 86400000;

export function learnersVM(db: Db, now: number, ui: LearnersUi = LEARNERS_UI): LearnersVM {
  const base = db.base;
  const mods = visibleModules(db);
  const teamOf = (u: Learner) => (u.teamId ? db.teams.find((t) => t.id === u.teamId) : undefined);

  // D-243: the cohort's learners only. Everyone, without `db.outside` (the fixture).
  const people = courseUsers(db);
  const active = people.filter((u) => u.status !== 'invited');
  const invited = people.filter((u) => u.status === 'invited');

  // ---- The four stat cards. Each one adds its `base` aggregate (phase 06 § 6.2). --------------
  const stats: StatCard[] = [
    { label: 'Total Learners', value: fmt.num(base.learners + active.length), amber: false },
    {
      label: 'Agent Tier',
      value: fmt.num(base.agent + active.filter((u) => u.tier === 'agent').length),
      amber: false,
    },
    {
      label: 'Team Tier Seats',
      value: fmt.num(base.teamSeats + active.filter((u) => u.tier === 'team').length),
      amber: false,
    },
    // The reference prints this one with String(), not fmt.num(): invites are never in the thousands.
    { label: 'Pending Invites', value: String(invited.length), amber: invited.length > 0 },
  ];

  // ---- Filter, then sort newest-active first ---------------------------------------------------
  const ql = ui.q.trim().toLowerCase();
  const list = people
    .filter((u) => {
      if (ui.tier && u.tier !== ui.tier) return false;
      if (!ql) return true;
      const team = teamOf(u);
      return (u.name + u.email + (team ? team.name : '')).toLowerCase().includes(ql);
    })
    .sort((a, b) => (b.last || b.joined) - (a.last || a.joined));

  const rows: LearnerRow[] = list.map((u) => {
    const inv = u.status === 'invited';
    const team = teamOf(u);
    const acc = mods.filter((m) => canAccess(u, m));
    const any = Object.values(u.progress || {}).some((p) => p.steps.length);
    const risk = !inv && (!any || now - (u.last || 0) > RISK_MS);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      invited: inv,
      tier: u.tier === 'team' ? 'Team' : 'Agent',
      tierTone: u.tier,
      team: team ? team.name : 'Individual',
      role: PERSONAS[u.id] ? `${u.role} · ${PERSONAS[u.id]}` : u.role,
      dots: mods.map((m): LearnerDot => {
        const ok = canAccess(u, m);
        const st = statusOf(u, m);
        return {
          id: m.id,
          title: `${m.short}: ${ok ? STATUS[st].label : 'Not in Tier'}`,
          tone: !ok ? 'locked' : st,
        };
      }),
      count: `${acc.filter((m) => statusOf(u, m) === 'deployed').length}/${acc.length}`,
      last: inv ? `Invited ${fmt.ago(u.joined, now)}` : u.last ? fmt.ago(u.last, now) : '—',
      status: inv ? 'Invited' : risk ? 'At Risk' : 'Active',
      statusTone: inv || risk ? 'locked' : 'success',
      persona: !!PERSONAS[u.id],
    };
  });

  // ---- Teams tab -------------------------------------------------------------------------------
  const cohortTeams = courseTeams(db);
  const teams: TeamRow[] = cohortTeams.map((t) => {
    const mem = db.users.filter((u) => u.teamId === t.id);
    const mact = mem.filter((u) => u.status !== 'invited');
    const owner = db.users.find((u) => u.id === t.ownerId);
    // Every visible AI Employee, not only the ones in the member's tier: a team member has all six.
    const dep = mact.reduce((a, u) => a + mods.filter((m) => statusOf(u, m) === 'deployed').length, 0);
    const pending = mem.length - mact.length;
    return {
      id: t.id,
      name: t.name,
      owner: owner ? owner.name : '—',
      seats: `${mem.length} of ${t.seats}`,
      fill: `${Math.round((mem.length / t.seats) * 100)}%`,
      deployed: `${dep} deployed`,
      invites: pending ? `${pending} pending` : 'None',
      pending: pending > 0,
    };
  });

  // ---- Learner drawer --------------------------------------------------------------------------
  // Only the OPEN state is computed here. The screen caches the last person so the panel keeps its
  // contents through the 240ms slide-out, exactly as the reference's `this.last` does.
  const du = db.users.find((u) => u.id === ui.sel);
  const duTeam = du ? teamOf(du) : undefined;
  const person: DrawerPerson | null = du
    ? {
        id: du.id,
        name: du.name,
        email: du.email,
        facts: [
          { k: 'Tier', v: du.tier === 'team' ? 'Team' : 'Agent' },
          { k: 'Team', v: duTeam ? duTeam.name : 'Individual' },
          { k: 'Joined', v: du.status === 'invited' ? 'Invite pending' : fmt.day(du.joined) },
          // Sentence case on `active` is the reference's, against SCREENS § 4.5. The reference wins.
          { k: 'Last active', v: du.last ? fmt.ago(du.last, now) : '—' },
        ],
        mods: mods.map((m) => ({
          id: m.id,
          name: m.name,
          access: canAccess(du, m),
          build: buildOf(du, m),
          runtime: runtimeOf(du, m),
        })),
        tierLabel: du.tier === 'team' ? 'Move to Agent Tier' : 'Upgrade to Team Tier',
        tierUpgrade: du.tier !== 'team',
        tierTarget: du.tier === 'team' ? 'agent' : 'team',
        nudgeLabel: du.status === 'invited' ? 'Resend Invite' : 'Send Nudge',
        invited: du.status === 'invited',
      }
    : null;

  return {
    stats,
    tabs: (
      [
        ['learners', 'Learners'],
        ['teams', 'Teams'],
      ] as [LearnersTab, string][]
    ).map(([key, label]) => ({ key, label, on: ui.tab === key })),
    tierFilters: (
      [
        ['', 'All Tiers'],
        ['agent', 'Agent'],
        ['team', 'Team'],
      ] as [TierFilter, string][]
    ).map(([key, label]) => ({ key, label, on: ui.tier === key })),
    q: ui.q,
    isLearners: ui.tab === 'learners',
    isTeams: ui.tab === 'teams',
    rows,
    teams,
    footNote: `Showing ${rows.length} of ${fmt.num(base.learners + people.length)} learners. Highlighted rows are the demo personas.`,
    teamsNote: `Showing ${teams.length} of ${base.teams + cohortTeams.length} teams.`,
    drawer: { open: !!du, person },
    csvName: 'learners-dec-2026.csv',
    // `u.role` is the raw role, without the ` · Demo: …` badge the table appends. The reference's
    // export reads the row for everything else, so the CSV and the table can never disagree.
    csvText: csv([
      ['Name', 'Email', 'Tier', 'Team', 'Role', 'Deployed', 'Status'],
      ...list.map((u, i) => [
        u.name,
        u.email,
        rows[i]?.tier ?? '',
        rows[i]?.team ?? '',
        u.role,
        rows[i]?.count ?? '',
        rows[i]?.status ?? '',
      ]),
    ]),
  };
}

// ================================================================================================
// R2 (D-160 R2-3): Learners & Teams on the signed-off Admin redesign (AdminRedesign.jsx `Learners`).
// The same snapshot and the same `db.base` rule as above; the words are the mockup's, its times MST
// (`adminStamp`, BUILD-SPEC § 7). Rows keep the snapshot's order (the table's headers sort them).
// ================================================================================================

export type R2TierFilter = 'All tiers' | 'Agent' | 'Team';
export const R2_TIER_FILTERS: readonly R2TierFilter[] = ['All tiers', 'Agent', 'Team'];

export interface LearnerR2Row {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** The team's name, or `Individual`. */
  team: string;
  tier: 'Agent' | 'Team';
  /** Builds deployed, of the builds open to the learner's tier now. */
  deployed: number;
  of: number;
  /** `Dec 10, 8:52 AM`, `Invite pending`, or `—`. */
  last: string;
  /** For sorting Last active. */
  lastAt: number;
}

export interface TeamR2Row {
  id: string;
  name: string;
  owner: string;
  /** `16 seats`. */
  plan: string;
  used: number;
  seats: number;
  /** `None` or `2 pending`. */
  invites: string;
}

/** D-243: one of an access group's people, on its tab: outside the course, so no builds and no team. */
export interface GroupR2Row {
  id: string;
  /** Their name, or their address when they have given none (a self-serve sign-up). */
  name: string;
  /** Their address under the name, or nothing when the address is the name. */
  email: string;
  initials: string;
  /** `Dec 10, 8:52 AM`, `Invite pending` (a sign-up who hasn't followed their link), or `—`. */
  last: string;
  /** For sorting Last active. */
  lastAt: number;
}

/** D-243: an access group's tab (Utah Life): the learners outside the course who are in it, by name. */
export interface GroupR2Tab {
  /** `group:{the group's id}`: never `learners` or `teams`. */
  key: `group:${string}`;
  name: string;
  rows: GroupR2Row[];
}

export interface LearnersR2VM {
  learnersCount: number;
  teamsCount: number;
  /** The cohort has opened: before then every learner's builds read "Not started". */
  started: boolean;
  rows: LearnerR2Row[];
  teams: TeamR2Row[];
  /** D-243: a tab per access group with people outside the course in it. None without `db.outside` (the fixture). */
  groups: GroupR2Tab[];
}

export function learnersR2VM(db: Db, now: number, ui: { tier: R2TierFilter; q: string }): LearnersR2VM {
  const base = db.base;
  const cohort = db.cohorts.find((c) => c.id === 'dec26') ?? db.cohorts[0] ?? null;
  const open = visibleModules(db).filter((m) => isOpen(m, now));
  const teamOf = (u: Learner) => (u.teamId ? db.teams.find((t) => t.id === u.teamId) : undefined);
  const ql = ui.q.trim().toLowerCase();
  // D-243: the cohort's learners and teams only. The people outside the course are on their group's tab.
  const people = courseUsers(db);
  const cohortTeams = courseTeams(db);

  const rows = people
    .filter((u) => (ui.tier === 'All tiers' || (u.tier === 'team' ? 'Team' : 'Agent') === ui.tier))
    .filter((u) => !ql || (u.name + u.email + (teamOf(u)?.name ?? '')).toLowerCase().includes(ql))
    .map((u): LearnerR2Row => {
      const acc = open.filter((m) => canAccess(u, m));
      const invited = u.status === 'invited';
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        initials: fmt.initials(u.name),
        team: teamOf(u)?.name ?? 'Individual',
        tier: u.tier === 'team' ? 'Team' : 'Agent',
        deployed: acc.filter((m) => statusOf(u, m) === 'deployed').length,
        of: acc.length,
        last: invited ? 'Invite pending' : u.last ? adminStamp(u.last) : '—',
        lastAt: u.last ?? 0,
      };
    });

  const teams = cohortTeams.map((t): TeamR2Row => {
    const members = db.users.filter((u) => u.teamId === t.id);
    const pending = members.filter((u) => u.status === 'invited').length;
    return {
      id: t.id,
      name: t.name,
      owner: db.users.find((u) => u.id === t.ownerId)?.name ?? '—',
      plan: `${t.seats} seats`,
      used: members.length,
      seats: t.seats,
      invites: pending ? `${pending} pending` : 'None',
    };
  });

  const byId = new Map(db.users.map((u) => [u.id, u]));
  const outside = new Set(db.outside?.ids ?? []);
  const groups = (db.outside?.groups ?? []).flatMap((g): GroupR2Tab[] => {
    const groupRows = g.ids
      .filter((id) => outside.has(id))
      .flatMap((id) => {
        const u = byId.get(id);
        return u ? [u] : [];
      })
      .map((u): GroupR2Row => ({
        id: u.id,
        name: u.name || u.email,
        email: u.name ? u.email : '',
        initials: fmt.initials(u.name || u.email),
        last: u.status === 'invited' ? 'Invite pending' : u.last ? adminStamp(u.last) : '—',
        lastAt: u.last ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return groupRows.length ? [{ key: `group:${g.id}`, name: g.name, rows: groupRows }] : [];
  });

  return {
    learnersCount: base.learners + people.filter((u) => u.test !== true).length,
    teamsCount: base.teams + cohortTeams.length,
    started: !!cohort && now >= cohort.start,
    rows,
    teams,
    groups,
  };
}

/** A learner's details, as the R2 drawer shows them (the old drawer's, its times MST). */
export interface LearnerR2Details {
  facts: { label: string; value: string }[];
  mods: { id: string; name: string; build: string; buildTone: 'ok' | 'info' | 'off'; runtime: string | null; access: boolean }[];
}

export function learnerR2Details(db: Db, p: DrawerPerson): LearnerR2Details {
  const u = db.users.find((x) => x.id === p.id);
  const team = u?.teamId ? db.teams.find((t) => t.id === u.teamId) : undefined;
  const RUNTIME: Record<RuntimeState, string | null> = {
    deployed: 'Deployed',
    paused: 'Paused',
    needs_attention: 'Needs Attention',
    not_deployed: null,
  };
  return {
    facts: [
      { label: 'Tier', value: u?.tier === 'team' ? 'Team' : 'Agent' },
      { label: 'Team', value: team?.name ?? 'Individual' },
      { label: 'Joined', value: !u || u.status === 'invited' ? 'Invite pending' : adminDate(u.joined) },
      { label: 'Last active', value: u?.last ? adminStamp(u.last) : '—' },
    ],
    mods: p.mods.map((m) => ({
      id: m.id,
      name: m.name,
      access: m.access,
      build: !m.access
        ? 'Team Tier'
        : m.build.state === 'verified'
          ? 'Built'
          : m.build.state === 'in_progress'
            ? `${m.build.n} of ${m.build.total} Steps`
            : 'Not Started',
      buildTone: !m.access ? 'off' : m.build.state === 'verified' ? 'ok' : m.build.state === 'in_progress' ? 'info' : 'off',
      runtime: m.access ? RUNTIME[m.runtime] : null,
    })),
  };
}
