import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../data/repository';
import { SIGN_OUT_FAILED, SIGN_OUT_ROUTE, leave, onSignOut, resetSignOutForTests } from '../data/session';

// D-152: the shell's Sign Out (the profile menu's last item, in the Admin Console and the learner
// portal, on the sidebar and in the phone's drawer) signs out for real. The prototype's handler only
// toasted that it was a demo, and Connor stayed signed in (2026-11-13, an iPhone, the Owner).
// The shell is rendered for real; only the data hooks are stood in for.

const OWNER: Viewer = { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' };
const JAMIE: Viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
const state: { db: Db; viewer: Viewer } = { db: seed('live'), viewer: OWNER };

vi.mock('../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));

const { default: AppShell } = await import('./AppShell');

let fetchMock: Mock;
let toSignIn: Mock;
let teardown: Mock;
const answer = (status: number) => ({ ok: status < 400, status, json: async () => ({}) }) as unknown as Response;

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <p>the dashboard</p> },
          { path: 'admin', element: <p>the admin overview</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

// The learner shell's profile button is titled "… · profile and settings"; the R2 admin shell's user
// chip (D-160 R2-1b) is named "{name}, {role}. Profile and settings", untitled as the mockup draws it.
const openProfile = () =>
  fireEvent.click(screen.queryByTitle(/· profile and settings$/) ?? screen.getByRole('button', { name: /\. Profile and settings$/ }));

/**
 * The order of each Sign Out request among the shell's calls. The admin shell also reads the sidebar's
 * open-incident count (D-167, `useOpenIncidents`), which is no part of signing out.
 */
const signOuts = (): number[] =>
  fetchMock.mock.calls.flatMap(([url], i) => (url === SIGN_OUT_ROUTE ? [fetchMock.mock.invocationCallOrder[i]!] : []));

beforeEach(() => {
  resetSignOutForTests();
  state.db = seed('live');
  state.viewer = OWNER;
  fetchMock = vi.fn(async () => answer(200));
  vi.stubGlobal('fetch', fetchMock);
  toSignIn = vi.fn();
  vi.spyOn(leave, 'toSignIn').mockImplementation(toSignIn);
  teardown = vi.fn();
  onSignOut(teardown);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSignOutForTests();
  delete document.body.dataset.appReady;
});

describe('Sign Out in the shell (D-152)', () => {
  it('in the Admin Console: ends the server session, forgets the page, then replaces it with /sign-in', async () => {
    renderAt('/admin');
    openProfile();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => expect(toSignIn).toHaveBeenCalledTimes(1));
    expect(signOuts()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(SIGN_OUT_ROUTE, expect.objectContaining({ method: 'POST', credentials: 'include' }));
    // In that order: the server first, then the page's own memory, then away.
    expect(signOuts()[0]).toBeLessThan(teardown.mock.invocationCallOrder[0]!);
    expect(teardown.mock.invocationCallOrder[0]).toBeLessThan(toSignIn.mock.invocationCallOrder[0]!);
    // No demo toast, ever.
    expect(screen.queryByText(/\(demo\)/)).toBeNull();
    expect(screen.queryByText(/signed out/i)).toBeNull();
  });

  it('in the learner portal on a phone, from the drawer, does the same', async () => {
    state.viewer = JAMIE;
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      renderAt('/');
      expect(document.querySelector('aside[aria-label="Primary"]')?.getAttribute('data-mode')).toBe('drawer');
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      openProfile();
      fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
      await waitFor(() => expect(toSignIn).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledWith(SIGN_OUT_ROUTE, expect.objectContaining({ method: 'POST', credentials: 'include' }));
      expect(screen.queryByText(/\(demo\)/)).toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('says so and stays put when the server did not end the session, and a second try works', async () => {
    let first = true;
    fetchMock.mockImplementation(async (url: unknown) => {
      if (url !== SIGN_OUT_ROUTE || !first) return answer(200);
      first = false;
      return answer(500);
    });
    renderAt('/admin');
    openProfile();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(await screen.findByText(SIGN_OUT_FAILED)).toBeInTheDocument();
    expect(toSignIn).not.toHaveBeenCalled();
    expect(teardown).not.toHaveBeenCalled();
    expect(screen.getByText('the admin overview')).toBeInTheDocument();

    await act(async () => {
      openProfile();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => expect(toSignIn).toHaveBeenCalledTimes(1));
    expect(signOuts()).toHaveLength(2);
  });
});

describe('no demo sign-out is left (D-152)', () => {
  const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const DEMO_SIGN_OUT = /signed out \(demo\)|sign[\s-]?out[^\n'"`]{0,40}\(demo\)/i;

  function files(dir: string, keep: RegExp): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : files(p, keep);
      return keep.test(name) ? [p] : [];
    });
  }

  it('in the source: no file the app bundles has a "(demo)" string', () => {
    const src = files(join(WEB, 'src'), /\.(ts|tsx)$/).filter((p) => !/\.test\.tsx?$/.test(p));
    expect(src.some((p) => p.endsWith('AppShell.tsx'))).toBe(true);
    for (const p of src) {
      const text = readFileSync(p, 'utf8');
      expect(text, relative(WEB, p)).not.toMatch(DEMO_SIGN_OUT);
      expect(text, relative(WEB, p)).not.toMatch(/['"`][^'"`\n]*\(demo\)[^'"`\n]*['"`]/);
    }
  });

  // The built bundle, when there is one (the gate builds before it tests; CI's web job too).
  it.skipIf(!existsSync(join(WEB, 'dist', 'assets')))('in the built bundle: no chunk or source map says it', () => {
    const built = files(join(WEB, 'dist', 'assets'), /\.(js|map)$/);
    expect(built.length).toBeGreaterThan(0);
    const offenders = built.filter((p) => DEMO_SIGN_OUT.test(readFileSync(p, 'utf8'))).map((p) => relative(WEB, p));
    expect(offenders).toEqual([]);
  });
});
