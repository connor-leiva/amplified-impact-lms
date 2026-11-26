// What the cohort welcome (`welcome.ts`) and the Week 0 Is Open email (`week0-open.ts`) share, one copy of each:
//
//   - `upsertCohortEnrollments`: one `cohort_enrollments` row per (team owner, cohort) with a cohort plan that has not
//     ended, timed by the owner's EARLIEST cohort plan for that cohort, ended ones included. The welcome's insert,
//     moved here unchanged.
//   - `recordSwitchOn`: a flag row that is on without a switch-on time takes its last flip's time, once.
//   - `readWeeks` / `weeksOf` / `sessionOf`: the course's weeks and sessions as `welcomeSchedule` and `welcomeWeek0`
//     read them, Week 0's Due, title, step count, baseline count and whether its "How the LMS Works" tour is live.
//     R-5 Phase 4 (D-260, PLAN.md 2.10): one cohort's weeks, through its run (`cohortView`), so January's welcome and
//     Week 0 Is Open read January's Week 0 due date and Week 1 sessions. A cohort with no stored run (December until
//     Phase 3 writes its run) reads the modules exactly as before.

import { and, eq, sql } from 'drizzle-orm';
import { baselineTaskCount, cohortView } from '@ai/core';
import type { AIEmployee, Cohort, Session, WelcomeSchedule, WelcomeSession, WelcomeWeek, WelcomeWeek0 } from '@ai/core';
import type { EmailPayload } from '../email/templates/payload';
import type { MediaItem, StepPaths } from '@ai/core/course-types';
import { tourVideoOf } from '@ai/core/lms-tour';
import type { Database } from '../db/client';
import { cohortEnrollments, cohorts, consoleFlags, modules, sessions } from '../db/schema';

/** Insert an enrollment row for every owner with a live cohort plan. A row already there is left as it is. */
export async function upsertCohortEnrollments(db: Database): Promise<void> {
  // One row per (owner, cohort) with a plan that has not ended. Its time is the owner's EARLIEST cohort plan for that
  // cohort, ended ones included: someone enrolled before a switch who ends and buys again after it still enrolled
  // before it.
  await db.execute(sql`
    insert into ${cohortEnrollments} (user_id, cohort_id, account_id, enrolled_at)
    select distinct on (a.owner_user_id, p.cohort_id) a.owner_user_id, p.cohort_id, a.id,
           (select min(p2.created_at)
              from plans p2
              join accounts a2 on a2.id = p2.account_id
             where p2.kind = 'cohort' and p2.cohort_id = p.cohort_id and a2.owner_user_id = a.owner_user_id)
      from plans p
      join accounts a on a.id = p.account_id
     where p.kind = 'cohort' and p.cohort_id is not null and p.status <> 'ended'
     order by a.owner_user_id, p.cohort_id, p.created_at
    on conflict (user_id, cohort_id) do nothing
  `);
}

/**
 * Record the switch-on time on a flag row that is on without one (written by hand), and return it. A flip always stamps
 * it; this keeps the time fixed from then on, so no enrollment's side of the rule ever moves.
 */
export async function recordSwitchOn(db: Database, key: string, at: number): Promise<number> {
  const [row] = await db
    .update(consoleFlags)
    .set({ turnedOnAt: sql`coalesce(${consoleFlags.turnedOnAt}, ${at})` })
    .where(and(eq(consoleFlags.key, key), eq(consoleFlags.on, true)))
    .returning({ turnedOnAt: consoleFlags.turnedOnAt });
  return row?.turnedOnAt ?? at;
}

interface ModuleRow {
  status: string;
  opens: number | null;
  dueAt?: number | null;
  checklist?: unknown;
  course: unknown;
}

type CourseWords = {
  week?: number;
  title?: string;
  media?: MediaItem[];
  liveBuild?: { sessionId?: string } | null;
  officeHours?: { sessionId?: string } | null;
};

