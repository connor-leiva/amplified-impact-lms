// The welcome page's two calendar files (Ampy's offer-pages brief, Nov 11): the Amplified AI
// Accelerator's Wednesday builds, and the Thursday office hours every plan is invited to.
//
//   GET /calendar/builds.ics         Accelerator buyers ("Add Builds to Calendar")
//   GET /calendar/office-hours.ics   every plan ("Add Office Hours to Calendar")
//   GET /calendar/schedule.ics       both in one file: the learner portal's Schedule, "Add all to
//                                    calendar" (D-180)
//
// SERVED, LIKE THE SPRINT'S (`ai101-calendar.ts`): a real `text/calendar` response, so iOS offers "Add to
// Calendar", folded and CRLF-joined by the same `foldLine`.
//
// CENTRAL TIME, NOT FLOATING. These are live sessions at one moment for everyone. Each DTSTART and
// DTEND carries `TZID=America/Chicago`, and the file carries that zone's VTIMEZONE, so a calendar in
// Eastern or Pacific time shows the right local hour.
//
// ONE SOURCE OF DATES: THE DATABASE (D-173). The events are cohort `dec26`'s sessions as the database
// holds them (the curriculum builder edits them; their first copy is the seed), so the files and the
// course cannot drift apart, and a session staff move moves in the files too. A build's event names
// the session's own title. No builds or office hours on Dec 23, 24, 30 or 31 because the calendar
// has none.
//
// NO JOIN LINK. No Zoom or Meet URL, and not "Zoom link TBA": the description says the link comes by
// email and is in the LMS at learn.amplifiedimpact.io once staff set it.

import { asc, eq } from 'drizzle-orm';
import { DEFAULT_COHORT_ID, acceleratorModuleId, officeHoursSessionId } from '@ai/core/accelerator';
import { sessionKind, sessionWeek } from '@ai/core';
import { SCHEDULE_ICS_PATH } from '@ai/core/schedule';
import type { Session } from '@ai/core';
import { getDb } from '../db/client';
import { modules as modulesTable, sessions as sessionsTable } from '../db/schema';
import { foldLine } from './ai101-calendar';

const CRLF = '\r\n';
const TZID = 'America/Chicago';
/** DTSTAMP is when the files were written, fixed, so identical sessions serve identical bytes. */
const DTSTAMP = '20261111T150000Z';

export const CALENDAR_ORIGIN = 'https://www.amplifiedimpact.io';
export const BUILDS_ICS_PATH = '/calendar/builds.ics';
export const OFFICE_HOURS_ICS_PATH = '/calendar/office-hours.ics';
/** D-180: both files' events in one, for the learner portal's Schedule ("Add all to calendar"). */
export { SCHEDULE_ICS_PATH };
/** What the welcome page's buttons link to: absolute, so the file downloads from www whatever the host. */
export const BUILDS_ICS_URL = `${CALENDAR_ORIGIN}${BUILDS_ICS_PATH}`;
export const OFFICE_HOURS_ICS_URL = `${CALENDAR_ORIGIN}${OFFICE_HOURS_ICS_PATH}`;

const JOIN = 'The join link comes by email and will also be in the LMS at learn.amplifiedimpact.io.';

/** RFC 5545 TEXT: backslash, semicolon and comma escaped. */
const text = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');

/** America/Chicago: CDT from the second Sunday in March, CST from the first Sunday in November. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0500',
  'TZNAME:CDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const CHICAGO = new Intl.DateTimeFormat('en-US', {
  timeZone: TZID,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** An instant as the file writes it in Central time: `YYYYMMDDTHHMMSS`. */
