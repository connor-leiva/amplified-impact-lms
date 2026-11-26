// R-5 (D-254): the cohort's own writes, in `course-actions.ts`'s style: `(db, actor, args, ctx)` in, a new db out
// through immer, `{ db, error }` for an inline refusal (no write, no row), a thrown `MutationError` for a forbidden or
// missing thing, and the one audit row the write owes. The API runs them on `POST /api/admin/actions/:name`.
//
// Who may run them is the `cohorts` permission: a cohort's shape, run and sessions are the Cohorts row's, as its
// sessions and release plan already are. Opening or closing enrollment, seats and the price are Phase 5's.
//
// NOTHING HERE TOUCHES A COHORT WITHOUT A STORED RUN. A cohort created here has one. December has none until Phase 3's
// data step writes it, so every action below refuses it, inline, and December's rows cannot move through them.

import { produce } from 'immer';
import { DEFAULT_COHORT_ID } from './accelerator';
import { requirePerm } from './can';
import { layOut, layoutProblem, layoutWarnings, meetsLine, relayout } from './cohort-run';
import type { LaidSession, Layout, LayoutWarning, Relayout } from './cohort-run';
import { COURSE_DEFAULT_TIME, COURSE_TZ, zonedInputs, zonedInstant } from './course-actions';
import { cohortCopyFields, copyIssues, changedFields, diffSummary, issueLine } from './course-rules';
import { MutationError } from './mutations';
import type { Actor, Ctx } from './mutations';
import type { AdminOutcome } from './admin-actions';
import { draftWords, includedDefault } from './cohort-page';
import type { Cohort, CohortShape, CohortSlot, CohortWeek, CohortWords, Db, Session } from './types';

/** What a cohort write hands back beside its toast: the cohort, the layout's warnings, and what was left alone. */
export interface CohortActionResult {
  cohortId: string;
  warnings: LayoutWarning[];
  /** Sessions a re-layout left exactly as they were, and why. */
  left: Relayout['left'];
}

/** The shape a form sends: the rhythm and the hosts. Its number of building weeks is the weeks picked. */
export interface ShapeArgs {
  setupWeek: boolean;
  slots: CohortSlot[];
  hosts: string;
}

const cohortOf = (db: Db, id: string): Cohort => {
  const co = db.cohorts.find((x) => x.id === id);
  if (!co) throw new MutationError('not_found', `No cohort ${id}`);
  return co;
};

/** The copy rules on the cohort's name and cadence line, as one inline error, or null. */
function refuseCopy(
  prev: Pick<Cohort, 'name' | 'cadence'> | null,
  next: Pick<Cohort, 'name' | 'cadence'>,
): string | null {
  const issues = copyIssues(changedFields(prev ? cohortCopyFields(prev) : [], cohortCopyFields(next)));
  return issues.length ? issues.map(issueLine).join('\n') : null;
}

const NO_RUN =
  'This cohort’s weeks are still read from the curriculum. Its run is written before it can be laid out here.';

/** D-255 (Q-28): December's shape is derived for display from its run and sessions, and never stored. */
export const DERIVED_SHAPE = 'This cohort’s shape is read from its own sessions. Only its hosts change here.';

const isDay = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/** A cohort's words as a form sends them, trimmed, with empty lines of how it works dropped. */
const cleanWords = (w: CohortWords): CohortWords => ({
  promise: (w.promise || '').trim(),
  how: (w.how ?? []).map((x) => x.trim()).filter(Boolean),
  holiday: (w.holiday || '').trim(),
});

/** The copy rules on a cohort's words, as they would sit in its course's intro. */
function refuseWordsCopy(prev: CohortWords | null, next: CohortWords): string | null {
  const fields = (w: CohortWords) =>
    [
      { path: 'words.promise', label: 'The promise', text: w.promise },
      ...w.how.map((h, i) => ({ path: `words.how[${i}]`, label: `How it works ${i + 1}`, text: h })),
      { path: 'words.holiday', label: 'Holiday note', text: w.holiday },
    ].filter((f) => f.text.trim() !== '');
  const issues = copyIssues(changedFields(prev ? fields(prev) : [], fields(next)));
  return issues.length ? issues.map(issueLine).join('\n') : null;
}

const tzOf = (co: Pick<Cohort, 'timezone'>): string => co.timezone ?? COURSE_TZ;

