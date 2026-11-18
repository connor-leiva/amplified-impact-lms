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
//   /learn/skills                  the Skill Library (D-179)
//   /learn/skills/:slug            a skill: its guided setup in the step player when it is open, else
//                                  its locked preview (D-179)
//   /learn/account                 the learner's Account page (D-178)
//   /learn/employees/:id           a non-course AI Employee's page (D-186): any published module that
//                                  isn't a course week, with its steps, kit and Your Deployment card
//
// With the flag off there are no screens here at all: every /learn address redirects to /.

export const LEARN_ROOT = '/learn';
export const learnHome = (): string => LEARN_ROOT;
export const learnWeek = (week: number): string => `${LEARN_ROOT}/week/${week}`;
export const learnStep = (week: number, step: number): string => `${LEARN_ROOT}/week/${week}/step/${step}`;
export const learnSchedule = (view?: 'calendar'): string => `${LEARN_ROOT}/schedule${view ? `?view=${view}` : ''}`;
export const learnSkills = (): string => `${LEARN_ROOT}/skills`;
export const learnSkill = (slug: string): string => `${LEARN_ROOT}/skills/${slug}`;
export const learnAccount = (): string => `${LEARN_ROOT}/account`;
export const learnEmployee = (id: string): string => `${LEARN_ROOT}/employees/${encodeURIComponent(id)}`;

export function learnerRoutes(enabled: boolean): RouteObject[] {
  if (!enabled) return [{ path: `${LEARN_ROOT}/*`, element: <Navigate to="/" replace /> }];
  return [
    {
      path: LEARN_ROOT,
      lazy: () => import('../../shell/learner/LearnerShell'),
      children: [
        { index: true, lazy: () => import('./Home') },
        { path: 'week/:week', lazy: () => import('./Week') },
        { path: 'week/:week/step/:step', lazy: () => import('./Step') },
        { path: 'schedule', lazy: () => import('./Schedule') },
        { path: 'skills', lazy: () => import('./Library') },
        { path: 'skills/:slug', lazy: () => import('./Skill') },
        { path: 'account', lazy: () => import('./Account') },
        { path: 'employees/:id', lazy: () => import('./Hire') },
        { path: '*', element: <Navigate to={LEARN_ROOT} replace /> },
      ],
    },
  ];
}
