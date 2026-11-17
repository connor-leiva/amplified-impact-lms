// The Admin Console's fixture records (D-158; on the R2 mockup's data since D-160 R2-1c): workspaces,
// users, orders and staff notes for the fixture build, so the Support screens render for e2e and for
// `parity:admin-r2` with no API. FIXTURE ONLY: only `console-fixture.ts` imports this, and `console.ts`
// loads that behind `VITE_DATA_SOURCE`, so the http build has none of it (`console-build.test.ts`).
//
// The records are AdminRedesign.jsx's own (`parity-r2.ts`: `SUPPORT_WS` and `SUPPORT_USERS`, the mockup's
// `WS` and `USERS`, and `STAFF`, `INV` and the notes),
// fictional people at `.example` addresses, turned into the API's shapes (`@ai/core`
// console-support.ts) so the screens' view-models print the mockup's words from what the API answers.
// Two liberties, both the mockup's: the lists keep its order (the API sorts by name), and a learner's
// `status` carries their workspace plan's status ("Past due"), which is what the mockup's Users list
// shows (production's is the account's: active or invited).

import {
  CONSOLE_PLAN_LABELS,
  ORDER_STATUS_LABELS,
  SEARCH_GROUP_MAX,
  SKILL_SET_LABELS,
  consoleCan,
  mergeActivity,
  nearCap,
  userPath,
  workspacePath,
} from '@ai/core';
import type {
  ConsoleEntitlements,
  ConsoleOrder,
  ConsolePlan,
  ConsoleUserDetail,
  ConsoleUserRow,
  MasqueradeHistoryRow,
  SearchResults,
  StaffNote,
  StaffNoteTarget,
  UserFilters,
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceRow,
} from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';
import { SKILL_CATALOG } from '@ai/core/skills';
import {
  INV,
  IDENTITY,
  JOINED,
  MASQ_SESSIONS,
  STAFF,
  SUPPORT_USERS,
  SUPPORT_WS,
  USER_NOTES,
  WORKSPACE_NOTES,
  mockCents,
  mockStamp,
} from './parity-r2';

type Ws = (typeof SUPPORT_WS)[number];

const PLAN_OF: Record<string, PlanKind> = {
  'Team Plan': 'agents',
  'Agent Plan': 'agent_plan',
  'AI Accelerator': 'cohort',
  Insiders: 'membership',
};
const planKindOf = (plan: string): PlanKind => PLAN_OF[plan.split(' · ')[0]!] ?? 'library';
const STATUS_OF: Record<string, PlanStatus> = {
  Active: 'active',
  Trialing: 'trialing',
  'Past due': 'past_due',
  Canceled: 'canceled',
};
const ORDER_OF: Record<string, string> = { Paid: 'paid', Failed: 'failed', Open: 'pending', Refunded: 'refunded' };

/** The mockup's staff, as users (ids of the fixture's own making). */
const STAFF_IDS = ['u_0001', 'u_0002', 'u_0003'] as const;

export interface FixtureUser extends ConsoleUserRow {
  joined: number | null;
  tier: string | null;
}

export interface FixtureRecords {
  ws: readonly Ws[];
  users: FixtureUser[];
  plans: ConsolePlan[];
  orders: ConsoleOrder[];
  notes: StaffNote[];
}

const authorId = (name: string) => STAFF_IDS[STAFF.findIndex((s) => s.n === name)] ?? 'u_0001';

