// GET /api/events — phase 07 § 7.6's Server-Sent Events stream.
//
//   "`/api/events` is a Server-Sent Events stream. Each process keeps the set of connected clients
//    and broadcasts `changed` (no payload) after each commit, and clients refetch their scoped
//    snapshot."
//
// `apps/web/src/data/http.test.ts` pins the client half, and every assertion in it is a
// requirement here: the URL is `/api/events`, the event name is exactly `changed`, one stream
// serves however many screens subscribe, and a runtime that will not give the page an
// `EventSource` must still render. That last one is why this route may be unavailable without
// breaking anything — the repository falls back to refetching after its own mutations.
//
// ------------------------------------------------------------------------------------------------
// WHY THE RESPONSE IS HIJACKED
// ------------------------------------------------------------------------------------------------
// Fastify's reply lifecycle is built around one payload: serialize, run `onSend`, write, end. An
// SSE response is the opposite — headers now, bytes for the next thirty minutes, no end — so the
// handler calls `reply.hijack()` and writes to `reply.raw` itself. The cost is that `onSend` hooks
// do not run, which for this route means helmet's headers are not applied; they are security
// headers for a DOCUMENT and this response is never one, so nothing is lost. The headers that do
// matter are written explicitly below.
//
// ------------------------------------------------------------------------------------------------
// WHY THIS ROUTE DOES NOT REQUIRE A SESSION
// ------------------------------------------------------------------------------------------------
// Gate 7: "An unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*` and
// `/api/events` returns 401." The exemption is deliberate and it is safe because the stream carries
// NO DATA: the only thing that ever goes down it is the word `changed`, which tells a listener that
// somebody, somewhere, wrote something. A client who learns that and then calls `/api/snapshot`
// gets a 401. The alternative — 401 on the stream — would mean the browser's own `EventSource`
// retry loop hammers the endpoint for every signed-out tab, because `EventSource` reconnects on
// error and cannot be told not to.
//
// What an open stream does cost is a socket, which is why the global 100/minute rate limit covers
// this route like any other and why `MAX_CLIENTS` exists.
//
// ------------------------------------------------------------------------------------------------
// THE DRAIN (§ 9.4: "Handle SIGTERM gracefully (close Fastify, drain SSE) so redeploys don't drop
// requests") — AND WHY IT IS ON `preClose` AND NOT `onClose`
// ------------------------------------------------------------------------------------------------
// An SSE response never finishes on its own, so something has to end it or `fastify.close()` waits
// forever: a redeploy hangs until Railway's kill timeout and every in-flight request dies with it.
//
// `onClose` CANNOT be that something, and this was measured rather than reasoned about. Fastify's
// close sequence stops the listener, waits for the active connections to finish, and only THEN
// runs `onClose`. An SSE stream is an active connection, so the wait never ends and the hook that
// was supposed to end it never runs. It is a deadlock, and it showed up as a 60-second hook
// timeout in `test/routes.test.ts` before the hook was moved.
//
// `preClose` runs BEFORE the server starts closing, which is exactly what Fastify documents it
// for. With the drain there, a plain `app.close()` is enough: a test, a script and `shutdown()`
// all behave the same, and none of them has to remember to drain first.

import { createHash } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import type { FastifyInstance, FastifyRequest } from 'fastify';

/** § 7.6's event name. `http.test.ts` listens for exactly this string. */
export const CHANGED_EVENT = 'changed';

/**
 * A comment line every 25 seconds, so a proxy that closes an idle connection at 30 or 60 does not.
 *
 * SSE comments (`:` followed by text) are specified to be ignored by the client, which makes them
 * the standard keep-alive: no event is dispatched and no listener runs.
 */
export const HEARTBEAT_MS = 25_000;

/**
 * The browser's own reconnect delay, in ms, sent once per stream.
 *
 * `EventSource` reconnects on its own after a drop and defaults to a few seconds. Three is stated
 * explicitly so that a redeploy's drained streams all come back at a predictable moment rather
 * than at whatever each browser picked.
 */
export const RETRY_MS = 3000;

/**
 * How many streams one process will hold open.
 *
 * Each is an open socket and a `ServerResponse`, and the route is unauthenticated (see the header),
 * so without a cap a single client could open as many as the rate limit allows per minute and never
 * close them. Well above any real number of concurrent screens: a cohort is tens of learners with a
 * tab or two each, and the repository opens exactly one stream per page.
 */
export const MAX_CLIENTS = 500;

