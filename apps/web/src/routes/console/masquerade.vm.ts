// Masquerade on R2 (D-162 3b, spec § 6): what the banner, the reason and blocked dialogs, the paused
// Console, `/admin/masquerade` and its entry points print. Pure; the components only render these.
//
// THE WORDS ARE THE MOCKUP'S (`Masquerade`, `LearnerView`, `ReasonModal`, the banner and the blocked
// modal in AdminRedesign.jsx), word for word. Where the spec and the mockup disagree on behaviour the
// spec wins (D-162 3b): a reason of 10 characters, not 8; the banner a region, not a status.

import { MASQUERADE_MAX_MS, MASQUERADE_REASON_MAX, MASQUERADE_REASON_MIN, adminStamp, consoleCan } from '@ai/core';
import type { ConsoleMe, MasqueradeEndReason, MasqueradeHistoryRow, MasqueradeView } from '@ai/core';

export const MASQ_COPY = {
  title: 'Masquerade',
  description: 'Sign in as a user to see exactly what they see. Owner and Admin only, time-boxed, and audit-logged.',
  start: {
    title: 'Start a session',
    user: 'User',
    cta: 'Masquerade…',
    help: 'You will be asked for a reason. You can also start from any user or workspace record.',
    locked: (role: string) =>
      `Your role (${role}) can't start masquerade. Ask an Owner or Admin, or send them the user record.`,
  },
  recent: {
    title: 'Recent sessions',
    empty: 'No masquerade sessions yet',
    asUser: 'As user',
    reason: 'Reason',
    started: 'Started',
    length: 'Length',
    ended: 'Ended',
  },
  rules: {
    title: 'Rules for every session',
    items: [
      'A written reason is required to start.',
      '15 minutes. Each extension adds 15 and needs a new reason. 60 minutes is the maximum.',
      'A banner stays on screen with the countdown and an Exit control.',
      'Every write is blocked: edits, publishes, refunds, exports, retries, notes.',
      'Start, stop, extend, and every blocked attempt go to the audit log.',
    ],
  },
  preview: {
    title: 'Not the same as Preview as Learner',
    before:
      'Preview as Learner is a read-only curriculum preview in one tab, as a generic agent or owner. It lives in ',
    link: 'Curriculum',
    after: ' and is not audit-logged.',
  },
  learnerView: {
    crumb: 'Learner view',
    title: 'No masquerade session is active',
    body: 'Start one from a user or workspace record.',
    cta: 'Go to Masquerade',
  },
  active: {
    title: 'Active session',
    signedInAs: 'Signed in as',
    reason: 'Reason',
    granted: 'Time granted',
    open: 'Open learner view',
  },
  paused: 'Console is paused while you masquerade',
  exit: 'Exit masquerade',
  blocked: {
    title: 'Blocked while masquerading',
    body: (name: string) =>
      `You are signed in as ${name}. Every write is blocked until you exit: edits, publishes, refunds, exports, retries, and notes.`,
    logged: 'This attempt was added to the audit log.',
    close: 'Close',
  },
  reason: {
    startTitle: (name: string) => `Masquerade as ${name}`,
    extendTitle: 'Extend masquerade by 15 minutes',
    body: (name: string, workspace: string | null) =>
      `You will be signed in as ${name}${workspace ? ` (${workspace})` : ''} for 15 minutes. Every write is blocked, and the session is audit-logged.`,
    label: 'Reason',
    extendLabel: 'New reason',
    placeholder: 'Ticket, or what you need to check',
    required: 'Required. Saved to the audit log with your name.',
    saved: 'Saved to the audit log with your name.',
    cancel: 'Cancel',
    start: 'Start 15-minute session',
    extend: 'Extend 15 minutes',
  },
  /** Spec § 6's live announcements (new words, D-162 3b). */
  announce: {
    five: '5 minutes left in this masquerade session.',
    one: '1 minute left in this masquerade session.',
    ended: 'This masquerade session has ended.',
  },
  region: 'Masquerade session',
  timeLeft: 'Time remaining',
  /** The entry points while D8's flag is off: the API's own sentence. */
  off: 'Masquerade is turned off.',
} as const;

// ---- the clock -----------------------------------------------------------------------------------

/** The mockup's `fmt`: whole seconds as `mm:ss`. A part-second still counts as one, so 0:00 is the end. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds left at `now` (the server's clock: the browser's plus the skew). */
export const secondsLeft = (s: Pick<MasqueradeView, 'expiresAt'>, now: number): number =>
  Math.max(0, Math.ceil((s.expiresAt - now) / 1000));

/** Whether Extend is spent: the session is at its 60-minute cap (or the server says so). */
export const atCap = (s: Pick<MasqueradeView, 'expiresAt' | 'hardExpiresAt' | 'canExtend'>): boolean =>
  !s.canExtend || s.expiresAt >= s.hardExpiresAt;

/** Minutes granted so far: 15, 30, 45 or 60. */
export const grantedMinutes = (s: Pick<MasqueradeView, 'startedAt' | 'expiresAt'>): number =>
  Math.round((s.expiresAt - s.startedAt) / 60_000);

