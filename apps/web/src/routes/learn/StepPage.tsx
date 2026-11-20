// <StepPage>: the Week 0 step player, pixel-identical to the v6 mockup (handoff/step-page-v6/mockup/step-2.html): the
// page recorded in reference/interaction-demo.mp4, moving by Amplified Impact Motion v1 (components/motion, unchanged).
// Ported from handoff/step-page-v6/src/StepPage.jsx: JSX to TSX, without the mockup-only MOCKUP bar and review section.
//
// Structure and class names are the mockup's, one for one, so step-page.css (the mockup's CSS,
// tokenized) styles it exactly. All words come from props: `step` (the step's content) and
// `labels` (chrome words). See sample-data.js for the shape and HANDOFF.md for the LMS mapping.
//
// Props
//   step         StepVM-like object (sample-data.js › sampleStep)
//   labels       chrome words (sample-data.js › sampleLabels; STEP in Step.vm.ts in the LMS)
//   checks       { [itemId]: boolean } initial checklist state (CheckItemVM.checked)
//   onCheck      (itemId, on) => void   persist a box (the LMS's checklist mark mutation)
//   onStepDone   (on) => void           persist Mark step done / Undo (toggleStep)
//   onProgress   ({ videoId, t, duration }) => void   watch progress (VideoWatch.onSave)
//   videoRef     optional ref, so HlsEngine can attach the HLS source to the <video>
//   railPhone    'number' = optional phone rail (current pill shows its number only at <=640px). Off = mockup and video.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MotionStyle } from '@brand/ai-motion';
import { IconSprite } from './step-page/Icons';
import { StepRail } from './step-page/StepRail';
import { BackLink, StepHeader } from './step-page/StepHeader';
import { VideoPlayer } from './step-page/VideoPlayer';
import type { VideoTick } from './step-page/VideoPlayer';
import { Checklist, WaitConfirm } from './step-page/Checklist';
import { Reference } from './step-page/Reference';
import { MarkDone, NextCard } from './step-page/StepFooter';
import { Sidebar } from './step-page/Sidebar';
import { scrollBehavior } from './step-page/motion';
import type { SpItem, SpLabels, SpStep } from './step-page/types';

export interface StepPageProps {
  step: SpStep;
  labels: SpLabels;
  checks?: Record<string, boolean>;
  onCheck?: (itemId: string, on: boolean) => void;
  onStepDone?: (on: boolean) => void;
  onProgress?: (p: { videoId: string; t: number; duration: number }) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  railPhone?: 'number';
  /** D-210: changes when a write was refused, so the boxes go back to the server's state. */
  sync?: number;
}

