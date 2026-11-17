import type { Db } from '@ai/core';
import type {
  JoinTicket,
  LmsRepository,
  MutationArgs,
  MutationName,
  MutationResult,
  StoredFileRef,
  Viewer,
} from './repository';

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
  toSignIn: () => location.replace('/sign-in'),
  /** A masquerade's end (D-162 3b): a full page load to where the API sends staff back. */
  assign: (url: string) => location.assign(url),
};

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

async function parse(res: Response, attempt: string | null = null): Promise<unknown> {
  if (res.status === 401) {
    navigation.toSignIn();
    throw new Error('Not signed in');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const masq = masqueradeRefusal(res.status, body, attempt);
  // A blocked write changed nothing: it resolves like a 422, so the form shows it and moves on.
  if (masq === 'blocked') return { error: body.error ?? BLOCKED_MESSAGE };
  if (!res.ok && res.status !== 422) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/**
 * Phase 08 § 8.2's two download routes.
 *
 * Every segment is percent-encoded. A resource id is opaque and a skill file is named by the admin
 * who uploaded it, so neither can be trusted to be path-safe: an un-encoded `/` or `..` in a file
 * name would silently address a different route.
 */
const fileRoute = (ref: StoredFileRef): string =>
  ref.kind === 'resource'
    ? `/api/files/resource/${encodeURIComponent(ref.id)}`
    : `/api/files/module/${encodeURIComponent(ref.moduleId)}/${encodeURIComponent(ref.fileName)}`;

export function createHttpRepository(): LmsRepository {
  const listeners = new Set<() => void>();
  let events: EventSource | null = null;

  const ensureStream = () => {
    if (events) return;
    try {
      events = new EventSource('/api/events');
      events.addEventListener('changed', () => listeners.forEach((f) => f()));
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
    run: <K extends MutationName>(name: K, args: MutationArgs<K>) =>
      fetch(`/api/mutate/${name}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      }).then((res) => parse(res, `POST /api/mutate/${name}`)) as Promise<MutationResult>,
    // § 8.2: the browser navigates here and the route 302-redirects to a presigned GET. The URL is
    // returned rather than fetched, because the redirect has to be followed by the browser itself
    // for the download to land in the downloads tray.
    fileUrl: fileRoute,
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
