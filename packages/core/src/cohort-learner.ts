// R-5 Phase 4 (D-260): the learner side reads its own cohort (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md Phase 4,
// PLAN.md § 10.4).
//
// Phase 2 (D-254) gave each cohort its run and routed the course, the snapshot and the learner's writes through the
// viewer's cohort. This file holds what the rest of the learner side needs to read the viewer's cohort instead of
// December: which module is a cohort's week N (`weekModuleId`, `weekOfModuleIn`); the course's words, the program's
// with the cohort's own promise, how it works and holiday note (`cohortCourseCopy`), and the one token they may carry
// (`{first live build}`); the Week 0 Is Open subject's cohort (`week0CohortLabel`); GoHighLevel's Cohort field
// (`ghlCohortValue`); the weekly digest's day (`nextMeetingDay`); and whose a session's announcement is
// (`announcementInCohort`).
//
// DECEMBER IS UNCHANGED BY CONSTRUCTION, with or without a stored run. Each function either reads what December
// reads today (its module ids, its own row's words, its id as GoHighLevel's value, the subject's own line) or reads
// December's run, which Phase 3's data step writes from December's own modules (`opens`, `due_at`, `course.week`), so
// it answers the same either way. `test/cohort-learner.test.ts` builds that run and proves it.
//
// Pure: no clock, no random source.

import { ACCELERATOR_WEEKS, DEFAULT_COHORT_ID, acceleratorModuleId, cohortOpensAt } from './accelerator';
import { COURSE_TZ } from './course-actions';
import { SCHEDULE_ICS_PATH } from './schedule';
import type { CohortCourse } from './course-types';
import type { Announcement, Cohort, Db, Session } from './types';

// ================================================================================================
// A week's number in a cohort, and its module
// ================================================================================================

/**
 * The module a cohort takes as its week `n`: its run's, or, for a cohort with no stored run (December until Phase 3
 * writes its run, and every cohort before R-5), the curriculum's `accelerator-week-N`, as today. Null when the run has
 * no week `n`. December's run is built from its modules' own week numbers, so it answers the same either way.
 */
export function weekModuleId(cohort: Pick<Cohort, 'run'> | null | undefined, n: number): string | null {
  if (cohort?.run) return cohort.run.find((w) => w.n === n)?.moduleId ?? null;
  return acceleratorModuleId(n);
}

/**
 * A module's week number in a cohort: its run's `n`, or, with no stored run, the number in its id
 * (`accelerator-week-3` is Week 3), as today. Null for a module the cohort doesn't take, or no course week at all.
 */
export function weekOfModuleIn(cohort: Pick<Cohort, 'run'> | null | undefined, moduleId: string): number | null {
  if (cohort?.run) return cohort.run.find((w) => w.moduleId === moduleId)?.n ?? null;
  return ACCELERATOR_WEEKS.find((w) => acceleratorModuleId(w) === moduleId) ?? null;
}

// ================================================================================================
// The course's words: the program's, with the cohort's own promise, how it works and holiday note
// ================================================================================================

/** The one token the program's shared words may carry (the mockup's Course settings › Before Week 1). */
export const FIRST_LIVE_BUILD_TOKEN = '{first live build}';

/** What the token reads when the cohort has no session at all: the mockup's own words (`firstBuildOf`). */
export const FIRST_LIVE_BUILD_NONE = 'the first session';

/**
 * The program's shared words. Until the program record arrives (Phase 6), they are the `course` stored on the default
 * cohort's row (December's), which is where every word the course shares lives today (the spec's § 2 table: "the rest
 * of `cohorts.course` on the `dec26` row"). Null while the database holds no course (the seed hasn't run).
 */
export const programCourse = (db: Pick<Db, 'cohorts'>): CohortCourse | null =>
  db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)?.course ?? null;

/** The words only this cohort's learners read (spec § 2): its promise, how it works and its holiday note. */
type OwnWords = Partial<Pick<CohortCourse['intro'], 'sub' | 'how' | 'holiday'>>;

