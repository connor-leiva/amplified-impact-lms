// Who the cookie belongs to — phase 07 § 7.5's `GET /api/me`.
//
//   "`GET /api/me`. Returns `{ viewer: { actor, role }, prefs }`, where role is `agent | owner |
//    admin` for UI routing. Team members who are not the owner get `role: 'learner'` and see Team
//    Hub read-only."
//
// `apps/web/src/data/repository.ts` pins the other half of that shape:
//
//   export type ViewerRole = 'agent' | 'owner' | 'admin' | 'learner';
//   export interface Viewer { actor: Actor; role: ViewerRole }
//
// and `http.test.ts` asserts the repository returns `body.viewer` unchanged, so `{ actor, role }`
// here IS what every screen's routing reads. The union is restated below rather than imported
// because `@ai/api` does not depend on `@ai/web` (and must not — the dependency runs the other
// way); `test/routes.test.ts` asserts the four strings so a change on either side is a red test.
//
// -----------------------------------------------------------------------------------------------
// WHY `role` IS DERIVED FROM `users.role` AND NOT FROM `teams.owner_id`
// -----------------------------------------------------------------------------------------------
// Both columns answer "is this person the owner of their team", and in the seed they agree. They
// can be made to disagree: `setMemberRole` writes `users.role` and nothing writes `teams.owner_id`.
//
// `users.role` wins because it is the column `@ai/core` AUTHORIZES on. `inviteMember` throws
// `forbidden` unless `['Team Owner', 'Operations Lead'].includes(owner.role)`, and `removeMember`,
// `setMemberRole` and `remindMembers` read the same field. If `/api/me` answered from
// `teams.owner_id` instead, a learner could be handed the owner's Team Hub by one source of truth
// and refused every button on it by the other — a screen full of 403s, which is the worst kind of
// permission bug because it looks like a broken API rather than a missing role.
//
// The known gap, and it is a product question rather than a bug: an `Operations Lead` may invite
// and remind per `@ai/core`, but § 7.5 names only the owner, so they get `role: 'learner'` and the
// read-only Team Hub. Flagged for DECISIONS.md rather than decided here.

import { sql } from 'drizzle-orm';
import type { Actor } from '@ai/core';
import type { Database } from '../db/client';
import { users } from '../db/schema';

/** One `users` row — § 7.2's single table for learners and staff, told apart by `kind`. */
export type UserRow = typeof users.$inferSelect;

/** Must stay identical to `apps/web/src/data/repository.ts`'s `ViewerRole`. See the header. */
export type ViewerRole = 'agent' | 'owner' | 'admin' | 'learner';

/** The four, as a value, so a test can sweep them and a `satisfies` can check them. */
export const VIEWER_ROLES = ['agent', 'owner', 'admin', 'learner'] as const satisfies readonly ViewerRole[];

/** § 7.5's `prefs`: what `PATCH /api/me/prefs` writes and `users.prefs` stores. */
export interface ViewerPrefs {
  tz?: string | null;
  theme?: 'light' | 'dark';
}

/** § 7.5's `{ actor, role }`. */
export interface Viewer {
  actor: Actor;
  role: ViewerRole;
}

/**
 * The row as an `@ai/core` `Actor`.
 *
 * The discriminator flips the field name — `userId` for a learner, `staffId` for staff — which is
 * exactly the shape every mutation, `can()` and `scopeSnapshot` destructure.
 */
export const actorOf = (row: UserRow): Actor =>
  row.kind === 'staff' ? { kind: 'staff', staffId: row.id } : { kind: 'learner', userId: row.id };

/** § 7.5's role, for UI routing only. Authorization is `can()` and the mutations, never this. */
export function roleOf(row: UserRow): ViewerRole {
  if (row.kind === 'staff') return 'admin';
  // A Team Owner sees the Team Hub's owner view; anyone else on a team sees it read-only.
  if (row.role === 'Team Owner') return 'owner';
  if (row.teamId !== null && row.teamId !== '') return 'learner';
  // No team at all: an Agent-tier learner, whose portal has no Team Hub.
  return 'agent';
}

export const viewerOf = (row: UserRow): Viewer => ({ actor: actorOf(row), role: roleOf(row) });

/**
 * `users.prefs` as § 7.5's `prefs`, field by field.
 *
 * The column is `jsonb` with a `{}` default, so what comes back is whatever was last written —
 * including `null` from a row inserted before the default existed, and including any key a future
 * writer adds. Reading it field by field means `/api/me` cannot hand the web app a `theme` of
 * `'Dark'` or a `tz` of `47`, either of which reaches `fmt.*` and `data-theme` and breaks a screen
 * in a way that looks like a rendering bug.
 */
export function normalizePrefs(value: unknown): ViewerPrefs {
  if (value === null || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const out: ViewerPrefs = {};
  if (typeof raw.tz === 'string' && raw.tz.trim() !== '') out.tz = raw.tz;
  if (raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  return out;
}

/** The row behind an id, or `null`. */
export async function userById(db: Database, id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(sql`${users.id} = ${id}`).limit(1);
  return row ?? null;
}

/**
 * The row behind an email address, matched case-insensitively.
 *
 * `lower(email) = lower($1)` rather than `email = $1`: a learner who types `Jamie@OrtizHomes.com`
 * into the sign-in form is the same mailbox as `jamie@ortizhomes.com`, and § 7.5's endpoint must
 * not quietly answer "no account" over a shift key. `inviteMember` already compares addresses
 * case-insensitively for the same reason.
 *
 * There is no index on `lower(email)` — the table is one row per seat sold, and this runs twice per
 * sign-in. If `users` ever grows past a sequential scan being free, that index is the fix.
 */
export async function userByEmail(db: Database, email: string): Promise<UserRow | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

/** The address as it is compared and rate-limited: trimmed and lower-cased. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
