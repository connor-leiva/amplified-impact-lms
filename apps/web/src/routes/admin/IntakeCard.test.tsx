// D-257: the Week 0 Intake card says, under the intro, how the learner's intake reads it.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Db } from '@ai/core';
import { IntakeCard } from './IntakeCard';
import type { WeekDraft } from './WeekBuilder.vm';

describe('the Week 0 Intake card (D-257)', () => {
  it('puts a one-line hint under the intro', async () => {
    const draft = { course: { week: 0, intake: { intro: 'Welcome.', sections: [] } } } as unknown as WeekDraft;
    render(<IntakeCard db={{} as Db} draft={draft} up={() => undefined} act={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Edit' }));
    const intro = screen.getByRole('textbox', { name: /^Intro/ });
    expect(intro).toHaveValue('Welcome.');
    const hint = screen.getByText('Blank line for a new paragraph. Start a line with - for a list. **Bold**.');
    expect(hint.previousElementSibling).toBe(intro);
  });
});
