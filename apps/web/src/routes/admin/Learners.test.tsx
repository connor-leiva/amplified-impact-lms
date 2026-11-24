// D-243: Learners & Teams with people outside the course. Learners and Teams are the cohort's; each access group with
// people outside the course has a tab of its own, named and counted from the data, whose rows open the User page.
// Without `db.outside` (the fixture) the tabs are the mockup's two.
import { MemoryRouter, Route, Routes } from 'react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ZERO_BASE, seed } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { ToasterProvider } from '../../components/primitives/Toaster';

const NOW = Date.parse('2026-12-10T16:30:00.000Z');
const state: { db: Db } = { db: seed('live') };
vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useMutate: () => vi.fn(async () => ({})),
  useNow: () => NOW,
}));
vi.mock('../console/useMasqueradeEntry', () => ({
  useMasqueradeEntry: () => ({ state: null, open: () => undefined, item: () => [], dialog: null }),
}));
const { default: Learners } = await import('./Learners');

/** The production shape, with a Utah Life agent made as provisioning makes one: a team of one, no name. */
function withUtahLife(outside: boolean): Db {
  const db: Db = { ...seed('live'), base: { ...ZERO_BASE } };
  const jane: Learner = {
    ...db.users.find((u) => u.id === 'u_jamie')!,
    id: 'u_ul',
    name: '',
    email: 'jane@liveutah.com',
    teamId: 't_ul',
    role: 'Team Owner',
    status: 'active',
    progress: {},
  };
  return {
    ...db,
    users: [...db.users, jane],
    teams: [...db.teams, { ...db.teams[0]!, id: 't_ul', name: '', ownerId: 'u_ul', seats: 1 }],
    ...(outside ? { outside: { ids: ['u_ul'], groups: [{ id: 'utah-life', name: 'Utah Life', ids: ['u_ul'] }] } } : {}),
  };
}

const show = (db: Db) => {
  state.db = db;
  render(
    <ToasterProvider>
      <MemoryRouter initialEntries={['/admin/learners']}>
        <Routes>
          <Route path="/admin/learners" element={<Learners />} />
          <Route path="/admin/users/:id" element={<p>User page</p>} />
        </Routes>
      </MemoryRouter>
    </ToasterProvider>,
  );
};
const tabs = () => screen.getAllByRole('tab').map((t) => t.textContent);

describe('Learners & Teams with people outside the course (D-243)', () => {
  it('without `db.outside`, has the mockup’s two tabs, and the agent is a learner like any other', () => {
    const db = withUtahLife(false);
    show(db);
    expect(tabs()).toEqual([`Learners${db.users.filter((u) => u.test !== true).length}`, `Teams${db.teams.length}`]);
  });

  it('gives Utah Life its own tab, counted from the data, out of Learners and Teams', () => {
    const db = withUtahLife(true);
    show(db);
    expect(tabs()).toEqual([`Learners${db.users.length - 1}`, `Teams${db.teams.length - 1}`, 'Utah Life1']);
    expect(screen.queryByText('jane@liveutah.com')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Utah Life/ }));
    expect(screen.getByRole('tab', { name: /Utah Life/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByText('jane@liveutah.com'));
    expect(screen.getByText('User page')).toBeTruthy();
  });
});
