// Portal Team Hub view-model — ported from `renderVals()` in
// design-reference/Portal Team Hub.dc.html. Contract: SCREENS § 3.4, phase 05 § 5.1.
//
// Pure: `(db, user, now, ui) => TeamHubVM | null`. No React, no hooks, no Date.now(). Every rule it
// needs comes from @ai/core — `visibleModules`, `buildOf`, `statusOf`, `runtimeOf`, `nextSession`,
// `sessionFor`, `avatarColor`, `fmt` and `csv` — so the screen below it is markup only.
//
// The reference's inline colours become semantic tones the stylesheet keys off, except
// `avatarColor(id)`, which is genuinely per-instance and is handed over as a value.

import {
  avatarColor,
  buildOf,
  csv,
  fmt,
  nextSession,
  runtimeOf,
  sessionFor,
  statusOf,
  visibleModules,
} from '@ai/core';
import type { BuildState, Db, IconName, Learner, LearnerRole, RuntimeState } from '@ai/core';

/** The three roles the invite modal offers, in the reference's order. */
export type InviteRole = 'Operations Lead' | 'Sales Agent' | 'Team Owner';

/** Everything the screen's own React state contributes. The VM reads it; it never writes it. */
export interface TeamHubUi {
  /** The invite modal is open. */
  invite: boolean;
  email: string;
  name: string;
  role: InviteRole;
  /** The inline error under the invite form — `result.error` from the `inviteMember` mutation. */
  err: string;
  /** The member whose drawer is open, or null. */
  sel: string | null;
}

/** `Deployment Status`: one of the five sentence forms, with the tone that colours its dot. */
export type StatusTone = 'locked' | 'attention' | 'success' | 'progress' | 'none';

export interface SeatSlot {
  key: string;
  /** `open` is the dashed `+`; `invited` is dashed amber; `member` is filled. */
  kind: 'member' | 'invited' | 'open';
  /** The member this slot opens, or null for an open seat (which opens the invite modal). */
  id: string | null;
  initials: string;
  title: string;
  /** `avatarColor(id)` for a filled seat; null for the two dashed kinds. */
  fill: string | null;
}

export interface DeploymentRow {
  id: string;
  label: string;
  /** `n/m` — deployed over active members. */
  value: string;
  /** The success bar's width, `0%`–`100%`. */
  width: string;
}

export interface BehindPerson {
  id: string;
  /** The member's name, with ` (you)` appended for the viewer — the reference's lower case. */
  name: string;
  /** The same name with no suffix. The avatar derives its initials from this, not from `name`. */
  plainName: string;
  initials: string;
  fill: string;
  /** `Reminded {relative}`, or `{A, B} not deployed`. */
  gap: string;
}

/** One of the six squares in `AI Employees Built`. */
export interface BuiltDot {
  id: string;
  state: BuildState;
  title: string;
}

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: LearnerRole;
  isMe: boolean;
  initials: string;
  invited: boolean;
  /** `avatarColor(id)`, or null for an invited member (whose avatar is a dashed outline). */
  fill: string | null;
  joined: string;
  last: string;
  dots: BuiltDot[];
  /** `n/6`. */
  count: string;
  status: string;
  tone: StatusTone;
}

export interface InviteRoleOption {
  label: InviteRole;
  sub: string;
  /** `{used} of {cap} used`. */
  cap: string;
  /** The cap is reached, so the count renders amber. */
  capFull: boolean;
  /** This is the selected radio card. */
  on: boolean;
}

export interface InviteVM {
  open: boolean;
  email: string;
  name: string;
  err: string;
  /** `{n} of 7 seats available`, or `All seats are assigned`. */
  seatsNote: string;
  roles: InviteRoleOption[];
  /** No seats left: `Send Invite` renders in its spent state. */
  full: boolean;
}

export interface DrawerModRow {
  id: string;
  name: string;
  icon: IconName;
  build: { state: BuildState; n: number; total: number };
  runtime: RuntimeState;
}

export interface DrawerMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  fill: string;
  role: LearnerRole;
  /** The team owner's role select is disabled. */
  isOwner: boolean;
  joined: string;
  last: string;
  /** `Remove Seat` is hidden for yourself. */
  canRemove: boolean;
  invited: boolean;
  mods: DrawerModRow[];
  nudgeLabel: string;
  nudgeIcon: IconName;
}

export interface TeamHubVM {
  teamName: string;
  /**
   * The reference's "December 2026 Cohort" line, shown only to a learner whose snapshot carries the
   * cohort's AI Employees. A plan that opens none (Amplified Insiders, the Team Plan, D-119) is not
   * in a cohort as far as its buyer can see, so the line says nothing about one.
   */
  inCohort: boolean;
  members: MemberRow[];
  seats: {
    used: number;
    total: number;
    slots: SeatSlot[];
    /** `Owner 1 · Operations Lead 1 · Agents {n} of 5`. */
    breakdown: string;
  };
  dep: { total: number; rows: DeploymentRow[] };
  rem: {
    /** `Session {n} · {date}`, or `the next session`. */
    session: string;
    headline: string;
    any: boolean;
    /** Up to four people. */
    people: BehindPerson[];
    btn: string;
    /** Someone is behind, so the card's border turns `--access-locked-line`. */
    locked: boolean;
    /** Everyone behind, not just the four shown — what `remindMembers` is given. */
    behindIds: string[];
  };
  inv: InviteVM;
  drawer: { open: boolean; member: DrawerMember | null };
  csvName: string;
  csvText: string;
}

