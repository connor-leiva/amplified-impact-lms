// D-252: "How the LMS Works", the LMS tour. Pure: no clock, no storage, no network.
//
// THE VIDEO IS DATA. Staff upload it to Week 0's Media in the Week Builder and tick "Show as the LMS Tour on Sign-In"
// (`VideoBlock.tour`). Nothing in code names its key, its file, its length or its chapters. `tourVideoOf` finds it in
// the course a viewer was handed (`GET /api/course`), so it plays through the course file route that already serves
// Week 0's Media to anyone who may open Week 0, and nothing else can reach it. With no video flagged it is null, and the
// sign-in modal and the Week 0 card draw nothing.
//
// SEEN IS A PREF. `lms-tour-seen` = `1` in `learner_prefs` (`setPref`), written by I've Seen It or by watching 90% of
// the video (played seconds, not the seek bar's position). There is no "first sign-in": a learner without the pref
// sees the modal, however long they have had an account.

import { acceleratorModuleId } from './accelerator';
import type { MediaItem, VideoBlock } from './course-types';
import { isVideoUpload } from './course-types';
import type { CoursePref } from './types';

/** The pref a learner's seen flag is stored under. Its only value is `1`. */
export const LMS_TOUR_PREF = 'lms-tour-seen';

/** The week whose Media holds the tour. */
export const LMS_TOUR_WEEK = 0;

/** The module that week is. The Week Builder's checkbox shows only there. */
export const LMS_TOUR_MODULE_ID = acceleratorModuleId(LMS_TOUR_WEEK);

/** How much of the tour, in played seconds, marks it seen without I've Seen It. */
export const LMS_TOUR_WATCHED = 0.9;

/** A video a learner may get as the tour: flagged, an uploaded mp4, with its transcript (the captions). */
export const isTourVideo = (b: VideoBlock): boolean => b.tour === true && isVideoUpload(b.source) && !!b.transcript;

/** A week as the course hands it out: open (with its Media) or a locked stub (none). */
interface TourWeek {
  week: number;
  media?: readonly MediaItem[];
  locked?: true;
}

/**
 * The tour: the first video in Week 0's Media that is flagged, uploaded and has a transcript. Null when Week 0 is
 * absent or locked, or holds none. A flag anywhere else (another week, a step's path) is not the tour.
 */
export function tourVideoOf(course: { weeks: readonly TourWeek[] } | null | undefined): VideoBlock | null {
  const week = course?.weeks.find((w) => w.week === LMS_TOUR_WEEK && w.locked !== true);
  for (const m of week?.media ?? []) if (typeof m !== 'string' && isTourVideo(m)) return m;
  return null;
}

/**
 * Whether a Media item is the tour pinned at the top of its week, so a page draws it as the card there and leaves it
 * out of the week's Media list (and v3's week page needs no Media video block for it).
 */
export const isPinnedTour = (week: number, m: MediaItem): boolean => week === LMS_TOUR_WEEK && typeof m !== 'string' && isTourVideo(m);

/** Whether this learner has seen the tour: I've Seen It, or 90% watched. */
export const tourSeen = (prefs: readonly CoursePref[] | null | undefined): boolean =>
  (prefs ?? []).some((p) => p.key === LMS_TOUR_PREF && p.value === '1');

/** What a save of a flagged video is refused with (`tourIssues` in course-rules). */
export const TOUR_RULE = {
  where: 'Only a video in Week 0’s Media can be the LMS Tour.',
  upload: 'The LMS Tour must be an uploaded mp4.',
  transcript: 'The LMS Tour needs a transcript, so it can show captions.',
  one: 'Only one video can be the LMS Tour. Untick the others.',
  elsewhere: (where: string): string => `${where} already has the LMS Tour. Untick it there first.`,
} as const;
