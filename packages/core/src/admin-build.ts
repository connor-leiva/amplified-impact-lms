// The Admin redesign R2's Build screens (D-160 R2-2): their times, in one zone.
//
// ONE ZONE. BUILD-SPEC § 7 set it to MST (America/Phoenix), with the label "MST". R-5 audit (D-267, Connor, Nov 26:
// "Every admin time via the MT / CT formatter; remove ADMIN_ZONE 'MST' output"; ADMIN-RESTRUCTURE-SPEC § 4 rule 3, PLAN.md
// § 2.12 and § 10.8): the admin's zone is MT (America/Denver), and a time that names its zone is printed on one line in
// MT with CT after it, "12:00 PM MT / 1:00 PM CT", through `fmt.mtCt` (D-259's `mtCtTime`, the learner portal's own);
// an event's stamp (an email sent, an incident opened) names MT alone, through `fmt.mtTime` (spec § 4 rule 3).
// Between November and March MT and MST are the same hour, so December reads the same; from mid-March MT is an hour
// later. `scripts/check-admin-zone.mjs` fails on "MST" in the admin's output.

import { ADMIN_TZ } from './console-view';
import { zonedInputs, zonedInstant } from './course-actions';
import { fmt } from './time';

const inZone = (t: number, o: Intl.DateTimeFormatOptions): string =>
  // Some ICU builds put a narrow no-break space before AM/PM; the mockup has a plain one.
  new Intl.DateTimeFormat('en-US', { timeZone: ADMIN_TZ, ...o }).format(new Date(t)).replace(/\u202f/g, ' ');

/** "Wed, Dec 2". */
export const adminDay = (t: number): string => inZone(t, { weekday: 'short', month: 'short', day: 'numeric' });

/** "12:00 PM". */
export const adminTime = (t: number): string => inZone(t, { hour: 'numeric', minute: '2-digit' });

/** "Dec 14". */
export const adminMonthDay = (t: number): string => inZone(t, { month: 'short', day: 'numeric' });

/** "Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT" (D-267: through `fmt.mtCt`). */
export const adminWhen = (t: number): string => `${adminDay(t)} · ${fmt.mtCt(t)}`;

/**
 * "Dec 10, 8:58 AM MT": an event's stamp that names its zone, as a record's detail prints it (D-267). An event is staff's
 * (an email sent, an incident opened), so it names MT alone (`fmt.mtTime`); Central follows a time learners see (spec § 4
 * rule 3), as `adminWhen` prints it.
 */
export const adminStampZoned = (t: number): string => `${adminMonthDay(t)}, ${fmt.mtTime(t)}`;

/** A form's date (`2026-12-02`) and time (`12:00`) in MT, as the instant they name. NaN when malformed or not a real day. */
export function fromAdminLocal(date: string, time: string): number {
  const hhmm = time || '12:00';
  const t = zonedInstant(date, hhmm, ADMIN_TZ);
  if (Number.isNaN(t)) return t;
  // "2026-13-45" names no day: it would roll over into another, so it is refused as malformed.
  const back = zonedInputs(t, ADMIN_TZ);
  return back.date === date && back.time === hhmm ? t : NaN;
}

/** An instant as a form's MT date and time: `{ date: '2026-12-02', time: '12:00' }`. */
export function toAdminLocal(t: number): { date: string; time: string } {
  return zonedInputs(t, ADMIN_TZ);
}
