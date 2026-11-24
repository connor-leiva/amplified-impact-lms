import type { Db } from '@ai/core';
import { safeNext } from '@ai/core/landing';
import type {
  AdminActionArgs,
  AdminActionName,
  AppearancePrefs,
  JoinTicket,
  LearnerEmailKind,
  LmsRepository,
  MutationArgs,
  MutationName,
  MutationResult,
  StoredFileRef,
  UploadResult,
  Viewer,
} from './repository';
import { UPLOAD_COPY, checkFile, putFile } from './upload';

/**
 * The production data source. Phase 07 builds the API behind it; the interface is already fixed,
 * so no screen changes when it lands.
 *
 * A 422 carries a validation message the form renders inline, exactly like the fixture path, so
 * `{ error }` is returned rather than thrown. Any other non-OK status is a real failure.
 */
/**
 * The 401 redirect, behind one indirection so `http.test.ts` can observe that it happens: in jsdom
 * `location.replace` is an unforgeable own property that cannot be spied on or replaced. A full page
 * load is deliberate — it discards every cached snapshot belonging to the session that just ended.
 * `replace` (D-152): Back from /sign-in does not return to the page that was just turned away.
 */
export const navigation = {
  toSignIn: () => location.replace(signInFor(location.pathname)),
  /** A masquerade's end (D-162 3b): a full page load to where the API sends staff back. */
  assign: (url: string) => location.assign(url),
};

/**
 * The sign-in address a 401 goes to. On a skill's page (D-182: `/learn/skills/<page>`, where www's
 * `/skill-library/<page>` links redirect), it brings the visitor back there once signed in, as the first
 * guide page did itself (D-151); `safeNext` is the one check, so it is never anywhere else.
 */
export function signInFor(pathname: string): string {
  const next = safeNext(pathname);
  return next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in';
}

// ---- A masquerade's two refusals (D-162 3b, spec § 6 Web) ----------------------------------------
//
// During a masquerade every write but Extend, Exit and Sign Out answers 403 `masquerade_blocked`,
// and a session that has ended answers 409 `masquerade_ended` with where to go. Every client in this
// app (the portal's repository below, the Console's and masquerade's own) hands its refusals to
// `masqueradeRefusal` first. The 401 above is unchanged.

/** The window event that opens the blocked dialog; its `detail` names the attempt when known. */
export const MASQUERADE_BLOCKED_EVENT = 'ai-masquerade-blocked';
export interface MasqueradeBlockedDetail {
  attempt: string | null;
}

/** A path on this site, or `/`: a redirect from the API is followed only within the app. */
export const sitePath = (url: unknown): string =>
  typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') ? url : '/';

/** Open the blocked dialog. */
export function masqueradeBlocked(attempt: string | null): void {
  window.dispatchEvent(new CustomEvent<MasqueradeBlockedDetail>(MASQUERADE_BLOCKED_EVENT, { detail: { attempt } }));
}

/**
 * Act on a masquerade refusal: 409 `masquerade_ended` goes to its `redirect`; 403
 * `masquerade_blocked` opens the blocked dialog. Answers which it was, or null for anything else.
 */
export function masqueradeRefusal(
  status: number,
  body: unknown,
  attempt: string | null = null,
): 'ended' | 'blocked' | null {
  const b = (body ?? {}) as { code?: unknown; redirect?: unknown };
  if (status === 409 && b.code === 'masquerade_ended') {
    navigation.assign(sitePath(b.redirect));
    return 'ended';
  }
  if (status === 403 && b.code === 'masquerade_blocked') {
    masqueradeBlocked(attempt);
    return 'blocked';
  }
  return null;
}

/** A response's JSON, or `{}` when it has none. */
const bodyOf = (res: Response): Promise<unknown> =>
  Promise.resolve()
    .then(() => res.json())
    .catch(() => ({}));

/** What a blocked write says, inline, where a form shows its errors. */
export const BLOCKED_MESSAGE = 'Blocked while masquerading. Exit to continue.';

/**
 * D-224: the API answered 429 (§ 9.4's per-session limit). Thrown, never returned as data, so a refetch keeps
 * what the page already shows and React Query waits `retryAfterMs` (the limiter's own `retry-after`) before it
 * asks again (`main.tsx`). A page that has nothing yet waits too, instead of crashing into the error screen.
 */
