// R-5 Phase 7 (D-268): People › Everyone, People › Teams and People › an access group's tab (Utah Life). PURE.
//
// The words are the mockup's (handoff/admin-mockup/ia-screens.jsx: `PeoplePg`, `TeamsPg`, `Groups`), with PLAN.md
// § 10.8's rules. Every time prints "Dec 10, 8:52 AM MT / 9:52 AM CT" (`adminStamp`). The rows are the API's
// (`GET /api/console/users`, `…/workspaces`, `…/groups/:id`); how a person got in is core's `gotInOf`, which the API's
// SQL answers. Nothing here names a plan, a group or a cohort.

import {
  CONSOLE_PLAN_LABELS,
  PLAN_PRIORITY,
  adminMonthDay,
  fmt,
  gotInChipLabel,
  isPlanKind,
  planSets,
  planStatusOf,
  adminStamp,
  userStatusOf,
} from '@ai/core';
import type { AccessGroupDetail, AdminStatus, ConsoleUserRow, GotInCount, GotInKind, PeopleAudiences, WorkspaceRow } from '@ai/core';
import type { PlanKind } from '@ai/core/offer';
import { personPath, teamPath } from '../../../shell/admin/addresses';

/** An audience's dot, by how they got in (the mockup's `AUD` colours, as the R2 tokens hold them). */
export type AudTone = 'for' | 'ok' | 'mint' | 'info' | 'warn' | 'off';
const PLAN_TONE: Record<PlanKind, AudTone> = { cohort: 'for', agents: 'ok', agent_plan: 'mint', membership: 'info', insiders_agent: 'info', library: 'warn' };
export function audTone(key: string, kind: GotInKind): AudTone {
  if (kind === 'plan') {
    const k = key.slice(5);
    return isPlanKind(k) ? (PLAN_TONE[k] ?? 'off') : 'off';
  }
  return kind === 'skill' ? 'warn' : 'off';
}

// ================================================================================================
// People › Everyone
// ================================================================================================

export const EVERYONE_COPY = {
  audience: 'Audience',
  everyone: 'Everyone',
  find: 'Find a person by name or email',
  export: 'Export',
  exported: 'Export started. It is in the audit log.',
  columns: { person: 'Person', gotIn: 'Got in through', team: 'Team', seat: 'Seat', last: 'Last active', status: 'Status' },
  onOwn: 'On their own',
  none: 'None',
  never: 'Never',
  empty: { title: 'No one matches', body: 'Try another audience or fewer letters.' },
  openPerson: 'Open person',
  openGroup: (name: string) => `Open ${name}`,
  inCohort: 'See them in the cohort',
  showing: (n: number, of: number) => `Showing ${n} of ${of}.`,
  account: 'This list is for the account: sign-in, plan and seat. To see how a cohort is doing, open',
  cohortTab: 'the cohort’s People tab',
} as const;

export interface AudChip {
  key: string;
  label: string;
  count: number;
  tone: AudTone | null;
}

/** The chips: Everyone, then one per answer some learner has (`audiences.chips`), each with its count. */
export function audChips(a: PeopleAudiences | null): AudChip[] {
  if (!a) return [];
  return [
    { key: '', label: EVERYONE_COPY.everyone, count: a.total, tone: null },
    ...a.chips.map((c: GotInCount) => ({ key: c.key, label: gotInChipLabel(c), count: c.count, tone: audTone(c.key, c.kind) })),
  ];
}

export interface EveryoneRow {
  key: string;
  name: string;
  email: string;
  gotIn: { label: string; tone: AudTone; kind: GotInKind; key: string } | null;
  team: string | null;
  seat: string;
  last: string;
  lastAt: number;
  status: AdminStatus;
  /** A person opens their record; an access group's member opens the group's tab. */
  href: string;
  groupName: string | null;
  inCohort: boolean;
}

/** A team name that names no team: a team of one made with none, or the API's "Individual". */
const noTeam = (w: string | null): boolean => !w || w === 'Individual';

