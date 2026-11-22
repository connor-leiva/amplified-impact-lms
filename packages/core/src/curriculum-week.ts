// Which curriculum week a session belongs to, and when the course opens.
//
// The admin used to count seven-day buckets from the cohort's start (Session 1). That calls the
// Wednesday after the holiday break Week 6, because Dec 23 and Dec 30 have no session but still
// count as weeks. A session's week is the curriculum week's: the week whose live session it is
// (`module.session` is that session's `n`), or, when it is not one, the latest week whose Opens
// date is on or before the session's date. Week 0 is self-paced ("Open now") and is neither.
//
// Dates are the calendar day in MST (America/Phoenix, UTC−7), the same day the admin prints.
// A session on the morning a week opens still belongs to that week.

/** A curriculum week, as far as week numbers and open times need to see it. */
export interface CurriculumWeekRef {
  /** The course week. 0 is the self-paced week. */
  week: number;
  /** The live session's `n`, or null when the week has none. */
  session: number | null;
  /** When the week opens, or null when it is open now or has no date. */
  opens: number | null;
}

/** What `curriculumWeeks` reads off a module. An `AIEmployee` is one. */
export interface CurriculumWeekSource {
  kind?: string;
  status: string;
  session: number | null;
  opens: number | null;
  course?: { week: number } | null;
}

/** `YYYY-MM-DD` in MST. Phoenix is UTC−7 all year, so the shift is exact. */
const mstDay = (t: number): string => new Date(t - 7 * 3600_000).toISOString().slice(0, 10);

/**
 * The course's weeks, drafts left out (a draft is not on the course), in week order.
 */
export function curriculumWeeks(modules: readonly CurriculumWeekSource[]): CurriculumWeekRef[] {
  return modules
    .filter((m): m is CurriculumWeekSource & { course: { week: number } } => m.kind === 'week' && !!m.course && m.status !== 'draft')
    .map((m) => ({ week: m.course.week, session: m.session, opens: m.opens }))
    .sort((a, b) => a.week - b.week);
}

/** The latest dated week (past Week 0) whose Opens day is on or before `day`, or null. */
function latestOpen(weeks: readonly CurriculumWeekRef[], day: string): CurriculumWeekRef | null {
  let best: CurriculumWeekRef | null = null;
  let bestDay = '';
  for (const w of weeks) {
    if (w.week <= 0 || w.opens == null) continue;
    const d = mstDay(w.opens);
    if (d > day) continue;
    if (d > bestDay || (d === bestDay && best != null && w.week > best.week)) {
      best = w;
      bestDay = d;
    }
  }
  return best;
}

/**
 * The curriculum week a session belongs to, or null when none does.
 *
 * The week whose live session it is comes first, so a build keeps its week even when it sits in a
 * gap. Anything else (an office hour, a session added later) takes the latest week already open on
 * its date. Week 0 never matches.
 */
export function sessionCurriculumWeek(
  weeks: readonly CurriculumWeekRef[],
  session: { n: number; start: number },
): number | null {
  const live = weeks.filter((w) => w.week > 0 && w.session != null && w.session === session.n);
  if (live.length) return live.reduce((a, b) => (a.week < b.week ? a : b)).week;
  return latestOpen(weeks, mstDay(session.start))?.week ?? null;
}

/**
 * The course week underway at `now`: the latest week whose Opens day has arrived. 0 before the
 * first dated week opens. Week 0 does not count.
 */
export function curriculumWeekAt(weeks: readonly CurriculumWeekRef[], now: number): number {
  return latestOpen(weeks, mstDay(now))?.week ?? 0;
}

/**
 * When the course opens: the earliest Opens time of a dated week, Week 0 excluded (it is "Open
 * now"). Null when no week has an Opens time, and the caller keeps the cohort's own start.
 */
export function courseOpensAt(weeks: readonly CurriculumWeekRef[]): number | null {
  let at: number | null = null;
  for (const w of weeks) {
    if (w.week <= 0 || w.opens == null) continue;
    if (at == null || w.opens < at) at = w.opens;
  }
  return at;
}
