import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleError, auditQuery, createConsoleHttp, failureOf, filenameOf, listQuery, masqueradeActive } from './console';
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

describe('D-172: Export selected, and Invite staff and Change role…', () => {
  it('the client posts the staff preview and change, and a guard’s refusal is "refused" with its code', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const answers = [res(200, { confirmToken: 't', title: 'x' }), res(200, { toast: 'Jordan Hale is now Support' }), res(403, { error: 'There must always be at least one Owner.', code: 'staff_last_owner' }), res(422, { error: 'Enter a valid email address.', code: 'staff_invalid' })];
    const api = createConsoleHttp((async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      return answers.shift()!;
    }) as unknown as typeof fetch);
    expect(await api.previewStaff({ kind: 'role', id: 'st2', role: 'Support' })).toMatchObject({ confirmToken: 't' });
    expect(await api.changeStaff('t')).toEqual({ toast: 'Jordan Hale is now Support' });
    expect(calls.map((c) => c.url)).toEqual(['/api/console/staff/preview', '/api/console/staff']);
    expect(calls[1]!.body).toEqual({ confirmToken: 't' });
    const owner = await failure(api.previewStaff({ kind: 'role', id: 'st1', role: 'Admin' }));
    expect(owner).toMatchObject({ kind: 'refused', status: 403, code: 'staff_last_owner', message: 'There must always be at least one Owner.' });
    const bad = await failure(api.previewStaff({ kind: 'invite', email: 'x', role: 'Support' }));
    expect(bad).toMatchObject({ kind: 'refused', status: 422, code: 'staff_invalid', message: 'Enter a valid email address.' });
  });

  it('the fixture exports exactly the ids named, and records how many', async () => {
    const NOW = Date.parse('2026-12-07T16:42:00Z');
    const owner = createConsoleFixture({ role: 'Owner', staff: true, now: () => NOW });
    const ids = (await owner.audit({})).rows.slice(0, 2).map((r) => r.id);
    const { csv } = await owner.exportAudit({ ids });
    expect(csv.trimEnd().split('\r\n')).toHaveLength(3);
    expect((await owner.audit({})).rows[0]).toMatchObject({ action: 'audit.export', after: { rows: 2, filters: {}, selected: 2 } });
    expect(matches(fixtureAuditRows(NOW)[0]!, { ids: ['nope'] })).toBe(false);
  });
});

// ================================================================================================
// PR 2's routes (D-158), ported from #127–#129 to R2-1c (D-160): the fixture answers with the R2
// mockup's own records (`parity-r2.ts`) in the API's shapes.
// ================================================================================================