/** A laid-out session as a row. */
const rowOf = (s: LaidSession, cohortId: string, id: string, n: number): Session => ({
  id,
  cohortId,
  n,
  title: s.title,
  start: s.start,
  mins: s.mins,
  zoom: '',
  live: false,
  attended: null,
  replay: null,
  views: 0,
  kind: s.kind,
  moduleId: s.moduleId,
  slot: s.slot,
});

/** A cohort's first and last instants: its first session (else its first opening) to its last session's end. */
function spanOf(layout: Layout): { start: number; end: number } {
  const opens = layout.weeks.map((w) => w.opensAt).filter((t): t is number => t !== null);
  const first = Math.min(...layout.sessions.map((s) => s.start), ...opens);
  const ends = layout.sessions.map((s) => s.start + s.mins * 60_000);
  const end = ends.length ? Math.max(...ends) : Math.max(...opens) + 7 * 86_400_000;
  return { start: first, end };
}

const runSummary = (co: Cohort) => ({
  run: co.run ?? null,
  shape: co.shape ?? null,
  previewOpensAt: co.previewOpensAt ?? null,
  start: co.start,
  end: co.end,
  weeks: co.weeks ?? null,
  cadence: co.cadence,
});

// ================================================================================================
// Create a cohort from a shape, a start day and a source cohort
// ================================================================================================

/**
 * A new cohort, as a **draft**: its shape laid out into weeks and sessions from the day Week 1 opens. It copies the
 * source cohort's seats, zone and default open time, and nothing else: no people, no plans, no words, no Zoom links.
 * Its cadence line is its rhythm in a line ("Tue live build and Thu office hours"); its preview is its setup week's
 * opening. A draft is sent no reminder (`underWay` in jobs/due.ts) and, with no plans, no welcome.
 */
export function createCohortFromShape(
  db: Db,
  a: Actor,
  args: {
    name: string;
    start: string;
    sourceCohortId: string;
    picks: string[];
    shape: ShapeArgs;
    /**
     * D-255: the words it starts with. Absent: the source cohort's, flagged "Read them once" until saved (PLAN.md
     * § 10.3). Null: none (a blank cohort). Given: these, still flagged until saved.
     */
    words?: CohortWords | null;
    /** D-255: the day its included time ends (`YYYY-MM-DD`). Absent: its last live build + 90 days. Null: none. */
    includedUntil?: string | null;
  },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const source = cohortOf(db, args.sourceCohortId);
  const name = (args.name || '').trim();
  if (!name) return { db, error: 'Give the cohort a name.' };
  if (db.cohorts.some((x) => x.name.trim().toLowerCase() === name.toLowerCase()))
    return { db, error: 'A cohort already has that name.' };
  const tz = tzOf(source);
  const openTime = source.defaultOpenTime ?? COURSE_DEFAULT_TIME;
  const input = {
    start: args.start,
    openTime,
    tz,
    setupWeek: args.shape.setupWeek,
    picks: args.picks,
    slots: args.shape.slots,
  };
  const problem = layoutProblem(db, input);
  if (problem) return { db, error: problem };
  const layout = layOut(db, input);
  const cadence = meetsLine(args.shape.slots);
  const copy = refuseCopy(null, { name, cadence });
  if (copy) return { db, error: copy };
  const words = args.words === undefined ? draftWords(db, source.id) : args.words === null ? null : cleanWords(args.words);
  if (words) {
    const wordsCopy = refuseWordsCopy(null, words);
    if (wordsCopy) return { db, error: wordsCopy };
  }
  const includedUntil =
    args.includedUntil === undefined ? includedDefault(layout.sessions, tz) : args.includedUntil === null ? null : args.includedUntil;
  if (includedUntil !== null && !isDay(includedUntil)) return { db, error: 'Pick the day its included time ends.' };

  const id = c.id('c');
  const shape: CohortShape = {
    buildWeeks: args.picks.length,
    setupWeek: args.shape.setupWeek,
    slots: args.shape.slots.map((s) => ({ ...s })),
    hosts: (args.shape.hosts || '').trim(),
  };
  const span = spanOf(layout);
  const cohort: Cohort = {
    id,
    name,
    start: span.start,
    end: span.end,
    weeks: args.picks.length,
    status: 'draft',
    capacity: source.capacity,
    enrolled: 0,
    cadence,
    timezone: tz,
    defaultOpenTime: openTime,
    ...(layout.setupOpensAt !== null ? { previewOpensAt: layout.setupOpensAt } : {}),
    run: layout.weeks,
    shape,
    ...(words ? { words } : {}),
    ...(includedUntil ? { includedUntil } : {}),
  };
  const rows = layout.sessions.map((s, i) => rowOf(s, id, c.id('s'), i + 1));
  const next = produce(db, (d) => {
    d.cohorts.push(cohort);
    d.sessions.push(...rows);
  });
  return {
    db: next,
    toast: { msg: `${name} created as a draft`, tone: 'success' },
    cohort: { cohortId: id, warnings: layoutWarnings(next, id, layout.sessions, tz), left: [] },
    audit: {
      action: 'cohort.create',
      target: { type: 'cohort', id, label: name },
      before: null,
      after: {
        ...runSummary(cohort),
        source: source.id,
        capacity: cohort.capacity,
        timezone: tz,
        defaultOpenTime: openTime,
        sessions: rows.length,
        words: words ?? null,
        includedUntil: includedUntil ?? null,
      },
    },
  };
}

