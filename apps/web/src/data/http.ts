import type { Db } from '@ai/core';
import type { LmsRepository, MutationArgs, MutationName, MutationResult, Viewer } from './repository';

/**
 * The production data source. Phase 07 builds the API behind it; the interface is already fixed,
 * so no screen changes when it lands.
 *
 * A 422 carries a validation message the form renders inline, exactly like the fixture path, so
 * `{ error }` is returned rather than thrown. Any other non-OK status is a real failure.
 */
async function parse(res: Response): Promise<unknown> {
  if (res.status === 401) {
    location.assign('/sign-in');
    throw new Error('Not signed in');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok && res.status !== 422) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

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
