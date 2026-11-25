// The bare domain (DECISIONS.md D-133): `amplifiedimpact.io/anything` → 301 to
// `https://www.amplifiedimpact.io/anything`, path and query string kept.
//
// WHY THIS EXISTS. The apex was forwarded by the registrar's forwarding service, which redirects `/`
// to www and answers 404 for every other path: `amplifiedimpact.io/pricing`, `/team-build`, `/free`
// and `/forum?src=qr` all broke, and those are what a QR code or a typed URL carries. The fix is to
// point the apex at this service (docs/LAUNCH.md § 1) and answer it here, where the whole request
// line is known.
//
// THE APEX IS `MARKETING_HOST` WITHOUT ITS `www.`, so production needs no new variable and an
// environment without a marketing host (staging, demo, every test that does not set one) has no
// apex to redirect. The target is always `https://` + the marketing host: the edge terminates TLS,
// so the request's own scheme says nothing, and the site is https only.
//
// 301 FOR GET AND HEAD, 308 FOR ANYTHING ELSE. A browser turns a 301 for a POST into a GET and drops
// the body; 308 keeps the method. Nothing should POST to the apex, but if something does it should
// arrive intact rather than as a GET to a form's page.
//
// FIRST, before every other hook: the apex serves nothing of its own, so it needs no cookie, no
// rate-limit bucket and no security headers, and the marketing host's hook must never see it.

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { App } from '../app';

/** The apex for a marketing host (`www.example.com` → `example.com`), or null when it has no `www.`. */
export function apexOf(marketingHost: string): string | null {
  const host = marketingHost.trim().toLowerCase();
  return host.startsWith('www.') && host.length > 4 ? host.slice(4) : null;
}

/**
 * Where an apex request goes: the marketing host, with the request's path and query exactly as sent.
 * `url` is the request target as Fastify has it (`/pricing?src=qr`). Anything that is not a path
 * (an absolute-form target, which a proxy should never pass on) goes to the homepage instead.
 */
export function apexTarget(marketingHost: string, url: string): string {
  const path = url.startsWith('/') ? url : '/';
  return `https://${marketingHost.trim().toLowerCase()}${path}`;
}

/**
 * The scheme the edge says the client used (`x-forwarded-proto`), or null when the header is absent.
 *
 * Absent is the normal case for a direct connection and for Railway's healthcheck, which hits the
 * container rather than the public edge. Only an explicit `http` is upgraded. `req.protocol` is not
 * read: with no header it is `http` for `inject()`, and treating that as a signal would redirect
 * every test and every internal probe.
 */
export function forwardedProto(header: string | string[] | undefined): string | null {
  if (header === undefined) return null;
  const raw = Array.isArray(header) ? header[0] : header;
  const first = (raw ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first === '' ? null : first;
}

/** Railway's healthcheck. A redirect here fails a deploy that is otherwise healthy. */
export function isHealthcheck(url: string): boolean {
  const path = url.split('?')[0] ?? '/';
  return path === '/api/health' || path.startsWith('/api/health/');
}

export function registerApexRedirect(app: App): void {
  const marketing = (process.env.MARKETING_HOST ?? '').trim().toLowerCase();
  const apex = apexOf(marketing);
  if (marketing === '') return;

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // `Host` can carry a port, and not every client lower-cases it.
    const requested = (req.headers.host ?? '').toLowerCase().split(':')[0];
    const toHttps = (req.method === 'GET' || req.method === 'HEAD' ? 301 : 308) as 301 | 308;

    if (apex && requested === apex) {
      await reply.redirect(apexTarget(marketing, req.url), toHttps);
      return;
    }

    // http://www → https://www, path and query kept. Only when the edge says the client used http.
    // `/api/health` is exempt: a probe that arrives as http with this Host must stay a 200.
    // Other hosts (learn, the railway.app name) are left alone.
    if (forwardedProto(req.headers['x-forwarded-proto']) === 'http' && requested === marketing && !isHealthcheck(req.url)) {
      await reply.redirect(apexTarget(marketing, req.url), toHttps);
    }
  });
}
