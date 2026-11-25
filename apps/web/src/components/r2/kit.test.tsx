import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Bar, Facts, Find, KV, Note, PageHead, Pill, Sel, Tabs, Timeline, Two, breakAt } from './kit';
import { AreaProvider } from './area-context';
import { Table } from './Table';
import type { Column } from './Table';
import { fit, need } from './table';

// D-160 R2-1c: the R2 kit and table the Support screens are built from, drawn as the mockup draws them
// (`Head`, `Pill`, `Bar`, `Two`, `Facts`, `KV`, `Tabs`, `Find`, `Sel`, `Table`). Their
// pixels are proved by `pnpm parity:admin-r2`; these hold their rules, markup and behaviour.

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('the table fits its own width (BUILD-SPEC § 2, the mockup’s `need`, `drop` and `tight`)', () => {
  const ws = [
    { width: 'minmax(170px,1.3fr)' },
    { width: 'minmax(116px,.9fr)', hideLap: true },
    { width: 'minmax(140px,1.1fr)' },
    { width: '132px' },
    { width: '96px' },
    { width: '124px' },
  ];
  const users = [
    { width: 'minmax(220px,1.6fr)' },
    { width: 'minmax(150px,1fr)' },
    { width: '104px', hideLap: true },
    { width: '104px' },
    { width: '128px' },
  ];

  it('asks for each track’s px, 120 for a bare fraction, 16 a gap, 40 of padding, the checkbox and the actions', () => {
    expect(need(ws, { actions: '32px' })).toBe(962);
    expect(need(users, { select: true, actions: '32px' })).toBe(906);
    expect(need([{}], {})).toBe(176);
  });

  it('Workspaces drops Owner at laptop width (a 910px card) and keeps it at 1280 (970px)', () => {
    const lap = fit(ws, 910, { actions: '32px', laptop: true, phone: false });
    expect(lap.drop).toBe(true);
    expect(lap.visible).toHaveLength(5);
    expect(lap.tight).toBe(false);
    expect(lap.template).toBe('minmax(170px,1.3fr) minmax(140px,1.1fr) 132px 96px 124px 32px');
    const desk = fit(ws, 970, { actions: '32px', laptop: false, phone: false });
    expect(desk.drop).toBe(false);
    expect(desk.visible).toHaveLength(6);
  });

  it('Users keeps Role at laptop width, where it just fits; drops it under 800px; never on a phone', () => {
    expect(fit(users, 910, { select: true, actions: '32px', laptop: true, phone: false }).drop).toBe(false);
    expect(fit(users, 700, { select: true, actions: '32px', laptop: false, phone: false }).drop).toBe(true);
    expect(fit(users, 300, { select: true, actions: '32px', laptop: false, phone: true }).drop).toBe(false);
  });

  it('tightens minmax tracks when even the dropped set doesn’t fit', () => {
    const t = fit(users, 500, { select: true, actions: '32px', laptop: true, phone: false });
    expect(t.tight).toBe(true);
    expect(t.template).toBe('16px minmax(0,1.6fr) minmax(0,1fr) 104px 128px 32px');
  });
});

