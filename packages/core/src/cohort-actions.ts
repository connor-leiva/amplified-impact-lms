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
import { requirePerm } from './can';
import { layOut, layoutProblem, layoutWarnings, meetsLine, relayout } from './cohort-run';
import type { LaidSession, Layout, LayoutWarning, Relayout } from './cohort-run';
import { COURSE_DEFAULT_TIME, COURSE_TZ, zonedInputs, zonedInstant } from './course-actions';
import { cohortCopyFields, copyIssues, changedFields, diffSummary, issueLine } from './course-rules';
import { MutationError } from './mutations';
import type { Actor, Ctx } from './mutations';
import type { AdminOutcome } from './admin-actions';
import type { Cohort, CohortShape, CohortSlot, CohortWeek, Db, Session } from './types';

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
  args: { name: string; start: string; sourceCohortId: string; picks: string[]; shape: ShapeArgs },
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