/**
 * The course's words for one cohort, as `GET /api/course` sends them, or null while there are none (no program words,
 * or no such cohort). `intro.sub`, `intro.how` and `intro.holiday` are the cohort's own, read from its row's `course`
 * when it stores them; everything else is the program's shared words (`programCourse`). A cohort that stores no words
 * of its own reads the program's for those three too, as Connor's amendment drafts a new cohort's words (PLAN § 10.3:
 * "start as December's words"). Then `{first live build}` is filled from the cohort (`fillFirstLiveBuild`).
 *
 * December's is December's own row, unchanged: the very same object while no word carries the token.
 */
export function cohortCourseCopy(db: Pick<Db, 'cohorts'> & Partial<Pick<Db, 'sessions'>>, cohortId: string): CohortCourse | null {
  const program = programCourse(db);
  const cohort = db.cohorts.find((c) => c.id === cohortId);
  if (!program || !cohort) return null;
  const words = cohort.id === DEFAULT_COHORT_ID ? program : withOwnWords(program, cohort.course?.intro);
  return fillFirstLiveBuild(words, () => firstLiveBuildDay(cohort, db.sessions ?? []));
}

/** The program's words with a cohort's own three in their places. None stored: the program's, the same object. */
function withOwnWords(program: CohortCourse, own: OwnWords | undefined): CohortCourse {
  if (!own) return program;
  return {
    ...program,
    intro: {
      ...program.intro,
      sub: typeof own.sub === 'string' ? own.sub : program.intro.sub,
      how: Array.isArray(own.how) ? own.how : program.intro.how,
      holiday: typeof own.holiday === 'string' ? own.holiday : program.intro.holiday,
    },
  };
}

/**
 * The day of a cohort's first live build, as the mockup writes `{first live build}` ("Wed, Dec 2"), in the cohort's
 * zone: when its course opens (`cohortOpensAt`: December's is D-153's instant, another cohort's its first session of
 * kind `live_build`), else its first session, else "the first session".
 */
