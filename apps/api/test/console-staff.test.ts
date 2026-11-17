// D-172: Roles & Permissions' Invite staff and Change role…, and the Audit Log's Export selected,
// through the real router and a real Postgres. The staff change is the Owner's alone, two steps (the
// matrix's confirm token), one audit row each, and refused on your own role and the last Owner. The
// guards themselves are unit-tested in `packages/core/test/console-staff.test.ts`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import type { StaffChangePreview } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { CONSOLE_PATHS } from '../src/console/routes';
import { auditLog, users } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  await (await testDatabase()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const post = async (who: string, url: string, payload: unknown) =>
  app.inject({ method: 'POST', url, headers: { cookie: await app.signInAs(who), 'content-type': 'application/json' }, payload: payload as Record<string, unknown> });
const body = <T>(res: { body: string }) => JSON.parse(res.body) as T;
const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const roleOf = async (id: string) => (await loadDb()).staff.find((s) => s.id === id)?.role;

describe('Change role… (D-172) @console', () => {
  it('previews without writing, then changes the role with one staff.role_change row', async () => {
    const p = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st2', role: 'Support' });
    expect(p.statusCode).toBe(200);
    expect(p.headers['cache-control']).toBe('private, no-store');
    const pv = body<StaffChangePreview>(p);
    expect(pv).toMatchObject({
      change: { kind: 'role', staffId: 'st2', role: 'Support' },
      before: 'Instructor',
      title: 'Change Jordan Hale to Support?',
      body: 'Instructor to Support. It applies right away.',
      cta: 'Change role',
      expiresAt: NOW + 300_000,
    });
    expect(await roleOf('st2')).toBe('Instructor');
    expect(await auditRows()).toHaveLength(0);

    const c = await post('st1', CONSOLE_PATHS.staff, { confirmToken: pv.confirmToken });
    expect(c.statusCode).toBe(200);
    expect(body(c)).toEqual({ toast: 'Jordan Hale is now Support' });
    expect(await roleOf('st2')).toBe('Support');
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'staff.role_change',
      outcome: 'ok',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'staff',
      targetId: 'st2',
      targetLabel: 'Jordan Hale',
      before: { role: 'Instructor' },
      after: { role: 'Support' },
    });
    // Replayed: what it confirmed no longer holds.
    const again = await post('st1', CONSOLE_PATHS.staff, { confirmToken: pv.confirmToken });
    expect(again.statusCode).toBe(409);
    expect(body(again)).toMatchObject({ code: 'staff_stale' });
    expect(await auditRows()).toHaveLength(1);
  });

  it('refuses your own role, the last Owner, no change, a stranger, and an Owner’s role (core’s rule)', async () => {
    const own = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st1', role: 'Admin' });
    expect(own.statusCode).toBe(403);
    expect(body(own)).toEqual({ error: 'You can’t change your own role or remove yourself.', code: 'staff_self_change' });
    const same = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st4', role: 'Support' });
    expect(body(same)).toMatchObject({ code: 'staff_unchanged' });
    const stranger = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'nope', role: 'Admin' });
    expect(stranger.statusCode).toBe(400);
    // A second Owner: the guard lets the change through, core's setStaffRole refuses an Owner's role.
    await (await testDatabase()).insert(users).values({ id: 'st_owner2', email: 'kai@amplifiedimpact.com', name: 'Kai Moreno', kind: 'staff', staffRole: 'Owner' });
    const fixed = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st_owner2', role: 'Admin' });
    expect(fixed.statusCode).toBe(422);
    expect(body(fixed)).toEqual({ error: 'The owner’s role is fixed.', code: 'staff_invalid' });
    expect(await auditRows()).toHaveLength(0);
  });

  it('is the Owner’s alone; another staff member’s token is not valid', async () => {
    const admin = await post('st_admin', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st2', role: 'Support' });
    expect(admin.statusCode).toBe(403);
    expect(body(admin)).toMatchObject({ code: 'console_forbidden' });
    expect((await auditRows()).map((r) => r.action)).toEqual(['console.access_denied']);
    const pv = body<StaffChangePreview>(await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st2', role: 'Support' }));
    const tampered = pv.confirmToken.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    expect(body(await post('st1', CONSOLE_PATHS.staff, { confirmToken: tampered }))).toMatchObject({ code: 'confirm_invalid' });
    expect(body(await post('st1', CONSOLE_PATHS.staff, { confirmToken: 42 }))).toMatchObject({ code: 'confirm_invalid' });
    process.env.FIXED_NOW = new Date(NOW + 300_001).toISOString();
    const late = await post('st1', CONSOLE_PATHS.staff, { confirmToken: pv.confirmToken });
    expect(late.statusCode).toBe(410);
    expect(await roleOf('st2')).toBe('Instructor');
  });
});

