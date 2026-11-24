// The Admin Console's operations pages, PR 9 (D-168, spec §§ 7.11-7.13): the Console-owned flags,
// env presence, the integrations, the deploys and DB health. Pure, like the rest of @ai/core: the API
// answers with these shapes and closed lists, and the four R2 screens' view-models turn them into the
// mockup's words, so the two cannot disagree on a label, a limit or a state.
//
// SECRETS NEVER LEAVE THE SERVER. Env reaches the browser only as a presence state (`present` or
// `not_configured`) or a mode (`live`, `test`, …). No shape here has room for a value, a prefix, a
// suffix, a length or a hash, and the API's sentinel test (`console-infra-sentinel.test.ts`) proves it.
// There is no Replace or Reveal (D9).
//
// FLAGS (D8, D10). `CONSOLE_FLAGS` is the closed list of flags the Console owns, and v1 has one:
// `masquerade_enabled`, on by default, sensitive (only the Owner turns it off, typing its key). Env
// switches are read-only and come from their existing readers. No flag may touch checkout, Payment
// Links, the seat cap, webhooks, gating, analytics or `/agreement`.

import type { ConsoleCap } from './console';
import { MASQUERADE_ENABLED_DEFAULT } from './console-masquerade';

// ================================================================================================
// Paths
// ================================================================================================

export const INFRA_PATHS = {
  /** `{ flags, env, modes }`: the Environment Flags page. `ops.read`. */
  env: '/api/console/env',
  /** `POST { on, typed? }`: flip one Console flag. `flags.write`, or `flags.write_sensitive`. */
  flagFlip: '/api/console/flags/:key',
  /** `POST { to, cohortId }`: send one cohort welcome to an allowlisted address. `flags.write`. */
  welcomeTest: '/api/console/welcome/test',
  integrations: '/api/console/integrations',
  /** `POST`: Check now, Stripe and Resend only, read-only. `integrations.probe`. */
  integrationCheck: '/api/console/integrations/:id/check',
  deploys: '/api/console/deploys',
  db: '/api/console/db',
} as const;

// ================================================================================================
// Console flags (spec § 7.13, D8, D10)
// ================================================================================================

export interface ConsoleFlagDef {
  key: string;
  /** What it does, in sentence case: the mockup's second line. */
  label: string;
  /** Sensitive: `flags.write_sensitive` (the Owner), and the key typed to confirm. */
  sensitive: boolean;
  /** Its state when no row says otherwise. */
  defaultOn: boolean;
}

/**
 * The closed list. `masquerade_enabled` is spec § 7.13. `cohort_welcome_email` is off until a flip
 * turns it on, and the welcome never goes to anyone enrolled before that flip (`enrolledBeforeSwitch`).
 */
export const CONSOLE_FLAGS = [
  { key: 'masquerade_enabled', label: 'Staff can start masquerade sessions', sensitive: true, defaultOn: MASQUERADE_ENABLED_DEFAULT },
  { key: 'cohort_welcome_email', label: 'Send the cohort welcome email to new enrollments', sensitive: false, defaultOn: false },
] as const satisfies readonly ConsoleFlagDef[];

export type ConsoleFlagKey = (typeof CONSOLE_FLAGS)[number]['key'];
export const CONSOLE_FLAG_KEYS: readonly ConsoleFlagKey[] = CONSOLE_FLAGS.map((f) => f.key);

export const isConsoleFlagKey = (v: unknown): v is ConsoleFlagKey => typeof v === 'string' && (CONSOLE_FLAG_KEYS as readonly string[]).includes(v);

export const consoleFlagDef = (key: ConsoleFlagKey): ConsoleFlagDef => CONSOLE_FLAGS.find((f) => f.key === key)!;

/** The capability a flip needs: a sensitive flag is the Owner's alone (D8). */
export const flagWriteCap = (def: Pick<ConsoleFlagDef, 'sensitive'>): ConsoleCap => (def.sensitive ? 'flags.write_sensitive' : 'flags.write');

/** A sensitive flip is confirmed by typing the flag's key, exactly; any other flip needs nothing typed. */
export const flagTypedOk = (def: Pick<ConsoleFlagDef, 'key' | 'sensitive'>, typed: unknown): boolean =>
  !def.sensitive || (typeof typed === 'string' && typed.trim() === def.key);

