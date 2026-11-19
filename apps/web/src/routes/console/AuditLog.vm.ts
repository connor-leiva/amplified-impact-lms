// /admin/audit (D-157, spec § 7.8): the audit log's words, filters, rows and detail. Pure, so every
// string and time on the screen is decided here and tested; AuditLog.tsx only renders it.
//
// Times go through `fmt.*`: the viewer's zone first, the program zone in parentheses (CLAUDE.md).
// Outcomes are a word and a glyph on a status token, never a colour alone.

import { ADMIN_ZONE, AUDIT_ACTION_GROUPS, CONSOLE_CAP_LABELS, adminDate, adminStamp, adminTime, auditActionGroup, auditRedactsNetwork, consoleCan, fmt, permissionChangeSummary } from '@ai/core';
import type { AuditFilters, AuditOutcome, AuditRow, ConsoleCap, Staff } from '@ai/core';
import type { TokenGlyph, TokenTone } from '../../components/StatusToken';
import type { ConsoleFailure } from '../../data/console';

export const AUDIT_COPY = {
  title: 'Audit Log',
  description: 'Every staff action in Console, newest first. Entries can’t be changed or deleted.',
  export: 'Export CSV',
  exporting: 'Exporting…',
  exported: 'Export downloaded. The export is in the audit log.',
  search: 'Search target',
  loadMore: 'Load More',
  loadingMore: 'Loading…',
  caption: 'Audit log entries',
  columns: { time: 'Time', actor: 'Actor', action: 'Action', target: 'Target', outcome: 'Outcome' },
  open: (time: string) => `View the entry from ${time}`,
  emptyRange: (range: string) => `No audit entries in the ${range.toLowerCase()}.`,
  widen: 'Show Last 30 Days',
  emptyFiltered: 'Nothing matches these filters.',
  clear: 'Clear Filters',
  drawerTitle: 'Audit Entry',
  system: 'System',
  unknownActor: 'A former staff member',
  none: 'None',
  hidden: 'Hidden for your role',
  notRecorded: 'Not recorded',
} as const;

/** Export failures, by kind. A 429 says "Too many requests", as every Console error does. */
export function exportFailure(kind: ConsoleFailure, message: string): string {
  if (kind === 'too_large') return message;
  if (kind === 'rate_limited') return 'Too many requests. Wait a minute, then try again.';
  if (kind === 'forbidden') return 'Your role can’t export the audit log.';
  return 'The export failed. Nothing was changed.';
}

// --- filters -------------------------------------------------------------------------------------

export type RangeKey = '24h' | '7d' | '30d';

const HOUR = 3600_000;
export const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: '24h', label: 'Last 24 Hours', ms: 24 * HOUR },
  { key: '7d', label: 'Last 7 Days', ms: 7 * 24 * HOUR },
  { key: '30d', label: 'Last 30 Days', ms: 30 * 24 * HOUR },
];

export interface AuditFilterState {
  /** Words to find in the target. */
  q: string;
  /** '' for any, `system`, or a staff user id. */
  actor: string;
  /** '' for any, or an action group. */
  action: string;
  /** '' for any, or an outcome. */
  outcome: '' | AuditOutcome;
  range: RangeKey;
}

export const DEFAULT_FILTERS: AuditFilterState = { q: '', actor: '', action: '', outcome: '', range: '7d' };

export const isDefaultFilters = (f: AuditFilterState): boolean =>
  f.q.trim() === '' && f.actor === '' && f.action === '' && f.outcome === '' && f.range === DEFAULT_FILTERS.range;

export const rangeLabel = (key: RangeKey): string => RANGES.find((r) => r.key === key)!.label;

/** The filters as the API reads them. The range is measured back from `now`. */
export function auditFiltersFor(f: AuditFilterState, now: number): AuditFilters {
  const out: AuditFilters = { from: now - RANGES.find((r) => r.key === f.range)!.ms };
  const q = f.q.trim().slice(0, 100);
  if (q) out.target = q;
  if (f.actor) out.actor = f.actor;
  if (f.action) out.action = f.action;
  if (f.outcome) out.outcome = f.outcome;
  return out;
}

export interface Option {
  value: string;
  label: string;
}

/** Any Actor, System, then each staff member by name. */
export function actorOptions(staff: readonly Pick<Staff, 'id' | 'name'>[]): Option[] {
  const people = [...staff].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ value: s.id, label: s.name }));
  return [{ value: '', label: 'Any Actor' }, { value: 'system', label: AUDIT_COPY.system }, ...people];
}

