// D-241: the static intake PDF no longer needs to be a step file. Once Week 0 has the intake form, the step's
// "For this step" and the week's kit stop listing the blank PDF, and the intake's checklist item still opens the form
// when the file is gone from the week. A week without the form keeps its files as they are.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { PathBlock } from '@ai/core/course-types';
import { weekRows } from './learn.vm';
import { stepVM } from './Step.vm';
import { weekVM } from './Week.vm';
import { LEARNER_ID, prelaunchState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const st = prelaunchState();
const learner = { kind: 'learner', userId: LEARNER_ID } as const;
const fileUrl = (id: string) => `/api/files/resource/${id}`;
const INTAKE_PDF = { id: 'rmwintake', title: 'Week 0 Intake Form', kind: 'file' as const, platform: null, stepId: 'c1' };
const STACK = { id: 'rmwstack', title: 'Week 0 Stack Card', kind: 'file' as const, platform: null, stepId: 'c1' };
// Production's Week 0 step 1: the intake's item downloads the PDF (by its generated id), the stack card's its card.
const BLOCKS: PathBlock[] = [
  { type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'download', kitItemIds: [INTAKE_PDF.id] } },
  { type: 'check', id: 's1-stack', title: 'Send back your stack card', action: { type: 'download', kitItemIds: [STACK.id] } },
];

type Week0 = { intake?: { sections: [] }; kit?: (typeof STACK)[]; module: { checklist: { paths?: unknown }[] } };

function week0({ form, file }: { form: boolean; file: boolean }) {
  const p = structuredClone(st.payload);
  const db = structuredClone(st.db);
  const w = p.course.weeks[0] as unknown as Week0;
  if (form) w.intake = { sections: [] };
  w.kit = [...(file ? [INTAKE_PDF] : []), STACK];
  w.module.checklist[0]!.paths = { claude: { blocks: BLOCKS } };
  (db.modules.find((m) => m.id === 'accelerator-week-0')!.checklist[0] as { paths?: unknown }).paths = { claude: { blocks: BLOCKS } };
  const rows = weekRows(p, db, learnerOf(db, LEARNER_ID));
  const step = stepVM(p, rows[0], 1, learner, st.now, { fileUrl, tab: 'claude' });
  if (step.kind !== 'step') throw new Error('missing');
  const week = weekVM(p, rows, 0, st.now, fileUrl);
  if (week.kind !== 'open') throw new Error('locked');
  return { step, week };
}

describe('the static intake PDF is no longer a step file (D-241)', () => {
  it('For this step lists the stack card and not the blank intake PDF, once the week has the form', () => {
    const { step } = week0({ form: true, file: true });
    expect(step.forStep.map((r) => r.title)).toEqual(['Week 0 Stack Card']);
  });

  it('the week’s kit lists the stack card and not the blank intake PDF', () => {
    const { week } = week0({ form: true, file: true });
    const titles = week.kit!.rows.map((r) => r.title);
    expect(titles).toContain('Week 0 Stack Card');
    expect(titles).not.toContain('Week 0 Intake Form');
  });

  it('a week without the form keeps the PDF where it was, on the step and in the kit', () => {
    const { step, week } = week0({ form: false, file: true });
    expect(step.forStep.map((r) => r.title)).toEqual(['Week 0 Intake Form', 'Week 0 Stack Card']);
    expect(week.kit!.rows.map((r) => r.title)).toContain('Week 0 Intake Form');
  });

  it('with the PDF gone from the week, the intake’s item opens the form; the stack card’s still downloads', () => {
    const { step } = week0({ form: true, file: false });
    const items = step.layouts?.claude?.items ?? [];
    // As a Form button naming the intake draws (`formButtonLabel`): its words and the form's pen.
    expect(items.find((i) => i.id === 's1-intake')?.action).toEqual({ type: 'link', label: 'Open and Submit the Intake Form', href: '/learn/week/0/intake', form: 'intake' });
    expect(items.find((i) => i.id === 's1-stack')?.action).toMatchObject({ type: 'download', files: [{ id: STACK.id, title: STACK.title }] });
  });

  it('with the PDF still on the week, the intake’s item keeps its download (the v3 step opens the drawer from it)', () => {
    const { step } = week0({ form: true, file: true });
    expect(step.layouts?.claude?.items.find((i) => i.id === 's1-intake')?.action).toMatchObject({ type: 'download', files: [{ id: INTAKE_PDF.id }] });
  });

  it('without the form, a download that names no file is still nothing, as before', () => {
    const { step } = week0({ form: false, file: false });
    expect(step.layouts?.claude?.items.find((i) => i.id === 's1-intake')?.action).toBeNull();
  });
});
