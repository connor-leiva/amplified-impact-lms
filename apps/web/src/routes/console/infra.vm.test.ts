// The Operations pages' view-models (D-168): the mockup's words from the fixture's data, and
// production's own states from the API's.
import { describe, expect, it } from 'vitest';
import type { DbHealthView, DeploysView, IntegrationView, OpsEnv } from '@ai/core';
import { fixtureDbHealth, fixtureDeploys, fixtureIntegrations, fixtureOps } from '../../data/console-fixture-infra';
import { dbVM, deploysVM, flagsVM, flipConfirm, flipLabel, integrationCardVM, stampWords } from './infra.vm';

const NOW = Date.parse('2026-12-10T16:30:00Z');

describe('Integrations (D-168) @console', () => {
  it('prints the mockup’s cards from the fixture', () => {
    const cards = fixtureIntegrations().map((i) => integrationCardVM(i, true));
    expect(cards.map((c) => [c.name, c.status.label, c.action])).toEqual([
      ['Stripe', 'Connected', 'test'],
      ['GoHighLevel', 'Degraded', 'inert'],
      ['Zoom', 'Connected', 'inert'],
      ['Google', 'Connected', 'inert'],
      ['Resend', 'Connected', 'test'],
      ['Storage', 'Connected', 'inert'],
      ['GA4', 'Connected', 'www'],
      ['Meta Pixel', 'Connected', 'www'],
    ]);
    expect(cards[1]!.rows).toEqual([
      { label: 'Last success', mono: 'Dec 9, 9:04 PM' },
      { label: 'Last error', mono: 'Dec 10, 9:10 AM · 401 Unauthorized' },
      { label: 'Access token', status: { label: 'Present', tone: 'ok' } },
      { label: 'Location ID', status: { label: 'Present', tone: 'ok' } },
    ]);
    expect(cards[2]!.rows.at(-1)).toEqual({ label: 'Recording webhook secret', status: { label: 'Not configured', tone: 'warn' } });
    expect(cards[6]!.rows).toEqual([
      { label: 'Last success', mono: '—' },
      { label: 'Last error', mono: '—' },
      { label: 'Public tag ID', mono: 'G-TSQ5YB5BCP' },
    ]);
    // Without integrations.probe, Test connection is drawn and inert.
    expect(fixtureIntegrations().map((i) => integrationCardVM(i, false).action)).not.toContain('test');
  });

  it('prints production’s states: Not configured, Unavailable, www only (D-155)', () => {
    const base: IntegrationView = {
      id: 'storage',
      name: 'Storage',
      use: '',
      state: 'not_configured',
      mode: null,
      lastSuccess: 'unavailable',
      lastError: 'unavailable',
      source: null,
      secrets: [{ label: 'Access key', state: 'not_configured' }],
      publicId: null,
      probe: false,
    };
    const vm = integrationCardVM(base, true);
    expect(vm.status).toEqual({ label: 'Not configured', tone: 'warn' });
    expect(vm.rows.slice(0, 2).map((r) => r.mono)).toEqual(['Unavailable', 'Unavailable']);
    expect(integrationCardVM({ ...base, id: 'meta', state: 'www_only', publicId: '1835170747490806', secrets: [] }, true).status).toEqual({ label: 'www only (D-155)', tone: 'neutral' });
    expect(integrationCardVM({ ...base, state: 'paused' }, true).status.label).toBe('Paused');
    expect(stampWords('none')).toBe('None');
    expect(stampWords({ at: NOW, detail: null })).toBe('Dec 10, 9:30 AM');
  });
});

describe('Deploys & Commits (D-168) @console', () => {
  it('prints the mockup’s facts and rows from the fixture', () => {
    const vm = deploysVM(fixtureDeploys(NOW));
    expect(vm.facts).toEqual({ repository: 'amplified-impact-lms', branch: 'main', service: 'web', environment: 'Production', live: 'a3f91c2' });
    expect(vm.rows.map((r) => [r.message, r.line, r.deploy.label, r.build, r.author, r.time])).toEqual([
      ['Scope 16px floor and 44px targets to phone widths', 'a3f91c2 · main', 'Live', '1m 48s', 'Connor Leiva', 'Dec 9, 10:42 PM'],
      ['Curriculum: fitted grid, tier pill, drag handles', '7be20d4 · main', 'Succeeded', '1m 52s', 'Avery Stone', 'Dec 9, 3:15 PM'],
      ['GHL orders: back off on 401 and record last error', 'c41d8e0 · main', 'Succeeded', '1m 44s', 'Connor Leiva', 'Dec 8, 8:02 PM'],
      ['Sidebar: collapsible groups and cohort switcher', '19aa6f3 · main', 'Failed', '0m 39s', 'Avery Stone', 'Dec 8, 11:20 AM'],
      ['Cohort starts at first build (migration 0014)', 'e5527b9 · main', 'Succeeded', '2m 03s', 'Connor Leiva', 'Dec 2, 9:48 AM'],
    ]);
    expect(vm.rows[3]!.deploy.tone).toBe('bad');
  });

  it('says "Not configured" with no token, "Unavailable" when neither answers, and keeps the live commit off Railway', () => {
    const d = fixtureDeploys(NOW, false);
    expect(deploysVM(d).rows).toEqual([]);
    expect(deploysVM(d).empty.title).toBe('Not configured');
    const off: DeploysView = { ...d, liveCommit: null, environment: 'development', history: { state: 'unavailable', source: 'github' } };
    expect(deploysVM(off).empty.title).toBe('Unavailable');
    expect(deploysVM(off).facts).toMatchObject({ live: null, environment: 'Development' });
    const github: DeploysView = { ...d, history: { state: 'ok', source: 'github', asOf: NOW, rows: [{ sha: 'abcdef1234', message: 'x', status: null, buildMs: null, author: null, at: NOW }] } };
    expect(deploysVM(github).rows[0]).toMatchObject({ deploy: { label: '—' }, build: '—', author: '—' });
  });
});

