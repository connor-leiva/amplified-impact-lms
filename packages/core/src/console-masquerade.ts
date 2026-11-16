// The Admin Console's masquerade rules, PR 3a (D-162, spec § 6). Pure, like the rest of @ai/core: the
// API decides with these (`apps/api/src/console/masquerade.ts`, `auth/guard.ts`) and the web (PR 3b)
// renders the same shapes and limits, so the banner and the server cannot disagree on a minute.
//
// WHAT IT IS. An Owner or Admin sees the LMS as one learner: a real session as that learner, minted
// for the purpose, marked `auth_sessions.impersonating` with the staff member's id. Look-only (D1):
// every write is refused except Extend, Exit and Sign Out, and the Console is paused (D2).
//
// THE CLOCK (D7). 15 minutes from Start; each Extend adds 15, and never past Start + 60.

import { CONSOLE_REASON_MAX, CONSOLE_REASON_MIN, cleanReason } from './console-support';

// ================================================================================================
// Time
// ================================================================================================

const MINUTE = 60_000;

/** D7: a session lasts 15 minutes from Start. */
export const MASQUERADE_DURATION_MS = 15 * MINUTE;
/** D7: each Extend adds 15 minutes. */
export const MASQUERADE_EXTEND_MS = 15 * MINUTE;
/** D7: and never past Start + 60 minutes. */
export const MASQUERADE_MAX_MS = 60 * MINUTE;

/** D8: `masquerade_enabled` is on unless the Owner turns it off (Console PR 9's `console_flags`). */
export const MASQUERADE_ENABLED_DEFAULT = true;

/** A new session's two deadlines. */
export const masqueradeTimes = (startedAt: number): { expiresAt: number; hardExpiresAt: number } => ({
  expiresAt: startedAt + MASQUERADE_DURATION_MS,
  hardExpiresAt: startedAt + MASQUERADE_MAX_MS,
});

/** § 6 rule 3: `min(expires + 15m, start + 60m)`, or null when the session is already at its cap. */
export function extendedExpiry(expiresAt: number, hardExpiresAt: number): number | null {
  if (expiresAt >= hardExpiresAt) return null;
  return Math.min(expiresAt + MASQUERADE_EXTEND_MS, hardExpiresAt);
}

export interface MasqueradeClock {
  expiresAt: number;
  hardExpiresAt: number;
  endedAt: number | null;
}

/** Still running: not ended, and `now` before its expiry. */
export const masqueradeLive = (s: MasqueradeClock, now: number): boolean => s.endedAt === null && now < s.expiresAt;

/** Whether Extend may still be offered: running, and below the 60-minute cap. */
export const masqueradeCanExtend = (s: MasqueradeClock, now: number): boolean =>
  masqueradeLive(s, now) && extendedExpiry(s.expiresAt, s.hardExpiresAt) !== null;

// ================================================================================================
// Reasons, and how a session ends
// ================================================================================================

/** D7: 10 to 500 characters, at Start and at every Extend (the bounds `cleanReason` keeps). */
export const MASQUERADE_REASON_MIN = CONSOLE_REASON_MIN;
export const MASQUERADE_REASON_MAX = CONSOLE_REASON_MAX;
export const cleanMasqueradeReason = cleanReason;

/** Migration 0017's `end_reason` list, in the spec's order. */
export const MASQUERADE_END_REASONS = ['exit', 'expired', 'signed_out', 'revoked'] as const;
export type MasqueradeEndReason = (typeof MASQUERADE_END_REASONS)[number];

/** Where Exit returns staff when Start named no page: the Console's home today. */
export const MASQUERADE_DEFAULT_RETURN = '/admin';
const STARTED_FROM = /^\/admin(?:\/[A-Za-z0-9._~:@%-]+)*\/?$/;
const STARTED_FROM_MAX = 200;

/**
 * Start's `startedFrom`: the Console page the session began on, which Exit returns to (D2). A path on
 * this site under `/admin`, with no query and no `.` or `..` step, 200 characters at most. Undefined when absent; null when
 * present and not such a path (refused, never guessed).
 */
export function cleanStartedFrom(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || v.length > STARTED_FROM_MAX || !STARTED_FROM.test(v)) return null;
  return v.split('/').some((seg) => seg === '.' || seg === '..') ? null : v;
}

// ================================================================================================
// What the API answers
// ================================================================================================

/** Spec § 6's `MasqueradeView`. Times are epoch ms. */
export interface MasqueradeView {
  id: string;
  target: { id: string; name: string; teamName: string | null };
  staff: { id: string; name: string };
  reason: string;
  startedAt: number;
  expiresAt: number;
  hardExpiresAt: number;
  extendCount: number;
  canExtend: boolean;
  startedFrom: string | null;
}

