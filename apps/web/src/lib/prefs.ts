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
  /**
   * D-185: the learner portal v2's theme and sidebar, by the signed-in person's user id. Per person on
   * this device, and the device's copy of what the API keeps per person (`users.prefs`, through
   * `PATCH /api/me/prefs`): two people on one browser keep their own. `theme` and `sidebar` above stay
   * the current portal's, for this device, unchanged; a person with no choice of their own here starts
   * from them.
   */
  learner?: Record<string, LearnerPrefs>;
};

/** D-185: one person's own choices in the learner portal v2. */
export type LearnerPrefs = { theme?: 'light' | 'dark'; sidebar?: 'full' | 'rail' };

export const loadPrefs = (): Prefs => {
  try {
    return (JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Prefs) ?? {};
  } catch {
    return {};
  }
};

/**
 * D-185: whose learner portal v2 is on screen, or null when none is. Set by the learner shell while it is
 * mounted, so the theme on the root follows that person's own choice there, and today's portal (which
 * never sets it) keeps the device's.
 */
let learnerScope: string | null = null;

export function applyPrefs(p: Prefs) {
  const d = document.documentElement;
  d.dataset.theme = learnerScope === null ? (p.theme === 'dark' ? 'dark' : 'light') : learnerTheme(learnerScope, p);
  setViewerZone(p.tz ?? null);
}

/** D-185: the learner shell says whose portal is on screen (null as it goes), and the root's theme follows. */
export function setLearnerScope(userId: string | null): void {
  learnerScope = userId;
  // The theme only: the zone is the device's either way, and is already applied.
  const p = loadPrefs();
  document.documentElement.dataset.theme =
    userId === null ? (p.theme === 'dark' ? 'dark' : 'light') : learnerTheme(userId, p);
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

/** D-185: one person's own learner v2 choices, read field by field; empty when they have none. */
export function loadLearnerPrefs(userId: string, prefs: Prefs = loadPrefs()): LearnerPrefs {
  const all = prefs.learner;
  const mine = all && typeof all === 'object' ? all[userId] : undefined;
  return cleanLearnerPrefs(mine);
}

/** Only the two known values of each field survive, from storage or from the API. */
export function cleanLearnerPrefs(value: unknown): LearnerPrefs {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const out: LearnerPrefs = {};
  if (raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  if (raw.sidebar === 'full' || raw.sidebar === 'rail') out.sidebar = raw.sidebar;
  return out;
}

/**
 * D-185: the theme a person's learner v2 draws in: their own choice, else the device's (today's portal's
 * switch), else light. So a Dark chosen in today's portal draws the new portal dark too, all of it.
 */
export function learnerTheme(userId: string, prefs: Prefs = loadPrefs()): 'light' | 'dark' {
  return loadLearnerPrefs(userId, prefs).theme ?? (prefs.theme === 'dark' ? 'dark' : 'light');
}

/** D-185: a person's desktop sidebar in learner v2: their own choice, else the device's, else full. */
export function learnerSidebar(userId: string, prefs: Prefs = loadPrefs()): 'full' | 'rail' {
  return loadLearnerPrefs(userId, prefs).sidebar ?? (prefs.sidebar === 'rail' ? 'rail' : 'full');
}

/** D-185: remember one person's learner v2 choice, leaving everyone else's, and the device's own, untouched. */
export function saveLearnerPrefs(userId: string, patch: LearnerPrefs): Prefs {
  const all = loadPrefs().learner;
  const others = all && typeof all === 'object' ? all : {};
  return savePrefs({ learner: { ...others, [userId]: { ...loadLearnerPrefs(userId), ...cleanLearnerPrefs(patch) } } });
}
