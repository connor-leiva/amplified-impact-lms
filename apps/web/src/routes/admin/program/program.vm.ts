// R-5 Phase 6 (D-265): Program's pages, as view-models (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md Phase 6; the
// mockup's `Curriculum3`, `WeekEdit` and `CourseSet`, p3-areas.jsx and ia-screens.jsx). PURE: no React, no clock.
//
// A week is built once, in the program; a cohort takes it on its own dates (spec § 2). So every date and week number
// here is a cohort's, read through its run (`cohortRun`), for every cohort that is not archived, never December's by id.
// A week is Published or Draft here: "scheduled" is something a cohort says about a week (spec Phase 6), so a module
// whose status is `scheduled` reads Published.

import { cohortRun, fmt, programCourse, sortedModules } from '@ai/core';
import { isCourseWeek } from '@ai/core/accelerator';
import type { AIEmployee, Cohort, Db } from '@ai/core';
import { cohortLabel } from '../../../data/admin-shell';
import { cohortPath } from '../cohort/cohort.vm';

/** The mockup's "2 hr 30 min", "1 hr", "45 min"; none at all is "Not built". */
export function timeOf(mins: number): string {
  if (mins <= 0) return 'Not built';
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return h ? `${h} hr${r ? ` ${r} min` : ''}` : `${r} min`;
}

/** A cohort's name without its noun, as the mockup draws it on a week ("December 2026 · Week 1"). */
export const cohortShort = (co: Pick<Cohort, 'name'>): string => cohortLabel(co).replace(/ Cohort$/, '');

/** The cohorts that can run a week: every one that is not archived. */
const liveCohorts = (db: Pick<Db, 'cohorts'>): Cohort[] => db.cohorts.filter((c) => c.archivedAt === undefined);

/**
 * A cohort's weeks: its stored run (a draft week it takes is in it, though learners see it only once published), or for a
 * cohort with none, the weeks its learners read (`cohortRun`), as every reader before R-5.
 */
export function cohortWeeks(db: Db, co: Cohort): { moduleId: string; n: number; opensAt: number | null }[] {
  if (co.run) return co.run.map((w) => ({ moduleId: w.moduleId, n: w.n, opensAt: w.opensAt }));
  return cohortRun(db, co.id).map((w) => ({ moduleId: w.module.id, n: w.n, opensAt: w.opensAt }));
}

/** Each cohort that takes this module, with its week number there. */
export function runsOf(db: Db, moduleId: string): { cohortId: string; label: string; n: number; to: string }[] {
  return liveCohorts(db).flatMap((co) => {
    const w = cohortWeeks(db, co).find((x) => x.moduleId === moduleId);
    return w ? [{ cohortId: co.id, label: `${cohortShort(co)} · Week ${w.n}`, n: w.n, to: cohortPath(co.id) }] : [];
  });
}

export interface WeekRowVM {
  id: string;
  /** The week's number in the curriculum (`course.week`); a module that is not a course week shows its place. */
  n: number;
  title: string;
  outcome: string;
  draft: boolean;
  steps: string;
  time: string;
  /** A draft with no step can't be published yet ("Add a step first"). */
  canPublish: boolean;
  runs: { cohortId: string; label: string; to: string }[];
  /** The persona its learner preview takes (D-138). */
  previewAs: 'agent' | 'owner';
}

export interface CohortRunsVM {
  id: string;
  name: string;
  line: string;
  to: string;
}

export interface CurriculumWeeksVM {
  summary: string;
  rows: WeekRowVM[];
  cohorts: CohortRunsVM[];
  shared: { glossary: number; words: number; vault: number };
}

const minsOf = (m: Pick<AIEmployee, 'checklist'>): number => m.checklist.reduce((a, s) => a + (+s.mins || 0), 0);

/**
 * The week's title as a cohort shows it: a program week's course title, else its name. A copy made with Duplicate (or a
 * week made with Add a week) keeps its own name ("… (copy)"), so it can be told from the week it came from.
 */
