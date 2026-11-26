// D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3, "Which cohort"): the cohort the admin is on. PURE.
//
// The cohort is in the address (`/admin/cohort/:cohortId/…`), so a link names its cohort. Elsewhere the sidebar's
// switcher shows the cohort looked at last in this tab, else the default: the cohort that is running, else the next to
// start, else the newest. Remembering it for a staff member across visits (`users.prefs`) waits for Phase 3: the prefs
// route accepts only `tz`, `theme` and `sidebar` today (`apps/api/src/routes/auth.ts`).
//
// The pickers (the switcher and the Cohort page's title) list every cohort that exists, a draft marked "· Draft". No
// cohort is archived yet (`archivedAt` arrives in Phase 2). "New cohort…" arrives with its page in Phase 3.

import type { Cohort } from '@ai/core';
import { cohortLabel } from '../../data/admin-shell';

type CohortLike = Pick<Cohort, 'id' | 'name' | 'start' | 'end' | 'status' | 'archivedAt'>;

/** The cohort `/admin/cohort` opens: running (started, not ended, not a draft), else the next to start, else the newest. */
export function defaultCohortId(cohorts: readonly CohortLike[], now: number): string | null {
  if (!cohorts.length) return null;
  const live = cohorts.filter((c) => c.status !== 'draft' && c.start <= now && now < c.end).sort((a, b) => b.start - a.start);
  if (live[0]) return live[0].id;
  const next = cohorts.filter((c) => c.start > now).sort((a, b) => a.start - b.start);
  if (next[0]) return next[0].id;
  return [...cohorts].sort((a, b) => b.start - a.start)[0]!.id;
}

export interface CohortChoice {
  id: string;
  /** "December 2026 Cohort", or "… · Draft". */
  label: string;
  current: boolean;
}

/** The pickers' list: every cohort that is not archived (D-255), in start order, the one the admin is on checked. */
export function cohortChoices(cohorts: readonly CohortLike[], currentId: string | null): CohortChoice[] {
  return [...cohorts]
    .filter((c) => c.archivedAt === undefined)
    .sort((a, b) => a.start - b.start)
    .map((c) => ({ id: c.id, label: cohortLabel(c) + (c.status === 'draft' ? ' · Draft' : ''), current: c.id === currentId }));
}

/**
 * Where picking a cohort goes (the mockup's `CtxSwitch`): on a cohort's page, the same tab of the one picked (a
 * thread's page goes to the picked cohort's Community); on the Overview, nowhere (the switcher shows it); anywhere
 * else, the picked cohort's page.
 */
export function afterPick(pathname: string, cohortId: string): string | null {
  const s = pathname.split('/').filter(Boolean);
  const base = `/admin/cohort/${encodeURIComponent(cohortId)}`;
  if (s[0] === 'admin' && s[1] === 'cohort' && s[2] !== undefined) return s[3] ? `${base}/${s[3]}` : base;
  if (s.length === 1 && s[0] === 'admin') return null;
  return base;
}
