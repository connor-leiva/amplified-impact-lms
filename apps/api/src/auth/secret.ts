// SESSION_SECRET — phase 07 § 7.5 and § 9.4 ("Cookies are … signed with `SESSION_SECRET`").
//
// The cookie signature is the whole of the session's integrity: `ai_sid` carries an
// `auth_sessions.id`, and the only thing standing between a visitor and typing somebody else's
// session id into their own cookie jar is that the value has to be signed with this key. So this
// file's one job is to make sure the key in production is a real key and not a constant somebody
// copied out of a tutorial.
//
// -----------------------------------------------------------------------------------------------
// WHY THERE IS NO DEFAULT IN PRODUCTION, AND WHY THERE IS ONE EVERYWHERE ELSE
// -----------------------------------------------------------------------------------------------
// A hard-coded fallback (`process.env.SESSION_SECRET ?? 'dev-secret'`) is the single worst line
// this file could contain: the API would boot healthy on a misconfigured deploy and every session
// cookie in production would be forgeable by anyone who has read the repository. `.railway/
// railway.ts` already lists `SESSION_SECRET: preserve()`, so the deployed service is expected to
// carry it; if it does not, refusing to start is the correct outcome — Railway holds the previous
// version and the healthcheck never goes green, which is a visible, recoverable failure.
//
// Outside production the opposite is true. `vitest`, `tsx watch` and the compliance harness all
// start this process dozens of times a day, and requiring a variable there buys nothing: a
// developer's cookie signature protects a database seeded from `seed('live')`. So a random
// per-process secret is generated instead. It is random rather than constant on purpose — a
// constant dev secret is the thing that eventually gets committed to a `.env.example`, copied into
// a staging environment and becomes a production secret by accident. The cost is that restarting
// the dev server invalidates open sessions, which is exactly what `tsx watch` does to the database
// connection anyway.
//
// `NODE_ENV === 'production'` is compared to the exact string, the same rule `email/transport.ts`
// uses to select Resend and for the same reason: resolving the wrong way means either a staging box
// that refuses to boot (recoverable) or a production box with a throwaway key (not).

import { randomBytes } from 'node:crypto';

/**
 * Thrown when `SESSION_SECRET` is missing in production. A distinct class so a startup script can
 * tell "nobody configured this" from an ordinary crash, the same split `DatabaseConfigError` makes.
 */
export class SessionSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionSecretError';
  }
}

/** Just enough of `process.env` to resolve a secret, so the resolution is a testable pure-ish function. */
export interface SecretEnv {
  readonly NODE_ENV?: string | undefined;
  readonly SESSION_SECRET?: string | undefined;
}

/**
 * The shortest secret worth signing with. 32 bytes of entropy is what `mintToken` produces and
 * what a `crypto.randomBytes(32).toString('hex')` paste gives you, so anything under this is a
 * person typing a word.
 *
 * Short secrets are WARNED about rather than refused: § 7.5 asks for a failure when the variable
 * "is missing", and turning a deploy that has been working into a boot failure over a key length
 * is a judgement call this file is not entitled to make on the owner's behalf. The warning names
 * the fix.
 */
export const MIN_SECRET_LENGTH = 32;

let ephemeral: string | null = null;
let warned = false;

/**
 * Pull `apps/api/.env` in if the process was started without it, exactly as `db/client.ts` does.
 *
 * Only when the variable is actually absent, so a value already in the environment (Railway, or a
 * test that set one deliberately) is never overwritten by a stale file on disk.
 */
function loadEnvFileIfNeeded(env: SecretEnv): void {
  if (env.SESSION_SECRET !== undefined && env.SESSION_SECRET.trim() !== '') return;
  try {
    process.loadEnvFile();
  } catch {
    /* no .env: Railway carries the variable in the environment already */
  }
}

/**
 * The key `@fastify/cookie` signs with.
 *
 * Memoized for the non-production path only — within one process every call must return the same
 * key, or a cookie signed by one request would fail to verify on the next.
 */
export function readSessionSecret(env: SecretEnv = process.env): string {
  if (env === (process.env as SecretEnv)) loadEnvFileIfNeeded(env);

  const raw = env.SESSION_SECRET?.trim() ?? '';
  if (raw !== '') {
    if (raw.length < MIN_SECRET_LENGTH && !warned) {
      warned = true;
      console.warn(
        `[auth] SESSION_SECRET is ${raw.length} characters; ${MIN_SECRET_LENGTH} or more is ` +
          "expected. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    return raw;
  }

  if (env.NODE_ENV === 'production') {
    throw new SessionSecretError(
      'SESSION_SECRET is not set. Session cookies are signed with it, so without it every ' +
        'session cookie in production would be forgeable — the API will not start with a ' +
        'default. Set it on the service (Railway: the `web` service, per .railway/railway.ts) to ' +
        '32+ random characters.',
    );
  }

  // Development and test: a throwaway key per process. See the header on why it is not a constant.
  ephemeral ??= randomBytes(32).toString('hex');
  return ephemeral;
}

/** Forgets the per-process development key. For tests that assert the generation itself. */
export function resetEphemeralSecret(): void {
  ephemeral = null;
  warned = false;
}
