// D-174 (learner build PR 2c): Course settings, driven as staff use it. The data hooks are mocked
// (the db the screen reads, and the audited `act` it saves through), as the Vault's tests do.
import { MemoryRouter } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import { copyRows, hintPairs, pairsText, planArgs, planForm, textPairs } from './CourseSettings.vm';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
const state: { db: Db; act: ReturnType<typeof vi.fn> } = { db: prod(), act: vi.fn(async () => ({})) };
vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useAct: () => state.act,
}));
const { default: CourseSettings } = await import('./CourseSettings');

const show = (db: Db = prod()) => {
  state.db = db;
  state.act = vi.fn(async () => ({}));
  render(
    <MemoryRouter initialEntries={['/admin/curriculum/course']}>
      <CourseSettings />
    </MemoryRouter>,
  );
  return { act: state.act, user: userEvent.setup() };
};

describe('Course settings’ view-model (D-174)', () => {
  it('shows the release plan in Mountain Time, noon by default, and sends it back as typed', () => {
    const co = { ...prod().cohorts[0]!, previewOpensAt: Date.parse('2026-11-18T19:00:00Z') };
    const f = planForm(co);
    expect(f).toMatchObject({ previewDate: '2026-11-18', previewTime: '12:00', defaultOpenTime: '12:00' });
    expect(planArgs('dec26', { ...f, previewDate: '' })).toMatchObject({ previewOpens: null });
    expect(planArgs('dec26', { ...f, previewTime: '' }).previewOpens).toEqual({ date: '2026-11-18', time: '12:00' });
  });

  it('reads label-and-text lines as staff type them, and lists copy strings by key', () => {
    expect(textPairs('Keep: it running\nno colon here\nFix:  \n Retire : stop it ')).toEqual([
      { label: 'Keep', text: 'it running' },
      { label: 'Retire', text: 'stop it' },
    ]);
    expect(hintPairs('Hours: before and after')).toEqual([{ label: 'Hours', hint: 'before and after' }]);
    expect(pairsText([{ label: 'A', text: 'b' }, { label: 'C', hint: 'd' }])).toBe('A: b\nC: d');
    expect(copyRows({ copy: [{ key: 'z.b', value: '1', audience: 'learner' }, { key: 'a.b', value: '2', audience: 'learner' }] }).map((c) => c.key)).toEqual(['a.b', 'z.b']);
  });
});

describe('Program › Course Settings (D-174, D-265)', () => {
  it('draws the cohort’s three words as From the cohort blocks, each a link to its Settings, and points at its dates', () => {
    show();
    expect(screen.getAllByText('From the cohort')).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'December 2026 › Settings' })) expect(link).toHaveAttribute('href', '/admin/cohort/dec26/settings');
    expect(screen.getByRole('link', { name: 'Open the cohort’s Settings' })).toHaveAttribute('href', '/admin/cohort/dec26/settings');
    expect(screen.queryByRole('textbox', { name: /promise/i })).toBeNull();
    expect(screen.getByText('Learners see it on Home, under the title')).toBeInTheDocument();
  });

  it('saves the program’s words whole, only once something changed, and shows a refusal', async () => {
    const { act, user } = show();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    const title = screen.getByRole('textbox', { name: /Course title/ });
    await user.clear(title);
    await user.type(title, 'Amplified AI Accelerator — Live');
    expect(screen.getByText('Unsaved changes to Course Intro')).toBeInTheDocument();
    act.mockResolvedValueOnce({ error: 'Course title: Use a comma, a colon or a period instead of an em dash.' });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(act).toHaveBeenCalledWith(
      'saveProgramCourse',
      expect.objectContaining({ programId: 'accelerator', course: expect.objectContaining({ intro: expect.objectContaining({ title: 'Amplified AI Accelerator — Live' }) }) }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Course title: Use a comma');
  });

  it('lists the words, Utah Life’s line included, and edits one by key', async () => {
    const { act, user } = show();
    await user.click(screen.getByRole('button', { name: /^Words/ }));
    await user.click(screen.getByText('Not included with Utah Life access'));
    const dialog = screen.getByRole('dialog', { name: 'locked.utah_life' });
    const text = within(dialog).getByRole('textbox', { name: 'What it says' });
    await user.clear(text);
    await user.type(text, 'Not part of your Utah Life access');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(act).toHaveBeenCalledWith('saveCopyString', { key: 'locked.utah_life', value: 'Not part of your Utah Life access', audience: 'learner' });
  });

  it('D-193: adds a glossary term in its dialog and saves it with the program’s words', async () => {
    const { act, user } = show();
    await user.click(screen.getByRole('button', { name: /^Glossary/ }));
    await user.click(screen.getByRole('button', { name: 'Add a term' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: 'Term' }), 'Owner');
    await user.type(within(dialog).getByRole('textbox', { name: 'Short definition' }), 'The team leader.');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Id' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Id' }), 'owner');
    await user.type(within(dialog).getByRole('textbox', { name: 'Long' }), 'The team leader who decides.');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Underline on pages' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(act).toHaveBeenCalledWith(
      'saveProgramCourse',
      expect.objectContaining({
        course: expect.objectContaining({
          glossary: expect.arrayContaining([expect.objectContaining({ id: 'owner', term: 'Owner', short: 'The team leader.', long: 'The team leader who decides.', underline: false })]),
        }),
      }),
    );
  });

  it('says so when the database holds no course', () => {
    const db = prod();
    db.cohorts = [];
    show(db);
    expect(screen.getByText('This database holds no course yet.')).toBeInTheDocument();
  });
});
