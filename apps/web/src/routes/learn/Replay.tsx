// D-183: the replay player on the learner portal v2's week page, in the learner frame's own look: the
// poster with its captions, the seek bar with a marker per chapter (arrow keys move it 10 seconds), play
// and pause, back 10 seconds, the time, the chapter now, speed, captions, the transcript (searchable, a
// line seeks), and the chapters for the build steps with their ticks. What it shows and when is the current
// portal's AI Employee page's (`components/replay/replay.vm.ts`), and it plays through the same engines
// (`createVideoEngine`: the ticker in the fixture build, HLS in http mode once there is a manifest). The
// position is saved every 5 seconds of playback and on page hide, under the AI Employee page's own key.
//
// Markup and the browser's wiring only: every string is the view-model's.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import type { AIEmployee } from '@ai/core';
import { Icon } from '../../components/Icon';
import { createVideoEngine } from '../../components/replay/HlsEngine';
import { SPEEDS, replayUrl } from '../../components/replay/engine';
import type { Speed, VideoEngine } from '../../components/replay/engine';
import { SAVE_EVERY, loadPos, savePos } from '../../components/replay/position';
import type { ReplayUi } from '../../components/replay/replay.vm';
import { LABELS } from './learn.vm';
import { REPLAY, idleUi, weekReplay } from './Replay.vm';
import type { ReplayWho } from './Replay.vm';
import s from './Learn.module.css';

/** How the week page's "Watch at" buttons reach the player. */
export type SeekRef = MutableRefObject<((t: number, play: boolean) => void) | null>;

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function Replay({ who, m, now, seekRef }: { who: ReplayWho; m: AIEmployee; now: number; seekRef?: SeekRef }) {
  const [ui, setUi] = useState<ReplayUi>(() => idleUi(Math.min(loadPos(m.id), m.dur || 0)));
  const engine = useRef<VideoEngine | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const ticks = useRef(0);
  const pos = useRef(ui.t);
  pos.current = ui.t;
  const src = replayUrl(m);

  const patch = useCallback((p: Partial<ReplayUi>) => setUi((prev) => ({ ...prev, ...p })), []);

  useEffect(() => {
    const e = createVideoEngine({ dur: m.dur, t: pos.current, src });
    engine.current = e;
    ticks.current = 0;
    const offTime = e.onTime((t) => {
      setUi((prev) => (prev.t === t ? prev : { ...prev, t }));
      if (++ticks.current % SAVE_EVERY === 0) savePos(m.id, t);
    });
    const offEnded = e.onEnded(() => patch({ playing: false }));
    return () => {
      e.pause();
      offTime();
      offEnded();
      e.destroy?.();
      engine.current = null;
    };
  }, [m.id, m.dur, src, patch]);

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
      if (!e || !m.dur) return;
      const next = Math.max(0, Math.min(m.dur, t));
      e.seek(next);
      patch(play ? { t: next, playing: true } : { t: next });
      if (!play) return;
      e.play();
      root.current?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [m.dur, patch],
  );

  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = seek;
    return () => {
      seekRef.current = null;
    };
  }, [seekRef, seek]);

  const r = weekReplay(who, m, now, ui);
  const v = r.player;

  const toggle = () => {
    const e = engine.current;
    if (!e || !m.dur) return;
    const atEnd = ui.t >= m.dur;
    const next = !ui.playing;
    if (atEnd) e.seek(0);
    if (next) e.play();
    else e.pause();
    patch(atEnd ? { playing: next, t: 0 } : { playing: next });
  };

  const onBar = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width > 0) seek(((e.clientX - box.left) / box.width) * m.dur);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') seek(ui.t - 10);
    else if (e.key === 'ArrowRight') seek(ui.t + 10);
    else return;
    e.preventDefault();
  };
  const cycle = () => patch({ speed: SPEEDS[(SPEEDS.indexOf(ui.speed) + 1) % SPEEDS.length] as Speed });

  return (
    <section ref={root} className={`${s.cd} ${s.rp}`} aria-labelledby="lv-rp-t">
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-rp-t">
          {REPLAY.section}
        </h2>
        <span className={s.pl} data-tone="done">
          <Icon name="r2Check" size={12} strokeWidth={2.2} />
          {LABELS.replayReady}
        </span>
      </div>

      {/* The poster is a bare click target, as the AI Employee page's is: every action it offers also has
          a labelled button in the controls below. */}
      <div className={s.rpv} onClick={toggle}>
        <span className={s.rpk}>
          {REPLAY.kicker} {v.n}
        </span>
        <span className={s.rpt}>{v.title}</span>
        <span className={s.rps}>{v.sub}</span>
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
        <div
          className={s.rpseek}
          role="slider"
          tabIndex={0}
          aria-label={REPLAY.seek}
          aria-valuemin={0}
          aria-valuemax={m.dur}
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

      {r.trOpen ? (
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
          {r.rail.map((c) => (
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
              <span className={s.rpcht}>
                <span className={s.num}>
                  {REPLAY.step} {c.n} · {c.t}
                </span>
                {c.done ? <Icon name="r2Check" size={13} strokeWidth={2.4} label={REPLAY.verified} /> : null}
              </span>
              <span className={`${s.me} ${s.cl2}`}>{c.label}</span>
              {c.seek !== null ? (
                <span className={s.rpwat}>
                  <Icon name="play" size={9} filled />
                  {REPLAY.watchAt} {c.t}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
