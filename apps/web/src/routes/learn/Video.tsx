// D-191: a course video with its poster, chapters, transcript and resume. A block that has none of
// those renders the same player D-188 did. Progress is reported by the caller; this file does not
// know whether the viewer may write.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fmt } from '@ai/core';
import type { VideoBlock } from '@ai/core/course-types';
import {
  activeChapterIndex,
  activeCueIndex,
  mergeSpans,
  parseCaptionCues,
  resumeAt,
  videoIdOf,
  watchedFraction,
} from '@ai/core';
import type { CaptionCue, WatchedSpan } from '@ai/core';
import { Icon } from '../../components/Icon';
import { useDialog } from '../../components/r2/Modal';
import d from '../../components/r2/Drawer.module.css';
import { courseVideoUrl } from '../../data/files';
import { HlsEngine } from '../../components/replay/HlsEngine';
import { videoBlockSource } from '../../components/replay/source';
import { STEP } from './Step.vm';
import s from './Learn.module.css';

/** Where this learner left the videos on the week, and how to save the next stretch. */
export interface VideoWatch {
  progress: readonly { videoId: string; maxPct: number; lastPositionS: number }[];
  /** Absent for staff, a preview and a masquerade: they can watch and nothing is stored. */
  onSave?: (progress: { videoId: string; maxPct: number; lastPositionS: number }) => void;
}

const GAP_S = 1.25;