// ================================================================================================
// Change a cohort's shape, or its weeks: lay out again only what has not happened
// ================================================================================================

/** The cohort's Week 1 opening day, in its zone, from its stored run. */
function week1Of(co: Cohort): string | null {
  const w1 = co.run?.find((w) => w.n === 1);
  return w1?.opensAt != null ? zonedInputs(w1.opensAt, tzOf(co)).date : null;
}

/**
 * Apply a new layout to a cohort, keeping what has happened: a week that has opened keeps its date, a session that has
 * started keeps everything, and a session made or edited by hand is left alone and listed (`relayout`).
 */
function applyLayout(
  db: Db,
  co: Cohort,
  layout: Layout,
  shape: CohortShape,
  now: number,
  c: Ctx,
): { next: Db; plan: Relayout } {
  const plan = relayout(db.sessions, co.id, layout, now);
  const byModule = new Map((co.run ?? []).map((w) => [w.moduleId, w]));
  const weeks: CohortWeek[] = layout.weeks.map((w) => {
    const was = byModule.get(w.moduleId);
    const opened = was && was.opensAt !== null && was.opensAt <= now;
    return opened ? { ...w, opensAt: was.opensAt, dueAt: was.dueAt } : { ...w, dueAt: was?.dueAt ?? null };
  });
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    x.run = weeks;
    x.shape = shape;
    x.weeks = shape.buildWeeks;
    x.cadence = meetsLine(shape.slots);
    if (layout.setupOpensAt !== null && !(co.previewOpensAt !== undefined && co.previewOpensAt <= now))
      x.previewOpensAt = layout.setupOpensAt;
    if (layout.setupOpensAt === null && co.previewOpensAt !== undefined && co.previewOpensAt > now)
      delete x.previewOpensAt;
    const remove = new Set(plan.remove);
    d.sessions = d.sessions.filter((s) => !remove.has(s.id));
    for (const u of plan.update)
      Object.assign(
        d.sessions.find((s) => s.id === u.id)!,
        { title: u.to.title, start: u.to.start, mins: u.to.mins, kind: u.to.kind },
      );
    let n = Math.max(0, ...d.sessions.filter((s) => s.cohortId === co.id).map((s) => s.n));
    for (const s of plan.add) d.sessions.push(rowOf(s, co.id, c.id('s'), ++n));
    const mine = d.sessions.filter((s) => s.cohortId === co.id);
    if (mine.length) {
      x.start = Math.min(x.start, ...mine.map((s) => s.start));
      x.end = Math.max(...mine.map((s) => s.start + s.mins * 60_000));
    }
  });
  return { next, plan };
}

/**
 * Save a cohort's shape: its rhythm, whether a setup week comes first, its hosts, and the weeks it takes. The weeks and
 * sessions that have not happened are laid out again from the stored Week 1 opening.
 */
