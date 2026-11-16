import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Bar, CheckCell, Skel, Stat } from './kit';
import { Drawer } from './Drawer';
import { Menu } from './Menu';

// D-160 R2-3: the primitives the Overview, Learners & Teams, Tiers & Upgrades, the Audit Log and Roles
// & Permissions add beside R2-1c's and R2-2's: `Stat`, a two-segment `Bar`, `Skel`, `CheckCell`, a
// disabled menu item and the detail `Drawer`. Their pixels are proved by `pnpm parity:admin-r2`; these
// hold their markup and behaviour.

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Stat (the mockup’s `Stat`)', () => {
  it('is a link to where it goes, the label, figure and line inside it', () => {
    inRouter(<Stat label="Active learners" value="148" sub="104 Agent · 44 Team" to="/admin/learners" />);
    const link = screen.getByRole('link', { name: /Active learners\s*148\s*104 Agent · 44 Team/ });
    expect(link).toHaveAttribute('href', '/admin/learners');
  });

  it('without `to`, only shows its figure; `tone` colours the line', () => {
    const { container } = inRouter(<Stat label="Build completion" value="33%" sub="+6" tone="ok" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('+6').className).toMatch(/toneOk/);
    expect(container.textContent).toBe('Build completion33%+6');
  });
});

describe('Bar’s second segment', () => {
  it('draws a blue segment after the first, and none without `pct2`', () => {
    const { container, rerender } = render(<Bar pct={66} pct2={15} />);
    const segs = container.querySelectorAll('i');
    expect([...segs].map((i) => i.style.width)).toEqual(['66%', '15%']);
    expect(segs[1]!.className).toMatch(/b2/);
    rerender(<Bar pct={82} />);
    expect(container.querySelectorAll('i')).toHaveLength(1);
  });
});

describe('Skel and CheckCell', () => {
  it('Skel is a busy status with its shimmering lines', () => {
    render(<Skel lines={3} />);
    const s = screen.getByRole('status', { name: 'Loading' });
    expect(s).toHaveAttribute('aria-busy', 'true');
    expect(s.children).toHaveLength(3);
  });

  it('CheckCell is a read-only box and its word; a locked one says it is fixed by product rules', () => {
    const { rerender } = render(<CheckCell label="View billing, Admin" on word="Yes" />);
    const box = screen.getByRole('checkbox', { name: 'View billing, Admin' });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    rerender(<CheckCell label="Refund or void an invoice, Support" on={false} locked word="No" />);
    const locked = screen.getByRole('checkbox', { name: 'Refund or void an invoice, Support. Fixed by product rules' });
    expect(locked).not.toBeChecked();
    expect(locked.parentElement).toHaveAttribute('title', 'Fixed by product rules');
  });
});

describe('a disabled menu item (the mockup’s `off`)', () => {
  it('is drawn disabled, without a lock, with its reason as its title', () => {
    const go = vi.fn();
    render(
      <Menu
        label="Actions"
        items={[{ label: 'Open user record', disabled: true, title: 'Not available yet', onSelect: go }]}
        trigger={(t) => (
          <button type="button" {...t.props} onClick={t.toggle}>
            More
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    const item = screen.getByRole('menuitem', { name: 'Open user record' });
    expect(item).toBeDisabled();
    expect(item).toHaveAttribute('title', 'Not available yet');
    expect(item.querySelector('svg')).toBeNull();
  });
});

describe('Drawer (the detail drawer)', () => {
  it('is a modal dialog with data-drawer="open", named by its title; Escape and the scrim close it', () => {
    const close = vi.fn();
    const { container } = render(
      <Drawer title="Audit Entry" description="Masquerade" onClose={close} foot={<button type="button">Done</button>}>
        <p>Body</p>
      </Drawer>,
    );
    const d = screen.getByRole('dialog', { name: 'Audit Entry' });
    expect(d).toHaveAttribute('data-drawer', 'open');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Masquerade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(container.firstElementChild!);
    expect(close).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(screen.getByText('Body'));
    expect(close).toHaveBeenCalledTimes(2);
  });
});

describe('TapCheck (a phone checkbox in a 44px target)', () => {
  it('is one named checkbox; the drawn box is hidden from assistive tech', async () => {
    const { TapCheck } = await import('./kit');
    const change = vi.fn();
    render(<TapCheck label="Admin · Publish modules" checked onChange={change} />);
    const box = screen.getByRole('checkbox', { name: 'Admin · Publish modules' });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });
});
