// D-242: a checklist item's Form button says what it does and carries the form's pen, never Download and its arrow:
// in the step player (the legacy view), on the v6 step page, and on the v3 drawer path (the intake's kit file, B-15).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ICONS, setViewerZone } from '@ai/core';
import type { PathBlock } from '@ai/core/course-types';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { stepVM } from './Step.vm';
import type { ChecklistLayoutVM, CheckItemVM, StepVM } from './Step.vm';
import { ChecklistPlayer } from './Checklist';
import { buildKitVM } from './WeekContent.vm';
import { LEARNER_ID, prelaunchState } from './test/fixture';
import { CheckItem } from './step-page/Checklist';
import { V6_LABELS, V6_MORE, stepPageStep } from './step-page/StepPage.vm';
import type { V6Handlers } from './step-page/StepPage.vm';

const mutate = vi.fn(async () => ({}));
vi.mock('../../data/hooks', () => ({ useMutate: () => mutate }));

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const learner = { kind: 'learner', userId: LEARNER_ID } as const;

const blocks: PathBlock[] = [
  { type: 'check', id: 's1-intake', title: 'Fill in the intake', action: { type: 'form', formId: 'intake', label: '' } },
  { type: 'check', id: 's1-stack', title: 'Fill in the stack card', action: { type: 'form', formId: 'stack-card', label: 'Open the form' } },
  { type: 'check', id: 's1-seat', title: 'Fill in the seat card', action: { type: 'form', formId: 'seat-card', label: '' } },
  { type: 'check', id: 's1-own', title: 'Start the intake', action: { type: 'form', formId: 'intake', label: 'Start Your Intake' } },
];

function model(): { vm: StepVM; layout: ChecklistLayoutVM; rows: ReturnType<typeof weekRows> } {
  const st = prelaunchState();
  const p = structuredClone(st.payload);
  const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } };
  week.module.checklist[0]!.paths = { claude: { blocks } };
  const rows = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID));
  const vm = stepVM(p, rows[0], 1, learner, st.now);
  if (vm.kind !== 'step' || !vm.layouts?.claude) throw new Error('missing layout');
  return { vm, layout: vm.layouts.claude, rows };
}

const actionOf = (layout: ChecklistLayoutVM, id: string): CheckItemVM['action'] => layout.items.find((it) => it.id === id)?.action ?? null;

describe('a Form button’s words (D-242)', () => {
  it('defaults to what each form does, keeps a label staff set, and marks the form', () => {
    const { layout } = model();
    expect(actionOf(layout, 's1-intake')).toEqual({ type: 'link', label: 'Open and Submit the Intake Form', href: '/learn/week/0/intake', form: 'intake' });
    expect(actionOf(layout, 's1-stack')).toEqual({ type: 'link', label: 'Open Your Stack Card', href: '/learn/week/0/stack', form: 'stack-card' });
    expect(actionOf(layout, 's1-seat')).toEqual({ type: 'seatcard', label: 'Fill In Your Seat Card' });
    expect(actionOf(layout, 's1-own')).toEqual({ type: 'link', label: 'Start Your Intake', href: '/learn/week/0/intake', form: 'intake' });
  });

  it('the step player (legacy view) draws the pen, not the download arrow, on a Form button', () => {
    const { vm, layout } = model();
    render(
      <MemoryRouter>
        <ChecklistPlayer vm={vm} layout={layout} platform="claude" setPlatform={() => undefined} onPlay={() => undefined} />
      </MemoryRouter>,
    );
    for (const name of ['Open and Submit the Intake Form', 'Open Your Stack Card', 'Start Your Intake']) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('data-act', 'form');
      expect(link.querySelector(`path[d="${ICONS.pencil}"]`)).not.toBeNull();
      expect(link.querySelector(`path[d="${ICONS.r2Download}"]`)).toBeNull();
    }
    expect(screen.queryByText(/download/i)).toBeNull();
  });
});

describe('the v6 step page’s Form buttons (D-242)', () => {
  const media = { duration: null, cues: [], poster: undefined, captions: undefined };
  const base: V6Handlers = { onCalendar: () => undefined, onViewPrompt: () => undefined };
  const labels = { ...V6_LABELS, ...V6_MORE };
  const draw = (item: ReturnType<typeof stepPageStep>['items'][number]) =>
    render(<CheckItem item={item} checked={false} onToggle={() => undefined} onPlay={() => undefined} labels={labels} />);

  it('a form link and the seat card’s button carry the pen and the form’s words', () => {
    const { vm, layout, rows } = model();
    const kit = buildKitVM(rows[0]?.module, () => null);
    const step = stepPageStep(vm, layout, kit, media, { ...base, seatCard: { open: () => undefined } });
    const byId = (id: string) => step.items.find((it) => it.id === id)!;
    expect(byId('s1-intake').action).toEqual({ type: 'link', label: 'Open and Submit the Intake Form', href: '/learn/week/0/intake', form: true });
    expect(byId('s1-stack').action).toEqual({ type: 'link', label: 'Open Your Stack Card', href: '/learn/week/0/stack', form: true });
    expect(byId('s1-seat').action).toMatchObject({ type: 'form', label: 'Fill In Your Seat Card' });

    const { container: intake } = draw(byId('s1-intake'));
    const open = within(intake).getByRole('link', { name: 'Open and Submit the Intake Form' });
    expect(open.querySelector('use[href="#i-pen"]')).not.toBeNull();
    expect(open.querySelector('use[href="#i-down"]')).toBeNull();
    const { container: seat } = draw(byId('s1-seat'));
    expect(within(seat).getByRole('button', { name: 'Fill In Your Seat Card' }).querySelector('use[href="#i-pen"]')).not.toBeNull();
  });

  it('the v3 drawer path: the intake’s kit file is the intake form’s button, and any other file still downloads', () => {
    const { vm, layout, rows } = model();
    const kit = buildKitVM(rows[0]?.module, () => null);
    const files = [
      { id: 'intake-form', title: 'Week 0 Intake Form (PDF)', href: '/api/files/resource/intake-form' },
      { id: 'other', title: 'The Week 0 Guide', href: '/api/files/resource/other' },
    ];
    const withFile: ChecklistLayoutVM = { ...layout, items: [{ ...layout.items[0]!, action: { type: 'download', files } }] };

    const plain = stepPageStep(vm, withFile, kit, media, base).items[0]!;
    expect(plain.action).toEqual({ type: 'download', files });

    const v3 = stepPageStep(vm, withFile, kit, media, { ...base, intakeFiles: ['intake-form'] }).items[0]!;
    expect(v3.action).toEqual({ type: 'download', files: [{ ...files[0], form: 'Open and Submit the Intake Form' }, files[1]] });
    const { container } = draw(v3);
    const form = within(container).getByRole('link', { name: 'Open and Submit the Intake Form' });
    expect(form).toHaveAttribute('href', '/api/files/resource/intake-form');
    expect(form.querySelector('use[href="#i-pen"]')).not.toBeNull();
    expect(form.querySelector('use[href="#i-down"]')).toBeNull();
    expect(within(container).queryByText('Week 0 Intake Form (PDF)')).toBeNull();
    const other = within(container).getByRole('link', { name: 'The Week 0 Guide' });
    expect(other.querySelector('use[href="#i-down"]')).not.toBeNull();
  });
});
