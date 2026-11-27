// The env sentinel test (D-168, spec §§ 7.13, 11.4, 14): every variable the Operations pages read is
// set to its own sentinel, every Operations route is called (its successes, its refusals and its
// failures, with providers that echo the secret back), and no response body or header, log line,
// console line, error or audit row may contain any sentinel, any four-character slice of one, or its
// length. The shapes are fixed (`console-infra.test.ts`); this proves what is NOT in them.
import { randomBytes } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { invalidateConsoleFlags } from '../src/console/flags';
import { resetDbHealthCache } from '../src/console/infra-routes';
import { resetDeploysCache } from '../src/console/infra-deploys';
import { resetProbes } from '../src/console/infra-integrations';
import { auditLog, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-10T16:30:00Z');

/**
 * A sentinel: letters that no response, log or id here is made of (so a four-character slice can only
 * be found if the value leaked), each of its own length, 1201 and up.
 */
const ALPHABET = 'QXZJqxzj';
const sentinel = (length: number): string => [...randomBytes(length)].map((b) => ALPHABET[b % ALPHABET.length]).join('');

/** Every variable the Operations pages and their readers look at, and the prefix a reader needs to see. */
const SECRET_VARS: [name: string, prefix: string, suffix?: string][] = [
  ['STRIPE_SECRET_KEY', 'rk_live_'],
  ['STRIPE_WEBHOOK_SECRET', 'whsec_'],
  ['RESEND_API_KEY', 're_'],
  // D-263: the Resend webhook's signing secret.
  ['RESEND_WEBHOOK_SECRET', 'whsec_'],
  ['EMAIL_FROM', 'mail-', '@example.com'],
  ['GHL_TOKEN', 'pit-'],
  ['GHL_LOCATION_ID', ''],
  ['GOOGLE_CLIENT_ID', '', '.apps.googleusercontent.com'],
  ['GOOGLE_CLIENT_SECRET', 'GOCSPX-'],
  ['SESSION_SECRET', ''],
  ['S3_ACCESS_KEY_ID', ''],
  ['S3_SECRET_ACCESS_KEY', ''],
  ['S3_BUCKET', 'b-'],
  ['S3_ENDPOINT', 'https://storage.example/'],
  ['S3_REGION', 'r-'],
  ['CONSOLE_GITHUB_TOKEN', 'github_pat_'],
  ['CONSOLE_RAILWAY_TOKEN', ''],
  ['RAILWAY_PROJECT_ID', ''],
  ['RAILWAY_ENVIRONMENT_ID', ''],
  ['RAILWAY_SERVICE_ID', ''],
];
const SENTINELS = SECRET_VARS.map(([name, prefix, suffix], i) => {
  const s = sentinel(1201 + i * 23);
  return { name, s, value: `${prefix}${s}${suffix ?? ''}` };
});
const valueOf = (name: string) => SENTINELS.find((x) => x.name === name)!.value;

const ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  APP_URL: 'https://learn.example.com',
  OFFER_OPEN: 'false',
  ...Object.fromEntries(SENTINELS.map((x) => [x.name, x.value])),
};

let app: App;
const saved: Record<string, string | undefined> = {};
const lines: string[] = [];
const outbound: { url: string; init?: RequestInit }[] = [];

/** Every provider answers badly, and quotes whatever secret it was sent. */
const echoingFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  outbound.push({ url, init });
  const auth = (init?.headers as Record<string, string> | undefined)?.authorization ?? '';
  if (url.includes('api.github.com')) throw new Error(`connect ECONNREFUSED: ${auth}`);
  return new Response(JSON.stringify({ name: 'validation_error', message: `API key is invalid: ${auth}`, errors: [{ message: auth }] }), { status: 401, headers: { 'content-type': 'application/json' } });
};

