import { createBrowserRouter, Navigate } from 'react-router';

const devRoutes = import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true';

// Phase 07 mounts /sign-in and /invite/:token. Both screens are already built — see routes/auth/ —
// but they post to /api/auth/request and /api/auth/verify, which do not exist yet, so mounting them
// now would ship two routes that visibly do nothing. They stay unmounted, covered by their own
// vitest suites, until the endpoints land in the same phase.
//
// Only routes that work are mounted, so there is never placeholder UI; the shell's own guards
// handle role and tier redirects (SCREENS § 2, phase 04 § 4.1).
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
      { path: 'admin', lazy: () => import('./routes/admin/Overview') },
      { path: 'admin/curriculum', lazy: () => import('./routes/admin/Curriculum') },
      // One route for both: `new` is the blank draft, anything else edits that AI Employee.
      { path: 'admin/curriculum/:employeeId', lazy: () => import('./routes/admin/ModuleBuilder') },
      { path: 'admin/cohorts', lazy: () => import('./routes/admin/Cohorts') },
      { path: 'admin/learners', lazy: () => import('./routes/admin/Learners') },
      { path: 'admin/vault', lazy: () => import('./routes/admin/VaultManager') },
      { path: 'admin/announcements', lazy: () => import('./routes/admin/Announcements') },
      { path: 'admin/tiers', lazy: () => import('./routes/admin/Tiers') },
      { path: 'admin/staff', lazy: () => import('./routes/admin/Staff') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