/** `GET /api/console/masquerade/current`: this request's session, and the server's clock for the countdown. */
export interface MasqueradeCurrent {
  session: MasqueradeView | null;
  serverNow: number;
}

/** One row of `GET /api/console/masquerade/sessions`, newest first. */
export interface MasqueradeHistoryRow {
  id: string;
  target: { id: string; name: string | null };
  staff: { id: string; name: string | null };
  reason: string;
  startedAt: number;
  expiresAt: number;
  endedAt: number | null;
  endReason: MasqueradeEndReason | null;
  extendCount: number;
  startedFrom: string | null;
}

// ================================================================================================
// What a masquerade may do (D1, D2), and the GET handlers that write
// ================================================================================================

export const MASQUERADE_PATHS = {
  start: '/api/console/masquerade',
  current: '/api/console/masquerade/current',
  extend: '/api/console/masquerade/extend',
  exit: '/api/console/masquerade/exit',
  sessions: '/api/console/masquerade/sessions',
} as const;

/** § 7.5's sign-out. During a masquerade it is Exit (`signed_out`), then a full sign-out. */
export const SIGN_OUT_PATH = '/api/auth/sign-out';

/** Spec § 6: the only writes a masquerade may make. */
export const MASQUERADE_ALLOWLIST: readonly { method: 'POST'; path: string }[] = [
  { method: 'POST', path: MASQUERADE_PATHS.extend },
  { method: 'POST', path: MASQUERADE_PATHS.exit },
  { method: 'POST', path: SIGN_OUT_PATH },
];

/** Methods that write nothing by HTTP's own rules. */
export const MASQUERADE_SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];

export type MasqueradeGetHandling = 'block' | 'skip' | 'allow';

/**
 * Spec § 6's audit of every API GET handler that writes, or that the spec named as one, and what a
 * masquerade does with each. `block` answers 403 `masquerade_blocked`; `skip` and `allow` run the
 * handler (`skip`: the write it was thought to make is not made during a session). The Console's own
 * GETs are D2's (every one blocked but `current`), not this table's.
 */
export const MASQUERADE_GET_WRITES: readonly { path: string; handling: MasqueradeGetHandling; why: string }[] = [
  { path: '/api/sessions/:id/join', handling: 'block', why: 'Hands out the live Zoom link as the learner: joining is attendance.' },
  { path: '/api/billing/portal', handling: 'block', why: 'Creates a Stripe billing portal session for the learner.' },
  { path: '/api/auth/google', handling: 'block', why: 'Starts a sign-in, which would replace the session.' },
  { path: '/api/auth/google/callback', handling: 'block', why: 'Signs in: a session, Last Active, a verified address and a Google link.' },
  { path: '/api/files/resource/:id', handling: 'skip', why: 'Counts nothing: the count is POST /api/mutate/downloadResource, which the write block refuses.' },
  { path: '/api/files/module/:moduleId/:fileName', handling: 'skip', why: 'Counts nothing; the same as a Vault file.' },
  { path: '/api/skills/:id/download/:kind', handling: 'allow', why: 'Writes nothing but a log line.' },
  { path: '/api/skill-guides/:slug', handling: 'allow', why: 'Writes nothing: no guide view is recorded anywhere.' },
  { path: '/api/events', handling: 'allow', why: 'The event stream (SSE). Writes nothing.' },
];

const BLOCKED_GETS = new Set(MASQUERADE_GET_WRITES.filter((g) => g.handling === 'block').map((g) => g.path));

const CONSOLE_PREFIX = '/api/console/';

/**
 * What a masquerading request may do, by method and route (the route's pattern, as registered:
 * `/api/sessions/:id/join`). D1: every write is refused but the allowlist's three. D2: every Console
 * route is refused but `current`, Extend and Exit. And the GET handlers that write are refused.
 */
export function masqueradeVerdict(method: string, route: string): 'allow' | 'block' {
  const m = method.toUpperCase();
  if (MASQUERADE_ALLOWLIST.some((a) => a.method === m && a.path === route)) return 'allow';
  const safe = MASQUERADE_SAFE_METHODS.includes(m);
  if (route === MASQUERADE_PATHS.current && safe) return 'allow';
  if (route.startsWith(CONSOLE_PREFIX)) return 'block';
  if (!safe) return 'block';
  return m !== 'OPTIONS' && BLOCKED_GETS.has(route) ? 'block' : 'allow';
}
