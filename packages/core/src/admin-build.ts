// The Admin redesign R2's Build screens (D-160 R2-2): their times, in one zone.
//
// ONE ZONE. BUILD-SPEC § 7: "One time-zone label: MST (America/Phoenix) everywhere." The R2 admin
// prints the program's moments in Arizona time with the one label "MST" ("Wed, Dec 2 · 12:00 PM MST"),
// never the viewer's zone and never CT, as the signed-off mockup does. This is the R2 admin's own
// formatter, beside `fmt.*` and not instead of it: `fmt.*` (viewer zone first, program zone in
// parentheses) still prints every learner screen and every admin screen not yet rebuilt on R2.
// America/Phoenix keeps no daylight saving time, so it is UTC−7 all year and "MST" is always right.

import { ADMIN_TZ } from './console-view';

/** The R2 admin's one zone label. */
export const ADMIN_ZONE = 'MST';

const inZone = (t: number, o: Intl.DateTimeFormatOptions): string =>
  // Some ICU builds put a narrow no-break space before AM/PM; the mockup has a plain one.
  new Intl.DateTimeFormat('en-US', { timeZone: ADMIN_TZ, ...o }).format(new Date(t)).replace(/\u202f/g, ' ');

/** "Wed, Dec 2". */
export const adminDay = (t: number): string => inZone(t, { weekday: 'short', month: 'short', day: 'numeric' });

/** "12:00 PM". */
export const adminTime = (t: number): string => inZone(t, { hour: 'numeric', minute: '2-digit' });

/** "Dec 14". */
export const adminMonthDay = (t: number): string => inZone(t, { month: 'short', day: 'numeric' });

/** "Wed, Dec 2 · 12:00 PM MST". */
export const adminWhen = (t: number): string => `${adminDay(t)} · ${adminTime(t)} ${ADMIN_ZONE}`;

/** A form's date (`2026-12-02`) and time (`12:00`) in MST, as the instant they name. */
export const fromAdminLocal = (date: string, time: string): number => Date.parse(`${date}T${time || '12:00'}:00-07:00`);

/** An instant as a form's MST date and time: `{ date: '2026-12-02', time: '12:00' }`. */
export function toAdminLocal(t: number): { date: string; time: string } {
  const iso = new Date(t - 7 * 3600e3).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}