export function firstLiveBuildDay(cohort: Pick<Cohort, 'id' | 'timezone'>, sessions: readonly Pick<Session, 'cohortId' | 'start' | 'kind'>[]): string {
  const opens = cohortOpensAt(cohort.id, sessions);
  const first = Number.isFinite(opens)
    ? opens
    : sessions.filter((s) => s.cohortId === cohort.id).reduce<number | null>((t, s) => (t === null || s.start < t ? s.start : t), null);
  if (first === null) return FIRST_LIVE_BUILD_NONE;
  return new Intl.DateTimeFormat('en-US', { timeZone: cohort.timezone ?? COURSE_TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(first);
}

/**
 * Every string in the words with `{first live build}` filled in. The day is worked out only when a word carries the
 * token; with none, the very same object comes back.
 */
export function fillFirstLiveBuild<T>(words: T, day: () => string): T {
  if (!JSON.stringify(words).includes(FIRST_LIVE_BUILD_TOKEN)) return words;
  const value = day();
  const fill = (v: unknown): unknown => {
    if (typeof v === 'string') return v.split(FIRST_LIVE_BUILD_TOKEN).join(value);
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  return fill(words) as T;
}

// ================================================================================================
// What emails and GoHighLevel call a cohort
// ================================================================================================

/** Connor's approved Week 0 Is Open line names December this way (`email/subjects.ts`). */
export const DEFAULT_WEEK0_LABEL = 'December Cohort';

/** A name with the noun "Cohort", once ("January 2027" is "January 2027 Cohort"). */
const withNoun = (s: string): string => (!s ? 'Cohort' : /\bcohort$/i.test(s) ? s : `${s} Cohort`);

/** A cohort's own name, without the program's name before a " · " ("Amplified AI Accelerator · December 2026"). */
const ownName = (name: string): string => (name.split(' · ').pop() ?? name).replace(/\s+/g, ' ').trim();

/**
 * The cohort as the Week 0 Is Open email's body names it: its own name with its noun ("December 2026 Cohort", as
 * Connor's approved copy says it for December; "January 2027 Cohort").
 */
export const week0CohortName = (name: string): string => withNoun(ownName(name));

/**
 * The cohort as the Week 0 Is Open subject names it: its own name without its year ("Amplified AI Accelerator ·
 * December 2026" is "December Cohort", "January 2027 Cohort" is "January Cohort"). PLAN § 10.4: the line reads badly
 * with the year in it.
 */
export const week0CohortLabel = (name: string): string =>
  withNoun(
    ownName(name)
      .replace(/\b(19|20)\d{2}\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const MONTH_TAG = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * What GoHighLevel's Cohort custom field holds for a plan's cohort (PLAN § 10.4, Q-33). December's is its id,
 * `dec26`, the value it has always sent, so nothing in GoHighLevel moves. Another cohort's id is drawn at random
 * (`c_…`), so it sends its start's month and two-digit year in its own zone: "jan27" for Connor's January. A plan with
 * no cohort, or one the database no longer holds, sends December's, as every Accelerator order did before.
 */
export function ghlCohortValue(cohort: Pick<Cohort, 'id' | 'start' | 'timezone'> | null | undefined): string {
  if (!cohort || cohort.id === DEFAULT_COHORT_ID) return DEFAULT_COHORT_ID;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: cohort.timezone ?? COURSE_TZ, month: 'numeric', year: '2-digit' }).formatToParts(cohort.start);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '0');
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${MONTH_TAG[month - 1] ?? ''}${year}`;
}

// ================================================================================================
// The weekly digest's day, and a session's announcement
// ================================================================================================

/**
 * The weekday a cohort's next meeting is on, in its zone ("Tuesday"), for the weekly digest's "what to review before
 * …": its next live build, else its next session of any kind, else null (it meets no more: the digest names no day).
 * For a cohort laid out from a shape (R-5); December keeps D-110's own rule in `jobs/due.ts`.
 */
export function nextMeetingDay(
  cohort: Pick<Cohort, 'id' | 'timezone'>,
  sessions: readonly Pick<Session, 'cohortId' | 'start' | 'kind'>[],
  now: number,
): string | null {
  const ahead = sessions.filter((s) => s.cohortId === cohort.id && s.start > now).sort((a, b) => a.start - b.start);
  const next = ahead.find((s) => s.kind === 'live_build') ?? ahead[0];
  return next ? new Intl.DateTimeFormat('en-US', { timeZone: cohort.timezone ?? COURSE_TZ, weekday: 'long' }).format(next.start) : null;
}

/**
 * Whether an announcement is this cohort's: one about a session belongs to that session's cohort; any other (and one
 * whose session is gone) is the program's, for everyone its audience names, as today. Every announcement December's
 * learners read is about one of December's sessions or none, so none of theirs moves.
 */
export function announcementInCohort(
  a: Pick<Announcement, 'sessionId'>,
  sessions: readonly Pick<Session, 'id' | 'cohortId'>[],
  cohortId: string,
): boolean {
  if (!a.sessionId) return true;
  const s = sessions.find((x) => x.id === a.sessionId);
  return !s || s.cohortId === cohortId;
}

// ================================================================================================
// The learner Schedule's "Add all to calendar"
// ================================================================================================

/**
 * The address of a learner's whole schedule as one calendar file: December's is the welcome page's own file, as
 * before (`/calendar/schedule.ics`); another cohort's names it (`?cohort=`), and the API hands it only to that cohort's
 * learners.
 */
export const scheduleIcsPath = (cohortId: string | null | undefined): string =>
  !cohortId || cohortId === DEFAULT_COHORT_ID ? SCHEDULE_ICS_PATH : `${SCHEDULE_ICS_PATH}?cohort=${encodeURIComponent(cohortId)}`;