export function saveCohortShape(
  db: Db,
  a: Actor,
  args: { cohortId: string; picks: string[]; shape: ShapeArgs },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if (!co.run) return { db, error: NO_RUN };
  // D-255 (Q-28): a cohort whose shape is read off its sessions (December's) is never laid out by a shape.
  if (!co.shape) return { db, error: DERIVED_SHAPE };
  const start = week1Of(co);
  if (!start) return { db, error: 'Set when Week 1 opens first.' };
  const input = {
    start,
    openTime: co.defaultOpenTime ?? COURSE_DEFAULT_TIME,
    tz: tzOf(co),
    setupWeek: args.shape.setupWeek,
    picks: args.picks,
    slots: args.shape.slots,
  };
  const problem = layoutProblem(db, input);
  if (problem) return { db, error: problem };
  const shape: CohortShape = {
    buildWeeks: args.picks.length,
    setupWeek: args.shape.setupWeek,
    slots: args.shape.slots.map((s) => ({ ...s })),
    hosts: (args.shape.hosts || '').trim(),
  };
  const layout = layOut(db, input);
  const { next, plan } = applyLayout(db, co, layout, shape, c.now, c);
  const saved = next.cohorts.find((x) => x.id === co.id)!;
  return {
    db: next,
    toast: { msg: `${co.name}’s shape saved`, tone: 'success' },
    cohort: {
      cohortId: co.id,
      warnings: layoutWarnings(
        next,
        co.id,
        layout.sessions.filter((s) => s.start > c.now),
        tzOf(co),
      ),
      left: plan.left,
    },
    audit: {
      action: 'cohort.shape_save',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: runSummary(co),
      after: {
        ...runSummary(saved),
        ...diffSummary(runSummary(co), runSummary(saved)),
        moved: plan.update.length,
        added: plan.add.length,
        removed: plan.remove.length,
        left: plan.left.length,
      },
    },
  };
}

// ================================================================================================
// Save a cohort's run: each week's opening and due date
// ================================================================================================

/** One week's dates as a form sends them, in the cohort's zone. */
export interface RunWeekArgs {
  moduleId: string;
  opens: { date: string; time: string } | null;
  due: { date: string; time: string } | null;
}

/**
 * Save when each of a cohort's weeks opens and is due. Moving a week moves that week's sessions that have not happened
 * by the same time, and nothing else. A week that has opened keeps its opening. The weeks and their order stay as they
 * are (change them with the shape).
 */
export function saveCohortRun(
  db: Db,
  a: Actor,
  args: { cohortId: string; weeks: RunWeekArgs[] },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if (!co.run) return { db, error: NO_RUN };
  const tz = tzOf(co);
  const sent = new Map(args.weeks.map((w) => [w.moduleId, w]));
  if (sent.size !== args.weeks.length || sent.size !== co.run.length || co.run.some((w) => !sent.has(w.moduleId)))
    return { db, error: 'Send every week of this cohort once.' };
  const moves = new Map<string, number>();
  const weeks: CohortWeek[] = [];
  for (const w of co.run) {
    const f = sent.get(w.moduleId)!;
    const opensAt = f.opens ? zonedInstant(f.opens.date, f.opens.time, tz) : null;
    const dueAt = f.due ? zonedInstant(f.due.date, f.due.time, tz) : null;
    if (Number.isNaN(opensAt) || Number.isNaN(dueAt)) return { db, error: `Pick a date and a time for Week ${w.n}.` };
    const opened = w.opensAt !== null && w.opensAt <= c.now;
    if (opened && opensAt !== w.opensAt) return { db, error: `Week ${w.n} has opened, so its opening stays.` };
    if (opensAt !== null && dueAt !== null && dueAt < opensAt)
      return { db, error: `Week ${w.n} is due before it opens.` };
    if (w.opensAt !== null && opensAt !== null && opensAt !== w.opensAt) moves.set(w.moduleId, opensAt - w.opensAt);
    weeks.push({ ...w, opensAt, dueAt });
  }
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    x.run = weeks;
    // D-255: December's weeks are its modules' own dates too (its run was written from them, and every reader not yet
    // on the run reads them: the reminders, the emails). One editor at a time: the week builder no longer edits them,
    // so a save here keeps them in step, as the week builder's own save did.
    if (co.id === DEFAULT_COHORT_ID)
      for (const w of weeks) {
        const m = d.modules.find((y) => y.id === w.moduleId);
        if (!m) continue;
        m.opens = w.opensAt;
        if (m.status !== 'draft') m.status = w.opensAt !== null ? 'scheduled' : 'published';
        if (w.dueAt !== null) m.dueAt = w.dueAt;
        else delete m.dueAt;
      }
    for (const s of d.sessions) {
      const by = s.cohortId === co.id && s.moduleId ? moves.get(s.moduleId) : undefined;
      if (by === undefined || s.start <= c.now || s.live || s.attended !== null || s.replay !== null) continue;
      if (s.movedFrom === undefined) s.movedFrom = s.start;
      s.start += by;
    }
    const mine = d.sessions.filter((s) => s.cohortId === co.id);
    if (mine.length) {
      x.start = Math.min(...mine.map((s) => s.start));
      x.end = Math.max(...mine.map((s) => s.start + s.mins * 60_000));
    }
  });
  const saved = next.cohorts.find((x) => x.id === co.id)!;
  return {
    db: next,
    toast: { msg: `${co.name}’s dates saved`, tone: 'success' },
    cohort: { cohortId: co.id, warnings: [], left: [] },
    audit: {
      action: 'cohort.run_save',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: runSummary(co),
      after: {
        ...runSummary(saved),
        ...diffSummary(runSummary(co), runSummary(saved)),
        sessionsMoved: [...moves.keys()].length,
      },
    },
  };
}

