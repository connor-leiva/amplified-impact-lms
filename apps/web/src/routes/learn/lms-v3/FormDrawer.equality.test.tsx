// D-225 (IMPLEMENTATION-SPEC.md §2.2): the v3 components are the package's, converted to TSX and nothing else. This
// renders the package's own JSX and the repo's TSX with the package's sample props and compares the HTML string. A
// renamed class, a moved element or a changed attribute fails here before any pixel test runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormDrawer as PkgDrawer, useForm as usePkgForm } from '@lms-v3-pkg/components/FormDrawer.jsx';
import { intakeForm, intakeSamples } from '@lms-v3-pkg/sample-data.js';
import { FormDrawer, useForm } from './FormDrawer';
import type { FormInitial } from './types';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// The drawer and its hook, each with its own: the package's useForm drives the package's drawer, the repo's the repo's.
function Repo({ initial, open = true }: { initial: FormInitial; open?: boolean }) {
  const f = useForm({ form: intakeForm, initial, onSave: () => Promise.resolve(), onSubmit: () => Promise.resolve(), onDownloadPdf: () => Promise.resolve() });
  return <><p data-row="">{`${f.row.meta} · ${f.row.label}`}</p><FormDrawer f={f} open={open} onClose={() => {}} /></>;
}
function Package({ initial, open = true }: { initial: FormInitial; open?: boolean }) {
  const f = usePkgForm({ form: intakeForm, initial, onSave: () => Promise.resolve(), onSubmit: () => Promise.resolve(), onDownloadPdf: () => Promise.resolve() });
  return <><p data-row="">{`${f.row.meta} · ${f.row.label}`}</p><PkgDrawer f={f} open={open} onClose={() => {}} /></>;
}

describe('FormDrawer and useForm are the package’s, converted and nothing else', () => {
  afterEach(() => { vi.useRealTimers(); });
  it.each(['new', 'draft', 'submitted'])('at rest, %s', (k) => {
    const initial = intakeSamples[k];
    for (const open of [true, false]) {
      expect(html(<Repo initial={initial} open={open} />)).toBe(html(<Package initial={initial} open={open} />));
    }
  });
  it('typing, saving, a submit with answers missing, then a complete submit', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(Date.parse('2026-11-20T21:18:00Z'));
    const a = render(<Repo initial={intakeSamples.new} />).container;
    const b = render(<Package initial={intakeSamples.new} />).container;
    const both = async (fn: (c: HTMLElement) => void) => { await act(async () => { fn(a); fn(b); }); };
    const same = () => expect(a.innerHTML).toBe(b.innerHTML);
    // The two drawers share their ids, and jsdom answers `#id` from the document's first match: query by attribute.
    same();
    await both((c) => { fireEvent.change(c.querySelector('[id="fm-name"]')!, { target: { value: 'Alex Morgan, alex@example.com' } }); });
    same();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('.fm-submit')!); });
    same();
    expect(a.querySelector('.fm-note')!.textContent).toMatch(/still needed$/);
    for (const q of intakeForm.intake.sections.flatMap((x: { questions: { id: string; kind: string; options?: string[]; required?: boolean }[] }) => x.questions)) {
      if (!q.required) continue;
      if (q.kind === 'choice') await both((c) => { fireEvent.click(c.querySelector(`[data-field="${q.id}"] input`)!); });
      else await both((c) => { fireEvent.change(c.querySelector(`[id="fm-${q.id}"]`)!, { target: { value: 'Northline Realty' } }); });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('.fm-submit')!); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    same();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    same();
    expect(a.querySelector('[data-row]')!.textContent).toMatch(/^Submitted /);
  });
});
