// The Fastify app — phase 07 § 7.1 and § 7.5, plus § 9.4's production hardening.
//
// `build()` returns a configured instance and listens to nothing. `server.ts` is the only file
// that binds a port, which is what makes every route testable through `app.inject()` — Gate 7's
// oracle, its authorization matrix and both suites in `apps/api/test/` all go through here.
//
//   const app = await build(); const cookie = await app.signInAs('u_jamie');
//   const res = await app.inject({ method: 'POST', url: '/api/mutate/toggleStep', headers: { cookie }, payload: … });
//
// ================================================================================================
// REGISTRATION ORDER, WHICH IS NOT ARBITRARY
// ================================================================================================
//   1. @fastify/cookie     — must precede rate-limit, whose key generator reads `req.cookies`
//   2. @fastify/helmet     — § 9.4's CSP and the rest of the security headers
//   3. @fastify/rate-limit — § 9.4's 100/minute; `createRateLimit` is used by routes/auth.ts
//   4. the routes          — auth, snapshot, mutate, events (§ 7), the two file downloads plus
//                            upload-url and the join window (§ 8), and in test mode only, test.
//                            Plus the public /ai101 page, its three redirects and its waitlist
//                            (D-028), which sit OUTSIDE the fixture guard; `routes/ai101.ts` says
//                            why. And the public /terms and /privacy pages, beside it.
//                            `authz.test.ts` holds the authoritative inventory and checks it
//                            against the real router, so a route registered here without a guard
//                            classification fails that test — which is what caught phase 08's four.
//
// Fastify runs same-type hooks in registration order, so "cookie before rate-limit" is a real
// dependency rather than a preference: the limiter's key is derived from the session cookie
// (§ 9.4: "100 requests per minute per session"), and the cookie is parsed by the plugin's own
// `onRequest` hook.
//
// ================================================================================================
// WHY THE DATABASE IS NOT TOUCHED HERE
// ================================================================================================
// Nothing in `build()` connects. `db/client.ts`'s header explains at length why: `getDb()` is
// memoized and resolves `DATABASE_URL` on the first QUERY, so `test/helpers.ts` can point the
// process at this worker's own database inside `beforeEach`, long after every import has been
// evaluated and after `build()` has already run. An app that connected at build time would be
// talking to `apps/api/.env`'s database before the harness had executed a line.
//
// ================================================================================================
// § 9.4's FIVE CSP DIRECTIVES, AND THE ONE THING THAT MAKES THEM SURVIVABLE
// ================================================================================================
// `apps/web/index.html` carries an INLINE `<script>`: the pre-paint theme script, which reads
// `localStorage['ai-lms-prefs']` and sets `data-theme` before first paint so there is no flash of
// the wrong theme. Any CSP that resolves `script-src` to `'self'` — which § 9.4's
// `default-src 'self'` does on its own — blocks it, and the demo site starts flashing white on
// every load for dark-mode viewers.
//
// So `server.ts` hashes the inline scripts it is about to serve and passes them in, and they go
// into `script-src` as `'sha256-…'`. That is the textbook answer and the only one that keeps both
// halves of the requirement: the script runs, and `'unsafe-inline'` — which would also have
// unblocked every injected `<script>` in the app — stays out. `inlineScriptHashes` is a pure
// function over the HTML, tested in `test/routes.test.ts`.
//
// `style-src` does carry `'unsafe-inline'`, and that is not laziness: 51 call sites across the web
// app set CSS custom properties through `style={{ '--w': … }}`, which is how the reference's
// progress bars and drawer widths are expressed, and `style-src-attr` falls back to `style-src`.
// Hashes cannot help — an attribute's value is not hashable per-element — and the alternative is
// rewriting 51 components for a directive that § 9.4 does not list. `https:` is dropped from
// helmet's own default for that directive, because the app loads no external stylesheet: § 9.4's
// "Self-hosted fonts mean no Google domains" applies to `style-src` as much as to `font-src`.

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { createHash } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyInstance, FastifyRequest, FastifyServerOptions } from 'fastify';
import { createSession, decorateViewer, readSessionSecret, SESSION_COOKIE, settleEmails } from './auth';
import { close as closeDatabase, getDb } from './db/client';
import { renderTemplate } from './email/templates';
import { setRenderer } from './email/transport';
import { clock } from './lib/clock';
import { registerAi101Page, registerAi101Waitlist } from './routes/ai101';
import { registerLegalPages } from './routes/legal';
import { registerGuidePages, type GuidePages } from './routes/guides';
import { registerLibraryPage } from './routes/library';
import type { LegalPages } from './routes/legal';
import { registerApexRedirect } from './routes/apex';
import { registerMarketingHost } from './routes/marketing';
import { ANALYTICS_CSP, loadsAnalytics, withAnalyticsCsp } from './lib/analytics';
import { registerAuthRoutes } from './routes/auth';
import { registerPasswordRoutes } from './routes/password';
import { registerGoogleRoutes } from './routes/google';
import { readGoogleConfig } from './auth/google';
import type { GoogleConfig } from './auth/google';
import { registerEventsRoute } from './routes/events';
import type { EventHub } from './routes/events';
import { registerFilesRoutes } from './routes/files';
import { registerJoinRoute } from './routes/join';
import { registerMutateRoute } from './routes/mutate';
import { registerSnapshotRoute } from './routes/snapshot';
import { isTestEnv, registerTestRoutes } from './routes/test';
import { registerOfferRoutes } from './routes/offer';
import { registerSkillRoutes } from './routes/skills';
import { registerSkillGuideRoutes } from './routes/skill-guides';
import type { SkillGuidesFile } from '@ai/core/skill-guides';
import { registerCurriculumStatusRoute } from './routes/curriculum-status';
import { registerLibraryStatusRoute } from './routes/library-status';
import { registerCrmSyncRoutes } from './routes/crm-sync';
import { registerBillingRoutes } from './routes/billing';
import { registerCourseRoute } from './routes/course';
import type { OfferPages } from './routes/offer';
import { readOfferConfig } from './billing/config';
import type { OfferConfig } from './billing/config';
import { createPriceCache } from './billing/prices';
import type { PriceCache } from './billing/prices';
import { stripeClient, stripeVerifier } from './billing/stripe';
import type { BillingStripe } from './billing/stripe';
import { clientIpEvidence, clientIpHeaderFor, clientIpOf } from './lib/client-ip';