export const weekTitle = (m: Pick<AIEmployee, 'id' | 'name' | 'course'>): string => (isCourseWeek(m.id) && m.course?.title) || m.name;

/** Program › Curriculum (`Curriculum3`): one list of weeks, the cohorts that run them, and what every week shares. */
export function curriculumWeeksVM(db: Db): CurriculumWeeksVM {
  const mods = programWeekModules(db);
  const rows = mods.map((m, i): WeekRowVM => {
    const steps = m.checklist.length;
    return {
      id: m.id,
      n: m.course ? m.course.week : i + 1,
      title: weekTitle(m),
      outcome: m.outcome,
      draft: m.status === 'draft',
      steps: steps ? `${steps} steps` : 'No steps yet',
      time: timeOf(minsOf(m)),
      canPublish: steps > 0,
      runs: runsOf(db, m.id).map(({ cohortId, label, to }) => ({ cohortId, label, to })),
      previewAs: m.tier === 'team' ? 'owner' : 'agent',
    };
  });
  const drafts = rows.filter((r) => r.draft).length;
  const cohorts = liveCohorts(db).flatMap((co): CohortRunsVM[] => {
    const run = cohortWeeks(db, co);
    if (!run.length) return [];
    const first = run[0]!;
    const opens = first.opensAt ?? (first.n === 0 ? (co.previewOpensAt ?? null) : null);
    const n = run.filter((w) => w.n > 0).length;
    return [
      {
        id: co.id,
        name: cohortLabel(co),
        line: `${n} weeks${opens !== null ? ` · opens ${fmt.mtDay(opens)}` : ''}`,
        to: cohortPath(co.id),
      },
    ];
  });
  return {
    summary: `${rows.length - drafts} published and ${drafts} in draft. Open a week to build it.`,
    rows,
    cohorts,
    shared: {
      glossary: programCourse(db)?.glossary?.length ?? 0,
      words: (db.copy ?? []).filter((c) => c.audience === 'learner').length,
      vault: db.resources.length,
    },
  };
}

/** The program's weeks, in the curriculum's order: every module of kind `week` (spec Phase 6: "one list of weeks"). */
export const programWeekModules = (db: Pick<Db, 'modules'>): AIEmployee[] =>
  sortedModules(db as Db).filter((m) => m.kind === 'week');

/**
 * The moves that take the week at `from` to `to` in the weeks list, as one-place moves in the whole curriculum
 * (`moveModule` moves one place in it, and a module that is not a week may sit between two weeks).
 */
export function weekMoves(db: Db, from: number, to: number): { id: string; dir: -1 | 1; times: number } | null {
  const weeks = programWeekModules(db);
  const all = sortedModules(db).map((m) => m.id);
  const a = weeks[from];
  const b = weeks[to];
  if (!a || !b || from === to) return null;
  return { id: a.id, dir: to < from ? -1 : 1, times: Math.abs(all.indexOf(b.id) - all.indexOf(a.id)) };
}

// ================================================================================================
// A week (`WeekEdit`)
// ================================================================================================

export type WeekSection = 'basics' | 'steps' | 'page' | 'live' | 'cards' | 'kit' | 'forms';

export const WEEK_SECTIONS: readonly { id: WeekSection; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'steps', label: 'Steps' },
  { id: 'page', label: 'Course Page' },
  { id: 'live', label: 'Live Sessions' },
  { id: 'cards', label: 'Hire Cards' },
  { id: 'kit', label: 'Kit' },
  { id: 'forms', label: 'Forms' },
];

/** The sections a week shows: the six, and on the setup week a seventh, Forms (PLAN § 10.1 Q-31, § 10.6). */
export function weekSections(d: Pick<AIEmployee, 'id' | 'course'>): WeekSection[] {
  const setup = !!d.course && d.course.week === 0;
  return WEEK_SECTIONS.map((s) => s.id).filter((s) =>
    s === 'forms' ? setup : s === 'page' || s === 'live' || s === 'cards' ? !!d.course : true,
  );
}

