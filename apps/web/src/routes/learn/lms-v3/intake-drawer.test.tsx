// H-10 (D-248): the v3 intake drawer is locked until the answers load (a failed load says so in its foot and is asked
// again when the drawer opens again), sends only what changed, and after a teammate's clash shows the server's words
// and locks, what was typed still in it.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CourseIntake } from '@ai/core/course-types';
import { INTAKE_CONFLICT } from '@ai/core/intake';
import { FormDrawer } from './FormDrawer';
import { INTAKE_DRAWER_LOAD_FAILED, useIntakeForm } from './V3Week';

const intake: CourseIntake = {
  sections: [
    {
      title: 'You and Your Team',
      questions: [
        { id: 'name', label: 'Your name and email.', kind: 'short', required: true },
        { id: 'team', label: "Your team's name and brokerage.", kind: 'short' },
      ],
    },
  ],
};
const NOW = Date.parse('2026-11-24T20:00:00Z');

function Harness({ open }: { open: boolean }) {
  const f = useIntakeForm(intake, NOW, open);
  return f ? <FormDrawer f={f} open={open} onClose={() => undefined} locked={f.locked} /> : null;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const foot = () => document.querySelector('.fm-note')!.textContent;
const field = (id: string) => document.querySelector<HTMLInputElement>(`[id="fm-${id}"]`)!;

function stub(gets: (() => Response)[], put: () => Response = () => json({ answers: {}, updatedAt: NOW, submittedAt: null })) {
  const puts: Record<string, unknown>[] = [];
  let n = 0;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      puts.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return put();
    }
    const next = gets[Math.min(n, gets.length - 1)]!;
    n += 1;
    return next();
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, puts };
}

afterEach(() => vi.unstubAllGlobals());

describe('the v3 intake drawer (H-10)', () => {
  it('is locked while the answers load and after a failed load, which it asks again when it opens again', async () => {
    const { fetchMock } = stub([() => json({ error: 'boom' }, 500), () => json({ answers: { name: 'Dana' }, updatedAt: NOW, submittedAt: null })]);
    const view = render(<Harness open />);
    expect(field('name')).toHaveAttribute('readonly');
    await waitFor(() => expect(foot()).toBe(INTAKE_DRAWER_LOAD_FAILED));
    expect(field('name')).toHaveAttribute('readonly');
    expect(document.querySelector('.fm-submit')).toBeNull();
    view.rerender(<Harness open={false} />);
    view.rerender(<Harness open />);
    await waitFor(() => expect(field('name')).not.toHaveAttribute('readonly'));
    expect(field('name')).toHaveValue('Dana');
    expect(foot()).toBe('');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('an agent’s refused load shows the server’s words, locked', async () => {
    stub([() => json({ error: 'That intake is for the owner and the operator.' }, 403)]);
    render(<Harness open />);
    await waitFor(() => expect(foot()).toBe('That intake is for the owner and the operator.'));
    expect(field('name')).toHaveAttribute('readonly');
  });

  it('sends only what changed, and a teammate’s clash shows the server’s words and locks, keeping what was typed', async () => {
    const { puts } = stub([() => json({ answers: { name: 'Dana' }, updatedAt: NOW, submittedAt: null })], () => json({ error: INTAKE_CONFLICT, conflicts: ['team'] }, 409));
    render(<Harness open />);
    await waitFor(() => expect(field('team')).not.toHaveAttribute('readonly'));
    fireEvent.change(field('team'), { target: { value: 'Lee Group' } });
    await waitFor(() => expect(puts).toHaveLength(1), { timeout: 2000 });
    expect(puts[0]).toEqual({ changes: { team: 'Lee Group' }, base: { team: null } });
    await waitFor(() => expect(foot()).toBe(INTAKE_CONFLICT));
    expect(field('team')).toHaveValue('Lee Group');
    expect(field('team')).toHaveAttribute('readonly');
    await act(async () => undefined);
    expect(screen.queryByText('Saving')).toBeNull();
  });
});

// D-257: the drawer keeps the intro's lines as the intake page does (`IntroText`). One paragraph is the package's <p>
// (FormDrawer.equality.test.tsx compares it with the package's own drawer).
describe('the v3 intake drawer’s intro (D-257)', () => {
  function Intro({ text, section }: { text: string; section?: string }) {
    const form: CourseIntake = { intro: text, sections: [{ ...intake.sections[0]!, ...(section ? { intro: section } : {}) }] };
    const f = useIntakeForm(form, NOW, true);
    return f ? <FormDrawer f={f} open onClose={() => undefined} locked={f.locked} /> : null;
  }

  it('renders paragraphs, a list and bold in the intro and a section’s intro', async () => {
    stub([() => json({ answers: {}, updatedAt: null, submittedAt: null })]);
    render(<Intro text={'Welcome to Week 0.\n\nThree words you’ll see a lot:\n- **AI Implementer.** The person who sets it up.\n- **Draft.** Nothing sends on its own.'} section={'First line.\nSecond line.'} />);
    const intro = document.querySelector('.fm-intro')!;
    expect(intro.tagName).toBe('DIV');
    expect([...intro.children].map((c) => c.tagName)).toEqual(['P', 'P', 'UL']);
    expect([...intro.querySelectorAll('li strong')].map((b) => b.textContent)).toEqual(['AI Implementer.', 'Draft.']);
    expect(document.querySelector('.fm-sec-d')!.innerHTML).toBe('First line.<br>Second line.');
    // The section after it still reads as the intro's next sibling, so the package's rule draws its top line.
    expect(intro.nextElementSibling).toHaveClass('fm-sec');
    await waitFor(() => expect(field('name')).not.toHaveAttribute('readonly'));
  });

  it('renders a one-paragraph intro as the package’s <p>', async () => {
    stub([() => json({ answers: {}, updatedAt: null, submittedAt: null })]);
    render(<Intro text="A short intro." />);
    const intro = document.querySelector('.fm-intro')!;
    expect(intro.outerHTML).toBe('<p class="fm-intro aim-in" style="--i: 1;">A short intro.</p>');
    await waitFor(() => expect(field('name')).not.toHaveAttribute('readonly'));
  });
});
