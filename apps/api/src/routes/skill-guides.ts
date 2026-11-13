// The guided setups (DECISIONS.md D-151): each skill's full setup, only to a learner who can open it.
//
//   GET /api/skill-guides/:slug   → the guide at learn's `/skill-library/<slug>`
//
// THE GATE. Signed in (401 otherwise), a learner (403 for staff, as the skill library is), and the
// skill library's one access rule (`stateFor`, from `routes/skills.ts`: `canOpenSkill`, and a Sales
// Agent never opens an owner-and-ops skill). The answer always carries what www shows anyone (the
// title, the steps' titles, the state, and what a locked row says); `guide`, the full setup with every
// step's words, its buttons, the words to paste and the downloads, is there ONLY when the state is
// `open`. A free skill opens for any learner, so a free account is enough; a paid one needs its plan.
//
// WHERE THE SETUPS COME FROM. `apps/web/dist-private/skill-guides.json`, written by the web build from
// the pages' own content (`apps/web/src/guides/setup-export.ts`) and read once at boot by `server.ts`.
// Never a public file, never in a browser bundle. A deploy without it answers 503 rather than an
// empty guide.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { previewOf } from '@ai/core/skill-guides';
import type { SkillGuidesFile } from '@ai/core/skill-guides';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { skills } from '../db/schema';
import { clock } from '../lib/clock';
import { accessOf, groupsView, opensAtFor, stateFor } from './skills';

export const SKILL_GUIDES_PATH = '/api/skill-guides';
const FOR_LEARNERS = 'The skill library is for learners.';
const NOT_FOUND = 'Not found';

export interface SkillGuideRouteOptions {
  /** The build's guides, or null when this deploy has none (every answer is then a 503). */
  guides: SkillGuidesFile | null;
}

export function registerSkillGuideRoutes(app: FastifyInstance, { guides }: SkillGuideRouteOptions): void {
  app.get<{ Params: { slug: string } }>(`${SKILL_GUIDES_PATH}/:slug`, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    // Private: a guide is per viewer, and never kept by a shared cache.
    reply.header('cache-control', 'private, no-store');
    const { actor } = viewerOrThrow(req);
    if (actor.kind !== 'learner') return reply.code(403).send({ error: FOR_LEARNERS });
    if (!guides) {
      req.log.error('skill guides: the build wrote no dist-private/skill-guides.json');
      return reply.code(503).send({ error: 'The guided setups are not available right now.' });
    }
    const guide = Object.prototype.hasOwnProperty.call(guides.guides, req.params.slug) ? guides.guides[req.params.slug] : undefined;
    if (!guide) return reply.code(404).send({ error: NOT_FOUND });

    const access = await accessOf(actor.userId);
    if (!access) return reply.code(403).send({ error: FOR_LEARNERS });
    const [row] = await getDb().select().from(skills).where(eq(skills.id, guide.skill)).limit(1);
    if (!row || row.status !== 'published') return reply.code(404).send({ error: NOT_FOUND });

    const now = clock.now();
    const state = stateFor(access.role, access.plans, row, now);
    const open = state === 'open';
    return reply.send({
      slug: guide.slug,
      skill: guide.skill,
      title: guide.title,
      sets: row.sets,
      free: row.free,
      state,
      opensAt: opensAtFor(state, access.plans, row, now),
      // What a locked one says (D-150): the member's group, by the set it covers; the plans otherwise.
      accessGroups: groupsView(access, [], now).map(({ id, name, covers }) => ({ id, name, covers })),
      paidPlans: access.paidPlans.length > 0,
      // What www shows anyone: each lane's step titles.
      preview: previewOf(guide),
      // The setup itself, for a learner who can open the skill, and nobody else.
      guide: open ? guide : null,
      ui: open ? guides.ui : null,
    });
  });
}
