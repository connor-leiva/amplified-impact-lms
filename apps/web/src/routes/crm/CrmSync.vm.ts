// /admin/crm-sync (D-134): the GoHighLevel sync log for the Owner and Admins. Every string and every
// time on the page is computed here; CrmSync.tsx is markup. The payload is `GET /api/admin/crm-sync`
// (apps/api/src/routes/crm-sync.ts), restated below because the web app does not import the API.

import { fmt } from '@ai/core';

export type CrmKind = 'waitlist' | 'order' | 'login' | 'skill';
export type CrmState = 'synced' | 'waiting' | 'retrying' | 'gave-up';
export type FieldKey = 'offer' | 'cohort' | 'amount' | 'purchaseDate' | 'lmsLogin';
export type StageKey = 'lead' | 'freeSkills' | 'checkoutStarted' | 'purchased' | 'paymentFailed' | 'canceled' | 'refunded';

export interface CrmRow {
  kind: CrmKind;
  id: string;
  email: string;
  state: CrmState;
  attempts: number;
  lastAttemptAt: number | null;
  nextAttemptAt: number | null;
  syncedAt: number | null;
  error: string | null;
}
export interface CrmCounts {
  total: number;
  synced: number;
  waiting: number;
  retrying: number;
  gaveUp: number;
}
export interface CrmSyncReport {
  sync: 'on' | 'paused' | 'off';
  fields: FieldKey[];
  pipeline: boolean;
  stages: StageKey[];
  counts: Record<CrmKind, CrmCounts>;
  problems: CrmRow[];
  recent: CrmRow[];
}

export const COPY = {
  title: 'CRM Sync',
  sub: 'What this app has copied into GoHighLevel, and what is still waiting.',
  loading: 'Loading the sync log',
  back: 'Back to the Console',
  status: {
    on: 'On. It syncs every minute.',
    paused: 'Paused. GHL_SYNC_ENABLED is false in Railway, so rows wait here until it is unset.',
    off: 'Off. GHL_TOKEN and GHL_LOCATION_ID are not both set in Railway.',
  },
  statusLabel: 'Sync',
  fieldsLabel: 'Custom Fields',
  pipelineLabel: 'Pipeline',
  noneSet: 'None set',
  notSet: 'Not set',
  countsHeading: 'By Kind',
  countsCaption: 'How many rows of each kind are synced, waiting, retrying or gave up.',
  columns: { kind: 'Kind', synced: 'Synced', waiting: 'Waiting', retrying: 'Retrying', gaveUp: 'Gave Up', total: 'Total' },
  problemsHeading: 'Needs a Look',
  problemsEmpty: 'Nothing has failed.',
  recentHeading: 'Latest Activity',
  recentEmpty: 'Nothing has been synced yet.',
  rowColumns: { email: 'Email', kind: 'Kind', state: 'State', attempts: 'Attempts', last: 'Last Try', reason: 'Reason', action: 'Action' },
  never: 'Never',
  retry: 'Retry',
  retried: 'Queued for the next minute.',
  retryFailed: 'That didn’t work. Try again.',
  forbidden: 'This page is for the Owner and Admins.',
  unavailable: 'The sync log isn’t available here.',
} as const;

export const KIND_LABEL: Readonly<Record<CrmKind, string>> = { waitlist: 'Sign-Ups', order: 'Buyers', login: 'First Sign-Ins', skill: 'Skill Purchases' };
export const STATE_LABEL: Readonly<Record<CrmState, string>> = { synced: 'Synced', waiting: 'Waiting', retrying: 'Retrying', 'gave-up': 'Gave Up' };
export const FIELD_LABEL: Readonly<Record<FieldKey, string>> = { offer: 'AI Offer', cohort: 'AI Cohort', amount: 'AI Amount', purchaseDate: 'AI Purchase Date', lmsLogin: 'LMS Login' };
export const STAGE_LABEL: Readonly<Record<StageKey, string>> = {
  lead: 'Lead',
  freeSkills: 'Free Skills',
  checkoutStarted: 'Checkout Started',
  purchased: 'Purchased',
  paymentFailed: 'Payment Failed',
  canceled: 'Canceled',
  refunded: 'Refunded',
};

/** `fields:rejected:422` in words a person can act on. The raw code stays alongside for support. */
const STEP_WORDS: Readonly<Record<string, string>> = { upsert: 'Contact', tags: 'Tags', fields: 'Custom field', opportunity: 'Pipeline' };
const KIND_WORDS: Readonly<Record<string, string>> = {
  unauthorized: 'the token was refused',
  rejected: 'GHL refused it',
  'rate-limited': 'rate limited',
  server: 'GHL had an error',
  timeout: 'timed out',
  network: 'no connection',
  malformed: 'unreadable answer',
};
export function reasonOf(error: string | null): string {
  if (!error) return '';
  const [step = '', kind = '', status] = error.split(':');
  const words = `${STEP_WORDS[step] ?? step}: ${KIND_WORDS[kind] ?? kind}`;
  return status ? `${words} (${status})` : words;
}

export type StateTone = 'success' | 'neutral' | 'progress' | 'attention';
export const STATE_TONE: Readonly<Record<CrmState, StateTone>> = { synced: 'success', waiting: 'neutral', retrying: 'progress', 'gave-up': 'attention' };

export interface RowVM {
  key: string;
  kind: CrmKind;
  id: string;
  email: string;
  kindLabel: string;
  state: string;
  tone: StateTone;
  attempts: string;
  last: string;
  reason: string;
  /** Only a row that gave up can be retried from here; the others are already on their way. */
  canRetry: boolean;
}

export interface CrmView {
  status: string;
  fields: string;
  pipeline: string;
  counts: { kind: CrmKind; label: string; synced: string; waiting: string; retrying: string; gaveUp: string; total: string }[];
  problems: RowVM[];
  recent: RowVM[];
}

const rowVM = (r: CrmRow): RowVM => ({
  key: `${r.kind}:${r.id}`,
  kind: r.kind,
  id: r.id,
  email: r.email,
  kindLabel: KIND_LABEL[r.kind],
  state: STATE_LABEL[r.state],
  tone: STATE_TONE[r.state],
  attempts: fmt.num(r.attempts),
  last: r.lastAttemptAt === null ? COPY.never : fmt.when(r.lastAttemptAt),
  reason: reasonOf(r.error),
  canRetry: r.state === 'gave-up',
});

export function crmView(report: CrmSyncReport): CrmView {
  const kinds: CrmKind[] = ['waitlist', 'order', 'login', 'skill'];
  return {
    status: COPY.status[report.sync],
    fields: report.fields.length ? report.fields.map((f) => FIELD_LABEL[f]).join(', ') : COPY.noneSet,
    pipeline: report.pipeline ? report.stages.map((s) => STAGE_LABEL[s]).join(', ') : COPY.notSet,
    counts: kinds.map((kind) => {
      const c = report.counts[kind];
      return { kind, label: KIND_LABEL[kind], synced: fmt.num(c.synced), waiting: fmt.num(c.waiting), retrying: fmt.num(c.retrying), gaveUp: fmt.num(c.gaveUp), total: fmt.num(c.total) };
    }),
    problems: report.problems.map(rowVM),
    recent: report.recent.map(rowVM),
  };
}
