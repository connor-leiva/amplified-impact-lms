// R-5 (D-254): a cohort owns its run and its shape (handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md § 2, Phase 2).
//
// A PROGRAM IS WHAT YOU TEACH; A COHORT IS ONE GROUP YOU TAKE THROUGH IT. What a week teaches is its module, built once.
// Which weeks a cohort takes, each one's number in that cohort, and when each opens and is due, are the cohort's run
// (`Cohort.run`). How often it meets is its shape (`Cohort.shape`).
//
// ABSENT MEANS TODAY. A cohort with no stored run reads the week modules exactly as they are, their own `opens`,
// `dueAt`, `status` and `course.week`: `cohortView` hands back the very same object. That is how December reads until
// its run is written (Phase 3, one data step), so nothing here can move it.
//
// Pure: no clock, no random source. Times are typed in the cohort's zone (`zonedInstant`).

import { DEFAULT_COHORT_ID, isCourseWeek } from './accelerator';
import { COURSE_DEFAULT_TIME, COURSE_TZ, zonedInputs, zonedInstant } from './course-actions';
import type { AIEmployee, CohortShape, CohortSlot, CohortWeek, Db, Session, SessionType } from './types';

// ================================================================================================
// The run: a cohort's weeks, seen through the cohort
// ================================================================================================

/** A week module, as one cohort has it: its number there, and when it opens and is due there. */
export interface RunWeek {
  module: AIEmployee;
  n: number;
  opensAt: number | null;
  dueAt: number | null;
}

const isWeek = (m: AIEmployee): boolean => m.kind === 'week' && m.course !== undefined && isCourseWeek(m.id);

/** The cohort's live build and office hours for a week module, earliest first. */
const sessionsOf = (
  sessions: readonly Session[],
  cohortId: string,
  moduleId: string,
  kinds: readonly SessionType[],
): Session[] =>
  sessions
    .filter((s) => s.cohortId === cohortId && s.moduleId === moduleId && s.kind !== undefined && kinds.includes(s.kind))
    .sort((a, b) => a.start - b.start);

/** A week module as a cohort with a stored run has it. */
function seenThrough(m: AIEmployee, w: CohortWeek, cohortId: string, sessions: readonly Session[]): AIEmployee {
  const build = sessionsOf(sessions, cohortId, m.id, ['live_build'])[0];
  const hours = sessionsOf(sessions, cohortId, m.id, ['office_hours', 'goal_planning'])[0];
  const { dueAt: _due, ...rest } = m;
  const course = m.course
    ? {
        ...m.course,
        week: w.n,
        // A week's pages name the session they describe: this cohort's, or none.
        liveBuild: m.course.liveBuild ? { ...m.course.liveBuild, sessionId: build?.id ?? '' } : m.course.liveBuild,
        officeHours: m.course.officeHours
          ? { ...m.course.officeHours, sessionId: hours?.id ?? '' }
          : m.course.officeHours,
      }
    : m.course;
  return {
    ...rest,
    status: m.status === 'draft' ? 'draft' : w.opensAt !== null ? 'scheduled' : 'published',
    opens: w.opensAt,
    session: build?.n ?? null,
    ...(w.dueAt !== null ? { dueAt: w.dueAt } : {}),
    ...(course ? { course } : {}),
  };
}

/**
 * The database as one cohort sees it: its course weeks seen through its run (their number, opening, due date and
 * sessions there), and the course weeks it doesn't take left out. **With no stored run, the same object** (December
 * today), so every reader handed a view reads exactly what it read before.
 */
export function cohortView<T extends Pick<Db, 'cohorts' | 'modules' | 'sessions'>>(db: T, cohortId: string): T {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co?.run) return db;
  const byModule = new Map(co.run.map((w) => [w.moduleId, w]));
  const modules = db.modules.flatMap((m) => {
    if (!isWeek(m)) return [m];
    const w = byModule.get(m.id);
    return w ? [seenThrough(m, w, co.id, db.sessions)] : [];
  });
  return { ...db, modules };
}

/**
 * The cohort's run: its weeks, in order, each as the cohort has it. With no stored run, today's course weeks (the
 * non-draft week modules in week order, with their own dates), which is what December's run is until it is written.
 */
export function cohortRun(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): RunWeek[] {
  return cohortView(db, cohortId)
    .modules.filter((m) => isWeek(m) && m.status !== 'draft')
    .sort((a, b) => a.course!.week - b.course!.week)
    .map((m) => ({
      module: m,
      n: m.course!.week,
      opensAt: m.status === 'scheduled' ? m.opens : null,
      dueAt: m.dueAt ?? null,
    }));
}

