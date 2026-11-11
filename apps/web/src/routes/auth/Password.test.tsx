import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import SignIn, { COPY as SIGN_IN } from './SignIn';
import ForgotPassword, { COPY as FORGOT } from './ForgotPassword';
import SetPassword, { COPY as SET } from './SetPassword';
import Account, { COPY as ACCOUNT } from './Account';

// D-132's screens: the password form on /sign-in, /forgot-password, /set-password and /account,
// against a stubbed `fetch`. The API's half is apps/api/test/password.test.ts.

let fetchMock: Mock;
const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  fetchMock = vi.fn(async () => json(200, { ok: true }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function at(path: string, element: React.ReactElement, route: string) {
  const router = createMemoryRouter(
    [
      { path: route, element },
      { path: '/', element: <p>the app</p> },
      { path: '/sign-in', element: <SignIn /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
const bodyOf = (call: number) => JSON.parse(String(fetchMock.mock.calls[call]?.[1]?.body));

describe('/sign-in, email and password', () => {
  it('opens on the password form, with the way to a link and to Forgot Password', async () => {
    at('/sign-in', <SignIn />, '/sign-in');
    expect(screen.getByRole('heading', { level: 1, name: SIGN_IN.h1 })).toBeVisible();
    expect(screen.getByText(SIGN_IN.sub)).toBeVisible();
    expect(screen.getByLabelText(SIGN_IN.label)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(SIGN_IN.password)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(SIGN_IN.password)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText(SIGN_IN.remember)).toBeChecked();
    expect(screen.getByRole('link', { name: SIGN_IN.forgot })).toHaveAttribute('href', '/forgot-password');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.useLink }));
    expect(screen.getByRole('button', { name: SIGN_IN.submit })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.usePassword }));
    expect(screen.getByLabelText(SIGN_IN.password)).toBeVisible();
  });

  it('is the same screen at /login, the address www’s Log In links', async () => {
    at('/login', <SignIn />, '/login');
    expect(screen.getByRole('heading', { level: 1, name: SIGN_IN.h1 })).toBeVisible();
    expect(screen.getByLabelText(SIGN_IN.label)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(SIGN_IN.password)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: SIGN_IN.signIn })).toBeEnabled();
  });

  it('signs in and lands on the app, sending "Keep me signed in"', async () => {
    const router = at('/sign-in', <SignIn />, '/sign-in');
    await userEvent.type(screen.getByLabelText(SIGN_IN.label), 'jamie@ortizhomes.com');
    await userEvent.type(screen.getByLabelText(SIGN_IN.password), 'correct horse battery staple');
    await userEvent.click(screen.getByLabelText(SIGN_IN.remember));
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(await screen.findByText('the app')).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/login');
    expect(bodyOf(0)).toEqual({ email: 'jamie@ortizhomes.com', password: 'correct horse battery staple', remember: false });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows the API’s own words for a mismatch and a lockout, and clears the password', async () => {
    fetchMock.mockImplementationOnce(async () => json(400, { error: 'That email and password don’t match.' }));
    at('/sign-in', <SignIn />, '/sign-in');
    await userEvent.type(screen.getByLabelText(SIGN_IN.label), 'jamie@ortizhomes.com');
    await userEvent.type(screen.getByLabelText(SIGN_IN.password), 'wrong one');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password don’t match.');
    expect(screen.getByLabelText(SIGN_IN.password)).toHaveValue('');

    fetchMock.mockImplementationOnce(async () => json(429, { error: 'Too many tries. Wait 15 minutes, or reset your password.' }));
    await userEvent.type(screen.getByLabelText(SIGN_IN.password), 'another');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many tries.');
  });

  it('checks the address and asks for a password without touching the network', async () => {
    at('/sign-in', <SignIn />, '/sign-in');
    await userEvent.type(screen.getByLabelText(SIGN_IN.label), 'jamie@ortizhomes');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(screen.getByRole('alert')).toHaveTextContent(SIGN_IN.invalid);
    await userEvent.type(screen.getByLabelText(SIGN_IN.label), '.com');
    await userEvent.click(screen.getByRole('button', { name: SIGN_IN.signIn }));
    expect(screen.getByRole('alert')).toHaveTextContent(SIGN_IN.needPassword);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('/forgot-password', () => {
  it('says the same thing whatever the API answers, even when the request fails', async () => {
    for (const respond of [async () => json(200, { ok: true }), () => Promise.reject(new Error('offline'))]) {
      fetchMock.mockImplementationOnce(respond);
      const router = at('/forgot-password', <ForgotPassword />, '/forgot-password');
      await userEvent.type(screen.getByLabelText(FORGOT.label), 'someone@example.com');
      await userEvent.click(screen.getByRole('button', { name: FORGOT.submit }));
      expect(await screen.findByRole('heading', { level: 1, name: FORGOT.sentH1 })).toBeVisible();
      expect(screen.getByText(FORGOT.sent)).toBeVisible();
      expect(screen.getByRole('link', { name: FORGOT.back })).toHaveAttribute('href', '/sign-in');
      router.dispose();
      document.body.innerHTML = '';
    }
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/password/forgot');
    expect(bodyOf(0)).toEqual({ email: 'someone@example.com' });
  });
});

describe('/set-password', () => {
  it('checks the link first, then says Reset for a reset link, and signs in with the new password', async () => {
    fetchMock.mockImplementationOnce(async () => json(200, { ok: true, purpose: 'reset' }));
    at('/set-password?token=tok_reset', <SetPassword />, '/set-password');
    expect(await screen.findByRole('heading', { level: 1, name: SET.resetH1 })).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/password/token');

    await userEvent.type(screen.getByLabelText(SET.password), 'short');
    await userEvent.type(screen.getByLabelText(SET.confirm), 'short');
    await userEvent.click(screen.getByRole('button', { name: SET.submit }));
    expect(screen.getByRole('alert')).toHaveTextContent(SET.short);

    await userEvent.clear(screen.getByLabelText(SET.password));
    await userEvent.clear(screen.getByLabelText(SET.confirm));
    await userEvent.type(screen.getByLabelText(SET.password), 'a brand new password');
    await userEvent.type(screen.getByLabelText(SET.confirm), 'a different password');
    await userEvent.click(screen.getByRole('button', { name: SET.submit }));
    expect(screen.getByRole('alert')).toHaveTextContent(SET.mismatch);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.clear(screen.getByLabelText(SET.confirm));
    await userEvent.type(screen.getByLabelText(SET.confirm), 'a brand new password');
    await userEvent.click(screen.getByRole('button', { name: SET.submit }));
    expect(await screen.findByText('the app')).toBeVisible();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/password/set');
    expect(bodyOf(1)).toEqual({ token: 'tok_reset', password: 'a brand new password' });
  });

  it('says an expired or used link plainly, with the way to a new one', async () => {
    fetchMock.mockImplementationOnce(async () => json(400, { error: 'expired' }));
    at('/set-password?token=tok_old', <SetPassword />, '/set-password');
    expect(await screen.findByRole('heading', { level: 1, name: SET.expiredH1 })).toBeVisible();
    expect(screen.getByRole('link', { name: SET.newLink })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByLabelText(SET.password)).toBeNull();
  });

  it('sets a password from the welcome page’s checkout link', async () => {
    at('/set-password?checkout=cs_test_abc1234567', <SetPassword />, '/set-password');
    expect(screen.getByRole('heading', { level: 1, name: SET.setH1 })).toBeVisible();
    await userEvent.type(screen.getByLabelText(SET.password), 'pats own password');
    await userEvent.type(screen.getByLabelText(SET.confirm), 'pats own password');
    await userEvent.click(screen.getByRole('button', { name: SET.submit }));
    expect(await screen.findByText('the app')).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/password/checkout');
    expect(bodyOf(0)).toEqual({ checkout: 'cs_test_abc1234567', password: 'pats own password' });
  });
});

describe('/account', () => {
  it('sets a first password without asking for a current one', async () => {
    fetchMock.mockImplementationOnce(async () => json(200, { hasPassword: false }));
    at('/account', <Account />, '/account');
    expect(await screen.findByText(ACCOUNT.setSub)).toBeVisible();
    expect(screen.queryByLabelText(ACCOUNT.current)).toBeNull();
    await userEvent.type(screen.getByLabelText(ACCOUNT.password), 'a first password');
    await userEvent.type(screen.getByLabelText(ACCOUNT.confirm), 'a first password');
    await userEvent.click(screen.getByRole('button', { name: ACCOUNT.submit }));
    expect(await screen.findByText(ACCOUNT.saved)).toBeVisible();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/password/change');
    expect(bodyOf(1)).toEqual({ password: 'a first password' });
    // Now it has one: the next change needs the current password.
    expect(screen.getByLabelText(ACCOUNT.current)).toBeVisible();
  });

  it('needs the current password to change one, and shows the API’s words when it is wrong', async () => {
    fetchMock.mockImplementationOnce(async () => json(200, { hasPassword: true }));
    at('/account', <Account />, '/account');
    expect(await screen.findByLabelText(ACCOUNT.current)).toBeVisible();
    await userEvent.type(screen.getByLabelText(ACCOUNT.password), 'another password');
    await userEvent.type(screen.getByLabelText(ACCOUNT.confirm), 'another password');
    await userEvent.click(screen.getByRole('button', { name: ACCOUNT.submit }));
    expect(screen.getByRole('alert')).toHaveTextContent(ACCOUNT.needCurrent);
    fetchMock.mockImplementationOnce(async () => json(400, { error: 'That’s not your current password.' }));
    await userEvent.type(screen.getByLabelText(ACCOUNT.current), 'not it');
    await userEvent.click(screen.getByRole('button', { name: ACCOUNT.submit }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That’s not your current password.');
    expect(bodyOf(1)).toEqual({ current: 'not it', password: 'another password' });
  });

  it('sends a signed-out visitor to /sign-in', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    fetchMock.mockImplementationOnce(async () => json(401, { error: 'unauthorized' }));
    at('/account', <Account />, '/account');
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/sign-in'));
  });
});
