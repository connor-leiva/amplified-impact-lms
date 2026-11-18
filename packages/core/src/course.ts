// The course page's content, put back together from the database (D-173).
//
// The words are data. A module of kind `week` holds its week in `course`; the cohort holds what every
// week shares in its own `course`. This file only reassembles them into the `CourseContent` shape
// `GET /api/course` has always sent, so the course page renders exactly as before. No words here.

import { ACCELERATOR_COHORT_ID, isAcceleratorModule } from './accelerator';
import type { CohortCourse, CourseContent, CourseWeek, LockedCopy, ModuleCourse } from './course-types';
import { kitVisible, weekOpenFor } from './release';
import type { CourseEntry } from './release';
import { moduleForSession, sessionKind, sessionWeek } from './sessions';
import type { SessionKind } from './sessions';
import type { AIEmployee, Db, ResourceKind, ResourcePlatform, Session, SessionType } from './types';

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

// --- what a learner gets (D-175): open weeks whole, locked weeks as the outline shows them --------

/** A week a learner can't open yet: its place in the outline and when it opens. None of its content. */
export interface LockedCourseWeek {
  week: number;
  title: string;
  question: string;
  outcome: string;
  /** When it opens (a scheduled week's Opens), or null when no date is set. */
  opensAt: number | null;
  /** What the builder says a locked week says (its `{date}` filled by the page), when it says anything. */
  lockedCopy?: LockedCopy;
  locked: true;
}

/** A kit item of an open week, as the course lists it. Downloaded through the gated files route, never a link here. */
export interface CourseKitItem {
  id: string;
  title: string;
  kind: ResourceKind | null;
  platform: ResourcePlatform | null;
  stepId: string | null;
}

/** An open week, with its kit when it has one. */
export type OpenCourseWeek = CourseWeek & { kit?: CourseKitItem[] };
export type LearnerCourseWeek = OpenCourseWeek | LockedCourseWeek;

/** The course as one viewer may see it: what every week shares, then each week open or locked. */
export interface LearnerCourse extends CohortCourse {
  weeks: LearnerCourseWeek[];
}

export const isLockedWeek = (w: LearnerCourseWeek): w is LockedCourseWeek => (w as LockedCourseWeek).locked === true;

const lockedWeekOf = (m: WeekModule): LockedCourseWeek => ({
  week: m.course.week,
  title: m.course.title,
  question: m.course.question,
  outcome: m.outcome,
  opensAt: m.status === 'scheduled' ? m.opens : null,
  ...(m.course.lockedCopy ? { lockedCopy: m.course.lockedCopy } : {}),
  locked: true,
});

/**
 * The course for one viewer, or null when the database holds none. Staff (`'staff'`) see every week
 * whole, as the builder's preview does. A learner sees each week open or locked by their entry and the
 * week's own opening (`weekOpenFor`), and an open week's kit by its visibility (`kitVisible`). Locked
 * weeks carry no content; the response itself is the gate.
 */
export function courseFor(db: Pick<Db, 'cohorts' | 'modules' | 'resources'>, now: number, viewer: CourseEntry | 'staff', cohortId: string = ACCELERATOR_COHORT_ID): LearnerCourse | null {
  const cohort = db.cohorts.find((c) => c.id === cohortId);
  if (!cohort?.course) return null;
  const staff = viewer === 'staff';
  const weeks = courseWeekModules(db).map((m): LearnerCourseWeek => {
    const open = staff || weekOpenFor(m, now, viewer);
    if (!open) return lockedWeekOf(m);
    const kit = db.resources
      .filter((r) => r.module === m.id && r.status === 'published' && (staff || kitVisible(r, true, viewer.preview)))
      .map((r): CourseKitItem => ({ id: r.id, title: r.title, kind: r.kind ?? null, platform: r.platform ?? null, stepId: r.stepId ?? null }));
    const week = courseWeekOf(m);
    return kit.length ? { ...week, kit } : week;
  });
  return { ...cohort.course, weeks };
}

/** One session as `GET /api/course` sends it. Never a Zoom URL: only the join route hands that out. */
export interface CourseSessionRow {
  id: string;
  n: number;
  kind: SessionKind;
  /**
   * D-180: the builder's type for the session (live build, office hours, goal planning, setup or other),
   * or, for a row from before the builder set one, live build or office hours off its id.
   */
  type: SessionType;
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
    .map((s) => ({ id: s.id, n: s.n, kind: sessionKind(s), type: sessionType(s), week: sessionWeek(s), title: s.title, start: s.start, mins: s.mins }));
}

/** D-180: a session's type, as the builder set it, else live build or office hours off its id. */
export function sessionType(s: Pick<Session, 'id' | 'kind'>): SessionType {
  return s.kind ?? (sessionKind(s) === 'build' ? 'live_build' : 'office_hours');
}
