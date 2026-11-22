// The Console's operations rules (D-168, spec §§ 7.11-7.13): the closed flag list and who flips it,
// the integration states, the Check now words, and the formats the four R2 screens print.
import { describe, expect, it } from 'vitest';
import {
  CONSOLE_FLAGS,
  CONSOLE_FLAG_KEYS,
  ENV_STATES,
  FLAG_FORBIDDEN_AREAS,
  INTEGRATION_IDS,
  INTEGRATION_NAMES,
  MASQUERADE_ENABLED_DEFAULT,
  INFRA_PATHS,
  PROBE_INTEGRATIONS,
  SLOW_QUERY_MAX_CHARS,
  bytesLabel,
  clipQuery,
  consoleCan,
  consoleFlagDef,
  durationLabel,
  flagTypedOk,
  flagWriteCap,
  integrationState,
  isConsoleFlagKey,
  isProbeIntegration,
  migrationNumber,
  newerStamp,
  probeMessage,
  rowsLabel,
  shortSha,
  slowQueryLine,
} from '../src/index';

describe('Console flags (spec § 7.13, D8, D10) @console', () => {
  it('owns masquerade_enabled and the cohort welcome switch, which is off until a flip', () => {
    expect(CONSOLE_FLAG_KEYS).toEqual(['masquerade_enabled', 'cohort_welcome_email']);
    expect(consoleFlagDef('cohort_welcome_email')).toEqual({ key: 'cohort_welcome_email', label: 'Send the cohort welcome email to new enrollments', sensitive: false, defaultOn: false });
    expect(consoleFlagDef('masquerade_enabled')).toEqual({ key: 'masquerade_enabled', label: 'Staff can start masquerade sessions', sensitive: true, defaultOn: true });
    expect(MASQUERADE_ENABLED_DEFAULT).toBe(true);
    expect(isConsoleFlagKey('masquerade_enabled')).toBe(true);
    // The mockup's other flags are not Console flags (D10).
    for (const k of ['preview_as_learner', 'google_sign_in', 'accelerator_two_pay', 'weekly_digest', 'ghl_sync_write', 'zoom_recording_webhook', 'maintenance_mode']) expect(isConsoleFlagKey(k), k).toBe(false);
  });

  it('lets only the Owner flip a sensitive flag, and only with its key typed exactly', () => {
    const def = consoleFlagDef('masquerade_enabled');
    expect(flagWriteCap(def)).toBe('flags.write_sensitive');
    expect(flagWriteCap({ sensitive: false })).toBe('flags.write');
    expect(['Owner', 'Admin', 'Support'].filter((r) => consoleCan(r, flagWriteCap(def)))).toEqual(['Owner']);
    expect(flagTypedOk(def, 'masquerade_enabled')).toBe(true);
    expect(flagTypedOk(def, ' masquerade_enabled ')).toBe(true);
    for (const t of [undefined, '', 'Masquerade_enabled', 'masquerade', 42]) expect(flagTypedOk(def, t), String(t)).toBe(false);
    expect(flagTypedOk({ key: 'x', sensitive: false }, undefined)).toBe(true);
  });

  it('D10: no Console flag names checkout, Payment Links, the cap, webhooks, gating, analytics or /agreement', () => {
    for (const f of CONSOLE_FLAGS) for (const area of FLAG_FORBIDDEN_AREAS) expect(`${f.key} ${f.label}`.toLowerCase().replace(/_/g, ' '), area).not.toContain(area);
  });
});