/**
 * Fastify's `trustProxy`, as the one-hop function the comment at the call site argues for.
 *
 * `proxy-addr` walks the chain `[socket address, ...x-forwarded-for reversed]` from index 0 and
 * stops at the first address this returns false for. Trusting only hop 0 therefore yields the LAST
 * entry the nearest proxy wrote, which is the one address in the header a client cannot choose.
 */
export const TRUST_ONE_HOP = (_address: string, hop: number): boolean => hop === 0;

/** § 9.4: "100 requests per minute per session". */
export const GLOBAL_RATE_MAX = 100;
export const GLOBAL_RATE_WINDOW = '1 minute';

/**
 * Whether a request is for the API, the only thing the global limit counts (D-137). Files and pages
 * are not: a cold load of the SPA is about twenty files, and a room of people on one conference
 * Wi-Fi shares one IP, so counting them locked the room out (429s on `/assets/*.js`, a blank page).
 * Routes with their own limits (`/api/auth/request`, the waitlists, password sign-in) are all under
 * `/api/` and keep them.
 */
export function isApiPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return path === '/api' || path.startsWith('/api/');
}

export interface BuildOptions {
  /**
   * Fastify's logger option. Defaults to off under `NODE_ENV=test` (a suite that prints a JSON log
   * line per inject is a suite nobody reads) and to the § 9.4 configuration otherwise.
   */
  logger?: FastifyServerOptions['logger'];
  /**
   * § 7.1's demo guard, as `server.ts` reads it from `VITE_DATA_SOURCE === 'fixture'`.
   *
   * True registers the hardening, `/api/health`, the public /ai101 page with its redirects and the
   * public /terms and /privacy pages, and none of the app's data routes: no auth, no snapshot, no
   * mutations, no events, no test routes. The SPA runs against its own in-browser fixture there, so
   * an API with no data routes is correct rather than merely tolerable. It says nothing about
   * whether a database EXISTS — production runs fixture mode with one — which is why the waitlist
   * has a flag of its own, below.
   */
  fixtureOnly?: boolean;
  /** `'sha256-…'` entries for `script-src`. See the header; `server.ts` computes them. */
  inlineScriptHashes?: readonly string[];
  /**
   * The built /ai101 page, `apps/web/dist/ai101.html`, which `GET /ai101` serves from memory.
   *
   * `null` or absent — a checkout nobody has built, and every test that does not pass one — leaves
   * the route registered and answering a JSON 404. `server.ts` reads the file once and passes the
   * SAME string to `cspScriptHashes`, so the bytes served and the bytes hashed cannot differ.
   */
  ai101Page?: string | null;
  /**
   * The built legal pages, `apps/web/dist/terms.html` and `privacy.html`, which `GET /terms` and
   * `GET /privacy` serve from memory. A page that is `null` or absent answers a JSON 404, as
   * `ai101Page` does. They carry no script, so they add nothing to the CSP. `routes/legal.ts`.
   */
  legalPages?: LegalPages;
  /**
   * Each free guide's built `apps/web/dist/<slug>.html` (D-038, D-039), by slug; a missing one is a
   * 404. Their inline script must be in `inlineScriptHashes`, as /ai101's is. `routes/guides.ts`.
   */
  guidePages?: GuidePages;
  /** The built free library, `apps/web/dist/library.html` (D-050); a JSON 404 when absent. */
  libraryPage?: string | null;
  /**
   * The built placeholder for the marketing host, `apps/web/dist/holding.html`, served on
   * `MARKETING_HOST` only. `null` when it has not been built, which makes `/` there a 404
   * rather than a redirect loop. Inert unless `MARKETING_HOST` is set — see
   * `routes/marketing.ts`, which is the whole www/learn split.
   */
  marketingPage?: string | null;
  /**
   * Whether `POST /api/ai101/waitlist` exists. Defaults to `!fixtureOnly`, the API's usual "is
   * there a database" answer.
   *
   * `server.ts` sets it from whether a `DATABASE_URL` is configured, independently of
   * `fixtureOnly`, because the two disagree in production: fixture mode WITH a database. The demo
   * deploy is fixture mode with none, and there the route must not exist at all — a 404, never a
   * `DatabaseConfigError` on the first sign-up. `routes/ai101.ts` carries the argument.
   */
  waitlist?: boolean;
  /**
   * The offer (D-073 to D-077): its built pages and, for a test, its configuration, Stripe client and
   * price cache. Left out, the configuration is read from the environment and the client is made from
   * `STRIPE_SECRET_KEY` when one is set. The routes are registered in both modes, like /ai101; the ones
   * that need a database follow `waitlist`. `routes/offer.ts`.
   */
  /**
   * "Continue With Google" (D-139). Left out, it is read from `GOOGLE_CLIENT_ID`,
   * `GOOGLE_CLIENT_SECRET` and `APP_URL`; a test passes one with a fake `fetch`, or null for off.
   */
  google?: GoogleConfig | null;
  /**
   * Every skill's full guided setup (D-151): `apps/web/dist-private/skill-guides.json`, which
   * `server.ts` reads at boot. Absent or null, `GET /api/skill-guides/:slug` answers 503. A test
   * passes its own.
   */
  skillGuides?: SkillGuidesFile | null;
  /**
   * The request header that carries the visitor's own IP address (`lib/client-ip.ts`), or null for
   * `req.ip` alone. Left out, it is `clientIpHeaderFor(process.env)`: Railway's `x-real-ip` on
   * Railway, nothing elsewhere. A test passes `'x-real-ip'` to stand in for Railway's edge.
   */
  clientIpHeader?: string | null;
  offer?: {
    pages?: OfferPages;
    config?: OfferConfig;
    stripe?: BillingStripe | null;
    verify?: BillingStripe['constructEvent'] | null;
    prices?: PriceCache;
  };
}

