// /learn/schedule, the Schedule (D-180): artboards 10/11 (weeks) and 12/13 (calendar) of the learner
// mockup.
//
// PURE: every string the page renders is computed here. The course's words are the API's: each week's
// title and outcome (an open week whole, a locked week as its stub, with when it opens), each session's
// title, type and time (any number a week, of any type), the cohort's holiday note. The only words in
// this file are generic chrome (`SCHEDULE`, and `LABELS` from the shared view-model). Every time goes
// through `fmt.*`, the viewer's zone first and the program's in parentheses.
//
// THE HOLIDAY BREAK is read off the sessions (`buildBreaks` in @ai/core/schedule): a gap of more than a
// week between two live builds. What it says is the cohort's holiday note (`Cohort.course.intro.holiday`),
// split into its title and its line; without one, the skipped days in the viewer's zone.

import { fmt } from '@ai/core';
import type { Cohort, IconName, IcsEvent, SessionType } from '@ai/core';
import { countWord, currentWeek, duration, joinableSession, liveSessionAt, sessionEndsAt, sessionPhase, upcomingSessions } from '@ai/core/learner';
import {
  SCHEDULE_ICS_PATH,
  buildBreaks,
  civilDate,
  civilMonthName,
  dayKey,
  holidayNote,
  monthGrid,
  monthKey,
  openingMonth,
  scheduleMonths,
} from '@ai/core/schedule';
import type { ScheduleBreak } from '@ai/core/schedule';
import type { CoursePayload, CourseSession } from '../course/Course.vm';
import { HOME, countParts, partsAria } from './Home.vm';
import type { HeroRightVM } from './Home.vm';
import { LABELS, dateTile, icsEvents, joinVM } from './learn.vm';
import type { DateTileVM, JoinVM, Tone, WeekRow } from './learn.vm';
import { learnSchedule, learnWeek } from './routes';

/** Generic chrome, from the mockup. Never a week's or a session's words. */
export const SCHEDULE = {
  view: 'View',
  weeks: 'Weeks',
  calendar: 'Calendar',
  next: 'Next',
  startsIn: 'Starts in',
  seeBuild: 'See what you’ll build',
  joinOpens: 'Join opens 15 minutes before',
  now: 'Now',
  selfPaced: 'Self-paced, before the first build',
  selfPacedDue: 'Self-paced, due',
  owner: 'Owner',
  operator: 'operator',
  weeks_: 'weeks',
  done: 'done',
  opens: 'opens',
  holiday: 'Holiday break',
  noBuild: 'No build',
  noSessions: 'No sessions',
  or: 'or',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  allSessions: 'All sessions',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  type: {
    live_build: 'Live build',
    office_hours: 'Office hours',
    goal_planning: 'Goal planning',
    setup: 'Setup',
    other: 'Session',
  } satisfies Record<SessionType, string>,
} as const;

export type ScheduleView = 'weeks' | 'calendar';

/** The view a `?view=` asks for: the calendar, or the weeks (the default). */
export const viewOf = (q: string | null): ScheduleView => (q === 'calendar' ? 'calendar' : 'weeks');

/** A session's type: the builder's, else build or office hours off its id (a row from before the builder). */
export const typeOf = (s: Pick<CourseSession, 'kind' | 'type'>): SessionType =>
  s.type ?? (s.kind === 'build' ? 'live_build' : 'office_hours');

/** Builds draw forest; every other type draws blue, as the mockup's office hours do. */
export type Dot = 'build' | 'oh';
const dotOf = (s: Pick<CourseSession, 'kind' | 'type'>): Dot => (typeOf(s) === 'live_build' ? 'build' : 'oh');

/**
 * What a week's row calls a session: its type for a live build or office hours ("Live build · Wed,
 * Dec 2"); its own title for any other type, which says more than the type does.
 */
const lineLabel = (s: CourseSession): string => {
  const t = typeOf(s);
  return t === 'live_build' || t === 'office_hours' ? SCHEDULE.type[t] : s.title;
};

// --- the view-model -------------------------------------------------------------------------------

