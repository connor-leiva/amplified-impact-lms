// The visitor's own IP address, for the rate limits and the logs (Nov 12, 2026: the Utah Life training).
//
// WHY NOT `req.ip`. On Railway the socket's peer is Railway's internal proxy, and the edge does not
// hand the app an `X-Forwarded-For` chain to walk: in production `req.ip` was 152.233.39.33 for every
// request while Railway's edge log showed each visitor's own address. Every unauthenticated limit
// (sign-in link, Forgot Password, password sign-in) was therefore one bucket for the whole internet,
// and five link requests an hour locked out the room.
//
// WHAT RAILWAY SETS. Its docs (docs.railway.com/networking/public-networking/specs-and-limits,
// "Request Headers") list `X-Real-IP` "for identifying client's remote IP". So on Railway the client
// is that header, used only when it holds exactly one valid IP address: a list, a hostname or
// anything else is ignored and `req.ip` stands, never the left-most (client-written) entry of a
// forwarded chain. Off Railway (tests, a laptop) nothing in front of the app sets the header, so it is
// not trusted unless `CLIENT_IP_HEADER` names it. Each auth request logs the header, the forwarded
// chain and the socket's peer side by side (`clientIpEvidence`), so production can confirm the
// header against Railway's edge log.

import { isIP } from 'node:net';
import type { FastifyRequest } from 'fastify';

/**
 * The header that carries the client's address in this environment, or null for `req.ip` alone.
 * `CLIENT_IP_HEADER` wins (`none` turns it off); otherwise Railway's `x-real-ip` when the process
 * runs on Railway, which sets these variables on every deploy.
 */
export function clientIpHeaderFor(env: NodeJS.ProcessEnv = process.env): string | null {
  const set = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (set) return set === 'none' ? null : set;
  const onRailway = Boolean(env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID);
  return onRailway ? 'x-real-ip' : null;
}

/** The client's address: the header's single valid IP when `header` is set and holds one, else `req.ip`. */
export function clientIpOf(req: Pick<FastifyRequest, 'headers' | 'ip'>, header: string | null): string {
  if (header) {
    const value = req.headers[header];
    if (typeof value === 'string') {
      const ip = value.trim();
      if (isIP(ip) !== 0) return ip;
    }
  }
  return req.ip;
}

/** What one log line shows to confirm which address is the visitor's. No body, no cookie, no email. */
export function clientIpEvidence(req: Pick<FastifyRequest, 'headers' | 'ip' | 'socket'>, header: string | null) {
  const clip = (v: string | string[] | undefined) => (v === undefined ? null : (Array.isArray(v) ? v.join(', ') : v).slice(0, 200));
  return {
    clientIp: clientIpOf(req, header),
    header,
    realIp: clip(req.headers['x-real-ip']),
    forwardedFor: clip(req.headers['x-forwarded-for']),
    proxyIp: req.ip,
    socket: req.socket?.remoteAddress ?? null,
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    /** The visitor's own address (`clientIpOf`), set first thing on every request. */
    clientIp: string;
  }
}
