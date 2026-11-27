// D-236: the seat card form's server. One card per team per week (`team_seat_cards`). The team's Team Owner and
// Operations Lead fill it in; the Operations Lead marks it ready for the owner; only the Team Owner signs. Agents read
// it. Staff read every team's card for a week. Saving it ready, or signed, checks the step's items for the whole team
// on both paths (`seatCardAskOf`), as a submitted intake checks its item (D-229).
//
//   GET  /api/seat-card?moduleId=          the team's card: answers, last save, ready, signed. Staff: a preview, empty.
//   PUT  /api/seat-card                    { moduleId, answers, ready?, sign? }: the owner and the operator
//   GET  /api/seat-card/pdf?moduleId=      the team's card as a PDF (the intake's placeholder look), for the team
//   GET  /api/admin/seat-cards?moduleId=   staff who may view learners: every team's card for the week
//
// Nothing here emails anyone, and nothing goes to GHL.
import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { can, cohortView } from '@ai/core';
import { isWeekModule } from '@ai/core/course';
import type { SeatCard } from '@ai/core/course-types';
import { weekOpenFor } from '@ai/core/release';
import { cleanSeatCardAnswers, mayEditSeatCard, maySignSeatCard, seatCardAskOf, seatCardForm, seatCardMissing, seatCardRole } from '@ai/core/seat-card';
import type { SeatCardAsk } from '@ai/core/seat-card';
import type { AIEmployee } from '@ai/core';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import type { SessionViewer } from '../auth';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { cohorts, teamSeatCards, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { courseEntryFor, viewerCohortId } from '../lib/course-access';
import { seatCardPdfHtml, seatCardPdfName, renderPdf } from '../pdf/render';
import { checkTeam, sendPdf } from './intake';

export const SEAT_CARD_PATH = '/api/seat-card';
export const SEAT_CARD_PDF_PATH = '/api/seat-card/pdf';
export const ADMIN_SEAT_CARDS_PATH = '/api/admin/seat-cards';

/** The server's words for a refusal. The drawer's foot shows them. */
export const SEAT_CARD_ERRORS = {
  notTeam: 'That card is for your team.',
  notEditor: 'That card is for the owner and the AI Implementer.',
  notOwner: 'Only the Team Owner signs.',
  noCard: 'This week has no seat card.',
  missing: 'Answer every line first.',
  secret: 'Never a password.',
  long: 'One answer is too long.',
  preview: 'Preview only',
} as const;

type Row = typeof teamSeatCards.$inferSelect;

interface Member {
  id: string;
  teamId: string;
  role: string | null;
}

async function memberOf(userId: string): Promise<Member | null> {
  const [row] = await getDb().select({ id: users.id, teamId: users.teamId, role: users.role }).from(users).where(and(eq(users.id, userId), eq(users.kind, 'learner')));
  return row?.teamId ? { id: row.id, teamId: row.teamId, role: row.role } : null;
}

/** The week, its seat card and where it asks for it, when the week is open to this learner. Null otherwise. */
async function weekOf(moduleId: unknown, me: Member, now: number): Promise<{ mod: AIEmployee; card: SeatCard; ask: SeatCardAsk } | null> {
  if (typeof moduleId !== 'string' || !moduleId) return null;
  // R-5 Phase 4 (D-261): the week as the learner's own cohort has it (`cohortView`): its opening there, and none for a
  // week their cohort doesn't take.
  const snapshot = cohortView(await loadDb(getDb()), await viewerCohortId(getDb(), me.id));
  const mod = snapshot.modules.find((m) => m.id === moduleId);
  if (!mod || !isWeekModule(mod)) return null;
  const card = mod.course?.seatCard;
  const ask = seatCardAskOf(mod);
  if (!card || !ask) return null;
  if (!weekOpenFor(mod, now, await courseEntryFor(getDb(), me.id, now))) return null;
  return { mod, card, ask };
}

/** Staff who may read every team's card: those who may view learners. */
async function staffReader(viewer: SessionViewer): Promise<boolean> {
  if (viewer.user.kind !== 'staff') return false;
  return can(await loadDb(getDb()), viewer.actor, 'viewLearners');
}

async function namesOf(ids: readonly (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const rows = await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** A card as its team reads it, and as staff list it. */
const cardView = (r: Row | undefined, names: Map<string, string>) => ({
  answers: r?.answers ?? {},
  updatedAt: r?.updatedAt ?? null,
  updatedBy: r ? (names.get(r.updatedBy) ?? '') : null,
  readyAt: r?.readyAt ?? null,
  signedAt: r?.signedAt ?? null,
  signedBy: r?.signedBy ? (names.get(r.signedBy) ?? '') : null,
});

export function registerSeatCardRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireSession };
  const write = { preHandler: [requireSession, requireJsonSameOrigin] };

  app.get(SEAT_CARD_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const viewer = viewerOrThrow(req);
    // A staff preview has no team: the card reads empty and locked, and nothing saves.
    if (viewer.user.kind !== 'learner') return reply.code(200).send({ ...cardView(undefined, new Map()), role: 'agent', preview: true });
    const me = await memberOf(viewer.user.id);
    if (!me) return reply.code(403).send({ error: SEAT_CARD_ERRORS.notTeam });
    const now = clock.now();
    const week = await weekOf((req.query as { moduleId?: unknown }).moduleId, me, now);
    if (!week) return reply.code(404).send({ error: SEAT_CARD_ERRORS.noCard });
    const [row] = await getDb().select().from(teamSeatCards).where(and(eq(teamSeatCards.teamId, me.teamId), eq(teamSeatCards.moduleId, week.mod.id)));
    const names = await namesOf([row?.updatedBy ?? null, row?.signedBy ?? null]);
    return reply.code(200).send({ ...cardView(row, names), role: seatCardRole(me.role), preview: false });
  });

  app.put(SEAT_CARD_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const viewer = viewerOrThrow(req);
    if (viewer.user.kind !== 'learner') return reply.code(403).send({ error: SEAT_CARD_ERRORS.preview });
    const me = await memberOf(viewer.user.id);
    if (!me) return reply.code(403).send({ error: SEAT_CARD_ERRORS.notTeam });
    if (!mayEditSeatCard(me.role)) return reply.code(403).send({ error: SEAT_CARD_ERRORS.notEditor });
    const body = (req.body ?? {}) as { moduleId?: unknown; answers?: unknown; ready?: unknown; sign?: unknown };
    const sign = body.sign === true;
    const ready = body.ready === true || sign;
    if (sign && !maySignSeatCard(me.role)) return reply.code(403).send({ error: SEAT_CARD_ERRORS.notOwner });
    const now = clock.now();
    const week = await weekOf(body.moduleId, me, now);
    if (!week) return reply.code(404).send({ error: SEAT_CARD_ERRORS.noCard });
    const cleaned = cleanSeatCardAnswers(body.answers);
    if (cleaned.secret) return reply.code(422).send({ error: SEAT_CARD_ERRORS.secret });
    if (cleaned.long) return reply.code(422).send({ error: SEAT_CARD_ERRORS.long });
    if (ready && seatCardMissing(cleaned.answers).length) return reply.code(422).send({ error: SEAT_CARD_ERRORS.missing });
    const db = getDb();
    const at = and(eq(teamSeatCards.teamId, me.teamId), eq(teamSeatCards.moduleId, week.mod.id));
    const [prev] = await db.select().from(teamSeatCards).where(at);
    // Ready and signed stay once set: a change after either saves, and the card stays as it was (Connor, Nov 22).
    const readyAt = prev?.readyAt ?? (ready ? now : null);
    const signedAt = prev?.signedAt ?? (sign ? now : null);
    const signedBy = prev?.signedBy ?? (sign ? me.id : null);
    const values = { answers: cleaned.answers as Record<string, string>, updatedAt: now, updatedBy: me.id, readyAt, signedAt, signedBy };
    await db
      .insert(teamSeatCards)
      .values({ teamId: me.teamId, moduleId: week.mod.id, ...values })
      .onConflictDoUpdate({ target: [teamSeatCards.teamId, teamSeatCards.moduleId], set: values });
    // The step's items, for the whole team, on both paths: saving it ready checks the fill items; signing, the sign items too.
    if (ready) for (const itemId of week.ask.fillIds) await checkTeam(me.teamId, { moduleId: week.mod.id, stepId: week.ask.stepId, itemId }, now);
    if (sign) for (const itemId of week.ask.signIds) await checkTeam(me.teamId, { moduleId: week.mod.id, stepId: week.ask.stepId, itemId }, now);
    const [row] = await db.select().from(teamSeatCards).where(at);
    const names = await namesOf([row?.updatedBy ?? null, row?.signedBy ?? null]);
    return reply.code(200).send({ ...cardView(row, names), role: seatCardRole(me.role), preview: false });
  });

  // The team's card as a PDF, for anyone on the team: agents read it too. A staff preview has no team to print.
  app.get(SEAT_CARD_PDF_PATH, read, async (req, reply): Promise<FastifyReply> => {
    const viewer = viewerOrThrow(req);
    const me = viewer.user.kind === 'learner' ? await memberOf(viewer.user.id) : null;
    if (!me) return reply.code(403).send({ error: SEAT_CARD_ERRORS.notTeam });
    const now = clock.now();
    const week = await weekOf((req.query as { moduleId?: unknown }).moduleId, me, now);
    if (!week) return reply.code(404).send({ error: SEAT_CARD_ERRORS.noCard });
    const db = getDb();
    const [row] = await db.select().from(teamSeatCards).where(and(eq(teamSeatCards.teamId, me.teamId), eq(teamSeatCards.moduleId, week.mod.id)));
    const [team] = await db.select({ name: teams.name, ownerId: teams.ownerId }).from(teams).where(eq(teams.id, me.teamId));
    const [owner] = team ? await db.select({ name: users.name }).from(users).where(eq(users.id, team.ownerId)) : [];
    // R-5 audit (D-267): the team's cohort by the one rule (`viewerCohortId`, its owner's).
    const teamCohort = team ? await viewerCohortId(db, team.ownerId) : null;
    const [cohort] = teamCohort ? await db.select({ name: cohorts.name }).from(cohorts).where(eq(cohorts.id, teamCohort)) : [];
    const names = await namesOf([row?.signedBy ?? null]);
    const html = seatCardPdfHtml({
      form: seatCardForm(week.card),
      seat: week.card.seat,
      week: week.mod.course?.week ?? 0,
      step: week.ask.step,
      answers: row?.answers ?? {},
      team: team?.name ?? '',
      owner: owner?.name ?? '',
      cohort: cohort ? `${cohort.name} Cohort` : '',
      savedAt: row?.updatedAt ?? now,
      signedAt: row?.signedAt ?? null,
      signedBy: row?.signedBy ? (names.get(row.signedBy) ?? '') : null,
    });
    return sendPdf(reply, { pdf: await renderPdf(html), name: seatCardPdfName(week.card.seat, team?.name ?? owner?.name ?? '') });
  });

  // Staff: every team's card for the week, signed or not, with who saved it last and who signed it.
  app.get(ADMIN_SEAT_CARDS_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    if (!(await staffReader(viewerOrThrow(req)))) return reply.code(403).send({ error: 'Not allowed' });
    const moduleId = (req.query as { moduleId?: unknown }).moduleId;
    if (typeof moduleId !== 'string' || !moduleId) return reply.code(400).send({ error: 'Which week?' });
    const rows = await getDb().select().from(teamSeatCards).where(eq(teamSeatCards.moduleId, moduleId)).orderBy(asc(teamSeatCards.teamId));
    const names = await namesOf(rows.flatMap((r) => [r.updatedBy, r.signedBy]));
    const teamIds = rows.map((r) => r.teamId);
    const teamRows = teamIds.length ? await getDb().select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
    const team = new Map(teamRows.map((t) => [t.id, t.name]));
    const cards = rows.map((r) => ({ team: team.get(r.teamId) ?? '', ...cardView(r, names) })).sort((a, b) => a.team.localeCompare(b.team));
    return reply.code(200).send({ cards });
  });
}
