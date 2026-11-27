// R-5 audit (D-267, Connor, Nov 26): People › an access group's tab (Utah Life), read-only. PURE.
//
// The mockup's `Groups` (handoff/admin-mockup/ia-screens.jsx), as Connor asked for it: its description, Find, and its
// Agents table with each person (their name, or the group's agent line, over their address) and when they were last
// active, or "Invite pending" for a sign-up who hasn't followed their link. A row opens the person. Its facts, its
// cards, Export and the two access actions are Phase 7's and are not drawn.
//
// The group and its people are staff's snapshot's (`Db.groups`, `apps/api/src/lib/cohort-roster.ts`): the learners in it
// by their address who count in no cohort. Its name, domain and plan are the group's record; nothing here names one.

import { CONSOLE_PLAN_LABELS, adminStamp, isPlanKind } from '@ai/core';
import type { AccessGroupMember, AccessGroupView, Db } from '@ai/core';

export const ACCESS_GROUP_COPY = {
  find: 'Find an agent by email',
  table: 'Agents',
  agent: 'Agent',
  last: 'Last active',
  pending: 'Invite pending',
  never: 'Never',
  empty: 'No agents yet',
  counted: 'They are counted here: not in a cohort, not as teams, and not in revenue.',
} as const;

export interface AccessGroupRow {
  id: string;
  /** Their name, or "Utah Life agent" for someone who has given none (the mockup's line). */
  name: string;
  email: string;
  /** "Dec 10, 8:02 AM", "Invite pending" or "Never". */
  last: string;
  lastAt: number;
}

export interface AccessGroupVM {
  name: string;
  /** "Agents with a liveutah.com address get the Agent Plan's skills at no charge. They are counted here: …" */
  description: string;
  rows: AccessGroupRow[];
  total: number;
}

/** The group's own words: who is in it, and what it grants, from its record. */
export function groupDescription(g: Pick<AccessGroupView, 'emailDomain' | 'plan'>): string {
  const plan = isPlanKind(g.plan) ? CONSOLE_PLAN_LABELS[g.plan] : g.plan;
  const who = g.emailDomain ? `Agents with a ${g.emailDomain} address` : 'Agents on its list';
  return `${who} get the ${plan}’s skills at no charge. ${ACCESS_GROUP_COPY.counted}`;
}

const rowOf = (g: AccessGroupView, m: AccessGroupMember): AccessGroupRow => ({
  id: m.userId,
  name: m.name || `${g.name} agent`,
  email: m.email,
  last: m.invited ? ACCESS_GROUP_COPY.pending : m.last !== null ? adminStamp(m.last) : ACCESS_GROUP_COPY.never,
  lastAt: m.last ?? 0,
});

/** The tab of the group `groupId`, filtered by `q` (a name or an address), or null for a group the snapshot doesn't hold. */
export function accessGroupVM(db: Pick<Db, 'groups'>, groupId: string, q = ''): AccessGroupVM | null {
  const g = (db.groups ?? []).find((x) => x.id === groupId);
  if (!g) return null;
  const ql = q.trim().toLowerCase();
  const rows = g.members.filter((m) => !ql || `${m.name} ${m.email}`.toLowerCase().includes(ql)).map((m) => rowOf(g, m));
  return { name: g.name, description: groupDescription(g), rows, total: g.members.length };
}