/**
 * Spec § 6: the polite node speaks only when the countdown crosses 5:00 and 1:00, and at the end.
 * `prev` is the last second announced from (null on the first tick, which never speaks).
 */
export function announcement(prev: number | null, now: number): string | null {
  if (prev === null || now >= prev) return null;
  if (now === 0) return MASQ_COPY.announce.ended;
  if (prev > 60 && now <= 60) return MASQ_COPY.announce.one;
  if (prev > 300 && now <= 300) return MASQ_COPY.announce.five;
  return null;
}

// ---- the banner ----------------------------------------------------------------------------------

export interface BannerVM {
  who: string;
  /** "Reason: … All writes are blocked." at 768 and up; null on a phone. */
  reason: string | null;
  left: string;
  seconds: number;
  extend: { label: string; disabled: boolean; title?: string };
  exit: string;
}

/** A reason as the banner's sentence reads it: ending in a full stop, so "All writes" starts a new one. */
const sentence = (s: string): string => (/[.!?]$/.test(s) ? s : `${s}.`);

export function bannerVM(s: MasqueradeView, now: number, phone: boolean): BannerVM {
  const cap = atCap(s);
  const seconds = secondsLeft(s, now);
  return {
    who: `Masquerading as ${s.target.name}${!phone && s.target.teamName ? ` · ${s.target.teamName}` : ''}`,
    reason: phone ? null : `Reason: ${sentence(s.reason)} All writes are blocked.`,
    left: `${clockText(seconds * 1000)} left`,
    seconds,
    extend: cap
      ? { label: 'Max 60 min', disabled: true, title: '60-minute maximum reached' }
      : { label: phone ? 'Extend' : 'Extend 15 min', disabled: false },
    exit: phone ? 'Exit' : MASQ_COPY.exit,
  };
}

/** The paused Console's "Active session" card (the mockup's, on `/admin/masquerade` during a session). */
export function activeVM(s: MasqueradeView, now: number) {
  return {
    left: `${clockText(secondsLeft(s, now) * 1000)} left`,
    rows: [
      {
        label: MASQ_COPY.active.signedInAs,
        value: s.target.teamName ? `${s.target.name} · ${s.target.teamName}` : s.target.name,
      },
      { label: MASQ_COPY.active.reason, value: s.reason },
      { label: MASQ_COPY.active.granted, value: `${grantedMinutes(s)} of ${MASQUERADE_MAX_MS / 60_000} minutes` },
    ],
  };
}

// ---- the reason dialog ---------------------------------------------------------------------------

/** D7: 10 to 500 characters, trimmed (the spec's 10, not the mockup's 8). */
export function reasonCheck(text: string): { ok: boolean; help: string } {
  const n = text.trim().length;
  const ok = n >= MASQUERADE_REASON_MIN && n <= MASQUERADE_REASON_MAX;
  return { ok, help: ok ? MASQ_COPY.reason.saved : MASQ_COPY.reason.required };
}

// ---- recent sessions -----------------------------------------------------------------------------

/** How a session ended, in the mockup's words ("Exited by staff", "Expired"). */
export const END_LABELS: Readonly<Record<MasqueradeEndReason, string>> = {
  exit: 'Exited by staff',
  expired: 'Expired',
  signed_out: 'Signed out',
  revoked: 'Revoked',
};
/** A session still running. */
export const RUNNING = 'Running';

export interface HistoryRowVM {
  key: string;
  user: string;
  by: string;
  reason: string;
  started: string;
  startedAt: number;
  length: string;
  minutes: number;
  ended: string;
}

/** One row: its length runs to its end, or to its expiry when that came first, or to now. */
export function historyRowVM(r: MasqueradeHistoryRow, now: number): HistoryRowVM {
  const end = Math.min(r.endedAt ?? now, r.expiresAt);
  const minutes = Math.max(1, Math.round((end - r.startedAt) / 60_000));
  return {
    key: r.id,
    user: r.target.name ?? r.target.id,
    by: `by ${r.staff.name ?? r.staff.id}`,
    reason: r.reason,
    started: adminStamp(r.startedAt),
    startedAt: r.startedAt,
    length: `${minutes} min`,
    minutes,
    ended: r.endReason ? END_LABELS[r.endReason] : RUNNING,
  };
}

/** The picker's options: `{name} · {workspace}`, as the mockup's `<select>`. */
export const pickLabel = (u: { name: string; workspace: string | null }): string =>
  u.workspace ? `${u.name} · ${u.workspace}` : u.name;

// ---- entry points --------------------------------------------------------------------------------

export type EntryState = { show: false } | { show: true; off: string | null };

/**
 * Who sees an entry point (spec § 6): Owner and Admin (`masquerade.start`); hidden for Support and for
 * a staff target; drawn disabled, with the reason, while D8's flag is off.
 */
export function entryState(
  me: Pick<ConsoleMe, 'role' | 'masqueradeEnabled'> | null,
  targetKind: 'learner' | 'staff' = 'learner',
): EntryState {
  if (!me || targetKind !== 'learner' || !consoleCan(me.role, 'masquerade.start')) return { show: false };
  return { show: true, off: me.masqueradeEnabled ? null : MASQ_COPY.off };
}
