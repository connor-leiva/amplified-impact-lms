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
// `CONSOLE_CAPS` is the CEILING (D-160 R2-3b, editable Roles, Connor Nov 16, 2026, 8:27 AM MST, which
// supersedes D11's read-only rule): the Owner may take a matrix row away from Admin or Support and give
// it back on `/admin/roles`, but never past this table. What is stored is only those removals
// (`console_role_grants`); a role's EFFECTIVE capability is the ceiling AND NOT removed
// (`consoleCanWith`). The prototype's `PermKey` matrix on `/admin/staff` is a different thing and is
// unchanged.

import type { PermKey, StaffRole } from './types';
import { STAFF_GUARD_ERRORS } from './staff-guard';

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
  // D-160 R2-3b: changing Roles & Permissions itself (the matrix's last row, "Edit staff roles and
  // this matrix"). The Owner only, so no matrix change can ever grant it.
  'roles.write': OWNER,
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
  'roles.write': 'Edit Roles & Permissions',
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
  // D-167: a rule repeating on an open incident (the system's own line)
  'incident.signal',
  // PR 9: flags and integrations
  'flag.flip',
  'integration.probe',
  // D-160 R2-3b: a row of the Roles & Permissions matrix taken from, or given back to, a role.
  'permission.change',
  // D-171: a staff member's role set, a staff member removed, a staff member invited (Staff & Roles,
  // through `/api/mutate`; `STAFF_AUDIT_ACTION` in `staff-guard.ts`).
  'staff.role_change',
  'staff.remove',
  'staff.invite',
  // D-172 R2-gaps: the Build screens' remaining controls (`admin-actions.ts`).
  'module.duplicate',
  'module.save',
  'vault.edit',
  'session.create',
  'session.replay_attach',
  'announce.create',
  'announce.update',
  'announce.duplicate',
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

// ================================================================================================
// Roles & Permissions (D-157, spec § 7.16; editable since D-160 R2-3b, Connor, Nov 16, 2026)
// ================================================================================================

/**
 * The R2 Roles & Permissions matrix (D-160 R2-3b): the signed-off mockup's nine rows (`PERMS0`), each
 * the Console capabilities (`caps`, from `CONSOLE_CAPS`) or the `PermKey`s (`perms`, the matrix kept
 * on `/admin/staff`) it stands for. A role holds a row only when it holds every one of them. The Owner
 * edits a row through `checkRoleChange`: a Console row by a stored change within `CONSOLE_CAPS`, the
 * `build` row by setting its four `PermKey`s (the same matrix Staff & Roles edits, which has no ceiling).
 */
export const ROLE_ROW_KEYS = ['build', 'masq', 'account', 'billview', 'refund', 'jobs', 'export', 'ops', 'staff'] as const;
export type RoleRowKey = (typeof ROLE_ROW_KEYS)[number];
export const isRoleRowKey = (v: unknown): v is RoleRowKey => typeof v === 'string' && (ROLE_ROW_KEYS as readonly string[]).includes(v);

export interface RoleRow {
  key: RoleRowKey;
  label: string;
  caps?: readonly ConsoleCap[];
  perms?: readonly PermKey[];
}

export const ROLES_R2_ROWS: readonly RoleRow[] = [
  { key: 'build', label: 'Edit curriculum, vault, sessions, announcements, tiers', perms: ['curriculum', 'publish', 'cohorts', 'announce'] },
  { key: 'masq', label: 'Start and extend masquerade', caps: ['masquerade.start', 'masquerade.extend'] },
  { key: 'account', label: 'Send password reset or change email', caps: ['user.password_reset'] },
  { key: 'billview', label: 'View billing', caps: ['billing.read'] },
  { key: 'refund', label: 'Refund or void an invoice', caps: ['billing.refund', 'billing.void'] },
  { key: 'jobs', label: 'Run a job now, retry a webhook, update incidents', caps: ['jobs.run_now', 'webhooks.retry', 'incidents.resolve'] },
  { key: 'export', label: 'Export audit and email logs', caps: ['export'] },
  { key: 'ops', label: 'View integrations, deploys, DB health, flags, roles', caps: ['ops.read'] },
  // `roles.write` is the Owner's alone, so this row is fixed for Admin and Support.
  { key: 'staff', label: 'Edit staff roles and this matrix', caps: ['roles.write'], perms: ['staff'] },
];

export const roleRowOf = (key: RoleRowKey): RoleRow => ROLES_R2_ROWS.find((r) => r.key === key)!;

