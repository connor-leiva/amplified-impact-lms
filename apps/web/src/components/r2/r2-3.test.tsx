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

  it('CheckCell without a handler is a disabled box and its word; a locked one says it is fixed by product rules', () => {
    const { rerender } = render(<CheckCell label="View billing, Admin" on word="Yes" />);
    const box = screen.getByRole('checkbox', { name: 'View billing, Admin' });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    rerender(<CheckCell label="Refund or void an invoice, Support" on={false} locked word="No" />);
    const locked = screen.getByRole('checkbox', { name: 'Refund or void an invoice, Support. Fixed by product rules' });
    expect(locked).not.toBeChecked();
    expect(locked.closest('[title]')).toHaveAttribute('title', 'Fixed by product rules');
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

describe('ErrorState and CheckCell’s phone order (R2-3b)', () => {
  it('ErrorState is an alert with the Console’s words and Retry', async () => {
    const { ErrorState } = await import('./kit');
    const retry = vi.fn();
    render(<ErrorState copy={{ title: 'Too many requests.', body: 'Wait a minute, then try again.', retry: 'Retry' }} onRetry={retry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Too many requests.Wait a minute, then try again.Retry');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('on a phone the word comes before the box', () => {
    const { container } = render(<CheckCell phone label="View billing, Support" on word="Allowed" />);
    expect(container.textContent).toBe('Allowed');
    expect(container.firstElementChild!.firstChild!.nodeType).toBe(Node.TEXT_NODE);
  });
});

describe('CheckCell as a toggle, and the confirm (D-160 R2-3b, editable Roles)', () => {
  it('asks its caller and changes nothing itself; a disabled one says why', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<CheckCell label="Start and extend masquerade, Admin" on word="Yes" onToggle={onToggle} />);
    const box = screen.getByRole('checkbox', { name: 'Start and extend masquerade, Admin' });
    expect(box).toBeEnabled();
    fireEvent.click(box);
    expect(onToggle).toHaveBeenCalledTimes(1);
    // Controlled: it stays as it was until the confirmed change comes back.
    expect(box).toBeChecked();
    rerender(<CheckCell label="Edit curriculum, Admin" on word="Yes" title="This permission is set in Staff & Roles." />);
    const off = screen.getByRole('checkbox', { name: 'Edit curriculum, Admin' });
    expect(off).toBeDisabled();
    expect(off.closest('[title]')).toHaveAttribute('title', 'This permission is set in Staff & Roles.');
    // A locked box never toggles, even with a handler.
    rerender(<CheckCell label="Refund or void an invoice, Support" on={false} locked word="No" onToggle={onToggle} />);
    expect(screen.getByRole('checkbox', { name: 'Refund or void an invoice, Support. Fixed by product rules' })).toBeDisabled();
  });

  it('on a phone the real control is one named box over the row; the drawn one is hidden', async () => {
    const onToggle = vi.fn();
    const { container } = render(<CheckCell phone label="View billing, Support" on word="Allowed" onToggle={onToggle} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'View billing, Support' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
    expect(container.textContent).toBe('Allowed');
  });

  it('the confirm says it is audit-logged, waits while busy, and shows a refusal with the action off', async () => {
    const { Confirm } = await import('./Modal');
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const props = { title: 'Remove this permission from Admin?', body: 'Start and extend masquerade. Applies to every Admin on staff right away.', cta: 'Remove permission', onConfirm, onClose, keepOpen: true };
    const { rerender } = render(<Confirm {...props} busy />);
    const dialog = screen.getByRole('dialog', { name: 'Remove this permission from Admin?' });
    expect(dialog).toHaveTextContent('This action is audit-logged.');
    expect(screen.getByRole('button', { name: 'Remove permission' })).toBeDisabled();
    rerender(<Confirm {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove permission' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    rerender(<Confirm {...props} error="Fixed by product rules." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Fixed by product rules.');
    expect(screen.getByRole('button', { name: 'Remove permission' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