export interface HeroVM {
  tile: DateTileVM;
  /** D-183: Join, with the live badge or "Starting soon", while the hero's session can be joined. */
  join: JoinVM | null;
  eyebrow: string;
  /** The eyebrow after its lead ("Week 2 · Live build"), drawn after the live badge while Join shows. */
  eyebrowTail: string;
  title: string;
  meta: string;
  ics: IcsEvent[];
  addLabel: string;
  see: { label: string; href: string } | null;
  right: HeroRightVM;
}

export interface WeekItemVM {
  kind: 'week';
  key: string;
  week: number;
  href: string;
  aria: string;
  /** The date tile: the week's first session's day, or "Week" over its number for a self-paced week. */
  tile: DateTileVM;
  /** The week a learner is on now: its row tinted and its date tile forest. */
  now: boolean;
  icon: IconName;
  tone: Tone;
  title: string;
  pill: { tone: 'open' | 'ip' | 'done'; label: string } | null;
  line: string;
  lines: SessionLineVM[];
  locked: boolean;
  /** D-183: Join, for a session of the week that can be joined now. */
  join: JoinVM | null;
  /**
   * D-183: the next session, before its window: Join drawn off, with the current portal's hint ("Opens 15
   * Min Before"), as its Sessions page draws the next row.
   */
  soon: { title: string; meta: string; label: string; hint: string } | null;
  /** D-183: the current portal's "Watch Replay" for a live build whose replay is published: the week's player. */
  watch: { label: string; href: string; title: string } | null;
}

/**
 * A session's line in its week's row, and the state the current portal's Sessions page gives a past one:
 * a live build's replay (Replay Ready or Replay Processing) and how many attended live, any other
 * session's "Recording Posted" once its replay is up.
 */
export interface SessionLineVM {
  key: string;
  dot: Dot;
  text: string;
  badge: { tone: 'ok' | 'neutral'; label: string } | null;
  extra: string | null;
}

export interface BreakItemVM {
  kind: 'break';
  key: string;
  title: string;
  line: string;
}

export interface GroupVM {
  key: string;
  label: string;
  meta: string | null;
  items: (WeekItemVM | BreakItemVM)[];
}

export interface CalEventVM {
  kind: 'session';
  id: string;
  dot: Dot;
  label: string;
  title: string;
  aria: string;
  href: string;
}

export interface CalBreakVM {
  kind: 'break';
  key: string;
  label: string;
  line: string;
}

export interface CalCellVM {
  key: string;
  day: number;
  out: boolean;
  today: boolean;
  events: (CalEventVM | CalBreakVM)[];
}

export interface MonthVM {
  key: string;
  label: string;
  rows: CalCellVM[][];
}

export interface AgendaSessionVM {
  kind: 'session';
  id: string;
  tile: DateTileVM;
  title: string;
  meta: string;
  href: string;
  /** D-183: Join, while the session can be joined. */
  join: JoinVM | null;
}

export interface AgendaGroupVM {
  key: string;
  label: string;
  items: (AgendaSessionVM | BreakItemVM)[];
}

export interface ScheduleVM {
  title: string;
  lede: string | null;
  view: ScheduleView;
  views: { label: string; items: { key: ScheduleView; label: string; href: string; on: boolean }[] };
  /** The whole schedule as one calendar file, from the API's calendar route. Null with no sessions. */
  addAll: { label: string; href: string } | null;
  hero: HeroVM | null;
  weeks: { heading: string; groups: GroupVM[] };
  calendar: {
    legend: { build: string; oh: string };
    prev: string;
    next: string;
    days: readonly string[];
    months: MonthVM[];
    /** The month the calendar opens on: today's, else the nearest month of the schedule. */
    start: number;
    agendaLabel: string;
    agenda: AgendaGroupVM[];
  };
}