export interface EventHub {
  /** § 7.6: broadcast `changed` to every connected client. Called after each commit. */
  broadcast(): void;
  /** How many streams are open. For the drain test and for a log line on shutdown. */
  clients(): number;
  /** End every stream. Idempotent; registered as Fastify's `preClose`. */
  close(): void;
}

/**
 * One SSE frame. `data:` with an empty value is deliberate and it is load-bearing.
 *
 * The `EventSource` parsing algorithm discards an event whose data buffer is EMPTY, and the buffer
 * only becomes non-empty once a `data` field has been seen — so `event: changed` followed by a
 * blank line dispatches nothing at all, and the `changed` listener in `http.ts` would never fire.
 * A bare `data:` appends a line feed, which is enough for the event to be delivered, and the final
 * line feed is stripped before dispatch so the listener still sees `''`: § 7.6's "no payload".
 */
const frame = (event: string): string => `event: ${event}\ndata:\n\n`;

/** A short, stable, non-reversible tag for a client, so a log line can correlate without an IP. */
const tagOf = (req: FastifyRequest): string =>
  createHash('sha256').update(`${req.clientIp ?? req.ip}|${req.headers['user-agent'] ?? ''}`).digest('hex').slice(0, 8);

export function registerEventsRoute(app: FastifyInstance): EventHub {
  /**
   * The connected clients. A `Set` of the raw responses, because that is the only handle that
   * survives the hijack — the `FastifyReply` is done with once `hijack()` returns.
   */
  const clients = new Set<ServerResponse>();
  let heartbeat: NodeJS.Timeout | null = null;
  let closed = false;

  /** Write to one client, dropping it if the socket has already gone. */
  function push(res: ServerResponse, chunk: string): void {
    try {
      res.write(chunk);
    } catch {
      // `write` after the peer vanished throws rather than calling back. The 'close' listener will
      // also fire, but removing it here keeps a dead socket out of the next broadcast.
      clients.delete(res);
    }
  }

  const hub: EventHub = {
    broadcast() {
      if (closed) return;
      const chunk = frame(CHANGED_EVENT);
      for (const res of [...clients]) push(res, chunk);
    },
    clients: () => clients.size,
    close() {
      closed = true;
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      for (const res of [...clients]) {
        clients.delete(res);
        try {
          res.end();
        } catch {
          /* already gone; the point was to stop fastify.close() waiting on it */
        }
      }
    },
  };

  app.get('/api/events', async (req, reply) => {
    if (closed || clients.size >= MAX_CLIENTS) {
      // 503 rather than 429: this is capacity, not the caller's fault, and `EventSource` retries
      // either way. The repository's fallback (refetch after each mutation) covers the gap.
      return reply.code(503).send({ error: 'Too many open streams.' });
    }

    const res = reply.raw;
    reply.hijack();

    res.writeHead(200, {
      'content-type': 'text/event-stream',
      // No store at every layer: a cached event stream is an event stream that never updates.
      'cache-control': 'no-cache, no-store, must-revalidate',
      connection: 'keep-alive',
      // nginx (and Railway's proxy) buffer a response by default, which for SSE means the client
      // receives nothing until the buffer fills — i.e. never. This is the documented opt-out.
      'x-accel-buffering': 'no',
    });
    // The retry hint plus a comment, flushed immediately: `EventSource` does not fire `open` until
    // it has received something, and a proxy may not forward headers alone.
    res.write(`retry: ${RETRY_MS}\n\n:connected\n\n`);

    clients.add(res);
    req.log.debug({ client: tagOf(req), open: clients.size }, 'sse client connected');

    // Both fire on a dropped connection depending on how it dropped; `Set.delete` is idempotent.
    const drop = (): void => void clients.delete(res);
    req.raw.on('close', drop);
    res.on('close', drop);

    // One timer for the process, started with the first client. `unref` so it cannot be the reason
    // a `vitest` worker or a CLI script refuses to exit.
    if (!heartbeat) {
      heartbeat = setInterval(() => {
        for (const open of [...clients]) push(open, ':ping\n\n');
      }, HEARTBEAT_MS);
      heartbeat.unref();
    }

    return reply;
  });

  // § 9.4's drain, on `preClose` — see the header for why `onClose` deadlocks here. Registered as
  // a hook rather than left to the signal handler so that `app.close()` from a test, a script or
  // any future shutdown path drains too.
  app.addHook('preClose', async () => {
    hub.close();
  });

  return hub;
}
