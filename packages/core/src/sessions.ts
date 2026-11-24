// Sessions: lookup, lifecycle state, the join window, cohort week math and the
// Next Live Session view-model.
//
// Ported verbatim from design-reference/lms-data.js (lines 216-293 and 330). Every exported
// name, signature, field name and string matches the reference; the differential suite compares
// this file to it function by function.
import { fmt } from './time';
import { canAccess } from './status';
import type { AIEmployee, Cohort, Db, Learner, Session } from './types';

// ---------- Office hours, a second series (D-110) ----------
// The Amplified AI Accelerator runs a Thursday office hour beside each Wednesday build. Its id is
// `<cohort>-oh<week>` and its `n` is 100 + week, so `n` stays unique within the cohort and a build is
// still the only session whose `n` a module's `session` names. The week is read off the id, so the
// series needs no new column. Every session the reference seeds is a build: for each of them
// `sessionKind` is 'build' and `sessionWeek` is `s.n`, so nothing below changes for the prototype.
const OH_ID = /-oh(\d+)$/;

export type SessionKind = 'build' | 'office_hours';

export const sessionKind = (s: Pick<Session, 'id'>): SessionKind => (OH_ID.test(s.id) ? 'office_hours' : 'build');

/** The week a session belongs to: an office hour's from its id, a build's from its `n`. */
export const sessionWeek = (s: Pick<Session, 'id' | 'n'>): number => {
  const m = OH_ID.exec(s.id);
  return m ? Number(m[1]) : s.n;
};

/** What a screen calls a session: `Session 3` for a build, `Week 3` for an office hour. */
export const sessionLabel = (s: Pick<Session, 'id' | 'n'>): string =>
  sessionKind(s) === 'office_hours' ? `Week ${sessionWeek(s)}` : `Session ${s.n}`;

/** Whether a cohort runs its own office-hours series, which is what an Accelerator cohort looks like. */
export const hasOfficeHoursSeries = (sessions: readonly Session[], cohortId: string): boolean =>
  sessions.some((s) => s.cohortId === cohortId && sessionKind(s) === 'office_hours');

// ---------- Lookup ----------
export const sessionFor = (db: Db, cohortId: string, n: number): Session | null =>
  db.sessions.find((s) => s.cohortId === cohortId && s.n === n) || null;

/**
 * The AI Employee a session belongs to. H-13 (D-248): the week the builder gave it (`moduleId`, D-173) comes first,
 * so a session added in the builder, whose `n` is the cohort's next number, belongs to its week; a draft is no
 * one's, as before. Without one (every session the reference seeds, and a `moduleId` naming nothing): an office
 * hour belongs to its week's AI Employee, a build to the one whose `session` is its `n`.
 */
export const moduleForSession = (db: Pick<Db, 'modules'>, s: Pick<Session, 'id' | 'n'> & Partial<Pick<Session, 'moduleId'>>): AIEmployee | null => {
  const named = s.moduleId ? db.modules.find((m) => m.id === s.moduleId) : undefined;
  if (named) return named.status !== 'draft' ? named : null;
  return db.modules.find((m) => m.session === sessionWeek(s) && m.status !== 'draft') || null;
};

export const sessionEnd = (s: Pick<Session, 'start' | 'mins'>): number => s.start + s.mins * 60000;

/**
 * What the lifecycle reads of a session: its times, and the state the Console sets (Go Live's `live`, the
 * replay). Optional so a session from `GET /api/course`, which carries times only, reads as one nobody has
 * started or replayed (D-183). A type, not a change: every `Session` is one.
 */
export type SessionTiming = Pick<Session, 'start' | 'mins'> & Partial<Pick<Session, 'live' | 'replay'>>;

// ---------- Lifecycle ----------
/** `forceLive` is the States-sheet override; it stays optional, exactly as in the reference. */
export const sessionState = (s: SessionTiming | null | undefined, now: number, forceLive?: boolean) => {
  if (!s) return 'none' as const;
  if (s.live || forceLive) return 'live' as const;
  if (now < s.start) return 'upcoming' as const;
  if (now < sessionEnd(s)) return 'live' as const;
  return s.replay === 'ready' ? ('replay' as const) : ('processing' as const);
};

export const accessibleSessions = (db: Db, u: Learner | null | undefined): Session[] => {
  const cid = (u && u.cohortId) || 'dec26';
  return db.sessions
    .filter((s) => s.cohortId === cid)
    .filter((s) => {
      const m = moduleForSession(db, s);
      return !m || canAccess(u ?? null, m);
    })
    .sort((a, b) => a.start - b.start);
};

