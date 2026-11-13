import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ME_ROUTE, SIGN_IN_PATH, SIGN_OUT_ROUTE, guardRestoredPages, leave, needsSession, onSignOut, resetSignOutForTests, signOut } from './session';

// D-152: Sign Out ends the server session, forgets the page, and replaces it with /sign-in; and a
// signed-in page the back-forward cache (iOS Safari's above all) brings back is shown again only once
// the session is still live.

let fetchMock: Mock;
let toSignIn: Mock;
const answer = (status: number) => ({ ok: status < 400, status, json: async () => ({}) }) as unknown as Response;

/** A `pageshow` / `pagehide` as the browser sends it; `persisted` is true for the back-forward cache. */
function transition(type: 'pageshow' | 'pagehide', persisted: boolean): Event {
  const e = new Event(type);
  Object.defineProperty(e, 'persisted', { value: persisted });
  return e;
}

let unguard: (() => void) | null = null;

beforeEach(() => {
  resetSignOutForTests();
  fetchMock = vi.fn(async () => answer(200));
  vi.stubGlobal('fetch', fetchMock);
  toSignIn = vi.fn();
  vi.spyOn(leave, 'toSignIn').mockImplementation(toSignIn);
  document.body.hidden = false;
  history.replaceState(null, '', '/admin');
});
afterEach(() => {
  unguard?.();
  unguard = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSignOutForTests();
  document.body.hidden = false;
});

describe('signOut()', () => {
  it('POSTs the sign-out with the cookie, runs every teardown, then leaves for /sign-in', async () => {
    const order: string[] = [];
    fetchMock.mockImplementation(async () => (order.push('server'), answer(200)));
    onSignOut(() => order.push('forget the snapshot'));
    onSignOut(() => order.push('unmount'));
    toSignIn.mockImplementation(() => order.push('leave'));

    expect(await signOut()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(SIGN_OUT_ROUTE, { method: 'POST', credentials: 'include', cache: 'no-store' });
    expect(order).toEqual(['server', 'forget the snapshot', 'unmount', 'leave']);
  });

  it('leaves even if a teardown throws', async () => {
    onSignOut(() => {
      throw new Error('boom');
    });
    expect(await signOut()).toBe(true);
    expect(toSignIn).toHaveBeenCalledTimes(1);
  });

  it('changes nothing when the server did not end the session (a 5xx, a 403, or offline), so it can be tried again', async () => {
    const teardown = vi.fn();
    onSignOut(teardown);
    fetchMock.mockResolvedValueOnce(answer(500));
    expect(await signOut()).toBe(false);
    fetchMock.mockResolvedValueOnce(answer(403));
    expect(await signOut()).toBe(false);
    fetchMock.mockRejectedValueOnce(new TypeError('Load failed'));
    expect(await signOut()).toBe(false);
    expect(teardown).not.toHaveBeenCalled();
    expect(toSignIn).not.toHaveBeenCalled();

    expect(await signOut()).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(toSignIn).toHaveBeenCalledTimes(1);
  });

  it('a second tap while the first is in flight joins it: one request, one navigation', async () => {
    let release!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (release = r)));
    const first = signOut();
    const second = signOut();
    release(answer(200));
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toSignIn).toHaveBeenCalledTimes(1);
  });

  it('leaves by replacing the history entry, to /sign-in', () => {
    vi.mocked(leave.toSignIn).mockRestore();
    expect(leave.toSignIn.toString()).toMatch(/location\.replace\(SIGN_IN_PATH\)/);
    expect(SIGN_IN_PATH).toBe('/sign-in');
  });
});

describe('guardRestoredPages(): Back after Sign Out', () => {
  it('hides a signed-in page as the browser keeps it, and shows it again once /api/me says the session is live', async () => {
    unguard = guardRestoredPages();
    window.dispatchEvent(transition('pagehide', true));
    expect(document.body.hidden).toBe(true);

    window.dispatchEvent(transition('pageshow', true));
    expect(document.body.hidden).toBe(true);
    await vi.waitFor(() => expect(document.body.hidden).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith(ME_ROUTE, { credentials: 'include', cache: 'no-store' });
    expect(toSignIn).not.toHaveBeenCalled();
  });

  it('sends a page whose session has ended to /sign-in, still hidden', async () => {
    fetchMock.mockResolvedValue(answer(401));
    unguard = guardRestoredPages();
    window.dispatchEvent(transition('pagehide', true));
    window.dispatchEvent(transition('pageshow', true));
    await vi.waitFor(() => expect(toSignIn).toHaveBeenCalledTimes(1));
    expect(document.body.hidden).toBe(true);
  });

  it('fails closed when it cannot ask (offline)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));
    unguard = guardRestoredPages();
    window.dispatchEvent(transition('pageshow', true));
    await vi.waitFor(() => expect(toSignIn).toHaveBeenCalledTimes(1));
    expect(document.body.hidden).toBe(true);
  });

  it('a page that signed out here goes straight to /sign-in, without asking', async () => {
    unguard = guardRestoredPages();
    await signOut();
    toSignIn.mockClear();
    fetchMock.mockClear();
    window.dispatchEvent(transition('pageshow', true));
    expect(toSignIn).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.body.hidden).toBe(true);
  });

  it('leaves an ordinary load, and the public pages, alone', () => {
    unguard = guardRestoredPages();
    window.dispatchEvent(transition('pageshow', false));
    window.dispatchEvent(transition('pagehide', false));
    history.replaceState(null, '', '/sign-in');
    window.dispatchEvent(transition('pagehide', true));
    window.dispatchEvent(transition('pageshow', true));
    expect(document.body.hidden).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toSignIn).not.toHaveBeenCalled();
  });

  it('knows which pages are outside sign-in', () => {
    for (const p of ['/sign-in', '/login', '/invite/abc123', '/forgot-password', '/set-password']) expect(needsSession(p), p).toBe(false);
    for (const p of ['/', '/admin', '/admin/curriculum', '/skill-library', '/skill-library/perfect-week', '/course', '/account', '/sign-in-elsewhere']) {
      expect(needsSession(p), p).toBe(true);
    }
  });
});
