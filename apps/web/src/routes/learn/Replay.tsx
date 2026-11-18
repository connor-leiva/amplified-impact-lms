// D-183: the replay player on the learner portal v2's week page and live-build steps, in the learner
// frame's own look: the poster with its captions, the seek bar with a marker per chapter (arrow keys move
// it 10 seconds), play and pause, back 10 seconds, the time, the chapter now, speed, captions, the
// transcript (searchable, a line seeks), and the chapters for the build steps with their ticks and "Watch
// at". What it shows and when is the current portal's AI Employee page's (`components/replay/replay.vm.ts`).
//
// What it plays (`components/replay/source.ts`): the module's HLS manifest, else the recording staff
// attached to the session. A manifest or a video file plays in the poster's video element (HlsEngine); a
// page on another site (Zoom, Vimeo, YouTube, Loom) opens in a new tab from "Watch Replay", with the
// chapters and transcript kept; with nothing to play, the ticker runs, as on today's page. The position is
// saved every 5 seconds of playback and on page hide, under the AI Employee page's own key.
//
// Markup and the browser's wiring only: every string is the view-model's.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import type { AIEmployee } from '@ai/core';
import { Icon } from '../../components/Icon';
import { HlsEngine, createVideoEngine } from '../../components/replay/HlsEngine';
import { SPEEDS } from '../../components/replay/engine';
import type { Speed, VideoEngine } from '../../components/replay/engine';
import { SAVE_EVERY, loadPos, savePos } from '../../components/replay/position';
import type { ReplayUi } from '../../components/replay/replay.vm';
import type { ReplaySource } from '../../components/replay/source';
import { LABELS } from './learn.vm';
import { REPLAY, idleUi, weekReplay } from './Replay.vm';
import type { ReplayWho } from './Replay.vm';
import s from './Learn.module.css';

/** How a live-build step's "Watch at" reaches the player. */
export type SeekRef = MutableRefObject<((t: number, play: boolean) => void) | null>;

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * The engine for what the replay is. A manifest or a video file plays in the poster's own video element
 * (HlsEngine; a file with `direct`), in either data mode, since the recording is real data. With nothing to
 * play (no link, or a page on another site), today's page's choice (`createVideoEngine`: the ticker).
 */
function engineFor(source: ReplaySource, dur: number, t: number, media: HTMLVideoElement | null): VideoEngine {
  // With no length from the module, the recording's own is learned from its metadata.
  if (media && (source?.kind === 'hls' || source?.kind === 'file'))
    return new HlsEngine({ src: source.src, dur, t, media, direct: source.kind === 'file', learnDuration: true });
  return createVideoEngine({ dur, t });
}