/**
 * D10: what no Console flag may control. A test reads every flag's key and label against these, so a
 * flag over checkout, Payment Links, the cap, webhooks, gating, analytics or `/agreement` can't be
 * added without that test changing in the same diff.
 */
export const FLAG_FORBIDDEN_AREAS = ['checkout', 'payment link', 'seat cap', 'webhook', 'gating', 'course access', 'analytics', 'pixel', 'agreement'] as const;

export type FlagSource = 'console' | 'env';

/** One row of the Feature flags card: a Console flag, or an env switch read from its existing reader. */
export interface ConsoleFlagView {
  key: string;
  label: string;
  on: boolean;
  source: FlagSource;
  /** Console flags only: the Owner's alone, and typed to confirm. */
  sensitive: boolean;
  /** Console flags only, once flipped. */
  updatedAt: number | null;
  updatedBy: string | null;
}

/** What `POST /api/console/flags/:key` answers. */
export interface FlagFlipResult {
  flag: ConsoleFlagView;
}

// ================================================================================================
// Env presence (spec § 7.13): booleans and modes only
// ================================================================================================

export const ENV_STATES = ['present', 'not_configured'] as const;
export type EnvState = (typeof ENV_STATES)[number];

/** One configured secret: its name as the page prints it, its group, and whether it is set. Nothing else. */
export interface EnvPresence {
  name: string;
  group: string;
  state: EnvState;
}

export type OpsEnvironment = 'production' | 'development' | 'test';
export type StripeKeyMode = 'live' | 'test' | 'unknown' | 'unset';
/** Email: Resend sends (`production`), the log file (`development`) or the test outbox. */
export type EmailMode = 'production' | 'development' | 'test';
export type GhlMode = 'on' | 'paused' | 'off';

export interface OpsModes {
  environment: OpsEnvironment;
  stripe: StripeKeyMode;
  email: EmailMode;
  ghl: GhlMode;
}

/** `GET /api/console/env`: the fixed shape (spec § 7.13). */
export interface OpsEnv {
  flags: ConsoleFlagView[];
  env: EnvPresence[];
  modes: OpsModes;
}

// ================================================================================================
// Integrations (spec § 7.13)
// ================================================================================================

export const INTEGRATION_IDS = ['stripe', 'ghl', 'zoom', 'google', 'resend', 'storage', 'ga4', 'meta'] as const;
export type IntegrationId = (typeof INTEGRATION_IDS)[number];
export const isIntegrationId = (v: unknown): v is IntegrationId => typeof v === 'string' && (INTEGRATION_IDS as readonly string[]).includes(v);

/** "Check now" exists for these two only, and only reads (spec § 7.13). */
export const PROBE_INTEGRATIONS = ['stripe', 'resend'] as const satisfies readonly IntegrationId[];
export type ProbeIntegration = (typeof PROBE_INTEGRATIONS)[number];
export const isProbeIntegration = (v: unknown): v is ProbeIntegration => typeof v === 'string' && (PROBE_INTEGRATIONS as readonly string[]).includes(v);

/** Each integration's card title and its line, the mockup's words. */
export const INTEGRATION_NAMES: Readonly<Record<IntegrationId, { name: string; use: string }>> = {
  stripe: { name: 'Stripe', use: 'Payments, subscriptions, invoices' },
  ghl: { name: 'GoHighLevel', use: 'CRM sync for logins and orders' },
  zoom: { name: 'Zoom', use: 'Session join links' },
  google: { name: 'Google', use: 'Sign in with Google' },
  resend: { name: 'Resend', use: 'Transactional email' },
  storage: { name: 'Storage', use: 'Railway S3-compatible bucket' },
  ga4: { name: 'GA4', use: 'Analytics on www only' },
  meta: { name: 'Meta Pixel', use: 'Ads measurement on www only' },
};

/** GA4 and the Meta Pixel are www's (D-155): their ids are shown, nothing is checked. */
export const WWW_ONLY_INTEGRATIONS: readonly IntegrationId[] = ['ga4', 'meta'];

export type IntegrationState = 'connected' | 'degraded' | 'paused' | 'not_configured' | 'www_only';

