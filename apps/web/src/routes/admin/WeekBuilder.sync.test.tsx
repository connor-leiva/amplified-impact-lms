// D-214: the builder's week cards and the learner's week page are one source. This drives the real builder as
// staff do: it opens each card's editor, fills every text field with a marker, and then builds the learner's
// week page from the draft. Every marker must reach the page a learner sees (the open week's page, or a locked
// week's page for its locked copy). A field the builder offers therefore changes what learners read.
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
import { navVM, weekRows } from '../learn/learn.vm';
import { weekVM } from '../learn/Week.vm';
import { buildKitVM, weekContentVM } from '../learn/WeekContent.vm';
import { stepVM } from '../learn/Step.vm';
import { LEARNER_ID, LIVE_NOW, PRELAUNCH_NOW, deployed, learnState } from '../learn/test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const WEEK_ID = 'accelerator-week-2';

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

/** Fills every text field in the open dialog with its own marker; returns the markers by field label. */
function fill(dialog: HTMLElement, tag: string, skip: RegExp | null = null): Map<string, string> {
  const out = new Map<string, string>();
  within(dialog).queryAllByRole('textbox').forEach((box, i) => {
    const label = box.getAttribute('aria-label') ?? (box as HTMLInputElement).labels?.[0]?.textContent ?? `field ${i}`;
    if (skip?.test(label)) return;
    // The rich text editor (a paragraph block) is a content-editable field, not an input: its words are D-212's.
    if (!(box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement)) return;
    const marker = `ZM${tag}${i}M`;
    // A locked week's opening line is a template: it speaks once it holds the {date} it fills in.
    fireEvent.change(box, { target: { value: /^Opens/.test(label.trim()) ? `${marker} {date}` : marker } });
    out.set(label.trim(), marker);
  });
  return out;
}

/** The learner's week page (both view-models) for week 2, from a database holding the draft. */
function learnerPage(draft: WeekDraft, now: number): string {
  const st = learnState(now, false, { 0: ['c1'] }, 15, (d) => {
    const i = d.modules.findIndex((m) => m.id === WEEK_ID);
    d.modules[i] = structuredClone(draft);
  });
  const me = learnerOf(st.db, LEARNER_ID);
  const rows = weekRows(st.payload, st.db, me);
  return JSON.stringify({ vm: weekVM(st.payload, rows, 2, now, () => null, []), content: weekContentVM(st.payload, 2) });
}

