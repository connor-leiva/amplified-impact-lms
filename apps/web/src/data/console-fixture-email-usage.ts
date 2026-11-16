// The Admin Console's fixture email log and usage (D-166): what the Email Log, Usage, a workspace's
// Usage tab and a user's "Emails sent" tab read in the fixture build. FIXTURE ONLY: only
// `console-fixture.ts` imports this, and `console.ts` loads that behind `VITE_DATA_SOURCE`, so the http
// build has none of it (`console-build.test.ts`).
//
// The figures are AdminRedesign.jsx's own (`parity-r2.ts`: `EMAILS`, `USAGE_BARS` and the per-seat
// multipliers its `Usage` and `Workspace` draw with), turned into the API's shapes so the screens'
// view-models print the mockup's words from what the API answers. Three liberties, all the mockup's:
// the log keeps its order (the API's is newest first); a row's status is the mockup's delivery word
// ("Delivered"), which v1 never records; and the chart's 14 bars stand for any range.

import { addDays, daysIn, emailCsv } from '@ai/core';
import type { EmailLogFilters, EmailLogPage, EmailLogRow, UsageQuery, UsageReport } from '@ai/core';
import { planKindOf } from './console-fixture-records';
import {
  EMAILS,
  EMAIL_STATUS_OPTIONS,
  SUPPORT_USERS,
  SUPPORT_WS,
  USAGE_BARS,
  USAGE_PER_SEAT,
  USAGE_STORAGE,
  USAGE_TAB_PER_SEAT,
  mockStamp,
} from './parity-r2';

/** `EMAILS` as the API's rows, in the mockup's order. */
export function fixtureEmails(): EmailLogRow[] {
  return EMAILS.map((e, i) => ({
    id: String(i + 1),
    at: mockStamp(e.t),
    to: e.to,
    userId: SUPPORT_USERS.find((u) => u.e === e.to)?.id ?? null,
    template: e.tpl,
    subject: e.sub,
    provider: 'resend',
    providerId: `re_fixture_${i + 1}`,
    status: e.st.toLowerCase(),
    errorKind: null,
  }));
}

/** The API's filter, applied in memory. */
export function emailMatches(r: EmailLogRow, f: EmailLogFilters): boolean {
  if (f.q && !(r.to + r.subject).toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.template && r.template !== f.template) return false;
  if (f.status && r.status !== f.status.toLowerCase()) return false;
  if (f.userId) {
    const u = SUPPORT_USERS.find((x) => x.id === f.userId);
    if (r.userId !== f.userId && r.to !== u?.e) return false;
  }
  if (f.teamId) {
    const ws = SUPPORT_WS.find((w) => w.id === f.teamId);
    if (!SUPPORT_USERS.some((u) => u.ws === ws?.n && (u.id === r.userId || u.e === r.to))) return false;
  }
  if (f.ids && !f.ids.includes(r.id)) return false;
  return true;
}

export function fixtureEmailPage(rows: EmailLogRow[], f: EmailLogFilters): EmailLogPage {
  return {
    rows: rows.filter((r) => emailMatches(r, f)),
    nextCursor: null,
    templates: [...new Set(rows.map((r) => r.template))],
    statuses: EMAIL_STATUS_OPTIONS.map((s) => s.toLowerCase()),
  };
}

export const fixtureEmailCsv = (rows: EmailLogRow[], f: EmailLogFilters): { csv: string; count: number } => {
  const picked = rows.filter((r) => emailMatches(r, f));
  return { csv: emailCsv(picked), count: picked.length };
};

/**
 * `Usage`'s figures for a query: the mockup's `k` (seats in use across the workspaces it shows, never
 * a canceled one) times its multipliers. A 7-day query for one workspace is the Workspace screen's
 * Usage tab, whose own multipliers are smaller.
 */
export function fixtureUsage(q: UsageQuery, now: number): UsageReport {
  const tab = q.teamId !== undefined && daysIn(q.from, q.to) === 7;
  const rows = SUPPORT_WS.filter((w) => w.st !== 'Canceled' && (q.teamId === undefined || w.id === q.teamId) && (q.planKind === undefined || planKindOf(w.plan) === q.planKind));
  const k = rows.reduce((a, w) => a + w.used, 0);
  const per = tab ? { ...USAGE_TAB_PER_SEAT, emails: 0 } : USAGE_PER_SEAT;
  const n = daysIn(q.from, q.to);
  return {
    from: q.from,
    to: q.to,
    countingSince: '2026-11-01',
    hasData: true,
    totals: { signIns: k * per.signIns, lessonPlays: k * per.lessonPlays, guideViews: k * per.guideViews, sessionJoins: k, activeUsers: k },
    seats: { used: k, cap: rows.reduce((a, w) => a + w.cap, 0) },
    emailsSent: k * per.emails,
    storage: tab ? { bytes: k * USAGE_TAB_PER_SEAT.storageGb * 1e9, capBytes: null, asOf: now } : { ...USAGE_STORAGE, asOf: now },
    // The last day is the mockup's last bar, Dec 10.
    signInsPerDay: Array.from({ length: n }, (_, i) => ({ day: addDays(q.from, i), count: USAGE_BARS[(((i - n + USAGE_BARS.length) % USAGE_BARS.length) + USAGE_BARS.length) % USAGE_BARS.length]! })),
    workspaces: rows.map((w) => ({
      teamId: w.id,
      name: w.n,
      planKind: planKindOf(w.plan),
      seatCap: w.cap,
      seatsUsed: w.used,
      signIns: w.used * per.signIns,
      lessonPlays: w.used * per.lessonPlays,
    })),
    options: SUPPORT_WS.map((w) => ({ teamId: w.id, name: w.n })),
  };
}