/** The fixture's records. Fresh each time, so a test's writes stay its own. */
export function fixtureRecords(): FixtureRecords {
  const joined = mockStamp(JOINED);
  const learners: FixtureUser[] = SUPPORT_USERS.map((u) => ({
    id: u.id,
    name: u.n,
    email: u.e,
    kind: 'learner',
    role: u.role,
    teamId: SUPPORT_WS.find((w) => w.n === u.ws)?.id ?? null,
    workspace: u.ws,
    status: STATUS_OF[u.st] ?? 'active',
    lastActive: mockStamp(u.last),
    joined,
    tier: u.tier.toLowerCase(),
  }));
  const staff: FixtureUser[] = STAFF.map((s, i) => ({
    id: STAFF_IDS[i]!,
    name: s.n,
    email: s.e,
    kind: 'staff',
    role: s.role,
    teamId: null,
    workspace: null,
    status: 'active',
    lastActive: mockStamp(s.last),
    joined: null,
    tier: null,
  }));
  const plans: ConsolePlan[] = SUPPORT_WS.map((w) => {
    const kind = planKindOf(w.plan);
    return {
      id: `plan_${w.id}`,
      accountId: `acct_${w.id}`,
      kind,
      label: CONSOLE_PLAN_LABELS[kind],
      option: kind === 'agents' ? (w.cap > 16 ? '16to40' : 'upto15') : kind === 'cohort' ? 'full' : 'monthly',
      seats: w.cap,
      status: STATUS_OF[w.st] ?? 'active',
      cohortId: kind === 'cohort' ? 'dec26' : null,
      startsAt: joined,
      paidThrough: kind === 'cohort' ? null : mockStamp('Jan 8, 2027'),
      liveUntil: null,
      minimumUntil: null,
      stripeSubscriptionId: w.sub === '—' ? null : w.sub,
      orderId: `ord_${w.id}`,
      createdAt: joined,
    };
  });
  const orders: ConsoleOrder[] = INV.map((v) => {
    const w = SUPPORT_WS.find((x) => x.n === v.c)!;
    const kind = planKindOf(w.plan);
    const at = mockStamp(v.d);
    const status = ORDER_OF[v.st] ?? 'pending';
    return {
      id: v.id,
      plan: kind,
      planLabel: CONSOLE_PLAN_LABELS[kind],
      option: 'monthly',
      origin: 'payment_link',
      status,
      email: learners.find((u) => u.name === w.owner)?.email ?? null,
      accountId: `acct_${w.id}`,
      amountTotal: mockCents(v.amt),
      currency: 'usd',
      paymentsMade: status === 'paid' ? 1 : 0,
      stripeCustomerId: w.cus,
      stripeSubscriptionId: w.sub === '—' ? null : w.sub,
      stripePaymentIntentId: null,
      createdAt: at,
      paidAt: status === 'paid' || status === 'refunded' ? at : null,
      paymentFailedAt: status === 'failed' ? at : null,
      refundedAt: status === 'refunded' ? at : null,
      membershipEndedAt: null,
    };
  });
  const note = (
    id: string,
    targetType: StaffNoteTarget,
    targetId: string,
    [who, when, body]: readonly [string, string, string],
  ): StaffNote => ({
    id,
    targetType,
    targetId,
    author: { id: authorId(who), name: who },
    body,
    createdAt: mockStamp(when),
  });
  const notes = [
    ...WORKSPACE_NOTES.map((n, i) => note(String(20 - i), 'workspace', 'ws_northshore', n)),
    ...USER_NOTES.map((n, i) => note(String(10 - i), 'user', 'u_1042', n)),
  ];
  return { ws: SUPPORT_WS, users: [...learners, ...staff], plans, orders, notes };
}

// --- reading them as the API does ---------------------------------------------------------------

const lower = (s: string | null | undefined) => (s ?? '').toLowerCase();
const has = (hay: (string | null | undefined)[], q: string) => hay.some((h) => lower(h).includes(q.toLowerCase()));

const ACCESS_GROUP_KINDS: Record<string, PlanKind> = { library: 'library', agent: 'agent_plan', team: 'agents' };
function entitlementsOf(tier: string | null, planList: ConsolePlan[]): ConsoleEntitlements {
  const names = IDENTITY.groups.filter((g) => g !== 'team' || tier === 'team');
  const live = planList.filter((p) => ['active', 'trialing', 'past_due'].includes(p.status));
  return {
    sets: tier === 'team' ? ['owner_ops', 'agent'] : ['agent'],
    course: live.some((p) => p.kind === 'cohort'),
    groups: names.map((name) => ({
      id: `grp_${name}`,
      name,
      planKind: ACCESS_GROUP_KINDS[name]!,
      planLabel: CONSOLE_PLAN_LABELS[ACCESS_GROUP_KINDS[name]!],
      members: 1,
    })),
  };
}

const rowOf = (r: FixtureRecords, w: Ws): WorkspaceRow => {
  const p = r.plans.find((x) => x.accountId === `acct_${w.id}`)!;
  const owner = r.users.find((u) => u.name === w.owner);
  return {
    teamId: w.id,
    name: w.n,
    ownerId: owner?.id ?? null,
    ownerName: w.owner,
    ownerEmail: owner?.email ?? null,
    planKind: p.kind,
    planLabel: p.label,
    planStatus: p.status,
    seatsUsed: w.used,
    seatCap: w.cap,
    nearCap: nearCap(w.used, w.cap),
    lastActivity: mockStamp(w.last),
  };
};

