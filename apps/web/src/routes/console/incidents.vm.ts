// Incidents and Incident on R2 (D-167, spec § 7.14): the mockup's `Incidents()` and `Incident()`.
// Pure: the API's rows and record (`@ai/core` console-incidents.ts) in, the mockup's words out, so the
// screens never format a time, a status or a severity themselves.
//
// The words are the mockup's where it has them: the page's title and description, the status filter,
// the columns, the empty state, the key facts, "Timeline", "Linked", Acknowledge and Resolve, and the
// toasts ("INC-0007 is acknowledged"). The dialogs, Add note and the Linked card's empty line are new
// (listed in D-167), the stack's R2 `Confirm` and `Modal`.

import { INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS, adminStamp, consoleCan, incidentEventText, incidentLinked } from '@ai/core';
import type { AdminStatus, IconName, IncidentDetail, IncidentFilters, IncidentRow, IncidentSeverity, IncidentStatus } from '@ai/core';

export const INCIDENTS_PATH = '/admin/incidents';
export const NONE = '—';

export const INCIDENTS_COPY = {
  title: 'Incidents',
  description: 'What broke, who has it, and what it is linked to.',
  status: 'Status',
  columns: { incident: 'Incident', severity: 'Severity', status: 'Status', owner: 'Owner', opened: 'Opened' },
  empty: { title: 'No incidents', body: 'Failed jobs and webhooks open one automatically.' },
  more: 'Load more',
} as const;

/** The status filter, as the mockup draws it, and what each option asks the API for. */
export const STATUS_OPTIONS: readonly { label: string; value: IncidentStatus | '' }[] = [
  { label: 'Any status', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
];

export const incidentFiltersFor = (status: string): IncidentFilters =>
  status === 'open' || status === 'acknowledged' || status === 'resolved' ? { status } : {};

/** A severity's pill: Sev 1 and Sev 2 red, Sev 3 amber (the mockup's `TONE`). */
export const severityOf = (s: IncidentSeverity): AdminStatus => ({ label: INCIDENT_SEVERITY_LABELS[s], tone: s === 'sev3' ? 'warn' : 'bad' });

/** A status, a word with its dot, never a colour alone: Open red, Acknowledged blue, Resolved green. */
export const incidentStatusOf = (s: IncidentStatus): AdminStatus => ({
  label: INCIDENT_STATUS_LABELS[s],
  tone: s === 'open' ? 'bad' : s === 'acknowledged' ? 'info' : 'ok',
});

export const incidentHref = (id: string): string => `${INCIDENTS_PATH}/${encodeURIComponent(id)}`;

export interface IncidentRowVM {
  key: string;
  id: string;
  title: string;
  severity: AdminStatus;
  severityRank: number;
  status: AdminStatus;
  owner: string;
  opened: string;
  openedAt: number;
  href: string;
}

export const incidentRowVM = (r: IncidentRow): IncidentRowVM => ({
  key: r.id,
  id: r.id,
  title: r.title,
  severity: severityOf(r.severity),
  severityRank: Number(r.severity.slice(3)),
  status: incidentStatusOf(r.status),
  owner: r.owner?.name ?? NONE,
  opened: adminStamp(r.openedAt),
  openedAt: r.openedAt,
  href: incidentHref(r.id),
});

// ================================================================================================
// One incident
// ================================================================================================

export const INCIDENT_COPY = {
  back: 'Incidents',
  facts: { id: 'Incident', status: 'Status', severity: 'Severity', owner: 'Owner', opened: 'Opened' },
  timeline: 'Timeline',
  linked: 'Linked',
  noLinks: 'Nothing linked yet.',
  ack: 'Acknowledge',
  resolve: 'Resolve',
  addNote: 'Add note',
  acked: (id: string) => `${id} is acknowledged`,
  resolved: (id: string) => `${id} is resolved`,
  noted: 'Note saved',
  ackConfirm: {
    title: (id: string) => `Acknowledge ${id}?`,
    body: 'You become its owner, and the timeline says you have it.',
    cta: 'Acknowledge',
  },
  resolveDialog: {
    title: (id: string) => `Resolve ${id}?`,
    label: 'What fixed it',
    placeholder: 'What changed, and how you checked it',
    cta: 'Resolve',
  },
  noteDialog: {
    title: 'Add note',
    label: 'Note',
    placeholder: 'What you found or did',
    cta: 'Save note',
  },
  cancel: 'Cancel',
  failed: 'That didn’t save. Nothing was changed.',
} as const;

const LINK_ICON: Readonly<Record<'jobs' | 'api' | 'email', IconName>> = { jobs: 'r2Jobs', api: 'r2Api', email: 'r2Email' };

export interface IncidentVM {
  id: string;
  title: string;
  severity: AdminStatus;
  status: AdminStatus;
  facts: { id: string; severity: string; owner: string; opened: string };
  timeline: { key: string; text: string; when: string }[];
  linked: { key: string; to: string; icon: IconName; label: string }[];
  /** Acknowledge shows while it is open; Resolve until it is resolved, and only to a role that may (D3). */
  canAck: boolean;
  canResolve: boolean;
  canNote: boolean;
}

export function incidentVM(d: IncidentDetail, role: string | null): IncidentVM {
  return {
    id: d.id,
    title: d.title,
    severity: severityOf(d.severity),
    status: incidentStatusOf(d.status),
    facts: { id: d.id, severity: INCIDENT_SEVERITY_LABELS[d.severity], owner: d.owner?.name ?? NONE, opened: `${adminStamp(d.openedAt)} MST` },
    timeline: d.events.map((e) => ({ key: e.id, text: incidentEventText(e), when: adminStamp(e.at) })),
    linked: incidentLinked(d.events).map((l) => ({ key: l.to, to: l.to, icon: LINK_ICON[l.icon], label: l.label })),
    canAck: d.status === 'open' && consoleCan(role, 'incidents.ack'),
    canResolve: d.status !== 'resolved' && consoleCan(role, 'incidents.resolve'),
    canNote: consoleCan(role, 'notes.write'),
  };
}
