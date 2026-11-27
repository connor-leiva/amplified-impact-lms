// The Admin Console's support records, PR 2 (D-158, spec §§ 7.3-7.4): workspaces and users, as lists
// and as one record each. Read-only: nothing here writes, and every query is parameterized (a filter's
// words are bound values; LIKE's own characters in them are escaped by `containsPattern`).
//
// A workspace is a `teams` row (D16), joined to its `accounts` by `team_id`, plus those accounts'
// `plans` and `orders`. Its plan is the one `primaryPlan` (@ai/core) picks; the list's SQL orders by the
// same rule (`PLAN_PRIORITY`), and `test/console-support.test.ts` holds the two equal. Billing here is
// local tables only: Stripe's own reads are Console PR 4.
//
// Pages are keyset pages over (lower(name), id), so a page never repeats or skips a row when one is
// added in between; the cursor is that pair, base64url JSON.

import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  CONSOLE_PLAN_LABELS,
  INDIVIDUAL_LABEL,
  LIVE_PLAN_STATUSES,
  PLAN_PRIORITY,
  containsPattern,
  isPlanKind,
  isUserKind,
  mergeActivity,
  gotInOf,
  groupTeamOfOne,
  nearCap,
  parseGotIn,
  payingOf,
  planSets,
  primaryPlan,
  sortGotIn,
} from '@ai/core';
import type {
  CohortWelcomeStatus,
  ConsoleEntitlements,
  ConsoleOrder,
  ConsolePlan,
  ConsoleProgress,
  ConsoleUserDetail,
  ConsoleUserRow,
  GotInCount,
  PeopleAudiences,
  StaffRole,
  UserExportRow,
  UserFilters,
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceMember,
  WorkspaceRow,
} from '@ai/core';
import type { PlanKind, PlanStatus } from '@ai/core/offer';
import type { Database } from '../db/client';
import {
  accessGroupMembers,
  accessGroups,
  accounts,
  cohortEnrollments,
  cohorts,
  emailVerifications,
  googleIdentities,
  modules,
  orders,
  plans,
  skillPurchases,
  skills,
  progress,
  teams,
  userPasswords,
  users,
} from '../db/schema';
import { inGroup, normalizeAddress } from '../billing/access-groups';
import type { AccessGroup } from '../billing/access-groups';
import { clock } from '../lib/clock';

// --- cursors -------------------------------------------------------------------------------------

/** A keyset position: the row's lower-cased name and its id. */
export type NameCursor = { name: string; id: string };

export const encodeCursor = (c: NameCursor): string => Buffer.from(JSON.stringify([c.name, c.id]), 'utf8').toString('base64url');

/** The cursor back, or null when it is not one this API wrote. */
export function decodeCursor(raw: unknown): NameCursor | null {
  if (typeof raw !== 'string' || raw.length > 600 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'string' || typeof v[1] !== 'string') return null;
    return { name: v[0], id: v[1] };
  } catch {
    return null;
  }
}

// --- shared --------------------------------------------------------------------------------------

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** `array['cohort', …]::text[]`, each kind a bound value: the order `primaryPlan` ranks by. */
export const priorityArray = sql`array[${sql.join(
  PLAN_PRIORITY.map((k) => sql`${k}`),
  sql`, `,
)}]::text[]`;
export const liveArray = sql`array[${sql.join(
  LIVE_PLAN_STATUSES.map((k) => sql`${k}`),
  sql`, `,
)}]::text[]`;

/**
 * R-5 Phase 7 (D-268): whether the address `email` (a SQL expression) is in the access group `g`, by D-148's rule as
 * `inGroup` reads it: the group has not expired, and the address is on its list or at its exact domain (one `@`, not
 * first or last). Verification aside, as D-267's Utah Life tab reads who is in a group.
 */
export const inGroupSql = (email: SQL, now: number) => sql`(g.expires_at is null or g.expires_at > ${now}) and (
  exists (select 1 from access_group_members gm where gm.group_id = g.id and gm.email = lower(trim(${email})))
  or (g.email_domain is not null and position('@' in lower(trim(${email}))) > 1 and lower(trim(${email})) not like '%@%@%'
      and split_part(lower(trim(${email})), '@', 2) = g.email_domain)
)`;

