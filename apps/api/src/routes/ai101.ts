// The public /ai101 page and its December waitlist — the eXpCon 2026 kit page for "Sounds Like You,
// Looks Like You: AI 101 for Agents". DECISIONS.md D-028.
//
//   GET  /ai101                     → the built page, from memory; 304 on a matching ETag
//   GET  /AI101, /ai-101, /ai101/   → 301 to /ai101, query string kept byte for byte
//   POST /api/ai101/waitlist        → JSON: 201 { ok: true } or 400 { error, field }
//                                     a no-JS form: 303 to /ai101#waitlist-joined or #waitlist-error
//
// The page itself is built by `apps/web` (`vite.ai101.config.ts`) into ONE self-contained file,
// `dist/ai101.html`: its stylesheet and its one module script are inlined, and only the fonts are
// separate requests. `server.ts` reads that file once at boot and hands it to `build()`; this file
// never touches the disk, which is what keeps every route here testable through `app.inject` with a
// page string of the test's own choosing.
//
// ================================================================================================
// WHY THE PAGE AND ITS REDIRECTS ARE EXEMPT FROM § 9.4's LIMIT
// ================================================================================================
// § 9.4's global limit is 100 a minute per session, falling back to per IP — and the people opening
// this page are a conference room on venue Wi-Fi, behind one NAT address, scanning the same QR code
// inside the same minute. Under the global limit the 101st attendee would get a 429 instead of the
// prompts, which is the one failure the spec's "loads fast on bad conference Wi-Fi" cannot survive.
//
// Exempting it costs nothing worth limiting: the response is a string already in memory, no
// database is touched, and a repeat visit is a 304 with no body. The redirects are exempt for the
// same reason — someone typing `/AI101` from the slide is the same attendee on the same NAT.
//
// ================================================================================================
// WHY THE WAITLIST IS PUBLIC, AND HAS ITS OWN LIMIT
// ================================================================================================
// Gate 7's rule is "an unauthenticated call to any /api/* route except /api/health, /api/auth/* and
// /api/events returns 401". This route is a documented exception: the spec is explicit that the
// page needs "no login, no account", and the waitlist is how a stranger leaves an address. What
// stands in for the session guard is narrower than a session and is all a public form needs —
//
//   - the same-origin check (`requireSameOrigin`, the half of § 9.4's CSRF rule that applies to a
//     request with no cookie to ride: it stops another site's page posting into this table),
//   - the honeypot, which drops the form-filling bots that do not run the page's script, and
//   - its OWN rate limit, 300 a minute per key, in place of the global 100. The key is the global
//     one (`rateLimitKey`: the session if there is one, else the IP), so the venue NAT is again the
//     case that sizes it: a room filling the form in the same minute must not be refused by a
//     budget meant for one person's tab. 300 is three times the global budget and still stops a
//     single host flooding the table.
//
// `test/authz.test.ts` classifies the route as open and proves it does not answer 401, so the
// exception is a measured property rather than a sentence here.
//
// ================================================================================================
// WHY THE WAITLIST HAS ITS OWN FLAG, AND NOT `fixtureOnly`
// ================================================================================================
// Production runs `VITE_DATA_SOURCE=fixture` WITH a `DATABASE_URL`, so `build()`'s fixture guard is
// on there and every route inside it does not exist. The waitlist needs a database and nothing else
// — no session, no snapshot, no core — so it is registered whenever one is configured, which is
// what `BuildOptions.waitlist` says and what `server.ts` derives from `DATABASE_URL`. The opposite
// environment matters just as much: the demo deploy is fixture mode with NO database, and there the
// route must not exist at all (a 404) rather than exist and throw `DatabaseConfigError` on the first
// sign-up. The page and its redirects need neither, so they are registered in both modes.
//
// ================================================================================================
// WHY THE PAGE SETS `Referrer-Policy: same-origin`
// ================================================================================================
// helmet sets `no-referrer` on every response, and under that policy a browser serializes the
// `Origin` of a plain HTML form POST as the literal string `null` — which `originIsAllowed` rejects,
// on purpose (it is what a sandboxed iframe sends). A visitor whose script failed to load would
// therefore get a 403 for the one action the no-JS fallback exists to keep working. `same-origin`
// sends the real origin to this site and still sends nothing to any other, which is the property
// `no-referrer` was there for. It is set on the page's response only; every other response keeps
// helmet's default.
//
// ================================================================================================
// THE NO-JS PATH: A SCOPED PARSER, AND A 303
// ================================================================================================
// With the script running, the form posts JSON and the page shows the outcome inline. Without it,
// the browser posts `application/x-www-form-urlencoded`, which Fastify has no parser for and which
// this repository has no plugin for (no new dependencies). So the parser is registered INSIDE an
// encapsulated plugin around this one route — `URLSearchParams`, a small body limit — and nowhere
// else: every other route keeps answering 415 to a form post, which is the half of § 9.4's CSRF rule
// that actually closes the hole (`auth/guard.ts` carries that argument). The answer to a form post
// is a 303 back to the page with a fragment the page styles with `:target`, so the visitor lands on
// "You're on the list." or on the form's error line, never on a JSON body.
//
// ================================================================================================
// WHAT IS NEVER LOGGED
// ================================================================================================
// The name and the address. The success line carries the `src` tag and whether it was a duplicate;
// the honeypot line carries nothing. A failed insert is the trap: drizzle wraps a driver error in a
// `DrizzleQueryError` whose MESSAGE is "Failed query: … params: <every bound value>", so letting it
// reach `app.ts`'s error handler would write the visitor's email and name into the 5xx log line.
// The handler catches it and logs the Postgres error code instead.

