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
 * `location.assign` is an unforgeable own property that cannot be spied on or replaced. A full page
 * load is deliberate — it discards every cached snapshot belonging to the session that just ended.
 */
export const navigation = {
  toSignIn: () => location.assign('/sign-in'),
};

async function parse(res: Response): Promise<unknown> {
  if (res.status === 401) {
    navigation.toSignIn();
    throw new Error('Not signed in');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
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
      }).then(parse) as Promise<MutationResult>,
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
      if (res.status === 409) return { kind: 'shut' };
      const body = (await parse(res)) as { url?: string };
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