export function VideoView({ block, watch }: { block: VideoBlock; watch?: VideoWatch }) {
  const source = videoBlockSource(block, courseVideoUrl);
  const video = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [open, setOpen] = useState(false);
  const kind = source?.kind ?? null;
  const src = source && source.kind !== 'link' ? source.src : '';
  const onSave = watch?.onSave;
  const saved = watch?.progress.find((p) => p.videoId === videoIdOf(block)) ?? null;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const videoKey = videoIdOf(block);
  useLayoutEffect(() => {
    const el = video.current;
    if (!el || !src || (kind !== 'file' && kind !== 'hls')) return;
    setFailed(false);
    const engine = new HlsEngine({ src, dur: 0, t: 0, media: el, direct: kind === 'file', learnDuration: true });
    let spans: WatchedSpan[] = [];
    let last = el.currentTime || 0;
    let lastSave = 0;
    let playing = false;
    let resumed = false;
    const id = videoKey;

    const sample = () => {
      const now = el.currentTime;
      if (playing && Number.isFinite(now) && now > last && now - last <= GAP_S) spans = mergeSpans(spans, { start: last, end: now });
      if (Number.isFinite(now)) last = now;
      setTime(Number.isFinite(now) ? now : 0);
    };
    const save = (force: boolean) => {
      const send = saveRef.current;
      if (!send) return;
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const t = Date.now();
      if (!force && t - lastSave < 10_000) return;
      lastSave = t;
      send({ videoId: id, maxPct: watchedFraction(spans, dur), lastPositionS: Number.isFinite(el.currentTime) ? el.currentTime : 0 });
    };
    const onPlay = () => {
      playing = true;
      last = el.currentTime;
    };
    const onPause = () => {
      sample();
      playing = false;
      save(true);
    };
    const onSeeked = () => {
      last = el.currentTime;
      setTime(el.currentTime);
    };
    const onTime = () => {
      sample();
      save(false);
    };
    const onMeta = () => {
      if (resumed) return;
      resumed = true;
      const to = savedRef.current ? resumeAt(savedRef.current.lastPositionS, el.duration) : null;
      if (to !== null) {
        el.currentTime = to;
        last = to;
        setTime(to);
      }
    };
    const onErr = () => {
      if (el.error) setFailed(true);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') save(true);
    };
    const onPageHide = () => save(true);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('error', onErr);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      engine.destroy();
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('error', onErr);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [src, kind, videoKey]);

  if (!source) return null;
  const title = block.title?.trim() || null;
  const poster = block.poster ? courseVideoUrl(block.poster.upload) : undefined;
  const chapters = block.chapters ?? [];
  const active = activeChapterIndex(chapters, time);

  if (source.kind === 'link' || failed) {
    const href = source.kind === 'link' ? source.href : source.src;
    return (
      <div className={s.vlink}>
        {block.draft ? <p className={s.vdraft}>{STEP.draftVideo}</p> : null}
        {title ? <span className={s.w5}>{title}</span> : null}
        <a className={`${s.b} ${s.bq} ${s.bi}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={title ? `${STEP.watch} ${title}` : undefined}>
          <Icon name="r2Play" size={14} strokeWidth={1.75} />
          {STEP.watch}
        </a>
      </div>
    );
  }

  const seek = (t: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = t;
    setTime(t);
    const played = el.play?.();
    void played?.catch(() => undefined);
  };

  const player = (
    <video
      ref={video}
      className={s.vplay}
      controls
      playsInline
      preload="metadata"
      aria-label={title ?? STEP.video}
      data-video-block=""
      {...(block.id ? { 'data-video-id': block.id } : {})}
      {...(poster ? { poster } : {})}
    >
      {block.transcript ? <track kind="captions" srcLang="en" label="English" src={courseVideoUrl(block.transcript.upload)} /> : null}
    </video>
  );

  return (
    <figure className={s.vfig}>
      {block.draft ? <p className={s.vdraft}>{STEP.draftVideo}</p> : null}
      {chapters.length ? (
        <div className={s.vstage}>
          {player}
          <ol className={s.vchaps} aria-label={STEP.chapters}>
            {chapters.map((c, i) => (
              <li key={`${c.t}-${i}`}>
                <button type="button" className={s.vchap} aria-current={i === active ? 'true' : undefined} onClick={() => seek(c.t)}>
                  <span className={s.vtime}>{fmt.clock(c.t)}</span>
                  <span>{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        player
      )}
      {block.transcript ? (
        <button type="button" className={`${s.b} ${s.bq} ${s.bi} ${s.vscript}`} onClick={() => setOpen(true)}>
          {STEP.showTranscript}
        </button>
      ) : null}
      {title ? <figcaption className={s.me}>{title}</figcaption> : null}
      {open && block.transcript ? (
        <TranscriptDrawer src={courseVideoUrl(block.transcript.upload)} time={time} onSeek={seek} onClose={() => setOpen(false)} />
      ) : null}
    </figure>
  );
}

function TranscriptDrawer({ src, time, onSeek, onClose }: { src: string; time: number; onSeek: (t: number) => void; onClose: () => void }) {
  const { ref, onKeyDown } = useDialog(onClose);
  const [cues, setCues] = useState<CaptionCue[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancel = false;
    setCues(null);
    setError('');
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('load'))))
      .then((text) => {
        if (cancel) return;
        const parsed = parseCaptionCues(text);
        setCues(parsed.cues);
        setError(parsed.error ?? '');
      })
      .catch(() => {
        if (!cancel) setError(STEP.transcriptMissing);
      });
    return () => {
      cancel = true;
    };
  }, [src]);
  const active = cues ? activeCueIndex(cues, time) : -1;
  return (
    <div
      className={d.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={d.panel} role="dialog" aria-modal="true" aria-label={STEP.transcript} data-drawer="open" style={{ width: 'min(440px, 100%)' }} onKeyDown={onKeyDown}>
        <div className={d.head}>
          <div className={d.titles}>
            <h2 className={d.title}>{STEP.transcript}</h2>
          </div>
          <button type="button" className={d.close} aria-label="Close" onClick={onClose}>
            <Icon name="r2X" size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className={d.body}>
          {cues === null && !error ? <p role="status">{STEP.loading}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {cues?.map((c, i) => (
            <button key={`${c.start}-${i}`} type="button" className={s.vcue} aria-current={i === active ? 'true' : undefined} onClick={() => onSeek(c.start)}>
              <span className={s.vtime}>{fmt.clock(c.start)}</span>
              <span>{c.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
