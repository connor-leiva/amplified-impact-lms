import { createBrowserRouter, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import { fixtureAdminRoutes } from './routes/console/fixtureRoutes';
import { withStaleChunkRecovery } from './lib/StaleChunkBoundary';
import { MasqueradeRoot } from './shell/MasqueradeRoot';

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
//      `location.replace('/sign-in')`. A /sign-in nested inside the shell would therefore reload
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
const routes: RouteObject[] = [
  ...(devRoutes
    ? [
        { path: '/__states', lazy: () => import('./routes/__states') },
        { path: '/__tokens', lazy: () => import('./routes/__tokens') },
      ]
    : []),
  { path: '/sign-in', lazy: () => import('./routes/auth/SignIn') },
  // D-132: learn.amplifiedimpact.io/login, the address www's Log In button links. The same screen as
  // /sign-in (email and password first), at the address people expect. /sign-in stays, because every
  // emailed sign-in link and the app's 401 redirect use it.
  { path: '/login', lazy: () => import('./routes/auth/SignIn') },
  { path: '/invite/:token', lazy: () => import('./routes/auth/AcceptInvite') },
  // D-132: password sign-in's three screens, net-new and outside the shell like the two above.
  { path: '/forgot-password', lazy: () => import('./routes/auth/ForgotPassword') },
  { path: '/set-password', lazy: () => import('./routes/auth/SetPassword') },
  { path: '/account', lazy: () => import('./routes/auth/Account') },
  // The skill library (D-079): net-new, outside the shell like the two above, so no portal golden moves.
  { path: '/skill-library', lazy: () => import('./routes/library/SkillLibrary') },
  // Each skill's guided setup (D-151), behind sign-in: outside the shell, like the library it opens from.
  { path: '/skill-library/:slug', lazy: () => import('./routes/library/SkillGuide') },
  // The AI Accelerator's pages (D-110): net-new and outside the shell for the same reason.
  { path: '/course', lazy: () => import('./routes/course/Course') },
  { path: '/course/:week', lazy: () => import('./routes/course/Course') },
  // The CRM sync log (D-134): the Owner and Admins only, net-new and outside the shell for the same
  // reason. A static path, so it ranks above the shell's `admin` children and its catch-all.
  { path: '/admin/crm-sync', lazy: () => import('./routes/crm/CrmSync') },
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
      // The Admin Console (D-157): net-new screens inside the shell, by Console capability.
      { path: 'admin/audit', lazy: () => import('./routes/console/AuditLog') },
      { path: 'admin/roles', lazy: () => import('./routes/console/Roles') },
      // The Support records on R2 (D-160 R2-1c; spec §§ 7.3–7.5, D-158's API).
      { path: 'admin/workspaces', lazy: () => import('./routes/console/Workspaces') },
      { path: 'admin/workspaces/:teamId', lazy: () => import('./routes/console/Workspace') },
      { path: 'admin/users', lazy: () => import('./routes/console/Users') },
      { path: 'admin/users/:userId', lazy: () => import('./routes/console/User') },
      { path: 'admin/search', lazy: () => import('./routes/console/Search') },
      // Masquerade on R2 (D-162 3b, spec § 6): the page, and the mockup's learner view (its `as`).
      { path: 'admin/masquerade', lazy: () => import('./routes/console/Masquerade') },
      { path: 'admin/masquerade/learner-view', lazy: () => import('./routes/console/LearnerView') },
      // The R2 mockup's standalone Denied screen, for parity: fixture build only (D-160 R2-1b).
      ...fixtureAdminRoutes,
      // The Console 404, after every specific admin route (React Router ranks a splat last). Every
      // other unknown address still goes home through the `*` below.
      { path: 'admin/*', lazy: () => import('./routes/console/NotFound') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

// D-170: every route above sits under `withStaleChunkRecovery`, two pathless routes (no path, no
// element: every address matches and renders as before). A lazy screen whose file a deploy removed
// reloads the page once instead of showing "Unexpected Application Error!"; any other error still
// gets React Router's default screen, as it always has. `lib/StaleChunkBoundary.tsx` says how.
//
// THE ROOT (D-162 3b). Inside that, every route is a child of `MasqueradeRoot`, a pathless layout that
// draws only its page until a masquerade session is known: then the banner shows on every page and
// every `/admin/*` address is the paused Console (spec § 6, D2). With no session the DOM is the page's alone.
export const router = createBrowserRouter(withStaleChunkRecovery([{ element: <MasqueradeRoot />, children: routes }]));