// --- pieces ---------------------------------------------------------------------------------------

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** "About 1 hr 30 min." → "about 1 hr 30 min", for the middle of a line. */
const inline = (s: string): string => {
  const t = s.trim().replace(/\.$/, '');
  return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/** "Week 1 · 12:00 PM MT (1:00 PM CT) · 1 hr 30 min": a session's week, start and length. */
const sessionMeta = (s: CourseSession): string =>
  `${LABELS.week} ${s.week} · ${fmt.time(s.start)} · ${duration(s.mins)}`;

/** What a break says: the cohort's note when it is the only break, else the skipped days. */
function breakText(
  b: ScheduleBreak,
  note: ReturnType<typeof holidayNote>,
  only: boolean,
): { title: string; line: string } {
  if (note && only) return { title: note.title ?? SCHEDULE.holiday, line: note.line };
  return {
    title: SCHEDULE.holiday,
    line: `${SCHEDULE.noSessions} ${b.skipped.map((t) => fmt.day(t)).join(` ${SCHEDULE.or} `)}`,
  };
}

const pillOf = (r: WeekRow): WeekItemVM['pill'] =>
  r.state === 'locked'
    ? null
    : r.state === 'built'
      ? { tone: 'done', label: LABELS.done }
      : r.state === 'in_progress'
        ? { tone: 'ip', label: LABELS.inProgress }
        : { tone: 'open', label: LABELS.open };

/** D-183: a past session's state, as the current portal's Sessions page writes it. */
function pastState(s: CourseSession, now: number): Pick<SessionLineVM, 'badge' | 'extra'> {
  const phase = sessionPhase(s, now);
  if (typeOf(s) !== 'live_build')
    return { badge: phase === 'replay' ? { tone: 'ok', label: LABELS.recordingPosted } : null, extra: null };
  const past = phase === 'replay' || phase === 'processing';
  return {
    badge: phase === 'replay' ? { tone: 'ok', label: LABELS.replayReady } : phase === 'processing' ? { tone: 'neutral', label: LABELS.replayProcessing } : null,
    extra: past && s.attended ? `${fmt.num(s.attended)} ${LABELS.attendedLive}` : null,
  };
}

function weekItem(r: WeekRow, own: readonly CourseSession[], nowWeek: number | null, now: number, next: CourseSession | null): WeekItemVM {
  const anchor = own.find((s) => typeOf(s) === 'live_build') ?? own[0] ?? null;
  const pill = pillOf(r);
  const join = own.map((s) => joinVM(s, now)).find((j): j is JoinVM => !!j) ?? null;
  const replayed = own.find((s) => typeOf(s) === 'live_build' && sessionPhase(s, now) === 'replay') ?? null;
  const mine = next && !join && own.some((s) => s.id === next.id) && sessionPhase(next, now) === 'upcoming' ? next : null;
  const lines: SessionLineVM[] = own.length
    ? own.map((s) => ({ key: s.id, dot: dotOf(s), text: `${lineLabel(s)} · ${fmt.day(s.start)}`, ...pastState(s, now) }))
    : [
        ...(r.module?.dueAt
          ? [{ key: 'due', dot: 'build' as const, text: `${SCHEDULE.selfPacedDue} ${fmt.day(r.module.dueAt)}`, badge: null, extra: null }]
          : []),
        ...(r.open
          ? [
              {
                key: 'time',
                dot: 'oh' as const,
                text: `${SCHEDULE.owner} ${inline(r.open.time.owner)} · ${SCHEDULE.operator} ${inline(r.open.time.operator)}`,
                badge: null,
                extra: null,
              },
            ]
          : []),
      ];
  const opensAt = r.locked?.opensAt ?? null;
  const said =
    r.state === 'locked'
      ? opensAt !== null
        ? `${SCHEDULE.opens} ${fmt.day(opensAt)}`
        : LABELS.locked
      : (pill?.label ?? '');
  return {
    kind: 'week',
    key: `w${r.week}`,
    week: r.week,
    href: r.href,
    aria: [`${LABELS.week} ${r.week}`, r.title, said].filter(Boolean).join(', '),
    tile: anchor ? dateTile(anchor.start) : { dw: LABELS.week, dd: String(r.week) },
    now: nowWeek === r.week,
    icon: r.icon,
    tone: r.tone,
    title: `${LABELS.week} ${r.week} · ${r.title}`,
    pill,
    line:
      r.state !== 'locked' && r.total > 0
        ? `${r.outcome.trim().replace(/\.$/, '')} · ${r.done} of ${r.total} ${SCHEDULE.done}`
        : r.outcome,
    lines,
    locked: r.state === 'locked',
    join,
    soon: mine ? { title: mine.title, meta: `${fmt.time(mine.start)} · ${LABELS.zoom}`, label: LABELS.join, hint: LABELS.joinHint } : null,
    watch: replayed && r.state !== 'locked' ? { label: LABELS.watchReplay, href: r.href, title: replayed.title } : null,
  };
}

const HOUR = 3600_000;

/**
 * The session the hero shows (D-183): the one to join now (live, or inside its 15-minute window), else one
 * starting within the hour (the 1-hour reminder's, so the reminder's link lands on it and its Join appears
 * here when the window opens), else the next live build, else the next session.
 */
export function heroSession(sessions: readonly CourseSession[], now: number): CourseSession | null {
  const ahead = upcomingSessions(sessions, now).filter((s) => !s.live);
  return (
    joinableSession(sessions, now) ??
    ahead.find((s) => s.start - now <= HOUR) ??
    ahead.find((s) => s.kind === 'build') ??
    ahead[0] ??
    null
  );
}

function hero(p: CoursePayload, rows: readonly WeekRow[], now: number): HeroVM | null {
  const next = heroSession(p.sessions, now);
  if (!next) return null;
  const row = rows.find((r) => r.week === next.week);
  const join = joinVM(next, now);
  const live = join?.state === 'live';
  const parts = countParts(live ? sessionEndsAt(next) : next.start, now, true);
  const lead = join ? join.badge : SCHEDULE.next;
  const tail = `${LABELS.week} ${next.week} · ${SCHEDULE.type[typeOf(next)]}`;
  return {
    tile: dateTile(next.start),
    join,
    eyebrow: `${lead} · ${tail}`,
    eyebrowTail: tail,
    title: next.title,
    meta: [fmt.day(next.start), fmt.time(next.start), duration(next.mins), LABELS.zoom, ...(join ? [] : [SCHEDULE.joinOpens])].join(' · '),
    ics: icsEvents([next]),
    addLabel: LABELS.addToCalendar,
    see: row ? { label: SCHEDULE.seeBuild, href: row.href } : null,
    right: { label: live ? HOME.timeLeft : SCHEDULE.startsIn, icon: 'r2Jobs', parts, aria: partsAria(parts), foot: '' },
  };
}

/** The weeks view: a self-paced group first, then each month with its weeks and any break. */
function weeksView(
  p: CoursePayload,
  rows: readonly WeekRow[],
  breaks: readonly ScheduleBreak[],
  note: ReturnType<typeof holidayNote>,
  nowWeek: number | null,
  now: number,
): ScheduleVM['weeks'] {
  // The current portal's "next" row: the first session not yet over (or live). Its Join shows off, with
  // its hint, until its window opens.
  const next = [...p.sessions].sort((a, b) => a.start - b.start).find((s) => s.live || sessionEndsAt(s) > now) ?? null;
  const byWeek = new Map<number, CourseSession[]>();
  for (const s of [...p.sessions].sort((a, b) => a.start - b.start))
    byWeek.set(s.week, [...(byWeek.get(s.week) ?? []), s]);

  const selfPaced: WeekItemVM[] = [];
  const dated: { at: number; item: WeekItemVM | BreakItemVM }[] = [];
  for (const r of rows) {
    const own = byWeek.get(r.week) ?? [];
    const item = weekItem(r, own, nowWeek, now, next);
    if (!own.length) selfPaced.push(item);
    else dated.push({ at: (own.find((s) => typeOf(s) === 'live_build') ?? own[0]!).start, item });
  }
  breaks.forEach((b, i) =>
    dated.push({
      at: b.skipped[0]!,
      item: { kind: 'break', key: `break${i}`, ...breakText(b, note, breaks.length === 1) },
    }),
  );
  dated.sort((a, b) => a.at - b.at);

  const groups: GroupVM[] = selfPaced.length
    ? [{ key: 'now', label: SCHEDULE.now, meta: SCHEDULE.selfPaced, items: selfPaced }]
    : [];
  for (const d of dated) {
    const c = civilDate(d.at);
    const key = monthKey(c);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(d.item);
    else groups.push({ key, label: civilMonthName(c), meta: null, items: [d.item] });
  }
  const n = countWord(rows.length);
  return { heading: `${cap(n)} ${SCHEDULE.weeks_}`, groups };
}

/** The calendar: a month grid per month of the schedule (desk), and every session as a list (phone). */
function calendarView(
  p: CoursePayload,
  breaks: readonly ScheduleBreak[],
  note: ReturnType<typeof holidayNote>,
  now: number,
): ScheduleVM['calendar'] {
  const sessions = [...p.sessions].sort((a, b) => a.start - b.start);
  const onDay = new Map<string, (CalEventVM | CalBreakVM)[]>();
  const add = (k: string, e: CalEventVM | CalBreakVM) => onDay.set(k, [...(onDay.get(k) ?? []), e]);
  for (const s of sessions)
    add(dayKey(civilDate(s.start)), {
      kind: 'session',
      id: s.id,
      dot: dotOf(s),
      label: SCHEDULE.type[typeOf(s)],
      title: s.title,
      aria: `${s.title}, ${fmt.day(s.start)}, ${fmt.time(s.start)}`,
      href: learnWeek(s.week),
    });
  const only = breaks.length === 1;
  breaks.forEach((b, i) =>
    b.skipped.forEach((t, j) =>
      add(dayKey(civilDate(t)), {
        kind: 'break',
        key: `break${i}-${j}`,
        label: (only && note?.title) || SCHEDULE.holiday,
        line: SCHEDULE.noBuild,
      }),
    ),
  );

  const today = dayKey(civilDate(now));
  const span = scheduleMonths([...sessions.map((s) => s.start), ...breaks.flatMap((b) => b.skipped)]);
  const months = span.map((m): MonthVM => ({
    key: monthKey(m),
    label: civilMonthName(m),
    rows: monthGrid(m).map((row) =>
      row.map((c): CalCellVM => ({
        key: c.key,
        day: c.date.d,
        out: c.out,
        today: c.key === today,
        events: c.out ? [] : (onDay.get(c.key) ?? []),
      })),
    ),
  }));

  const dated: { at: number; item: AgendaSessionVM | BreakItemVM }[] = sessions.map((s) => ({
    at: s.start,
    item: {
      kind: 'session',
      id: s.id,
      tile: dateTile(s.start),
      title: s.title,
      meta: sessionMeta(s),
      href: learnWeek(s.week),
      join: joinVM(s, now),
    },
  }));
  breaks.forEach((b, i) =>
    dated.push({ at: b.skipped[0]!, item: { kind: 'break', key: `break${i}`, ...breakText(b, note, only) } }),
  );
  dated.sort((a, b) => a.at - b.at);
  const agenda: AgendaGroupVM[] = [];
  for (const d of dated) {
    const c = civilDate(d.at);
    const key = monthKey(c);
    const last = agenda[agenda.length - 1];
    if (last?.key === key) last.items.push(d.item);
    else agenda.push({ key, label: civilMonthName(c), items: [d.item] });
  }

  return {
    legend: { build: SCHEDULE.type.live_build, oh: SCHEDULE.type.office_hours },
    prev: SCHEDULE.prevMonth,
    next: SCHEDULE.nextMonth,
    days: SCHEDULE.days,
    months,
    start: openingMonth(span, now),
    agendaLabel: SCHEDULE.allSessions,
    agenda,
  };
}

/**
 * The Schedule, from the course (`GET /api/course`) and the learner's rows. `cohort` is the learner's
 * cohort from the snapshot, whose cadence line is the lede until a `schedule.subtitle` copy string says it.
 */
export function scheduleVM(
  p: CoursePayload,
  rows: readonly WeekRow[],
  cohort: Pick<Cohort, 'cadence'> | undefined,
  view: ScheduleView,
  now: number,
): ScheduleVM {
  const breaks = buildBreaks(p.sessions.map((s) => ({ type: typeOf(s), start: s.start })));
  const note = holidayNote(p.course.intro?.holiday);
  const live = liveSessionAt(p.sessions, now);
  const nowWeek = live ? live.week : (currentWeek(rows)?.week ?? null);
  return {
    title: LABELS.schedule,
    lede: p.copy?.['schedule.subtitle'] || cohort?.cadence || null,
    view,
    views: {
      label: SCHEDULE.view,
      items: [
        { key: 'weeks', label: SCHEDULE.weeks, href: learnSchedule(), on: view === 'weeks' },
        { key: 'calendar', label: SCHEDULE.calendar, href: learnSchedule('calendar'), on: view === 'calendar' },
      ],
    },
    addAll: p.sessions.length ? { label: LABELS.addAll, href: SCHEDULE_ICS_PATH } : null,
    hero: hero(p, rows, now),
    weeks: weeksView(p, rows, breaks, note, nowWeek, now),
    calendar: calendarView(p, breaks, note, now),
  };
}
