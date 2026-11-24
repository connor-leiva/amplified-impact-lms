// D-241: test data for the buyer's pages: the real catalog, as `GET /api/skills` answers a $37 buyer.
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '@ai/core/skills';
import type { ApiSkill, SkillsPayload } from '../Library.vm';
import type { OutlineWeek } from './buyer.vm';

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


/**
 * A made-up course outline, as `GET /api/course` answers a buyer: nine weeks, each as a locked week's outline. The
 * course's real words are data (D-173) and never in code, so these stand in for them.
 */
export const OUTLINE: OutlineWeek[] = Array.from({ length: 9 }, (_, week) => ({
  week,
  title: week === 0 ? 'Week Zero Setup' : `Sample Week ${week}`,
  question: `Sample question ${week}?`,
  outcome: `Sample outcome ${week}.`,
}));
