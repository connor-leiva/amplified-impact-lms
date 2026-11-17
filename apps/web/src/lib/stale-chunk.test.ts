import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RELOAD_KEY,
  RELOAD_WINDOW_MS,
  clearOnAppReady,
  clearReloadFlag,
  installStaleChunkRecovery,
  isStaleChunkError,
  page,
  reloadOnce,
  reloadPending,
  resetStaleChunkForTests,
  routerDestination,
} from './stale-chunk';

// D-170: the stale-chunk rule. A tab opened before a deploy asks for files the deploy removed; it
// reloads once, never in a loop, and forgets the reload once the app has booted.

const T0 = Date.UTC(2026, 10, 16, 21, 0, 0);
let reload: ReturnType<typeof vi.spyOn>;
let open: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetStaleChunkForTests();
  sessionStorage.clear();
  delete document.body.dataset.appReady;
  window.history.replaceState(null, '', '/');
  reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
  open = vi.spyOn(page, 'open').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  delete document.body.dataset.appReady;
});

/** A new page in the same tab: this module's memory is fresh, `sessionStorage` is not. */
const nextPage = () => resetStaleChunkForTests();

describe('isStaleChunkError', () => {
  it.each([
    [
      'Chromium',
      new TypeError(
        'Failed to fetch dynamically imported module: https://learn.amplifiedimpact.io/assets/Staff-B3x9-1aQ.js',
      ),
    ],
    [
      'Vite, for a route stylesheet',
      new Error('Unable to preload CSS for https://learn.amplifiedimpact.io/assets/Staff-CKfOKx-c.css'),
    ],
    ['Safari', new TypeError('Importing a module script failed.')],
    [
      'Firefox',
      new TypeError(
        'error loading dynamically imported module: https://learn.amplifiedimpact.io/assets/Staff-B3x9-1aQ.js',
      ),
    ],
  ])('recognises %s', (_who, err) => {
    expect(isStaleChunkError(err)).toBe(true);
    // However it arrives: an Error, its message, or anything carrying that message.
    expect(isStaleChunkError(err.message)).toBe(true);
    expect(isStaleChunkError({ message: err.message })).toBe(true);
  });

  it('ignores every other error', () => {
    for (const err of [
      new TypeError("Cannot read properties of undefined (reading 'default')"),
      new Error('Failed to fetch'), // a data request, not a module
      new SyntaxError('Unexpected token <'),
      { status: 404, statusText: 'Not Found', data: 'Not found' }, // a route error response
      { message: 42 },
      '',
      null,
      undefined,
      0,
    ]) {
      expect(isStaleChunkError(err), String((err as { message?: unknown })?.message ?? err)).toBe(false);
    }
  });
});

