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
