// Recovering from a deploy that an open tab has not seen yet (D-170).
//
// THE BUG. Vite names every built file by its content (`/assets/Staff-CKfOKx-c.css`), and a deploy
// replaces the whole set. A tab opened before the deploy still runs the old entry, which knows only
// the old names, so the first screen it lazy-loads afterwards asks for a file that is gone (a real
// 404, D-137) and React Router showed "Unexpected Application Error! Unable to preload CSS for …".
// A fresh load is always right: `index.html` is `no-cache` (`apps/api/src/static.ts`), so it names
// the current files. The fix is to make that fresh load happen, once.
//
// THE RULE, in one place:
//   - `isStaleChunkError` knows the four ways a browser or Vite says "that chunk is not there".
//   - `reloadOnce` reloads the page, but never twice within `RELOAD_WINDOW_MS` in this tab, so a
//     deploy that is itself missing a file shows the error instead of reloading forever. The guard is
//     a timestamp in `sessionStorage`; when storage cannot be read or written it does not reload at
//     all, because without the guard a loop could not be ruled out.
//   - `clearOnAppReady` forgets the timestamp once the app has booted (`body[data-app-ready="true"]`),
//     so the next deploy can recover this tab too.
//   - `installStaleChunkRecovery` is the entry's one call: Vite's `vite:preloadError` event, and the
//     app-ready watch. The router's half is `StaleChunkBoundary.tsx`.
//
// WHERE THE RELOAD GOES. A screen's files are fetched when someone opens it, so the failure usually
// arrives mid-navigation: the router is loading `/sessions` while the address bar still says `/`
// (it changes only once the screen has loaded). A plain `location.reload()` there would bring the
// person back to the screen they just left. So when the router is on its way somewhere, the reload
// opens that address instead; otherwise (a first load, Back, or the router's error boundary, which
// runs once the address has changed) it reloads the page as it is.

/** The `sessionStorage` key holding when this tab last reloaded for a stale chunk (ms since epoch). */
export const RELOAD_KEY = 'ai-stale-chunk-reload';
/** No second reload within this long of the last one, unless the app booted in between. */
export const RELOAD_WINDOW_MS = 60_000;

/** The messages a missing lazy chunk produces, by who says it. */
const STALE_CHUNK_MESSAGES: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i, // Chromium (Chrome, Edge)
  /Unable to preload CSS/i, // Vite's preload helper, for a route's stylesheet
  /Importing a module script failed/i, // Safari
  /error loading dynamically imported module/i, // Firefox
];

/** Is this the error a lazy route's missing file throws? Anything else is a real error. */
export function isStaleChunkError(err: unknown): boolean {
  const message =
    typeof err === 'string'
      ? err
      : err !== null && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : '';
  return message !== '' && STALE_CHUNK_MESSAGES.some((re) => re.test(message));
}

/**
 * The navigations, behind an indirection so tests can observe them (jsdom's `location.reload` and
 * `location.assign` cannot be spied on; `data/session.ts` does the same for its `location.replace`).
 */
export const page = {
  reload: (): void => location.reload(),
  open: (href: string): void => location.assign(href),
};

/** Set once this page has asked for its reload, so a second caller in the same page agrees with the first. */
let reloading = false;
/** Where the router is navigating to right now, if anywhere (`installStaleChunkRecovery`'s `navigatingTo`). */
let navigatingTo: () => string | null = () => null;

/** Has this page already started its reload? The router's boundary renders nothing while it has. */
export const reloadPending = (): boolean => reloading;

/** The address a data router is loading, or null when it is idle (React Router's `state.navigation`). */
export function routerDestination(router: {
  state: { navigation: { location?: { pathname: string; search: string; hash: string } } };
}): string | null {
  const to = router.state.navigation.location;
  return to ? `${to.pathname}${to.search}${to.hash}` : null;
}

/** The address to open instead of reloading, or null to reload: only when the router is heading to another page. */
function destination(): string | null {
  try {
    const to = navigatingTo();
    if (!to) return null;
    const next = new URL(to, location.href);
    const here = new URL(location.href);
    // A change of `#` alone would not load the page again, and it is the same screen.
    next.hash = here.hash = '';
    return next.href === here.href ? null : to;
  } catch {
    return null;
  }
}

/**
 * Reload the page to pick up the current deploy, at most once per `RELOAD_WINDOW_MS` in this tab.
 *
 * Returns true when a reload is under way (started now, or earlier in this page), false when it
 * declined: inside the window, offline (a reload would only swap the app for the browser's offline
 * page), or with no working `sessionStorage` to keep the guard in.
 */
export function reloadOnce(now: number = Date.now()): boolean {
  if (reloading) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const storage = window.sessionStorage;
    const last = Number(storage.getItem(RELOAD_KEY) ?? NaN);
    if (Number.isFinite(last) && Math.abs(now - last) < RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
    // A storage that accepts the write but keeps nothing (some privacy modes) would let the next
    // page reload again; read it back, and decline if it did not stick.
    if (storage.getItem(RELOAD_KEY) !== String(now)) return false;
  } catch {
    return false;
  }
  reloading = true;
  const to = destination();
  if (to) page.open(to);
  else page.reload();
  return true;
}

/** Forget the last reload, so a later deploy can reload this tab again. Never throws. */
export function clearReloadFlag(): void {
  try {
    window.sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* storage unavailable: there is nothing to clear */
  }
}

/**
 * Clear the flag once the app has booted: `body[data-app-ready="true"]`, which every screen sets when
 * it has rendered (CLAUDE.md's landmarks). Returns a function that stops watching.
 */
export function clearOnAppReady(body: HTMLElement = document.body): () => void {
  const ready = () => body.dataset.appReady === 'true';
  if (ready()) {
    clearReloadFlag();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (!ready()) return;
    clearReloadFlag();
    observer.disconnect();
  });
  observer.observe(body, { attributes: true, attributeFilter: ['data-app-ready'] });
  return () => observer.disconnect();
}

/**
 * Vite's `vite:preloadError`: a lazy import's file (its script, or a stylesheet it needs) failed to
 * load. Cancelling the event stops Vite rethrowing the error, which is right only when the reload is
 * actually happening; when the guard declines, the error carries on to the router's boundary and the
 * usual error screen, rather than the import quietly resolving to nothing.
 */
export function onPreloadError(event: Event): void {
  if (reloadOnce()) event.preventDefault();
}

/**
 * The entry's one call (`main.tsx`), before anything lazy can load. `navigatingTo` names the address
 * the router is loading, if any (`routerDestination`). Returns a function that undoes it.
 */
export function installStaleChunkRecovery(
  options: { win?: Window; navigatingTo?: () => string | null } = {},
): () => void {
  const win = options.win ?? window;
  navigatingTo = options.navigatingTo ?? (() => null);
  win.addEventListener('vite:preloadError', onPreloadError);
  const stopWatching = clearOnAppReady(win.document.body);
  return () => {
    win.removeEventListener('vite:preloadError', onPreloadError);
    stopWatching();
    navigatingTo = () => null;
  };
}

/** Tests only: a fresh page, as far as this module knows. */
export function resetStaleChunkForTests(): void {
  reloading = false;
  navigatingTo = () => null;
}
