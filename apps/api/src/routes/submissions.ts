// D-230 (IMPLEMENTATION-SPEC.md B-24 to B-28): Turn in's server. A team's owner and operator put files in the bucket
// with a presigned PUT, then turn them in for a step that asks for them; staff list what came in, download it, and
// set what they did with it, which never reaches the team (B-25).
//
//   POST /api/submissions/upload-url               one file's PUT { name, size } → { key, url, contentType }
//   POST /api/submissions                          turn in { moduleId, kind, files[{ key, name }], note, minutes }
//   GET  /api/submissions?moduleId=                the team's latest turn-in per kind for a week. No status.
//   GET  /api/submissions/:id/files/:n             one file, as a download (the team's owner and operator, or staff)
//   GET  /api/admin/submissions?moduleId=          staff: every turn-in for a week, every version, with status
//   POST /api/admin/submissions/:id/status         staff: { status }, audited as `submission.status`
//
// A turned-in file is never shown in the browser: every download is an attachment typed as bytes, with `nosniff` and
// a sandbox policy, because a team can turn in an HTML report and this is the app's own origin.
// Nothing here emails anyone ("Goes to Connor’s team. Nothing is emailed.").

import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { can } from '@ai/core';
import { isWeekModule } from '@ai/core/course';
import { weekOpenFor } from '@ai/core/release';
import {
  SUBMISSION_ERRORS,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_MAX_FILES,
  asksOf,
  cleanMinutes,
  cleanNote,
  isSubmissionKind,
  isSubmissionStatus,
  mayTurnIn,
  submissionTypeFor,
} from '@ai/core/submissions';
import type { SubmissionAsk, SubmissionFile, SubmissionKind, SubmissionStatus } from '@ai/core/submissions';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import type { SessionViewer } from '../auth';
import { audit } from '../console/audit';
import { staffActor } from '../console/guard';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { submissions, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { courseEntryFor } from '../lib/course-access';
import { checkTeam } from './intake';
import { ObjectMissingError, StorageKeyError, contentDisposition, getObject, headObject, presignPut } from '../storage';

export const SUBMISSIONS_PATH = '/api/submissions';
export const SUBMISSIONS_UPLOAD_PATH = '/api/submissions/upload-url';
export const SUBMISSION_FILE_PATH = '/api/submissions/:id/files/:n';
export const ADMIN_SUBMISSIONS_PATH = '/api/admin/submissions';
export const ADMIN_SUBMISSION_STATUS_PATH = '/api/admin/submissions/:id/status';
export const submissionFileHref = (id: number, n: number): string => `/api/submissions/${id}/files/${n}`;

/** Where a team's files go: `submissions/<team>/<uuid>.<ext>`, so a turn-in can only name its own team's. */
const prefixOf = (teamId: string): string => `submissions/${teamId}/`;
const KEY = /^submissions\/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|html|htm|png|jpg|jpeg|xlsx|csv)$/;
const extOf = (name: string): string => name.slice(name.lastIndexOf('.') + 1).toLowerCase();
const idOf = (v: unknown): number | null => (typeof v === 'string' && /^\d{1,9}$/.test(v) ? Number(v) : null);

type Row = typeof submissions.$inferSelect;

interface Member {
  id: string;
  teamId: string;
  role: string | null;
}

/** The learner's team and role, when they are on a team. */
async function memberOf(userId: string): Promise<Member | null> {
  const [row] = await getDb().select({ id: users.id, teamId: users.teamId, role: users.role }).from(users).where(and(eq(users.id, userId), eq(users.kind, 'learner')));
  return row?.teamId ? { id: row.id, teamId: row.teamId, role: row.role } : null;
}

/** B-26: the owner or the operator of a team whose plan has the course. Null for anyone else. */
async function turnerOf(viewer: SessionViewer, now: number): Promise<Member | null> {
  if (viewer.user.kind !== 'learner') return null;
  const me = await memberOf(viewer.user.id);
  if (!me || !mayTurnIn(me.role)) return null;
  return (await courseEntryFor(getDb(), me.id, now)).open ? me : null;
}

/** Staff who may read what teams turn in: those who may view learners. */
async function staffReader(viewer: SessionViewer): Promise<boolean> {
  if (viewer.user.kind !== 'staff') return false;
  return can(await loadDb(getDb()), viewer.actor, 'viewLearners');
}

/** The step that asks for this kind in a week open to this learner, or null. */
async function askOf(moduleId: unknown, kind: SubmissionKind, me: Member, now: number): Promise<SubmissionAsk | null> {
  if (typeof moduleId !== 'string') return null;
  const snapshot = await loadDb(getDb());
  const mod = snapshot.modules.find((m) => m.id === moduleId);
  if (!mod || !isWeekModule(mod)) return null;
  const entry = await courseEntryFor(getDb(), me.id, now);
  if (!weekOpenFor(mod, now, entry)) return null;
  return asksOf(mod).find((a) => a.kind === kind) ?? null;
}

