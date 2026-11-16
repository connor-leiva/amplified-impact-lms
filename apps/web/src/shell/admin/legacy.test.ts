import { describe, expect, it } from 'vitest';
import { LEGACY_SCREENS, legacyFor } from './legacy';
import { R2_NAV } from './adminNav';

// D-160 R2-1b: the admin screens not yet rebuilt on R2, and what the shell keeps for them.

describe('the legacy screens (D-160 R2-1b)', () => {
  it('keeps the old frame geometry on exactly the screens behind the 14 old `main` checks', () => {
    const geometry = LEGACY_SCREENS.filter((s) => s.geometry).map((s) => s.match);
    expect(geometry).toEqual([
      '/admin',
      '/admin/curriculum',
      '/admin/curriculum/*',
      '/admin/cohorts',
      '/admin/learners',
      '/admin/vault',
      '/admin/announcements',
      '/admin/tiers',
      '/admin/staff',
    ]);
    for (const p of [
      '/admin',
      '/admin/',
      '/admin/curriculum',
      '/admin/curriculum/new',
      '/admin/curriculum/marketing',
      '/admin/cohorts',
      '/admin/learners',
      '/admin/vault',
      '/admin/announcements',
      '/admin/tiers',
      '/admin/staff',
    ])
      expect(legacyFor(p), p).toEqual({ type: true, geometry: true });
  });

  it('gives the Console’s Audit Log and Roles their old type in R2’s frame', () => {
    expect(legacyFor('/admin/audit')).toEqual({ type: true, geometry: false });
    expect(legacyFor('/admin/roles')).toEqual({ type: true, geometry: false });
  });

  it('gives everything else R2 throughout: the 404, Denied, and screens not yet built', () => {
    for (const p of [
      '/admin/no-such-page',
      '/admin/denied',
      '/admin/health',
      '/admin/workspaces',
      '/admin/curriculumx',
      '/admin/curriculum/'.slice(0, -1) + 'x',
    ])
      expect(legacyFor(p), p).toEqual({ type: false, geometry: false });
  });

  it('names the R2 PR that removes each row, and every row is a screen the R2 nav knows', () => {
    const rebuilt = Object.fromEntries(LEGACY_SCREENS.map((s) => [s.match, s.rebuiltIn]));
    expect(rebuilt).toEqual({
      '/admin': 'R2-3',
      '/admin/curriculum': 'R2-2',
      '/admin/curriculum/*': 'R2-2',
      '/admin/cohorts': 'R2-2',
      '/admin/learners': 'R2-3',
      '/admin/vault': 'R2-2',
      '/admin/announcements': 'R2-2',
      '/admin/tiers': 'R2-3',
      '/admin/staff': 'R2-3',
      '/admin/audit': 'R2-3',
      '/admin/roles': 'R2-3',
    });
    const paths = R2_NAV.flatMap(([, rows]) => rows.filter((r) => r.built).map((r) => r.path));
    for (const s of LEGACY_SCREENS) {
      const p = s.match.endsWith('/*') ? s.match.slice(0, -2) + '/new' : s.match;
      expect(
        paths.some((x) => x === p || (p.startsWith('/admin/curriculum/') && x === '/admin/curriculum/new')),
        s.match,
      ).toBe(true);
    }
  });
});
