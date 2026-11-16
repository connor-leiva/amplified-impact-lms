// The Admin Console's rules (D-157): who on staff may do what, the closed list of audit actions,
// the Console's error codes and the audit export's CSV. Pure, like the rest of @ai/core: the API
// authorizes with these (`apps/api/src/console/guard.ts`) and the web hides what they refuse.
//
// RBAC (spec § 5). The roles are the existing `users.staff_role` values; none is added.
//   - The Owner always passes, as in `can()`.
//   - Admin and Support pass what `CONSOLE_CAPS` lists for them.
//   - Instructor and Content Editor have no Console capability at all.
//   - Anything else (no role, a typo, a role added later) fails closed, and so does a capability
//     that is not in the list: a misspelt capability never quietly lets the Owner through.
// The matrix is defined here and is read-only (D11): `/admin/roles` shows it, nothing edits it. The
// prototype's `PermKey` matrix on `/admin/staff` is a different thing and is unchanged.

import type { PermKey, StaffRole } from './types';

/** The two roles besides the Owner that hold Console capabilities. */
type CapRole = 'Admin' | 'Support';

const ALL: readonly CapRole[] = ['Admin', 'Support'];
const ADMIN: readonly CapRole[] = ['Admin'];
const OWNER: readonly CapRole[] = [];

/**
 * Each capability and the non-Owner roles that hold it (spec § 5's table, row for row). The Owner
 * holds every one, so the Owner never appears.
 */
export const CONSOLE_CAPS = {
  'console.view': ALL,
  'workspaces.read': ALL,
  'users.read': ALL,
  'notes.write': ALL,
  'user.password_reset': ALL,
  'usage.read': ALL,
  'api.read': ALL,
  'jobs.read': ALL,
  'incidents.read': ALL,
  'email.read': ALL,
  'incidents.ack': ALL,
  'incidents.create': ALL,
  // Support reads billing but changes nothing (D3).
  'billing.read': ALL,
  // Support reads the audit log with IP and user agent removed (D3, `auditRedactsNetwork`).
  'audit.read': ALL,
  'masquerade.start': ADMIN,
  'masquerade.extend': ADMIN,
  'billing.refund': ADMIN,
  'billing.void': ADMIN,
  'billing.seat_tier': ADMIN,
  export: ADMIN,
  'incidents.resolve': ADMIN,
  'jobs.run_now': ADMIN,
  'webhooks.retry': ADMIN,
  'ops.read': ADMIN,
  'flags.write': ADMIN,
  'integrations.probe': ADMIN,
  'notes.delete': OWNER,
  'flags.write_sensitive': OWNER,
} as const satisfies Record<string, readonly CapRole[]>;

export type ConsoleCap = keyof typeof CONSOLE_CAPS;

/** Every capability, in the table's order. */
export const CONSOLE_CAP_KEYS = Object.keys(CONSOLE_CAPS) as ConsoleCap[];

/** The roles that hold any Console capability, in the matrix's column order. */
export const CONSOLE_ROLES = ['Owner', 'Admin', 'Support'] as const satisfies readonly StaffRole[];
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

/** Staff roles with no Console capability (D3). Named so the Roles screen can say so. */
export const NO_CONSOLE_ROLES = ['Instructor', 'Content Editor'] as const satisfies readonly StaffRole[];

const isCap = (cap: string): cap is ConsoleCap => Object.prototype.hasOwnProperty.call(CONSOLE_CAPS, cap);

/**
 * Whether a staff role holds a Console capability. The Owner holds every capability; an unknown
 * role, an absent one and an unknown capability all answer false.
 */
export function consoleCan(role: string | null | undefined, cap: string): boolean {
  if (!isCap(cap)) return false;
  if (role === 'Owner') return true;
  if (role !== 'Admin' && role !== 'Support') return false;
  return (CONSOLE_CAPS[cap] as readonly CapRole[]).includes(role);
}

/** Every capability a role holds, in the table's order: what `GET /api/console/me` returns. */
export const consoleCaps = (role: string | null | undefined): ConsoleCap[] => CONSOLE_CAP_KEYS.filter((c) => consoleCan(role, c));

/**
 * Whether the audit log shows this role IP addresses and user agents. Support reads the log without
 * them (D3); the server sends them as null, so the browser never has them.
 */
