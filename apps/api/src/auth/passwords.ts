// Passwords (DECISIONS.md D-132): the hash, the rules a new password must meet, and the lockout.
//
// THE HASH IS ARGON2ID, through `@node-rs/argon2` with its defaults (19 MiB, 2 passes, 1 lane:
// OWASP's minimum for argon2id). What is stored is the PHC string, which carries the algorithm,
// the parameters and the salt, so `verify` needs nothing else and stronger parameters later only
// change new hashes. The password itself is never stored, never logged and never returned: it is
// read from the request body, hashed or verified, and dropped.
//
// THE HASH LIVES IN `user_passwords`, not on `users`, so the snapshot, the viewer and every admin
// screen read users without ever loading a hash.
//
// NO ACCOUNT ENUMERATION. A sign-in for an address with no account, or with an account and no
// password, verifies the password against a fixed dummy hash so it takes as long as a real
// mismatch, counts a failure against that address the same way, and answers with the same words.
// The lockout is keyed by a sha256 of the address typed, never by a user id, so an address with
// no account locks exactly like one with an account.
//
// THE LOCKOUT. `LOCK_AFTER` failures inside `FAILURE_WINDOW_MS` lock the address for `LOCK_MS`.
// While locked, the password is not even checked (a correct guess during the lock still fails,
// so the lock cannot be used to confirm a guess). A successful sign-in clears the count. The
// route's own per-IP rate limit (routes/auth.ts) bounds one host trying many addresses.

import { createHash } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { loginFailures, userPasswords } from '../db/schema';

/** The shortest password accepted. NIST SP 800-63B asks for at least 8; 10 leaves a margin. */
export const PASSWORD_MIN = 10;
/** The longest, so a megabyte "password" cannot be used to make the server hash a megabyte. */
export const PASSWORD_MAX = 200;

/** The words a person sees for a password that will not do, or null when it will. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  if (!password.trim()) return 'Use some characters that aren’t spaces.';
  return null;
}

export const hashPassword = (password: string): Promise<string> => argonHash(password);

/** True only for a stored hash this password matches. A malformed hash is a mismatch, not a throw. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(stored, password);
  } catch {
    return false;
  }
}

/**
 * A hash of nothing anyone knows, made once, so a sign-in with no account to check against still
 * spends one argon2 verify. Its password is random and thrown away.
 */
let dummy: Promise<string> | null = null;
const dummyHash = (): Promise<string> => (dummy ??= argonHash(createHash('sha256').update(String(Math.random())).digest('hex')));

/** Spend the time a real verify would, and fail. */
export async function burnVerify(password: string): Promise<false> {
  await verifyPassword(await dummyHash(), password);
  return false;
}

/** The stored hash for a user, or null when they have never set a password. */
export async function passwordHashOf(db: Pick<Database, 'select'>, userId: string): Promise<string | null> {
  const [row] = await db.select({ hash: userPasswords.hash }).from(userPasswords).where(eq(userPasswords.userId, userId)).limit(1);
  return row?.hash ?? null;
}

export const hasPassword = async (db: Pick<Database, 'select'>, userId: string): Promise<boolean> => (await passwordHashOf(db, userId)) !== null;

/** Set (or replace) a user's password. The caller has already checked `passwordProblem`. */
export async function storePassword(db: Pick<Database, 'insert'>, userId: string, password: string, now: number): Promise<void> {
  const hash = await hashPassword(password);
  await db
    .insert(userPasswords)
    .values({ userId, hash, updatedAt: new Date(now) })
    .onConflictDoUpdate({ target: userPasswords.userId, set: { hash, updatedAt: new Date(now) } });
}

// --- the lockout ----------------------------------------------------------------------------------

/** Failures that lock an address. */
export const LOCK_AFTER = 5;
/** The window those failures have to fall in. */
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
/** How long the lock lasts. */
export const LOCK_MS = 15 * 60 * 1000;

/** The lockout's key for an address as typed: sha256 of the normalized address, never the address. */
export const failureKey = (email: string): string => createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');

/** When the address's lock ends, or null when it is not locked. */
export async function lockedUntil(db: Pick<Database, 'select'>, email: string, now: number): Promise<number | null> {
  const [row] = await db.select().from(loginFailures).where(eq(loginFailures.key, failureKey(email))).limit(1);
  const until = row?.lockedUntil?.getTime() ?? null;
  return until !== null && until > now ? until : null;
}

/**
 * Count one failure. A window that has run out starts again at 1; the `LOCK_AFTER`th failure inside
 * the window locks the address for `LOCK_MS`. The row is locked while it is read and written, so two
 * failures at once both count.
 */
export async function recordFailure(db: Database, email: string, now: number): Promise<void> {
  const key = failureKey(email);
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(loginFailures).where(eq(loginFailures.key, key)).for('update').limit(1);
    const fresh = !row || row.firstAt.getTime() < now - FAILURE_WINDOW_MS;
    const failures = fresh ? 1 : row.failures + 1;
    const firstAt = new Date(fresh ? now : row.firstAt.getTime());
    const lockedUntil = failures >= LOCK_AFTER ? new Date(now + LOCK_MS) : fresh ? null : (row.lockedUntil ?? null);
    await tx
      .insert(loginFailures)
      .values({ key, failures, firstAt, lockedUntil })
      .onConflictDoUpdate({ target: loginFailures.key, set: { failures, firstAt, lockedUntil } });
  });
}

/** A successful sign-in, or a new password: the address starts clean. */
export async function clearFailures(db: Pick<Database, 'delete'>, email: string): Promise<void> {
  await db.delete(loginFailures).where(eq(loginFailures.key, failureKey(email)));
}
