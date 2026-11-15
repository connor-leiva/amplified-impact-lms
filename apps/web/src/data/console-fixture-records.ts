// The Admin Console's fixture records, PR 2 (D-158): workspaces, users and staff notes for the fixture
// build, so the screens render for screenshots and e2e with no API. FIXTURE ONLY: only
// `console-fixture.ts` imports this, and `console.ts` loads that behind `VITE_DATA_SOURCE`, so the http
// build has none of it (`console-build.test.ts`).
//
// The people and teams are the fixture build's own, `seed('live')`: the prototype's fictional learners
// (Northline Realty Team, Harbor & Pine Group, Keystone Collective) and staff. The accounts, plans,
// orders, access group and notes are invented here, with fixture ids (`acct_fx_…`, `cus_Fx…`): no real
// customer, and no money (every order's amount is unrecorded, so no sample price is shown).

import {
  CONSOLE_PLAN_LABELS,
  INDIVIDUAL_LABEL,
  LIVE_PLAN_STATUSES,
  mergeActivity,
  nearCap,
  planSets,
  primaryPlan,
  seed,
} from '@ai/core';
import type {
  ConsoleEntitlements,
  ConsoleOrder,
  ConsolePlan,
  ConsoleUserRow,
  Db,
  StaffNote,
  StaffNoteTarget,
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceRow,
} from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';

const DAY = 86_400_000;

interface FxAccount {
  id: string;
  teamId: string;
  ownerUserId: string;
  stripeCustomerId: string;
  createdAt: number;
  inviteSentAt: number | null;
}

export interface FixtureRecords {
  db: Db;
  accounts: FxAccount[];
  plans: ConsolePlan[];
  orders: ConsoleOrder[];
  identity: Record<string, { emailVerifiedAt: number | null; hasPassword: boolean; hasGoogle: boolean }>;
  group: { id: string; name: string; planKind: PlanKind; domain: string; verified: string[] };
  notes: StaffNote[];
}

/** The fixture's records as of `now`. */
export function fixtureRecords(now: number): FixtureRecords {
  const db = seed('live');
  const acct = (id: string, teamId: string, ownerUserId: string, days: number, invited: boolean): FxAccount => ({
    id,
    teamId,
    ownerUserId,
    stripeCustomerId: `cus_Fx${teamId[0]!.toUpperCase()}${teamId.slice(1)}`,
    createdAt: now - days * DAY,
    inviteSentAt: invited ? now - (days - 1) * DAY : null,
  });
  const accounts = [acct('acct_fx_northline', 'northline', 'u_alex', 34, true), acct('acct_fx_harbor', 'harbor', 'u_natasha', 61, true), acct('acct_fx_keystone', 'keystone', 'u_marcus', 92, true)];

  const plan = (id: string, accountId: string, kind: PlanKind, option: string, seats: number, status: PlanStatus, days: number, sub: string | null): ConsolePlan => ({
    id,
    accountId,
    kind,
    label: CONSOLE_PLAN_LABELS[kind],
    option,
    seats,
    status,
    cohortId: kind === 'cohort' ? 'dec26' : null,
    startsAt: now - days * DAY,
    paidThrough: status === 'canceled' ? now - 5 * DAY : now + 20 * DAY,
    liveUntil: null,
    minimumUntil: null,
    stripeSubscriptionId: sub,
    orderId: id.replace('plan_', 'ord_'),
    createdAt: now - days * DAY,
  });
  const plans = [
    plan('plan_fx_northline_acc', 'acct_fx_northline', 'cohort', 'full', 2, 'active', 34, 'sub_FxNorthline1'),
    plan('plan_fx_northline_ins', 'acct_fx_northline', 'membership', 'year_upfront', 2, 'trialing', 34, 'sub_FxNorthline1'),
    plan('plan_fx_harbor_team', 'acct_fx_harbor', 'agents', 'upto15', 16, 'active', 61, 'sub_FxHarbor1'),
    plan('plan_fx_keystone_ins', 'acct_fx_keystone', 'membership', 'monthly', 2, 'past_due', 92, 'sub_FxKeystone1'),
  ];

  const order = (p: ConsolePlan, status: string, opts: { failedDaysAgo?: number } = {}): ConsoleOrder => {
    const a = accounts.find((x) => x.id === p.accountId)!;
    const owner = db.users.find((u) => u.id === a.ownerUserId)!;
    return {
      id: p.orderId,
      plan: p.kind,
      planLabel: p.label,
      option: p.option,
      origin: 'payment_link',
      status,
      email: owner.email,
      accountId: a.id,
      amountTotal: null,
      currency: null,
      paymentsMade: status === 'paid' ? 1 : 0,
      stripeCustomerId: a.stripeCustomerId,
      stripeSubscriptionId: p.stripeSubscriptionId,
      stripePaymentIntentId: null,
      createdAt: p.createdAt,
      paidAt: status === 'paid' || status === 'trialing' ? p.createdAt : null,
      paymentFailedAt: opts.failedDaysAgo === undefined ? null : now - opts.failedDaysAgo * DAY,
      refundedAt: null,
      membershipEndedAt: null,
    };
  };
  const orders = [order(plans[0]!, 'paid'), order(plans[2]!, 'paid'), order(plans[3]!, 'paid', { failedDaysAgo: 2 })];

  const identity: FixtureRecords['identity'] = {};
  for (const u of db.users) identity[u.id] = { emailVerifiedAt: u.status === 'active' ? u.joined : null, hasPassword: u.status === 'active', hasGoogle: false };
  identity.u_alex = { emailVerifiedAt: db.users.find((u) => u.id === 'u_alex')!.joined, hasPassword: true, hasGoogle: true };
  for (const s of db.staff) identity[s.id] = { emailVerifiedAt: now - 200 * DAY, hasPassword: true, hasGoogle: s.role === 'Owner' };

  const notes: StaffNote[] = [
    {
      id: '12',
      targetType: 'workspace',
      targetId: 'northline',
      author: { id: 'st4', name: 'Luis Romero' },
      body: 'Owner asked how seats work when an agent leaves. Sent the seat reassignment guide.',
      createdAt: now - 3 * DAY,
    },
    { id: '7', targetType: 'workspace', targetId: 'northline', author: { id: 'st1', name: 'Casey Lin' }, body: 'Onboarding call done. They want the owner-ops skills first.', createdAt: now - 17 * DAY },
    { id: '9', targetType: 'user', targetId: 'u_alex', author: { id: 'st4', name: 'Luis Romero' }, body: 'Prefers email over calls. Mornings MST.', createdAt: now - 3 * DAY },
  ];

  return {
    db,
    accounts,
    plans,
    orders,
    identity,
    group: { id: 'grp_fx_harbor', name: 'Harbor & Pine Agents', planKind: 'agents', domain: 'harborpine.com', verified: ['natasha@harborpine.com', 'claire@harborpine.com'] },
    notes,
  };
}

