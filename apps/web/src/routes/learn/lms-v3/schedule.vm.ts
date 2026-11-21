// D-227: the v3 Schedule's props (`SchedulePage`'s `schedule`), from today's `scheduleVM`, the learner's week rows
// and the course's sessions (IMPLEMENTATION-SPEC.md §7.2). Pure. The groups, their order, the breaks and every word
// of a session come from the same view-model today's page draws; what v3 adds is each row's status (B-08), each
// session line's state (B-37) and the hero's modes (B-07).
import { fmt } from '@ai/core';
import type { Learner } from '@ai/core';
import { duration, progressOn, sessionPhase } from '@ai/core/learner';
import type { CourseSession } from '../../course/Course.vm';
import { LABELS, dateTile } from '../learn.vm';
import type { WeekRow } from '../learn.vm';
import { SCHEDULE, typeOf } from '../Schedule.vm';
import type { ScheduleVM, WeekItemVM } from '../Schedule.vm';
import { learnSchedule, learnWeek } from '../routes';
import { JOIN_BEFORE_MIN, calendarOf, learnJoin, nextSessionOf } from './shell.vm';
import type { ScheduleNext, ScheduleProps, ScheduleSession, ScheduleWeekRow } from './types';
import type { SessionState } from './session';

/** The mockup's words for the Schedule that today's view-model doesn't hold. */
export const SCHEDULE_V3 = {
  liveBuild: 'Live build',
  officeHours: 'Office hours',
  due: 'Due',
  openWeek: (n: number): string => `Open Week ${n}`,
} as const;

/** A session's line state (B-37): its day until it starts, then Live now, then its replay, or Session ended. */
export function lineState(s: CourseSession, now: number): SessionState {
  const phase = sessionPhase(s, now);
  if (phase === 'live') return 'live';
  if (phase === 'ready') return 'join';
  if (phase === 'upcoming') return 'wait';
  if (typeOf(s) !== 'live_build') return 'ended';
  return phase === 'replay' ? 'replay' : 'processing';
}

/**
 * The gap rule for the Schedule (IMPLEMENTATION-SPEC.md §4.D, C-13): v3 draws only when no row needs a piece the
 * mockup doesn't have: "attended live", a session other than a live build with its recording posted ("Recording
 * Posted"), or a Join inside a row for a session that isn't the hero's. With no session left there is no hero to
 * draw either. Otherwise the whole Schedule is today's page.
 */
export function v3ScheduleDraws(vm: ScheduleVM, sessions: readonly CourseSession[], now: number): boolean {
  if (vm.view !== 'weeks') return false;
  const next = nextSessionOf(sessions, now);
  if (!next) return false;
  for (const g of vm.weeks.groups)
    for (const it of g.items) {
      if (it.kind !== 'week') continue;
      if (it.lines.some((l) => l.extra !== null || l.badge?.label === LABELS.recordingPosted)) return false;
      if (it.join && it.join.sessionId !== next.s.id) return false;
    }
  return true;
}

/** The hero: the next session (the top bar's), with its tile, words and the second button (B-07). */
export function scheduleNext(
  sessions: readonly CourseSession[],
  now: number,
  saveIcs: (s: CourseSession) => void,
): ScheduleNext | null {
  const next = nextSessionOf(sessions, now);
  if (!next) return null;
  const { s, mode } = next;
  const tile = dateTile(s.start);
  const build = s.kind === 'build';
  return {
    week: s.week,
    kind: build ? SCHEDULE_V3.liveBuild : SCHEDULE_V3.officeHours,
    title: s.title,
    day: tile.dw,
    date: tile.dd,
    when: fmt.when(s.start),
    length: duration(s.mins),
    where: LABELS.zoom,
    start: new Date(s.start).toISOString(),
    minutes: s.mins,
    joinBefore: JOIN_BEFORE_MIN,
    joinHref: learnJoin(s.id),
    weekHref: learnWeek(s.week),
    cta: build ? SCHEDULE.seeBuild : SCHEDULE_V3.openWeek(s.week),
    calendar: calendarOf(s, () => saveIcs(s)),
    mode,
  };
}

