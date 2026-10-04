// Sessions: lookup, lifecycle state, the join window, cohort week math and the
// Next Live Session view-model.
//
// Ported verbatim from design-reference/lms-data.js (lines 216-293 and 330). Every exported
// name, signature, field name and string matches the reference; the differential suite compares
// this file to it function by function.
import { fmt } from './time';
import { canAccess } from './status';
import type { AIEmployee, Cohort, Db, Learner, Session } from './types';

// ---------- Lookup ----------
export const sessionFor = (db: Db, cohortId: string, n: number): Session | null =>
  db.sessions.find((s) => s.cohortId === cohortId && s.n === n) || null;

export const moduleForSession = (db: Db, s: Session): AIEmployee | null =>
  db.modules.find((m) => m.session === s.n && m.status !== 'draft') || null;

export const sessionEnd = (s: Session): number => s.start + s.mins * 60000;

// ---------- Lifecycle ----------
/** `forceLive` is the States-sheet override; it stays optional, exactly as in the reference. */
export const sessionState = (s: Session | null | undefined, now: number, forceLive?: boolean) => {
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

export const joinMode = (s: Session | null | undefined, now: number) => {
  if (!s) return 'disabled' as const;
  const st = sessionState(s, now);
  if (st === 'live') return 'live' as const;
  if (st === 'upcoming' && s.start - now <= 15 * 60000) return 'ready' as const;
  return 'disabled' as const;
};

// ---------- Cohort week math ----------
// Fixed 6-hour CST offset, Monday-anchored. Ported literally; do not refactor the expression.
export const cohortWeek = (co: Cohort, now: number): number => {
  const d = new Date(co.start - 6 * 3600e3),
    dow = (d.getUTCDay() + 6) % 7;
  const monday = co.start - dow * 86400e3 - ((co.start - 6 * 3600e3) % 86400e3);
  return Math.floor((now - monday) / (7 * 86400e3)) + 1;
};

/** The word "Cohort" is appended here, so `co.name` is `December 2026`, not `December 2026 Cohort`. */
export const cohortLine = (co: Cohort, now: number): string => {
  const w = cohortWeek(co, now),
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
  title: `Amplified Impact · Session ${s.n}: ${s.title}`,
  start: s.start,
  end: sessionEnd(s),
  url: s.zoom,
});
