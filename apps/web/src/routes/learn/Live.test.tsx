import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import { learnerRoutes } from './routes';
import { LEARNER_ID, learnState, prelaunchState, sessionIn } from './test/fixture';
import type { LearnState } from './test/fixture';

// D-183: the current portal's live session, replay and announcements in the learner portal v2, rendered
// through its own routes and shell. The course is the API's (`GET /api/course`, times only); the shell
// reads Go Live, End Session and the replay off the snapshot, as it does in the app.

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad } = {
  db: prelaunchState().db,
  viewer: { actor: { kind: 'learner', userId: LEARNER_ID }, role: 'learner' },
  now: prelaunchState().now,
  course: { kind: 'ready', payload: prelaunchState().payload },
};
const mutate = vi.fn(async () => ({}));

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => mutate,
}));
vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));

const S1 = Date.parse('2026-12-02T19:00:00Z');
const MIN = 60_000;

function use(st: LearnState) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  setViewerZone('America/Denver');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  mutate.mockClear();
});
afterEach(() => setViewerZone(null));

describe('Join, 15 minutes early (D-183)', () => {
  it('Join enabled at start-15m on the Home hero and the top bar (Starting soon) @parity:D-2 @parity:A-8', async () => {
    use(learnState(S1 - 15 * MIN, true, { 0: ['c1', 'c2'] }));
    at('/learn');
    const hero = await screen.findByRole('region', { name: 'Map Your Spend Live Build' }, { timeout: 5000 });
    expect(within(hero).getByText(/Starting soon · Week 1/)).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: 'Join the live build' })).toBeInTheDocument();
    const bar = screen.getByRole('banner');
    expect(bar).toHaveTextContent('Starting soon');
    expect(within(bar).getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  it('Join absent at start-16m: the step hero, the next build, Add to calendar with Google Calendar and Outlook @parity:D-2 @parity:D-3', async () => {
    use(learnState(S1 - 16 * MIN, true, { 0: ['c1', 'c2'] }));
    at('/learn');
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /^Join/ })).toBeNull();
    expect(screen.getByRole('banner')).toHaveTextContent('Next live build');
    // Beside each one-event .ics: Google Calendar and Outlook, in a new tab, with no join link.
    const google = screen.getAllByRole('link', { name: 'Google Calendar' });
    expect(google.length).toBeGreaterThan(0);
    expect(google[0]).toHaveAttribute('href', expect.stringMatching(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&text=/));
    expect(google[0]).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('link', { name: 'Outlook' })[0]).toHaveAttribute('href', expect.stringMatching(/^https:\/\/outlook\.live\.com\//));
  });

  it('Schedule at start-16m: the next row’s Join is off, described by “Opens 15 Min Before” @parity:S-2', async () => {
    use(learnState(S1 - 16 * MIN, true, { 0: ['c1', 'c2'] }));
    at('/learn/schedule');
    const off = await screen.findByRole('button', { name: 'Join' }, { timeout: 5000 });
    expect(off).toHaveAttribute('aria-disabled', 'true');
    expect(off).toHaveAccessibleDescription('Opens 15 Min Before');
  });

  it('Schedule Join enabled at start-15m on the hero and the row @parity:S-2 @parity:M-2', async () => {
    use(learnState(S1 - 15 * MIN, true, { 0: ['c1', 'c2'] }));
    at('/learn/schedule');
    const hero = await screen.findByRole('region', { name: 'Map Your Spend Live Build' }, { timeout: 5000 });
    expect(within(hero).getByRole('button', { name: 'Join the live build' })).toBeInTheDocument();
    const strip = screen.getByRole('group', { name: 'Starting soon: Map Your Spend Live Build' });
    expect(within(strip).getByRole('button', { name: 'Join' })).not.toHaveAttribute('aria-disabled');
  });
});

