// The Admin Announcements view-model — SCREENS § 4.7, phase 06 § 6.1.
//
// A pure port of `renderVals()` in design-reference/Admin Announcements.dc.html. No React, no
// hooks, no clock read: the snapshot and the composer's local state come in, strings and flags come
// out. The reference declares `now` in `renderVals()` but never reads it there — every time this
// screen shows is absolute (`fmt.date` + `fmt.time` of the row's own `at`) and the preview's stamp
// is the literal `Just now` — so this function takes no `now`. `Announcements.vm.test.ts` pins that.
//
// phase 06 § 6.2: the `Reaches …` figure is an analytics number and adds `db.base`, the aggregate
// for the ~134 learners the fixture does not model individually, exactly as the reference does:
//
//     all    = base.learners  + every non-invited learner
//     agent  = base.agent     + the modelled Agent-tier learners
//     team   = base.teamSeats + the modelled Team-tier seats
//     owners = base.teams     + db.teams.length
//
// In http mode the API returns `ZERO_BASE`, so the same arithmetic shows live numbers. Nothing here
// branches on where the snapshot came from.

import { adminStamp, fmt, fromAdminLocal, toAdminLocal } from '@ai/core';
import type { Announcement, Db } from '@ai/core';

// ---------------------------------------------------------------------------------------------
// The composer's form
// ---------------------------------------------------------------------------------------------

export type AnnounceAudience = Announcement['audience'];
export type AnnounceSeverity = Announcement['severity'];
/** `''` is the reference's `None`: the banner gets no action button. */
export type AnnounceAction = NonNullable<Announcement['action']> | '';
export type AnnounceWhen = 'now' | 'later';
export type AnnounceChannel = 'inapp' | 'email';

export interface AnnouncementForm {
  title: string;
  body: string;
  audience: AnnounceAudience;
  inapp: boolean;
  email: boolean;
  when: AnnounceWhen;
  /** The `datetime-local` value, read as Central Time when sending. */
  at: string;
  severity: AnnounceSeverity;
  action: AnnounceAction;
}

/**
 * The reference's initial `state.f`, verbatim — including the literal `2026-12-09T09:00` default
 * schedule, which is a constant in the prototype and not a clock read.
 */
export const blankAnnouncementForm = (): AnnouncementForm => ({
  title: '',
  body: '',
  audience: 'all',
  inapp: true,
  email: true,
  when: 'now',
  at: '2026-12-09T09:00',
  severity: 'info',
  action: '',
});

/** Everything the screen holds locally: the draft, plus the message `sendAnnouncement` refused with. */
export interface AnnouncementsUi {
  form: AnnouncementForm;
  err: string;
}

// ---------------------------------------------------------------------------------------------
// View-model shape
// ---------------------------------------------------------------------------------------------

/** One option of a single-select control. The CSS keys off `on`; the reference computed colours. */
export interface AnnounceOption<T> {
  value: T;
  label: string;
  on: boolean;
}

export interface ReminderRow {
  id: string;
  label: string;
  /** `Email · On`, `Email + SMS · Off` — the channel and the state, never colour alone. */
  channel: string;
  on: boolean;
}

export interface HistoryRow {
  id: string;
  title: string;
  body: string;
  /** The audience's display label, e.g. `Team Owners`. */
  aud: string;
  /** `In-app + Email`, `Email`. */
  ch: string;
  status: string;
  /** Paints the status dot and text: sent is success, scheduled is progress. */
  sent: boolean;
  /** `Dec 11, 8:00 AM CT`. */
  at: string;
  /** `71%`, or `—` while a scheduled announcement has no open rate. */
  opens: string;
}

export interface BannerPreview {
  severity: AnnounceSeverity;
  title: string;
  body: string;
  /** The reference's literal stamp, not a formatted time. */
  when: string;
  actionLabel: string;
  /** The in-app channel is off, so the banner renders at 40 % opacity. */
  dim: boolean;
}

export interface AnnouncementsVM {
  form: AnnouncementForm;
  audience: AnnounceOption<AnnounceAudience>[];
  /** `Reaches 148 learners` · `Reaches 7 team owners`. */
  reach: string;
  channels: AnnounceOption<AnnounceChannel>[];
  severities: AnnounceOption<AnnounceSeverity>[];
  actions: AnnounceOption<AnnounceAction>[];
  whens: AnnounceOption<AnnounceWhen>[];
  /** `When` is `Schedule`, so the `datetime-local` input is shown. */
  scheduling: boolean;
  preview: BannerPreview;
  err: string;
  /** `Send Now` or `Schedule`, on the primary button. */
  sendLabel: string;
  reminders: ReminderRow[];
  history: HistoryRow[];
}

