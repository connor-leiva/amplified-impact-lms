// D-245: what a checklist item's Form button says to a learner. A form's button says what it does: one default per
// form, in Title Case, and a label staff set in the builder wins. Until D-245 the builder filled a new Form button with
// "Open the form", which names no form and no task, so that stored value counts as no label.
import type { CheckAction } from './course-types';

/** The three forms a Form button opens (the Week Builder's Form menu). */
export type FormId = Extract<CheckAction, { type: 'form' }>['formId'];

/** Each form's button, when staff set none. */
export const FORM_BUTTON_LABEL: Readonly<Record<FormId, string>> = {
  intake: 'Open and Submit the Intake Form',
  'stack-card': 'Open Your Stack Card',
  'seat-card': 'Fill In Your Seat Card',
};

/** What the builder stored in a new Form button's label before D-245: filled in, never chosen. */
export const FORM_LABEL_UNSET = 'Open the form';

/** The label staff set on a Form button, as stored: empty when they set none (blank, or the builder's old fill). */
export function ownFormLabel(label: string | null | undefined): string {
  const s = label ?? '';
  return s.trim().toLowerCase() === FORM_LABEL_UNSET.toLowerCase() ? '' : s;
}

/** A Form button's words: the label staff set, else the form's own (`FORM_BUTTON_LABEL`). */
export function formButtonLabel(action: { formId: FormId; label?: string | null }): string {
  return ownFormLabel(action.label).trim() || FORM_BUTTON_LABEL[action.formId];
}
