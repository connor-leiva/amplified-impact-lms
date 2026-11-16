// The Operations pages' view-models (D-168, spec §§ 7.11-7.13): Integrations, Deploys & Commits, DB
// Health and Environment Flags, as the R2 mockup prints them. Pure: the API's shapes in, the mockup's
// words out; the screens only draw these.
//
// Production prints real states and its own empty states ("Not configured", "Unavailable"); the
// fixture prints the mockup's data through the same functions, so parity proves the words.

import {
  INTEGRATION_NAMES,
  OPS_PATHS,
  WWW_ONLY_INTEGRATIONS,
  adminStamp,
  bytesLabel,
  consoleCan,
  consoleFlagDef,
  durationLabel,
  flagWriteCap,
  isConsoleFlagKey,
  migrationNumber,
  rowsLabel,
  shortSha,
  slowQueryLine,
} from '@ai/core';
import type { AdminTone, DbHealthView, DeployStatus, DeploysView, EnvState, IntegrationStamp, IntegrationView, OpsEnv, OpsModes } from '@ai/core';

export interface StatusWord {
  label: string;
  tone: AdminTone;
}

const PRESENT: Readonly<Record<EnvState, StatusWord>> = {
  present: { label: 'Present', tone: 'ok' },
  not_configured: { label: 'Not configured', tone: 'warn' },
};

// ================================================================================================
// Integrations
// ================================================================================================

export const INTEGRATIONS_COPY = {
  title: 'Integrations',
  description: 'Connection state for each service. Secret values never reach the browser, so there is nothing to reveal, copy, or replace here.',
  lastSuccess: 'Last success',
  lastError: 'Last error',
  publicId: 'Public tag ID',
  test: 'Test connection',
  wwwOnly: 'Managed on www. View only.',
  /** The title of a Test connection the spec doesn't give this service (§ 7.13: Stripe and Resend only). */
  noCheck: 'Check now is for Stripe and Resend only',
  checking: 'Checking…',
} as const;

const INTEGRATION_STATUS: Readonly<Record<IntegrationView['state'], StatusWord>> = {
  connected: { label: 'Connected', tone: 'ok' },
  degraded: { label: 'Degraded', tone: 'bad' },
  paused: { label: 'Paused', tone: 'off' },
  not_configured: { label: 'Not configured', tone: 'warn' },
  // D-155: GA4 and the Meta Pixel are www's; nothing here checks them.
  www_only: { label: 'www only (D-155)', tone: 'neutral' },
};

/** A last success or error as the card prints it: "Dec 10, 9:10 AM · 401 Unauthorized", "None", "Unavailable". */
export function stampWords(s: IntegrationStamp, wwwOnly = false): string {
  if (wwwOnly) return '—';
  if (s === 'none') return 'None';
  if (s === 'unavailable') return 'Unavailable';
  return s.detail ? `${adminStamp(s.at)} · ${s.detail}` : adminStamp(s.at);
}

export interface IntegrationCardVM {
  id: string;
  name: string;
  use: string;
  status: StatusWord;
  rows: { label: string; mono?: string; status?: StatusWord }[];
  /** `test`: Test connection checks (Stripe, Resend); `inert`: drawn, does nothing; `www`: the www line. */
  action: 'test' | 'inert' | 'www';
}

export function integrationCardVM(i: IntegrationView, canProbe: boolean): IntegrationCardVM {
  const www = WWW_ONLY_INTEGRATIONS.includes(i.id);
  return {
    id: i.id,
    name: INTEGRATION_NAMES[i.id].name,
    use: INTEGRATION_NAMES[i.id].use,
    status: INTEGRATION_STATUS[i.state],
    rows: [
      { label: INTEGRATIONS_COPY.lastSuccess, mono: stampWords(i.lastSuccess, www) },
      { label: INTEGRATIONS_COPY.lastError, mono: stampWords(i.lastError, www) },
      ...(i.publicId ? [{ label: INTEGRATIONS_COPY.publicId, mono: i.publicId }] : []),
      ...i.secrets.map((s) => ({ label: s.label, status: PRESENT[s.state] })),
    ],
    action: www ? 'www' : i.probe && canProbe ? 'test' : 'inert',
  };
}

// ================================================================================================
// Deploys & Commits
// ================================================================================================

export const DEPLOYS_COPY = {
  title: 'Deploys & Commits',
  description: 'Commits on main and their Railway production deploys. Read-only.',
  facts: { repository: 'Repository', branch: 'Branch', service: 'Railway service', environment: 'Environment', live: 'Live commit' },
  columns: { commit: 'Commit', deploy: 'Deploy', build: 'Build', author: 'Author', time: 'Time' },
  label: 'Deploys',
  empty: { title: 'No deploys found' },
  notConfigured: {
    title: 'Not configured',
    body: 'Add a read-only CONSOLE_GITHUB_TOKEN or CONSOLE_RAILWAY_TOKEN in Railway to list commits and deploys here.',
  },
  unavailable: { title: 'Unavailable', body: 'GitHub and Railway didn’t answer. The list tries again in a few minutes.' },
  unknownCommit: 'Unavailable',
} as const;

