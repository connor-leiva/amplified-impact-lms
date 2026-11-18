// D-183: the week's live session on the week page and a live-build step: Join, "Replay Processing", and
// the replay with its chapters, captions, transcript and "Watch at".
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone, toVtt } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { idleUi, stepLiveVM, weekLiveVM, weekReplay, withTranscript } from './Replay.vm';
import { LEARNER_ID, asShell, learnState, sessionIn } from './test/fixture';
import type { LearnState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const S1 = Date.parse('2026-12-02T19:00:00Z');
const MIN = 60_000;
const at = (now: number, edit?: Parameters<typeof learnState>[4]) => asShell(learnState(now, false, { 0: ['c1', 'c2'], 1: ['c1'] }, 15, edit));
const who = (x: LearnState) => ({ db: x.db, me: learnerOf(x.db, LEARNER_ID) });
const live = (x: LearnState, n: number) => weekLiveVM(x.payload, weekRows(x.payload, x.db, who(x).me), who(x), n, x.now);
const published = (edit?: Parameters<typeof learnState>[4]) =>
  at(S1 + 2 * 86400_000, (d) => {
    Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' });
    d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 4800;
    edit?.(d);
  });

describe('the week’s live session (D-183)', () => {
  it('week page Join from start-15m (absent at start-16m), live from the start @parity:E-9 @parity:D-2', () => {
    expect(live(at(S1 - 16 * MIN), 1)).toBeNull();
    expect(live(at(S1 - 15 * MIN), 1)).toMatchObject({ kind: 'join', join: { state: 'ready', badge: 'Starting soon', sessionId: 'dec26-s1' } });
    expect(live(at(S1 + 5 * MIN), 1)).toMatchObject({ kind: 'join', join: { state: 'live', badge: 'Live now' } });
  });

  it('Go Live hours early shows Live now and Join on the week @parity:C-1', () => {
    expect(live(at(S1 - 3 * 3600_000, (d) => (sessionIn(d, 'dec26-s1').live = true)), 1)).toMatchObject({ kind: 'join', join: { state: 'live' } });
  });

  it('End Session ends it: no Join, the “Replay Processing” state until a replay is published @parity:C-2 @parity:E-8', () => {
    // Ended 20 minutes in, an hour before its scheduled end: no longer live.
    const ended = at(S1 + 20 * MIN, (d) => {
      const s = sessionIn(d, 'dec26-s1');
      Object.assign(s, { live: false, start: S1 + 20 * MIN - s.mins * MIN, replay: 'processing' });
    });
    expect(live(ended, 1)).toMatchObject({ kind: 'processing', badge: 'Replay Processing', title: 'Map Your Spend Live Build', note: 'Replay processing · usually within 2 hours' });
  });

  it('a published replay puts the player on the week page @parity:E-1 @parity:C-3 @parity:M-3', () => {
    expect(live(published(), 1)).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1', source: null });
    // No replay without a length, as the current portal decides it.
    expect(live(at(S1 + 2 * 86400_000, (d) => Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' })), 1)).toBeNull();
  });

  it('the player: time and total, chapters per build step with ticks, speed, captions @parity:E-2 @parity:E-3 @parity:E-4 @parity:E-6', () => {
    const x = published();
    const m = x.db.modules.find((mm) => mm.id === 'accelerator-week-1')!;
    const r = weekReplay(who(x), m, x.now, idleUi());
    expect(r.hasVid).toBe(true);
    expect(r.player).toMatchObject({ has: true, n: 1, title: 'Map Your Spend Live Build', time: '0:00', total: '1:20:00', speedLabel: '1×', cc: true, playTitle: 'Play' });
    expect(r.rail).toHaveLength(m.checklist.length);
    expect(r.rail.map((c) => c.done)).toEqual(m.checklist.map((_, i) => i === 0));
    expect(r.railTitle).toBe('Chapters');
    const later = weekReplay(who(x), m, x.now, { ...idleUi(1200), playing: true, speed: 1.5 });
    expect(later.player).toMatchObject({ time: '20:00', speedLabel: '1.5×', playTitle: 'Pause', chapter: 'Step 4 · Submit for a Live Read' });
  });

  it('the transcript: searchable, a line seeks; from the stored WebVTT when there is one @parity:E-5 @parity:E-4', () => {
    const x = published();
    const m = x.db.modules.find((mm) => mm.id === 'accelerator-week-1')!;
    expect(weekReplay(who(x), m, x.now, { ...idleUi(), transcript: true })).toMatchObject({ trOpen: true, noTranscript: true, noTranscriptMsg: 'The searchable transcript posts with the replay.' });
    const vtt = toVtt([
      [0, 'Welcome to the build.'],
      [65, 'Open your ledger export.'],
    ]);
    const withVtt = { ...m, transcriptVtt: vtt } as typeof m;
    expect(withTranscript(withVtt).transcript).toEqual([
      [0, 'Welcome to the build.'],
      [65, 'Open your ledger export.'],
    ]);
    const found = weekReplay(who(x), withVtt, x.now, { ...idleUi(), transcript: true, q: 'ledger' });
    expect(found.lines).toHaveLength(1);
    expect(found.qCount).toBe('1 match');
    expect(found.lines[0]).toMatchObject({ t: '1:05', at: 65, parts: [{ s: 'Open your ', hit: false }, { s: 'ledger', hit: true }, { s: ' export.', hit: false }] });
    // Captions follow the playhead.
    expect(weekReplay(who(x), withVtt, x.now, { ...idleUi(70), playing: true }).player.caption).toBe('Open your ledger export.');
    // A file that won't parse leaves the transcript empty.
    expect(withTranscript({ ...m, transcriptVtt: 'not a vtt' } as typeof m).transcript).toEqual([]);
  });

  it('a live-build step: the player and “Watch at mm:ss” for its own chapter; a self-paced week has none @parity:E-17 @parity:E-1', () => {
    const x = published();
    const rows = weekRows(x.payload, x.db, who(x).me);
    const m = x.db.modules.find((mm) => mm.id === 'accelerator-week-1')!;
    const step3 = stepLiveVM(x.payload, rows, who(x), 1, 2, x.now)!;
    expect(step3.session).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1', source: null });
    expect(step3.watch).toEqual({ label: 'Watch at 10:00', at: m.checklist[2]!.t });
    expect(m.checklist[2]!.t).toBe(600);
    expect(stepLiveVM(x.payload, rows, who(x), 0, 0, x.now)).toBeNull();
    // Before the replay: Join on the step inside the window, and no "Watch at".
    const y = at(S1 - 10 * MIN);
    expect(stepLiveVM(y.payload, weekRows(y.payload, y.db, who(y).me), who(y), 1, 0, y.now)).toMatchObject({ session: { kind: 'join' }, watch: null });
  });
});

describe('the recording staff attach, played (D-183)', () => {
  const attached = (url: string, extra: Record<string, unknown> = {}) => published((d) => Object.assign(sessionIn(d, 'dec26-s1'), { replayUrl: url, ...extra }));

  it('a video file or an HLS manifest plays in the player; the link reaches the learner through the snapshot @parity:E-1 @parity:C-3 @parity:M-3', () => {
    const x = attached('https://cdn.example.com/week1.mp4');
    expect(x.db.sessions.find((s) => s.id === 'dec26-s1')!.replayUrl).toBe('https://cdn.example.com/week1.mp4');
    expect(live(x, 1)).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1', source: { kind: 'file', src: 'https://cdn.example.com/week1.mp4' } });
    expect(live(attached('https://stream.example.com/week1.m3u8'), 1)).toMatchObject({ source: { kind: 'hls', src: 'https://stream.example.com/week1.m3u8' } });
  });

  it('a page on another site: the player offers it in a new tab, and a step gets no “Watch at” @parity:E-1 @parity:C-3', () => {
    const x = attached('https://us02web.zoom.us/rec/share/abc');
    expect(live(x, 1)).toMatchObject({ kind: 'replay', source: { kind: 'link', href: 'https://us02web.zoom.us/rec/share/abc' } });
    const step = stepLiveVM(x.payload, weekRows(x.payload, x.db, who(x).me), who(x), 1, 2, x.now)!;
    expect(step.watch).toBeNull();
  });

  it('the module’s own manifest wins, as on the AI Employee page', () => {
    const x = published((d) => {
      Object.assign(sessionIn(d, 'dec26-s1'), { replayUrl: 'https://zoom.us/rec/share/abc' });
      Object.assign(d.modules.find((m) => m.id === 'accelerator-week-1')!, { playbackUrl: 'https://stream.example.com/m.m3u8' });
    });
    expect(live(x, 1)).toMatchObject({ source: { kind: 'hls', src: 'https://stream.example.com/m.m3u8' } });
  });

  it('a replay staff set Hidden: no link, and no player', () => {
    const x = attached('https://cdn.example.com/week1.mp4', { replayVisibility: 'hidden' });
    expect(x.db.sessions.find((s) => s.id === 'dec26-s1')).not.toHaveProperty('replayUrl');
    expect(live(x, 1)).toBeNull();
  });
});

// D-183: production's attached recording carries no module length (Attach replay sets only the session's
// link and its replay ready), so the player must draw from the recording itself.
describe('a real recording with no module length (D-183)', () => {
  const noDur = (url: string) =>
    at(S1 + 2 * 86400_000, (d) => {
      Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready', replayUrl: url });
      d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 0;
    });

  it('draws the player and its video for an attached recording, whatever the module’s length says @parity:E-1 @parity:MO-5', () => {
    const x = noDur('https://stream.example.com/week1.m3u8');
    expect(live(x, 1)).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1', source: { kind: 'hls', src: 'https://stream.example.com/week1.m3u8' } });
    const m = x.db.modules.find((mm) => mm.id === 'accelerator-week-1')!;
    // Until the metadata loads: an indeterminate bar, "--:--", and no chapters to seek or "Watch at".
    const waiting = weekReplay(who(x), m, x.now, idleUi());
    expect(waiting.hasVid).toBe(true);
    expect(waiting.player).toMatchObject({ has: true, indeterminate: true, time: '--:--', total: '--:--', pct: '0%' });
    expect(waiting.rail.every((c) => c.seek === null)).toBe(true);
    expect(waiting.watch.every((w) => w === null)).toBe(true);
    // Once the recording says how long it is: the times, the bar, the chapters and "Watch at".
    const known = weekReplay(who(x), m, x.now, idleUi(600), 4800);
    expect(known.player).toMatchObject({ indeterminate: false, time: '10:00', total: '1:20:00', pct: '12.50%' });
    expect(known.rail.map((c) => c.seek)).toEqual(m.checklist.map((st) => st.t));
    expect(known.watch).toEqual(m.checklist.map((st) => st.t));
  });

  it('the module’s manifest with no length plays too; a page on another site draws its link @parity:E-1', () => {
    const x = published((d) => {
      d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 0;
      Object.assign(d.modules.find((m) => m.id === 'accelerator-week-1')!, { playbackUrl: 'https://stream.example.com/m.m3u8' });
    });
    expect(live(x, 1)).toMatchObject({ kind: 'replay', source: { kind: 'hls' } });
    expect(live(noDur('https://us02web.zoom.us/rec/share/abc'), 1)).toMatchObject({ kind: 'replay', source: { kind: 'link' } });
  });

  it('with nothing real to play, the ticker keeps today’s rule: no length, no player', () => {
    const x = at(S1 + 2 * 86400_000, (d) => {
      Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' });
      d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 0;
    });
    expect(live(x, 1)).toBeNull();
  });

  it('an unpublished recording still draws nothing (the link isn’t sent)', () => {
    const x = at(S1 + 2 * 86400_000, (d) => {
      Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'processing', replayUrl: 'https://stream.example.com/week1.m3u8' });
      d.modules.find((m) => m.id === 'accelerator-week-1')!.dur = 0;
    });
    expect(live(x, 1)).toMatchObject({ kind: 'processing' });
  });
});

// D-187 (Connor's answer 1): "After the week opens" replays stay hidden until the week opens; "Published"
// shows as soon as it is ready, even in a week still locked by its date (here Week 2 opens a week after
// its build).
describe('replay visibility in a locked week (D-187)', () => {
  const S2 = Date.parse('2026-12-09T19:00:00Z');
  const DEC10 = S2 + 30 * 3600_000;
  const REC = 'https://stream.example.test/dec26-s2/playlist.m3u8';
  const lockedWith = (x: Record<string, unknown>) =>
    at(DEC10, (d) => {
      d.modules.find((m) => m.id === 'accelerator-week-2')!.opens = S2 + 7 * 86400_000;
      Object.assign(sessionIn(d, 'dec26-s2'), { replayUrl: REC, ...x });
    });

  it('Published: the locked week’s preview plays the replay as soon as it is ready @parity:E-1 @parity:C-3', () => {
    const x = lockedWith({ replay: 'ready', replayVisibility: 'published' });
    expect(weekRows(x.payload, x.db, who(x).me).find((r) => r.week === 2)!.state).toBe('locked');
    expect(live(x, 2)).toMatchObject({ kind: 'replay', moduleId: 'accelerator-week-2', source: { kind: 'hls', src: REC } });
  });

  it('After the week opens, or not set: nothing in the locked week, the replay once it opens @parity:E-1 @parity:C-3', () => {
    expect(live(lockedWith({ replay: 'ready', replayVisibility: 'after_open' }), 2)).toBeNull();
    expect(live(lockedWith({ replay: 'ready' }), 2)).toBeNull();
    const opened = at(S2 + 8 * 86400_000 + 6 * 3600_000, (d) => {
      d.modules.find((m) => m.id === 'accelerator-week-2')!.opens = S2 + 7 * 86400_000;
      Object.assign(sessionIn(d, 'dec26-s2'), { replayUrl: REC, replay: 'ready', replayVisibility: 'after_open' });
    });
    expect(live(opened, 2)).toMatchObject({ kind: 'replay', moduleId: 'accelerator-week-2' });
  });

  it('Hidden: never; and a locked week never says Replay Processing', () => {
    expect(live(lockedWith({ replay: 'ready', replayVisibility: 'hidden' }), 2)).toBeNull();
    expect(live(lockedWith({ replay: 'processing', replayVisibility: 'published' }), 2)).toBeNull();
  });
});
