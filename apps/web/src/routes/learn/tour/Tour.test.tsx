// D-252: "How the LMS Works" through the learner shell's own routes. The data hooks and `GET /api/course` are stood
// in for, as in LearnerShell.test.tsx; the mutation path is the real one (`useMutate`, the http repository, a staff
// preview's `withPreview`) over a fetch mock, so "nothing was written" is read off the requests that went out.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';
import { LMS_TOUR_PREF, setViewerZone } from '@ai/core';
import type { CoursePref, Db, MasqueradeView } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import type { VideoBlock } from '@ai/core/course-types';
import { learnerOf } from '@ai/core/learner';
import { sampleLabels, sampleWeek } from '@lms-v3-pkg/sample-data.js';
import type * as BootModule from '../../../data/boot';
import type * as HooksModule from '../../../data/hooks';
import { createHttpRepository } from '../../../data/http';
import { resetMasquerade } from '../../../data/masquerade';
import { PREVIEW_USER_ID, withPreview } from '../../../data/preview';
import type { LmsRepository, Viewer } from '../../../data/repository';
import { leave, resetSignOutForTests, signOut } from '../../../data/session';
import { tourLaterKey } from '../../../data/tour-later';
import type { CourseLoad } from '../data';
import type * as DataModule from '../data';
import { weekRows } from '../learn.vm';
import { WeekPage as V3WeekPage } from '../lms-v3/WeekPage';
import { v3WeekDraws } from '../lms-v3/week.vm';
import { learnerRoutes } from '../routes';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from '../test/fixture';
import { PRELOAD_TIMEOUT, preloadLearnerRoutes } from '../test/preload';
import { VideoView } from '../Video';
import { resetTourForTests } from './Tour';

const KEY = (n: number, ext: string) => `uploads/2026/11/cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}.${ext}`;
const TOUR: VideoBlock = {
  type: 'video',
  id: 'lms-tour',
  title: 'How the LMS Works',
  source: { upload: KEY(1, 'mp4'), name: 'tour.mp4', size: 1000, type: 'video/mp4' },
  poster: { upload: KEY(2, 'jpg'), name: 'tour.jpg', size: 10, type: 'image/jpeg' },
  transcript: { upload: KEY(3, 'vtt'), name: 'tour.vtt', size: 10, type: 'text/vtt' },
  chapters: [
    { t: 0, label: 'Welcome to the Accelerator' },
    { t: 32, label: 'Home' },
  ],
  durationS: 389.1,
  tour: true,
};
const VTT = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nWelcome in.\n';

/** The pre-launch preview's course and snapshot, with (or without) the tour in Week 0's Media. */
function course(tour: VideoBlock | null = TOUR, prefs?: CoursePref[], edit?: (d: Db) => void) {
  const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1', 'c2'] }, 15, (d) => {
    if (tour) d.modules.find((m) => m.id === acceleratorModuleId(0))!.course!.media.push(tour);
    const me = d.users.find((u) => u.id === LEARNER_ID)!;
    if (prefs) me.coursePrefs = prefs;
    edit?.(d);
  });
  return st;
}

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad; repo: LmsRepository; server: Viewer } = (() => {
  const st = course();
  return { db: st.db, viewer: st.viewer, now: st.now, course: { kind: 'ready', payload: st.payload }, repo: createHttpRepository(), server: st.viewer };
})();
function use(st: ReturnType<typeof course>, viewer: Viewer = st.viewer) {
  state.db = st.db;
  state.viewer = viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
  state.server = viewer;
}

vi.mock('../../../data/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof HooksModule>()),
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
}));
vi.mock('../data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
// The repository the real `useMutate` writes through: the http one, or a staff preview's wrap of it.
vi.mock('../../../data/boot', async (importOriginal) => ({
  ...(await importOriginal<typeof BootModule>()),
  repo: new Proxy({} as LmsRepository, { get: (_t, k) => (state.repo as unknown as Record<PropertyKey, unknown>)[k] }),
}));

/** Every request the page sent. */
const sent: { url: string; method: string; body: string | undefined }[] = [];
const mutations = () => sent.filter((r) => r.url.startsWith('/api/mutate/'));

async function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }, { path: '/sign-in', element: <p>sign in</p> }], { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
  return router;
}
/** A fresh page load of the same tab. */
async function reload(path = '/learn') {
  cleanup();
  resetTourForTests();
  return at(path);
}
const dialog = () => screen.queryByRole('dialog', { name: 'How the LMS Works' });
const openDialog = () => screen.findByRole('dialog', { name: 'How the LMS Works' });

