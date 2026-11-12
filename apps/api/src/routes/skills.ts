// The skill library's API (D-079): what a signed-in learner's account can open, and the download.
//
//   GET /api/skills                     → every published skill, each `open`, `locked` or `upcoming`
//   GET /api/skills/:id/download/:kind  → 302 to a short-lived link, or 403 when `canOpenSkill` says no
//   POST /api/skills/welcome/dismiss    → { group }: hide an access group's welcome panel for this
//                                         learner, for good (D-150), on every device
//
// Signed in, like the Vault, and checked the Vault's way (D-024): the bucket key never leaves the
// server, and the link it signs lasts `GET_EXPIRES_IN` (5 minutes). Every answer goes through
// `canOpenSkill` (billing/access.ts), the one rule.
//
// WHO SEES WHICH SET. An account's plans decide what the team can open; within the team, the owner and
// the operations lead open every set the plans cover, and a sales agent opens the agent set (and the
// free skills). A learner on no account (a cohort learner from before the offer) opens the free skills.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { accounts, dismissals, plans, skills, users } from '../db/schema';
import { clock } from '../lib/clock';
import { presignGet, skillFileKey, StorageKeyError } from '../storage';
import { pausedForPayment } from '@ai/core/accelerator';
import { planCovers, skillOpensAt, skillState } from '../billing/access';
import { groupAccessOf } from '../billing/access-groups';
import type { GroupMembership } from '../billing/access-groups';
import type { PlanAccess, SkillAccess } from '../billing/access';
import type { PlanKind, PlanStatus, SkillSet } from '../billing/catalog';

export const SKILLS_PATH = '/api/skills';
// `grok`: a Grok Bot template's one ZIP (D-100), loaded from its own catalog (billing/library-rows.ts).
const FILE_KINDS = ['claude', 'chatgpt', 'practice', 'grok'] as const;
type FileKind = (typeof FILE_KINDS)[number];

const LOCKED = 'This skill is not in your plan.';
const SKILL_SETS: readonly SkillSet[] = ['owner_ops', 'agent', 'both'];

/**
 * D-150: an access group's welcome panel, dismissed, as a row in `dismissals` (the table that holds
 * what a learner has hidden), under an id no announcement can have. Per learner, on every device.
 */
export const welcomeDismissalId = (groupId: string): string => `welcome-${groupId}`;
const welcomeBody = z.strictObject({ group: z.string().min(1).max(64) });
const NOT_FOUND = 'Not found';

type SkillRow = typeof skills.$inferSelect;

/**
 * The learner, their role, and the plans the access rule reads: their account's (bought), and any an
 * access group gives their verified address (D-148). `paidPlans` is the bought ones alone, for what
 * the screen says about billing; `groups` names the groups.
 */
async function accessOf(userId: string): Promise<{
  role: string | null;
  tier: string | null;
  plans: PlanAccess[];
  paidPlans: PlanAccess[];
  groups: GroupMembership[];
  /** Each group's own grant, in `groups`' order: what it opens by itself. */
  groupPlans: PlanAccess[];
} | null> {
  const db = getDb();
  const [user] = await db
    .select({ teamId: users.teamId, role: users.role, tier: users.tier, kind: users.kind, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.kind !== 'learner') return null;
  const group = await groupAccessOf(db, user.email, clock.now());
  const paidPlans = await paidPlansOf(db, user.teamId);
  return { role: user.role, tier: user.tier, plans: [...paidPlans, ...group.plans], paidPlans, groups: group.groups, groupPlans: group.plans };
}

/** The plans the learner's team's accounts hold. */
async function paidPlansOf(db: ReturnType<typeof getDb>, teamId: string | null): Promise<PlanAccess[]> {
  if (!teamId) return [];
  const accts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.teamId, teamId));
  if (!accts.length) return [];
  const rows = await db.select().from(plans).where(inArray(plans.accountId, accts.map((a) => a.id)));
  return rows.map((p) => ({ kind: p.kind as PlanKind, option: p.option, status: p.status as PlanStatus, startsAt: p.startsAt, paidThrough: p.paidThrough, liveUntil: p.liveUntil }));
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
    // D-150: which groups' welcome panels this learner has already put away.
    const hidden = access.groups.length
      ? new Set(
          (
            await getDb()
              .select({ id: dismissals.announcementId })
              .from(dismissals)
              .where(and(eq(dismissals.userId, actor.userId), inArray(dismissals.announcementId, access.groups.map((g) => welcomeDismissalId(g.id)))))
          ).map((r) => r.id),
        )
      : new Set<string>();
    return reply.send({
      // The bought plans only: an access group's grant is not a plan to bill or cancel.
      plans: access.paidPlans.map((p) => ({ kind: p.kind, status: p.status, paidThrough: p.paidThrough })),
      // D-148: the access groups whose entitlement this viewer holds ("Included with your Utah Life team").
      // D-150: with how many agent skills the group's own grant opens today (its welcome panel's
      // count, never a number typed into the page), and whether that panel is still to be shown.
      // Only active groups (`groupAccessOf`: unexpired, address verified), in a fixed order (name, then
      // id), each with the sets its grant covers, so a locked row can name the group that applies.
      accessGroups: access.groups
        .map((g, i) => {
          const grant = access.groupPlans[i];
          return {
            id: g.id,
            name: g.name,
            skills: grant ? rows.filter((s) => s.sets !== 'owner_ops' && skillState([grant], asSkill(s), now) === 'open').length : 0,
            welcome: !hidden.has(welcomeDismissalId(g.id)),
            covers: grant ? SKILL_SETS.filter((set) => planCovers(grant.kind, set)) : [],
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      // D-143: a two-pay AI Accelerator whose second payment failed. Its skills read locked until
      // that invoice is paid; the screen says why, and where to fix it.
      paused: access.plans.some(pausedForPayment),
      // The portal shows the Team Hub to a Team tier learner; so does this page's link to it (D-119).
      // Not for an access group's member who bought nothing (D-148): their account's team of one is how
      // an account is made, not a team they run.
      teamHub: access.tier === 'team' && !(access.groups.length > 0 && access.paidPlans.length === 0),
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

  app.post(`${SKILLS_PATH}/welcome/dismiss`, { preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    const parsed = welcomeBody.safeParse(req.body);
    if (actor.kind !== 'learner' || !parsed.success) return reply.code(400).send({ error: 'Expected a JSON body of { group }.' });
    const access = await accessOf(actor.userId);
    // Only a group the learner is in: nothing else is theirs to hide.
    if (!access?.groups.some((g) => g.id === parsed.data.group)) return reply.code(404).send({ error: NOT_FOUND });
    await getDb()
      .insert(dismissals)
      .values({ userId: actor.userId, announcementId: welcomeDismissalId(parsed.data.group) })
      .onConflictDoNothing();
    return reply.code(200).send({ ok: true });
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
