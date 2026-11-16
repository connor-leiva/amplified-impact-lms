// The admin screens not yet rebuilt on the R2 design (D-160 R2-1b), and what the R2 shell keeps for
// them until their own R2 PR. ONE list, read by the shell and nothing else.
//
//   type      `main[data-legacy]`: the old shell's type, colour and canvas, and no scrollbar gutter, so
//             a screen built for the old frame reads as it did. R2's base resets and focus ring stay
//             out of it.
//   geometry  TRANSITIONAL. The old frame's content box: a 248px sidebar (not R2's 244), a 56px top bar
//             (not 52) and the full sidebar at 1024px (not the 64px rail), so `main` keeps the size
//             its prototype golden was taken at: 1192 × 844 at 1440 × 900 and 776 × 712 at 1024 × 768.
//             With R2's geometry `main` is 1196 × 848 and 960 × 716, and those 14 `admin-*` `main`
//             checks fail on their dimensions alone (measured in the pinned container; with this
//             geometry all 17 `admin-*` scenarios pass, so nothing inside `main` moves). Early
//             retirement of those checks was not approved, so none was done.
//
// Each R2 PR that rebuilds a screen removes its row here and retires its old checks in the same PR
// (Connor, Nov 16, 2026): R2-2 the Curriculum, Module Builder, Resource Vault, Cohorts & Sessions and
// Announcements rows; R2-3 the Overview, Learners & Teams, Tiers & Upgrades, Staff & Roles, Audit Log
// and Roles & Permissions rows. When the list is empty, this module and both mechanisms go.
//
// Every other admin address (the Console 404, Denied, every screen rebuilt later) gets R2 throughout.

export type RebuiltIn = 'R2-2' | 'R2-3';

export interface LegacyScreen {
  /** The address, exactly, or a prefix ending in `/*`. */
  match: string;
  /** Keep the old frame's content box (see above). */
  geometry: boolean;
  /** The R2 PR that rebuilds it and removes this row. */
  rebuiltIn: RebuiltIn;
}

export const LEGACY_SCREENS: readonly LegacyScreen[] = [
  { match: '/admin', geometry: true, rebuiltIn: 'R2-3' },
  { match: '/admin/curriculum', geometry: true, rebuiltIn: 'R2-2' },
  { match: '/admin/curriculum/*', geometry: true, rebuiltIn: 'R2-2' },
  { match: '/admin/cohorts', geometry: true, rebuiltIn: 'R2-2' },
  { match: '/admin/learners', geometry: true, rebuiltIn: 'R2-3' },
  { match: '/admin/vault', geometry: true, rebuiltIn: 'R2-2' },
  { match: '/admin/announcements', geometry: true, rebuiltIn: 'R2-2' },
  { match: '/admin/tiers', geometry: true, rebuiltIn: 'R2-3' },
  { match: '/admin/staff', geometry: true, rebuiltIn: 'R2-3' },
  // The Console's Audit Log and Roles: D-157's look until R2-3, in R2's frame (they have no prototype
  // golden to keep). Their Denied state is R2's own.
  { match: '/admin/audit', geometry: false, rebuiltIn: 'R2-3' },
  { match: '/admin/roles', geometry: false, rebuiltIn: 'R2-3' },
];

const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

const matches = (pattern: string, path: string): boolean =>
  pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) && path.length > pattern.length - 1 : path === pattern;

/** What the shell keeps for the screen at `pathname`: the old type, the old geometry, or neither. */
export function legacyFor(pathname: string): { type: boolean; geometry: boolean } {
  const p = norm(pathname);
  const row = LEGACY_SCREENS.find((s) => matches(s.match, p));
  return { type: !!row, geometry: !!row?.geometry };
}
