// Time: viewer zone first, program zone (CT) in parentheses.
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

export interface Fmt {
  date: (t: number) => string;
  day: (t: number) => string;
  dayPlain: (t: number) => string;
  weekday: (t: number) => string;
  /** "Thu", the viewer's weekday, short (D-229: the form's "Saved Thu 4:02 PM"). */
  weekdayShort: (t: number) => string;
  /** "4:02 PM", the viewer's clock time with no zone (D-229: the form's save and submit stamps, as the mockup prints them). */
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
}

export const fmt: Fmt = {
  date: (t) => dOf(t, viewerZone(), { month: 'short', day: 'numeric' }),
  day: (t) => dOf(t, viewerZone(), { weekday: 'short', month: 'short', day: 'numeric' }),
  dayPlain: (t) =>
    dOf(t, viewerZone(), { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ''),
  weekday: (t) => dOf(t, viewerZone(), { weekday: 'long' }),
  weekdayShort: (t) => dOf(t, viewerZone(), { weekday: 'short' }),
  clockTime: (t) => tOf(t, viewerZone()),
  time: (t) => {
    const v = viewerZone(),
      prog = `${tOf(t, PROGRAM_TZ)} ${zoneAbbr(PROGRAM_TZ, t)}`;
    return sameClock(t, v, PROGRAM_TZ) ? prog : `${tOf(t, v)} ${zoneAbbr(v, t)} (${prog})`;
  },
  timeOnly: (t) => `${tOf(t, viewerZone())} ${zoneAbbr(viewerZone(), t)}`,
  when: (t) => `${fmt.day(t)} · ${fmt.time(t)}`,
  abs: (t) =>
    `${dOf(t, viewerZone(), { month: 'short', day: 'numeric', year: 'numeric' })}, ${fmt.time(t)}`,
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
};