const ENVIRONMENT: Readonly<Record<OpsModes['environment'], string>> = { production: 'Production', development: 'Development', test: 'Test' };

const DEPLOY_WORD: Readonly<Record<DeployStatus, StatusWord>> = {
  live: { label: 'Live', tone: 'ok' },
  succeeded: { label: 'Succeeded', tone: 'ok' },
  failed: { label: 'Failed', tone: 'bad' },
  building: { label: 'Building', tone: 'run' },
  removed: { label: 'Removed', tone: 'off' },
  skipped: { label: 'Skipped', tone: 'off' },
};

export interface DeployRowVM {
  key: string;
  message: string;
  line: string;
  deploy: StatusWord;
  build: string;
  buildMs: number;
  author: string;
  time: string;
  at: number;
}

export interface DeploysVM {
  facts: { repository: string; branch: string; service: string; environment: string; live: string | null };
  /** The table's rows, or the state that stands in for it. */
  rows: DeployRowVM[];
  empty: { title: string; body?: string };
}

export function deploysVM(d: DeploysView): DeploysVM {
  const rows: DeployRowVM[] =
    d.history.state === 'ok'
      ? d.history.rows.map((r) => ({
          key: `${r.sha}-${r.at}`,
          message: r.message,
          line: `${shortSha(r.sha)} · ${d.branch}`,
          deploy: r.status ? DEPLOY_WORD[r.status] : { label: '—', tone: 'neutral' },
          build: r.buildMs === null ? '—' : durationLabel(r.buildMs),
          buildMs: r.buildMs ?? -1,
          author: r.author ?? '—',
          time: adminStamp(r.at),
          at: r.at,
        }))
      : [];
  return {
    facts: { repository: d.repository, branch: d.branch, service: d.service, environment: ENVIRONMENT[d.environment], live: d.liveCommit ? shortSha(d.liveCommit) : null },
    rows,
    empty: d.history.state === 'not_configured' ? DEPLOYS_COPY.notConfigured : d.history.state === 'unavailable' ? DEPLOYS_COPY.unavailable : DEPLOYS_COPY.empty,
  };
}

// ================================================================================================
// DB Health
// ================================================================================================

export const DB_COPY = {
  title: 'DB Health',
  readOnly: 'Read-only',
  description: 'Postgres health. Nothing on this page can change data.',
  connections: 'Connections',
  size: 'Database size',
  migration: 'Migration',
  slowTitle: 'Slow queries',
  slowSub: 'Parameters removed',
  slowOver: 'over 500 ms',
  slowNone: { title: 'Slow queries are not available', body: 'pg_stat_statements isn’t installed on this database, and this page never turns it on.' },
  slowNotAvailable: 'Not available',
  tables: 'Largest tables',
  migrations: 'Migrations',
  migrationsSub: 'Drizzle',
  latest: 'Latest',
  pending: 'Pending',
  healthy: 'Healthy',
  busy: 'Near the limit',
  upToDate: 'Up to date',
} as const;

export interface DbVM {
  stats: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }[];
  slow: { line: string; query: string }[] | null;
  tables: { name: string; size: string; rows: string }[];
  migrations: { tag: string; time: string | null; pill: StatusWord | null }[];
}

/** Connections are healthy under 80% of `max_connections`. */
export const CONNECTIONS_BUSY = 0.8;

export function dbVM(v: DbHealthView): DbVM {
  const { used, max } = v.connections;
  const busy = max > 0 && used / max >= CONNECTIONS_BUSY;
  const latest = v.migrations.applied[0];
  const pending = v.migrations.pending.length;
  return {
    stats: [
      { label: DB_COPY.connections, value: `${used} / ${max}`, sub: busy ? DB_COPY.busy : DB_COPY.healthy, tone: busy ? 'warn' : 'ok' },
      { label: DB_COPY.size, value: bytesLabel(v.sizeBytes) },
      v.slow.available
        ? { label: v.slow.windowHours ? `${DB_COPY.slowTitle}, ${v.slow.windowHours}h` : DB_COPY.slowTitle, value: String(v.slow.over500), sub: DB_COPY.slowOver }
        : { label: DB_COPY.slowTitle, value: '—', sub: DB_COPY.slowNotAvailable },
      {
        label: DB_COPY.migration,
        value: latest ? migrationNumber(latest.tag) : '—',
        sub: pending ? `${pending} ${DB_COPY.pending.toLowerCase()}` : DB_COPY.upToDate,
        tone: pending ? 'warn' : 'ok',
      },
    ],
    slow: v.slow.available ? v.slow.rows.map((q) => ({ line: slowQueryLine(q), query: q.query })) : null,
    tables: v.tables.map((t) => ({ name: t.name, size: bytesLabel(t.bytes), rows: rowsLabel(t.rows) })),
    migrations: [
      ...v.migrations.pending.map((tag) => ({ tag, time: null, pill: { label: DB_COPY.pending, tone: 'warn' as const } })),
      ...v.migrations.applied.slice(0, 10).map((m, i) => ({ tag: m.tag, time: adminStamp(m.at), pill: i === 0 ? { label: DB_COPY.latest, tone: 'ok' as const } : null })),
    ],
  };
}

