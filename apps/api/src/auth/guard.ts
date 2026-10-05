// The two preHandlers every protected route shares — phase 07 § 7.3's `requireSession`, and
// § 9.4's CSRF rule.
//
// -----------------------------------------------------------------------------------------------
// WHAT 401 MEANS HERE, AND WHY IT IS THE ONLY ANSWER
// -----------------------------------------------------------------------------------------------
// Gate 7: "An unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*` and
// `/api/events` returns 401." Every way of not being signed in collapses to the same 401 and the
// same body: no cookie, a cookie with a bad signature, a session id that was never issued, an
// expired row, a row whose user has since been deleted. They are told apart in the log and nowhere
// else — distinguishing them in the response would tell an attacker which session ids exist.
//
// `apps/web/src/data/http.ts` turns a 401 into `location.assign('/sign-in')` and nothing else, so
// the body is only ever read by a test; `{ error: 'Not signed in' }` is what `http.test.ts` mocks.
//
// -----------------------------------------------------------------------------------------------
// § 9.4's CSRF RULE: "every mutation requires `content-type: application/json` and a matching
// `Origin` header"
// -----------------------------------------------------------------------------------------------
// The content-type requirement is the half that actually does the work, and it is worth being
// precise about why. A cross-site CSRF POST has to come from something an attacker can put on
// their own page, and the only cross-origin POST a browser will send without a preflight is an
// HTML `<form>`, which can send exactly three content types: `application/x-www-form-urlencoded`,
// `multipart/form-data` and `text/plain`. None of them is `application/json`. Anything that CAN
// send `application/json` cross-origin — `fetch`, `XMLHttpRequest` — triggers a CORS preflight,
// and this API registers no CORS plugin, so the preflight is never answered and the request never
// leaves the browser. Requiring the content-type therefore closes the hole on its own.
//
// The Origin half is checked STRICTLY WHEN PRESENT and not required to be present, which is a
// deliberate departure from the literal sentence:
//
//   - A browser always sends `Origin` on a POST (the Fetch standard omits it only for same-origin
//     GET and HEAD), so for the attack this rule exists to stop, "present" is guaranteed and the
//     check is strict.
//   - "Absent" therefore means a non-browser client: `curl`, a deploy smoke test, and
//     `app.inject`, which is how every test in this repository and Gate 7's own oracle snippet
//     (`app.inject({ method: 'POST', url: …, headers: { cookie }, payload: c.args })`) calls a
//     mutation. A non-browser client has no ambient cookie to be ridden, so it is not a CSRF
//     vector — and requiring the header would turn the entire Gate 7 oracle red for a reason that
//     has nothing to do with what it tests.
//
// Flagged for DECISIONS.md as a deviation from § 9.4's wording. `test/routes.test.ts` pins all
// three arms: a mismatched Origin is 403, a non-JSON content-type is 415, and an absent Origin is
// allowed through.
//
// ORDER MATTERS, AND IT IS `requireSession` FIRST. The route lists these as
// `[requireSession, requireJsonSameOrigin]`, so an unauthenticated mutation answers 401 rather
// than 415 or 403 — which is what Gate 7's authorization matrix asserts. Checking CSRF first would
// be marginally better security hygiene (reject before touching the database) and would make that
// checklist line conditional on which header the test happened to send.

import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { getDb } from '../db/client';
import { clock } from '../lib/clock';
import { clearCookieOptions, deleteSession, needsRoll, readSession, rollSession, SESSION_COOKIE } from './sessions';
import { normalizePrefs, userById, viewerOf } from './viewer';
import type { UserRow, Viewer, ViewerPrefs } from './viewer';

