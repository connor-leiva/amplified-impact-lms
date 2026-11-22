import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { viewerZone } from '@ai/core';
import {
  PREFS_KEY,
  loadPrefs,
  savePrefs,
  applyPrefs,
  bootPrefs,
  learnerSidebar,
  learnerTheme,
  loadLearnerPrefs,
  saveLearnerPrefs,
  setLearnerScope,
} from './prefs';

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

  // D-239: the admin sidebar's open group is view state. Its old stored map (D-160 R2-1b, from #125) is left where it
  // is, unread: saving any other preference keeps it as it was.
  it('leaves an old admin sidebar map where it is when other preferences are saved', () => {
    const old = { st1: { Access: true, Build: false } };
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'light', navGroups: old }));
    savePrefs({ theme: 'dark', sidebar: 'rail' });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!)).toEqual({ theme: 'dark', sidebar: 'rail', navGroups: old });
  });

  // D-185: the learner portal v2's theme and sidebar, per person on this device.
  describe('the learner portal v2, per person (D-185)', () => {
    afterEach(() => setLearnerScope(null));

    it('keeps two people’s choices apart, and leaves the device’s own alone @parity:SH-5 @parity:SH-6', () => {
      savePrefs({ theme: 'light', sidebar: 'full', tz: 'America/Denver' });
      saveLearnerPrefs('u_jamie', { theme: 'dark' });
      saveLearnerPrefs('u_jamie', { sidebar: 'rail' });
      saveLearnerPrefs('u_alex', { theme: 'light' });
      expect(loadLearnerPrefs('u_jamie')).toEqual({ theme: 'dark', sidebar: 'rail' });
      expect(loadLearnerPrefs('u_alex')).toEqual({ theme: 'light' });
      expect(learnerTheme('u_jamie')).toBe('dark');
      expect(learnerSidebar('u_jamie')).toBe('rail');
      expect(learnerTheme('u_sam')).toBe('light');
      expect(learnerSidebar('u_sam')).toBe('full');
      expect(loadPrefs()).toMatchObject({ theme: 'light', sidebar: 'full', tz: 'America/Denver' });
    });

    it('starts a person with no choice of their own from today’s portal’s, so a saved Dark draws the new portal dark @parity:SH-5', () => {
      savePrefs({ theme: 'dark', sidebar: 'rail' });
      expect(learnerTheme('u_jamie')).toBe('dark');
      expect(learnerSidebar('u_jamie')).toBe('rail');
      saveLearnerPrefs('u_jamie', { theme: 'light', sidebar: 'full' });
      expect(learnerTheme('u_jamie')).toBe('light');
      expect(learnerSidebar('u_jamie')).toBe('full');
    });

    it('draws the root in the person’s theme while their portal is on screen, and the device’s after @parity:SH-5', () => {
      savePrefs({ theme: 'light' });
      saveLearnerPrefs('u_jamie', { theme: 'dark' });
      expect(root().dataset.theme).toBe('light');
      setLearnerScope('u_jamie');
      expect(root().dataset.theme).toBe('dark');
      // Any later write (a zone, say) keeps the person's theme on the root while they are in scope.
      savePrefs({ tz: 'America/Chicago' });
      expect(root().dataset.theme).toBe('dark');
      setLearnerScope('u_alex');
      expect(root().dataset.theme).toBe('light');
      setLearnerScope(null);
      expect(root().dataset.theme).toBe('light');
    });

    it('ignores anything stored that is not one of the two values', () => {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ learner: { u_jamie: { theme: 'Dark', sidebar: 'rail', x: 1 }, u_alex: 7 } }),
      );
      expect(loadLearnerPrefs('u_jamie')).toEqual({ sidebar: 'rail' });
      expect(loadLearnerPrefs('u_alex')).toEqual({});
      expect(saveLearnerPrefs('u_jamie', { theme: 'midnight' as 'dark' }).learner?.u_jamie).toEqual({
        sidebar: 'rail',
      });
    });
  });
});
