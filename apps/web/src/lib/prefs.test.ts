import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { viewerZone } from '@ai/core';
import { PREFS_KEY, loadPrefs, savePrefs, applyPrefs, bootPrefs } from './prefs';

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

  it('boots from what is stored', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'dark', sidebar: 'rail' }));
    expect(bootPrefs()).toEqual({ theme: 'dark', sidebar: 'rail' });
    expect(root().dataset.theme).toBe('dark');
  });

  it('cannot be talked off-brand by a stale accent or typeface left in storage (D-031)', () => {
    // A browser that used the prototype's Brand tweaks still holds `accent` and `font`. Booting from
    // it must not set the attributes those values used to select: the brand is fixed, and the CSS
    // rules they keyed are gone from the reference and from tokens.css.
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'light', accent: 'indigo', font: 'schibsted' }));
    bootPrefs();
    expect(root().dataset.accent).toBeUndefined();
    expect(root().dataset.font).toBeUndefined();
  });
});
