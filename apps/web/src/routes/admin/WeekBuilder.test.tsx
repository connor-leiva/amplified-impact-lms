// D-174 (learner build PR 2b): the Module Builder's course-week cards, driven as staff use them. The
// draft lives in a small harness (the builder's own `up`: a structured clone, then the edit); Sessions
// and Kit save at once, so their writes are checked on a mocked `act`.
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AIEmployee, Db, Step } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { StepWeekFields, WeekCards } from './WeekBuilder';
import { isWeekDraft } from './WeekBuilder.vm';
import type { WeekDraft } from './WeekBuilder.vm';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

function Harness({ db, start, act, onDraft }: { db: Db; start: WeekDraft; act: ReturnType<typeof vi.fn>; onDraft: (d: WeekDraft) => void }) {
  const [d, setD] = useState<WeekDraft>(start);
  const up = (fn: (x: AIEmployee) => void) =>
    setD((prev) => {
      const next = structuredClone(prev);
      fn(next);
      onDraft(next);
      return next;
    });
  return <WeekCards db={db} draft={d} up={up} act={act as never} />;
}

function setup(n = 2) {
  const db = prod();
  const m = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[n])!);
  if (!isWeekDraft(m)) throw new Error('not a week');
  const act = vi.fn(async () => ({}));
  let last: WeekDraft = m;
  render(<Harness db={db} start={m} act={act} onDraft={(d) => (last = d)} />);
  return { db, act, week: m, draft: () => last, user: userEvent.setup() };
}

