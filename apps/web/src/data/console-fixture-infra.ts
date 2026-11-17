// The Console fixture's Operations pages (D-168): what Integrations, Deploys & Commits, DB Health and
// Environment Flags read in the fixture build, as the API's own shapes, from the mockup's data
// (`parity-r2-infra.ts`). FIXTURE ONLY: `console-fixture.ts` loads it, and the http build has neither
// (`console-build.test.ts`). The one flag the Console owns flips here in memory, as the API's would.

import { CONSOLE_FLAGS, INTEGRATION_NAMES, isConsoleFlagKey } from '@ai/core';
import type { ConsoleFlagView, DbHealthView, DeployRow, DeployStatus, DeploysView, EnvPresence, IntegrationId, IntegrationStamp, IntegrationView, OpsEnv, ProbeIntegration, ProbeResult } from '@ai/core';
import { mockStamp } from './parity-r2';
import { DB_FIGURES, DEPLOYS, FLAGS, INTEGRATIONS, LARGEST_TABLES, MIGRATIONS, SECRETS, SLOW_QUERIES } from './parity-r2-infra';

const MB = 1024 ** 2;
/** The mockup's full sha for its short one: the short one, padded (fiction, like the rest). */
const fullSha = (short: string) => short.padEnd(40, '0');
const LIVE = fullSha(DEPLOYS[0].sha);

const STATE: Readonly<Record<string, IntegrationView['state']>> = { Connected: 'connected', Degraded: 'degraded', 'Not configured': 'not_configured' };

/** "Dec 10, 9:10 AM · 401 Unauthorized", "None" or "—", as a stamp. */
function stampOf(s: string): IntegrationStamp {
  if (s === 'None' || s === '—') return 'none';
  const [when, detail] = s.split(' · ');
  return { at: mockStamp(when!), detail: detail ?? null };
}

export function fixtureIntegrations(): IntegrationView[] {
  return INTEGRATIONS.map((x) => ({
    id: x.id as IntegrationId,
    ...INTEGRATION_NAMES[x.id as IntegrationId],
    state: STATE[x.st] ?? 'connected',
    mode: null,
    lastSuccess: stampOf(x.ok),
    lastError: stampOf(x.err),
    source: null,
    secrets: x.sec.map(([label, on]) => ({ label, state: on ? 'present' : 'not_configured' })),
    publicId: 'pub' in x ? x.pub : null,
    probe: x.id === 'stripe' || x.id === 'resend',
  }));
}

const DEPLOY_STATUS: Readonly<Record<string, DeployStatus>> = { Live: 'live', Succeeded: 'succeeded', Failed: 'failed' };
const durMs = (d: string) => {
  const m = /^(\d+)m (\d+)s$/.exec(d)!;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
};

export function fixtureDeploys(now: number, configured = true): DeploysView {
  const rows: DeployRow[] = DEPLOYS.map((d) => ({ sha: fullSha(d.sha), message: d.m, status: DEPLOY_STATUS[d.st] ?? null, buildMs: durMs(d.dur), author: d.a, at: mockStamp(d.t) }));
  return {
    repository: 'amplified-impact-lms',
    branch: 'main',
    service: 'web',
    environment: 'production',
    liveCommit: LIVE,
    history: configured ? { state: 'ok', source: 'railway', rows, asOf: now } : { state: 'not_configured' },
  };
}

export function fixtureDbHealth(now: number, slow = true): DbHealthView {
  return {
    asOf: now,
    connections: { used: DB_FIGURES.used, max: DB_FIGURES.max },
    sizeBytes: Math.round(DB_FIGURES.sizeGb * 1024 * MB),
    tables: LARGEST_TABLES.map(([name, mb, rows]) => ({ name, bytes: mb * MB, rows })),
    migrations: { applied: MIGRATIONS.map(([tag, at]) => ({ tag, at: mockStamp(at) })), pending: [] },
    slow: slow
      ? { available: true, windowHours: DB_FIGURES.slowWindowHours, over500: DB_FIGURES.slowOver500, rows: SLOW_QUERIES.map(([meanMs, calls, query]) => ({ meanMs, calls, query })) }
      : { available: false },
  };
}

/** The fixture's flag store: the mockup's `F`, with `masquerade_enabled` the Console's own (and flippable). */
export function fixtureOps(now: () => number, actorName: string) {
  let masquerade = { on: true, updatedAt: null as number | null, updatedBy: null as string | null };
  const flags = (): ConsoleFlagView[] =>
    FLAGS.map(([key, label, on]) =>
      isConsoleFlagKey(key)
        ? { key, label, on: masquerade.on, source: 'console', sensitive: CONSOLE_FLAGS.find((f) => f.key === key)!.sensitive, updatedAt: masquerade.updatedAt, updatedBy: masquerade.updatedBy }
        : { key, label, on: on === 1, source: 'env', sensitive: false, updatedAt: null, updatedBy: null },
    );
  const env = (): EnvPresence[] => SECRETS.map(([name, on]) => ({ name, group: name.split(' ')[0]!, state: on ? 'present' : 'not_configured' }));
  return {
    env: (): OpsEnv => ({ flags: flags(), env: env(), modes: { environment: 'production', stripe: 'live', email: 'production', ghl: 'on' } }),
    flip: (key: string, on: boolean): ConsoleFlagView => {
      if (masquerade.on !== on) masquerade = { on, updatedAt: now(), updatedBy: actorName };
      return flags().find((f) => f.key === key)!;
    },
    probe: (id: ProbeIntegration): ProbeResult => ({ id, outcome: 'ok', at: now(), status: null, missing: [] }),
  };
}
