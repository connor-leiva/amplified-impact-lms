// D-221: the builder's Kit skills card and its Week 0 Stack Card reach the learner's pages. This drives each
// editor as staff do, then draws the learner's page from the draft: the week page's kit for the skills, the
// stack page for the stack card. Every word the editor offers must reach a page a learner sees.
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setViewerZone } from '@ai/core';
import type { AIEmployee, Db } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { WeekCards } from './WeekBuilder';
import { isWeekDraft } from './WeekBuilder.vm';
import type { WeekDraft } from './WeekBuilder.vm';
import { weekRows } from '../learn/learn.vm';
import { weekVM } from '../learn/Week.vm';
import { LearnProvider } from '../learn/data';
import { StackPage } from '../learn/Stack';
import { LEARNER_ID, LIVE_NOW, deployed, learnState } from '../learn/test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

function Harness({ db, start, onDraft }: { db: Db; start: WeekDraft; onDraft: (d: WeekDraft) => void }) {
  const [d, setD] = useState<WeekDraft>(start);
  const up = (fn: (x: AIEmployee) => void) =>
    setD((prev) => {
      const next = structuredClone(prev);
      fn(next);
      onDraft(next);
      return next;
    });
  return <WeekCards db={db} draft={d} up={up} act={vi.fn(async () => ({})) as never} />;
}

function draftOf(db: Db, id: string): WeekDraft {
  const m = structuredClone(db.modules.find((x) => x.id === id)!);
  if (!isWeekDraft(m)) throw new Error('not a week');
  return m;
}

/** The learner's state at the live build, with the draft saved in place of its week. */
const withSaved = (draft: WeekDraft, progress: Record<number, string[]> = { 0: ['c1'] }) =>
  learnState(LIVE_NOW, false, progress, 15, (d) => {
    const i = d.modules.findIndex((m) => m.id === draft.id);
    d.modules[i] = structuredClone(draft);
  });

describe('the builder’s Kit skills card reaches the week page (D-221)', () => {
  it('a skill added, titled, given a role, marked Free and moved first shows in the week’s kit as the builder set it', async () => {
    const db = deployed();
    let last = draftOf(db, 'accelerator-week-2');
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={last} onDraft={(d) => (last = d)} /></MemoryRouter>);
    const before = last.course.skills.length;
    await user.click(screen.getByRole('button', { name: 'Add skill' }));
    const dialog = screen.getByRole('dialog', { name: `Kit skill ${before + 1}` });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Skill title' }), { target: { value: 'ZKtitleK' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Library route/ }), { target: { value: '/zk-not-built' } });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Role' }), 'Flagship');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Free' }));
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    // Up to first, one row at a time, as staff would reorder it.
    for (let i = before; i > 0; i--) await user.click(screen.getByRole('button', { name: `Move kit skill ${i + 1} up` }));
    expect(last.course.skills[0]).toEqual({ title: 'ZKtitleK', route: '/zk-not-built', role: 'flagship', free: true });

    const st = withSaved(last);
    const vm = weekVM(st.payload, weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID)), 2, LIVE_NOW, () => null, []);
    if (vm.kind !== 'open' || !vm.kit) throw new Error('no kit');
    const row = vm.kit.rows[0]!;
    expect(row.title).toBe('ZKtitleK');
    expect(row.tags).toEqual([{ label: 'Flagship' }, { label: 'Free', tone: 'done' }]);
    // Its page isn't built, so the row says what the copy strings say and links nothing.
    expect(row.href).toBeNull();
  });

  it('a skill removed from the card leaves the week’s kit', async () => {
    const db = deployed();
    let last = draftOf(db, 'accelerator-week-2');
    const gone = last.course.skills[0]!.title;
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={last} onDraft={(d) => (last = d)} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Remove kit skill 1' }));
    const st = withSaved(last);
    const vm = weekVM(st.payload, weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID)), 2, LIVE_NOW, () => null, []);
    if (vm.kind !== 'open') throw new Error('not open');
    // With its only skill gone and nothing else in it, the week has no kit at all.
    expect((vm.kit?.rows ?? []).map((r) => r.title)).not.toContain(gone);
  });
});

describe('the builder’s Week 0 Stack Card reaches the stack page (D-221)', () => {
  it('every source’s name, green and yellow, the example label and team, and each example row', async () => {
    const db = deployed();
    let last = draftOf(db, 'accelerator-week-0');
    // The fixture is the seed before the data steps, so Week 0 starts with no stack card: staff add one.
    expect(last.course.stackCard).toBeUndefined();
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={last} onDraft={(d) => (last = d)} /></MemoryRouter>);
    const card = screen.getByRole('heading', { name: 'Week 0 Stack Card' }).closest('section')!;
    await user.click(within(card).getByRole('button', { name: 'Edit' }));
    await user.click(within(card).getByRole('button', { name: 'Add stack card' }));
    await user.click(within(card).getByRole('button', { name: 'Add source' }));
    await user.click(within(card).getByRole('button', { name: 'Add example row' }));
    // Every text field gets its own marker, except ids (not words a learner reads).
    const marks: string[] = [];
    within(card).getAllByRole('textbox').forEach((box, i) => {
      const label = (box as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '';
      if (/^Id/.test(label)) return;
      const m = `ZS${i}S`;
      fireEvent.change(box, { target: { value: m } });
      marks.push(m);
    });
    // Sources are matched to rows by name, so each example row names its source the way a team would.
    await user.selectOptions(within(card).getAllByRole('combobox', { name: 'Plan' })[0]!, 'Yellow');
    await user.click(within(card).getByRole('button', { name: 'Done' }));
    const c = last.course.stackCard!;
    expect(c.sources).toHaveLength(2);
    expect(c.example).toHaveLength(1);
    expect(c.example[0]!.plan).toBe('yellow');
    expect(marks).toHaveLength(2 * 3 + 2 + 3);

    render(
      <MemoryRouter>
        <LearnProvider value={{ course: { kind: 'ready', payload: withSaved(last).payload }, db, viewer: { actor: { kind: 'staff', staffId: 's1' }, role: 'owner' } as never, now: LIVE_NOW }}>
          <StackPage week={0} />
        </LearnProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Show Example' }));
    const page = document.body.textContent ?? '';
    expect(marks.filter((m) => !page.includes(m))).toEqual([]);
  });
});
