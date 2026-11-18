// The course page's content, put back together from the database (D-173).
//
// The words are data. A module of kind `week` holds its week in `course`; the cohort holds what every
// week shares in its own `course`. This file only reassembles them into the `CourseContent` shape
// `GET /api/course` has always sent, so the course page renders exactly as before. No words here.

import { ACCELERATOR_COHORT_ID, isAcceleratorModule } from './accelerator';
import type { CourseContent, CourseWeek, ModuleCourse } from './course-types';
import { moduleForSession, sessionKind, sessionWeek } from './sessions';
import type { SessionKind } from './sessions';
import type { AIEmployee, Db } from './types';

/** A module that carries a course week. */
export type WeekModule = AIEmployee & { kind: 'week'; course: ModuleCourse };

export const isWeekModule = (m: AIEmployee): m is WeekModule => m.kind === 'week' && m.course !== undefined;

/** The course's week modules, in week order. Drafts are left out: a draft week isn't on the course. */
export function courseWeekModules(db: Pick<Db, 'modules'>): WeekModule[] {
  return db.modules
    .filter(isWeekModule)
    .filter((m) => isAcceleratorModule(m.id) && m.status !== 'draft')
    .sort((a, b) => a.course.week - b.course.week);
}

/** One week as the course page renders it: the module's words, plus the portal fields the page shows. */
export function courseWeekOf(m: WeekModule): CourseWeek {
  const { promise: _p, flagship: _f, tools: _t, seatCard: _s, playbookCard: _pb, sampleOutput: _so, lockedCopy: _l, statusLabels: _sl, ...week } = m.course;
  return {
    ...week,
    module: {
      icon: m.icon,
      platform: m.platform,
      runLabel: m.runLabel,
      outcome: m.outcome,
      outputs: [m.outputs[0] ?? '', m.outputs[1] ?? '', m.outputs[2] ?? ''],
      checklist: m.checklist.map(({ id: _id, ...step }) => step),
    },
  };
}

/** The whole course, from a snapshot, or null when the cohort holds none (the seed hasn't run). */
export function courseFromSnapshot(db: Pick<Db, 'cohorts' | 'modules'>, cohortId: string = ACCELERATOR_COHORT_ID): CourseContent | null {
  const cohort = db.cohorts.find((c) => c.id === cohortId);
  if (!cohort?.course) return null;
  return { ...cohort.course, weeks: courseWeekModules(db).map(courseWeekOf) };
}

/** One session as `GET /api/course` sends it. Never a Zoom URL: only the join route hands that out. */
export interface CourseSessionRow {
  id: string;
  n: number;
  kind: SessionKind;
  week: number;
  title: string;
  start: number;
  mins: number;
}

/**
 * The course's sessions, by start: the cohort's sessions that belong to one of the course's weeks.
 * `GET /api/course` sends these, and the builder's live preview (D-174) renders them from the draft.
 */
export function courseSessions(db: Db, cohortId: string = ACCELERATOR_COHORT_ID): CourseSessionRow[] {
  return db.sessions
    .filter((s) => s.cohortId === cohortId)
    .filter((s) => {
      const m = moduleForSession(db, s);
      return !!m && isAcceleratorModule(m.id);
    })
    .sort((a, b) => a.start - b.start)
    .map((s) => ({ id: s.id, n: s.n, kind: sessionKind(s), week: sessionWeek(s), title: s.title, start: s.start, mins: s.mins }));
}
