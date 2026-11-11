import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router';
import SignIn from './SignIn';

// Phase 07 § 7.5. The screen's whole job is to say as little as possible: client-side validation is
// the only thing it may complain about, and everything the server does — account found, account
// missing, request failed outright — has to land on the same DOM.

const KNOWN = 'jamie@ortizhomes.com';
const UNKNOWN = 'nobody@example.com';

const SUBMIT = 'Email Me a Sign-In Link';

let fetchMock: Mock;

/** `POST /api/auth/request` answers 200 whatever happens. `extra` is what a leaky server might add. */
const ok = (extra: Record<string, unknown> = {}) =>
  ({ ok: true, status: 200, json: async () => ({ ok: true, ...extra }) }) as unknown as Response;

/**
 * `GET /api/auth/providers` (D-139), which every sign-in screen asks once on mount, answers here and
 * not through `fetchMock`, so the request counts below are still exactly the screen's own calls.
 * Off by default: no Google button, as on a deploy without the keys.
 */
let providers: { google: boolean } = { google: false };
beforeEach(() => {
  fetchMock = vi.fn(async () => ok());
  providers = { google: false };
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
    url === '/api/auth/providers' ? Promise.resolve({ ok: true, status: 200, json: async () => providers } as unknown as Response) : fetchMock(url, init),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The link form (D-132 made the password form the default; `?method=link` opens the link one). */
function renderSignIn(search = '?method=link') {
  return render(
    <MemoryRouter initialEntries={[`/sign-in${search}`]}>
      <SignIn />
    </MemoryRouter>,
  );
}

const field = () => screen.getByLabelText('Work Email');
const submit = () => screen.getByRole('button', { name: SUBMIT });

/** Types `email`, submits, and returns the card's markup once the success state is up. */
async function domAfterRequest(email: string, respond: () => Promise<unknown>) {
  fetchMock.mockImplementation(respond);
  const { container, unmount } = renderSignIn();
  await userEvent.type(field(), email);
  await userEvent.click(submit());
  await screen.findByRole('heading', { level: 1, name: 'Check Your Email' });
  const html = container.innerHTML;
  unmount();
  return html;
}

/** Blanks the one thing that is allowed to differ between two runs: the address the viewer typed. */
const redact = (html: string, email: string) => html.split(email).join('{email}');

describe('SignIn @g7', () => {
  it('rejects an invalid address without touching the network', async () => {
    renderSignIn();
    await userEvent.type(field(), 'jamie@ortizhomes');
    await userEvent.click(submit());

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    // The error is announced and owned by the input, which is what the axe check turns on.
    expect(field()).toHaveAttribute('aria-describedby', 'sign-in-error');
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    // Client-side validation happens before anything leaves the browser.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign In');
  });

  it('a valid address reaches the success state and the copy names it', async () => {
    renderSignIn();
    await userEvent.type(field(), KNOWN);
    await userEvent.click(submit());

    expect(await screen.findByRole('heading', { level: 1, name: 'Check Your Email' })).toBeVisible();
    expect(screen.getByText(`We sent a link to ${KNOWN}. It expires in 15 minutes.`)).toBeVisible();
    expect(screen.queryByLabelText('Work Email')).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/request');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ email: KNOWN });
  });

  it('Use a Different Email returns to an empty form', async () => {
    renderSignIn();
    await userEvent.type(field(), KNOWN);
    await userEvent.click(submit());
    await screen.findByRole('heading', { level: 1, name: 'Check Your Email' });

    await userEvent.click(screen.getByRole('button', { name: 'Use a Different Email' }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign In');
    expect(screen.getByText('We’ll email you a secure sign-in link.')).toBeVisible();
    expect(field()).toHaveValue('');
    expect(submit()).toBeVisible();
  });

  it('an unknown address is indistinguishable from a known one', async () => {
    // What a server that leaked would answer, and what a browser answers when the request never
    // arrives. None of the three may change what the viewer sees.
    const known = await domAfterRequest(KNOWN, async () => ok({ found: true, userId: 'u_jamie' }));
    const unknown = await domAfterRequest(UNKNOWN, async () => ok({ found: false }));
    const offline = await domAfterRequest(UNKNOWN, () => Promise.reject(new Error('Failed to fetch')));

    expect(redact(unknown, UNKNOWN)).toBe(redact(known, KNOWN));
    expect(redact(offline, UNKNOWN)).toBe(redact(known, KNOWN));
    // One request each, same endpoint: the silence is not bought by skipping the call.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/api/auth/request',
      '/api/auth/request',
      '/api/auth/request',
    ]);
  });
});

// ---------------------------------------------------------------------------
// /sign-in?token=… — the other path through the same route.
// ---------------------------------------------------------------------------

const TOKEN = 'tok_4d81aa';

/** `POST /api/auth/verify` refused the token; § 7.5 distinguishes `used` and nothing else. */
const refused = (error?: string) =>
  ({ ok: false, status: 400, json: async () => (error ? { error } : {}) }) as unknown as Response;

/**
 * The verify path redirects, so it needs a real router with somewhere to land. `home` stands in for
 * the app's own `/`, which is lazy: `'pending'` never resolves, which is the window in which the
 * `Verifying your link…` state is actually on screen.
 */
function renderVerify(opts: { home?: 'instant' | 'pending'; strict?: boolean } = {}) {
  const home =
    opts.home === 'pending'
      ? { path: '/', lazy: () => new Promise<{ Component: () => null }>(() => {}) }
      : { path: '/', element: <p>the app</p> };
  const router = createMemoryRouter([{ path: '/sign-in', element: <SignIn /> }, home], {
    initialEntries: [`/sign-in?token=${TOKEN}`],
  });
  const tree = <RouterProvider router={router} />;
  return { router, ...render(opts.strict ? <StrictMode>{tree}</StrictMode> : tree) };
}

describe('SignIn with a link token @g7', () => {
  it('spends the token exactly once, even when React mounts the screen twice', async () => {
    // StrictMode double-invokes effects in development. A second verify would answer `used`, so a
    // perfectly good link would read as already redeemed — and a guard that skips the second run
    // outright leaves the screen stuck in `verifying`, because the first run disowned its result.
    const { router } = renderVerify({ strict: true });

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/verify');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ token: TOKEN });
  });

  it('a verified link lands on the app and leaves no spent token behind it', async () => {
    const { router } = renderVerify();

    expect(await screen.findByText('the app')).toBeVisible();
    // `replace`, so Back cannot return to a token that has already been redeemed.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows no form while it verifies', () => {
    renderVerify({ home: 'pending' });

    expect(screen.queryByLabelText('Work Email')).toBeNull();
    expect(screen.queryByRole('button', { name: SUBMIT })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a spent token drops back to the form carrying its own error', async () => {
    fetchMock.mockImplementation(async () => refused('used'));
    const { router } = renderVerify();

    expect(await screen.findByRole('alert')).toHaveTextContent('That link was already used. Request a new one.');
    // Back on the form, so the recovery the copy names is one click away.
    expect(screen.getByLabelText('Work Email')).toBeVisible();
    expect(screen.getByRole('button', { name: SUBMIT })).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('an unexplained refusal and a request that never arrives both read as expired', async () => {
    const expired = 'That link has expired. Request a new one.';

    fetchMock.mockImplementation(async () => refused());
    const { unmount } = renderVerify();
    expect(await screen.findByRole('alert')).toHaveTextContent(expired);
    unmount();

    fetchMock.mockImplementation(() => Promise.reject(new Error('Failed to fetch')));
    renderVerify();
    expect(await screen.findByRole('alert')).toHaveTextContent(expired);
  });
});

// --- "Continue With Google" (D-139) ------------------------------------------------------------------

describe('Continue With Google', () => {
  const GOOGLE = 'Continue With Google';

  it('is hidden when the deploy has no Google keys, and the password form stays the way in', async () => {
    renderSignIn('');
    await screen.findByRole('button', { name: 'Sign In' });
    // Give the providers answer time to land, then check it changed nothing.
    await waitFor(() => expect(screen.queryByRole('button', { name: GOOGLE })).toBeNull());
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('shows under the password form when it is on, and goes to the API start route', async () => {
    providers = { google: true };
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const { container } = renderSignIn('');
    const button = await screen.findByRole('button', { name: GOOGLE });
    // Under the form: the Sign In button comes first.
    const order = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(order.indexOf('Sign In')).toBeLessThan(order.indexOf(GOOGLE));
    await userEvent.click(button);
    expect(assign).toHaveBeenCalledWith('/api/auth/google');
    // The magic link is still offered as the backup.
    expect(screen.getByRole('button', { name: 'Email Me a Sign-In Link Instead' })).toBeTruthy();
  });

  it('says why when Google sign-in came back refused', async () => {
    const cases: [string, RegExp][] = [
      ['no-account', /^We couldn’t find an account for that email\. Use the email you bought with, or sign in with your password\.$/],
      ['unverified', /^Google hasn’t verified that email address\./],
      ['linked-elsewhere', /^That account is linked to a different Google account\./],
      ['failed', /^Google sign-in didn’t finish\. Try again, or sign in with your password\.$/],
    ];
    for (const [why, words] of cases) {
      const { unmount } = renderSignIn(`?google=${why}`);
      expect((await screen.findByRole('alert')).textContent, why).toMatch(words);
      unmount();
    }
    // Anything else, or nothing, says nothing.
    const { unmount } = renderSignIn('?google=whatever');
    await screen.findByRole('button', { name: 'Sign In' });
    expect(screen.getByRole('alert').textContent).toBe('');
    unmount();
  });
});
