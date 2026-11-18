import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { AppearancePrefs, Viewer } from '../../data/repository';
import type * as BootModule from '../../data/boot';
import { resetMasquerade } from '../../data/masquerade';
import { PREFS_KEY, loadLearnerPrefs, savePrefs, setLearnerScope } from '../../lib/prefs';
import type { CourseLoad } from '../../routes/learn/data';
import type * as DataModule from '../../routes/learn/data';
import { learnerRoutes } from '../../routes/learn/routes';
import { LEARNER_ID, prelaunchState } from '../../routes/learn/test/fixture';

// D-185: the learner shell's Theme (the account menu) and its desktop Collapse sidebar, rendered through
// the shell's own routes. The data hooks and `GET /api/course` are stood in for, as in Learn.test.tsx, and
// the repository is a stand-in whose `prefs()` is what the API keeps for this person.

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: prelaunchState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: prelaunchState().now,
  course: { kind: 'ready', payload: prelaunchState().payload },
};
const api: { source: 'fixture' | 'http'; stored: AppearancePrefs } = { source: 'http', stored: {} };
const savePrefsSpy = vi.fn(async (_patch: AppearancePrefs) => {});
const prefsSpy = vi.fn(async () => api.stored);

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => vi.fn(async () => ({})),
}));
vi.mock('../../routes/learn/data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
vi.mock('../../data/boot', async (importOriginal) => ({
  ...(await importOriginal<typeof BootModule>()),
  repo: {
    get source() {
      return api.source;
    },
    prefs: () => prefsSpy(),
    savePrefs: (p: AppearancePrefs) => savePrefsSpy(p),
  },
}));

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

async function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
  return router;
}

const root = () => document.documentElement;
const frame = () => document.querySelector<HTMLElement>('[data-learner-v2]')!;
const aside = () => document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;

async function chooseTheme(name: 'Light' | 'Dark') {
  fireEvent.click(screen.getByRole('button', { name: 'Your account' }));
  const group = await screen.findByRole('group', { name: 'Theme' });
  expect(group).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitemradio', { name }));
}

beforeEach(() => {
  localStorage.clear();
  setViewerZone('America/Denver');
  setWidth(1440);
  api.source = 'http';
  api.stored = {};
  savePrefsSpy.mockClear();
  prefsSpy.mockClear();
  resetMasquerade({ status: 'none' });
  state.viewer = { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' };
  delete root().dataset.theme;
});
afterEach(() => {
  cleanup();
  setLearnerScope(null);
  setViewerZone(null);
  localStorage.clear();
  resetMasquerade();
});

describe('the learner shell’s Theme (D-185)', () => {
  it('the account menu switches to Dark and back, and remembers it for this person @parity:SH-5', async () => {
    await at('/learn');
    expect(frame().dataset.lvTheme).toBe('light');
    await chooseTheme('Dark');
    await waitFor(() => expect(frame().dataset.lvTheme).toBe('dark'));
    expect(root().dataset.theme).toBe('dark');
    expect(loadLearnerPrefs(LEARNER_ID)).toEqual({ theme: 'dark' });
    await waitFor(() => expect(savePrefsSpy).toHaveBeenCalledWith({ theme: 'dark' }));
    // The menu says which is in use, with a check and in words (aria-checked), never colour alone.
    fireEvent.click(screen.getByRole('button', { name: 'Your account' }));
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Light' }));
    await waitFor(() => expect(frame().dataset.lvTheme).toBe('light'));
    expect(root().dataset.theme).toBe('light');
  });

  it('the dark page carries the brand’s reversed wordmark @parity:SH-5', async () => {
    await at('/learn');
    const fill = () => document.querySelector('[data-brand-slot] path')?.getAttribute('fill');
    expect(fill()).toBe('#0A0D0C');
    await chooseTheme('Dark');
    await waitFor(() => expect(fill()).toBe('#F5F5F2'));
  });

  it('takes what the API keeps for this person, and gives the device’s theme back as it goes @parity:SH-5', async () => {
    api.stored = { theme: 'dark', sidebar: 'rail' };
    const router = await at('/learn');
    await waitFor(() => expect(frame().dataset.lvTheme).toBe('dark'));
    expect(aside().dataset.rail).toBe('true');
    await act(async () => {
      await router.navigate('/');
    });
    expect(root().dataset.theme).toBe('light');
  });

  it('a Dark saved in today’s portal draws the new portal dark, the whole frame @parity:SH-5', async () => {
    savePrefs({ theme: 'dark' });
    await at('/learn');
    expect(frame().dataset.lvTheme).toBe('dark');
    expect(root().dataset.theme).toBe('dark');
  });

  it('stores nothing through the API in fixture mode, in a preview tab or during a masquerade', async () => {
    api.source = 'fixture';
    await at('/learn');
    await chooseTheme('Dark');
    await waitFor(() => expect(frame().dataset.lvTheme).toBe('dark'));
    cleanup();
    api.source = 'http';
    state.viewer = { actor: { kind: 'learner', userId: 'preview-learner' }, role: 'agent', preview: 'agent' };
    await at('/learn');
    await chooseTheme('Dark');
    cleanup();
    state.viewer = { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' };
    resetMasquerade({ status: 'active', session: {} as never, skew: 0 });
    await at('/learn');
    await chooseTheme('Light');
    await waitFor(() => expect(frame().dataset.lvTheme).toBe('light'));
    await new Promise((r) => setTimeout(r, 20));
    expect(savePrefsSpy).not.toHaveBeenCalled();
    expect(prefsSpy).toHaveBeenCalledTimes(1);
  });
});

describe('the learner shell’s desktop sidebar (D-185)', () => {
  it('on a desktop, Collapse sidebar makes it the rail and Expand sidebar brings it back, remembered @parity:SH-6 @parity:MO-3', async () => {
    await at('/learn');
    expect(aside().dataset.rail).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    await waitFor(() => expect(aside().dataset.rail).toBe('true'));
    expect(loadLearnerPrefs(LEARNER_ID)).toEqual({ sidebar: 'rail' });
    await waitFor(() => expect(savePrefsSpy).toHaveBeenCalledWith({ sidebar: 'rail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    await waitFor(() => expect(aside().dataset.rail).toBeUndefined());
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').learner[LEARNER_ID]).toEqual({ sidebar: 'full' });
  });

  it('on a laptop, the rail is automatic and there is no toggle, whatever the person chose @parity:MO-3', async () => {
    setWidth(1024);
    await at('/learn');
    expect(aside().dataset.rail).toBe('true');
    expect(screen.queryByRole('button', { name: /sidebar$/ })).toBeNull();
  });

  it('on a phone, the sidebar is the drawer, never the rail @parity:MO-3', async () => {
    setWidth(390);
    await at('/learn');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(aside().dataset.rail).toBeUndefined();
    expect(screen.queryByRole('button', { name: /sidebar$/ })).toBeNull();
  });
});
