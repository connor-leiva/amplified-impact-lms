// /admin/email on R2 (D-166, spec § 7.15): the words, filters, rows and detail of the mockup's `Email`,
// and a user's "Emails sent" tab, from what the API answers. Pure; EmailLog.tsx and User.tsx only
// render it. Every time is MT with CT after it (R-5 audit, D-267; BUILD-SPEC § 7 had MST).
//
// D-263: DELIVERY FROM RESEND'S WEBHOOK. A row's badge is its delivery once Resend has reported one
// (Delivered, Delayed, Bounced, Complained), else the send's outcome (Sent, Failed, Skipped), with its
// opens and clicks beside it; the five tiles above the table are the rollup over every row the filters
// pick (`emailRollup`), in the mockup's words.

import {
  EMAIL_ERROR_LABELS,
  EMAIL_PROVIDER_LABELS,
  adminStamp,
  bounceLine,
  emailLogStatus,
  emailStatusOf,
} from '@ai/core';
import type { AdminStatus, EmailErrorKind, EmailLogFilters, EmailLogRow, EmailRollup } from '@ai/core';
import type { Option } from './workspaces.vm';

export const EMAIL_COPY = {
  title: 'Email Log',
  description: 'Every transactional email and notification sent through Resend.',
  export: 'Export CSV',
  exportSelected: 'Export selected',
  exported: 'Export started. It is in the audit log.',
  exportFailed: 'The export didn’t download. Nothing was changed.',
  filter: 'Filter recipient or subject',
  clearWorkspace: 'Show every workspace',
  template: 'Template',
  status: 'Status',
  columns: {
    email: 'Email',
    template: 'Template',
    status: 'Status',
    opens: 'Opens',
    clicks: 'Clicks',
    sent: 'Sent',
    subject: 'Subject',
  },
  rollup: {
    sent: 'Sent',
    sentSub: 'Last 180 days',
    delivered: 'Delivered',
    bounced: 'Bounced',
    noneSent: 'None sent',
    opens: 'Unique opens',
    clicks: 'Unique clicks',
  },
  empty: 'No emails sent yet',
  userEmpty: 'No emails sent to this user',
  loadMore: 'Load more',
  detail: {
    to: 'To',
    from: 'From',
    fromValue: 'Amplified Impact',
    template: 'Template',
    provider: 'Provider',
    status: 'Status',
    sent: 'Sent',
    error: 'Error',
    delivered: 'Delivered',
    bounce: 'Bounce',
    opens: 'Opens',
    firstOpened: 'First opened',
    lastOpened: 'Last opened',
    clicks: 'Clicks',
    firstClicked: 'First clicked',
    lastClicked: 'Last clicked',
    lastLink: 'Last link clicked',
    note: 'The log keeps the subject and delivery events. The message body is not stored here.',
    done: 'Done',
  },
} as const;

/** No rate to give: nothing to rate against (the mockup's `pc`). */
export const NONE = '—';

export interface EmailFilterState {
  q: string;
  template: string;
  status: string;
  /** One workspace's emails, and its name for the filter's chip (from Billing's "Open email log"). */
  teamId: string;
  workspace: string;
}

export const DEFAULT_EMAIL_FILTERS: EmailFilterState = { q: '', template: '', status: '', teamId: '', workspace: '' };

/**
 * The filters a link may open the page with: `?q=`, `?template=`, `?status=`, and `?teamId=` with its
 * `&workspace=` name (Billing's "Open email log" on a failed payment).
 */
export function emailFiltersFromSearch(search: string): EmailFilterState {
  const p = new URLSearchParams(search);
  const teamId = p.get('teamId') ?? '';
  return {
    q: p.get('q') ?? '',
    template: p.get('template') ?? '',
    status: p.get('status') ?? '',
    teamId,
    workspace: teamId ? (p.get('workspace') ?? teamId) : '',
  };
}

/** Billing's "Open email log": the log for one workspace's people, or the whole log with none. */
export const emailLogHref = (workspace: { teamId: string; name: string } | null): string =>
  workspace
    ? `/admin/email?${new URLSearchParams({ teamId: workspace.teamId, workspace: workspace.name }).toString()}`
    : '/admin/email';

/** The workspace filter's chip, which clears it. */
export const workspaceChip = (name: string): string => `Workspace: ${name}`;

export const isDefaultEmailFilters = (f: EmailFilterState): boolean =>
  f.q.trim() === '' && f.template === '' && f.status === '' && f.teamId === '';

/** The filters as the API reads them: only what is set, the words trimmed to 100 characters. */
export function emailFiltersFor(f: EmailFilterState): EmailLogFilters {
  const out: EmailLogFilters = {};
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if (f.template) out.template = f.template;
  if (f.status) out.status = f.status;
  if (f.teamId) out.teamId = f.teamId;
  return out;
}

/** "Any template", then each template the log holds; the one asked for stays, even if none match. */
export const templateOptions = (templates: readonly string[], chosen: string): Option[] => [
  { value: '', label: 'Any template' },
  ...[...new Set([...templates, ...(chosen ? [chosen] : [])])].map((t) => ({ value: t, label: t })),
];

