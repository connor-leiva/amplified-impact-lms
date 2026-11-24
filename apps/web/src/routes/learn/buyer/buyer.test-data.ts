// D-241: test data for the buyer's pages: the real catalog, as `GET /api/skills` answers a $37 buyer.
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '@ai/core/skills';
import type { ApiSkill, SkillsPayload } from '../Library.vm';

/** The whole catalog as `GET /api/skills` answers a buyer: the bought ones (the latest first) and the free ones open. */
export function catalogAnswer(bought: readonly string[], over: Partial<SkillsPayload> = {}): SkillsPayload {
  const rows: ApiSkill[] = [
    ...SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, summary: s.summary, sets: s.sets, files: Object.keys(s.files) as ApiSkill['files'] })),
    ...GROK_TEMPLATES.map((g) => ({ id: g.id, title: g.title, summary: g.summary, sets: g.sets, files: ['grok'] as ApiSkill['files'] })),
  ]
    .map((s) => {
      const free = FREE_SKILLS.includes(s.id);
      return { ...s, free, releasedAt: LAUNCH_RELEASE, state: free || bought.includes(s.id) ? ('open' as const) : ('locked' as const), opensAt: null };
    })
    .sort((a, b) => a.releasedAt - b.releasedAt || a.title.localeCompare(b.title));
  return { skills: rows, plans: [], accessGroups: [], purchased: [...bought], ...over };
}

