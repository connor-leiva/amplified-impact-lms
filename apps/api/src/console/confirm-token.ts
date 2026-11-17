// The Console's two-step confirm (D-160 R2-3b; spec § 7: "confirm tokens"). A preview answers what a
// write would change and a signed token naming exactly that; the write takes only the token back. So
// what the Owner confirmed is what happens: the action, its subject, the before and after, who asked,
// and until when, all under one HMAC. Nothing is stored; the write re-reads the current state and
// refuses a stale `before` (409), so a token replayed after its change already happened does nothing.
//
//   token = base64url(JSON claims) "." base64url(HMAC-SHA256(key, that first part))
//
// The key is derived from `SESSION_SECRET` (`auth/secret.ts`) with a fixed label, so the cookie key
// itself never signs anything else, and a confirm token can never pass as a cookie signature or the
// other way round. A bad token is 403 `confirm_invalid`; one past its time is 410 `confirm_expired`.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readSessionSecret } from '../auth/secret';

const LABEL = 'ai-console-confirm-v1';

const keyOf = (): Buffer => createHmac('sha256', readSessionSecret()).update(LABEL).digest();
const sign = (body: string): Buffer => createHmac('sha256', keyOf()).update(body).digest();

/** What every confirm token carries; each action adds the subject it confirms. */
export interface ConfirmClaims {
  /** The audit action the token confirms (`permission.change`). */
  action: string;
  /** The staff member who previewed it: only they can confirm it. */
  actor: string;
  /** Epoch ms. */
  exp: number;
}

export function signConfirm<T extends ConfirmClaims>(claims: T): string {
  const body = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${body}.${sign(body).toString('base64url')}`;
}

export type ConfirmCheck<T> = { ok: true; claims: T } | { ok: false; code: 'confirm_invalid' | 'confirm_expired' };

/**
 * The claims of a token this server signed for `action` and `actor`, unexpired at `now`. Anything
 * else is `confirm_invalid`: not a string, malformed, a signature that doesn't match, another action,
 * another staff member. Only a genuine token past its time is `confirm_expired`.
 */
export function verifyConfirm<T extends ConfirmClaims>(token: unknown, expected: { action: string; actor: string }, now: number): ConfirmCheck<T> {
  const invalid = { ok: false, code: 'confirm_invalid' } as const;
  if (typeof token !== 'string' || token.length > 2048) return invalid;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return invalid;
  const [body, mac] = parts as [string, string];
  const given = Buffer.from(mac, 'base64url');
  const want = sign(body);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return invalid;
  let claims: T;
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return invalid;
  }
  if (!claims || typeof claims !== 'object' || claims.action !== expected.action || claims.actor !== expected.actor || typeof claims.exp !== 'number')
    return invalid;
  if (now > claims.exp) return { ok: false, code: 'confirm_expired' };
  return { ok: true, claims };
}
