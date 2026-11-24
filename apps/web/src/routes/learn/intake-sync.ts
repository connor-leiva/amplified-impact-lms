// H-10 (D-248): the team intake's reads and writes, for both of its forms (today's page, `Intake.tsx`, and the v3
// drawer, `lms-v3/V3Week.tsx`). A form is editable only once `GET /api/intake` has answered. A save sends only the
// answers changed since the last load or save, each with the answer it was (`intakeEdit`), one save at a time, so the
// server can merge them into what a teammate saved and refuse (409) only a question they changed too.
import { INTAKE_CONFLICT, applyIntakeChanges, intakeEdit } from '@ai/core/intake';
import type { IntakeAnswers } from '@ai/core/intake';
import type { CourseIntake } from '@ai/core/course-types';

/** What `GET /api/intake` answers. */
export interface IntakeBody {
  answers: IntakeAnswers;
  updatedAt: number | null;
  submittedAt: number | null;
  preview?: boolean;
}

/** The page's words when the server sent none. Today's page's own. */
export const INTAKE_LOAD_FAILED = 'Could not load the intake.';
export const INTAKE_SAVE_FAILED = 'That did not save.';

export type IntakeLoad = { kind: 'ready'; body: IntakeBody } | { kind: 'failed'; error: string; retry: boolean };

/** Load the team's intake. A refusal (an agent, 403) can't be retried; anything else can. */
export async function loadIntake(): Promise<IntakeLoad> {
  let res: Response;
  try {
    res = await fetch('/api/intake', { credentials: 'include' });
  } catch {
    return { kind: 'failed', error: INTAKE_LOAD_FAILED, retry: true };
  }
  const json = (await res.json().catch(() => null)) as (Partial<IntakeBody> & { error?: unknown }) | null;
  if (res.status === 403) return { kind: 'failed', error: typeof json?.error === 'string' && json.error ? json.error : INTAKE_LOAD_FAILED, retry: false };
  if (!res.ok || !json || typeof json.answers !== 'object' || json.answers === null) return { kind: 'failed', error: INTAKE_LOAD_FAILED, retry: true };
  return { kind: 'ready', body: { answers: json.answers, updatedAt: json.updatedAt ?? null, submittedAt: json.submittedAt ?? null, ...(json.preview ? { preview: true } : {}) } };
}

export type IntakeSave =
  | { kind: 'saved'; updatedAt: number; submittedAt: number | null }
  /** Nothing changed since the last save, and it isn't a submit. */
  | { kind: 'unchanged' }
  /** A teammate changed a question this browser changed too (409). Nothing was written. */
  | { kind: 'conflict'; error: string; conflicts: string[] }
  /** A submit with a required answer missing (422). Nothing was written. */
  | { kind: 'missing'; error: string; missing: string[] }
  | { kind: 'refused'; error: string };

/**
 * One team intake's saves, from the answers it was loaded with. `save` queues: each save starts once the one before
 * it has answered, and diffs against the answers the server holds after it.
 */
export function intakeSaver(form: CourseIntake, loaded: IntakeAnswers) {
  let base: IntakeAnswers = loaded;
  let queue: Promise<unknown> = Promise.resolve();
  const send = async (answers: unknown, submit: boolean): Promise<IntakeSave> => {
    const edit = intakeEdit(form, base, answers);
    if (!submit && !Object.keys(edit.changes).length) return { kind: 'unchanged' };
    let res: Response;
    try {
      res = await fetch('/api/intake', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...edit, ...(submit ? { submit: true } : {}) }),
      });
    } catch {
      return { kind: 'refused', error: INTAKE_SAVE_FAILED };
    }
    const json = (await res.json().catch(() => ({}))) as { error?: unknown; missing?: unknown; conflicts?: unknown; updatedAt?: unknown; submittedAt?: unknown };
    const error = typeof json.error === 'string' && json.error ? json.error : null;
    const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    if (res.status === 409) return { kind: 'conflict', error: error ?? INTAKE_CONFLICT, conflicts: ids(json.conflicts) };
    if (res.status === 422 && Array.isArray(json.missing)) return { kind: 'missing', error: error ?? INTAKE_SAVE_FAILED, missing: ids(json.missing) };
    if (!res.ok) return { kind: 'refused', error: error ?? INTAKE_SAVE_FAILED };
    // The server holds these answers now: the next save diffs against them.
    base = applyIntakeChanges(base, edit.changes);
    return { kind: 'saved', updatedAt: typeof json.updatedAt === 'number' ? json.updatedAt : Date.now(), submittedAt: typeof json.submittedAt === 'number' ? json.submittedAt : null };
  };
  return {
    save(answers: unknown, submit = false): Promise<IntakeSave> {
      const next = queue.then(() => send(answers, submit));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

export type IntakeSaver = ReturnType<typeof intakeSaver>;
