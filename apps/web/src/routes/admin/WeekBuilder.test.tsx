// D-174 (learner build PR 2b): the Module Builder's course-week cards, driven as staff use them. The
// draft lives in a small harness (the builder's own `up`: a structured clone, then the edit); Sessions
// and Kit save at once, so their writes are checked on a mocked `act`.
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AIEmployee, Db, Resource, Step } from '@ai/core';
import { checklistIssueLines } from '@ai/core/checklist';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { planCopyV1 } from '@ai/core/seed/copy-v1';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import { CoursePreview, StepWeekFields, WeekCards } from './WeekBuilder';
import { COPY } from '../course/Course.vm';
import { isWeekDraft } from './WeekBuilder.vm';
import { repo } from '../../data/boot';
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
  render(
    <MemoryRouter>
      <Harness db={db} start={m} act={act} onDraft={(d) => (last = d)} />
    </MemoryRouter>,
  );
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

  it('keeps other-step dependencies as one trimmed line each, including a step that is not converted yet', async () => {
    const user = userEvent.setup();
    let last: Step = { id: 'c1', text: 'Get your AI ready', ch: '', mins: 20, t: 0, hint: '' };
    render(<StepHarness start={last} onStep={(s) => (last = s)} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Claude path: kind of block to add' }), 'check');
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[0]!);
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[0]!);
    await user.click(screen.getByRole('checkbox', { name: 'item-2' }));
    const field = screen.getByRole('textbox', { name: 'Block 1 other steps' });
    await user.type(field, '  step:6:s6-google{Enter}{Enter}step:7:s7-drive  ');
    const block = last.paths!.claude!.blocks[0]!;
    expect(block).toMatchObject({ type: 'check', id: 'item-1', dependsOn: ['item-2', 'step:6:s6-google', 'step:7:s7-drive'] });
    expect(field).toHaveValue('  step:6:s6-google\n\nstep:7:s7-drive  ');
    // Step 6 is not a checklist yet. The line is still a cross-step dependency, and save is not refused.
    expect(checklistIssueLines([last])).toEqual([]);
  });
});

