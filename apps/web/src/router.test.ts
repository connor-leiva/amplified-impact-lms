import { describe, expect, it, vi } from 'vitest';
import type * as ReactRouter from 'react-router';
import type { RouteObject } from 'react-router';
import { StaleChunkBoundary } from './lib/StaleChunkBoundary';

// D-170: the app's router puts every route under the stale-chunk boundary, and above React Router's
// default error screen. `createBrowserRouter` is replaced with one that only keeps its routes, so this
// reads the route table `main.tsx` mounts without starting a browser router (which would load screens).
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createBrowserRouter: (routes: RouteObject[]) => ({ routes }),
}));

const { router } = (await import('./router')) as unknown as { router: { routes: RouteObject[] } };

/** Every route in the table, depth first. */
const walk = (routes: RouteObject[]): RouteObject[] => routes.flatMap((r) => [r, ...walk(r.children ?? [])]);

describe('the app’s route table', () => {
  it('is one pathless route with no boundary, around one pathless route with the stale-chunk boundary', () => {
    expect(router.routes).toHaveLength(1);
    const [outer] = router.routes;
    // No path, no element, no boundary: React Router draws its default error screen for it.
    expect(Object.keys(outer!)).toEqual(['children']);
    expect(outer!.children).toHaveLength(1);
    const [inner] = outer!.children!;
    expect(inner!.ErrorBoundary).toBe(StaleChunkBoundary);
    expect(inner!.path).toBeUndefined();
    expect(inner!.element ?? inner!.Component ?? inner!.lazy).toBeUndefined();
  });

  it('has every route, lazy screens included, under that boundary and nowhere else', () => {
    const inner = router.routes[0]!.children![0]!;
    const all = walk(router.routes);
    const under = walk(inner.children ?? []);
    expect(all).toHaveLength(under.length + 2);
    // The addresses the app answers, unchanged.
    expect(inner.children!.map((r) => r.path)).toEqual(
      expect.arrayContaining([
        '/sign-in',
        '/login',
        '/invite/:token',
        '/skill-library',
        '/course',
        '/admin/crm-sync',
        '/',
      ]),
    );
    const lazy = under.filter((r) => r.lazy);
    expect(lazy.length).toBeGreaterThan(20);
    // Only the boundary's own route has one: no screen hides a stale chunk behind a boundary of its own.
    expect(all.filter((r) => r.ErrorBoundary || r.errorElement)).toEqual([inner]);
  });
});
