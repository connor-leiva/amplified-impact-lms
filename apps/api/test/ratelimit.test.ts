// § 9.4's global limit, and the one property that decides whether it exists at all.
//
// The limiter is "100 requests per minute per session", so its key is derived from the session
// cookie. If that derivation trusts the RAW cookie, a caller sends a different random `ai_sid` on
// every request, gets a brand-new bucket each time, and the limit is gone — @fastify/rate-limit
// cannot notice, because a key it has not seen is indistinguishable from a new session.
//
// So the test is not "does it rate limit", it is "can an unauthenticated caller escape the bucket
// by inventing cookies". Driven through the real server, not through the key function, because the
// question is about what the plugin actually buckets on.
import { describe, it, expect, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { build, rateLimitKey } from '../src/app';
import type { App } from '../src/app';
import type { FastifyRequest } from 'fastify';

let app: App | null = null;
afterEach(async () => {
  await app?.close();
  app = null;
});

/** A request double carrying a cookie whose signature was never checked. */
const raw = (cookie: string | undefined, ip = '203.0.113.7'): FastifyRequest =>
  ({ cookies: cookie === undefined ? {} : { ai_sid: cookie }, ip }) as unknown as FastifyRequest;

/** The same, but with Fastify's verifier attached — `valid` decides the answer. */
const signed = (cookie: string, valid: boolean, ip = '203.0.113.7'): FastifyRequest =>
  ({
    cookies: { ai_sid: cookie },
    ip,
    unsignCookie: () => ({ valid, value: valid ? cookie : null, renew: false }),
  }) as unknown as FastifyRequest;

describe('§9.4 the global rate limit cannot be escaped by inventing cookies @g7', () => {
  it('buckets an unverifiable cookie with the IP, not with itself @g7', () => {
    // The defect this exists to catch: twenty invented cookies from one address must be ONE bucket.
    const keys = new Set(
      Array.from({ length: 20 }, () => rateLimitKey(signed(randomBytes(24).toString('base64url'), false))),
    );
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe('ip:203.0.113.7');
  });

  it('gives a verified session its own bucket, which is the point of the feature @g7', () => {
    // Two learners behind one office NAT must not share a budget.
    const a = rateLimitKey(signed('session-a', true));
    const b = rateLimitKey(signed('session-b', true));
    expect(a).not.toBe(b);
    expect(a.startsWith('s:')).toBe(true);
    // Never the session id itself: a limiter key reaches the error builder and any store a future
    // deploy swaps in, and a session id is a bearer credential.
    expect(a).not.toContain('session-a');
  });

  it('falls back to the IP when there is no cookie at all @g7', () => {
    expect(rateLimitKey(raw(undefined))).toBe('ip:203.0.113.7');
    expect(rateLimitKey(raw(''))).toBe('ip:203.0.113.7');
  });

  it('does not trust a cookie on a request with no verifier attached @g7', () => {
    // Defensive: `rateLimitKey` is exported and callable outside a request lifecycle. Without
    // `unsignCookie` there is nothing to verify against, so the safe answer is the IP bucket.
    expect(rateLimitKey(raw('looks-like-a-session'))).toBe('ip:203.0.113.7');
  });

  it('a forged cookie buys no more requests than sending none, end to end @g7', async () => {
    app = await build({ fixtureOnly: true });
    await app.ready();

    // /api/health is the only route reachable with no session and no database, which is what makes
    // it the honest probe for a limit that is supposed to apply before authentication.
    const hit = (cookie?: string) =>
      app!.inject({
        method: 'GET',
        url: '/api/health',
        headers: {
          'x-forwarded-for': '198.51.100.22',
          ...(cookie === undefined ? {} : { cookie: `ai_sid=${cookie}` }),
        },
      });

    // Spend the budget with a fresh invented cookie every time. If the key trusted the raw value,
    // every one of these is its own bucket and none of them is ever refused.
    const codes: number[] = [];
    for (let i = 0; i < 105; i++) codes.push((await hit(randomBytes(18).toString('base64url'))).statusCode);

    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
    expect(codes.slice(0, 100).every((c) => c === 200)).toBe(true);
  });
});
