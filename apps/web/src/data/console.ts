// The Admin Console's typed client (D-157). Built on `data/http.ts`: a 401 is its sign-in redirect,
// unchanged, and every other refusal becomes a `ConsoleError` the screens turn into a state (Denied,
// Too Many Requests, Error) by its `kind`.
//
// The fixture build (the compliance and screenshot target) answers from `console-fixture.ts` instead,
// loaded with a dynamic import behind `import.meta.env.VITE_DATA_SOURCE`, which Vite replaces with a
// constant at build time. In the http build that branch is dead, so the fixture's fictional people
// never reach production: `console-build.test.ts` builds this module both ways and checks.

import { OPS_PATHS, isConsoleErrorCode, jobRunPath } from '@ai/core';
import type {
  IncidentDetail,
  IncidentFilters,
  IncidentRow,
  IncidentSummary,
  ApiEndpoints,
  ConsoleJobs,
  ConsoleWebhooks,
  GhlRetryKind,
  JobRunResult,
  AuditFilters,
  AuditRow,
  BillingAction,
  BillingActionPreview,
  BillingActionResult,
  BillingCustomerRow,
  BillingFailedRow,
  BillingInvoiceRow,
  BillingRefundRow,
  BillingSubscriptionRow,
  BillingSummary,
  ConsoleErrorCode,
  ConsoleMe,
  ConsolePage,
  ConsoleUserDetail,
  ConsoleUserRow,
  MasqueradeHistoryRow,
  EditableRole,
  RoleChangePreview,
  RoleRowKey,
  EmailLogFilters,
  EmailLogPage,
  RolesMatrix,
  StaffChangePreview,
  StaffConsoleRequest,
  SearchResults,
  StaffNote,
  StaffNoteTarget,
  UsageQuery,
  UsageReport,
  UserFilters,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceRow,
} from '@ai/core';
import { masqueradeRefusal, navigation } from './http';
import { masqueradeActive } from './masquerade';

/** What went wrong, as a screen needs to know it. */
export type ConsoleFailure =
  /** 403 `console_forbidden`: the Denied state. */
  | 'forbidden'
  /** 403 `masquerade_blocked` (PR 3): the blocked dialog. */
  | 'blocked'
  /** 429: "Too many requests". */
  | 'rate_limited'
  /** 404. */
  | 'not_found'
  /** 422 `export_too_large`. */
  | 'too_large'
  /** 400 `invalid_query`. */
  | 'invalid'
  /**
   * D-160 R2-3b: a Roles & Permissions change refused by a guard or its confirm token (`role_fixed`,
   * `fixed_by_product`, `self_lockout`, `grant_stale`, `confirm_expired`, …). The dialog shows the
   * code's own sentence (`CONSOLE_ERRORS`).
   */
  | 'refused'
  /** 503 `stripe_not_connected` (PR 4, D-163): "Stripe isn't connected". */
  | 'stripe_off'
  /** 503 `stripe_permission_missing`: the key lacks a Read permission, which the error names. */
  | 'stripe_scope'
  /** Anything else: a 5xx, a dropped connection, a body that isn't JSON. */
  | 'failed';

export class ConsoleError extends Error {
  constructor(
    readonly kind: ConsoleFailure,
    readonly status: number,
    readonly code: ConsoleErrorCode | null,
    message: string,
  ) {
    super(message);
    this.name = 'ConsoleError';
  }
}

/** The codes a Roles & Permissions change is refused with (D-160 R2-3b). */
export const REFUSALS = [
  'role_fixed',
  'managed_elsewhere',
  'fixed_by_product',
  'self_lockout',
  'no_change',
  'grant_stale',
  'confirm_invalid',
  'confirm_expired',
  // D-171's guards (#155), and D-172's Invite staff and Change role….
  'staff_self_change',
  'staff_last_owner',
  'staff_owner_grant',
  'staff_stale',
  'staff_invalid',
] as const;