/** A `<video>` jsdom can drive: its length, and where it is, set by the test. */
function controllable(el: HTMLVideoElement, duration: number): void {
  let time = 0;
  Object.defineProperty(el, 'duration', { configurable: true, get: () => duration });
  Object.defineProperty(el, 'currentTime', { configurable: true, get: () => time, set: (v: number) => (time = v) });
  el.play = () => Promise.resolve();
  el.pause = () => undefined;
}
/** Play from `from` to `to`, one second a tick. */
function playThrough(el: HTMLVideoElement, from: number, to: number) {
  el.currentTime = from;
  fireEvent.seeked(el);
  fireEvent.play(el);
  for (let t = from + 1; t <= to; t += 1) {
    el.currentTime = t;
    fireEvent.timeUpdate(el);
  }
  fireEvent.pause(el);
}

const ACTIVE: MasqueradeView = {
  id: 'mq1',
  target: { id: LEARNER_ID, name: 'Dana Ross', teamName: null },
  staff: { id: 'st1', name: 'Staff Member' },
  reason: 'Checking the tour',
  startedAt: PRELAUNCH_NOW,
  expiresAt: PRELAUNCH_NOW + 900_000,
  hardExpiresAt: PRELAUNCH_NOW + 3_600_000,
  extendCount: 0,
  canExtend: true,
  startedFrom: null,
};

beforeAll(preloadLearnerRoutes, PRELOAD_TIMEOUT);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setViewerZone('America/Denver');
  resetTourForTests();
  resetSignOutForTests();
  resetMasquerade({ status: 'none' });
  use(course());
  state.repo = createHttpRepository();
  sent.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? `${input.pathname}${input.search}` : input.url;
      sent.push({ url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined });
      if (url === '/api/me') return Response.json({ viewer: state.server, prefs: {} });
      if (url === '/api/auth/sign-out') return new Response(null, { status: 204 });
      if (url.endsWith('.vtt')) return new Response(VTT, { headers: { 'content-type': 'text/vtt' } });
      return Response.json({});
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setViewerZone(null);
  resetMasquerade();
});