import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isJsonContentType, JSON_CONTENT_TYPE, requireSameOrigin } from '../auth';
import { getDb } from '../db/client';
import { ai101Waitlist } from '../db/schema';
import { clock, randomIds } from '../lib/clock';
import { SPRINT_ICS, SPRINT_ICS_PATH } from './ai101-calendar';

/** The page's one URL. */
export const AI101_PATH = '/ai101';

/** The spec's redirects: "Redirect `/AI101`, `/ai-101`, and `/ai101/` to `/ai101`." */
export const AI101_ALIASES = ['/AI101', '/ai-101', '/ai101/'] as const;

export const WAITLIST_PATH = '/api/ai101/waitlist';

/**
 * The spec: "Tag every submission with source `expcon-2026-ai101`." A server constant, never read
 * from the request, so a client cannot file itself under a different event.
 */
export const WAITLIST_SOURCE = 'expcon-2026-ai101';

/** The waitlist's own limit, in place of § 9.4's global 100. See the header for the sizing. */
export const WAITLIST_RATE_MAX = 300;
export const WAITLIST_RATE_WINDOW = '1 minute';

/**
 * The largest waitlist body accepted, JSON or form.
 *
 * The form's own `maxlength`s are 80 + 254 + 120 characters, and the worst a browser can make of
 * that is every character a three-byte UTF-8 sequence percent-encoded as nine bytes: about 4 KiB
 * with the field names. 8 KiB holds that with room, and keeps the one unauthenticated POST in the
 * API from being a way to buy the app-wide 1 MiB of parsing per request.
 */
export const WAITLIST_BODY_LIMIT = 8 * 1024;

/** The no-JS form's content type. Parsed by this file's scoped parser and by nothing else. */
export const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';

/** Where a no-JS form post lands. The page styles both fragments with `:target`. */
export const WAITLIST_JOINED_LOCATION = `${AI101_PATH}#waitlist-joined`;
export const WAITLIST_ERROR_LOCATION = `${AI101_PATH}#waitlist-error`;

/**
 * The 400 messages, verbatim from the page's own copy.
 *
 * The script shows `error` under the named field when the server refuses something the client-side
 * check let through, so these are user-facing and must read exactly as the page's own:
 * `apps/web/src/ai101/content.ts` holds `UI.errors.firstName` and `UI.errors.email`, and the
 * brokerage sentence is the build contract's. The API cannot import the web app's source, so this is
 * a second copy — pinned to literals in `test/ai101.test.ts` rather than to this constant, the same
 * arrangement `routes/join.ts` uses for its 409, so the two copies cannot drift together.
 */
export const WAITLIST_ERRORS = {
  firstName: 'Enter your first name.',
  email: 'Enter a valid email address.',
  brokerage: 'Enter a brokerage name under 120 characters.',
} as const;

export type WaitlistField = keyof typeof WAITLIST_ERRORS;

