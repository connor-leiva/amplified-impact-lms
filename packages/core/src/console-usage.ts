// The Admin Console's email log and usage counts, PR 7 (D-166, spec §§ 7.7, 7.15). Pure: the API
// writes and reads with these, and the Email Log, Usage, a workspace's Usage tab and a user's "Emails
// sent" tab print from them.
//
// THE EMAIL LOG keeps one row per `send()` (apps/api/src/email/transport.ts), written after it: who it
// went to, the template, the subject, the provider and its id, and what happened. Never the body. v1
// has no delivery events (no webhook from Resend), so a row says only whether the send went out:
//   sent     production, and Resend accepted it
//   failed   the send failed (in any mode), with an `error_kind`, never the error's words
//   skipped  test or development: nothing left the server (the outbox, or a log line)
//
// USAGE is counted per program-zone day (`PROGRAM_TZ`, America/Chicago), per learner and kind:
// sign-ins, guide views and session joins. Nothing estimates a figure. Lesson plays have no request
// to count yet (replays stream from a playback URL, phase 08 § 8.3, never through the API), so the
// API answers them as null and the screens say "Unavailable".

import { PROGRAM_TZ } from './constants';
import type { AdminStatus } from './console-view';
import type { PlanKind } from './offer';
import { toCsv } from './console';

// ================================================================================================
// Retention and limits (D6, spec § 7)
// ================================================================================================

export const EMAIL_LOG_RETENTION_DAYS = 180;
export const USAGE_RETENTION_DAYS = 400;
/** `GET /api/console/usage` answers at most this many days at once. */
export const USAGE_MAX_DAYS = 400;
export const DAY_MS = 86_400_000;

// ================================================================================================
// The email log
// ================================================================================================

export const EMAIL_STATUSES = ['sent', 'failed', 'skipped'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];
export const isEmailStatus = (v: unknown): v is EmailStatus => typeof v === 'string' && (EMAIL_STATUSES as readonly string[]).includes(v);

/** Where a send went: Resend in production, the test outbox, or the development log line. */
export const EMAIL_PROVIDERS = ['resend', 'outbox', 'log'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

/** Why a send failed, as a kind. The error's own words are never stored (they can hold an address). */
export const EMAIL_ERROR_KINDS = ['invalid_recipient', 'subject', 'render', 'config', 'provider'] as const;
export type EmailErrorKind = (typeof EMAIL_ERROR_KINDS)[number];

/** The kind of a `SendResult.error`, from the transport's own messages. */
export function emailErrorKind(error: string): EmailErrorKind {
  if (error.startsWith('"to"')) return 'invalid_recipient';
  if (error.startsWith('subject builder threw') || error === 'subject is empty') return 'subject';
  if (error.startsWith('template render threw')) return 'render';
  if (/^(RESEND_API_KEY|EMAIL_FROM) is not set$/.test(error) || error === 'No template renderer is registered') return 'config';
  return 'provider';
}

/** One row of the log, as the API sends it. Times are epoch ms. */
export interface EmailLogRow {
  id: string;
  at: number;
  to: string;
  userId: string | null;
  template: string;
  subject: string;
  provider: string;
  providerId: string | null;
  /** `EmailStatus` in production. The fixture draws the mockup's delivery words ("Delivered"). */
  status: string;
  errorKind: string | null;
}

/** The list's filters, as the query string and the export body carry them. */
export interface EmailLogFilters {
  /** Words in the recipient or the subject. */
  q?: string;
  template?: string;
  status?: string;
  /** One person's emails: their user id, or their address. */
  userId?: string;
  /** One workspace's emails: to any of its people, by id or address (Billing's "Open email log"). */
  teamId?: string;
  /** Epoch ms, inclusive. */
  from?: number;
  to?: number;
  /** "Export selected": these rows only. */
  ids?: string[];
}

/** A page of the log, with the filter's options. */
export interface EmailLogPage {
  rows: EmailLogRow[];
  nextCursor: string | null;
  /** The Template filter's options: every template in the log. */
  templates: string[];
  /** The Status filter's options. */
  statuses: string[];
}

export const EMAIL_IDS_MAX = 500;
export const EMAIL_SUBJECT_MAX = 300;
export const EMAIL_TO_MAX = 320;

export const EMAIL_CSV_HEADER = ['id', 'sent_at', 'to', 'user_id', 'template', 'subject', 'provider', 'provider_id', 'status', 'error_kind'] as const;
const iso = (t: number | null): string => (t === null ? '' : new Date(t).toISOString());
export const emailCsvCells = (r: EmailLogRow): unknown[] => [r.id, iso(r.at), r.to, r.userId, r.template, r.subject, r.provider, r.providerId, r.status, r.errorKind];
export const emailCsv = (rows: readonly EmailLogRow[]): string => toCsv([[...EMAIL_CSV_HEADER], ...rows.map(emailCsvCells)]);

const EMAIL_STATUS_WORDS: Readonly<Record<string, AdminStatus>> = {
  sent: { label: 'Sent', tone: 'ok' },
  failed: { label: 'Failed', tone: 'bad' },
  skipped: { label: 'Skipped', tone: 'off' },
  // Delivery events, which v1 does not record (spec § 7.15). The fixture draws the mockup's.
  delivered: { label: 'Delivered', tone: 'ok' },
  opened: { label: 'Opened', tone: 'ok' },
  queued: { label: 'Queued', tone: 'info' },
  bounced: { label: 'Bounced', tone: 'bad' },
};

/** A status as a word and a tone (the mockup's `TONE`), never a colour alone. */
export const emailStatusOf = (s: string): AdminStatus => EMAIL_STATUS_WORDS[s.toLowerCase()] ?? { label: s, tone: 'neutral' };

export const EMAIL_PROVIDER_LABELS: Readonly<Record<string, string>> = { resend: 'Resend', outbox: 'Test outbox', log: 'Development log' };
export const EMAIL_ERROR_LABELS: Readonly<Record<EmailErrorKind, string>> = {
  invalid_recipient: 'The address isn’t valid',
  subject: 'The subject didn’t build',
  render: 'The template didn’t render',
  config: 'Email isn’t set up on this server',
  provider: 'Resend refused it',
};

// ================================================================================================
// Usage
// ================================================================================================

export const USAGE_KINDS = ['sign_in', 'lesson_play', 'guide_view', 'session_join'] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day, written `YYYY-MM-DD`. */
export function isDay(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DAY.exec(v);
  if (!m) return false;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(t).toISOString().slice(0, 10) === v;
}

const dayParts = (t: number, tz: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(t))
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute), s: Number(p.second) };
};

