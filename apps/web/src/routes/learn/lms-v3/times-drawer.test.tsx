// D-259: the form drawer's own stamps, as it saves and submits, in the learner portal with LMS v3 on: the one line,
// "Saved 2:18 PM MT / 3:18 PM CT" and "Submitted Nov 20, 2:18 PM MT / 3:18 PM CT". Off, the package's stamp
// (FormDrawer.equality.test.tsx holds that one to the package's).
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setTimeStyle, setViewerZone } from '@ai/core';
import { intakeForm, intakeSamples } from '@lms-v3-pkg/sample-data.js';
import { FormDrawer, useForm } from './FormDrawer';
import type { FormInitial } from './types';

function Repo({ initial }: { initial: FormInitial }) {
  const f = useForm({ form: intakeForm, initial, onSave: () => Promise.resolve(), onSubmit: () => Promise.resolve(), onDownloadPdf: () => Promise.resolve() });
  return <><p data-row="">{`${f.row.meta} · ${f.row.label}`}</p><FormDrawer f={f} open onClose={() => {}} /></>;
}

describe('the drawer’s stamps in the learner portal (D-259)', () => {
  afterEach(() => {
    vi.useRealTimers();
    setTimeStyle('viewer');
    setViewerZone(null);
  });

  it('saving and submitting stamp the one line, for a viewer in any zone', async () => {
    setTimeStyle('mtct');
    setViewerZone('America/New_York');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(Date.parse('2026-11-20T21:18:00Z')); // Fri, Nov 20, 2:18 PM MT / 3:18 PM CT
    const c = render(<Repo initial={intakeSamples.new} />).container;
    await act(async () => { fireEvent.change(c.querySelector('[id="fm-name"]')!, { target: { value: 'Alex Morgan, alex@example.com' } }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(c.querySelector('.fm-save')!.textContent).toBe('Saved 2:18 PM MT / 3:18 PM CT');
    for (const q of intakeForm.intake.sections.flatMap((x: { questions: { id: string; kind: string; required?: boolean }[] }) => x.questions)) {
      if (!q.required) continue;
      if (q.kind === 'choice') await act(async () => { fireEvent.click(c.querySelector(`[data-field="${q.id}"] input`)!); });
      else await act(async () => { fireEvent.change(c.querySelector(`[id="fm-${q.id}"]`)!, { target: { value: 'Northline Realty' } }); });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    await act(async () => { fireEvent.click(c.querySelector('.fm-submit')!); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(c.querySelector('.fm-save')!.textContent).toBe('Submitted Nov 20, 2:18 PM MT / 3:18 PM CT');
  });
});
