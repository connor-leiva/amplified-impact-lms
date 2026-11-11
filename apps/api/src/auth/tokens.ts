// Magic-link tokens — phase 07 § 7.5.
//
//   "it emails a sign-in link `${APP_URL}/sign-in?token=…` that is valid for 15 minutes and stores
//    `sha256(token)`" … "Invites (`inviteMember`, `inviteStaff`) create `purpose:'invite'` tokens
//    valid for 7 days."
//
// Three rules, and every one of them is a rule about what is NOT here.
//
// 1. THE DATABASE NEVER HOLDS THE TOKEN. `auth_tokens.token_hash` is the primary key and there is
//    no column for the token itself. A magic link is a bearer credential: anyone holding the
//    string is the account. A dump of `auth_tokens` — a backup on a laptop, a `select *` pasted
//    into a ticket, a replica somebody forgot about — must not be a list of working sign-ins, and
//    with only the sha256 it is not, because sha256 is not invertible and the token is 256 bits of
//    `randomBytes`, so there is nothing to guess and no dictionary to run.
//
//    This is also why `mintToken` returns the raw string and nothing else stores it: the only copy
//    that ever exists outside the recipient's inbox is the one in the email body, and the caller
//    is expected to hand it straight to the transport.
//
// 2. THE TOKEN IS URL-SAFE WITHOUT ENCODING. It travels as `?token=…` and as `/invite/:token`, and
//    `base64url` has no `+`, `/` or `=` to be mangled by a mail client that re-wraps a link, by a
//    proxy that re-encodes a query string, or by the one path segment that is not percent-decoded
//    somewhere in the stack. `templates/links.ts` encodes it anyway; this makes that a no-op rather
//    than a thing to get right twice.
//
// 3. THE COMPARISON IS CONSTANT TIME, even though the thing compared is already a hash.
//
//    The lookup is `where token_hash = $1`, and Postgres's own comparison is not constant time —
//    but what it compares is the HASH, so a timing leak there leaks information about a sha256
//    digest, which cannot be walked back to a token. The constant-time compare below is therefore
//    belt and braces rather than the load-bearing defence, and it is here for a specific reason:
//    it makes the rule visible at the point where somebody might later "simplify" the lookup to
//    fetch a row by email and compare the token itself, which WOULD be a leak. `sameHash` is the
//    only comparison in this module, so there is no second path to get wrong.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * § 7.2's `auth_tokens.purpose` enum, and D-132's two password links: `set_password` (an account
 * with no password yet: a checkout's buyer, or anyone who asks; 72 hours) and `reset_password`
 * ("Forgot password?" for an account that has one; 1 hour). Both are single use, like the rest.
 */
export type TokenPurpose = 'sign_in' | 'invite' | 'set_password' | 'reset_password';

/** § 7.5: "valid for 15 minutes". */
export const SIGN_IN_TTL_MS = 15 * 60 * 1000;

/** § 7.5: "`purpose:'invite'` tokens valid for 7 days". */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** D-132: "Set your password" links last 72 hours. */
export const SET_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000;

/** D-132: "Forgot password?" links last 1 hour. */
export const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;

/** How long a freshly minted token of each purpose is good for. */
export const TTL_MS: Record<TokenPurpose, number> = {
  sign_in: SIGN_IN_TTL_MS,
  invite: INVITE_TTL_MS,
  set_password: SET_PASSWORD_TTL_MS,
  reset_password: RESET_PASSWORD_TTL_MS,
};

/** The instant a token minted at `now` stops working. */
export const expiryFor = (purpose: TokenPurpose, now: number): Date => new Date(now + TTL_MS[purpose]);

/**
 * Bytes of entropy per token. 32 bytes is 256 bits, which makes the 43-character `base64url`
 * string below unguessable at any rate a rate limiter would ever let through, so the token itself
 * — not an expiry, not a lockout — is the thing that keeps `/api/auth/verify` safe to leave open.
 */
export const TOKEN_BYTES = 32;

/** A new magic-link token. The ONLY copy; hash it for storage and email the rest. */
export const mintToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

/** § 7.5's `sha256(token)`, lower-case hex — what goes in `auth_tokens.token_hash`. */
export const hashToken = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * Constant-time equality for two hex digests.
 *
 * `timingSafeEqual` throws when the buffers differ in length, which for two sha256 hex strings
 * only happens if one of them is not a sha256 hex string — so the length check is a guard against
 * a crash, not an early-out that leaks anything a caller could use: both operands here are
 * digests, never secrets (see the header, rule 3).
 */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
