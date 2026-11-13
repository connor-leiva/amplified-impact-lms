import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import SignIn, { COPY as SIGN_IN } from './SignIn';
import SetPassword, { COPY as SET } from './SetPassword';
import AcceptInvite from './AcceptInvite';

// D-150: every sign-in path goes where the API says (`landing`), so a learner with no cohort portal
// (an access group's member) lands on the Skill Library at once and `/` is never drawn first. Google's
// is a server redirect (apps/api/test/landing.test.ts). Anything but the two landings reads as `/`.

let fetchMock: Mock;
const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  fetchMock = vi.fn(async () => json(200, { ok: true, landing: '/skill-library' }));
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
    url === '/api/auth/providers' ? Promise.resolve(json(200, { google: false })) : fetchMock(url, init),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.appReady;
});

function at(path: string, route: string, element: React.ReactElement) {
  const router = createMemoryRouter(
    [
      { path: route, element },
      { path: '/', element: <p>the cohort dashboard</p> },
      { path: '/skill-library', element: <p>the skill library</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('where each sign-in lands (D-150)', () => {
  it('a sign-in link', async () => {
    const router = at('/sign-in?token=tok_link', '/sign-in', <SignIn />);
    expect(await screen.findByText('the skill library')).toBeVisible();
    expect(screen.queryByText('the cohort dashboard')).toBeNull();
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('a typed password', async () => {
    const router = at('/sign-in', '/sign-in', <SignIn />);
    await userEvent.type(screen.getByLabelText(SIGN_IN.label), 'agent@liveutah.com');
    await userEvent.type(screen.getByLabelText(SIGN_IN.password), 'correct horse battery staple');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(await screen.findByText('the skill library')).toBeVisible();
    expect(router.state.location.pathname).toBe('/skill-library');
  });

  it('a set or reset password link', async () => {
    fetchMock.mockImplementationOnce(async () => json(200, { ok: true, purpose: 'set' }));
    at('/set-password?token=tok_set', '/set-password', <SetPassword />);
    await userEvent.type(await screen.findByLabelText(SET.password), 'a brand new password');
    await userEvent.type(screen.getByLabelText(SET.confirm), 'a brand new password');
    await userEvent.click(screen.getByRole('button', { name: SET.submit }));
    expect(await screen.findByText('the skill library')).toBeVisible();
  });

  it('an invite', async () => {
    at('/invite/inv_1', '/invite/:token', <AcceptInvite />);
    expect(await screen.findByText('the skill library')).toBeVisible();
  });

  it('keeps `/` for a learner with a portal, and for an answer with no landing at all', async () => {
    fetchMock.mockImplementation(async () => json(200, { ok: true, landing: '/' }));
    at('/sign-in?token=tok_a', '/sign-in', <SignIn />);
    expect(await screen.findByText('the cohort dashboard')).toBeVisible();
    document.body.innerHTML = '';

    fetchMock.mockImplementation(async () => json(200, { ok: true }));
    at('/invite/inv_2', '/invite/:token', <AcceptInvite />);
    expect(await screen.findByText('the cohort dashboard')).toBeVisible();
  });

  it('never goes anywhere else the answer names', async () => {
    for (const landing of ['https://evil.example.com', '//evil.example.com', '/admin']) {
      fetchMock.mockImplementation(async () => json(200, { ok: true, landing }));
      const router = at('/sign-in?token=tok_x', '/sign-in', <SignIn />);
      expect(await screen.findByText('the cohort dashboard')).toBeVisible();
      expect(router.state.location.pathname).toBe('/');
      router.dispose();
      document.body.innerHTML = '';
    }
  });
});
