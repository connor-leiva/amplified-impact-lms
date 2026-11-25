// The bare domain (D-133): `amplifiedimpact.io/<path>?<query>` → 301 to `https://www.amplifiedimpact.io/<path>?<query>`.
//
// Before this, the apex was the registrar's forwarding service, which sent `/` to www and answered
// 404 for every other path, so a QR code or a typed `amplifiedimpact.io/pricing` broke. These tests
// pin what this service does once the apex points at it (docs/LAUNCH.md § 1).

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from '../src/app';
import type { App } from '../src/app';
import { apexOf, apexTarget, forwardedProto, isHealthcheck } from '../src/routes/apex';

const WWW = 'www.amplifiedimpact.io';
const APEX = 'amplifiedimpact.io';
const LEARN = 'learn.amplifiedimpact.io';

let app: App | null = null;
let saved: string | undefined;

afterEach(async () => {
  await app?.close();
  app = null;
  if (saved === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = saved;
});

/** `MARKETING_HOST` is read in `build()`, so it is set first. */
async function boot(marketingHost: string | undefined): Promise<App> {
  saved = process.env.MARKETING_HOST;
  if (marketingHost === undefined) delete process.env.MARKETING_HOST;
  else process.env.MARKETING_HOST = marketingHost;
  app = await build({ logger: false, fixtureOnly: true, marketingPage: '<!doctype html><title>Home</title>' });
  return app;
}

const at = (a: App, host: string, url: string, method: 'GET' | 'HEAD' | 'POST' = 'GET') =>
  a.inject({ method, url, headers: { host } });

describe('the bare domain (D-133)', () => {
  it('301s every public path to www, keeping the path', async () => {
    const a = await boot(WWW);
    for (const path of ['/', '/pricing', '/team-build', '/teams', '/agents', '/free', '/about', '/insiders', '/library', '/ai101', '/forum', '/terms', '/agreement', '/calendar/builds.ics', '/some/old/link']) {
      const res = await at(a, APEX, path);
      expect([res.statusCode, res.headers.location], path).toEqual([301, `https://${WWW}${path}`]);
    }
  });

  it('keeps the query string exactly, the QR code’s src and a Checkout Session id included', async () => {
    const a = await boot(WWW);
    for (const url of ['/forum?src=qr', '/pricing?src=qr&utm_source=forum', '/offer/welcome?session_id=cs_live_a1B2c3D4e5F6g7H8', '/library?show=free', '/?x=1']) {
      const res = await at(a, APEX, url);
      expect([res.statusCode, res.headers.location], url).toEqual([301, `https://${WWW}${url}`]);
    }
  });

  it('matches the host in any case and with a port', async () => {
    const a = await boot(WWW);
    for (const host of ['AmplifiedImpact.io', 'amplifiedimpact.io:443', 'AMPLIFIEDIMPACT.IO:80']) {
      const res = await at(a, host, '/pricing');
      expect([res.statusCode, res.headers.location], host).toEqual([301, `https://${WWW}/pricing`]);
    }
  });

  it('answers HEAD with a 301 too, and keeps the method for anything else with a 308', async () => {
    const a = await boot(WWW);
    const head = await at(a, APEX, '/pricing', 'HEAD');
    expect([head.statusCode, head.headers.location]).toEqual([301, `https://${WWW}/pricing`]);
    const post = await at(a, APEX, '/api/ai101/waitlist', 'POST');
    expect([post.statusCode, post.headers.location]).toEqual([308, `https://${WWW}/api/ai101/waitlist`]);
  });

  it('runs before everything else: no cookie, no rate-limit bucket, nothing of the page', async () => {
    const a = await boot(WWW);
    const res = await at(a, APEX, '/pricing');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    expect(res.body).not.toContain('<title>Home</title>');
  });

  it('leaves www and learn alone', async () => {
    const a = await boot(WWW);
    const home = await at(a, WWW, '/');
    expect([home.statusCode, home.body]).toEqual([200, '<!doctype html><title>Home</title>']);
    const learn = await at(a, LEARN, '/api/health');
    expect(learn.headers.location).toBeUndefined();
    for (const host of ['wwwamplifiedimpact.io', 'evil-amplifiedimpact.io', 'amplifiedimpact.io.evil.com']) {
      const res = await at(a, host, '/pricing');
      expect(res.headers.location ?? '', host).not.toBe(`https://${WWW}/pricing`);
    }
  });

  it('has no apex to redirect without a www marketing host', async () => {
    for (const host of [undefined, LEARN]) {
      const a = await boot(host);
      const res = await at(a, APEX, '/pricing');
      expect(res.statusCode, String(host)).not.toBe(301);
      await a.close();
      app = null;
    }
  });

  it('works the apex out from MARKETING_HOST, and never builds a link off our host', () => {
    expect(apexOf('www.amplifiedimpact.io')).toBe('amplifiedimpact.io');
    expect(apexOf(' WWW.Amplifiedimpact.IO ')).toBe('amplifiedimpact.io');
    expect([apexOf('learn.amplifiedimpact.io'), apexOf(''), apexOf('www.')]).toEqual([null, null, null]);
    expect(apexTarget(WWW, '/pricing?src=qr')).toBe('https://www.amplifiedimpact.io/pricing?src=qr');
    // An absolute-form target is not a path: it goes to the homepage, never to the other host.
    expect(apexTarget(WWW, 'http://evil.example/x')).toBe('https://www.amplifiedimpact.io/');
    // `//evil.example` stays a path on www.
    expect(apexTarget(WWW, '//evil.example/x').startsWith('https://www.amplifiedimpact.io/')).toBe(true);
  });

  it('301s http on www to https, and leaves https, learn, and the healthcheck alone', async () => {
    const a = await boot(WWW);
    const http = (url: string, host = WWW, method: 'GET' | 'HEAD' | 'POST' = 'GET') =>
      a.inject({ method, url, headers: { host, 'x-forwarded-proto': 'http' } });

    const pricing = await http('/pricing?src=qr');
    expect([pricing.statusCode, pricing.headers.location]).toEqual([301, `https://${WWW}/pricing?src=qr`]);
    const posted = await http('/api/checkout', WWW, 'POST');
    expect([posted.statusCode, posted.headers.location]).toEqual([308, `https://${WWW}/api/checkout`]);
    const health = await http('/api/health');
    expect(health.statusCode).toBe(200);
    expect(health.headers.location).toBeUndefined();

    const secure = await a.inject({ method: 'GET', url: '/', headers: { host: WWW, 'x-forwarded-proto': 'https' } });
    expect(secure.statusCode).toBe(200);
    expect(secure.headers.location).toBeUndefined();

    const learn = await http('/pricing', LEARN);
    expect(learn.headers.location).toBeUndefined();
    const port = await http('/about', `${WWW}:443`);
    expect([port.statusCode, port.headers.location]).toEqual([301, `https://${WWW}/about`]);
  });

  it('reads only an explicit forwarded scheme, and knows the healthcheck', () => {
    expect(forwardedProto(undefined)).toBeNull();
    expect(forwardedProto('')).toBeNull();
    expect(forwardedProto('HTTPS')).toBe('https');
    expect(forwardedProto('http, https')).toBe('http');
    expect(forwardedProto(['https', 'http'])).toBe('https');
    expect(isHealthcheck('/api/health')).toBe(true);
    expect(isHealthcheck('/api/health?x=1')).toBe(true);
    expect(isHealthcheck('/api/health/live')).toBe(true);
    expect(isHealthcheck('/api/healthy')).toBe(false);
  });

  it('lists the bare domain among production’s Railway domains, with learn and www', () => {
    const railway = readFileSync(new URL('../../../.railway/railway.ts', import.meta.url), 'utf8');
    expect(railway).toMatch(/\[`learn\.\$\{DOMAIN\}`, `www\.\$\{DOMAIN\}`, DOMAIN\]/);
    expect(railway).toMatch(/MARKETING_HOST: `www\.\$\{DOMAIN\}`/);
  });
});
