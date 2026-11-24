// H-4 (Week 0 launch audit): a reviewed one-off. NOT RUN by the PR that adds it.
//
// Until H-4's fix, spending an emailed sign-in link left an `invited` learner `invited`: a buyer whose
// set-password link lapsed and who used "Email Me a Sign-In Link Instead" could do Week 0, but Join
// refused them ("Accept your invite before joining a session.") and reminders, the digest and
// announcements skipped them. The fix activates them from now on; this activates the ones who already
// signed in before it shipped.
//
// WHO: learners with `status = 'invited'` who have at least one row in `auth_sessions` of their own
// (a masquerade's session, `impersonating` set, is a staff member's and does not count). Each is set
// `active`, and `joined` to now where it is empty (a join date already there is kept), exactly as an
// accepted invite or a set password does.
//
// DRY RUN unless `--apply`. A dry run lists every learner it would change, with the evidence (live
// and total sessions, spent sign-in links, a $37 guest return), and writes nothing. `--apply` also
// needs `--confirm-db <name>`, the database name DATABASE_URL points at, so it cannot run against a
// database nobody meant. It writes in one transaction, re-checks `status = 'invited'` in the UPDATE,
// and appends one `user.activate` row to `audit_log` per learner (append-only; nothing is updated or
// deleted there). Running it twice changes nothing the second time.
//
//   pnpm --filter @ai/api activate:invited                                  # dry run
//   pnpm --filter @ai/api activate:invited --apply --confirm-db <database>  # writes
//
// Prints user and team ids, never a name or an email. Open browsers pick the change up on their next
// refetch (no live broadcast from a terminal).
//
// A learner whose only way in was a $37 guest return (`guest return` = yes, no spent sign-in link)
// has not proven their address by email: Stripe does not verify it. Review those rows before --apply,
// and leave them out with `--skip <user id>` (repeatable) if in doubt.

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';
import type { Database } from './client';
import { authSessions, authTokens, skillPurchases, users } from './schema';
import { audit } from '../console/audit';

export interface InvitedWithSession {
  userId: string;
  teamId: string | null;
  joined: number | null;
  sessions: number;
  liveSessions: number;
  spentSignInLinks: number;
  guestReturn: boolean;
}

/** Every invited learner who has had a session of their own, with the evidence. Reads only. */
export async function invitedWithSession(db: Database, now: number): Promise<InvitedWithSession[]> {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      teamId: users.teamId,
      joined: users.joined,
      sessions: sql<number>`count(${authSessions.id})::int`,
      liveSessions: sql<number>`count(${authSessions.id}) filter (where ${authSessions.expiresAt} > ${new Date(now).toISOString()}::timestamp)::int`,
    })
    .from(users)
    .innerJoin(authSessions, and(eq(authSessions.userId, users.id), isNull(authSessions.impersonating)))
    .where(and(eq(users.kind, 'learner'), eq(users.status, 'invited')))
    .groupBy(users.id)
    .orderBy(users.id);
  if (rows.length === 0) return [];
  const emails = rows.map((r) => r.email.toLowerCase());
  const tokens = await db
    .select({ email: sql<string>`lower(${authTokens.email})`, n: sql<number>`count(*)::int` })
    .from(authTokens)
    .where(and(eq(authTokens.purpose, 'sign_in'), isNotNull(authTokens.usedAt), inArray(sql`lower(${authTokens.email})`, emails)))
    .groupBy(sql`lower(${authTokens.email})`);
  const spent = new Map(tokens.map((t) => [t.email, t.n]));
  const guests = await db
    .select({ userId: skillPurchases.createdUserId })
    .from(skillPurchases)
    .where(and(isNotNull(skillPurchases.guestEnteredAt), inArray(skillPurchases.createdUserId, rows.map((r) => r.userId))));
  const guestIds = new Set(guests.map((g) => g.userId));
  return rows.map((r) => ({
    userId: r.userId,
    teamId: r.teamId,
    joined: r.joined,
    sessions: r.sessions,
    liveSessions: r.liveSessions,
    spentSignInLinks: spent.get(r.email.toLowerCase()) ?? 0,
    guestReturn: guestIds.has(r.userId),
  }));
}

/**
 * Sets each listed learner `active` (and `joined` where empty) if they are still `invited`, and
 * appends one audit row per learner it changed. One transaction. Returns the ids it changed.
 */
export async function activateInvited(db: Database, userIds: readonly string[], now: number): Promise<string[]> {
  if (userIds.length === 0) return [];
  return db.transaction(async (tx) => {
    const changed = await tx
      .update(users)
      .set({ status: 'active', joined: sql`coalesce(${users.joined}, ${now})` })
      .where(and(inArray(users.id, [...userIds]), eq(users.kind, 'learner'), eq(users.status, 'invited')))
      .returning({ id: users.id });
    const ids = changed.map((c) => c.id).sort();
    for (const id of ids) {
      await audit(
        null,
        {
          action: 'user.activate',
          outcome: 'ok',
          actor: { source: 'system', role: 'system:activate-invited' },
          target: { type: 'user', id },
          reason: 'H-4: signed in by link while invited; activated by the reviewed one-off',
          before: { status: 'invited' },
          after: { status: 'active' },
        },
        tx,
      );
    }
    return ids;
  });
}

export function formatInvited(rows: readonly InvitedWithSession[], now: number): string {
  const head = ['user_id', 'team_id', 'joined', 'sessions', 'live_sessions', 'spent_sign_in_links', 'guest_return'];
  const lines = rows.map((r) =>
    [r.userId, r.teamId ?? '', r.joined === null ? '' : new Date(r.joined).toISOString(), r.sessions, r.liveSessions, r.spentSignInLinks, r.guestReturn ? 'yes' : 'no'].join('\t'),
  );
  return [head.join('\t'), ...lines, `${rows.length} invited learners have signed in (as of ${new Date(now).toISOString()}).`].join('\n');
}

function args(argv: readonly string[]): { apply: boolean; confirmDb: string | null; skip: Set<string> } {
  const skip = new Set<string>();
  let confirmDb: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--skip' && argv[i + 1]) skip.add(argv[++i]!);
    else if (argv[i] === '--confirm-db' && argv[i + 1]) confirmDb = argv[++i]!;
  }
  return { apply: argv.includes('--apply'), confirmDb, skip };
}

async function main(): Promise<number> {
  const { getDb, close, readDatabaseUrl, databaseNameOf } = await import('./client');
  const { apply, confirmDb, skip } = args(process.argv.slice(2));
  const database = databaseNameOf(readDatabaseUrl());
  const now = Date.now();
  try {
    const db = getDb();
    const rows = (await invitedWithSession(db, now)).filter((r) => !skip.has(r.userId));
    console.log(`Database: ${database}`);
    console.log(formatInvited(rows, now));
    if (!apply) {
      console.log('Dry run: nothing was written. Re-run with --apply --confirm-db <database> to activate them.');
      return 0;
    }
    if (confirmDb !== database) {
      console.error(`--apply needs --confirm-db ${database} (the database DATABASE_URL points at). Nothing was written.`);
      return 2;
    }
    const changed = await activateInvited(db, rows.map((r) => r.userId), now);
    console.log(`Activated ${changed.length} learners; one user.activate row each in audit_log.`);
    return 0;
  } finally {
    await close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(await main());
}