/**
 * R-5 Phase 7 (D-268): what decides how a user `u` got in (`gotInOf`): `pp`, the primary plan of their team (any status,
 * ranked as `primaryPlan` ranks); `sk`, a skill purchase of theirs; `gg`, the first access group by name they are in.
 */
const gotInJoins = (now: number) => sql`
  left join lateral (
    select p.kind from plans p join accounts a on a.id = p.account_id
    where a.team_id = u.team_id
    order by (p.status = any(${liveArray})) desc, array_position(${priorityArray}, p.kind) nulls last, p.created_at desc
    limit 1
  ) pp on true
  left join lateral (select true as yes from skill_purchases s where s.user_id = u.id limit 1) sk on true
  left join lateral (select g.id, g.name from access_groups g where ${inGroupSql(sql`u.email`, now)} order by g.name, g.id limit 1) gg on true`;

/** The `GotIn` key's condition, over `gotInJoins`' columns. */
function gotInWhere(key: string): SQL | null {
  const k = parseGotIn(key);
  if (!k) return null;
  if (k.kind === 'plan') return sql`pp.kind = ${k.id}`;
  if (k.kind === 'skill') return sql`(pp.kind is null and sk.yes is true)`;
  if (k.kind === 'group') return sql`(pp.kind is null and sk.yes is null and gg.id = ${k.id})`;
  return sql`(pp.kind is null and sk.yes is null and gg.id is null)`;
}

type OrderRow = typeof orders.$inferSelect;
type PlanRow = typeof plans.$inferSelect;

export function orderOf(o: OrderRow): ConsoleOrder {
  const plan = (isPlanKind(o.plan) ? o.plan : 'library') as PlanKind;
  return {
    id: o.id,
    plan,
    planLabel: CONSOLE_PLAN_LABELS[plan],
    option: o.option,
    origin: o.origin,
    status: o.status,
    email: o.email,
    accountId: o.accountId,
    amountTotal: o.amountTotal,
    currency: o.currency,
    paymentsMade: o.paymentsMade,
    stripeCustomerId: o.stripeCustomerId,
    stripeSubscriptionId: o.stripeSubscriptionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    paymentFailedAt: o.paymentFailedAt,
    refundedAt: o.refundedAt,
    membershipEndedAt: o.membershipEndedAt,
  };
}

function planOf(p: PlanRow): ConsolePlan {
  const kind = (isPlanKind(p.kind) ? p.kind : 'library') as PlanKind;
  return {
    id: p.id,
    accountId: p.accountId,
    kind,
    label: CONSOLE_PLAN_LABELS[kind],
    option: p.option,
    seats: p.seats,
    status: p.status as PlanStatus,
    cohortId: p.cohortId,
    startsAt: p.startsAt,
    paidThrough: p.paidThrough,
    liveUntil: p.liveUntil,
    minimumUntil: p.minimumUntil,
    stripeSubscriptionId: p.stripeSubscriptionId,
    orderId: p.orderId,
    createdAt: p.createdAt,
  };
}

/**
 * The access groups (D-148) any of these addresses is in, with how many of them, counting only a
 * VERIFIED address: the same rule `groupAccessOf` grants by. One read of each table, not one per person.
 */