export function fixtureWorkspaceRows(r: FixtureRecords, f: WorkspaceFilters): WorkspaceRow[] {
  return r.ws
    .map((w) => rowOf(r, w))
    .filter(
      (w) =>
        (f.q === undefined || w.teamId === f.q || has([w.name, w.ownerName, w.ownerEmail], f.q)) &&
        (f.plan === undefined || w.planKind === f.plan) &&
        (f.status === undefined || w.planStatus === f.status),
    );
}

export function fixtureWorkspace(r: FixtureRecords, teamId: string): WorkspaceDetail | null {
  const w = r.ws.find((x) => x.id === teamId);
  if (!w) return null;
  const row = rowOf(r, w);
  const owner = r.users.find((u) => u.name === w.owner);
  const planList = r.plans.filter((p) => p.accountId === `acct_${w.id}`);
  const orderList = r.orders.filter((o) => o.accountId === `acct_${w.id}`).sort((a, b) => b.createdAt - a.createdAt);
  const members = r.users
    .filter((u) => u.teamId === w.id)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: 'active',
      joined: u.joined,
      last: u.lastActive,
    }));
  const activity: WorkspaceActivity[] = [];
  for (const o of orderList) {
    activity.push({ at: o.createdAt, kind: 'order_created', subject: o.id, label: o.planLabel });
    if (o.paidAt !== null) activity.push({ at: o.paidAt, kind: 'order_paid', subject: o.id, label: o.planLabel });
    if (o.paymentFailedAt !== null)
      activity.push({ at: o.paymentFailedAt, kind: 'payment_failed', subject: o.id, label: o.planLabel });
  }
  for (const p of planList) activity.push({ at: p.createdAt, kind: 'plan_started', subject: p.id, label: p.label });
  for (const m of members)
    if (m.joined !== null) activity.push({ at: m.joined, kind: 'member_joined', subject: m.id, label: m.name });
  const paid = orderList.map((o) => o.paidAt).filter((v): v is number => v !== null);
  const failed = orderList.map((o) => o.paymentFailedAt).filter((v): v is number => v !== null);
  return {
    team: {
      id: w.id,
      name: w.n,
      seats: w.cap,
      ownerId: owner?.id ?? '',
      ownerName: w.owner,
      ownerEmail: owner?.email ?? null,
    },
    account: {
      id: `acct_${w.id}`,
      name: w.n,
      ownerEmail: owner?.email ?? '',
      crm: null,
      stripeCustomerId: w.cus,
      createdAt: mockStamp(JOINED),
      inviteSentAt: null,
    },
    plans: planList,
    primaryPlan: planList[0] ? { kind: planList[0].kind, label: planList[0].label, status: planList[0].status } : null,
    seatsUsed: row.seatsUsed,
    nearCap: row.nearCap,
    members,
    entitlements: entitlementsOf(owner?.tier ?? null, planList),
    billing: {
      stripeCustomerId: w.cus,
      subscriptionIds: planList.map((p) => p.stripeSubscriptionId).filter((v): v is string => !!v),
      orders: orderList,
      lastPaidAt: paid.length ? Math.max(...paid) : null,
      lastFailedAt: failed.length ? Math.max(...failed) : null,
    },
    activity: mergeActivity(activity),
  };
}

const wantsRole = (role: string | null, want: string | undefined) => want === undefined || lower(role) === lower(want);

export function fixtureUserRows(r: FixtureRecords, f: UserFilters): ConsoleUserRow[] {
  return r.users
    .filter(
      (u) =>
        (f.q === undefined || u.id === f.q || has([u.name, u.email, u.workspace], f.q)) &&
        wantsRole(u.role, f.role) &&
        (f.kind === undefined || u.kind === f.kind) &&
        (f.ids === undefined || f.ids.includes(u.id)),
    )
    .map(({ joined: _j, tier: _t, ...row }) => row);
}

export function fixtureUser(r: FixtureRecords, userId: string): ConsoleUserDetail | null {
  const u = r.users.find((x) => x.id === userId);
  if (!u) return null;
  const planList = r.plans.filter((p) => p.accountId === `acct_${u.teamId}`);
  const staffRole = u.kind === 'staff' ? (u.role as ConsoleUserDetail['user']['staffRole']) : null;
  const mock = SUPPORT_USERS.find((x) => x.id === u.id);
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      kind: u.kind,
      role: u.role,
      staffRole,
      tier: u.tier,
      teamId: u.teamId,
      workspace: u.workspace,
      cohortId: 'dec26',
      status: u.status,
      joined: u.joined,
      lastActive: u.lastActive,
    },
    identity: {
      emailVerifiedAt: mockStamp(IDENTITY.verified),
      hasPassword: IDENTITY.password,
      hasGoogle: IDENTITY.google,
    },
    orders: r.orders.filter((o) => u.teamId !== null && o.accountId === `acct_${u.teamId}`),
    // The mockup's `pr`: how many of its builds this learner has deployed.
    progress: mock
      ? ['m1', 'm2', 'm3', 'm4', 'm5'].slice(0, mock.of).map((id, i) => ({
          moduleId: id,
          moduleName: PROGRESS_NAMES[i]!,
          steps: 6,
          builtAt: i <= mock.pr ? joined(i) : null,
          deployedAt: i < mock.pr ? joined(i) : null,
        }))
      : [],
    entitlements: u.kind === 'learner' ? entitlementsOf(u.tier, planList) : { sets: [], course: false, groups: [] },
  };
}

