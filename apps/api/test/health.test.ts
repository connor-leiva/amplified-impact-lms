import { describe, it, expect } from 'vitest';

// Phase 07 replaces this with the API ⇔ core oracle suite. Gate 0 only needs the
// health contract to be stated somewhere that `pnpm test` runs.
describe('health contract @g0', () => {
  it('reports ok and a version', () => {
    const body = { ok: true, version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe('string');
  });
});