describe('the Console fixture, PR 2 (D-158, on the R2 mockup’s records since D-160 R2-1c)', () => {
  const NOW = Date.parse('2026-12-10T16:30:00Z');

  it('answers workspaces and users in the mockup’s order, by the API’s filters', async () => {
    const owner = createConsoleFixture({ role: 'Owner', staff: true, state: null, now: () => NOW });
    const ws = await owner.workspaces({});
    expect(ws.rows.map((w) => w.teamId)).toEqual(['ws_northshore', 'ws_halemarlowe', 'ws_redcliff', 'ws_copperbasin', 'ws_tidewater', 'ws_lantern', 'ws_fourthmeridian']);
    expect(ws.rows[0]).toMatchObject({ planKind: 'agents', planLabel: 'Team Plan', planStatus: 'active', seatsUsed: 33, seatCap: 41, nearCap: false });
    expect((await owner.workspaces({ plan: 'membership' })).rows.map((w) => w.teamId)).toEqual(['ws_tidewater']);
    expect((await owner.workspaces({ status: 'trialing' })).rows.map((w) => w.teamId)).toEqual(['ws_lantern']);
    expect((await owner.workspaces({ q: 'sam@tidewater' })).rows.map((w) => w.teamId)).toEqual(['ws_tidewater']);
    const north = await owner.workspace('ws_northshore');
    expect(north.members.map((m) => m.id)).toEqual(['u_1042', 'u_1043']);
    expect(north.billing.orders.map((o) => [o.id, o.amountTotal, o.status])).toEqual([['in_1QxT4mNs0291', 149500, 'paid']]);
    await expect(owner.workspace('nope')).rejects.toMatchObject({ kind: 'not_found' });
    expect((await owner.users({ kind: 'learner' })).rows).toHaveLength(8);
    expect((await owner.users({ kind: 'staff' })).rows.map((u) => u.role)).toEqual(['Owner', 'Admin', 'Support']);
    expect((await owner.users({ q: 'tidewater' })).rows.map((u) => u.id)).toEqual(['u_1104']);
    expect((await owner.user('u_1042')).identity).toEqual({ emailVerifiedAt: expect.any(Number), hasPassword: true, hasGoogle: true });
  });

  it('writes notes, resets and exports as the API would, and audits each', async () => {
    const owner = createConsoleFixture({ role: 'Owner', staff: true, state: null, now: () => NOW });
    expect((await owner.notes('workspace', 'ws_northshore')).map((n) => n.author.name)).toEqual(['Imani Brooks', 'Connor Leiva']);
    const note = await owner.addNote('user', 'u_1043', '  Prefers texts.  ');
    expect(note).toMatchObject({ body: 'Prefers texts.', author: { name: 'Casey Lin' } });
    expect((await owner.notes('user', 'u_1043')).map((n) => n.body)).toEqual(['Prefers texts.']);
    await expect(owner.addNote('user', 'u_1043', '   ')).rejects.toMatchObject({ kind: 'invalid' });
    await expect(owner.addNote('workspace', 'nope', 'Hi')).rejects.toMatchObject({ kind: 'not_found' });
    await expect(owner.deleteNote(note.id, 'short')).rejects.toMatchObject({ kind: 'invalid', code: 'reason_required' });
    await owner.deleteNote(note.id, 'Written on the wrong person.');
    expect(await owner.notes('user', 'u_1043')).toEqual([]);
    expect(await owner.resetPassword('u_1042')).toEqual({ link: 'reset' });
    const { csv, filename } = await owner.exportUsers({ ids: ['u_1042', 'u_1104'] });
    expect(filename).toBe('users-2026-12-10.csv');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(3);
    expect((await owner.audit({})).rows.slice(0, 4).map((r) => r.action)).toEqual(['user.export', 'user.password_reset', 'note.delete', 'note.create']);

    const support = createConsoleFixture({ role: 'Support', staff: true, state: null, now: () => NOW });
    await expect(support.deleteNote('20', 'A good enough reason.')).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(support.exportUsers({})).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(support.resetPassword('u_0002')).rejects.toMatchObject({ kind: 'forbidden' });
    expect(await support.resetPassword('u_1042')).toEqual({ link: 'reset' });
    await expect(createConsoleFixture({ role: 'Instructor', staff: true, state: null }).workspaces({})).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('searches as the API does', async () => {
    const owner = createConsoleFixture({ role: 'Owner', staff: true, state: null, now: () => NOW });
    const r = await owner.search('northshore');
    expect(r.workspaces.map((w) => w.href)).toEqual(['/admin/workspaces/ws_northshore']);
    expect(r.users.map((u) => u.id)).toEqual(['u_1042', 'u_1043']);
    expect((await owner.search('cus_Rg6Tidewtr05')).workspaces.map((w) => w.id)).toEqual(['ws_tidewater']);
    expect((await owner.search('in_1QxT4mNs0291')).orders).toEqual([{ id: 'in_1QxT4mNs0291', label: 'in_1QxT4mNs0291', detail: 'Team Plan, Paid', href: '/admin/workspaces/ws_northshore' }]);
    expect((await owner.search('perfect week')).skills).toEqual([{ id: 'perfect-week', label: 'Perfect Week', detail: expect.any(String), href: null }]);
    await expect(owner.search('a')).rejects.toMatchObject({ kind: 'invalid' });
    await expect(createConsoleFixture({ role: 'Instructor', staff: true, state: null }).search('elena')).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('the Console client, PR 2 (D-158)', () => {
  it('asks each route with its params and query, and posts JSON for writes', async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      if (url.endsWith('/password-reset')) return res(200, { ok: true, link: 'set' });
      if (url === '/api/console/users/export') return res(200, '"id"\r\n', { 'content-disposition': 'attachment; filename="users-2026-12-10.csv"' });
      if (url.startsWith('/api/console/notes?')) return res(200, { rows: [] });
      return res(200, { rows: [], nextCursor: null });
    });
    const api = createConsoleHttp(fetchMock as unknown as typeof fetch);
    await api.workspaces({ q: 'a b', plan: 'agents' }, 'CUR');
    await api.workspace('north line');
    await api.users({ role: 'Team Owner', kind: 'learner' });
    await api.user('u/x');
    expect(await api.notes('workspace', 'ws_northshore')).toEqual([]);
    await api.addNote('user', 'u_1042', 'Hi');
    await api.deleteNote('12', 'A good enough reason.');
    expect(await api.resetPassword('u_1042')).toEqual({ link: 'set' });
    expect(await api.exportUsers({ ids: ['u_1042'] })).toEqual({ csv: '"id"\r\n', filename: 'users-2026-12-10.csv' });
    expect(calls.map(([u]) => u)).toEqual([
      '/api/console/workspaces?q=a+b&plan=agents&cursor=CUR',
      '/api/console/workspaces/north%20line',
      '/api/console/users?role=Team+Owner&kind=learner',
      '/api/console/users/u%2Fx',
      '/api/console/notes?targetType=workspace&targetId=ws_northshore',
      '/api/console/notes',
      '/api/console/notes/12/delete',
      '/api/console/users/u_1042/password-reset',
      '/api/console/users/export',
    ]);
    expect(calls[5]![1]).toMatchObject({ method: 'POST', body: JSON.stringify({ targetType: 'user', targetId: 'u_1042', body: 'Hi' }) });
    expect(calls[6]![1]).toMatchObject({ method: 'POST', body: JSON.stringify({ reason: 'A good enough reason.' }) });
    expect(calls[8]![1]).toMatchObject({ method: 'POST', body: JSON.stringify({ ids: ['u_1042'] }) });
    for (const [, init] of calls) expect(init?.credentials).toBe('include');
  });

  it('searches with the words as a query parameter, and answers the groups', async () => {
    const fetchMock = vi.fn(async () => res(200, { q: 'a b', groups: { users: [], workspaces: [], orders: [], skills: [] } }));
    const api = createConsoleHttp(fetchMock as unknown as typeof fetch);
    expect(await api.search('a b')).toEqual({ users: [], workspaces: [], orders: [], skills: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/console/search?q=a+b', expect.objectContaining({ credentials: 'include' }));
  });

  it('turns PR 2’s codes into states, and there is no masquerade session yet', () => {
    expect(failureOf(404, 'not_found')).toBe('not_found');
    expect(failureOf(400, 'invalid_body')).toBe('invalid');
    expect(failureOf(422, 'reason_required')).toBe('invalid');
    expect(masqueradeActive()).toBe(false);
    expect(listQuery({ q: 'x', plan: undefined, status: '' }, 'C')).toBe('?q=x&cursor=C');
  });
});