/** The modules as weeks: each one's week, opening, status, sessions, and (for Week 0's copy) Due, title and steps. */
export function weeksOf(rows: readonly ModuleRow[]): WelcomeWeek[] {
  return rows.map((m) => {
    const course = m.course && typeof m.course === 'object' ? (m.course as CourseWords) : null;
    const checklist = Array.isArray(m.checklist) ? (m.checklist as { ch?: string; paths?: StepPaths }[]) : null;
    return {
      week: typeof course?.week === 'number' ? course.week : null,
      opens: m.opens,
      status: m.status,
      liveSessionId: course?.liveBuild?.sessionId ?? null,
      officeSessionId: course?.officeHours?.sessionId ?? null,
      dueAt: m.dueAt ?? null,
      title: typeof course?.title === 'string' ? course.title : null,
      steps: checklist ? checklist.length : null,
      baselineTasks: baselineTaskCount(checklist),
      // D-252: the tour as the LMS finds it (Week 0's Media, flagged, uploaded, with a transcript).
      tour: typeof course?.week === 'number' && tourVideoOf({ weeks: [{ week: course.week, media: Array.isArray(course.media) ? course.media : [] }] }) !== null,
    };
  });
}

/**
 * Every module, as `weeksOf` reads it, seen through one cohort's run (R-5 Phase 4, D-260): its weeks numbered, dated
 * and paired with its own sessions as `cohortView` has them, and the weeks it doesn't take left out. A cohort with no
 * stored run reads the modules as they are, exactly as before.
 */
export async function readWeeks(db: Pick<Database, 'select'>, cohortId: string): Promise<WelcomeWeek[]> {
  const rows = await db
    .select({
      id: modules.id,
      kind: modules.kind,
      status: modules.status,
      opens: modules.opens,
      dueAt: modules.dueAt,
      session: modules.session,
      checklist: modules.checklist,
      course: modules.course,
    })
    .from(modules);
  const [cohort] = await db.select({ id: cohorts.id, run: cohorts.run }).from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
  if (!cohort?.run) return weeksOf(rows);
  const own = await db
    .select({ id: sessions.id, cohortId: sessions.cohortId, n: sessions.n, start: sessions.start, kind: sessions.kind, moduleId: sessions.moduleId })
    .from(sessions)
    .where(eq(sessions.cohortId, cohortId));
  // `cohortView` reads a module's id, kind, status, opens, due date, session and course, and a session's cohort,
  // module, kind and start: the columns read above. The casts only say so.
  const view = cohortView(
    {
      cohorts: [{ id: cohort.id, run: cohort.run } as unknown as Cohort],
      modules: rows as unknown as AIEmployee[],
      sessions: own.map((x) => ({ ...x, kind: x.kind ?? undefined, moduleId: x.moduleId ?? undefined })) as unknown as Session[],
    },
    cohortId,
  );
  return weeksOf(view.modules as unknown as ModuleRow[]);
}

export function sessionOf(s: { id: string; n: number; start: number; mins: number; kind: string | null }): WelcomeSession {
  return { id: s.id, n: s.n, start: s.start, mins: s.mins, kind: s.kind };
}

/**
 * The cohort welcome's payload, for the job and the Console test send alike: the cohort (the subject and the copy name
 * it), the first live build from the schedule, Week 0's facts, the reader's first name and any set-password link.
 */
export function welcomeEmailData(
  cohortName: string,
  schedule: WelcomeSchedule,
  week0: WelcomeWeek0,
  firstName: string,
  setPasswordUrl: string | null,
): EmailPayload<'cohort-welcome'> {
  return {
    cohortName,
    firstName,
    week0DueAt: week0.dueAt,
    week0Title: week0.title,
    week0Steps: week0.steps,
    baselineTasks: week0.baselineTasks,
    tour: week0.tour,
    liveBuildAt: schedule.session1At,
    liveBuildMins: schedule.session1Mins,
    setPasswordUrl,
  };
}
