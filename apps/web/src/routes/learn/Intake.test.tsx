// D-196: an autosave shows the time in Mountain Time.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { IntakePage } from './Intake';
import { LearnProvider } from './data';
import { LEARNER_ID, learnState, PRELAUNCH_NOW } from './test/fixture';

const form = {
  intro: 'A short intro.',
  sections: [{ title: 'You and Your Team', questions: [{ id: 'name', label: 'Your name and email.', kind: 'short' as const }] }],
};

function page(staff: boolean) {
  const st = learnState(PRELAUNCH_NOW, true, {});
  (st.payload.course.weeks[0] as { intake?: typeof form }).intake = form;
  const viewer = staff
    ? { actor: { kind: 'staff' as const, staffId: 's1' }, role: 'admin' as const }
    : { actor: { kind: 'learner' as const, userId: LEARNER_ID }, role: 'learner' as const };
  return render(
    <MemoryRouter>
      <ToasterProvider>
        <LearnProvider value={{ course: { kind: 'ready', payload: st.payload }, db: st.db, viewer, now: st.now }}>
          <IntakePage week={0} />
        </LearnProvider>
      </ToasterProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

describe('the intake form (D-196)', () => {
  it('autosaves and shows the time in MT', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response(JSON.stringify({ answers: { name: 'Dana' }, updatedAt: Date.parse('2026-11-19T16:04:00Z'), submittedAt: null }), { status: 200 });
      return new Response(JSON.stringify({ answers: {}, updatedAt: null, submittedAt: null }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    page(false);
    fireEvent.change(await screen.findByLabelText('Your name and email.'), { target: { value: 'Dana' } });
    await waitFor(() => expect(screen.getByText(/Saved 9:04 AM MT/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/intake', expect.objectContaining({ method: 'PUT' }));
    vi.unstubAllGlobals();
  });
});