async function groupsFor(db: Database, emails: readonly string[], now: number): Promise<ConsoleEntitlements['groups']> {
  const addresses = [...new Set(emails.map(normalizeAddress))];
  if (!addresses.length) return [];
  const [all, listed, verified] = await Promise.all([
    db.select().from(accessGroups).orderBy(asc(accessGroups.name), asc(accessGroups.id)),
    db.select({ groupId: accessGroupMembers.groupId, email: accessGroupMembers.email }).from(accessGroupMembers).where(inArray(accessGroupMembers.email, addresses)),
    db.select({ email: emailVerifications.email }).from(emailVerifications).where(inArray(emailVerifications.email, addresses)),
  ]);
  const isVerified = new Set(verified.map((v) => v.email));
  const onList = new Set(listed.map((l) => `${l.groupId}\n${l.email}`));
  const out: ConsoleEntitlements['groups'] = [];
  for (const g of all) {
    if (!isPlanKind(g.plan)) continue;
    const group: AccessGroup = { id: g.id, name: g.name, plan: g.plan, emailDomain: g.emailDomain, expiresAt: g.expiresAt };
    const members = addresses.filter((a) => isVerified.has(a) && inGroup(group, a, onList.has(`${g.id}\n${a}`), now)).length;
    if (members > 0) out.push({ id: g.id, name: g.name, planKind: g.plan, planLabel: CONSOLE_PLAN_LABELS[g.plan], members });
  }
  return out;
}

/** What running plans and groups open: their skill sets, and the course for the AI Accelerator. */
function entitlementsOf(planList: readonly ConsolePlan[], groups: ConsoleEntitlements['groups']): ConsoleEntitlements {
  const live = planList.filter((p) => (LIVE_PLAN_STATUSES as readonly string[]).includes(p.status));
  const kinds: PlanKind[] = [...live.map((p) => p.kind), ...groups.map((g) => g.planKind)];
  const sets = (['owner_ops', 'agent'] as const).filter((s) => kinds.some((k) => planSets(k).includes(s)));
  // The course is the AI Accelerator plan's alone; a group grants skills, not the course.
  return { sets: [...sets], course: live.some((p) => p.kind === 'cohort'), groups };
}

// --- workspaces ----------------------------------------------------------------------------------

/** The workspace list's rows: one statement, the plan picked per team by `PLAN_PRIORITY`. */
export async function listWorkspaces(db: Database, f: WorkspaceFilters, opts: { after?: NameCursor | null; limit: number }): Promise<{ rows: WorkspaceRow[]; next: NameCursor | null }> {
  const where: SQL[] = [];
  if (f.q !== undefined) {
    const p = containsPattern(f.q);
    where.push(sql`(t.id = ${f.q} or t.name ilike ${p} or o.name ilike ${p} or o.email ilike ${p})`);
  }
  if (f.plan !== undefined) where.push(sql`pp.kind = ${f.plan}`);
  if (f.status !== undefined) where.push(sql`pp.status = ${f.status}`);
  // R-5 Phase 7 (D-268): People › Teams' Product, a team holding a live plan of the kind.
  if (f.holds !== undefined) where.push(sql`${f.holds} = any(holds.kinds)`);
  // R-5 Phase 7 (D-268): an access group's team of one is not a team here (`groupTeamOfOne`): no plan row, one member,
  // whose address is in a group.
  const now = clock.now();
  where.push(sql`not (
    not exists (select 1 from plans p join accounts a on a.id = p.account_id where a.team_id = t.id)
    and (select count(*) from users m where m.team_id = t.id) = 1
    and exists (select 1 from users m join access_groups g on ${inGroupSql(sql`m.email`, now)} where m.team_id = t.id)
  )`);
  if (opts.after) where.push(sql`(lower(t.name), t.id) > (${opts.after.name}, ${opts.after.id})`);
  const whereSql = where.length ? sql`where ${sql.join(where, sql` and `)}` : sql``;
  const raw = (await db.execute(sql`
    select t.id, t.name, t.seats, t.owner_id, o.name as owner_name, o.email as owner_email, pp.kind, pp.status,
      pp.option, pp.origin, pp.payments_made, pp.amount_total, holds.kinds as holds,
      (select count(*)::int from users m where m.team_id = t.id) as used,
      (select max(m.last) from users m where m.team_id = t.id) as last,
      exists (
        select 1 from plans p
        join accounts a on a.id = p.account_id
        join orders ord on ord.id = p.order_id
        where a.team_id = t.id and ord.origin = 'comp' and p.status <> 'ended'
      ) as comped
    from teams t
    left join users o on o.id = t.owner_id
    left join lateral (
      select p.kind, p.status, p.option, ord.origin, ord.payments_made, ord.amount_total from plans p join accounts a on a.id = p.account_id
      left join orders ord on ord.id = p.order_id
      where a.team_id = t.id
      order by (p.status = any(${liveArray})) desc, array_position(${priorityArray}, p.kind) nulls last, p.created_at desc
      limit 1
    ) pp on true
    left join lateral (
      select coalesce(array_agg(distinct p.kind), '{}') as kinds from plans p join accounts a on a.id = p.account_id
      where a.team_id = t.id and p.status = any(${liveArray})
    ) holds on true
    ${whereSql}
    order by lower(t.name), t.id
    limit ${opts.limit + 1}
  `)) as unknown as {
    id: string;
    name: string;
    seats: number;
    owner_id: string | null;
    owner_name: string | null;
    owner_email: string | null;
    kind: string | null;
    status: string | null;
    used: number;
    last: string | number | null;
    comped: boolean;
    option: string | null;
    origin: string | null;
    payments_made: number | null;
    amount_total: number | string | null;
    holds: string[] | null;
  }[];
  const rows = raw.slice(0, opts.limit).map((r): WorkspaceRow => {
    const kind = isPlanKind(r.kind) ? r.kind : null;
    const used = Number(r.used);
    return {
      teamId: r.id,
      name: r.name,
      ownerId: r.owner_id,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      planKind: kind,
      planLabel: kind ? CONSOLE_PLAN_LABELS[kind] : null,
      planStatus: kind ? (r.status as PlanStatus) : null,
      seatsUsed: used,
      seatCap: r.seats,
      nearCap: nearCap(used, r.seats),
      lastActivity: n(r.last),
      comped: r.comped === true,
      holds: PLAN_PRIORITY.filter((k) => (r.holds ?? []).includes(k)).map((k) => CONSOLE_PLAN_LABELS[k]),
      paying: payingOf({ kind, status: r.status, option: r.option, origin: r.origin, paymentsMade: n(r.payments_made), amountTotal: n(r.amount_total) }),
    };
  });
  const last = rows[rows.length - 1];
  return { rows, next: raw.length > opts.limit && last ? { name: last.name.toLowerCase(), id: last.teamId } : null };
}

