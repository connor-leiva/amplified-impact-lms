// SEED, NOT RUNTIME (D-196). Week 0's intake, Design Nov 19, 2026. A one-time data step sets it on
// accelerator-week-0 only when that week has no intake yet. It never overwrites one staff saved.
// The repo had topic names (team size, cadence, operator, CRM, tasks, problems, access) and no
// question form, so these 20 questions are the form. Runtime code may not import this file.

import type { CourseIntake } from '../src/course-types';
import type { Db } from '../src/types';
import type { DataStepOutcome } from './data-step';
import { WEEK0_MODULE_ID } from './start-here-v1';

export const INTAKE_V1 = '2026-11-19-intake';

const choice = (id: string, label: string, options: string[], help?: string) => ({ id, label, kind: 'choice' as const, options, ...(help ? { help } : {}) });
const text = (id: string, label: string, kind: 'short' | 'long', help?: string) => ({ id, label, kind, ...(help ? { help } : {}) });

export const WEEK0_INTAKE: CourseIntake = {
  intro:
    "The goal of this intake is that we know your team before we build anything with you. Your answers tell us which AI you're on, what your data lives in, and who sets everything up. That way your operator gets the right setup path, and we can spot anything that needs another route before the live builds start on Wednesday, December 2. Short answers are fine. If you're not sure of something, say so and skip it.",
  sections: [
    {
      title: 'You and Your Team',
      questions: [
        text('name', 'Your name and email.', 'short'),
        text('team', "Your team's name and brokerage.", 'short'),
        text('size', 'Team size (how many agents and staff today).', 'short'),
        text('lead-desk', 'Who leads your lead desk?', 'short', 'Write "me" if it is you.'),
        text('cadence', 'Your weekly meeting cadence (meetings, day and time, who runs each).', 'long'),
        text('one-on-ones', 'Do you hold 1:1s with your agents?', 'long', 'If yes, who runs them and how often.'),
      ],
    },
    {
      title: 'Your Operator',
      questions: [
        choice('operator', 'Who is your operator?', ["I'm both", 'A teammate'], 'Name, email and role, or "I\'m both."'),
        text('operator-name', 'Their name and email.', 'short', 'Skip this if you chose I\'m both.'),
        choice('invited', 'Have you invited them in the portal yet?', ['Yes', 'Not yet']),
      ],
    },
    {
      title: 'Your AI',
      questions: [
        choice('ai', 'Which AI will your team use for the course?', ['Claude', 'ChatGPT']),
        choice('plan', 'Which plan are you on, or will you be on by Monday, November 30?', [
          'Claude Pro',
          'Claude Max',
          'Claude Team',
          'ChatGPT Plus',
          'ChatGPT Pro',
          'ChatGPT Business',
          'Not on a paid plan yet',
        ]),
        choice('account', 'Whose AI account runs your hires?', ["The operator's account (our default)", "The owner's account", "Another teammate's account"]),
        choice('chatgpt-admin', 'On ChatGPT only: does that person have admin access to your ChatGPT workspace?', ['Yes', 'No', 'Not on ChatGPT']),
      ],
    },
    {
      title: 'Your Stack',
      questions: [
        choice('books', 'Your accounting system.', ['QuickBooks Online', 'QuickBooks Desktop', 'Xero', 'My bookkeeper has it', 'Something else']),
        text('books-close', 'Who owns your accounting and reports, and what day do your books usually close each month?', 'long'),
        text('sisu', 'Do you use Sisu?', 'long', 'If yes, what access does the person running your hires have: admin, TC or agent?'),
        text('crm', 'Your CRM.', 'long', 'Follow Up Boss, KW Command, Brivity, GoHighLevel, or something else. Can you export a speed-to-lead report from it?'),
        choice('google', 'Email, calendar and files: is your team on Google Workspace?', ['Yes', 'No']),
        text('google-other', 'If you are not on Google, what do you use?', 'short'),
        text('tasks', 'Where your tasks live.', 'long'),
      ],
    },
    {
      title: 'Anything We Should Know',
      questions: [
        text('problems', "Three recurring problems you'd like off your plate.", 'long'),
        text('access', 'Known access restrictions.', 'long'),
      ],
    },
  ],
};

export function planIntakeV1(db: Db): DataStepOutcome {
  const m = db.modules.find((x) => x.id === WEEK0_MODULE_ID);
  if (!m) return { db, changes: [], skipped: [{ id: WEEK0_MODULE_ID, reason: 'the week is not in this database' }] };
  if (!m.course) return { db, changes: [], skipped: [{ id: WEEK0_MODULE_ID, reason: 'the week has no course page in this database' }] };
  if (m.course.intake !== undefined) return { db, changes: [], skipped: [{ id: `${WEEK0_MODULE_ID}.course.intake`, reason: 'the intake was already set in the builder' }] };
  const course = { ...m.course, intake: structuredClone(WEEK0_INTAKE) };
  return {
    db: { ...db, modules: db.modules.map((x) => (x.id === m.id ? { ...x, course } : x)) },
    changes: [{ target: { type: 'module', id: m.id, label: m.name }, before: { intake: false }, after: { intake: true } }],
    skipped: [],
  };
}