/** § 7.7's `build()`, with the two things Gate 7's snippet calls on the result. */
export type App = FastifyInstance & {
  /**
   * A session cookie header for `userId`, for `app.inject({ headers: { cookie } })`.
   *
   * Test mode only, and it throws otherwise — the same reasoning as `routes/test.ts`: a function
   * that mints a session for an arbitrary id must not be callable from a production code path,
   * even one that is not routable.
   */
  signInAs(userId: string): Promise<string>;
  /** The SSE clients, for a drain assertion. */
  readonly events: EventHub | null;
};

// --- § 9.4's CSP --------------------------------------------------------------------------------

/**
 * The inline `<script>` bodies in an HTML document, as CSP `'sha256-…'` source expressions.
 *
 * A `<script>` with a `src` is not inline and contributes no hash. The hash is over the element's
 * text content EXACTLY as served, bytes included — a build step that reindents the script changes
 * the hash, which is why this is computed from the file `server.ts` is about to serve rather than
 * hard-coded.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  const pattern = /<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const attrs = match.groups?.attrs ?? '';
    if (/\ssrc\s*=/i.test(attrs)) continue;
    const body = match.groups?.body ?? '';
    if (body === '') continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

/**
 * The `script-src` hashes for every page this process serves, de-duplicated.
 *
 * Two pages today: the SPA's `index.html` (the pre-paint theme script) and the /ai101 page (its one
 * `<script type="module">`, inlined by its build so a visitor on venue Wi-Fi makes one request
 * rather than three). The CSP is one policy for every response, so it has to allow both scripts —
 * which widens nothing: a hash admits exactly the bytes it was computed from, on any page. A page
 * that is `null` (not built) contributes nothing.
 */
