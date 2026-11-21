// D-231: what the Community reads and writes, the API's own routes (`apps/api/src/routes/community.ts`), and nothing
// else. Each read loads inside the page (the shell is already drawn); every write refreshes both.
import { useQuery } from '@tanstack/react-query';
import { COMMUNITY_ERRORS, COMMUNITY_PATH, communityThreadPath } from '@ai/core/community';
import type { CommunityList, CommunityThread } from '@ai/core/community';

export type CommunityLoad<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T }
  /** 404: a thread that's gone (or this viewer may not see). */
  | { kind: 'missing' }
  /** 403: a learner whose plan hasn't the course. */
  | { kind: 'not-member' }
  | { kind: 'failed' };

async function read<T>(url: string): Promise<Exclude<CommunityLoad<T>, { kind: 'loading' }>> {
  try {
    const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 404) return { kind: 'missing' };
    if (res.status === 403) return { kind: 'not-member' };
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', data: (await res.json()) as T };
  } catch {
    return { kind: 'failed' };
  }
}

export const COMMUNITY_KEY = ['learn', 'community'] as const;
export const threadKey = (id: string) => [...COMMUNITY_KEY, 'thread', id] as const;

export function useCommunityList(): CommunityLoad<CommunityList> {
  return useQuery({ queryKey: COMMUNITY_KEY, queryFn: () => read<CommunityList>(COMMUNITY_PATH) }).data ?? { kind: 'loading' };
}

export function useCommunityThread(id: string): CommunityLoad<CommunityThread> {
  return useQuery({ queryKey: threadKey(id), queryFn: () => read<CommunityThread>(communityThreadPath(id)) }).data ?? { kind: 'loading' };
}

/** A refusal in the server's words, with its field errors when it names fields (a new thread's three checks). */
export class CommunityRefusal extends Error {
  constructor(message: string, readonly errors?: Partial<Record<'space' | 'title' | 'details', string>>, readonly status?: number) {
    super(message);
  }
}

/** A write: JSON, same origin. Resolves with the answer; rejects with a `CommunityRefusal` in the server's words. */
export async function send<T>(method: 'POST' | 'PATCH', url: string, body: unknown, fetcher: typeof fetch = fetch): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(url, { method, credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new CommunityRefusal(COMMUNITY_ERRORS.saveFailed);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: unknown; errors?: CommunityRefusal['errors'] };
  if (!res.ok) throw new CommunityRefusal(typeof json.error === 'string' ? json.error : COMMUNITY_ERRORS.saveFailed, json.errors, res.status);
  return json as T;
}
