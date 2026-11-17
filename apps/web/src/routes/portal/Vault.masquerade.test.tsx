import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import type { MasqueradeView } from '@ai/core';
import { resetMasquerade } from '../../data/masquerade';

// D-162 3b: during a masquerade the Vault's download goes straight to the file. Its count is a write
// (`POST /api/mutate/downloadResource`), which the server refuses then; outside a session it runs
// first, exactly as before.

const mutate = vi.fn(async (_name: string, _args?: unknown) => ({}));
const saved = vi.fn((_ref?: unknown) => true);
vi.mock('../../data/hooks', () => ({
  useDb: () => seed('live'),
  useViewer: () => ({ actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' }),
  useNow: () => phaseNow('live'),
  useMutate: () => mutate,
}));
vi.mock('../../data/files', () => ({ saveStoredFile: (ref: unknown) => saved(ref) }));
const { default: Vault } = await import('./Vault');

const session: MasqueradeView = {
  id: 'mq_1',
  target: { id: 'u_jamie', name: 'Jamie Rivera', teamName: null },
  staff: { id: 'st1', name: 'Casey Lin' },
  reason: 'Customer cannot download the checklist.',
  startedAt: 0,
  expiresAt: 900_000,
  hardExpiresAt: 3_600_000,
  extendCount: 0,
  canExtend: true,
  startedFrom: null,
};

const firstDownload = () => {
  render(
    <MemoryRouter initialEntries={['/vault']}>
      <Vault />
    </MemoryRouter>,
  );
  const button = screen.getAllByRole('button', { name: /Download/ })[0]!;
  fireEvent.click(button);
};

afterEach(() => {
  resetMasquerade();
  mutate.mockClear();
  saved.mockClear();
});

describe('the Vault’s download during a masquerade (D-162 3b)', () => {
  it('outside a session: counts it first, then the file, as before', async () => {
    resetMasquerade({ status: 'none' });
    firstDownload();
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toBe('downloadResource');
  });

  it('during one: straight to the file, nothing counted', async () => {
    resetMasquerade({ status: 'active', session, skew: 0 });
    firstDownload();
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    expect(mutate).not.toHaveBeenCalled();
  });
});
