import { useEffect, useState } from 'react';
import type { PeopleAudiences } from '@ai/core';
import { consoleApi } from '../../../data/console';

// R-5 Phase 7 (D-268): People's counts (`GET /api/console/users/audiences`), read once for the page's tab strip and for
// Everyone's chips together. Null until it answers; on a failure (a role that can't read Users) null, and nothing is
// counted, never a zero.

let pending: Promise<PeopleAudiences | null> | null = null;

const read = (): Promise<PeopleAudiences | null> =>
  (pending ??= consoleApi()
    .then((api) => api.audiences())
    .catch(() => null));

/** Forget the counts, so the next page that asks reads them again (after an access group's write). */
export function refreshAudiences(): void {
  pending = null;
}

export function useAudiences(enabled = true): PeopleAudiences | null {
  const [a, setA] = useState<PeopleAudiences | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void read().then((x) => alive && setA(x));
    return () => {
      alive = false;
      // A page that opens again reads them fresh.
      pending = null;
    };
  }, [enabled]);
  return a;
}