// ================================================================================================
// Environment Flags
// ================================================================================================

export const FLAGS_COPY = {
  title: 'Environment Flags',
  readOnly: 'Read-only',
  description: 'Flag state and whether each secret is configured. Flags are set in the Railway environment, and values are never shown.',
  facts: { environment: 'Environment', stripe: 'Stripe mode', email: 'Email mode', on: 'Flags on' },
  flagsTitle: 'Feature flags',
  secretsTitle: 'Configured secrets',
  secretsSub: 'Presence only. There is no reveal or replace control.',
} as const;

const STRIPE_MODE: Readonly<Record<OpsModes['stripe'], StatusWord>> = {
  live: { label: 'Live', tone: 'ok' },
  test: { label: 'Test', tone: 'info' },
  unknown: { label: 'Unknown', tone: 'warn' },
  unset: { label: 'Not configured', tone: 'warn' },
};

const EMAIL_MODE: Readonly<Record<OpsModes['email'], string>> = {
  production: 'Resend, live sending',
  development: 'Log file, not sent',
  test: 'Test outbox, not sent',
};

export interface FlagRowVM {
  key: string;
  label: string;
  status: StatusWord;
  /** The viewer may flip it (a Console flag, and the capability its sensitivity asks). */
  flip: { to: boolean; sensitive: boolean; confirm: FlipConfirm } | null;
}

export interface FlipConfirm {
  title: string;
  body: string;
  cta: string;
  danger: boolean;
  /** A sensitive flag: the words to type, and the field's label. */
  typed: { word: string; label: string } | null;
}

export interface FlagsVM {
  facts: { environment: string; stripe: StatusWord; email: string; on: string };
  flags: FlagRowVM[];
  secrets: { name: string; status: StatusWord }[];
}

/** The confirm a flip asks (the R2 `Confirm`, typed for a sensitive flag). */
export function flipConfirm(key: string, to: boolean, sensitive: boolean): FlipConfirm {
  const masq = key === 'masquerade_enabled';
  const body = masq
    ? to
      ? 'Owners and Admins can start and extend masquerade sessions again.'
      : 'Nobody can start or extend a masquerade session while it is off. A session already running ends at its time.'
    : to
      ? 'This flag turns on for everyone.'
      : 'This flag turns off for everyone.';
  return {
    title: `Turn ${to ? 'on' : 'off'} ${key}?`,
    body,
    cta: to ? 'Turn on' : 'Turn off',
    danger: !to,
    typed: sensitive ? { word: key, label: `Type ${key} to confirm` } : null,
  };
}

export function flagsVM(e: OpsEnv, role: string | null): FlagsVM {
  const on = e.flags.filter((f) => f.on).length;
  return {
    facts: {
      environment: ENVIRONMENT[e.modes.environment],
      stripe: STRIPE_MODE[e.modes.stripe],
      email: EMAIL_MODE[e.modes.email],
      on: `${on} of ${e.flags.length}`,
    },
    flags: e.flags.map((f) => {
      const mine = f.source === 'console' && isConsoleFlagKey(f.key) && consoleCan(role, flagWriteCap(consoleFlagDef(f.key)));
      return {
        key: f.key,
        label: f.label,
        status: f.on ? { label: 'On', tone: 'ok' } : { label: 'Off', tone: 'off' },
        flip: mine ? { to: !f.on, sensitive: f.sensitive, confirm: flipConfirm(f.key, !f.on, f.sensitive) } : null,
      };
    }),
    secrets: e.env.map((s) => ({ name: s.name, status: PRESENT[s.state] })),
  };
}

/** The flip's accessible name: the flag, its state, and what pressing does. */
export const flipLabel = (r: FlagRowVM): string => `${r.key}: ${r.status.label}. Turn ${r.flip?.to ? 'on' : 'off'}…`;

export const OPS_SCREEN_PATHS = { integrations: '/admin/integrations', deploys: '/admin/deploys', db: '/admin/db', flags: '/admin/flags' } as const;
/** The API each screen reads (for the build test and the e2e). */
export const OPS_API = OPS_PATHS;
