// D-243: who is in the course's cohort, and who is outside it.
//
// The cohort is the AI Accelerator's. Provisioning puts every account in cohort `dec26` all the same: an
// access group's member (billing/access-groups.ts) and a buyer of any plan (billing/provision.ts). So a learner
// is OUTSIDE the course when their team's plans don't hold it (`holdsCourse`: bought in full or in two payments,
// not refunded) and they hold something else instead:
//   - an access group (Utah Life above all), by the address alone (`inGroup`: its domain exactly, or its list).
//     Verification decides what a group GRANTS (D-148) and is untouched; it doesn't decide which group an account
//     is, so a sign-up who hasn't followed their link yet is the group's, not the cohort's;
//   - a plan on their team's account: another plan, or the course refunded;
//   - a skill bought on its own, not refunded (D-241).
// A learner who holds nothing at all stays the cohort's, as before: the demo database, which has no plan rows,
// counts exactly as it did. Nothing here names a group, so a group added later works the same.
//
// Read-only, and five small reads, not one per learner: the snapshot route asks on every snapshot.

import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { holdsCourse, isPlanKind } from '@ai/core';
import type { Learner, Outside, OutsideGroup } from '@ai/core';
import { inGroup, normalizeAddress } from '../billing/access-groups';
import type { AccessGroup } from '../billing/access-groups';
import type { Database } from '../db/client';
import { accessGroupMembers, accessGroups, accounts, plans, skillPurchases, users } from '../db/schema';

type Reader = Pick<Database, 'select'>;

/** A learner as this file reads one. */
export type MemberRow = Pick<Learner, 'id' | 'email' | 'teamId'>;

type PlanRow = { kind: string; option: string | null; status: string };

/** Every team's plan rows, from its accounts. Two reads. */
async function plansByTeam(db: Reader): Promise<Map<string, PlanRow[]>> {
  const accts = await db.select({ id: accounts.id, teamId: accounts.teamId }).from(accounts);
  if (!accts.length) return new Map();
  const rows = await db.select({ accountId: plans.accountId, kind: plans.kind, option: plans.option, status: plans.status }).from(plans);
  const teamOf = new Map(accts.map((a) => [a.id, a.teamId]));
  const out = new Map<string, PlanRow[]>();
  for (const { accountId, ...p } of rows) {
    const team = teamOf.get(accountId);
    if (team) out.set(team, [...(out.get(team) ?? []), p]);
  }
  return out;
}

/** The access groups these learners are in by their address, each with the ones in it, by name. Two reads. */
async function groupsOfLearners(db: Reader, learners: readonly MemberRow[], now: number): Promise<OutsideGroup[]> {
  const addresses = [...new Set(learners.map((u) => normalizeAddress(u.email)).filter((a) => a !== ''))];
  if (!addresses.length) return [];
  const all = await db.select().from(accessGroups);
  if (!all.length) return [];
  const listed = await db.select({ groupId: accessGroupMembers.groupId, email: accessGroupMembers.email }).from(accessGroupMembers).where(inArray(accessGroupMembers.email, addresses));
  const onList = new Set(listed.map((l) => `${l.groupId}\n${l.email}`));
  const out: OutsideGroup[] = [];
  for (const g of [...all].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    if (!isPlanKind(g.plan)) continue;
    const group: AccessGroup = { id: g.id, name: g.name, plan: g.plan, emailDomain: g.emailDomain, expiresAt: g.expiresAt };
    const ids = learners
      .filter((u) => {
        const a = normalizeAddress(u.email);
        return inGroup(group, a, onList.has(`${g.id}\n${a}`), now);
      })
      .map((u) => u.id);
    if (ids.length) out.push({ id: g.id, name: g.name, ids });
  }
  return out;
}

/** The learners holding a skill bought on its own, not refunded. One read. */
async function skillBuyers(db: Reader): Promise<Set<string>> {
  const rows = await db
    .select({ userId: skillPurchases.userId })
    .from(skillPurchases)
    .where(and(isNotNull(skillPurchases.userId), isNull(skillPurchases.refundedAt)));
  return new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])));
}

/**
 * Who is outside the course among these learners (the rule at the top), and the access groups they are in. The
 * groups go to staff only: `scopeSnapshot` drops them for everyone else, and a caller that only counts can drop
 * them too (`groups: false`).
 */
export async function outsideOf(db: Reader, learners: readonly MemberRow[], now: number, opts: { groups: boolean }): Promise<Outside> {
  const byTeam = await plansByTeam(db);
  const held = (u: MemberRow) => (u.teamId === null ? [] : (byTeam.get(u.teamId) ?? []));
  const notInCourse = learners.filter((u) => !holdsCourse(held(u)));
  if (!notInCourse.length) return { ids: [], groups: [] };
  const groups = await groupsOfLearners(db, notInCourse, now);
  const grouped = new Set(groups.flatMap((g) => g.ids));
  const bought = await skillBuyers(db);
  const ids = notInCourse.filter((u) => grouped.has(u.id) || held(u).length > 0 || bought.has(u.id)).map((u) => u.id);
  return { ids, groups: opts.groups ? groups : [] };
}

/** Every learner's id, address and team: for a caller without a snapshot loaded. One read. */
export async function learnerRows(db: Reader): Promise<MemberRow[]> {
  return db.select({ id: users.id, email: users.email, teamId: users.teamId }).from(users).where(eq(users.kind, 'learner')).orderBy(users.id);
}
