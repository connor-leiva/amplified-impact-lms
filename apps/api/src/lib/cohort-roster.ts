// R-5 audit (D-267): the rows behind `@ai/core/cohort-roster`, read once.
//
//   cohortRoster      every cohort's teams and learners by the one rule (a live cohort plan for that cohort, not a test
//                     account, kind learner; Q-23's newest plan decides a team's cohort). `db/io.ts` counts each cohort's
//                     `enrolled` from it, and staff's snapshot carries it.
//   accessGroupViews  each access group (Utah Life) and its people outside every cohort, for People › its tab. Who is in
//                     a group is the address alone (`inGroup`: its exact domain or its list), as #255 had it: verification
//                     decides what a group grants (D-148), not which group an account is, so a sign-up who hasn't
//                     followed their link yet is the group's ("Invite pending"). A member who bought the course is on a
//                     team with a live cohort plan and is that cohort's, not the group's.
//
// Read-only, and a handful of small reads, not one per learner: the snapshot route asks on every snapshot.

import { inArray } from 'drizzle-orm';
import { isPlanKind, rosterOf } from '@ai/core';
import type { AccessGroupMember, AccessGroupView, CohortRoster } from '@ai/core';
import { inGroup, normalizeAddress } from '../billing/access-groups';
import type { AccessGroup } from '../billing/access-groups';
import type { Database } from '../db/client';
import { accessGroupMembers, accessGroups, accounts, plans, users } from '../db/schema';

type Reader = Pick<Database, 'select'>;

/** Every cohort's roster. Three reads. */
export async function cohortRoster(db: Reader): Promise<CohortRoster> {
  const accts = await db.select({ id: accounts.id, teamId: accounts.teamId, ownerUserId: accounts.ownerUserId }).from(accounts);
  const planRows = accts.length
    ? await db.select({ accountId: plans.accountId, kind: plans.kind, status: plans.status, cohortId: plans.cohortId, createdAt: plans.createdAt }).from(plans)
    : [];
  const people = await db.select({ id: users.id, teamId: users.teamId, kind: users.kind, isTest: users.isTest }).from(users);
  return rosterOf({
    accounts: accts,
    plans: planRows.map((p) => ({ ...p, createdAt: Number(p.createdAt) })),
    users: people.map((u) => ({ ...u, isTest: u.isTest === true })),
  });
}

/** The ids of every learner who counts in some cohort. */
export const rosteredIds = (roster: CohortRoster): Set<string> => new Set(Object.values(roster).flatMap((e) => e.learners));

/** Each access group and its people outside every cohort, by the group's name. Three reads. */
export async function accessGroupViews(db: Reader, roster: CohortRoster, now: number): Promise<AccessGroupView[]> {
  const all = await db.select().from(accessGroups);
  if (!all.length) return [];
  const counted = rosteredIds(roster);
  const learners = (
    await db.select({ id: users.id, name: users.name, email: users.email, last: users.last, status: users.status, kind: users.kind }).from(users)
  ).filter((u) => u.kind === 'learner' && !counted.has(u.id));
  const addresses = [...new Set(learners.map((u) => normalizeAddress(u.email)).filter((a) => a !== ''))];
  const listed = addresses.length
    ? await db.select({ groupId: accessGroupMembers.groupId, email: accessGroupMembers.email }).from(accessGroupMembers).where(inArray(accessGroupMembers.email, addresses))
    : [];
  const onList = new Set(listed.map((l) => `${l.groupId}\n${l.email}`));
  const out: AccessGroupView[] = [];
  for (const g of [...all].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    if (!isPlanKind(g.plan)) continue;
    const group: AccessGroup = { id: g.id, name: g.name, plan: g.plan, emailDomain: g.emailDomain, expiresAt: g.expiresAt === null ? null : Number(g.expiresAt) };
    const members = learners
      .filter((u) => {
        const a = normalizeAddress(u.email);
        return inGroup(group, a, onList.has(`${g.id}\n${a}`), now);
      })
      .map(
        (u): AccessGroupMember => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          last: u.last === null ? null : Number(u.last),
          invited: u.status === 'invited',
        }),
      )
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email) || a.userId.localeCompare(b.userId));
    out.push({ id: g.id, name: g.name, emailDomain: g.emailDomain, plan: g.plan, members });
  }
  return out;
}
