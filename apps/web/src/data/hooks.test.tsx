// D-246 (H-7): `useMutate`, `useAct` and `useEmailLearner` catch a failed request (a 403, 409, 429, 500 or
// no network) and show the server's words as an error toast, answering `{ error, failed: true }` so a
// caller stops where it would stop for an inline error. A learner step page that shows its own failure
// asks for the old contract (`rethrow`). And the http repository's errors carry the server's words.
import { act as run, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ run: vi.fn(), act: vi.fn(), emailLearner: vi.fn(), subscribe: vi.fn(() => () => {}) }));
const toast = vi.hoisted(() => vi.fn());
const celebrate = vi.hoisted(() => vi.fn());
vi.mock('./boot', () => ({ repo }));
vi.mock('../components/primitives/Toaster', () => ({ useToaster: () => ({ toast }) }));
vi.mock('../shell/Confetti', () => ({ useConfetti: () => ({ celebrate }) }));

import { REQUEST_FAILED, failureMessage, refusal, useAct, useEmailLearner, useMutate } from './hooks';
import { HttpError, RateLimitedError, createHttpRepository } from './http';
import { PREVIEW_ONLY } from './preview';

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

beforeEach(() => {
  qc = new QueryClient();
  vi.spyOn(qc, 'invalidateQueries');
  toast.mockReset();
  celebrate.mockReset();
  repo.run.mockReset();
  repo.act.mockReset();
  repo.emailLearner.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const STALE = 'Someone changed this week since you opened it. Copy your changes, reload the page, and save again.';
const PUBLISH = 'Saving a published or scheduled week needs the “Publish modules” permission. Ask an Owner or Admin.';

describe('useAct catches a failed request @hooks', () => {
  it('a 403 is the server’s words as an error toast, and { error, failed }; nothing is refetched', async () => {
    repo.act.mockRejectedValue(new HttpError(403, PUBLISH));
    const { result } = renderHook(() => useAct(), { wrapper });
    let out: Awaited<ReturnType<ReturnType<typeof useAct>>> | undefined;
    await run(async () => {
      out = await result.current('saveBuilderModule', { draft: {} as never, base: 'x' });
    });
    expect(out).toEqual({ error: PUBLISH, failed: true });
    expect(toast).toHaveBeenCalledWith(PUBLISH, 'warn');
    expect(qc.invalidateQueries).not.toHaveBeenCalled();
  });

  it('a 409 likewise, so the builder keeps its draft and shows the message', async () => {
    repo.act.mockRejectedValue(new HttpError(409, STALE));
    const { result } = renderHook(() => useAct(), { wrapper });
    const out = await result.current('saveBuilderModule', { draft: {} as never, base: 'x' });
    expect(out).toEqual({ error: STALE, failed: true });
    expect(toast).toHaveBeenCalledWith(STALE, 'warn');
  });

  it('a 500 with no words and a network failure say the plain fallback', async () => {
    const { result } = renderHook(() => useAct(), { wrapper });
    repo.act.mockRejectedValueOnce(new HttpError(500, null));
    expect(await result.current('duplicateModule', { id: 'sales' })).toEqual({ error: REQUEST_FAILED, failed: true });
    repo.act.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await result.current('duplicateModule', { id: 'sales' })).toEqual({ error: REQUEST_FAILED, failed: true });
    expect(toast.mock.calls).toEqual([
      ['Something went wrong. Try again.', 'warn'],
      ['Something went wrong. Try again.', 'warn'],
    ]);
  });

  it('a 429 says the limiter’s words', async () => {
    repo.act.mockRejectedValue(new RateLimitedError('Rate limit exceeded, retry in 1 minute', 60_000));
    const { result } = renderHook(() => useAct(), { wrapper });
    expect(await result.current('duplicateModule', { id: 'sales' })).toMatchObject({ failed: true });
    expect(toast).toHaveBeenCalledWith('Rate limit exceeded, retry in 1 minute', 'warn');
  });

  it('a 401 on its way to sign in says nothing', async () => {
    repo.act.mockRejectedValue(new HttpError(401, 'Not signed in', true));
    const { result } = renderHook(() => useAct(), { wrapper });
    expect(await result.current('duplicateModule', { id: 'sales' })).toMatchObject({ failed: true });
    expect(toast).not.toHaveBeenCalled();
  });

  it('an inline refusal and a success behave as before', async () => {
    const { result } = renderHook(() => useAct(), { wrapper });
    repo.act.mockResolvedValueOnce({ error: 'Add a title.' });
    expect(await result.current('saveAnnouncementDraft', {} as never)).toEqual({ error: 'Add a title.' });
    expect(toast).not.toHaveBeenCalled();
    repo.act.mockResolvedValueOnce({ toast: { msg: 'Saved', tone: 'success' }, saved: { id: 'm', version: 'v2', stepIds: ['c1'] } });
    expect(await result.current('saveBuilderModule', {} as never)).toEqual({ toast: { msg: 'Saved', tone: 'success' }, saved: { id: 'm', version: 'v2', stepIds: ['c1'] } });
    expect(toast).toHaveBeenCalledWith('Saved', 'success');
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(1);
    repo.act.mockResolvedValueOnce({ error: PREVIEW_ONLY });
    await result.current('duplicateModule', { id: 'sales' });
    expect(toast).toHaveBeenLastCalledWith(PREVIEW_ONLY, 'info');
  });
});

describe('useMutate catches a failed request too @hooks', () => {
  it('a failure is an error toast and { error, failed }; a success toasts, celebrates and refetches', async () => {
    const { result } = renderHook(() => useMutate(), { wrapper });
    repo.run.mockRejectedValueOnce(new HttpError(403, 'You don’t have permission to do that.'));
    expect(await result.current('sendAnnouncement', {} as never)).toEqual({ error: 'You don’t have permission to do that.', failed: true });
    expect(toast).toHaveBeenCalledWith('You don’t have permission to do that.', 'warn');
    repo.run.mockResolvedValueOnce({ toast: { msg: 'Done', tone: 'success' }, effects: [{ type: 'confetti' }] });
    await result.current('toggleStep', {} as never);
    expect(toast).toHaveBeenLastCalledWith('Done', 'success');
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('with rethrow, a failure comes back to the caller, untoasted (the step page shows its own)', async () => {
    const { result } = renderHook(() => useMutate({ rethrow: true }), { wrapper });
    repo.run.mockRejectedValueOnce(new HttpError(500, null));
    await expect(result.current('toggleChecklistItem', {} as never)).rejects.toBeInstanceOf(HttpError);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('useEmailLearner shows the server’s toast @hooks', () => {
  it('sent, not set up, or a refusal', async () => {
    const { result } = renderHook(() => useEmailLearner(), { wrapper });
    repo.emailLearner.mockResolvedValueOnce({ toast: { msg: 'Nudge sent to Ana', tone: 'success' } });
    await result.current('nudge', 'u_ana');
    expect(repo.emailLearner).toHaveBeenCalledWith('nudge', 'u_ana');
    expect(toast).toHaveBeenLastCalledWith('Nudge sent to Ana', 'success');
    repo.emailLearner.mockResolvedValueOnce({ toast: { msg: 'Email isn’t set up on this server, so nothing was sent.', tone: 'warn' } });
    await result.current('invite', 'u_ben');
    expect(toast).toHaveBeenLastCalledWith('Email isn’t set up on this server, so nothing was sent.', 'warn');
    repo.emailLearner.mockRejectedValueOnce(new HttpError(429, 'Too many requests. Try again later.'));
    expect(await result.current('invite', 'u_ben')).toMatchObject({ failed: true });
    expect(toast).toHaveBeenLastCalledWith('Too many requests. Try again later.', 'warn');
  });
});

describe('the helpers @hooks', () => {
  it('refusal: a caller says an inline error, not one the hook already toasted', () => {
    expect(refusal({ error: 'Add a title.' })).toBe('Add a title.');
    expect(refusal({ error: 'x', failed: true })).toBeUndefined();
    expect(refusal({})).toBeUndefined();
  });

  it('failureMessage', () => {
    expect(failureMessage(new HttpError(409, STALE))).toBe(STALE);
    expect(failureMessage(new HttpError(502, null))).toBe(REQUEST_FAILED);
    expect(failureMessage(new HttpError(409, 'ended', true))).toBeNull();
    expect(failureMessage(new Error('boom'))).toBe(REQUEST_FAILED);
  });

  it('the http repository throws an HttpError with the server’s words, and sends Resend Invite and Send Nudge', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url.includes('saveBuilderModule')
        ? new Response(JSON.stringify({ error: STALE }), { status: 409, headers: { 'content-type': 'application/json' } })
        : url.includes('/api/learners/')
          ? new Response(JSON.stringify({ toast: { msg: 'Invite resent to b@example.test', tone: 'success' } }), { status: 200 })
          : new Response('oops', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const http = createHttpRepository();
    const err = await http.act('saveBuilderModule', { draft: {} as never, base: 'v1' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 409, serverMessage: STALE, message: STALE });
    const bare = await http.act('duplicateModule', { id: 'sales' }).catch((e: unknown) => e);
    expect(bare).toMatchObject({ status: 500, serverMessage: null, message: 'HTTP 500' });
    expect(await http.emailLearner('invite', 'u/b')).toEqual({ toast: { msg: 'Invite resent to b@example.test', tone: 'success' } });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('/api/learners/u%2Fb/resend-invite');
    await http.emailLearner('nudge', 'u_a');
    expect(fetchMock.mock.calls.at(-1)![0]).toBe('/api/learners/u_a/nudge');
    expect((fetchMock.mock.calls.at(-1)![1] as RequestInit).method).toBe('POST');
  });
});