describe('reloadOnce', () => {
  it('reloads once, and records when in sessionStorage', () => {
    expect(reloadOnce(T0)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe(String(T0));
    expect(reloadPending()).toBe(true);
    // A second caller in the same page agrees a reload is under way, and does not start another.
    expect(reloadOnce(T0 + 5)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload again inside the window, so a deploy that is itself missing a file cannot loop', () => {
    expect(reloadOnce(T0)).toBe(true);
    nextPage();
    expect(reloadOnce(T0 + 2_000)).toBe(false);
    nextPage();
    expect(reloadOnce(T0 + RELOAD_WINDOW_MS - 1)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadPending()).toBe(false);
  });

  it('reloads again after the window: a later deploy in the same tab', () => {
    expect(reloadOnce(T0)).toBe(true);
    nextPage();
    expect(reloadOnce(T0 + RELOAD_WINDOW_MS)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe(String(T0 + RELOAD_WINDOW_MS));
  });

  it('does not reload, and does not throw, when sessionStorage throws', () => {
    const denied = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    for (const method of ['getItem', 'setItem'] as const) {
      const spy = vi.spyOn(Storage.prototype, method).mockImplementation(denied);
      expect(() => reloadOnce(T0)).not.toThrow();
      expect(reloadOnce(T0)).toBe(false);
      spy.mockRestore();
    }
    // Storage itself refused (a sandboxed frame, or site data blocked).
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(denied);
    expect(reloadOnce(T0)).toBe(false);
    expect(() => clearReloadFlag()).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when the write does not stick, since nothing would stop the next page reloading', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    expect(reloadOnce(T0)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload offline, where a reload only swaps the app for the browser’s offline page', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(reloadOnce(T0)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull();
  });

  it('reloads the page itself, or opens the address the router is loading', () => {
    vi.mocked(page.reload).mockRestore();
    vi.mocked(page.open).mockRestore();
    expect(page.reload.toString()).toMatch(/location\.reload\(\)/);
    expect(page.open.toString()).toMatch(/location\.assign\(href\)/);
  });
});

describe('where the reload goes', () => {
  /** The router mid-navigation: `state.navigation.location` is where it is going, the address bar still where it was. */
  const loading = (pathname: string, search = '', hash = '') => ({
    state: { navigation: { location: { pathname, search, hash } } },
  });
  const idle = { state: { navigation: {} } };

  it('opens the screen the router was loading, so the person lands where they clicked', () => {
    window.history.replaceState(null, '', '/admin?as=admin');
    installStaleChunkRecovery({ navigatingTo: () => routerDestination(loading('/admin/staff', '?as=admin')) });
    expect(reloadOnce(T0)).toBe(true);
    expect(open).toHaveBeenCalledWith('/admin/staff?as=admin');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page as it is when the router is idle: a first load, or after the address changed', () => {
    installStaleChunkRecovery({ navigatingTo: () => routerDestination(idle) });
    expect(reloadOnce(T0)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('reloads when the router is loading this same page (Back, or only its # changing)', () => {
    window.history.replaceState(null, '', '/sessions?as=agent#today');
    installStaleChunkRecovery({ navigatingTo: () => routerDestination(loading('/sessions', '?as=agent', '#later')) });
    expect(reloadOnce(T0)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('reloads when the router cannot say', () => {
    installStaleChunkRecovery({
      navigatingTo: () => {
        throw new Error('no router yet');
      },
    });
    expect(reloadOnce(T0)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('clearOnAppReady', () => {
  it('clears the flag once body[data-app-ready="true"], so the next deploy can recover too', async () => {
    expect(reloadOnce(T0)).toBe(true);
    nextPage();
    const stop = clearOnAppReady(document.body);
    // Not before the app is ready: another attribute changing is not a boot.
    document.body.dataset.theme = 'dark';
    await Promise.resolve();
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe(String(T0));
    document.body.dataset.appReady = 'true';
    await vi.waitFor(() => expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull());
    // And so, inside what would have been the window, a new deploy reloads this tab again.
    expect(reloadOnce(T0 + 2_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
    stop();
    delete document.body.dataset.theme;
  });

  it('clears at once when the app is already ready', () => {
    sessionStorage.setItem(RELOAD_KEY, String(T0));
    document.body.dataset.appReady = 'true';
    clearOnAppReady(document.body)();
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull();
  });
});

describe('the vite:preloadError listener', () => {
  const preloadError = (message: string) => {
    const e = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: Error };
    e.payload = new Error(message);
    return e;
  };

  it('cancels the event and reloads once', () => {
    const uninstall = installStaleChunkRecovery({ win: window });
    const first = preloadError('Unable to preload CSS for https://learn.amplifiedimpact.io/assets/Staff-CKfOKx-c.css');
    window.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    // Vite fires again for the same import's script; still one reload.
    const second = preloadError(
      'Failed to fetch dynamically imported module: https://learn.amplifiedimpact.io/assets/Staff-B3x9-1aQ.js',
    );
    window.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    uninstall();
  });

  it('inside the window, leaves the event alone so the error reaches the router’s error screen', () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    const uninstall = installStaleChunkRecovery({ win: window });
    const e = preloadError(
      'Failed to fetch dynamically imported module: https://learn.amplifiedimpact.io/assets/Staff-B3x9-1aQ.js',
    );
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    uninstall();
  });

  it('is gone once uninstalled', () => {
    installStaleChunkRecovery({ win: window })();
    const e = preloadError('Importing a module script failed.');
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