describe('the builder’s week cards reach the learner’s week page (D-214)', () => {
  it('every text field in the course page, live build, office hours, seat card and playbook card editors', async () => {
    const db = deployed();
    const start = structuredClone(db.modules.find((m) => m.id === WEEK_ID)!);
    if (!isWeekDraft(start)) throw new Error('not a week');
    let last: WeekDraft = start;
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={start} onDraft={(d) => (last = d)} /></MemoryRouter>);
    const marks = new Map<string, string>();
    const open = async (button: HTMLElement, title: RegExp | string, tag: string, skip: RegExp | null = null) => {
      await user.click(button);
      const dialog = screen.getByRole('dialog', { name: title });
      for (const [label, m] of fill(dialog, tag, skip)) marks.set(`${tag}: ${label}`, m);
      await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    };
    await open(screen.getAllByRole('button', { name: 'Edit' })[0]!, /^Course page/, 'course', /^Block \d+ /);
    const pages = screen.getAllByRole('button', { name: 'Page' });
    await open(pages[0]!, /Live build/, 'live');
    await open(pages[1]!, /Office hours/, 'oh');
    await open(screen.getByRole('button', { name: 'Edit Seat card' }), 'Seat card', 'seat');
    await open(screen.getByRole('button', { name: 'Edit Playbook card' }), 'Playbook card', 'play');
    // D-217: the sample output, with a paragraph, a list, a copy box and a table in it.
    await user.click(screen.getByRole('button', { name: 'Edit Sample output' }));
    const sample = screen.getByRole('dialog', { name: 'Sample output' });
    for (const kind of ['text', 'list', 'copy', 'table']) {
      await user.selectOptions(within(sample).getByRole('combobox', { name: 'Sample: kind of block to add' }), kind);
      await user.click(within(sample).getByRole('button', { name: 'Add block' }));
    }
    // The paragraph's toolbar (custom size, custom colour) styles words; it holds none of its own.
    for (const [label, m] of fill(sample, 'sample', /custom (size|colou?r)/i)) marks.set(`sample: ${label}`, m);
    await user.click(within(sample).getByRole('button', { name: 'Done' }));
    expect(marks.size).toBeGreaterThan(30);
    const page = learnerPage(last, LIVE_NOW);
    const missing = [...marks].filter(([, m]) => !page.includes(m)).map(([label]) => label);
    expect(missing).toEqual([]);
  });

  it('every text field in the locked copy editor reaches the locked week', async () => {
    const db = deployed();
    const start = structuredClone(db.modules.find((m) => m.id === WEEK_ID)!);
    if (!isWeekDraft(start)) throw new Error('not a week');
    let last: WeekDraft = start;
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={start} onDraft={(d) => (last = d)} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Edit Locked copy' }));
    const dialog = screen.getByRole('dialog', { name: 'Locked copy' });
    const marks = fill(dialog, 'lock');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    const page = learnerPage(last, PRELAUNCH_NOW);
    const missing = [...marks].filter(([, m]) => !page.includes(m)).map(([label]) => label);
    expect(missing).toEqual([]);
  });

  it('the week’s own details the builder offers (name, summary, platform, instructor notes, system prompt)', () => {
    const marks = { name: 'ZDnameD', outcome: 'ZDoutcomeD', platform: 'ZDplatformD', notes: 'ZDnotesD', prompt: 'ZDpromptD' };
    const st = learnState(LIVE_NOW, false, { 0: ['c1'] }, 15, (d) => {
      const m = d.modules.find((x) => x.id === WEEK_ID)!;
      Object.assign(m, marks);
    });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const mod = st.db.modules.find((x) => x.id === WEEK_ID);
    const page = JSON.stringify([
      weekVM(st.payload, rows, 2, LIVE_NOW, () => null, []),
      weekContentVM(st.payload, 2, mod),
      buildKitVM(mod, () => null),
      stepVM(st.payload, rows[2], 1, { kind: 'learner', userId: LEARNER_ID }, LIVE_NOW),
    ]);
    expect(Object.entries(marks).filter(([, m]) => !page.includes(m)).map(([k]) => k)).toEqual([]);
  });

  it('the status labels editor names the week’s state on Home and in the sidebar (D-217)', async () => {
    const db = deployed();
    const start = structuredClone(db.modules.find((m) => m.id === WEEK_ID)!);
    if (!isWeekDraft(start)) throw new Error('not a week');
    let last: WeekDraft = start;
    const user = userEvent.setup();
    render(<MemoryRouter><Harness db={db} start={start} onDraft={(d) => (last = d)} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Edit Status labels' }));
    const dialog = screen.getByRole('dialog', { name: 'Status labels' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Labels/ }), { target: { value: 'not_started: ZLnotL\nbuilt: ZLbuiltL' } });
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(last.course.statusLabels).toEqual({ not_started: 'ZLnotL', built: 'ZLbuiltL' });
    // Week 2 is open and not started at the live build: Home's card and the sidebar say the builder's words.
    const st = learnState(LIVE_NOW, false, { 0: ['c1'] }, 15, (d) => {
      const i = d.modules.findIndex((m) => m.id === WEEK_ID);
      d.modules[i] = structuredClone(last);
    });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    expect(JSON.stringify(navVM(st.payload, rows, '/learn'))).toContain('ZLnotL');
  });
});

