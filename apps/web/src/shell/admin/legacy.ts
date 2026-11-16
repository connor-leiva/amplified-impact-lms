// The admin screens not yet rebuilt on the R2 design (D-160 R2-1b), and what the R2 shell keeps for
// them until their own R2 PR. ONE list, read by the shell and nothing else.
//
//   type      `main[data-legacy]`: the old shell's type, colour and canvas, and no scrollbar gutter, so
//             a screen built for the old frame reads as it did. R2's base resets and focus ring stay
//             out of it.
//
// R2-1b also kept the old frame's content box (a 248px sidebar, a 56px top bar, the full sidebar at
// 1024px) on the screens behind the old prototype checks still kept. R2-3a rebuilt the last of those
// (Overview, Learners & Teams, Tiers & Upgrades, Staff & Roles) and retired their checks, so that
// geometry is gone (D-160 R2-3a).
//
// Each R2 PR that rebuilds a screen removes its row here (Connor, Nov 16, 2026). R2-3b rebuilds the
// Audit Log and Roles & Permissions; then the list is empty, and this module and `main[data-legacy]`
// go.
//
// Every other admin address (the Console 404, Denied, every screen rebuilt) gets R2 throughout.

export type RebuiltIn = 'R2-3b';

export interface LegacyScreen {
  /** The address, exactly, or a prefix ending in `/*`. */
  match: string;
  /** The R2 PR that rebuilds it and removes this row. */
  rebuiltIn: RebuiltIn;
}

export const LEGACY_SCREENS: readonly LegacyScreen[] = [
  // The Console's Audit Log and Roles: D-157's look until R2-3b, in R2's frame. Their Denied state is
  // R2's own.
  { match: '/admin/audit', rebuiltIn: 'R2-3b' },
  { match: '/admin/roles', rebuiltIn: 'R2-3b' },
];

const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

const matches = (pattern: string, path: string): boolean =>
  pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) && path.length > pattern.length - 1 : path === pattern;

/** Whether the screen at `pathname` keeps the old type (`main[data-legacy]`). */
export function legacyFor(pathname: string): { type: boolean } {
  const p = norm(pathname);
  return { type: LEGACY_SCREENS.some((s) => matches(s.match, p)) };
}
