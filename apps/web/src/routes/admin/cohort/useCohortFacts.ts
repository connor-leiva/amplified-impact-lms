import { useEffect, useState } from 'react';
import type { CohortFacts } from '@ai/core';

// D-255 (R-5 Phase 3): what the Cohort page reads about a cohort beyond the snapshot: its test sends (audit rows), the
// cohort plans placed in it, and its Teams and Learners by the spec's rule 2 (`GET /api/admin/cohorts/:id/facts`).
// Null until it answers; on a failure, null (the page draws what it can without them: no counts, nothing done).
//
// The fixture build has no server, so it answers none sold, none sent: the facts of a cohort nobody has touched.

const FIXTURE = import.meta.env.VITE_DATA_SOURCE === 'fixture';
const NONE: CohortFacts = {
  testSends: { welcome: false, week0: false },
  plans: 0,
  teams: 0,
  learners: 0,
  intakeNotStarted: 0,
  intakeGhlFailed: 0,
};

export const cohortFactsPath = (cohortId: string): string => `/api/admin/cohorts/${encodeURIComponent(cohortId)}/facts`;

export function useCohortFacts(cohortId: string): CohortFacts | null {
  const [facts, setFacts] = useState<{ id: string; facts: CohortFacts | null } | null>(null);
  useEffect(() => {
    if (FIXTURE) {
      setFacts({ id: cohortId, facts: NONE });
      return;
    }
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
  }, [cohortId]);
  return facts && facts.id === cohortId ? facts.facts : null;
}
