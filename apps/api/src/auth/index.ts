// apps/api/src/auth — phase 07 § 7.5's magic-link authentication, as five leaf modules.
//
//   secret.ts    SESSION_SECRET: required in production, ephemeral everywhere else
//   tokens.ts    mint / sha256 / constant-time compare, and the 15-minute and 7-day lifetimes
//   sessions.ts  the `auth_sessions` row and the `ai_sid` cookie's four attributes
//   viewer.ts    a `users` row as `{ actor, role }` and `prefs`
//   guard.ts     `requireSession` and § 9.4's CSRF rule, as preHandlers
//   mailer.ts    a send the request does not await, so its duration cannot be measured
//
// Nothing here opens a route. `routes/auth.ts` is the HTTP surface; this is the policy it enforces,
// split so each piece can be tested without a server.

export { MIN_SECRET_LENGTH, SessionSecretError, readSessionSecret, resetEphemeralSecret } from './secret';
export type { SecretEnv } from './secret';

export { INVITE_TTL_MS, SIGN_IN_TTL_MS, TOKEN_BYTES, TTL_MS, expiryFor, hashToken, mintToken, sameHash } from './tokens';
export type { TokenPurpose } from './tokens';

export {
  ROLL_AFTER_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clearCookieOptions,
  createSession,
  deleteSession,
  mintSessionId,
  needsRoll,
  readSession,
  rollSession,
  sessionCookieOptions,
} from './sessions';
export type { SessionRow } from './sessions';

export { VIEWER_ROLES, actorOf, normalizeEmail, normalizePrefs, roleOf, userByEmail, userById, viewerOf } from './viewer';
export type { UserRow, Viewer, ViewerPrefs, ViewerRole } from './viewer';

export {
  JSON_CONTENT_TYPE,
  decorateViewer,
  isJsonContentType,
  originIsAllowed,
  requireJsonSameOrigin,
  requireSameOrigin,
  requireSession,
  viewerOrThrow,
} from './guard';
export type { SessionViewer } from './guard';

export { pendingEmails, queueEmail, queueMailTask, settleEmails } from './mailer';