// ================================================================================================
// Add the sessions a rhythm is missing
// ================================================================================================

/**
 * Add, for each of the cohort's weeks, a session for each slot of its rhythm that the week has none for (by week and
 * slot), where it has not yet happened. Nothing that exists is moved.
 */
export function addCohortSessions(db: Db, a: Actor, args: { cohortId: string }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if (!co.run) return { db, error: NO_RUN };
  if (!co.shape) return { db, error: 'This cohort has no rhythm yet. Set its shape first.' };
  const start = week1Of(co);
  if (!start) return { db, error: 'Set when Week 1 opens first.' };
  const picks = co.run.filter((w) => w.n > 0).map((w) => w.moduleId);
  const input = {
    start,
    openTime: co.defaultOpenTime ?? COURSE_DEFAULT_TIME,
    tz: tzOf(co),
    setupWeek: co.shape.setupWeek,
    picks,
    slots: co.shape.slots,
  };
  const problem = layoutProblem(db, input);
  if (problem) return { db, error: problem };
  const layout = layOut(db, input);
  // A week moved on its own (`saveCohortRun`) lays out from its own opening, not seven days after the last.
  const opens = new Map(co.run.map((w) => [w.moduleId, w.opensAt]));
  const planned = new Map(layout.weeks.map((w) => [w.moduleId, w.opensAt]));
  const have = new Set(
    db.sessions
      .filter((s) => s.cohortId === co.id && s.moduleId)
      .map((s) => `${s.moduleId}|${s.slot ?? ''}|${s.kind ?? ''}`),
  );
  const haveKind = new Set(
    db.sessions.filter((s) => s.cohortId === co.id && s.moduleId).map((s) => `${s.moduleId}|${s.kind ?? ''}`),
  );
  const shift = (moduleId: string): number => {
    const at = opens.get(moduleId);
    const was = planned.get(moduleId);
    return at != null && was != null ? at - was : 0;
  };
  const missing = layout.sessions
    .map((s) => ({ ...s, start: s.start + shift(s.moduleId) }))
    .filter(
      (s) =>
        s.start > c.now && !have.has(`${s.moduleId}|${s.slot}|${s.kind}`) && !haveKind.has(`${s.moduleId}|${s.kind}`),
    );
  if (!missing.length) return { db, error: 'Every week already has its sessions.' };
  let n = Math.max(0, ...db.sessions.filter((s) => s.cohortId === co.id).map((s) => s.n));
  const rows = missing.map((s) => rowOf(s, co.id, c.id('s'), ++n));
  const next = produce(db, (d) => {
    d.sessions.push(...rows);
    const x = d.cohorts.find((y) => y.id === co.id)!;
    const mine = d.sessions.filter((s) => s.cohortId === co.id);
    x.start = Math.min(...mine.map((s) => s.start));
    x.end = Math.max(...mine.map((s) => s.start + s.mins * 60_000));
  });
  return {
    db: next,
    toast: { msg: `${rows.length} session${rows.length === 1 ? '' : 's'} added`, tone: 'success' },
    cohort: { cohortId: co.id, warnings: layoutWarnings(next, co.id, missing, tzOf(co)), left: [] },
    audit: {
      action: 'cohort.sessions_add',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: null,
      after: { sessions: rows.map((s) => ({ id: s.id, title: s.title, start: s.start, slot: s.slot ?? null })) },
    },
  };
}

// ================================================================================================
// D-255 (R-5 Phase 3): the rest of Cohort › Settings
// ================================================================================================

/**
 * Edit words (Settings › Words From This Cohort): the cohort's name and the three words only its learners read. A cohort
 * whose course holds its words (December) keeps them there (`course.intro.sub`, `.how`, `.holiday`); any other keeps
 * its own (`Cohort.words`). Saving clears "Read them once" (`words_checked_at`). The copy rules apply to what changed.
 */
