// <StepPage>: the Week 0 step player, pixel-identical to the v6 mockup (mockup/step-2.html): the page recorded in
// reference/interaction-demo.mp4, moving by Amplified Impact Motion v1 (src/motion/ai-motion.css + .tsx, unchanged).
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
//   mockFlag     render the mockup's black "MOCKUP" bar (harness only)
//   review       render the mockup's text-style review section (harness only)
//   railPhone    'number' = optional phone rail (current pill shows its number only at <=640px). Off = mockup and video.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconSprite } from './components/Icons.jsx';
import { StepRail } from './components/StepRail.jsx';
import { BackLink, StepHeader } from './components/StepHeader.jsx';
import { VideoPlayer } from './components/VideoPlayer.jsx';
import { Checklist } from './components/Checklist.jsx';
import { Reference } from './components/Reference.jsx';
import { MarkDone, NextCard } from './components/StepFooter.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { MockFlag, ReviewSection } from './components/ReviewSection.jsx';
import { scrollBehavior } from './components/motion.js';

export function StepPage({ step, labels, checks, onCheck, onStepDone, onProgress, videoRef: outerVideoRef, mockFlag = false, review = false, railPhone }) {
  const items = step.items;
  const [checked, setChecked] = useState(() => {
    const m = {}; items.forEach((it) => { m[it.id] = checks?.[it.id] ?? !!it.checked; }); return m;
  });
  const [stepDone, setStepDoneState] = useState(!!step.stepDone);
  const [nudge, setNudge] = useState(false);
  const [live, setLive] = useState('');
  const [tick, setTick] = useState({ t: 0, force: 'instant' });
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [spy, setSpy] = useState(step.jumps[0]?.id ?? null);
  const innerVideoRef = useRef(null);
  const videoRef = outerVideoRef ?? innerVideoRef;
  const boxRefs = useRef({});
  const doneRef = useRef(stepDone); doneRef.current = stepDone;

  const n = items.filter((it) => checked[it.id]).length;
  const left = items.length - n;
  const locked = left > 0;

  const setStep = useCallback((on) => {
    setStepDoneState(on); doneRef.current = on;
    if (on) {
      setNudge(false);
      setLive(`Step ${step.n} marked done.${step.next ? ` Next: Step ${step.next.n}, ${step.next.title}.` : ''}`);
    } else {
      setLive(`Step ${step.n} is no longer marked done.`);
    }
    onStepDone?.(on);
  }, [step, onStepDone]);

  const setItem = useCallback((id, on) => {
    setChecked((c) => {
      if (!!c[id] === on) return c;
      if (!on && doneRef.current) setStep(false);
      onCheck?.(id, on);
      return { ...c, [id]: on };
    });
    setNudge(false);
  }, [onCheck, setStep]);

  const why = stepDone
    ? (step.next ? `Nice work. Step ${step.next.n} is next.` : 'Nice work.')
    : left ? `Check off ${left} more to mark this step done.` : `All ${items.length} checked. You’re ready to mark this step done.`;

  const onMark = () => {
    if (stepDone) return;
    if (locked) {
      setNudge(true);
      const first = items.find((it) => !checked[it.id]);
      const box = first && boxRefs.current[first.id];
      box?.closest('.item')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      box?.focus({ preventScroll: true });
      return;
    }
    setStep(true);
  };

  // video time -> chapters, cues, auto-check
  const video = step.video;
  const onTime = useCallback((t, force) => {
    setTick({ t, force });
    const dur = videoRef.current?.duration || video?.durationS;
    if (video?.autoCheckItem && dur && t / dur >= (video.autoAt ?? 0.9)) setItem(video.autoCheckItem, true);
  }, [video, setItem, videoRef]);
  useEffect(() => {
    const v = videoRef.current; if (!v) return undefined;
    const tu = () => { onTime(v.currentTime, false); onProgress?.({ videoId: video.id, t: v.currentTime, duration: v.duration }); };
    const sk = () => onTime(v.currentTime, true);
    const pl = () => setStarted(true);
    const wait = () => setBuffering(true), go = () => setBuffering(false);
    v.addEventListener('timeupdate', tu); v.addEventListener('seeked', sk); v.addEventListener('play', pl); v.addEventListener('waiting', wait);
    ['playing', 'pause', 'ended', 'error'].forEach((e) => v.addEventListener(e, go));
    return () => {
      v.removeEventListener('timeupdate', tu); v.removeEventListener('seeked', sk); v.removeEventListener('play', pl); v.removeEventListener('waiting', wait);
      ['playing', 'pause', 'ended', 'error'].forEach((e) => v.removeEventListener(e, go));
    };
  }, [onTime, onProgress, video, videoRef]);
  // play: the hairline sweep runs until the video is actually playing (or the play fails)
  const play = () => { setStarted(true); setBuffering(true); videoRef.current?.play().catch(() => setBuffering(false)); };
  const seek = (t, andPlay) => {
    const v = videoRef.current; if (v) v.currentTime = t;
    onTime(t, true);
    if (andPlay) play();
  };
  const playFrom = (t) => { seek(t, true); document.getElementById('watch')?.scrollIntoView({ behavior: scrollBehavior() }); };

  // scroll-spy for On this page
  const spyIds = useMemo(() => step.jumps.map((j) => j.id), [step.jumps]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setSpy(e.target.id); }), { rootMargin: '-30% 0px -60% 0px' });
    spyIds.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [spyIds]);

  return (
    <div data-step-page="" data-rail-phone={railPhone}>
      <IconSprite />
      {mockFlag && <MockFlag />}
      <div className="page">
        <BackLink back={step.back} />
        <StepRail pills={step.pills} label={step.railLabel} currentDone={stepDone} scrollLeftLabel={labels.scrollStepsLeft} scrollRightLabel={labels.scrollStepsRight} />
        <div className="grid">
          <main className="main">
            <StepHeader step={step} done={n} total={items.length} labels={labels} />
            {video && (
              <VideoPlayer video={video} labels={labels} videoRef={videoRef} tick={tick} started={started} buffering={buffering}
                onPlay={play} onSeek={seek} transcriptKey={`w${step.week}s${step.n}-transcript`} />
            )}
            <Checklist items={items} checked={checked} boxRefs={boxRefs} title={labels.yourChecklist}
              onToggle={setItem} onPlay={playFrom} />
            <Reference accordions={step.accordions} title={labels.reference} />
            <div className="foot aim-rise" style={{ '--i': 5 }} id="foot">
              <MarkDone done={stepDone} locked={locked} why={why} nudge={nudge} onMark={onMark} onUndo={() => setStep(false)} labels={labels} />
              <NextCard next={step.next} cue={stepDone} labels={labels} />
            </div>
            <p className="sr" aria-live="polite" id="live">{live}</p>
            {review && <ReviewSection />}
          </main>
          <Sidebar step={step} spy={spy} checked={checked} labels={labels} />
        </div>
      </div>
    </div>
  );
}

export default StepPage;
