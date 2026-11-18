// Who the learner portal at /learn is for, with the flag on (D-182): a learner whose plan opens the
// course. Everyone else, a learner without the course above all (the Agent Plan, the Team Plan,
// Insiders, Utah Life and every access group's member), keeps the first portal exactly as `main` serves
// it: the standalone Skill Library and its guides, the vault, the Team Hub and `/account`.
//
// THE RULE IS THE ONE THAT ALREADY DECIDES WHERE A SIGN-IN LANDS. `hasPortal` (`shell/navModel.ts`,
// D-119) is `visibleModules` of the viewer's scoped snapshot, and the server's `landingPath` (D-150) is
// the same rule over the same snapshot: `/` for a learner with the course, `/skill-library` for one
// without it. So the flag moves a learner to /learn only where `main` would have opened the cohort
// portal for them, and a learner whose course has not opened yet (or is paused for payment) stays on
// the Skill Library and its pre-launch or paused panel, as today.
//
// With the flag off none of this runs: the router registers the first portal's routes as they are.
//
// PURE, apart from `useAudience`, which reads the session without the 401 redirect (below).

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Db } from '@ai/core';
import { repo } from '../../data/boot';
import { DB_KEY, VIEWER_KEY } from '../../data/hooks';
import type { Viewer } from '../../data/repository';
import { hasPortal } from '../../shell/navModel';
import { LEARN_ROOT } from './routes';

/** A learner whose plan opens the course: the learner portal's audience (D-182). Staff never are. */
export const isCourseLearner = (viewer: Pick<Viewer, 'actor'>, db: Db): boolean => viewer.actor.kind === 'learner' && hasPortal(db);

/**
 * Where a learner without the course goes from a /learn address: the first portal's page for it, as
 * `main` serves it today. Anything with no first-portal page of its own (Home, the Schedule, a week, a
 * step) is the Skill Library, which is where the first portal sends them from every cohort screen
 * (`noPortalRedirect`, D-119).
 */
export function firstPortalPathFor(pathname: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const rest = p === LEARN_ROOT ? '' : p.startsWith(`${LEARN_ROOT}/`) ? p.slice(LEARN_ROOT.length + 1) : '';
  const skill = /^skills\/([^/]+)$/.exec(rest);
  if (skill) return `/skill-library/${skill[1]}`;
  if (rest === 'vault') return '/vault';
  if (rest === 'team') return '/team';
  if (rest === 'account') return '/account';
  return '/skill-library';
}

export type Audience = 'course' | 'other';

/**
 * The audience of a page that is open to a signed-out visitor (the Skill Library, a skill's guide, the
 * course pages). `useDb`/`useViewer` would send a signed-out visitor to /sign-in (`data/http.ts`'s 401
 * redirect), which those pages never did: they show their own signed-out state. So in http mode the
 * session is asked first, quietly, and a visitor without one is `other` (the first portal's page, as
 * today). The snapshot and viewer it reads are the same queries the shells read, so neither is fetched
 * twice. Any failure is `other`: the page `main` serves.
 */
export async function probeAudience(qc: QueryClient, source: 'fixture' | 'http' = repo.source, signedIn: () => Promise<boolean> = probeSession): Promise<Audience> {
  try {
    if (source === 'http' && !(await signedIn())) return 'other';
    const viewer = await qc.fetchQuery({ queryKey: VIEWER_KEY, queryFn: () => repo.viewer(), staleTime: Infinity });
    if (viewer.actor.kind !== 'learner') return 'other';
    const db = await qc.fetchQuery({ queryKey: DB_KEY, queryFn: () => repo.snapshot(), staleTime: Infinity });
    return isCourseLearner(viewer, db) ? 'course' : 'other';
  } catch {
    return 'other';
  }
}

/** Whether there is a session, without the 401 redirect every other read has. */
async function probeSession(): Promise<boolean> {
  const res = await fetch('/api/me', { credentials: 'include', headers: { accept: 'application/json' } });
  return res.ok;
}

/** `probeAudience` as a hook: null until it is known, so the page draws nothing on its way. */
export function useAudience(): Audience | null {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience | null>(null);
  useEffect(() => {
    let alive = true;
    void probeAudience(qc).then((a) => {
      if (alive) setAudience(a);
    });
    return () => {
      alive = false;
    };
  }, [qc]);
  return audience;
}
