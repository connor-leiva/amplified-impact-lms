// D-194: a staff viewer ticks a checklist in the browser only. A learner whose toggle is refused sees the box go back.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Db } from '@ai/core';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { STEP } from './Step.vm';
import { StepPage } from './Step';
import { LearnProvider } from './data';
import { LEARNER_ID, learnState, PRELAUNCH_NOW } from './test/fixture';

const mutate = vi.fn(async () => ({}));
vi.mock('../../data/hooks', () => ({ useMutate: () => mutate, useNow: () => PRELAUNCH_NOW }));

function withOwnerCheck(d: Db): void {
  const week = d.modules.find((m) => m.id === 'accelerator-week-0')!;
  week.checklist[0]!.paths = {
    claude: { blocks: [{ type: 'check', id: 's1-owner', title: 'Ask the owner to sign', detail: 'The owner reads the draft.' }] },
  };
  const cohort = d.cohorts.find((c) => c.id === 'dec26');
  if (cohort?.course) {
    cohort.course = {
      ...cohort.course,
      glossary: [{ id: 'owner', term: 'owner', short: 'The person who decides.', long: 'The person who owns the result and decides.', aliases: [] }],
    };
  }
}

function page(staff: boolean) {
  const st = learnState(PRELAUNCH_NOW, true, {}, 15, withOwnerCheck);
  const viewer = staff
    ? { actor: { kind: 'staff' as const, staffId: 's1' }, role: 'admin' as const }
    : { actor: { kind: 'learner' as const, userId: LEARNER_ID }, role: 'learner' as const };
  return render(
    <MemoryRouter>
      <ToasterProvider>
        <LearnProvider value={{ course: { kind: 'ready', payload: st.payload }, db: st.db, viewer, now: st.now }}>
          <StepPage week={0} step={1} />
        </LearnProvider>
      </ToasterProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mutate.mockReset();
  mutate.mockResolvedValue({});
});

describe('checklist checks for staff and a refused learner (D-194)', () => {
  it('lets staff tick an item whose title has a glossary term, and writes nothing', () => {
    page(true);
    const box = screen.getByRole('checkbox', { name: 'Ask the owner to sign' });
    expect(screen.getByRole('button', { name: 'owner' })).toBeInTheDocument();
    expect(screen.getByText(STEP.previewChecks)).toBeInTheDocument();
    fireEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('puts a refused learner toggle back and says why', async () => {
    let resolve: (value: { error: string }) => void = () => undefined;
    mutate.mockImplementation(() => new Promise((r) => { resolve = r as (value: { error: string }) => void; }));
    page(false);
    const box = screen.getByRole('checkbox', { name: 'Ask the owner to sign' });
    expect(screen.queryByText(STEP.previewChecks)).not.toBeInTheDocument();
    fireEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'true');
    resolve({ error: 'That step is not on this week.' });
    await waitFor(() => expect(box).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('alert')).toHaveTextContent('That step is not on this week.');
    expect(mutate).toHaveBeenCalledWith('toggleChecklistItem', expect.objectContaining({ itemId: 's1-owner' }));
  });
});