/** One workspace as a support record, or null when there is no such team. */
export async function workspaceDetail(db: Database, teamId: string, now: number): Promise<WorkspaceDetail | null> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return null;
  const [owner] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, team.ownerId)).limit(1);
  const accts = await db.select().from(accounts).where(eq(accounts.teamId, team.id)).orderBy(asc(accounts.createdAt), asc(accounts.id));
  const acctIds = accts.map((a) => a.id);
  const ownerEmails = [...new Set(accts.map((a) => a.ownerEmail.toLowerCase()))];
  const planRows = acctIds.length ? await db.select().from(plans).where(inArray(plans.accountId, acctIds)).orderBy(desc(plans.createdAt), asc(plans.id)) : [];
  // The accounts' orders, and any order its owner started that no account took yet (pending, failed).
  const orderWhere = or(
    acctIds.length ? inArray(orders.accountId, acctIds) : undefined,
    ownerEmails.length ? and(isNull(orders.accountId), inArray(sql`lower(${orders.email})`, ownerEmails)) : undefined,
  );
  const orderRows = orderWhere ? await db.select().from(orders).where(orderWhere).orderBy(desc(orders.createdAt), asc(orders.id)) : [];
  const memberRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, joined: users.joined, last: users.last })
    .from(users)
    .where(eq(users.teamId, team.id))
    .orderBy(asc(users.seq), asc(users.id));

  const planList = planRows.map(planOf);
  const primary = primaryPlan(planList);
  const members: WorkspaceMember[] = memberRows.map((m) => ({ ...m, joined: n(m.joined), last: n(m.last) }));
  const groups = await groupsFor(db, members.map((m) => m.email), now);
  const orderList = orderRows.map(orderOf);
  const acct = accts[0] ?? null;

  const activity: WorkspaceActivity[] = [];
  for (const o of orderList) {
    activity.push({ at: o.createdAt, kind: 'order_created', subject: o.id, label: o.planLabel });
    if (o.origin === 'comp' && o.paidAt !== null) activity.push({ at: o.paidAt, kind: 'order_comped', subject: o.id, label: o.planLabel });
    else if (o.paidAt !== null) activity.push({ at: o.paidAt, kind: 'order_paid', subject: o.id, label: o.planLabel });
    if (o.paymentFailedAt !== null) activity.push({ at: o.paymentFailedAt, kind: 'payment_failed', subject: o.id, label: o.planLabel });
    if (o.refundedAt !== null) activity.push({ at: o.refundedAt, kind: 'order_refunded', subject: o.id, label: o.planLabel });
    if (o.membershipEndedAt !== null) activity.push({ at: o.membershipEndedAt, kind: 'membership_ended', subject: o.id, label: o.planLabel });
  }
  for (const p of planList) activity.push({ at: p.createdAt, kind: 'plan_started', subject: p.id, label: p.label });
  for (const m of members) if (m.joined !== null) activity.push({ at: m.joined, kind: 'member_joined', subject: m.id, label: m.name });
  for (const a of accts) if (a.inviteSentAt !== null) activity.push({ at: a.inviteSentAt, kind: 'invite_sent', subject: a.id, label: a.ownerEmail });
  const welcome = acct ? await welcomeForOwner(db, acct.ownerUserId) : null;
  if (welcome?.status === 'sent' && welcome.at !== null) activity.push({ at: welcome.at, kind: 'welcome_sent', subject: welcome.cohortId, label: welcome.cohortName });

  const subscriptionIds = [...new Set([...planList.map((p) => p.stripeSubscriptionId), ...orderList.map((o) => o.stripeSubscriptionId)].filter((v): v is string => !!v))];
  const paid = orderList.map((o) => o.paidAt).filter((v): v is number => v !== null);
  const failed = orderList.map((o) => o.paymentFailedAt).filter((v): v is number => v !== null);

  return {
    team: { id: team.id, name: team.name, seats: team.seats, ownerId: team.ownerId, ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null },
    account: acct
      ? { id: acct.id, name: acct.name, ownerEmail: acct.ownerEmail, crm: acct.crm, stripeCustomerId: acct.stripeCustomerId, createdAt: acct.createdAt, inviteSentAt: acct.inviteSentAt }
      : null,
    welcome,
    plans: planList,
    primaryPlan: primary ? { kind: primary.kind, label: primary.label, status: primary.status } : null,
    seatsUsed: members.length,
    nearCap: nearCap(members.length, team.seats),
    members,
    entitlements: entitlementsOf(planList, groups),
    billing: {
      stripeCustomerId: acct?.stripeCustomerId ?? orderList.find((o) => o.stripeCustomerId)?.stripeCustomerId ?? null,
      subscriptionIds,
      orders: orderList,
      lastPaidAt: paid.length ? Math.max(...paid) : null,
      lastFailedAt: failed.length ? Math.max(...failed) : null,
    },
    activity: mergeActivity(activity),
  };
}

