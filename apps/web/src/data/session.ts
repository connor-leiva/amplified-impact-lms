import { isFixture } from './boot';
import { forgetTourLater } from './tour-later';

// Sign Out (DECISIONS.md D-152), and what the back button shows after it.
//
// The prototype's Sign Out only showed a toast saying it was a demo, and the app shipped that stub: the
// viewer stayed signed in (Connor, 2026-11-13, the Admin Console on an iPhone). Now Sign Out:
//
//   1. ends the server session: `POST /api/auth/sign-out` deletes the `auth_sessions` row and clears
//      the httpOnly cookie with the attributes it was set with (the API's `clearCookieOptions`);
//   2. forgets the viewer in this page: `main.tsx` registers the teardown, which unmounts the app
//      (so its live stream closes and no signed-in screen is left in the page) and empties the query
//      cache that held the snapshot;
//   3. replaces this history entry with /sign-in, so Back does not land on the screen just left.
//
// Back can still reach an EARLIER entry of a signed-in page that the browser kept whole in its
// back-forward cache (iOS Safari does this for every page it can). `guardRestoredPages` hides such a
// page as it is put away, and on its return shows it again only once `GET /api/me` says the session
// is still live; otherwise it goes to /sign-in.

export const SIGN_IN_PATH = '/sign-in';
export const SIGN_OUT_ROUTE = '/api/auth/sign-out';
export const ME_ROUTE = '/api/me';

/** What a failed sign-out says: the sign-in screens' own words for a failed request. */
export const SIGN_OUT_FAILED = 'Something went wrong. Try again.';

/**
 * The one navigation, behind an indirection so tests can observe it (jsdom's `location.replace` cannot
 * be spied on; see `http.ts`). `replace`, never `assign`: the signed-in entry is not left to go back to.
 */
export const leave = {
  toSignIn: (): void => location.replace(SIGN_IN_PATH),
};

/** The pages outside sign-in (the router's public routes): nothing on them is the viewer's. */
const PUBLIC = /^\/(?:sign-in|login|invite\/[^/]+|forgot-password|set-password)\/?$/;
export const needsSession = (path: string): boolean => !PUBLIC.test(path);

const teardowns = new Set<() => void>();
let signedOut = false;
let pending: Promise<boolean> | null = null;

/** Register what holds the signed-in viewer in memory; `main.tsx` does, once. Returns the undo. */
export function onSignOut(teardown: () => void): () => void {
  teardowns.add(teardown);
  return () => void teardowns.delete(teardown);
}

/**
 * Sign the viewer out. Resolves `false`, with nothing changed, when the server did not end the
 * session (offline, or any non-2xx): the page stays as it was and the caller says so, because going
 * to /sign-in with the session still live would only look signed out. A second call while the first
 * is in flight joins it.
 *
 * Fixture mode has no server session (the persona is chosen by `?as=`), so there it only forgets
 * and leaves.
 */
export function signOut(): Promise<boolean> {
  pending ??= (async () => {
    if (!isFixture) {
      const ended = await fetch(SIGN_OUT_ROUTE, { method: 'POST', credentials: 'include', cache: 'no-store' }).then(
        (res) => res.ok,
        () => false,
      );
      if (!ended) {
        pending = null;
        return false;
      }
    }
    signedOut = true;
    // D-252: Watch Later on the LMS tour lasts until sign-out, so it opens again on the next sign-in here.
    forgetTourLater();
    for (const teardown of teardowns) {
      try {
        teardown();
      } catch {
        /* a teardown that throws must not keep the viewer on the page */
      }
    }
    leave.toSignIn();
    return true;
  })();
  return pending;
}

/**
 * The back-forward cache guard (http mode only; `main.tsx`). A signed-in page is hidden as the browser
 * puts it away, so it never comes back drawn; on its return it is shown again only if the session is
 * still live. A page that signed out here goes straight to /sign-in, without asking.
 */
export function guardRestoredPages(win: Window = window): () => void {
  const body = win.document.body;
  const onHide = (e: PageTransitionEvent) => {
    if (e.persisted && needsSession(win.location.pathname)) body.hidden = true;
  };
  const onShow = (e: PageTransitionEvent) => {
    if (!e.persisted || !needsSession(win.location.pathname)) return;
    body.hidden = true;
    if (signedOut) return leave.toSignIn();
    void fetch(ME_ROUTE, { credentials: 'include', cache: 'no-store' }).then(
      (res) => {
        if (res.ok) body.hidden = false;
        else leave.toSignIn();
      },
      () => leave.toSignIn(),
    );
  };
  win.addEventListener('pagehide', onHide);
  win.addEventListener('pageshow', onShow);
  return () => {
    win.removeEventListener('pagehide', onHide);
    win.removeEventListener('pageshow', onShow);
  };
}

/** Tests only: forget a previous test's sign-out. */
export function resetSignOutForTests(): void {
  signedOut = false;
  pending = null;
  teardowns.clear();
}
