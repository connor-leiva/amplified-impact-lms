// Absolute links for § 8.1's emails.
//
// An email has no document to resolve a relative href against, so `/sessions` in an inbox is dead
// text. Every link a template renders therefore goes through `absolute()`, and the base is
// validated rather than assumed.
//
// The base is `APP_URL`, which is the variable phase 07 § 7.5 already names:
// "it emails a sign-in link `${APP_URL}/sign-in?token=…`". It is read here per render rather than
// at import, so a process that sets it late (or a test that points it elsewhere) is not baked in.
//
// `absolute()` THROWS when the base is missing or not absolute. That looks harsh for an email, but
// it is the right failure: `transport.send` catches a template throw, logs
// `template render threw: …` with the template's name and reports `{ok: false}` without sending
// (see transport.ts, decision 1), so a misconfigured deploy produces a named error in the log
// instead of thousands of emails whose only button goes nowhere. A silent empty href would reach
// an inbox looking perfectly fine.

/**
 * The routes the templates link to: the first learner portal's addresses. Since D-182 each redirects to
 * the learner portal's page for it (`apps/web/src/routes/learn/redirects.tsx`: `/` to /learn, `/sessions`
 * to /learn/schedule, `/team` to /learn/team), so emails already in inboxes keep working.
 */
export const ROUTES = {
  dashboard: '/',
  sessions: '/sessions',
  team: '/team',
} as const;

/**
 * Phase 07 § 7.5: the sign-in link is `${APP_URL}/sign-in?token=…`. With `next` (D-151), a guided setup
 * in learn the sign-in screen goes on to once signed in: `…&next=/skill-library/<page>`.
 */
export const signInPath = (token: string, next?: string | null): string =>
  `/sign-in?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ''}`;

/** D-132: a set-password or reset link, `${APP_URL}/set-password?token=…`. */
export const setPasswordPath = (token: string): string => `/set-password?token=${encodeURIComponent(token)}`;

/** Phase 07 § 7.5: "`/invite/:token` verifies the token … and signs the user in". */
export const invitePath = (token: string): string => `/invite/${encodeURIComponent(token)}`;

/** The AI Employee page (`/employees/:id`); since D-182 a course week's goes to its week, /learn/week/:n. */
export const employeePath = (moduleId: string): string => `/employees/${encodeURIComponent(moduleId)}`;

/** `http://` or `https://`, a host, and optionally a path prefix. Nothing else is a usable base. */
const ABSOLUTE = /^https?:\/\/[^\s/]+(\/\S*)?$/;

/**
 * Resolves the base once per render: the payload's `appUrl` if the caller passed one, otherwise
 * `APP_URL` from the environment.
 *
 * The payload wins so that a caller which already knows the origin (a request handler reading
 * `Host`, a staging smoke test) does not have to mutate `process.env` to say so.
 */
export function appBase(appUrl?: string | null | undefined): string {
  const raw = (appUrl ?? process.env.APP_URL ?? '').trim();
  if (!raw) {
    throw new Error('APP_URL is not set, so an email link cannot be made absolute');
  }
  if (!ABSOLUTE.test(raw)) {
    throw new Error(`APP_URL is not an absolute http(s) URL: ${JSON.stringify(raw)}`);
  }
  return raw.replace(/\/+$/, '');
}

/**
 * `appBase(appUrl) + path`.
 *
 * Concatenation, not `new URL(path, base)`: `new URL('/sessions', 'https://host/lms')` resolves to
 * `https://host/sessions` and would silently drop a sub-path deployment's prefix. Every `path` here
 * is one of the constants above, so it always starts with a `/` and never needs resolving.
 */
export function absolute(path: string, appUrl?: string | null | undefined): string {
  return `${appBase(appUrl)}${path}`;
}
