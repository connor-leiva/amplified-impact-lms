// "Continue With Google" (D-139): the OAuth 2.0 authorization-code flow with PKCE, against Google's
// OpenID Connect endpoints. This file is the protocol; `routes/google.ts` is the HTTP surface and
// the account matching.
//
// CONFIGURED OR ABSENT. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Connor sets them in Railway)
// and `APP_URL` (the redirect URI is built from it) must all be set, or `readGoogleConfig` answers
// null: the routes then answer 404 and the sign-in screens never show the button. So a deploy is
// safe before the keys exist.
//
// WHAT IS CHECKED, in order, before anyone is signed in:
//   - `state` from Google's redirect equals the one in this browser's signed, short-lived cookie
//     (CSRF: a callback this browser did not start is refused).
//   - The code is exchanged with the PKCE `code_verifier` from that cookie and the client secret.
//   - The ID token's RS256 signature verifies against Google's published keys (by `kid`).
//   - `iss` is Google, `aud` is this client (and `azp` too when `aud` lists several), `exp` has not
//     passed, `iat` is not in the future, and `nonce` is the one from the cookie.
//   - `email_verified` is exactly `true`.
// Any failure is a code, never the token or an address: callers log the code and nothing else.

import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import type { JsonWebKey } from 'node:crypto';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
/** Google's ID tokens carry either form (its OpenID discovery document names the first). */
export const GOOGLE_ISSUERS: readonly string[] = ['https://accounts.google.com', 'accounts.google.com'];
export const GOOGLE_SCOPES = 'openid email profile';
export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

/** Clock skew allowed on `exp` and `iat`, either way. */
export const SKEW_MS = 60_000;
/** How long Google's signing keys are reused before they are fetched again. */
export const JWKS_TTL_MS = 60 * 60 * 1000;
/** How long one call to Google may take. */
export const GOOGLE_TIMEOUT_MS = 10_000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** `${APP_URL}/api/auth/google/callback`, exactly as registered in Google Cloud. */
  redirectUri: string;
  /** Tests pass a fake; production uses the global `fetch`. */
  fetch?: FetchLike;
}

