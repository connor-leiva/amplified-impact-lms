// The visitor's own IP for the rate limits (`src/lib/client-ip.ts`), after the Utah Life training
// on Nov 12, 2026: on Railway `req.ip` was Railway's proxy, 152.233.39.33, for every request, so
// five sign-in link requests an hour from anyone, anywhere, shut sign-in for everyone. Here many
// visitors come through ONE proxy hop (one socket address), as on Railway, each with its own
// `X-Real-IP`, and each is limited on their own.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { clientIpEvidence, clientIpHeaderFor, clientIpOf } from '../src/lib/client-ip';
import { AUTH_REQUEST_IP_MAX, AUTH_REQUEST_MAX } from '../src/routes/auth';
import { resetOutbox } from '../src/email/transport';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-12T11:48:00-06:00');
/** Railway's proxy, as production's logs showed it for every request. */
const PROXY = '152.233.39.33';

let app: App | null = null;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
});
afterEach(async () => {
  await app?.close();
  app = null;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

/** A request double: headers, the address Fastify worked out, and the socket's peer. */
const req = (headers: Record<string, string | string[]>, ip = PROXY) =>
  ({ headers, ip, socket: { remoteAddress: PROXY } }) as unknown as Parameters<typeof clientIpEvidence>[0];

describe('which header names the visitor', () => {
  it('is Railway’s X-Real-IP on Railway, nothing elsewhere, and CLIENT_IP_HEADER when set', () => {
    expect(clientIpHeaderFor({})).toBeNull();
    expect(clientIpHeaderFor({ RAILWAY_ENVIRONMENT_NAME: 'production' })).toBe('x-real-ip');
    expect(clientIpHeaderFor({ RAILWAY_ENVIRONMENT_ID: 'e1' })).toBe('x-real-ip');
    expect(clientIpHeaderFor({ RAILWAY_PROJECT_ID: 'p1' })).toBe('x-real-ip');
    expect(clientIpHeaderFor({ RAILWAY_ENVIRONMENT_NAME: 'production', CLIENT_IP_HEADER: 'CF-Connecting-IP' })).toBe('cf-connecting-ip');
    expect(clientIpHeaderFor({ RAILWAY_ENVIRONMENT_NAME: 'production', CLIENT_IP_HEADER: 'none' })).toBeNull();
  });

  it('uses the header only when it holds exactly one valid address, else the proxy-resolved `req.ip`', () => {
    expect(clientIpOf(req({ 'x-real-ip': '198.51.100.7' }), 'x-real-ip')).toBe('198.51.100.7');
    expect(clientIpOf(req({ 'x-real-ip': ' 2001:db8::1 ' }), 'x-real-ip')).toBe('2001:db8::1');
    // A list, a name, junk, an empty or repeated header: never trusted, and never the left-most entry.
    expect(clientIpOf(req({ 'x-real-ip': '6.6.6.6, 198.51.100.7' }), 'x-real-ip')).toBe(PROXY);
    expect(clientIpOf(req({ 'x-real-ip': 'evil.example.com' }), 'x-real-ip')).toBe(PROXY);
    expect(clientIpOf(req({ 'x-real-ip': '' }), 'x-real-ip')).toBe(PROXY);
    expect(clientIpOf(req({ 'x-real-ip': ['1.1.1.1', '2.2.2.2'] }), 'x-real-ip')).toBe(PROXY);
    expect(clientIpOf(req({}), 'x-real-ip')).toBe(PROXY);
    // Off Railway nothing in front of the app sets it, so it is not read at all.
    expect(clientIpOf(req({ 'x-real-ip': '198.51.100.7' }), null)).toBe(PROXY);
  });

  it('lays every candidate side by side for the confirmation log line', () => {
    expect(clientIpEvidence(req({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '6.6.6.6, 198.51.100.7' }), 'x-real-ip')).toEqual({
      clientIp: '198.51.100.7',
      header: 'x-real-ip',
      realIp: '198.51.100.7',
      forwardedFor: '6.6.6.6, 198.51.100.7',
      proxyIp: PROXY,
      socket: PROXY,
    });
  });
});

/** POST from a visitor behind the one proxy hop. `realIp` undefined: a request with no header. */
const from = (url: string, realIp: string | undefined, email: string, extra: Record<string, string> = {}) =>
  app!.inject({
    method: 'POST',
    url,
    payload: { email },
    remoteAddress: PROXY,
    headers: { ...(realIp === undefined ? {} : { 'x-real-ip': realIp }), ...extra },
  });

describe.each([['/api/auth/request'], ['/api/auth/password/forgot']])('%s through one proxy hop', (url) => {
  it(`limits each visitor on their own: ${AUTH_REQUEST_IP_MAX} an hour per IP, ${AUTH_REQUEST_MAX} per email`, async () => {
    expect([AUTH_REQUEST_IP_MAX, AUTH_REQUEST_MAX]).toEqual([30, 5]);
    app = await build({ logger: false, clientIpHeader: 'x-real-ip' });

    // Visitor A works through thirty addresses: all answered, then the thirty-first is limited.
    const a: number[] = [];
    for (let i = 0; i <= AUTH_REQUEST_IP_MAX; i++) a.push((await from(url, '198.51.100.1', `agent${i}@northlinerealty.com`)).statusCode);
    expect(a.slice(0, AUTH_REQUEST_IP_MAX).every((c) => c === 200)).toBe(true);
    expect(a[AUTH_REQUEST_IP_MAX]).toBe(429);

    // Ten more visitors through the SAME proxy socket are untouched by A's limit.
    for (let v = 2; v <= 11; v++) expect((await from(url, `198.51.100.${v}`, `visitor${v}@northlinerealty.com`)).statusCode).toBe(200);

    // A visitor can't escape their bucket by writing a left-most X-Forwarded-For entry.
    const spoofed = await from(url, '198.51.100.1', 'fresh@northlinerealty.com', { 'x-forwarded-for': '203.0.113.99, 198.51.100.1' });
    expect(spoofed.statusCode).toBe(429);
  });

  it('keeps five an hour per email, whichever addresses ask', async () => {
    app = await build({ logger: false, clientIpHeader: 'x-real-ip' });
    const codes: number[] = [];
    for (let i = 1; i <= AUTH_REQUEST_MAX + 1; i++) codes.push((await from(url, `198.51.100.${i}`, 'same@northlinerealty.com')).statusCode);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('without the header every visitor shares the proxy’s one bucket: what production did', async () => {
    app = await build({ logger: false, clientIpHeader: null });
    for (let i = 0; i < AUTH_REQUEST_IP_MAX; i++) expect((await from(url, `198.51.100.${i + 1}`, `agent${i}@northlinerealty.com`)).statusCode).toBe(200);
    // A different visitor, who never asked before, is refused: the limit is the proxy's, not theirs.
    expect((await from(url, '203.0.113.50', 'first-try@northlinerealty.com')).statusCode).toBe(429);
  });
});

describe('the password sign-in limit, through one proxy hop', () => {
  it('is per visitor too', async () => {
    app = await build({ logger: false, clientIpHeader: 'x-real-ip' });
    const login = (realIp: string, i: number) =>
      app!.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: `nobody${i}@northlinerealty.com`, password: 'not-the-password' },
        remoteAddress: PROXY,
        headers: { 'x-real-ip': realIp, origin: 'http://localhost' },
      });
    const a: number[] = [];
    for (let i = 0; i <= 30; i++) a.push((await login('198.51.100.1', i)).statusCode);
    expect(a.at(-1)).toBe(429);
    expect((await login('198.51.100.2', 99)).statusCode).toBe(400);
  });
});

describe('the confirmation log line', () => {
  it('logs every candidate address for an auth request, and never the email', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, done) {
        lines.push(String(chunk));
        done();
      },
    });
    app = await build({ logger: { level: 'info', stream }, clientIpHeader: 'x-real-ip' });
    await from('/api/auth/request', '198.51.100.7', 'private.person@northlinerealty.com', { 'x-forwarded-for': '198.51.100.7' });
    const line = lines.map((l) => JSON.parse(l) as Record<string, unknown>).find((l) => l.msg === 'auth request client ip');
    expect(line?.clientIp).toEqual({
      clientIp: '198.51.100.7',
      header: 'x-real-ip',
      realIp: '198.51.100.7',
      forwardedFor: '198.51.100.7',
      proxyIp: '198.51.100.7',
      socket: PROXY,
    });
    expect(lines.join('\n')).not.toContain('private.person');
  });
});
