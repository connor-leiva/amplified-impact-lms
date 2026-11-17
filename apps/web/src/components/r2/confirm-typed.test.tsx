import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Confirm } from './Modal';

// D-168: the R2 Confirm's typed confirmation (a sensitive Console flag's key): the action stays off
// until the word is typed exactly, then runs with what was typed.
describe('Confirm, typed (D-168)', () => {
  it('keeps the action off until the word is typed, and hands it on', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <Confirm
        title="Turn off masquerade_enabled?"
        body="Nobody can start a masquerade session while it is off."
        cta="Turn off"
        danger
        audited
        typed={{ word: 'masquerade_enabled', label: 'Type masquerade_enabled to confirm' }}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    const go = screen.getByRole('button', { name: 'Turn off' });
    const field = screen.getByRole('textbox', { name: 'Type masquerade_enabled to confirm' });
    expect(field).toHaveFocus();
    expect(go).toBeDisabled();
    fireEvent.change(field, { target: { value: 'masquerade_enable' } });
    expect(go).toBeDisabled();
    fireEvent.change(field, { target: { value: ' masquerade_enabled ' } });
    expect(go).toBeEnabled();
    fireEvent.click(go);
    expect(onConfirm).toHaveBeenCalledWith('masquerade_enabled');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('This action is audit-logged.')).toBeInTheDocument();
  });

  it('asks nothing typed without `typed`', () => {
    const onConfirm = vi.fn();
    render(<Confirm title="Publish?" body="Learners see it." cta="Publish" onConfirm={onConfirm} onClose={() => {}} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});
