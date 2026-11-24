import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

// The learner portal v2's addresses (D-177), siblings of `/` like /course and /skill-library, so nothing
// about the current portal's shell, routes or goldens moves.
//
//   /learn                         Home (before launch, live build, between sessions; no cohort pieces
//                                  for a learner whose plan has no course, Utah Life included)
//   /learn/week/:week              a week's overview, or its locked preview while it is locked
//   /learn/week/:week/step/:step   the step player (1-based step number)
//   /learn/schedule                the Schedule, by week (D-180); `?view=calendar` for the month view
//   /learn/community               the cohort Community (D-231): its threads by space; for a learner v3 draws for,
//                                  and staff; anyone else goes Home
//   /learn/community/:id           one thread
//   /learn/skills                  the Skill Library (D-179)
//   /learn/skills/:slug            a skill: its guided setup in the step player when it is open, else
//                                  its locked preview (D-179)
//   /learn/account                 the learner's Account page (D-178)
//   /learn/team                    the Team Hub, for a Team tier learner (D-182): the first portal's
//                                  screen, inside this shell, because it is the one place an owner
//                                  invites a teammate
//   /learn/vault                   the Resource Vault (D-182): the first portal's screen, inside this
//                                  shell, where the nav's Resource vault opens it
//   /learn/employees/:id           a non-course AI Employee's page (D-186): any published module that
//                                  isn't a course week, with its steps, kit and Your Deployment card
//
// With the flag off there are no screens here at all: every /learn address redirects to /.
//
// With the flag on, the router routes by course access (D-182, `audience.ts`): a learner with the
// course is sent here from the first portal's addresses (`redirects.tsx`), and a learner without it is
// sent from here back to the first portal's page for the address (the Skill Library, the vault, the Team
// Hub, `/account`), exactly as `main` serves them today. That is the `gate` option: the router passes it,
// the screens' own tests leave it off.

export const LEARN_ROOT = '/learn';
export const learnHome = (): string => LEARN_ROOT;
export const learnWeek = (week: number): string => `${LEARN_ROOT}/week/${week}`;
export const learnStep = (week: number, step: number): string => `${LEARN_ROOT}/week/${week}/step/${step}`;
export const learnIntake = (): string => `${LEARN_ROOT}/week/0/intake`;
export const learnStack = (): string => `${LEARN_ROOT}/week/0/stack`;
export const learnSchedule = (view?: 'calendar'): string => `${LEARN_ROOT}/schedule${view ? `?view=${view}` : ''}`;
export const learnSkills = (): string => `${LEARN_ROOT}/skills`;
export const learnSkill = (slug: string): string => `${LEARN_ROOT}/skills/${slug}`;
export const learnAccount = (): string => `${LEARN_ROOT}/account`;
export const learnTeam = (): string => `${LEARN_ROOT}/team`;
export const learnVault = (): string => `${LEARN_ROOT}/vault`;
export const learnEmployee = (id: string): string => `${LEARN_ROOT}/employees/${encodeURIComponent(id)}`;
// D-241: the $37 skill buyer's two pages with no member page of their own (`buyer/`).
export const learnTraining = (): string => `${LEARN_ROOT}/training`;
export const learnOfficeHours = (): string => `${LEARN_ROOT}/office-hours`;

export interface LearnerRouteOptions {
  /** Send a learner without the course back to the first portal (D-182, `gates/LearnGate.tsx`). */
  gate?: boolean;
}

export function learnerRoutes(enabled: boolean, { gate = false }: LearnerRouteOptions = {}): RouteObject[] {
  // D-241: with the flag off, /learn is still the $37 skill buyer's LMS (`buyer/Buyer.tsx`); anyone else goes to /, as
  // before. The screens' own tests (no `gate`) keep the bare redirect.
  if (!enabled) return [gate ? { path: `${LEARN_ROOT}/*`, lazy: () => import('./buyer/Buyer') } : { path: `${LEARN_ROOT}/*`, element: <Navigate to="/" replace /> }];
  return [
    {
      path: LEARN_ROOT,
      lazy: gate ? () => import('./gates/LearnGate') : () => import('../../shell/learner/LearnerShell'),
      children: [
        { index: true, lazy: () => import('./Home') },
        { path: 'week/:week', lazy: () => import('./Week') },
        { path: 'week/:week/step/:step', lazy: () => import('./Step') },
        { path: 'week/:week/intake', lazy: () => import('./Intake') },
        { path: 'week/:week/stack', lazy: () => import('./Stack') },
        { path: 'schedule', lazy: () => import('./Schedule') },
        { path: 'community', lazy: () => import('./Community') },
        { path: 'community/:id', lazy: () => import('./Community') },
        { path: 'skills', lazy: () => import('./Library') },
        { path: 'skills/:slug', lazy: () => import('./Skill') },
        { path: 'account', lazy: () => import('./Account') },
        { path: 'team', lazy: () => import('./Team') },
        { path: 'vault', lazy: () => import('../portal/Vault') },
        { path: 'employees/:id', lazy: () => import('./Hire') },
        { path: '*', element: <Navigate to={LEARN_ROOT} replace /> },
      ],
    },
  ];
}
