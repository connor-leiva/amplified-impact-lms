import { Navigate } from 'react-router';
import type { RouteObject } from 'react-router';

// The learner portal's addresses (D-177; every learner's portal since D-182), inside the learner shell.
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
//   /learn/team                    the Team Hub, for a Team tier learner (D-182): the first portal's
//                                  screen, inside this shell, because it is the one place an owner
//                                  invites a teammate
//   /learn/vault                   the Resource Vault (D-182): the first portal's screen, inside this
//                                  shell, where the nav's Resource vault opens it
//
// The first portal's learner addresses (`/`, `/sessions`, `/employees/:id`, `/course`, `/course/:week`,
// `/skill-library`, `/skill-library/:slug`, `/team`, `/vault`, `/team-tier`) redirect here
// (`redirects.ts`, D-182).

export const LEARN_ROOT = '/learn';
export const learnHome = (): string => LEARN_ROOT;
export const learnWeek = (week: number): string => `${LEARN_ROOT}/week/${week}`;
export const learnStep = (week: number, step: number): string => `${LEARN_ROOT}/week/${week}/step/${step}`;
export const learnSchedule = (view?: 'calendar'): string => `${LEARN_ROOT}/schedule${view ? `?view=${view}` : ''}`;
export const learnSkills = (): string => `${LEARN_ROOT}/skills`;
export const learnSkill = (slug: string): string => `${LEARN_ROOT}/skills/${slug}`;
export const learnAccount = (): string => `${LEARN_ROOT}/account`;
export const learnTeam = (): string => `${LEARN_ROOT}/team`;
export const learnVault = (): string => `${LEARN_ROOT}/vault`;

export function learnerRoutes(): RouteObject[] {
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
        { path: 'team', lazy: () => import('./Team') },
        { path: 'vault', lazy: () => import('../portal/Vault') },
        { path: '*', element: <Navigate to={LEARN_ROOT} replace /> },
      ],
    },
  ];
}
