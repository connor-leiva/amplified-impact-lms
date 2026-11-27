// SEED, NOT RUNTIME (D-265, R-5 Phase 6). The one-time data step that copies December's shared course words onto the
// program record (the spec's Phase 6: "a program record (`id: 'accelerator'`, its name, the shared `course`) ... and a
// data step that moves December's shared fields there, equality-tested"). PLAN.md § 10.8 makes it a copy: "December's
// shared fields are copied to the program record, not moved; `cohorts.course` stays on `dec26` as it is."
//
// WHAT IT WRITES: one row, `programs('accelerator')`, whose `course` is December's `cohorts.course`, deep-copied, and
// whose name is that course's title. Nothing else: no cohort row is touched (December names no program; a cohort with
// none runs the one program, `programIdOf`).
//
// The whole course, the cohort's own three words included (`intro.sub`, `intro.how`, `intro.holiday`): those are what a
// cohort with no words of its own reads today (D-261: "A cohort with none of its own reads the program's three too"),
// so copying them keeps that answer too. Course Settings never edits them; it shows each cohort's own.
//
// D-175'S RULE, AND THE EQUALITY. It writes only when no program record exists and December's row holds a course, and
// only when every cohort's course words (`cohortCourseCopy`, what `GET /api/course` assembles) and the staff preview's
// database (`previewDb`) read back exactly as they do without it. Anything else is left alone and named.
//
// ROLLBACK. `undoProgramV1` deletes the record while it still holds what the step wrote, and every read falls back to
// December's row, which still holds the same words. In SQL:
//
//   delete from programs where id = 'accelerator';
//   delete from data_migrations where id = '2026-11-28-program';   -- only to let it run again
//
// A record staff have saved since (Course Settings) is left and named: deleting it would undo their edits. `audit_log`
// keeps the step's row: it is append-only.
//
// Pure: no clock, no random source, no environment.

import { DEFAULT_COHORT_ID } from '../src/accelerator';
import { cohortCourseCopy } from '../src/cohort-learner';
import { previewDb } from '../src/cohort-page';
import { PROGRAM_NAME } from '../src/course-actions';
import { DEFAULT_PROGRAM_ID } from '../src/program';
import type { Db, Program } from '../src/types';
import type { DataSkip, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const PROGRAM_V1 = '2026-11-28-program';

/**
 * What a cohort's learners and the staff preview read of the course's words, for every cohort, as one string. Equal
 * before and after the step, or the step writes nothing.
 */
export function courseReads(db: Db): string {
  return JSON.stringify(
    db.cohorts.map((c) => ({
      id: c.id,
      words: cohortCourseCopy(db, c.id),
      preview: previewDb(db, c.id).cohorts.find((x) => x.id === c.id)?.course ?? null,
    })),
  );
}

/** December's shared words, copied onto the program record, once, only where nothing it reads would move. */
export function planProgramV1(db: Db): DataStepOutcome {
  const skipped: DataSkip[] = [];
  const existing = db.programs?.find((p) => p.id === DEFAULT_PROGRAM_ID);
  if (existing) {
    skipped.push({ id: `program.${DEFAULT_PROGRAM_ID}`, reason: 'left as it is: the program record already exists' });
    return { db, changes: [], skipped };
  }
  const dec = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!dec?.course) {
    skipped.push({
      id: DEFAULT_COHORT_ID,
      reason: dec ? 'its row holds no course: nothing to copy' : 'not in this database',
    });
    return { db, changes: [], skipped };
  }
  const program: Program = {
    id: DEFAULT_PROGRAM_ID,
    name: dec.course.intro.title.trim() || PROGRAM_NAME,
    course: structuredClone(dec.course),
  };
  const next: Db = { ...db, programs: [...(db.programs ?? []), program] };
  if (courseReads(next) !== courseReads(db)) {
    skipped.push({
      id: `program.${DEFAULT_PROGRAM_ID}`,
      reason: 'left unwritten: a cohort’s course words would not read back as they do from December’s row',
    });
    return { db, changes: [], skipped };
  }
  return {
    db: next,
    changes: [
      {
        target: { type: 'program', id: program.id, label: program.name },
        before: null,
        after: { name: program.name, copiedFrom: dec.id },
      },
    ],
    skipped,
  };
}

/**
 * The rollback: the record removed while its course is still the one the step wrote (December's row's, which it copied),
 * so every read falls back to December's row. A record staff have saved since is left and named.
 */
export function undoProgramV1(db: Db): DataStepOutcome {
  const p = db.programs?.find((x) => x.id === DEFAULT_PROGRAM_ID);
  if (!p)
    return { db, changes: [], skipped: [{ id: `program.${DEFAULT_PROGRAM_ID}`, reason: 'not in this database' }] };
  const dec = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID);
  if (!dec?.course || JSON.stringify(p.course) !== JSON.stringify(dec.course))
    return {
      db,
      changes: [],
      skipped: [
        {
          id: `program.${DEFAULT_PROGRAM_ID}`,
          reason: 'changed since the step wrote it (Course Settings saved it): left as it is',
        },
      ],
    };
  const rest = (db.programs ?? []).filter((x) => x.id !== DEFAULT_PROGRAM_ID);
  const { programs: _all, ...base } = db;
  return {
    db: rest.length ? { ...base, programs: rest } : base,
    changes: [{ target: { type: 'program', id: p.id, label: p.name }, before: { name: p.name }, after: null }],
    skipped: [],
  };
}