describe('the kit', () => {
  it('PageHead: an h1, its status, the description, the actions and the way back', () => {
    inRouter(
      <PageHead
        title="Northshore Group"
        meta={<Pill status={{ label: 'Active', tone: 'ok' }} />}
        description="Every team."
        right={<button type="button">Masquerade as owner</button>}
        back={{ to: '/admin/workspaces', label: 'Workspaces' }}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Northshore Group');
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Every team.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspaces' })).toHaveAttribute('href', '/admin/workspaces');
  });

  it('PageHead inside a tab (D-253): no h1 and no way back, but the description, the status and the actions stay', () => {
    inRouter(
      <AreaProvider value>
        <PageHead
          title="Billing"
          meta={<Pill tone="neutral">Read-only for your role</Pill>}
          description="The lists behind the money."
          right={<button type="button">Export</button>}
          back={{ to: '/admin/revenue', label: 'Revenue' }}
        />
      </AreaProvider>,
    );
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Revenue' })).toBeNull();
    expect(screen.getByText('The lists behind the money.')).toBeInTheDocument();
    expect(screen.getByText('Read-only for your role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('PageHead inside a tab with a status alone still draws it', () => {
    inRouter(
      <AreaProvider value>
        <PageHead title="Billing" meta={<Pill tone="neutral">Read-only for your role</Pill>} />
      </AreaProvider>,
    );
    expect(screen.getByText('Read-only for your role')).toBeInTheDocument();
  });

  it('Pill and Bar carry their tone and fill as classes, never red', () => {
    const { container } = render(
      <>
        <Pill status={{ label: 'Past due', tone: 'bad' }} />
        <Pill tone="neutral">library</Pill>
        <Bar pct={93.75} kind="hot" />
        <Bar pct={100} kind="full" />
        <Bar pct={0} />
      </>,
    );
    const pills = container.querySelectorAll('span[class*="pl"]');
    expect(pills[0]!.className).not.toBe(pills[1]!.className);
    const fills = container.querySelectorAll('i');
    expect((fills[0] as HTMLElement).style.width).toBe('93.75%');
    expect(new Set([...container.querySelectorAll('[class*="bar"]')].map((b) => b.className)).size).toBe(3);
  });

  it('Two breaks an address after its @, and links its name when asked', () => {
    inRouter(<Two a="Elena Vargas" b="elena@northshoregroup.example" to="/admin/users/u_1042" />);
    expect(screen.getByRole('link', { name: 'Elena Vargas' })).toHaveAttribute('href', '/admin/users/u_1042');
    const { container } = render(<>{breakAt('a@b.example')}</>);
    expect(container.querySelector('wbr')).not.toBeNull();
    expect(container.textContent).toBe('a@b.example');
  });

  it('Facts, KV, Note and Timeline print label and value', () => {
    render(
      <>
        <Facts items={[{ label: 'Seats', value: '33 of 41' }]} />
        <KV rows={[{ label: 'Renews', value: 'Jan 8, 2027' }]} />
        <Note who="Imani Brooks" when="Dec 7, 3:40 PM" body="Sent the guide." />
        <Timeline items={[{ key: 'a', text: 'Invoice paid', when: 'Dec 8, 9:00 AM' }]} />
      </>,
    );
    expect(screen.getByText('Seats').nextSibling).toHaveTextContent('33 of 41');
    expect(screen.getByText('Renews').tagName).toBe('DT');
    expect(screen.getByText('· Dec 7, 3:40 PM')).toBeInTheDocument();
    expect(screen.getByText('Invoice paid')).toBeInTheDocument();
  });

  it('Tabs is a tablist with counts, and one select on a phone', () => {
    const onChange = vi.fn();
    const tabs = [
      { id: 'members', label: 'Members', count: 2 },
      { id: 'plan', label: 'Plan & entitlements' },
    ] as const;
    const { rerender } = render(<Tabs tabs={tabs} value="members" onChange={onChange} phone={false} label="Section" />);
    expect(screen.getByRole('tab', { name: /^Members/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Plan & entitlements' }));
    expect(onChange).toHaveBeenCalledWith('plan');
    rerender(<Tabs tabs={tabs} value="members" onChange={onChange} phone label="Section" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Section' }), { target: { value: 'plan' } });
    expect(onChange).toHaveBeenLastCalledWith('plan');
  });

  it('Find and Sel are named by their placeholder and label', () => {
    const onFind = vi.fn();
    render(
      <>
        <Find value="" onChange={onFind} placeholder="Filter workspace or owner" />
        <Sel aria-label="Plan" defaultValue="">
          <option value="">All plans</option>
        </Sel>
      </>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter workspace or owner' }), {
      target: { value: 'north' },
    });
    expect(onFind).toHaveBeenCalledWith('north');
    expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('');
  });
});

interface Row {
  id: string;
  name: string;
  n: number;
}
const ROWS: Row[] = [
  { id: 'a', name: 'Beta', n: 2 },
  { id: 'b', name: 'Alpha', n: 10 },
];
const COLS: Column<Row>[] = [
  { key: 'name', label: 'Name', width: 'minmax(120px,1fr)', value: (r) => r.name },
  { key: 'n', label: 'Count', width: '80px', num: true, value: (r) => r.n },
];

describe('Table', () => {
  it('is a table of rows; a header sorts; the first column links to the row; a row click opens it', () => {
    const onRow = vi.fn();
    inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        rowHref={(r) => `/x/${r.id}`}
        onRow={onRow}
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    const table = screen.getByRole('table', { name: 'Things' });
    const names = () =>
      within(table)
        .getAllByRole('link')
        .map((a) => a.textContent);
    expect(names()).toEqual(['Beta', 'Alpha']);
    fireEvent.click(within(table).getByRole('button', { name: /Name/ }));
    expect(names()).toEqual(['Alpha', 'Beta']);
    expect(within(table).getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(within(table).getByRole('button', { name: /Name/ }));
    expect(names()).toEqual(['Beta', 'Alpha']);
    fireEvent.click(within(table).getAllByRole('cell')[1]!);
    expect(onRow).toHaveBeenCalledWith(ROWS[0]);
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/x/b');
  });

  it('selects rows and offers the bulk bar, with Clear', () => {
    const bulk = vi.fn((keys: string[]) => <button type="button">Export {keys.length}</button>);
    inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        bulk={bulk}
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: 'Export 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it('puts a row’s actions in its “…” menu', () => {
    const open = vi.fn();
    inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={ROWS}
        rowKey={(r) => r.id}
        menu={() => [{ label: 'Open', onSelect: open }]}
        empty={{ icon: 'r2File', title: 'None' }}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'More actions' })[0]!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    expect(open).toHaveBeenCalledOnce();
  });

  it('says why it is empty: nothing yet, or no matches for the filters', () => {
    const { rerender } = inRouter(
      <Table
        label="Things"
        cols={COLS}
        rows={[]}
        rowKey={(r) => r.id}
        empty={{ icon: 'r2File', title: 'No workspaces yet', body: 'A workspace is created at checkout.' }}
      />,
    );
    expect(screen.getByText('No workspaces yet')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <Table
          label="Things"
          cols={COLS}
          rows={[]}
          rowKey={(r) => r.id}
          filtered
          empty={{ icon: 'r2File', title: 'No workspaces yet' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('No matches')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <Table
          label="Things"
          cols={COLS}
          rows={[]}
          rowKey={(r) => r.id}
          loading
          empty={{ icon: 'r2File', title: 'None' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('on a phone, is a card per row: the first column its title, then label and value, a 44px checkbox', () => {
    const was = window.innerWidth;
    window.innerWidth = 390;
    try {
      inRouter(
        <Table
          label="Things"
          cols={COLS}
          rows={ROWS}
          rowKey={(r) => r.id}
          bulk={() => null}
          empty={{ icon: 'r2File', title: 'None' }}
        />,
      );
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.getAllByText('Count')).toHaveLength(2);
      const real = screen.getAllByRole('checkbox', { name: 'Select row' });
      expect(real).toHaveLength(2);
      fireEvent.click(real[1]!);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    } finally {
      window.innerWidth = was;
    }
  });
});
