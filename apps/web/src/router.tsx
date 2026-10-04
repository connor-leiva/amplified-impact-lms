import { createBrowserRouter, Navigate } from 'react-router';

const devRoutes = import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true';

// Phase 07 adds /sign-in and /invite/:token. Only routes that exist are mounted, so there is never
// placeholder UI; the shell's own guards handle role and tier redirects (SCREENS § 2, phase 04 §4.1).
export const router = createBrowserRouter([
  ...(devRoutes
    ? [
        { path: '/__states', lazy: () => import('./routes/__states') },
        { path: '/__tokens', lazy: () => import('./routes/__tokens') },
      ]
    : []),
  {
    path: '/',
    lazy: () => import('./shell/AppShell'),
    children: [
      { index: true, lazy: () => import('./routes/portal/Dashboard') },
      { path: 'sessions', lazy: () => import('./routes/portal/Sessions') },
      { path: 'employees/:employeeId', lazy: () => import('./routes/portal/EmployeeDetail') },
      { path: 'team', lazy: () => import('./routes/portal/TeamHub') },
      { path: 'vault', lazy: () => import('./routes/portal/Vault') },
      { path: 'team-tier', lazy: () => import('./routes/portal/TeamTier') },
      // Phase 06 replaces this with the nine admin screens. Until then the paths must still
      // RESOLVE, because the shell renders the admin sidebar and breadcrumbs from the route and
      // the `shell-admin` parity scenario checks that Overview reads as the active row. Falling
      // through to `*` would redirect to `/` and leave nothing active.
      { path: 'admin/*', element: null },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