export class RateLimitedError extends Error {
  readonly retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitedError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** The wait a 429 names: `retry-after` in seconds (the limiter's header), else 5 s; never under 1 s. */
export function retryAfterMs(res: Response): number {
  const s = Number(res.headers.get('retry-after'));
  return Number.isFinite(s) && s > 0 ? Math.max(1000, s * 1000) : 5000;
}

/** A 429's error, from its response. */
export async function rateLimited(res: Response): Promise<RateLimitedError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new RateLimitedError(body.error ?? 'Too many requests', retryAfterMs(res));
}

/** The longest a write waits on a 429 before its one retry. Past this it reports the refusal instead. */
export const WRITE_RETRY_MAX_MS = 20_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * One write, retried once after a 429. The limiter refuses before the route runs, so a 429 changed nothing
 * and asking again is safe (a toggle cannot toggle twice). A check that hit the limit therefore saves a few
 * seconds late instead of saying "That check didn't save."
 */
export async function sendWrite(send: () => Promise<Response>): Promise<Response> {
  const res = await send();
  if (res.status !== 429) return res;
  const wait = retryAfterMs(res);
  if (wait > WRITE_RETRY_MAX_MS) return res;
  await sleep(wait);
  return send();
}

/**
 * D-246 (H-7): a request the API refused or failed, with the API's own words when it sent some
 * (`serverMessage`): a 403's "needs the Publish modules permission", a 409's "Someone changed this week",
 * a 500's nothing. `useMutate` and `useAct` show `serverMessage` as the error toast, or a plain
 * "Something went wrong" when there is none. `quiet` is a failure the page already handles by leaving
 * (a 401 on its way to /sign-in, a masquerade that ended), so no toast is shown for it.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly serverMessage: string | null;
  readonly quiet: boolean;
  constructor(status: number, serverMessage: string | null, quiet = false) {
    super(serverMessage ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.serverMessage = serverMessage;
    this.quiet = quiet;
  }
}

async function parse(res: Response, attempt: string | null = null): Promise<unknown> {
  if (res.status === 429) throw await rateLimited(res);
  if (res.status === 401) {
    navigation.toSignIn();
    throw new HttpError(401, 'Not signed in', true);
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const masq = masqueradeRefusal(res.status, body, attempt);
  // A blocked write changed nothing: it resolves like a 422, so the form shows it and moves on.
  if (masq === 'blocked') return { error: body.error ?? BLOCKED_MESSAGE };
  if (!res.ok && res.status !== 422) throw new HttpError(res.status, typeof body.error === 'string' && body.error.trim() ? body.error : null, masq === 'ended');
  return body;
}

/**
 * Phase 08 § 8.2's two download routes.
 *
 * Every segment is percent-encoded. A resource id is opaque and a skill file is named by the admin
 * who uploaded it, so neither can be trusted to be path-safe: an un-encoded `/` or `..` in a file
 * name would silently address a different route.
 */
export const fileRoute = (ref: StoredFileRef): string =>
  ref.kind === 'resource'
    ? `/api/files/resource/${encodeURIComponent(ref.id)}`
    : `/api/files/module/${encodeURIComponent(ref.moduleId)}/${encodeURIComponent(ref.fileName)}`;

/** D-185: only the two appearance fields, and only their known values, go to or come from the API. */
export function appearanceOf(value: unknown): AppearancePrefs {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const out: AppearancePrefs = {};
  if (raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  if (raw.sidebar === 'full' || raw.sidebar === 'rail') out.sidebar = raw.sidebar;
  return out;
}

/**
 * D-224: how often the event stream may make a page refetch. The server sends `changed` to every open tab after
 * every commit by anyone (§ 7.6), so during a live build each learner's tab heard every other learner's check
 * and refetched its snapshot and course each time: a few busy minutes spent the whole 100-a-minute budget
 * (§ 9.4), and then checks failed to save and pages failed to load. Now a burst of `changed` is one refresh,
 * at most one per this many ms; the learner's own changes still show at once (each write refetches itself).
 */
export const CHANGED_EVERY_MS = 5000;
/** The first refresh after a quiet spell waits this long, so a burst of commits is one refresh. */
export const CHANGED_SETTLE_MS = 300;
/** A stream the server refused (a 429 or 503) is reopened after this long, doubling up to the cap. */
const STREAM_RETRY_MS = 15_000;
const STREAM_RETRY_MAX_MS = 120_000;

export function createHttpRepository(): LmsRepository {
  const listeners = new Set<() => void>();
  let events: EventSource | null = null;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastRefresh = 0;
  let streamRetry = STREAM_RETRY_MS;

  const notify = () => {
    pending = null;
    lastRefresh = Date.now();
    listeners.forEach((f) => f());
  };
  /** A `changed` from the stream: one refresh per burst, and none sooner than CHANGED_EVERY_MS after the last. */
  const onChanged = () => {
    if (pending) return;
    pending = setTimeout(notify, Math.max(CHANGED_SETTLE_MS, lastRefresh + CHANGED_EVERY_MS - Date.now()));
  };

  const ensureStream = () => {
    if (events) return;
    try {
      const stream = new EventSource('/api/events');
      events = stream;
      let opened = false;
      stream.addEventListener('changed', onChanged);
      stream.addEventListener('open', () => {
        // A stream that comes back may have missed a commit while it was down: catch up once.
        if (opened || streamRetry !== STREAM_RETRY_MS) onChanged();
        opened = true;
        streamRetry = STREAM_RETRY_MS;
      });
      stream.addEventListener('error', () => {
        // The browser reconnects a dropped stream itself (CONNECTING). A refused one (a 429 or 503 answer) is
        // CLOSED for good, which left the tab without updates: open it again later, backing off.
        if (stream.readyState !== EventSource.CLOSED || events !== stream) return;
        events = null;
        const wait = streamRetry;
        streamRetry = Math.min(STREAM_RETRY_MAX_MS, streamRetry * 2);
        setTimeout(() => { if (listeners.size) ensureStream(); }, wait);
      });
    } catch {
      /* no stream: the UI still refetches after each mutation */
    }
  };

  return {
    source: 'http',
    viewer: () =>
      fetch('/api/me', { credentials: 'include' })
        .then(parse)
        .then((b) => (b as { viewer: Viewer }).viewer),
    snapshot: () => fetch('/api/snapshot', { credentials: 'include' }).then(parse) as Promise<Db>,
    // D-185: the person's own theme and sidebar, read afresh (another device may have changed them).
    prefs: () =>
      fetch('/api/me', { credentials: 'include' })
        .then(parse)
        .then((b) => appearanceOf((b as { prefs?: unknown }).prefs)),
    savePrefs: async (patch: AppearancePrefs) => {
      await fetch('/api/me/prefs', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(appearanceOf(patch)),
      }).then((res) => parse(res, 'PATCH /api/me/prefs'));
    },
    run: <K extends MutationName>(name: K, args: MutationArgs<K>) =>
      sendWrite(() =>
        fetch(`/api/mutate/${name}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(args),
        }),
      )
        .then((res) => parse(res, `POST /api/mutate/${name}`))
        .then((r) => {
          // The caller refetches after its own write (`useMutate`), so the stream's echo of this commit can
          // wait for the next window rather than refetch again straight away.
          lastRefresh = Date.now();
          return r;
        }) as Promise<MutationResult>,
    // D-172: an audited Build action; a masquerade's refusal resolves as the mutation's does.
    act: <K extends AdminActionName>(name: K, args: AdminActionArgs<K>) =>
      fetch(`/api/admin/actions/${name}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      }).then((res) => parse(res, `POST /api/admin/actions/${name}`)) as Promise<MutationResult>,
    // D-246 (H-9): Resend Invite and Send Nudge send their email; the answer's toast says what happened.
    emailLearner: (kind: LearnerEmailKind, userId: string) => {
      const path = `/api/learners/${encodeURIComponent(userId)}/${kind === 'invite' ? 'resend-invite' : 'nudge'}`;
      return fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }).then((res) => parse(res, `POST ${path}`)) as Promise<MutationResult>;
    },
    // § 8.2: the browser navigates here and the route streams the file (D-188; it used to 302). The URL is
    // returned rather than fetched, because the redirect has to be followed by the browser itself
    // for the download to land in the downloads tray.
    fileUrl: fileRoute,
    // D-188: the upload route mints the key and a presigned PUT; the browser sends the file straight to
    // the bucket. A refusal at either step is said, never turned into a success.
    async upload(file: File, onProgress?: (fraction: number) => void): Promise<UploadResult> {
      const check = checkFile(file);
      if (!check.ok) return check;
      const res = await fetch('/api/files/upload-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType: check.type, size: file.size, name: file.name }),
      });
      const body = (await parse(res, 'POST /api/files/upload-url')) as { key?: string; url?: string; error?: string };
      if (!res.ok || typeof body.key !== 'string' || typeof body.url !== 'string') return { ok: false, error: UPLOAD_COPY.failed };
      onProgress?.(0);
      if (!(await putFile(body.url, file, check.type, onProgress))) return { ok: false, error: UPLOAD_COPY.failed };
      onProgress?.(1);
      return { ok: true, file: { key: body.key, name: file.name, size: file.size, type: check.type } };
    },
    async joinTicket(sessionId: string): Promise<JoinTicket> {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/join`, {
        credentials: 'include',
      });
      // A 409 is not a failure. § 8.4 returns it whenever `joinMode(session, now) === 'disabled'`,
      // which is the ordinary state of every session until 15 minutes before it starts — so it must
      // resolve, like a 422 does, instead of throwing a crash the button has nowhere to put.
      if (res.status === 409) {
        // Unless it is a masquerade that has ended (D-162 3b), which goes where the API says.
        if (masqueradeRefusal(409, await bodyOf(res)) === 'ended') throw new Error('Masquerade ended');
        return { kind: 'shut' };
      }
      // During a masquerade the join is refused (attendance, D-162): the blocked dialog says so.
      const body = (await parse(res, `GET /api/sessions/${sessionId}/join`)) as { url?: string; error?: string };
      if (res.status === 403) return { kind: 'shut' };
      // A 200 with no URL would be a server bug; treating it as shut keeps the viewer from being
      // handed `window.open(undefined)`, which opens a blank tab on this origin.
      return body.url ? { kind: 'open', url: body.url } : { kind: 'shut' };
    },
    subscribe(f) {
      ensureStream();
      listeners.add(f);
      return () => {
        listeners.delete(f);
        if (listeners.size === 0) {
          events?.close();
          events = null;
        }
      };
    },
  };
}
