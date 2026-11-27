import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AdminChromeProvider } from '../../shell/admin/chrome';
import { Denied, NotFound } from './Denied';

// D-160 R2-1b: Denied and the Console 404 on R2, in the mockup's words.

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('the Console 404 and Denied on R2 (D-160 R2-1b)', () => {
  it('the 404: its h1, its sentence, Go to Overview, and Search the admin, which opens the palette (R2-1c)', () => {
    const openPalette = vi.fn();
    inRouter(
      <AdminChromeProvider
        value={{
          openPalette,
          setRecord: () => {},
          toast: () => {},
          role: 'Owner',
          counts: { drafts: 0, requests: 0, incidents: 0, waiting: 0, failed: 0 },
          cohort: { id: 'dec26', label: 'December 2026 Cohort', choices: [], pick: () => {}, create: null },
        }}
      >
        <NotFound />
      </AdminChromeProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("This page doesn't exist");
    expect(screen.getByText('The link may be old, or the record was removed. Error 404.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Overview' })).toHaveAttribute('href', '/admin');
    const search = screen.getByRole('button', { name: 'Search the admin' });
    expect(search).not.toHaveAttribute('aria-disabled');
    fireEvent.click(search);
    expect(openPalette).toHaveBeenCalledOnce();
  });

  it('Denied names the page and the role, and goes to the Overview', () => {
    inRouter(<Denied what="Roles & Permissions" role="Support" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Your role can't open Roles & Permissions");
    expect(
      screen.getByText('You are signed in as Support. An Owner can change this in Roles & Permissions.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Overview' })).toHaveAttribute('href', '/admin');
  });

  it('the mockup’s own Denied page names no page', () => {
    inRouter(<Denied what={null} role="Owner" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Your role can't open this page");
    expect(
      screen.getByText('You are signed in as Owner. An Owner can change this in Roles & Permissions.'),
    ).toBeInTheDocument();
  });
});
