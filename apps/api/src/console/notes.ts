// Staff notes (D-158, spec § 7.3): staff's own notes on a workspace or a user. Internal: never shown
// to the workspace or the user, never in a snapshot. Immutable (migration 0016's trigger): a note is
// written once and can only be soft-deleted, by the Owner, with a reason. The audit row of either
// records the note's length, never its words.

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { StaffNote, StaffNoteTarget } from '@ai/core';
import type { Database } from '../db/client';
import { staffNotes, teams, users } from '../db/schema';
import { audit } from './audit';
import type { AuditActor } from './audit';

/** A note's target as the audit log names it: the team's or the user's name. Null: no such target. */
export async function noteTargetLabel(db: Database, type: StaffNoteTarget, id: string): Promise<string | null> {
  if (type === 'workspace') {
    const [t] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, id)).limit(1);
    return t?.name ?? null;
  }
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1);
  return u?.name ?? null;
}

/** A target's notes, newest first. A deleted note is not listed; its deletion is in the audit log. */
export async function listNotes(db: Database, type: StaffNoteTarget, id: string): Promise<StaffNote[]> {
  const rows = await db
    .select({ id: staffNotes.id, targetType: staffNotes.targetType, targetId: staffNotes.targetId, authorId: staffNotes.authorUserId, authorName: users.name, body: staffNotes.body, createdAt: staffNotes.createdAt })
    .from(staffNotes)
    .leftJoin(users, eq(users.id, staffNotes.authorUserId))
    .where(and(eq(staffNotes.targetType, type), eq(staffNotes.targetId, id), isNull(staffNotes.deletedAt)))
    .orderBy(desc(staffNotes.id));
  return rows.map((r) => ({
    id: String(r.id),
    targetType: r.targetType as StaffNoteTarget,
    targetId: r.targetId,
    author: { id: r.authorId, name: r.authorName },
    body: r.body,
    createdAt: Number(r.createdAt),
  }));
}

/** Write a note and its audit row in one transaction. */
export async function createNote(
  db: Database,
  req: FastifyRequest,
  input: { type: StaffNoteTarget; id: string; label: string; body: string; actor: Extract<AuditActor, { source: 'staff' }>; now: number },
): Promise<StaffNote> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(staffNotes)
      .values({ targetType: input.type, targetId: input.id, authorUserId: input.actor.userId, body: input.body, createdAt: input.now })
      .returning({ id: staffNotes.id });
    const id = String(row!.id);
    await audit(
      req,
      { action: 'note.create', outcome: 'ok', actor: input.actor, target: { type: input.type, id: input.id, label: input.label }, after: { noteId: id, length: input.body.length } },
      tx,
    );
    const [author] = await tx.select({ name: users.name }).from(users).where(eq(users.id, input.actor.userId)).limit(1);
    return { id, targetType: input.type, targetId: input.id, author: { id: input.actor.userId, name: author?.name ?? null }, body: input.body, createdAt: input.now };
  });
}

/**
 * Soft-delete a note and write its audit row, in one transaction. Null when there is no such note, or
 * it is deleted already. The reason is staff's own words for the deletion, kept in the audit row's
 * reason; the note's words are not.
 */
export async function deleteNote(
  db: Database,
  req: FastifyRequest,
  input: { noteId: number; reason: string; actor: Extract<AuditActor, { source: 'staff' }>; now: number },
): Promise<{ id: string } | null> {
  return db.transaction(async (tx) => {
    const [note] = await tx
      .update(staffNotes)
      .set({ deletedAt: input.now, deletedBy: input.actor.userId, deleteReason: input.reason })
      .where(and(eq(staffNotes.id, input.noteId), isNull(staffNotes.deletedAt)))
      .returning({ id: staffNotes.id, targetType: staffNotes.targetType, targetId: staffNotes.targetId, body: staffNotes.body });
    if (!note) return null;
    const label = await noteTargetLabel(tx as unknown as Database, note.targetType as StaffNoteTarget, note.targetId);
    await audit(
      req,
      {
        action: 'note.delete',
        outcome: 'ok',
        actor: input.actor,
        target: { type: note.targetType, id: note.targetId, label },
        reason: input.reason,
        after: { noteId: String(note.id), length: note.body.length },
      },
      tx,
    );
    return { id: String(note.id) };
  });
}
