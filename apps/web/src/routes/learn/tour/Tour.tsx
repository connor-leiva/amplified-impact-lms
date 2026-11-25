// D-252: "How the LMS Works", the LMS tour. The learner frame opens it once per page load for a learner in the course
// who hasn't seen it (`useLmsTour`), and Week 0 pins it as a card that plays it in the same modal (`TourCard`).
//
// THE VIDEO IS DATA: the flagged block in Week 0's Media (`tourVideoOf`), played by the course's own player
// (`VideoView`) through the course file route. With none flagged, nothing here draws.
//
// WRITES. I've Seen It, and 90% of the video played (merged played seconds, not a seek), write `lms-tour-seen` once
// through `setPref`. Watch Later, the close button, Escape and the scrim write nothing: Watch Later is this browser
// session's (`tour-later.ts`). In a staff preview or a masquerade every button only closes it here: no mutation is
// sent at all, and no video progress either (no `watch.onSave`).
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LMS_TOUR_PREF, LMS_TOUR_WATCHED, tourSeen, tourVideoOf, watchThreshold } from '@ai/core';
import type { Learner } from '@ai/core';
import type { VideoBlock } from '@ai/core/course-types';
import { Icon } from '../../../components/Icon';
import { useDialogA11y } from '../../../components/primitives/Modal';
import { courseVideoUrl } from '../../../data/files';
import { useMutate } from '../../../data/hooks';
import { useMasquerade } from '../../../data/masquerade';
import type { Viewer } from '../../../data/repository';
import { setTourLater, tourLater } from '../../../data/tour-later';
import type { CourseLoad } from '../data';
import { VideoView } from '../Video';
import l from '../Learn.module.css';
import t from './Tour.module.css';
import { TOUR_COPY, tourDuration, tourOpens, tourPlayLabel, tourWrites } from './tour.vm';

type Theme = 'light' | 'dark';

/** What the frame hands Week 0's card: play the tour in the frame's modal, in the person's theme. */
interface TourApi {
  play: () => void;
  theme: Theme;
}

const TourContext = createContext<TourApi | null>(null);
export const TourProvider = TourContext.Provider;

/** Whose tour has opened by itself (or been closed) on this page load, by viewer id. */
const doneThisLoad = new Set<string>();

/** Tests only: a fresh page load. */
export function resetTourForTests(): void {
  doneThisLoad.clear();
}

/** The learner frame's half: when the tour opens by itself, what its buttons write, and the modal. */
export function useLmsTour({ viewer, me, course, theme }: { viewer: Viewer; me: Learner | null; course: CourseLoad; theme: Theme }): {
  modal: ReactNode;
  api: TourApi | null;
} {
  const mutate = useMutate();
  const masq = useMasquerade();
  const video = course.kind === 'ready' ? tourVideoOf(course.payload.course) : null;
  const learner = viewer.actor.kind === 'learner';
  const who = viewer.actor.kind === 'learner' ? viewer.actor.userId : viewer.actor.staffId;
  const writes = tourWrites({ learner, preview: !!viewer.preview, masquerade: masq.status });
  const seen = tourSeen(me?.coursePrefs);
  const [open, setOpen] = useState<'auto' | 'card' | null>(null);

  const opens = tourOpens({
    learner,
    course: course.kind === 'ready',
    video: video !== null,
    seen,
    later: tourLater(who),
    done: doneThisLoad.has(who),
    known: masq.status !== 'unknown',
  });
  useEffect(() => {
    if (!opens) return;
    doneThisLoad.add(who);
    setOpen('auto');
  }, [opens, who]);

  // Once per page load at most: I've Seen It and the 90% rule share it, and a learner who has seen it sends nothing.
  const sent = useRef(false);
  const seenNow = useRef(seen);
  seenNow.current = seen;
  const markSeen = useCallback(() => {
    if (!writes || sent.current || seenNow.current) return;
    sent.current = true;
    void mutate('setPref', { key: LMS_TOUR_PREF, value: '1' });
  }, [mutate, writes]);

  const close = useCallback(() => setOpen(null), []);
  const later = useCallback(() => {
    if (writes) setTourLater(who);
    doneThisLoad.add(who);
    setOpen(null);
  }, [who, writes]);
  const seenIt = useCallback(() => {
    markSeen();
    doneThisLoad.add(who);
    setOpen(null);
  }, [markSeen, who]);
  const at = watchThreshold(LMS_TOUR_WATCHED);
  const onWatched = useCallback((f: number) => {
    if (f >= at) markSeen();
  }, [at, markSeen]);

  const play = useCallback(() => setOpen('card'), []);
  const modal =
    open && video
      ? createPortal(
          <TourModal
            video={video}
            theme={theme}
            onClose={open === 'auto' ? later : close}
            actions={open === 'auto' ? { onLater: later, onSeen: seenIt } : null}
            onWatched={onWatched}
          />,
          document.body,
        )
      : null;
  return { modal, api: video ? { play, theme } : null };
}

