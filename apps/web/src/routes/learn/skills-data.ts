// What the learner portal v2's Skill Library reads (D-179), and nothing else: the current Skill Library's
// two routes, as they are.
//
//   GET /api/skills               the catalog's skills, each with its state by the one access rule
//   GET /api/skill-guides/:slug   one skill's guided setup when it is open; else its steps' titles and
//                                 its sample output (what www shows anyone)
//
// Each loads inside the page (the shell is already drawn), once per page load.

import { useQuery } from '@tanstack/react-query';
import type { GuideAnswer, SkillsPayload } from './Library.vm';

export type SkillsLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; payload: SkillsPayload }
  /** Not signed in, or no API (the fixture build). */
  | { kind: 'signed-out' }
  | { kind: 'failed' };

export async function fetchSkills(): Promise<Exclude<SkillsLoad, { kind: 'loading' }>> {
  try {
    const res = await fetch('/api/skills', { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 401 || res.status === 404) return { kind: 'signed-out' };
    if (!res.ok) return { kind: 'failed' };
    const body = (await res.json()) as Partial<SkillsPayload>;
    return { kind: 'ready', payload: { ...body, skills: body.skills ?? [] } };
  } catch {
    return { kind: 'signed-out' };
  }
}

export type GuideLoad = { kind: 'loading' } | { kind: 'ready'; answer: GuideAnswer } | { kind: 'missing' } | { kind: 'failed' };

export async function fetchGuide(slug: string): Promise<Exclude<GuideLoad, { kind: 'loading' }>> {
  try {
    const res = await fetch(`/api/skill-guides/${encodeURIComponent(slug)}`, { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 404 || res.status === 403 || res.status === 401) return { kind: 'missing' };
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', answer: (await res.json()) as GuideAnswer };
  } catch {
    return { kind: 'failed' };
  }
}

export const SKILLS_KEY = ['learn', 'skills'] as const;

export function useSkills(): SkillsLoad {
  const q = useQuery({ queryKey: SKILLS_KEY, queryFn: fetchSkills, staleTime: Infinity });
  return q.data ?? { kind: 'loading' };
}

/** One skill's guide, or nothing while `slug` is null. */
export function useGuide(slug: string | null): GuideLoad {
  const q = useQuery({ queryKey: ['learn', 'skill-guide', slug], queryFn: () => fetchGuide(slug!), enabled: slug !== null, staleTime: Infinity });
  return q.data ?? { kind: 'loading' };
}