export const auditRedactsNetwork = (role: string | null | undefined): boolean => role !== 'Owner' && role !== 'Admin';

/** Each capability's label on the Roles screen. Title Case, like every Console label. */
export const CONSOLE_CAP_LABELS: Record<ConsoleCap, string> = {
  'console.view': 'Open Console',
  'workspaces.read': 'View Workspaces',
  'users.read': 'View Users',
  'notes.write': 'Write Staff Notes',
  'user.password_reset': 'Send a Password Reset',
  'usage.read': 'View Usage',
  'api.read': 'View API & Webhooks',
  'jobs.read': 'View Scheduled Jobs',
  'incidents.read': 'View Incidents',
  'email.read': 'View the Email Log',
  'incidents.ack': 'Acknowledge an Incident',
  'incidents.create': 'Open an Incident',
  'billing.read': 'View Billing',
  'audit.read': 'View the Audit Log',
  'masquerade.start': 'Start Masquerade',
  'masquerade.extend': 'Extend Masquerade',
  'billing.refund': 'Refund a Payment',
  'billing.void': 'Void an Invoice',
  'billing.seat_tier': 'Change a Team Plan Seat Tier',
  export: 'Export Logs as CSV',
  'incidents.resolve': 'Resolve an Incident',
  'jobs.run_now': 'Run a Job Now',
  'webhooks.retry': 'Retry a Webhook',
  'ops.read': 'View Operations Pages',
  'flags.write': 'Flip a Flag',
  'integrations.probe': 'Check an Integration',
  'notes.delete': 'Delete a Staff Note',
  'flags.write_sensitive': 'Flip a Sensitive Flag',
};

/** The two cells spec § 5 qualifies: what Support's "yes" means there. */
export const CONSOLE_CAP_NOTES: Partial<Record<ConsoleCap, Partial<Record<ConsoleRole, string>>>> = {
  'billing.read': { Support: 'Read-only' },
  'audit.read': { Support: 'Without IP or browser' },
};

// ================================================================================================
// The audit log (spec § 7.8)
// ================================================================================================

/**
 * Every action the audit log may record: a closed list, so a row's action is always one of these
 * (`audit()` refuses anything else). PR 1 writes the first two; the rest are the names spec §§ 6-7
 * give the later Console PRs, listed now so the filter and the list are settled once.
 */
