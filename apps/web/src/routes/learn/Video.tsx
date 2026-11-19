// D-191: a course video with its poster, chapters, transcript and resume. A block that has none of
// those renders the same player D-188 did. Progress is reported by the caller; this file does not
// know whether the viewer may write.
//
// D-198: iOS Safari does not paint the poster attribute once `src` is assigned with
// `preload="metadata"` (HlsEngine sets `src` in the layout effect, so it is not in the markup). The
// element shows a gray box and the play button. The same course-file URL is also an `<img>` over the
// element, under the play button, until playback starts. The attribute stays for every other browser.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

export function VideoView({ block, watch, onDuration }: { block: VideoBlock; watch?: VideoWatch; onDuration?: (seconds: number) => void }) {
  const source = videoBlockSource(block, courseVideoUrl);
  const video = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [open, setOpen] = useState(false);
  /** D-198: which source has started. The poster image stays up until this matches. */
  const [playingGate, setPlayingGate] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
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
      setPlayingGate(`${id}\0${src}`);
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
  const play = () => {
    const el = video.current;
    if (!el) return;
    const played = el.play?.();
    void played?.catch(() => undefined);
  };

  const videoEl = (
    <video
      ref={video}
      className={s.vplay}
      controls
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d) && d > 0) {
          setDuration(d);
          onDuration?.(d);
        } else setDuration(null);
      }}
      aria-label={title ?? STEP.video}
      data-video-block=""
      {...(block.id ? { 'data-video-id': block.id } : {})}
      {...(poster ? { poster } : {})}
    >
      {block.transcript ? <track kind="captions" srcLang="en" label="English" src={courseVideoUrl(block.transcript.upload)} /> : null}
    </video>
  );
  // The frame stays mounted once there is a poster, so hiding the image does not remount the video.
  const started = playingGate === `${videoKey}\0${src}`;
  const player = poster ? (
    <div className={s.vframe}>
      {videoEl}
      {started ? null : (
        <>
          <img className={s.vposter} src={poster} alt={title ?? STEP.video} />
          <button type="button" className={s.vhit} aria-label={title ? `${STEP.play} ${title}` : STEP.play} onClick={play}>
            <span className={s.vgo} aria-hidden="true">
              <i>
                <Icon name="play" size={18} filled />
              </i>
              <span className={s.vt}>{playPill(title)}</span>
              {duration !== null ? <small>{fmt.clock(duration)}</small> : null}
            </span>
          </button>
        </>
      )}
    </div>
  ) : (
    videoEl
  );

  return (
    <figure className={s.vfig}>
      {block.draft ? <p className={s.vdraft}>{STEP.draftVideo}</p> : null}
      {player}
      {chapters.length ? <Chapters chapters={chapters} active={active} onSeek={seek} /> : null}
      {block.transcript ? (
        <div className={s.tbar}>
          <button type="button" className={`${s.b} ${s.bq} ${s.bi} ${s.vscript}`} aria-expanded={open} aria-controls={`step-transcript-${videoKey}`} onClick={() => setOpen((v) => !v)}>
            <Icon name="lines" size={16} strokeWidth={2} />
            <span>{open ? STEP.hideTranscript : STEP.showTranscript}</span>
            <Icon name="r2Chevd" size={16} strokeWidth={2} className={s.chev} />
          </button>
          {open ? (
            <button
              type="button"
              className={`${s.b} ${s.bq} ${s.bi} ${s.vcopy}`}
              disabled={!transcriptText}
              onClick={() => {
                void navigator.clipboard?.writeText(transcriptText).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }, () => undefined);
              }}
            >
              <Icon name="lvCopy" size={14} strokeWidth={1.75} />
              <span>{copied ? STEP.copied : STEP.copyTranscript}</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {open && block.transcript ? (
        <TranscriptPanel id={`step-transcript-${videoKey}`} src={courseVideoUrl(block.transcript.upload)} time={time} onSeek={seek} onClose={() => setOpen(false)} onText={setTranscriptText} />
      ) : null}
      {title ? <figcaption className={s.me}>{title}</figcaption> : null}
    </figure>
  );
}

/** The mockup's pill reads "Play the orientation" when the block is titled "Watch the orientation". */
function playPill(title: string | null): string {
  if (!title) return STEP.play;
  return title.replace(/^Watch\b/, STEP.play);
}

function cueGroups(cues: CaptionCue[]): CaptionCue[][] {
  const groups: CaptionCue[][] = [];
  let group: CaptionCue[] = [];
  cues.forEach((cue, i) => {
    group.push(cue);
    const sentence = /[.?!]["”']?$/.test(cue.text.trim());
    const span = cue.end - group[0]!.start;
    if ((sentence && span > 10) || span > 42 || i === cues.length - 1) {
      groups.push(group);
      group = [];
    }
  });
  return groups;
}

function Chapters({ chapters, active, onSeek }: { chapters: { t: number; label: string }[]; active: number; onSeek: (t: number) => void }) {
  const row = useRef<HTMLOListElement>(null);
  const labelId = useId();
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 8, right: max - el.scrollLeft > 8 });
  };
  useLayoutEffect(() => {
    measure();
    const el = row.current;
    if (!el) return undefined;
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [chapters.length]);
  useEffect(() => {
    const el = row.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !chip || typeof el.scrollTo !== 'function') return;
    if (active <= 0) {
      if (el.scrollLeft > 0) el.scrollTo({ left: 0, behavior: 'auto' });
      return;
    }
    const rowBox = el.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    if (chipBox.left >= rowBox.left - 1 && chipBox.right <= rowBox.right + 1) return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delta = chipBox.left - rowBox.left - (el.clientWidth - chipBox.width) / 2;
    el.scrollTo({ left: Math.max(0, el.scrollLeft + delta), behavior: reduce ? 'auto' : 'smooth' });
  }, [active]);
  const nudge = (dir: number) => {
    const el = row.current;
    if (!el) return;
    if (typeof el.scrollBy !== 'function') return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div className={s.chapters}>
      <div className={s.chapHead}>
        <span className={s.chapLabel} id={labelId}>{STEP.chapters} · {chapters.length}</span>
      </div>
      <div className={s.hs}>
        <button type="button" className={s.hsBtn} data-side="prev" aria-label={STEP.scrollChaptersLeft} hidden={!edges.left} onClick={() => nudge(-1)}>
          <Icon name="r2Back" size={16} strokeWidth={2} />
        </button>
        <ol ref={row} className={`${s.hsRow}${edges.left ? ` ${s.fadeL}` : ''}${edges.right ? ` ${s.fadeR}` : ''}`} aria-labelledby={labelId}>
          {chapters.map((c, i) => (
            <li key={`${c.t}-${i}`}>
              <button type="button" className={s.vchap} aria-current={i === active ? 'true' : undefined} aria-label={`${c.label}, ${fmt.clock(c.t)}`} onClick={() => onSeek(c.t)}>
                <time>{fmt.clock(c.t)}</time>
                <span>{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className={s.hsBtn} data-side="next" aria-label={STEP.scrollChaptersRight} hidden={!edges.right} onClick={() => nudge(1)}>
          <Icon name="r2Chev" size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function TranscriptPanel({ id, src, time, onSeek, onClose, onText }: { id: string; src: string; time: number; onSeek: (t: number) => void; onClose: () => void; onText: (text: string) => void }) {
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
        onText(parsed.cues.map((c) => c.text).join(' '));
      })
      .catch(() => {
        if (!cancel) setError(STEP.transcriptMissing);
      });
    return () => {
      cancel = true;
      onText('');
    };
  }, [src, onText]);
  const active = cues ? activeCueIndex(cues, time) : -1;
  const groups = cues ? cueGroups(cues) : [];
  let seen = 0;
  return (
    <div id={id} className={s.vpanel} role="region" aria-label={STEP.transcript} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {cues === null && !error ? <p role="status">{STEP.loading}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {groups.map((group) => {
        const start = seen;
        seen += group.length;
        const current = active >= start && active < start + group.length;
        return (
          <button
            key={`${group[0]!.start}-${start}`}
            type="button"
            className={s.vcue}
            aria-current={current ? 'true' : undefined}
            onClick={(e) => {
              const mark = (e.target as HTMLElement).closest<HTMLElement>('[data-t]');
              onSeek(mark ? Number(mark.dataset.t) : group[0]!.start);
            }}
          >
            <time>{fmt.clock(group[0]!.start)}</time>
            <span>
              {group.map((c, j) => (
                <span key={`${c.start}-${j}`} className={active === start + j ? s.now : undefined} data-t={c.start}>{c.text} </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