/** A status and a code as a failure kind. The code wins where there is one. */
export function failureOf(status: number, code: unknown): ConsoleFailure {
  if (code === 'console_forbidden') return 'forbidden';
  if (code === 'masquerade_blocked') return 'blocked';
  if (code === 'export_too_large') return 'too_large';
  if (code === 'invalid_query' || code === 'invalid_body' || code === 'reason_required') return 'invalid';
  if (code === 'not_found') return 'not_found';
  if (typeof code === 'string' && (REFUSALS as readonly string[]).includes(code)) return 'refused';
  if (code === 'stripe_not_connected') return 'stripe_off';
  if (code === 'stripe_permission_missing') return 'stripe_scope';
  if (status === 429) return 'rate_limited';
  if (status === 404) return 'not_found';
  if (status === 403) return 'forbidden';
  return 'failed';
}

export interface ConsoleApi {
  readonly source: 'http' | 'fixture';
  me(): Promise<ConsoleMe>;
  audit(filters: AuditFilters, cursor?: string | null): Promise<ConsolePage<AuditRow>>;
  /** The CSV and the file name the server gave it. */
  exportAudit(filters: AuditFilters): Promise<{ csv: string; filename: string }>;
  roles(): Promise<RolesMatrix>;
  // PR 2 (D-158): workspaces, users, staff notes, the password reset and the users export.
  workspaces(filters: WorkspaceFilters, cursor?: string | null): Promise<ConsolePage<WorkspaceRow>>;
  workspace(teamId: string): Promise<WorkspaceDetail>;
  users(filters: UserFilters, cursor?: string | null): Promise<ConsolePage<ConsoleUserRow>>;
  user(userId: string): Promise<ConsoleUserDetail>;
  notes(targetType: StaffNoteTarget, targetId: string): Promise<StaffNote[]>;
  addNote(targetType: StaffNoteTarget, targetId: string, body: string): Promise<StaffNote>;
  deleteNote(noteId: string, reason: string): Promise<void>;
  /** Which link went out: a reset, or a set-password link for someone with no password yet. */
  resetPassword(userId: string): Promise<{ link: 'reset' | 'set' }>;
  exportUsers(filters: UserFilters): Promise<{ csv: string; filename: string }>;
  /** Spec § 7.5: 2 to 100 characters; users, workspaces, orders and skills, five each. */
  search(q: string): Promise<SearchResults>;
  /** D-160 R2-3b, the Owner's two-step change: what it would do, and the token that confirms it. */
  previewRole(change: { role: EditableRole; capability: RoleRowKey; allowed: boolean }): Promise<RoleChangePreview>;
  /** Makes the previewed change; answers the matrix as it now is. */
  changeRole(confirmToken: string): Promise<RolesMatrix>;
  /** PR 3 (D-162): every masquerade session, newest first (`masquerade.start`). */
  masqueradeSessions(cursor?: string | null): Promise<ConsolePage<MasqueradeHistoryRow>>;
  /** D-172, the Owner's two-step Invite staff and Change role…: the change in words, and its token. */
  previewStaff(change: StaffConsoleRequest): Promise<StaffChangePreview>;
  /** Makes the previewed staff change; answers its toast. */
  changeStaff(confirmToken: string): Promise<{ toast: string }>;
  // PR 4 (D-163): Billing, read-only.
  billingSummary(): Promise<BillingSummary>;
  billingList<K extends BillingListKind>(kind: K, cursor?: string | null): Promise<ConsolePage<BillingRows[K]>>;
  /**
   * FIXTURE ONLY: the mockup's "· sample" qualifiers for its sample figures (BUILD-SPEC § 6.1). The
   * http client has no such method, so production prints its own words (D-163).
   */
  billingSample?(): BillingSample;
  // PR 5 (D-164): the confirmed refund and void, in two steps (spec § 7.6).
  /** What the action would do, and a confirm token good for 5 minutes. A refund is of what is left to refund. */
  billingPreview(action: BillingAction, params: { invoiceId: string }): Promise<BillingActionPreview>;
  /** The action itself: the preview's token, a reason of 10 to 500 characters, and what staff typed. */
  billingExecute(action: BillingAction, body: { confirmToken: string; reason: string; typed: string }): Promise<BillingActionResult>;
  // PR 6 (D-165): API & Webhooks and Scheduled Jobs.
  apiEndpoints(): Promise<ApiEndpoints>;
  webhooks(): Promise<ConsoleWebhooks>;
  /** The CRM sync's own reset for one GHL row (D13). */
  retryWebhook(kind: GhlRetryKind, id: string): Promise<void>;
  jobs(): Promise<ConsoleJobs>;
  /** Run Now (D14): the manual tick it recorded. */
  runJob(job: string): Promise<JobRunResult>;
  // PR 7 (D-166): the email log and usage.
  emails(filters: EmailLogFilters, cursor?: string | null): Promise<EmailLogPage>;
  exportEmails(filters: EmailLogFilters): Promise<{ csv: string; filename: string }>;
  usage(query: UsageQuery): Promise<UsageReport>;
  // PR 8 (D-167): incidents. Each write answers the incident as it now is.
  incidents(filters: IncidentFilters, cursor?: string | null): Promise<ConsolePage<IncidentRow>>;
  /** The sidebar's "1 incident": how many are open and not yet acknowledged. */
  incidentSummary(): Promise<IncidentSummary>;
  incident(id: string): Promise<IncidentDetail>;
  ackIncident(id: string): Promise<IncidentDetail>;
  resolveIncident(id: string, note: string): Promise<IncidentDetail>;
  noteIncident(id: string, body: string): Promise<IncidentDetail>;
}

