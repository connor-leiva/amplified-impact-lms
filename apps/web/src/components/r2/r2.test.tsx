import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Button, ButtonLink, buttonClass } from './Button';
import { Box, Card } from './Card';
import { Empty, EmptyActions } from './Empty';
import { Menu } from './Menu';
import { Page } from './Page';
import { Status } from './Status';

// D-160 R2-1b: the R2 primitives the shell, the 404 and Denied are built from, drawn as the mockup
// draws them (`Btn`, `Card`, `Empty`, `Menu`, `St`, `.pg`). Their pixels are proved by
// `pnpm parity:admin-r2`; these hold their markup and behaviour.

describe('Button', () => {
  it('is a real button, secondary by default, with the mockup’s variants', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Search the admin</Button>
        <Button kind="primary" icon="r2Plus" header>
          New AI Employee
        </Button>
        <Button kind="quiet">Clear</Button>
        <Button disabled>Off</Button>
      </>,
    );
    const plain = screen.getByRole('button', { name: 'Search the admin' });
    expect(plain).toHaveAttribute('type', 'button');
    fireEvent.click(plain);
    expect(onClick).toHaveBeenCalledOnce();
    const primary = screen.getByRole('button', { name: 'New AI Employee' });
    expect(primary.querySelector('svg')).not.toBeNull();
    expect(primary.className).not.toBe(plain.className);
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled();
    expect(buttonClass({ kind: 'primary-danger' })).toBe(buttonClass({ kind: 'primary-danger' }));
    expect(buttonClass({})).not.toBe(buttonClass({ kind: 'quiet' }));
  });

  it('ButtonLink is a link that looks like a button', () => {
    render(
      <MemoryRouter>
        <ButtonLink kind="primary" to="/admin">
          Go to Overview
        </ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Go to Overview' });
    expect(link).toHaveAttribute('href', '/admin');
    expect(link.className).toBe(buttonClass({ kind: 'primary' }));
  });
});

describe('Card and Box', () => {
  it('a titled card is a section with an h2 and an optional sub line', () => {
    render(
      <Card title="Live activity" sub="Cumulative, all learners" right={<span>190 total</span>}>
        <p>body</p>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Live activity' })).toBeInTheDocument();
    expect(screen.getByText('Cumulative, all learners')).toBeInTheDocument();
    expect(screen.getByText('190 total')).toBeInTheDocument();
    expect(screen.getByText('body').closest('section')).not.toBeNull();
  });

  it('an untitled card has no header; a Box is a plain card', () => {
    const { container } = render(
      <>
        <Card pad={false}>
          <p>edge to edge</p>
        </Card>
        <Box>
          <p>boxed</p>
        </Box>
      </>,
    );
    expect(container.querySelectorAll('h2')).toHaveLength(0);
    expect(screen.getByText('edge to edge').parentElement!.tagName).toBe('SECTION');
    expect(screen.getByText('boxed').parentElement!.tagName).toBe('DIV');
  });
});

describe('Empty', () => {
  it('draws its icon, title and body, and the title can be the page’s h1', () => {
    render(
      <Empty
        icon="r2Search"
        heading="h1"
        title="This page doesn't exist"
        body="The link may be old, or the record was removed. Error 404."
      >
        <span>extra</span>
      </Empty>,
    );
    expect(screen.getByRole('heading', { level: 1, name: "This page doesn't exist" })).toBeInTheDocument();
    expect(screen.getByText('The link may be old, or the record was removed. Error 404.').tagName).toBe('P');
    expect(screen.getByText('extra')).toBeInTheDocument();
  });

  it('is a span title by default, and an error is an alert', () => {
    render(<Empty title="This didn't load" tone="bad" role="alert" />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent("This didn't load");
  });

  it('EmptyActions holds the way out', () => {
    render(
      <EmptyActions>
        <button type="button">Go</button>
      </EmptyActions>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});

describe('Menu', () => {
  const setup = (onPick = vi.fn()) => {
    render(
      <Menu
        label="Cohorts"
        items={[
          { label: 'December 2026 Cohort', checked: true, onSelect: () => onPick('dec') },
          'separator',
          { label: 'All cohorts', icon: 'r2Cohorts', onSelect: () => onPick('all') },
          { label: 'Locked', locked: true, onSelect: () => onPick('locked') },
        ]}
        trigger={(t) => (
          <button type="button" onClick={t.toggle} {...t.props}>
            Switch
          </button>
        )}
      />,
    );
    return { trigger: screen.getByRole('button', { name: 'Switch' }), onPick };
  };

  it('opens a labelled menu of items, checks the current one, locks one the viewer can’t use', () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Cohorts' });
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['December 2026 Cohort', 'All cohorts', 'Locked']);
    expect(items[0]!.querySelector('svg')).not.toBeNull();
    expect(items[2]).toBeDisabled();
    expect(menu.querySelector('hr')).not.toBeNull();
  });

  it('a choice runs and closes the menu', () => {
    const { trigger, onPick } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'All cohorts' }));
    expect(onPick).toHaveBeenCalledWith('all');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens from the keyboard on its first item, moves with the arrows, and Escape returns to the trigger', () => {
    const { trigger } = setup();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    // The locked item is skipped: from the last enabled one, down wraps to the first.
    fireEvent.keyDown(items[1]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0]!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('Status and Page', () => {
  it('a status is a dot paired with its label, never colour alone', () => {
    const { container } = render(<Status tone="ok">Production</Status>);
    expect(screen.getByText('Production')).toBeInTheDocument();
    const dot = container.querySelector('i')!;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    const off = render(<Status tone="off">Draft</Status>).container.firstElementChild!;
    expect(off.className).not.toBe(container.firstElementChild!.className);
  });

  it('a page is one column', () => {
    render(
      <Page>
        <p>one</p>
        <p>two</p>
      </Page>,
    );
    expect(screen.getByText('one').parentElement).toBe(screen.getByText('two').parentElement);
  });
});
