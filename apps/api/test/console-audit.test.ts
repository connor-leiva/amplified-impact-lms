// The Admin Console's audit log (D-157, spec § 7.8 and § 11.3), against a real Postgres: the writer
// and its redaction, the append-only trigger, the list's filters and pages, Support's view without IP
// or user agent, and the CSV export (its limit, its injection safety, and its own audit row).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { AUDIT_EXPORT_MAX_ROWS, seedForDatabase } from '@ai/core';
import type { AuditRow } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { AUDIT_PAYLOAD_MAX_BYTES, audit, redactAuditPayload } from '../src/console/audit';
import { CONSOLE_PATHS, parseAuditFilters } from '../src/console/routes';
import { auditLog, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const HOUR = 3600_000;

let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  await (await testDatabase()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  // `x-real-ip` stands in for Railway's edge, as `test/client-ip.test.ts` does.
  app = await build({ logger: false, clientIpHeader: 'x-real-ip' });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const rows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));
const staff = (userId: string, role: string) => ({ source: 'staff' as const, userId, role });

/** A request-shaped object for the writer, as Fastify would hand it over. */
const fakeReq = (headers: Record<string, string> = {}) => ({ headers, clientIp: '198.51.100.7', id: 'req-42' }) as unknown as FastifyRequest;

const getAudit = async (userId: string, query = '') =>
  app.inject({ method: 'GET', url: `${CONSOLE_PATHS.audit}${query}`, headers: { cookie: await app.signInAs(userId) } });
const page = (res: { body: string }) => JSON.parse(res.body) as { rows: AuditRow[]; nextCursor: string | null };

describe('redactAuditPayload (spec § 7.8) @console', () => {
  it('drops every key that names a secret, at any depth and in any case', () => {
    const out = redactAuditPayload({
      plan: 'agents',
      apiKey: 'x',
      STRIPE_SECRET_KEY: 'y',
      nested: { password: 'p', passwordHash: 'h', Authorization: 'Bearer z', cookie: 'c', webhookSignature: 's', sessionToken: 't', ok: 1 },
      list: [{ idempotencyKey: 'k', seats: 16 }],
    });
    expect(out).toEqual({ plan: 'agents', nested: { ok: 1 }, list: [{ seats: 16 }] });
  });

  it('drops every value that looks like a Stripe or Resend key', () => {
    const out = redactAuditPayload({ a: 'sk_live_123', b: 'rk_test_9', c: 'whsec_abc', d: 're_send', e: ' sk_live_padded', f: 'skate', g: ['ok', 'sk_x', 'fine'], h: 'cus_123' });
    expect(out).toEqual({ f: 'skate', g: ['ok', 'fine'], h: 'cus_123' });
    expect(redactAuditPayload('sk_live_top')).toBeNull();
  });

  it('caps the payload at 2 KB, replacing it with its size rather than a prefix', () => {
    const big = { notes: 'x'.repeat(AUDIT_PAYLOAD_MAX_BYTES) };
    const out = redactAuditPayload(big) as { truncated: boolean; bytes: number };
    expect(out).toEqual({ truncated: true, bytes: JSON.stringify(big).length });
    const fits = { notes: 'x'.repeat(AUDIT_PAYLOAD_MAX_BYTES - 20) };
    expect(redactAuditPayload(fits)).toEqual(fits);
    // Bytes, not characters: a multi-byte payload is measured as stored.
    expect(redactAuditPayload({ s: '€'.repeat(800) })).toMatchObject({ truncated: true });
  });

  it('stores nothing for nothing, survives cycles, and keeps plain values', () => {
    expect(redactAuditPayload(undefined)).toBeNull();
    expect(redactAuditPayload(null)).toBeNull();
    const loop: Record<string, unknown> = { a: 1 };
    loop.self = loop;
    expect(redactAuditPayload(loop)).toEqual({ a: 1 });
    expect(redactAuditPayload({ n: NaN, d: new Date(NOW), b: true, big: 10n, f: () => 1, u: undefined })).toEqual({
      n: null,
      d: '2026-12-07T16:42:00.000Z',
      b: true,
      big: '10',
    });
  });
});