describe('a video block in a step’s paths and the week’s Media (D-188)', () => {
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

  it('adds a link video and an uploaded mp4 (through the repository), titles, reorders and removes them', async () => {
    const user = userEvent.setup();
    // The repository's upload (http: the upload route, then the browser's PUT; fixture: recorded) is
    // its own suite's subject (`data/http.test.ts`, `data/preview.test.ts`); here it answers a key.
    const upload = vi.spyOn(repo, 'upload').mockImplementation(async (f: File) => ({ ok: true, file: { key: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.mp4', name: f.name, size: f.size, type: 'video/mp4' } }));
    let last: Step = { id: 'c1', text: 'Watch the walkthrough', ch: '', mins: 10, t: 0, hint: '' };
    render(<StepHarness start={last} onStep={(x) => (last = x)} />);
    // A link, in the ChatGPT path.
    await user.selectOptions(screen.getByRole('combobox', { name: 'ChatGPT path: kind of block to add' }), 'video');
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[1]!);
    await user.type(screen.getByRole('textbox', { name: 'Block 1 link' }), 'https://www.loom.com/share/abc');
    await user.type(screen.getByRole('textbox', { name: 'Block 1 title' }), 'Walkthrough');
    expect(last.paths!.chatgpt!.blocks).toEqual([{ type: 'video', id: 'v1', source: { url: 'https://www.loom.com/share/abc' }, title: 'Walkthrough' }]);
    // An upload, in the Claude path: mp4 only, said inline otherwise.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Claude path: kind of block to add' }), 'video');
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[0]!);
    const claude = screen.getByRole('group', { name: 'Claude path' });
    await user.click(within(claude).getByRole('radio', { name: 'Upload an mp4' }));
    expect(within(claude).getByText('No file yet.')).toBeInTheDocument();
    const input = claude.querySelector<HTMLInputElement>('input[type=file][accept=".mp4"]')!;
    expect(input.accept).toBe('.mp4');
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'notes.pdf', { type: 'application/pdf' }));
    expect(await within(claude).findByRole('alert')).toHaveTextContent('Choose an mp4 file.');
    await user.upload(input, new File([new Uint8Array(2048)], 'Build.mp4', { type: 'video/mp4' }));
    expect(await within(claude).findByText('Build.mp4 · 2 KB')).toBeInTheDocument();
    const up = last.paths!.claude!.blocks[0]!;
    expect(up).toMatchObject({ type: 'video', source: { name: 'Build.mp4', size: 2048, type: 'video/mp4' } });
    expect((up as { source: { upload: string } }).source.upload).toBe('uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.mp4');
    // The pdf never reached the repository; the mp4 did, once.
    expect(upload).toHaveBeenCalledTimes(1);
    upload.mockRestore();
    // Reorder and remove, as any block.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Claude path: kind of block to add' }), 'text');
    await user.click(screen.getAllByRole('button', { name: 'Add block' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Move Claude path block 2 up' }));
    expect(last.paths!.claude!.blocks.map((b) => b.type)).toEqual(['text', 'video']);
    await user.click(screen.getByRole('button', { name: 'Remove Claude path block 2' }));
    expect(last.paths!.claude!.blocks.map((b) => b.type)).toEqual(['text']);
  });

  it('keeps a sample output to its content blocks: no video there', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit Sample output' }));
    const kinds = within(screen.getByRole('dialog', { name: 'Sample output' })).getByRole('combobox', { name: 'Sample: kind of block to add' });
    expect(within(kinds).getAllByRole('option').map((o) => o.textContent)).toEqual(['Paragraph', 'Copy box', 'List', 'Table']);
  });

  it('adds a video to the week’s Media after its lines, which stay as they were', async () => {
    const { week, draft, user } = setup();
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    const dialog = screen.getByRole('dialog', { name: `Course page · Week ${week.course.week}` });
    const videos = within(dialog).getByRole('group', { name: 'Media videos' });
    await user.click(within(videos).getByRole('button', { name: 'Add block' }));
    await user.type(within(videos).getByRole('textbox', { name: 'Block 1 link' }), 'https://cdn.example.test/recap.m3u8');
    expect(draft().course.media).toEqual([...week.course.media, { type: 'video', id: 'v1', source: { url: 'https://cdn.example.test/recap.m3u8' } }]);
    // Editing the lines keeps the video after them.
    await user.type(within(dialog).getByRole('textbox', { name: /^Media/ }), '{End}{Enter}Slides');
    expect(draft().course.media.at(-1)).toEqual({ type: 'video', id: 'v1', source: { url: 'https://cdn.example.test/recap.m3u8' } });
    expect(draft().course.media).toContain('Slides');
  });
});

describe('the live preview from the unsaved draft (D-174, D-184)', () => {
  it('@parity:C-9 draws the learner portal’s week page and step player from the draft: an unsaved edit shows, as an owner, a Utah Life member and before launch', async () => {
    const user = userEvent.setup();
    const db = prod();
    const draft = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[2])!);
    if (!isWeekDraft(draft)) throw new Error('not a week');
    draft.course.why = ['A draft reason only the preview has seen.'];
    draft.course.liveBuild!.lesson = 'A draft lesson for the preview alone.';
    draft.prompt = 'You are the draft analyst for {{TEAM_NAME}}.';
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoursePreview db={db} draft={draft} phone={false} onClose={() => {}} />
      </QueryClientProvider>,
    );
    const frame = screen.getByTestId('course-preview');
    // Not saved anywhere: the db still says the old words, and the preview, the learner portal's own week
    // page (D-184), says the new ones.
    expect(db.modules.find((x) => x.id === draft.id)!.course!.why).not.toContain('A draft reason only the preview has seen.');
    expect(frame.querySelector('[data-learner-v2]')).not.toBeNull();
    expect(within(frame).getByRole('heading', { level: 1, name: draft.course.title })).toBeInTheDocument();
    expect(within(frame).getByRole('region', { name: COPY.why })).toHaveTextContent('A draft reason only the preview has seen.');
    expect(within(frame).getByRole('region', { name: COPY.liveBuild })).toHaveTextContent('A draft lesson for the preview alone.');
    expect(within(frame).getByRole('region', { name: 'Build Kit' })).toHaveTextContent('TEAM_NAME');
    // A step row moves the preview to the step player, not the builder's page; staff can't mark it done.
    await user.click(within(frame).getAllByRole('link', { name: /^Step 1,/ })[0]!);
    expect(within(frame).getByRole('heading', { level: 1, name: draft.checklist[0]!.ch || draft.checklist[0]!.text })).toBeInTheDocument();
    expect(within(frame).getByRole('button', { name: 'Mark step done' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: 'Utah Life' }));
    expect(frame).toHaveTextContent(COPY.locked);
    expect(frame).not.toHaveTextContent('A draft reason only the preview has seen.');
    await user.click(screen.getByRole('tab', { name: 'Before launch' }));
    expect(frame).not.toHaveTextContent('A draft reason only the preview has seen.');
    expect(within(frame).getByRole('link', { name: COPY.library })).toBeInTheDocument();
  });

  it('an owner’s preview of Step 4 shows the zips placed on that step in For this step (D-192)', async () => {
    const user = userEvent.setup();
    const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
    const mod = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    const step4 = mod.checklist[3]!;
    step4.linkedSkill = 'map-your-spend, lead-source-review';
    const zip = (id: string, title: string, stepId: string, platform: 'both' | 'chatgpt' | 'claude'): Resource => ({
      id,
      title,
      desc: '',
      cat: 'Files',
      type: 'ZIP',
      tier: 'agent',
      size: '1 KB',
      dl: 0,
      updated: 0,
      exec: false,
      status: 'published',
      module: mod.id,
      kind: 'file',
      stepId,
      visibility: 'open_in_preview',
      platform,
    });
    db.resources.push(zip('zip-spend', 'Spend workbook', step4.id, 'both'), zip('zip-gpt', 'ChatGPT only workbook', step4.id, 'chatgpt'), zip('zip-other', 'Another step workbook', mod.checklist[4]!.id, 'both'));
    const draft = structuredClone(mod);
    if (!isWeekDraft(draft)) throw new Error('not a week');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoursePreview db={db} draft={draft} phone={false} onClose={() => {}} />
      </QueryClientProvider>,
    );
    const frame = screen.getByTestId('course-preview');
    await user.click(within(frame).getAllByRole('link', { name: /^Step 4,/ })[0]!);
    const panel = within(frame).getByRole('region', { name: 'For this step' });
    expect(panel).toHaveTextContent('Spend workbook');
    expect(panel).not.toHaveTextContent('ChatGPT only workbook');
    expect(panel).not.toHaveTextContent('Another step workbook');
    expect(panel).not.toHaveTextContent('Skill ·');
    await user.click(within(frame).getByRole('radio', { name: 'ChatGPT' }));
    const after = within(frame).getByRole('region', { name: 'For this step' });
    expect(after).toHaveTextContent('Spend workbook');
    expect(after).toHaveTextContent('ChatGPT only workbook');
    expect(within(frame).getByRole('region', { name: 'Build Kit' })).toBeInTheDocument();
    expect(within(frame).getByRole('region', { name: 'Still stuck?' })).toBeInTheDocument();
  });

  it('an owner’s preview of Step 1 shows a checklist Download from the kit and an Invite link (D-192)', async () => {
    const user = userEvent.setup();
    const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
    const mod = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    const step1 = mod.checklist[0]!;
    step1.paths = {
      claude: {
        blocks: [
          { type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'download', kitItemIds: ['intake-form'] } },
          { type: 'check', id: 's1-invite', title: 'Bring your operator in', action: { type: 'invite', label: 'Invite your operator' } },
          { type: 'check', id: 's1-stack', title: 'Fill in your stack card', action: { type: 'download', kitItemIds: ['stack-card'] } },
        ],
      },
    };
    const file = (id: string, title: string): Resource => ({
      id, title, desc: '', cat: 'Files', type: 'PDF', tier: 'agent', size: '1 KB', dl: 0, updated: 0, exec: false, status: 'published',
      module: mod.id, kind: 'file', stepId: step1.id, visibility: 'open_in_preview', platform: 'both',
    });
    db.resources.push(file('intake-form', 'Week 0 Intake Form'), file('stack-card', 'Week 0 Stack Card'));
    const draft = structuredClone(mod);
    if (!isWeekDraft(draft)) throw new Error('not a week');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CoursePreview db={db} draft={draft} phone={false} onClose={() => {}} />
      </QueryClientProvider>,
    );
    const frame = screen.getByTestId('course-preview');
    await user.click(within(frame).getAllByRole('link', { name: /^Step 1,/ })[0]!);
    const intake = within(frame).getAllByRole('link', { name: 'Week 0 Intake Form' });
    const stack = within(frame).getAllByRole('link', { name: 'Week 0 Stack Card' });
    expect(intake.some((el) => el.getAttribute('href') === '/api/files/resource/intake-form')).toBe(true);
    expect(stack.some((el) => el.getAttribute('href') === '/api/files/resource/stack-card')).toBe(true);
    expect(within(frame).getByRole('link', { name: 'Invite your operator' })).toHaveAttribute('href', '/learn/team');
  });
});
