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

import { useEffect } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { isLockedWeek } from '@ai/core/course';
import { repo } from '../../data/boot';
import { clock } from '../../lib/clock';
import { useOutletContext } from 'react-router';
import type { Db } from '@ai/core';
import type { CoursePayload } from '../course/Course.vm';
import type { Viewer } from '../../data/repository';

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
  try {
    const res = await fetch('/api/course', { credentials: 'include', headers: { accept: 'application/json' } });
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
 * (or, before the preview, the course's) passes while the tab is open, it is refetched then, so the week
 * opens on screen. A refetch keeps the page on screen while it runs.
 */
export function useCourse(): CourseLoad {
  const qc = useQueryClient();
  const load = useSuspenseQuery({ queryKey: COURSE_KEY, queryFn: fetchCourse, staleTime: Infinity }).data;
  useEffect(() => repo.subscribe(() => void qc.invalidateQueries({ queryKey: COURSE_KEY })), [qc]);
  const at = nextOpening(load, clock.now());
  useEffect(() => {
    if (at === null) return;
    const id = setTimeout(() => void qc.invalidateQueries({ queryKey: COURSE_KEY }), Math.min(MAX_WAIT, Math.max(0, at - clock.now()) + 1000));
    return () => clearTimeout(id);
  }, [at, qc]);
  return load;
}

/** setTimeout's ceiling (about 24.8 days); a later opening is waited for in steps. */
const MAX_WAIT = 2_147_483_647;

/** The next instant a locked week opens, after `now`, or null. */
export function nextOpening(load: CourseLoad, now: number): number | null {
  if (load.kind !== 'ready') return load.kind === 'upcoming' && load.opensAt > now ? load.opensAt : null;
  const at = load.payload.course.weeks
    .map((w) => (isLockedWeek(w) ? w.opensAt : null))
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
}

export const useLearn = (): LearnContext => useOutletContext<LearnContext>();
