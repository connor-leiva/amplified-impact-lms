import { createBrowserRouter, Navigate } from 'react-router';

const devRoutes = import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true';

// /sign-in and /invite/:token are MOUNTED now, which is the one thing that was missing: both
// screens were built in phase 07 and left unmounted because they post to /api/auth/request and
// /api/auth/verify, "which do not exist yet". They exist — `apps/api/src/routes/auth.ts` § 7.5 —
// so a route that visibly does nothing is no longer what mounting them would ship.
//
// THEY ARE SIBLINGS OF `/`, NOT CHILDREN OF IT, AND THAT IS THE WHOLE TRICK.
//
// Two reasons, either of which alone would be enough:
//
//   1. `AppShell` calls `useDb()`/`useViewer()`, which suspend on `/api/snapshot` and `/api/me`.
//      Both answer 401 before there is a session, and `data/http.ts` turns a 401 into
//      `location.assign('/sign-in')`. A /sign-in nested inside the shell would therefore reload
//      itself forever. Both screens' own headers say they must render outside the shell; this is
//      the line that keeps that true.
//   2. The shell's children end with `{ path: '*' }` → `<Navigate to="/" replace />`. Nested, a
//      magic link would be swallowed by that splat and bounce to `/` with the token unspent —
//      which looks exactly like an expired link and is unfixable from the screen's side. React
//      Router ranks a static `/sign-in` above a splat, so as a sibling it wins.
//
// FIXTURE MODE IS UNCHANGED. Neither screen touches `useDb`, `useViewer`, `repo` or `clock`, so
// nothing about the fixture build's behaviour moves: /sign-in there POSTs to an endpoint the
// `vite preview` server does not have, `requestSignInLink` swallows the failure by design
// (§ 7.5's "does not reveal whether an account exists" holds end to end only if the UI refuses to
// branch), and the viewer sees "Check Your Email". That is what makes the smoke checks in
// compliance/tests/e2e/signin.spec.ts meaningful against a deployment with no fixture data.
export const router = createBrowserRouter([
  ...(devRoutes
    ? [
        { path: '/__states', lazy: () => import('./routes/__states') },
        { path: '/__tokens', lazy: () => import('./routes/__tokens') },
      ]
    : []),
  { path: '/sign-in', lazy: () => import('./routes/auth/SignIn') },
  { path: '/invite/:token', lazy: () => import('./routes/auth/AcceptInvite') },
  // The skill library (D-078): net-new, outside the shell like the two above, so no portal golden moves.
  { path: '/skill-library', lazy: () => import('./routes/library/SkillLibrary') },
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