/** The matrix row each Console capability belongs to, if any (a capability is in one row at most). */
const CAP_ROW: Partial<Record<ConsoleCap, RoleRowKey>> = Object.fromEntries(
  ROLES_R2_ROWS.flatMap((r) => (r.caps ?? []).map((c) => [c, r.key] as const)),
);

/** The roles whose column the Owner may change. The Owner's own column is fixed. */
export const EDITABLE_ROLES = ['Admin', 'Support'] as const satisfies readonly ConsoleRole[];
export type EditableRole = (typeof EDITABLE_ROLES)[number];
export const isEditableRole = (v: unknown): v is EditableRole => typeof v === 'string' && (EDITABLE_ROLES as readonly string[]).includes(v);

/**
 * One stored change to the matrix (`console_role_grants`): a row taken from a role (`allowed: false`)
 * or given back (`allowed: true`). Only ever within the ceiling: a stored `true` cannot lift a row past
 * `CONSOLE_CAPS`, because the effective answer is the ceiling AND NOT removed.
 */
export interface RoleGrant {
  role: EditableRole;
  capability: RoleRowKey;
  allowed: boolean;
}

const removed = (grants: readonly RoleGrant[], role: string, row: RoleRowKey): boolean =>
  grants.some((g) => g.role === role && g.capability === row && !g.allowed);

/**
 * `consoleCan` with the Owner's changes applied: the ceiling (`CONSOLE_CAPS`) AND NOT removed. With no
 * stored changes it is `consoleCan` exactly. The Owner always passes; an unknown role or capability
 * fails closed, as in `consoleCan`.
 */
export function consoleCanWith(grants: readonly RoleGrant[], role: string | null | undefined, cap: string): boolean {
  if (!consoleCan(role, cap)) return false;
  if (role === 'Owner') return true;
  const row = CAP_ROW[cap as ConsoleCap];
  return row === undefined || !removed(grants, role!, row);
}

/** Every capability a role holds once the Owner's changes apply: what `GET /api/console/me` returns. */
export const consoleCapsWith = (grants: readonly RoleGrant[], role: string | null | undefined): ConsoleCap[] =>
  CONSOLE_CAP_KEYS.filter((c) => consoleCanWith(grants, role, c));

/**
 * The most a role may hold of a row: every one of its Console capabilities in `CONSOLE_CAPS`. A row with
 * none (`build`) is the `PermKey` matrix's, which has no ceiling: true. The Owner's is always true.
 */
export function roleRowCeiling(row: RoleRow, role: string): boolean {
  return (row.caps ?? []).every((c) => consoleCan(role, c));
}

/** The `PermKey` matrix, as `Db['perms']` holds it (0 or 1) or the `permissions` table does (a boolean). */
export type PermMatrix = Readonly<Partial<Record<string, Readonly<Partial<Record<PermKey, number | boolean>>>>>>;

/**
 * Whether a role holds a row now: its Console capabilities (the ceiling AND NOT removed) and its
 * `PermKey`s. The Owner holds every row.
 */
export function roleRowAllowed(grants: readonly RoleGrant[], perms: PermMatrix, row: RoleRow, role: string): boolean {
  if (role === 'Owner') return true;
  return (row.caps ?? []).every((c) => consoleCanWith(grants, role, c)) && (row.perms ?? []).every((p) => !!perms[role]?.[p]);
}

/** The capabilities that let a staff member reach (`ops.read`) or edit (`roles.write`) this screen. */
export const ROLES_REACH_CAPS: readonly ConsoleCap[] = ['ops.read', 'roles.write'];

export type RoleChangeRefusal = 'role_fixed' | 'invalid_query' | 'fixed_by_product' | 'self_lockout' | 'no_change';

/**
 * The server's guards on one matrix change, in order (D-160 R2-3b). The route has already checked that
 * the viewer holds `roles.write` (the Owner):
 *   1. the Owner's column never changes (`role_fixed`), nor does any role but Admin and Support;
 *   2. the permission is one of the matrix's rows (`invalid_query`);
 *   3. a row past the ceiling is fixed by product rules, either way (`fixed_by_product`);
 *   4. nobody takes from their own role a row that lets them reach or edit this screen (`self_lockout`);
 *   5. a change must change something (`no_change`).
 * `perms` is the `PermKey` matrix as it is now, for the rows that stand for `PermKey`s.
 */