/** Billing's lists (spec § 7.6), by the tab that shows each. */
export interface BillingRows {
  customers: BillingCustomerRow;
  subscriptions: BillingSubscriptionRow;
  invoices: BillingInvoiceRow;
  failed: BillingFailedRow;
  refunds: BillingRefundRow;
}
export type BillingListKind = keyof BillingRows;

/** What the fixture's sample figures are labelled (the mockup's words), fixture build only. */
export interface BillingSample {
  mrrLabel: string;
  mrrSub: string;
  plansTitle: string;
}

/**
 * Whether a masquerade session is running (spec § 7.5: the palette is "disabled during a session").
 * The masquerade store's answer (`data/masquerade.ts`, D-162 3b); the palette asks before it opens.
 */
export { masqueradeActive };

/** A query string of the set values, in the order given, then the cursor. */
export function listQuery(values: Record<string, string | number | undefined>, cursor?: string | null): string {
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(values)) if (v !== undefined && v !== '') q.set(key, String(v));
  if (cursor) q.set('cursor', cursor);
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** A window event the incident screens dispatch after a change, so the sidebar's count reads again. */
export const INCIDENTS_CHANGED = 'ai-incidents-changed';

const incidentPath = (id: string): string => `/api/console/incidents/${encodeURIComponent(id)}`;

const JSON_POST = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** The audit list's query string: only the filters that are set, then the cursor. */
export function auditQuery(filters: AuditFilters, cursor?: string | null): string {
  const q = new URLSearchParams();
  for (const key of ['actor', 'action', 'target', 'outcome', 'from', 'to'] as const) {
    const v = filters[key];
    if (v !== undefined && v !== '') q.set(key, String(v));
  }
  if (cursor) q.set('cursor', cursor);
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function refusal(res: Response): Promise<never> {
  if (res.status === 401) {
    navigation.toSignIn();
    throw new ConsoleError('failed', 401, null, 'Not signed in');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: unknown; code?: unknown };
  // During a masquerade (D-162 3b): a session that ended goes back; a refused call opens the dialog.
  masqueradeRefusal(res.status, body);
  const code = isConsoleErrorCode(body.code) ? body.code : null;
  throw new ConsoleError(failureOf(res.status, body.code), res.status, code, typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
}

async function request(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetchImpl(url, { credentials: 'include', ...init, headers: { accept: 'application/json', ...(init?.headers ?? {}) } });
  } catch {
    throw new ConsoleError('failed', 0, null, 'The request didn’t reach the server.');
  }
  if (!res.ok) await refusal(res);
  return res;
}

const json = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    throw new ConsoleError('failed', res.status, null, 'The answer wasn’t readable.');
  }
};