export function everyoneRow(u: ConsoleUserRow): EveryoneRow {
  const g = u.gotIn ?? null;
  const group = g?.kind === 'group' ? g.key.slice(6) : null;
  return {
    key: u.id,
    name: u.name || (g?.kind === 'group' ? `${g.label} agent` : u.email),
    email: u.email,
    gotIn: g ? { label: g.label, tone: audTone(g.key, g.kind), kind: g.kind, key: g.key } : null,
    team: noTeam(u.workspace) ? null : u.workspace,
    seat: u.role || EVERYONE_COPY.none,
    last: u.lastActive === null ? EVERYONE_COPY.never : adminStamp(u.lastActive),
    lastAt: u.lastActive ?? 0,
    status: userStatusOf(u.status),
    href: group ? `/admin/people/groups/${encodeURIComponent(group)}` : personPath(u.id),
    groupName: group ? g!.label : null,
    inCohort: g?.key === 'plan:cohort',
  };
}

/** "Showing 16 of 16.", against the chip's count (the whole list's when Everyone is picked). */
export function everyoneShowing(rows: number, a: PeopleAudiences | null, key: string): string {
  const of = !a ? rows : key ? (a.chips.find((c) => c.key === key)?.count ?? rows) : a.total;
  return EVERYONE_COPY.showing(rows, Math.max(of, rows));
}

// ================================================================================================
// People › Teams
// ================================================================================================

export const TEAMS_COPY = {
  description: 'Every team account and what it holds.',
  find: 'Find a team or its owner',
  product: 'Product',
  allProducts: 'All products',
  columns: { team: 'Team', holds: 'Holds', seats: 'Seats used', paying: 'Paying', status: 'Status' },
  empty: 'No team matches',
  open: 'Open team',
  inCohort: 'See them in the cohort',
  leftOut: (n: number, group: string) => (n === 1 ? `1 ${group} agent is not listed here.` : `${n} ${group} agents are not listed here.`),
  everyone: 'Everyone',
} as const;

/** Product: every plan's label, in `PLAN_PRIORITY` order (a team that holds a live plan of the kind). */
export const PRODUCT_OPTIONS: readonly { value: '' | PlanKind; label: string }[] = [
  { value: '', label: TEAMS_COPY.allProducts },
  ...PLAN_PRIORITY.map((k) => ({ value: k, label: CONSOLE_PLAN_LABELS[k] })),
];

export interface TeamRow {
  key: string;
  name: string;
  owner: string;
  holds: { label: string; tone: 'ok' | 'info' }[];
  seats: string;
  used: number;
  paying: string;
  status: AdminStatus;
  href: string;
  inCohort: boolean;
}

export function teamRow(w: WorkspaceRow): TeamRow {
  const accelerator = CONSOLE_PLAN_LABELS.cohort;
  return {
    key: w.teamId,
    name: w.name,
    owner: w.ownerName ?? EVERYONE_COPY.none,
    holds: (w.holds ?? []).map((label) => ({ label, tone: label === accelerator ? 'ok' : 'info' })),
    seats: `${w.seatsUsed} of ${w.seatCap}`,
    used: w.seatsUsed,
    paying: w.paying ?? EVERYONE_COPY.none,
    status: w.planStatus ? planStatusOf(w.planStatus) : { label: EVERYONE_COPY.none, tone: 'neutral' },
    href: teamPath(w.teamId),
    inCohort: (w.holds ?? []).includes(accelerator),
  };
}

// ================================================================================================
// People › an access group's tab (Utah Life)
// ================================================================================================

