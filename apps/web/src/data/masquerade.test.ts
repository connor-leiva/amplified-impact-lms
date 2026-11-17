import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { MasqueradeView } from '@ai/core';
import { repo } from './boot';
import { BLOCKED_MESSAGE, navigation } from './http';
import { MasqueradeError, createMasqueradeHttp, masquerade, masqueradeActive, resetMasquerade } from './masquerade';
import type { MasqueradeClient } from './masquerade';
import { createMasqueradeFixture } from './masquerade-fixture';

// D-162 3b: the masquerade client (Start, current, Extend, Exit against the API) and the one store the
// banner, the Console's pause, the Vault and the palette read.

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const T0 = Date.parse('2026-12-10T16:30:00Z');
const session: MasqueradeView = {
  id: 'mq_1',
  target: { id: 'u_1042', name: 'Elena Vargas', teamName: 'Northshore Group' },
  staff: { id: 'st1', name: 'Connor Leiva' },
  reason: 'Customer reports Week 2 steps are out of order.',
  startedAt: T0,
  expiresAt: T0 + 900_000,
  hardExpiresAt: T0 + 3_600_000,
  extendCount: 0,
  canExtend: true,
  startedFrom: '/admin/users/u_1042',
};

let fetchMock: Mock;
let assign: Mock;
beforeEach(() => {
  fetchMock = vi.fn(async () => json(200, {}));
  assign = vi.fn();
  vi.spyOn(navigation, 'assign').mockImplementation(assign);
  vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  resetMasquerade();
});

describe('the masquerade client (D-162 3b)', () => {
  const http = () => createMasqueradeHttp(fetchMock as unknown as typeof fetch);

  it('current: the session and the server’s clock; a 401 is quietly no session (no sign-in redirect)', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { session, serverNow: T0 }));
    await expect(http().current()).resolves.toEqual({ session, serverNow: T0 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/console/masquerade/current');
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).credentials).toBe('include');
    fetchMock.mockResolvedValueOnce(json(401, { error: 'Not signed in' }));
    await expect(http().current()).resolves.toBeNull();
    expect(navigation.toSignIn).not.toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(http().current()).resolves.toBeNull();
  });

  it('current: an ended session goes back to the staff page and nothing else moves', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { code: 'masquerade_ended', redirect: '/admin/users/u_1042' }));
    await expect(http().current()).rejects.toBeInstanceOf(MasqueradeError);
    expect(assign).toHaveBeenCalledWith('/admin/users/u_1042');
  });

  it('start, extend and exit post JSON; a refusal carries the API’s code and sentence', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { session, serverNow: T0, redirect: '/' }));
    await expect(http().start({ id: 'u_1042', name: 'Elena Vargas', workspace: null }, 'Ticket 4411 seat invite', '/admin/users/u_1042')).resolves.toMatchObject({ redirect: '/' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/console/masquerade');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ targetUserId: 'u_1042', reason: 'Ticket 4411 seat invite', startedFrom: '/admin/users/u_1042' });

    fetchMock.mockResolvedValueOnce(json(409, { error: 'This session can’t go past 60 minutes.', code: 'masquerade_max_reached' }));
    const e = await http()
      .extend('Still checking the replay')
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(MasqueradeError);
    expect(e).toMatchObject({ status: 409, code: 'masquerade_max_reached', message: 'This session can’t go past 60 minutes.' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/console/masquerade/extend');

    fetchMock.mockResolvedValueOnce(json(200, { ok: true, redirect: '/admin/users/u_1042' }));
    await expect(http().exit()).resolves.toMatchObject({ redirect: '/admin/users/u_1042' });
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/console/masquerade/exit');
  });
});

