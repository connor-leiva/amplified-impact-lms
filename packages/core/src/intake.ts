// Week 0 intake (D-196). Pure: no clock, no I/O.
//
// The questions live on the week's course. The answers live in `team_intake`, one row per team.
// These helpers decide who may edit, which ids personalization reads, and which checklist item a
// submit checks. Nothing here sends a message or writes outside the portal.

import type { CourseIntake, IntakeQuestion, IntakeSection } from './course-types';
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
        .map((x) => x.trim())
        .filter((x) => (q.options ?? []).includes(x));
      if (picked.length) out[id] = [...new Set(picked)];
      continue;
    }
    if (typeof value !== 'string') continue;
    const text = value.trim().slice(0, TEXT_MAX);
    if (!text) continue;
    if (q.kind === 'choice' && !(q.options ?? []).includes(text)) continue;
    out[id] = text;
  }
  return out;
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
