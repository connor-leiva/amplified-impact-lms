// The Admin Console's fixture (D-157): what the Console screens read in the fixture build, so they
// render for screenshots and e2e with no API. FIXTURE ONLY: `console.ts` loads it behind
// `VITE_DATA_SOURCE === 'fixture'`, and `console-build.test.ts` proves the http build leaves it out.
//
// Every person here is the prototype's own fictional staff (`@ai/core`'s seed: Casey Lin, Jordan Hale,
// Maya Chen, Luis Romero). Every address is from the documentation ranges (RFC 5737). No real
// customer, no proof line, no sample money.
//
// Two fixture-only query parameters, read here and nowhere else, so the http build cannot see them:
//   ?console-role=Owner|Admin|Support|Instructor|Content Editor   the viewer's staff role (default:
//                                                                  the admin persona's, Owner)
//   ?console-state=loading|empty|error|rate_limited                a list's state, for screenshots
//                  |stripe_off|stripe_scope                         and Billing's (D-163): no Stripe key, a missing scope
//                  |action_expired|action_scope                     and its refund and void dialogs' refusals (D-164):
//                                                                   a 410 expired confirmation, a missing Write scope
//   ?masquerade-flag=off                                           D8's flag off (D-162 3b): the entry
//                                                                  points drawn disabled

import {
  CONSOLE_ERRORS,
  CONSOLE_PAGE_DEFAULT,
  ROLE_CONFIRM_TTL_MS,
  STAFF_ROLES,
  auditActionGroup,
  auditCsv,
  auditRedactsNetwork,
  checkRoleChange,
  cleanNoteBody,
  cleanReason,
  cleanSearch,
  consoleCanWith,
  consoleCapsWith,
  isRunNowJob,
  permissionChangeSummary,
  roleRowOf,
  rolesMatrix,
  stripeScopeMessage,
  usersCsv,
} from '@ai/core';
import type {
  AuditAction,
  AuditFilters,
  AuditRow,
  ConsoleErrorCode,
  ConsoleMe,
  ConsolePage,
  PermMatrix,
  RoleChangePreview,
  RoleGrant,
  StaffRole,
} from '@ai/core';
import { clock } from '../lib/clock';
import { fixtureRole, repo } from './boot';
import { ConsoleError } from './console';
import type { ConsoleApi } from './console';
import {
  fixtureMasqueradeSessions,
  fixtureNoteTargetExists,
  fixtureRecords,
  fixtureSearch,
  fixtureUser,
  fixtureUserRows,
  fixtureWorkspace,
  fixtureWorkspaceRows,
} from './console-fixture-records';
import { BILLING_SAMPLE_LABELS, fixtureBillingExecute, fixtureBillingPreview, fixtureBillingRows, fixtureBillingSummary } from './console-fixture-billing';
import { fixtureEndpoints, fixtureJobRows, fixtureJobs, fixtureRunJob, fixtureWebhookRows, fixtureWebhooks } from './console-fixture-ops';
import { readParityR2 } from './parity-r2';
import { parityAuditRows, parityRoleGrants } from './parity-r2-db';

export const FIXTURE_CONSOLE_STATES = ['loading', 'empty', 'error', 'rate_limited', 'stripe_off', 'stripe_scope', 'action_expired', 'action_scope'] as const;
export type FixtureConsoleState = (typeof FIXTURE_CONSOLE_STATES)[number];

const HOUR = 3600_000;

/** The prototype's staff (packages/core/src/seed.ts), as audit actors. */
const STAFF = {
  casey: { userId: 'st1', name: 'Casey Lin', role: 'Owner' },
  jordan: { userId: 'st2', name: 'Jordan Hale', role: 'Instructor' },
  maya: { userId: 'st3', name: 'Maya Chen', role: 'Content Editor' },
  luis: { userId: 'st4', name: 'Luis Romero', role: 'Support' },
} as const;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

