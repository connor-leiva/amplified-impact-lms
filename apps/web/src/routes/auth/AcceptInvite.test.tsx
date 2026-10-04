import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AcceptInvite from './AcceptInvite';

// Phase 07 § 7.5. An invite token is single use, so the thing worth testing is not the markup — it
// is how many times the screen spends the token, and what the viewer is told when it is already
// gone. Everything the server can answer has to land on one of two states and no third.

const TOKEN = 'inv_9f2c4b';
const TEAM = 'The Ortiz Group';

let fetchMock: Mock;

/** `POST /api/auth/verify` accepted the token. A staff invite carries no team. */
const verified = (team: string | null) =>
  ({
    ok: true,
    status: 200,
    json: async () => (team === null ? { ok: true } : { ok: true, team }),
  }) as unknown as Response;

/** The two refusals § 7.5 defines, plus whatever else a server might send. */
const refused = (error?: string) =>
  ({ ok: false, status: 400, json: async () => (error ? { error } : {}) }) as unknown as Response;

beforeEach(() => {
  fetchMock = vi.fn(async () => verified(null));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.appReady;
});

/**
 * `home` stands in for the real `/`, which is a lazy route: React Router keeps the invite screen
 * mounted while that chunk loads. `'instant'` lands straight away. `'pending'` never resolves,
 * which is the window in which § 7.5's `Joining {Team or Amplified Impact}…` heading is the thing
 * actually on screen — without it the redirect would unmount the screen before anyone read it.
 */
function renderInvite(opts: { home?: 'instant' | 'pending'; strict?: boolean } = {}) {
  const home =
    opts.home === 'pending'
      ? { path: '/', lazy: () => new Promise<{ Component: () => null }>(() => {}) }
      : { path: '/', element: <p>the app</p> };
  const router = createMemoryRouter([{ path: '/invite/:token', element: <AcceptInvite /> }, home], {
    initialEntries: [`/invite/${TOKEN}`],
  });
  const tree = <RouterProvider router={router} />;
  return { router, ...render(opts.strict ? <StrictMode>{tree}</StrictMode> : tree) };
}

const heading = () => screen.getByRole('heading', { level: 1 });

describe('AcceptInvite @g7', () => {
  it('spends the token exactly once, even when React mounts the screen twice', async () => {
    // StrictMode double-invokes effects in development. A second verify would answer `used`, so
    // without the `spent` ref a perfectly good invite would read as already redeemed.
    const { router } = renderInvite({ strict: true });

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/verify');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ token: TOKEN });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a verified invite lands on the app and leaves no spent link behind it', async () => {
    const { router } = renderInvite();

    expect(await screen.findByText('the app')).toBeVisible();
    // `replace`, so Back cannot return to a token that has already been redeemed.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(router.state.location.pathname).toBe('/');
  });

  it('names the team in the heading while the app loads', async () => {
    fetchMock.mockImplementation(async () => verified(TEAM));
    renderInvite({ home: 'pending' });

    await waitFor(() => expect(heading()).toHaveTextContent(`Joining ${TEAM}…`));
  });

  it('falls back to the organisation when the invite belongs to no team', async () => {
    // The first paint cannot know the team — there is no pre-auth endpoint that would let the
    // screen read an unverified token — so the fallback is also what the heading says before the
    // server answers, and a staff invite never moves off it.
    renderInvite({ home: 'pending' });
    expect(heading()).toHaveTextContent('Joining Amplified Impact…');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(heading()).toHaveTextContent('Joining Amplified Impact…');
  });

  it('a spent invite says so and stops the spinner', async () => {
    fetchMock.mockImplementation(async () => refused('used'));
    const { router } = renderInvite();

    expect(await screen.findByRole('alert')).toHaveTextContent('That link was already used. Request a new one.');
    expect(screen.queryByRole('status')).toBeNull();
    // A refusal stays put: nothing signed the viewer in, so there is nothing to redirect to.
    expect(router.state.location.pathname).toBe(`/invite/${TOKEN}`);
  });

  it('an unexplained refusal and a request that never arrives both read as expired', async () => {
    const expired = 'That link has expired. Request a new one.';

    fetchMock.mockImplementation(async () => refused());
    const { unmount } = renderInvite();
    expect(await screen.findByRole('alert')).toHaveTextContent(expired);
    unmount();

    fetchMock.mockImplementation(() => Promise.reject(new Error('Failed to fetch')));
    renderInvite();
    expect(await screen.findByRole('alert')).toHaveTextContent(expired);
  });

  it('marks the body ready itself, having no shell to do it', async () => {
    // The compliance and axe harnesses wait on `[data-app-ready="true"]`; this route renders
    // outside `AppShell`, which is what sets it everywhere else.
    renderInvite({ home: 'pending' });
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
  });
});