export function StepPage({ step, labels, checks, onCheck, onStepDone, onProgress, videoRef: outerVideoRef, railPhone, sync = 0 }: StepPageProps) {
  const items = step.items;
  // D-210: a sub-check is its own box (`<item>:<sub>`); an item with sub-checks is checked when all of them are.
  const fromServer = () => {
    const m: Record<string, boolean> = {};
    items.forEach((it) => { m[it.id] = checks?.[it.id] ?? !!it.checked; it.subchecks.forEach((sub) => { m[`${it.id}:${sub.id}`] = !!sub.checked; }); });
    return m;
  };
  const [checked, setChecked] = useState<Record<string, boolean>>(fromServer);
  const [confirm, setConfirm] = useState<SpItem | null>(null);
  const [stepDone, setStepDoneState] = useState(!!step.stepDone);
  // D-210: another path, or a write the server refused (`sync`), starts the boxes again from the server's state,
  // in place, so focus and the page's position stay where they are.
  const [seen, setSeen] = useState({ tab: step.tab, sync });
  if (seen.tab !== step.tab || seen.sync !== sync) {
    setSeen({ tab: step.tab, sync });
    setChecked(fromServer());
    setStepDoneState(!!step.stepDone);
    setConfirm(null);
  }
  const [nudge, setNudge] = useState(false);
  const [live, setLive] = useState('');
  const [tick, setTick] = useState<VideoTick>({ t: 0, force: 'instant' });
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [spy, setSpy] = useState<string | null>(step.jumps[0]?.id ?? null);
  const innerVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = outerVideoRef ?? innerVideoRef;
  const boxRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const doneRef = useRef(stepDone); doneRef.current = stepDone;

  const itemOn = useCallback((it: SpItem, c: Record<string, boolean>) => (it.subchecks.length ? it.subchecks.every((sub) => c[`${it.id}:${sub.id}`]) : !!c[it.id]), []);
  const shown = useMemo(() => {
    const m: Record<string, boolean> = { ...checked }; items.forEach((it) => { m[it.id] = itemOn(it, checked); }); return m;
  }, [checked, items, itemOn]);
  const n = items.filter((it) => shown[it.id]).length;
  const left = items.length - n;
  const locked = left > 0;

  const setStep = useCallback((on: boolean) => {
    setStepDoneState(on); doneRef.current = on;
    if (on) {
      setNudge(false);
      setLive(`Step ${step.n} marked done.${step.next ? ` Next: Step ${step.next.n}, ${step.next.title}.` : ''}`);
    } else {
      setLive(`Step ${step.n} is no longer marked done.`);
    }
    onStepDone?.(on);
  }, [step, onStepDone]);

  /** One box: an item, or a sub-check (`<item>:<sub>`). */
  const setBox = useCallback((id: string, on: boolean) => {
    setChecked((c) => {
      if (!!c[id] === on) return c;
      if (!on && doneRef.current) setStep(false);
      onCheck?.(id, on);
      return { ...c, [id]: on };
    });
    setNudge(false);
  }, [onCheck, setStep]);
  /** An item's box: all of its sub-checks when it has them. Checking an item that waits on another step asks first. */
  const setItem = useCallback((id: string, on: boolean, asked = false) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (on && !asked && it.waiting != null) { setConfirm(it); return; }
    if (it.subchecks.length) it.subchecks.forEach((sub) => setBox(`${id}:${sub.id}`, on));
    else setBox(id, on);
  }, [items, setBox]);

  const why = stepDone
    ? (step.next ? `Nice work. Step ${step.next.n} is next.` : 'Nice work.')
    : !items.length ? (step.doneWhen ?? '')
    : left ? `Check off ${left} more to mark this step done.` : `All ${items.length} checked. You’re ready to mark this step done.`;

  const onMark = () => {
    if (stepDone) return;
    if (locked) {
      setNudge(true);
      const first = items.find((it) => !shown[it.id]);
      const box = first && boxRefs.current[first.id];
      box?.closest('.item')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      box?.focus({ preventScroll: true });
      return;
    }
    setStep(true);
  };

  // video time -> chapters, cues, auto-check
  const video = step.video;
  const onTime = useCallback((t: number, force: VideoTick['force']) => {
    setTick({ t, force });
    const dur = videoRef.current?.duration || video?.durationS;
    if (video?.autoCheckItem && dur && t / dur >= (video.autoAt ?? 0.9)) setItem(video.autoCheckItem, true, true);
  }, [video, setItem, videoRef]);
  useEffect(() => {
    const v = videoRef.current; if (!v) return undefined;
    const tu = () => { onTime(v.currentTime, false); onProgress?.({ videoId: video!.id, t: v.currentTime, duration: v.duration }); };
    const sk = () => onTime(v.currentTime, true);
    const pl = () => setStarted(true);
    const wait = () => setBuffering(true), go = () => setBuffering(false);
    v.addEventListener('timeupdate', tu); v.addEventListener('seeked', sk); v.addEventListener('play', pl); v.addEventListener('waiting', wait);
    (['playing', 'pause', 'ended', 'error'] as const).forEach((e) => v.addEventListener(e, go));
    return () => {
      v.removeEventListener('timeupdate', tu); v.removeEventListener('seeked', sk); v.removeEventListener('play', pl); v.removeEventListener('waiting', wait);
      (['playing', 'pause', 'ended', 'error'] as const).forEach((e) => v.removeEventListener(e, go));
    };
  }, [onTime, onProgress, video, videoRef]);
  // play: the hairline sweep runs until the video is actually playing (or the play fails)
  const play = () => { setStarted(true); setBuffering(true); videoRef.current?.play().catch(() => setBuffering(false)); };
  const seek = (t: number, andPlay?: boolean) => {
    const v = videoRef.current; if (v) v.currentTime = t;
    onTime(t, true);
    if (andPlay) play();
  };
  const playFrom = (t: number, videoId?: string | null) => {
    // A play mark for another video on the path plays that one (D-191), where it is.
    if (videoId && videoId !== video?.id) {
      const other = document.querySelector<HTMLVideoElement>(`[data-video-block][data-video-id="${CSS.escape(videoId)}"]`);
      if (other) { other.currentTime = t; void other.play?.().catch(() => undefined); other.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }); return; }
    }
    seek(t, true); document.getElementById('watch')?.scrollIntoView({ behavior: scrollBehavior() });
  };

  // scroll-spy for On this page
  const spyIds = useMemo(() => step.jumps.map((j) => j.id), [step.jumps]);
  // D-224: a click on a jump marks it at once (the observer would wait for the section to cross its band), and at
  // the very bottom of the page the last section is the current one, since a short last section (Reference) can
  // never scroll up into the band. A click holds its mark until the scroll it started settles.
  const held = useRef<number>(0);
  const jump = useCallback((id: string) => { held.current = Date.now() + 900; setSpy(id); }, []);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && Date.now() > held.current) setSpy(e.target.id); }), { rootMargin: '-30% 0px -60% 0px' });
    spyIds.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    const last = spyIds[spyIds.length - 1];
    const atEnd = () => {
      if (!last || Date.now() <= held.current) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setSpy(last);
    };
    window.addEventListener('scroll', atEnd, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', atEnd); };
  }, [spyIds]);

  return (
    <div data-step-page="" data-rail-phone={railPhone}>
      <IconSprite />
      <div className="page">
        <BackLink back={step.back} />
        <StepRail pills={step.pills} label={step.railLabel} currentDone={stepDone} scrollLeftLabel={labels.scrollStepsLeft} scrollRightLabel={labels.scrollStepsRight} />
        <div className="grid">
          <main className="main">
            <StepHeader step={step} done={n} total={items.length} labels={labels} />
            {step.lead}
            {video && (
              <VideoPlayer video={video} labels={labels} videoRef={videoRef} tick={tick} started={started} buffering={buffering}
                onPlay={play} onSeek={seek} transcriptKey={`w${step.week}s${step.n}-transcript`} />
            )}
            {items.length > 0 ? (
              <Checklist items={items} checked={shown} boxRefs={boxRefs} title={labels.yourChecklist}
                onToggle={(id, on) => setItem(id, on)} onPlay={playFrom} onSub={(itemId, subId, on) => setBox(`${itemId}:${subId}`, on)}
                labels={labels} leading={step.leading} extras={step.extras} />
            ) : step.blocks || step.leading || step.extras ? (
              <section id="checklist" className="aim-rise" style={{ '--i': 3 } as MotionStyle} aria-labelledby="check-h">
                <h2 className="sec-h" id="check-h">{labels.doThis ?? 'Do this'}</h2>
                {step.leading}{step.blocks}{step.extras}
              </section>
            ) : null}
            <Reference accordions={step.accordions} title={labels.reference} onToggle={step.onAccordion} />
            <div className="foot aim-rise" style={{ '--i': 5 } as MotionStyle} id="foot">
              <MarkDone done={stepDone} locked={locked} why={why} nudge={nudge} onMark={onMark} onUndo={() => setStep(false)} labels={labels} disabled={!!step.markDisabled} />
              <NextCard next={step.next} cue={stepDone} labels={labels} />
            </div>
            <p className="sr" aria-live="polite" id="live">{live}</p>
          </main>
          <Sidebar step={step} spy={spy} checked={shown} labels={labels} onJump={jump} />
        </div>
      </div>
      {confirm && confirm.waiting != null && (
        <WaitConfirm step={confirm.waiting} labels={labels}
          onYes={() => { const id = confirm.id; setConfirm(null); setItem(id, true, true); }}
          onNo={() => { const id = confirm.id; setConfirm(null); boxRefs.current[id]?.focus(); }} />
      )}
    </div>
  );
}

export default StepPage;
