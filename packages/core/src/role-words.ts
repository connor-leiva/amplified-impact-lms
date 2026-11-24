// D-242: the course's second role is the AI Implementer (it was the operator). Pure: no clock, no I/O.
//
// The role's ids stay as they were: the step role `operator`, the week's `operator` lines, the glossary
// term `operator`, the intake's `operator` and `operator-name` questions, and the account role
// `Operations Lead`. Only words a person reads change. These helpers let words saved before the rename
// (a team's intake answers, a step's Who line, a condition staff set) still mean what they meant.

/** The role's name, as every learner and admin surface writes it. */
export const AI_IMPLEMENTER = 'AI Implementer';

/**
 * "operator" as a whole word, any case, singular or plural, possessive included. A letter, digit,
 * underscore or hyphen on either side blocks it, so an id like `operator-name` and a word like
 * "cooperator" are left alone.
 */
const OPERATOR_WORD = /(?<![\p{L}\p{N}_-])operator(s?)(?![\p{L}\p{N}_-])/giu;

/**
 * The same words with the role renamed: "operator" and "Operator" become "AI Implementer",
 * "operators" becomes "AI Implementers", "an operator" becomes "an AI Implementer". Text with no such
 * word comes back as the same string.
 */
export function implementerWords(text: string): string {
  return text.replace(OPERATOR_WORD, (_m: string, plural: string) => `${AI_IMPLEMENTER}${plural}`);
}

/** Whether `implementerWords` would change this text. */
export const holdsOperatorWord = (text: string): boolean => new RegExp(OPERATOR_WORD.source, 'iu').test(text);

/** Two answers or option words that are the same once the rename is read through, ignoring case and spaces. */
export const sameRoleWords = (a: string, b: string): boolean =>
  implementerWords(a).trim().toLowerCase() === implementerWords(b).trim().toLowerCase();
