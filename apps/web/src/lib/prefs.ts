// Port of the prototype's loadPrefs / applyPrefs / savePrefs. Browser-only, so it lives here
// and not in packages/core.
//
// Theme, time zone and sidebar mode are the only appearance preferences. The prototype's accent
// (Pine/Indigo/Plum) and typeface (Hanken/Instrument/Schibsted) tweaks existed "while the brand is
// undecided" (DESIGN.md); the brand is decided, so they were removed from the reference and from
// here together (D-031). A stale `accent` or `font` key left in someone's localStorage is simply
// ignored — nothing reads it and no stylesheet rule matches the attributes it used to set.
import { setViewerZone } from '@ai/core';

export const PREFS_KEY = 'ai-lms-prefs';

export type Prefs = {
  theme?: 'light' | 'dark';
  tz?: string | null; // null/undefined = Auto
  sidebar?: 'full' | 'rail';
  phase?: 'week0' | 'live' | 'post'; // fixture/demo only
  /**
   * The admin sidebar's open and closed groups (D-160 R2-1b, from #125), by the signed-in staff member's user id, then
   * by group label. Per user per browser: two staff members on one browser keep their own.
   */
  navGroups?: Record<string, Record<string, boolean>>;
};

export const loadPrefs = (): Prefs => {
  try {
    return (JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Prefs) ?? {};
  } catch {
    return {};
  }
};

export function applyPrefs(p: Prefs) {
  const d = document.documentElement;
  d.dataset.theme = p.theme === 'dark' ? 'dark' : 'light';
  setViewerZone(p.tz ?? null);
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...loadPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* private mode, quota — preferences are best-effort */
  }
  applyPrefs(next);
  window.dispatchEvent(new CustomEvent('ai-prefs', { detail: next }));
  return next;
}

/** Apply stored preferences. Call once at boot. */
export function bootPrefs(): Prefs {
  const stored = loadPrefs();
  applyPrefs(stored);
  return stored;
}

/** One staff member's remembered sidebar groups (D-160 R2-1b); empty when they have none. */
export function loadNavGroups(userId: string, prefs: Prefs = loadPrefs()): Record<string, boolean> {
  const mine = prefs.navGroups?.[userId];
  if (!mine || typeof mine !== 'object') return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(mine)) if (typeof v === 'boolean') out[k] = v;
  return out;
}

/** Remember one staff member's groups, leaving every other user's untouched. */
export function saveNavGroups(userId: string, state: Record<string, boolean>): Prefs {
  const all = loadPrefs().navGroups;
  return savePrefs({ navGroups: { ...(all && typeof all === 'object' ? all : {}), [userId]: { ...state } } });
}
