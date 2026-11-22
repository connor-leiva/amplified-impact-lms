// D-230 (IMPLEMENTATION-SPEC.md B-23 to B-28): Turn in. How a team sends Connor's team what a step asks for: a report
// for a live read, or a checkpoint. Pure: no clock, no I/O.
//
// A step asks for a file with a checklist item's `upload` action (`{ type: 'upload', kind }`, the Week Builder's
// Upload). The button on that step opens the drawer; nothing on the week page does (B-23). The owner and the operator
// turn in (`mayTurnIn`, the intake's rule); an agent sees a line instead (B-26). Each turn-in is a version: the team sees
// its latest, with what was sent and when, and never what staff did with it (B-25): `status` is staff's alone.
import type { AIEmployee } from './types';
import { mayEditIntake } from './intake';

export const SUBMISSION_KINDS = ['live_read', 'checkpoint'] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];
export const isSubmissionKind = (v: unknown): v is SubmissionKind => typeof v === 'string' && (SUBMISSION_KINDS as readonly string[]).includes(v);

/** The kinds' titles, as the drawer heads them (the package's `ui.kinds[kind].title`) and staff list them. */
export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, string> = { live_read: 'Report for a live read', checkpoint: 'Checkpoint' };

/** What staff did with it. Never sent to a learner (B-25). */
export const SUBMISSION_STATUSES = ['received', 'picked', 'reviewed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export const isSubmissionStatus = (v: unknown): v is SubmissionStatus => typeof v === 'string' && (SUBMISSION_STATUSES as readonly string[]).includes(v);
export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = { received: 'Received', picked: 'Picked for a live read', reviewed: 'Reviewed' };

/**
 * The files a team may turn in, by extension, with the type the upload signs (the drawer's `OK_EXT`): PDF, an HTML
 * report, a PNG or JPG screenshot, Excel or CSV. 25 MB each, 5 at a time. The server checks all of it again.
 */
export const SUBMISSION_TYPES = {
  pdf: 'application/pdf',
  html: 'text/html',
  htm: 'text/html',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
} as const;
export const SUBMISSION_MAX_BYTES = 25e6;
export const SUBMISSION_MAX_FILES = 5;
export const SUBMISSION_NOTE_MAX = 1000;
export const SUBMISSION_MINUTES_MAX = 40;

/** A file name's extension, lower case; '' when it has none. */
const extOf = (name: string): string => {
  const at = name.lastIndexOf('.');
  return at > 0 && at < name.length - 1 ? name.slice(at + 1).toLowerCase() : '';
};

/** The type a turned-in file is stored as, or null when its extension isn't one a team may turn in. */
export const submissionTypeFor = (name: string): string | null => SUBMISSION_TYPES[extOf(name) as keyof typeof SUBMISSION_TYPES] ?? null;

/** Who turns in: the owner and the operator (B-26). */
export const mayTurnIn = (role: string | null | undefined): boolean => mayEditIntake(role);

/** The server's words. The drawer's own (wrong type, too big, too many) are the package's, in the web app. */
export const SUBMISSION_ERRORS = {
  notYours: 'Your team’s owner or operator turns this in.',
  notAsked: 'This step doesn’t ask for a file.',
  badFile: 'One of those files can’t be turned in.',
  tooMany: 'Up to 5 files at a time.',
  needFile: 'Add at least one file.',
  missingFile: 'One of the files didn’t finish uploading. Add it again.',
  saveFailed: 'That didn’t go through. Try again.',
} as const;

/** One ask: a step that collects a kind, with the kicker the drawer prints ("Week 1 · Step 4"). */
export interface SubmissionAsk {
  id: SubmissionKind;
  kind: SubmissionKind;
  step: number;
  stepId: string;
  itemId: string;
  /**
   * Every item on the step whose Upload collects this kind, on both paths: a turn-in checks each one, so a team on the
   * ChatGPT path sees its own item ticked too (the two paths' items have different ids).
   */
  itemIds: string[];
  kicker: string;
}

/**
 * §7.6: the asks a week makes, one per kind, from its steps' `upload` actions (the first step that asks for a kind).
 * `week` names the week in the kicker; a module's own course week is used when it has one.
 */
export function asksOf(mod: Pick<AIEmployee, 'checklist'> & { course?: { week: number } | null }, week: number | undefined = mod.course?.week): SubmissionAsk[] {
  const out: SubmissionAsk[] = [];
  mod.checklist.forEach((step, i) => {
    const blocks = [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
    for (const b of blocks) {
      if (b.type !== 'check' || b.action?.type !== 'upload') continue;
      const kind = b.action.kind;
      if (out.some((a) => a.kind === kind)) continue;
      const itemIds = blocks.flatMap((x) => (x.type === 'check' && x.action?.type === 'upload' && x.action.kind === kind ? [x.id] : []));
      out.push({ id: kind, kind, step: i + 1, stepId: step.id, itemId: b.id, itemIds, kicker: `${week === undefined ? '' : `Week ${week} · `}Step ${i + 1}` });
    }
  });
  return out;
}

/** A file in a turn-in, as stored: where it is, what it was called, how big. */
export interface SubmissionFile {
  key: string;
  name: string;
  size: number;
}

/** A turn-in's note and minutes, cleaned: trimmed and cut to their limits. */
export const cleanNote = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, SUBMISSION_NOTE_MAX) : '');
export const cleanMinutes = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, SUBMISSION_MINUTES_MAX) : '');

/** The drawer's size line: "184 KB", "2.4 MB" (the package's `bytes()`). */
export const bytesLabel = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
