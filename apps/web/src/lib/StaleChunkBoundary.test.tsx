import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';
import { StaleChunkBoundary, withStaleChunkRecovery } from './StaleChunkBoundary';
import { RELOAD_KEY, page, resetStaleChunkForTests } from './stale-chunk';

// D-170: the router's half. A lazy route whose file a deploy removed reloads the page once and draws
// nothing new; every other error still gets React Router's default screen, the only error screen the
// app has ever shown.

const STALE_JS =
  'Failed to fetch dynamically imported module: https://learn.amplifiedimpact.io/assets/Staff-B3x9-1aQ.js';
const STALE_CSS = 'Unable to preload CSS for https://learn.amplifiedimpact.io/assets/Staff-CKfOKx-c.css';
const DEFAULT_SCREEN = 'Unexpected Application Error!';

let reload: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetStaleChunkForTests();
  sessionStorage.clear();
  reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
  // React Router and React report a caught render error on the console; that is expected here.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

/** The app's shape in miniature: a page outside the shell, and the shell with a lazy child (like `/admin/staff`). */
function app(staff: () => Promise<{ Component: () => React.ReactNode }>): RouteObject[] {
  return withStaleChunkRecovery([
    { path: '/sign-in', element: <p>Sign In</p> },
    {
      path: '/',
      lazy: async () => ({
        Component: () => (
          <main>
            <p>Shell</p>
            <Outlet />
          </main>
        ),
      }),
      children: [{ path: 'admin/staff', lazy: staff }],
    },
  ]);
}

async function open(routes: RouteObject[], at: string) {
  const router = createMemoryRouter(routes, { initialEntries: [at] });
  const view = render(<RouterProvider router={router} />);
  await act(async () => {
    await router.navigate(at, { replace: true }).catch(() => {});
  });
  return { router, view };
}

const reject = (err: unknown) => (): Promise<never> => Promise.reject(err);

describe('the router’s stale-chunk boundary', () => {
  it('reloads once on a stale chunk and renders nothing new', async () => {
    const { view } = await open(app(reject(new TypeError(STALE_JS))), '/admin/staff');
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();
    expect(screen.queryByText(DEFAULT_SCREEN)).toBeNull();
    expect(view.container.textContent).toBe('');
  });

  it('does the same for Vite’s “Unable to preload CSS”, the error in the report', async () => {
    const { view } = await open(app(reject(new Error(STALE_CSS))), '/admin/staff');
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(view.container.textContent).toBe('');
  });

  it('covers a client navigation into a stale screen, as well as a first load', async () => {
    const { router } = await open(app(reject(new TypeError(STALE_JS))), '/sign-in');
    expect(await screen.findByText('Sign In')).toBeTruthy();
    await act(async () => {
      await router.navigate('/admin/staff');
    });
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(DEFAULT_SCREEN)).toBeNull();
  });

  it('shows React Router’s default error screen for any other error, and does not reload', async () => {
    await open(app(reject(new Error('Staff could not be drawn'))), '/admin/staff');
    expect(await screen.findByText(DEFAULT_SCREEN)).toBeTruthy();
    expect(screen.getByText('Staff could not be drawn')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows the default screen for an error a screen throws while rendering', async () => {
    const Broken = () => {
      throw new Error('A screen threw');
    };
    await open(
      app(async () => ({ Component: Broken })),
      '/admin/staff',
    );
    expect(await screen.findByText(DEFAULT_SCREEN)).toBeTruthy();
    expect(screen.getByText('A screen threw')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows the default screen with the real message when the guard declines a second reload', async () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    await open(app(reject(new TypeError(STALE_JS))), '/admin/staff');
    expect(await screen.findByText(DEFAULT_SCREEN)).toBeTruthy();
    expect(screen.getByText(STALE_JS)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('changes nothing about a route that loads', async () => {
    await open(
      app(async () => ({ Component: () => <p>Staff</p> })),
      '/admin/staff',
    );
    expect(await screen.findByText('Staff')).toBeTruthy();
    expect(screen.getByText('Shell')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByText(DEFAULT_SCREEN)).toBeNull();
  });
});

describe('withStaleChunkRecovery', () => {
  it('adds two pathless routes, the boundary on the inner one only', () => {
    const routes: RouteObject[] = [{ path: '/', element: <p>Home</p> }];
    const [outer] = withStaleChunkRecovery(routes);
    expect(Object.keys(outer!)).toEqual(['children']);
    const [inner] = outer!.children!;
    expect(inner).toEqual({ ErrorBoundary: StaleChunkBoundary, children: routes });
  });
});