export const GROUP_COPY = {
  meta: 'Access group',
  export: 'Export',
  exported: 'Export started. It is in the audit log.',
  more: 'More for this group',
  addAddress: 'Add an address outside the domain…',
  endAccess: 'End access…',
  facts: { signedIn: 'Agents signed in', active: 'Active, last 30 days', gets: 'Gets', qualifies: 'Who qualifies', since: 'Since', ends: 'Ends' },
  getsValue: (plan: string) => `${plan} skills, free`,
  qualifiesDomain: (domain: string) => `A verified @${domain} address`,
  qualifiesList: 'An address on its list',
  noEnd: 'No end date',
  find: 'Find an agent by email',
  table: 'Agents',
  columns: { agent: 'Agent', first: 'First sign-in', last: 'Last active', opened: 'Skills opened' },
  pending: 'Invite pending',
  never: 'Never',
  empty: 'No agents yet',
  showing: (n: number, of: number) => `Showing ${n} of ${of}.`,
  canOpen: 'What They Can Open',
  planSkills: (plan: string) => `The ${plan}’s skills`,
  planSkillsSub: (set: string) => `Every ${set ? `${set} ` : ''}skill, and each new one as it is released`,
  notOpen: (teamSkills: boolean) => (teamSkills ? 'Not the Accelerator, not team skills' : 'Not the Accelerator'),
  lockedSays: (line: string) => `A locked skill says “${line}”`,
  changeLine: 'Change that line in Words',
  mostOpened: 'Most Opened',
  last30: 'Last 30 days',
  nothingOpened: 'Nothing opened in the last 30 days.',
  counted: 'Where They Are Counted',
  countedRows: [
    ['A cohort', 'Never. They are not in one.'],
    ['Teams', 'Never. Each is one person.'],
    ['Revenue', 'Never. The access is free.'],
  ] as const,
  add: {
    title: (group: string) => `Add an address to ${group}`,
    body: 'The address is in the group once its owner signs in with it. Nothing is emailed.',
    field: 'Email address',
    cta: 'Add address',
    done: 'Address added',
  },
  end: {
    title: (group: string) => `End ${group} access?`,
    body: (n: number, plan: string) =>
      `${n} ${n === 1 ? 'agent loses' : 'agents lose'} the ${plan}’s skills right away. Their accounts stay, with nothing to open.`,
    cta: 'End access',
    done: 'Access ended',
    reason: 'Reason',
  },
} as const;

/** The copy string a locked skill shows a group's member (Words, `locked.utah_life`), when the snapshot holds it. */
export const LOCKED_GROUP_KEY = 'locked.utah_life';

export interface GroupAgentRow {
  id: string;
  name: string;
  email: string;
  first: string;
  last: string;
  lastAt: number;
  opened: number;
}

export interface GroupVM {
  name: string;
  planLabel: string;
  facts: { signedIn: number; active: number; gets: string; qualifies: string; since: string; ends: string };
  rows: GroupAgentRow[];
  total: number;
  open: { title: string; sub: string; not: string };
  most: { title: string; count: number }[];
  ended: boolean;
}

const DAY = 86_400_000;
/** A plan's one set, as the card names it ("Every agent skill"). */
const SET_WORD: Record<'owner_ops' | 'agent', string> = { owner_ops: 'owner and operations', agent: 'agent' };

/** The group's tab, its agents filtered by `q` (a name or an address). */
export function groupVM(d: AccessGroupDetail, now: number, q = ''): GroupVM {
  const plan = isPlanKind(d.plan) ? d.plan : null;
  const planLabel = plan ? CONSOLE_PLAN_LABELS[plan] : d.plan;
  const sets = plan ? planSets(plan) : [];
  const ql = q.trim().toLowerCase();
  const signed = d.agents.filter((a) => a.last !== null && !a.invited);
  return {
    name: d.name,
    planLabel,
    facts: {
      signedIn: signed.length,
      active: signed.filter((a) => now - a.last! <= 30 * DAY).length,
      gets: GROUP_COPY.getsValue(planLabel),
      qualifies: d.emailDomain ? GROUP_COPY.qualifiesDomain(d.emailDomain) : GROUP_COPY.qualifiesList,
      since: fmt.mtDate(d.createdAt),
      ends: d.expiresAt === null ? GROUP_COPY.noEnd : fmt.mtDate(d.expiresAt),
    },
    rows: d.agents
      .filter((a) => !ql || `${a.name} ${a.email}`.toLowerCase().includes(ql))
      .map((a) => ({
        id: a.userId,
        name: a.name || `${d.name} agent`,
        email: a.email,
        first: a.firstSignIn === null ? GROUP_COPY.never : adminMonthDay(a.firstSignIn),
        last: a.invited ? GROUP_COPY.pending : a.last !== null ? adminStamp(a.last) : GROUP_COPY.never,
        lastAt: a.last ?? 0,
        opened: a.skillsOpened,
      })),
    total: d.agents.length,
    open: {
      title: GROUP_COPY.planSkills(planLabel),
      sub: GROUP_COPY.planSkillsSub(sets.length === 1 ? SET_WORD[sets[0]!] : ''),
      not: GROUP_COPY.notOpen(!sets.includes('owner_ops')),
    },
    most: d.mostOpened.map((m) => ({ title: m.title, count: m.count })),
    ended: d.expiresAt !== null && d.expiresAt <= now,
  };
}
