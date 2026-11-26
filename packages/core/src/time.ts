// Time: viewer zone first, program zone (CT) in parentheses; in the learner portal with LMS v3 on, MT / CT (D-259).
// Ported verbatim from design-reference/lms-data.js lines 134-188.
// The only deviation is that `zoneAbbr` cannot fall back to Date.now() (packages/core is pure),
// so its `t` argument defaults to 0. Every call site in the reference passes a real `t`.

import { PROGRAM_TZ } from './constants';

let VIEW_TZ: string | null = null;

export function setViewerZone(z: string | null | undefined): void {
  VIEW_TZ = z || null;
}

export const autoZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || PROGRAM_TZ;
  } catch {
    return PROGRAM_TZ;
  }
};

export const viewerZone = (): string => VIEW_TZ || autoZone();

/**
 * D-259: how a time reads. `'viewer'` is the reference's rule above (the viewer's zone first, the program's in
 * parentheses), and the admin console's. `'mtct'` is the learner portal's once LMS v3 is on (Connor, Nov 25: "Times
 * everywhere in the learner portal use one line: '12:00 PM MT / 1:00 PM CT'"): Mountain then Central, each read off
 * the instant, whatever the viewer's zone, and every date Mountain Time's. The web app's root sets it per page
 * (`apps/web/src/lib/timeStyle.ts`); nothing else does, so the API and every test keep `'viewer'`.
 */
export type TimeStyle = 'viewer' | 'mtct';

let STYLE: TimeStyle = 'viewer';

export function setTimeStyle(s: TimeStyle): void {
  STYLE = s;
}

export const timeStyle = (): TimeStyle => STYLE;

/** Mountain Time, the zone the course's copy names first (D-175, D-250). */
export const MOUNTAIN_TZ = 'America/Denver';

export const ZONES: [string, string][] = [
  ['', 'Auto'],
  ['America/New_York', 'Eastern'],
  ['America/Chicago', 'Central'],
  ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'],
  ['America/Los_Angeles', 'Pacific'],
  ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'],
];

const ABBR: Record<string, string> = {
  'America/New_York': 'ET',
  'America/Detroit': 'ET',
  'America/Toronto': 'ET',
  'America/Indiana/Indianapolis': 'ET',
  'America/Kentucky/Louisville': 'ET',
  'America/Chicago': 'CT',
  'America/Winnipeg': 'CT',
  'America/Indiana/Knox': 'CT',
  'America/Menominee': 'CT',
  'America/Denver': 'MT',
  'America/Edmonton': 'MT',
  'America/Boise': 'MT',
  'America/Phoenix': 'MST',
  'America/Los_Angeles': 'PT',
  'America/Vancouver': 'PT',
  'America/Anchorage': 'AKT',
  'Pacific/Honolulu': 'HT',
};

export function zoneAbbr(z: string, t = 0): string {
  const known = ABBR[z];
  if (known) return known;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'short' })
      .formatToParts(new Date(t || 0))
      .find((p) => p.type === 'timeZoneName')!.value;
  } catch {
    return '';
  }
}

export const zoneLabel = (z: string | null | undefined): string => {
  const f = z && ZONES.find((x) => x[0] === z);
  return f ? f[1] : (z || '').split('/').pop()!.replace(/_/g, ' ');
};

const tOf = (t: number, z: string): string =>
  new Date(t).toLocaleTimeString('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit' });

const dOf = (t: number, z: string, o: Intl.DateTimeFormatOptions): string =>
  new Date(t).toLocaleDateString('en-US', { timeZone: z, ...o });

const sameClock = (t: number, a: string, b: string): boolean =>
  tOf(t, a) === tOf(t, b) && dOf(t, a, { day: 'numeric' }) === dOf(t, b, { day: 'numeric' });

/**
 * D-259: "12:00 PM MT / 1:00 PM CT", one instant in Mountain and then Central Time, each zone's own clock (so each
 * zone's daylight saving is its own), as D-250's emails print it. Where Central's clock falls on another day, its day
 * comes with it: "11:30 PM MT / Thu, Dec 3, 12:30 AM CT".
 */
export function mtCtTime(t: number): string {
  const day = { weekday: 'short', month: 'short', day: 'numeric' } as const;
  const ct = `${tOf(t, PROGRAM_TZ)} ${zoneAbbr(PROGRAM_TZ, t)}`;
  const ctDay = dOf(t, PROGRAM_TZ, day);
  return `${tOf(t, MOUNTAIN_TZ)} MT / ${ctDay === dOf(t, MOUNTAIN_TZ, day) ? ct : `${ctDay}, ${ct}`}`;
}

/** The zone a date is read in: the viewer's, or Mountain Time's in the learner portal (D-259). */
const dayZone = (): string => (STYLE === 'mtct' ? MOUNTAIN_TZ : viewerZone());