export function cspScriptHashes(pages: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const html of pages) {
    if (html === null || html === undefined) continue;
    for (const hash of inlineScriptHashes(html)) out.add(hash);
  }
  return [...out];
}

/**
 * § 9.4's CSP, with helmet's defaults underneath.
 *
 * The five directives § 9.4 lists are set here verbatim; the rest of helmet's defaults
 * (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, `base-uri 'self'`,
 * `form-action 'self'`) are kept, because dropping them in the name of "only what § 9.4 lists"
 * would make the policy weaker than the one the phase file asks for, not stricter.
 *
 * `VIDEO_HOST` stands in for § 9.4's `YOUR_VIDEO_HOST` placeholder, which the phase file never
 * resolves — phase 08 § 8.3 says only "Mux or another HLS host" and `.railway/railway.ts` carries
 * a `VIDEO_API_KEY` with no host beside it. Unset, the directive is just `'self'` plus `data:` /
 * `blob:`, which is correct for every replay the app serves today (the fake player, and § 8.2's
 * bucket objects, which are same-origin through `/api/files/...`). Flagged for DECISIONS.md.
 */
export function cspDirectives(
  inlineHashes: readonly string[] = [],
  env: NodeJS.ProcessEnv = process.env,
  { analytics = false }: { analytics?: boolean } = {},
): Record<string, string[]> {
  const host = env.VIDEO_HOST?.trim();
  const video = host ? [`https://*.${host.replace(/^https?:\/\//, '').replace(/^\*\./, '')}`] : [];
  // D-155: GA4 and the Meta Pixel, only on a www page that loads `/analytics.js` (the hook in
  // `build()` applies it per response). The learn app, the admin console and the API never get them.
  const tags = (name: keyof typeof ANALYTICS_CSP): string[] => (analytics ? [...ANALYTICS_CSP[name]] : []);
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...inlineHashes, ...tags('script-src')],
    // See the header: `style-src-attr` falls back to this, and `style={{ '--w': … }}` is how the
    // reference's measured widths are expressed.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', ...video, ...tags('img-src')],
    'media-src': ["'self'", 'blob:', ...video],
    'connect-src': ["'self'", ...tags('connect-src')],
    // § 9.4: "Self-hosted fonts mean no Google domains." helmet's default here is
    // `'self' https: data:`; the `https:` is what would have let a Google domain back in. `data:`
    // is allowed (D-137): fonts inlined into a stylesheet as data URLs were blocked, which filled the
    // console on every load. It is not a domain, so the rule above still holds.
    'font-src': ["'self'", 'data:'],
  };
}

/**
 * § 9.4: "JSON logs with a request id. Never log tokens, emails in URLs or presigned URLs."
 *
 * Fastify logs `req.url` on every request, and two of this app's URLs carry a bearer credential:
 * `/sign-in?token=…` and `/invite/:token`, both of which are SPA routes and therefore both of
 * which reach the server as a document request for `index.html`. Without this the magic link lands
 * in the log, where it stays valid for 15 minutes or 7 days — a log file becomes a list of working
 * sign-ins.
 *
 * Exported and pure so `test/routes.test.ts` can pin it without reading a log stream.
 */
export function scrubUrl(url: string): string {
  const [rawPath = '', rawQuery] = url.split('?');
  // `/invite/<token>` — the token is the path segment itself.
  const path = rawPath.replace(/^\/invite\/[^/]+/, '/invite/:token');
  if (rawQuery === undefined) return path;

  const params = new URLSearchParams(rawQuery);
  let touched = false;
  for (const key of [...params.keys()]) {
    // `token` covers `/sign-in?token=…`; `email` because § 9.4 names "emails in URLs" too, and
    // the `x-amz-` pair because § 8.2's presigned URLs carry them. `code` and `state` are Google's
    // one-time authorization code and this browser's CSRF value on its callback (D-139).
    if (/^(token|email|signature|x-amz-signature|x-amz-credential|code|state)$/i.test(key)) {
      params.set(key, 'REDACTED');
      touched = true;
    }
  }
  // Nothing sensitive AND nothing rewritten: hand back the original string byte for byte rather
  // than `URLSearchParams`'s re-encoding of it, so an ordinary URL reads in the log as it arrived.
  // Returning `url` unconditionally here is the bug this line replaced: it threw away the
  // `/invite/:token` rewrite for any invite URL that also carried a query string.
  if (!touched) return path === rawPath ? url : `${path}?${rawQuery}`;
  return `${path}?${params.toString()}`;
}

