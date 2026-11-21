// D-229: the form drawer's props (`useForm`'s `form` and `initial`) from the course's intake and `GET /api/intake`
// (IMPLEMENTATION-SPEC.md §7.4). Pure. The questions are the builder's (with `required`, B-16); the drawer's own words
// are the mockup's (`handoff/lms-v3/src/forms/week-0-intake.json` › `ui`), here as constants.
import { fmt } from '@ai/core';
import type { CourseIntake } from '@ai/core/course-types';
import type { KitRow, FormDef, FormInitial, FormUi } from './types';

export const FORM_ID = 'intake';
/** The kit file that is the intake (B-14): its row becomes the form's row. */
export const INTAKE_KIT_ID = 'intake-form';

/**
 * B-15: a click on a step page that opens the intake's drawer in place. The old intake page's address (a step's `form`
 * action), and the intake's kit file (`intake-form`: a step's `download` action and the rail's View), which was the
 * "download the PDF and fill it in" path the drawer replaces (B-14 counts that file as the intake). Production's Week 0
 * step 1 reaches the intake through the file, so without it nothing on the step opened the drawer.
 */
export function opensIntakeDrawer(pathname: string, intakePage: string, intakeFile: string | null): boolean {
  return pathname === intakePage || (intakeFile !== null && pathname === intakeFile);
}

export const FORM_UI: FormUi = {
  title: 'Week 0 Intake',
  kicker: 'Week 0 · Step 1 · Owner and operator',
  sub: 'Your answers save as you go, for your whole team.',
  submitLabel: 'Submit intake',
  submittedTitle: 'Intake submitted.',
  submittedText: 'Your answers are with the Amplified Impact team. Change anything here and it saves the same way.',
  optional: 'Optional',
  needText: 'Add an answer.',
  needChoice: 'Pick one.',
};

export const formDef = (intake: CourseIntake): FormDef => ({ id: FORM_ID, ui: FORM_UI, intake });

/** What `GET /api/intake` answers. */
export interface IntakeBody {
  answers?: Record<string, string | string[]>;
  updatedAt?: number | null;
  submittedAt?: number | null;
}

const DAY = 86_400_000;
/** The same day on the viewer's calendar. */
const sameDay = (a: number, b: number): boolean => Math.abs(a - b) < DAY && fmt.date(a) === fmt.date(b);

/**
 * B-17: "Saved 3:18 PM" the same day, "Saved Thu 4:02 PM" within the week, "Saved Nov 12, 4:02 PM" before that; and
 * "Submitted Nov 20, 3:18 PM", with the row's short date "Nov 20". The viewer's clock, as the drawer's own stamps are.
 */
export function savedLabel(t: number, now: number): string {
  if (sameDay(t, now)) return `Saved ${fmt.clockTime(t)}`;
  if (now - t < 6 * DAY) return `Saved ${fmt.weekdayShort(t)} ${fmt.clockTime(t)}`;
  return `Saved ${fmt.date(t)}, ${fmt.clockTime(t)}`;
}

export function formInitial(body: IntakeBody | null, now: number): FormInitial {
  const answers = body?.answers ?? {};
  const submittedAt = body?.submittedAt ?? null;
  const updatedAt = body?.updatedAt ?? null;
  if (submittedAt !== null)
    return {
      status: 'submitted',
      answers,
      savedLabel: `Submitted ${fmt.date(submittedAt)}, ${fmt.clockTime(submittedAt)}`,
      submittedShort: fmt.date(submittedAt),
    };
  if (Object.keys(answers).length)
    return { status: 'draft', answers, ...(updatedAt !== null ? { savedLabel: savedLabel(updatedAt, now) } : {}) };
  return { status: 'new', answers };
}

/** B-14: the intake's kit row as the form's row: its line ("Step 1 · 9 of 22 answered") and one button that opens it. */
export function formRow(row: KitRow, f: { row: { meta: string; label: string } }, onOpen: () => void): KitRow {
  const { href: _href, acts: _acts, ...rest } = row;
  return {
    ...rest,
    form: FORM_ID,
    meta: [row.meta, f.row.meta].filter(Boolean).join(' · '),
    acts: [{ icon: 'pen', label: f.row.label, act: 'form', onClick: onOpen }],
  };
}