describe('the masquerade store', () => {
  const fake = (over: Partial<MasqueradeClient> = {}): MasqueradeClient => ({
    current: async () => ({ session, serverNow: T0 }),
    start: async () => ({ redirect: '/' }),
    extend: async () => ({ session: { ...session, expiresAt: T0 + 1_800_000, extendCount: 1 }, serverNow: T0 }),
    exit: async () => ({ redirect: '/admin/users/u_1042' }),
    ...over,
  });

  it('knows the session and the server’s skew from the first read', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0 - 90_000);
    resetMasquerade({ status: 'unknown' }, fake());
    expect(masqueradeActive()).toBe(false);
    await masquerade.refresh();
    expect(masquerade.get()).toEqual({ status: 'active', session, skew: 90_000 });
    expect(masqueradeActive()).toBe(true);
    expect(assign).not.toHaveBeenCalled(); // unknown → active is the first read, not a change
  });

  it('a failed first read is "no session"; Start and Exit end in a full page load', async () => {
    resetMasquerade({ status: 'unknown' }, fake({ current: async () => Promise.reject(new Error('down')) }));
    await masquerade.refresh();
    expect(masquerade.get()).toEqual({ status: 'none' });
    await masquerade.start({ id: 'u_1042', name: 'Elena Vargas', workspace: null }, 'Ticket 4411 seat invite', '/admin/users/u_1042');
    expect(assign).toHaveBeenLastCalledWith('/');
    await masquerade.exit();
    expect(assign).toHaveBeenLastCalledWith('/admin/users/u_1042');
  });

  it('Extend replaces the session; a session that ends in another tab reloads this page', async () => {
    resetMasquerade({ status: 'active', session, skew: 0 }, fake({ current: async () => ({ session: null, serverNow: T0 }) }));
    await masquerade.extend('Still checking the replay');
    expect(masquerade.get()).toMatchObject({ status: 'active', session: { extendCount: 1 } });
    await masquerade.refresh();
    expect(masquerade.get()).toEqual({ status: 'none' });
    expect(assign).toHaveBeenCalledTimes(1);
  });
});

describe('the fixture’s simulated session (fixture build only)', () => {
  beforeEach(() => sessionStorage.clear());

  it('?masquerade=demo is the mockup’s demo session; Start, Extend to the cap and Exit', async () => {
    const now = () => T0;
    const demo = createMasqueradeFixture('?masquerade=demo', now);
    const cur = await demo.current();
    expect(cur?.session).toMatchObject({ target: { name: 'Elena Vargas', teamName: 'Northshore Group' }, reason: 'Customer reports Week 2 steps are out of order.', expiresAt: T0 + 900_000 });
    for (const n of [1, 2, 3]) expect((await demo.extend('Still checking the replay')).session?.extendCount).toBe(n);
    await expect(demo.extend('Still checking the replay')).rejects.toMatchObject({ code: 'masquerade_max_reached' });
    await expect(demo.start({ id: 'u_1061', name: 'Jordan Hale', workspace: null }, 'Ticket 4411 seat invite', null)).rejects.toMatchObject({ code: 'masquerade_active' });
    await expect(demo.exit()).resolves.toEqual({ redirect: '/admin' });
    expect(sessionStorage.getItem('ai-lms-role')).toBe('admin');
    const plain = createMasqueradeFixture('', now);
    await expect(plain.current()).resolves.toEqual({ session: null, serverNow: T0 });
    await expect(plain.start({ id: 'u_1061', name: 'Jordan Hale', workspace: null }, 'too short', null)).rejects.toMatchObject({ code: 'reason_required' });
    await expect(plain.start({ id: 'u_1061', name: 'Jordan Hale', workspace: 'Hale & Marlowe Realty' }, 'Ticket 4411 seat invite', '/admin/users/u_1061')).resolves.toEqual({ redirect: '/' });
    expect(sessionStorage.getItem('ai-lms-role')).toBe('agent');
    await expect(plain.exit()).resolves.toEqual({ redirect: '/admin/users/u_1061' });
  });

  it('refuses every portal write during a session, the audited Build actions too (D-172)', async () => {
    await createMasqueradeFixture('?masquerade=demo', () => T0).current();
    await expect(repo.run('toggleStep', { moduleId: 'm1', step: 0 } as never)).resolves.toEqual({ error: BLOCKED_MESSAGE });
    await expect(repo.act('duplicateModule', { id: 'sales' })).resolves.toEqual({ error: BLOCKED_MESSAGE });
  });
});