describe('the sign-in modal: who gets it', () => {
  it('opens for an unseen Accelerator owner: the title, the length from data, the line, the player and both buttons', async () => {
    await at('/learn');
    const d = await openDialog();
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAccessibleDescription('6:29 · A quick tour of your new home for the Accelerator. Watch it with your AI Implementer.');
    expect(within(d).getByRole('button', { name: 'Watch Later' })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'I’ve Seen It' })).toBeInTheDocument();
    expect(d.querySelector('video')?.getAttribute('src')).toBe(`/api/files/course/${KEY(1, 'mp4')}`);
    expect(within(d).getByRole('list', { name: /Chapters/ })).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Show transcript' })).toBeInTheDocument();
    // Focus moves into the dialog (`useDialogA11y`; jsdom has no layout, so it lands on the dialog itself, where a
    // browser lands on Close: the e2e spec checks that).
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true));
    expect(mutations()).toEqual([]);
  });

  it('turns the captions on by default in the modal, and only there', async () => {
    await at('/learn');
    const track = (await openDialog()).querySelector('track')!;
    expect(track.getAttribute('kind')).toBe('captions');
    expect(track.hasAttribute('default')).toBe(true);
    cleanup();
    const { container } = render(<VideoView block={TOUR} />);
    expect(container.querySelector('track')!.hasAttribute('default')).toBe(false);
  });

  it('opens for an unseen teammate on an Accelerator team (the owner’s AI Implementer)', async () => {
    use(
      course(TOUR, undefined, (d) => {
        const me = d.users.find((u) => u.id === LEARNER_ID)!;
        me.role = 'Agent';
        me.teamId = 'team-accelerator';
      }),
    );
    expect(learnerOf(state.db, LEARNER_ID)?.role).toBe('Agent');
    await at('/learn');
    expect(await openDialog()).toBeInTheDocument();
  });

  it('opens for a learner who signed in before it shipped: other prefs, no lms-tour-seen (no first-sign-in rule)', async () => {
    use(
      course(TOUR, [
        { key: 'path', value: 'claude', updatedAt: 1 },
        { key: 'week0-done', value: '1', updatedAt: 2 },
      ]),
    );
    await at('/learn');
    expect(await openDialog()).toBeInTheDocument();
  });

  it.each([
    ['Utah Life (an access group)'],
    ['Amplified Insiders'],
    ['Insiders Agent'],
    ['the Agent Plan'],
    ['the Team Plan'],
    ['a $37 skill buyer with no plan'],
  ])('never opens for %s: the course answers 403, so the shell has no course', async () => {
    state.course = { kind: 'locked' };
    await at('/learn');
    await screen.findAllByRole('heading');
    expect(dialog()).toBeNull();
    expect(mutations()).toEqual([]);
  });

  it('never opens for staff, nor for a signed-out visitor', async () => {
    state.viewer = { actor: { kind: 'staff', staffId: 'st1' }, role: 'owner' } as Viewer;
    state.server = state.viewer;
    await at('/learn');
    expect(dialog()).toBeNull();
    cleanup();
    use(course());
    state.course = { kind: 'signed-out' };
    await reload();
    expect(dialog()).toBeNull();
  });

  it('opens once per page load, and not at all while a masquerade isn’t yet known not to be running', async () => {
    resetMasquerade({ status: 'unknown' });
    await at('/learn');
    expect(dialog()).toBeNull();
    cleanup();
    resetMasquerade({ status: 'none' });
    await reload();
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog()).toBeNull();
    // Moving around the shell doesn't open it again on this page load.
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the sign-in modal: its buttons', () => {
  it('I’ve Seen It writes lms-tour-seen = 1 once, closes, and it stays closed after a reload', async () => {
    await at('/learn');
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'I’ve Seen It' }));
    expect(dialog()).toBeNull();
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0]).toMatchObject({ url: '/api/mutate/setPref', method: 'POST' });
    expect(JSON.parse(mutations()[0]!.body!)).toEqual({ key: LMS_TOUR_PREF, value: '1' });
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBeNull();
    // The reload: the snapshot now carries the pref on the learner's own row.
    use(course(TOUR, [{ key: LMS_TOUR_PREF, value: '1', updatedAt: PRELAUNCH_NOW }]));
    await reload();
    expect(dialog()).toBeNull();
    expect(mutations()).toHaveLength(1);
  });

  it('Watch Later writes nothing, keeps it closed for this browser session, and it opens again in a new session and after signing out and in', async () => {
    await at('/learn');
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Watch Later' }));
    expect(dialog()).toBeNull();
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBe('1');
    await reload();
    expect(dialog()).toBeNull();
    // A new browser session: sessionStorage starts empty.
    sessionStorage.clear();
    await reload();
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Watch Later' }));
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBe('1');
    // Sign Out clears it, so the next sign-in in this tab opens it again.
    vi.spyOn(leave, 'toSignIn').mockImplementation(() => undefined);
    await expect(signOut()).resolves.toBe(true);
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBeNull();
    resetSignOutForTests();
    await reload();
    expect(await openDialog()).toBeInTheDocument();
    expect(mutations()).toEqual([]);
  });

  it('Close and Escape behave like Watch Later', async () => {
    await at('/learn');
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Close' }));
    expect(dialog()).toBeNull();
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBe('1');
    sessionStorage.clear();
    await reload();
    await openDialog();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(dialog()).toBeNull();
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBe('1');
    expect(mutations()).toEqual([]);
  });

  it('marks it seen at 90% played, once, and keeps playing; a seek to 90% doesn’t', async () => {
    await at('/learn');
    const d = await openDialog();
    const video = d.querySelector('video')!;
    controllable(video, 100);
    // A seek to the end and a few seconds there: about 8% played.
    playThrough(video, 92, 100);
    expect(mutations()).toEqual([]);
    // Playing from the start: nothing at 89 seconds played (97% of the bar reached), then once at 90%.
    playThrough(video, 0, 81);
    expect(mutations()).toEqual([]);
    playThrough(video, 81, 82);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(JSON.parse(mutations()[0]!.body!)).toEqual({ key: LMS_TOUR_PREF, value: '1' });
    playThrough(video, 82, 91);
    expect(dialog()).toBeInTheDocument();
    // I've Seen It after that sends nothing more.
    fireEvent.click(within(d).getByRole('button', { name: 'I’ve Seen It' }));
    expect(mutations()).toHaveLength(1);
  });
});

