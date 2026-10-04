import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Production safety (CLAUDE.md): the demo controls and the `?as=` / `?phase=` / `?now=` params
 * exist ONLY in fixture mode. In http mode they must be impossible, not merely hidden — otherwise
 * anyone could put `?as=admin` on the production URL.
 *
 * `boot.ts` resolves all of this once at module load, so each case re-imports it with a fresh
 * module registry and a stubbed URL.
 */
const load = async (search: string, env: Record<string, string>) => {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  window.history.replaceState({}, '', `/${search}`);
  return import('./boot');
};

describe('data source boot @g4', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState({}, '', '/');
  });

  it('ignores ?as, ?phase and ?demo in http mode', async () => {
    const boot = await load('?as=admin&phase=post&demo=1&now=2027-01-01T00:00:00Z', {
      VITE_DATA_SOURCE: 'http',
      VITE_DEMO_MODE: 'true',
    });
    expect(boot.isFixture).toBe(false);
    expect(boot.demoMode).toBe(false);
    expect(boot.repo.source).toBe('http');
  });

  it('keeps demoMode false in http mode even when VITE_DEMO_MODE is true', async () => {
    const boot = await load('', { VITE_DATA_SOURCE: 'http', VITE_DEMO_MODE: 'true' });
    expect(boot.demoMode).toBe(false);
  });

  it('honours ?as and ?phase in fixture mode', async () => {
    const boot = await load('?as=admin&phase=post', { VITE_DATA_SOURCE: 'fixture', VITE_DEMO_MODE: 'true' });
    expect(boot.isFixture).toBe(true);
    expect(boot.fixtureRole).toBe('admin');
    expect(boot.fixturePhase).toBe('post');
    expect(boot.demoMode).toBe(true);
    expect(boot.repo.source).toBe('fixture');
  });

  it('rejects an unknown role or phase rather than passing it through', async () => {
    const boot = await load('?as=superuser&phase=whenever', { VITE_DATA_SOURCE: 'fixture' });
    expect(boot.fixtureRole).toBe('agent');
    expect(boot.fixturePhase).toBe('live');
  });

  it('remembers the persona for the session, as the prototype does', async () => {
    await load('?as=owner', { VITE_DATA_SOURCE: 'fixture' });
    expect(sessionStorage.getItem('ai-lms-role')).toBe('owner');
    const boot = await load('', { VITE_DATA_SOURCE: 'fixture' });
    expect(boot.fixtureRole).toBe('owner');
  });

  it('defaults to http when no data source is configured', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_DATA_SOURCE', '');
    window.history.replaceState({}, '', '/');
    const boot = await import('./boot');
    expect(boot.repo.source).toBe('http');
    expect(boot.demoMode).toBe(false);
  });
});