/** The reference's sort: Team Owner, then Operations Lead, then Sales Agent, then by join date. */
const ROLE_ORDER: Record<string, number> = { 'Team Owner': 0, 'Operations Lead': 1, 'Sales Agent': 2 };

/** Seat caps per role. Identical to the `caps` map `inviteMember` enforces in @ai/core. */
const CAPS: Record<InviteRole, number> = { 'Operations Lead': 1, 'Sales Agent': 5, 'Team Owner': 1 };

const ROLE_DEFS: readonly [InviteRole, string][] = [
  ['Operations Lead', 'Runs the build schedule and the executive modules'],
  ['Sales Agent', 'Builds Marketing, Sales and Database AI Employees'],
  ['Team Owner', 'Full access, billing and seat management'],
];

/** The reference's hard-coded cohort for the "earlier builds" lookback. Ported as written. */
const COHORT = 'dec26';

export const TEAM_HUB_UI: TeamHubUi = {
  invite: false,
  email: '',
  name: '',
  role: 'Sales Agent',
  err: '',
  sel: null,
};

/**
 * The Team Hub, or null when the viewer has no team — the shell redirects `/team` to `/` for an
 * Agent-tier learner, so the screen renders nothing rather than guessing a team.
 */
export function teamHubVM(
  db: Db,
  user: Learner | null | undefined,
  now: number,
  ui: TeamHubUi = TEAM_HUB_UI,
): TeamHubVM | null {
  const team = user ? db.teams.find((t) => t.id === user.teamId) : undefined;
  if (!user || !team) return null;

  const mods = visibleModules(db);
  const mem = db.users
    .filter((u) => u.teamId === team.id)
    .sort(
      (a, b) => (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3) || a.joined - b.joined,
    );

  // ---- Deployment Status: the five sentence forms of SCREENS § 3.4 ----------------------------
  const summary = (u: Learner): [string, StatusTone] => {
    if (u.status === 'invited') return ['Invite Sent · Awaiting Acceptance', 'locked'];
    const att = mods.filter((m) => runtimeOf(u, m) === 'needs_attention').map((m) => m.short);
    if (att.length) return [`${att.join(', ')} Needs Attention`, 'attention'];
    const dep = mods.filter((m) => statusOf(u, m) === 'deployed').map((m) => m.short);
    const wip = mods.filter((m) => statusOf(u, m) === 'progress').map((m) => m.short);
    if (dep.length)
      return [
        `${dep.join(', ')} Deployed${wip.length ? ` · ${wip.join(', ')} In Progress` : ''}`,
        'success',
      ];
    if (wip.length) return [`In Progress: ${wip.join(', ')}`, 'progress'];
    return ['Not Started', 'none'];
  };

  const members: MemberRow[] = mem.map((u) => {
    const invited = u.status === 'invited';
    const [status, tone] = summary(u);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isMe: u.id === user.id,
      initials: fmt.initials(u.name),
      invited,
      fill: invited ? null : avatarColor(u.id),
      joined: invited ? '—' : fmt.date(u.joined),
      last: invited ? `Invited ${fmt.ago(u.joined, now)}` : u.last ? fmt.ago(u.last, now) : '—',
      dots: mods.map((m) => {
        const b = buildOf(u, m);
        const what =
          b.state === 'verified'
            ? 'Built'
            : b.state === 'in_progress'
              ? `${b.n} of ${b.total} steps`
              : 'Not started';
        return { id: m.id, state: b.state, title: `${m.short}: ${what}` };
      }),
      count: `${mods.filter((m) => buildOf(u, m).state === 'verified').length}/${mods.length}`,
      status,
      tone,
    };
  });

  // ---- Seat Allocation -----------------------------------------------------------------------
  const slots: SeatSlot[] = Array.from({ length: team.seats }, (_, i) => {
    const u = mem[i];
    if (!u)
      return {
        key: `open-${i}`,
        kind: 'open',
        id: null,
        initials: '+',
        title: 'Open seat · invite someone',
        fill: null,
      };
    const invited = u.status === 'invited';
    return {
      key: u.id,
      kind: invited ? 'invited' : 'member',
      id: u.id,
      initials: fmt.initials(u.name),
      title: `${u.name} · ${u.role}${invited ? ' (invited)' : ''}`,
      fill: invited ? null : avatarColor(u.id),
    };
  });

  const cnt = (r: string): number => mem.filter((u) => u.role === r).length;
  const seats = {
    used: mem.length,
    total: team.seats,
    slots,
    breakdown: `Owner ${cnt('Team Owner')} · Operations Lead ${cnt('Operations Lead')} · Agents ${cnt('Sales Agent')} of 5`,
  };

  // ---- Team Deployments ----------------------------------------------------------------------
  const active = mem.filter((u) => u.status !== 'invited');
  const dep = {
    total: active.reduce((a, u) => a + mods.filter((m) => statusOf(u, m) === 'deployed').length, 0),
    rows: mods.map((m): DeploymentRow => {
      const n = active.filter((u) => statusOf(u, m) === 'deployed').length;
      return {
        id: m.id,
        label: m.short,
        value: `${n}/${active.length}`,
        width: active.length ? `${Math.round((n / active.length) * 100)}%` : '0%',
      };
    }),
  };

  // ---- Before {Session N · date} -------------------------------------------------------------
  const next = nextSession(db, user, now);
  // Every Agent-tier AI Employee whose session has already started: the "earlier builds".
  const held = mods.filter((m) => {
    const s = m.session ? sessionFor(db, COHORT, m.session) : null;
    return !!s && s.start < now && m.tier === 'agent';
  });
  const behind: BehindPerson[] = active
    .filter((u) => held.some((m) => statusOf(u, m) !== 'deployed'))
    .map((u) => {
      const miss = held.filter((m) => statusOf(u, m) !== 'deployed').map((m) => m.short);
      return {
        id: u.id,
        name: u.name + (u.id === user.id ? ' (you)' : ''),
        plainName: u.name,
        initials: fmt.initials(u.name),
        fill: avatarColor(u.id),
        gap: u.reminded ? `Reminded ${fmt.ago(u.reminded, now)}` : `${miss.join(', ')} not deployed`,
      };
    });

  const rem = {
    session: next ? `Session ${next.n} · ${fmt.day(next.start)}` : 'the next session',
    any: behind.length > 0,
    people: behind.slice(0, 4),
    headline: behind.length
      ? `${behind.length} member${behind.length === 1 ? ' hasn’t' : 's haven’t'} finished earlier builds`
      : 'Everyone is caught up on earlier builds',
    btn: `Remind ${behind.length} Member${behind.length === 1 ? '' : 's'}`,
    locked: behind.length > 0,
    behindIds: behind.map((p) => p.id),
  };

  // ---- Invite modal --------------------------------------------------------------------------
  const left = team.seats - mem.length;
  const inv: InviteVM = {
    open: ui.invite,
    email: ui.email,
    name: ui.name,
    err: ui.err,
    seatsNote: left > 0 ? `${left} of ${team.seats} seats available` : 'All seats are assigned',
    roles: ROLE_DEFS.map(([label, sub]): InviteRoleOption => {
      const cap = CAPS[label];
      const used = cnt(label);
      return { label, sub, cap: `${used} of ${cap} used`, capFull: used >= cap, on: ui.role === label };
    }),
    full: left <= 0,
  };

  // ---- Member drawer -------------------------------------------------------------------------
  // Only the OPEN state is computed here. The screen caches the last member so the panel keeps its
  // contents through the 240ms slide-out, exactly as the reference's `this.lastSel` does.
  const du = mem.find((u) => u.id === ui.sel);
  const member: DrawerMember | null = du
    ? {
        id: du.id,
        name: du.name,
        email: du.email,
        initials: fmt.initials(du.name),
        fill: avatarColor(du.id),
        role: du.role,
        isOwner: du.role === 'Team Owner',
        joined: du.status === 'invited' ? 'Invite pending' : fmt.day(du.joined),
        last: du.last ? fmt.ago(du.last, now) : '—',
        canRemove: du.id !== user.id,
        invited: du.status === 'invited',
        mods: mods.map((m) => ({
          id: m.id,
          name: m.name,
          icon: m.icon,
          build: buildOf(du, m),
          runtime: runtimeOf(du, m),
        })),
        nudgeLabel: du.status === 'invited' ? 'Resend Invite' : 'Send Reminder',
        nudgeIcon: du.status === 'invited' ? 'send' : 'bell',
      }
    : null;

  return {
    teamName: team.name,
    inCohort: visibleModules(db).length > 0,
    members,
    seats,
    dep,
    rem,
    inv,
    drawer: { open: !!du, member },
    csvName: `${team.name.replace(/\W+/g, '-').toLowerCase()}-progress.csv`,
    csvText: csv([
      ['Name', 'Email', 'Role', 'Date Joined', 'AI Employees Built', 'Deployment Status', 'Last Active'],
      ...members.map((m, i) => [
        m.name,
        m.email,
        m.role,
        mem[i]?.status === 'invited' ? 'Invited' : fmt.date(mem[i]?.joined ?? 0),
        m.count,
        m.status,
        m.last,
      ]),
    ]),
  };
}
