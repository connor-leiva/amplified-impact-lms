// Week 0 intake (D-196). Pure: no clock, no I/O.
//
// The questions live on the week's course. The answers live in `team_intake`, one row per team.
// These helpers decide who may edit, which ids personalization reads, and which checklist item a
// submit checks. Nothing here sends a message or writes outside the portal.

import type { CourseIntake, IntakeQuestion, IntakeSection } from './course-types';
import { implementerWords } from './role-words';
import type { AIEmployee } from './types';

/** Ids a later change reads. The builder warns before one of these is removed. */
export const INTAKE_LOCKED_IDS = ['operator', 'ai', 'plan', 'google'] as const;

export type IntakeLockedId = (typeof INTAKE_LOCKED_IDS)[number];

export const isLockedIntakeId = (id: string): id is IntakeLockedId => (INTAKE_LOCKED_IDS as readonly string[]).includes(id);

/** A team's answers, keyed by question id. A multi question is a list. Anything else is a string. */
export type IntakeAnswers = Record<string, string | string[]>;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEXT_MAX = 4000;

/** Team Owner and Operations Lead edit the team's intake. Everyone else on the team does not. */
export const mayEditIntake = (role: string | null | undefined): boolean => role === 'Team Owner' || role === 'Operations Lead';

export function intakeQuestions(form: CourseIntake | undefined): IntakeQuestion[] {
  return (form?.sections ?? []).flatMap((s) => s.questions);
}

/** Blank labels, a bad or repeated id, a choice with no options, and a missing locked id. */
export function intakeIssues(form: CourseIntake | undefined): string[] {
  if (!form) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  form.sections.forEach((section, s) => {
    if (!section.title.trim()) out.push(`Section ${s + 1}: Give it a title.`);
    section.questions.forEach((q, i) => {
      const where = `Section ${s + 1}, question ${i + 1}`;
      const id = q.id.trim();
      if (!ID.test(id)) out.push(`${where}: Use a lowercase id, like operator.`);
      else if (seen.has(id)) out.push(`${where}: “${id}” is already used.`);
      else seen.add(id);
      if (!q.label.trim()) out.push(`${where}: Give it a label.`);
      if ((q.kind === 'choice' || q.kind === 'multi') && !(q.options ?? []).some((o) => o.trim())) {
        out.push(`${where}: Add at least one choice.`);
      }
    });
  });
  for (const id of INTAKE_LOCKED_IDS) {
    if (!seen.has(id)) out.push(`The intake is missing “${id}”. Personalization reads that id.`);
  }
  return out;
}

/** B-16 (D-229): the required questions these answers leave empty, by id, in the form's order. */
export function intakeMissing(form: CourseIntake, answers: IntakeAnswers): string[] {
  const has = (v: string | string[] | undefined): boolean => (Array.isArray(v) ? v.length > 0 : v !== undefined && v.trim() !== '');
  return intakeQuestions(form)
    .filter((q) => q.required && !has(answers[q.id]))
    .map((q) => q.id);
}

/**
 * The option a choice answer picks, or null. An answer saved before D-243 renamed the operator the AI Implementer
 * ("The operator's account (our default)") picks its renamed option, so a team's earlier answer is neither shown
 * as unpicked nor dropped on the next save. The stored answer itself is never rewritten.
 */
function optionOf(q: IntakeQuestion, value: string): string | null {
  const options = q.options ?? [];
  if (options.includes(value)) return value;
  const renamed = implementerWords(value);
  return renamed !== value && options.includes(renamed) ? renamed : null;
}

/** Keep only answers this form asks, trimmed, and only choices the question lists. */
export function cleanIntakeAnswers(form: CourseIntake, raw: unknown): IntakeAnswers {
  const byId = new Map(intakeQuestions(form).map((q) => [q.id, q]));
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: IntakeAnswers = {};
  for (const [id, q] of byId) {
    const value = src[id];
    if (q.kind === 'multi') {
      const picked = (Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
        .filter((x): x is string => typeof x === 'string')
        .map((x) => optionOf(q, x.trim()))
        .filter((x): x is string => x !== null);
      if (picked.length) out[id] = [...new Set(picked)];
      continue;
    }
    if (typeof value !== 'string') continue;
    const text = value.trim().slice(0, TEXT_MAX);
    if (!text) continue;
    if (q.kind === 'choice') {
      const option = optionOf(q, text);
      if (option !== null) out[id] = option;
      continue;
    }
    out[id] = text;
  }
  return out;
}

// --- H-10 (D-247): two people editing one team's intake -------------------------------------------
//
// A browser sends only the answers it changed, each with the value it last read for that question (its base). The
// server writes those questions over the stored answers and keeps every other one, so an owner and an operator
// editing different questions both keep theirs. A question whose stored answer is no longer the base, and is not
// already the new answer, was changed by someone else since this browser read it: the write is refused (409) and
// nothing is written. The base values are what prove that, so no timestamp per question is stored.

/** The 409 when a teammate changed an answer this browser changed too. The page keeps what was typed. */
export const INTAKE_CONFLICT = 'Someone on your team changed this intake since you opened it. Copy what you typed, then reload the page.';
/** The 409 for a page from before H-10, which sends the whole form (and would erase a teammate's answers). */
export const INTAKE_OUT_OF_DATE = 'This page is out of date. Copy what you typed, then reload the page.';

/** One question's answer in a change: the answer, or null for an answer cleared (or never given). */
export type IntakeChange = string | string[] | null;

/** What a browser sends: the questions it changed and, for each, the answer it last read (null: empty). */
export interface IntakeEdit {
  changes: Record<string, IntakeChange>;
  base: Record<string, IntakeChange>;
}

const isEmptyAnswer = (v: unknown): boolean => v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : typeof v === 'string' && v.trim() === '');

