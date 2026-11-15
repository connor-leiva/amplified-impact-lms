import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleError, auditQuery, createConsoleHttp, failureOf, filenameOf } from './console';
import { createConsoleFixture, fixtureAuditRows, matches } from './console-fixture';
import { navigation } from './http';

// The Console's typed client (D-157): the URLs, the credentials, and what each status and code
// becomes. A screen branches on `ConsoleError.kind`, so this is the contract with the API's
// `{ error, code }` refusals (`apps/api/src/console/guard.ts`).

const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }) as unknown as Response;

const notJson = (status: number) =>
  ({ ok: false, status, headers: new Headers(), json: async () => Promise.reject(new SyntaxError('x')) }) as unknown as Response;

afterEach(() => vi.restoreAllMocks());

async function failure(p: Promise<unknown>): Promise<ConsoleError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ConsoleError) return e;
    throw e;
  }
  throw new Error('expected a ConsoleError');
}

describe('the Console client (D-157)', () => {
  it('asks the four routes, with credentials, and returns their bodies', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/console/me') return res(200, { role: 'Owner', caps: ['audit.read'] });
      if (url.startsWith('/api/console/audit?')) return res(200, { rows: [], nextCursor: null });
      if (url === '/api/console/roles') return res(200, { roles: ['Owner'] });
      if (url === '/api/console/audit/export') return res(200, '"id"\r\n', { 'content-disposition': 'attachment; filename="audit-log-2026-12-07.csv"' });
      return res(404, {});
    });
    const api = createConsoleHttp(fetchMock as unknown as typeof fetch);
    expect(api.source).toBe('http');
    expect(await api.me()).toEqual({ role: 'Owner', caps: ['audit.read'] });
    expect(await api.audit({ actor: 'st1', from: 5 }, '41')).toEqual({ rows: [], nextCursor: null });
    expect(await api.roles()).toEqual({ roles: ['Owner'] });
    expect(await api.exportAudit({ action: 'console' })).toEqual({ csv: '"id"\r\n', filename: 'audit-log-2026-12-07.csv' });

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map((c) => c[0])).toEqual(['/api/console/me', '/api/console/audit?actor=st1&from=5&cursor=41', '/api/console/roles', '/api/console/audit/export']);
    for (const [, init] of calls) expect(init.credentials).toBe('include');
    const exp = calls[3]![1];
    expect(exp.method).toBe('POST');
    expect((exp.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(JSON.parse(exp.body as string)).toEqual({ action: 'console' });
  });

  it('sends a 401 to sign-in, as http.ts does', async () => {
    const toSignIn = vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
    const api = createConsoleHttp((async () => res(401, { error: 'Not signed in' })) as unknown as typeof fetch);
    await expect(api.me()).rejects.toBeInstanceOf(ConsoleError);
    expect(toSignIn).toHaveBeenCalledTimes(1);
  });

  it('turns each refusal into the state a screen shows', async () => {
    const cases: [Response, string, number, string | null][] = [
      [res(403, { error: 'Your role can’t use this part of Console.', code: 'console_forbidden' }), 'forbidden', 403, 'console_forbidden'],
      [res(403, { error: 'Blocked while masquerading. Exit to continue.', code: 'masquerade_blocked' }), 'blocked', 403, 'masquerade_blocked'],
      [res(422, { error: 'This export is over 10,000 rows. Narrow the filters and try again.', code: 'export_too_large' }), 'too_large', 422, 'export_too_large'],
      [res(400, { error: 'That outcome filter isn’t valid.', code: 'invalid_query' }), 'invalid', 400, 'invalid_query'],
      [res(429, { error: 'Rate limit exceeded, retry in 1 minute' }), 'rate_limited', 429, null],
      [res(404, { error: 'Not found' }), 'not_found', 404, null],
      [res(500, { error: 'Something went wrong.' }), 'failed', 500, null],
      [notJson(502), 'failed', 502, null],
    ];
    for (const [response, kind, status, code] of cases) {
      const api = createConsoleHttp((async () => response) as unknown as typeof fetch);
      const e = await failure(api.audit({}));
      expect(e.kind, `${status} ${code}`).toBe(kind);
      expect(e.status).toBe(status);
      expect(e.code).toBe(code);
    }
    // The server's sentence is kept for the screen that shows it.
    const tooBig = await failure(createConsoleHttp((async () => cases[2]![0]) as unknown as typeof fetch).exportAudit({}));
    expect(tooBig.message).toBe('This export is over 10,000 rows. Narrow the filters and try again.');
  });

  it('turns a dropped connection into a failure, never a crash', async () => {
    const api = createConsoleHttp((async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch);
    const e = await failure(api.roles());
    expect(e.kind).toBe('failed');
    expect(e.status).toBe(0);
  });

  it('maps statuses without a code', () => {
    expect(failureOf(403, undefined)).toBe('forbidden');
    expect(failureOf(429, 'console_forbidden')).toBe('forbidden');
    expect(failureOf(503, 'stripe_permission_missing')).toBe('failed');
  });

  it('builds the audit query from the set filters only', () => {
    expect(auditQuery({})).toBe('');
    expect(auditQuery({ target: 'a b', outcome: 'ok' }, null)).toBe('?target=a+b&outcome=ok');
    expect(filenameOf('attachment; filename="x.csv"', 'y.csv')).toBe('x.csv');
    expect(filenameOf(null, 'y.csv')).toBe('y.csv');
  });
});

