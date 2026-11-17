// Masquerade, PR 3a (D-162, spec §§ 6, 11.2): Start, current, Extend, Exit and the history; the 15 /
// +15 / 60 clock on a pinned one; one live session per staff member; lazy expiry and the sweep; the
// write block (the global hook and `requireSession`), Sign Out, the GET handlers that write; the
// signed cookie; and no side effects on the learner. Through the real router and a real Postgres.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, asc, eq, getTableName, is, isNull, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import Stripe from 'stripe';
import { MASQUERADE_GET_WRITES, MASQUERADE_PATHS, seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { MASQUERADE_COOKIE } from '../src/auth/masquerade';
import { SESSION_COOKIE, settleEmails } from '../src/auth';
import { CONSOLE_PATHS } from '../src/console/routes';
import { masqueradeEnabled, sweepMasquerades } from '../src/console/masquerade';
import * as schema from '../src/db/schema';
import { auditLog, authSessions, emailVerifications, ghlLogins, masqueradeSessions, progress, resources, stripeEvents, users } from '../src/db/schema';
import { enqueueLogins } from '../src/jobs/ghl-logins';
import { startScheduler } from '../src/jobs/scheduler';
import { readOfferConfig } from '../src/billing/config';
import { stripeVerifier } from '../src/billing/stripe';
import { resetS3 } from '../src/storage';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');
const MIN = 60_000;
const REASON = 'Customer reports Week 2 steps are out of order.';
const WEBHOOK_SECRET = 'whsec_masquerade_test';

let app: App;
const at = (t: number): void => void (process.env.FIXED_NOW = new Date(t).toISOString());
const db = () => testDatabase();
const audits = async () => (await db()).select().from(auditLog).orderBy(asc(auditLog.id));
const rowsOf = async () => (await db()).select().from(masqueradeSessions);

/** One browser: a cookie jar that takes what each response sets and clears. */
class Browser {
  readonly jar = new Map<string, string>();
  constructor(pair?: string) {
    if (pair) this.put(pair);
  }
  put(pair: string): void {
    const i = pair.indexOf('=');
    this.jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  get cookie(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  absorb(setCookie: string | string[] | undefined): void {
    for (const line of (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).flatMap((l) => l.split('\n'))) {
      const [pair, ...attrs] = line.split(';').map((x) => x.trim());
      const i = pair!.indexOf('=');
      const name = pair!.slice(0, i);
      const value = pair!.slice(i + 1);
      const gone = value === '' || attrs.some((a) => /^max-age=0$/i.test(a));
      if (gone) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
  async send(method: 'GET' | 'POST' | 'PATCH' | 'HEAD', url: string, payload?: unknown) {
    const headers: Record<string, string> = { cookie: this.cookie };
    if (method !== 'GET' && method !== 'HEAD') headers['content-type'] = 'application/json';
    const res = await app.inject({ method, url, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { payload: (payload ?? {}) as object }) });
    this.absorb(res.headers['set-cookie']);
    return res;
  }
}

/** The staff member's own session id (the row `signInAs` made). */
const staffSessionOf = async (userId: string): Promise<string> =>
  (await (await db()).select().from(authSessions).where(and(eq(authSessions.userId, userId), isNull(authSessions.impersonating))))[0]!.id;

/** An Admin's browser, signed in, and a masquerade started from it as `target`. */
async function masquerade(target = 'u_jamie', staff = 'st_admin', extra: Record<string, unknown> = {}) {
  const browser = new Browser(await app.signInAs(staff));
  const staffSession = await staffSessionOf(staff);
  const res = await browser.send('POST', MASQUERADE_PATHS.start, { targetUserId: target, reason: REASON, ...extra });
  return { browser, staffSession, res };
}

/** The `name` line of a `set-cookie` header, its value and its attributes (names lower-cased). */
function cookieLine(setCookie: string | string[] | undefined, name: string): { value: string; attrs: Map<string, string> } | null {
  const lines = (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).flatMap((l) => l.split('\n'));
  const line = lines.find((l) => l.startsWith(`${name}=`));
  if (!line) return null;
  const [pair, ...rest] = line.split(';').map((x) => x.trim());
  return { value: pair!.slice(name.length + 1), attrs: new Map(rest.map((a) => [a.split('=')[0]!.toLowerCase(), a.includes('=') ? a.slice(a.indexOf('=') + 1) : 'true'])) };
}

/** Every table's rows, hashed: equal before and after means nothing anywhere was written. */
async function everything(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const value of Object.values(schema) as unknown[]) {
    if (!is(value, PgTable)) continue;
    const name = getTableName(value);
    const [r] = (await (await db()).execute(sql.raw(`select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) as h from "${name}" t`))) as unknown as { h: string }[];
    out[name] = r!.h;
  }
  return out;
}

const signedEvent = (id: string) => {
  const payload = JSON.stringify({ id, object: 'event', type: 'product.created', api_version: '2025-10-29.clover', data: { object: { id: 'prod_x', object: 'product' } } });
  return { payload, header: new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
};

const S3_ENV = {
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://bucket-production-a1b2.up.railway.app',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
  S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
  S3_BUCKET: 'ai-lms.production',
} as const;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  at(NOW);
  await resetDatabase(seedForDatabase('live'));
  // The seed has no Admin; masquerade is the Owner's and the Admins'.
  await (await db()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  for (const [k, v] of Object.entries(S3_ENV)) process.env[k] = v;
  resetS3();
  app = await build({ logger: false, offer: { config: { ...readOfferConfig(), stripeWebhookSecret: WEBHOOK_SECRET }, verify: stripeVerifier(), stripe: null } });
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  for (const k of Object.keys(S3_ENV)) delete process.env[k];
  resetS3();
});

describe('Start (spec § 6) @console', () => {
  it('mints the learner’s session, the row and one audit row, and swaps the cookies', async () => {
    const { browser, staffSession, res } = await masquerade('u_alex', 'st_admin', { startedFrom: '/admin/users/u_alex' });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as { session: Record<string, unknown>; serverNow: number; redirect: string };
    expect(body.serverNow).toBe(NOW);
    expect(body.redirect).toBe('/');
    expect(body.session).toMatchObject({
      target: { id: 'u_alex', name: 'Alex Morgan', teamName: 'Northline Realty Team' },
      staff: { id: 'st_admin', name: 'Dana Reyes' },
      reason: REASON,
      startedAt: NOW,
      expiresAt: NOW + 15 * MIN,
      hardExpiresAt: NOW + 60 * MIN,
      extendCount: 0,
      canExtend: true,
      startedFrom: '/admin/users/u_alex',
    });

    const [row] = await rowsOf();
    expect(row).toMatchObject({ staffUserId: 'st_admin', targetUserId: 'u_alex', staffAuthSessionId: staffSession, endedAt: null, endReason: null, extendCount: 0 });
    const [imp] = await (await db()).select().from(authSessions).where(eq(authSessions.id, row!.authSessionId));
    expect(imp).toMatchObject({ userId: 'u_alex', impersonating: 'st_admin', remember: false });
    expect(imp!.expiresAt.getTime()).toBe(NOW + 60 * MIN);

    // `ai_sid` is now the learner's session; `ai_msq` names the row. Both signed, httpOnly, Lax, expiring at the hard stop.
    for (const name of [SESSION_COOKIE, MASQUERADE_COOKIE]) {
      const line = cookieLine(res.headers['set-cookie'], name)!;
      expect(line, name).not.toBeNull();
      expect(line.attrs.get('httponly'), name).toBe('true');
      expect(line.attrs.get('samesite'), name).toBe('Lax');
      expect(line.attrs.get('path'), name).toBe('/');
      expect(Date.parse(line.attrs.get('expires')!), name).toBe(NOW + 60 * MIN);
      expect(app.unsignCookie(decodeURIComponent(line.value))).toMatchObject({ valid: true });
    }
    expect(app.unsignCookie(decodeURIComponent(cookieLine(res.headers['set-cookie'], SESSION_COOKIE)!.value)).value).toBe(row!.authSessionId);
    expect(app.unsignCookie(decodeURIComponent(cookieLine(res.headers['set-cookie'], MASQUERADE_COOKIE)!.value)).value).toBe(row!.id);
    // The staff session id never leaves the server.
    expect(JSON.stringify(res.headers) + res.body).not.toContain(staffSession);

    const rows = await audits();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'masquerade.start', outcome: 'ok', actorSource: 'staff', actorUserId: 'st_admin', actorRole: 'Admin', masqueradeSessionId: row!.id, targetType: 'user', targetId: 'u_alex', targetLabel: 'Alex Morgan', reason: REASON });

    // The browser is now the learner, look-only.
    const me = await browser.send('GET', '/api/me');
    expect(me.json().viewer.actor).toEqual({ kind: 'learner', userId: 'u_alex' });
    const current = await browser.send('GET', MASQUERADE_PATHS.current);
    expect(current.statusCode).toBe(200);
    expect(current.json()).toMatchObject({ serverNow: NOW, session: { id: row!.id, target: { id: 'u_alex' } } });
    expect(current.body).not.toContain(staffSession);
  });

  it('refuses a staff target (403 masquerade_target_staff, audited) and writes no session', async () => {
    const browser = new Browser(await app.signInAs('st_admin'));
    const res = await browser.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'st4', reason: REASON });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'You can only masquerade as a learner.', code: 'masquerade_target_staff' });
    expect(await rowsOf()).toHaveLength(0);
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.userId, 'st4'))).toHaveLength(0);
    expect(await audits()).toEqual([expect.objectContaining({ action: 'masquerade.start', outcome: 'denied', actorUserId: 'st_admin', targetId: 'st4', after: { code: 'masquerade_target_staff' } })]);
  });

  it('refuses Support (403 console_forbidden, audited) and asks 10 to 500 characters of reason', async () => {
    const support = new Browser(await app.signInAs('st4'));
    const res = await support.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason: REASON });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('console_forbidden');
    expect((await audits()).at(-1)).toMatchObject({ action: 'console.access_denied', actorUserId: 'st4', actorRole: 'Support' });

    const admin = new Browser(await app.signInAs('st_admin'));
    for (const reason of ['too short', '   nine ch   ', 'x'.repeat(501), 42, undefined]) {
      const r = await admin.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason });
      expect(r.statusCode, String(reason)).toBe(422);
      expect(r.json()).toEqual({ error: 'Give a reason of 10 to 500 characters.', code: 'reason_required' });
    }
    expect((await admin.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason: REASON, startedFrom: 'https://evil.example/' })).statusCode).toBe(400);
    expect((await admin.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_nobody', reason: REASON })).statusCode).toBe(404);
    expect(await rowsOf()).toHaveLength(0);
    expect((await admin.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason: 'x'.repeat(500) })).statusCode).toBe(201);
  });

  it('allows one live session per staff member: 409 masquerade_active, and the index says so too', async () => {
    const first = await masquerade('u_jamie');
    expect(first.res.statusCode).toBe(201);
    // The same Admin, in another browser.
    const other = new Browser(await app.signInAs('st_admin'));
    const again = await other.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_rosa', reason: REASON });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({ error: 'Exit the current masquerade session first.', code: 'masquerade_active' });
    expect((await audits()).at(-1)).toMatchObject({ action: 'masquerade.start', outcome: 'failed', after: { code: 'masquerade_active' } });
    expect(await rowsOf()).toHaveLength(1);
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.userId, 'u_rosa'))).toHaveLength(0);

    // The partial unique index, on its own: a second live row for one staff member cannot exist.
    const [row] = await rowsOf();
    const insert = (await db()).insert(masqueradeSessions).values({ ...row!, id: 'mq_second', authSessionId: 's_other', targetUserId: 'u_rosa' });
    await expect(insert).rejects.toMatchObject({ cause: { code: '23505' } });
    // An ended row is not counted.
    await (await db()).insert(masqueradeSessions).values({ ...row!, id: 'mq_ended', authSessionId: 's_old', endedAt: NOW, endReason: 'exit' });
  });

  it('lets an expired, unswept session make way for a new one', async () => {
    const first = await masquerade('u_jamie');
    at(NOW + 16 * MIN);
    const other = new Browser(await app.signInAs('st_admin'));
    const again = await other.send('POST', MASQUERADE_PATHS.start, { targetUserId: 'u_rosa', reason: REASON });
    expect(again.statusCode).toBe(201);
    const rows = await rowsOf();
    expect(rows.find((r) => r.targetUserId === 'u_jamie')).toMatchObject({ endReason: 'expired', endedAt: NOW + 16 * MIN });
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.userId, 'u_jamie'))).toHaveLength(0);
    // The old browser's next request learns it is over.
    expect((await first.browser.send('GET', '/api/snapshot')).statusCode).toBe(409);
  });

  it('answers 403 masquerade_disabled while the flag is off (the seam defaults on)', async () => {
    expect(await masqueradeEnabled()).toBe(true);
    // 3b: `GET /api/console/me` says so too, so the entry points can be drawn disabled.
    const on = new Browser(await app.signInAs('st_admin'));
    expect((await on.send('GET', CONSOLE_PATHS.me)).json()).toMatchObject({ role: 'Admin', masqueradeEnabled: true });
    await app.close();
    app = await build({ logger: false, console: { masqueradeEnabled: async () => false } });
    const off = new Browser(await app.signInAs('st_admin'));
    expect((await off.send('GET', CONSOLE_PATHS.me)).json()).toMatchObject({ role: 'Admin', masqueradeEnabled: false });
    const res = (await masquerade('u_jamie')).res;
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Masquerade is turned off.', code: 'masquerade_disabled' });
    expect(await rowsOf()).toHaveLength(0);
    expect((await audits()).at(-1)).toMatchObject({ action: 'masquerade.start', outcome: 'denied', after: { code: 'masquerade_disabled' } });
  });
});

