// D-196: an autosave shows the time in Mountain Time. D-248: H-10 (editable only once loaded; a save sends only what
// changed; a teammate's clash keeps what was typed and says to reload) and H-11 (optional questions say so; a submit
// with a required answer missing names them, marks each and moves to the first).
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { CourseIntake } from '@ai/core/course-types';
import { INTAKE_CONFLICT } from '@ai/core/intake';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { IntakePage } from './Intake';
import { LearnProvider } from './data';
import { LEARNER_ID, learnState, PRELAUNCH_NOW } from './test/fixture';
import s from './Intake.module.css';

const form: CourseIntake = {
  intro: 'A short intro.',
  sections: [
    {
      title: 'You and Your Team',
      questions: [
        { id: 'name', label: 'Your name and email.', kind: 'short', required: true },
        { id: 'team', label: "Your team's name and brokerage.", kind: 'short', required: true },
        { id: 'size', label: 'Team size.', kind: 'short' },
        { id: 'ai', label: 'Which AI will your team use?', kind: 'choice', options: ['Claude', 'ChatGPT'], required: true },
      ],
    },
  ],
};

function page(staff = false, intake: CourseIntake = form) {
  const st = learnState(PRELAUNCH_NOW, true, {});
  (st.payload.course.weeks[0] as { intake?: CourseIntake }).intake = intake;
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

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const loaded = (answers: Record<string, string> = {}) => json({ answers, updatedAt: answers.name ? Date.parse('2026-11-19T15:00:00Z') : null, submittedAt: null });
const SAVED = Date.parse('2026-11-19T16:04:00Z');

/** A fetch that answers GETs from `gets` in turn and PUTs with `put`, recording each PUT's body. */
function stub(gets: (() => Response)[], put: (body: Record<string, unknown>) => Response = () => json({ answers: {}, updatedAt: SAVED, submittedAt: null })) {
  const puts: Record<string, unknown>[] = [];
  let n = 0;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      puts.push(body);
      return put(body);
    }
    const next = gets[Math.min(n, gets.length - 1)]!;
    n += 1;
    return next();
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, puts };
}

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => {
  setViewerZone(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the intake form (D-196)', () => {
  it('autosaves and shows the time in MT', async () => {
    const { fetchMock } = stub([() => loaded()]);
    page();
    fireEvent.change(await screen.findByLabelText('Your name and email.'), { target: { value: 'Dana' } });
    await waitFor(() => expect(screen.getByText(/Saved 9:04 AM MT/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/intake', expect.objectContaining({ method: 'PUT' }));
  });
});

describe('H-10: a save sends only what changed, and editing waits for the load', () => {
  it('sends the changed answer with the answer it was, never the whole form', async () => {
    const { puts } = stub([() => loaded({ name: 'Dana', ai: 'Claude' })]);
    page();
    const team = await screen.findByLabelText("Your team's name and brokerage.");
    expect(screen.getByLabelText('Your name and email.')).toHaveValue('Dana');
    fireEvent.change(team, { target: { value: 'Lee Group' } });
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({ changes: { team: 'Lee Group' }, base: { team: null } });
    // The next save diffs against what the server now holds.
    fireEvent.change(team, { target: { value: 'Lee Group, Compass' } });
    await waitFor(() => expect(puts).toHaveLength(2));
    expect(puts[1]).toEqual({ changes: { team: 'Lee Group, Compass' }, base: { team: 'Lee Group' } });
  });

  it('a failed load shows no editable form: every field and Submit stay disabled until Retry loads', async () => {
    stub([() => json({ error: 'boom' }, 500), () => loaded({ name: 'Dana' })]);
    page();
    expect(await screen.findByText('Could not load the intake.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name and email.')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Claude' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByLabelText('Your name and email.')).toBeEnabled());
    expect(screen.getByLabelText('Your name and email.')).toHaveValue('Dana');
    expect(screen.queryByText('Could not load the intake.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('an agent’s refused load says so, with nothing to retry and nothing to type into', async () => {
    stub([() => json({ error: 'That intake is for the owner and the operator.' }, 403)]);
    page();
    expect(await screen.findByText('That intake is for the owner and the operator.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByLabelText('Your name and email.')).toBeDisabled();
  });

  it('shows no form while the answers load, so nothing typed can be lost to them', async () => {
    let answer: (r: Response) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (answer = r))));
    page();
    expect(screen.queryByLabelText('Your name and email.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    await act(async () => answer(loaded({ name: 'Dana' })));
    expect(await screen.findByLabelText('Your name and email.')).toHaveValue('Dana');
  });

  it('a teammate’s clash (409) keeps what was typed, read-only, and says to reload', async () => {
    const { puts } = stub([() => loaded({ name: 'Dana' })], () => json({ error: INTAKE_CONFLICT, conflicts: ['name'] }, 409));
    page();
    const name = await screen.findByLabelText('Your name and email.');
    fireEvent.change(name, { target: { value: 'Dana Lee' } });
    expect(await screen.findByText(INTAKE_CONFLICT)).toBeInTheDocument();
    expect(name).toHaveValue('Dana Lee');
    expect(name).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(document.activeElement).toBe(screen.getByText(INTAKE_CONFLICT).closest('[role="alert"]'));
    // Nothing more is sent.
    fireEvent.change(name, { target: { value: 'Dana Lee 2' } });
    await new Promise((r) => setTimeout(r, 700));
    expect(puts).toHaveLength(1);
  });
});

describe('H-11: required questions, and the missing ones on a submit', () => {
  it('says Optional on a question that isn’t required, and marks the required ones for a screen reader', async () => {
    stub([() => loaded()]);
    page();
    await screen.findByLabelText("Your team's name and brokerage.");
    expect(screen.getAllByText('Optional')).toHaveLength(1);
    expect(screen.getByText('Optional').closest('label')).toHaveTextContent('Team size.');
    expect(screen.getByLabelText('Your name and email.')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('radiogroup', { name: 'Which AI will your team use?' })).toHaveAttribute('aria-required', 'true');
  });

  it('a submit with required answers missing names them, marks each, and moves to the first; nothing is sent', async () => {
    const { puts } = stub([() => loaded({ team: 'Lee Group' })]);
    page();
    await screen.findByLabelText('Your name and email.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const alert = await screen.findByText('Some required answers are missing.');
    const summary = alert.closest('[role="alert"]') as HTMLElement;
    expect(summary).toHaveTextContent('Your name and email.');
    expect(summary).toHaveTextContent('Which AI will your team use?');
    expect(summary).not.toHaveTextContent("Your team's name");
    const name = screen.getByLabelText('Your name and email.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(name.getAttribute('aria-describedby')!)).toHaveTextContent('Add an answer.');
    expect(screen.getByRole('radiogroup', { name: 'Which AI will your team use?' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Pick one.')).toBeInTheDocument();
    expect(document.activeElement).toBe(name);
    expect(puts).toHaveLength(0);
    // Answering clears that question's mark, and only that one.
    fireEvent.change(name, { target: { value: 'Dana' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('radiogroup', { name: 'Which AI will your team use?' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('highlights the ids the server’s 422 names (a teammate cleared one), and moves to it', async () => {
    stub([() => loaded({ name: 'Dana', team: 'Lee Group', ai: 'Claude' })], (body) =>
      body.submit ? json({ error: 'Some required answers are missing.', missing: ['team'] }, 422) : json({ answers: {}, updatedAt: SAVED, submittedAt: null }),
    );
    page();
    await screen.findByLabelText('Your name and email.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const team = screen.getByLabelText("Your team's name and brokerage.");
    await waitFor(() => expect(team).toHaveAttribute('aria-invalid', 'true'));
    expect(document.activeElement).toBe(team);
    expect(screen.getByText('Some required answers are missing.').closest('[role="alert"]')).toHaveTextContent("Your team's name and brokerage.");
  });
});

describe('Download Your Answers (PDF) on the intake page (D-246)', () => {
  const SUBMITTED = Date.parse('2026-11-19T16:04:00Z');
  /** The form's three required answers. */
  const COMPLETE = { name: 'Dana', team: 'Lee Group', ai: 'Claude' };
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
      // Every required answer is given, so the page sends the submit (H-11, D-248, checks before it sends).
      if (init?.method === 'PUT') return new Response(JSON.stringify({ answers: COMPLETE, updatedAt: SUBMITTED, submittedAt: SUBMITTED }), { status: 200 });
      return new Response(JSON.stringify({ answers: COMPLETE, updatedAt: SUBMITTED, submittedAt: null }), { status: 200 });
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

describe('the page’s side gutter on a phone (audit M-3, D-248)', () => {
  it('gives everything outside the question cards the page gutter at 767px and under, and leaves wider screens alone', () => {
    const css = readFileSync('src/routes/learn/Intake.module.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/@media \(max-width: 767px\) \{\s*\.page \{\s*padding-inline: var\(--r2-pad\);\s*\}\s*\.lock \{\s*margin-inline: calc\(var\(--r2-pad\) \* -1\);\s*\}\s*\}/);
    // Nothing else sets a side gutter, so 768px and up are as they were.
    expect(css.match(/padding-inline|margin-inline/g)).toHaveLength(2);
  });
});

// The intake intro's formatting (ported from #269, D-257): the intro keeps the lines staff typed (`IntroText`).
describe('the intake page’s intro in its lines', () => {
  it('renders a one-paragraph intro as one paragraph, as before', async () => {
    stub([() => loaded()]);
    page();
    const intro = await screen.findByText('A short intro.');
    expect(intro.tagName).toBe('P');
    expect(intro).toHaveClass(s.intro!);
  });

  it('keeps the paragraphs, the list and the bold staff typed, in the intro and a section’s intro', async () => {
    stub([() => loaded()]);
    page(false, {
      ...form,
      intro: 'Welcome to Week 0.\n\nThree words you’ll see a lot:\n- **AI Implementer.** The person who sets it up.\n- **Draft.** Nothing sends on its own.',
      sections: [{ ...form.sections[0]!, intro: 'First line.\nSecond line.' }],
    });
    const lead = await screen.findByText('Welcome to Week 0.');
    const root = lead.parentElement!;
    expect(root).toHaveClass(s.intro!);
    expect([...root.children].map((c) => c.tagName)).toEqual(['P', 'P', 'UL']);
    expect([...root.querySelectorAll('li strong')].map((b) => b.textContent)).toEqual(['AI Implementer.', 'Draft.']);
    expect(document.body.innerHTML).toContain('First line.<br>Second line.');
    expect(document.body.textContent).not.toContain('**');
  });
});
