// FIXTURE BUILD ONLY (D-160 R2-1b): the R2 mockup's standalone "Access denied" screen at `/admin/denied`,
// so `parity:admin-r2` can compare it with its refs. `import.meta.env.VITE_DATA_SOURCE` is a constant
// Vite writes in at build time, so the http build has an empty list and no such route (`/admin/denied`
// is the Console 404 there); `data/console-build.test.ts` builds this file both ways and checks.
export const fixtureAdminRoutes =
  import.meta.env.VITE_DATA_SOURCE === 'fixture' ? [{ path: 'admin/denied', lazy: () => import('./Denied') }] : [];