export const nextSession = (db: Db, u: Learner | null | undefined, now: number): Session | null =>
  accessibleSessions(db, u).find((s) => s.live || sessionEnd(s) > now) || null;

export const joinMode = (s: SessionTiming | null | undefined, now: number) => {
  if (!s) return 'disabled' as const;
  const st = sessionState(s, now);
  if (st === 'live') return 'live' as const;
  if (st === 'upcoming' && s.start - now <= 15 * 60000) return 'ready' as const;
  return 'disabled' as const;
};

// ---------- Cohort week math ----------
/** The CST Monday 00:00 of the week `t` falls in. The reference's own expression, for any instant. */
const mondayOf = (t: number): number => {
  const dow = (new Date(t - 6 * 3600e3).getUTCDay() + 6) % 7;
  return t - dow * 86400e3 - ((t - 6 * 3600e3) % 86400e3);
};

/**
 * The course week of a cohort with an office-hours series (D-110): the latest build week whose Monday
 * has arrived. A holiday break with no build does not count as a week, so cohort one's Jan 6 build is
 * Week 4, not the sixth Monday since Dec 2. Before the first build's week it is 0, and after the
 * cohort's end it is past `weeks`.
 */
const courseWeek = (co: Cohort, sessions: readonly Session[], now: number): number => {
  if (now > co.end) return (co.weeks || 6) + 1;
  const builds = sessions.filter((s) => s.cohortId === co.id && sessionKind(s) === 'build');
  return builds.reduce((w, s) => (mondayOf(s.start) <= now ? Math.max(w, s.n) : w), 0);
};

// Fixed 6-hour CST offset, Monday-anchored. Ported literally; do not refactor the expression.
// `sessions` is optional and only read for a cohort with an office-hours series (D-110): every other
// cohort, including all three the reference seeds, keeps the Monday arithmetic exactly.
export const cohortWeek = (co: Cohort, now: number, sessions?: readonly Session[]): number => {
  if (sessions && hasOfficeHoursSeries(sessions, co.id)) return courseWeek(co, sessions, now);
  const d = new Date(co.start - 6 * 3600e3),
    dow = (d.getUTCDay() + 6) % 7;
  const monday = co.start - dow * 86400e3 - ((co.start - 6 * 3600e3) % 86400e3);
  return Math.floor((now - monday) / (7 * 86400e3)) + 1;
};

/** The word "Cohort" is appended here, so `co.name` is `December 2026`, not `December 2026 Cohort`. */
export const cohortLine = (co: Cohort, now: number, sessions?: readonly Session[]): string => {
  const w = cohortWeek(co, now, sessions),
    weeks = co.weeks || 6;
  if (w < 1) return `${co.name} Cohort · Starts ${fmt.date(co.start)}`;
  if (w > weeks) return `${co.name} Cohort · Completed`;
  return `${co.name} Cohort · Week ${w} of ${weeks}`;
};

// ---------- Next Live Session card: one of five variants ----------
export type Variant = 'scheduled' | 'starting_soon' | 'live' | 'ended_processing' | 'replay_ready';

export const VARIANTS: readonly [Variant, string][] = [
  ['scheduled', 'Scheduled'],
  ['starting_soon', 'Starting Soon'],
  ['live', 'Live'],
  ['ended_processing', 'Ended · Processing'],
  ['replay_ready', 'Replay Ready'],
];

export interface CountdownUnit {
  v: string;
  l: string;
}

export interface SessionVM {
  variant: Variant;
  n: number;
  title: string;
  module: string;
  moduleId: string | null;
  when: string;
  mins: number;
  instructor: string;
  zoom: string;
  sessionId: string;
  kicker: string;
  primary: 'calendar' | 'join' | 'kit' | 'watch';
  countdown?: CountdownUnit[];
  aria?: string;
  join?: 'disabled' | 'ready' | 'live';
  hint?: string;
  live?: boolean;
  elapsed?: string;
  note?: string;
}

/** The per-variant block spread over `base`. Its key set differs per variant, as in the reference. */
type VariantBlock = Pick<SessionVM, 'kicker' | 'primary'> &
  Partial<Pick<SessionVM, 'countdown' | 'aria' | 'join' | 'hint' | 'live' | 'elapsed' | 'note'>>;