export function checkRoleChange(input: {
  viewerRole: string | null | undefined;
  role: unknown;
  capability: unknown;
  allowed: boolean;
  grants: readonly RoleGrant[];
  perms: PermMatrix;
}): { ok: true; role: EditableRole; row: RoleRow; before: boolean; after: boolean } | { ok: false; code: RoleChangeRefusal } {
  const { viewerRole, role, capability, allowed, grants, perms } = input;
  if (!isEditableRole(role)) return { ok: false, code: 'role_fixed' };
  if (!isRoleRowKey(capability)) return { ok: false, code: 'invalid_query' };
  const row = roleRowOf(capability);
  if (!roleRowCeiling(row, role)) return { ok: false, code: 'fixed_by_product' };
  if (!allowed && viewerRole === role && (row.caps ?? []).some((c) => ROLES_REACH_CAPS.includes(c))) return { ok: false, code: 'self_lockout' };
  const before = roleRowAllowed(grants, perms, row, role);
  if (before === allowed) return { ok: false, code: 'no_change' };
  return { ok: true, role, row, before, after: allowed };
}

/**
 * Why a row is past a role's ceiling, in words (D-160 R2-3b): what the confirm shows when the server
 * refuses it, after "Fixed by product rules.". Each from the spec's rules (D1/D2, D3, D6, `roles.write`).
 */
const FIXED_REASONS: Partial<Record<RoleRowKey, string>> = {
  masq: 'Support can’t start or extend masquerade.',
  refund: 'Support can’t refund or void an invoice.',
  jobs: 'Support can’t run jobs, retry webhooks or resolve incidents.',
  export: 'Only the Owner and Admins can export logs.',
  ops: 'Support doesn’t see the operations pages.',
  staff: 'Only the Owner can edit staff roles and this matrix.',
};

/** "Fixed by product rules. Only the Owner and Admins can export logs." for a row past a role's ceiling. */
export function fixedByProductMessage(row: RoleRowKey): string {
  const reason = FIXED_REASONS[row];
  return reason ? `Fixed by product rules. ${reason}` : 'Fixed by product rules.';
}

/**
 * The boxes the mockup itself draws locked, with the lock (Support's masquerade and refund). Every other
 * box past the ceiling is drawn as the mockup draws it, a plain toggle the server refuses (Connor's
 * 8:29 rule 2: the mockup wins on visuals, the spec on safety).
 */
export const MOCKUP_LOCKED: Readonly<Partial<Record<ConsoleRole, readonly RoleRowKey[]>>> = { Support: ['masq', 'refund'] };

/** "allowed" / "not allowed", as the mockup's audit rows word a permission. */
const allowedWord = (on: boolean): string => (on ? 'allowed' : 'not allowed');

/** The audit row's detail: "Refund or void an invoice: allowed to not allowed." (the mockup's `log`). */
export const permissionChangeSummary = (label: string, before: boolean, after: boolean): string =>
  `${label}: ${allowedWord(before)} to ${allowedWord(after)}.`;

/** The role matrix `GET /api/console/roles` answers: `CONSOLE_CAPS` and the Owner's stored changes. */
export interface RolesMatrix {
  roles: ConsoleRole[];
  noAccess: StaffRole[];
  caps: {
    cap: ConsoleCap;
    label: string;
    /** What each role holds now: the ceiling AND NOT removed. */
    allowed: Record<ConsoleRole, boolean>;
    /** The most each role may hold (`CONSOLE_CAPS`). */
    ceiling: Record<ConsoleRole, boolean>;
    notes: Partial<Record<ConsoleRole, string>>;
  }[];
  /** The stored changes, as `console_role_grants` holds them. */
  grants: RoleGrant[];
  /** Where staff and their roles are managed: the existing Staff & Roles screen. */
  staffPath: string;
}

export const STAFF_ADMIN_PATH = '/admin/staff';

export function rolesMatrix(grants: readonly RoleGrant[] = []): RolesMatrix {
  const by = (f: (role: ConsoleRole) => boolean) => ({ Owner: f('Owner'), Admin: f('Admin'), Support: f('Support') });
  return {
    roles: [...CONSOLE_ROLES],
    noAccess: [...NO_CONSOLE_ROLES],
    caps: CONSOLE_CAP_KEYS.map((cap) => ({
      cap,
      label: CONSOLE_CAP_LABELS[cap],
      allowed: by((role) => consoleCanWith(grants, role, cap)),
      ceiling: by((role) => consoleCan(role, cap)),
      notes: { ...(CONSOLE_CAP_NOTES[cap] ?? {}) },
    })),
    grants: grants.map((g) => ({ role: g.role, capability: g.capability, allowed: g.allowed })),
    staffPath: STAFF_ADMIN_PATH,
  };
}