// ---------------------------------------------------------------------------------------------
// Constants, ported verbatim
// ---------------------------------------------------------------------------------------------

/** The reference's `audL`. Also the History table's Audience column. */
const AUDIENCE: Record<AnnounceAudience, string> = {
  all: 'All Learners',
  agent: 'Agent Tier',
  team: 'Team Tier',
  owners: 'Team Owners',
};

const AUDIENCE_ORDER: readonly AnnounceAudience[] = ['all', 'agent', 'team', 'owners'];

/**
 * The reference's `ACT`: the control's label, then the label the banner's action button carries.
 * They differ only for `None`, which produces no button at all.
 */
const ACTIONS: readonly [AnnounceAction, string, string][] = [
  ['', 'None', ''],
  ['calendar', 'Update Calendar', 'Update Calendar'],
  ['sessions', 'Open Sessions', 'Open Sessions'],
];

const CHANNELS: readonly [AnnounceChannel, string][] = [
  ['inapp', 'In-App Banner'],
  ['email', 'Email'],
];

const SEVERITIES: readonly [AnnounceSeverity, string][] = [
  ['info', 'Info'],
  ['warning', 'Warning'],
];

const WHENS: readonly [AnnounceWhen, string][] = [
  ['now', 'Send Now'],
  ['later', 'Schedule'],
];

const PREVIEW_TITLE = 'Your announcement title';
const PREVIEW_BODY = 'Your message appears here on every learner dashboard in the audience.';

const actionLabelOf = (action: AnnounceAction): string =>
  ACTIONS.find(([k]) => k === action)?.[2] ?? '';

// ---------------------------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------------------------

export function announcementsVM(db: Db, ui: AnnouncementsUi): AnnouncementsVM {
  const f = ui.form;
  const B = db.base;
  // An invited learner has no account yet, so no announcement reaches them.
  const users = db.users.filter((u) => u.status !== 'invited');

  // phase 06 § 6.2: every one of these adds the baseline.
  const counts: Record<AnnounceAudience, number> = {
    all: B.learners + users.length,
    agent: B.agent + users.filter((u) => u.tier === 'agent').length,
    team: B.teamSeats + users.filter((u) => u.tier === 'team').length,
    owners: B.teams + db.teams.length,
  };

  const scheduling = f.when === 'later';

  // `sort` is stable and `slice` protects the snapshot, so same-instant rows keep seed order.
  const history: HistoryRow[] = db.announcements
    .slice()
    .sort((a, b) => b.at - a.at)
    .map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      // The reference falls back to `All learners` for an unknown audience; the type makes that
      // key total, so the lookup cannot miss and the fallback is unreachable.
      aud: AUDIENCE[a.audience],
      ch: a.channels.map((x) => (x === 'inapp' ? 'In-app' : 'Email')).join(' + '),
      status: a.status === 'sent' ? 'Sent' : a.status === 'draft' ? 'Draft' : 'Scheduled',
      sent: a.status === 'sent',
      at: `${fmt.date(a.at)}, ${fmt.time(a.at)}`,
      opens: a.opens != null ? fmt.pct(a.opens) : '—',
    }));

  return {
    form: f,
    audience: AUDIENCE_ORDER.map((value) => ({ value, label: AUDIENCE[value], on: f.audience === value })),
    reach: `Reaches ${fmt.num(counts[f.audience])} ${f.audience === 'owners' ? 'team owners' : 'learners'}`,
    channels: CHANNELS.map(([value, label]) => ({ value, label, on: value === 'inapp' ? f.inapp : f.email })),
    severities: SEVERITIES.map(([value, label]) => ({ value, label, on: (f.severity || 'info') === value })),
    actions: ACTIONS.map(([value, label]) => ({ value, label, on: (f.action || '') === value })),
    whens: WHENS.map(([value, label]) => ({ value, label, on: f.when === value })),
    scheduling,
    preview: {
      severity: f.severity || 'info',
      title: f.title || PREVIEW_TITLE,
      body: f.body || PREVIEW_BODY,
      when: 'Just now',
      actionLabel: actionLabelOf(f.action || ''),
      dim: !f.inapp,
    },
    err: ui.err,
    sendLabel: scheduling ? 'Schedule' : 'Send Now',
    reminders: db.reminders.map((r) => ({
      id: r.id,
      label: r.label,
      channel: `${r.channel}${r.on ? ' · On' : ' · Off'}`,
      on: r.on,
    })),
    history,
  };
}