/** Each action group's label in the Action filter. */
const GROUP_LABELS: Record<string, string> = {
  console: 'Console Access',
  audit: 'Audit Log',
  note: 'Staff Notes',
  user: 'Users',
  masquerade: 'Masquerade',
  billing: 'Billing',
  webhook: 'Webhooks',
  job: 'Jobs',
  email_log: 'Email Log',
  incident: 'Incidents',
  flag: 'Flags',
  integration: 'Integrations',
  // D-160 R2-3b: Roles & Permissions changes.
  permission: 'Permissions',
  // D-172: the Build screens' remaining controls.
  module: 'AI Employees',
  vault: 'Resource Vault',
  session: 'Sessions',
  announce: 'Announcements',
  // D-171: role changes, removals and invites on Staff & Roles.
  staff: 'Staff & Roles',
  // D-174: the curriculum builder's cohort release plan and shared pages, and its copy strings.
  cohort: 'Cohorts',
  copy: 'Copy Strings',
  // D-175: the deploy's one-time data steps on the course (the release plan).
  curriculum: 'Curriculum',
  // D-196: a staff member opened a team's intake.
  intake: 'Intake',
};

export const groupLabel = (group: string): string => GROUP_LABELS[group] ?? group;

export function actionOptions(): Option[] {
  return [{ value: '', label: 'Any Action' }, ...AUDIT_ACTION_GROUPS.map((g) => ({ value: g, label: groupLabel(g) }))];
}

export const OUTCOME_OPTIONS: Option[] = [
  { value: '', label: 'Any Outcome' },
  { value: 'ok', label: 'OK' },
  { value: 'denied', label: 'Denied' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'failed', label: 'Failed' },
];

export const RANGE_OPTIONS: Option[] = RANGES.map((r) => ({ value: r.key, label: r.label }));

// --- rows ----------------------------------------------------------------------------------------

export interface OutcomeBadge {
  label: string;
  tone: TokenTone;
  icon: TokenGlyph;
}

/** Each outcome as a word and a distinct glyph. */
export const OUTCOME_BADGES: Record<AuditOutcome, OutcomeBadge> = {
  ok: { label: 'OK', tone: 'success', icon: 'check' },
  denied: { label: 'Denied', tone: 'attention', icon: 'lock' },
  blocked: { label: 'Blocked', tone: 'attention', icon: 'minus' },
  failed: { label: 'Failed', tone: 'attention', icon: 'alert' },
};

export interface AuditRowVM {
  key: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  outcome: OutcomeBadge;
}

export function actorLabel(r: AuditRow): string {
  if (r.actor.source === 'system') return AUDIT_COPY.system;
  return r.actor.name ?? AUDIT_COPY.unknownActor;
}

export function targetLabel(r: AuditRow): string {
  return r.target.label ?? r.target.id ?? r.target.type ?? AUDIT_COPY.none;
}

export const rowVM = (r: AuditRow): AuditRowVM => ({
  key: r.id,
  time: fmt.when(r.at),
  actor: actorLabel(r),
  action: r.action,
  target: targetLabel(r),
  outcome: OUTCOME_BADGES[r.outcome],
});

/** A sentence about what happened, from the row's own payload. */
export function detailOf(r: AuditRow): string {
  const after = (r.after ?? {}) as Record<string, unknown>;
  if (r.action === 'console.access_denied') {
    const cap = typeof after.capability === 'string' ? after.capability : '';
    return cap in CONSOLE_CAP_LABELS ? `Needed “${CONSOLE_CAP_LABELS[cap as ConsoleCap]}”.` : 'Refused by role.';
  }
  if (r.action === 'audit.export') {
    const n = typeof after.rows === 'number' ? after.rows : null;
    if (r.outcome === 'failed') return n === null ? 'Refused: over 10,000 rows.' : `Refused: ${fmt.num(n)} rows is over 10,000.`;
    // D-160 R2-3b: the date range it covered, when it was one of the filter's ("CSV, last 7 days, 212 rows.").
    const filters = (after.filters ?? {}) as Record<string, unknown>;
    const from = typeof filters.from === 'number' ? filters.from : null;
    const range = from === null ? null : RANGES.find((x) => Math.abs(r.at - from - x.ms) < 60_000);
    const span = range ? `, ${range.label.toLowerCase()}` : '';
    return n === null ? `CSV${span}.` : `CSV${span}, ${fmt.num(n)} ${n === 1 ? 'row' : 'rows'}.`;
  }
  if (r.action === 'module.publish' || r.action === 'module.unpublish') {
    // D-172: the mockup's own Detail for a publish, "Draft to Published.", from the row's statuses.
    const b = (r.before ?? {}) as Record<string, unknown>;
    const word = (v: unknown) => (typeof v === 'string' && v ? v.charAt(0).toUpperCase() + v.slice(1) : null);
    const from = word(b.status);
    const to = word(after.status);
    if (from && to) return `${from} to ${to}.`;
  }
  if (r.action === 'permission.change') {
    // D-160 R2-3b: "Refund or void an invoice: allowed to not allowed." (the mockup's words), from the
    // row's before and after; a row without them keeps its own words.
    const b = (r.before ?? {}) as Record<string, unknown>;
    if (typeof after.label === 'string' && typeof b.allowed === 'boolean' && typeof after.allowed === 'boolean')
      return permissionChangeSummary(after.label, b.allowed, after.allowed);
  }
  return r.reason ?? AUDIT_COPY.none;
}