/** The names behind a set of user ids, for "by Alex Morgan". */
async function namesOf(ids: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const rows = await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** A turn-in as its team sees it. No status (B-25). */
const teamView = (r: Row, names: Map<string, string>) => ({
  id: r.id,
  kind: r.kind,
  files: r.files.map((f, n) => ({ name: f.name, size: f.size, href: submissionFileHref(r.id, n) })),
  note: r.note,
  minutes: r.minutes,
  by: names.get(r.byUserId) ?? '',
  at: r.createdAt,
});

/** One stored file, as a download only: typed as bytes, never sniffed, never run. */
async function sendFile(reply: FastifyReply, file: SubmissionFile): Promise<FastifyReply> {
  let obj;
  try {
    obj = await getObject(file.key);
  } catch (err) {
    if (err instanceof StorageKeyError || err instanceof ObjectMissingError) return reply.code(404).send({ error: 'Not found' });
    throw err;
  }
  reply
    .code(200)
    .header('content-type', 'application/octet-stream')
    .header('content-disposition', contentDisposition(file.name, 'attachment'))
    .header('x-content-type-options', 'nosniff')
    .header('content-security-policy', "sandbox; default-src 'none'")
    .header('cache-control', 'private, no-store');
  if (obj.contentLength !== undefined) reply.header('content-length', String(obj.contentLength));
  return reply.send(obj.body);
}

export function registerSubmissionRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireSession };
  const write = { preHandler: [requireSession, requireJsonSameOrigin] };

  // B-24: one file's presigned PUT. The type comes from the name; the PUT signs it; the turn-in checks the stored size.
  app.post(SUBMISSIONS_UPLOAD_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const me = await turnerOf(viewerOrThrow(req), clock.now());
    if (!me) return reply.code(403).send({ error: SUBMISSION_ERRORS.notYours });
    const body = (req.body ?? {}) as { name?: unknown; size?: unknown };
    const name = typeof body.name === 'string' ? body.name : '';
    const size = typeof body.size === 'number' ? body.size : Number.NaN;
    const contentType = submissionTypeFor(name);
    if (!contentType || !Number.isFinite(size) || size <= 0 || size > SUBMISSION_MAX_BYTES) return reply.code(422).send({ error: SUBMISSION_ERRORS.badFile });
    const key = `${prefixOf(me.teamId)}${randomUUID()}.${extOf(name)}`;
    return reply.code(200).send({ key, url: await presignPut(key, contentType), contentType });
  });

  // B-24, B-25: turn in. Every file must be this team's, in the bucket, at most 25 MB; a new version is a new row.
  app.post(SUBMISSIONS_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const now = clock.now();
    const me = await turnerOf(viewerOrThrow(req), now);
    if (!me) return reply.code(403).send({ error: SUBMISSION_ERRORS.notYours });
    const body = (req.body ?? {}) as { moduleId?: unknown; kind?: unknown; files?: unknown; note?: unknown; minutes?: unknown };
    const ask = isSubmissionKind(body.kind) ? await askOf(body.moduleId, body.kind, me, now) : null;
    if (!ask || !isSubmissionKind(body.kind)) return reply.code(422).send({ error: SUBMISSION_ERRORS.notAsked });
    const list = Array.isArray(body.files) ? body.files : [];
    if (!list.length) return reply.code(422).send({ error: SUBMISSION_ERRORS.needFile });
    if (list.length > SUBMISSION_MAX_FILES) return reply.code(422).send({ error: SUBMISSION_ERRORS.tooMany });
    const files: SubmissionFile[] = [];
    for (const f of list as { key?: unknown; name?: unknown }[]) {
      const key = typeof f?.key === 'string' ? f.key : '';
      const name = typeof f?.name === 'string' ? f.name.trim().slice(0, 200) : '';
      if (!KEY.test(key) || !key.startsWith(prefixOf(me.teamId)) || !submissionTypeFor(name) || extOf(name) !== extOf(key)) {
        return reply.code(422).send({ error: SUBMISSION_ERRORS.badFile });
      }
      let head;
      try {
        head = await headObject(key);
      } catch (err) {
        if (err instanceof ObjectMissingError || err instanceof StorageKeyError) return reply.code(422).send({ error: SUBMISSION_ERRORS.missingFile });
        throw err;
      }
      if (head.size <= 0 || head.size > SUBMISSION_MAX_BYTES) return reply.code(422).send({ error: SUBMISSION_ERRORS.badFile });
      files.push({ key, name, size: head.size });
    }
    const [row] = await getDb()
      .insert(submissions)
      .values({ teamId: me.teamId, moduleId: body.moduleId as string, kind: body.kind, files, note: cleanNote(body.note), minutes: cleanMinutes(body.minutes), byUserId: me.id, createdAt: now })
      .returning();
    // The step's item that asks for it is done, for the whole team, as a submitted intake's is (D-229).
    await checkTeam(me.teamId, { moduleId: body.moduleId as string, stepId: ask.stepId, itemId: ask.itemId }, now);
    return reply.code(201).send({ sub: teamView(row!, await namesOf([me.id])) });
  });

  // B-25: what the team turned in last, per kind, for a week. Never a status.
  app.get(SUBMISSIONS_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const viewer = viewerOrThrow(req);
    // A staff preview has no team: nothing turned in.
    if (viewer.user.kind !== 'learner') return reply.code(200).send({ subs: {}, preview: true });
    const me = await turnerOf(viewer, clock.now());
    if (!me) return reply.code(403).send({ error: SUBMISSION_ERRORS.notYours });
    const moduleId = (req.query as { moduleId?: unknown }).moduleId;
    if (typeof moduleId !== 'string' || !moduleId) return reply.code(400).send({ error: 'Which week?' });
    const rows = await getDb()
      .select()
      .from(submissions)
      .where(and(eq(submissions.teamId, me.teamId), eq(submissions.moduleId, moduleId)))
      .orderBy(desc(submissions.id));
    const latest = new Map<string, Row>();
    for (const r of rows) if (!latest.has(r.kind)) latest.set(r.kind, r);
    const names = await namesOf([...latest.values()].map((r) => r.byUserId));
    return reply.code(200).send({ subs: Object.fromEntries([...latest].map(([k, r]) => [k, teamView(r, names)])) });
  });

  // A turned-in file, for its team's owner and operator, and for staff who may view learners.
  app.get(SUBMISSION_FILE_PATH, read, async (req, reply): Promise<FastifyReply> => {
    const viewer = viewerOrThrow(req);
    const params = req.params as { id?: string; n?: string };
    const id = idOf(params.id);
    const n = idOf(params.n);
    const [row] = id === null ? [] : await getDb().select().from(submissions).where(eq(submissions.id, id));
    const file = row && n !== null ? row.files[n] : undefined;
    if (!row || !file) return reply.code(404).send({ error: 'Not found' });
    if (viewer.user.kind === 'staff') {
      if (!(await staffReader(viewer))) return reply.code(403).send({ error: 'Not allowed' });
    } else {
      const me = await turnerOf(viewer, clock.now());
      if (!me || me.teamId !== row.teamId) return reply.code(404).send({ error: 'Not found' });
    }
    return sendFile(reply, file);
  });

  // C-20: staff's list for a week: every team, every version, with its status.
  app.get(ADMIN_SUBMISSIONS_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    if (!(await staffReader(viewerOrThrow(req)))) return reply.code(403).send({ error: 'Not allowed' });
    const moduleId = (req.query as { moduleId?: unknown }).moduleId;
    if (typeof moduleId !== 'string' || !moduleId) return reply.code(400).send({ error: 'Which week?' });
    const rows = await getDb().select().from(submissions).where(eq(submissions.moduleId, moduleId)).orderBy(desc(submissions.id));
    const names = await namesOf(rows.flatMap((r) => [r.byUserId, ...(r.statusBy ? [r.statusBy] : [])]));
    const teamIds = [...new Set(rows.map((r) => r.teamId))];
    const teamRows = teamIds.length ? await getDb().select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
    const team = new Map(teamRows.map((t) => [t.id, t.name]));
    return reply.code(200).send({
      subs: rows.map((r) => ({ ...teamView(r, names), team: team.get(r.teamId) ?? '', status: r.status, statusAt: r.statusAt, statusBy: r.statusBy ? (names.get(r.statusBy) ?? '') : null })),
    });
  });

  // C-20: what staff did with it. Audited; the team never sees it.
  app.post(ADMIN_SUBMISSION_STATUS_PATH, write, async (req: FastifyRequest, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const viewer = viewerOrThrow(req);
    if (!(await staffReader(viewer))) return reply.code(403).send({ error: 'Not allowed' });
    const id = idOf((req.params as { id?: string }).id);
    const status = ((req.body ?? {}) as { status?: unknown }).status;
    if (!isSubmissionStatus(status)) return reply.code(400).send({ error: 'Unknown status' });
    const [row] = id === null ? [] : await getDb().select().from(submissions).where(eq(submissions.id, id));
    if (!row) return reply.code(404).send({ error: 'Not found' });
    const now = clock.now();
    await getDb().update(submissions).set({ status, statusAt: now, statusBy: viewer.user.id }).where(eq(submissions.id, row.id));
    const actor = staffActor(viewer);
    if (actor && status !== row.status) {
      await audit(req, {
        action: 'submission.status',
        outcome: 'ok',
        actor,
        target: { type: 'submission', id: String(row.id), label: row.kind },
        before: { status: row.status as SubmissionStatus },
        after: { status },
      });
    }
    return reply.code(200).send({ ok: true, status });
  });
}