// ================================================================================================
// R2 (D-160 R2-2b): Announcements of the signed-off Admin redesign (AdminRedesign.jsx `Announce`).
// The rows in the snapshot's order (newest first, as `sendAnnouncement` keeps them), send times MST.
// ================================================================================================

const R2_AUDIENCE: Record<AnnounceAudience, string> = {
  all: 'Everyone',
  agent: 'Agent Tier',
  team: 'Team Tier',
  owners: 'Team Owners',
};

export const R2_AUDIENCES: readonly { value: AnnounceAudience; label: string }[] = AUDIENCE_ORDER.map((value) => ({
  value,
  label: R2_AUDIENCE[value],
}));

/** The dialog's Channels select: its value is which channels are on. */
export const R2_CHANNELS: readonly { value: 'inapp' | 'both' | 'email'; label: string }[] = [
  { value: 'inapp', label: 'In-app' },
  { value: 'both', label: 'In-app, email' },
  { value: 'email', label: 'Email' },
];

export interface AnnounceR2Row {
  id: string;
  title: string;
  audience: string;
  /** `In-app, email`. */
  channels: string;
  status: { label: 'Sent' | 'Scheduled' | 'Draft'; tone: 'ok' | 'info' | 'off' };
  /** `Dec 9, 3:10 PM` (MST), or "—" for a draft. */
  sendTime: string;
}

export function announceR2Rows(db: Db): AnnounceR2Row[] {
  return db.announcements.map((a) => {
    const ch = a.channels.map((x) => (x === 'inapp' ? 'in-app' : 'email')).join(', ');
    return {
      id: a.id,
      title: a.title,
      audience: R2_AUDIENCE[a.audience],
      channels: ch.charAt(0).toUpperCase() + ch.slice(1),
      status:
        a.status === 'sent'
          ? { label: 'Sent', tone: 'ok' }
          : a.status === 'scheduled'
            ? { label: 'Scheduled', tone: 'info' }
            : { label: 'Draft', tone: 'off' },
      sendTime: a.status === 'draft' ? '—' : adminStamp(a.at),
    };
  });
}

/** The dialog's Channels value for a form, and the form's two switches for a value. */
export const channelsOf = (f: Pick<AnnouncementForm, 'inapp' | 'email'>): 'inapp' | 'both' | 'email' =>
  f.inapp && f.email ? 'both' : f.email ? 'email' : 'inapp';
export const channelsFrom = (v: 'inapp' | 'both' | 'email'): Pick<AnnouncementForm, 'inapp' | 'email'> => ({
  inapp: v !== 'email',
  email: v !== 'inapp',
});

/**
 * The scheduled send, typed in MST (`2026-12-15T12:00`), as `sendAnnouncement` reads it: a
 * datetime-local value in Central Time, the program's zone. The same instant.
 */
export function atForSend(mstLocal: string): string {
  const [date = '', time = ''] = mstLocal.split('T');
  const t = fromAdminLocal(date, time);
  return Number.isNaN(t) ? mstLocal : `${fmt.isoDate(t)}T${fmt.isoTime(t)}`;
}

/** The composer's default schedule, `2026-12-09T09:00` CT, in MST. */
export const defaultScheduleMst = (ctLocal: string): string => {
  const t = Date.parse(`${ctLocal}:00-06:00`);
  if (Number.isNaN(t)) return ctLocal;
  const { date, time } = toAdminLocal(t);
  return `${date}T${time}`;
};

// ================================================================================================
// D-172 R2-gaps: Save draft, and a row's Edit (drafts and scheduled) and Duplicate.
// ================================================================================================

/** Edit is for a draft or a scheduled announcement; a sent one is history. */
export const editable = (a: Pick<Announcement, 'status'>): boolean => a.status !== 'sent';

/** The dialog filled in from a row: its fields, a scheduled one's time in MST. */
export function announcementFormOf(a: Announcement): AnnouncementForm {
  const { date, time } = toAdminLocal(a.at);
  return {
    title: a.title,
    body: a.body,
    audience: a.audience,
    inapp: a.channels.includes('inapp'),
    email: a.channels.includes('email'),
    when: a.status === 'scheduled' ? 'later' : 'now',
    at: a.status === 'scheduled' ? `${date}T${time}` : defaultScheduleMst(blankAnnouncementForm().at),
    severity: a.severity,
    action: a.action ?? '',
  };
}

/** The dialog's fields as `saveAnnouncementDraft` and `updateAnnouncement` take them (`at` in MST). */
export const announcementFields = (f: AnnouncementForm) => ({
  title: f.title,
  body: f.body,
  audience: f.audience,
  inapp: f.inapp,
  email: f.email,
  severity: f.severity,
  action: f.action,
  at: f.at,
});
