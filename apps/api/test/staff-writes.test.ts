// Staff role assignment through `POST /api/mutate/:name` (D-171): the guards and the audit rows the
// route puts around core's `setStaffRole`, `removeStaff` and `inviteStaff` (unchanged), against the
// real router and a real Postgres. The rules are unit-tested in `packages/core/test/staff-guard.test.ts`;
// here each one refuses over HTTP with its `denied` row, and each change writes exactly one `ok` row
// with the role before and after.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { seedForDatabase } from '@ai/core';
import type { Db } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { refuseOwnerlessResult, staffWriteContext } from '../src/console/staff-writes';
import type { SessionViewer } from '../src/auth';
import { auditLog, users } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');

/**
 * The live seed (Owner st1 Casey Lin, Instructor st2 Jordan Hale, Content Editor st3, Support st4
 * Luis Romero) plus an Admin, st_admin Dana Reyes, who holds the `staff` permission: a non-Owner who
 * may call all three writes, which is what the guards are for.
 */
function fixture(): Db {
  const db = seedForDatabase('live');
  db.staff.push({ id: 'st_admin', name: 'Dana Reyes', email: 'dana@amplifiedimpact.com', role: 'Admin', last: null });
  db.perms.Admin.staff = 1;
  return db;
}

let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(fixture());
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const mutate = async (who: string, name: string, payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: `/api/mutate/${name}`, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' }, payload });
const body = (res: { body: string }) => JSON.parse(res.body) as Record<string, unknown>;
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const roleOf = async (id: string) => (await (await testDatabase()).select({ role: users.staffRole }).from(users).where(eq(users.id, id)))[0]?.role ?? null;

describe('nobody changes their own role or removes themselves (D-171)', () => {
  it('refuses a self role change with a 403 and one denied row, and changes nothing', async () => {
    const res = await mutate('st_admin', 'setStaffRole', { id: 'st_admin', role: 'Owner' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toEqual({ error: 'You can’t change your own role or remove yourself.', code: 'staff_self_change' });
    expect(await roleOf('st_admin')).toBe('Admin');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'staff.role_change',
      outcome: 'denied',
      actorSource: 'staff',
      actorUserId: 'st_admin',
      actorRole: 'Admin',
      targetType: 'staff',
      targetId: 'st_admin',
      targetLabel: 'Dana Reyes',
      before: { role: 'Admin' },
      after: { role: 'Owner', refused: 'staff_self_change' },
    });
  });

  it('refuses the Owner’s own role change too, before core’s “The owner’s role is fixed.”', async () => {
    const res = await mutate('st1', 'setStaffRole', { id: 'st1', role: 'Admin' });
    expect(res.statusCode).toBe(403);
    expect(body(res).code).toBe('staff_self_change');
    expect(await roleOf('st1')).toBe('Owner');
    expect(await auditRows()).toHaveLength(1);
  });

  it('refuses removing yourself with a 403 and one denied row', async () => {
    const res = await mutate('st_admin', 'removeStaff', { id: 'st_admin' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toMatchObject({ code: 'staff_self_change' });
    expect(await roleOf('st_admin')).toBe('Admin');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.remove', outcome: 'denied', actorUserId: 'st_admin', targetId: 'st_admin', before: { role: 'Admin' }, after: { role: null, refused: 'staff_self_change' } });

    const own = await mutate('st1', 'removeStaff', { id: 'st1' });
    expect(own.statusCode).toBe(403);
    expect(body(own).code).toBe('staff_self_change');
    expect(await roleOf('st1')).toBe('Owner');
  });
});

describe('no change leaves zero Owners (D-171)', () => {
  it('refuses demoting the last Owner with a 403 and one denied row', async () => {
    const res = await mutate('st_admin', 'setStaffRole', { id: 'st1', role: 'Admin' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toEqual({ error: 'There must always be at least one Owner.', code: 'staff_last_owner' });
    expect(await roleOf('st1')).toBe('Owner');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.role_change', outcome: 'denied', actorUserId: 'st_admin', targetId: 'st1', targetLabel: 'Casey Lin', before: { role: 'Owner' }, after: { role: 'Admin', refused: 'staff_last_owner' } });
  });

  it('refuses removing the last Owner with a 403 and one denied row (core alone answers an info toast)', async () => {
    const res = await mutate('st_admin', 'removeStaff', { id: 'st1' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toMatchObject({ code: 'staff_last_owner' });
    expect(await roleOf('st1')).toBe('Owner');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.remove', outcome: 'denied', targetId: 'st1', before: { role: 'Owner' }, after: { role: null, refused: 'staff_last_owner' } });
  });

  it('the route’s own check refuses a result with no Owner left, whatever core decided', async () => {
    // Core refuses any change to an Owner today, so no request reaches this. It is the rule held on
    // its own: a result in which the Owner is gone, as if core had allowed it.
    const before = await loadDb();
    const after: Db = { ...before, staff: before.staff.map((s) => (s.role === 'Owner' ? { ...s, role: 'Admin' as const } : s)) };
    const viewer = { actor: { kind: 'staff', staffId: 'st_admin' }, user: { id: 'st_admin', kind: 'staff', staffRole: 'Admin' } } as unknown as SessionViewer;
    const ctx = staffWriteContext('setStaffRole', { id: 'st1', role: 'Admin' }, viewer)!;
    const req = { headers: {}, clientIp: '198.51.100.7', id: 'req-1' } as unknown as FastifyRequest;
    const db = await testDatabase();
    expect(await refuseOwnerlessResult(req, db, ctx, before, before)).toBeNull();
    expect(await auditRows()).toHaveLength(0);
    expect(await refuseOwnerlessResult(req, db, ctx, before, after)).toEqual({ status: 403, body: { error: 'There must always be at least one Owner.', code: 'staff_last_owner' } });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.role_change', outcome: 'denied', targetId: 'st1', after: { refused: 'staff_last_owner' } });
  });

  it('with a second Owner, the guard lets a demotion through to core, which still refuses it', async () => {
    const grant = await mutate('st1', 'setStaffRole', { id: 'st2', role: 'Owner' });
    expect(grant.statusCode).toBe(200);
    const demote = await mutate('st_admin', 'setStaffRole', { id: 'st2', role: 'Admin' });
    expect(demote.statusCode).toBe(403);
    expect(body(demote)).toEqual({ error: 'The owner’s role is fixed.' });
    expect(await roleOf('st2')).toBe('Owner');
    const rows = await auditRows();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ action: 'staff.role_change', outcome: 'denied', actorUserId: 'st_admin', targetId: 'st2', before: { role: 'Owner' }, after: { role: 'Admin', refused: 'forbidden', message: 'The owner’s role is fixed.' } });

    // Core's removal of an Owner is an info toast and no change: nothing to record.
    const remove = await mutate('st_admin', 'removeStaff', { id: 'st2' });
    expect(remove.statusCode).toBe(200);
    expect(body(remove).toast).toEqual({ msg: 'The owner can’t be removed', tone: 'info' });
    expect(await roleOf('st2')).toBe('Owner');
    expect(await auditRows()).toHaveLength(2);
  });
});

describe('only an Owner makes someone an Owner (D-171)', () => {
  it('refuses a non-Owner holding `staff` setting the Owner role, with one denied row', async () => {
    const res = await mutate('st_admin', 'setStaffRole', { id: 'st2', role: 'Owner' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toEqual({ error: 'Only the Owner can make someone an Owner.', code: 'staff_owner_grant' });
    expect(await roleOf('st2')).toBe('Instructor');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.role_change', outcome: 'denied', targetId: 'st2', before: { role: 'Instructor' }, after: { role: 'Owner', refused: 'staff_owner_grant' } });
  });

  it('refuses a non-Owner inviting an Owner, and the denied row holds no email', async () => {
    const res = await mutate('st_admin', 'inviteStaff', { email: 'pat.quinn@amplifiedimpact.com', role: 'Owner' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toMatchObject({ code: 'staff_owner_grant' });
    expect(await (await testDatabase()).select().from(users).where(eq(users.email, 'pat.quinn@amplifiedimpact.com'))).toHaveLength(0);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.invite', outcome: 'denied', targetType: 'staff', targetId: null, targetLabel: null, before: { role: null }, after: { role: 'Owner', refused: 'staff_owner_grant' } });
    expect(JSON.stringify(rows[0])).not.toContain('pat.quinn');
  });

  it('lets the Owner grant the Owner role (core allows it), and audits it', async () => {
    const res = await mutate('st1', 'setStaffRole', { id: 'st2', role: 'Owner' });
    expect(res.statusCode).toBe(200);
    expect(await roleOf('st2')).toBe('Owner');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.role_change', outcome: 'ok', actorUserId: 'st1', actorRole: 'Owner', targetId: 'st2', before: { role: 'Instructor' }, after: { role: 'Owner' } });
  });
});

describe('every change writes exactly one audit row, with the role before and after (D-171)', () => {
  it('a role change', async () => {
    const res = await mutate('st1', 'setStaffRole', { id: 'st2', role: 'Admin' });
    expect(res.statusCode).toBe(200);
    expect(body(res).toast).toEqual({ msg: 'Jordan Hale is now Admin', tone: 'success' });
    expect(await roleOf('st2')).toBe('Admin');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      at: NOW,
      action: 'staff.role_change',
      outcome: 'ok',
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'staff',
      targetId: 'st2',
      targetLabel: 'Jordan Hale',
      reason: null,
      before: { role: 'Instructor' },
      after: { role: 'Admin' },
    });
    expect(rows[0]!.requestId).not.toBeNull();
  });

  it('a removal', async () => {
    const res = await mutate('st_admin', 'removeStaff', { id: 'st4' });
    expect(res.statusCode).toBe(200);
    expect(await roleOf('st4')).toBeNull();
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.remove', outcome: 'ok', actorUserId: 'st_admin', actorRole: 'Admin', targetType: 'staff', targetId: 'st4', targetLabel: 'Luis Romero', before: { role: 'Support' }, after: { role: null } });
  });

  it('an invite: the new member by id and name, never the email', async () => {
    const res = await mutate('st1', 'inviteStaff', { email: 'pat.quinn@amplifiedimpact.com', role: 'Support' });
    expect(res.statusCode).toBe(200);
    const [created] = await (await testDatabase()).select({ id: users.id, role: users.staffRole }).from(users).where(eq(users.email, 'pat.quinn@amplifiedimpact.com'));
    expect(created).toMatchObject({ role: 'Support' });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.invite', outcome: 'ok', actorUserId: 'st1', targetType: 'staff', targetId: created!.id, targetLabel: 'Pat Quinn', before: { role: null }, after: { role: 'Support' } });
    expect(JSON.stringify(rows[0])).not.toContain('@');
  });

  it('a role set to the one it already was changes nothing and writes nothing', async () => {
    const res = await mutate('st1', 'setStaffRole', { id: 'st2', role: 'Instructor' });
    expect(res.statusCode).toBe(200);
    expect(await auditRows()).toHaveLength(0);
  });
});

describe('who may call them is unchanged; core’s refusals (D-171)', () => {
  it('core’s 403 for a staff member without `staff` writes one denied row', async () => {
    const res = await mutate('st4', 'setStaffRole', { id: 'st2', role: 'Admin' });
    expect(res.statusCode).toBe(403);
    expect(body(res)).toEqual({ error: 'You don’t have permission to do that.' });
    expect(await roleOf('st2')).toBe('Instructor');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.role_change', outcome: 'denied', actorUserId: 'st4', actorRole: 'Support', targetId: 'st2', after: { role: 'Admin', refused: 'forbidden' } });
  });

  it('a learner gets core’s 403 and no row, as the Console writes none for a learner', async () => {
    for (const [name, args] of [
      ['setStaffRole', { id: 'st2', role: 'Admin' }],
      ['removeStaff', { id: 'st2' }],
      ['inviteStaff', { email: 'x@amplifiedimpact.com', role: 'Support' }],
    ] as const) {
      const res = await mutate('u_jamie', name, args);
      expect(res.statusCode, name).toBe(403);
    }
    expect(await auditRows()).toHaveLength(0);
  });

  it('validation (422) and a missing target (404) write no row', async () => {
    expect((await mutate('st1', 'inviteStaff', { email: 'not-an-email', role: 'Support' })).statusCode).toBe(422);
    expect((await mutate('st1', 'inviteStaff', { email: 'jordan@amplifiedimpact.com', role: 'Support' })).statusCode).toBe(422);
    expect((await mutate('st1', 'setStaffRole', { id: 'st_nobody', role: 'Admin' })).statusCode).toBe(404);
    expect((await mutate('st1', 'removeStaff', { id: 'st_nobody' })).statusCode).toBe(404);
    expect(await auditRows()).toHaveLength(0);
  });

  it('every other mutation is untouched: the permission matrix writes no row here', async () => {
    const res = await mutate('st1', 'togglePermission', { role: 'Instructor', perm: 'publish' });
    expect(res.statusCode).toBe(200);
    expect(await auditRows()).toHaveLength(0);
  });
});
