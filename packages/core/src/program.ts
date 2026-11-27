// R-5 Phase 6 (D-265): the program record (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md Phase 6, PLAN.md § 10.6 and
// § 10.8). A program is what is taught; a cohort is one group taken through it (spec § 2). One program today,
// `accelerator`, so no screen picks between two. Each cohort names its program (`Cohort.programId`; none reads as the one
// program), and what every cohort shares is the program's `course`, read through `programCourse`.
//
// COPIED, NOT MOVED. The one-time data step `2026-11-28-program` (`seed/program-v1.ts`) copies December's `cohorts.course`
// onto the record; December's row keeps it as it is. Until the step has run, a program with no copy reads December's row,
// so both answer the same.
//
// Pure: no clock, no random source.

import { DEFAULT_COHORT_ID } from './accelerator';
import type { CohortCourse } from './course-types';
import type { Cohort, Db, Program } from './types';

/** The one program every cohort runs today (the spec's Phase 6: "a program record (`id: 'accelerator'`, ..."). */
export const DEFAULT_PROGRAM_ID = 'accelerator';

/** The program a cohort runs: the one it names (`Cohort.programId`), else the one program. */
export const programIdOf = (c: Pick<Cohort, 'programId'> | null | undefined): string =>
  c?.programId ?? DEFAULT_PROGRAM_ID;

/** The program record a cohort runs (or, with no cohort named, the one program), or null while there is none. */
export function programOf(db: Pick<Db, 'cohorts'> & Partial<Pick<Db, 'programs'>>, cohortId?: string): Program | null {
  const id = programIdOf(cohortId === undefined ? null : db.cohorts.find((c) => c.id === cohortId));
  return db.programs?.find((p) => p.id === id) ?? null;
}

/**
 * The program's shared words: its record's `course` (D-265). Until the one-time data step `2026-11-28-program` has
 * copied them there, a program with no copy reads the `course` stored on December's row, where every word the course
 * shares has lived (the spec's § 2 table: "the rest of `cohorts.course` on the `dec26` row"; its Phase 6: "Until that
 * step runs, a cohort with no program copy reads December's"). The step copies, never moves, so both answer the same.
 * Null while the database holds no course (the seed hasn't run).
 */
export const programCourse = (
  db: Pick<Db, 'cohorts'> & Partial<Pick<Db, 'programs'>>,
  cohortId?: string,
): CohortCourse | null => programOf(db, cohortId)?.course ?? decemberCourse(db);

/** The fallback until the program step has run in production (PLAN § 10.8: `cohorts.course` stays on `dec26`). */
const decemberCourse = (db: Pick<Db, 'cohorts'>): CohortCourse | null =>
  db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)?.course ?? null;
