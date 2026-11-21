// D-196: the intake's questions, who may edit, and which box a submit checks.
import { describe, expect, it } from 'vitest';
import { cleanIntakeAnswers, intakeCheckTarget, intakeIssues, intakeMissing, mayEditIntake } from '../src/intake';
import { WEEK0_INTAKE, planIntakeV1 } from '../seed/intake-v1';
import { WEEK0_MODULE_ID } from '../seed/start-here-v1';
import { copyIssues, moduleCopyFields } from '../src/course-rules';
import { seedProduction } from '../seed/curriculum';
import type { AIEmployee } from '../src/types';

describe('Week 0 intake (D-196)', () => {
  it('keeps the four ids personalization reads, and the copy passes', () => {
    const ids = WEEK0_INTAKE.sections.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids).toEqual(expect.arrayContaining(['operator', 'ai', 'plan', 'google']));
    expect(WEEK0_INTAKE.sections.flatMap((s) => s.questions).find((q) => q.id === 'operator')?.options).toContain("I'm both");
    expect(WEEK0_INTAKE.sections.flatMap((s) => s.questions).find((q) => q.id === 'plan')?.options).toEqual([
      'Claude Pro', 'Claude Max', 'Claude Team', 'ChatGPT Plus', 'ChatGPT Pro', 'ChatGPT Business', 'Not on a paid plan yet',
    ]);
    expect(intakeIssues(WEEK0_INTAKE)).toEqual([]);
    const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
    week.course = { ...week.course!, intake: WEEK0_INTAKE };
    expect(copyIssues(moduleCopyFields(week).filter((f) => f.path.startsWith('course.intake')))).toEqual([]);
  });

  it('sets the intake only when Week 0 has none', () => {
    const out = planIntakeV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
    expect(out.changes.map((c) => c.target.id)).toEqual([WEEK0_MODULE_ID]);
    expect(planIntakeV1(out.db).changes).toEqual([]);
  });

  it('keeps only answers the form asks', () => {
    const answers = cleanIntakeAnswers(WEEK0_INTAKE, { ai: 'Claude', plan: 'Nope', name: '  Dana  ', extra: 'no' });
    expect(answers).toEqual({ ai: 'Claude', name: 'Dana' });
  });

  it('lets the owner and the operator edit, and finds the intake item', () => {
    expect(mayEditIntake('Team Owner')).toBe(true);
    expect(mayEditIntake('Operations Lead')).toBe(true);
    expect(mayEditIntake('Agent')).toBe(false);
    const mod = {
      id: 'accelerator-week-0',
      checklist: [{ id: 'c1', paths: { claude: { blocks: [{ type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'form', formId: 'intake', label: 'Open' } }] } } }],
    } as unknown as AIEmployee;
    expect(intakeCheckTarget(mod)).toEqual({ moduleId: 'accelerator-week-0', stepId: 'c1', itemId: 's1-intake' });
  });
});

describe('intakeMissing (D-229, B-16)', () => {
  it('lists the required questions with no answer, in the form’s order', () => {
    const form = {
      sections: [
        { title: 'A', questions: [{ id: 'name', label: 'Name', kind: 'short' as const, required: true }, { id: 'size', label: 'Size', kind: 'short' as const }] },
        { title: 'B', questions: [{ id: 'ai', label: 'AI', kind: 'choice' as const, options: ['Claude'], required: true }, { id: 'tools', label: 'Tools', kind: 'multi' as const, options: ['X'], required: true }] },
      ],
    };
    expect(intakeMissing(form, {})).toEqual(['name', 'ai', 'tools']);
    expect(intakeMissing(form, { name: '  ', ai: 'Claude', tools: [] })).toEqual(['name', 'tools']);
    expect(intakeMissing(form, { name: 'Alex', ai: 'Claude', tools: ['X'] })).toEqual([]);
  });
});
