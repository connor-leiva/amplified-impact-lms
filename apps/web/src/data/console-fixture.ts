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

import { CONSOLE_PAGE_DEFAULT, STAFF_ROLES, auditActionGroup, auditCsv, auditRedactsNetwork, cleanNoteBody, cleanReason, cleanSearch, consoleCan, consoleCaps, rolesMatrix, usersCsv } from '@ai/core';
import type { AuditAction, AuditFilters, AuditRow, ConsoleMe, ConsolePage, StaffRole } from '@ai/core';
import { clock } from '../lib/clock';
import { fixtureRole } from './boot';
import { ConsoleError } from './console';
import type { ConsoleApi } from './console';
import { fixtureNoteTargetExists, fixtureRecords, fixtureSearch, fixtureUser, fixtureUserRows, fixtureWorkspace, fixtureWorkspaceRows } from './console-fixture-records';
import { readParityR2 } from './parity-r2';
import { parityAuditRows } from './parity-r2-db';
import { fixtureEmailCsv, fixtureEmailPage, fixtureEmails, fixtureUsage } from './console-fixture-email-usage';

export const FIXTURE_CONSOLE_STATES = ['loading', 'empty', 'error', 'rate_limited'] as const;
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
  const emails = fixtureEmails();
  let noteId = 100;

  /** What the API's write would audit, so the Audit Log shows it on the next load. */
  const record = (action: AuditAction, target: AuditRow['target'], after: unknown, reason: string | null = null) => {
    rows = [
      { id: String(next++), at: now(), actor: { ...STAFF.casey, role, source: 'staff' }, masqueradeSessionId: null, action, target, reason, before: null, after, outcome: 'ok', ip: '203.0.113.10', userAgent: UA, requestId: null },
      ...rows,
    ];
  };

  const settle = <T>(value: () => T): Promise<T> => {
    if (state === 'loading') return new Promise<T>(() => {});
    if (state === 'error') return Promise.reject(new ConsoleError('failed', 502, null, 'Bad gateway'));
    if (state === 'rate_limited') return Promise.reject(new ConsoleError('rate_limited', 429, null, 'Rate limit exceeded, retry in 1 minute'));
    try {
      return Promise.resolve(value());
    } catch (e) {
      return Promise.reject(e);
    }
  };
  const need = (cap: string) => {
    if (!staff || !consoleCan(role, cap)) throw forbidden();
  };

  return {
    source: 'fixture',
    // The viewer is answered whatever the list's state, so a state screenshot shows the screen.
    me: () => {
      if (!staff) return Promise.reject(forbidden());
      const me: ConsoleMe = { role, caps: consoleCaps(role) };
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
        return rolesMatrix();
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
    search: (q) =>
      settle(() => {
        need('console.view');
        const words = cleanSearch(q);
        if (words === null) throw new ConsoleError('invalid', 400, 'invalid_query', 'Search for 2 to 100 characters.');
        if (state === 'empty') return { users: [], workspaces: [], orders: [], skills: [] };
        return fixtureSearch(records, words, role);
      }),
    // PR 7 (D-166): the mockup's `EMAILS` and `Usage` figures.
    emails: (filters) =>
      settle(() => {
        need('email.read');
        const page = fixtureEmailPage(emails, filters);
        return state === 'empty' ? { ...page, rows: [] } : page;
      }),
    exportEmails: (filters) =>
      settle(() => {
        need('export');
        const { csv, count } = fixtureEmailCsv(emails, filters);
        record('email_log.export', { type: 'email_log', id: null, label: 'Email log' }, { rows: count, format: 'csv', filters: { ...filters, ids: filters.ids?.length } });
        return { csv, filename: `email-log-${new Date(now()).toISOString().slice(0, 10)}.csv` };
      }),
    usage: (query) =>
      settle(() => {
        need('usage.read');
        const report = fixtureUsage(query, now());
        return state === 'empty' ? { ...report, hasData: false, countingSince: query.to, workspaces: [] } : report;
      }),
  };
}
