// D-190: the one-step layout renders a checklist item, its callout, a waiting row, the gate and a remembered accordion.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { PathBlock } from '@ai/core/course-types';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { stepVM } from './Step.vm';
import type { ChecklistLayoutVM, StepVM } from './Step.vm';
import { ChecklistPills, ChecklistPlayer } from './Checklist';
import { LEARNER_ID, prelaunchState } from './test/fixture';

const mutate = vi.fn(async () => ({}));
vi.mock('../../data/hooks', () => ({ useMutate: () => mutate }));

const blocks: PathBlock[] = [
  { type: 'check', id: 's3-seven', title: 'Time seven tasks', detail: 'One line.', role: 'owner', subchecks: [{ id: 's3-t1', label: 'Task one' }, { id: 's3-t2', label: 'Task two' }] },
  { type: 'callout', kind: 'heads_up', text: 'Keep the sheet.' },
  { type: 'check', id: 's3-wait', title: 'Wait for the drive', dependsOn: ['step:6:s6-google'] },
  { type: 'accordion', title: 'Why we time per occurrence', body: ['Because each one is its own.'] },
];

function model(): { vm: StepVM; layout: ChecklistLayoutVM } {
  const st = prelaunchState();
  const p = structuredClone(st.payload);
  const week = p.course.weeks[0] as { module: { checklist: { paths?: { claude?: { blocks: PathBlock[] } } }[] } };
  week.module.checklist[2]!.paths = { claude: { blocks } };
  const row = weekRows(p, st.db, learnerOf(st.db, LEARNER_ID))[0];
  const vm = stepVM(p, row, 3, { kind: 'learner', userId: LEARNER_ID }, st.now, {
    prefs: [{ key: 'acc:accelerator-week-0:c3:0', value: '1', updatedAt: st.now }],
  });
  if (vm.kind !== 'step' || !vm.layouts?.claude) throw new Error('missing layout');
  return { vm, layout: vm.layouts.claude };
}

beforeEach(() => {
  setViewerZone('America/Denver');
  mutate.mockClear();
});
afterEach(() => setViewerZone(null));

describe('the checklist step (D-190)', () => {
  it('shows the item, the callout, the waiting row, the gate and an open accordion', () => {
    const { vm, layout } = model();
    render(
      <MemoryRouter>
        <ChecklistPlayer vm={vm} layout={layout} platform="claude" setPlatform={() => undefined} onPlay={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Your Checklist' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Time seven tasks' })).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText(/Waiting on Step 6/)).toBeInTheDocument();
    const mark = screen.getByRole('button', { name: 'Mark step done' });
    expect(mark).toBeEnabled();
    expect(mark).toHaveAttribute('data-locked', 'true');
    fireEvent.click(mark);
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Time seven tasks' }));
    expect(screen.getByText('Check off 2 more to mark this step done.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue:/ })).toBeInTheDocument();
    expect(screen.getByText('Because each one is its own.')).toBeVisible();
  });

  it('asks before checking a waiting item, and remembers an accordion by writing a preference', () => {
    const { vm, layout } = model();
    render(
      <MemoryRouter>
        <ChecklistPlayer vm={vm} layout={layout} platform="claude" setPlatform={() => undefined} onPlay={() => undefined} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wait for the drive' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Check it off anyway?');
    fireEvent.click(screen.getByRole('button', { name: 'Check it off' }));
    expect(mutate).toHaveBeenCalledWith('toggleChecklistItem', expect.objectContaining({ itemId: 's3-wait' }));
    expect(screen.getByText('Why we time per occurrence').closest('details')).toHaveAttribute('open');
  });

  it('draws compact step circles, a forest pill for the current step, and a name on each link', () => {
    const { vm } = model();
    render(
      <MemoryRouter>
        <ChecklistPills vm={vm} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: vm.railLabel });
    const links = within(nav).getAllByRole('link');
    expect(links.length).toBeGreaterThan(1);
    const current = links.find((a) => a.getAttribute('aria-current') === 'step');
    expect(current).toBeTruthy();
    expect(current).toHaveAttribute('data-on', 'true');
    expect(current!.querySelector('[role="tooltip"]')?.textContent).toBeTruthy();
    for (const a of links) expect(a.getAttribute('aria-label')).toMatch(/Step /);
    expect(nav.querySelector('[class*="fade"]')).toBeNull();
  });

  it('reduced motion is an instant change and a static Step done banner', () => {
    const css = readFileSync('src/routes/learn/Checklist.module.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.banner/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
