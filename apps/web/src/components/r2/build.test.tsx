import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { Table } from './Table';
import type { Column } from './Table';
import { TierPill } from './TierPill';
import { Confirm, Modal } from './Modal';
import { Facts, keepHyphens } from './kit';
import { fit, need } from './table';

// D-160 R2-2: what the Build screens add to the R2 kit — the rest of the mockup's `Table` (reorder,
// hover actions, an always-visible control, a card head, a phone card), the tier pill, the modal and
// confirm, and `nb`.

const inRouter = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];
const COLS: Column<Row>[] = [{ key: 'name', label: 'Name', width: 'minmax(120px,1fr)', value: (r) => r.name }];

describe('Table, R2-2', () => {
  it('reorders with the handle: Alt with an arrow key, and headers do not sort meanwhile', () => {
    const onMove = vi.fn();
    inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        onMove={onMove}
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Name/ })).toBeNull();
    const grips = screen.getAllByRole('button', { name: /^Reorder row/ });
    expect(grips).toHaveLength(3);
    expect(grips[1]).toHaveAccessibleName('Reorder row 2. Alt plus arrow keys move it.');
    fireEvent.keyDown(grips[1]!, { key: 'ArrowUp', altKey: true });
    expect(onMove).toHaveBeenLastCalledWith(1, 0);
    fireEvent.keyDown(grips[1]!, { key: 'ArrowDown', altKey: true });
    expect(onMove).toHaveBeenLastCalledWith(1, 2);
    fireEvent.keyDown(grips[0]!, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(grips[2]!, { key: 'ArrowDown', altKey: true });
    fireEvent.keyDown(grips[1]!, { key: 'ArrowUp' });
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it('has hover actions, an always-visible control, a "…" menu and a card head', () => {
    const peek = vi.fn();
    const go = vi.fn();
    inRouter(
      <Table
        label="Things"
        title="Things · 3"
        right={<button type="button">Add</button>}
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        quick={(r) => [{ label: `Peek ${r.name}`, icon: 'r2Eye', onClick: peek }]}
        primary={(r) => (r.id === 'b' ? <button type="button">Go</button> : null)}
        menu={() => [{ label: 'Open', onSelect: go }]}
        actionsWidth="104px"
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Things · 3' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Peek Beta' }));
    expect(peek).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('button', { name: 'Go' })).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'More actions' })[0]!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    expect(go).toHaveBeenCalledOnce();
  });

  it('on a phone, draws a screen’s own card with one menu: hover actions, Move up / Move down, then the rest', () => {
    const was = window.innerWidth;
    window.innerWidth = 390;
    try {
      const onMove = vi.fn();
      inRouter(
        <Table
          label="Things"
          cols={COLS}
          rows={ROWS}
          rowKey={(r) => r.id}
          onMove={onMove}
          quick={() => [{ label: 'Peek', icon: 'r2Eye', onClick: () => {} }]}
          menu={() => [{ label: 'Open', onSelect: () => {} }]}
          card={(r, _i, items) => (
            <p>
              {r.name}: {items.map((x) => (x === 'separator' ? '|' : x.label)).join(', ')}
            </p>
          )}
          empty={{ icon: 'r2File', title: 'None' }}
        />,
      );
      expect(screen.getByText('Alpha: Peek, Move down, |, Open')).toBeInTheDocument();
      expect(screen.getByText('Beta: Peek, Move up, Move down, |, Open')).toBeInTheDocument();
      expect(screen.getByText('Gamma: Peek, Move up, |, Open')).toBeInTheDocument();
    } finally {
      window.innerWidth = was;
    }
  });

  it('draws a row’s "…" disabled when it has nothing to offer (R2-2b)', () => {
    inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        menu={() => []}
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    const more = screen.getAllByRole('button', { name: 'More actions' });
    expect(more).toHaveLength(3);
    for (const b of more) expect(b).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(more[0]!);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('counts the handle column in what the columns need, and leads the template with it', () => {
    expect(need([{ width: '100px' }], { move: true, actions: '104px' })).toBe(116 + 40 + 36 + 120);
    expect(fit([{ width: '100px' }], 2000, { move: true, actions: '32px', laptop: false, phone: false }).template).toBe(
      '20px 100px 32px',
    );
  });
});

describe('TierPill (R2-2)', () => {
  it('is a menu of the two tiers; choosing the other one changes it, the current one does nothing', () => {
    const onChange = vi.fn();
    render(<TierPill tier="agent" onChange={onChange} />);
    const pill = screen.getByRole('button', { name: 'Tier access: Agent + Team' });
    expect(pill).toHaveTextContent('Agent + Team');
    fireEvent.click(pill);
    const menu = screen.getByRole('menu', { name: 'Tier access' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['Agent + Team', 'Team only']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Agent + Team' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(pill);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Team only' }));
    expect(onChange).toHaveBeenCalledWith('team');
  });
});

describe('Modal and Confirm (R2-2)', () => {
  it('is a named dialog that Escape and Close close, unless locked', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal title="New announcement" onClose={onClose}>
        <input aria-label="Title" />
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'New announcement' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Title')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(
      <Modal title="Locked" onClose={onClose} lock>
        <p>Answer it</p>
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('confirms: Cancel closes, the action closes and runs', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <Confirm
        title="Publish Sales AI Employee?"
        body="Learners see it."
        cta="Publish"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Publish Sales AI Employee?' })).toHaveTextContent('Learners see it.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Facts, R2-2b', () => {
  it('marks a wide fact, which takes a phone’s whole row', () => {
    render(
      <Facts
        items={[
          { label: 'Cohort', value: 'December 2026' },
          { label: 'Opens', value: 'Wed, Dec 2 · 12:00 PM MST', wide: true },
        ]}
      />,
    );
    const cohort = screen.getByText('Cohort').parentElement!;
    const opens = screen.getByText('Opens').parentElement!;
    expect(cohort.className).toBe('');
    expect(opens.className).not.toBe('');
    expect(opens).toHaveTextContent('Wed, Dec 2 · 12:00 PM MST');
  });
});

describe('keepHyphens (R2-2, the mockup’s nb)', () => {
  it('keeps each hyphenated word on one line', () => {
    const { container } = render(<p>{keepHyphens('Paste an MLS listing → Fair-Housing-checked copy')}</p>);
    expect(container.textContent).toBe('Paste an MLS listing → Fair-Housing-checked copy');
    expect(container.querySelectorAll('span')).toHaveLength(1);
    expect(container.querySelector('span')!.textContent).toBe('Fair-Housing-checked');
    expect(keepHyphens('No hyphen here')).toBe('No hyphen here');
  });
});