export interface Fmt {
  date: (t: number) => string;
  day: (t: number) => string;
  dayPlain: (t: number) => string;
  weekday: (t: number) => string;
  /** "Thu", the viewer's weekday, short (D-229: the form's "Saved Thu 4:02 PM"). */
  weekdayShort: (t: number) => string;
  /**
   * "4:02 PM", the viewer's clock time with no zone (D-229: the form's save and submit stamps, as the mockup prints
   * them). In the learner portal with LMS v3 on (D-259), the one line, "4:02 PM MT / 5:02 PM CT", as every time there.
   */
  clockTime: (t: number) => string;
  time: (t: number) => string;
  timeOnly: (t: number) => string;
  when: (t: number) => string;
  abs: (t: number) => string;
  clock: (s: number) => string;
  money: (n: number) => string;
  num: (n: number) => string;
  pct: (n: number) => string;
  ago: (t: number, now: number) => string;
  /**
   * D-231 (B-30): a Community thread's activity, in the mockup's words: "just now" (lowercase: the mockup's list writes
   * `ui.justNow.toLowerCase()` after "No replies yet · "), "12 min ago", "3 hr ago", "1 day ago", "2 days ago"; after a
   * week, the date.
   */
  activity: (t: number, now: number) => string;
  agoInline: (t: number, now: number) => string;
  until: (t: number, now: number) => string;
  initials: (n: string | null | undefined) => string;
  isoDate: (t: number) => string;
  isoTime: (t: number) => string;
  fromCT: (date: string, time?: string) => number;
  /**
   * D-255 (R-5 Phase 3, PLAN.md § 10.8): the admin's cohort times, in Mountain Time with Central after it on one line.
   * `mtDay` "Wed, Dec 9" (Mountain's day), `mtDate` "Mon, May 10, 2027", `mtTime` "12:00 PM MT", `mtCt` "12:00 PM MT /
   * 1:00 PM CT", `mtWhen` "Wed, Dec 9 · 12:00 PM MT / 1:00 PM CT". Each zone's own daylight saving, from the instant.
   */
  mtDay: (t: number) => string;
  mtDate: (t: number) => string;
  mtTime: (t: number) => string;
  mtCt: (t: number) => string;
  mtWhen: (t: number) => string;
}

const MT_ZONE = 'America/Denver';
const CT_ZONE = 'America/Chicago';

export const fmt: Fmt = {
  date: (t) => dOf(t, dayZone(), { month: 'short', day: 'numeric' }),
  day: (t) => dOf(t, dayZone(), { weekday: 'short', month: 'short', day: 'numeric' }),
  dayPlain: (t) =>
    dOf(t, dayZone(), { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  weekday: (t) => dOf(t, dayZone(), { weekday: 'long' }),
  weekdayShort: (t) => dOf(t, dayZone(), { weekday: 'short' }),
  clockTime: (t) => (STYLE === 'mtct' ? mtCtTime(t) : tOf(t, viewerZone())),
  time: (t) => {
    if (STYLE === 'mtct') return mtCtTime(t);
    const v = viewerZone(),
      prog = `${tOf(t, PROGRAM_TZ)} ${zoneAbbr(PROGRAM_TZ, t)}`;
    return sameClock(t, v, PROGRAM_TZ) ? prog : `${tOf(t, v)} ${zoneAbbr(v, t)} (${prog})`;
  },
  timeOnly: (t) => (STYLE === 'mtct' ? mtCtTime(t) : `${tOf(t, viewerZone())} ${zoneAbbr(viewerZone(), t)}`),
  when: (t) => `${fmt.day(t)} · ${fmt.time(t)}`,
  abs: (t) =>
    `${dOf(t, dayZone(), { month: 'short', day: 'numeric', year: 'numeric' })}, ${fmt.time(t)}`,
  clock: (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      x = s % 60;
    return (
      (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0')
    );
  },
  money: (n) => '$' + Math.round(n).toLocaleString('en-US'),
  num: (n) => Math.round(n).toLocaleString('en-US'),
  pct: (n) => Math.round(n * 100) + '%',
  ago: (t, now) => {
    const d = (now - t) / 60000;
    if (d < 0) return fmt.until(t, now);
    if (d < 1) return 'Just now';
    if (d < 60) return `${Math.floor(d)} min ago`;
    if (d < 1440) {
      const h = Math.floor(d / 60);
      return `${h} hour${h === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(d / 1440);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 28) {
      const w = Math.floor(days / 7);
      return `${w} week${w === 1 ? '' : 's'} ago`;
    }
    return fmt.date(t);
  },
  activity: (t, now) => {
    const m = Math.max(0, (now - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${Math.floor(m)} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const days = Math.max(1, Math.floor(m / 1440));
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    return fmt.date(t);
  },
  agoInline: (t, now) => {
    const s = fmt.ago(t, now);
    return /^[A-Z][a-z]{2} \d/.test(s) ? 'on ' + s : s.charAt(0).toLowerCase() + s.slice(1);
  },
  until: (t, now) => {
    const d = (t - now) / 60000;
    if (d < 60) return `in ${Math.max(1, Math.round(d))} min`;
    if (d < 1440) {
      const h = Math.round(d / 60);
      return `in ${h} hour${h === 1 ? '' : 's'}`;
    }
    const days = Math.round(d / 1440);
    return days === 1 ? 'tomorrow' : `in ${days} days`;
  },
  initials: (n) =>
    (n || '?')
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  isoDate: (t) => new Date(t - 6 * 3600e3).toISOString().slice(0, 10),
  isoTime: (t) => new Date(t - 6 * 3600e3).toISOString().slice(11, 16),
  fromCT: (date, time) => Date.parse(`${date}T${time || '13:00'}:00-06:00`),
  mtDay: (t) => dOf(t, MT_ZONE, { weekday: 'short', month: 'short', day: 'numeric' }),
  mtDate: (t) => dOf(t, MT_ZONE, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  mtTime: (t) => `${tOf(t, MT_ZONE)} MT`,
  mtCt: (t) => {
    const mt = dOf(t, MT_ZONE, { day: 'numeric' });
    const ct = dOf(t, CT_ZONE, { day: 'numeric' });
    return `${tOf(t, MT_ZONE)} MT / ${mt === ct ? '' : `${dOf(t, CT_ZONE, { weekday: 'short', month: 'short', day: 'numeric' })}, `}${tOf(t, CT_ZONE)} CT`;
  },
  mtWhen: (t) => `${fmt.mtDay(t)} · ${fmt.mtCt(t)}`,
};
