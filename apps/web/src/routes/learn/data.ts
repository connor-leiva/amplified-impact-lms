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

import { createContext, useContext } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
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

/** The course, once per page load (the shell suspends until it has answered). */
export function useCourse(): CourseLoad {
  return useSuspenseQuery({ queryKey: COURSE_KEY, queryFn: fetchCourse, staleTime: Infinity }).data;
}

/** What the shell hands every learner screen. */
export interface LearnContext {
  course: CourseLoad;
  db: Db;
  viewer: Viewer;
  now: number;
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