/** A week's row (B-08): its date tile (Week 0's is its due day), the outcome, its sessions, and its status. */
function weekRow(
  it: WeekItemVM,
  r: WeekRow | undefined,
  own: readonly CourseSession[],
  me: Learner | null,
  heroId: string | null,
  now: number,
): ScheduleWeekRow {
  const anchor = own.find((s) => typeOf(s) === 'live_build') ?? own[0];
  const due = r?.module?.dueAt;
  const tile: [string, string] = anchor
    ? [dateTile(anchor.start).dw, dateTile(anchor.start).dd]
    : due
      ? [SCHEDULE_V3.due, dateTile(due).dd]
      : [it.tile.dw, it.tile.dd];
  const sessions: ScheduleSession[] = own.length
    ? own.map((s) => ({
        icon: s.kind === 'build' ? 'radio' : 'users',
        title: s.title?.trim() || SCHEDULE.type[typeOf(s)],
        // The hero's session carries its time on its line when it is a live build (today's Join row became the hero:
        // UX-AUDIT, Schedule); office hours keep their day, as the mockup draws them on every clock.
        when: s.id === heroId && s.kind === 'build' ? fmt.when(s.start) : fmt.day(s.start),
        id: s.id,
        state: lineState(s, now),
        replayHref: r?.href ?? learnWeek(s.week),
      }))
    : it.lines.map((l) => ({ icon: l.key === 'due' ? 'clock' : 'users', title: l.text }));
  const locked = r?.state === 'locked';
  const deployed = !!r && !locked && !!progressOn(me, r.week)?.deployedAt;
  const done = r && !locked ? r.done : 0;
  return {
    week: it.week,
    title: r?.title ?? it.title,
    href: it.href,
    tile,
    outcome: r?.outcome ?? it.line,
    sessions,
    status: deployed ? 'done' : done > 0 ? 'progress' : 'idle',
    ...(r && !locked ? { done: r.done, total: r.total } : {}),
    next: own.some((s) => s.id === heroId),
    live: sessions.some((x) => x.state === 'live'),
  };
}

export interface ScheduleInput {
  vm: ScheduleVM;
  rows: readonly WeekRow[];
  sessions: readonly CourseSession[];
  me: Learner | null;
  now: number;
  saveIcs: (s: CourseSession) => void;
}

/** `SchedulePage`'s `schedule`, or null when v3 doesn't draw this Schedule (the gap rule). */
export function scheduleProps(x: ScheduleInput): (ScheduleProps & { next: ScheduleNext }) | null {
  if (!v3ScheduleDraws(x.vm, x.sessions, x.now)) return null;
  const next = scheduleNext(x.sessions, x.now, x.saveIcs);
  if (!next) return null;
  const heroId = nextSessionOf(x.sessions, x.now)?.s.id ?? null;
  const byWeek = new Map<number, CourseSession[]>();
  for (const s of [...x.sessions].sort((a, b) => a.start - b.start))
    byWeek.set(s.week, [...(byWeek.get(s.week) ?? []), s]);
  return {
    sub: x.vm.lede ?? '',
    title: x.vm.weeks.heading,
    calendarHref: learnSchedule('calendar'),
    calendarAllHref: x.vm.addAll?.href ?? '',
    next,
    groups: x.vm.weeks.groups.map((g) => ({
      label: g.label,
      ...(g.meta ? { note: g.meta } : {}),
      rows: g.items.map((it) =>
        it.kind === 'break'
          ? { break: it.title, text: it.line }
          : weekRow(
              it,
              x.rows.find((r) => r.week === it.week),
              byWeek.get(it.week) ?? [],
              x.me,
              heroId,
              x.now,
            ),
      ),
    })),
  };
}