/** The program-zone day a moment falls on: `2026-12-10`. */
export function programDay(t: number): string {
  const p = dayParts(t, PROGRAM_TZ);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** A day `n` days after (or before) another, by the calendar. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** How many days `from` to `to` covers, both included (0 when `to` is earlier). */
export function daysIn(from: string, to: string): number {
  const at = (s: string) => Date.parse(`${s}T00:00:00Z`);
  return Math.max(0, Math.round((at(to) - at(from)) / DAY_MS) + 1);
}

/** Every day from `from` to `to`, in order. */
export const dayList = (from: string, to: string): string[] => Array.from({ length: daysIn(from, to) }, (_, i) => addDays(from, i));

const offsetAt = (t: number, tz: string): number => {
  const p = dayParts(t, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(t / 1000) * 1000;
};

/** The moment a program-zone day starts (its midnight), as epoch ms. */
export function programDayStart(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetAt(guess, PROGRAM_TZ);
  return guess - offsetAt(first, PROGRAM_TZ);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 27": a day, as the chart's axis prints it. */
export const dayLabel = (day: string): string => {
  const [, m, d] = day.split('-').map(Number) as [number, number, number];
  return `${MONTHS[m - 1]} ${d}`;
};

/** "Nov 16, 2026": a day, in full. */
export const dayLabelLong = (day: string): string => `${dayLabel(day)}, ${day.slice(0, 4)}`;

/** The Usage screen's ranges, the mockup's three. */
export const USAGE_RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
] as const;

/** The days a "last n days" range covers, ending today (program zone). */
export function lastDays(n: number, now: number): { from: string; to: string } {
  const to = programDay(now);
  return { from: addDays(to, -(n - 1)), to };
}

/** `GET /api/console/usage`'s query. */
export interface UsageQuery {
  from: string;
  to: string;
  teamId?: string;
  planKind?: PlanKind;
}

/** One workspace's row in the By-workspace table. */
export interface UsageWorkspaceRow {
  teamId: string;
  name: string;
  planKind: PlanKind | null;
  /** The team's seats (`teams.seats`): the cap, and the Team Plan's size. */
  seatCap: number;
  /** Members on the team (invited included), as the Workspaces list counts them. */
  seatsUsed: number;
  signIns: number;
  /** Null: no source yet (see the header). */
  lessonPlays: number | null;
}

/** What `GET /api/console/usage` answers. */
export interface UsageReport {
  from: string;
  to: string;
  /** The first day anything was counted, or today when nothing has been yet. */
  countingSince: string;
  /** Whether anything has ever been counted. */
  hasData: boolean;
  totals: {
    signIns: number;
    /** Null: no source yet. */
    lessonPlays: number | null;
    guideViews: number;
    sessionJoins: number;
    /** Distinct learners with anything counted in the range. */
    activeUsers: number;
  };
  /** Seat utilization's source: members of, and seats on, the running workspaces in scope. */
  seats: { used: number; cap: number };
  /** Rows of the email log with status `sent` in the range (and the scope, when filtered). */
  emailsSent: number;
  /** The storage bucket's size, read at most once an hour; null when it can't be read. */
  storage: { bytes: number; capBytes: number | null; asOf: number } | null;
  signInsPerDay: { day: string; count: number }[];
  workspaces: UsageWorkspaceRow[];
  /** The Workspace filter's options. */
  options: { teamId: string; name: string }[];
}

/** Seat utilization, a whole percent; null with no seats. */
export const seatUtilization = (used: number, cap: number): number | null => (cap > 0 ? Math.round((used / cap) * 100) : null);

/** A chart's ceiling: the smallest of 1, 2, 2.5 or 5 × 10ⁿ at or above `max`. */
export function niceCeiling(max: number): number {
  if (!(max > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Storage as the tile prints it: "41.2 GB", "0.4 GB" (decimal units, as a bucket bills). */
export function storageLabel(bytes: number): string {
  if (bytes >= 1e8) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e5) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

/** A bucket's size limit, as the tile's line under the figure prints it: "100 GB". */
export const storageCapLabel = (bytes: number): string => storageLabel(bytes).replace(/\.0 /, ' ');
