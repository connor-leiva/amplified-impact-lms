// D-226: the account menu opened by a trigger drawn elsewhere (the v3 shell's account button). Without `control` the
// menu behaves as it always has: its own trigger toggles it.
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

function Controlled({ onPick }: { onPick: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="acct" onClick={() => setOpen((o) => !o)}>
        AM
      </button>
      <p>Elsewhere</p>
      <Menu
        label="Your account"
        items={[{ label: 'Account', onSelect: onPick }]}
        trigger={() => null}
        control={{ open, onOpenChange: setOpen, anchor: () => document.querySelector<HTMLElement>('.acct') }}
      />
    </>
  );
}

describe('Menu with an outside trigger (control)', () => {
  it('opens and closes from the outside button', () => {
    render(<Controlled onPick={() => undefined} />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByText('AM'));
    expect(screen.getByRole('menu', { name: 'Your account' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('AM'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a choice runs and closes it', () => {
    const pick = vi.fn();
    render(<Controlled onPick={pick} />);
    fireEvent.click(screen.getByText('AM'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Account' }));
    expect(pick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape closes it and gives the focus back to the outside button', () => {
    render(<Controlled onPick={() => undefined} />);
    fireEvent.click(screen.getByText('AM'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByText('AM'));
  });

  it('a press anywhere else closes it; a press on the outside button is that button’s', () => {
    render(<Controlled onPick={() => undefined} />);
    fireEvent.click(screen.getByText('AM'));
    fireEvent.pointerDown(screen.getByText('AM'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('Menu with its own trigger', () => {
  it('still toggles from its trigger', () => {
    render(
      <Menu
        label="More"
        items={[{ label: 'One', onSelect: () => undefined }]}
        trigger={(t) => (
          <button type="button" onClick={t.toggle} {...t.props}>
            More
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByRole('menu', { name: 'More' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('More'));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