// --- reading them as the API does ---------------------------------------------------------------

const lower = (s: string | null | undefined) => (s ?? '').toLowerCase();
const has = (hay: (string | null | undefined)[], q: string) => hay.some((h) => lower(h).includes(q.toLowerCase()));

function groupsOf(r: FixtureRecords, emails: string[]): ConsoleEntitlements['groups'] {
  const members = emails.filter((e) => r.group.verified.includes(e.toLowerCase()) && e.toLowerCase().endsWith(`@${r.group.domain}`)).length;
  return members ? [{ id: r.group.id, name: r.group.name, planKind: r.group.planKind, planLabel: CONSOLE_PLAN_LABELS[r.group.planKind], members }] : [];
}

function entitlementsOf(planList: ConsolePlan[], groups: ConsoleEntitlements['groups']): ConsoleEntitlements {
  const live = planList.filter((p) => (LIVE_PLAN_STATUSES as readonly string[]).includes(p.status));
  const kinds = [...live.map((p) => p.kind), ...groups.map((g) => g.planKind)];
  return { sets: (['owner_ops', 'agent'] as const).filter((s) => kinds.some((k) => planSets(k).includes(s))), course: live.some((p) => p.kind === 'cohort'), groups };
}

const teamPlans = (r: FixtureRecords, teamId: string | null) => {
  const ids = r.accounts.filter((a) => a.teamId === teamId).map((a) => a.id);
  return r.plans.filter((p) => ids.includes(p.accountId));
};

export function fixtureWorkspaceRows(r: FixtureRecords, f: WorkspaceFilters): WorkspaceRow[] {
  return r.db.teams
    .map((t): WorkspaceRow => {
      const owner = r.db.users.find((u) => u.id === t.ownerId);
      const members = r.db.users.filter((u) => u.teamId === t.id);
      const p = primaryPlan(teamPlans(r, t.id));
      const last = Math.max(...members.map((m) => m.last ?? 0));
      return {
        teamId: t.id,
        name: t.name,
        ownerName: owner?.name ?? null,
        ownerEmail: owner?.email ?? null,
        planKind: p?.kind ?? null,
        planLabel: p?.label ?? null,
        planStatus: p?.status ?? null,
        seatsUsed: members.length,
        seatCap: t.seats,
        nearCap: nearCap(members.length, t.seats),
        lastActivity: last > 0 ? last : null,
      };
    })
    .filter((w) => (f.q === undefined || w.teamId === f.q || has([w.name, w.ownerName, w.ownerEmail], f.q)) && (f.plan === undefined || w.planKind === f.plan) && (f.status === undefined || w.planStatus === f.status))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.teamId.localeCompare(b.teamId));
}

