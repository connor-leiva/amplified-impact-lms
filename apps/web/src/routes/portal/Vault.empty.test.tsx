import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';

// D-150: a Resource Vault with nothing published says "Nothing here yet", not an empty list and filters.

const state: { db: Db } = { db: seed('live') };
vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => ({ actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' }),
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));
const { default: Vault } = await import('./Vault');

const renderVault = (db: Db) => {
  state.db = db;
  return render(
    <MemoryRouter initialEntries={['/vault']}>
      <Vault />
    </MemoryRouter>,
  );
};

describe('the Resource Vault with nothing published (D-150)', () => {
  it('says "Nothing here yet" under its heading, with no search, tabs or filters', () => {
    renderVault({ ...seed('live'), resources: [] });
    expect(screen.getByRole('heading', { level: 1, name: 'Resource & Compliance Vault' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here yet');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/No resources match/)).toBeNull();
  });

  it('is the list as before when anything is published', () => {
    renderVault(seed('live'));
    expect(screen.queryByText('Nothing here yet')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Search templates, scripts, workflows' })).toBeVisible();
  });
});