/** The configuration from the environment, or null when any part is missing (the feature is off). */
export function readGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = env.APP_URL?.trim();
  if (!clientId || !clientSecret || !appUrl) return null;
  let redirectUri: string;
  try {
    redirectUri = new URL(GOOGLE_CALLBACK_PATH, appUrl).toString();
  } catch {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

// --- PKCE, state, nonce --------------------------------------------------------------------------

const random = (bytes: number): string => randomBytes(bytes).toString('base64url');

/** RFC 7636's S256: the challenge is base64url(sha256(verifier)), with no padding. */
export const pkceChallenge = (verifier: string): string => createHash('sha256').update(verifier, 'ascii').digest('base64url');

/** What the start route keeps in the browser's cookie for the callback to check. */
export interface FlowSecrets {
  state: string;
  verifier: string;
  nonce: string;
}

export function newFlow(): FlowSecrets {
  return { state: random(32), verifier: random(32), nonce: random(16) };
}

/** A constant-time string comparison that is false, not a throw, for different lengths. */
export function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Google's consent screen for this flow: account chooser first, PKCE S256. */
export function authorizationUrl(config: GoogleConfig, flow: FlowSecrets): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: pkceChallenge(flow.verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

// --- the exchange and the ID token -----------------------------------------------------------------

export type GoogleProblem =
  | 'exchange'
  | 'malformed'
  | 'keys'
  | 'signature'
  | 'issuer'
  | 'audience'
  | 'expired'
  | 'nonce'
  | 'unverified'
  | 'no-email';

/** What a verified ID token tells this app. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  /** The Google Workspace domain (`hd`) the account belongs to, or null for a consumer account. */
  hd?: string | null;
}

export type GoogleResult = { ok: true; identity: GoogleIdentity } | { ok: false; problem: GoogleProblem };

interface Jwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

const decodeJson = (part: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** The flow's calls to Google, with the signing keys cached per client. */
export interface GoogleClient {
  readonly config: GoogleConfig;
  /** Exchange the code, then verify the ID token it returns. */
  finish(code: string, flow: FlowSecrets, now: number): Promise<GoogleResult>;
  /** The ID token checks alone (exported for the tests). */
  verifyIdToken(idToken: string, nonce: string, now: number): Promise<GoogleResult>;
}

export function googleClient(config: GoogleConfig): GoogleClient {
  const call: FetchLike = config.fetch ?? ((input, init) => fetch(input, init));
  let keys: { at: number; byKid: Map<string, Jwk> } | null = null;

  async function loadKeys(now: number): Promise<Map<string, Jwk> | null> {
    try {
      const res = await call(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
      if (!res.ok) return null;
      const body = (await res.json()) as { keys?: unknown };
      if (!Array.isArray(body.keys)) return null;
      const byKid = new Map<string, Jwk>();
      for (const k of body.keys as Jwk[]) if (k && typeof k.kid === 'string' && k.kty === 'RSA') byKid.set(k.kid, k);
      keys = { at: now, byKid };
      return byKid;
    } catch {
      return null;
    }
  }

  /** The key for `kid`: from the cache while it is fresh, refetched once for a kid it lacks (Google rotates). */
  async function keyFor(kid: string, now: number): Promise<Jwk | null | 'unavailable'> {
    if (keys && now - keys.at < JWKS_TTL_MS && keys.byKid.has(kid)) return keys.byKid.get(kid) ?? null;
    const fresh = await loadKeys(now);
    if (!fresh) return 'unavailable';
    return fresh.get(kid) ?? null;
  }

  async function verifyIdToken(idToken: string, nonce: string, now: number): Promise<GoogleResult> {
    const parts = idToken.split('.');
    if (parts.length !== 3) return { ok: false, problem: 'malformed' };
    const [h, p, sig] = parts as [string, string, string];
    const header = decodeJson(h);
    const claims = decodeJson(p);
    if (!header || !claims || header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false, problem: 'malformed' };

    const jwk = await keyFor(header.kid, now);
    if (jwk === 'unavailable') return { ok: false, problem: 'keys' };
    if (!jwk) return { ok: false, problem: 'signature' };
    let valid = false;
    try {
      const key = createPublicKey({ key: jwk, format: 'jwk' });
      valid = verifySignature('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(sig, 'base64url'));
    } catch {
      valid = false;
    }
    if (!valid) return { ok: false, problem: 'signature' };

    if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, problem: 'issuer' };
    const aud = claims.aud;
    const audOk =
      aud === config.clientId || (Array.isArray(aud) && aud.includes(config.clientId) && claims.azp === config.clientId);
    if (!audOk) return { ok: false, problem: 'audience' };
    if (typeof claims.exp !== 'number' || claims.exp * 1000 + SKEW_MS <= now) return { ok: false, problem: 'expired' };
    if (typeof claims.iat === 'number' && claims.iat * 1000 - SKEW_MS > now) return { ok: false, problem: 'expired' };
    if (typeof claims.nonce !== 'string' || !sameString(claims.nonce, nonce)) return { ok: false, problem: 'nonce' };
    if (typeof claims.sub !== 'string' || claims.sub === '') return { ok: false, problem: 'malformed' };
    if (typeof claims.email !== 'string' || claims.email === '') return { ok: false, problem: 'no-email' };
    // Exactly `true`: an absent claim, `false` or the string "false" is an address Google has not verified.
    if (claims.email_verified !== true) return { ok: false, problem: 'unverified' };
    return { ok: true, identity: { sub: claims.sub, email: claims.email, hd: typeof claims.hd === 'string' ? claims.hd : null } };
  }

  async function finish(code: string, flow: FlowSecrets, now: number): Promise<GoogleResult> {
    let idToken: unknown;
    try {
      const res = await call(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          code_verifier: flow.verifier,
        }).toString(),
        signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
      });
      if (!res.ok) return { ok: false, problem: 'exchange' };
      idToken = ((await res.json()) as { id_token?: unknown }).id_token;
    } catch {
      return { ok: false, problem: 'exchange' };
    }
    if (typeof idToken !== 'string') return { ok: false, problem: 'exchange' };
    return verifyIdToken(idToken, flow.nonce, now);
  }

  return { config, finish, verifyIdToken };
}