describe('Extend and the 60-minute cap (D7) @console', () => {
  it('adds 15 minutes per Extend with a new reason, audited before and after, and stops at 60', async () => {
    const { browser } = await masquerade();
    const [row] = await rowsOf();
    const reasons = ['Still checking the Week 2 order.', 'Waiting on the replay to load.', 'One more look at Session 2.'];
    for (const [i, reason] of reasons.entries()) {
      at(NOW + (i + 1) * 5 * MIN);
      const res = await browser.send('POST', MASQUERADE_PATHS.extend, { reason });
      expect(res.statusCode, res.body).toBe(200);
      const expires = Math.min(NOW + (i + 2) * 15 * MIN, NOW + 60 * MIN);
      expect(res.json().session).toMatchObject({ expiresAt: expires, extendCount: i + 1, reason, canExtend: i < 2 });
      expect((await audits()).at(-1)).toMatchObject({
        action: 'masquerade.extend',
        outcome: 'ok',
        actorUserId: 'st_admin',
        masqueradeSessionId: row!.id,
        targetId: 'u_jamie',
        reason,
        before: { expiresAt: NOW + (i + 1) * 15 * MIN, extendCount: i },
        after: { expiresAt: expires, extendCount: i + 1 },
      });
    }
    // At the cap: 409, and `current` says Extend is off.
    const capped = await browser.send('POST', MASQUERADE_PATHS.extend, { reason: 'Just five more minutes.' });
    expect(capped.statusCode).toBe(409);
    expect(capped.json()).toEqual({ error: 'This session can’t go past 60 minutes.', code: 'masquerade_max_reached' });
    expect((await audits()).at(-1)).toMatchObject({ action: 'masquerade.extend', outcome: 'failed', after: { code: 'masquerade_max_reached' } });
    expect((await browser.send('GET', MASQUERADE_PATHS.current)).json().session).toMatchObject({ canExtend: false, expiresAt: NOW + 60 * MIN });

    // A reason is required every time.
    expect((await browser.send('POST', MASQUERADE_PATHS.extend, { reason: 'short' })).statusCode).toBe(422);

    // Live to the last millisecond; at the hard stop the session is gone and the answer is 409, not
    // 401. Both cookies expire then too, so nothing is put back: a browser still sending them is told
    // to sign in.
    at(NOW + 60 * MIN - 1);
    expect((await browser.send('GET', '/api/me')).statusCode).toBe(200);
    at(NOW + 60 * MIN);
    const over = await browser.send('GET', '/api/me');
    expect(over.statusCode).toBe(409);
    expect(over.json()).toMatchObject({ code: 'masquerade_ended', redirect: '/sign-in' });
    expect(cookieLine(over.headers['set-cookie'], SESSION_COOKIE)!.value).toBe('');
    expect((await rowsOf())[0]).toMatchObject({ endReason: 'expired' });
  });

  it('re-checks the STAFF member’s capability: an Admin demoted mid-session cannot Extend', async () => {
    const { browser } = await masquerade();
    await (await db()).update(users).set({ staffRole: 'Support' }).where(eq(users.id, 'st_admin'));
    const res = await browser.send('POST', MASQUERADE_PATHS.extend, { reason: 'Still checking the Week 2 order.' });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('console_forbidden');
    expect((await audits()).at(-1)).toMatchObject({ action: 'console.access_denied', outcome: 'denied', actorUserId: 'st_admin', actorRole: 'Support', masqueradeSessionId: (await rowsOf())[0]!.id });
    // Exit still works: it needs no capability.
    expect((await browser.send('POST', MASQUERADE_PATHS.exit)).statusCode).toBe(200);
  });
});