/** "Any status", then the statuses the API names, in its words. */
export const statusOptions = (statuses: readonly string[]): Option[] => [
  { value: '', label: 'Any status' },
  ...statuses.map((s) => ({ value: s, label: emailStatusOf(s).label })),
];

export interface EmailRowVM {
  key: string;
  subject: string;
  to: string;
  template: string;
  status: AdminStatus;
  opens: number;
  clicks: number;
  sent: string;
  at: number;
}

export const emailRowVM = (r: EmailLogRow): EmailRowVM => ({
  key: r.id,
  subject: r.subject,
  to: r.to,
  template: r.template,
  status: emailStatusOf(emailLogStatus(r)),
  opens: r.openCount,
  clicks: r.clickCount,
  sent: adminStamp(r.at),
  at: r.at,
});

const count = (n: number): string => n.toLocaleString('en-US');
const pct = (p: number | null): string => (p === null ? NONE : `${p}%`);

export interface RollupTileVM {
  key: string;
  label: string;
  value: string;
  sub: string;
  tone: 'bad' | null;
}

/** The five tiles over the table (D-263): Sent, Delivered, Bounced, Unique opens, Unique clicks. */
export function emailRollupVM(r: EmailRollup): RollupTileVM[] {
  const R = EMAIL_COPY.rollup;
  const complaints = r.complained ? ` · ${count(r.complained)} ${r.complained === 1 ? 'complaint' : 'complaints'}` : '';
  return [
    { key: 'sent', label: R.sent, value: count(r.sent), sub: R.sentSub, tone: null },
    {
      key: 'delivered',
      label: R.delivered,
      value: pct(r.deliveredPct),
      sub: `${count(r.delivered)} of ${count(r.sent)} sent`,
      tone: null,
    },
    {
      key: 'bounced',
      label: R.bounced,
      value: count(r.bounced),
      sub: (r.bouncedPct === null ? R.noneSent : `${r.bouncedPct}% of sent`) + complaints,
      tone: r.alert ? 'bad' : null,
    },
    {
      key: 'opens',
      label: R.opens,
      value: pct(r.openedPct),
      sub: `${count(r.opened)} of ${count(r.delivered)} delivered`,
      tone: null,
    },
    {
      key: 'clicks',
      label: R.clicks,
      value: pct(r.clickedPct),
      sub: `${count(r.clicked)} of ${count(r.delivered)} delivered`,
      tone: null,
    },
  ];
}

export interface EmailDetailVM {
  title: string;
  rows: { label: string; value: string; mono?: boolean; status?: AdminStatus }[];
  note: string;
}

// R-5 audit (D-267): a detail's time, as every admin time, in MT with CT after it (`adminStamp`, through `fmt.mtCt`).
const mst = (t: number): string => adminStamp(t);

export function emailDetailVM(r: EmailLogRow): EmailDetailVM {
  const D = EMAIL_COPY.detail;
  const error = r.errorKind ? (EMAIL_ERROR_LABELS[r.errorKind as EmailErrorKind] ?? r.errorKind) : null;
  const status = emailStatusOf(emailLogStatus(r));
  const bounce = bounceLine(r);
  // D-263: opens and clicks are tracked only on a send Resend took; a skipped or failed send has none to show.
  const tracked = r.status === 'sent';
  return {
    title: r.subject,
    rows: [
      { label: D.to, value: r.to, mono: true },
      { label: D.from, value: D.fromValue },
      { label: D.template, value: r.template, mono: true },
      { label: D.provider, value: EMAIL_PROVIDER_LABELS[r.provider] ?? r.provider },
      { label: D.status, value: status.label, status },
      ...(error ? [{ label: D.error, value: error }] : []),
      { label: D.sent, value: mst(r.at) },
      ...(r.deliveredAt !== null ? [{ label: D.delivered, value: mst(r.deliveredAt) }] : []),
      ...(bounce ? [{ label: D.bounce, value: bounce }] : []),
      ...(tracked ? [{ label: D.opens, value: count(r.openCount) }] : []),
      ...(tracked && r.openCount > 0 && r.openedFirstAt !== null && r.openedLastAt !== null
        ? [
            { label: D.firstOpened, value: mst(r.openedFirstAt) },
            { label: D.lastOpened, value: mst(r.openedLastAt) },
          ]
        : []),
      ...(tracked ? [{ label: D.clicks, value: count(r.clickCount) }] : []),
      ...(tracked && r.clickCount > 0 && r.clickedFirstAt !== null && r.clickedLastAt !== null
        ? [
            { label: D.firstClicked, value: mst(r.clickedFirstAt) },
            { label: D.lastClicked, value: mst(r.clickedLastAt) },
          ]
        : []),
      ...(r.clickedLink ? [{ label: D.lastLink, value: r.clickedLink, mono: true }] : []),
    ],
    note: D.note,
  };
}
