import { describe, expect, it } from 'vitest';
import { LEGACY_SCREENS, legacyFor } from './legacy';
import { R2_NAV } from './adminNav';

// D-160 R2-1b: the admin screens not yet rebuilt on R2, and what the shell keeps for them. R2-2 and
// R2-3a rebuilt the rest; the Console's Audit Log and Roles remain until R2-3b.

describe('the legacy screens (D-160 R2-1b, R2-3a)', () => {
  it('gives only the Console’s Audit Log and Roles their old type, in R2’s frame', () => {
    expect(LEGACY_SCREENS.map((s) => s.match)).toEqual(['/admin/audit', '/admin/roles']);
    expect(legacyFor('/admin/audit')).toEqual({ type: true });
    expect(legacyFor('/admin/roles/')).toEqual({ type: true });
  });

  it('gives everything else R2 throughout: the rebuilt screens, the 404, Denied, and screens not yet built', () => {
    for (const p of [
      '/admin',
      '/admin/',
      '/admin/learners',
      '/admin/tiers',
      '/admin/staff',
      '/admin/curriculum',
      '/admin/curriculum/new',
      '/admin/cohorts',
      '/admin/vault',
      '/admin/announcements',
      '/admin/no-such-page',
      '/admin/denied',
      '/admin/health',
      '/admin/auditx',
    ])
      expect(legacyFor(p), p).toEqual({ type: false });
  });

  it('names R2-3b for each row, and every row is a screen the R2 nav knows', () => {
    expect(LEGACY_SCREENS.every((s) => s.rebuiltIn === 'R2-3b')).toBe(true);
    const paths = R2_NAV.flatMap(([, rows]) => rows.filter((r) => r.built).map((r) => r.path));
    for (const s of LEGACY_SCREENS) expect(paths, s.match).toContain(s.match);
  });
});