describe('Exit and Sign Out @console', () => {
  it('ends the row, deletes the learner’s session and puts the staff session back', async () => {
    const { browser, staffSession } = await masquerade('u_jamie', 'st_admin', { startedFrom: '/admin/users/u_jamie' });
    const [row] = await rowsOf();
    at(NOW + 6 * MIN);
    const res = await browser.send('POST', MASQUERADE_PATHS.exit);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, redirect: '/admin/users/u_jamie' });
    expect(app.unsignCookie(decodeURIComponent(cookieLine(res.headers['set-cookie'], SESSION_COOKIE)!.value)).value).toBe(staffSession);
    expect(cookieLine(res.headers['set-cookie'], MASQUERADE_COOKIE)!.value).toBe('');
    expect(browser.jar.has(MASQUERADE_COOKIE)).toBe(false);
    expect((await rowsOf())[0]).toMatchObject({ endedAt: NOW + 6 * MIN, endReason: 'exit' });
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.id, row!.authSessionId))).toHaveLength(0);
    expect((await audits()).at(-1)).toMatchObject({ action: 'masquerade.exit', outcome: 'ok', actorUserId: 'st_admin', masqueradeSessionId: row!.id, targetId: 'u_jamie', after: { endReason: 'exit', minutes: 6 } });
    expect(res.body).not.toContain(staffSession);
    // Staff again.
    expect((await browser.send('GET', '/api/me')).json().viewer.actor).toEqual({ kind: 'staff', staffId: 'st_admin' });
  });

  it('clears ai_sid and sends the browser to sign in when the staff session is gone', async () => {
    const { browser, staffSession } = await masquerade();
    await (await db()).delete(authSessions).where(eq(authSessions.id, staffSession));
    const res = await browser.send('POST', MASQUERADE_PATHS.exit);
    expect(res.json()).toEqual({ ok: true, redirect: '/sign-in' });
    expect(cookieLine(res.headers['set-cookie'], SESSION_COOKIE)!.value).toBe('');
    expect((await browser.send('GET', '/api/me')).statusCode).toBe(401);
  });

  it('Sign Out is Exit (`signed_out`) and then a full sign-out', async () => {
    const { browser, staffSession } = await masquerade();
    const elsewhere = await app.signInAs('st_admin');
    const [row] = await rowsOf();
    const res = await browser.send('POST', '/api/auth/sign-out');
    expect(res.statusCode).toBe(200);
    expect((await rowsOf())[0]).toMatchObject({ endReason: 'signed_out' });
    const sessions = await (await db()).select().from(authSessions);
    expect(sessions.map((s) => s.id)).not.toContain(row!.authSessionId);
    expect(sessions.map((s) => s.id)).not.toContain(staffSession);
    expect(browser.jar.size).toBe(0);
    expect((await audits()).at(-1)).toMatchObject({ action: 'masquerade.signed_out', actorUserId: 'st_admin', masqueradeSessionId: row!.id });
    // Another browser's session is that browser's.
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: elsewhere } })).statusCode).toBe(200);
  });
});