/** A last success or error: when, and a short, fixed detail (a status, a kind), or none, or no source. */
export type IntegrationStamp = { at: number; detail: string | null } | 'none' | 'unavailable';

export interface IntegrationView {
  id: IntegrationId;
  name: string;
  use: string;
  state: IntegrationState;
  /** `live` / `test` (Stripe), `on` / `paused` / `off` (GoHighLevel), the email mode (Resend); else null. */
  mode: string | null;
  lastSuccess: IntegrationStamp;
  lastError: IntegrationStamp;
  /** Which table the two stamps come from, or null when there is none. */
  source: string | null;
  /** Each secret's presence, by its short name on the card. */
  secrets: { label: string; state: EnvState }[];
  /** GA4's and Meta's public ids (D-155), from the existing analytics constants. */
  publicId: string | null;
  /** "Check now" exists (Stripe and Resend). */
  probe: boolean;
}

/** A card's state from what the reader and the tables say. An error newer than the last success is Degraded. */
export function integrationState(i: { configured: boolean; paused?: boolean; lastSuccess: IntegrationStamp; lastError: IntegrationStamp }): IntegrationState {
  if (!i.configured) return 'not_configured';
  if (i.paused) return 'paused';
  const ok = typeof i.lastSuccess === 'object' ? i.lastSuccess.at : null;
  const bad = typeof i.lastError === 'object' ? i.lastError.at : null;
  if (bad !== null && (ok === null || bad > ok)) return 'degraded';
  return 'connected';
}

/** The newer of two stamps; a real stamp beats `none`, which beats `unavailable`. */
export function newerStamp(a: IntegrationStamp, b: IntegrationStamp): IntegrationStamp {
  if (typeof a === 'object' && typeof b === 'object') return b.at > a.at ? b : a;
  if (typeof a === 'object') return a;
  if (typeof b === 'object') return b;
  return a === 'none' || b === 'none' ? 'none' : 'unavailable';
}

/** What a Check now found. A closed list: never the provider's own words. */
export type ProbeOutcome = 'ok' | 'not_configured' | 'refused' | 'scope_missing' | 'rate_limited' | 'unreachable' | 'failed';

export interface ProbeResult {
  id: ProbeIntegration;
  outcome: ProbeOutcome;
  at: number;
  /** The HTTP status the provider answered, when that is the finding. */
  status: number | null;
  /** Stripe: the Read permissions the key lacks, by name (D-163's scopes). */
  missing: string[];
}

const STATUS_TEXT: Readonly<Record<number, string>> = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' };

/** "401 Unauthorized". */
export const statusLine = (status: number): string => `${status}${STATUS_TEXT[status] ? ` ${STATUS_TEXT[status]}` : ''}`;

/** The toast a Check now ends with, in the mockup's words ("Stripe: connection ok", "…: test failed, 401 Unauthorized"). */
export function probeMessage(r: ProbeResult): string {
  const name = INTEGRATION_NAMES[r.id].name;
  switch (r.outcome) {
    case 'ok':
      return `${name}: connection ok`;
    case 'not_configured':
      return `${name}: not configured`;
    case 'scope_missing':
      return `${name}: test failed, missing Read on ${r.missing.join(', ')}`;
    case 'unreachable':
      return `${name}: test failed, no answer`;
    default:
      return `${name}: test failed${r.status ? `, ${statusLine(r.status)}` : ''}`;
  }
}

// ================================================================================================
// Deploys (spec § 7.11)
// ================================================================================================

/**
 * The service as `.railway/railway.ts` describes it: the repository Railway builds, its one branch and
 * the `web` service. Code, not env (env leaves the server only as booleans and modes); a test pins
 * these to that file.
 */
export const DEPLOY_FACTS = { repository: 'amplified-impact-lms', owner: 'connor-leiva', branch: 'main', service: 'web' } as const;

/** History is fetched at most once per 5 minutes (spec § 7.11). */
export const DEPLOYS_CACHE_MS = 5 * 60_000;
/** How many commits or deploys the history lists. */
export const DEPLOYS_LIMIT = 10;

export type DeployStatus = 'live' | 'succeeded' | 'failed' | 'building' | 'removed' | 'skipped';
export type DeploySource = 'github' | 'railway';