export function cardSession(
  db: Db,
  u: Learner | null | undefined,
  now: number,
): { s: Session | null; variant: Variant | 'none' } {
  const list = accessibleSessions(db, u);
  const next = list.find((s) => s.live || sessionEnd(s) > now);
  if (next) {
    if (sessionState(next, now) === 'live') return { s: next, variant: 'live' };
    if (next.start - now <= 15 * 60000) return { s: next, variant: 'starting_soon' };
  }
  // `.pop()` on purpose: the LAST session that ended within the past 12 hours.
  const recent = list.filter((s) => !s.live && sessionEnd(s) <= now && now - sessionEnd(s) < 12 * 3600e3).pop();
  if (recent) return { s: recent, variant: recent.replay === 'ready' ? 'replay_ready' : 'ended_processing' };
  return next ? { s: next, variant: 'scheduled' } : { s: null, variant: 'none' };
}

/** A representative `now` for each variant, used by the States sheet and the differential suite. */
export function variantNow(s: Session, variant: Variant, tick: number): number {
  const end = sessionEnd(s);
  if (variant === 'scheduled') return s.start - (2 * 86400e3 + 2 * 3600e3 + 18 * 60e3) + tick;
  if (variant === 'starting_soon') return s.start - (11 * 60e3 + 40e3) + tick;
  if (variant === 'live') return s.start + 23 * 60e3 + 14e3 + tick;
  if (variant === 'ended_processing') return end + 22 * 60e3 + tick;
  return end + 2 * 3600e3 + tick;
}

export function sessionVM(db: Db, s: Session, variant: Variant, now: number): SessionVM {
  const m = moduleForSession(db, s),
    rem = Math.max(0, s.start - now),
    el = Math.max(0, now - s.start);
  const d = Math.floor(rem / 86400e3),
    h = Math.floor((rem % 86400e3) / 3600e3),
    mi = Math.floor((rem % 3600e3) / 60e3),
    se = Math.floor((rem % 60e3) / 1000);
  const units: CountdownUnit[] = [];
  if (d) units.push({ v: String(d).padStart(2, '0'), l: d === 1 ? 'Day' : 'Days' });
  if (d || h) units.push({ v: String(h).padStart(2, '0'), l: h === 1 ? 'Hour' : 'Hours' });
  units.push({ v: String(mi).padStart(2, '0'), l: 'Min' });
  if (rem <= 3600e3) units.push({ v: String(se).padStart(2, '0'), l: 'Sec' });
  const aria =
    rem > 3600e3
      ? `Starts in ${d ? d + (d === 1 ? ' day ' : ' days ') : ''}${h} hour${h === 1 ? '' : 's'}`
      : rem > 600e3
        ? `Starts within ${Math.ceil(rem / 600e3) * 10} minutes`
        : rem > 60e3
          ? `Starts within ${Math.ceil(rem / 60e3)} minutes`
          : 'Starts within 1 minute';
  const base = {
    variant,
    n: s.n,
    title: s.title,
    module: m ? m.name : 'Live session',
    moduleId: m ? m.id : null,
    when: fmt.when(s.start),
    mins: s.mins,
    instructor: (m && m.instructor) || 'Jordan Hale',
    zoom: s.zoom,
    sessionId: s.id,
  };
  const V: Record<Variant, VariantBlock> = {
    scheduled: {
      kicker: 'Next Live Session',
      countdown: units,
      aria,
      primary: 'calendar',
      join: 'disabled',
      hint: 'Opens 15 Min Before',
    },
    starting_soon: { kicker: 'Starting Soon', countdown: units, aria, primary: 'join', join: 'ready', hint: '' },
    live: { kicker: 'Live Now', live: true, elapsed: fmt.clock(el / 1000), primary: 'join', join: 'live', hint: '' },
    ended_processing: {
      kicker: 'Session Ended',
      note: 'Replay processing · usually within 2 hours',
      primary: 'kit',
    },
    replay_ready: {
      kicker: 'Replay Ready',
      note: 'Chapters and a searchable transcript are up.',
      primary: 'watch',
    },
  };
  return { ...base, ...(V[variant] || V.scheduled) };
}

export const sessionEvent = (s: Session): { id: string; title: string; start: number; end: number; url: string } => ({
  id: s.id,
  title: `Amplified Impact · ${sessionLabel(s)}: ${s.title}`,
  start: s.start,
  end: sessionEnd(s),
  url: s.zoom,
});
