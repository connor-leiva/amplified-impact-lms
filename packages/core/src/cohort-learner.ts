// R-5 Phase 4 (D-261): the learner side reads its own cohort (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md Phase 4,
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

import { ACCELERATOR_WEEKS, DEFAULT_COHORT_ID, acceleratorModuleId, cohortOpensAt, isCourseWeek } from './accelerator';
import { COURSE_TZ } from './course-actions';
import { SCHEDULE_ICS_PATH } from './schedule';
import type { CohortCourse } from './course-types';
import { programCourse } from './program';
import type { AIEmployee, Announcement, Cohort, Db, Session } from './types';

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
  return curriculumWeekOf(moduleId);
}

/** A course week's number in the curriculum, by its id (`accelerator-week-3` is 3), or null for no course week. */
const curriculumWeekOf = (moduleId: string): number | null =>
  ACCELERATOR_WEEKS.find((w) => acceleratorModuleId(w) === moduleId) ?? null;

// ------------------------------------------------------------------------------------------------
// The same, in the browser: from the learner's own snapshot and course, without the run
// ------------------------------------------------------------------------------------------------
//
// A learner's snapshot leaves the run out (`cohortForLearner`, D-255), so December's snapshot reads as it did before its
// run was stored. It needs none: the snapshot's course-week modules ARE the viewer's cohort's view (D-254: the weeks
// it takes and no others), and a run keeps the curriculum's order (`layOut` and `saveCohortShape` number the picked
// weeks 1 to N in that order, after the setup week's 0; `saveCohortRun` moves dates, never order). So the k-th week
// `GET /api/course` lists is the k-th course-week module of the snapshot.

/** The snapshot's course-week modules (the viewer's cohort's weeks), in the curriculum's order. */
export function viewWeekIds(modules: readonly Pick<AIEmployee, 'id' | 'status'>[]): string[] {
  return modules
    .filter((m) => isCourseWeek(m.id) && m.status !== 'draft')
    .map((m) => m.id)
    .sort((a, b) => (curriculumWeekOf(a) ?? 0) - (curriculumWeekOf(b) ?? 0));
}

/**
 * Each week of the viewer's course (its numbers, as `GET /api/course` sends them) paired with its module, by their
 * order: the k-th week is the k-th of `viewWeekIds`. Null when the two lists don't line up (a snapshot without the
 * course's modules, as the prototype's fixture is); the caller then reads the curriculum's ids, as before R-5.
 */
export function viewWeekModules(weeks: readonly number[], modules: readonly Pick<AIEmployee, 'id' | 'status'>[]): Map<number, string> | null {
  const ids = viewWeekIds(modules);
  if (ids.length !== weeks.length) return null;
  const sorted = [...weeks].sort((a, b) => a - b);
  return new Map(sorted.map((n, k) => [n, ids[k]!]));
}

/**
 * A module's week number in the viewer's cohort, from the snapshot alone (an old `/employees/:id` address, before the
 * course has loaded): its place among `viewWeekIds`, numbered from 0 when the cohort takes the setup week (the
 * curriculum's Week 0) and from 1 when it doesn't, as a run numbers them. Null for a week the cohort doesn't take. A
 * snapshot that holds no course week at all (the prototype's fixture) reads the curriculum's number, as before.
 */
export function viewWeekOf(modules: readonly Pick<AIEmployee, 'id' | 'status'>[], moduleId: string): number | null {
  const ids = viewWeekIds(modules);
  if (!ids.length) return curriculumWeekOf(moduleId);
  const k = ids.indexOf(moduleId);
  if (k < 0) return null;
  return curriculumWeekOf(ids[0]!) === 0 ? k : k + 1;
}

// ================================================================================================
// The course's words: the program's, with the cohort's own promise, how it works and holiday note
// ================================================================================================

/** The one token the program's shared words may carry (the mockup's Course settings › Before Week 1). */
export const FIRST_LIVE_BUILD_TOKEN = '{first live build}';

/** What the token reads when the cohort has no session at all: the mockup's own words (`firstBuildOf`). */
export const FIRST_LIVE_BUILD_NONE = 'the first session';

// R-5 Phase 6 (D-265): the program record and its words are `program.ts`'s (`programCourse`), re-exported here.
export { DEFAULT_PROGRAM_ID, programCourse, programIdOf, programOf } from './program';

/** The words only this cohort's learners read (spec § 2): its promise, how it works and its holiday note. */
type OwnWords = Partial<Pick<CohortCourse['intro'], 'sub' | 'how' | 'holiday'>>;

/**
 * A cohort's own three words: the ones it saved (`Cohort.words`, D-255: a new cohort's, drafted at New cohort and
 * edited in Edit words), else its course's intro (where December's live, and Edit words writes them for it).
 */
const ownWordsOf = (c: Pick<Cohort, 'words' | 'course'>): OwnWords | undefined =>
  c.words ? { sub: c.words.promise, how: c.words.how, holiday: c.words.holiday } : c.course?.intro;

