// The confirm token of the Console's Billing actions (D-164, spec § 7.6): an HMAC over the action, its
// parameters, the staff member and the expiry, keyed from `readSessionSecret()` (`auth/secret.ts`), so
// no new secret or variable exists for it. Valid 5 minutes.
//
//   v1.<base64url(JSON claims)>.<base64url(HMAC-SHA256(key, "v1." + claims))>
//
// The key is not the session secret itself but an HMAC of it with this file's own label, so a confirm
// token and a signed cookie can never be swapped for each other. The claims are not secret (an invoice
// id, an amount, the staff member's id, the time and the audit row's id), and the browser holds them
// only to hand them back. Anything changed in them breaks the signature: 403 `confirm_invalid`. A
// token for another action or another staff member is `confirm_invalid` too; one past its expiry, and
// otherwise genuine, is 410 `confirm_expired`.
//
// The Stripe idempotency key is `console-` + sha256(token), so the same confirmation can reach Stripe
// any number of times and change it once. Neither the token nor that key is ever logged or audited.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { BILLING_ACTIONS } from '@ai/core';
import type { BillingAction } from '@ai/core';
import { readSessionSecret } from '../auth/secret';

const VERSION = 'v1';
const LABEL = 'amplified-impact console confirm v1';

export interface ConfirmClaims {
  act: BillingAction;
  /** The action's parameters, as the preview read them from Stripe. */
  p: Record<string, string | number | null>;
  /** The staff member's user id. */
  sub: string;
  /** Epoch ms. */
  exp: number;
  /** The audit row's id, reserved at the preview: the refund's `console_audit_id`. */
  aid: number;
}

const b64u = (b: Buffer): string => b.toString('base64url');
const key = (): Buffer => createHmac('sha256', readSessionSecret()).update(LABEL).digest();
const mac = (body: string): Buffer => createHmac('sha256', key()).update(body).digest();

export function signConfirm(claims: ConfirmClaims): string {
  const body = `${VERSION}.${b64u(Buffer.from(JSON.stringify(claims), 'utf8'))}`;
  return `${body}.${b64u(mac(body))}`;
}

export type ConfirmCheck = { ok: true; claims: ConfirmClaims } | { ok: false; code: 'confirm_invalid' | 'confirm_expired'; claims?: ConfirmClaims };

const TOKEN = /^v1\.[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{43}$/;

function claimsOf(raw: unknown): ConfirmClaims | null {
  const c = raw as Partial<ConfirmClaims> | null;
  if (!c || typeof c !== 'object') return null;
  if (!(BILLING_ACTIONS as readonly string[]).includes(c.act as string)) return null;
  if (typeof c.sub !== 'string' || typeof c.exp !== 'number' || !Number.isSafeInteger(c.aid) || !c.p || typeof c.p !== 'object') return null;
  return c as ConfirmClaims;
}

/**
 * The token's claims when it is genuine, for this action and this staff member, and not expired. The
 * signature is compared in constant time before anything in the token is believed.
 */
export function verifyConfirm(token: unknown, expect: { act: BillingAction; sub: string; now: number }): ConfirmCheck {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { ok: false, code: 'confirm_invalid' };
  const at = token.lastIndexOf('.');
  const body = token.slice(0, at);
  const given = Buffer.from(token.slice(at + 1), 'base64url');
  const want = mac(body);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return { ok: false, code: 'confirm_invalid' };
  let claims: ConfirmClaims | null;
  try {
    claims = claimsOf(JSON.parse(Buffer.from(body.slice(VERSION.length + 1), 'base64url').toString('utf8')));
  } catch {
    claims = null;
  }
  if (!claims || claims.act !== expect.act || claims.sub !== expect.sub) return { ok: false, code: 'confirm_invalid' };
  if (expect.now >= claims.exp) return { ok: false, code: 'confirm_expired', claims };
  return { ok: true, claims };
}

/** Spec § 7.6: the Stripe idempotency key, `console-` + sha256(token). */
export const idempotencyKeyOf = (token: string): string => `console-${createHash('sha256').update(token).digest('hex')}`;
