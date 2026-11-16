// Roles & Permissions, editable (D-160 R2-3b; Connor, Nov 16, 2026, 8:27 AM MST): the Owner's two-step
// change through the real router and a real Postgres. `CONSOLE_CAPS` stays the ceiling; the server
// refuses everything past it, and every change is one `permission.change` audit row with before and
// after. The guards themselves are unit-tested in `packages/core/test/console-roles.test.ts`; here each
// one is shown refusing over HTTP, and the effective matrix is shown reaching `requireConsole`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { ROLE_CONFIRM_TTL_MS, seedForDatabase } from '@ai/core';
import type { RoleChangePreview, RolesMatrix } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { CONSOLE_PATHS } from '../src/console/routes';
import { auditLog, consoleRoleGrants, permissions, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');

let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  // The seed's Owner is st1 and its Support st4; it has no Admin and one Owner.
  await db.insert(users).values([
    { id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' },
    { id: 'st_owner2', email: 'kai@amplifiedimpact.com', name: 'Kai Moreno', kind: 'staff', staffRole: 'Owner' },
  ]);
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const post = async (who: string, url: string, payload: unknown, extra: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json', ...extra }, payload: payload as Record<string, unknown> });
const preview = (who: string, body: Record<string, unknown>) => post(who, CONSOLE_PATHS.rolesPreview, body);
const commit = (who: string, confirmToken: unknown) => post(who, CONSOLE_PATHS.roles, { confirmToken });
const get = async (who: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: await app.signInAs(who) } });
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const grantRows = async () => (await testDatabase()).select().from(consoleRoleGrants);
const body = <T>(res: { body: string }) => JSON.parse(res.body) as T;
const tokenFor = async (b: Record<string, unknown>, who = 'st1') => body<RoleChangePreview>(await preview(who, b)).confirmToken;

describe('the two-step change (D-160 R2-3b) @console', () => {
  it('previews without writing, then makes the change with one audit row', async () => {
    const p = await preview('st1', { role: 'Admin', capability: 'masq', allowed: false });
    expect(p.statusCode).toBe(200);
    expect(p.headers['cache-control']).toBe('private, no-store');
    const pv = body<RoleChangePreview>(p);
    expect(pv).toMatchObject({ role: 'Admin', capability: 'masq', before: true, after: false, summary: 'Start and extend masquerade: allowed to not allowed.', expiresAt: NOW + ROLE_CONFIRM_TTL_MS });
    expect(pv.confirmToken).toMatch(/^[\w-]+\.[\w-]+$/);
    expect(await auditRows()).toHaveLength(0);
    expect(await grantRows()).toHaveLength(0);

    const c = await commit('st1', pv.confirmToken);
    expect(c.statusCode).toBe(200);
    expect(c.headers['cache-control']).toBe('private, no-store');
    const m = body<RolesMatrix>(c);
    expect(m.caps.find((x) => x.cap === 'masquerade.start')!.allowed).toEqual({ Owner: true, Admin: false, Support: false });
    expect(m.caps.find((x) => x.cap === 'masquerade.start')!.ceiling).toEqual({ Owner: true, Admin: true, Support: false });
    expect(m.grants).toEqual([{ role: 'Admin', capability: 'masq', allowed: false }]);
    expect(await grantRows()).toEqual([{ role: 'Admin', capability: 'masq', allowed: false, updatedBy: 'st1', updatedAt: NOW }]);

    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'permission.change',
      outcome: 'ok',
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'role',
      targetId: 'Admin',
      targetLabel: 'Admin',
      at: NOW,
      before: { permission: 'masq', label: 'Start and extend masquerade', allowed: true, capabilities: ['masquerade.start', 'masquerade.extend'] },
      after: { permission: 'masq', label: 'Start and extend masquerade', allowed: false, capabilities: ['masquerade.start', 'masquerade.extend'] },
    });

    // Given back: the stored row says so, and a second audit row records it.
    const back = await commit('st1', await tokenFor({ role: 'Admin', capability: 'masq', allowed: true }));
    expect(back.statusCode).toBe(200);
    expect(await grantRows()).toEqual([{ role: 'Admin', capability: 'masq', allowed: true, updatedBy: 'st1', updatedAt: NOW }]);
    expect((await auditRows()).map((r) => [(r.before as { allowed: boolean }).allowed, (r.after as { allowed: boolean }).allowed])).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it('applies at once: a row taken from Admin is refused to every Admin, and /me says so', async () => {
    expect((await get('st_admin', CONSOLE_PATHS.roles)).statusCode).toBe(200);
    expect(body<{ caps: string[] }>(await get('st_admin', CONSOLE_PATHS.me)).caps).toContain('ops.read');
    expect((await commit('st1', await tokenFor({ role: 'Admin', capability: 'ops', allowed: false }))).statusCode).toBe(200);

    const refused = await get('st_admin', CONSOLE_PATHS.roles);
    expect(refused.statusCode).toBe(403);
    expect(body<{ code: string }>(refused).code).toBe('console_forbidden');
    expect((await auditRows()).at(-1)).toMatchObject({ action: 'console.access_denied', actorUserId: 'st_admin', outcome: 'denied' });
    expect(body<{ caps: string[] }>(await get('st_admin', CONSOLE_PATHS.me)).caps).not.toContain('ops.read');
    // The Owner is untouched, and so is every capability outside the row.
    expect((await get('st1', CONSOLE_PATHS.roles)).statusCode).toBe(200);
    expect((await get('st_admin', CONSOLE_PATHS.audit)).statusCode).toBe(200);

    expect((await commit('st1', await tokenFor({ role: 'Admin', capability: 'ops', allowed: true }))).statusCode).toBe(200);
    expect((await get('st_admin', CONSOLE_PATHS.roles)).statusCode).toBe(200);
  });

  it('takes a shared row from Support, and Support’s /me loses it', async () => {
    expect((await commit('st1', await tokenFor({ role: 'Support', capability: 'billview', allowed: false }))).statusCode).toBe(200);
    expect(body<{ caps: string[] }>(await get('st4', CONSOLE_PATHS.me)).caps).not.toContain('billing.read');
    expect(body<{ caps: string[] }>(await get('st_admin', CONSOLE_PATHS.me)).caps).toContain('billing.read');
  });
});

describe('the build row: the PermKey matrix, set through core (D-160 R2-3b) @console', () => {
  const BUILD = ['curriculum', 'publish', 'cohorts', 'announce'];
  const permRows = async (role: string) =>
    Object.fromEntries(
      (await (await testDatabase()).select().from(permissions).where(and(eq(permissions.role, role), inArray(permissions.perm, BUILD)))).map((r) => [r.perm, r.allowed]),
    );

  it('takes its four PermKeys from Admin and gives them to Support, one audit row each, nothing in console_role_grants', async () => {
    expect(await permRows('Admin')).toEqual({ curriculum: true, publish: true, cohorts: true, announce: true });
    const p = body<RoleChangePreview>(await preview('st1', { role: 'Admin', capability: 'build', allowed: false }));
    expect(p).toMatchObject({ before: true, after: false, summary: 'Edit curriculum, vault, sessions, announcements, tiers: allowed to not allowed.' });
    expect((await commit('st1', p.confirmToken)).statusCode).toBe(200);
    expect(await permRows('Admin')).toEqual({ curriculum: false, publish: false, cohorts: false, announce: false });
    // Staff & Roles' other PermKeys are untouched.
    const other = await (await testDatabase()).select().from(permissions).where(and(eq(permissions.role, 'Admin'), eq(permissions.perm, 'viewLearners')));
    expect(other[0]!.allowed).toBe(true);

    expect(await permRows('Support')).toEqual({ curriculum: false, publish: false, cohorts: false, announce: false });
    expect((await commit('st1', await tokenFor({ role: 'Support', capability: 'build', allowed: true }))).statusCode).toBe(200);
    expect(await permRows('Support')).toEqual({ curriculum: true, publish: true, cohorts: true, announce: true });

    expect(await grantRows()).toEqual([]);
    const rows = await auditRows();
    expect(rows.map((r) => [r.action, r.targetId])).toEqual([
      ['permission.change', 'Admin'],
      ['permission.change', 'Support'],
    ]);
    expect(rows[0]!.after).toEqual({ permission: 'build', label: 'Edit curriculum, vault, sessions, announcements, tiers', allowed: false, perms: BUILD });
  });

  it('the snapshot the clients read has the new PermKeys', async () => {
    expect((await commit('st1', await tokenFor({ role: 'Admin', capability: 'build', allowed: false }))).statusCode).toBe(200);
    const snap = await get('st1', '/api/snapshot');
    expect(snap.statusCode).toBe(200);
    const db = body<{ perms: Record<string, Record<string, number>> }>(snap);
    expect(db.perms.Admin).toMatchObject({ curriculum: 0, publish: 0, cohorts: 0, announce: 0, viewLearners: 1 });
  });

  it('a build change made elsewhere first (Staff & Roles) makes the token stale', async () => {
    const t = await tokenFor({ role: 'Admin', capability: 'build', allowed: false });
    const cookie = await app.signInAs('st1');
    const toggle = await app.inject({ method: 'POST', url: '/api/mutate/togglePermission', headers: { cookie, 'content-type': 'application/json' }, payload: { role: 'Admin', perm: 'publish' } });
    expect(toggle.statusCode).toBe(200);
    const res = await commit('st1', t);
    expect(res.statusCode).toBe(409);
    expect(body<{ code: string }>(res).code).toBe('grant_stale');
  });
});

describe('who may change the matrix @console', () => {
  it('the Owner only: Admin, Support and Instructor are refused at preview and at the change, and audited', async () => {
    const token = await tokenFor({ role: 'Support', capability: 'account', allowed: false });
    for (const who of ['st_admin', 'st4', 'st2']) {
      const p = await preview(who, { role: 'Support', capability: 'account', allowed: false });
      expect(p.statusCode, who).toBe(403);
      expect(body<{ code: string }>(p).code).toBe('console_forbidden');
      const c = await commit(who, token);
      expect(c.statusCode, who).toBe(403);
      expect(body<{ code: string }>(c).code).toBe('console_forbidden');
    }
    expect((await auditRows()).every((r) => r.action === 'console.access_denied' && r.outcome === 'denied')).toBe(true);
    expect(await auditRows()).toHaveLength(6);
    expect(await grantRows()).toHaveLength(0);
  });

  it('a learner is refused without an audit row', async () => {
    expect((await preview('u_jamie', { role: 'Admin', capability: 'masq', allowed: false })).statusCode).toBe(403);
    expect(await auditRows()).toHaveLength(0);
  });

  it('the CSRF rule comes first: a foreign Origin or a non-JSON body is refused, unaudited', async () => {
    const foreign = await post('st1', CONSOLE_PATHS.rolesPreview, { role: 'Admin', capability: 'masq', allowed: false }, { origin: 'https://evil.example' });
    expect(foreign.statusCode).toBe(403);
    const cookie = await app.signInAs('st1');
    const text = await app.inject({ method: 'POST', url: CONSOLE_PATHS.roles, headers: { cookie, 'content-type': 'text/plain' }, payload: 'x' });
    expect(text.statusCode).toBe(415);
    expect(await auditRows()).toHaveLength(0);
  });
});

describe('the guards, over HTTP @console', () => {
  const refusal = async (b: Record<string, unknown>) => {
    const res = await preview('st1', b);
    return [res.statusCode, body<{ code: string; error: string }>(res).code];
  };

  it('the Owner’s column never changes', async () => {
    expect(await refusal({ role: 'Owner', capability: 'masq', allowed: false })).toEqual([403, 'role_fixed']);
    expect(await refusal({ role: 'Instructor', capability: 'masq', allowed: true })).toEqual([403, 'role_fixed']);
  });

  it('nothing past the ceiling: Support’s refund, masquerade, jobs, export and ops, and this matrix', async () => {
    for (const capability of ['refund', 'masq', 'jobs', 'export', 'ops', 'staff']) expect(await refusal({ role: 'Support', capability, allowed: true }), capability).toEqual([403, 'fixed_by_product']);
    expect(await refusal({ role: 'Admin', capability: 'staff', allowed: true })).toEqual([403, 'fixed_by_product']);
  });

  it('a change must change something; a malformed one is 400', async () => {
    expect(await refusal({ role: 'Admin', capability: 'build', allowed: true })).toEqual([409, 'no_change']);
    expect(await refusal({ role: 'Admin', capability: 'masq', allowed: true })).toEqual([409, 'no_change']);
    expect(await refusal({ role: 'Admin', capability: 'masquerade.start', allowed: false })).toEqual([400, 'invalid_query']);
    expect(await refusal({ role: 'Admin', capability: 'masq', allowed: 'no' })).toEqual([400, 'invalid_query']);
    expect(await auditRows()).toHaveLength(0);
  });

  it('a row past the ceiling cannot be stored even by hand', async () => {
    const db = await testDatabase();
    await expect(db.insert(consoleRoleGrants).values({ role: 'Owner', capability: 'masq', allowed: false, updatedBy: 'st1', updatedAt: NOW })).rejects.toThrow();
    await expect(db.insert(consoleRoleGrants).values({ role: 'Admin', capability: 'roles.write', allowed: true, updatedBy: 'st1', updatedAt: NOW })).rejects.toThrow();
    // And a stored "allowed" past the ceiling grants nothing: the effective answer is ceiling AND NOT removed.
    await db.insert(consoleRoleGrants).values({ role: 'Support', capability: 'export', allowed: true, updatedBy: 'st1', updatedAt: NOW });
    const exp = await post('st4', CONSOLE_PATHS.auditExport, {});
    expect(exp.statusCode).toBe(403);
  });
});

describe('the confirm token @console', () => {
  it('a tampered token, or another staff member’s, is 403 confirm_invalid', async () => {
    const token = await tokenFor({ role: 'Admin', capability: 'export', allowed: false });
    const [b64, mac] = token.split('.') as [string, string];
    const claims = JSON.parse(Buffer.from(b64, 'base64url').toString()) as Record<string, unknown>;
    const forged = `${Buffer.from(JSON.stringify({ ...claims, role: 'Support', capability: 'account' })).toString('base64url')}.${mac}`;
    for (const t of [forged, `${b64}.${mac.slice(0, -2)}AA`, 'x', '', 42, null, `${b64}.`]) {
      const res = await commit('st1', t);
      expect(res.statusCode, String(t)).toBe(403);
      expect(body<{ code: string }>(res).code).toBe('confirm_invalid');
    }
    // Signed for st1: the other Owner cannot use it.
    const other = await commit('st_owner2', token);
    expect(other.statusCode).toBe(403);
    expect(body<{ code: string }>(other).code).toBe('confirm_invalid');
    expect(await grantRows()).toHaveLength(0);
    expect(await auditRows()).toHaveLength(0);
  });

  it('is good for five minutes, then 410 confirm_expired', async () => {
    const token = await tokenFor({ role: 'Admin', capability: 'export', allowed: false });
    process.env.FIXED_NOW = new Date(NOW + ROLE_CONFIRM_TTL_MS + 1).toISOString();
    const res = await commit('st1', token);
    expect(res.statusCode).toBe(410);
    expect(body<{ code: string }>(res).code).toBe('confirm_expired');
    process.env.FIXED_NOW = new Date(NOW + ROLE_CONFIRM_TTL_MS).toISOString();
    expect((await commit('st1', token)).statusCode).toBe(200);
  });

  it('a stale before is 409: the change already made, or replayed', async () => {
    const a = await tokenFor({ role: 'Support', capability: 'account', allowed: false });
    const b = await tokenFor({ role: 'Support', capability: 'account', allowed: false }, 'st_owner2');
    expect((await commit('st1', a)).statusCode).toBe(200);
    for (const [who, t] of [['st_owner2', b], ['st1', a]] as const) {
      const res = await commit(who, t);
      expect(res.statusCode, who).toBe(409);
      expect(body<{ code: string }>(res).code).toBe('grant_stale');
    }
    expect(await auditRows()).toHaveLength(1);
  });
});