/** § 9.4's logger: JSON (pino's default), a request id, and nothing secret in it. */
export function productionLogger(ipHeader: string | null = clientIpHeaderFor()): FastifyServerOptions['logger'] {
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    // Headers are logged wholesale by the default serializer, and `cookie` holds the session.
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
      censor: 'REDACTED',
    },
    serializers: {
      req: (req: FastifyRequest) => ({
        method: req.method,
        url: scrubUrl(req.url),
        // The visitor, not Railway's proxy (`lib/client-ip.ts`). Worked out here rather than read from
        // `req.clientIp`, because this line is written before any hook has run.
        remoteAddress: clientIpOf(req, ipHeader),
      }),
    },
  };
}

/**
 * The global limiter's key. § 9.4: "100 requests per minute per session."
 *
 * The session cookie when there is one, so two learners behind one office NAT get their own
 * budget, and the visitor's own address otherwise (`req.clientIp`, `lib/client-ip.ts`: on Railway,
 * not `req.ip`, which is Railway's proxy for everyone), which is what covers sign-in, Forgot Password
 * and the event stream. Every route's own limit uses this key too. The cookie is
 * HASHED into the key rather than used raw: a limiter key reaches `errorResponseBuilder` and any
 * store a future deploy swaps in, and a session id is a bearer credential — § 9.4's "never log
 * tokens" applies to wherever else a key might end up, too.
 */
export function rateLimitKey(req: FastifyRequest): string {
  const cookie = req.cookies?.[SESSION_COOKIE];
  // The cookie must be VERIFIED before it can name a bucket. Keying on the raw value lets a caller
  // send a different random `ai_sid` on every request and collect a brand-new 100/minute budget
  // each time, which removes the limit rather than applying it — and @fastify/rate-limit has no
  // way to notice, because a key it has not seen is indistinguishable from a new session.
  //
  // `unsignCookie` is the only thing that separates "a session this server issued" from "24 bytes
  // the caller made up". An invalid signature therefore falls back to the IP bucket, which is where
  // an unauthenticated caller belongs anyway — so forging a cookie gains nothing over sending none.
  if (cookie !== undefined && cookie !== '' && typeof req.unsignCookie === 'function') {
    const unsigned = req.unsignCookie(cookie);
    if (unsigned.valid && unsigned.value !== null && unsigned.value !== '') {
      // Hashed, not raw: a limiter key reaches `errorResponseBuilder` and whatever store a future
      // deploy swaps in, and a session id is a bearer credential. § 9.4's "never log tokens"
      // applies to wherever else a key might end up.
      return `s:${createHash('sha256').update(unsigned.value).digest('hex').slice(0, 24)}`;
    }
  }
  return `ip:${req.clientIp ?? req.ip}`;
}

// --- build ---------------------------------------------------------------------------------------