/** The mockup's confirm (`Roles`' `flip`), worded for one box. */
export function permissionConfirmCopy(label: string, role: string, on: boolean): { title: string; body: string; cta: string } {
  return {
    title: `${on ? 'Remove this permission from' : 'Give this permission to'} ${role}?`,
    body: `${label}. Applies to every ${role} on staff right away.`,
    cta: on ? 'Remove permission' : 'Allow',
  };
}

/** How long a preview's confirm token is good for (D-160 R2-3b): five minutes. */
export const ROLE_CONFIRM_TTL_MS = 5 * 60_000;

/** `POST /api/console/roles/preview` answers this; `POST /api/console/roles` takes the token back. */
export interface RoleChangePreview {
  role: EditableRole;
  capability: RoleRowKey;
  before: boolean;
  after: boolean;
  /** The audit row's detail, the mockup's words: "Start and extend masquerade: allowed to not allowed." */
  summary: string;
  confirmToken: string;
  /** Epoch ms. */
  expiresAt: number;
}

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
  // D-160 R2-3b: a two-step confirm (Roles & Permissions first; billing reuses them).
  confirm_invalid: { status: 403, message: 'This confirmation isn’t valid. Close this and try again.' },
  confirm_expired: { status: 410, message: 'This confirmation expired. Close this and try again.' },
  // D-160 R2-3b: the guards on a Roles & Permissions change (`checkRoleChange`), each in words.
  role_fixed: { status: 403, message: 'Owner always has every permission.' },
  fixed_by_product: { status: 403, message: 'Fixed by product rules.' },
  self_lockout: { status: 403, message: 'You can’t remove your own access to Roles & Permissions.' },
  no_change: { status: 409, message: 'This permission already has that setting.' },
  grant_stale: { status: 409, message: 'Someone changed this permission since you opened it. Close this and try again.' },
  // D-171: the guards on staff role assignment (`checkStaffChange`), each in words.
  ...STAFF_GUARD_ERRORS,
  // PR 5 (D-164, spec § 7.6): the confirmed Billing actions. They reuse the two codes above (with
  // their own sentences, `BILLING_CONFIRM_MESSAGES`) and add these.
  confirm_used: { status: 409, message: 'This confirmation was already used. Start again to make another change.' },
  confirm_mismatch: { status: 422, message: 'What you typed doesn’t match. Type it exactly as shown.' },
  invoice_not_voidable: { status: 409, message: 'Only an open or uncollectible invoice can be voided.' },
  invoice_not_refundable: { status: 409, message: 'Only a paid invoice can be refunded.' },
  refund_too_large: { status: 409, message: 'That’s more than this payment has left to refund.' },
  stripe_refused: { status: 409, message: 'Stripe refused this change. Nothing was changed.' },
  // The seat tier's (spec § 7.6). Unused: its gate failed, so it has no endpoint (D-164).
  seats_in_use: { status: 409, message: null },
  // R2-4a's routes and PR 5's each give the sentence, naming the Read or Write permission.
  stripe_permission_missing: { status: 503, message: null },
  // PR 4 (D-163): Billing reads Stripe. With no key, the screen says "Stripe isn't connected"; a read
  // Stripe refused for some other reason (or never answered) is a 502 the screen can retry.
  stripe_not_connected: { status: 503, message: 'Stripe isn’t connected.' },
  stripe_unavailable: { status: 502, message: 'Stripe didn’t answer. Nothing was changed.' },
  // PR 6 (D-165, spec § 7.10): Run Now's two refusals, in the mockup's own words for the first, and
  // the GHL retry's guard (spec § 1: the Console never writes to Spring's GHL location).
  job_not_runnable: { status: 403, message: 'This job only runs on its schedule. It cannot be started by hand.' },
  scheduler_busy: { status: 409, message: 'The scheduler is running right now. Try again in a minute.' },
  ghl_location_guarded: { status: 409, message: 'GoHighLevel still points at Spring’s location, so Console won’t queue a retry there.' },
  // PR 8 (D-167): Acknowledge on an incident that isn't open, Resolve on one already resolved.
  incident_state: { status: 409, message: 'This incident has already moved on. Reload it to see where it is.' },
  // PR 9 (D-168): a read the Console couldn't finish (DB health's two-second limit, a Check now with
  // nothing to ask).
  ops_unavailable: { status: 503, message: 'This didn’t finish. Try again in a minute.' },
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
