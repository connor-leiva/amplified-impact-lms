// /admin/email on R2 (D-166, spec § 7.15): the words, filters, rows and detail of the mockup's `Email`,
// and a user's "Emails sent" tab, from what the API answers. Pure; EmailLog.tsx and User.tsx only
// render it. Times are MST (BUILD-SPEC § 7), as the page's description says.
//
// NO DELIVERY EVENTS IN v1. A row says whether the send went out (Sent, Failed, Skipped); the detail
// says so in place of the mockup's "The log keeps the subject and delivery events." The fixture draws
// the mockup's delivery words ("Delivered", "Bounced") from its own data.

import { EMAIL_ERROR_LABELS, EMAIL_PROVIDER_LABELS, adminStamp, emailStatusOf } from '@ai/core';
import type { AdminStatus, EmailErrorKind, EmailLogFilters, EmailLogRow } from '@ai/core';
import type { Option } from './workspaces.vm';

export const EMAIL_COPY = {
  title: 'Email Log',
  description: 'Every transactional email and notification sent through Resend. Times are MST (America/Phoenix).',
  export: 'Export CSV',
  exportSelected: 'Export selected',
  exported: 'Export started. It is in the audit log.',
  exportFailed: 'The export didn’t download. Nothing was changed.',
  filter: 'Filter recipient or subject',
  template: 'Template',
  status: 'Status',
  columns: { email: 'Email', template: 'Template', status: 'Status', sent: 'Sent', subject: 'Subject' },
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
    note: 'The log keeps the subject and whether it was sent. Delivery events are not tracked yet. The message body is not stored here.',
    done: 'Done',
  },
} as const;

export interface EmailFilterState {
  q: string;
  template: string;
  status: string;
}

export const DEFAULT_EMAIL_FILTERS: EmailFilterState = { q: '', template: '', status: '' };

/** The filters a link may open the page with (`?q=`, `?template=`, `?status=`), Billing's "Open email log". */
export function emailFiltersFromSearch(search: string): EmailFilterState {
  const p = new URLSearchParams(search);
  return { q: p.get('q') ?? '', template: p.get('template') ?? '', status: p.get('status') ?? '' };
}

export const isDefaultEmailFilters = (f: EmailFilterState): boolean => f.q.trim() === '' && f.template === '' && f.status === '';

/** The filters as the API reads them: only what is set, the words trimmed to 100 characters. */
export function emailFiltersFor(f: EmailFilterState): EmailLogFilters {
  const out: EmailLogFilters = {};
  const q = f.q.trim().slice(0, 100);
  if (q) out.q = q;
  if (f.template) out.template = f.template;
  if (f.status) out.status = f.status;
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
  sent: string;
  at: number;
}

export const emailRowVM = (r: EmailLogRow): EmailRowVM => ({
  key: r.id,
  subject: r.subject,
  to: r.to,
  template: r.template,
  status: emailStatusOf(r.status),
  sent: adminStamp(r.at),
  at: r.at,
});

export interface EmailDetailVM {
  title: string;
  rows: { label: string; value: string; mono?: boolean; status?: AdminStatus }[];
  note: string;
}

export function emailDetailVM(r: EmailLogRow): EmailDetailVM {
  const D = EMAIL_COPY.detail;
  const error = r.errorKind ? (EMAIL_ERROR_LABELS[r.errorKind as EmailErrorKind] ?? r.errorKind) : null;
  return {
    title: r.subject,
    rows: [
      { label: D.to, value: r.to, mono: true },
      { label: D.from, value: D.fromValue },
      { label: D.template, value: r.template, mono: true },
      { label: D.provider, value: EMAIL_PROVIDER_LABELS[r.provider] ?? r.provider },
      { label: D.status, value: emailStatusOf(r.status).label, status: emailStatusOf(r.status) },
      ...(error ? [{ label: D.error, value: error }] : []),
      { label: D.sent, value: `${adminStamp(r.at)} MST` },
    ],
    note: D.note,
  };
}