describe('the audit writer @console', () => {
  it('writes one row with the request’s IP, a capped user agent and the request id, redacted', async () => {
    const id = await audit(fakeReq({ 'user-agent': 'U'.repeat(400) }), {
      action: 'audit.export',
      outcome: 'ok',
      actor: staff('st1', 'Owner'),
      target: { type: 'audit_log', label: 'Audit log' },
      reason: 'r'.repeat(600),
      before: null,
      after: { rows: 3, token: 'tok_should_go', key: 'sk_live_nope' },
    });
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id,
      at: NOW,
      actorUserId: 'st1',
      actorRole: 'Owner',
      actorSource: 'staff',
      action: 'audit.export',
      outcome: 'ok',
      targetType: 'audit_log',
      targetLabel: 'Audit log',
      ip: '198.51.100.7',
      requestId: 'req-42',
      after: { rows: 3 },
    });
    expect(all[0]!.userAgent).toHaveLength(300);
    expect(all[0]!.reason).toHaveLength(500);
    // SQL NULL, not JSON null: an absent payload is no payload.
    const [{ n }] = (await (await testDatabase()).execute(sql`select count(*)::int as n from audit_log where before is null`)) as unknown as [{ n: number }];
    expect(n).toBe(1);
  });

  it('writes a system row with no actor and no request', async () => {
    await audit(null, { action: 'masquerade.expire', outcome: 'ok', actor: { source: 'system' } });
    expect((await rows())[0]).toMatchObject({ actorSource: 'system', actorUserId: null, ip: null, userAgent: null, requestId: null });
  });

  it('refuses an action outside the closed list', async () => {
    await expect(audit(null, { action: 'audit.delete' as never, outcome: 'ok', actor: { source: 'system' } })).rejects.toThrow(/Not an audit action/);
    expect(await rows()).toHaveLength(0);
  });

  it('the database refuses a staff row with no staff member, and an unknown outcome', async () => {
    const db = await testDatabase();
    await expect(db.insert(auditLog).values({ at: NOW, actorSource: 'staff', action: 'audit.export', outcome: 'ok' })).rejects.toThrow();
    await expect(db.insert(auditLog).values({ at: NOW, actorSource: 'system', action: 'audit.export', outcome: 'maybe' })).rejects.toThrow();
  });
});

describe('the append-only trigger (migration 0015) @console', () => {
  it('raises on UPDATE and on DELETE, even of no rows, and leaves the row as written', async () => {
    await audit(fakeReq(), { action: 'audit.export', outcome: 'ok', actor: staff('st1', 'Owner'), reason: 'original' });
    const db = await testDatabase();
    // drizzle wraps the driver's error; Postgres's own message is its cause.
    const refusal = (p: Promise<unknown>) =>
      p.then(
        () => 'no error',
        (e: { cause?: { message?: string; code?: string }; message: string }) => `${e.cause?.code ?? ''} ${e.cause?.message ?? e.message}`,
      );
    expect(await refusal(db.execute(sql`update audit_log set reason = 'rewritten'`))).toBe('23001 audit_log is append-only: UPDATE is not allowed');
    expect(await refusal(db.execute(sql`delete from audit_log`))).toBe('23001 audit_log is append-only: DELETE is not allowed');
    expect(await refusal(db.execute(sql`delete from audit_log where false`))).toBe('23001 audit_log is append-only: DELETE is not allowed');
    expect(await refusal(db.update(auditLog).set({ outcome: 'failed' }))).toMatch(/append-only: UPDATE/);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ reason: 'original', outcome: 'ok' });
  });

  it('still takes new rows', async () => {
    await audit(null, { action: 'masquerade.expire', outcome: 'ok', actor: { source: 'system' } });
    await audit(null, { action: 'masquerade.expire', outcome: 'ok', actor: { source: 'system' } });
    expect(await rows()).toHaveLength(2);
  });
});