// --- users ---------------------------------------------------------------------------------------

function userWhere(f: UserFilters): SQL[] {
  const where: SQL[] = [];
  if (f.q !== undefined) {
    const p = containsPattern(f.q);
    where.push(sql`(u.id = ${f.q} or u.name ilike ${p} or u.email ilike ${p} or t.name ilike ${p})`);
  }
  if (f.role !== undefined) where.push(sql`(u.role = ${f.role} or u.staff_role = ${f.role})`);
  if (f.kind !== undefined) where.push(sql`u.kind = ${f.kind}`);
  if (f.ids !== undefined && f.ids.length) where.push(sql`u.id in (${sql.join(f.ids.map((id) => sql`${id}`), sql`, `)})`);
  if (f.gotIn !== undefined) {
    const g = gotInWhere(f.gotIn);
    if (g) where.push(g);
  }
  return where;
}

type UserListRow = {
  id: string;
  name: string;
  email: string;
  kind: string;
  role: string | null;
  staff_role: string | null;
  team_id: string | null;
  team_name: string | null;
  status: string | null;
  last: string | number | null;
  joined: string | number | null;
  plan_kind: string | null;
  skill_buyer: boolean | null;
  group_id: string | null;
  group_name: string | null;
};

/** How a listed user got in (`gotInOf`), from the row's `gotInJoins` columns. */
const gotInOfRow = (r: Pick<UserListRow, 'plan_kind' | 'skill_buyer' | 'group_id' | 'group_name'>) =>
  gotInOf({
    planKind: isPlanKind(r.plan_kind) ? r.plan_kind : null,
    skillBuyer: r.skill_buyer === true,
    group: r.group_id !== null ? { id: r.group_id, name: r.group_name ?? r.group_id } : null,
  });