export const AUDIT_ACTIONS = [
  // PR 1
  'console.access_denied',
  'audit.export',
  // PR 2: staff notes, password resets, the users export
  'note.create',
  'note.delete',
  'user.password_reset',
  'user.export',
  // PR 3: masquerade
  'masquerade.start',
  'masquerade.extend',
  'masquerade.exit',
  'masquerade.expire',
  'masquerade.signed_out',
  'masquerade.blocked_action',
  // PR 5: billing actions
  'billing.refund',
  'billing.void',
  'billing.seat_tier',
  // PR 6: webhooks and jobs
  'webhook.ghl_retry',
  'job.run_now',
  // PR 7: the email log
  'email_log.export',
  // PR 8: incidents
  'incident.create',
  'incident.ack',
  'incident.resolve',
  'incident.note',
  // PR 9: flags and integrations
  'flag.flip',
  'integration.probe',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const isAuditAction = (v: unknown): v is AuditAction => typeof v === 'string' && (AUDIT_ACTIONS as readonly string[]).includes(v);

/** An action's group: the part before the dot (`masquerade.start` → `masquerade`). */
export const auditActionGroup = (action: string): string => action.split('.')[0] ?? action;

/** The groups, in first-appearance order: the Action filter's options. */
export const AUDIT_ACTION_GROUPS: readonly string[] = [...new Set(AUDIT_ACTIONS.map(auditActionGroup))];

export const AUDIT_OUTCOMES = ['ok', 'denied', 'blocked', 'failed'] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
export const isAuditOutcome = (v: unknown): v is AuditOutcome => typeof v === 'string' && (AUDIT_OUTCOMES as readonly string[]).includes(v);

export const AUDIT_ACTOR_SOURCES = ['staff', 'system'] as const;
export type AuditActorSource = (typeof AUDIT_ACTOR_SOURCES)[number];

/** Cursor pagination (spec § 7): 50 rows by default, 200 at most. */
export const CONSOLE_PAGE_DEFAULT = 50;
export const CONSOLE_PAGE_MAX = 200;

/** D6: an export is CSV, and 10,000 rows at most. */
export const AUDIT_EXPORT_MAX_ROWS = 10_000;

/** One audit row as the API sends it. Times are epoch ms. */
export interface AuditRow {
  id: string;
  at: number;
  actor: { userId: string | null; name: string | null; role: string | null; source: AuditActorSource };
  masqueradeSessionId: string | null;
  action: AuditAction;
  target: { type: string | null; id: string | null; label: string | null };
  reason: string | null;
  before: unknown;
  after: unknown;
  outcome: AuditOutcome;
  /** Null for Support (D3), and when none was recorded. */
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/** A page of a Console list (spec § 7). */
export interface ConsolePage<T> {
  rows: T[];
  nextCursor: string | null;
}

/** The audit log's filters, as the query string and the export body carry them. */
export interface AuditFilters {
  /** A staff user id, or `system`. */
  actor?: string;
  /** An action, or an action group (`masquerade`). */
  action?: string;
  /** Words to find in the target's id or label. */
  target?: string;
  outcome?: AuditOutcome;
  /** Epoch ms, inclusive. */
  from?: number;
  /** Epoch ms, inclusive. */
  to?: number;
}

/** The role matrix `GET /api/console/roles` answers, built from `CONSOLE_CAPS`. */
export interface RolesMatrix {
  roles: ConsoleRole[];
  noAccess: StaffRole[];
  caps: { cap: ConsoleCap; label: string; allowed: Record<ConsoleRole, boolean>; notes: Partial<Record<ConsoleRole, string>> }[];
  /** Where staff and their roles are managed: the existing Staff & Roles screen. */
  staffPath: string;
}

export const STAFF_ADMIN_PATH = '/admin/staff';

export function rolesMatrix(): RolesMatrix {
  return {
    roles: [...CONSOLE_ROLES],
    noAccess: [...NO_CONSOLE_ROLES],
    caps: CONSOLE_CAP_KEYS.map((cap) => ({
      cap,
      label: CONSOLE_CAP_LABELS[cap],
      allowed: { Owner: consoleCan('Owner', cap), Admin: consoleCan('Admin', cap), Support: consoleCan('Support', cap) },
      notes: { ...(CONSOLE_CAP_NOTES[cap] ?? {}) },
    })),
    staffPath: STAFF_ADMIN_PATH,
  };
}

/**
 * The R2 Roles & Permissions matrix (D-160 R2-3b): the signed-off mockup's nine rows (`PERMS0`), each
 * the Console capabilities (`caps`, from `CONSOLE_CAPS`) or the `PermKey`s (`perms`, the matrix D11
 * keeps on `/admin/staff`) it stands for. A role holds a row only when it holds every one of them.
 * Read-only, like the matrix it is drawn from (D11, spec § 7.16: no write endpoint).
 */
export const ROLES_R2_ROWS: readonly { key: string; label: string; caps?: readonly ConsoleCap[]; perms?: readonly PermKey[] }[] = [
  { key: 'build', label: 'Edit curriculum, vault, sessions, announcements, tiers', perms: ['curriculum', 'publish', 'cohorts', 'announce'] },
  { key: 'masq', label: 'Start and extend masquerade', caps: ['masquerade.start', 'masquerade.extend'] },
  { key: 'account', label: 'Send password reset or change email', caps: ['user.password_reset'] },
  { key: 'billview', label: 'View billing', caps: ['billing.read'] },
  { key: 'refund', label: 'Refund or void an invoice', caps: ['billing.refund', 'billing.void'] },
  { key: 'jobs', label: 'Run a job now, retry a webhook, update incidents', caps: ['jobs.run_now', 'webhooks.retry', 'incidents.resolve'] },
  { key: 'export', label: 'Export audit and email logs', caps: ['export'] },
  { key: 'ops', label: 'View integrations, deploys, DB health, flags, roles', caps: ['ops.read'] },
  { key: 'staff', label: 'Edit staff roles and this matrix', perms: ['staff'] },
];

/** Product rules no matrix can change (spec D1/D2): Support never refunds, voids or masquerades. */
export const FIXED_BY_PRODUCT: Readonly<Partial<Record<ConsoleRole, readonly string[]>>> = { Support: ['masq', 'refund'] };

/** What `GET /api/console/me` answers. */
export interface ConsoleMe {
  role: StaffRole;
  caps: ConsoleCap[];
  /**
   * D8's `masquerade_enabled` (D-162 3b): whether a session may start, so the entry points can say
   * so before a click. The server still decides (403 `masquerade_disabled`).
   */
  masqueradeEnabled: boolean;
}

// ================================================================================================
// Error codes (spec §§ 5-7). Every Console refusal is `{ error, code }` with one of these.
// ================================================================================================

export const CONSOLE_ERRORS = {
  console_forbidden: { status: 403, message: 'Your role can’t use this part of Console.' },
  invalid_query: { status: 400, message: 'One of the filters isn’t valid.' },
  export_too_large: { status: 422, message: 'This export is over 10,000 rows. Narrow the filters and try again.' },
  // Spec § 5 gives this sentence (PR 3a, D-162).
  masquerade_blocked: { status: 403, message: 'Blocked while masquerading. Exit to continue.' },
  // PR 2 (D-158): a record that isn't there, a body that isn't valid, and a reason staff must give
  // (a note's deletion here; masquerade and billing reuse it in PRs 3 and 5).
  not_found: { status: 404, message: 'That record doesn’t exist.' },
  invalid_body: { status: 400, message: 'That request isn’t valid.' },
  reason_required: { status: 422, message: 'Give a reason of 10 to 500 characters.' },
  // PR 3a (D-162, spec § 6): masquerade.
  masquerade_target_staff: { status: 403, message: 'You can only masquerade as a learner.' },
  masquerade_active: { status: 409, message: 'Exit the current masquerade session first.' },
  masquerade_max_reached: { status: 409, message: 'This session can’t go past 60 minutes.' },
  masquerade_disabled: { status: 403, message: 'Masquerade is turned off.' },
  masquerade_ended: { status: 409, message: 'This masquerade session has ended.' },
  // Later PRs (spec § 7). Their sentences are written with them.
  confirm_invalid: { status: 403, message: null },
  confirm_expired: { status: 410, message: null },
  invoice_not_voidable: { status: 409, message: null },
  seats_in_use: { status: 409, message: null },
  stripe_permission_missing: { status: 503, message: null },
  job_not_runnable: { status: 403, message: null },
  scheduler_busy: { status: 409, message: null },
} as const satisfies Record<string, { status: number; message: string | null }>;

export type ConsoleErrorCode = keyof typeof CONSOLE_ERRORS;

export const isConsoleErrorCode = (v: unknown): v is ConsoleErrorCode =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CONSOLE_ERRORS, v);

// ================================================================================================
// The export's CSV
// ================================================================================================

/**
 * One CSV cell, safe to open in a spreadsheet: a value that starts with `=`, `+`, `-`, `@`, a tab or
 * a carriage return is a formula to Excel and Sheets, so it gets a leading `'` (OWASP's advice).
 * Every cell is then quoted, with quotes doubled.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Lines joined with CRLF, as RFC 4180 has it. */
export const toCsv = (rows: readonly (readonly unknown[])[]): string => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

export const AUDIT_CSV_HEADER = [
  'id',
  'at',
  'actor_user_id',
  'actor_name',
  'actor_role',
  'actor_source',
  'masquerade_session_id',
  'action',
  'target_type',
  'target_id',
  'target_label',
  'reason',
  'outcome',
  'ip',
  'user_agent',
  'request_id',
  'before',
  'after',
] as const;

/** One audit row as CSV cells, in `AUDIT_CSV_HEADER`'s order. Times are ISO 8601 in UTC. */
export const auditCsvCells = (r: AuditRow): unknown[] => [
  r.id,
  new Date(r.at).toISOString(),
  r.actor.userId,
  r.actor.name,
  r.actor.role,
  r.actor.source,
  r.masqueradeSessionId,
  r.action,
  r.target.type,
  r.target.id,
  r.target.label,
  r.reason,
  r.outcome,
  r.ip,
  r.userAgent,
  r.requestId,
  r.before === null || r.before === undefined ? null : JSON.stringify(r.before),
  r.after === null || r.after === undefined ? null : JSON.stringify(r.after),
];

export const auditCsv = (rows: readonly AuditRow[]): string => toCsv([[...AUDIT_CSV_HEADER], ...rows.map(auditCsvCells)]);
