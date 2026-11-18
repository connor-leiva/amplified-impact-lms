// The replay player's view-model (phase 05 § 5.2, SCREENS § 3.2): the poster, the seek bar and its
// chapter markers, the chapters for the build steps with their ticks, the captions, the searchable
// transcript and each step's "Watch at" time. Moved here from `routes/portal/EmployeeDetail.vm.ts`
// (D-183), which now builds its player from this, so the current portal's AI Employee page and the
// learner portal v2's week page decide and draw a replay the same way.
//
// PURE: no React, no clock read, no DOM. `ui` is the screen's own player state.

import { fmt, sessionFor, sessionState } from '@ai/core';
import type { AIEmployee, Db, IconName, Session } from '@ai/core';
import type { Speed } from './engine';

/** The player state a screen keeps: the playhead, play or pause, speed, captions, the transcript. */
export interface ReplayUi {
  /** Playhead, in seconds. */
  t: number;
  playing: boolean;
  speed: Speed;
  cc: boolean;
  /** The Transcript toggle. The panel also needs a replay, so the VM gates it again. */
  transcript: boolean;
  /** The transcript search. */
  q: string;
}

export interface ReplayPlayerVM {
  has: boolean;
  none: boolean;
  n: number | '–';
  title: string;
  sub: string;
  pct: string;
  tNow: number;
  time: string;
  total: string;
  chapter: string;
  playIcon: IconName;
  playTitle: string;
  showBigPlay: boolean;
  caption: string;
  cc: boolean;
  speedLabel: string;
}

export interface ChapterVM {
  n: number;
  t: string;
  label: string;
  done: boolean;
  /** Seek-bar marker position, e.g. `8.56%`. */
  left: string;
  active: boolean;
  tip: string;
  /** Seconds to seek to, or null without a replay. */
  seek: number | null;
}

export interface TranscriptPartVM {
  s: string;
  hit: boolean;
}

export interface TranscriptLineVM {
  t: string;
  at: number;
  current: boolean;
  parts: TranscriptPartVM[];
}

export interface ReplayVM {
  /** The AI Employee's session (its live build), or null for a self-paced one. */
  sess: Session | null;
  sst: ReturnType<typeof sessionState>;
  /** Whether there is a replay to play: a length, and the session's replay published to learners. */
  hasVid: boolean;
  player: ReplayPlayerVM;
  rail: ChapterVM[];
  railTitle: string;
  trOpen: boolean;
  trOn: boolean;
  lines: TranscriptLineVM[];
  qCount: string;
  noTranscript: boolean;
  noTranscriptMsg: string;
  /** Each build step's "Watch at" seek, in seconds, or null without a replay; by the step's position. */
  watch: (number | null)[];
}

/**
 * The replay for an AI Employee `m`, for a learner in `cohortId` who has done the steps in `done`. A
 * replay plays when the module has a length and its session's replay is published (`sessionState` is
 * `replay`: not live, ended, and `replay` is `ready`), or, with no session at all, when the module has a
 * walkthrough's length. Exactly the rule the current portal's AI Employee page has always used.
 */
export function replayVM(db: Db, cohortId: string, done: readonly string[], m: AIEmployee, now: number, ui: ReplayUi): ReplayVM {
  const sess: Session | null = m.session ? sessionFor(db, cohortId, m.session) : null;
  const sst = sess ? sessionState(sess, now) : 'none';

  // ---- player -------------------------------------------------------------------------------
  const { t, playing, speed, cc, q } = ui;
  const hasVid = !!m.dur && (sst === 'replay' || (!sess && !!m.dur));
  const steps = m.checklist;
  const cur = steps.filter((s) => s.t <= t).pop();
  const capLine = m.transcript.filter((x) => x[0] <= t && t - x[0] < 30).pop();

  const player: ReplayPlayerVM = {
    has: hasVid,
    none: !hasVid,
    n: sess ? sess.n : '–',
    title: sess ? sess.title : m.name,
    sub: `${m.name} · with ${m.instructor}`,
    pct: hasVid ? `${((t / m.dur) * 100).toFixed(2)}%` : '0%',
    tNow: Math.floor(t),
    time: fmt.clock(t),
    total: fmt.clock(m.dur || 0),
    chapter: hasVid && cur ? `Step ${steps.indexOf(cur) + 1} · ${cur.ch}` : '',
    playIcon: playing ? 'pause' : 'play',
    playTitle: playing ? 'Pause' : 'Play',
    showBigPlay: hasVid && !playing,
    caption: cc && playing && capLine ? capLine[1] : '',
    cc,
    speedLabel: `${speed}×`,
  };

  const rail: ChapterVM[] = steps.map((s, i) => {
    const isDone = done.includes(s.id);
    const active = hasVid && !!cur && cur.id === s.id;
    return {
      n: i + 1,
      t: fmt.clock(s.t),
      label: s.ch,
      done: isDone,
      left: `${((s.t / (m.dur || 1)) * 100).toFixed(2)}%`,
      active,
      tip: hasVid ? `Jump to ${fmt.clock(s.t)} · ${s.text}` : s.text,
      seek: hasVid ? s.t : null,
    };
  });

  // ---- transcript ---------------------------------------------------------------------------
  const esc = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = esc ? new RegExp(`(${esc})`, 'ig') : null;
  const reT = esc ? new RegExp(esc, 'i') : null;
  let hits = 0;
  const lines: TranscriptLineVM[] = m.transcript
    .filter((x) => !reT || reT.test(x[1]))
    .map((x) => {
      const parts: TranscriptPartVM[] = re
        ? x[1]
            .split(re)
            .filter(Boolean)
            .map((s) => {
              const hit = s.toLowerCase() === q.trim().toLowerCase();
              if (hit) hits++;
              return { s, hit };
            })
        : [{ s: x[1], hit: false }];
      return {
        t: fmt.clock(x[0]),
        at: x[0],
        current: hasVid && !!capLine && capLine[0] === x[0],
        parts,
      };
    });

  return {
    sess,
    sst,
    hasVid,
    player,
    rail,
    railTitle: hasVid ? 'Chapters' : 'Session Agenda',
    trOpen: ui.transcript && hasVid,
    trOn: ui.transcript,
    lines,
    qCount: re ? `${hits} match${hits === 1 ? '' : 'es'}` : `${m.transcript.length} lines`,
    noTranscript: !m.transcript.length || (!!re && !lines.length),
    noTranscriptMsg: m.transcript.length ? 'No matches in this transcript.' : 'The searchable transcript posts with the replay.',
    watch: steps.map((s) => (hasVid ? s.t : null)),
  };
}