/** `MODS0`'s published builds, in its order. */
const PROGRESS_NAMES = [
  'Marketing AI Employee',
  'Week 0 · Get Ready',
  'Week 1 · Know the Business',
  'Sales AI Employee',
  'Week 2 · Own the Day',
];
const joined = (i: number) => mockStamp('Dec 2, 12:00 PM') + i * 86_400_000;

export const fixtureNoteTargetExists = (r: FixtureRecords, type: StaffNoteTarget, id: string): boolean =>
  type === 'workspace' ? r.ws.some((w) => w.id === id) : r.users.some((u) => u.id === id);

/** Search as the API answers it (D-158, spec § 7.5): exact ids, words anywhere, five of each. */
export function fixtureSearch(r: FixtureRecords, q: string, role: string | null): SearchResults {
  const exact = (id: string | null | undefined) => !!id && id === q;
  const out: SearchResults = { users: [], workspaces: [], orders: [], skills: [] };
  if (consoleCan(role, 'users.read'))
    out.users = r.users
      .filter((u) => exact(u.id) || has([u.email, u.name], q))
      .slice(0, SEARCH_GROUP_MAX)
      .map((u) => ({ id: u.id, label: u.name, detail: u.email, href: userPath(u.id) }));
  if (consoleCan(role, 'workspaces.read'))
    out.workspaces = fixtureWorkspaceRows(r, {})
      .filter(
        (w) => exact(w.teamId) || has([w.name, w.ownerEmail], q) || r.ws.some((x) => x.id === w.teamId && exact(x.cus)),
      )
      .slice(0, SEARCH_GROUP_MAX)
      .map((w) => ({ id: w.teamId, label: w.name, detail: w.ownerEmail ?? '', href: workspacePath(w.teamId) }));
  if (consoleCan(role, 'billing.read'))
    out.orders = r.orders
      .filter((o) => exact(o.id) || exact(o.stripeCustomerId) || exact(o.stripeSubscriptionId) || has([o.email], q))
      .slice(0, SEARCH_GROUP_MAX)
      .map((o) => ({
        id: o.id,
        label: o.id,
        detail: `${o.planLabel}, ${ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status}`,
        href: o.accountId ? workspacePath(o.accountId.replace(/^acct_/, '')) : null,
      }));
  if (consoleCan(role, 'console.view'))
    out.skills = SKILL_CATALOG.filter((k) => exact(k.id) || has([k.title], q))
      .slice(0, SEARCH_GROUP_MAX)
      .map((k) => ({
        id: k.id,
        label: k.title,
        detail:
          k.sets === 'both' ? `${SKILL_SET_LABELS.owner_ops}, ${SKILL_SET_LABELS.agent}` : SKILL_SET_LABELS[k.sets],
        href: null,
      }));
  return out;
}

/**
 * D-162 3b: the mockup's three recent masquerade sessions as the API's history rows, newest first.
 * "Exited by staff" ended at its length; "Expired" at its expiry.
 */
export function fixtureMasqueradeSessions(): MasqueradeHistoryRow[] {
  return MASQ_SESSIONS.map(([staff, user, reason, started, length, ended], i) => {
    const startedAt = mockStamp(started);
    const endedAt = startedAt + Number.parseInt(length, 10) * 60_000;
    const target = SUPPORT_USERS.find((u) => u.n === user);
    return {
      id: `mq_fixture_${i + 1}`,
      target: { id: target?.id ?? user, name: user },
      staff: { id: authorId(staff), name: staff },
      reason,
      startedAt,
      expiresAt: ended === 'Expired' ? endedAt : startedAt + 15 * 60_000,
      endedAt,
      endReason: ended === 'Expired' ? 'expired' : 'exit',
      extendCount: 0,
      startedFrom: null,
    };
  });
}