describe('Lazy expiry and the sweep (spec § 6 rule 8) @console', () => {
  it('answers 409 masquerade_ended with the staff cookie restored, once expired', async () => {
    const { browser, staffSession } = await masquerade('u_jamie', 'st_admin', { startedFrom: '/admin/workspaces/northline' });
    const [row] = await rowsOf();
    at(NOW + 15 * MIN - 1);
    expect((await browser.send('GET', '/api/snapshot')).statusCode).toBe(200);
    at(NOW + 15 * MIN);
    const res = await browser.send('GET', '/api/snapshot');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'This masquerade session has ended.', code: 'masquerade_ended', redirect: '/admin/workspaces/northline' });
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(app.unsignCookie(decodeURIComponent(cookieLine(res.headers['set-cookie'], SESSION_COOKIE)!.value)).value).toBe(staffSession);
    expect(browser.jar.has(MASQUERADE_COOKIE)).toBe(false);
    expect((await rowsOf())[0]).toMatchObject({ endReason: 'expired', endedAt: NOW + 15 * MIN });
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.id, row!.authSessionId))).toHaveLength(0);
    const expire = (await audits()).filter((a) => a.action === 'masquerade.expire');
    expect(expire).toEqual([expect.objectContaining({ actorSource: 'system', masqueradeSessionId: row!.id, targetId: 'u_jamie', after: expect.objectContaining({ endReason: 'expired', by: 'request' }) })]);
    // Staff again, from the same browser.
    expect((await browser.send('GET', '/api/me')).json().viewer.actor).toEqual({ kind: 'staff', staffId: 'st_admin' });
  });

  it('the sweep ends what has expired, deletes its session and audits as the system, once', async () => {
    const { browser } = await masquerade();
    const [row] = await rowsOf();
    expect(await sweepMasquerades(await db(), NOW + 15 * MIN - 1)).toBe(0);
    expect(await sweepMasquerades(await db(), NOW + 15 * MIN)).toBe(1);
    expect(await sweepMasquerades(await db(), NOW + 20 * MIN)).toBe(0);
    expect((await rowsOf())[0]).toMatchObject({ endReason: 'expired', endedAt: NOW + 15 * MIN });
    expect(await (await db()).select().from(authSessions).where(eq(authSessions.id, row!.authSessionId))).toHaveLength(0);
    expect((await audits()).filter((a) => a.action === 'masquerade.expire')).toEqual([
      expect.objectContaining({ actorSource: 'system', actorUserId: null, masqueradeSessionId: row!.id, ip: null, after: expect.objectContaining({ by: 'sweep' }) }),
    ]);
    // The impersonation cookie alone, replayed: the 409, and never the staff member's session.
    at(NOW + 16 * MIN);
    const replay = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: `${SESSION_COOKIE}=${browser.jar.get(SESSION_COOKIE)!}` } });
    expect(replay.statusCode).toBe(409);
    expect(replay.json().redirect).toBe('/sign-in');
    expect(cookieLine(replay.headers['set-cookie'], SESSION_COOKIE)!.value).toBe('');
    // The swept browser's own next request is the 409 with the staff session back, and no second audit row.
    const res = await browser.send('GET', '/api/me');
    expect(res.statusCode).toBe(409);
    expect((await audits()).filter((a) => a.action === 'masquerade.expire')).toHaveLength(1);
    expect((await browser.send('GET', '/api/me')).statusCode).toBe(200);
  });

  it('runs once per scheduler tick, in its own try/catch', async () => {
    await masquerade();
    at(NOW + 15 * MIN);
    const lines: string[] = [];
    const log = { info: (_: unknown, m: string) => void lines.push(m), warn: () => {}, error: (_: unknown, m: string) => void lines.push(`error: ${m}`) };
    const scheduler = startScheduler({ intervalMs: 3_600_000, signals: [], log });
    try {
      await scheduler.tick();
      expect((await rowsOf())[0]).toMatchObject({ endReason: 'expired' });
      expect(lines).toContain('masquerade sweep');
      expect(lines.filter((l) => l.startsWith('error'))).toEqual([]);
    } finally {
      await scheduler.stop();
    }
  });
});