// ================================================================================================
// Which cohort a viewer is in
// ================================================================================================

/** What the rule reads of a plan: `plans.kind`, `plans.status`, `plans.cohort_id`, `plans.created_at`. */
export interface CohortPlan {
  kind: string;
  status: string;
  cohortId: string | null;
  createdAt: number;
}

/**
 * The cohort of a viewer whose team's account holds these plans: the newest `cohort` plan that has not ended, by its
 * `cohort_id`. Anyone without one is in `DEFAULT_COHORT_ID`, where it is inert: their plan is the gate (scope.ts).
 */
export function cohortOfPlans(plans: readonly CohortPlan[]): string {
  let best: CohortPlan | null = null;
  for (const p of plans) {
    if (p.kind !== 'cohort' || p.status === 'ended' || !p.cohortId) continue;
    if (!best || p.createdAt > best.createdAt) best = p;
  }
  return best?.cohortId ?? DEFAULT_COHORT_ID;
}

// ================================================================================================
// Laying a shape out: the weeks and the sessions a shape and a start day make
// ================================================================================================

/** The words a laid-out session's title ends with, by kind: "{week title} · {kind}". */
export const LAYOUT_KIND_LABEL: Readonly<Record<SessionType, string>> = {
  live_build: 'Live build',
  office_hours: 'Office hours',
  goal_planning: 'Goal planning',
  setup: 'Setup',
  other: 'Working session',
};

/** A slot's identity, as a laid-out session records it: weekday, start and kind. */
export const slotKey = (s: Pick<CohortSlot, 'day' | 'time' | 'kind'>): string => `${s.day}-${s.time}-${s.kind}`;

/** What `layOut` is handed. `start` is the day Week 1 opens (`YYYY-MM-DD`, in the cohort's zone). */
export interface LayoutInput {
  start: string;
  /** When a week opens, `HH:MM` in the cohort's zone. Absent: noon. */
  openTime?: string;
  tz?: string;
  setupWeek: boolean;
  /** The building weeks, by module id. They keep the curriculum's order whatever order they come in. */
  picks: readonly string[];
  slots: readonly CohortSlot[];
}

/** One session a layout makes. */
export interface LaidSession {
  moduleId: string;
  /** The week's number in this cohort. */
  n: number;
  slot: string;
  kind: SessionType;
  title: string;
  start: number;
  mins: number;
}

export interface Layout {
  weeks: CohortWeek[];
  sessions: LaidSession[];
  /** When the setup week opens (it is the cohort's preview), or null with none. */
  setupOpensAt: number | null;
}

const DAY = 86_400_000;
const isoDay = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const dayString = (t: number): string => new Date(t).toISOString().slice(0, 10);
const addDays = (date: string, n: number): string => dayString(isoDay(date) + n * DAY);
const weekdayOf = (date: string): number => new Date(isoDay(date)).getUTCDay();

/** Why a layout can't be made, or null. */
export function layoutProblem(db: Pick<Db, 'modules'>, input: LayoutInput): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start) || Number.isNaN(isoDay(input.start)))
    return 'Pick the day Week 1 opens.';
  if (input.openTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.openTime))
    return 'Pick the time a week opens.';
  if (!input.picks.length) return 'Pick at least one week.';
  if (new Set(input.picks).size !== input.picks.length) return 'Each week can be picked once.';
  for (const id of input.picks) {
    const m = db.modules.find((x) => x.id === id);
    if (!m || !isWeek(m)) return `No week ${id}.`;
    if (m.course!.week === 0) return 'The setup week is not a week of building.';
  }
  if (input.setupWeek && !setupModule(db)) return 'The program has no setup week.';
  for (const s of input.slots) {
    if (!Number.isInteger(s.day) || s.day < 0 || s.day > 6) return 'Pick a weekday for each meeting.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return 'Pick a time for each meeting.';
    if (!LAYOUT_KIND_LABEL[s.kind]) return 'Pick what each meeting is.';
    if (!(Number.isInteger(s.mins) && s.mins > 0 && s.mins <= 600)) return 'Give each meeting a length in minutes.';
  }
  if (new Set(input.slots.map(slotKey)).size !== input.slots.length) return 'Two meetings are the same.';
  return null;
}

/** The program's setup week: the week module numbered 0 in the curriculum. */
const setupModule = (db: Pick<Db, 'modules'>): AIEmployee | undefined =>
  db.modules.find((m) => isWeek(m) && m.course!.week === 0);

