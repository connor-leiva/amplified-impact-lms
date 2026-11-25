// D-253 (R-5 Phase 1): the four pages' heads and their tabs' counts. PURE.
//
// The words are the mockup's (handoff/admin-mockup/p3-areas.jsx, `ProgramArea`, `PeopleArea`, `RevenueArea`). The
// Cohort page's head is its picker alone this phase: its status, its shape line, Preview, Open enrollment and its menu
// need what Phases 3 and 5 store. People's tabs carry no counts yet: today's Users and Workspaces print no totals, and
// the mockup's ("each person counted once") are Phase 7's.
//
// A tab's count is one today's page already shows, from what the shell already has (no new request):
//   Program › Curriculum   the AI Employees Curriculum lists ("15 AI Employees · …")
//   Cohort › Schedule      the cohort's sessions (Cohorts & Sessions' table)
//   Cohort › People        the teams Learners & Teams' own Teams tab counts (the mockup counts teams here)
//   Cohort › Community     the threads waiting on staff (the sidebar's "N waiting"); none at zero
//   Revenue › Plans & …    the upgrade requests not yet handled (Tiers & Upgrades' "N requests"); none at zero

import { sortedModules } from '@ai/core';
import type { Db } from '@ai/core';
import { PROGRAM } from '../../../data/admin-shell';
import type { AreaId, NavCounts } from '../../../shell/admin/adminNav';

export const AREA_COPY = {
  program: {
    title: PROGRAM,
    meta: 'Program',
    description: 'What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates.',
  },
  people: {
    title: 'People',
    description: 'Everyone with a sign-in, across every product. Each person is counted once, under how they got in.',
  },
  revenue: {
    title: 'Revenue',
    description:
      'What has come in, what is still owed on a payment plan, and what repeats every month. Every figure is from Stripe and opens the payments behind it.',
  },
} as const;

export type TabCounts = Partial<Record<string, number>>;

/** Each tab's count, by tab id; a tab with none is absent. */
export function areaCounts(db: Db, area: AreaId, cohortId: string, counts: NavCounts): TabCounts {
  if (area === 'program') return { curriculum: sortedModules(db).length };
  if (area === 'cohort')
    return {
      schedule: db.sessions.filter((s) => s.cohortId === cohortId).length,
      people: db.base.teams + db.teams.length,
      ...(counts.waiting > 0 ? { community: counts.waiting } : {}),
    };
  if (area === 'revenue') return counts.requests > 0 ? { plans: counts.requests } : {};
  return {};
}
