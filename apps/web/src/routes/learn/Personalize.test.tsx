// D-199: the step page applies the intake, remembers a path, and shows the operator's count as text.
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { PathBlock } from '@ai/core/course-types';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { StepPage } from './Step';
import { WeekDone, WEEK_DONE } from './WeekDone';
import { LearnProvider } from './data';
import { LEARNER_ID, learnState, PRELAUNCH_NOW } from './test/fixture';

const mutate = vi.fn(async () => ({}));
vi.mock('../../data/hooks', () => ({ useMutate: () => mutate, useNow: () => PRELAUNCH_NOW }));

const blocks: PathBlock[] = [
  { type: 'check', id: 's1-invite', title: 'Invite your operator', hideIf: { field: 'operator', equals: 'both' } },
  { type: 'check', id: 's1-plan', title: 'Choose a plan', collapseIf: { field: 'plan', equals: 'Claude Team' }, collapsedNote: 'Your team plan covers this.' },
  { type: 'check', id: 's1-accept', title: 'Accept the invite', role: 'operator' },
  { type: 'callout', kind: 'heads_up', text: 'Not on Google.', showIf: { field: 'google', equals: 'No' } },
];

let stepId = 'c1';

function page(staff: boolean, prefs?: { key: string; value: string; updatedAt: number }[]) {
  const st = learnState(PRELAUNCH_NOW, true, {}, 15, (d) => {
    const week = d.modules.find((m) => m.id === 'accelerator-week-0')!;
    stepId = week.checklist[0]!.id;
    week.checklist[0]!.paths = { claude: { blocks }, chatgpt: { blocks } };
    const user = d.users.find((u) => u.id === LEARNER_ID);
    if (user && prefs) user.coursePrefs = prefs;
  });
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = url.includes('/api/intake')
        ? { answers: { operator: "I'm both", ai: 'ChatGPT', plan: 'Claude Team', google: 'No' }, preview: false }
        : method === 'POST'
          ? { ok: true }
          : { name: 'Jordan', steps: [{ moduleId: 'accelerator-week-0', stepId, done: 3, total: 6 }] };
      return { ok: true, json: async () => body };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('personalization on the step (D-199)', () => {
  it('hides and collapses from the intake, then remembers a path the learner picks', async () => {
    page(false);
    await waitFor(() => expect(screen.queryByText('Invite your operator')).not.toBeInTheDocument());
    expect(screen.getByText('Your team plan covers this.')).toBeInTheDocument();
    expect(screen.getByText('Not on Google.')).toBeInTheDocument();
    const note = screen.getAllByText('Jordan: 3 of 6')[0]!;
    expect(note.closest('button')).toBeNull();
    expect(screen.getByRole('radio', { name: 'ChatGPT' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Claude' }));
    expect(mutate).toHaveBeenCalledWith('setPref', { key: 'path', value: 'claude' });
    expect(screen.getByRole('radio', { name: 'Claude' })).toHaveAttribute('aria-checked', 'true');
  });

  it('keeps a saved path when the intake names the other one', async () => {
    page(false, [{ key: 'path', value: 'claude', updatedAt: PRELAUNCH_NOW }]);
    await waitFor(() => expect(screen.queryByText('Invite your operator')).not.toBeInTheDocument());
    expect(screen.getByRole('radio', { name: 'Claude' })).toHaveAttribute('aria-checked', 'true');
  });

  it('does not read or write personalization for staff', () => {
    page(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getAllByText('Invite your operator').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: 'ChatGPT' }));
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe('Week 0 done (D-199)', () => {
  it('uses a static banner when motion is reduced, and writes the preference once', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener: () => undefined, removeEventListener: () => undefined }));
    const css = readFileSync('src/routes/learn/WeekDone.module.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    render(<WeekDone onDone={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent(WEEK_DONE.line);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mutate).toHaveBeenCalledWith('setPref', { key: 'week0-done', value: '1' });
  });
});
