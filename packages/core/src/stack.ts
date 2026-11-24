// The stack card (D-197). Pure: no clock, no I/O. The words live on the week. A team's rows live in
// `team_stack_card`. Nothing here sends a message.

import type { StackCardContent } from './course-types';
import type { IntakeAnswers } from './intake';
import type { AIEmployee } from './types';

export interface StackRow {
  source: string;
  tool: string;
  plan: 'green' | 'yellow';
  who: string;
}

const SECRET = /password|passwd|passcode|account\s*number|\b\d{8,}\b|\b(?:sk|rk|whsec|re)_/i;

/** True when a cell looks like a password or an account number. */
export const looksSecret = (text: string): boolean => SECRET.test(text);

/** Books, Closings, Leads and Email, filled from the intake when those answers exist. */
export function prefillStack(content: StackCardContent, answers: IntakeAnswers): StackRow[] {
  const text = (id: string): string => (typeof answers[id] === 'string' ? answers[id] : '');
  const google = answers.google === 'Yes' ? 'green' : answers.google === 'No' ? 'yellow' : null;
  return content.sources.map((source) => {
    const tool = source.id === 'books' ? text('books') : source.id === 'closings' ? text('sisu') : source.id === 'leads' ? text('crm') : '';
    const plan: StackRow['plan'] = source.id === 'email' && google ? google : 'yellow';
    return { source: source.name, tool, plan, who: '' };
  });
}

/** Drop a row that is not one of the card's sources, or that carries a secret. */
export function cleanStackRows(content: StackCardContent, raw: unknown): { rows: StackRow[]; secret: boolean } {
  const names = new Map(content.sources.map((s) => [s.name, s]));
  const list = Array.isArray(raw) ? raw : [];
  let secret = false;
  const rows: StackRow[] = content.sources.map((source) => ({ source: source.name, tool: '', plan: 'yellow', who: '' }));
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { source?: unknown; tool?: unknown; plan?: unknown; who?: unknown };
    if (typeof row.source !== 'string' || !names.has(row.source)) continue;
    const tool = typeof row.tool === 'string' ? row.tool.trim().slice(0, 200) : '';
    const who = typeof row.who === 'string' ? row.who.trim().slice(0, 200) : '';
    if (looksSecret(tool) || looksSecret(who)) {
      secret = true;
      continue;
    }
    const at = rows.findIndex((r) => r.source === row.source);
    if (at < 0) continue;
    rows[at] = { source: row.source, tool, plan: row.plan === 'green' ? 'green' : 'yellow', who };
  }
  return { rows, secret };
}

// --- H-10 (D-247): the stack card, as the intake: a browser sends only the rows it changed ---------

/** The 409 when a teammate changed a row this browser changed too. The page keeps what was typed. */
export const STACK_CONFLICT = 'Someone on your team changed this card since you opened it. Copy what you typed, then reload the page.';

/** What a browser sends: the rows it changed, by source, and each row as it last read it (null: none). */
export interface StackEdit {
  changes: Record<string, StackRow>;
  base: Record<string, StackRow | null>;
}

const sameRow = (a: StackRow | null | undefined, b: StackRow | null | undefined): boolean =>
  (a?.tool ?? '').trim() === (b?.tool ?? '').trim() && (a?.who ?? '').trim() === (b?.who ?? '').trim() && (a?.plan ?? 'yellow') === (b?.plan ?? 'yellow');

/** H-10: the rows of `next` that differ from `base` (the rows the browser loaded or last saved), each with its base. */
export function stackEdit(base: readonly StackRow[], next: readonly StackRow[]): StackEdit {
  const changes: Record<string, StackRow> = {};
  const from: Record<string, StackRow | null> = {};
  for (const row of next) {
    const was = base.find((r) => r.source === row.source) ?? null;
    if (sameRow(was, row)) continue;
    changes[row.source] = row;
    from[row.source] = was;
  }
  return { changes, base: from };
}

/**
 * H-10: a browser's changed rows written over the stored card (or, before the team's first save, the card the
 * intake prefills), cleaned as `cleanStackRows` cleans them. `conflicts` lists each changed row someone else changed
 * since the browser read it; with any, or a secret, the caller writes nothing.
 */
export function mergeStackEdit(
  content: StackCardContent,
  stored: readonly StackRow[],
  rawChanges: unknown,
  rawBase: unknown,
): { rows: StackRow[]; conflicts: string[]; secret: boolean } {
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const changes = obj(rawChanges);
  const base = obj(rawBase);
  const names = new Set(content.sources.map((s) => s.name));
  const was = cleanStackRows(content, stored).rows;
  const sources = Object.keys(changes).filter((source) => names.has(source));
  // Each changed row and its base, cleaned through the card's own rule (a row is keyed by its source).
  const cleaned = cleanStackRows(content, sources.map((source) => ({ ...obj(changes[source]), source })));
  // A row the browser read as none (null) reads as the blank row `cleanStackRows` starts every source with.
  const baseRows = cleanStackRows(content, sources.map((source) => ({ ...obj(base[source]), source }))).rows;
  const conflicts: string[] = [];
  const rows = was.map((row) => ({ ...row }));
  for (const source of sources) {
    const next = cleaned.rows.find((r) => r.source === source)!;
    const from = baseRows.find((r) => r.source === source)!;
    const now = was.find((r) => r.source === source)!;
    if (!sameRow(now, from) && !sameRow(now, next)) conflicts.push(source);
    rows[rows.findIndex((r) => r.source === source)] = next;
  }
  return { rows, conflicts, secret: cleaned.secret };
}

export function stackCheckTarget(mod: AIEmployee | undefined): { moduleId: string; stepId: string; itemId: string } | null {
  const step = mod?.checklist[0];
  if (!mod || !step) return null;
  const blocks = [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
  for (const b of blocks) {
    if (b.type !== 'check' || b.action?.type !== 'form' || b.action.formId !== 'stack-card') continue;
    return { moduleId: mod.id, stepId: step.id, itemId: b.action.itemId?.trim() || b.id };
  }
  for (const b of blocks) {
    if (b.type === 'check' && b.title.trim().toLowerCase() === 'fill in your stack card') {
      return { moduleId: mod.id, stepId: step.id, itemId: b.id };
    }
  }
  return null;
}

export function stackCopy(card: StackCardContent | undefined): { path: string; label: string; text: string }[] {
  if (!card) return [];
  const out: { path: string; label: string; text: string }[] = [
    { path: 'course.stackCard.exampleLabel', label: 'Stack card example label', text: card.exampleLabel },
    { path: 'course.stackCard.exampleTeam', label: 'Stack card example team', text: card.exampleTeam },
  ];
  card.sources.forEach((s, i) => {
    out.push({ path: `course.stackCard.sources[${i}].name`, label: `Stack source ${i + 1}`, text: s.name });
    out.push({ path: `course.stackCard.sources[${i}].green`, label: `Stack source ${i + 1} green`, text: s.green });
    out.push({ path: `course.stackCard.sources[${i}].yellow`, label: `Stack source ${i + 1} yellow`, text: s.yellow });
  });
  card.example.forEach((r, i) => {
    out.push({ path: `course.stackCard.example[${i}].tool`, label: `Stack example ${i + 1} tool`, text: r.tool });
    out.push({ path: `course.stackCard.example[${i}].who`, label: `Stack example ${i + 1} who`, text: r.who });
  });
  return out;
}
