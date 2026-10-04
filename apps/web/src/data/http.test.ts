import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createHttpRepository, navigation } from './http';

// Phase 07 § 7.6. The API does not exist yet, which is exactly why this suite matters: it is the
// contract the endpoints have to satisfy, written down before they are built. Every assertion here
// is a requirement on the server — the URL, the credentials, the status codes and which of them is
// a form error rather than a failure.
//
// The 422 case is the one worth stating twice. A mutation that core refuses returns a message the
// form renders inline, so it must RESOLVE with `{ error }`. In fixture mode the same refusal comes
// back the same way, and the screens cannot tell the two sources apart — that is the whole point of
// the repository seam.

let fetchMock: Mock;

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
/** A proxy error page, a truncated response: not JSON at all. */
const notJson = (status: number) =>
  ({ ok: false, status, json: async () => Promise.reject(new SyntaxError('Unexpected token')) }) as unknown as Response;

// --- EventSource double -----------------------------------------------------

/** When set, `new EventSource()` throws it — a CSP block, or a runtime without the constructor. */
let streamThrows: Error | null = null;
let streams: FakeEventSource[] = [];

class FakeEventSource {
  private readonly listeners = new Map<string, Set<() => void>>();
  closed = false;

  constructor(readonly url: string) {
    if (streamThrows) throw streamThrows;
    streams.push(this);
  }

  addEventListener(type: string, fn: () => void) {
    const set = this.listeners.get(type) ?? new Set<() => void>();
    set.add(fn);
    this.listeners.set(type, set);
  }

  /** Stands in for the server broadcasting after a commit. */
  emit(type: string) {
    this.listeners.get(type)?.forEach((f) => f());
  }

  close() {
    this.closed = true;
  }
}

const live = () => streams.filter((s) => !s.closed);

beforeEach(() => {
  streams = [];
  streamThrows = null;
  fetchMock = vi.fn(async () => json(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The one call shape every request shares: same-origin cookies, or the session is invisible. */
const optionsOf = (call: number) => fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;

describe('HttpRepository @g7', () => {
  it('identifies itself as the http source', () => {
    expect(createHttpRepository().source).toBe('http');
  });

  it('reads the viewer out of /api/me', async () => {
    const viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
    fetchMock.mockImplementation(async () => json(200, { viewer, prefs: { tz: 'America/Chicago' } }));

    await expect(createHttpRepository().viewer()).resolves.toEqual(viewer);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/me');
    expect(optionsOf(0)?.credentials).toBe('include');
  });

  it('reads the scoped snapshot out of /api/snapshot', async () => {
    // Whatever § 7.4 decided this viewer may see, unchanged: the repository adds nothing and
    // removes nothing, so the screens render exactly what the server scoped.
    const snapshot = { v: 7, phase: 'live', users: [{ id: 'u_jamie' }] };
    fetchMock.mockImplementation(async () => json(200, snapshot));

    await expect(createHttpRepository().snapshot()).resolves.toEqual(snapshot);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/snapshot');
    expect(optionsOf(0)?.credentials).toBe('include');
  });

  it('posts a mutation by name and returns what the UI needs', async () => {
    fetchMock.mockImplementation(async () => json(200, { toast: 'Step verified', effects: [{ type: 'confetti' }] }));

    const out = await createHttpRepository().run('toggleStep', { moduleId: 'sales', stepId: 'c4' });

    expect(out).toEqual({ toast: 'Step verified', effects: [{ type: 'confetti' }] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/mutate/toggleStep');
    const opts = optionsOf(0)!;
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
    expect(opts.headers).toEqual({ 'content-type': 'application/json' });
    // The new Db never travels back in the response: the repository refetches the scoped snapshot,
    // because what this viewer may see is the server's decision, not the mutation's.
    expect(JSON.parse(String(opts.body))).toEqual({ moduleId: 'sales', stepId: 'c4' });
  });

  it('a 422 is a form error, not a failure', async () => {
    fetchMock.mockImplementation(async () => json(422, { error: 'Pick a session first.' }));

    // Resolves. A throw here would surface as a crash banner instead of the inline message the
    // Module Builder renders, and the fixture path does not throw either.
    await expect(createHttpRepository().run('requestUpgrade', { source: 'Team tier page' })).resolves.toEqual({
      error: 'Pick a session first.',
    });
  });

  it('a 401 sends the viewer to sign in', async () => {
    const assign = vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
    fetchMock.mockImplementation(async () => json(401, { error: 'Not signed in' }));

    await expect(createHttpRepository().snapshot()).rejects.toThrow('Not signed in');
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('any other error throws, with the server message when there is one', async () => {
    const repo = createHttpRepository();

    fetchMock.mockImplementation(async () => json(403, { error: 'Only an Operations Lead can do that.' }));
    await expect(repo.run('publishModule', { id: 'operations' })).rejects.toThrow(
      'Only an Operations Lead can do that.',
    );

    // A 500 from a proxy is an HTML page, so there is no message to show.
    fetchMock.mockImplementation(async () => notJson(500));
    await expect(repo.snapshot()).rejects.toThrow('HTTP 500');
  });

  it('opens one event stream however many screens subscribe', () => {
    const repo = createHttpRepository();
    const a = vi.fn();
    const b = vi.fn();

    const offA = repo.subscribe(a);
    const offB = repo.subscribe(b);

    expect(live()).toHaveLength(1);
    expect(live()[0]?.url).toBe('/api/events');

    // One `changed` event reaches every subscriber: the admin console and the learner's portal
    // refetch from the same commit.
    live()[0]?.emit('changed');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    live()[0]?.emit('changed');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);

    offB();
    expect(live()).toHaveLength(0);
  });

  it('reopens the stream when a screen subscribes again', () => {
    const repo = createHttpRepository();
    const f = vi.fn();

    repo.subscribe(f)();
    expect(live()).toHaveLength(0);

    repo.subscribe(f);
    expect(live()).toHaveLength(1);
    live()[0]?.emit('changed');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('survives a runtime that will not give it a stream', () => {
    // A CSP that blocks the connection, or a browser without EventSource. The app degrades to
    // refetching after its own mutations, which is the behaviour every screen already has; what it
    // must not do is fail to render.
    streamThrows = new Error('Refused to connect');
    const repo = createHttpRepository();
    const f = vi.fn();

    const off = repo.subscribe(f);
    expect(live()).toHaveLength(0);
    expect(off).not.toThrow();
  });

  it('unsubscribing twice is harmless', () => {
    const repo = createHttpRepository();
    const off = repo.subscribe(vi.fn());
    off();
    expect(off).not.toThrow();
    expect(live()).toHaveLength(0);
  });
});