export function Replay({ who, m, now, seekRef, source = null }: { who: ReplayWho; m: AIEmployee; now: number; seekRef?: SeekRef; source?: ReplaySource }) {
  const playsHere = source?.kind === 'hls' || source?.kind === 'file';
  // A saved position: within the module's length, or, while a real recording's is still loading, as saved
  // (the element bounds it once it knows).
  const [ui, setUi] = useState<ReplayUi>(() => idleUi(m.dur ? Math.min(loadPos(m.id), m.dur) : playsHere ? loadPos(m.id) : 0));
  /** The recording's own length, once its metadata has loaded (D-183). */
  const [mediaDur, setMediaDur] = useState(0);
  const dur = m.dur || mediaDur;
  const engine = useRef<VideoEngine | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const ticks = useRef(0);
  const pos = useRef(ui.t);
  pos.current = ui.t;
  const media = source?.kind === 'hls' || source?.kind === 'file';
  const link = source?.kind === 'link' ? source.href : null;
  const src = source?.kind === 'hls' || source?.kind === 'file' ? source.src : '';
  const kind = source?.kind ?? null;

  const patch = useCallback((p: Partial<ReplayUi>) => setUi((prev) => ({ ...prev, ...p })), []);

  useEffect(() => {
    const e = engineFor(kind === 'hls' || kind === 'file' ? { kind, src } : null, m.dur, pos.current, video.current);
    engine.current = e;
    ticks.current = 0;
    const offTime = e.onTime((t) => {
      setUi((prev) => (prev.t === t ? prev : { ...prev, t }));
      if (++ticks.current % SAVE_EVERY === 0) savePos(m.id, t);
    });
    const offEnded = e.onEnded(() => patch({ playing: false }));
    const offDur = e.onDuration?.((d) => setMediaDur(d));
    return () => {
      e.pause();
      offTime();
      offEnded();
      offDur?.();
      e.destroy?.();
      engine.current = null;
    };
  }, [m.id, m.dur, src, kind, patch]);

  useEffect(() => {
    engine.current?.setRate(ui.speed);
  }, [ui.speed]);

  // The position persists on unmount, and on page hide (a hard navigation runs no React cleanup).
  useEffect(() => {
    const save = () => savePos(m.id, pos.current);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [m.id]);

  const seek = useCallback(
    (t: number, play = false) => {
      const e = engine.current;
      if (!e || (!dur && !playsHere)) return;
      const next = dur ? Math.max(0, Math.min(dur, t)) : Math.max(0, t);
      e.seek(next);
      patch(play ? { t: next, playing: true } : { t: next });
      if (!play) return;
      e.play();
      root.current?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [dur, playsHere, patch],
  );

  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = link ? null : seek;
    return () => {
      seekRef.current = null;
    };
  }, [seekRef, seek, link]);

  const r = weekReplay(who, m, now, ui, mediaDur);
  const v = r.player;

  const toggle = () => {
    const e = engine.current;
    if (!e || (!dur && !playsHere)) return;
    const atEnd = dur > 0 && ui.t >= dur;
    const next = !ui.playing;
    if (atEnd) e.seek(0);
    if (next) e.play();
    else e.pause();
    patch(atEnd ? { playing: next, t: 0 } : { playing: next });
  };

  const onBar = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width > 0 && dur) seek(((e.clientX - box.left) / box.width) * dur);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') seek(ui.t - 10);
    else if (e.key === 'ArrowRight') seek(ui.t + 10);
    else return;
    e.preventDefault();
  };
  const cycle = () => patch({ speed: SPEEDS[(SPEEDS.indexOf(ui.speed) + 1) % SPEEDS.length] as Speed });
  const heading = (
    <>
      <span className={s.rpk}>
        {REPLAY.kicker} {v.n}
      </span>
      <span className={s.rpt}>{v.title}</span>
      <span className={s.rps}>{v.sub}</span>
    </>
  );

  return (
    <section ref={root} className={`${s.cd} ${s.rp}`} aria-labelledby="lv-rp-t" data-replay={kind ?? 'ticker'}>
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-rp-t">
          {REPLAY.section}
        </h2>
        <span className={s.pl} data-tone="done">
          <Icon name="r2Check" size={12} strokeWidth={2.2} />
          {LABELS.replayReady}
        </span>
      </div>

      {link ? (
        // A recording on another site: it opens there, in a new tab.
        <div className={`${s.rpv} ${s.rpvLink}`}>
          {heading}
          <a className={`${s.b} ${s.rplink}`} href={link} target="_blank" rel="noopener">
            <Icon name="play" size={12} filled />
            {REPLAY.watchReplay}
          </a>
        </div>
      ) : (
        <>
          {/* The poster is a bare click target, as the AI Employee page's is: every action it offers also
              has a labelled button in the controls below. A real recording plays in its video element. */}
          <div className={s.rpv} onClick={toggle} data-media={media ? 'true' : undefined}>
            {media ? <video ref={video} className={s.rpvid} playsInline preload="metadata" aria-label={v.title} /> : null}
            {media && (ui.playing || ui.t > 0) ? null : heading}
            <span className={s.rpchip}>
              {REPLAY.replay} · {v.speedLabel}
            </span>
            {v.showBigPlay ? (
              <span className={s.rpbig} aria-hidden="true">
                <Icon name="play" size={22} filled />
              </span>
            ) : null}
            {v.caption ? <span className={s.rpcap}>{v.caption}</span> : null}
          </div>

          <div className={s.rpc}>
            {v.indeterminate ? (
              // The recording's length is still loading: an indeterminate bar, the times "--:--".
              <div className={`${s.rpseek} ${s.rpwait}`} role="progressbar" aria-label={REPLAY.seek}>
                <span className={s.rprail} />
              </div>
            ) : (
              <div
                className={s.rpseek}
                role="slider"
                tabIndex={0}
                aria-label={REPLAY.seek}
                aria-valuemin={0}
                aria-valuemax={dur}
                aria-valuenow={v.tNow}
                aria-valuetext={`${v.time} / ${v.total}`}
                onClick={onBar}
                onKeyDown={onKey}
              >
                <span className={s.rprail} />
                <span className={s.rpfill} style={{ '--pct': v.pct } as CSSProperties} />
                {r.rail.map((c) => (
                  <span key={c.n} title={c.label} className={s.rpmk} data-done={c.done ? 'true' : undefined} style={{ '--left': c.left } as CSSProperties} />
                ))}
                <span className={s.rpthumb} style={{ '--pct': v.pct } as CSSProperties} />
              </div>
            )}
            <div className={s.rprow}>
              <button type="button" className={`${s.b} ${s.bp} ${s.rpib}`} aria-label={v.playTitle} onClick={toggle}>
                <Icon name={v.playIcon} size={16} filled />
              </button>
              <button type="button" className={`${s.b} ${s.rpib}`} aria-label={REPLAY.back} onClick={() => seek(ui.t - 10)}>
                <Icon name="reset" size={16} strokeWidth={1.9} />
              </button>
              <span className={`${s.num} ${s.rptime}`}>
                {v.time} <span className={s.mu}>/ {v.total}</span>
              </span>
              <span className={`${s.me} ${s.el} ${s.grow}`}>{v.chapter}</span>
              <button type="button" className={s.b} aria-label={REPLAY.speed} onClick={cycle}>
                {v.speedLabel}
              </button>
              <button type="button" className={`${s.b} ${s.rpib}`} aria-pressed={v.cc} aria-label={REPLAY.captions} onClick={() => patch({ cc: !ui.cc })}>
                <Icon name="cc" size={17} strokeWidth={1.8} />
              </button>
              <button type="button" className={s.b} aria-pressed={r.trOn} onClick={() => patch({ transcript: !ui.transcript })}>
                <Icon name="lines" size={14} strokeWidth={1.9} />
                {REPLAY.transcript}
              </button>
            </div>
          </div>
        </>
      )}

      {link && r.lines.length ? (
        // With the recording elsewhere, its transcript still reads here; there is nothing here to seek.
        <div className={s.rptr} role="region" aria-label={REPLAY.transcript}>
          {r.lines.map((ln) => (
            <p key={ln.at} className={`${s.p} ${s.rpline}`}>
              <span className={`${s.num} ${s.me}`}>{ln.t}</span>
              <span>{ln.parts.map((pt) => pt.s).join('')}</span>
            </p>
          ))}
        </div>
      ) : null}

      {!link && r.trOpen ? (
        <div className={s.rptr} role="region" aria-label={REPLAY.transcript}>
          <div className={s.rptrh}>
            <label className={s.rpq}>
              <Icon name="search" size={15} strokeWidth={1.9} />
              <input value={ui.q} onChange={(e) => patch({ q: e.target.value })} placeholder={REPLAY.search} aria-label={REPLAY.search} />
            </label>
            <span className={s.me}>{r.qCount}</span>
          </div>
          {r.noTranscript ? <p className={`${s.p} ${s.me} ${s.rptre}`}>{r.noTranscriptMsg}</p> : null}
          {r.lines.map((ln) => (
            <button key={ln.at} type="button" className={s.rpline} data-current={ln.current ? 'true' : undefined} onClick={() => seek(ln.at, true)}>
              <span className={`${s.num} ${s.me}`}>{ln.t}</span>
              <span>
                {ln.parts.map((pt, i) =>
                  pt.hit ? (
                    <mark key={i} className={s.rphit}>
                      {pt.s}
                    </mark>
                  ) : (
                    <span key={i}>{pt.s}</span>
                  ),
                )}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.rpch}>
        <div className={s.rpchh}>
          <span className={s.w5}>{r.railTitle}</span>
          <span className={s.me}>{REPLAY.chaptersFollow(r.rail.length)}</span>
        </div>
        <div className={s.rpchg}>
          {r.rail.map((c) => {
            const body = (
              <>
                <span className={s.rpcht}>
                  <span className={s.num}>
                    {REPLAY.step} {c.n} · {c.t}
                  </span>
                  {c.done ? <Icon name="r2Check" size={13} strokeWidth={2.4} label={REPLAY.verified} /> : null}
                </span>
                <span className={`${s.me} ${s.cl2}`}>{c.label}</span>
              </>
            );
            // A recording elsewhere: the chapters list what it covers, with nothing here to seek.
            return link ? (
              <div key={c.n} className={s.rpchb} data-static="true">
                {body}
              </div>
            ) : (
              <button
                key={c.n}
                type="button"
                className={s.rpchb}
                data-active={c.active ? 'true' : undefined}
                aria-current={c.active ? 'step' : undefined}
                title={c.tip}
                onClick={() => {
                  if (c.seek !== null) seek(c.seek, true);
                }}
              >
                {body}
                {c.seek !== null ? (
                  <span className={s.rpwat}>
                    <Icon name="play" size={9} filled />
                    {REPLAY.watchAt} {c.t}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
