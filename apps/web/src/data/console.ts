// The Admin Console's typed client (D-157). Built on `data/http.ts`: a 401 is its sign-in redirect,
// unchanged, and every other refusal becomes a `ConsoleError` the screens turn into a state (Denied,
// Too Many Requests, Error) by its `kind`.
//
// The fixture build (the compliance and screenshot target) answers from `console-fixture.ts` instead,
// loaded with a dynamic import behind `import.meta.env.VITE_DATA_SOURCE`, which Vite replaces with a
// constant at build time. In the http build that branch is dead, so the fixture's fictional people
// never reach production: `console-build.test.ts` builds this module both ways and checks.

import { isConsoleErrorCode } from '@ai/core';
import type {
  AuditFilters,
  AuditRow,
  ConsoleErrorCode,
  ConsoleMe,
  ConsolePage,
  ConsoleUserDetail,
  ConsoleUserRow,
  DbHealthView,
  DeploysView,
  FlagFlipResult,
  IntegrationView,
  OpsEnv,
  ProbeIntegration,
  ProbeResult,
  RolesMatrix,
  SearchResults,
  StaffNote,
  StaffNoteTarget,
  UserFilters,
  WorkspaceDetail,
  WorkspaceFilters,
  WorkspaceRow,
} from '@ai/core';
import { navigation } from './http';

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

/** A status and a code as a failure kind. The code wins where there is one. */
export function failureOf(status: number, code: unknown): ConsoleFailure {
  if (code === 'console_forbidden') return 'forbidden';
  if (code === 'masquerade_blocked') return 'blocked';
  if (code === 'export_too_large') return 'too_large';
  if (code === 'invalid_query' || code === 'invalid_body' || code === 'reason_required') return 'invalid';
  if (code === 'not_found') return 'not_found';
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
  // PR 9 (D-168): the Operations pages (`ops.read`), the flag flip and Check now.
  opsEnv(): Promise<OpsEnv>;
  /** `typed`: a sensitive flag's key, typed to confirm. */
  flipFlag(key: string, on: boolean, typed?: string): Promise<FlagFlipResult>;
  integrations(): Promise<IntegrationView[]>;
  checkIntegration(id: ProbeIntegration): Promise<ProbeResult>;
  deploys(): Promise<DeploysView>;
  dbHealth(): Promise<DbHealthView>;
}

/**
 * Whether a masquerade session is running (spec § 7.5: the palette is "disabled during a session").
 * Masquerade is Console PR 3; until then there is never a session, and this is the one place PR 3
 * answers it. The palette asks before it opens.
 */
export const masqueradeActive = (): boolean => false;

/** A query string of the set values, in the order given, then the cursor. */
export function listQuery(values: Record<string, string | number | undefined>, cursor?: string | null): string {
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(values)) if (v !== undefined && v !== '') q.set(key, String(v));
  if (cursor) q.set('cursor', cursor);
  const s = q.toString();
  return s ? `?${s}` : '';
}

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
    opsEnv: async () => json<OpsEnv>(await request(fetchImpl, '/api/console/env')),
    flipFlag: async (key, on, typed) =>
      json<FlagFlipResult>(await request(fetchImpl, `/api/console/flags/${encodeURIComponent(key)}`, JSON_POST(typed === undefined ? { on } : { on, typed }))),
    integrations: async () => (await json<{ integrations: IntegrationView[] }>(await request(fetchImpl, '/api/console/integrations'))).integrations,
    checkIntegration: async (id) => (await json<{ result: ProbeResult }>(await request(fetchImpl, `/api/console/integrations/${id}/check`, JSON_POST({})))).result,
    deploys: async () => json<DeploysView>(await request(fetchImpl, '/api/console/deploys')),
    dbHealth: async () => json<DbHealthView>(await request(fetchImpl, '/api/console/db')),
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