/** The file name from `content-disposition`, or a dated default. */
export function filenameOf(disposition: string | null, fallback: string): string {
  const m = disposition ? /filename="([^"]+)"/.exec(disposition) : null;
  return m?.[1] ?? fallback;
}

export function createConsoleHttp(fetchImpl: typeof fetch = (...a) => fetch(...a)): ConsoleApi {
  return {
    source: 'http',
    me: async () => json<ConsoleMe>(await request(fetchImpl, '/api/console/me')),
    audit: async (filters, cursor) => json<ConsolePage<AuditRow>>(await request(fetchImpl, `/api/console/audit${auditQuery(filters, cursor)}`)),
    exportAudit: async (filters) => {
      const res = await request(fetchImpl, '/api/console/audit/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/csv' },
        body: JSON.stringify(filters),
      });
      return { csv: await res.text(), filename: filenameOf(res.headers.get('content-disposition'), 'audit-log.csv') };
    },
    roles: async () => json<RolesMatrix>(await request(fetchImpl, '/api/console/roles')),
    workspaces: async (f, cursor) =>
      json<ConsolePage<WorkspaceRow>>(await request(fetchImpl, `/api/console/workspaces${listQuery({ q: f.q, plan: f.plan, status: f.status }, cursor)}`)),
    workspace: async (teamId) => json<WorkspaceDetail>(await request(fetchImpl, `/api/console/workspaces/${encodeURIComponent(teamId)}`)),
    users: async (f, cursor) => json<ConsolePage<ConsoleUserRow>>(await request(fetchImpl, `/api/console/users${listQuery({ q: f.q, role: f.role, kind: f.kind }, cursor)}`)),
    user: async (userId) => json<ConsoleUserDetail>(await request(fetchImpl, `/api/console/users/${encodeURIComponent(userId)}`)),
    notes: async (targetType, targetId) =>
      (await json<{ rows: StaffNote[] }>(await request(fetchImpl, `/api/console/notes${listQuery({ targetType, targetId })}`))).rows,
    addNote: async (targetType, targetId, body) => json<StaffNote>(await request(fetchImpl, '/api/console/notes', JSON_POST({ targetType, targetId, body }))),
    deleteNote: async (noteId, reason) => {
      await request(fetchImpl, `/api/console/notes/${encodeURIComponent(noteId)}/delete`, JSON_POST({ reason }));
    },
    resetPassword: async (userId) => {
      const out = await json<{ link: 'reset' | 'set' }>(await request(fetchImpl, `/api/console/users/${encodeURIComponent(userId)}/password-reset`, JSON_POST({})));
      return { link: out.link };
    },
    exportUsers: async (f) => {
      const res = await request(fetchImpl, '/api/console/users/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/csv' },
        body: JSON.stringify(f),
      });
      return { csv: await res.text(), filename: filenameOf(res.headers.get('content-disposition'), 'users.csv') };
    },
    search: async (q) => (await json<{ groups: SearchResults }>(await request(fetchImpl, `/api/console/search${listQuery({ q })}`))).groups,
    previewRole: async (change) =>
      json<RoleChangePreview>(
        await request(fetchImpl, '/api/console/roles/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) }),
      ),
    changeRole: async (confirmToken) =>
      json<RolesMatrix>(await request(fetchImpl, '/api/console/roles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmToken }) })),
    masqueradeSessions: async (cursor) => json<ConsolePage<MasqueradeHistoryRow>>(await request(fetchImpl, `/api/console/masquerade/sessions${listQuery({}, cursor)}`)),
    previewStaff: async (change) =>
      json<StaffChangePreview>(
        await request(fetchImpl, '/api/console/staff/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) }),
      ),
    changeStaff: async (confirmToken) =>
      json<{ toast: string }>(await request(fetchImpl, '/api/console/staff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmToken }) })),
    billingSummary: async () => json<BillingSummary>(await request(fetchImpl, '/api/console/billing/summary')),
    billingList: async (kind, cursor) => json(await request(fetchImpl, `/api/console/billing/${kind}${listQuery({}, cursor)}`)),
    billingPreview: async (action, params) =>
      json<BillingActionPreview>(await request(fetchImpl, `/api/console/billing/${action}/preview`, JSON_POST({ invoiceId: params.invoiceId }))),
    billingExecute: async (action, body) => json<BillingActionResult>(await request(fetchImpl, `/api/console/billing/${action}`, JSON_POST(body))),
    apiEndpoints: async () => json<ApiEndpoints>(await request(fetchImpl, OPS_PATHS.apiEndpoints)),
    webhooks: async () => json<ConsoleWebhooks>(await request(fetchImpl, OPS_PATHS.webhooks)),
    retryWebhook: async (kind, id) => {
      await request(fetchImpl, OPS_PATHS.ghlRetry, JSON_POST({ kind, id }));
    },
    jobs: async () => json<ConsoleJobs>(await request(fetchImpl, OPS_PATHS.jobs)),
    runJob: async (job) => json<JobRunResult>(await request(fetchImpl, jobRunPath(job), JSON_POST({}))),
    emails: async (f, cursor) =>
      json<EmailLogPage>(await request(fetchImpl, `/api/console/email${listQuery({ q: f.q, template: f.template, status: f.status, userId: f.userId, teamId: f.teamId, from: f.from, to: f.to }, cursor)}`)),
    exportEmails: async (f) => {
      const res = await request(fetchImpl, '/api/console/email/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/csv' },
        body: JSON.stringify(f),
      });
      return { csv: await res.text(), filename: filenameOf(res.headers.get('content-disposition'), 'email-log.csv') };
    },
    usage: async (u) => json<UsageReport>(await request(fetchImpl, `/api/console/usage${listQuery({ from: u.from, to: u.to, teamId: u.teamId, planKind: u.planKind })}`)),
    incidents: async (f, cursor) => json<ConsolePage<IncidentRow>>(await request(fetchImpl, `/api/console/incidents${listQuery({ status: f.status }, cursor)}`)),
    incidentSummary: async () => json<IncidentSummary>(await request(fetchImpl, '/api/console/incidents/summary')),
    incident: async (id) => json<IncidentDetail>(await request(fetchImpl, incidentPath(id))),
    ackIncident: async (id) => json<IncidentDetail>(await request(fetchImpl, `${incidentPath(id)}/ack`, JSON_POST({}))),
    resolveIncident: async (id, note) => json<IncidentDetail>(await request(fetchImpl, `${incidentPath(id)}/resolve`, JSON_POST({ note }))),
    noteIncident: async (id, body) => json<IncidentDetail>(await request(fetchImpl, `${incidentPath(id)}/notes`, JSON_POST({ body }))),
  };
}

let api: Promise<ConsoleApi> | null = null;

/** The Console client for this build: the API, or in the fixture build its fictional stand-in. */
export function consoleApi(): Promise<ConsoleApi> {
  api ??=
    import.meta.env.VITE_DATA_SOURCE === 'fixture'
      ? import('./console-fixture').then((m) => m.createConsoleFixture())
      : Promise.resolve(createConsoleHttp());
  return api;
}

/**
 * The staff role the fixture build previews (its role switch, in `console-fixture.ts`), for the shell's sidebar, so a role's
 * sidebar can be seen and screenshotted there. Null in the http build, where this branch is dead and the
 * shell filters by the snapshot's own role: `users.staff_role`, the same column the API authorizes on.
 */
export async function fixtureConsoleRole(): Promise<string | null> {
  if (import.meta.env.VITE_DATA_SOURCE !== 'fixture') return null;
  try {
    return (await (await consoleApi()).me()).role;
  } catch {
    return null;
  }
}
