// H-10 (D-248): the stack card can't be sent until it has loaded (a failed load says so, with Retry), Send Back sends
// only the rows changed, and a teammate's clash (409) keeps what was typed and stops sending.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { StackCardContent } from '@ai/core/course-types';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { StackPage } from './Stack';
import { LearnProvider } from './data';
import { LEARNER_ID, learnState, PRELAUNCH_NOW } from './test/fixture';

const card: StackCardContent = {
  sources: [
    { id: 'books', name: 'Books', green: 'Read-only export', yellow: 'A CSV each month' },
    { id: 'leads', name: 'Leads', green: 'API access', yellow: 'A weekly export' },
  ],
  exampleLabel: 'Made up',
  exampleTeam: 'Northline Realty',
  example: [],
};
const rows = [
  { source: 'Books', tool: 'QuickBooks Online', plan: 'yellow', who: '' },
  { source: 'Leads', tool: '', plan: 'yellow', who: '' },
];

function page() {
  const st = learnState(PRELAUNCH_NOW, true, {});
  (st.payload.course.weeks[0] as { stackCard?: StackCardContent }).stackCard = card;
  return render(
    <MemoryRouter>
      <ToasterProvider>
        <LearnProvider value={{ course: { kind: 'ready', payload: st.payload }, db: st.db, viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' }, now: st.now }}>
          <StackPage week={0} />
        </LearnProvider>
      </ToasterProvider>
    </MemoryRouter>,
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function stub(gets: (() => Response)[], put: () => Response) {
  const puts: Record<string, unknown>[] = [];
  let n = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return put();
      }
      return gets[Math.min(n++, gets.length - 1)]!();
    }),
  );
  return puts;
}

afterEach(() => vi.unstubAllGlobals());

describe('the stack card (H-10)', () => {
  it('a failed load shows no rows and no way to send, until Retry loads them', async () => {
    stub([() => json({}, 500), () => json({ rows, sentAt: null })], () => json({ rows, sentAt: 1 }));
    page();
    expect(await screen.findByText('Could not load the card.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Books' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeEnabled();
  });

  it('sends only the row that changed, with the row as it was', async () => {
    const puts = stub([() => json({ rows, sentAt: null })], () => json({ rows, sentAt: 1 }));
    page();
    await screen.findByRole('heading', { name: 'Leads' });
    fireEvent.change(screen.getAllByLabelText('Tool')[1]!, { target: { value: 'Follow Up Boss' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Back' }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({ changes: { Leads: { ...rows[1], tool: 'Follow Up Boss' } }, base: { Leads: rows[1] }, send: true });
  });

  it('a teammate’s clash (409) keeps what was typed, read-only, and stops sending', async () => {
    const puts = stub([() => json({ rows, sentAt: null })], () => json({ error: 'Someone on your team changed this card since you opened it. Copy what you typed, then reload the page.', conflicts: ['Books'] }, 409));
    page();
    await screen.findByRole('heading', { name: 'Books' });
    const tool = screen.getAllByLabelText('Tool')[0]!;
    fireEvent.change(tool, { target: { value: 'Xero' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Back' }));
    expect(await screen.findByText(/Someone on your team changed this card/)).toBeInTheDocument();
    expect(tool).toHaveValue('Xero');
    expect(tool).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Send Back' })).toBeDisabled();
    expect(puts).toHaveLength(1);
  });
});