/** The sign-in screen's rule (`apps/web/src/routes/auth/SignIn.tsx`), so the product has one. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** `?src=` is an attribution tag (`qr` from the printed code), kept only as a short slug. */
const SRC = /^[a-z0-9_-]{1,32}$/i;

const FIRST_NAME_MAX = 80;
/** RFC 5321's practical ceiling for a forward-path, and the field's `maxlength`. */
const EMAIL_MAX = 254;
const BROKERAGE_MAX = 120;

/**
 * The body, before validation: every field optional, so a missing one is reported against its field
 * by `validateWaitlist` rather than as a shape error with no field to point at.
 *
 * NOT strict, unlike every schema in `schemas.ts`. Those describe a client and a server that ship
 * together, where an unknown key means drift and the loud answer helps. This one is also the target
 * of a plain HTML form, whose body is whatever the browser serialized — and a visitor whose
 * password manager or translation extension added an input to the form must still land on the list.
 * Unknown keys are dropped. `nullish` for the same reason: `null` for an empty optional field is a
 * reasonable thing for a client to send, and refusing it would be refusing a sign-up over a type.
 */
const text = z.string().nullish();
const waitlistBody = z.object({ firstName: text, email: text, brokerage: text, website: text, src: text });

export type WaitlistInput = z.infer<typeof waitlistBody>;

/** A sign-up that passed, normalized and ready to insert. */
export interface WaitlistEntry {
  firstName: string;
  email: string;
  brokerage: string | null;
  src: string | null;
}

export type WaitlistVerdict =
  | { kind: 'valid'; entry: WaitlistEntry }
  | { kind: 'invalid'; field: WaitlistField; error: string }
  /** The honeypot was filled. Answered exactly as a success; nothing is stored. */
  | { kind: 'spam' };

/**
 * Normalize and check a sign-up. Pure, so the rules are unit-testable without a database.
 *
 * The honeypot is checked FIRST: a bot that filled it gets the success answer whether or not the
 * rest of what it typed is valid, because a 400 would tell it which field to fix. After that, the
 * first failing field in form order wins, which is the field the page focuses.
 *
 * Lengths are UTF-16 code units (`.length`), which is what the inputs' `maxlength` counts, so a
 * value the browser let through is never refused here for its length.
 */
export function validateWaitlist(input: WaitlistInput): WaitlistVerdict {
  if ((input.website ?? '').trim() !== '') return { kind: 'spam' };

  const firstName = (input.firstName ?? '').trim();
  if (firstName === '' || firstName.length > FIRST_NAME_MAX) {
    return { kind: 'invalid', field: 'firstName', error: WAITLIST_ERRORS.firstName };
  }

  // Lower-cased so the unique (email, source) index means "the same person", not "the same
  // keystrokes" — `Pat@Example.com` from a laptop and `pat@example.com` from a phone are one row.
  const email = (input.email ?? '').trim().toLowerCase();
  if (email.length > EMAIL_MAX || !EMAIL.test(email)) {
    return { kind: 'invalid', field: 'email', error: WAITLIST_ERRORS.email };
  }

  const brokerage = (input.brokerage ?? '').trim();
  if (brokerage.length > BROKERAGE_MAX) {
    return { kind: 'invalid', field: 'brokerage', error: WAITLIST_ERRORS.brokerage };
  }

  // Never an error: attribution is the page's business, not the visitor's, and a mangled tag must
  // not cost a sign-up. Anything that is not a short slug is simply not recorded.
  const src = (input.src ?? '').trim();

  return {
    kind: 'valid',
    entry: { firstName, email, brokerage: brokerage === '' ? null : brokerage, src: SRC.test(src) ? src : null },
  };
}

// --- the page ------------------------------------------------------------------------------------

/** A strong ETag over the page's exact bytes. */
export function pageEtag(html: string): string {
  return `"${createHash('sha256').update(html, 'utf8').digest('base64url')}"`;
}

/**
 * Whether an `If-None-Match` header matches `etag`.
 *
 * RFC 9110 § 13.1.2: `If-None-Match` uses the WEAK comparison, so a `W/` prefix on either side is
 * ignored. That is not pedantry here — Railway's edge gzips this response, and a proxy that
 * compresses a body may weaken its strong validator on the way out (nginx does). A strict comparison
 * would then never match, and every revisit would download the whole page again.
 */