export function fixtureWorkspace(r: FixtureRecords, teamId: string): WorkspaceDetail | null {
  const t = r.db.teams.find((x) => x.id === teamId);
  if (!t) return null;
  const owner = r.db.users.find((u) => u.id === t.ownerId);
  const accts = r.accounts.filter((a) => a.teamId === t.id);
  const planList = teamPlans(r, t.id).sort((a, b) => b.createdAt - a.createdAt);
  const orderList = r.orders.filter((o) => accts.some((a) => a.id === o.accountId)).sort((a, b) => b.createdAt - a.createdAt);
  const members = r.db.users.filter((u) => u.teamId === t.id).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, joined: u.joined, last: u.last }));
  const primary = primaryPlan(planList);
  const acct = accts[0] ?? null;
  const activity: WorkspaceActivity[] = [];
  for (const o of orderList) {
    activity.push({ at: o.createdAt, kind: 'order_created', subject: o.id, label: o.planLabel });
    if (o.paidAt !== null) activity.push({ at: o.paidAt, kind: 'order_paid', subject: o.id, label: o.planLabel });
    if (o.paymentFailedAt !== null) activity.push({ at: o.paymentFailedAt, kind: 'payment_failed', subject: o.id, label: o.planLabel });
  }
  for (const p of planList) activity.push({ at: p.createdAt, kind: 'plan_started', subject: p.id, label: p.label });
  for (const m of members) activity.push({ at: m.joined, kind: 'member_joined', subject: m.id, label: m.name });
  if (acct?.inviteSentAt) activity.push({ at: acct.inviteSentAt, kind: 'invite_sent', subject: acct.id, label: owner?.email ?? '' });
  const paid = orderList.map((o) => o.paidAt).filter((v): v is number => v !== null);
  const failed = orderList.map((o) => o.paymentFailedAt).filter((v): v is number => v !== null);
  return {
    team: { id: t.id, name: t.name, seats: t.seats, ownerId: t.ownerId, ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null },
    account: acct ? { id: acct.id, name: t.name, ownerEmail: owner?.email ?? '', crm: 'follow_up_boss', stripeCustomerId: acct.stripeCustomerId, createdAt: acct.createdAt, inviteSentAt: acct.inviteSentAt } : null,
    plans: planList,
    primaryPlan: primary ? { kind: primary.kind, label: primary.label, status: primary.status } : null,
    seatsUsed: members.length,
    nearCap: nearCap(members.length, t.seats),
    members,
    entitlements: entitlementsOf(planList, groupsOf(r, members.map((m) => m.email))),
    billing: {
      stripeCustomerId: acct?.stripeCustomerId ?? null,
      subscriptionIds: [...new Set(planList.map((p) => p.stripeSubscriptionId).filter((v): v is string => !!v))],
      orders: orderList,
      lastPaidAt: paid.length ? Math.max(...paid) : null,
      lastFailedAt: failed.length ? Math.max(...failed) : null,
    },
    activity: mergeActivity(activity),
  };
}

function everyone(r: FixtureRecords): (ConsoleUserRow & { joined: number | null; cohortId: string | null; tier: string | null })[] {
  const learners = r.db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    kind: 'learner' as const,
    role: u.role,
    teamId: u.teamId,
    workspace: r.db.teams.find((t) => t.id === u.teamId)?.name ?? INDIVIDUAL_LABEL,
    status: u.status,
    lastActive: u.last,
    joined: u.joined,
    cohortId: u.cohortId,
    tier: u.tier,
  }));
  const staff = r.db.staff.map((s) => ({ id: s.id, name: s.name, email: s.email, kind: 'staff' as const, role: s.role, teamId: null, workspace: null, status: null, lastActive: s.last, joined: null, cohortId: null, tier: null }));
  return [...learners, ...staff].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id));
}

export const fixtureNoteTargetExists = (r: FixtureRecords, type: StaffNoteTarget, id: string): boolean =>
  type === 'workspace' ? r.db.teams.some((t) => t.id === id) : everyone(r).some((u) => u.id === id);
