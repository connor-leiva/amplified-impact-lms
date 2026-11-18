// D-183: a week's live session on the learner portal v2's week page: Join from 15 minutes before it starts
// (and from Go Live), the current portal's "Replay Processing" once it has ended, and the replay player
// once its replay is published to learners, with the chapters, captions, transcript and "Watch at" of the
// current portal's AI Employee page (`components/replay/replay.vm.ts` decides all of it, for both pages).
//
// PURE. The words are the current portal's own (its AI Employee page and Sessions page), and the course's
// (the session's title) from the API.

import { fmt, parseVtt, sessionFor } from '@ai/core';
import { ACCELERATOR_COHORT_ID } from '@ai/core/accelerator';
import type { AIEmployee, Db, Learner } from '@ai/core';
import { replayUrl } from '../../components/replay/engine';
import { replayVM } from '../../components/replay/replay.vm';
import { replaySource } from '../../components/replay/source';
import type { ReplaySource } from '../../components/replay/source';
import type { ReplayUi, ReplayVM } from '../../components/replay/replay.vm';
import type { CoursePayload, CourseSession } from '../course/Course.vm';
import { sessionPhase } from '@ai/core/learner';
import { LABELS, joinNow } from './learn.vm';
import type { JoinVM, WeekRow } from './learn.vm';

/** The player's chrome: the current portal's AI Employee page's own labels. */
export const REPLAY = {
  section: 'Session replay',
  kicker: 'Amplified Impact · Session',
  replay: 'Replay',
  back: 'Back 10 seconds',
  seek: 'Seek',
  speed: 'Playback speed',
  captions: 'Captions',
  transcript: 'Transcript',
  search: 'Search the transcript',
  step: 'Step',
  verified: 'Verified',
  watchAt: 'Watch at',
  chaptersFollow: (n: number) => `Chapters Follow the ${n} Build Steps`,
  processing: 'Replay processing · usually within 2 hours',
  // D-183: a recording on another site (Zoom, Vimeo, YouTube, Loom): today's portal's own words for it.
  watchReplay: 'Watch Replay',
} as const;

/** A player that hasn't been touched: the start, paused, at 1×, captions on, the transcript closed. */
export const idleUi = (t = 0): ReplayUi => ({ t, playing: false, speed: 1, cc: true, transcript: false, q: '' });

/** What the week page draws for its live session, if anything. */
export type WeekSessionVM =
  | { kind: 'join'; join: JoinVM }
  | { kind: 'processing'; badge: string; title: string; when: string; note: string }
  /**
   * The player. `source` is what it plays (D-183): the module's manifest, else the recording staff
   * attached to the session (an HLS manifest or a video file plays here; any other page opens in a new
   * tab), else nothing, and the player runs as today's AI Employee page does (the ticker).
   */
  | { kind: 'replay'; moduleId: string; source: ReplaySource }
  | null;

/** The learner whose progress ticks the chapters, and the cohort whose session it is. */
export interface ReplayWho {
  db: Db;
  me: Learner | null;
}

/**
 * The module with its transcript: the stored one, else the WebVTT § 8.3's `publishReplay` stores as
 * `transcriptVtt`, parsed by core's `parseVtt` (read through a widening cast, as `replayUrl` reads
 * `playbackUrl`: no module carries one yet). A file that won't parse leaves the transcript empty.
 */
export function withTranscript(m: AIEmployee): AIEmployee {
  if (m.transcript.length) return m;
  const vtt = (m as AIEmployee & { transcriptVtt?: unknown }).transcriptVtt;
  if (typeof vtt !== 'string' || !vtt.trim()) return m;
  try {
    return { ...m, transcript: parseVtt(vtt) };
  } catch {
    return m;
  }
}

/**
 * What the week's replay plays (D-183): the module's manifest, else the recording staff attached to its
 * live build, which the learner's snapshot carries once it is published to them (`learnerReplayUrl`).
 */
