import { createBrowserRouter, Navigate } from 'react-router';
import type { RouteObject } from 'react-router';
import { fixtureAdminRoutes } from './routes/console/fixtureRoutes';
import { withStaleChunkRecovery } from './lib/StaleChunkBoundary';
import { MasqueradeRoot } from './shell/MasqueradeRoot';
import { learnerV2Enabled } from './routes/learn/flag';
import { learnerRoutes } from './routes/learn/routes';

const devRoutes = import.meta.env.DEV || import.meta.env.VITE_ENABLE_STATES === 'true';

/** D-253: yesterday's admin addresses, each a redirect to its new one (`shell/admin/addresses.ts`). */
const MOVED_ADMIN_PATHS = [
  'admin/curriculum',
  'admin/curriculum/:id',
  'admin/vault',
  'admin/build',
  'admin/cohorts',
  'admin/learners',
  'admin/community',
  'admin/community/:id',
  'admin/announcements',
  'admin/users',
  'admin/users/:id',
  'admin/workspaces',
  'admin/workspaces/:id',
  'admin/masquerade',
  'admin/billing',
  'admin/billing/:tab',
  'admin/tiers',
  'admin/usage',
] as const;

// The learner portal v2's switch (D-177, `routes/learn/flag.ts`), read once, here. OFF, which is every
// build that does not set `VITE_LEARNER_V2=true` (production today), the router below is #171's, line for
// line: the first portal at `/`, the standalone Skill Library and its guides, the course pages, and every
// /learn address sent to `/`. ON (D-182), it routes by course access (`routes/learn/audience.ts`): a
// learner whose plan opens the course gets the learner portal at /learn, every first-portal address of
// theirs redirected there; staff, a signed-out visitor and a learner without the course (the Agent Plan,
// the Team Plan, Insiders, Utah Life, every access group's member) get the routes `main` serves today.
// Rollback is the variable, not a revert. A production build with it on must show `pnpm parity:learner`
// passed on its commit (`apps/web/learner-parity-guard.ts`).
const learnerV2 = learnerV2Enabled();

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
  // With the flag on (D-182), each of these four checks the visitor first: a learner with the course goes
  // to the learner portal's page for it, anyone else gets this page as it is (`routes/learn/gates/`).
  { path: '/skill-library', lazy: learnerV2 ? () => import('./routes/learn/gates/LibraryGate') : () => import('./routes/library/SkillLibrary') },
  // Each skill's guided setup (D-151), behind sign-in: outside the shell, like the library it opens from.
  { path: '/skill-library/:slug', lazy: learnerV2 ? () => import('./routes/learn/gates/GuideGate') : () => import('./routes/library/SkillGuide') },
  // The AI Accelerator's pages (D-110): net-new and outside the shell for the same reason.
  { path: '/course', lazy: learnerV2 ? () => import('./routes/learn/gates/CourseGate') : () => import('./routes/course/Course') },
  { path: '/course/:week', lazy: learnerV2 ? () => import('./routes/learn/gates/CourseGate') : () => import('./routes/course/Course') },
  // The CRM sync log (D-134): the Owner and Admins only, net-new and outside the shell for the same
  // reason. A static path, so it ranks above the shell's `admin` children and its catch-all.
  { path: '/admin/crm-sync', lazy: () => import('./routes/crm/CrmSync') },
  // The learner portal v2 (D-177): its own shell, Home, the week overview and the step player, behind a
  // build-time flag that is off by default (`routes/learn/flag.ts`). Off, every /learn address goes to /.
  // On, a learner without the course is sent back to the first portal's page (D-182, the `gate`).
  ...learnerRoutes(learnerV2, { gate: true }),
  {
    path: '/',
    // With the flag on (D-182), a learner with the course is sent to the learner portal's page for any
    // address here before anything is drawn; staff and a learner without it get the shell as it is.
    lazy: learnerV2 ? () => import('./routes/learn/gates/ShellGate') : () => import('./shell/AppShell'),
    children: [
      { index: true, lazy: () => import('./routes/portal/Dashboard') },
      { path: 'sessions', lazy: () => import('./routes/portal/Sessions') },
      { path: 'employees/:employeeId', lazy: () => import('./routes/portal/EmployeeDetail') },
      { path: 'team', lazy: () => import('./routes/portal/TeamHub') },
      { path: 'vault', lazy: () => import('./routes/portal/Vault') },
      { path: 'team-tier', lazy: () => import('./routes/portal/TeamTier') },
      { path: 'admin', lazy: () => import('./routes/admin/Overview') },
      // D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3): four pages with tabs, each tab one of yesterday's pages.
      // Program: Curriculum, Course settings (D-174) and the Resource Vault; a week (the Module Builder) is Curriculum's
      // record. `new` is the blank draft, anything else edits that AI Employee or week.
      {
        path: 'admin/program',
        lazy: () => import('./routes/admin/areas/ProgramArea'),
        children: [
          { index: true, lazy: () => import('./routes/admin/Curriculum') },
          { path: 'course', lazy: () => import('./routes/admin/CourseSettings') },
          { path: 'vault', lazy: () => import('./routes/admin/VaultManager') },
        ],
      },
      { path: 'admin/program/weeks/:employeeId', lazy: () => import('./routes/admin/ModuleBuilder') },
      // Cohort: the cohort is in the address. `/admin/cohort` goes to the one the admin is on.
      { path: 'admin/cohort', lazy: () => import('./routes/admin/areas/CohortHome') },
      // D-255 (R-5 Phase 3): New cohort, a page of the Cohort row's. A static path, so it ranks above `:cohortId`.
      { path: 'admin/cohort/new', lazy: () => import('./routes/admin/cohort/NewCohort') },
      {
        path: 'admin/cohort/:cohortId',
        lazy: () => import('./routes/admin/areas/CohortArea'),
        children: [
          // D-255: Overview at the cohort's own address, Schedule (the mockup's table), and Settings.
          { index: true, lazy: () => import('./routes/admin/cohort/CohortOverview') },
          { path: 'schedule', lazy: () => import('./routes/admin/cohort/CohortSchedule') },
          { path: 'people', lazy: () => import('./routes/admin/Learners') },
          // R-5 Phase 7 (D-268): what teams told you and sent you (the mockup's `CohortSubs`), a tab now.
          { path: 'submissions', lazy: () => import('./routes/admin/cohort/CohortSubmissions') },
          // D-238 (B-45): the cohort's Community, and a thread.
          { path: 'community', lazy: () => import('./routes/console/Community') },
          { path: 'announcements', lazy: () => import('./routes/admin/Announcements') },
          { path: 'settings', lazy: () => import('./routes/admin/cohort/CohortSettings') },
        ],
      },
      { path: 'admin/cohort/:cohortId/community/:id', lazy: () => import('./routes/console/CommunityThread') },
      // People: Everyone (Users), Teams (Workspaces) and Masquerade; a person and a team are records (D-160 R2-1c).
      {
        path: 'admin/people',
        lazy: () => import('./routes/admin/areas/PeopleArea'),
        children: [
          { index: true, lazy: () => import('./routes/console/Users') },
          { path: 'teams', lazy: () => import('./routes/console/Workspaces') },
          // Masquerade on R2 (D-162 3b, spec § 6).
          { path: 'masquerade', lazy: () => import('./routes/console/Masquerade') },
          // R-5 audit (D-267): an access group's tab (Utah Life), read-only.
          { path: 'groups/:groupId', lazy: () => import('./routes/admin/people/AccessGroup') },
        ],
      },
      { path: 'admin/people/teams/:teamId', lazy: () => import('./routes/console/Workspace') },
      { path: 'admin/people/comp', lazy: () => import('./routes/console/CompTeam') },
      { path: 'admin/people/:userId', lazy: () => import('./routes/console/User') },
      // The mockup's learner view (its `as`) keeps its address (spec § 3).
      { path: 'admin/masquerade/learner-view', lazy: () => import('./routes/console/LearnerView') },
      // Revenue: Summary (R-5 Phase 8, D-269: the mockup's Revenue), Billing's five lists as Payments (D-163, each at its
      // tab's address), Plans & upgrades (Tiers & Upgrades) and Usage (D-166).
      {
        path: 'admin/revenue',
        lazy: () => import('./routes/admin/areas/RevenueArea'),
        children: [
          { index: true, lazy: () => import('./routes/admin/revenue/RevenueSummary') },
          { path: 'payments', lazy: () => import('./routes/console/Billing') },
          { path: 'payments/:tab', lazy: () => import('./routes/console/Billing') },
          { path: 'plans', lazy: () => import('./routes/admin/Tiers') },
          { path: 'usage', lazy: () => import('./routes/console/Usage') },
        ],
      },
      { path: 'admin/staff', lazy: () => import('./routes/admin/Staff') },
      // The Admin Console (D-157): net-new screens inside the shell, by Console capability.
      { path: 'admin/audit', lazy: () => import('./routes/console/AuditLog') },
      { path: 'admin/roles', lazy: () => import('./routes/console/Roles') },
      { path: 'admin/search', lazy: () => import('./routes/console/Search') },
      // API & Webhooks (with its deliveries tab at its own address) and Scheduled Jobs (D-165, spec §§ 7.9-7.10).
      { path: 'admin/api', lazy: () => import('./routes/console/Api') },
      { path: 'admin/api/:tab', lazy: () => import('./routes/console/Api') },
      { path: 'admin/jobs', lazy: () => import('./routes/console/Jobs') },
      // D-166: the Email Log (spec § 7.7).
      { path: 'admin/email', lazy: () => import('./routes/console/EmailLog') },
      // Incidents and one incident (D-167, spec § 7.14).
      { path: 'admin/incidents', lazy: () => import('./routes/console/Incidents') },
      { path: 'admin/incidents/:id', lazy: () => import('./routes/console/Incident') },
      // The Operations pages on R2 (D-168; spec §§ 7.11-7.13).
      { path: 'admin/integrations', lazy: () => import('./routes/console/Integrations') },
      { path: 'admin/deploys', lazy: () => import('./routes/console/Deploys') },
      { path: 'admin/db', lazy: () => import('./routes/console/DbHealth') },
      { path: 'admin/flags', lazy: () => import('./routes/console/Flags') },
      // D-169 (spec § 7.1): System Health, now Operations' first page (D-253).
      { path: 'admin/health', lazy: () => import('./routes/console/Health') },
      // D-253: every address that moved lands on its new one (`shell/admin/addresses.ts`), query and hash kept. The
      // Build hub (D-169) is Program now.
      ...MOVED_ADMIN_PATHS.map((path) => ({ path, lazy: () => import('./routes/admin/areas/Moved') })),
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
