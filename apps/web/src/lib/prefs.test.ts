import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { viewerZone } from '@ai/core';
import { PREFS_KEY, loadPrefs, savePrefs, applyPrefs, brandConfig, bootPrefs } from './prefs';

// The alternate typefaces are lazy-loaded CSS; jsdom cannot resolve @fontsource, and the test is
// about which preference wins, not about the stylesheet.
vi.mock('../styles/fonts', () => ({ loadAltFont: vi.fn(() => Promise.resolve([])) }));

describe('prefs @g1', () => {
  const root = () => document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    delete root().dataset.accent;
    delete root().dataset.font;
    delete root().dataset.theme;
  });
  afterEach(() => localStorage.clear());

  it('reads an empty object when nothing is stored', () => expect(loadPrefs()).toEqual({}));

  it('survives malformed JSON rather than throwing', () => {
    localStorage.setItem(PREFS_KEY, '{not json');
    expect(loadPrefs()).toEqual({});
  });

  it('round-trips through localStorage under the prototype key', () => {
    savePrefs({ theme: 'dark', sidebar: 'rail' });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!)).toEqual({ theme: 'dark', sidebar: 'rail' });
    expect(loadPrefs().sidebar).toBe('rail');
  });

  it('merges a patch instead of replacing the whole object', () => {
    savePrefs({ theme: 'dark', sidebar: 'rail' });
    savePrefs({ theme: 'light' });
    expect(loadPrefs()).toEqual({ theme: 'light', sidebar: 'rail' });
  });

  it('sets data-theme on the root element, defaulting to light', () => {
    applyPrefs({ theme: 'dark' });
    expect(root().dataset.theme).toBe('dark');
    applyPrefs({});
    expect(root().dataset.theme).toBe('light');
  });

  it('only sets data-accent and data-font away from the defaults', () => {
    applyPrefs({ accent: 'pine', font: 'hanken' });
    expect(root().dataset.accent).toBeUndefined();
    expect(root().dataset.font).toBeUndefined();

    applyPrefs({ accent: 'indigo', font: 'schibsted' });
    expect(root().dataset.accent).toBe('indigo');
    expect(root().dataset.font).toBe('schibsted');
  });

  it('pushes the time zone into core, and null means Auto', () => {
    applyPrefs({ tz: 'America/New_York' });
    expect(viewerZone()).toBe('America/New_York');
    applyPrefs({ tz: null });
    expect(viewerZone()).not.toBe('America/New_York');
  });

  it('announces a change on the window so every rendered time can refresh', () => {
    const seen: unknown[] = [];
    const onPrefs = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener('ai-prefs', onPrefs);
    savePrefs({ theme: 'dark' });
    window.removeEventListener('ai-prefs', onPrefs);
    expect(seen).toEqual([{ theme: 'dark' }]);
  });

  it('defaults the brand to pine + hanken, which is what the reference renders', () =>
    expect(brandConfig()).toEqual({ accent: 'pine', font: 'hanken' }));

  it('ignores an unrecognised brand value rather than passing it through', () => {
    vi.stubEnv('VITE_BRAND_ACCENT', 'chartreuse');
    expect(brandConfig().accent).toBe('pine');
    vi.unstubAllEnvs();
  });

  it('lets a stored preference beat the brand default', () => {
    // The brand env supplies the DEFAULT; the prototype reads accent and typeface from prefs, and
    // the Gate 1 token-parity test drives both through localStorage.
    localStorage.setItem(PREFS_KEY, JSON.stringify({ accent: 'plum', font: 'instrument' }));
    expect(bootPrefs()).toMatchObject({ accent: 'plum', font: 'instrument' });
    expect(root().dataset.accent).toBe('plum');
    expect(root().dataset.font).toBe('instrument');
  });

  it('falls back to the brand default when nothing is stored', () => {
    expect(bootPrefs()).toMatchObject({ accent: 'pine', font: 'hanken' });
    expect(root().dataset.accent).toBeUndefined();
  });
});
