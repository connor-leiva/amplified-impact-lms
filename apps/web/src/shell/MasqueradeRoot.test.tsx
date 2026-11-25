import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { MasqueradeView } from '@ai/core';
import { masqueradeBlocked, navigation } from '../data/http';
import { masquerade, resetMasquerade } from '../data/masquerade';
import type { MasqueradeClient } from '../data/masquerade';
import { MasqueradeRoot } from './MasqueradeRoot';

// D-162 3b, spec § 6: the router's root. Without a session it draws the page and nothing else; with
// one, the banner above every page, the paused Console on every /admin address (ahead of the learner
// shell's bounce), Extend's reason dialog and the blocked dialog.

const NOW = Date.parse('2026-12-10T16:30:00Z');
const session: MasqueradeView = {
  id: 'mq_1',
  target: { id: 'u_1042', name: 'Elena Vargas', teamName: 'Northshore Group' },
  staff: { id: 'st1', name: 'Connor Leiva' },
  reason: 'Customer reports Week 2 steps are out of order.',
  startedAt: NOW,
  expiresAt: NOW + 900_000,
  hardExpiresAt: NOW + 3_600_000,
  extendCount: 0,
  canExtend: true,
  startedFrom: '/admin/users/u_1042',
};

const client = (s: MasqueradeView | null, over: Partial<MasqueradeClient> = {}): MasqueradeClient => ({
  current: async () => ({ session: s, serverNow: NOW }),
  start: async () => ({ redirect: '/' }),
  extend: async () => ({ session: { ...session, expiresAt: NOW + 1_800_000, extendCount: 1 }, serverNow: NOW }),
  exit: async () => ({ redirect: '/admin/users/u_1042' }),
  ...over,
});

const page = (path: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            element: <MasqueradeRoot />,
            children: [
              { path: '/', element: <p>The learner portal</p> },
              { path: '/course', element: <p>The course</p> },
              { path: '/admin/*', element: <p>A Console page</p> },
            ],
          },
        ],
        { initialEntries: [path] },
      )}
    />,
  );

const assign = vi.fn();
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.spyOn(navigation, 'assign').mockImplementation(assign);
});
afterEach(() => {
  vi.restoreAllMocks();
  assign.mockReset();
  resetMasquerade();
});

describe('the router’s root without a session (D-162 3b)', () => {
  it('draws the page alone: no banner, no region, nothing added', async () => {
    resetMasquerade({ status: 'unknown' }, client(null));
    const { container } = page('/');
    await waitFor(() => expect(masquerade.get().status).toBe('none'));
    expect(container.innerHTML).toBe('<p>The learner portal</p>');
  });

  it('on a Console address waits for the answer, then draws the Console', async () => {
    let answer: ((v: { session: null; serverNow: number }) => void) | null = null;
    resetMasquerade({ status: 'unknown' }, client(null, { current: () => new Promise((r) => (answer = r)) }));
    const { container } = page('/admin/workspaces');
    await waitFor(() => expect(answer).not.toBeNull());
    expect(container.innerHTML).toBe('');
    await act(async () => answer!({ session: null, serverNow: NOW }));
    expect(container.innerHTML).toBe('<p>A Console page</p>');
  });
});

describe('the router’s root during a session', () => {
  it('puts the banner above a learner page and a page outside the shell', async () => {
    for (const path of ['/', '/course']) {
      resetMasquerade({ status: 'unknown' }, client(session));
      const view = page(path);
      const banner = await screen.findByRole('region', { name: 'Masquerade session' });
      expect(banner).toHaveTextContent('Masquerading as Elena Vargas · Northshore Group');
      expect(banner).toHaveTextContent('Reason: Customer reports Week 2 steps are out of order. All writes are blocked.');
      expect(within(banner).getByRole('timer', { name: 'Time remaining' })).toHaveTextContent('15:00 left');
      expect(within(banner).getByRole('button', { name: 'Extend 15 min' })).toBeEnabled();
      expect(within(banner).getByRole('button', { name: 'Exit masquerade' })).toBeEnabled();
      expect(screen.getByText(path === '/' ? 'The learner portal' : 'The course')).toBeInTheDocument();
      view.unmount();
    }
  });

  it('pauses every Console address: no Console page, Extend and Exit instead', async () => {
    resetMasquerade({ status: 'unknown' }, client(session));
    page('/admin/workspaces/ws_northshore');
    expect(await screen.findByRole('heading', { level: 1, name: 'Console is paused while you masquerade' })).toBeVisible();
    expect(screen.queryByText('A Console page')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Admin/People/Teams');
    expect(screen.getByRole('main')).toHaveTextContent('Elena Vargas · Northshore Group');
    expect(screen.getByRole('main')).toHaveTextContent('15 of 60 minutes');
    expect(within(screen.getByRole('main')).getByRole('button', { name: 'Exit masquerade' })).toBeEnabled();
  });

  it('Extend asks for a new reason of 10 characters; Escape does not dismiss it, Cancel does', async () => {
    const extend = vi.fn(client(session).extend);
    resetMasquerade({ status: 'unknown' }, client(session, { extend }));
    page('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Extend 15 min' }));
    const dialog = screen.getByRole('dialog', { name: 'Extend masquerade by 15 minutes' });
    const go = within(dialog).getByRole('button', { name: 'Extend 15 minutes' });
    expect(go).toBeDisabled();
    expect(dialog).toHaveTextContent('Required. Saved to the audit log with your name.');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'New reason' }), { target: { value: 'too short' } });
    expect(go).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'New reason' }), { target: { value: 'Still checking the replay' } });
    expect(dialog).toHaveTextContent('Saved to the audit log with your name.');
    fireEvent.click(go);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(extend).toHaveBeenCalledWith('Still checking the replay');
    expect(screen.getByRole('timer')).toHaveTextContent('30:00 left');
  });

  it('shows an API refusal inside the dialog', async () => {
    const extend = async () => Promise.reject(new Error('This session can’t go past 60 minutes.'));
    resetMasquerade({ status: 'unknown' }, client(session, { extend }));
    page('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Extend 15 min' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New reason' }), { target: { value: 'Still checking the replay' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend 15 minutes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This session can’t go past 60 minutes.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a refused write opens the blocked dialog, naming the attempt; Exit goes back', async () => {
    resetMasquerade({ status: 'unknown' }, client(session));
    page('/');
    await screen.findByRole('region', { name: 'Masquerade session' });
    act(() => masqueradeBlocked('POST /api/mutate/toggleStep'));
    const dialog = await screen.findByRole('dialog', { name: 'Blocked while masquerading' });
    expect(dialog).toHaveTextContent('POST /api/mutate/toggleStep');
    expect(dialog).toHaveTextContent(
      'You are signed in as Elena Vargas. Every write is blocked until you exit: edits, publishes, refunds, exports, retries, and notes.',
    );
    expect(dialog).toHaveTextContent('This attempt was added to the audit log.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Exit masquerade' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/admin/users/u_1042'));
  });

  it('at the cap Extend reads "Max 60 min", disabled with the reason', async () => {
    resetMasquerade({ status: 'unknown' }, client({ ...session, expiresAt: session.hardExpiresAt, canExtend: false }));
    page('/');
    const max = await screen.findByRole('button', { name: 'Max 60 min' });
    expect(max).toBeDisabled();
    expect(max).toHaveAttribute('title', '60-minute maximum reached');
  });
});
