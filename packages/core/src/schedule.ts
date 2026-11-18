// The learner portal v2's Schedule (D-180): what the weeks view and the calendar view compute from the
// course's sessions. Pure: no React, no clock, no fetch, no words. Every word the screen shows is data
// (the sessions, the cohort's holiday note) or generic chrome in the web app's view-model.
//
// THE HOLIDAY BREAK IS DATA. Nothing structured says "no build on Dec 23 or Dec 30": the seed's skip list
// (`HOLIDAY_SKIPS`) is seed-only, and the cohort holds the break only as words (`Cohort.course.intro.
// holiday`). So the break is read off the sessions themselves: live builds run once a week, and a gap of
// more than a week between two of them leaves out the weeks between. Move a build in the builder and the
// break moves with it; add one in the gap and the break is gone. The cohort's holiday note is what the
// screen says about it (`holidayNote`).
//
// DATES ARE THE VIEWER'S. A session's day is its day where the viewer is (`viewerZone()`, as `fmt.*`
// reads it), so a calendar cell and the session's own time line never disagree.

import type { CourseSessionRow } from './course';
import { viewerZone } from './time';
import type { SessionType } from './types';

/**
 * The whole schedule as one calendar file, served by the API's calendar route (`/calendar/*.ics`, the
 * same route as the welcome page's two files): the Schedule's "Add all to calendar".
 */
export const SCHEDULE_ICS_PATH = '/calendar/schedule.ics';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** What the schedule needs of a session. */
export type ScheduleSession = Pick<CourseSessionRow, 'id' | 'week' | 'title' | 'start' | 'mins'> & {
  type: SessionType;
};

/** A calendar day, as the viewer's wall calendar has it. */
export interface CivilDate {
  y: number;
  /** 0 to 11. */
  m: number;
  /** 1 to 31. */
  d: number;
}

const PARTS = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = PARTS.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' });
    PARTS.set(zone, f);
  }
  return f;
}

/** The day `t` falls on in the viewer's zone. */
export function civilDate(t: number): CivilDate {
  const p = Object.fromEntries(
    partsFormatter(viewerZone())
      .formatToParts(new Date(t))
      .map((x) => [x.type, x.value]),
  );
  return { y: Number(p.year), m: Number(p.month) - 1, d: Number(p.day) };
}

/** `YYYY-MM-DD`, for matching a session to its day. */
export const dayKey = (c: CivilDate): string =>
  `${c.y}-${String(c.m + 1).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`;

/** `YYYY-MM`, for matching a session to its month. */
export const monthKey = (c: Pick<CivilDate, 'y' | 'm'>): string => `${c.y}-${String(c.m + 1).padStart(2, '0')}`;

/** A month's name and year, "December 2026", for a civil month (no zone: it is already a wall date). */
export const civilMonthName = (c: Pick<CivilDate, 'y' | 'm'>): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(c.y, c.m, 15)),
  );

/** The live builds, soonest first. */
export const liveBuilds = <S extends Pick<ScheduleSession, 'type' | 'start'>>(sessions: readonly S[]): S[] =>
  sessions.filter((s) => s.type === 'live_build').sort((a, b) => a.start - b.start);

/** One break: the build slots between two builds more than a week apart, and the builds either side. */
export interface ScheduleBreak {
  /** The instants a weekly build would have had, in order. */
  skipped: number[];
  /** The last build before the break and the first after it. */
  after: number;
  before: number;
}

/**
 * The breaks in the build cadence: wherever two consecutive live builds are more than a week and a half
 * apart, the weekly slots between them. Builds a little off their weekday (a holiday-week Tuesday) are
 * not a break; a whole week with no build is.
 */
export function buildBreaks(sessions: readonly Pick<ScheduleSession, 'type' | 'start'>[]): ScheduleBreak[] {
  const builds = liveBuilds(sessions);
  const out: ScheduleBreak[] = [];
  for (let i = 1; i < builds.length; i++) {
    const after = builds[i - 1]!.start;
    const before = builds[i]!.start;
    if (before - after <= WEEK * 1.5) continue;
    const skipped: number[] = [];
    for (let t = after + WEEK; t < before - WEEK / 2; t += WEEK) skipped.push(t);
    if (skipped.length) out.push({ skipped, after, before });
  }
  return out;
}

/**
 * The cohort's holiday note, split as the screen draws it: a title and a line. A note written
 * "Holiday break: no sessions on Dec 23 or Dec 30." reads as the title "Holiday break" and the line
 * "No sessions on Dec 23 or Dec 30."; a note with no short lead-in before a colon is all line.
 */
export function holidayNote(text: string | null | undefined): { title: string | null; line: string } | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  const m = /^([^:.!?]{1,40}):\s+(\S[\s\S]*)$/.exec(t);
  if (!m) return { title: null, line: t };
  const line = m[2]!;
  return { title: m[1]!.trim(), line: line.charAt(0).toUpperCase() + line.slice(1) };
}

// --- the month grid ------------------------------------------------------------------------------

export interface MonthCell {
  date: CivilDate;
  key: string;
  /** A day of the month before or after, drawn to fill the first and last rows. */
  out: boolean;
}

/** A month as a wall calendar draws it: weeks from Sunday, each row seven days. */
export function monthGrid(month: Pick<CivilDate, 'y' | 'm'>): MonthCell[][] {
  const first = Date.UTC(month.y, month.m, 1);
  const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const lead = new Date(first).getUTCDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const rows: MonthCell[][] = [];
  for (let i = 0; i < total; i++) {
    const t = new Date(first + (i - lead) * DAY);
    const date = { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
    if (i % 7 === 0) rows.push([]);
    rows[rows.length - 1]!.push({ date, key: dayKey(date), out: date.m !== month.m || date.y !== month.y });
  }
  return rows;
}

/** Every month from the first session's to the last's, in the viewer's zone. */
export function scheduleMonths(times: readonly number[]): Pick<CivilDate, 'y' | 'm'>[] {
  if (!times.length) return [];
  const sorted = [...times].sort((a, b) => a - b);
  const a = civilDate(sorted[0]!);
  const b = civilDate(sorted[sorted.length - 1]!);
  const out: Pick<CivilDate, 'y' | 'm'>[] = [];
  let { y, m } = a;
  while (y < b.y || (y === b.y && m <= b.m)) {
    out.push({ y, m });
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

/** The month a calendar opens on: today's, inside the schedule's months, else the nearest end. */
export function openingMonth(months: readonly Pick<CivilDate, 'y' | 'm'>[], now: number): number {
  if (!months.length) return 0;
  const today = monthKey(civilDate(now));
  const i = months.findIndex((m) => monthKey(m) === today);
  if (i >= 0) return i;
  return today < monthKey(months[0]!) ? 0 : months.length - 1;
}
