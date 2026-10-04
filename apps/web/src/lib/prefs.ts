// Port of the prototype's loadPrefs / applyPrefs / savePrefs. Browser-only, so it lives here
// and not in packages/core.
import { setViewerZone } from '@ai/core';
import { loadAltFont } from '../styles/fonts';

export const PREFS_KEY = 'ai-lms-prefs';

export type Accent = 'pine' | 'indigo' | 'plum';
export type Typeface = 'hanken' | 'instrument' | 'schibsted';

export type Prefs = {
  theme?: 'light' | 'dark';
  tz?: string | null; // null/undefined = Auto
  sidebar?: 'full' | 'rail';
  accent?: Accent;
  font?: Typeface;
  phase?: 'week0' | 'live' | 'post'; // fixture/demo only
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
  if (p.accent && p.accent !== 'pine') d.dataset.accent = p.accent;
  else delete d.dataset.accent;
  if (p.font && p.font !== 'hanken') {
    d.dataset.font = p.font;
    void loadAltFont(p.font);
  } else delete d.dataset.font;
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

/**
 * Brand configuration (accent and typeface) is product configuration, not a user preference.
 * It is read from the environment at boot. The default is pine + hanken, which matches the reference.
 */
export function brandConfig(): { accent: Accent; font: Typeface } {
  const accents: Accent[] = ['pine', 'indigo', 'plum'];
  const fonts: Typeface[] = ['hanken', 'instrument', 'schibsted'];
  const accent = import.meta.env.VITE_BRAND_ACCENT as Accent | undefined;
  const font = import.meta.env.VITE_BRAND_FONT as Typeface | undefined;
  return {
    accent: accent && accents.includes(accent) ? accent : 'pine',
    font: font && fonts.includes(font) ? font : 'hanken',
  };
}

/**
 * Apply stored preferences on top of the brand defaults. Call once at boot.
 *
 * The brand env vars supply the DEFAULT accent and typeface (pine + hanken, matching the
 * reference). A stored value still wins, because that is what the prototype does — it reads both
 * from `prefs` — and the Gate 1 token-parity test drives the accent and typeface combinations
 * through `localStorage['ai-lms-prefs']` on both sides.
 */
export function bootPrefs(): Prefs {
  const brand = brandConfig();
  const stored = loadPrefs();
  const next: Prefs = { ...stored, accent: stored.accent ?? brand.accent, font: stored.font ?? brand.font };
  applyPrefs(next);
  return next;
}
