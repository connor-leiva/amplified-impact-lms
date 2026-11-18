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

  it('End Session ends it: no Join, the "Replay Processing" state until a replay is published @parity:C-2 @parity:E-8', () => {
    // Ended 20 minutes in, an hour before its scheduled end: no longer live.
    const ended = at(S1 + 20 * MIN, (d) => {
      const s = sessionIn(d, 'dec26-s1');
      Object.assign(s, { live: false, start: S1 + 20 * MIN - s.mins * MIN, replay: 'processing' });
    });
    expect(live(ended, 1)).toMatchObject({ kind: 'processing', badge: 'Replay Processing', title: 'Map Your Spend Live Build', note: 'Replay processing · usually within 2 hours' });
  });

  it('a published replay puts the player on the week page @parity:E-1 @parity:C-3 @parity:M-3', () => {
    expect(live(published(), 1)).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1' });
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

  it('a live-build step: the player and "Watch at mm:ss" for its own chapter; a self-paced week has none @parity:E-17 @parity:E-1', () => {
    const x = published();
    const rows = weekRows(x.payload, x.db, who(x).me);
    const m = x.db.modules.find((mm) => mm.id === 'accelerator-week-1')!;
    const step3 = stepLiveVM(x.payload, rows, who(x), 1, 2, x.now)!;
    expect(step3.session).toEqual({ kind: 'replay', moduleId: 'accelerator-week-1' });
    expect(step3.watch).toEqual({ label: 'Watch at 10:00', at: m.checklist[2]!.t });
    expect(m.checklist[2]!.t).toBe(600);
    expect(stepLiveVM(x.payload, rows, who(x), 0, 0, x.now)).toBeNull();
    // Before the replay: Join on the step inside the window, and no "Watch at".
    const y = at(S1 - 10 * MIN);
    expect(stepLiveVM(y.payload, weekRows(y.payload, y.db, who(y).me), who(y), 1, 0, y.now)).toMatchObject({ session: { kind: 'join' }, watch: null });
  });
});
