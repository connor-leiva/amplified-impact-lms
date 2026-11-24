// D-196: the intake's questions, who may edit, and which box a submit checks.
import { describe, expect, it } from 'vitest';
import { cleanIntakeAnswers, intakeCheckTarget, intakeFileIds, intakeIssues, intakeItemOn, intakeMissing, mayEditIntake, unlistedIntakeFiles } from '../src/intake';
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

describe('intakeFileIds (D-229, B-14, B-15): the kit files the form drawer replaces', () => {
  const week0 = (blocks: unknown[]) =>
    ({ id: 'accelerator-week-0', checklist: [{ id: 'c1', paths: { claude: { blocks }, chatgpt: { blocks } } }, { id: 'c2' }] }) as unknown as AIEmployee;
  const kit = [
    { id: 'rmwmyx39v0aa9cbd8a', title: 'Week 0 Intake Form', stepId: 'c1' },
    { id: 'rmwstack', title: 'Week 0 Stack Card', stepId: 'c1' },
    { id: 'rmwother', title: 'Coaching Intake Form', stepId: 'c2' },
  ];
  it('production’s shape: the file the intake’s item downloads, by its generated id', () => {
    const mod = week0([
      { type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'download', kitItemIds: ['rmwmyx39v0aa9cbd8a'] } },
      { type: 'check', id: 's1-stack', title: 'Send back your stack card', action: { type: 'download', kitItemIds: ['rmwstack'] } },
    ]);
    expect(intakeFileIds(mod, kit)).toEqual(['rmwmyx39v0aa9cbd8a']);
  });
  it('an intake item with no download: the file on its step titled as the intake form', () => {
    const mod = week0([{ type: 'check', id: 's1-intake', title: 'Fill in your intake' }]);
    expect(intakeFileIds(mod, kit)).toEqual(['rmwmyx39v0aa9cbd8a']);
  });
  it('the spec’s id, and nothing for a week with no intake file', () => {
    expect(intakeFileIds(week0([]), [{ id: 'intake-form', title: 'Intake', stepId: null }])).toEqual(['intake-form']);
    expect(intakeFileIds(week0([]), kit.slice(1))).toEqual([]);
    expect(intakeFileIds(undefined, kit)).toEqual([]);
  });
});

describe('the static intake PDF is no longer a step file (D-246)', () => {
  const week0 = (blocks: unknown[]) =>
    ({ id: 'accelerator-week-0', checklist: [{ id: 'c1', paths: { claude: { blocks }, chatgpt: { blocks } } }, { id: 'c2' }] }) as unknown as AIEmployee;
  const kit = [
    { id: 'rmwmyx39v0aa9cbd8a', title: 'Week 0 Intake Form', stepId: 'c1' },
    { id: 'rmwstack', title: 'Week 0 Stack Card', stepId: 'c1' },
  ];
  const intake = { sections: [] };
  const mod = week0([
    { type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'download', kitItemIds: ['rmwmyx39v0aa9cbd8a'] } },
    { type: 'check', id: 's1-stack', title: 'Send back your stack card', action: { type: 'download', kitItemIds: ['rmwstack'] } },
  ]);
  it('a week with the intake form stops listing the intake’s PDF, and only that file', () => {
    expect(unlistedIntakeFiles(mod, { intake, kit })).toEqual(['rmwmyx39v0aa9cbd8a']);
  });
  it('a week without the form keeps every file, and a week with no PDF has nothing to drop', () => {
    expect(unlistedIntakeFiles(mod, { kit })).toEqual([]);
    expect(unlistedIntakeFiles(mod, { intake, kit: kit.slice(1) })).toEqual([]);
    expect(unlistedIntakeFiles(mod, undefined)).toEqual([]);
  });
  it('the intake’s checklist item, on its own step only, and only with the form', () => {
    expect(intakeItemOn(mod, { intake }, 'c1')).toBe('s1-intake');
    expect(intakeItemOn(mod, { intake }, 'c2')).toBeNull();
    expect(intakeItemOn(mod, {}, 'c1')).toBeNull();
    expect(intakeItemOn(mod, { intake }, null)).toBeNull();
  });
});