describe('DB Health (D-168) @console', () => {
  it('prints the mockup’s figures from the fixture', () => {
    const vm = dbVM(fixtureDbHealth(NOW));
    expect(vm.stats).toEqual([
      { label: 'Connections', value: '14 / 100', sub: 'Healthy', tone: 'ok' },
      { label: 'Database size', value: '1.8 GB' },
      { label: 'Slow queries, 24h', value: '3', sub: 'over 500 ms' },
      { label: 'Migration', value: '0014', sub: 'Up to date', tone: 'ok' },
    ]);
    expect(vm.slow!.map((q) => q.line)).toEqual(['1,940 ms mean · 96 calls', '812 ms mean · 14 calls', '604 ms mean · 7 calls']);
    expect(vm.tables.map((t) => [t.name, t.size, t.rows])).toEqual([
      ['activity', '412 MB', '2.1M rows'],
      ['progress', '288 MB', '940K rows'],
      ['auth_sessions', '164 MB', '310K rows'],
      ['job_runs', '121 MB', '1.4M rows'],
      ['stripe_events', '96 MB', '48K rows'],
      ['orders', '22 MB', '3.2K rows'],
    ]);
    expect(vm.migrations.map((m) => [m.tag, m.pill?.label ?? null, m.time])).toEqual([
      ['0014_cohort_starts_at_first_build', 'Latest', 'Dec 2, 9:48 AM'],
      ['0013_course_guide_links', null, 'Nov 24, 4:48 PM'],
      ['0012_access_group_domains', null, 'Nov 12, 1:10 PM'],
      ['0011_google_identities', null, 'Nov 3, 9:32 AM'],
    ]);
  });

  it('says what production has: no pg_stat_statements, pending migrations, a busy pool', () => {
    const v: DbHealthView = { ...fixtureDbHealth(NOW, false), connections: { used: 90, max: 100 }, migrations: { applied: [{ tag: '0021_incidents', at: NOW }], pending: ['0022_console_flags'] } };
    const vm = dbVM(v);
    expect(vm.slow).toBeNull();
    expect(vm.stats[0]).toEqual({ label: 'Connections', value: '90 / 100', sub: 'Near the limit', tone: 'warn' });
    expect(vm.stats[2]).toEqual({ label: 'Slow queries', value: '—', sub: 'Not available' });
    expect(vm.stats[3]).toEqual({ label: 'Migration', value: '0021', sub: '1 pending', tone: 'warn' });
    expect(vm.migrations[0]).toEqual({ tag: '0022_console_flags', time: null, pill: { label: 'Pending', tone: 'warn' } });
  });
});

describe('Environment Flags (D-168) @console', () => {
  const env = (): OpsEnv => fixtureOps(() => NOW, 'Casey Lin').env();

  it('prints the mockup’s facts, flags and secrets from the fixture', () => {
    const vm = flagsVM(env(), 'Owner');
    expect(vm.facts).toEqual({ environment: 'Production', stripe: { label: 'Live', tone: 'ok' }, email: 'Resend, live sending', on: '6 of 8' });
    expect(vm.flags.map((f) => [f.key, f.status.label])).toEqual([
      ['masquerade_enabled', 'On'],
      ['preview_as_learner', 'On'],
      ['google_sign_in', 'On'],
      ['accelerator_two_pay', 'On'],
      ['weekly_digest', 'On'],
      ['ghl_sync_write', 'On'],
      ['zoom_recording_webhook', 'Off'],
      ['maintenance_mode', 'Off'],
    ]);
    expect(vm.secrets.find((x) => x.name === 'Zoom recording webhook secret')!.status).toEqual({ label: 'Not configured', tone: 'warn' });
  });

  it('lets only the Owner flip masquerade_enabled, typed; never an env switch or a mockup-only flag', () => {
    const owner = flagsVM(env(), 'Owner').flags;
    expect(owner.filter((f) => f.flip).map((f) => f.key)).toEqual(['masquerade_enabled']);
    expect(owner[0]!.flip!.confirm).toEqual({
      title: 'Turn off masquerade_enabled?',
      body: 'Nobody can start or extend a masquerade session while it is off. A session already running ends at its time.',
      cta: 'Turn off',
      danger: true,
      typed: { word: 'masquerade_enabled', label: 'Type masquerade_enabled to confirm' },
    });
    expect(flipLabel(owner[0]!)).toBe('masquerade_enabled: On. Turn off…');
    for (const role of ['Admin', 'Support', null]) expect(flagsVM(env(), role).flags.filter((f) => f.flip), String(role)).toEqual([]);
    expect(flipConfirm('masquerade_enabled', true, true)).toMatchObject({ title: 'Turn on masquerade_enabled?', cta: 'Turn on', danger: false });
  });

  it('prints production’s modes', () => {
    const prod: OpsEnv = { flags: [], env: [], modes: { environment: 'development', stripe: 'unset', email: 'development', ghl: 'off' } };
    expect(flagsVM(prod, 'Owner').facts).toEqual({ environment: 'Development', stripe: { label: 'Not configured', tone: 'warn' }, email: 'Log file, not sent', on: '0 of 0' });
    expect(flagsVM({ ...prod, modes: { ...prod.modes, stripe: 'test', email: 'test' } }, 'Owner').facts).toMatchObject({ stripe: { label: 'Test', tone: 'info' }, email: 'Test outbox, not sent' });
  });
});
