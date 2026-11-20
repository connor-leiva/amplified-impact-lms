// The video block: full-width 16:9 frame with poster and a labeled play pill, the chapter scroller
// under it (44px / 24px edge fades), and the inline, collapsible, fixed-height transcript that
// follows along and highlights the phrase being spoken.
//
// In the LMS, keep HlsEngine (components/replay/HlsEngine) for the source: render this <video>
// and let HlsEngine attach to `videoRef`. Chapters and cues come from VideoBlock.chapters and the
// parsed VTT (parseCaptionCues in @ai/core).
//
// Motion (Amplified Impact Motion v1): the play pill's label rolls on hover and the pill squeezes on press; while
// the video buffers, the hairline sweep (the one loader) runs along the bottom of the frame; the transcript opens
// over 380 ms on the system curve and closes in 200 ms on the exit curve; Back to current rises in on the spring.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { MotionStyle } from '@brand/ai-motion';
import { Icon } from './Icons';
import { clock, scrollBehavior } from './motion';
import { useHScroller } from './useHScroller';
import type { CenterForce } from './useHScroller';
import type { SpChapter, SpCue, SpLabels, SpVideo } from './types';

/** The video clock StepPage passes down: the time, and how a follow should scroll (`instant` on a seek). */
export interface VideoTick {
  t: number;
  force: CenterForce;
}