describe('integrations (spec § 7.13) @console', () => {
  it('lists the mockup’s eight cards, and Check now for Stripe and Resend only', () => {
    expect(INTEGRATION_IDS.map((i) => INTEGRATION_NAMES[i].name)).toEqual(['Stripe', 'GoHighLevel', 'Zoom', 'Google', 'Resend', 'Storage', 'GA4', 'Meta Pixel']);
    expect(PROBE_INTEGRATIONS).toEqual(['stripe', 'resend']);
    expect(isProbeIntegration('ghl')).toBe(false);
    expect(ENV_STATES).toEqual(['present', 'not_configured']);
  });

  it('is Degraded only when the newest event is an error', () => {
    const s = (at: number) => ({ at, detail: null });
    expect(integrationState({ configured: false, lastSuccess: s(2), lastError: 'none' })).toBe('not_configured');
    expect(integrationState({ configured: true, paused: true, lastSuccess: s(2), lastError: 'none' })).toBe('paused');
    expect(integrationState({ configured: true, lastSuccess: s(2), lastError: s(1) })).toBe('connected');
    expect(integrationState({ configured: true, lastSuccess: s(1), lastError: s(2) })).toBe('degraded');
    expect(integrationState({ configured: true, lastSuccess: 'none', lastError: s(2) })).toBe('degraded');
    expect(integrationState({ configured: true, lastSuccess: 'unavailable', lastError: 'unavailable' })).toBe('connected');
    expect(newerStamp(s(1), s(3))).toEqual(s(3));
    expect(newerStamp('unavailable', 'none')).toBe('none');
    expect(newerStamp('unavailable', s(1))).toEqual(s(1));
  });

  it('words a Check now as the mockup’s toast, never the provider’s', () => {
    const r = { at: 0, status: null, missing: [] as string[] };
    expect(probeMessage({ ...r, id: 'stripe', outcome: 'ok' })).toBe('Stripe: connection ok');
    expect(probeMessage({ ...r, id: 'resend', outcome: 'refused', status: 401 })).toBe('Resend: test failed, 401 Unauthorized');
    expect(probeMessage({ ...r, id: 'stripe', outcome: 'scope_missing', missing: ['Invoices', 'Refunds'] })).toBe('Stripe: test failed, missing Read on Invoices, Refunds');
    expect(probeMessage({ ...r, id: 'resend', outcome: 'not_configured' })).toBe('Resend: not configured');
    expect(probeMessage({ ...r, id: 'resend', outcome: 'unreachable' })).toBe('Resend: test failed, no answer');
    expect(probeMessage({ ...r, id: 'resend', outcome: 'rate_limited', status: 429 })).toBe('Resend: test failed, 429 Too Many Requests');
  });

  it('routes every Operations path under /api/console', () => {
    for (const p of Object.values(INFRA_PATHS)) expect(p.startsWith('/api/console/')).toBe(true);
  });
});

describe('the formats (the mockup’s words) @console', () => {
  it('prints sizes, rows, durations, shas, slow queries and migration numbers as the mockup does', () => {
    expect(bytesLabel(1.8 * 1024 ** 3)).toBe('1.8 GB');
    expect(bytesLabel(412 * 1024 ** 2)).toBe('412 MB');
    expect(bytesLabel(22 * 1024 ** 2)).toBe('22 MB');
    expect(bytesLabel(9.97 * 1024 ** 2)).toBe('10 MB');
    expect(bytesLabel(512)).toBe('512 bytes');
    expect(rowsLabel(2_100_000)).toBe('2.1M rows');
    expect(rowsLabel(940_000)).toBe('940K rows');
    expect(rowsLabel(3_200)).toBe('3.2K rows');
    expect(rowsLabel(48_000)).toBe('48K rows');
    expect(rowsLabel(12)).toBe('12 rows');
    expect(durationLabel(108_000)).toBe('1m 48s');
    expect(durationLabel(39_000)).toBe('0m 39s');
    expect(durationLabel(123_000)).toBe('2m 03s');
    expect(shortSha('a3f91c2d0e4b')).toBe('a3f91c2');
    expect(slowQueryLine({ meanMs: 1940.4, calls: 96 })).toBe('1,940 ms mean · 96 calls');
    expect(slowQueryLine({ meanMs: 604, calls: 1 })).toBe('604 ms mean · 1 call');
    expect(migrationNumber('0014_cohort_starts_at_first_build')).toBe('0014');
  });

  it('cuts a slow query to 400 characters', () => {
    expect(clipQuery('select 1')).toBe('select 1');
    const long = clipQuery('x'.repeat(1000));
    expect(long).toHaveLength(SLOW_QUERY_MAX_CHARS);
    expect(long.endsWith('…')).toBe(true);
  });
});