export async function build(options: BuildOptions = {}): Promise<App> {
  const fixtureOnly = options.fixtureOnly ?? false;
  const ipHeader = options.clientIpHeader !== undefined ? options.clientIpHeader : clientIpHeaderFor();

  const app = Fastify({
    logger: options.logger ?? (process.env.NODE_ENV === 'test' ? false : productionLogger()),
    // ONE hop, not `true`. `trustProxy: true` trusts every address in `x-forwarded-for`, so a
    // client can prepend whatever it likes and `req.ip` becomes attacker-controlled — and `req.ip`
    // is the rate-limit key for sign-in (§ 7.5: "5 per hour per email AND IP") and the fallback key
    // for § 9.4's global limit. `hop === 0` trusts exactly the socket's peer, which on Railway is
    // the edge that actually sets the header, and stops there: the address it yields is the last
    // entry the edge wrote, which a client cannot forge.
    //
    // On Railway that is still not the visitor (Nov 12, 2026: `req.ip` was Railway's proxy,
    // 152.233.39.33, for every request), so the limits and the logs key on `req.clientIp` below.
    trustProxy: TRUST_ONE_HOP,
    // § 9.4's "JSON logs with a request id": pino emits `reqId` on every line, and this makes the
    // id the one the proxy already assigned when there is one, so a log line can be matched to an
    // edge log.
    requestIdHeader: 'x-request-id',
    // The whole API's bodies are mutation arguments and a `{ email }`; a module draft with a long
    // transcript is the biggest of them. 1 MiB is generous for that and small enough that an
    // unauthenticated POST cannot be used to buy memory. (§ 8.2 uploads go straight to the bucket
    // through a presigned PUT, so they never pass through here.)
    bodyLimit: 1024 * 1024,
  }) as unknown as App;

  // The bare domain, before anything at all (D-133): `amplifiedimpact.io/<path>?<query>` 301s to
  // www with both kept. Inert unless MARKETING_HOST is set and starts with `www.`.
  registerApexRedirect(app);

  // The www/learn split, before anything else: on the marketing host this answers with a static
  // page or a redirect and needs neither a parsed cookie nor a rate-limit bucket. Inert unless
  // MARKETING_HOST is set, so on the app host and in every test it costs one string compare.
  registerMarketingHost(app, { page: options.marketingPage ?? null });

  // --- § 9.4's hardening -------------------------------------------------------------------------

  await app.register(fastifyCookie, {
    // Throws in production when SESSION_SECRET is missing — § 7.5's "no safe default". That throw
    // happens HERE, during `build()`, which is before `server.ts` calls `listen`, so a
    // misconfigured deploy never passes its healthcheck and Railway keeps serving the old version.
    secret: readSessionSecret(),
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: cspDirectives(options.inlineScriptHashes),
    },
    // The SPA is one origin and loads nothing cross-origin, but it does `window.open` a Zoom URL
    // (§ 8.4), and COEP would require every such resource to opt in. Off, which is helmet's own
    // default; stated here so a future reader does not turn it on and break the join button.
    crossOriginEmbedderPolicy: false,
  });

  // D-155: a www page that loads `/analytics.js` gets the policy above plus exactly what GA4 and the
  // Meta Pixel need (`ANALYTICS_CSP`); nothing else ever does. A response with no policy (the www
  // homepage, answered by the marketing hook before helmet runs) is left without one, as before.
  app.addHook('onSend', async (_req, reply, payload) => {
    if (!loadsAnalytics(payload)) return payload;
    const csp = reply.getHeader('content-security-policy');
    if (typeof csp === 'string' && csp !== '') reply.header('content-security-policy', withAnalyticsCsp(csp));
    return payload;
  });

  // The visitor's own address (`lib/client-ip.ts`), for the limiter's key and the event stream's
  // fingerprint. A getter, so it is right whichever hook asks first.
  app.decorateRequest('clientIp', {
    getter(this: FastifyRequest) {
      return clientIpOf(this, ipHeader);
    },
  });
  // One line per sign-in request, with every candidate for the visitor's address side by side, so
  // production can confirm the header against Railway's edge log. No body, cookie or email.
  app.addHook('onRequest', async (req) => {
    if (req.method === 'POST' && (req.url.split('?')[0] ?? '').startsWith('/api/auth/')) {
      req.log.info({ clientIp: clientIpEvidence(req, ipHeader) }, 'auth request client ip');
    }
  });

  await app.register(fastifyRateLimit, {
    max: GLOBAL_RATE_MAX,
    timeWindow: GLOBAL_RATE_WINDOW,
    keyGenerator: rateLimitKey,
    // The API only (D-137). A request this answers true for is never counted and gets no
    // `x-ratelimit-*` headers: every file, every page, on learn and on www.
    allowList: (req) => !isApiPath(req.url),
    // No `errorResponseBuilder`. The plugin THROWS whatever the builder returns, and its default
    // returns an `Error` carrying `statusCode: 429` — which `setErrorHandler` below turns into
    // `{ error: 'Rate limit exceeded, retry in 1 hour' }` with the right status, i.e. exactly the
    // `{ error }` shape `apps/web/src/data/http.ts` reads. A builder returning a plain object
    // instead (the obvious reading of its name) is thrown WITHOUT a `statusCode`, and the error
    // handler answers 500: measured, and the reason this comment exists.
  });
  // A route's own limit inherits that `allowList`, so a stricter limit outside `/api/` would
  // silently be no limit at all. Every route that has one is under `/api/` today; refuse to boot
  // rather than let a new one slip out from under it.
  app.addHook('onRoute', (route) => {
    const own = (route.config as { rateLimit?: unknown } | undefined)?.rateLimit;
    if (own && typeof own === 'object' && !isApiPath(route.url)) {
      throw new Error(`${route.url} has its own rate limit, but limits apply under /api/ only (D-137)`);
    }
  });

  decorateViewer(app);

  /**
   * Fastify's default 5xx body is `{ statusCode, error, message }` where `message` is the thrown
   * `Error`'s own text — a Postgres error string, a stack-adjacent detail, whatever threw. That
   * reaches the browser.
   *
   * So: 5xx is logged in full and answered with one fixed sentence, and a 4xx is passed through
   * with its message, because every 4xx in this API is one the handlers wrote deliberately (and
   * the rate limiter's, which supplies its own body).
   */
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode ?? 500;
    // A file request is never answered with JSON (D-137): a browser that asked for a script or a
    // stylesheet gets plain text it will not try to run.
    if ((req.url.split('?')[0] ?? '').startsWith('/assets/')) {
      if (status >= 500) req.log.error({ err }, 'request failed');
      return reply.code(status).type('text/plain; charset=utf-8').send(status >= 500 ? 'Something went wrong.' : (STATUS_CODES[status] ?? 'Not found'));
    }
    if (status >= 500) {
      req.log.error({ err }, 'request failed');
      return reply.code(500).send({ error: 'Something went wrong.' });
    }
    return reply.code(status).send({ error: err.message });
  });

  // --- routes ------------------------------------------------------------------------------------

  // Kept here rather than in `server.ts` so that `inject('/api/health')` works in a test and so
  // the shape cannot drift from `test/health.test.ts`. Railway's healthcheck is this route
  // (`.railway/railway.ts`: `healthcheck: '/api/health'`), and it deliberately touches nothing:
  // a health check that queried the database would fail a deploy over a transient connection.
  app.get('/api/health', async () => ({ ok: true, version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' }));

  // The public /ai101 page and its redirects (D-028), in BOTH modes: a string in memory and three
  // 301s, with no database and no session behind any of them. Outside the fixture guard because
  // production runs fixture mode and the page has to be there.
  registerAi101Page(app, options.ai101Page ?? null);

  // Its waitlist, by its own flag rather than the fixture guard — the one route here that needs a
  // database and nothing else. See `BuildOptions.waitlist` and `routes/ai101.ts`.
  if (options.waitlist ?? !fixtureOnly) await registerAi101Waitlist(app);

  // The Terms of Service and Privacy Policy the /ai101 waitlist links to, served the same way and
  // for the same reasons, in both modes. `routes/legal.ts`.
  registerLegalPages(app, options.legalPages);
  registerGuidePages(app, options.guidePages);
  registerLibraryPage(app, options.libraryPage ?? null);

  // The offer (D-073 to D-077): its pages in both modes, its order, webhook and waitlist routes
  // wherever there is a database, like the waitlist above.
  const offerConfig = options.offer?.config ?? readOfferConfig();
  const offerStripe =
    options.offer?.stripe !== undefined ? options.offer.stripe : offerConfig.stripeSecretKey ? stripeClient(offerConfig.stripeSecretKey) : null;
  {
    const config = offerConfig;
    const stripe = offerStripe;
    const verify = options.offer?.verify !== undefined ? options.offer.verify : config.stripeWebhookSecret ? stripeVerifier() : null;
    const prices =
      options.offer?.prices ??
      createPriceCache(
        () => stripe,
        (err) => app.log.warn({ reason: (err as { code?: string; type?: string }).code ?? (err as { type?: string }).type }, 'Stripe prices could not be loaded'),
      );
    await registerOfferRoutes(app, {
      pages: options.offer?.pages ?? {},
      config,
      stripe,
      verify,
      prices,
      database: options.waitlist ?? !fixtureOnly,
    });
  }

  let events: EventHub | null = null;

  if (!fixtureOnly) {
    // Once per process. `transport.send` takes the subject from `SUBJECTS` and only the `html`
    // from the renderer, so registering it is what turns the nine templates on; without it every
    // email goes out with no body and `sendViaResend` refuses to send at all.
    setRenderer(renderTemplate);

    events = registerEventsRoute(app);
    // A thunk, not `events.broadcast` by reference: the routes then call whatever the hub's
    // `broadcast` IS at the moment of the commit. § 7.6 replaces it with Postgres LISTEN/NOTIFY
    // once there is more than one replica, and a reference captured at registration would have to
    // be re-wired at every call site; it also lets a test observe the call.
    const broadcast = (): void => events?.broadcast();
    registerAuthRoutes(app, { broadcast });
    // Email and password sign-in, set and reset links, the account page's change (D-132).
    registerPasswordRoutes(app, { broadcast, invitesFrom: offerConfig.invitesFrom });
    // "Continue With Google" (D-139): 404 and a hidden button until its two keys are in Railway.
    registerGoogleRoutes(app, { broadcast, config: options.google === undefined ? readGoogleConfig() : options.google });
    registerSnapshotRoute(app);
    registerJoinRoute(app);
    registerFilesRoutes(app);
    // The skill library (D-079): signed in, like the Vault beside it.
    registerSkillRoutes(app);
    // Each skill's guided setup (D-151): signed in, and only for a learner the access rule lets in.
    registerSkillGuideRoutes(app, { guides: options.skillGuides ?? null });
    // Manage Billing (D-077): the owner's way into Stripe's billing portal, where members cancel.
    registerBillingRoutes(app, { stripe: offerStripe, config: offerConfig });
    // The AI Accelerator's pages (D-110): signed in, and only for a plan that opens the course.
    registerCourseRoute(app);
    // Whether its curriculum is in this database, as counts and nothing else (D-121): open.
    registerCurriculumStatusRoute(app);
    // Whether a Skill Library download link resolves, as counts and a status code (D-122): open.
    registerLibraryStatusRoute(app);
    // The CRM sync log (D-134): the Owner and Admins only.
    registerCrmSyncRoutes(app);
    registerMutateRoute(app, { broadcast });

    // § 7.7. The guard is the exact string `'test'`; `routes/test.ts` carries the argument and
    // re-checks it, so moving this line cannot smuggle the routes into another environment.
    if (isTestEnv()) registerTestRoutes(app);
  }

  Object.defineProperty(app, 'events', { value: events, enumerable: false });

  const signInAs = async (userId: string): Promise<string> => {
    if (!isTestEnv()) {
      throw new Error(
        'signInAs mints a session for any user id and is only available when NODE_ENV is exactly ' +
          `'test' (it is ${JSON.stringify(process.env.NODE_ENV)}).`,
      );
    }
    const sessionId = await createSession(getDb(), userId, clock.now());
    // Signed with `@fastify/cookie`'s own signer and serialized by its own serializer, then cut
    // back to the `name=value` pair a `Cookie` REQUEST header carries. Doing it this way rather
    // than by hand is what guarantees the encoding matches what `parseCookie` and `unsignCookie`
    // will do with it on the way back in — the signature is base64, which contains characters a
    // cookie value has to percent-encode. The attributes are not passed because none of them
    // survive the cut: `Path`, `HttpOnly` and `Secure` are response-only.
    const header = app.serializeCookie(SESSION_COOKIE, app.signCookie(sessionId));
    return header.split(';')[0]!;
  };

  // `defineProperty` rather than `app.decorate`, for both of these. `decorate` is the right tool
  // for something a ROUTE needs (it walks the plugin tree and checks for collisions); these two
  // are reached only through the value `build()` returns, and declaring them on `App` plus
  // defining them here keeps the type and the object in one place with no module augmentation of
  // `FastifyInstance` — which would otherwise put `signInAs` on every Fastify instance in the
  // repository, including ones that have no business minting sessions.
  Object.defineProperty(app, 'signInAs', { value: signInAs, enumerable: false });

  return app;
}

// --- § 9.4's graceful shutdown -------------------------------------------------------------------

/**
 * § 9.4: "Handle `SIGTERM` gracefully (close Fastify, drain SSE) so redeploys don't drop requests."
 *
 * Order matters in all three steps:
 *
 *   1. `settleEmails()` first. `/api/auth/request` answers before it mints anything, so at the
 *      instant SIGTERM arrives there can be a sign-in link half-written. Closing first would eat
 *      it, and the learner would be left waiting for an email that was never sent.
 *   2. `app.close()` next. Fastify runs the `preClose` hook `routes/events.ts` registered — which
 *      ENDS every SSE response — then stops accepting and finishes what is in flight. The drain
 *      has to be on `preClose` rather than `onClose`, and `events.ts`'s header carries the
 *      measurement: on `onClose` it is a deadlock, because Fastify waits for the stream first.
 *   3. The pool last, with `timeout: 5` (see `db/client.ts`), so a mutation holding
 *      `pg_advisory_xact_lock(42)` gets to commit rather than having its socket cut after it has
 *      already written rows.
 */
export async function shutdown(app: App): Promise<void> {
  await settleEmails();
  await app.close();
  await closeDatabase();
}

/**
 * Wire `shutdown` to the signals Railway sends, and return an uninstaller.
 *
 * Called by `server.ts` and NOT by `build()`, deliberately: `build()` runs once per test and a
 * process listener per app would leak until Node warned about it, and a test that called
 * `process.emit('SIGTERM')` would take the whole run down. Both signals, because Railway sends
 * SIGTERM and a developer's Ctrl-C sends SIGINT, and `once` so a second press after a hung drain
 * still kills the process the hard way.
 */
export function installShutdown(app: App, signals: readonly NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): () => void {
  const handlers = signals.map((signal) => {
    const handler = (): void => {
      app.log.info({ signal, sse: app.events?.clients() ?? 0 }, 'shutting down');
      void shutdown(app).then(
        () => process.exit(0),
        (err: unknown) => {
          app.log.error({ err }, 'shutdown failed');
          process.exit(1);
        },
      );
    };
    process.once(signal, handler);
    return { signal, handler };
  });

  return () => {
    for (const { signal, handler } of handlers) process.off(signal, handler);
  };
}
