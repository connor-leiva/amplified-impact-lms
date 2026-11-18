// What the Account page reads (D-178), beyond what the shell already hands it (the snapshot, the viewer
// and the course): two reads that already exist, and no write.
//
//   GET /api/skills         the bought plans, the access groups and each skill's state (D-079, D-148)
//   GET /api/auth/password  whether the viewer has a password, and when it was last set (D-132)
//
// Each is null when it doesn't answer with JSON: signed out, the fixture build (no API), or a failure.
// The page then draws what the snapshot alone supports.

import { useSuspenseQuery } from '@tanstack/react-query';
import type { AccountRead, BillingRead, BillingSkill, PasswordRead } from './Account.vm';

async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** `GET /api/skills`'s body, kept to the fields the page reads. */
export function asBilling(body: unknown): BillingRead | null {
  if (!isObj(body) || !Array.isArray(body.skills)) return null;
  return {
    plans: arr(body.plans)
      .filter(isObj)
      .map((p) => ({ kind: String(p.kind ?? ''), status: String(p.status ?? ''), paidThrough: typeof p.paidThrough === 'number' ? p.paidThrough : null })),
    accessGroups: arr(body.accessGroups)
      .filter(isObj)
      .filter((g) => typeof g.id === 'string' && typeof g.name === 'string')
      .map((g) => ({ id: g.id as string, name: g.name as string })),
    skills: arr(body.skills)
      .filter(isObj)
      .map((s) => ({ sets: s.sets as BillingSkill['sets'], state: s.state as BillingSkill['state'] })),
  };
}

/** `GET /api/auth/password`'s body. */
export function asPassword(body: unknown): PasswordRead | null {
  if (!isObj(body) || typeof body.hasPassword !== 'boolean') return null;
  return { hasPassword: body.hasPassword, changedAt: typeof body.changedAt === 'number' ? body.changedAt : null };
}

export async function fetchAccount(): Promise<AccountRead> {
  const [skills, password] = await Promise.all([getJson('/api/skills'), getJson('/api/auth/password')]);
  return { billing: asBilling(skills), password: asPassword(password) };
}

export const ACCOUNT_KEY = ['learn', 'account'] as const;

/** Both reads, once per visit to the page. */
export function useAccount(): AccountRead {
  return useSuspenseQuery({ queryKey: ACCOUNT_KEY, queryFn: fetchAccount, staleTime: 30_000 }).data;
}
