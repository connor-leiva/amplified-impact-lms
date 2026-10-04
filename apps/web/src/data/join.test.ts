import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, screen } from '@testing-library/react';
import { ToasterProvider } from '../components/primitives/Toaster';
import { createFixtureRepository } from './fixture';

// Phase 08 § 8.4, the browser half of the join window. `GET /api/sessions/:id/join` is deferred to
// the sprint that builds the Fastify app, so this is the client measured against a stubbed
// repository: the request it makes, what it does with a 200, and what the viewer is told on a 409.
//
// The repository is mocked rather than re-imported with a fresh module registry (the trick
// `boot.test.ts` uses) because this is a hook: a second copy of React, or a second copy of the
// Toaster's context object, and the provider below would no longer be the one the hook reads.

const { fakeRepo } = vi.hoisted(() => ({
  fakeRepo: {
    source: 'http' as 'http' | 'fixture',
    joinTicket: vi.fn(),
  },
}));
vi.mock('./boot', () => ({ repo: fakeRepo }));

const { JOIN_SHUT, useJoin } = await import('./join');

let opened: ReturnType<typeof vi.fn>;

const run = async (sessionId: string, simulated: () => void) => {
  const { result } = renderHook(() => useJoin(), { wrapper: ToasterProvider });
  await act(async () => {
    await result.current(sessionId, simulated);
  });
};

beforeEach(() => {
  fakeRepo.source = 'http';
  fakeRepo.joinTicket.mockReset();
  opened = vi.fn();
  vi.stubGlobal('open', opened);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('join · http mode @g8', () => {
  it('asks the server for the session, then opens the URL it gets', async () => {
    fakeRepo.joinTicket.mockResolvedValue({ kind: 'open', url: 'https://zoom.us/j/8841200610' });
    const simulated = vi.fn();

    await run('dec26-s3', simulated);

    expect(fakeRepo.joinTicket).toHaveBeenCalledWith('dec26-s3');
    // `noopener` is the whole reason this is a single call site: without it the Zoom tab holds a
    // live handle on the portal and can navigate it anywhere.
    expect(opened).toHaveBeenCalledWith('https://zoom.us/j/8841200610', '_blank', 'noopener');
    // The prototype's toast must NOT also fire — it carries the Zoom URL in its text, which in
    // http mode is exactly what the server is withholding.
    expect(simulated).not.toHaveBeenCalled();
  });

  it('tells the viewer the window is shut, in copy the app already has', async () => {
    // § 8.4 answers `409 { error: 'Join opens 15 min before' }`. The sentence shown is the app's
    // own — `EmployeeDetail.vm.ts` renders the identical string as `v.noneNote` under the replay
    // poster — not the server's body, so a reworded route cannot reword the product.
    fakeRepo.joinTicket.mockResolvedValue({ kind: 'shut' });

    await run('dec26-s3', vi.fn());

    expect(screen.getByText('Join opens 15 min before')).toBeVisible();
    expect(JOIN_SHUT).toBe('Join opens 15 min before');
    expect(opened).not.toHaveBeenCalled();
  });

  it('never opens a tab when the server gives no URL', async () => {
    fakeRepo.joinTicket.mockRejectedValue(new Error('Only a Team-tier learner can join.'));

    await run('dec26-s4', vi.fn());

    // A 403 or a dead network. There is nowhere to render an inline error on a button, and the one
    // outcome that is not acceptable is a control that does nothing at all.
    expect(screen.getByText('Join opens 15 min before')).toBeVisible();
    expect(opened).not.toHaveBeenCalled();
  });
});

describe('join · fixture mode keeps the prototype @g8', () => {
  it('runs the screen’s own behaviour and never touches window.open', async () => {
    // The `Opening Zoom · …` toast is what the reference does and what the e2e suite measures.
    fakeRepo.joinTicket.mockResolvedValue({ kind: 'simulated' });
    const simulated = vi.fn();

    await run('dec26-s3', simulated);

    expect(simulated).toHaveBeenCalledTimes(1);
    expect(opened).not.toHaveBeenCalled();
  });

  it('is what the fixture repository actually answers', async () => {
    // Pinned against the real fixture repository, not the stub above: if this ever returned a
    // ticket, every Join click in the compliance suite would open a tab instead of toasting.
    const repo = createFixtureRepository('agent', 'live');

    await expect(repo.joinTicket('dec26-s3')).resolves.toEqual({ kind: 'simulated' });
  });
});