export interface DeployRow {
  sha: string;
  message: string;
  /** Null when the source can't say (GitHub's commits carry no deploy). */
  status: DeployStatus | null;
  buildMs: number | null;
  author: string | null;
  at: number;
}

export type DeployHistory =
  | { state: 'not_configured' }
  | { state: 'unavailable'; source: DeploySource }
  | { state: 'ok'; source: DeploySource; rows: DeployRow[]; asOf: number };

export interface DeploysView {
  repository: string;
  branch: string;
  service: string;
  environment: OpsEnvironment;
  /** `RAILWAY_GIT_COMMIT_SHA`, as `/api/health` shows it, or null off Railway. */
  liveCommit: string | null;
  history: DeployHistory;
}

/** "a3f91c2". */
export const shortSha = (sha: string): string => sha.slice(0, 7);

/** "1m 48s", "0m 39s", "2m 03s". */
export function durationLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

// ================================================================================================
// Database (spec § 7.12)
// ================================================================================================

/** Every query runs in a READ ONLY transaction with this statement timeout. */
export const DB_STATEMENT_TIMEOUT_MS = 2000;
/** The page's answer is reused for a minute. */
export const DB_CACHE_MS = 60_000;
export const DB_TOP_TABLES = 10;
export const DB_MIGRATIONS_SHOWN = 10;
/** `pg_stat_statements`, when it exists: the five slowest, each cut to 400 characters. */
export const SLOW_QUERY_LIMIT = 5;
export const SLOW_QUERY_MAX_CHARS = 400;
/** "Slow" is a mean over 500 ms (the mockup's "over 500 ms"). */
export const SLOW_QUERY_MS = 500;

export interface DbTable {
  name: string;
  bytes: number;
  /** Postgres's own estimate (`n_live_tup`). */
  rows: number;
}

export interface DbSlowQuery {
  meanMs: number;
  calls: number;
  /** Normalised by Postgres (parameters are `$1`), and at most 400 characters. */
  query: string;
}

export type DbSlow =
  | { available: false }
  | {
      available: true;
      /** The window the counts cover, in hours, or null when they run since the statistics were reset. */
      windowHours: number | null;
      over500: number;
      rows: DbSlowQuery[];
    };

export interface DbHealthView {
  asOf: number;
  connections: { used: number; max: number };
  sizeBytes: number;
  tables: DbTable[];
  /** Applied, newest first, each the journal's tag and its `when`; then the journal's tags not applied. */
  migrations: { applied: { tag: string; at: number }[]; pending: string[] };
  slow: DbSlow;
}

/** A slow query cut to 400 characters, with an ellipsis when it was cut. */
export const clipQuery = (q: string): string => (q.length <= SLOW_QUERY_MAX_CHARS ? q : `${q.slice(0, SLOW_QUERY_MAX_CHARS - 1)}…`);

const scaled = (n: number, unit: number, suffixes: readonly string[], join: string): string => {
  let i = 0;
  let v = n;
  while (v >= unit && i < suffixes.length - 1) {
    v /= unit;
    i += 1;
  }
  const tenth = Math.round(v * 10) / 10;
  const shown = i === 0 || tenth >= 10 ? String(Math.round(v)) : tenth.toFixed(1);
  return `${shown}${join}${suffixes[i]}`;
};

/** "1.8 GB", "412 MB", "22 MB" (1024s, as `pg_size_pretty` counts). */
export const bytesLabel = (n: number): string => scaled(n, 1024, ['bytes', 'kB', 'MB', 'GB', 'TB'], ' ');

/** "2.1M rows", "940K rows", "3.2K rows", "12 rows". */
export const rowsLabel = (n: number): string => `${scaled(n, 1000, ['', 'K', 'M', 'B'], '')} rows`;

/** "1,940 ms mean · 96 calls". */
export const slowQueryLine = (q: Pick<DbSlowQuery, 'meanMs' | 'calls'>): string =>
  `${Math.round(q.meanMs).toLocaleString('en-US')} ms mean · ${q.calls.toLocaleString('en-US')} call${q.calls === 1 ? '' : 's'}`;

/** A migration's number, its tag's first four digits: "0014". */
export const migrationNumber = (tag: string): string => /^\d{4}/.exec(tag)?.[0] ?? tag;