function userRowOf(r: UserListRow): UserExportRow {
  const kind = isUserKind(r.kind) ? r.kind : 'learner';
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    kind,
    role: kind === 'staff' ? r.staff_role : r.role,
    teamId: r.team_id,
    workspace: kind === 'staff' ? null : (r.team_name ?? INDIVIDUAL_LABEL),
    status: r.status,
    lastActive: n(r.last),
    joined: n(r.joined),
  };
}

async function readUsers(db: Database, f: UserFilters, opts: { after?: NameCursor | null; limit: number }): Promise<UserListRow[]> {
  const where = userWhere(f);
  if (opts.after) where.push(sql`(lower(u.name), u.id) > (${opts.after.name}, ${opts.after.id})`);
  const whereSql = where.length ? sql`where ${sql.join(where, sql` and `)}` : sql``;
  return (await db.execute(sql`
    select u.id, u.name, u.email, u.kind, u.role, u.staff_role, u.team_id, t.name as team_name, u.status, u.last, u.joined,
      pp.kind as plan_kind, sk.yes as skill_buyer, gg.id as group_id, gg.name as group_name
    from users u left join teams t on t.id = u.team_id
    ${gotInJoins(clock.now())}
    ${whereSql}
    order by lower(u.name), u.id
    limit ${opts.limit}
  `)) as unknown as UserListRow[];
}

export async function listUsers(db: Database, f: UserFilters, opts: { after?: NameCursor | null; limit: number }): Promise<{ rows: ConsoleUserRow[]; next: NameCursor | null }> {
  const raw = await readUsers(db, f, { after: opts.after, limit: opts.limit + 1 });
  const rows = raw.slice(0, opts.limit).map((r): ConsoleUserRow => {
    const { joined: _joined, ...row } = userRowOf(r);
    // R-5 Phase 7 (D-268): how a learner got in; staff got in through no plan.
    return row.kind === 'learner' ? { ...row, gotIn: gotInOfRow(r) } : row;
  });
  const last = rows[rows.length - 1];
  return { rows, next: raw.length > opts.limit && last ? { name: last.name.toLowerCase(), id: last.id } : null };
}

export async function countUsers(db: Database, f: UserFilters): Promise<number> {
  const where = userWhere(f);
  const whereSql = where.length ? sql`where ${sql.join(where, sql` and `)}` : sql``;
  const [row] = (await db.execute(sql`select count(*)::int as n from users u left join teams t on t.id = u.team_id ${gotInJoins(clock.now())} ${whereSql}`)) as unknown as { n: number }[];
  return Number(row?.n ?? 0);
}

/**
 * R-5 Phase 7 (D-268): People's counts. Every learner, each counted once under how they got in (`gotInOf`), one chip per
 * answer some learner has; the teams People › Teams lists; and each access group's teams of one it leaves out.
 */
