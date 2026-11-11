// The welcome page's two calendar files (Ampy's offer-pages brief, Nov 11): the Amplified AI
// Accelerator's eight Wednesday builds, and the eight Thursday office hours every plan is invited to.
//
//   GET /calendar/builds.ics         Accelerator buyers ("Add Builds to Calendar")
//   GET /calendar/office-hours.ics   every plan ("Add Office Hours to Calendar")
//
// SERVED, LIKE THE SPRINT'S (`ai101-calendar.ts`): a real `text/calendar` response, so iOS offers "Add to
// Calendar", folded and CRLF-joined by the same `foldLine`.
//
// CENTRAL TIME, NOT FLOATING. These are live sessions at one moment for everyone: 1:00 PM Central.
// Each DTSTART and DTEND carries `TZID=America/Chicago`, and the file carries that zone's VTIMEZONE,
// so a calendar in Eastern or Pacific time shows the right local hour.
//
// ONE SOURCE OF DATES. The events are `ACCELERATOR_CALENDAR` (the course's locked calendar, D-110), the
// same rows the LMS's sessions are built from, so the files and the course cannot drift apart. No builds
// or office hours on Dec 23, 24, 30 or 31 because the calendar has none.
//
// NO JOIN LINK. No Zoom or Meet URL, and not "Zoom link TBA": the description says the link comes by
// email and is in the LMS at learn.amplifiedimpact.io once staff set it.

import { ACCELERATOR_CALENDAR, GOAL_PLANNING_WEEKS } from '@ai/core/accelerator';
import { foldLine } from './ai101-calendar';

const CRLF = '\r\n';
const TZID = 'America/Chicago';
/** DTSTAMP is when the files were written, fixed, so every request serves identical bytes. */
const DTSTAMP = '20261111T150000Z';
/** 1:00 PM Central: the builds' and the office hours' start (the course's `SESSION_TIME_CT`). */
const START = '130000';
const BUILD_END = '143000'; // 90 minutes
const OFFICE_HOURS_END = '140000'; // 60 minutes

export const CALENDAR_ORIGIN = 'https://www.amplifiedimpact.io';
export const BUILDS_ICS_PATH = '/calendar/builds.ics';
export const OFFICE_HOURS_ICS_PATH = '/calendar/office-hours.ics';
/** What the welcome page's buttons link to: absolute, so the file downloads from www whatever the host. */
export const BUILDS_ICS_URL = `${CALENDAR_ORIGIN}${BUILDS_ICS_PATH}`;
export const OFFICE_HOURS_ICS_URL = `${CALENDAR_ORIGIN}${OFFICE_HOURS_ICS_PATH}`;

const JOIN = 'The join link comes by email and will also be in the LMS at learn.amplifiedimpact.io.';

/** RFC 5545 TEXT: backslash, semicolon and comma escaped. */
const text = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
const day = (iso: string): string => iso.replace(/-/g, '');

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

interface CalEvent {
  uid: string;
  date: string;
  end: string;
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
      `DTSTART;TZID=${TZID}:${day(e.date)}T${START}`,
      `DTEND;TZID=${TZID}:${day(e.date)}T${e.end}`,
      `SUMMARY:${text(e.summary)}`,
      `DESCRIPTION:${text(e.description)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** The eight Wednesday builds, 90 minutes from 1:00 PM Central, with Connor Leiva. */
export const BUILDS_ICS = calendar(
  'Amplified AI Accelerator Live Builds',
  ACCELERATOR_CALENDAR.map((w) => {
    const skill = w.buildTitle.replace(/ Live Build$/, '');
    return {
      uid: `accelerator-build-week${w.week}-dec26`,
      date: w.build,
      end: BUILD_END,
      summary: `Amplified AI Accelerator Live Build, Week ${w.week}: ${skill}`,
      description: `90 minute live build with Connor Leiva. ${JOIN}`,
    };
  }),
);

/**
 * The eight Thursdays, 60 minutes from 1:00 PM Central. Dec 10 and Dec 17 are the goal-planning
 * sessions, on the same hour: that week's office hours are a short segment of the same call, not a
 * second hour. Every plan downloads this one file, so the Agent Plan's and Insiders' buyers have
 * Dec 10 (every buyer is invited) in it too.
 */
export const OFFICE_HOURS_ICS = calendar(
  'Amplified Impact Office Hours',
  ACCELERATOR_CALENDAR.map((w) => {
    const goal = GOAL_PLANNING_WEEKS.indexOf(w.week);
    const summary =
      goal === 0
        ? 'Year-End AI Goal Planning Session'
        : goal === 1
          ? 'Second Goal Planning Session, Agents Invited'
          : 'Amplified Impact Office Hours';
    const description =
      goal === 0
        ? `Our year-end AI goal planning session, 60 minutes. Every buyer is invited. This week's office hours are a short segment of this call. ${JOIN}`
        : goal === 1
          ? `Our second goal planning session, 60 minutes. Owners' agents are invited. This week's office hours are a short segment of this call. ${JOIN}`
          : `60 minutes of office hours. Bring a real file and get help. ${JOIN}`;
    return { uid: `office-hours-week${w.week}-dec26`, date: w.thursday, end: OFFICE_HOURS_END, summary, description };
  }),
);