export function weekSource(who: ReplayWho, m: AIEmployee): ReplaySource {
  const cohortId = who.me?.cohortId ?? ACCELERATOR_COHORT_ID;
  const sess = m.session ? sessionFor(who.db, cohortId, m.session) : null;
  return replaySource(replayUrl(m), sess?.replayUrl);
}

/**
 * The replay of a week's module for this learner (or for staff, with no progress), at `ui`. With a real
 * recording to play, the player draws whatever the module's length says (D-183); `dur` is the recording's
 * own length once its metadata has loaded, until when the seek bar is indeterminate and the chapters wait.
 */
export function weekReplay(who: ReplayWho, m: AIEmployee, now: number, ui: ReplayUi, dur?: number): ReplayVM {
  const cohortId = who.me?.cohortId ?? ACCELERATOR_COHORT_ID;
  const source = weekSource(who, m);
  return replayVM(who.db, cohortId, who.me?.progress?.[m.id]?.steps ?? [], withTranscript(m), now, ui, { source: !!source, ...(dur ? { dur } : {}) });
}

/**
 * The week's live session: Join while a session of the week can be joined (any of its sessions, live or
 * inside its window); else, for its live build, the replay when it is published, or "Replay Processing"
 * once it has ended and the replay isn't up, as the current portal's AI Employee page decides it.
 */
export function weekSessionVM(own: readonly CourseSession[], m: AIEmployee | undefined, who: ReplayWho | undefined, now: number): WeekSessionVM {
  const join = joinNow(own, now);
  if (join) return { kind: 'join', join };
  if (!m || !who) return null;
  const r = weekReplay(who, m, now, idleUi());
  // D-183: staff set this replay Hidden; learners don't get its link, and the player doesn't draw.
  if (r.sess?.replayVisibility === 'hidden') return null;
  if (r.hasVid) return { kind: 'replay', moduleId: m.id, source: weekSource(who, m) };
  // Ended (by its times, or by End Session, read as the join route reads it), its replay not up yet.
  const s = r.sess ? (own.find((x) => x.id === r.sess!.id) ?? r.sess) : null;
  if (s && (r.sst === 'processing' || sessionPhase(s, now) === 'processing'))
    return { kind: 'processing', badge: LABELS.replayProcessing, title: s.title, when: fmt.when(s.start), note: REPLAY.processing };
  return null;
}

/** The week's own sessions, in date order. */
const ownSessions = (p: CoursePayload, week: number): CourseSession[] => p.sessions.filter((s) => s.week === week).sort((a, b) => a.start - b.start);

/**
 * What the week page draws under its header (D-183): its live session's Join, replay or "Replay
 * Processing". A locked week sends no content and so has no replay; Join still shows while one of its
 * sessions is on.
 */
export function weekLiveVM(p: CoursePayload, rows: readonly WeekRow[], who: ReplayWho, week: number, now: number): WeekSessionVM {
  const row = rows.find((r) => r.week === week);
  return weekSessionVM(ownSessions(p, week), row && row.state !== 'locked' ? row.module : undefined, who, now);
}

/**
 * A live-build step: a step of a week that has a live build. Its page draws the week's live session as
 * the week page does, and, with the replay published, "Watch at mm:ss" for the step's own chapter.
 */
export function stepLiveVM(
  p: CoursePayload,
  rows: readonly WeekRow[],
  who: ReplayWho,
  week: number,
  stepIndex: number,
  now: number,
): { session: WeekSessionVM; watch: { label: string; at: number } | null } | null {
  if (!ownSessions(p, week).some((s) => s.kind === 'build')) return null;
  const session = weekLiveVM(p, rows, who, week, now);
  const m = rows.find((r) => r.week === week)?.module;
  // A recording on another site can't be seeked from here, so it gets no "Watch at".
  const at = session?.kind === 'replay' && session.source?.kind !== 'link' && m ? weekReplay(who, m, now, idleUi()).watch[stepIndex] : null;
  return { session, watch: typeof at === 'number' ? { label: `${REPLAY.watchAt} ${fmt.clock(at)}`, at } : null };
}