describe('Invite staff (D-172) @console', () => {
  it('adds the staff member with one staff.invite row and no email address in it; sends nothing', async () => {
    const pv = body<StaffChangePreview>(await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'invite', email: 'new.person@amplifiedimpact.com', role: 'Support' }));
    expect(pv).toMatchObject({ before: null, title: 'Invite new.person@amplifiedimpact.com as Support?', body: 'They join staff as Support right away. No email is sent.', cta: 'Invite staff' });
    const c = await post('st1', CONSOLE_PATHS.staff, { confirmToken: pv.confirmToken });
    expect(c.statusCode).toBe(200);
    expect(body(c)).toEqual({ toast: 'new.person@amplifiedimpact.com added to staff as Support' });
    const added = (await loadDb()).staff.find((s) => s.email === 'new.person@amplifiedimpact.com')!;
    expect(added).toMatchObject({ name: 'New Person', role: 'Support' });
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'staff.invite', targetId: added.id, targetLabel: 'New Person', before: { role: null }, after: { role: 'Support' } });
    expect(JSON.stringify(rows[0])).not.toContain('new.person@');
  });

  it('refuses the Owner role, a bad address and someone already on staff, before writing', async () => {
    expect((await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'invite', email: 'x@y.co', role: 'Owner' })).statusCode).toBe(400);
    const bad = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'invite', email: 'not-an-email', role: 'Support' });
    expect(bad.statusCode).toBe(422);
    expect(body(bad)).toEqual({ error: 'Enter a valid email address.', code: 'staff_invalid' });
    const dup = await post('st1', CONSOLE_PATHS.staffPreview, { kind: 'invite', email: 'casey@amplifiedimpact.com', role: 'Support' });
    expect(body(dup)).toEqual({ error: 'That person is already on staff.', code: 'staff_invalid' });
    expect(await auditRows()).toHaveLength(0);
  });
});

describe('Audit Log › Export selected (D-172) @console', () => {
  it('exports exactly the rows named, records how many, and refuses a bad list', async () => {
    // Three rows to export: three refused Admin previews.
    for (let i = 0; i < 3; i++) await post('st_admin', CONSOLE_PATHS.staffPreview, { kind: 'role', staffId: 'st2', role: 'Support' });
    const ids = (await auditRows()).map((r) => String(r.id));
    const res = await post('st1', CONSOLE_PATHS.auditExport, { ids: [ids[0], ids[2]] });
    expect(res.statusCode).toBe(200);
    const lines = res.body.trim().split('\n');
    expect(lines).toHaveLength(3); // the header and the two rows
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual([`"${ids[2]}"`, `"${ids[0]}"`]);
    const rows = await auditRows();
    expect(rows.at(-1)).toMatchObject({ action: 'audit.export', outcome: 'ok', after: { rows: 2, format: 'csv', filters: {}, selected: 2 } });
    for (const bad of [[], ['0'], ['a'], ['1;drop'], Array.from({ length: 501 }, (_, i) => String(i + 1)), 'all']) {
      const r = await post('st1', CONSOLE_PATHS.auditExport, { ids: bad });
      expect(r.statusCode).toBe(400);
      expect(body(r)).toMatchObject({ code: 'invalid_query' });
    }
    // Support may not export at all (D6).
    expect((await post('st4', CONSOLE_PATHS.auditExport, { ids: [ids[0]] })).statusCode).toBe(403);
  });
});