export function etagMatches(header: string | undefined, etag: string): boolean {
  if (header === undefined || header.trim() === '') return false;
  const bare = etag.replace(/^W\//, '');
  return header.split(',').some((candidate) => {
    const tag = candidate.trim();
    return tag === '*' || tag.replace(/^W\//, '') === bare;
  });
}

/**
 * `/ai101` plus the request's own query string, exactly as it arrived.
 *
 * Kept verbatim rather than re-serialized so `?src=qr` survives the hop unchanged — the QR code
 * encodes `/ai101?src=qr`, but a visitor who types the slide's `/AI101` and anyone sharing a link
 * with their own tag must arrive with it intact. The target is always this path, so nothing in the
 * query can turn it into an off-site redirect.
 */
export function ai101Location(rawUrl: string): string {
  const q = rawUrl.indexOf('?');
  return q < 0 ? AI101_PATH : `${AI101_PATH}${rawUrl.slice(q)}`;
}

/**
 * `GET /ai101` and the three redirects. Registered in BOTH modes; see the header.
 *
 * `page` is the built HTML, or null before anyone has built it — in which case the route still
 * exists and answers the API's ordinary JSON 404, rather than falling through to the SPA's
 * `index.html` and rendering the portal's not-found screen at a conference attendee.
 */
export function registerAi101Page(app: FastifyInstance, page: string | null): void {
  // Computed once. The page cannot change while the process runs — `server.ts` read it at boot — so
  // a per-request hash would be work with only one possible answer.
  const etag = page === null ? null : pageEtag(page);

  app.get(AI101_PATH, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> => {
    if (page === null || etag === null) return reply.code(404).send({ error: 'Not found' });

    // `no-cache` is "revalidate every time", not "do not store": a revisit costs one conditional
    // request and a bodiless 304, and a corrected prompt is never stuck behind a stale copy.
    reply.header('cache-control', 'no-cache');
    reply.header('etag', etag);
    // Overrides helmet's `no-referrer` for this response only. See the header.
    reply.header('referrer-policy', 'same-origin');

    if (etagMatches(req.headers['if-none-match'], etag)) return reply.code(304).send();
    return reply.code(200).type('text/html; charset=utf-8').send(page);
  });

  for (const alias of AI101_ALIASES) {
    app.get(alias, { config: { rateLimit: false } }, async (req, reply): Promise<FastifyReply> =>
      reply.redirect(ai101Location(req.url), 301),
    );
  }

  // The sprint's calendar file (D-032), as a real `text/calendar` response so iOS offers "Add to
  // Calendar". Exempt from the global limit for the page's reason: a room behind one venue NAT may
  // tap it in the same minute. A constant string, so there is nothing to limit.
  app.get(SPRINT_ICS_PATH, { config: { rateLimit: false } }, async (_req, reply): Promise<FastifyReply> =>
    reply
      .code(200)
      .type('text/calendar; charset=utf-8')
      .header('cache-control', 'public, max-age=3600')
      .send(SPRINT_ICS),
  );
}

// --- the waitlist --------------------------------------------------------------------------------

/** Which of the two bodies this is, or null for anything else (answered 415). */
function bodyKind(contentType: string | undefined): 'json' | 'form' | null {
  if (isJsonContentType(contentType)) return 'json';
  if (contentType !== undefined && contentType.split(';')[0]!.trim().toLowerCase() === FORM_CONTENT_TYPE) return 'form';
  return null;
}

/**
 * Store one sign-up. A duplicate (email, source) is a no-op, and the answer is the same either way:
 * telling a visitor "you were already on the list" would tell anyone which addresses are.
 *
 * `randomIds`, not `newIds`. `newIds` switches to the deterministic generator under § 7.7's test
 * clock so that Gate 7's oracle can compare ids — and that generator hands EVERY request the same
 * first id, `wl<now>0`. Nothing compares these ids, and a pinned clock (the http-mode suites run
 * under one) would turn the second sign-up into a primary-key violation.
 */
async function insertSignUp(entry: WaitlistEntry): Promise<{ duplicate: boolean }> {
  const inserted = await getDb()
    .insert(ai101Waitlist)
    .values({ id: randomIds()('wl'), ...entry, source: WAITLIST_SOURCE, createdAt: clock.now() })
    // The pair the unique index is on, named rather than left bare: a bare `do nothing` would also
    // swallow a primary-key collision, which is a bug to hear about rather than a duplicate.
    .onConflictDoNothing({ target: [ai101Waitlist.email, ai101Waitlist.source] })
    .returning({ id: ai101Waitlist.id });
  return { duplicate: inserted.length === 0 };
}

/**
 * `POST /api/ai101/waitlist`. Registered only when `BuildOptions.waitlist` is true; see the header.
 *
 * Async because the form parser lives in its own encapsulated plugin, and `build()` awaits the
 * registration so the route exists by the time `build()` returns — `test/authz.test.ts` reads the
 * router with `printRoutes()` straight after `build()`, without `ready()`.
 */
export async function registerAi101Waitlist(app: FastifyInstance): Promise<void> {
  await app.register(async (scope) => {
    // Scoped to this plugin, so it exists for this one route and every other route in the API still
    // has no form parser at all. See the header.
    scope.addContentTypeParser(
      FORM_CONTENT_TYPE,
      { parseAs: 'string', bodyLimit: WAITLIST_BODY_LIMIT },
      (_req: FastifyRequest, body: string | Buffer, done: (err: Error | null, body?: unknown) => void) => {
        // `URLSearchParams` decodes `+` and percent-escapes the way a browser's form encoder writes
        // them. A repeated key keeps its last value, which is the only one a single-input form sends.
        done(null, Object.fromEntries(new URLSearchParams(String(body))));
      },
    );

    scope.post(
      WAITLIST_PATH,
      {
        bodyLimit: WAITLIST_BODY_LIMIT,
        // Origin only, not `requireJsonSameOrigin`: this route takes a form post on purpose. An
        // absent Origin passes (curl, `app.inject`); a foreign one or `null` is 403.
        preHandler: requireSameOrigin,
        config: { rateLimit: { max: WAITLIST_RATE_MAX, timeWindow: WAITLIST_RATE_WINDOW } },
      },
      async (req, reply): Promise<FastifyReply> => {
        const kind = bodyKind(req.headers['content-type']);
        if (kind === null) {
          return reply.code(415).send({ error: `The waitlist takes ${JSON_CONTENT_TYPE} or ${FORM_CONTENT_TYPE}.` });
        }

        // The one place the two kinds answer differently: a form post always lands back on the page.
        const accepted = (): FastifyReply =>
          kind === 'form' ? reply.redirect(WAITLIST_JOINED_LOCATION, 303) : reply.code(201).send({ ok: true });
        const refused = (field: WaitlistField, error: string): FastifyReply =>
          kind === 'form' ? reply.redirect(WAITLIST_ERROR_LOCATION, 303) : reply.code(400).send({ error, field });

        const parsed = waitlistBody.safeParse(req.body ?? {});
        // Only reachable as JSON — a form body is all strings by construction — and only by a
        // client that is not the page's own script, so there is no field to point at.
        if (!parsed.success) {
          return reply.code(400).send({ error: 'Expected a JSON body of { firstName, email, brokerage?, website?, src? }.' });
        }

        const verdict = validateWaitlist(parsed.data);
        if (verdict.kind === 'spam') {
          req.log.info('ai101 waitlist: honeypot filled; answered as a success and stored nothing');
          return accepted();
        }
        if (verdict.kind === 'invalid') return refused(verdict.field, verdict.error);

        try {
          const { duplicate } = await insertSignUp(verdict.entry);
          req.log.info({ src: verdict.entry.src, duplicate }, 'ai101 waitlist: sign-up recorded');
        } catch (err: unknown) {
          // NOT rethrown to `app.ts`'s handler, which would log the error whole — and drizzle's
          // message carries every bound parameter, i.e. this visitor's email and name. See the
          // header. The Postgres code (on the driver error drizzle wraps) is enough to diagnose.
          const cause = (err as { cause?: { code?: unknown } }).cause;
          const code = (err as { code?: unknown }).code ?? cause?.code;
          req.log.error({ code: typeof code === 'string' ? code : undefined }, 'ai101 waitlist: insert failed');
          return kind === 'form'
            ? reply.redirect(WAITLIST_ERROR_LOCATION, 303)
            : reply.code(500).send({ error: 'Something went wrong.' });
        }
        return accepted();
      },
    );
  });
}
