// Access groups (DECISIONS.md D-148): a plan's entitlement at no charge, for a group's people, by their
// verified email address. The first is `utah-life` (Connor, 2026-11-12): every agent with a verified
// @liveutah.com address holds the Amplified Agent Plan's skills, today's and every one released later.
//
// WHO IS IN A GROUP. An address whose domain is the group's `email_domain` EXACTLY (`liveutah.com`,
// compared lower-cased: not `x.liveutah.com`, not `liveutah.com.evil.com`, not `notliveutah.com`), or
// one listed in `access_group_members` (trimmed and lower-cased). A group past its `expires_at` has
// nobody in it.
//
// ONLY A VERIFIED ADDRESS. Anyone can type an @liveutah.com address. A group grants nothing until the
// address is in `email_verifications`: its owner spent a link emailed to it (`claimToken`: a sign-in
// link, an invite, a set or reset password link), or Google verified an address in a group's domain
// (`routes/google.ts`, D-149). The welcome page's checkout button never writes it.
//
// WHAT IT GRANTS. One more plan in the access rule's list, of the group's kind, started and paid
// through for good, so `canOpenSkill` treats a member exactly as a buyer of that plan (the Agent Plan:
// the agent set and `both`), and a skill released later opens for them with no change here. Worked
// out on every request and never stored, so taking someone off removes the access on their next one.
//
// NOT A CUSTOMER. A member who has no account gets one the way an Agent Plan buyer does (the owner of a
// team of one, Agent tier, `provisionGroupMember`), but no account, order or plan row and nothing in
// Stripe: they are not a paid seat and not counted against any cap. Nothing here sends an email.

import { eq, sql } from 'drizzle-orm';
import { provisionOwner } from '@ai/core';
import type { Database } from '../db/client';
import { loadDb, persistDiff } from '../db/io';
import type { Queryable } from '../db/io';
import { accessGroupMembers, accessGroups, emailVerifications } from '../db/schema';
import { randomIds } from '../lib/clock';
import type { PlanAccess } from './access';
import { COHORT_ONE } from './catalog';
import type { PlanKind } from './catalog';

/** A group as the rule reads it. */
export interface AccessGroup {
  id: string;
  name: string;
  plan: PlanKind;
  emailDomain: string | null;
  expiresAt: number | null;
}

/** What a member sees: the group's id and its name ("Utah Life"). */
export interface GroupMembership {
  id: string;
  name: string;
}

/** "Paid through" for good: later than any skill's release, so every release opens. */
export const GROUP_FOREVER = Number.MAX_SAFE_INTEGER;

/** An address as stored and compared: trimmed and lower-cased. */
export const normalizeAddress = (email: string): string => email.trim().toLowerCase();

/** The address's domain, lower-cased: everything after its one `@`. Null for anything else. */
export function emailDomainOf(email: string): string | null {
  const e = normalizeAddress(email);
  const at = e.indexOf('@');
  if (at <= 0 || at !== e.lastIndexOf('@') || at === e.length - 1) return null;
  return e.slice(at + 1);
}

/** Whether an address is in a group: its exact domain, or its list. Ignores verification. */
export function inGroup(group: AccessGroup, email: string, listed: boolean, now: number): boolean {
  if (group.expiresAt !== null && now >= group.expiresAt) return false;
  if (listed) return true;
  const domain = group.emailDomain?.trim().toLowerCase();
  return !!domain && emailDomainOf(email) === domain;
}

/** The plan a group grants, as the access rule reads plans: started, never ending, paid for good. */
export function groupGrant(group: AccessGroup): PlanAccess {
  return { kind: group.plan, status: 'active', paidThrough: GROUP_FOREVER, liveUntil: null };
}