export async function peopleAudiences(db: Database, now: number): Promise<PeopleAudiences> {
  const learners = (await db.execute(sql`
    select u.id, pp.kind as plan_kind, sk.yes as skill_buyer, gg.id as group_id, gg.name as group_name
    from users u ${gotInJoins(now)}
    where u.kind = 'learner'
  `)) as unknown as Pick<UserListRow, 'id' | 'plan_kind' | 'skill_buyer' | 'group_id' | 'group_name'>[];
  const chips = new Map<string, GotInCount>();
  for (const r of learners) {
    const g = gotInOfRow(r);
    const c = chips.get(g.key) ?? { ...g, count: 0 };
    c.count += 1;
    chips.set(g.key, c);
  }
  const teamRows = (await db.execute(sql`
    select t.id,
      (select count(*)::int from plans p join accounts a on a.id = p.account_id where a.team_id = t.id) as plans,
      (select count(*)::int from users m where m.team_id = t.id) as members,
      gm.id as group_id, gm.name as group_name
    from teams t
    left join lateral (
      select g.id, g.name from users m join access_groups g on ${inGroupSql(sql`m.email`, now)}
      where m.team_id = t.id order by g.name, g.id limit 1
    ) gm on true
  `)) as unknown as { id: string; plans: number; members: number; group_id: string | null; group_name: string | null }[];
  const left = new Map<string, { id: string; name: string; count: number }>();
  let teamsListed = 0;
  for (const t of teamRows) {
    if (t.group_id !== null && groupTeamOfOne({ plans: Number(t.plans), members: Number(t.members), memberInGroup: true })) {
      const e = left.get(t.group_id) ?? { id: t.group_id, name: t.group_name ?? t.group_id, count: 0 };
      e.count += 1;
      left.set(t.group_id, e);
    } else teamsListed += 1;
  }
  return {
    total: learners.length,
    chips: sortGotIn([...chips.values()]),
    teams: teamsListed,
    leftOut: [...left.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
  };
}

/** Every matching user, for the export: `max` at most. */
export const exportUsers = async (db: Database, f: UserFilters, max: number): Promise<UserExportRow[]> => (await readUsers(db, f, { limit: max })).map(userRowOf);

async function skillPurchasesOf(db: Database, userId: string, email: string) {
  const rows = await db
    .select({
      id: skillPurchases.id,
      skillId: skillPurchases.skillId,
      title: skills.title,
      amount: skillPurchases.amount,
      purchasedAt: skillPurchases.purchasedAt,
      stripeSessionId: skillPurchases.stripeSessionId,
      refundedAt: skillPurchases.refundedAt,
    })
    .from(skillPurchases)
    .leftJoin(skills, eq(skills.id, skillPurchases.skillId))
    .where(or(eq(skillPurchases.userId, userId), sql`lower(${skillPurchases.email}) = ${email}`))
    .orderBy(desc(skillPurchases.purchasedAt));
  return rows.map((r) => ({
    id: r.id,
    skillId: r.skillId,
    skill: r.title ?? r.skillId,
    amount: r.amount,
    purchasedAt: r.purchasedAt,
    stripeSessionId: r.stripeSessionId,
    refundedAt: r.refundedAt,
  }));
}

/** One user as a support record, or null when there is no such user. Identity is existence only. */
export async function userDetail(db: Database, userId: string, now: number): Promise<ConsoleUserDetail | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return null;
  const kind = isUserKind(u.kind) ? u.kind : 'learner';
  const email = normalizeAddress(u.email);
  const [team] = u.teamId ? await db.select({ name: teams.name }).from(teams).where(eq(teams.id, u.teamId)).limit(1) : [];
  const [verified] = await db.select({ at: emailVerifications.verifiedAt }).from(emailVerifications).where(eq(emailVerifications.email, email)).limit(1);
  const [pw] = await db.select({ userId: userPasswords.userId }).from(userPasswords).where(eq(userPasswords.userId, u.id)).limit(1);
  const [google] = await db.select({ userId: googleIdentities.userId }).from(googleIdentities).where(eq(googleIdentities.userId, u.id)).limit(1);

  // Their orders: by the address they bought with, and any order an account they own took.
  const owned = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.ownerUserId, u.id));
  const ownedIds = owned.map((a) => a.id);
  const orderRows = await db
    .select()
    .from(orders)
    .where(or(eq(sql`lower(${orders.email})`, email), ownedIds.length ? inArray(orders.accountId, ownedIds) : undefined))
    .orderBy(desc(orders.createdAt), asc(orders.id));

  const progressRows = await db
    .select({ moduleId: progress.moduleId, moduleName: modules.name, steps: progress.steps, builtAt: progress.builtAt, deployedAt: progress.deployedAt, order: modules.order })
    .from(progress)
    .leftJoin(modules, eq(modules.id, progress.moduleId))
    .where(eq(progress.userId, u.id))
    .orderBy(asc(modules.order), asc(progress.moduleId));
  const progressList: ConsoleProgress[] = progressRows.map((p) => ({
    moduleId: p.moduleId,
    moduleName: p.moduleName ?? p.moduleId,
    steps: Array.isArray(p.steps) ? p.steps.length : 0,
    builtAt: n(p.builtAt),
    deployedAt: n(p.deployedAt),
  }));

  // What they hold: their team's accounts' plans (the access rule's `paidPlansOf`) and their groups.
  let entitlements: ConsoleEntitlements = { sets: [], course: false, groups: [] };
  if (kind === 'learner') {
    const accts = u.teamId ? await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, u.teamId)) : [];
    const planRows = accts.length ? await db.select().from(plans).where(inArray(plans.accountId, accts.map((a) => a.id))) : [];
    entitlements = entitlementsOf(planRows.map(planOf), await groupsFor(db, [email], now));
  }

  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      kind,
      role: kind === 'staff' ? (u.staffRole ?? null) : u.role,
      staffRole: (u.staffRole ?? null) as StaffRole | null,
      tier: u.tier,
      teamId: u.teamId,
      workspace: kind === 'staff' ? null : (team?.name ?? INDIVIDUAL_LABEL),
      cohortId: u.cohortId,
      status: u.status,
      joined: n(u.joined),
      lastActive: n(u.last),
    },
    identity: { emailVerifiedAt: verified ? Number(verified.at) : null, hasPassword: !!pw, hasGoogle: !!google },
    orders: orderRows.map(orderOf),
    skillPurchases: await skillPurchasesOf(db, u.id, email),
    progress: progressList,
    entitlements,
    welcome: await welcomeForOwner(db, u.id),
  };
}

