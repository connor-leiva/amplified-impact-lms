import { useEffect, useMemo, useState } from 'react';
import type { CohortFacts } from '@ai/core';
import { useDb } from '../../../data/hooks';
import { fixtureCohortFacts } from '../../../data/fixture-cohort-facts';

// D-255 (R-5 Phase 3): what the Cohort page reads about a cohort beyond the snapshot: its test sends (audit rows), the
// cohort plans placed in it, and its Teams and Learners by the spec's rule 2 (`GET /api/admin/cohorts/:id/facts`).
// Null until it answers; on a failure, null (the page draws what it can without them: no counts, nothing done).
//
// The fixture build has no server, so it answers none sold, none sent: the facts of a cohort nobody has touched. R-5
// Phase 5 (D-262): and the fixture's Stripe (`data/fixture-cohort-facts.ts`), which the Enrollment card and Before It
// Opens read; in http mode the API asks Stripe, read only.

const FIXTURE = import.meta.env.VITE_DATA_SOURCE === 'fixture';

export const cohortFactsPath = (cohortId: string): string => `/api/admin/cohorts/${encodeURIComponent(cohortId)}/facts`;

export function useCohortFacts(cohortId: string): CohortFacts | null {
  const db = useDb();
  const [facts, setFacts] = useState<{ id: string; facts: CohortFacts | null } | null>(null);
  // The fixture's facts follow the snapshot (a saved key is priced at once); the API's are fetched again on a change.
  const fixture = useMemo(() => (FIXTURE ? fixtureCohortFacts(db, cohortId) : null), [db, cohortId]);
  const co = db.cohorts.find((c) => c.id === cohortId);
  const version = FIXTURE ? '' : JSON.stringify([co?.status, co?.lookupKeyFull, co?.lookupKeyRollover, co?.lookupKeyTwoPay, co?.twoPay, co?.linkFull, co?.linkTwoPay]);
  useEffect(() => {
    if (FIXTURE) return;
    let alive = true;
    fetch(cohortFactsPath(cohortId), { credentials: 'include', headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? (res.json() as Promise<CohortFacts>) : null))
      .then(
        (f) => alive && setFacts({ id: cohortId, facts: f }),
        () => alive && setFacts({ id: cohortId, facts: null }),
      );
    return () => {
      alive = false;
    };
  }, [cohortId, version]);
  if (FIXTURE) return fixture;
  return facts && facts.id === cohortId ? facts.facts : null;
}
