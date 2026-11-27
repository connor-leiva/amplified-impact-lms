// The guided setups (DECISIONS.md D-151): each skill's full setup, only when this viewer can open it.
//
//   GET /api/skill-guides/:slug   → the guide at learn's `/skill-library/<slug>`
//
// THE GATE. Signed in (401 otherwise), then the skill library's one access rule (`stateFor`, from
// `routes/skills.ts`: `canOpenSkill`, and a Sales Agent never opens an owner-and-ops skill). A learner
// with no plan opens a free skill and sees a paid one's preview. Staff are not learners, and the library
// list stays closed to them, but a staff session that follows a www "Open the Guided Setup" link used
// to get 403, which the page drew as "We couldn't find that skill." Staff now read a guide the way a
// learner with no plan does: a free skill opens, a paid one stays a preview. The answer always carries
// what www shows anyone (the title, the steps' titles, the sample output, the state, and what a locked
// row says); `guide`, the full setup with every step's words, its buttons, the words to paste and the
// downloads, is there ONLY when the state is `open`. A free skill opens for any learner, so a free
// account is enough; a paid one needs its plan.
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
import { recordSkillOpen, recordUsage } from '../lib/usage';

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
    if (!guides) {
      req.log.error('skill guides: the build wrote no dist-private/skill-guides.json');
      return reply.code(503).send({ error: 'The guided setups are not available right now.' });
    }
    const guide = Object.prototype.hasOwnProperty.call(guides.guides, req.params.slug) ? guides.guides[req.params.slug] : undefined;
    if (!guide) return reply.code(404).send({ error: NOT_FOUND });

    const [row] = await getDb().select().from(skills).where(eq(skills.id, guide.skill)).limit(1);
    if (!row || row.status !== 'published') return reply.code(404).send({ error: NOT_FOUND });

    // Staff have no plan. A free skill still opens, so the www button does not say the skill is missing.
    // A paid skill stays locked, the same as for a learner who has not bought it. No usage row: staff
    // are not learners, and `recordUsage` would write nothing for them anyway.
    if (actor.kind !== 'learner') {
      const open = row.free;
      return reply.send(guideAnswer(guides, guide, row, { state: open ? 'open' : 'locked', opensAt: null, accessGroups: [], paidPlans: false, open }));
    }

    const access = await accessOf(actor.userId);
    if (!access) return reply.code(403).send({ error: FOR_LEARNERS });

    const now = clock.now();
    const state = stateFor(access.role, access.plans, row, now, access.purchased.has(row.id));
    const open = state === 'open';
    recordUsage(req, actor.userId, 'guide_view'); // D-166: a usage count (skipped in a masquerade); it changes nothing here.
    recordSkillOpen(req, actor.userId, row.id); // D-268: which skill, for People › Utah Life's Most opened; changes nothing here.
    return reply.send(
      guideAnswer(guides, guide, row, {
        state,
        opensAt: opensAtFor(state, access.plans, row, now),
        // What a locked one says (D-150): the member's group, by the set it covers; the plans otherwise.
        accessGroups: groupsView(access, [], now).map(({ id, name, covers }) => ({ id, name, covers })),
        paidPlans: access.paidPlans.length > 0,
        open,
      }),
    );
  });
}

/** The guide answer. `guide` and `ui` ride along only when this viewer can open the skill. */
function guideAnswer(
  guides: SkillGuidesFile,
  guide: SkillGuidesFile['guides'][string],
  row: { sets: string; free: boolean },
  view: { state: 'open' | 'locked' | 'upcoming'; opensAt: number | null; accessGroups: { id: string; name: string; covers: string[] }[]; paidPlans: boolean; open: boolean },
) {
  return {
    slug: guide.slug,
    skill: guide.skill,
    title: guide.title,
    sets: row.sets,
    free: row.free,
    state: view.state,
    opensAt: view.opensAt,
    accessGroups: view.accessGroups,
    paidPlans: view.paidPlans,
    // What www shows anyone: each lane's step titles.
    preview: previewOf(guide),
    // D-179: its sample output, made up and public on www, for the locked preview; null when the page has none.
    sample: guide.sample ?? null,
    // The setup itself, for a viewer who can open the skill, and nobody else.
    guide: view.open ? guide : null,
    ui: view.open ? guides.ui : null,
  };
}