describe('the course-week cards (D-174)', () => {
  it('shows the week’s words from the draft, and edits them in place', async () => {
    const { week, draft, user } = setup();
    expect(screen.getByRole('heading', { name: `Course page · Week ${week.course.week}` })).toBeInTheDocument();
    expect(screen.getByText(week.course.question)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    const dialog = screen.getByRole('dialog', { name: `Course page · Week ${week.course.week}` });
    const q = within(dialog).getByRole('textbox', { name: 'Question' });
    await user.clear(q);
    await user.type(q, 'Which lead sources pay?');
    await user.type(within(dialog).getByRole('textbox', { name: 'Promise' }), 'Know which sources pay.');
    expect(draft().course.question).toBe('Which lead sources pay?');
    expect(draft().course.promise).toBe('Know which sources pay.');
  });

  it('edits the live build’s run of show: a row added, labelled and moved', async () => {
    const { week, draft, user } = setup();
    const rows = week.course.liveBuild!.agenda.length;
    await user.click(screen.getAllByRole('button', { name: 'Add row' })[0]!);
    const dialog = screen.getByRole('dialog', { name: `Live build · Row ${rows + 1}` });
    await user.type(within(dialog).getByRole('textbox', { name: 'Label' }), 'Commit');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(draft().course.liveBuild!.agenda).toHaveLength(rows + 1);
    expect(draft().course.liveBuild!.agenda[rows]).toMatchObject({ activity: 'Commit', from: week.course.liveBuild!.agenda[rows - 1]!.to });
    await user.click(screen.getByRole('button', { name: `Move Live build row ${rows + 1} up` }));
    expect(draft().course.liveBuild!.agenda[rows - 1]!.activity).toBe('Commit');
  });

  it('adds a seat card, fills it in and removes it after a confirm', async () => {
    const { draft, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit Seat card' }));
    const dialog = screen.getByRole('dialog', { name: 'Seat card' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Runs' }), 'Every Monday');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(draft().course.seatCard).toMatchObject({ runs: 'Every Monday', cantDo: '' });
    await user.click(screen.getByRole('button', { name: 'Remove Seat card' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Remove the seat card?' })).getByRole('button', { name: 'Remove' }));
    expect(draft().course.seatCard).toBeUndefined();
  });

  it('builds a sample output from blocks, labelled made up', async () => {
    const { draft, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit Sample output' }));
    const dialog = screen.getByRole('dialog', { name: 'Sample output' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Sample: kind of block to add' }), 'table');
    await user.click(within(dialog).getByRole('button', { name: 'Add block' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Block 1 headings' }), 'Source | Cost');
    expect(draft().course.sampleOutput).toMatchObject({ madeUpLabel: 'Made-up data', blocks: [{ type: 'table', head: ['Source', 'Cost'] }] });
  });

  it('lists the week’s sessions in Mountain Time and saves a new one at once, through its audited action', async () => {
    const { act, db, week, user } = setup();
    expect(screen.getByRole('heading', { name: 'Sessions · 2' })).toBeInTheDocument();
    expect(screen.getAllByText(/ MT · \d+ min$/)).toHaveLength(2);
    // The two sessions the week's pages name can't be removed here; they can be edited.
    for (const id of ['dec26-s2', 'dec26-oh2']) {
      const title = db.sessions.find((x) => x.id === id)!.title;
      expect(screen.queryByRole('button', { name: `Remove ${title}` })).toBeNull();
      expect(screen.getByRole('button', { name: `Edit ${title}` })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Add session' }));
    const dialog = screen.getByRole('dialog', { name: 'Add session' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Lead Source Review Office Hours');
    const date = within(dialog).getByLabelText('Date (MT)');
    await user.type(date, '2026-12-11');
    await user.click(within(dialog).getByRole('button', { name: 'Save session' }));
    expect(act).toHaveBeenCalledWith('saveSession', {
      cohortId: 'dec26',
      moduleId: week.id,
      kind: 'office_hours',
      title: 'Lead Source Review Office Hours',
      date: '2026-12-11',
      time: '12:00',
      mins: '60',
      zoom: '',
      replayVisibility: null,
    });
  });

  it('shows the server’s refusal in the session dialog, and keeps it open', async () => {
    const { act, user } = setup();
    act.mockResolvedValueOnce({ error: 'Pick a date and a start time.' });
    await user.click(screen.getByRole('button', { name: 'Add session' }));
    const dialog = screen.getByRole('dialog', { name: 'Add session' });
    await user.click(within(dialog).getByRole('button', { name: 'Save session' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Pick a date and a start time.');
  });
});

describe('a step’s course fields (D-174)', () => {
  function StepHarness({ start, onStep }: { start: Step; onStep: (s: Step) => void }) {
    const [st, setSt] = useState(start);
    return (
      <StepWeekFields
        step={st}
        onChange={(fn) =>
          setSt((prev) => {
            const next = structuredClone(prev);
            fn(next);
            onStep(next);
            return next;
          })
        }
      />
    );
  }

  it('edits who, time, done when, preview, and the Claude and ChatGPT paths', async () => {
    const user = userEvent.setup();
    let last: Step = { id: 'c1', text: 'Get your AI ready', ch: '', mins: 20, t: 0, hint: '' };
    render(<StepHarness start={last} onStep={(s) => (last = s)} />);
    await user.type(screen.getByRole('textbox', { name: 'Who' }), 'Operator');
    await user.type(screen.getByRole('textbox', { name: 'Done when' }), 'A test prompt answers in your voice.');
    await user.click(screen.getByRole('checkbox', { name: 'Open in the pre-launch preview' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Claude path: kind of block to add' }), 'copy');
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[0]!);
    await user.type(screen.getByRole('textbox', { name: 'Block 1 text to copy' }), 'Read my notes.');
    expect(last).toMatchObject({ who: 'Operator', doneWhen: 'A test prompt answers in your voice.', openInPreview: true, paths: { claude: { blocks: [{ type: 'copy', text: 'Read my notes.' }] } } });
    expect(last.paths!.chatgpt).toBeUndefined();
    // Cleared, a field leaves the step rather than staying as an empty string.
    await user.clear(screen.getByRole('textbox', { name: 'Who' }));
    expect('who' in last).toBe(false);
  });
});
