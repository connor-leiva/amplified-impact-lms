// The skill library's API (D-079): what a signed-in learner's account can open, and the download.
//
//   GET /api/skills                     → every published skill, each `open`, `locked` or `upcoming`
//   GET /api/skills/:id/download/:kind  → 302 to a short-lived link, or 403 when `canOpenSkill` says no
//
// Signed in, like the Vault, and checked the Vault's way (D-024): the bucket key never leaves the
// server, and the link it signs lasts `GET_EXPIRES_IN` (5 minutes). Every answer goes through
// `canOpenSkill` (billing/access.ts), the one rule.
//
// WHO SEES WHICH SET. An account's plans decide what the team can open; within the team, the owner and
// the operations lead open every set the plans cover, and a sales agent opens the agent set (and the
// free skills). A learner on no account (a cohort learner from before the offer) opens the free skills.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import { requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { accounts, plans, skills, users } from '../db/schema';
import { clock } from '../lib/clock';
import { presignGet, skillFileKey, StorageKeyError } from '../storage';
import { skillOpensAt, skillState } from '../billing/access';
import type { PlanAccess, SkillAccess } from '../billing/access';
import type { PlanKind, PlanStatus, SkillSet } from '../billing/catalog';

export const SKILLS_PATH = '/api/skills';
// `grok`: a Grok Bot template's one ZIP (D-100), loaded from its own catalog (billing/library-rows.ts).
const FILE_KINDS = ['claude', 'chatgpt', 'practice', 'grok'] as const;
type FileKind = (typeof FILE_KINDS)[number];

const LOCKED = 'This skill is not in your plan.';
const NOT_FOUND = 'Not found';

type SkillRow = typeof skills.$inferSelect;

/** The learner, their role and their account's plans, for the access rule. */
async function accessOf(userId: string): Promise<{ role: string | null; tier: string | null; plans: PlanAccess[] } | null> {
  const db = getDb();
  const [user] = await db.select({ teamId: users.teamId, role: users.role, tier: users.tier, kind: users.kind }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.kind !== 'learner') return null;
  if (!user.teamId) return { role: user.role, tier: user.tier, plans: [] };
  const accts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, user.teamId));
  if (!accts.length) return { role: user.role, tier: user.tier, plans: [] };
  const rows = await db.select().from(plans).where(inArray(plans.accountId, accts.map((a) => a.id)));
  return {
    role: user.role,
    tier: user.tier,
    plans: rows.map((p) => ({ kind: p.kind as PlanKind, status: p.status as PlanStatus, startsAt: p.startsAt, paidThrough: p.paidThrough, liveUntil: p.liveUntil })),
  };
}

const asSkill = (s: SkillRow): SkillAccess => ({
  sets: s.sets as SkillSet,
  free: s.free,
  releasedAt: s.releasedAt,
  status: s.status as SkillAccess['status'],
});

/**
 * A sales agent opens the agent set, never an owner-and-ops-only skill: not today, and not on their
 * plan's first day either, so such a skill is never `upcoming` for them unless it is unreleased.
 */
function stateFor(role: string | null, planList: readonly PlanAccess[], s: SkillRow, now: number) {
  const state = skillState(planList, asSkill(s), now);
  const barred = !s.free && role === 'Sales Agent' && s.sets === 'owner_ops';
  if (barred && (state === 'open' || (state === 'upcoming' && s.releasedAt <= now))) return 'locked' as const;
  return state;
}

/** When an `upcoming` skill opens for this viewer (D-140); null for any other state. */
function opensAtFor(state: ReturnType<typeof stateFor>, planList: readonly PlanAccess[], s: SkillRow, now: number): number | null {
  return state === 'upcoming' ? skillOpensAt(planList, asSkill(s), now) : null;
}

export function registerSkillRoutes(app: FastifyInstance): void {
  app.get(SKILLS_PATH, { preHandler: requireSession }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    if (actor.kind !== 'learner') return reply.code(403).send({ error: 'The skill library is for learners.' });
    const access = await accessOf(actor.userId);
    if (!access) return reply.code(403).send({ error: 'The skill library is for learners.' });
    const now = clock.now();
    const rows = await getDb().select().from(skills).where(eq(skills.status, 'published'));
    return reply.send({
      plans: access.plans.map((p) => ({ kind: p.kind, status: p.status, paidThrough: p.paidThrough })),
      // The portal shows the Team Hub to a Team tier learner; so does this page's link to it (D-119).
      teamHub: access.tier === 'team',
      skills: rows
        .sort((a, b) => a.releasedAt - b.releasedAt || a.title.localeCompare(b.title))
        .map((s) => {
          const state = stateFor(access.role, access.plans, s, now);
          return {
            id: s.id,
            title: s.title,
            summary: s.summary,
            sets: s.sets,
            free: s.free,
            releasedAt: s.releasedAt,
            state,
            // The day the screen's "Coming …" names: the release, or the plan's first day (D-140).
            opensAt: opensAtFor(state, access.plans, s, now),
            files: FILE_KINDS.filter((k) => typeof s.files[k] === 'string'),
          };
        }),
    });
  });

  app.get<{ Params: { id: string; kind: string } }>(
    `${SKILLS_PATH}/:id/download/:kind`,
    { preHandler: requireSession },
    async (req, reply): Promise<FastifyReply> => {
      const { actor } = viewerOrThrow(req);
      if (actor.kind !== 'learner') return reply.code(403).send({ error: LOCKED });
      const kind = FILE_KINDS.find((k) => k === req.params.kind) as FileKind | undefined;
      const [skill] = await getDb().select().from(skills).where(eq(skills.id, req.params.id)).limit(1);
      const fileName = kind ? skill?.files[kind] : undefined;
      if (!skill || skill.status !== 'published' || !kind || !fileName) return reply.code(404).send({ error: NOT_FOUND });
      const access = await accessOf(actor.userId);
      if (!access || stateFor(access.role, access.plans, skill, clock.now()) !== 'open') return reply.code(403).send({ error: LOCKED });
      let url: string;
      try {
        url = await presignGet(skillFileKey(skill.id, fileName), fileName);
      } catch (err) {
        if (err instanceof StorageKeyError) return reply.code(404).send({ error: NOT_FOUND });
        throw err;
      }
      req.log.info({ skill: skill.id, kind }, 'skill download');
      return reply.header('cache-control', 'no-store').redirect(url, 302);
    },
  );
}
