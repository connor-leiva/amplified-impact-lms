import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BLOCKED_MESSAGE, MASQUERADE_BLOCKED_EVENT, createHttpRepository, masqueradeRefusal, navigation, signInFor, sitePath } from './http';

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

  it('posts an audited Build action by name, answering as a mutation does (D-172)', async () => {
    fetchMock.mockImplementation(async () => json(200, { toast: { msg: 'Duplicated as a draft', tone: 'success' } }));
    const out = await createHttpRepository().act('duplicateModule', { id: 'sales' });
    expect(out).toEqual({ toast: { msg: 'Duplicated as a draft', tone: 'success' } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/actions/duplicateModule');
    const opts = optionsOf(0)!;
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
    expect(JSON.parse(String(opts.body))).toEqual({ id: 'sales' });
    fetchMock.mockImplementation(async () => json(422, { error: 'Give all six build steps a title.' }));
    await expect(createHttpRepository().act('duplicateModule', { id: 'sales' })).resolves.toEqual({ error: 'Give all six build steps a title.' });
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

  it('@parity:L-12 from a skill’s page, the sign-in brings them back to it; from anywhere else, plain sign-in (D-182)', () => {
    expect(signInFor('/learn/skills/appointment-follow-up')).toBe('/sign-in?next=%2Flearn%2Fskills%2Fappointment-follow-up');
    expect(signInFor('/skill-library/appointment-follow-up')).toBe('/sign-in?next=%2Fskill-library%2Fappointment-follow-up');
    for (const p of ['/learn', '/learn/skills', '/learn/skills/not-a-skill', '/learn/week/1', '/admin', '/']) expect(signInFor(p), p).toBe('/sign-in');
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

// Phase 08. The two routes the repository gained, written down before they exist for the same
// reason the suite above was: every assertion here is a requirement on the server.

describe('HttpRepository · stored files (§ 8.2) @g8', () => {
  it('names the two download routes', () => {
    const repo = createHttpRepository();

    expect(repo.fileUrl({ kind: 'resource', id: 'r4' })).toBe('/api/files/resource/r4');
    expect(
      repo.fileUrl({ kind: 'moduleFile', moduleId: 'marketing', fileName: 'fair-housing-check.skill.yaml' }),
    ).toBe('/api/files/module/marketing/fair-housing-check.skill.yaml');
  });

  it('is a URL, not a fetch', () => {
    // The redirect has to be followed by the BROWSER for the download to land in the downloads
    // tray, so the repository hands back a URL to navigate to and makes no request of its own.
    const repo = createHttpRepository();

    repo.fileUrl({ kind: 'resource', id: 'r4' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('percent-encodes every segment', () => {
    // An admin names the skill file. An un-encoded '/' addresses a different route entirely.
    const repo = createHttpRepository();

    expect(repo.fileUrl({ kind: 'moduleFile', moduleId: 'm 1', fileName: '../key.json' })).toBe(
      '/api/files/module/m%201/..%2Fkey.json',
    );
  });
});

describe('HttpRepository · the join window (§ 8.4) @g8', () => {
  it('reads the URL out of the session join route', async () => {
    fetchMock.mockImplementation(async () => json(200, { url: 'https://zoom.us/j/8841200610' }));

    await expect(createHttpRepository().joinTicket('dec26-s3')).resolves.toEqual({
      kind: 'open',
      url: 'https://zoom.us/j/8841200610',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/sessions/dec26-s3/join');
    expect(optionsOf(0)?.credentials).toBe('include');
  });

  it('a 409 resolves as shut, rather than throwing', async () => {
    // § 8.4 returns 409 whenever `joinMode(session, now) === 'disabled'`, which is the ordinary
    // state of every session until 15 minutes before it starts. A throw here would surface as a
    // crash on the most-clicked button in the portal.
    fetchMock.mockImplementation(async () => json(409, { error: 'Join opens 15 min before' }));

    await expect(createHttpRepository().joinTicket('dec26-s3')).resolves.toEqual({ kind: 'shut' });
  });

  it('a 200 with no URL is shut, not an open tab on this origin', async () => {
    fetchMock.mockImplementation(async () => json(200, {}));

    await expect(createHttpRepository().joinTicket('dec26-s3')).resolves.toEqual({ kind: 'shut' });
  });

  it('a 403 still throws: this learner may not reach the session at all', async () => {
    fetchMock.mockImplementation(async () => json(403, { error: 'Team tier required' }));

    await expect(createHttpRepository().joinTicket('dec26-s4')).rejects.toThrow('Team tier required');
  });

  it('a 401 sends the viewer to sign in', async () => {
    const assign = vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
    fetchMock.mockImplementation(async () => json(401, { error: 'Not signed in' }));

    await expect(createHttpRepository().joinTicket('dec26-s3')).rejects.toThrow('Not signed in');
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('percent-encodes the session id', async () => {
    fetchMock.mockImplementation(async () => json(200, { url: 'https://zoom.us/j/1' }));

    await createHttpRepository().joinTicket('dec26/s3');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/sessions/dec26%2Fs3/join');
  });
});

// D-162 3b (spec § 6 Web): a masquerade's two refusals. 409 `masquerade_ended` goes to its redirect;
// 403 `masquerade_blocked` opens the blocked dialog (a window event naming the attempt). 401 is
// unchanged, above.
describe('HttpRepository · a masquerade (D-162 3b) @g9', () => {
  const blocked = () => {
    const seen: (string | null)[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent<{ attempt: string | null }>).detail.attempt);
    window.addEventListener(MASQUERADE_BLOCKED_EVENT, on);
    return { seen, off: () => window.removeEventListener(MASQUERADE_BLOCKED_EVENT, on) };
  };

  it('a blocked write opens the blocked dialog, naming the route, and resolves like a form error', async () => {
    const b = blocked();
    fetchMock.mockImplementation(async () => json(403, { error: BLOCKED_MESSAGE, code: 'masquerade_blocked' }));
    await expect(createHttpRepository().run('toggleStep', { moduleId: 'm1', step: 0 } as never)).resolves.toEqual({ error: BLOCKED_MESSAGE });
    expect(b.seen).toEqual(['POST /api/mutate/toggleStep']);
    b.off();
  });

  it('an ended session goes where the API says, with a full page load', async () => {
    const assign = vi.spyOn(navigation, 'assign').mockImplementation(() => {});
    const toSignIn = vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
    fetchMock.mockImplementation(async () => json(409, { error: 'This masquerade session has ended.', code: 'masquerade_ended', redirect: '/admin/users/u_1042' }));
    await expect(createHttpRepository().snapshot()).rejects.toThrow('This masquerade session has ended.');
    expect(assign).toHaveBeenCalledWith('/admin/users/u_1042');
    expect(toSignIn).not.toHaveBeenCalled();
  });

  it('the join route: blocked is shut (and the dialog), ended goes back, an ordinary 409 is still shut', async () => {
    const assign = vi.spyOn(navigation, 'assign').mockImplementation(() => {});
    const b = blocked();
    fetchMock.mockImplementation(async () => json(403, { error: BLOCKED_MESSAGE, code: 'masquerade_blocked' }));
    await expect(createHttpRepository().joinTicket('dec26-s3')).resolves.toEqual({ kind: 'shut' });
    expect(b.seen).toEqual(['GET /api/sessions/dec26-s3/join']);
    b.off();
    fetchMock.mockImplementation(async () => json(409, { code: 'masquerade_ended', redirect: '/admin' }));
    await expect(createHttpRepository().joinTicket('dec26-s3')).rejects.toThrow('Masquerade ended');
    expect(assign).toHaveBeenCalledWith('/admin');
    fetchMock.mockImplementation(async () => json(409, { error: 'Not open yet' }));
    await expect(createHttpRepository().joinTicket('dec26-s3')).resolves.toEqual({ kind: 'shut' });
  });

  it('a 401 is unchanged: sign in, no masquerade handling', async () => {
    const assign = vi.spyOn(navigation, 'assign').mockImplementation(() => {});
    const toSignIn = vi.spyOn(navigation, 'toSignIn').mockImplementation(() => {});
    fetchMock.mockImplementation(async () => json(401, { error: 'Not signed in', code: 'masquerade_ended', redirect: '/admin' }));
    await expect(createHttpRepository().viewer()).rejects.toThrow('Not signed in');
    expect(toSignIn).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('anything else is left alone; a redirect is followed only within this site', () => {
    const assign = vi.spyOn(navigation, 'assign').mockImplementation(() => {});
    expect(masqueradeRefusal(403, { code: 'console_forbidden' })).toBeNull();
    expect(masqueradeRefusal(409, { code: 'masquerade_active' })).toBeNull();
    expect(masqueradeRefusal(409, { code: 'masquerade_ended', redirect: 'https://evil.example/' })).toBe('ended');
    expect(assign).toHaveBeenLastCalledWith('/');
    expect([sitePath('/admin'), sitePath('//evil.example'), sitePath('/\\evil'), sitePath(null)]).toEqual(['/admin', '/', '/', '/']);
  });
});

// D-188: an upload is two steps, the upload route then the browser's PUT, and only both succeeding is a success.
describe('HttpRepository · upload (D-188)', () => {
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let puts: { url: string; type: string | null; body: unknown }[];
  let putStatus: number;

  class FakeXhr {
    status = 0;
    url = '';
    headers: Record<string, string> = {};
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    send(body: unknown) {
      puts.push({ url: this.url, type: this.headers['content-type'] ?? null, body });
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = putStatus;
      if (putStatus === 0) this.onerror?.();
      else this.onload?.();
    }
  }

  beforeEach(() => {
    puts = [];
    putStatus = 200;
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  const file = (name: string, size = 10, type = '') => new File([new Uint8Array(size)], name, { type });

  it('asks the upload route for a URL by the type the name gives, then PUTs the file with that type', async () => {
    fetchMock.mockImplementation(async () => json(200, { key: 'uploads/2026/12/aaaaaaaa-bbbb-cccc.xlsx', url: 'https://bucket.example/b/k?sig=1' }));
    const progress: number[] = [];
    // Windows calls a spreadsheet by another name; the signed type is read from the extension.
    const out = await createHttpRepository().upload(file('Pipeline.xlsx', 10, 'application/vnd.ms-excel'), (p) => progress.push(p));

    expect(out).toEqual({ ok: true, file: { key: 'uploads/2026/12/aaaaaaaa-bbbb-cccc.xlsx', name: 'Pipeline.xlsx', size: 10, type: XLSX } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/files/upload-url');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(String(init.body))).toEqual({ contentType: XLSX, size: 10, name: 'Pipeline.xlsx' });
    expect(puts).toEqual([{ url: 'https://bucket.example/b/k?sig=1', type: XLSX, body: expect.any(File) }]);
    expect(progress).toEqual([0, 0.5, 1]);
  });

  it('says the route’s refusal, and never PUTs', async () => {
    fetchMock.mockImplementation(async () => json(422, { error: '"size" is too big' }));
    expect(await createHttpRepository().upload(file('a.csv'))).toEqual({ ok: false, error: 'The upload didn’t finish. Try again.' });
    expect(puts).toEqual([]);
  });

  it('is never a success when the bucket refuses the PUT, or the network drops it', async () => {
    fetchMock.mockImplementation(async () => json(200, { key: 'uploads/2026/12/aaaaaaaa-bbbb-cccc.csv', url: 'https://bucket.example/x' }));
    putStatus = 403;
    expect(await createHttpRepository().upload(file('a.csv'))).toEqual({ ok: false, error: 'The upload didn’t finish. Try again.' });
    putStatus = 0;
    expect(await createHttpRepository().upload(file('a.csv'))).toEqual({ ok: false, error: 'The upload didn’t finish. Try again.' });
  });

  it('refuses a file the API would refuse before asking it anything', async () => {
    expect(await createHttpRepository().upload(file('page.html'))).toEqual({ ok: false, error: 'Choose a JSON, PDF, Markdown, ZIP, MP4, Excel, CSV, JPG or VTT file.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