export function saveCohortWords(
  db: Db,
  a: Actor,
  args: { cohortId: string; name: string; promise: string; how: string[]; holiday: string },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  const name = (args.name || '').trim();
  if (!name) return { db, error: 'Give the cohort a name.' };
  if (db.cohorts.some((x) => x.id !== co.id && x.name.trim().toLowerCase() === name.toLowerCase()))
    return { db, error: 'A cohort already has that name.' };
  const words = cleanWords({ promise: args.promise, how: args.how, holiday: args.holiday });
  if (!words.promise) return { db, error: 'Write the promise.' };
  const nameCopy = refuseCopy({ name: co.name, cadence: co.cadence }, { name, cadence: co.cadence });
  if (nameCopy) return { db, error: nameCopy };
  const before: CohortWords | null = co.words
    ? co.words
    : co.course
      ? { promise: co.course.intro.sub, how: co.course.intro.how, holiday: co.course.intro.holiday }
      : null;
  const wordsCopy = refuseWordsCopy(before, words);
  if (wordsCopy) return { db, error: wordsCopy };
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    x.name = name;
    if (x.course && !x.words) {
      x.course.intro.sub = words.promise;
      x.course.intro.how = words.how;
      x.course.intro.holiday = words.holiday;
    } else x.words = words;
    x.wordsCheckedAt = c.now;
  });
  return {
    db: next,
    toast: { msg: `${name}’s words saved`, tone: 'success' },
    audit: {
      action: 'cohort.words_save',
      target: { type: 'cohort', id: co.id, label: name },
      before: { name: co.name, words: before, wordsCheckedAt: co.wordsCheckedAt ?? null },
      after: { name, words, wordsCheckedAt: c.now },
    },
  };
}

/** Why a cohort's included time can no longer change: a cohort plan is placed in it (Q-22, PLAN.md § 10.5). */
export const INCLUDED_FROZEN = 'A seat in this cohort is sold, so its included time stays as it is.';

/**
 * The day a seat's included time ends (Settings › Dates and Release). Its instant is the start of that day in
 * America/Chicago (`includedUntilAt`). Refused once the cohort has a cohort plan: the first sale freezes it.
 */
export function saveCohortIncluded(db: Db, a: Actor, args: { cohortId: string; date: string | null }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if ((c.cohortFacts?.[co.id]?.plans ?? 0) > 0) return { db, error: INCLUDED_FROZEN };
  const date = args.date === null ? null : (args.date || '').trim();
  if (date !== null && !isDay(date)) return { db, error: 'Pick the day its included time ends.' };
  if ((co.includedUntil ?? null) === date) return { db, error: 'Nothing changed.' };
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    if (date === null) delete x.includedUntil;
    else x.includedUntil = date;
  });
  return {
    db: next,
    toast: { msg: `${co.name}’s included time saved`, tone: 'success' },
    audit: {
      action: 'cohort.included_save',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: { includedUntil: co.includedUntil ?? null },
      after: { includedUntil: date },
    },
  };
}

/** A cohort's hosts (Settings › Shape): its stored shape's, or, for a shape read off its sessions (December's), its own. */
export function saveCohortHosts(db: Db, a: Actor, args: { cohortId: string; hosts: string }, _c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  const hosts = (args.hosts || '').trim();
  const was = co.shape?.hosts ?? co.hosts ?? '';
  if (hosts === was) return { db, error: 'Nothing changed.' };
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    if (x.shape) x.shape.hosts = hosts;
    else if (hosts) x.hosts = hosts;
    else delete x.hosts;
  });
  return {
    db: next,
    toast: { msg: `${co.name}’s hosts saved`, tone: 'success' },
    audit: {
      action: 'cohort.hosts_save',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: { hosts: was || null },
      after: { hosts: hosts || null },
    },
  };
}

/**
 * Keep the sessions that are at the same time as another cohort's (Q-24: the portal warns and allows either). Recorded
 * once (`overlap_ok_at`), so "Before it opens" counts the Sessions line done.
 */
export function keepCohortOverlap(db: Db, a: Actor, args: { cohortId: string }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if (co.overlapOkAt !== undefined) return { db, error: 'They are already kept.' };
  const next = produce(db, (d) => {
    d.cohorts.find((y) => y.id === co.id)!.overlapOkAt = c.now;
  });
  return {
    db: next,
    toast: { msg: 'Kept at the same time', tone: 'success' },
    audit: {
      action: 'cohort.overlap_keep',
      target: { type: 'cohort', id: co.id, label: co.name },
      before: { overlapOkAt: null },
      after: { overlapOkAt: c.now },
    },
  };
}
