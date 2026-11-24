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

describe('Download Your Answers (PDF) on the intake page (D-241)', () => {
  const SUBMITTED = Date.parse('2026-11-19T16:04:00Z');
  const pdf = () => new Response('%PDF-1.4', { status: 200, headers: { 'content-disposition': 'attachment; filename="Week 0 Intake - Northline Realty.pdf"' } });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('is not offered on a draft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ answers: { name: 'Dana' }, updatedAt: SUBMITTED, submittedAt: null }), { status: 200 })));
    page(false);
    expect(await screen.findByLabelText('Your name and email.')).toHaveValue('Dana');
    expect(screen.queryByRole('button', { name: 'Download Your Answers (PDF)' })).toBeNull();
  });

  it('appears once the team submits, and saves the team’s own PDF from the session’s route', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/intake/pdf') return pdf();
      if (init?.method === 'PUT') return new Response(JSON.stringify({ answers: { name: 'Dana' }, updatedAt: SUBMITTED, submittedAt: SUBMITTED }), { status: 200 });
      return new Response(JSON.stringify({ answers: { name: 'Dana' }, updatedAt: SUBMITTED, submittedAt: null }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:pdf'), revokeObjectURL: vi.fn() }));
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(this.download);
    });
    page(false);
    await screen.findByLabelText('Your name and email.');
    expect(screen.queryByRole('button', { name: 'Download Your Answers (PDF)' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const button = await screen.findByRole('button', { name: 'Download Your Answers (PDF)' });
    fireEvent.click(button);
    await waitFor(() => expect(saved).toEqual(['Week 0 Intake - Northline Realty.pdf']));
    // The route takes the team from the session: the page names no team, so it can't ask for another one's.
    expect(fetchMock).toHaveBeenCalledWith('/api/intake/pdf', { credentials: 'include' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when the PDF doesn’t arrive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/intake/pdf'
          ? new Response('{}', { status: 403 })
          : new Response(JSON.stringify({ answers: { name: 'Dana' }, updatedAt: SUBMITTED, submittedAt: SUBMITTED }), { status: 200 }),
      ),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    page(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Download Your Answers (PDF)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your answers didn’t download. Try again.');
  });

  it('is not offered to a staff preview, which has no team', async () => {
    vi.stubGlobal('fetch', vi.fn());
    page(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit' }));
    expect(await screen.findByText(/^Submitted /)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download Your Answers (PDF)' })).toBeNull();
  });
});