/** Two answers to one question are the same: both empty, the same text, or the same choices in any order. */
export function sameIntakeAnswer(a: unknown, b: unknown): boolean {
  if (isEmptyAnswer(a) || isEmptyAnswer(b)) return isEmptyAnswer(a) && isEmptyAnswer(b);
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const set = new Set(a);
    return b.every((x) => set.has(x));
  }
  return a === b;
}

/** One question's answer, cleaned as `cleanIntakeAnswers` cleans it: null when it would be dropped. */
function cleanOne(form: CourseIntake, id: string, value: unknown): IntakeChange {
  return cleanIntakeAnswers(form, { [id]: value })[id] ?? null;
}

/** Only the form's own question ids, from a browser's object. */
function editOf(form: CourseIntake, raw: unknown): Record<string, IntakeChange> {
  const ids = new Set(intakeQuestions(form).map((q) => q.id));
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, IntakeChange> = {};
  for (const [id, value] of Object.entries(src)) if (ids.has(id)) out[id] = cleanOne(form, id, value);
  return out;
}

/**
 * H-10: what a browser sends for a save: the questions whose cleaned answer in `next` differs from `base` (the
 * answers it last loaded or saved), each with its base answer.
 */
export function intakeEdit(form: CourseIntake, base: IntakeAnswers, next: unknown): IntakeEdit {
  const now = cleanIntakeAnswers(form, next);
  const was = cleanIntakeAnswers(form, base);
  const changes: Record<string, IntakeChange> = {};
  const from: Record<string, IntakeChange> = {};
  for (const q of intakeQuestions(form)) {
    if (sameIntakeAnswer(now[q.id], was[q.id])) continue;
    changes[q.id] = now[q.id] ?? null;
    from[q.id] = was[q.id] ?? null;
  }
  return { changes, base: from };
}

/** The answers with these changes written in (a null clears its question). */
export function applyIntakeChanges(answers: IntakeAnswers, changes: Record<string, IntakeChange>): IntakeAnswers {
  const out: IntakeAnswers = { ...answers };
  for (const [id, value] of Object.entries(changes)) {
    if (value === null) delete out[id];
    else out[id] = value;
  }
  return out;
}

/**
 * H-10: a browser's changed answers written over the stored ones, cleaned. `conflicts` lists each changed question
 * someone else changed since the browser read it (its stored answer is neither the base nor the new answer); with
 * any, the caller writes nothing.
 */
export function mergeIntakeEdit(form: CourseIntake, stored: IntakeAnswers, rawChanges: unknown, rawBase: unknown): { answers: IntakeAnswers; conflicts: string[] } {
  const changes = editOf(form, rawChanges);
  const base = editOf(form, rawBase);
  // Compared as the form reads them today, as the browser's base was (a choice since removed reads as empty).
  const was = cleanIntakeAnswers(form, stored);
  const conflicts = Object.keys(changes).filter((id) => !sameIntakeAnswer(was[id], base[id] ?? null) && !sameIntakeAnswer(was[id], changes[id]));
  return { answers: cleanIntakeAnswers(form, applyIntakeChanges(stored, changes)), conflicts };
}

/**
 * Saved answers as the form reads now (D-243): a choice saved in the operator's words comes back as the option it
 * picks today. Everything else, including answers to questions the form no longer asks, comes back as it was.
 */
export function currentIntakeAnswers(form: CourseIntake | undefined, answers: IntakeAnswers): IntakeAnswers {
  if (!form) return answers;
  const byId = new Map(intakeQuestions(form).map((q) => [q.id, q]));
  let changed = false;
  const out: IntakeAnswers = {};
  for (const [id, value] of Object.entries(answers)) {
    const q = byId.get(id);
    if (!q || (q.kind !== 'choice' && q.kind !== 'multi')) {
      out[id] = value;
      continue;
    }
    const read = (v: string): string => optionOf(q, v) ?? v;
    const next = Array.isArray(value) ? value.map(read) : read(value);
    if (Array.isArray(next) ? next.some((v, i) => v !== (value as string[])[i]) : next !== value) changed = true;
    out[id] = next;
  }
  return changed ? out : answers;
}