/**
 * Lay a shape out (the mockup's `planOf`): Week 1 opens on `start` at the open time; each later week opens seven days
 * after the one before; a setup week opens seven days before Week 1; the picked weeks keep the curriculum's order and
 * are numbered 1 to N; each week gets one session per slot, on the first matching weekday on or after its opening day,
 * titled "{week title} · {kind}", with the slot's length. No Zoom link. Call `layoutProblem` first.
 */
export function layOut(db: Pick<Db, 'modules'>, input: LayoutInput): Layout {
  const tz = input.tz ?? COURSE_TZ;
  const time = input.openTime ?? COURSE_DEFAULT_TIME;
  const picked = input.picks
    .map((id) => db.modules.find((m) => m.id === id)!)
    .sort((a, b) => a.course!.week - b.course!.week);
  const weeks: CohortWeek[] = [];
  const sessions: LaidSession[] = [];
  let setupOpensAt: number | null = null;
  const setup = input.setupWeek ? setupModule(db) : undefined;
  if (setup) {
    setupOpensAt = zonedInstant(addDays(input.start, -7), time, tz);
    // The setup week is open from the preview on: no date of its own, as December's Week 0.
    weeks.push({ moduleId: setup.id, n: 0, opensAt: null, dueAt: null });
  }
  picked.forEach((m, i) => {
    const opens = addDays(input.start, 7 * i);
    const n = i + 1;
    weeks.push({ moduleId: m.id, n, opensAt: zonedInstant(opens, time, tz), dueAt: null });
    for (const slot of input.slots) {
      const wait = (slot.day - weekdayOf(opens) + 7) % 7;
      const date = addDays(opens, wait);
      sessions.push({
        moduleId: m.id,
        n,
        slot: slotKey(slot),
        kind: slot.kind,
        title: `${m.course!.title || m.name} · ${LAYOUT_KIND_LABEL[slot.kind]}`,
        start: zonedInstant(date, slot.time, tz),
        mins: slot.mins,
      });
    }
  });
  sessions.sort((a, b) => a.start - b.start || a.slot.localeCompare(b.slot));
  return { weeks, sessions, setupOpensAt };
}

// ================================================================================================
// Warnings, never errors: the same instant as another cohort's session, and U.S. federal holidays
// ================================================================================================

/** A U.S. federal holiday's rule: a fixed day, or the nth (or last) weekday of a month. Observed shifts apply. */
type HolidayRule = { name: string; month: number } & ({ day: number } | { weekday: number; nth: number });

/** The eleven U.S. federal holidays (5 U.S.C. 6103). `nth: -1` is the last. */
export const FEDERAL_HOLIDAYS: readonly HolidayRule[] = [
  { name: 'New Year’s Day', month: 1, day: 1 },
  { name: 'Martin Luther King Jr. Day', month: 1, weekday: 1, nth: 3 },
  { name: 'Presidents’ Day', month: 2, weekday: 1, nth: 3 },
  { name: 'Memorial Day', month: 5, weekday: 1, nth: -1 },
  { name: 'Juneteenth', month: 6, day: 19 },
  { name: 'Independence Day', month: 7, day: 4 },
  { name: 'Labor Day', month: 9, weekday: 1, nth: 1 },
  { name: 'Columbus Day', month: 10, weekday: 1, nth: 2 },
  { name: 'Veterans Day', month: 11, day: 11 },
  { name: 'Thanksgiving Day', month: 11, weekday: 4, nth: 4 },
  { name: 'Christmas Day', month: 12, day: 25 },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * A year's federal holidays by date (`YYYY-MM-DD`): each holiday's own date, and when it falls on a weekend the
 * weekday it is observed (a Saturday's on the Friday before, a Sunday's on the Monday after), named "(observed)".
 */
export function federalHolidays(year: number): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const h of FEDERAL_HOLIDAYS) {
    let date: string;
    if ('day' in h) date = `${year}-${pad(h.month)}-${pad(h.day)}`;
    else if (h.nth > 0) {
      const first = `${year}-${pad(h.month)}-01`;
      date = addDays(first, ((h.weekday - weekdayOf(first) + 7) % 7) + 7 * (h.nth - 1));
    } else {
      const last = addDays(`${h.month === 12 ? year + 1 : year}-${pad(h.month === 12 ? 1 : h.month + 1)}-01`, -1);
      date = addDays(last, -((weekdayOf(last) - h.weekday + 7) % 7));
    }
    out.set(date, h.name);
    if ('day' in h) {
      const wd = weekdayOf(date);
      if (wd === 6) out.set(addDays(date, -1), `${h.name} (observed)`);
      if (wd === 0) out.set(addDays(date, 1), `${h.name} (observed)`);
    }
  }
  return out;
}