/** The owner's cohort welcome, or a pending one when a live cohort plan has not been queued yet. */
async function welcomeForOwner(db: Database, userId: string): Promise<CohortWelcomeStatus | null> {
  const [row] = await db
    .select({
      cohortId: cohortEnrollments.cohortId,
      cohortName: cohorts.name,
      status: cohortEnrollments.welcomeStatus,
      at: cohortEnrollments.welcomeSentAt,
    })
    .from(cohortEnrollments)
    .leftJoin(cohorts, eq(cohorts.id, cohortEnrollments.cohortId))
    .where(eq(cohortEnrollments.userId, userId))
    .orderBy(desc(cohortEnrollments.enrolledAt))
    .limit(1);
  if (row) {
    const status = row.status === 'claimed' || row.status === 'sent' || row.status === 'failed' || row.status === 'skipped' ? row.status : 'pending';
    return { cohortId: row.cohortId, cohortName: row.cohortName ?? row.cohortId, status, at: row.at };
  }
  const [plan] = await db
    .select({ cohortId: plans.cohortId, name: cohorts.name })
    .from(plans)
    .innerJoin(accounts, eq(accounts.id, plans.accountId))
    .leftJoin(cohorts, eq(cohorts.id, plans.cohortId))
    .where(and(eq(accounts.ownerUserId, userId), eq(plans.kind, 'cohort'), sql`${plans.cohortId} is not null`, ne(plans.status, 'ended')))
    .orderBy(desc(plans.createdAt))
    .limit(1);
  if (!plan?.cohortId) return null;
  return { cohortId: plan.cohortId, cohortName: plan.name ?? plan.cohortId, status: 'pending', at: null };
}