describe('the Console fixture (fixture build only)', () => {
  const NOW = Date.parse('2026-12-07T16:42:00Z');

  it('has a week of fictional rows: two pages, PR 1’s actions only', () => {
    const rows = fixtureAuditRows(NOW);
    expect(rows).toHaveLength(56);
    expect(new Set(rows.map((r) => r.action))).toEqual(new Set(['console.access_denied', 'audit.export']));
    expect(rows.every((r) => r.at < NOW && r.at > NOW - 7 * 24 * 3600_000)).toBe(true);
    expect(new Set(rows.map((r) => r.actor.name))).toEqual(new Set(['Casey Lin', 'Luis Romero', 'Jordan Hale', 'Maya Chen']));
    for (const r of rows) expect(r.ip).toMatch(/^203\.0\.113\./);
  });

  it('pages, filters and redacts as the API does', async () => {
    const owner = createConsoleFixture({ role: 'Owner', staff: true, state: null, now: () => NOW });
    const first = await owner.audit({});
    expect(first.rows).toHaveLength(50);
    const second = await owner.audit({}, first.nextCursor);
    expect(second.rows).toHaveLength(6);
    expect(second.nextCursor).toBeNull();
    expect((await owner.audit({ outcome: 'denied' })).rows.every((r) => r.outcome === 'denied')).toBe(true);
    expect((await owner.audit({ action: 'console' })).rows.every((r) => r.action === 'console.access_denied')).toBe(true);
    expect(matches(fixtureAuditRows(NOW)[0]!, { target: 'AUDIT' })).toBe(true);

    const support = createConsoleFixture({ role: 'Support', staff: true, state: null, now: () => NOW });
    expect((await support.audit({})).rows.every((r) => r.ip === null && r.userAgent === null)).toBe(true);
    await expect(support.roles()).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(support.exportAudit({})).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('audits its own export, so the list shows it next', async () => {
    const owner = createConsoleFixture({ role: 'Owner', staff: true, state: null, now: () => NOW });
    const { csv, filename } = await owner.exportAudit({ outcome: 'failed' });
    expect(filename).toBe('audit-log-2026-12-07.csv');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2);
    expect((await owner.audit({})).rows[0]).toMatchObject({ action: 'audit.export', at: NOW, after: { rows: 1 } });
  });

  it('refuses a learner persona, and plays each list state', async () => {
    await expect(createConsoleFixture({ staff: false, state: null }).me()).rejects.toMatchObject({ kind: 'forbidden' });
    const limited = createConsoleFixture({ role: 'Owner', staff: true, state: 'rate_limited' });
    expect(await limited.me()).toMatchObject({ role: 'Owner' });
    await expect(limited.audit({})).rejects.toMatchObject({ kind: 'rate_limited', status: 429 });
    await expect(createConsoleFixture({ role: 'Owner', staff: true, state: 'error' }).roles()).rejects.toMatchObject({ kind: 'failed' });
    expect((await createConsoleFixture({ role: 'Owner', staff: true, state: 'empty' }).audit({})).rows).toEqual([]);
  });
});
