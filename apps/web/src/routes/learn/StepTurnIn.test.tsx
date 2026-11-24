// H-15 (D-248): with v3 off (production's build), a Week 1 or 2 step that asks for a file has Turn in, and the step
// that asks for the seat card has its Form button, for the team's owner and operator; a teammate who can't turn in
// sees the line in its place. A staff preview of a learner still draws neither.
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { LearnerRole } from '@ai/core';
import type { PathBlock } from '@ai/core/course-types';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { StepPage } from './Step';
import { LearnProvider } from './data';
import { LEARNER_ID, LIVE_NOW, learnState } from './test/fixture';
import { LMS_V3 } from './lms-v3/v3';

const mutate = vi.fn(async () => ({}));
vi.mock('../../data/hooks', () => ({ useMutate: () => mutate, useNow: () => LIVE_NOW, DB_KEY: ['db'] }));

const blocks: PathBlock[] = [
  { type: 'check', id: 'w1-report', title: 'Turn in your lead-source report', action: { type: 'upload', kind: 'live_read' } },
  { type: 'check', id: 'w1-seat', title: 'Fill in the seat card', action: { type: 'form', formId: 'seat-card', label: 'Open the seat card', itemId: 'w1-sign' } },
  { type: 'check', id: 'w1-sign', title: 'Sign the seat card' },
];

function page(role: LearnerRole, preview = false) {
  const st = learnState(LIVE_NOW, false, { 0: ['c1'] }, 15, (d) => {
    const week = d.modules.find((m) => m.id === 'accelerator-week-1')!;
    week.checklist[0]!.paths = { claude: { blocks }, chatgpt: { blocks } };
    week.course = {
      ...week.course!,
      seatCard: week.course?.seatCard ?? { seat: 'Finance Analyst', reportsTo: 'The owner.', runs: 'r', pulls: 'p', applies: 'a', produces: 'o', tookOver: 't', cantDo: 'c' },
    };
    const me = d.users.find((u) => u.id === LEARNER_ID)!;
    me.role = role;
  });
  const viewer = preview
    ? { actor: { kind: 'learner' as const, userId: LEARNER_ID }, role: 'learner' as const, preview: { userId: LEARNER_ID } }
    : { actor: { kind: 'learner' as const, userId: LEARNER_ID }, role: 'learner' as const };
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ToasterProvider>
          <LearnProvider value={{ course: { kind: 'ready', payload: st.payload }, db: st.db, viewer: viewer as never, now: st.now }}>
            <StepPage week={1} step={1} />
          </LearnProvider>
        </ToasterProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      const body = url.includes('/api/submissions') ? { subs: {} } : url.includes('/api/intake') ? { answers: {}, updatedAt: null, submittedAt: null } : {};
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('Turn in and the seat card without v3 (H-15)', () => {
  it('runs with the v3 flag off, as production builds', () => {
    expect(LMS_V3).toBe(false);
  });

  it('gives the owner Turn in and the seat card’s button', async () => {
    page('Team Owner');
    expect(await screen.findByRole('button', { name: /Turn in/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the seat card' })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/submissions?moduleId=accelerator-week-1'), expect.anything()));
  });

  it('gives an agent the line in Turn in’s place, and never asks for the team’s turn-ins', async () => {
    page('Agent');
    expect(await screen.findByText('Your team’s owner or operator turns this in.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn in/ })).toBeNull();
    // The seat card opens for them too, locked (D-236).
    expect(screen.getByRole('button', { name: 'Open the seat card' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/submissions'), expect.anything());
  });

  it('draws neither in a staff preview of the learner', () => {
    page('Team Owner', true);
    expect(screen.queryByRole('button', { name: /Turn in/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open the seat card' })).toBeNull();
    expect(screen.queryByText('Your team’s owner or operator turns this in.')).toBeNull();
  });
});