/**
 * The checklist box a submit checks for every teammate. A form action's `itemId` wins. Otherwise the
 * action's own item, otherwise a step 1 item titled "Fill in your intake".
 */
export function intakeCheckTarget(mod: AIEmployee | undefined): { moduleId: string; stepId: string; itemId: string } | null {
  const step = mod?.checklist[0];
  if (!mod || !step) return null;
  const blocks = [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
  for (const b of blocks) {
    if (b.type !== 'check' || b.action?.type !== 'form' || b.action.formId !== 'intake') continue;
    return { moduleId: mod.id, stepId: step.id, itemId: b.action.itemId?.trim() || b.id };
  }
  for (const b of blocks) {
    if (b.type === 'check' && b.title.trim().toLowerCase() === 'fill in your intake') {
      return { moduleId: mod.id, stepId: step.id, itemId: b.id };
    }
  }
  return null;
}

/** B-14: the kit file the spec names as the intake. A file made in the builder has a generated id instead. */
export const INTAKE_FILE_ID = 'intake-form';

/** A file titled as the intake form ("Week 0 Intake Form", "Intake form"). */
const INTAKE_FORM_TITLE = /\bintake form$/i;

/**
 * D-229 (B-14, B-15): the kit files that are the intake, the "download the PDF and fill it in" path the form drawer
 * replaces: the file `intake-form`; the files the intake's checklist item downloads (the item `intakeCheckTarget`
 * finds); and a file on the intake's step titled as the intake form. A file made in the builder has a generated id
 * (production's Week 0 Intake Form does, Nov 21), so the spec's id alone found nothing there.
 */
export function intakeFileIds(
  mod: AIEmployee | undefined,
  kit: readonly { id: string; title: string; stepId: string | null }[],
): string[] {
  const ids = new Set<string>();
  const inKit = (id: string) => kit.some((k) => k.id === id);
  if (inKit(INTAKE_FILE_ID)) ids.add(INTAKE_FILE_ID);
  const step = mod?.checklist[0];
  if (!step) return [...ids];
  const target = intakeCheckTarget(mod);
  const blocks = [...(step.paths?.claude?.blocks ?? []), ...(step.paths?.chatgpt?.blocks ?? [])];
  for (const b of blocks) {
    if (b.type !== 'check' || !target || b.id !== target.itemId || b.action?.type !== 'download') continue;
    for (const id of b.action.kitItemIds) if (inKit(id)) ids.add(id);
  }
  for (const k of kit) if (k.stepId === step.id && INTAKE_FORM_TITLE.test(k.title.trim())) ids.add(k.id);
  return [...ids];
}

/**
 * D-246: the step files a week no longer lists: the static intake PDF (`intakeFileIds`), once the week has the intake
 * form. The form is filled in on the portal and its answers download as a PDF (`GET /api/intake/pdf`), so the blank
 * PDF is neither needed nor shown as a step's file. A week without the form keeps its files as they are.
 */
export function unlistedIntakeFiles(
  mod: AIEmployee | undefined,
  week: { intake?: CourseIntake; kit?: readonly { id: string; title: string; stepId: string | null }[] } | undefined,
): string[] {
  if (!week?.intake) return [];
  return intakeFileIds(mod, week.kit ?? []);
}

/**
 * D-246: the intake's checklist item on a step, when the week has the intake form. Its download once named the static
 * intake PDF; a step with that file gone (it is no longer needed) opens the form from the item instead.
 */
export function intakeItemOn(mod: AIEmployee | undefined, week: { intake?: CourseIntake } | undefined, stepId: string | null): string | null {
  if (!week?.intake || !stepId) return null;
  const target = intakeCheckTarget(mod);
  return target && target.stepId === stepId ? target.itemId : null;
}

/** Section titles and question labels, for the copy rules. */
export function intakeCopy(form: CourseIntake | undefined): { path: string; label: string; text: string }[] {
  if (!form) return [];
  const out: { path: string; label: string; text: string }[] = [];
  if (form.intro?.trim()) out.push({ path: 'course.intake.intro', label: 'Intake intro', text: form.intro });
  form.sections.forEach((section: IntakeSection, s) => {
    out.push({ path: `course.intake.sections[${s}].title`, label: `Intake section ${s + 1}`, text: section.title });
    if (section.intro?.trim()) out.push({ path: `course.intake.sections[${s}].intro`, label: `Intake section ${s + 1} intro`, text: section.intro });
    section.questions.forEach((q, i) => {
      out.push({ path: `course.intake.sections[${s}].questions[${i}].label`, label: `Intake question ${q.id || i + 1}`, text: q.label });
      if (q.help?.trim()) out.push({ path: `course.intake.sections[${s}].questions[${i}].help`, label: `Intake question ${q.id || i + 1} help`, text: q.help });
      (q.options ?? []).forEach((o, n) => {
        if (o.trim()) out.push({ path: `course.intake.sections[${s}].questions[${i}].options[${n}]`, label: `Intake question ${q.id || i + 1} choice`, text: o });
      });
    });
  });
  return out;
}