export function chicagoStamp(at: number): string {
  const p = Object.fromEntries(CHICAGO.formatToParts(at).map((x) => [x.type, x.value]));
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

interface CalEvent {
  uid: string;
  start: number;
  end: number;
  summary: string;
  description: string;
}

function calendar(name: string, events: readonly CalEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amplified Impact//Calendars//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${text(name)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.uid}@amplifiedimpact.io`,
      `DTSTAMP:${DTSTAMP}`,
      `DTSTART;TZID=${TZID}:${chicagoStamp(e.start)}`,
      `DTEND;TZID=${TZID}:${chicagoStamp(e.end)}`,
      `SUMMARY:${text(e.summary)}`,
      `DESCRIPTION:${text(e.description)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** A session's type: what the builder set, or, for a row from before it, build or office hours off its id. */
const typeOf = (s: Session): string => s.kind ?? (sessionKind(s) === 'build' ? 'live_build' : 'office_hours');
const endOf = (s: Session): number => s.start + s.mins * 60_000;
const byStart = (a: Session, b: Session): number => a.start - b.start;

/**
 * The cohort's builds, in date order, each named for its session's title ("Week N: <title without
 * Live Build>") and its week module's instructor, as the builder holds both.
 */
function buildEvents(sessions: readonly Session[], instructorOf: (s: Session) => string | undefined): CalEvent[] {
  return sessions
    .filter((s) => s.cohortId === DEFAULT_COHORT_ID && typeOf(s) === 'live_build')
    .sort(byStart)
    .map((s) => {
      const who = instructorOf(s);
      return {
        uid: `accelerator-build-week${sessionWeek(s)}-dec26`,
        start: s.start,
        end: endOf(s),
        summary: `Amplified AI Accelerator Live Build, Week ${sessionWeek(s)}: ${s.title.replace(/ Live Build$/, '')}`,
        description: `${s.mins} minute live build${who ? ` with ${who}` : ''}. ${JOIN}`,
      };
    });
}

/**
 * An office-hours event's UID. The series' own rows (`dec26-oh<week>`) keep the UID the welcome page's
 * file has always given them, so a calendar that already holds them updates rather than doubles. D-180:
 * any other row (Week 2 and 3's Friday office hours, `dec26-fri-oh2` and `dec26-fri-oh3`, D-176) shares
 * its week with a Thursday row, so it takes a UID of its own, from its id, instead of that row's.
 */
const officeHoursUid = (s: Session): string =>
  s.id === officeHoursSessionId(sessionWeek(s)) ? `office-hours-week${sessionWeek(s)}-dec26` : `office-hours-${s.id}`;

/**
 * The cohort's sessions that are not builds, in date order. A goal-planning session (Dec 10 and Dec 17)
 * keeps its own summary: the first is the year-end session every buyer is invited to, the second the one
 * owners' agents are invited to, and that week's office hours are a short segment of the same call.
 */
function officeHourEvents(sessions: readonly Session[]): CalEvent[] {
  const thursdays = sessions.filter((s) => s.cohortId === DEFAULT_COHORT_ID && typeOf(s) !== 'live_build').sort(byStart);
  const goals = thursdays.filter((s) => typeOf(s) === 'goal_planning');
  return thursdays.map((s) => {
    const goal = goals.indexOf(s);
    const summary =
      goal === 0
        ? 'Year-End AI Goal Planning Session'
        : goal === 1
          ? 'Second Goal Planning Session, Agents Invited'
          : 'Amplified Impact Office Hours';
    const description =
      goal === 0
        ? `Our year-end AI goal planning session, ${s.mins} minutes. Every buyer is invited. This week's office hours are a short segment of this call. ${JOIN}`
        : goal === 1
          ? `Our second goal planning session, ${s.mins} minutes. Owners' agents are invited. This week's office hours are a short segment of this call. ${JOIN}`
          : `${s.mins} minutes of office hours. Bring a real file and get help. ${JOIN}`;
    return { uid: officeHoursUid(s), start: s.start, end: endOf(s), summary, description };
  });
}

/** The builds file: the cohort's builds, in date order. */
export function buildsIcs(sessions: readonly Session[], instructorOf: (s: Session) => string | undefined = () => undefined): string {
  return calendar('Amplified AI Accelerator Live Builds', buildEvents(sessions, instructorOf));
}

/**
 * The office-hours file: the cohort's Thursdays (and any other session that is not a build), in date
 * order. Every plan downloads this one file, so the Agent Plan's and Insiders' buyers have Dec 10 in it too.
 */
export function officeHoursIcs(sessions: readonly Session[]): string {
  return calendar('Amplified Impact Office Hours', officeHourEvents(sessions));
}

/**
 * D-180: the whole schedule in one file, the learner portal's "Add all to calendar": every event of the
 * two files above, exactly as they write it (the same UID, summary and description), in date order. A
 * calendar that already holds the welcome page's files updates those events instead of adding them twice.
 */
export function scheduleIcs(sessions: readonly Session[], instructorOf: (s: Session) => string | undefined = () => undefined): string {
  return calendar(
    'Amplified AI Accelerator Schedule',
    [...buildEvents(sessions, instructorOf), ...officeHourEvents(sessions)].sort((a, b) => a.start - b.start),
  );
}

/** The files, from cohort `dec26`'s sessions and week modules as the database holds them. */
export async function calendarFiles(): Promise<{ builds: string; officeHours: string; schedule: string }> {
  const db = getDb();
  const [rows, weeks] = await Promise.all([
    db
      .select({
        id: sessionsTable.id,
        cohortId: sessionsTable.cohortId,
        n: sessionsTable.n,
        title: sessionsTable.title,
        start: sessionsTable.start,
        mins: sessionsTable.mins,
        kind: sessionsTable.kind,
        moduleId: sessionsTable.moduleId,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.cohortId, DEFAULT_COHORT_ID))
      .orderBy(asc(sessionsTable.start)),
    db.select({ id: modulesTable.id, instructor: modulesTable.instructor }).from(modulesTable).where(eq(modulesTable.kind, 'week')),
  ]);
  const sessions = rows.map(
    (r): Session => ({
      id: r.id,
      cohortId: r.cohortId,
      n: r.n,
      title: r.title,
      start: r.start,
      mins: r.mins,
      zoom: '',
      live: false,
      attended: null,
      replay: null,
      views: 0,
      ...(r.kind ? { kind: r.kind as Session['kind'] } : {}),
      ...(r.moduleId ? { moduleId: r.moduleId } : {}),
    }),
  );
  const instructor = new Map(weeks.map((m) => [m.id, m.instructor]));
  const instructorOf = (s: Session): string | undefined => instructor.get(s.moduleId ?? acceleratorModuleId(sessionWeek(s)));
  return { builds: buildsIcs(sessions, instructorOf), officeHours: officeHoursIcs(sessions), schedule: scheduleIcs(sessions, instructorOf) };
}