describe('Go Live and End Session (D-183)', () => {
  it('Go Live hours before the start: Live now and Join on the week page and the top bar @parity:C-1 @parity:E-9', async () => {
    use(learnState(S1 - 3 * 3600_000, true, { 0: ['c1', 'c2'] }, 15, (d) => (sessionIn(d, 'dec26-s1').live = true)));
    at('/learn/week/1');
    const card = await screen.findByRole('region', { name: 'Live now' }, { timeout: 5000 });
    expect(within(card).getByRole('button', { name: 'Join the live build' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Live now');
  });

  it('a published replay on the week page: play/pause, seek with arrow keys, back 10s, speed, captions, transcript, chapters with ticks and Watch at @parity:E-1 @parity:E-2 @parity:E-3 @parity:E-4 @parity:E-5 @parity:E-6 @parity:E-17 @parity:M-3', async () => {
    use(
      learnState(S1 + 2 * 86400_000, false, { 1: ['c1'] }, 15, (d) => {
        Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready', attended: 12 });
        d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
      }),
    );
    localStorage.removeItem('ai-lms-pos-accelerator-week-1');
    at('/learn/week/1');
    const player = await screen.findByRole('region', { name: 'Session replay' }, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /^Join/ })).toBeNull();
    expect(player).toHaveTextContent('0:00 / 1:20:00');
    const play = within(player).getByRole('button', { name: 'Play' });
    fireEvent.click(play);
    expect(within(player).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.click(within(player).getByRole('button', { name: 'Pause' }));
    // The seek bar: arrow keys move 10 seconds.
    const seek = within(player).getByRole('slider', { name: 'Seek' });
    fireEvent.keyDown(seek, { key: 'ArrowRight' });
    expect(seek).toHaveAttribute('aria-valuenow', '10');
    fireEvent.click(within(player).getByRole('button', { name: 'Back 10 seconds' }));
    expect(seek).toHaveAttribute('aria-valuenow', '0');
    // Speed and captions.
    fireEvent.click(within(player).getByRole('button', { name: 'Playback speed' }));
    expect(within(player).getByRole('button', { name: 'Playback speed' })).toHaveTextContent('1.25×');
    const cc = within(player).getByRole('button', { name: 'Captions' });
    expect(cc).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(cc);
    expect(cc).toHaveAttribute('aria-pressed', 'false');
    // The transcript opens with the current portal's line while there is none.
    fireEvent.click(within(player).getByRole('button', { name: 'Transcript' }));
    expect(within(player).getByRole('region', { name: 'Transcript' })).toHaveTextContent('The searchable transcript posts with the replay.');
    // Each step's chapter, "Watch at mm:ss", seeks the player to it.
    const chapter = within(player).getAllByRole('button', { name: /Watch at 10:00/ })[0]!;
    fireEvent.click(chapter);
    expect(player).toHaveTextContent('10:00 / 1:20:00');
    // The chapters: one per build step, the done one ticked.
    expect(within(player).getAllByRole('img', { name: 'Verified' })).toHaveLength(1);
  });
});

describe('the recording staff attach (D-183)', () => {
  const attach = (url: string) =>
    use(
      learnState(S1 + 2 * 86400_000, false, { 1: ['c1'] }, 15, (d) => {
        Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready', replayUrl: url });
        d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
      }),
    );

  it('a video file plays in the week page’s player: its video element has the recording as its source @parity:E-1 @parity:C-3 @parity:M-3', async () => {
    attach('https://cdn.example.com/week1.mp4');
    at('/learn/week/1');
    const player = await screen.findByRole('region', { name: 'Session replay' }, { timeout: 5000 });
    const video = player.querySelector('video')!;
    expect(video).not.toBeNull();
    expect(video.getAttribute('src')).toBe('https://cdn.example.com/week1.mp4');
    expect(within(player).getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('a page on another site: “Watch Replay” in a new tab, the chapters kept, no seek controls @parity:E-1 @parity:C-3', async () => {
    attach('https://us02web.zoom.us/rec/share/abc');
    at('/learn/week/1');
    const player = await screen.findByRole('region', { name: 'Session replay' }, { timeout: 5000 });
    const link = within(player).getByRole('link', { name: 'Watch Replay' });
    expect(link).toHaveAttribute('href', 'https://us02web.zoom.us/rec/share/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(within(player).queryByRole('slider')).toBeNull();
    expect(player).toHaveTextContent('Chapters Follow the 6 Build Steps');
  });
});

describe('the replay’s saved position (D-183)', () => {
  it('resumes where the learner left off, and saves the position on page hide, under today’s key @parity:E-7', async () => {
    use(
      learnState(S1 + 2 * 86400_000, false, { 1: ['c1'] }, 15, (d) => {
        Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' });
        d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
      }),
    );
    localStorage.setItem('ai-lms-pos-accelerator-week-1', '600');
    at('/learn/week/1');
    const player = await screen.findByRole('region', { name: 'Session replay' }, { timeout: 5000 });
    expect(player).toHaveTextContent('10:00 / 1:20:00');
    const seek = within(player).getByRole('slider', { name: 'Seek' });
    fireEvent.keyDown(seek, { key: 'ArrowRight' });
    expect(seek).toHaveAttribute('aria-valuenow', '610');
    window.dispatchEvent(new Event('pagehide'));
    expect(localStorage.getItem('ai-lms-pos-accelerator-week-1')).toBe('610');
    localStorage.removeItem('ai-lms-pos-accelerator-week-1');
  });
});

describe('a live-build step (D-183)', () => {
  it('the step player draws the replay, and “Watch at mm:ss” seeks it to the step’s chapter @parity:E-17 @parity:E-1', async () => {
    use(
      learnState(S1 + 2 * 86400_000, false, { 1: ['c1'] }, 15, (d) => {
        Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' });
        d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
      }),
    );
    localStorage.removeItem('ai-lms-pos-accelerator-week-1');
    at('/learn/week/1/step/3');
    const player = await screen.findByRole('region', { name: 'Session replay' }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Watch at 10:00' }));
    expect(player).toHaveTextContent('10:00 / 1:20:00');
    expect(within(player).getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });
});

describe('the in-app announcement on Home (D-183)', () => {
  it('Home banner: shows it, Open Sessions goes to the Schedule, Dismiss calls dismissAnnouncement @parity:D-1 @parity:A-5', async () => {
    use(
      learnState(S1 - 2 * 86400_000, true, { 0: ['c1'] }, 15, (d) => {
        d.announcements = [
          { id: 'n1', title: 'Office hours are open', body: 'Bring your questions.', severity: 'info', action: 'sessions', actionLabel: 'See the schedule', audience: 'all', channels: ['inapp'], status: 'sent', at: S1 - 3 * 86400_000, opens: null },
        ];
      }),
    );
    const router = at('/learn');
    await screen.findByText('Office hours are open', {}, { timeout: 5000 });
    const banner = screen.getAllByRole('status').find((x) => x.textContent?.includes('Office hours are open'))!;
    expect(banner).toHaveTextContent('Bring your questions.');
    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(mutate).toHaveBeenCalledWith('dismissAnnouncement', { id: 'n1' });
    fireEvent.click(within(banner).getByRole('button', { name: 'See the schedule' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/learn/schedule'));
  });
});