export interface DetailPair {
  label: string;
  value: string;
  mono?: boolean;
  /** A JSON block, kept as written. */
  pre?: boolean;
}

const json = (v: unknown): string | null => (v === null || v === undefined ? null : JSON.stringify(v, null, 2));

/** The drawer's pairs. Support's IP and browser are absent from the API's answer; this says why. */
export function detailVM(r: AuditRow, viewerRole: string | null): DetailPair[] {
  const hidden = auditRedactsNetwork(viewerRole);
  const net = (v: string | null) => v ?? (hidden ? AUDIT_COPY.hidden : AUDIT_COPY.notRecorded);
  const actor = r.actor.source === 'system' ? AUDIT_COPY.system : `${actorLabel(r)}${r.actor.role ? ` (${r.actor.role})` : ''}`;
  const target = [r.target.type, r.target.label ?? r.target.id].filter(Boolean).join(' · ') || AUDIT_COPY.none;
  return [
    { label: 'Time', value: fmt.abs(r.at) },
    { label: 'Actor', value: actor },
    { label: 'Action', value: r.action, mono: true },
    { label: 'Outcome', value: OUTCOME_BADGES[r.outcome].label },
    { label: 'Target', value: target },
    { label: 'Detail', value: detailOf(r) },
    { label: 'Reason', value: r.reason ?? AUDIT_COPY.none },
    { label: 'Masquerade Session', value: r.masqueradeSessionId ?? AUDIT_COPY.none, mono: r.masqueradeSessionId !== null },
    { label: 'IP Address', value: net(r.ip), mono: r.ip !== null },
    { label: 'Browser', value: net(r.userAgent) },
    { label: 'Request ID', value: r.requestId ?? AUDIT_COPY.notRecorded, mono: r.requestId !== null },
    { label: 'Before', value: json(r.before) ?? AUDIT_COPY.none, pre: r.before !== null && r.before !== undefined },
    { label: 'After', value: json(r.after) ?? AUDIT_COPY.none, pre: r.after !== null && r.after !== undefined },
  ];
}

/** Whether the viewer sees Export CSV at all (spec § 7.8: Owner and Admin). */
export const canExport = (role: string | null): boolean => consoleCan(role, 'export');

/** The action's group label, for the drawer's description. */
export const actionGroupLabel = (action: string): string => groupLabel(auditActionGroup(action));

// ================================================================================================
// R2 (D-160 R2-3b): the Audit Log of the signed-off Admin redesign (AdminRedesign.jsx `Audit`). The
// same filters, rows, detail and export as above; the words are the mockup's (sentence case), and its
// times MST (`adminStamp`, BUILD-SPEC § 7), not the viewer's zone.
// ================================================================================================

export const AUDIT_R2_COPY = {
  description: 'Every staff action. Append-only. Times are MST (America/Phoenix).',
  search: 'Filter target or detail',
  exportSelected: 'Export selected',
  emptyTitle: 'No audit entries yet',
  emptyBody: 'Staff actions are recorded here as they happen.',
} as const;

/** The R2 selects' options: the mockup's words, the API's values. */
export const actorOptionsR2 = (staff: readonly Pick<Staff, 'id' | 'name'>[]): Option[] =>
  actorOptions(staff).map((o) => (o.value === '' ? { ...o, label: 'Any actor' } : o));

export const actionOptionsR2 = (): Option[] => [{ value: '', label: 'Any action' }, ...AUDIT_ACTION_GROUPS.map((g) => ({ value: g, label: g }))];

export const RANGE_OPTIONS_R2: Option[] = RANGES.map((r) => ({ value: r.key, label: r.label.charAt(0) + r.label.slice(1).toLowerCase() }));


export interface AuditR2Row {
  key: string;
  /** `Dec 10, 8:58 AM`, MST. */
  time: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export const rowR2 = (r: AuditRow): AuditR2Row => ({
  key: r.id,
  time: adminStamp(r.at),
  actor: actorLabel(r),
  action: r.action,
  target: targetLabel(r),
  detail: detailOf(r),
});

/** The drawer's pairs, the time in MST with its year. */
export function detailR2(r: AuditRow, viewerRole: string | null): DetailPair[] {
  return detailVM(r, viewerRole).map((p) => (p.label === 'Time' ? { ...p, value: `${adminDate(r.at)}, ${adminTime(r.at)} ${ADMIN_ZONE}` } : p));
}