beforeAll(async () => {
  await testDatabase();
  for (const k of Object.keys(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = ENV[k];
  }
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  await (await testDatabase()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  invalidateConsoleFlags();
  resetProbes();
  resetDeploysCache();
  resetDbHealthCache();
  for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void lines.push(args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')));
  }
  app = await build({
    logger: { level: 'trace', stream: { write: (l: string) => void lines.push(l) } },
    console: {
      infra: {
        env: ENV,
        fetch: echoingFetch,
        stripeScopes: async () => {
          throw new Error(`Invalid API Key provided: ${valueOf('STRIPE_SECRET_KEY')}`);
        },
      },
    },
  });
});
afterEach(async () => {
  await settleEmails();
});
afterAll(async () => {
  await app?.close();
  vi.restoreAllMocks();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  delete process.env.FIXED_NOW;
});

/** Where a sentinel, a four-character slice of one, or its length shows up in `text`; none, we hope. */
function leaks(text: string): string[] {
  const found: string[] = [];
  const clean = text.replace(/"pid":\d+/g, '');
  for (const { name, s } of SENTINELS) {
    for (let i = 0; i + 4 <= s.length; i++) {
      if (clean.includes(s.slice(i, i + 4))) {
        found.push(`${name}: the slice ${JSON.stringify(s.slice(i, i + 4))}`);
        break;
      }
    }
    if (new RegExp(`(?<![0-9.])${s.length}(?![0-9.])`).test(clean)) found.push(`${name}: its length ${s.length}`);
  }
  return found;
}

describe('no secret leaves the server (spec § 11.4) @console', () => {
  it('in any response, header, log line, console line, error or audit row', async () => {
    const owner = await app.signInAs('st1');
    const admin = await app.signInAs('st_admin');
    const post = (url: string, payload: unknown, cookie = owner) => app.inject({ method: 'POST', url, headers: { cookie, 'content-type': 'application/json' }, payload: payload as object });
    const get = (url: string, cookie = owner) => app.inject({ method: 'GET', url, headers: { cookie } });

    const responses = [
      await app.inject({ method: 'GET', url: '/api/health' }),
      await get('/api/console/me'),
      await get('/api/console/env'),
      await get('/api/console/env', admin),
      await get('/api/console/integrations'),
      await post('/api/console/integrations/stripe/check', {}),
      await post('/api/console/integrations/resend/check', {}),
      await post('/api/console/integrations/ghl/check', {}),
      await get('/api/console/deploys'),
      await get('/api/console/db'),
      await post('/api/console/flags/masquerade_enabled', { on: false }),
      await post('/api/console/flags/masquerade_enabled', { on: false, typed: 'masquerade_enabled' }, admin),
      await post('/api/console/flags/masquerade_enabled', { on: false, typed: 'masquerade_enabled' }),
      await post('/api/console/flags/masquerade_enabled', { on: true, typed: 'masquerade_enabled' }),
      await get('/api/console/env', await app.signInAs('st4')),
    ];
    expect(responses.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200, 200, 200, 404, 200, 200, 400, 403, 200, 200, 403]);

    // The pages did read everything: the secrets are present, the providers were asked and refused.
    const env = responses[2]!.json() as { env: { name: string; state: string }[]; modes: { stripe: string } };
    expect(env.env.every((e) => e.state === 'present')).toBe(true);
    expect(env.modes.stripe).toBe('live');
    expect(responses[5]!.json().result.outcome).toBe('unreachable');
    expect(responses[6]!.json().result).toMatchObject({ outcome: 'refused', status: 401 });
    expect(responses[8]!.json().history).toEqual({ state: 'unavailable', source: 'railway' });

    const texts = [
      ...responses.flatMap((r) => [r.body, JSON.stringify(r.headers)]),
      ...lines,
      JSON.stringify(await (await testDatabase()).select().from(auditLog)),
    ];
    expect(lines.length).toBeGreaterThan(0);
    const found = texts.flatMap((t, i) => leaks(t).map((l) => `#${i}: ${l}`));
    expect(found).toEqual([]);

    // A token went only to its own provider, and only in the Authorization header.
    for (const call of outbound) {
      const auth = (call.init?.headers as Record<string, string>).authorization;
      const where = new URL(call.url).host;
      expect(['backboard.railway.com', 'api.github.com', 'api.resend.com'], call.url).toContain(where);
      expect(auth, call.url).toBe(
        `Bearer ${valueOf(where === 'backboard.railway.com' ? 'CONSOLE_RAILWAY_TOKEN' : where === 'api.github.com' ? 'CONSOLE_GITHUB_TOKEN' : 'RESEND_API_KEY')}`,
      );
      expect(leaks(call.url), call.url).toEqual([]);
    }
    expect(outbound.map((c) => new URL(c.url).host).sort()).toEqual(['api.github.com', 'api.resend.com', 'backboard.railway.com']);
  });
});
