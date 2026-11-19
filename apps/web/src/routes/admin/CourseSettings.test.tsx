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

describe('Course settings (D-174)', () => {
  it('saves the release plan through its audited action', async () => {
    const { act, user } = show();
    await user.type(screen.getByLabelText('Preview opens (MT)'), '2026-11-18');
    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(act).toHaveBeenCalledWith('saveCohortPlan', expect.objectContaining({ cohortId: 'dec26', previewOpens: { date: '2026-11-18', time: '12:00' }, defaultOpenTime: '12:00' }));
  });

  it('saves the shared pages whole, only once something changed, and shows a refusal', async () => {
    const { act, user } = show();
    const save = screen.getByRole('button', { name: 'Saved' });
    expect(save).toBeDisabled();
    const sub = screen.getByRole('textbox', { name: 'Subtitle' });
    await user.clear(sub);
    await user.type(sub, 'Hire, train and keep your AI employees.');
    act.mockResolvedValueOnce({ error: 'Course subtitle: Use a comma, a colon or a period instead of an em dash.' });
    await user.click(screen.getByRole('button', { name: 'Save pages' }));
    expect(act).toHaveBeenCalledWith('saveCohortCourse', expect.objectContaining({ cohortId: 'dec26', course: expect.objectContaining({ intro: expect.objectContaining({ sub: 'Hire, train and keep your AI employees.' }) }) }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Course subtitle: Use a comma');
  });

  it('lists the copy strings, Utah Life’s line included, and edits one by key', async () => {
    const { act, user } = show();
    expect(screen.getByText('locked.utah_life')).toBeInTheDocument();
    expect(screen.getByText('Not included with Utah Life access')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit locked.utah_life' }));
    const dialog = screen.getByRole('dialog', { name: 'locked.utah_life' });
    const text = within(dialog).getByRole('textbox', { name: 'Text' });
    await user.clear(text);
    await user.type(text, 'Not part of your Utah Life access');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(act).toHaveBeenCalledWith('saveCopyString', { key: 'locked.utah_life', value: 'Not part of your Utah Life access', audience: 'learner' });
  });

  it('D-193: adds a glossary term and saves it with the shared pages', async () => {
    const { act, user } = show();
    await user.click(screen.getByRole('button', { name: 'Add term' }));
    await user.clear(screen.getByRole('textbox', { name: 'Id' }));
    await user.type(screen.getByRole('textbox', { name: 'Id' }), 'owner');
    await user.type(screen.getByRole('textbox', { name: 'Term' }), 'Owner');
    await user.type(screen.getByRole('textbox', { name: 'Short' }), 'The team leader.');
    await user.type(screen.getByRole('textbox', { name: 'Long' }), 'The team leader who decides.');
    await user.click(screen.getByRole('checkbox', { name: 'Underline on pages' }));
    await user.click(screen.getByRole('button', { name: 'Save pages' }));
    expect(act).toHaveBeenCalledWith('saveCohortCourse', expect.objectContaining({
      course: expect.objectContaining({
        glossary: [expect.objectContaining({ id: 'owner', term: 'Owner', short: 'The team leader.', long: 'The team leader who decides.', underline: false })],
      }),
    }));
  });

  it('says so when the database holds no course', () => {
    const db = prod();
    db.cohorts = [];
    show(db);
    expect(screen.getByText('This database holds no course yet.')).toBeInTheDocument();
  });
});
