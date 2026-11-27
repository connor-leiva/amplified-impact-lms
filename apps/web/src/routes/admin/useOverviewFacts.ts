import { useEffect, useMemo, useState } from 'react';
import type { AdminOverviewFacts, CohortFacts } from '@ai/core';
import { consoleApi } from '../../data/console';
import { fixtureCohortFacts } from '../../data/fixture-cohort-facts';
import { useDb } from '../../data/hooks';

// R-5 Phase 9 (D-270): what the Overview reads about every cohort beyond the snapshot, in one request
// (`GET /api/admin/overview`, the facts route's `cohorts` permission): each cohort's facts without Stripe. Null until it
// answers; on a failure (a role without `cohorts`) null, and the Overview draws its groups from the snapshot alone. The
// fixture build has no server: each cohort's fixture facts (`fixtureCohortFacts`), as Cohort › Overview reads them.

const FIXTURE = import.meta.env.VITE_DATA_SOURCE === 'fixture';

export const ADMIN_OVERVIEW_PATH = '/api/admin/overview';

export function useOverviewFacts(ids: readonly string[]): Record<string, CohortFacts> | null {
  const db = useDb();
  const key = ids.join(',');
  const fixture = useMemo(
    () => (FIXTURE ? Object.fromEntries(key.split(',').filter(Boolean).map((id) => [id, fixtureCohortFacts(db, id)])) : null),
    [db, key],
  );
  const [facts, setFacts] = useState<Record<string, CohortFacts> | null>(null);
  useEffect(() => {
    if (FIXTURE) return;
    let alive = true;
    fetch(ADMIN_OVERVIEW_PATH, { credentials: 'include', headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? (res.json() as Promise<AdminOverviewFacts>) : null))
      .then(
        (f) => alive && setFacts(f?.cohorts ?? null),
        () => alive && setFacts(null),
      );
    return () => {
      alive = false;
    };
  }, [key]);
  return FIXTURE ? fixture : facts;
}

/**
 * Each running cohort's Community threads waiting on staff (staff's `GET /api/community`, as the sidebar's count reads
 * the cohort the admin is on): the cohort the admin is on takes the sidebar's own count; another is read once. A draft
 * has no members, so it is not asked.
 */
export function useCohortsWaiting(ids: readonly string[], currentId: string | null, current: number, enabled: boolean): Record<string, number> {
  const key = ids.filter((id) => id !== currentId).join(',');
  const [others, setOthers] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!enabled || !key) return;
    let alive = true;
    void consoleApi().then((api) =>
      Promise.all(
        key.split(',').map((id) =>
          api.community(id).then(
            (list) => [id, list.threads.filter((t) => t.waiting).length] as const,
            () => [id, 0] as const,
          ),
        ),
      ).then((pairs) => alive && setOthers(Object.fromEntries(pairs))),
    );
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  return useMemo(() => ({ ...(enabled ? others : {}), ...(currentId ? { [currentId]: current } : {}) }), [others, currentId, current, enabled]);
}