/** Rows across three actors, two actions, four outcomes and a week, written through the writer. */
async function seedRows() {
  const db = await testDatabase();
  const at = (h: number) => NOW - h * HOUR;
  const base = { ip: '203.0.113.5', userAgent: 'Mozilla/5.0 Test', requestId: 'req' };
  await db.insert(auditLog).values([
    { at: at(200), actorSource: 'staff', actorUserId: 'st1', actorRole: 'Owner', action: 'audit.export', outcome: 'ok', targetType: 'audit_log', targetLabel: 'Audit log', ...base },
    { at: at(30), actorSource: 'staff', actorUserId: 'st4', actorRole: 'Support', action: 'console.access_denied', outcome: 'denied', targetType: 'route', targetId: 'GET /api/console/roles', ...base },
    { at: at(20), actorSource: 'system', action: 'masquerade.expire', outcome: 'ok', targetType: 'user', targetId: 'u_jamie', targetLabel: 'Jamie Ortiz' },
    { at: at(10), actorSource: 'staff', actorUserId: 'st_admin', actorRole: 'Admin', action: 'masquerade.blocked_action', outcome: 'blocked', targetType: 'user', targetId: 'u_100%_off', targetLabel: '100% Off Promo', ...base },
    { at: at(2), actorSource: 'staff', actorUserId: 'st1', actorRole: 'Owner', action: 'audit.export', outcome: 'failed', reason: 'export_too_large', targetType: 'audit_log', targetLabel: 'Audit log', ...base },
  ]);
}

describe('GET /api/console/audit @console', () => {
  it('lists newest first, names the actor, and shows the Owner the IP and user agent', async () => {
    await seedRows();
    const p = page(await getAudit('st1'));
    expect(p.rows.map((r) => r.action)).toEqual(['audit.export', 'masquerade.blocked_action', 'masquerade.expire', 'console.access_denied', 'audit.export']);
    expect(p.nextCursor).toBeNull();
    expect(p.rows[0]).toMatchObject({ actor: { userId: 'st1', name: 'Casey Lin', role: 'Owner', source: 'staff' }, ip: '203.0.113.5', userAgent: 'Mozilla/5.0 Test', reason: 'export_too_large' });
    expect(p.rows[2]!.actor).toEqual({ userId: null, name: null, role: null, source: 'system' });
    expect(typeof p.rows[0]!.id).toBe('string');
    expect(p.rows[0]!.at).toBe(NOW - 2 * HOUR);
  });

  it('gives Support every row with ip and userAgent as null (D3)', async () => {
    await seedRows();
    const p = page(await getAudit('st4'));
    expect(p.rows).toHaveLength(5);
    for (const r of p.rows) {
      expect(r.ip).toBeNull();
      expect(r.userAgent).toBeNull();
    }
    expect(JSON.stringify(p)).not.toContain('203.0.113.5');
    expect(JSON.stringify(p)).not.toContain('Mozilla');
  });

  it('filters by actor, action, action group, outcome, target and date range', async () => {
    await seedRows();
    const actions = async (q: string) => page(await getAudit('st1', q)).rows.map((r) => `${r.action}:${r.outcome}`);
    expect(await actions('?actor=st1')).toEqual(['audit.export:failed', 'audit.export:ok']);
    expect(await actions('?actor=system')).toEqual(['masquerade.expire:ok']);
    expect(await actions('?action=audit.export')).toEqual(['audit.export:failed', 'audit.export:ok']);
    expect(await actions('?action=masquerade')).toEqual(['masquerade.blocked_action:blocked', 'masquerade.expire:ok']);
    expect(await actions('?outcome=denied')).toEqual(['console.access_denied:denied']);
    expect(await actions('?target=jamie')).toEqual(['masquerade.expire:ok']);
    expect(await actions('?target=ROLES')).toEqual(['console.access_denied:denied']);
    // `%` and `_` are searched for, not wildcards.
    expect(await actions(`?target=${encodeURIComponent('100%')}`)).toEqual(['masquerade.blocked_action:blocked']);
    expect(await actions(`?target=${encodeURIComponent('%')}`)).toEqual(['masquerade.blocked_action:blocked']);
    expect(await actions(`?from=${NOW - 24 * HOUR}&to=${NOW}`)).toEqual(['audit.export:failed', 'masquerade.blocked_action:blocked', 'masquerade.expire:ok']);
    expect(await actions(`?from=${NOW - 24 * HOUR}&outcome=ok`)).toEqual(['masquerade.expire:ok']);
  });

  it('refuses a malformed filter with 400 invalid_query', async () => {
    for (const q of ['?action=audit.delete', '?outcome=OK', '?from=yesterday', `?from=${NOW}&to=${NOW - 1}`, '?limit=0', '?limit=ten', '?cursor=-1', '?actor=a%20b', `?target=${'x'.repeat(101)}`]) {
      const res = await getAudit('st1', q);
      expect(res.statusCode, q).toBe(400);
      expect(JSON.parse(res.body).code, q).toBe('invalid_query');
    }
  });

  it('pages 50 at a time by default, 200 at most, with a cursor that ends', async () => {
    const db = await testDatabase();
    await db.execute(sql`
      insert into audit_log (at, actor_source, action, outcome, target_type, target_id)
      select ${NOW}::bigint - g, 'system', 'masquerade.expire', 'ok', 'user', 'u_' || g from generate_series(1, 260) g`);
    const first = page(await getAudit('st1'));
    expect(first.rows).toHaveLength(50);
    expect(first.nextCursor).toBe(first.rows[49]!.id);
    const second = page(await getAudit('st1', `?cursor=${first.nextCursor}`));
    expect(second.rows).toHaveLength(50);
    expect(Number(second.rows[0]!.id)).toBe(Number(first.rows[49]!.id) - 1);
    const big = page(await getAudit('st1', '?limit=1000'));
    expect(big.rows).toHaveLength(200);
    const rest = page(await getAudit('st1', `?limit=200&cursor=${big.nextCursor}`));
    expect(rest.rows).toHaveLength(60);
    expect(rest.nextCursor).toBeNull();
    const seen = new Set([...big.rows, ...rest.rows].map((r) => r.id));
    expect(seen.size).toBe(260);
  });

  it('writes nothing on a read', async () => {
    await seedRows();
    await getAudit('st1');
    await getAudit('st4', '?outcome=ok');
    expect(await rows()).toHaveLength(5);
  });
});