describe('Look-only: the write block (D1) and the paused Console (D2) @console', () => {
  it('refuses a learner write with 403 masquerade_blocked, audited with the staff member as actor', async () => {
    const { browser } = await masquerade();
    const [row] = await rowsOf();
    const before = await (await db()).select().from(progress);
    const res = await browser.send('POST', '/api/mutate/toggleStep', { moduleId: 'sales', stepId: 'c4' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'Blocked while masquerading. Exit to continue.', code: 'masquerade_blocked' });
    expect(await (await db()).select().from(progress)).toEqual(before);
    expect((await audits()).at(-1)).toMatchObject({
      action: 'masquerade.blocked_action',
      outcome: 'blocked',
      actorSource: 'staff',
      actorUserId: 'st_admin',
      actorRole: 'Admin',
      masqueradeSessionId: row!.id,
      targetType: 'user',
      targetId: 'u_jamie',
      after: { tried: 'POST /api/mutate/:name', path: '/api/mutate/toggleStep' },
    });

    // `requireSession` holds the same rule without `ai_msq`: one refusal, one row.
    browser.jar.delete(MASQUERADE_COOKIE);
    const count = (await audits()).length;
    const again = await browser.send('PATCH', '/api/me/prefs', { theme: 'dark' });
    expect(again.statusCode).toBe(403);
    expect(again.json().code).toBe('masquerade_blocked');
    expect(await audits()).toHaveLength(count + 1);
  });

  it('refuses the audited Build actions too (D-172), with no write and no row of their own', async () => {
    const { browser } = await masquerade();
    const before = await (await db()).select().from(schema.modules);
    const n = (await audits()).length;
    const res = await browser.send('POST', '/api/admin/actions/duplicateModule', { id: 'sales' });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('masquerade_blocked');
    expect(await (await db()).select().from(schema.modules)).toEqual(before);
    const rows = await audits();
    expect(rows).toHaveLength(n + 1);
    expect(rows.at(-1)).toMatchObject({ action: 'masquerade.blocked_action', after: { tried: 'POST /api/admin/actions/:name' } });
  });

  it('refuses public writes too: the retired checkout and the waitlist', async () => {
    const { browser } = await masquerade();
    for (const url of ['/api/checkout', '/api/ai101/waitlist', '/api/offer/waitlist', '/api/auth/request']) {
      const res = await browser.send('POST', url, { email: 'jamie@example.com' });
      expect(res.statusCode, url).toBe(403);
      expect(res.json().code, url).toBe('masquerade_blocked');
    }
    // The same checkout, outside a masquerade, is its own 410, unchanged.
    expect((await app.inject({ method: 'POST', url: '/api/checkout', headers: { 'content-type': 'application/json' }, payload: {} })).statusCode).toBe(410);
  });

  it('leaves server-to-server webhooks alone', async () => {
    await masquerade();
    const { payload, header } = signedEvent('evt_masq_1');
    const res = await app.inject({ method: 'POST', url: '/api/stripe/webhook', payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
    expect((await (await db()).select().from(stripeEvents)).map((e) => e.id)).toEqual(['evt_masq_1']);
    expect((await audits()).filter((a) => a.action === 'masquerade.blocked_action')).toEqual([]);
  });

  it('pauses the Console: every route but current, Extend and Exit is 403 masquerade_blocked', async () => {
    const { browser } = await masquerade();
    const allowed = new Set<string>([MASQUERADE_PATHS.current, MASQUERADE_PATHS.extend, MASQUERADE_PATHS.exit]);
    const probes: { method: 'GET' | 'POST'; url: string }[] = [
      { method: 'GET', url: CONSOLE_PATHS.me },
      { method: 'GET', url: CONSOLE_PATHS.audit },
      { method: 'POST', url: CONSOLE_PATHS.auditExport },
      { method: 'GET', url: CONSOLE_PATHS.roles },
      // D-160 R2-3b's two-step Roles change, a write: blocked too.
      { method: 'POST', url: CONSOLE_PATHS.rolesPreview },
      { method: 'POST', url: CONSOLE_PATHS.roles },
      { method: 'GET', url: CONSOLE_PATHS.workspaces },
      { method: 'GET', url: '/api/console/workspaces/northline' },
      { method: 'GET', url: CONSOLE_PATHS.users },
      { method: 'GET', url: '/api/console/users/u_jamie' },
      { method: 'POST', url: '/api/console/users/u_jamie/password-reset' },
      { method: 'POST', url: CONSOLE_PATHS.usersExport },
      { method: 'GET', url: `${CONSOLE_PATHS.notes}?targetType=workspace&targetId=northline` },
      { method: 'POST', url: CONSOLE_PATHS.notes },
      { method: 'POST', url: '/api/console/notes/1/delete' },
      { method: 'GET', url: `${CONSOLE_PATHS.search}?q=jamie` },
      { method: 'POST', url: CONSOLE_PATHS.masqueradeStart },
      { method: 'GET', url: CONSOLE_PATHS.masqueradeSessions },
      // PR 4 (D-163): Billing's reads are paused too (D2).
      { method: 'GET', url: CONSOLE_PATHS.billingSummary },
      { method: 'GET', url: CONSOLE_PATHS.billingCustomers },
      { method: 'GET', url: CONSOLE_PATHS.billingSubscriptions },
      { method: 'GET', url: CONSOLE_PATHS.billingInvoices },
      { method: 'GET', url: CONSOLE_PATHS.billingFailed },
      { method: 'GET', url: CONSOLE_PATHS.billingRefunds },
      { method: 'GET', url: CONSOLE_PATHS.billingScopes },
      // PR 5 (D-164): the confirmed refund and void, previews included, are writes the block refuses.
      { method: 'POST', url: CONSOLE_PATHS.billingRefundPreview },
      { method: 'POST', url: CONSOLE_PATHS.billingRefund },
      { method: 'POST', url: CONSOLE_PATHS.billingVoidPreview },
      { method: 'POST', url: CONSOLE_PATHS.billingVoid },
      // PR 6 (D-165): API & Webhooks and Scheduled Jobs, reads and writes alike.
      { method: 'GET', url: CONSOLE_PATHS.apiEndpoints },
      { method: 'GET', url: CONSOLE_PATHS.webhooks },
      { method: 'POST', url: CONSOLE_PATHS.ghlRetry },
      { method: 'GET', url: CONSOLE_PATHS.jobs },
      { method: 'POST', url: '/api/console/jobs/session-24h/run' },
      // PR 7 (D-166): the email log and usage.
      { method: 'GET', url: CONSOLE_PATHS.emailLog },
      { method: 'GET', url: '/api/console/email/1' },
      { method: 'POST', url: CONSOLE_PATHS.emailLogExport },
      { method: 'GET', url: CONSOLE_PATHS.usage },
      // PR 8 (D-167): incidents, reads and writes alike.
      { method: 'GET', url: CONSOLE_PATHS.incidents },
      { method: 'POST', url: CONSOLE_PATHS.incidents },
      { method: 'GET', url: CONSOLE_PATHS.incidentSummary },
      { method: 'GET', url: '/api/console/incidents/INC-0001' },
      { method: 'POST', url: '/api/console/incidents/INC-0001/ack' },
      { method: 'POST', url: '/api/console/incidents/INC-0001/resolve' },
      { method: 'POST', url: '/api/console/incidents/INC-0001/notes' },
      // PR 9 (D-168): the Operations pages, the flag flip and Check now.
      { method: 'GET', url: CONSOLE_PATHS.opsEnv },
      { method: 'POST', url: '/api/console/flags/masquerade_enabled' },
      { method: 'GET', url: CONSOLE_PATHS.integrations },
      { method: 'POST', url: '/api/console/integrations/stripe/check' },
      { method: 'GET', url: CONSOLE_PATHS.deploys },
      { method: 'GET', url: CONSOLE_PATHS.dbHealth },
      // D-172's Invite staff and Change role…, two steps: both blocked.
      { method: 'POST', url: CONSOLE_PATHS.staffPreview },
      { method: 'POST', url: CONSOLE_PATHS.staff },
    ];
    // Every Console path is here or allowed.
    const covered = new Set([...probes.map((p) => p.url.split('?')[0]!), ...allowed]);
    for (const path of Object.values(CONSOLE_PATHS)) expect(covered.has(path) || path.includes(':'), path).toBe(true);
    for (const p of probes) {
      const n = (await audits()).length;
      const res = await browser.send(p.method, p.url, {});
      expect(res.statusCode, `${p.method} ${p.url}`).toBe(403);
      expect(res.json().code, p.url).toBe('masquerade_blocked');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(await audits(), p.url).toHaveLength(n + 1);
    }
    // An impersonating session cannot start another (rule 6): the Start above was refused.
    expect(await rowsOf()).toHaveLength(1);
    expect((await browser.send('GET', MASQUERADE_PATHS.current)).statusCode).toBe(200);
  });

  it('refuses Billing’s refund and void (D-164): 403 masquerade_blocked, audited with the staff member, nothing billed', async () => {
    const { browser } = await masquerade();
    const [row] = await rowsOf();
    for (const path of [CONSOLE_PATHS.billingRefundPreview, CONSOLE_PATHS.billingRefund, CONSOLE_PATHS.billingVoidPreview, CONSOLE_PATHS.billingVoid]) {
      const res = await browser.send('POST', path, { invoiceId: 'in_Team', confirmToken: 'x', reason: REASON, typed: 'in_Team' });
      expect(res.statusCode, path).toBe(403);
      expect(res.json()).toEqual({ error: 'Blocked while masquerading. Exit to continue.', code: 'masquerade_blocked' });
      expect((await audits()).at(-1)).toMatchObject({
        action: 'masquerade.blocked_action',
        outcome: 'blocked',
        actorSource: 'staff',
        actorUserId: 'st_admin',
        actorRole: 'Admin',
        masqueradeSessionId: row!.id,
        targetType: 'user',
        targetId: 'u_jamie',
        after: { tried: `POST ${path}`, path },
      });
    }
    // No billing row was ever written: the block runs before the route.
    expect((await audits()).filter((a) => a.action.startsWith('billing.'))).toEqual([]);
  });

  it('blocks the GET handlers that write, and lets the rest read', async () => {
    const { browser } = await masquerade('u_alex');
    expect(MASQUERADE_GET_WRITES.filter((g) => g.handling === 'block').map((g) => g.path)).toEqual([
      '/api/sessions/:id/join',
      '/api/billing/portal',
      '/api/auth/google',
      '/api/auth/google/callback',
    ]);
    for (const url of ['/api/sessions/dec26-s3/join', '/api/billing/portal', '/api/auth/google', '/api/auth/google/callback?code=x&state=y']) {
      for (const method of ['GET', 'HEAD'] as const) {
        const res = await browser.send(method, url);
        expect(res.statusCode, `${method} ${url}`).toBe(403);
      }
    }
    // A download is a read: the presigned 302, and the Vault's counter does not move.
    const [r1] = await (await db()).select().from(resources).where(eq(resources.id, 'r1'));
    const dl = await browser.send('GET', '/api/files/resource/r1');
    expect(dl.statusCode).toBe(302);
    // The counter is the client's mutation, which is a write, and refused.
    expect((await browser.send('POST', '/api/mutate/downloadResource', { id: 'r1' })).statusCode).toBe(403);
    expect((await (await db()).select().from(resources).where(eq(resources.id, 'r1')))[0]!.dl).toBe(r1!.dl);
  });
});

describe('No side effects on the learner (spec § 6 rule 10) @console', () => {
  it('reads write nothing anywhere: no Last Active, no email verification, no download count', async () => {
    const { browser } = await masquerade('u_alex');
    const [alex] = await (await db()).select().from(users).where(eq(users.id, 'u_alex'));
    const before = await everything();
    // This session never rolls and never stamps Last Active (D-145's two writes on a request).
    at(NOW + 14 * MIN);
    for (const url of ['/api/me', '/api/snapshot', '/api/skills', '/api/course', '/api/auth/password', MASQUERADE_PATHS.current, '/api/files/resource/r1', '/api/skill-guides/perfect-week', '/api/offer']) {
      const res = await browser.send('GET', url);
      // Each answers as it would the learner (a 403 here is the route's own, and the guides are 503 with none built).
      expect([200, 302, 403, 503], url).toContain(res.statusCode);
      if (res.statusCode === 403) expect(res.json().code, url).not.toBe('masquerade_blocked');
    }
    expect(await everything()).toEqual(before);
    expect((await (await db()).select().from(users).where(eq(users.id, 'u_alex')))[0]!.last).toBe(alex!.last);
    expect(await (await db()).select().from(emailVerifications).where(eq(emailVerifications.email, alex!.email))).toEqual([]);
  });

  it('never queues the learner’s first sign-in for GHL (a real sign-in still does)', async () => {
    await (await db()).insert(users).values({ id: 'u_new', email: 'new.agent@example.com', name: 'New Agent', kind: 'learner', tier: 'agent', role: 'Agent', status: 'invited' });
    // Everyone already signed in (the seed's active learners) is queued first.
    await enqueueLogins(await db(), NOW);
    await masquerade('u_new');
    expect(await enqueueLogins(await db(), NOW)).toBe(0);
    expect(await (await db()).select().from(ghlLogins).where(eq(ghlLogins.userId, 'u_new'))).toEqual([]);
    // The learner's own session is a sign-in, as before.
    await app.signInAs('u_new');
    expect(await enqueueLogins(await db(), NOW)).toBe(1);
  });
});

describe('The signed cookie @console', () => {
  it('grants nothing forged or unsigned: no block, no session, no Exit', async () => {
    const { browser } = await masquerade();
    const [row] = await rowsOf();
    const jamie = await app.signInAs('u_rosa');
    const signed = browser.jar.get(MASQUERADE_COOKIE)!;
    for (const msq of [row!.id, `${row!.id}.forged-signature`, signed.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))]) {
      const cookie = `${jamie}; ${MASQUERADE_COOKIE}=${msq}`;
      const write = await app.inject({ method: 'PATCH', url: '/api/me/prefs', headers: { cookie, 'content-type': 'application/json' }, payload: { theme: 'dark' } });
      expect(write.statusCode, msq).toBe(200);
      const current = await app.inject({ method: 'GET', url: MASQUERADE_PATHS.current, headers: { cookie } });
      expect(current.json().session, msq).toBeNull();
      const exit = await app.inject({ method: 'POST', url: MASQUERADE_PATHS.exit, headers: { cookie, 'content-type': 'application/json' }, payload: {} });
      expect(exit.statusCode, msq).toBe(409);
    }
    expect((await rowsOf())[0]!.endedAt).toBeNull();
    expect((await audits()).filter((a) => a.action === 'masquerade.blocked_action')).toEqual([]);
  });
});

