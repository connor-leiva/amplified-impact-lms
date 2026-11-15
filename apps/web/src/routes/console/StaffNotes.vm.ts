// Staff notes on a workspace or a user (D-158, spec § 7.3): the words, the draft's rule and each
// note's line. Pure; StaffNotes.tsx only renders it. Notes are immutable: there is no edit. Deleting
// is the Owner's alone (`notes.delete`), with a reason of 10 to 500 characters, and is a soft delete
// the audit log records.

import { CONSOLE_REASON_MAX, CONSOLE_REASON_MIN, NOTE_BODY_MAX, consoleCan, fmt } from '@ai/core';
import type { StaffNote } from '@ai/core';
import type { ConsoleFailure } from '../../data/console';

export const NOTES_COPY = {
  heading: 'Staff Notes',
  add: 'Add a Note',
  placeholder: 'What happened, what you told them',
  save: 'Save Note',
  saving: 'Saving…',
  saved: 'Note saved.',
  empty: 'No notes yet.',
  count: (n: number) => `${n} of ${NOTE_BODY_MAX.toLocaleString('en-US')} characters`,
  delete: 'Delete',
  deleteLabel: (author: string, when: string) => `Delete the note by ${author} from ${when}`,
  deleteTitle: 'Delete this note?',
  deleteBody: 'It leaves this list. The audit log keeps that it was deleted, by whom and why.',
  reason: 'Reason (required)',
  reasonHelp: `${CONSOLE_REASON_MIN} to ${CONSOLE_REASON_MAX} characters. Saved to the audit log.`,
  deleteCta: 'Delete Note',
  deleting: 'Deleting…',
  deleted: 'Note deleted.',
  cancel: 'Cancel',
  list: 'Notes',
  unknownAuthor: 'A former staff member',
} as const;

export function notesFailure(kind: ConsoleFailure, message: string): string {
  if (kind === 'rate_limited') return 'Too many requests. Wait a minute, then try again.';
  if (kind === 'invalid') return message;
  if (kind === 'forbidden') return 'Your role can’t do that.';
  if (kind === 'not_found') return 'That note or record no longer exists.';
  return 'That didn’t save. Nothing was changed.';
}

/** Whether the draft can be saved: 1 to 2,000 characters once trimmed. */
export const canSaveNote = (draft: string): boolean => {
  const n = draft.trim().length;
  return n >= 1 && n <= NOTE_BODY_MAX;
};

export const reasonReady = (reason: string): boolean => {
  const n = reason.trim().length;
  return n >= CONSOLE_REASON_MIN && n <= CONSOLE_REASON_MAX;
};

export const canDeleteNotes = (role: string | null): boolean => consoleCan(role, 'notes.delete');
export const canWriteNotes = (role: string | null): boolean => consoleCan(role, 'notes.write');

export interface NoteVM {
  key: string;
  author: string;
  when: string;
  body: string;
}

export const noteVM = (n: StaffNote): NoteVM => ({
  key: n.id,
  author: n.author.name ?? NOTES_COPY.unknownAuthor,
  when: fmt.when(n.createdAt),
  body: n.body,
});
