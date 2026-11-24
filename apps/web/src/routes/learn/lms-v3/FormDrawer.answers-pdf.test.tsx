// D-246: once the team has submitted, the intake drawer's confirmation offers Download Your Answers (PDF). It is the
// intake's own option (`ui.submittedPdfLabel`): the package's drawer (the equality test's), and the seat card's, have
// none, and a draft shows no banner to put it on.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SeatCard } from '@ai/core/course-types';
import { intakeForm } from '@lms-v3-pkg/sample-data.js';
import { FormDrawer, useForm } from './FormDrawer';
import { FORM_UI, formDef } from './form.vm';
import { seatCardDef } from './seatcard.vm';
import type { FormDef, FormInitial } from './types';

const LABEL = 'Download Your Answers (PDF)';
// The drawer's async buttons carry their done word too ("… Downloaded"), so a button is found by how its name starts.
const NAME = /^Download Your Answers \(PDF\)/;
const def = formDef({
  sections: [{ title: 'You and Your Team', questions: [{ id: 'name', label: 'Your name and email.', kind: 'short', required: true }] }],
});

function Drawer({ form, initial, onDownloadPdf }: { form: FormDef; initial: FormInitial; onDownloadPdf: () => Promise<unknown> }) {
  const f = useForm({ form, initial, onSave: () => Promise.resolve(), onSubmit: () => Promise.resolve(), onDownloadPdf });
  return <FormDrawer f={f} open onClose={() => {}} />;
}

describe('Download Your Answers (PDF) on the drawer’s confirmation (D-246)', () => {
  it('sits on the submitted banner, Title Case, beside the foot’s Download PDF', () => {
    render(<Drawer form={def} initial={{ status: 'submitted', answers: { name: 'Dana' } }} onDownloadPdf={() => Promise.resolve()} />);
    const banner = document.querySelector<HTMLElement>('.fm-banner')!;
    expect(banner).toHaveTextContent('Intake submitted.');
    expect(within(banner).getByRole('button', { name: NAME })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download PDF/ })).toBeInTheDocument();
    expect(LABEL).not.toMatch(/\u2014/);
  });

  it('asks for the team’s PDF once, however often it is pressed while the file is made', async () => {
    let finish: () => void = () => undefined;
    const download = vi.fn(() => new Promise<void>((r) => { finish = r; }));
    render(<Drawer form={def} initial={{ status: 'submitted', answers: { name: 'Dana' } }} onDownloadPdf={download} />);
    const button = within(document.querySelector<HTMLElement>('.fm-banner')!).getByRole('button', { name: NAME });
    await act(async () => { fireEvent.click(button); });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await act(async () => { fireEvent.click(button); fireEvent.click(screen.getByRole('button', { name: /^Download PDF/ })); });
    expect(download).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    expect(button).toHaveAttribute('data-state', 'done');
  });

  it('is not offered on a draft: there is no confirmation yet', () => {
    render(<Drawer form={def} initial={{ status: 'draft', answers: { name: 'Dana' } }} onDownloadPdf={() => Promise.resolve()} />);
    expect(document.querySelector('.fm-banner')).toBeNull();
    expect(screen.queryByRole('button', { name: NAME })).toBeNull();
  });

  it('appears after a submit in the drawer', async () => {
    render(<Drawer form={def} initial={{ status: 'draft', answers: { name: 'Dana' } }} onDownloadPdf={() => Promise.resolve()} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Submit intake/ })); });
    expect(within(document.querySelector<HTMLElement>('.fm-banner')!).getByRole('button', { name: NAME })).toBeInTheDocument();
  });

  it('is the intake’s alone: the package’s drawer and the seat card have no such button', () => {
    expect(FORM_UI.submittedPdfLabel).toBe(LABEL);
    expect((intakeForm as FormDef).ui.submittedPdfLabel).toBeUndefined();
    const card: SeatCard = { seat: 'Finance Analyst', reportsTo: 'Owner', runs: 'Monthly', pulls: 'Books', applies: 'The chart', produces: 'Numbers', tookOver: 'Task 1', cantDo: 'Change the books' };
    for (const role of ['owner', 'operator', 'agent'] as const) {
      expect(seatCardDef(card, { week: 1, step: 6 }, role, { signedAt: 1, signedBy: 'Alex' }).ui.submittedPdfLabel).toBeUndefined();
    }
    render(<Drawer form={intakeForm as FormDef} initial={{ status: 'submitted', answers: {} }} onDownloadPdf={() => Promise.resolve()} />);
    expect(screen.queryByRole('button', { name: NAME })).toBeNull();
  });
});