describe('The history @console', () => {
  it('lists sessions newest first, by cursor, with names', async () => {
    const a = await masquerade('u_jamie');
    await a.browser.send('POST', MASQUERADE_PATHS.exit);
    at(NOW + MIN);
    await masquerade('u_rosa', 'st1');
    const owner = new Browser(await app.signInAs('st1'));
    const page1 = await owner.send('GET', `${MASQUERADE_PATHS.sessions}?limit=1`);
    expect(page1.statusCode).toBe(200);
    const p1 = page1.json() as { rows: Record<string, unknown>[]; nextCursor: string };
    expect(p1.rows).toEqual([expect.objectContaining({ target: { id: 'u_rosa', name: 'Rosa Delgado' }, staff: { id: 'st1', name: 'Casey Lin' }, endedAt: null, startedAt: NOW + MIN })]);
    const p2 = (await owner.send('GET', `${MASQUERADE_PATHS.sessions}?limit=1&cursor=${encodeURIComponent(p1.nextCursor)}`)).json();
    expect(p2.rows).toEqual([expect.objectContaining({ target: { id: 'u_jamie', name: 'Jamie Ortiz' }, endReason: 'exit' })]);
    expect(p2.nextCursor).toBeNull();
    expect((await owner.send('GET', `${MASQUERADE_PATHS.sessions}?cursor=nope`)).statusCode).toBe(400);
  });
});

describe('Fixture mode @console', () => {
  it('registers no masquerade route and no write block', async () => {
    const fixture = await build({ logger: false, fixtureOnly: true });
    try {
      expect((await fixture.inject({ method: 'POST', url: MASQUERADE_PATHS.start, headers: { 'content-type': 'application/json' }, payload: {} })).statusCode).toBe(404);
    } finally {
      await fixture.close();
    }
  });
});
