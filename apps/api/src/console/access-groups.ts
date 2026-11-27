// R-5 Phase 7 (D-268): People › an access group's tab (Utah Life), its record and its two writes.
//
//   GET  /api/console/groups/:groupId            its record, its agents and what they opened most (users.read)
//   POST /api/console/groups/:groupId/addresses  "Add an address outside the domain…": one row of
//                                                `access_group_members` (access_group.write: Owner and Admin)
//   POST /api/console/groups/:groupId/end        "End access…": `expires_at` set to now, with a reason (the same)
//   POST /api/console/groups/:groupId/export     its agents as CSV (export, audited as `user.export`)
//
// Its agents are D-267's (`accessGroupViews`): the learners in it by their address who are in no cohort. Each write is
// confirmed on screen, writes one `audit_log` row in the same transaction (PLAN.md § 10.7) and nothing else: no email,
// no account, no plan, and nothing to GoHighLevel or Stripe. Taking a group's access away is D-148's own mechanism: the
// grant is worked out on every request, so an ended group opens nothing on its members' next one.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, gte, inArray, isNull, or, gt, sql } from 'drizzle-orm';
import { ACCESS_GROUP_PATHS, cleanReason, programDay, toCsv } from '@ai/core';
import type { AccessGroupAgent, AccessGroupDetail } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { accessGroupMembers, accessGroups, emailVerifications, skillOpensDaily, skills, usageDaily } from '../db/schema';
import { emailDomainOf, normalizeAddress } from '../billing/access-groups';
import { accessGroupViews, cohortRoster } from '../lib/cohort-roster';
import { clock } from '../lib/clock';
import { audit } from './audit';
import { consoleError, requireConsole, staffActor } from './guard';
import { CONSOLE_RATE, limit } from './routes';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DAY_MS = 86_400_000;
/** An address as `access_group_members` takes it: one `@`, a dot in the domain, 254 characters at most. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The group's tab, or null for no such group. */
export async function accessGroupDetail(db: Database, groupId: string, now: number): Promise<AccessGroupDetail | null> {
  const [g] = await db.select().from(accessGroups).where(eq(accessGroups.id, groupId)).limit(1);
  if (!g) return null;
  const views = await accessGroupViews(db, await cohortRoster(db), now);
  const members = views.find((v) => v.id === g.id)?.members ?? [];
  const ids = members.map((m) => m.userId);
  const emails = members.map((m) => normalizeAddress(m.email));
  const [verified, opened, top] = ids.length
    ? await Promise.all([
        db.select({ email: emailVerifications.email, at: emailVerifications.verifiedAt }).from(emailVerifications).where(inArray(emailVerifications.email, emails)),
        db
          .select({ userId: usageDaily.userId, n: sql<number>`sum(${usageDaily.count})::int` })
          .from(usageDaily)
          .where(and(inArray(usageDaily.userId, ids), eq(usageDaily.kind, 'guide_view')))
          .groupBy(usageDaily.userId),
        db
          .select({ skillId: skillOpensDaily.skillId, title: skills.title, n: sql<number>`sum(${skillOpensDaily.count})::int` })
          .from(skillOpensDaily)
          .leftJoin(skills, eq(skills.id, skillOpensDaily.skillId))
          .where(and(inArray(skillOpensDaily.userId, ids), gte(skillOpensDaily.day, programDay(now - 29 * DAY_MS))))
          .groupBy(skillOpensDaily.skillId, skills.title)
          .orderBy(desc(sql`sum(${skillOpensDaily.count})`), skillOpensDaily.skillId)
          .limit(4),
      ])
    : [[], [], []];
  const firstAt = new Map(verified.map((v) => [v.email, Number(v.at)]));
  const openedBy = new Map(opened.map((o) => [o.userId, Number(o.n)]));
  const agents: AccessGroupAgent[] = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
    firstSignIn: firstAt.get(normalizeAddress(m.email)) ?? null,
    last: m.last,
    invited: m.invited,
    skillsOpened: openedBy.get(m.userId) ?? 0,
  }));
  return {
    id: g.id,
    name: g.name,
    plan: g.plan,
    emailDomain: g.emailDomain,
    createdAt: Number(g.createdAt),
    expiresAt: g.expiresAt === null ? null : Number(g.expiresAt),
    agents,
    mostOpened: top.map((t) => ({ skillId: t.skillId, title: t.title ?? t.skillId, count: Number(t.n) })),
  };
}

const paramOf = (req: FastifyRequest, key: string): string => String((req.params as Record<string, unknown>)[key] ?? '');
const bodyOf = (req: FastifyRequest): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};

const iso = (t: number | null): string => (t === null ? '' : new Date(t).toISOString());

