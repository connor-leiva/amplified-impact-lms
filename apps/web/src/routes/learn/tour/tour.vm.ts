// D-252: "How the LMS Works", the words and the two rules the sign-in modal and the Week 0 card follow. Pure.
import { fmt } from '@ai/core';
import type { VideoBlock } from '@ai/core/course-types';

export const TOUR_COPY = {
  title: 'How the LMS Works',
  line: 'A quick tour of your new home for the Accelerator. Watch it with your AI Implementer.',
  later: 'Watch Later',
  seen: 'I’ve Seen It',
  close: 'Close',
  watch: 'Watch the Tour',
} as const;

/** The card's button name, with the length when it is known: "Play How the LMS Works, 6:29". */
export const tourPlayLabel = (duration: string | null): string => (duration ? `Play ${TOUR_COPY.title}, ${duration}` : `Play ${TOUR_COPY.title}`);

/**
 * The tour's length as the subtitle and the card say it ("6:29"): the block's own (the Week Builder read it from the
 * file), else what the player read once its metadata loaded, else nothing.
 */
export function tourDuration(block: VideoBlock, loaded: number | null = null): string | null {
  const s = block.durationS ?? loaded;
  return s !== null && s !== undefined && Number.isFinite(s) && s > 0 ? fmt.clock(s) : null;
}

/** What decides whether the tour opens by itself on this page load. */
export interface TourGate {
  /** The viewer is a learner (`actor.kind === 'learner'`): never staff in the Console, never a visitor. */
  learner: boolean;
  /** `GET /api/course` answered the course (the plan opens it, or its preview): `ViewerAccess.accelerator`. */
  course: boolean;
  /** A tour video is flagged in Week 0's Media (`tourVideoOf`). */
  video: boolean;
  /** `lms-tour-seen` is `1` on the learner's own prefs. */
  seen: boolean;
  /** Watch Later was pressed in this browser session. */
  later: boolean;
  /** It was already opened, or closed, on this page load. */
  done: boolean;
  /** Whether a masquerade is running is known (so a button never writes during one by not knowing). */
  known: boolean;
}

export const tourOpens = (g: TourGate): boolean => g.learner && g.course && g.video && !g.seen && !g.later && !g.done && g.known;

/**
 * Whether the tour's buttons and its 90% rule may write: a learner as themselves. A staff preview and a masquerade
 * (or one not yet known not to be running) only close it locally: no mutation is sent, so neither a seen flag nor a
 * `masquerade.blocked_action` audit row is ever written.
 */
export const tourWrites = (x: { learner: boolean; preview: boolean; masquerade: 'unknown' | 'none' | 'active' }): boolean =>
  x.learner && !x.preview && x.masquerade === 'none';
