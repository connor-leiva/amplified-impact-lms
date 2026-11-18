import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

// The learner portal v2's addresses (D-177), siblings of `/` like /course and /skill-library, so nothing
// about the current portal's shell, routes or goldens moves.
//
//   /learn                         Home (before launch, live build, between sessions; no cohort pieces
//                                  for a learner whose plan has no course, Utah Life included)
//   /learn/week/:week              a week's overview, or its locked preview while it is locked
//   /learn/week/:week/step/:step   the step player (1-based step number)
//
// With the flag off there are no screens here at all: every /learn address redirects to /.

export const LEARN_ROOT = '/learn';
export const learnHome = (): string => LEARN_ROOT;
export const learnWeek = (week: number): string => `${LEARN_ROOT}/week/${week}`;
export const learnStep = (week: number, step: number): string => `${LEARN_ROOT}/week/${week}/step/${step}`;

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
        { path: '*', element: <Navigate to={LEARN_ROOT} replace /> },
      ],
    },
  ];
}