/**
 * 56 rows over the week before `now`, newest first: what PR 1 writes (exports and refused staff),
 * enough for a second page.
 */
export function fixtureAuditRows(now: number): AuditRow[] {
  const out: AuditRow[] = [];
  for (let i = 0; i < 56; i++) {
    const at = now - HOUR / 2 - i * 2.9 * HOUR;
    const id = String(1000 - i);
    const net = { ip: `203.0.113.${10 + (i % 40)}`, userAgent: UA, requestId: `req-${(7340 - i * 13).toString(36)}` };
    const common = { id, at, masqueradeSessionId: null, before: null, ...net };
    const kind = i % 7;
    if (kind === 1 || kind === 4) {
      const who = kind === 1 ? STAFF.luis : STAFF.jordan;
      const [route, capability] = kind === 1 ? ['GET /api/console/roles', 'ops.read'] : ['GET /api/console/audit', 'audit.read'];
      out.push({ ...common, actor: { ...who, source: 'staff' }, action: 'console.access_denied', target: { type: 'route', id: route, label: null }, reason: null, after: { capability }, outcome: 'denied' });
    } else if (kind === 6) {
      out.push({ ...common, actor: { ...STAFF.maya, source: 'staff' }, action: 'console.access_denied', target: { type: 'route', id: 'POST /api/console/audit/export', label: null }, reason: null, after: { capability: 'export' }, outcome: 'denied' });
    } else if (i === 9) {
      out.push({ ...common, actor: { ...STAFF.casey, source: 'staff' }, action: 'audit.export', target: { type: 'audit_log', id: null, label: 'Audit log' }, reason: 'export_too_large', after: { rows: 10412, filters: {} }, outcome: 'failed' });
    } else {
      const rows = 12 + ((i * 7) % 40);
      out.push({ ...common, actor: { ...STAFF.casey, source: 'staff' }, action: 'audit.export', target: { type: 'audit_log', id: null, label: 'Audit log' }, reason: null, after: { rows, format: 'csv', filters: i % 3 ? { action: 'console' } : {} }, outcome: 'ok' });
    }
  }
  return out;
}

/** The API's filter, applied in memory. */
export function matches(r: AuditRow, f: AuditFilters): boolean {
  if (f.actor === 'system' ? r.actor.source !== 'system' : f.actor !== undefined && r.actor.userId !== f.actor) return false;
  if (f.action !== undefined && r.action !== f.action && auditActionGroup(r.action) !== f.action) return false;
  if (f.outcome !== undefined && r.outcome !== f.outcome) return false;
  if (f.from !== undefined && r.at < f.from) return false;
  if (f.to !== undefined && r.at > f.to) return false;
  if (f.target !== undefined) {
    const t = f.target.toLowerCase();
    if (![r.target.id, r.target.label, r.target.type].some((v) => v?.toLowerCase().includes(t))) return false;
  }
  return true;
}

const params = (): URLSearchParams => new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

function readRole(qs: URLSearchParams): StaffRole {
  const r = qs.get('console-role');
  return r && (STAFF_ROLES as readonly string[]).includes(r) ? (r as StaffRole) : 'Owner';
}

function readState(qs: URLSearchParams): FixtureConsoleState | null {
  const s = qs.get('console-state');
  return s && (FIXTURE_CONSOLE_STATES as readonly string[]).includes(s) ? (s as FixtureConsoleState) : null;
}

const forbidden = () => new ConsoleError('forbidden', 403, 'console_forbidden', 'Your role can’t use this part of Console.');

const notFound = () => new ConsoleError('not_found', 404, 'not_found', 'That record doesn’t exist.');

/** A page of `all`, cut where the API would cut it, the cursor being the next row's position. */
function pageOf<T>(all: T[], cursor: string | null | undefined): ConsolePage<T> {
  const start = cursor ? Number(cursor) : 0;
  const rows = all.slice(start, start + CONSOLE_PAGE_DEFAULT);
  return { rows, nextCursor: start + CONSOLE_PAGE_DEFAULT < all.length ? String(start + CONSOLE_PAGE_DEFAULT) : null };
}