/**
 * The modal: the title, the length and a line, the course's player with captions on, chapters and the transcript,
 * and (opened by itself) Watch Later and I've Seen It. Close, Escape and the scrim are `onClose`.
 */
export function TourModal({
  video,
  theme,
  onClose,
  actions,
  onWatched,
}: {
  video: VideoBlock;
  theme: Theme;
  onClose: () => void;
  actions: { onLater: () => void; onSeen: () => void } | null;
  onWatched?: (fraction: number) => void;
}) {
  const panel = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const subId = useId();
  const [loaded, setLoaded] = useState<number | null>(null);
  useDialogA11y(panel, true, onClose);
  const duration = tourDuration(video, loaded);
  return (
    <div data-r2-scope="" data-learner-v2="" data-lv-theme={theme} className={t.scope}>
      <div
        className={t.scrim}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div ref={panel} className={t.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subId} tabIndex={-1} data-lms-tour="">
          <div className={t.head}>
            <div className={t.words}>
              <h2 className={t.title} id={titleId}>
                {TOUR_COPY.title}
              </h2>
              <p className={t.sub} id={subId}>
                {duration ? (
                  <>
                    <span className={t.dur}>{duration}</span>
                    {' · '}
                  </>
                ) : null}
                {TOUR_COPY.line}
              </p>
            </div>
            <button type="button" className={t.close} aria-label={TOUR_COPY.close} onClick={onClose}>
              <Icon name="r2X" size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div className={t.body}>
            <VideoView block={video} captionsOn onWatched={onWatched} onDuration={setLoaded} />
          </div>
          {actions ? (
            <div className={t.foot}>
              <button type="button" className={l.b} onClick={actions.onLater}>
                {TOUR_COPY.later}
              </button>
              <button type="button" className={`${l.b} ${l.bp}`} onClick={actions.onSeen}>
                {TOUR_COPY.seen}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Week 0's pinned card: the poster, the title, the length and a play button. It plays the frame's modal. Outside the
 * frame (the builder's preview of Week 0) it opens its own, which writes nothing.
 */
export function TourCard({ video }: { video: VideoBlock }) {
  const api = useContext(TourContext);
  const [own, setOwn] = useState(false);
  const titleId = useId();
  const duration = tourDuration(video);
  const poster = video.poster ? courseVideoUrl(video.poster.upload) : null;
  const theme = api?.theme ?? 'light';
  const play = () => (api ? api.play() : setOwn(true));
  return (
    <div data-r2-scope="" data-learner-v2="" data-lv-theme={theme} className={t.scope}>
      <section className={t.card} aria-labelledby={titleId} data-lms-tour-card="">
        <button type="button" className={t.thumb} aria-label={tourPlayLabel(duration)} onClick={play}>
          {poster ? <img className={t.poster} src={poster} alt="" /> : null}
          <span className={t.go} aria-hidden="true">
            <Icon name="play" size={18} filled />
          </span>
        </button>
        <div className={t.text}>
          <h2 className={t.cardTitle} id={titleId}>
            {TOUR_COPY.title}
          </h2>
          <p className={t.sub}>
            {duration ? (
              <>
                <span className={t.dur}>{duration}</span>
                {' · '}
              </>
            ) : null}
            {TOUR_COPY.line}
          </p>
          <div>
            <button type="button" className={`${l.b} ${l.bp}`} onClick={play}>
              <Icon name="play" size={14} filled />
              {TOUR_COPY.watch}
            </button>
          </div>
        </div>
      </section>
      {own ? createPortal(<TourModal video={video} theme={theme} onClose={() => setOwn(false)} actions={null} />, document.body) : null}
    </div>
  );
}
