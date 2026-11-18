import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { phaseNow, seed } from '@ai/core';
import { TeamPlanProvider } from '../learn/teamPlanContext';

// D-187: drawn inside the learner portal's shell (D-182), a Team-only vault item's Upgrade and the executive
// tab's request open the Team Plan window, whose one button sends `requestUpgrade`. In the first portal's
// shell nothing provides the window, and both send the request straight away, exactly as before.

const mutate = vi.fn(async (_name: string, _args?: unknown) => ({}));
vi.mock('../../data/hooks', () => ({
  useDb: () => seed('live'),
  useViewer: () => ({ actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' }),
  useNow: () => phaseNow('live'),
  useMutate: () => mutate,
}));
const { default: Vault } = await import('./Vault');

const teamOnly = seed('live').resources.find((r) => r.status === 'published' && r.tier === 'team' && !r.exec)!;

function draw(open?: (x: unknown) => void, path = '/vault') {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <Vault />
    </MemoryRouter>
  );
  render(open ? <TeamPlanProvider value={open}>{tree}</TeamPlanProvider> : tree);
}

afterEach(() => mutate.mockClear());

describe('the Vault’s Upgrade and the Team Plan window (D-187)', () => {
  it('inside the learner shell: Upgrade opens the window about that item, and sends nothing itself @parity:SH-8 @parity:A-7', async () => {
    const open = vi.fn();
    draw(open);
    fireEvent.click(screen.getAllByRole('button', { name: /Upgrade/ })[0]!);
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0]![0]).toMatchObject({ kind: 'resource' });
    expect(teamOnly).toBeDefined();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('in the first portal’s shell: Upgrade sends the request straight away, as before', async () => {
    draw();
    fireEvent.click(screen.getAllByRole('button', { name: /Upgrade/ })[0]!);
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]![0]).toBe('requestUpgrade');
    expect(String((mutate.mock.calls[0]![1] as { source: string }).source)).toMatch(/^Resource Vault · /);
  });

  it('the executive tab’s request opens the window inside the learner shell', async () => {
    const open = vi.fn();
    draw(open, '/vault?tab=executive');
    fireEvent.click(screen.getByRole('button', { name: /Book Upgrade Consultation/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith({ kind: 'plan' }));
    expect(mutate).not.toHaveBeenCalled();
  });
});