/** Groups cues into readable rows: a row closes at a sentence end after 10 s, or at 42 s. */
export function groupCues(cues: SpCue[]) {
  const groups: number[][] = []; let g: number[] = [];
  cues.forEach((c, i) => {
    g.push(i);
    const endS = /[.?!]["”]?$/.test(c.text.trim());
    const span = cues[i]!.e - cues[g[0]!]!.s;
    if ((endS && span > 10) || span > 42 || i === cues.length - 1) { groups.push(g); g = []; }
  });
  return groups;
}
export const activeChapter = (chapters: SpChapter[], t: number) => { let ci = 0; chapters.forEach((c, i) => { if (t >= c.t - 0.05) ci = i; }); return ci; };
export const activeCue = (cues: SpCue[], t: number) => { let cu = -1; for (let i = 0; i < cues.length; i++) { if (t >= cues[i]!.s - 0.05) cu = i; else break; } return cu; };

export function VideoPlayer({ video, labels, videoRef, tick, started, buffering, onPlay, onSeek, transcriptKey, sectionTitle = labels.watch }: {
  video: SpVideo; labels: SpLabels; videoRef: RefObject<HTMLVideoElement | null>; tick: VideoTick; started: boolean; buffering: boolean;
  onPlay: () => void; onSeek: (t: number, andPlay?: boolean) => void; transcriptKey: string; sectionTitle?: string;
}) {
  const { t, force } = tick;
  const { chapters, cues } = video;
  const dur = videoRef.current?.duration || video.durationS || 0;
  const ci = activeChapter(chapters, t);
  const end = chapters[ci + 1]?.t ?? dur;
  const chapP = Math.min(1, Math.max(0, (t - chapters[ci]!.t) / (end - chapters[ci]!.t)));
  const groups = useMemo(() => groupCues(cues), [cues]);
  const groupOf = useMemo(() => { const m: number[] = []; groups.forEach((g, gi) => g.forEach((i) => { m[i] = gi; })); return m; }, [groups]);
  const cu = activeCue(cues, t);
  const ag = cu >= 0 ? groupOf[cu]! : -1;

  // chapters
  const hs = useHScroller<HTMLDivElement>();
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const chipP = useRef<number[]>([]); // a chip keeps its last --p, as the mockup's inline style does
  chipP.current[ci] = chapP;
  useLayoutEffect(() => { hs.center(chipRefs.current[ci], force); }, [ci]);

  // transcript
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userUntil = useRef(0);
  const programmatic = useRef(false);
  const agRef = useRef(ag); agRef.current = ag;
  const openRef = useRef(open); openRef.current = open;

  const follow = (row: HTMLElement | null | undefined, f?: CenterForce) => {
    if (!openRef.current || !row) return;
    if (!f && Date.now() < userUntil.current) { setShowBack(true); return; }
    programmatic.current = true;
    scroller.current!.scrollTo({ top: row.offsetTop - scroller.current!.clientHeight / 3, behavior: f === 'instant' ? 'auto' : scrollBehavior() });
    setTimeout(() => { programmatic.current = false; }, 500);
    setShowBack(false);
  };
  useLayoutEffect(() => { if (ag >= 0) follow(rowRefs.current[ag], force); }, [ag]);

  const setTranscript = (o: boolean) => {
    setOpen(o); openRef.current = o;
    try { localStorage.setItem(transcriptKey, o ? '1' : '0'); } catch { /* private mode */ }
    if (o) follow(rowRefs.current[Math.max(0, agRef.current)], 'instant');
  };
  useLayoutEffect(() => { try { if (localStorage.getItem(transcriptKey) === '1') setTranscript(true); } catch { /* */ } }, []);

  useEffect(() => {
    const el = scroller.current; if (!el) return undefined;
    const mark = () => { userUntil.current = Date.now() + 4000; };
    const onScroll = () => {
      if (programmatic.current || agRef.current < 0) return;
      const r = rowRefs.current[agRef.current]!; const off = r.offsetTop - el.scrollTop;
      setShowBack(off < 0 || off > el.clientHeight - 30);
    };
    (['wheel', 'touchstart', 'pointerdown', 'keydown'] as const).forEach((e) => el.addEventListener(e, mark, { passive: true }));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { (['wheel', 'touchstart', 'pointerdown', 'keydown'] as const).forEach((e) => el.removeEventListener(e, mark)); el.removeEventListener('scroll', onScroll); };
  }, []);

  const copyTranscript = () => {
    navigator.clipboard?.writeText(cues.map((c) => c.text).join(' ')).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section id="watch" className="aim-rise" style={{ '--i': 2 } as MotionStyle} aria-labelledby="watch-h">
      <h2 className="sec-h" id="watch-h">{sectionTitle} <small>{video.sectionLength}</small></h2>
      <div className={'vframe' + (started ? ' started' : '') + (buffering ? ' buffering' : '')} id="vframe">
        <video ref={videoRef} id="video" controls playsInline preload="metadata" poster={video.poster} aria-label={video.ariaLabel ?? 'Orientation video'}>
          {video.src && <source src={video.src} type={video.type} />}
          {video.captions && <track kind="captions" srcLang="en" label="English" src={video.captions} />}
        </video>
        <img className="vposter" src={video.poster} alt="" />
        <span className="vbuf aim-sweep" aria-hidden="true" />
        <button className="vhit" type="button" id="vplay" aria-label={`Play ${video.title}`}
          onClick={() => { onPlay(); videoRef.current?.focus(); }}>
          <span className="vgo"><i><Icon name="play" size={20} /></i><span className="vt aim-roll"><span>{video.playLabel}</span><span aria-hidden="true">{video.playLabel}</span></span><small>{video.clock}</small></span>
        </button>
      </div>

      <div className="chapters">
        <div className="chap-head"><span className="label" id="chap-l">{`${labels.chapters} · ${chapters.length}`}</span></div>
        <div className="hs" id="chaps-hs">
          <button className="icon-btn hs-prev" type="button" aria-label={labels.scrollLeft} hidden={!hs.fadeL} onClick={hs.prev}><Icon name="left" /></button>
          <div className={'hs-row' + (hs.fadeR ? ' fade-r' : '') + (hs.fadeL ? ' fade-l' : '')} id="chaps" role="list" aria-labelledby="chap-l" ref={hs.row}>
            {chapters.map((c, i) => (
              <button key={c.t} ref={(el) => { chipRefs.current[i] = el; }} type="button" className="chip" role="listitem"
                aria-label={`${c.label}, ${clock(c.t)}`} aria-current={i === ci ? 'true' : undefined}
                style={chipP.current[i] !== undefined ? ({ '--p': chipP.current[i] } as MotionStyle) : undefined}
                onClick={() => onSeek(c.t, true)}>
                <time>{clock(c.t)}</time><span>{c.label}</span>
              </button>
            ))}
          </div>
          <button className="icon-btn hs-next" type="button" aria-label={labels.scrollRight} hidden={!hs.fadeR} onClick={hs.next}><Icon name="right" /></button>
        </div>
      </div>

      <div className="tbar">
        <button className="btn btn-ghost" type="button" id="ttoggle" aria-expanded={open ? 'true' : 'false'} aria-controls="tpanel" onClick={() => setTranscript(!open)}>
          <Icon name="lines" /><span id="tlabel">{open ? labels.hideTranscript : labels.showTranscript}</span><Icon name="chev" className="chev" />
        </button>
        <span className="grow" />
        <button className="btn btn-ghost btn-sm" type="button" id="tcopy" hidden={!open} onClick={copyTranscript}>
          <Icon name="copy" size={14} /><span>{copied ? labels.copied : labels.copyTranscript}</span>
        </button>
      </div>
      <div className={'tpanel' + (open ? ' open' : '')} id="tpanel" role="region" aria-label={labels.transcript} inert={!open}>
        <div className="tscroll" id="tscroll" tabIndex={0} ref={scroller}>
          {groups.map((g, gi) => (
            <button key={gi} type="button" className="cue" id={'g' + gi} ref={(el) => { rowRefs.current[gi] = el; }} aria-current={gi === ag ? 'true' : undefined}
              onClick={(e) => { const sp = (e.target as Element).closest<HTMLElement>('span.c'); onSeek(sp ? cues[+sp.dataset.i!]!.s : cues[g[0]!]!.s, true); }}>
              <time>{clock(cues[g[0]!]!.s)}</time>
              <span>{g.map((i, k) => (
                <Fragment key={i}>{k > 0 && ' '}<span className={'c' + (i === cu ? ' now' : '')} id={'c' + i} data-g={gi} data-i={i}>{cues[i]!.text}</span></Fragment>
              ))}</span>
            </button>
          ))}
        </div>
        <button className={'btn btn-secondary btn-sm tback' + (showBack ? ' show' : '')} type="button" id="tback"
          onClick={() => { userUntil.current = 0; follow(rowRefs.current[Math.max(0, agRef.current)], true); }}>
          <Icon name="down" size={14} /><RollLabel>{labels.backToCurrent}</RollLabel>
        </button>
      </div>
    </section>
  );
}
