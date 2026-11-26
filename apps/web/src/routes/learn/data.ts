// What the learner portal v2 reads (D-177), and nothing else:
//
//   GET /api/course     the course, each week open (whole) or locked (a stub), its sessions and the
//                       learner-facing copy strings. The words of the course arrive only here.
//   GET /api/snapshot   the learner's own row (name, progress), their cohort, and each course week's
//                       module with its step ids (`useDb`, the portal's own snapshot).
//   GET /api/me         who is signed in (`useViewer`).
//
// Writes go through the portal's own mutation route: "Mark step done" is `toggleStep`, the checklist's.
// The join route hands out a live session's Zoom link, inside its window, as for the portal.

import { createContext, useContext, useEffect } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import { isLockedWeek } from '@ai/core/course';
import { repo } from '../../data/boot';
import { clock } from '../../lib/clock';
import { useOutletContext } from 'react-router';
import type { Db } from '@ai/core';
import type { CoursePayload } from '../course/Course.vm';
import type { Viewer } from '../../data/repository';
import { rateLimited } from '../../data/http';

/** What `GET /api/course` answered, as the screens tell it apart. */
export type CourseLoad =
  | { kind: 'ready'; payload: CoursePayload }
  /** Not signed in, or no API (the fixture build): the screens show what needs no course. */
  | { kind: 'signed-out' }
  /** A plan without the course (Utah Life, Insiders, a plan of skills): Home without cohort pieces. */
  | { kind: 'locked' }
  /** D-143: a two-pay course paused until its second payment goes through. */
  | { kind: 'paused' }
  /** Bought, and opening at the preview or the first live build. */
  | { kind: 'upcoming'; opensAt: number }
  | { kind: 'failed' };

export async function fetchCourse(): Promise<CourseLoad> {
  let res: Response;
  try {
    res = await fetch('/api/course', { credentials: 'include', headers: { accept: 'application/json' } });
  } catch {
    return { kind: 'signed-out' };
  }
  // D-224: a 429 is thrown, not answered as 'failed': a refetch then keeps the course on screen (a 'failed'
  // replaced it, and the step page sent the learner Home), and React Query asks again after `retry-after`.
  if (res.status === 429) throw await rateLimited(res);
  try {
    if (res.status === 401 || res.status === 404) return { kind: 'signed-out' };
    if (res.status === 403) {
      const body = (await res.json().catch(() => null)) as { paused?: unknown; upcoming?: unknown; opensAt?: unknown } | null;
      if (body?.paused === true) return { kind: 'paused' };
      if (body?.upcoming === true && typeof body.opensAt === 'number') return { kind: 'upcoming', opensAt: body.opensAt };
      return { kind: 'locked' };
    }
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', payload: (await res.json()) as CoursePayload };
  } catch {
    return { kind: 'signed-out' };
  }
}

export const COURSE_KEY = ['learn', 'course'] as const;

/**
 * The course (the shell suspends until it has answered the first time).
 *
 * D-183: it stays as fresh as the snapshot. When the server says something changed (the event stream's
 * `changed`, which already refetches the snapshot), the course is refetched too, so a session's new time,
 * a week staff publish, a kit upload or a replay shows without a reload. And when a locked week's opening
 * (or, before the preview, the course's; in it, the preview's end) passes while the tab is open, it is
 * refetched then, so the week opens on screen. A refetch keeps the page on screen while it runs.
 */
export function useCourse(opensAt: number = COURSE_OPENS_AT): CourseLoad {
  const qc = useQueryClient();
  const load = useSuspenseQuery({ queryKey: COURSE_KEY, queryFn: fetchCourse, staleTime: Infinity }).data;
  useEffect(() => repo.subscribe(() => void qc.invalidateQueries({ queryKey: COURSE_KEY }, { cancelRefetch: false })), [qc]);
  const at = nextOpening(load, clock.now(), opensAt);
  useEffect(() => {
    if (at === null) return;
    const id = setTimeout(() => void qc.invalidateQueries({ queryKey: COURSE_KEY }), Math.min(MAX_WAIT, Math.max(0, at - clock.now()) + 1000));
    return () => clearTimeout(id);
  }, [at, qc]);
  return load;
}

/** setTimeout's ceiling (about 24.8 days); a later opening is waited for in steps. */
const MAX_WAIT = 2_147_483_647;

/**
 * The next instant a locked week opens, or (D-249) the pre-launch preview ends, after `now`, or null. The
 * preview ends at the course's own opening, the first live build (`COURSE_OPENS_AT`), which Week 1's
 * opening no longer marks now that Week 1 opens inside the preview. R-5 Phase 4 (D-260): `opensAt` is the
 * viewer's own cohort's opening (`courseOpensAtFor`); absent, December's.
 */
export function nextOpening(load: CourseLoad, now: number, opensAt: number = COURSE_OPENS_AT): number | null {
  if (load.kind !== 'ready') return load.kind === 'upcoming' && load.opensAt > now ? load.opensAt : null;
  const at = [...load.payload.course.weeks.map((w) => (isLockedWeek(w) ? w.opensAt : null)), load.payload.prelaunch && Number.isFinite(opensAt) ? opensAt : null]
    .filter((t): t is number => t !== null && t > now)
    .sort((a, b) => a - b)[0];
  return at ?? null;
}

/** What the shell hands every learner screen. */
export interface LearnContext {
  course: CourseLoad;
  db: Db;
  viewer: Viewer;
  now: number;
  /**
   * R-5 Phase 4 (D-260): the cohort a preview draws, for a viewer with no learner row (the curriculum builder's live
   * preview, D-184). A learner's screens read their own cohort and never this.
   */
  previewCohortId?: string;
}

/**
 * D-184: what a learner screen reads when it is drawn outside the shell: the curriculum builder's live
 * preview hands the week page and the step player the unsaved draft's course this way, so it previews
 * exactly what a learner sees. Inside the shell nothing provides it and the outlet's context answers.
 */
const LearnOverride = createContext<LearnContext | null>(null);
export const LearnProvider = LearnOverride.Provider;

export function useLearn(): LearnContext {
  const override = useContext(LearnOverride);
  const outlet = useOutletContext<LearnContext>();
  return override ?? outlet;
}