export function registerAccessGroupRoutes(scope: FastifyInstance): void {
  const read = { config: limit(CONSOLE_RATE.read) };
  const write = { config: limit(CONSOLE_RATE.write) };

  scope.get(ACCESS_GROUP_PATHS.detail, { ...read, preHandler: [requireSession, requireConsole('users.read')] }, async (req, reply): Promise<FastifyReply> => {
    const id = paramOf(req, 'groupId');
    const detail = ID.test(id) ? await accessGroupDetail(getDb(), id, clock.now()) : null;
    if (!detail) return consoleError(reply, 'not_found');
    return reply.send(detail);
  });

  // "Add an address outside the domain…": the address is listed, so it is in the group once its owner proves it (D-148).
  scope.post(
    ACCESS_GROUP_PATHS.addAddress,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('users.read'), requireConsole('access_group.write')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = paramOf(req, 'groupId');
      const b = bodyOf(req);
      const email = typeof b.email === 'string' ? normalizeAddress(b.email) : '';
      if (!email || email.length > 254 || !ADDRESS.test(email) || emailDomainOf(email) === null)
        return consoleError(reply, 'invalid_body', 'Enter one email address, like name@example.com.');
      const db = getDb();
      const [g] = ID.test(id) ? await db.select().from(accessGroups).where(eq(accessGroups.id, id)).limit(1) : [];
      if (!g) return consoleError(reply, 'not_found');
      const target = { type: 'access_group', id: g.id, label: g.name };
      if (g.emailDomain && emailDomainOf(email) === g.emailDomain)
        return consoleError(reply, 'no_change', `Every ${g.emailDomain} address is in ${g.name} already.`);
      const now = clock.now();
      const added = await db.transaction(async (tx) => {
        const rows = await tx.insert(accessGroupMembers).values({ groupId: g.id, email, addedAt: now }).onConflictDoNothing().returning({ email: accessGroupMembers.email });
        if (!rows.length) return false;
        await audit(req, { action: 'access_group.address_add', outcome: 'ok', actor, target, after: { email } }, tx);
        return true;
      });
      if (!added) return consoleError(reply, 'no_change', `${email} is on ${g.name}’s list already.`);
      return reply.send({ ok: true, email });
    },
  );

  // "End access…": the group's agents lose what it grants on their next request. Their accounts stay.
  scope.post(
    ACCESS_GROUP_PATHS.end,
    { ...write, preHandler: [requireSession, requireJsonSameOrigin, requireConsole('users.read'), requireConsole('access_group.write')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = paramOf(req, 'groupId');
      const reason = cleanReason(bodyOf(req).reason);
      if (reason === null) return consoleError(reply, 'reason_required');
      const db = getDb();
      const [g] = ID.test(id) ? await db.select().from(accessGroups).where(eq(accessGroups.id, id)).limit(1) : [];
      if (!g) return consoleError(reply, 'not_found');
      const now = clock.now();
      const target = { type: 'access_group', id: g.id, label: g.name };
      const ended = await db.transaction(async (tx) => {
        const rows = await tx
          .update(accessGroups)
          .set({ expiresAt: now })
          .where(and(eq(accessGroups.id, g.id), or(isNull(accessGroups.expiresAt), gt(accessGroups.expiresAt, now))))
          .returning({ id: accessGroups.id });
        if (!rows.length) return false;
        await audit(req, { action: 'access_group.end', outcome: 'ok', actor, target, reason, before: { expiresAt: g.expiresAt }, after: { expiresAt: now } }, tx);
        return true;
      });
      if (!ended) return consoleError(reply, 'no_change', `${g.name}’s access has ended already.`);
      return reply.send({ ok: true, expiresAt: now });
    },
  );

  scope.post(
    ACCESS_GROUP_PATHS.export,
    { config: limit(CONSOLE_RATE.export), preHandler: [requireSession, requireJsonSameOrigin, requireConsole('users.read'), requireConsole('export')] },
    async (req, reply): Promise<FastifyReply> => {
      const actor = staffActor(viewerOrThrow(req))!;
      const id = paramOf(req, 'groupId');
      const detail = ID.test(id) ? await accessGroupDetail(getDb(), id, clock.now()) : null;
      if (!detail) return consoleError(reply, 'not_found');
      await audit(req, { action: 'user.export', outcome: 'ok', actor, target: { type: 'access_group', id: detail.id, label: detail.name }, after: { rows: detail.agents.length, format: 'csv' } });
      const csv = toCsv([
        ['user_id', 'name', 'email', 'first_sign_in', 'last_active', 'skills_opened'],
        ...detail.agents.map((a) => [a.userId, a.name, a.email, iso(a.firstSignIn), iso(a.last), a.skillsOpened]),
      ]);
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${detail.id}-agents.csv"`)
        .send(csv);
    },
  );
}
