import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, resetStaleChunkForTests } from './lib/stale-chunk';

// D-170: the web entry listens for Vite's `vite:preloadError` before it mounts anything, cancels it
// and reloads once, onto the screen the router was loading. The entry boots on import, so the router
// and React's root are stand-ins: this is about what `main.tsx` wires, not about rendering the app.
const render = vi.fn();
// The router mid-navigation: loading Sessions while the address bar still says `/`.
const router = vi.hoisted(() => ({
  state: { navigation: { location: { pathname: '/sessions', search: '?as=agent', hash: '' } } },
}));
vi.mock('./router', () => ({ router }));
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render, unmount: vi.fn() }) }));
vi.mock('./data/boot', () => ({ isFixture: true }));

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  resetStaleChunkForTests();
});

describe('main.tsx', () => {
  it('cancels vite:preloadError and reloads once onto the screen being opened, listening before the app renders', async () => {
    window.history.replaceState(null, '', '/?as=agent');
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    const open = vi.spyOn(page, 'open').mockImplementation(() => {});
    const listening = vi.spyOn(window, 'addEventListener');
    await import('./main');
    expect(render).toHaveBeenCalledTimes(1);
    const installed =
      listening.mock.invocationCallOrder[listening.mock.calls.findIndex(([type]) => type === 'vite:preloadError')];
    expect(installed).toBeLessThan(render.mock.invocationCallOrder[0]!);

    const stale = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(stale);
    expect(stale.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith('/sessions?as=agent');

    const again = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(again);
    expect(again.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