/** Every group an address is in, verified or not. */
export async function groupsOf(db: Database, email: string, now: number): Promise<AccessGroup[]> {
  const address = normalizeAddress(email);
  const [all, listed] = await Promise.all([
    db.select().from(accessGroups),
    db.select({ groupId: accessGroupMembers.groupId }).from(accessGroupMembers).where(eq(accessGroupMembers.email, address)),
  ]);
  const onList = new Set(listed.map((r) => r.groupId));
  return all
    .map((g): AccessGroup => ({ id: g.id, name: g.name, plan: g.plan as PlanKind, emailDomain: g.emailDomain, expiresAt: g.expiresAt }))
    .filter((g) => inGroup(g, address, onList.has(g.id), now));
}

/**
 * The groups an address is in by its DOMAIN alone (the exact, case-insensitive rule above), not by
 * the list. Google sign-in (D-149) proves an inbox for these only.
 */
export async function domainGroupsOf(db: Database, email: string, now: number): Promise<AccessGroup[]> {
  const address = normalizeAddress(email);
  const all = await db.select().from(accessGroups);
  return all
    .map((g): AccessGroup => ({ id: g.id, name: g.name, plan: g.plan as PlanKind, emailDomain: g.emailDomain, expiresAt: g.expiresAt }))
    .filter((g) => inGroup(g, address, false, now));
}

/** Whether the address's owner has spent a link emailed to it, or Google verified it (D-149). */
export async function isVerified(db: Database, email: string): Promise<boolean> {
  const [row] = await db.select({ email: emailVerifications.email }).from(emailVerifications).where(eq(emailVerifications.email, normalizeAddress(email))).limit(1);
  return !!row;
}

/** Record that the address's owner proved it (a spent link, or Google for a group's domain). Keeps the first time. */
export async function recordVerified(db: Pick<Database, 'insert'>, email: string, now: number): Promise<void> {
  await db.insert(emailVerifications).values({ email: normalizeAddress(email), verifiedAt: now }).onConflictDoNothing();
}

/**
 * What an address's groups add to the access rule: their plans, and the groups to name on screen.
 * Nothing for an address that is not verified.
 */
export async function groupAccessOf(db: Database, email: string, now: number): Promise<{ plans: PlanAccess[]; groups: GroupMembership[] }> {
  const groups = await groupsOf(db, email, now);
  if (!groups.length || !(await isVerified(db, email))) return { plans: [], groups: [] };
  return { plans: groups.map(groupGrant), groups: groups.map(({ id, name }) => ({ id, name })) };
}

const lock = (tx: { execute: Database['execute'] }) => tx.execute(sql`select pg_advisory_xact_lock(42)`);

/** A transaction the group-member insert can run inside. The pool's own transaction is one. */
type GroupWriter = Queryable & { execute: Database['execute'] };

/**
 * The account a group member gets, written on the caller's transaction: the owner of a team of one,
 * Agent tier, in cohort one, `invited` until they sign in (`provisionOwner`, the same call
 * `provisionGroupMember` makes). No account, order or plan row, and no email. `name` empty is how a
 * self-serve sign-up is stored: the address stands in until they have another. Returns the user id,
 * or null when core refuses (a staff address, or someone already on another owner's team).
 */
export async function createGroupMember(tx: GroupWriter, email: string, now: number, name = ''): Promise<string | null> {
  const address = normalizeAddress(email);
  await lock(tx);
  const before = await loadDb(tx);
  const owner = provisionOwner(before, { email: address, name, teamName: '', seats: 1, tier: 'agent', cohortId: COHORT_ONE.id }, { now, id: randomIds() });
  if (!owner.ok) return null;
  if (owner.db !== before) await persistDiff(tx, before, owner.db);
  return owner.userId;
}

/**
 * An account for a group member who has none, made the way an Agent Plan buyer's is (`provisionOrder`):
 * `createGroupMember` under the same lock as every mutation. Returns the user id, or null when core
 * refuses (a staff address, or someone already on another owner's team).
 */
export async function provisionGroupMember(db: Database, email: string, now: number, name = ''): Promise<string | null> {
  return db.transaction(async (tx) => createGroupMember(tx, email, now, name));
}