/** A Roles & Permissions refusal, as the API words it (D-160 R2-3b). */
const refused = (code: ConsoleErrorCode) =>
  code === 'invalid_query'
    ? new ConsoleError('invalid', 400, code, 'That change isn’t valid.')
    : new ConsoleError('refused', CONSOLE_ERRORS[code].status, code, CONSOLE_ERRORS[code].message ?? code);

export interface ConsoleFixtureOptions {
  role?: StaffRole;
  state?: FixtureConsoleState | null;
  /** Whether the fixture persona is staff (`?as=admin`). */
  staff?: boolean;
  now?: () => number;
}

export function createConsoleFixture(opts: ConsoleFixtureOptions = {}): ConsoleApi {
  const qs = params();
  const role = opts.role ?? readRole(qs);
  const state = opts.state !== undefined ? opts.state : readState(qs);
  const staff = opts.staff ?? fixtureRole === 'admin';
  const now = opts.now ?? (() => clock.now());
  // The R2 parity fixture (D-160 R2-3b, `?parity=r2`): the mockup's ten rows (`AUDIT0`), answered
  // whatever the date range, as the mockup draws them under "Last 7 days" (one of them, Nov 1, is
  // older; the server would leave it out). Every other filter applies.
  const parity = readParityR2() !== null;
  let rows = parity ? parityAuditRows() : fixtureAuditRows(now());
  let next = parity ? 2001 : 1001;
  const records = fixtureRecords();
  // D-164: Billing's lists, kept so a refund or a void shows on the next read, as Stripe's would.
  const billing = fixtureBillingRows();
  let noteId = 100;
  // D-165: the mockup's deliveries and jobs, changed by a retry or a Run Now as the API's would be.
  let hooks = fixtureWebhookRows();
  let jobs = fixtureJobRows();

  /** What the API's write would audit, so the Audit Log shows it on the next load. */
  const record = (action: AuditAction, target: AuditRow['target'], after: unknown, reason: string | null = null) => {
    rows = [
      { id: String(next++), at: now(), actor: { ...STAFF.casey, role, source: 'staff' }, masqueradeSessionId: null, action, target, reason, before: null, after, outcome: 'ok', ip: '203.0.113.10', userAgent: UA, requestId: null },
      ...rows,
    ];
  };

  // D-160 R2-3b: the Owner's matrix changes, in memory, as `console_role_grants` holds them; the
  // parity fixture starts from the mockup's `PERMS0`. A preview's token is a key into `tokens` (the
  // fixture has no secret to sign with), good for the same five minutes as the server's.
  let grants: RoleGrant[] = parity ? parityRoleGrants() : [];
  const tokens = new Map<string, { role: RoleGrant['role']; capability: RoleGrant['capability']; before: boolean; after: boolean; exp: number }>();
  let minted = 0;
  /** The fixture snapshot's PermKey matrix (the `build` row), as the server reads `permissions`. */
  const perms = async (): Promise<PermMatrix> => (await repo.snapshot()).perms;

  const settle = <T>(value: () => T): Promise<T> => {
    if (state === 'loading') return new Promise<T>(() => {});
    if (state === 'error') return Promise.reject(new ConsoleError('failed', 502, null, 'Bad gateway'));
    if (state === 'rate_limited') return Promise.reject(new ConsoleError('rate_limited', 429, null, 'Rate limit exceeded, retry in 1 minute'));
    if (state === 'stripe_off') return Promise.reject(new ConsoleError('stripe_off', 503, 'stripe_not_connected', 'Stripe isn’t connected.'));
    if (state === 'stripe_scope') return Promise.reject(new ConsoleError('stripe_scope', 503, 'stripe_permission_missing', stripeScopeMessage('Invoices')));
    try {
      return Promise.resolve(value());
    } catch (e) {
      return Promise.reject(e);
    }
  };
  const need = (cap: string) => {
    if (!staff || !consoleCanWith(grants, role, cap)) throw forbidden();
  };

  return {
    source: 'fixture',
    // The viewer is answered whatever the list's state, so a state screenshot shows the screen.
    me: () => {
      if (!staff) return Promise.reject(forbidden());
      const me: ConsoleMe = { role, caps: consoleCapsWith(grants, role), masqueradeEnabled: qs.get('masquerade-flag') !== 'off' };
      return Promise.resolve(me);
    },
    audit: (filters, cursor) =>
      settle(() => {
        need('audit.read');
        if (state === 'empty') return { rows: [], nextCursor: null };
        const redact = auditRedactsNetwork(role);
        const f = parity ? { ...filters, from: undefined, to: undefined } : filters;
        const all = rows.filter((r) => matches(r, f) && (!cursor || Number(r.id) < Number(cursor)));
        const pageRows = all.slice(0, CONSOLE_PAGE_DEFAULT).map((r) => (redact ? { ...r, ip: null, userAgent: null } : r));
        return { rows: pageRows, nextCursor: all.length > CONSOLE_PAGE_DEFAULT ? pageRows[pageRows.length - 1]!.id : null };
      }),
    exportAudit: (filters) =>
      settle(() => {
        need('export');
        const picked = rows.filter((r) => matches(r, filters));
        const csv = auditCsv(picked);
        const at = now();
        // The export is audited here too, so the list shows it on the next load.
        const self: AuditRow = {
          id: String(next++),
          at,
          actor: { ...STAFF.casey, role, source: 'staff' },
          masqueradeSessionId: null,
          action: 'audit.export',
          target: { type: 'audit_log', id: null, label: 'Audit log' },
          reason: null,
          before: null,
          after: { rows: picked.length, format: 'csv', filters },
          outcome: 'ok',
          ip: '203.0.113.10',
          userAgent: UA,
          requestId: null,
        };
        rows = [self, ...rows];
        return { csv, filename: `audit-log-${new Date(at).toISOString().slice(0, 10)}.csv` };
      }),
    roles: () =>
      settle(() => {
        need('ops.read');
        return rolesMatrix(grants);
      }),
    // The `build` row's PermKeys are the fixture snapshot's (`repo`), set with the same core mutation the
    // server runs, so Staff & Roles and this matrix agree here as they do over http.
    previewRole: (change) =>
      settle(() => need('roles.write')).then(async () => {
        const check = checkRoleChange({ viewerRole: role, ...change, grants, perms: await perms() });
        if (!check.ok) throw refused(check.code);
        const exp = now() + ROLE_CONFIRM_TTL_MS;
        const confirmToken = `fixture-${++minted}`;
        tokens.set(confirmToken, { role: check.role, capability: check.row.key, before: check.before, after: check.after, exp });
        const preview: RoleChangePreview = {
          role: check.role,
          capability: check.row.key,
          before: check.before,
          after: check.after,
          summary: permissionChangeSummary(check.row.label, check.before, check.after),
          confirmToken,
          expiresAt: exp,
        };
        return preview;
      }),
    changeRole: (confirmToken) =>
      settle(() => need('roles.write')).then(async () => {
        const p = await perms();
        const t = tokens.get(confirmToken);
        if (!t) throw refused('confirm_invalid');
        if (now() > t.exp) throw refused('confirm_expired');
        const check = checkRoleChange({ viewerRole: role, role: t.role, capability: t.capability, allowed: t.after, grants, perms: p });
        if (!check.ok || check.before !== t.before) throw refused('grant_stale');
        tokens.delete(confirmToken);
        const row = roleRowOf(t.capability);
        if (row.caps?.length) grants = [...grants.filter((g) => !(g.role === t.role && g.capability === t.capability)), { role: t.role, capability: t.capability, allowed: t.after }];
        else for (const perm of row.perms ?? []) if (!!p[t.role]?.[perm] !== t.after) await repo.run('togglePermission', { role: t.role, perm });
        const side = (allowed: boolean) => ({ permission: t.capability, label: row.label, allowed, ...(row.caps ? { capabilities: row.caps } : {}), ...(row.perms ? { perms: row.perms } : {}) });
        const self: AuditRow = {
          id: String(next++),
          at: now(),
          actor: { ...STAFF.casey, role, source: 'staff' },
          masqueradeSessionId: null,
          action: 'permission.change',
          target: { type: 'role', id: t.role, label: t.role },
          reason: null,
          before: side(t.before),
          after: side(t.after),
          outcome: 'ok',
          ip: '203.0.113.10',
          userAgent: UA,
          requestId: null,
        };
        rows = [self, ...rows];
        return rolesMatrix(grants);
      }),
    workspaces: (filters, cursor) =>
      settle(() => {
        need('workspaces.read');
        return state === 'empty' ? { rows: [], nextCursor: null } : pageOf(fixtureWorkspaceRows(records, filters), cursor);
      }),
    workspace: (teamId) =>
      settle(() => {
        need('workspaces.read');
        const w = fixtureWorkspace(records, teamId);
        if (!w) throw notFound();
        return w;
      }),
    users: (filters, cursor) =>
      settle(() => {
        need('users.read');
        return state === 'empty' ? { rows: [], nextCursor: null } : pageOf(fixtureUserRows(records, filters), cursor);
      }),
    user: (userId) =>
      settle(() => {
        need('users.read');
        const u = fixtureUser(records, userId);
        if (!u) throw notFound();
        return u;
      }),
    notes: (targetType, targetId) =>
      settle(() => {
        need(targetType === 'workspace' ? 'workspaces.read' : 'users.read');
        if (state === 'empty') return [];
        return records.notes.filter((n) => n.targetType === targetType && n.targetId === targetId).sort((a, b) => b.createdAt - a.createdAt || Number(b.id) - Number(a.id));
      }),
    addNote: (targetType, targetId, body) =>
      settle(() => {
        need('notes.write');
        const text = cleanNoteBody(body);
        if (text === null) throw new ConsoleError('invalid', 400, 'invalid_body', 'A note is 1 to 2,000 characters.');
        if (!fixtureNoteTargetExists(records, targetType, targetId)) throw notFound();
        const note = { id: String(noteId++), targetType, targetId, author: { id: STAFF.casey.userId, name: STAFF.casey.name }, body: text, createdAt: now() };
        records.notes = [note, ...records.notes];
        record('note.create', { type: targetType, id: targetId, label: null }, { noteId: note.id, length: text.length });
        return note;
      }),
    deleteNote: (id, reason) =>
      settle(() => {
        need('notes.delete');
        const why = cleanReason(reason);
        if (why === null) throw new ConsoleError('invalid', 422, 'reason_required', 'Give a reason of 10 to 500 characters.');
        const note = records.notes.find((n) => n.id === id);
        if (!note) throw notFound();
        records.notes = records.notes.filter((n) => n.id !== id);
        record('note.delete', { type: note.targetType, id: note.targetId, label: null }, { noteId: id, length: note.body.length }, why);
      }),
    resetPassword: (userId) =>
      settle(() => {
        need('user.password_reset');
        const u = fixtureUser(records, userId);
        if (!u) throw notFound();
        if (u.user.kind === 'staff' && role !== 'Owner') throw new ConsoleError('forbidden', 403, 'console_forbidden', 'Only the Owner can reset a staff member’s password.');
        const link = u.identity.hasPassword ? ('reset' as const) : ('set' as const);
        record('user.password_reset', { type: 'user', id: u.user.id, label: u.user.name }, { link, staff: u.user.kind === 'staff' });
        return { link };
      }),
    exportUsers: (filters) =>
      settle(() => {
        need('export');
        const picked = fixtureUserRows(records, filters).map((u) => ({ ...u, joined: fixtureUser(records, u.id)?.user.joined ?? null }));
        record('user.export', { type: 'users', id: null, label: 'Users' }, { rows: picked.length, format: 'csv', filters });
        return { csv: usersCsv(picked), filename: `users-${new Date(now()).toISOString().slice(0, 10)}.csv` };
      }),
    // D-163: Billing, the mockup's figures and records (read-only, like the API).
    billingSummary: () =>
      settle(() => {
        need('billing.read');
        return fixtureBillingSummary(now());
      }),
    billingList: (kind, cursor) =>
      settle(() => {
        need('billing.read');
        return state === 'empty' ? { rows: [], nextCursor: null } : pageOf(billing[kind] as never[], cursor);
      }),
    billingSample: () => ({ ...BILLING_SAMPLE_LABELS }),
    billingPreview: (action, params) =>
      settle(() => {
        need(action === 'refund' ? 'billing.refund' : 'billing.void');
        return fixtureBillingPreview(billing, action, params.invoiceId, now());
      }),
    billingExecute: (action, body) =>
      settle(() => {
        need(action === 'refund' ? 'billing.refund' : 'billing.void');
        const out = fixtureBillingExecute(billing, action, body, now(), state);
        const r = billing.invoices.find((i) => i.id === out.invoiceId);
        record(`billing.${action}`, { type: 'invoice', id: out.invoiceId, label: r?.customerName ?? null }, action === 'refund' ? { amountCents: out.refund?.amountCents ?? null } : { status: 'void' }, body.reason.trim());
        return out;
      }),
    // D-165: API & Webhooks and Scheduled Jobs, the mockup's records.
    apiEndpoints: () =>
      settle(() => {
        need('api.read');
        const e = fixtureEndpoints(now());
        return state === 'empty' ? { ...e, summary: { requests: 0, errorRate: null, p95Ms: null }, rows: [] } : e;
      }),
    webhooks: () =>
      settle(() => {
        need('api.read');
        return fixtureWebhooks(state === 'empty' ? [] : hooks);
      }),
    retryWebhook: (kind, id) =>
      settle(() => {
        need('webhooks.retry');
        const row = hooks.find((h) => h.retry?.kind === kind && h.retry.id === id);
        if (!row) throw notFound();
        hooks = hooks.map((h) => (h === row ? { ...h, status: 'queued', attempts: h.attempts && { ...h.attempts, n: 0 }, nextAttemptAt: null, attemptsUsed: false, retry: null } : h));
        record('webhook.ghl_retry', { type: `ghl_${kind}`, id, label: null }, { kind, attempts: 0 });
      }),
    jobs: () =>
      settle(() => {
        need('jobs.read');
        return fixtureJobs(state === 'empty' ? [] : jobs, now());
      }),
    runJob: (job) =>
      settle(() => {
        need('jobs.run_now');
        if (!isRunNowJob(job)) throw new ConsoleError('forbidden', 403, 'job_not_runnable', CONSOLE_ERRORS.job_not_runnable.message);
        const at = now();
        jobs = fixtureRunJob(jobs, at);
        record('job.run_now', { type: 'job', id: job, label: job }, { status: 'succeeded' });
        return { job, status: 'succeeded' as const, startedAt: at, finishedAt: at };
      }),
    search: (q) =>
      settle(() => {
        need('console.view');
        const words = cleanSearch(q);
        if (words === null) throw new ConsoleError('invalid', 400, 'invalid_query', 'Search for 2 to 100 characters.');
        if (state === 'empty') return { users: [], workspaces: [], orders: [], skills: [] };
        return fixtureSearch(records, words, role);
      }),
    masqueradeSessions: (cursor) =>
      settle(() => {
        need('masquerade.start');
        return state === 'empty' ? { rows: [], nextCursor: null } : pageOf(fixtureMasqueradeSessions(), cursor);
      }),
  };
}