/** Everything a route handler needs about the signed-in viewer, resolved once per request. */
export interface SessionViewer extends Viewer {
  /** The `auth_sessions.id` the cookie carried — what `POST /api/auth/sign-out` deletes. */
  sessionId: string;
  user: UserRow;
  prefs: ViewerPrefs;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireSession`; `null` on every route that does not use it. */
    viewer: SessionViewer | null;
  }
}

/**
 * Add the `viewer` slot. Called once in `build()`.
 *
 * `null` rather than an object: Fastify shares a decorator's initial value across every request, so
 * a mutable object default would be one object shared by all of them.
 */
export function decorateViewer(app: FastifyInstance): void {
  app.decorateRequest('viewer', null);
}

const unauthorized = (reply: FastifyReply): FastifyReply => reply.code(401).send({ error: 'Not signed in' });

/**
 * § 7.3's `preHandler: requireSession`.
 *
 * Resolves the cookie to a live `auth_sessions` row and a live `users` row, puts the viewer on the
 * request, and rolls the session's expiry when enough of the window has been used (see
 * `sessions.ts`). Two round trips — the session and the user — on every protected request;
 * `/api/snapshot`'s own fourteen dwarf them.
 */
export const requireSession: preHandlerAsyncHookHandler = async (req, reply) => {
  const raw = req.cookies[SESSION_COOKIE];
  if (raw === undefined || raw === '') return unauthorized(reply);

  // A bad signature is indistinguishable from no cookie in the response. It is logged as a
  // separate thing because it is the only one of the 401 paths that means somebody is TRYING.
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value === null) {
    req.log.warn('rejected a session cookie whose signature did not verify');
    reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return unauthorized(reply);
  }

  const db = getDb();
  const now = clock.now();
  const session = await readSession(db, unsigned.value, now);
  if (!session) {
    // Expired or never existed. Clearing it stops the browser re-sending a dead cookie on every
    // request for the next 30 days.
    reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return unauthorized(reply);
  }

  const user = await userById(db, session.userId);
  if (!user) {
    // `removeMember` and `removeStaff` delete the row but know nothing about sessions, so this is
    // the reachable case, not a corrupt-data case: the session is the stale thing and it goes.
    await deleteSession(db, session.id);
    reply.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return unauthorized(reply);
  }

  if (needsRoll(session, now)) await rollSession(db, session.id, now);

  req.viewer = {
    ...viewerOf(user),
    sessionId: session.id,
    user,
    prefs: normalizePrefs(user.prefs),
  };
  return undefined;
};

/**
 * The viewer a protected handler is guaranteed to have.
 *
 * `requireSession` either sets `req.viewer` or has already sent a 401, so inside a handler behind
 * it the value cannot be null — but the type says it can, and `req.viewer!` at six call sites is
 * six places for that invariant to be silently wrong later. This throws instead, which surfaces as
 * a 500 naming the route rather than as `undefined.actor`.
 */
export function viewerOrThrow(req: FastifyRequest): SessionViewer {
  if (!req.viewer) {
    throw new Error(`${req.method} ${req.routeOptions.url ?? req.url} ran without requireSession in front of it`);
  }
  return req.viewer;
}

// --- § 9.4's CSRF rule -------------------------------------------------------------------------

/** § 9.4, verbatim: a mutation's content type. Parameters (`; charset=utf-8`) are allowed. */
export const JSON_CONTENT_TYPE = 'application/json';

export const isJsonContentType = (value: string | undefined): boolean =>
  value !== undefined && value.split(';')[0]!.trim().toLowerCase() === JSON_CONTENT_TYPE;

/**
 * The origins a mutation may be posted from: this request's own, plus `APP_URL`.
 *
 * `APP_URL` is listed because it is the origin the deploy actually serves from and the one baked
 * into every email link, so if a proxy ever rewrites `Host` the configured value is still right.
 * It is read per call rather than captured, matching `templates/links.ts`.
 */
function allowedOrigins(req: FastifyRequest): string[] {
  const out: string[] = [];
  const host = req.headers.host;
  // Through `new URL(...).origin` on BOTH sides, so the comparison is between normalised origins
  // rather than between strings. The default port is the case that matters: a `Host` of
  // `localhost:80` yields `http://localhost:80`, while the `Origin` a browser sends for the same
  // page is `http://localhost` — the Fetch standard omits a default port. Compared as strings
  // those differ, and every mutation from a browser on port 80 or 443 would answer 403.
  if (host !== undefined && host !== '') pushOrigin(out, `${req.protocol}://${host}`);
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) pushOrigin(out, appUrl);
  return out;
}

/** Normalise and collect, ignoring anything `new URL` will not parse. */
function pushOrigin(into: string[], candidate: string): void {
  try {
    into.push(new URL(candidate).origin);
  } catch {
    // A malformed `Host` or `APP_URL` contributes no allowed origin, which fails closed.
    // `templates/links.ts` is where a bad APP_URL is reported, loudly, where it matters.
  }
}

/**
 * Whether the `Origin` header, if there is one, belongs to this site. See the header for why an
 * absent header passes.
 */
export function originIsAllowed(req: FastifyRequest): boolean {
  const origin = req.headers.origin;
  if (origin === undefined || origin === '') return true;
  let normalized: string;
  try {
    // A sandboxed iframe sends the literal string `null`, which `new URL` rejects — and which must
    // not be treated as "no origin", because it IS a browser request from somewhere else.
    normalized = new URL(origin).origin;
  } catch {
    return false;
  }
  return allowedOrigins(req).includes(normalized);
}

/** Sends the 403 and returns true when the Origin is not ours, so both preHandlers share one copy. */
function rejectedForOrigin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (originIsAllowed(req)) return false;
  req.log.warn({ origin: req.headers.origin }, 'rejected a state-changing request from another origin');
  void reply.code(403).send({ error: 'That request came from another origin.' });
  return true;
}

/**
 * The Origin half on its own, for a state-changing POST that legitimately carries no body.
 *
 * `POST /api/auth/sign-out` is the one: it takes no arguments, so demanding a JSON content-type
 * would mean demanding a body of `{}` for the sake of a header. A cross-site sign-out is a
 * nuisance rather than a breach, but the check costs nothing and keeps the rule uniform.
 */
export const requireSameOrigin: preHandlerAsyncHookHandler = async (req, reply) => {
  rejectedForOrigin(req, reply);
};

/** § 9.4's rule as a preHandler. Registered after `requireSession`; see the header on order. */
export const requireJsonSameOrigin: preHandlerAsyncHookHandler = async (req, reply) => {
  if (!isJsonContentType(req.headers['content-type'])) {
    await reply.code(415).send({ error: `A mutation requires content-type: ${JSON_CONTENT_TYPE}.` });
    return;
  }
  rejectedForOrigin(req, reply);
};