describe('look-only: a masquerade and a staff preview', () => {
  it('in a masquerade it shows, and every button and the 90% rule only close or play here: no request, no seen flag, no Watch Later', async () => {
    resetMasquerade({ status: 'active', session: ACTIVE, skew: 0 });
    await at('/learn');
    const d = await openDialog();
    const video = d.querySelector('video')!;
    controllable(video, 100);
    playThrough(video, 0, 100);
    fireEvent.click(within(d).getByRole('button', { name: 'I’ve Seen It' }));
    expect(dialog()).toBeNull();
    await reload();
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Watch Later' }));
    await reload();
    fireEvent.keyDown(within(await openDialog()).getByRole('button', { name: 'Close' }), { key: 'Escape' });
    expect(sessionStorage.getItem(tourLaterKey(LEARNER_ID))).toBeNull();
    expect(mutations()).toEqual([]);
    expect(sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });

  it('in a staff preview it shows, and nothing is sent', async () => {
    state.repo = withPreview(createHttpRepository(), 'agent');
    state.server = { actor: { kind: 'staff', staffId: 'st1' }, role: 'owner' } as Viewer;
    state.viewer = { actor: { kind: 'learner', userId: PREVIEW_USER_ID }, role: 'agent', preview: 'agent' } as Viewer;
    await at('/learn');
    const d = await openDialog();
    const video = d.querySelector('video')!;
    controllable(video, 100);
    playThrough(video, 0, 100);
    fireEvent.click(within(d).getByRole('button', { name: 'I’ve Seen It' }));
    await reload();
    fireEvent.click(within(await openDialog()).getByRole('button', { name: 'Watch Later' }));
    expect(sessionStorage.getItem(tourLaterKey(PREVIEW_USER_ID))).toBeNull();
    expect(mutations()).toEqual([]);
    expect(sent.filter((r) => r.method !== 'GET')).toEqual([]);
  });
});

describe('Week 0’s pinned card', () => {
  it('sits on Week 0, seen or not, and plays the tour in the modal without its two buttons; 90% still marks it seen', async () => {
    use(course(TOUR, [{ key: 'week0-done', value: '1', updatedAt: 1 }]));
    sessionStorage.setItem(tourLaterKey(LEARNER_ID), '1');
    await at('/learn/week/0');
    expect(dialog()).toBeNull();
    const card = document.querySelector<HTMLElement>('[data-lms-tour-card]')!;
    expect(within(card).getByRole('heading', { name: 'How the LMS Works' })).toBeInTheDocument();
    expect(card).toHaveTextContent('6:29');
    expect(card.querySelector('img')?.getAttribute('src')).toBe(`/api/files/course/${TOUR.poster!.upload}`);
    expect(within(card).getByRole('button', { name: 'Play How the LMS Works, 6:29' })).toBeInTheDocument();
    const play = within(card).getByRole('button', { name: 'Watch the Tour' });
    play.focus();
    fireEvent.click(play);
    const d = await openDialog();
    expect(within(d).queryByRole('button', { name: 'Watch Later' })).toBeNull();
    expect(within(d).queryByRole('button', { name: 'I’ve Seen It' })).toBeNull();
    const video = d.querySelector('video')!;
    controllable(video, 100);
    playThrough(video, 0, 95);
    await waitFor(() => expect(mutations()).toHaveLength(1));
    fireEvent.click(within(d).getByRole('button', { name: 'Close' }));
    expect(dialog()).toBeNull();
    await waitFor(() => expect(play).toHaveFocus());
  });

  it('is there for a learner who has seen it, and plays without writing again', async () => {
    use(course(TOUR, [{ key: LMS_TOUR_PREF, value: '1', updatedAt: 1 }]));
    await at('/learn/week/0');
    expect(dialog()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Tour' }));
    const video = (await openDialog()).querySelector('video')!;
    controllable(video, 100);
    playThrough(video, 0, 100);
    expect(mutations()).toEqual([]);
  });

  it('with no flagged video there is no modal and no card, and the Media list is as it was', async () => {
    use(course(null));
    await at('/learn');
    expect(dialog()).toBeNull();
    await reload('/learn/week/0');
    expect(document.querySelector('[data-lms-tour-card]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Watch the Tour' })).toBeNull();
    // A Week 0 video that isn't flagged is no tour either.
    use(course({ ...TOUR, tour: undefined }));
    await reload('/learn');
    expect(dialog()).toBeNull();
    expect(mutations()).toEqual([]);
  });

  it('v3: Week 0 still draws with the tour in its Media, and the card sits above the Hero', () => {
    const st = course();
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    expect(v3WeekDraws(rows.find((r) => r.week === 0))).toBe(true);
    // A real video that isn't the tour still keeps today's page (D-234).
    const plain = course({ ...TOUR, tour: undefined });
    expect(v3WeekDraws(weekRows(plain.payload, plain.db, learnerOf(plain.db, LEARNER_ID)).find((r) => r.week === 0))).toBe(false);
    const html = renderToStaticMarkup(<V3WeekPage week={sampleWeek('s1')} labels={sampleLabels} pinned={<p data-pinned="">card</p>} />);
    expect(html.indexOf('data-pinned')).toBeGreaterThan(html.indexOf('wk-head'));
    expect(html.indexOf('data-pinned')).toBeLessThan(html.indexOf('wk-hero'));
  });
});