/** The section the address names, else Steps (the mockup's default). */
export function sectionOf(d: Pick<AIEmployee, 'id' | 'course'>, asked: string | null): WeekSection {
  const all = weekSections(d);
  return all.includes(asked as WeekSection) ? (asked as WeekSection) : 'steps';
}

/** The counts beside a section's name: steps, the admin's cohort's sessions for the week, hire cards, kit items. */
export function sectionCounts(db: Db, d: AIEmployee, cohortId: string | null): Partial<Record<WeekSection, number>> {
  const c = d.course;
  const kit = (c?.skills?.length ?? 0) + db.resources.filter((r) => r.module === d.id).length + d.files.length;
  const sessions = cohortId ? db.sessions.filter((s) => s.cohortId === cohortId && s.moduleId === d.id).length : 0;
  return {
    steps: d.checklist.length,
    ...(c ? { live: sessions, cards: c.week === 0 ? 0 : 3 } : {}),
    kit,
  };
}

/** Previous and next week in the curriculum's order, for the head's two arrows. */
export function neighbours(db: Db, id: string): { prev: string | null; next: string | null } {
  const ids = programWeekModules(db).map((m) => m.id);
  const i = ids.indexOf(id);
  return { prev: i > 0 ? ids[i - 1]! : null, next: i >= 0 && i < ids.length - 1 ? ids[i + 1]! : null };
}

/** A step's row: its title, its "Done when", who does it and its time. */
export interface StepRowVM {
  key: string;
  title: string;
  doneWhen: string;
  who: string[];
  time: string;
}

/** The step list as the mockup draws it. A course week's step is titled by its `ch` (the week page's own words). */
export function stepRows(d: AIEmployee): StepRowVM[] {
  return d.checklist.map((s, i) => ({
    key: `${i}`,
    title: (d.kind === 'week' ? s.ch || s.text : s.text) || 'Untitled step',
    doneWhen: s.doneWhen ? `Done when: ${s.doneWhen}` : '',
    who: whoOf(s.who),
    time: s.timeLabel || `${s.mins} min`,
  }));
}

/** "Owner, AI Implementer" as its pills; "Each of you" reads as both. */
export function whoOf(who: string | undefined): string[] {
  const v = (who ?? '').trim();
  if (!v) return [];
  if (/^each of you$/i.test(v) || /^both/i.test(v)) return ['Owner', 'AI Implementer'];
  return v
    .split(/,| and /)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Is this module one a cohort runs (the program's course weeks), so its dates are the cohorts'? */
export const datesAreCohorts = (id: string): boolean => isCourseWeek(id);

// ================================================================================================
// Course Settings (`CourseSet`)
// ================================================================================================

export type CourseSection = 'intro' | 'roles' | 'rules' | 'before' | 'after' | 'join' | 'glossary' | 'words';

export const COURSE_SECTIONS: readonly { id: CourseSection; label: string }[] = [
  { id: 'intro', label: 'Course Intro' },
  { id: 'roles', label: 'Roles' },
  { id: 'rules', label: 'Rules and Support' },
  { id: 'before', label: 'Before Week 1' },
  { id: 'after', label: 'After the Cohort' },
  { id: 'join', label: 'Joining and Community' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'words', label: 'Words' },
];

export const courseSectionOf = (asked: string | null): CourseSection =>
  COURSE_SECTIONS.some((s) => s.id === asked) ? (asked as CourseSection) : 'intro';

/** The cohort's own three words, as the "From the cohort" blocks show them, and where they are edited. */
export interface FromCohortVM {
  cohortId: string;
  /** "December 2026 › Settings". */
  link: string;
  to: string;
  promise: string;
  how: string[];
  holiday: string;
  /** "Wed, Dec 2": what `{first live build}` reads for this cohort. */
  firstBuild: string;
  name: string;
}