/**
 * The course's words for one cohort, as `GET /api/course` sends them, or null while there are none (no program words,
 * or no such cohort). `intro.sub`, `intro.how` and `intro.holiday` are the cohort's own (`ownWordsOf`); everything else
 * is the program's shared words (`programCourse`: its program's record, D-265). A cohort with none of its own reads the program's three too, as
 * Connor's amendment drafts a new cohort's words (PLAN § 10.3: "start as December's words"). Then `{first live build}`
 * is filled from the cohort (`fillFirstLiveBuild`).
 *
 * December's own words are the program row's own, so its words are that very object while no word carries the token.
 */
export function cohortCourseCopy(db: Pick<Db, 'cohorts'> & Partial<Pick<Db, 'sessions' | 'programs'>>, cohortId: string): CohortCourse | null {
  const program = programCourse(db, cohortId);
  const cohort = db.cohorts.find((c) => c.id === cohortId);
  if (!program || !cohort) return null;
  return fillFirstLiveBuild(withOwnWords(program, ownWordsOf(cohort)), () => firstLiveBuildDay(cohort, db.sessions ?? []));
}

/** The program's words with a cohort's own three in their places; the program's, the same object, when they are its own. */
function withOwnWords(program: CohortCourse, own: OwnWords | undefined): CohortCourse {
  if (!own) return program;
  const sub = typeof own.sub === 'string' ? own.sub : program.intro.sub;
  const how = Array.isArray(own.how) ? own.how : program.intro.how;
  const holiday = typeof own.holiday === 'string' ? own.holiday : program.intro.holiday;
  if (sub === program.intro.sub && how === program.intro.how && holiday === program.intro.holiday) return program;
  return { ...program, intro: { ...program.intro, sub, how, holiday } };
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
/** And its body, with the year (`email/templates/week0-open-html.ts`). */
export const DEFAULT_WEEK0_NAME = 'December 2026 Cohort';

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
 * What GoHighLevel's Cohort custom field holds for a plan's cohort (PLAN § 10.4, Q-33). R-5 Phase 5 (D-262, § 10.10):
 * the value stored on the cohort (Settings › Enrollment; December's "dec26", written by its data step). With none stored,
 * its start's month and two-digit year in its own zone, which is how New cohort prefills it: "jan27" for Connor's
 * January, and "dec26" for December (it starts Wed, Dec 2, 2026), the value December has always sent. A plan with no
 * cohort, or one the database no longer holds, sends December's, as every Accelerator order did before.
 */
export function ghlCohortValue(cohort: Pick<Cohort, 'id' | 'start' | 'timezone' | 'ghlValue'> | null | undefined): string {
  if (!cohort) return DEFAULT_COHORT_ID;
  if (cohort.ghlValue) return cohort.ghlValue;
  return ghlMonthValue(cohort);
}

/** A cohort's start as GoHighLevel's Cohort value: its month and two-digit year in its zone ("jan27"). */
export function ghlMonthValue(cohort: Pick<Cohort, 'start' | 'timezone'>): string {
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

/**
 * R-5 audit (D-267): whether an announcement reaches a learner. One sent from a cohort's Announcements tab names its
 * cohort (`cohortId`) and reaches only the people who count in it (`rostered`, `cohort-roster.ts`): never another
 * cohort's, and never an access group's member (Utah Life), who counts in none. One that names no cohort (every
 * announcement made before this change) reaches whom it always has (`announcementInCohort`), so nothing already sent
 * moves.
 */
export function announcementReaches(
  a: Pick<Announcement, 'sessionId' | 'cohortId'>,
  sessions: readonly Pick<Session, 'id' | 'cohortId'>[],
  cohortId: string,
  rostered: boolean,
): boolean {
  if (a.cohortId !== undefined) return rostered && a.cohortId === cohortId;
  return announcementInCohort(a, sessions, cohortId);
}

// ================================================================================================
// The learner Schedule's "Add all to calendar"
// ================================================================================================

/**
 * The address of a learner's whole schedule as one calendar file: December's is the welcome page's own file, as
 * before (`/calendar/schedule.ics`); another cohort's names it (`?cohort=`), and the API hands it only to that cohort's
 * learners.
 */
export const scheduleIcsPath = (cohortId: string | null | undefined): string => cohortIcsPath(SCHEDULE_ICS_PATH, cohortId);

/**
 * R-5 Phase 5 (D-262): a calendar file's address for a cohort: December's is the bare address, its subscribed feeds'
 * (a changed address or UID duplicates every event in a calendar that holds them, PLAN § 5.3); another cohort's names
 * it (`?cohort=`). The welcome page's two buttons (builds, office hours) and the learner Schedule's file alike.
 */
export const cohortIcsPath = (path: string, cohortId: string | null | undefined): string =>
  !cohortId || cohortId === DEFAULT_COHORT_ID ? path : `${path}?cohort=${encodeURIComponent(cohortId)}`;