export type LayoutWarning =
  | { kind: 'same_time'; start: number; title: string; cohortId: string; sessionId: string }
  | { kind: 'holiday'; start: number; title: string; holiday: string };

/**
 * What to warn about in a layout: a session that starts at the same instant as a session of another cohort that is not
 * archived ("same time as December's"), and a session on a U.S. federal holiday, named. Never a refusal.
 */
export function layoutWarnings(
  db: Pick<Db, 'cohorts' | 'sessions'>,
  cohortId: string | null,
  sessions: readonly Pick<LaidSession, 'start' | 'title'>[],
  tz: string = COURSE_TZ,
): LayoutWarning[] {
  const live = new Set(db.cohorts.filter((c) => c.id !== cohortId && c.archivedAt === undefined).map((c) => c.id));
  const others = db.sessions.filter((s) => live.has(s.cohortId));
  const out: LayoutWarning[] = [];
  for (const s of sessions) {
    for (const o of others)
      if (o.start === s.start)
        out.push({ kind: 'same_time', start: s.start, title: s.title, cohortId: o.cohortId, sessionId: o.id });
    const day = zonedInputs(s.start, tz).date;
    const holiday = federalHolidays(Number(day.slice(0, 4))).get(day);
    if (holiday) out.push({ kind: 'holiday', start: s.start, title: s.title, holiday });
  }
  return out;
}

// ================================================================================================
// Laying out again, later: only what has not happened
// ================================================================================================

/** A session has happened, for a layout, once it has started or is live, or has attendance or a replay. */
export const sessionHappened = (s: Session, now: number): boolean =>
  s.start <= now || s.live || s.attended !== null || s.replay !== null;

/** What laying a cohort out again does to its sessions. */
export interface Relayout {
  /** Laid-out sessions that move or change (same week and slot): their id, and what they become. */
  update: { id: string; to: LaidSession }[];
  /** New sessions to add. */
  add: LaidSession[];
  /** Laid-out sessions no longer in the shape, not yet happened: removed. */
  remove: string[];
  /** Sessions left exactly as they are, and why: made or edited by hand, or already happened. */
  left: { id: string; title: string; why: 'by_hand' | 'happened' }[];
}

/**
 * Compare a cohort's sessions with a new layout. A session that has happened keeps everything. A session made or edited
 * by hand (no `slot`) is never moved or removed, and is listed. A laid-out session not yet happened takes its slot's new
 * place, or goes when its slot is gone. A new session whose time has already passed is not added.
 */
export function relayout(sessions: readonly Session[], cohortId: string, next: Layout, now: number): Relayout {
  const out: Relayout = { update: [], add: [], remove: [], left: [] };
  const mine = sessions.filter((s) => s.cohortId === cohortId);
  const key = (moduleId: string | undefined, slot: string | undefined): string => `${moduleId ?? ''}|${slot ?? ''}`;
  const wanted = new Map(next.sessions.map((s) => [key(s.moduleId, s.slot), s]));
  const kept = new Set<string>();
  for (const s of mine.slice().sort((a, b) => a.start - b.start)) {
    const k = key(s.moduleId, s.slot);
    if (sessionHappened(s, now)) {
      out.left.push({ id: s.id, title: s.title, why: 'happened' });
      kept.add(k);
      continue;
    }
    if (s.slot === undefined) {
      out.left.push({ id: s.id, title: s.title, why: 'by_hand' });
      continue;
    }
    const to = wanted.get(k);
    if (!to || to.start <= now) out.remove.push(s.id);
    else {
      kept.add(k);
      if (to.start !== s.start || to.title !== s.title || to.mins !== s.mins || to.kind !== s.kind)
        out.update.push({ id: s.id, to });
    }
  }
  for (const s of next.sessions) if (!kept.has(key(s.moduleId, s.slot)) && s.start > now) out.add.push(s);
  return out;
}

/** "Tue live build and Thu office hours": a rhythm in a line, as the mockup's "Meets" says it. */
export function meetsLine(slots: readonly CohortSlot[]): string {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const parts = slots
    .slice()
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    .map((s) => `${DOW[s.day]} ${LAYOUT_KIND_LABEL[s.kind].toLowerCase()}`);
  return parts.length <= 1
    ? (parts[0] ?? 'Self-paced')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** A cohort's shape, whole, or why not. */
export function shapeProblem(shape: CohortShape): string | null {
  if (!Number.isInteger(shape.buildWeeks) || shape.buildWeeks < 1) return 'Pick at least one week.';
  if (typeof shape.hosts !== 'string') return 'Name the hosts.';
  return null;
}