const exportAudit = async (userId: string, body: unknown = {}, extra: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: CONSOLE_PATHS.auditExport,
    headers: { cookie: await app.signInAs(userId), 'content-type': 'application/json', 'user-agent': 'ExportTest/1.0', 'x-real-ip': '192.0.2.44', ...extra },
    payload: body as object,
  });

describe('POST /api/console/audit/export @console', () => {
  it('answers a CSV of the filtered rows, then writes exactly one audit row for the export', async () => {
    await seedRows();
    const res = await exportAudit('st_admin', { action: 'masquerade' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="audit-log-2026-12-07.csv"');
    expect(res.headers['cache-control']).toBe('private, no-store');
    const lines = res.body.trimEnd().split('\r\n');
    expect(lines[0]).toMatch(/^"id","at","actor_user_id","actor_name"/);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"masquerade.blocked_action"');
    expect(lines[1]).toContain('"2026-12-07T06:42:00.000Z"');
    // Owner and Admin see the network columns in their export.
    expect(lines[1]).toContain('"203.0.113.5"');

    const all = await rows();
    expect(all).toHaveLength(6);
    expect(all[5]).toMatchObject({
      action: 'audit.export',
      outcome: 'ok',
      actorUserId: 'st_admin',
      actorRole: 'Admin',
      targetType: 'audit_log',
      ip: '192.0.2.44',
      userAgent: 'ExportTest/1.0',
      after: { rows: 2, format: 'csv', filters: { action: 'masquerade' } },
    });
    // The export never lists itself.
    expect(res.body).not.toContain('ExportTest');
  });

  it('neutralizes every field a spreadsheet would run as a formula', async () => {
    const db = await testDatabase();
    await db.insert(auditLog).values({
      at: NOW,
      actorSource: 'staff',
      actorUserId: 'st1',
      actorRole: 'Owner',
      action: 'audit.export',
      outcome: 'ok',
      targetType: '+type',
      targetId: '-id',
      targetLabel: '=HYPERLINK("https://evil.example","x")',
      reason: '@SUM(A1:A2)',
      userAgent: '\tcmd',
      requestId: '\rreq',
    });
    const csv = (await exportAudit('st1')).body;
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"",""x"")"`);
    expect(csv).toContain(`"'+type"`);
    expect(csv).toContain(`"'-id"`);
    expect(csv).toContain(`"'@SUM(A1:A2)"`);
    expect(csv).toContain(`"'\tcmd"`);
    expect(csv).toContain(`"'\rreq"`);
    // No cell anywhere starts with a bare formula character.
    for (const cell of csv.split(/","|^"|"\r\n"/m)) expect(cell).not.toMatch(/^[=+\-@]/);
  });

  it('refuses more than 10,000 rows with 422 export_too_large, and audits the refusal', async () => {
    const db = await testDatabase();
    await db.execute(sql`
      insert into audit_log (at, actor_source, action, outcome)
      select ${NOW}::bigint - g, 'system', 'masquerade.expire', 'ok' from generate_series(1, ${AUDIT_EXPORT_MAX_ROWS + 1}) g`);
    const res = await exportAudit('st1');
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body)).toEqual({ error: 'This export is over 10,000 rows. Narrow the filters and try again.', code: 'export_too_large' });
    const last = (await rows()).at(-1)!;
    expect(last).toMatchObject({ action: 'audit.export', outcome: 'failed', reason: 'export_too_large', actorUserId: 'st1', after: { rows: AUDIT_EXPORT_MAX_ROWS + 1, filters: {} } });

    // Exactly 10,000 is allowed: narrowing by the action leaves the refusal's row out.
    const ok = await exportAudit('st1', { action: 'masquerade.expire', to: NOW - 2 });
    expect(ok.statusCode).toBe(200);
    expect(ok.body.trimEnd().split('\r\n')).toHaveLength(AUDIT_EXPORT_MAX_ROWS + 1);
  }, 60_000);

  it('redacts what the export’s own row records', async () => {
    const res = await exportAudit('st1', { target: 'sk_live_sentinel_123' });
    expect(res.statusCode).toBe(200);
    const last = (await rows()).at(-1)!;
    expect(last.after).toEqual({ rows: 0, format: 'csv', filters: {} });
    expect(JSON.stringify(await rows())).not.toContain('sentinel');
  });

  it('refuses a malformed body with 400, and Support with 403 (audited as a denial)', async () => {
    expect((await exportAudit('st1', { outcome: 'nope' })).statusCode).toBe(400);
    const denied = await exportAudit('st4');
    expect(denied.statusCode).toBe(403);
    expect((await rows()).at(-1)).toMatchObject({ action: 'console.access_denied', actorUserId: 'st4', outcome: 'denied', after: { capability: 'export' } });
  });
});

describe('Console rate limits (spec § 7, D-137) @console', () => {
  it('allows 5 exports a minute; the 6th is 429 and still private, no-store', async () => {
    const cookie = await app.signInAs('st1');
    const go = () => app.inject({ method: 'POST', url: CONSOLE_PATHS.auditExport, headers: { cookie, 'content-type': 'application/json' }, payload: {} });
    for (let i = 0; i < 5; i++) expect((await go()).statusCode).toBe(200);
    const limited = await go();
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['cache-control']).toBe('private, no-store');
    expect(JSON.parse(limited.body).error).toMatch(/Rate limit/);
  });

  it('allows 60 reads a minute per route; the 61st is 429', async () => {
    const cookie = await app.signInAs('st1');
    const go = () => app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie } });
    for (let i = 0; i < 60; i++) expect((await go()).statusCode).toBe(200);
    const limited = await go();
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['cache-control']).toBe('private, no-store');
  }, 60_000);
});

describe('parseAuditFilters @console', () => {
  it('reads numbers from a query string or a JSON body alike', () => {
    expect(parseAuditFilters({ from: '5', to: 9 })).toEqual({ ok: true, value: { from: 5, to: 9 } });
    expect(parseAuditFilters({ actor: '', action: null, target: '  x  ' })).toEqual({ ok: true, value: { target: 'x' } });
    expect(parseAuditFilters({ from: 1.5 })).toEqual({ ok: false, field: 'from' });
    expect(parseAuditFilters({ actor: 7 })).toEqual({ ok: false, field: 'actor' });
  });
});
