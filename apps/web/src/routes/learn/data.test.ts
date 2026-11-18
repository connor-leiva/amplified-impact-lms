// D-183: the course stays as fresh as the snapshot: refetched on the event stream's `changed`, and when a
// locked week's opening passes with the tab open.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { prelaunchState, PRELAUNCH_NOW } from './test/fixture';

const listeners = new Set<() => void>();
vi.mock('../../data/boot', () => ({
  repo: {
    subscribe: (f: () => void) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
  },
}));
const now = { t: PRELAUNCH_NOW };
vi.mock('../../lib/clock', () => ({ clock: { now: () => now.t } }));

import { nextOpening, useCourse } from './data';
import { Suspense } from 'react';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  listeners.clear();
});

const payload = prelaunchState().payload;

function harness() {
  const fetch = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetch);
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, createElement(Suspense, { fallback: null }, children));
  return { fetch, wrapper };
}

describe('the course’s freshness (D-183)', () => {
  it('finds the next locked week’s opening, or the course’s own before the preview @parity:C-5', () => {
    const first = payload.course.weeks.find((w) => 'locked' in w && w.locked)!;
    expect(nextOpening({ kind: 'ready', payload }, PRELAUNCH_NOW)).toBe((first as { opensAt: number }).opensAt);
    expect(nextOpening({ kind: 'upcoming', opensAt: PRELAUNCH_NOW + 1000 }, PRELAUNCH_NOW)).toBe(PRELAUNCH_NOW + 1000);
    expect(nextOpening({ kind: 'locked' }, PRELAUNCH_NOW)).toBeNull();
  });

  it('refetches the course when the event stream says something changed @parity:A-3 @parity:C-4', async () => {
    const { fetch, wrapper } = harness();
    const { result } = renderHook(() => useCourse(), { wrapper });
    await waitFor(() => expect(result.current?.kind).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => listeners.forEach((f) => f()));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('refetches the course when a locked week opens with the tab open @parity:C-5', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const at = nextOpening({ kind: 'ready', payload }, PRELAUNCH_NOW)!;
    now.t = at - 5000;
    const { fetch, wrapper } = harness();
    const { result } = renderHook(() => useCourse(), { wrapper });
    await waitFor(() => expect(result.current?.kind).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    now.t = PRELAUNCH_NOW;
  });
});
